"""Single-visit production collector. JSON stdout; no Laravel bootstrap or retries."""
import argparse
import asyncio
import contextlib
import fcntl
import io
import json
import os
from pathlib import Path
import signal
import subprocess
import sys

from diagnose import ROOT, visit


def stop_group(child):
    """Terminate only the worker's process group, including its Xvfb and Chrome."""
    try:
        os.killpg(child.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        child.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        pass
    # The leader may exit before its descendants; finish cleaning its group.
    try:
        os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    child.communicate(timeout=5)


def supervise(command, timeout=85):
    child = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             text=True, start_new_session=True)
    closed = False
    try:
        stdout, _ = child.communicate(timeout=timeout)
        lines = [line for line in stdout.splitlines() if line.startswith("{")]
        result = json.loads(lines[-1]) if lines else {"status": "worker_error"}
        if child.returncode != 0:
            result["status"] = "worker_error"
        if result.get("status") == "ok" and not result.get("browserClosed"):
            result["status"] = "cleanup_failed"
        closed = bool(result.get("browserClosed")) and child.returncode == 0
        return result
    except subprocess.TimeoutExpired:
        return {"status": "timeout"}
    except KeyboardInterrupt:
        return {"status": "interrupted"}
    except (ValueError, TypeError):
        return {"status": "invalid_worker_output"}
    finally:
        # Normal exit requires explicit browser closure; kill stray descendants
        # too. This never targets other Chrome sessions or other display servers.
        if not closed or child.poll() is None:
            stop_group(child)


async def worker(args):
    task = asyncio.current_task()
    asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, task.cancel)
    await visit(args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chrome", required=True)
    parser.add_argument("--php", required=True)
    parser.add_argument("--profile", required=True, type=Path)
    parser.add_argument("--xvfb", default="/usr/bin/xvfb-run")
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if sys.version_info[:2] != (3, 12) or os.geteuid() == 0:
        parser.error("Use Python 3.12 as a non-root user.")
    for executable in [args.chrome, args.php]:
        if not os.path.isabs(executable) or not os.access(executable, os.X_OK):
            parser.error("Chrome and PHP must be absolute executable paths.")
    args.profile = args.profile.resolve()
    if args.worker:
        asyncio.run(worker(args))
        return 0
    args.profile.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Independent lock also protects direct manual collector invocations.
    with (args.profile.parent / "browser.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(json.dumps({"status": "busy"}))
            return 1
        command = [sys.executable, str(ROOT / "collect.py"), "--worker",
                   "--chrome", args.chrome, "--php", args.php, "--profile", str(args.profile)]
        if sys.platform == "linux":
            if not os.path.isabs(args.xvfb) or not os.access(args.xvfb, os.X_OK):
                parser.error("Linux collector requires an executable xvfb-run path.")
            command = [args.xvfb, "-a", "-s", "-screen 0 1280x900x24"] + command
        def interrupt(*_):
            raise KeyboardInterrupt
        signal.signal(signal.SIGTERM, interrupt)
        try:
            # Nodriver may print diagnostics; only the supervisor's JSON is public stdout.
            with contextlib.redirect_stdout(io.StringIO()):
                result = supervise(command)
        except Exception as error:
            result = {"status": "collector_error", "errorType": type(error).__name__}
        print(json.dumps(result))
        return 0 if result.get("status") == "ok" else 1


if __name__ == "__main__":
    sys.exit(main())
