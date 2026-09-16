"""Manual Tock feasibility probe. No application bootstrap or booking actions."""
import argparse
import asyncio
import fcntl
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
TARGET = "https://www.exploretock.com/lecuvierwinery"


def parse(html, php):
    result = subprocess.run(
        [php, str(ROOT / "parse.php")], input=html, text=True,
        capture_output=True, timeout=5, check=True,
    )
    return json.loads(result.stdout)


def accepted(items):
    return bool(items) and all(
        item.get("id") and item.get("title") and item.get("description")
        and item.get("booking_url", "").startswith(TARGET + "/experience/")
        for item in items
    )


async def visit(args):
    import nodriver as uc
    from nodriver import cdp

    report = {"status": "setup_error", "experiences": [], "documents": []}
    browser = None
    began = time.monotonic()
    try:
        browser = await asyncio.wait_for(uc.start(
            browser_executable_path=args.chrome, headless=False, sandbox=True,
            user_data_dir=str(getattr(args, "profile", ROOT / "profile")), host="127.0.0.1",
        ), 20)
        report["browser"] = browser.info.get("Browser")
        report["browserPid"] = browser._process.pid
        tab = browser.main_tab

        async def response(event):
            if event.type_ == cdp.network.ResourceType.DOCUMENT:
                value = event.response
                if value.url.split("?")[0].rstrip("/") == TARGET:
                    report["documents"].append({
                        "url": value.url.split("?")[0], "status": value.status,
                        "mitigation": next((v for k, v in value.headers.items()
                                            if k.lower() == "cf-mitigated"), None),
                    })

        tab.add_handler(cdp.network.ResponseReceived, response)
        await tab.send(cdp.network.enable())
        report["status"] = "navigation_error"
        await asyncio.wait_for(tab.get(TARGET), 20)
        deadline = time.monotonic() + 30
        previous = None
        stable = 0
        report["status"] = "no_experiences"
        while time.monotonic() < deadline:
            await asyncio.sleep(2)
            report["title"] = await asyncio.wait_for(tab.evaluate("document.title"), 5)
            html = await asyncio.wait_for(tab.get_content(), 5)
            report["experiences"] = parse(html, args.php)
            signature = json.dumps(report["experiences"], sort_keys=True)
            stable = stable + 1 if signature == previous else 0
            previous = signature
            if accepted(report["experiences"]) and stable >= 1:
                report["status"] = "ok"
                break
        report["url"] = await asyncio.wait_for(tab.evaluate("location.href.split('?')[0]"), 5)
        if report["status"] != "ok":
            title = report.get("title", "").lower()
            last = report["documents"][-1] if report["documents"] else {}
            if "just a moment" in title or last.get("mitigation") == "challenge":
                report["status"] = "challenge"
            elif last.get("status", 200) >= 400:
                report["status"] = "http_error"
            elif report["experiences"]:
                report["status"] = "incomplete_experiences"
    except Exception as error:
        report["error"] = {"type": type(error).__name__, "message": str(error)}
        if browser is None:
            from nodriver.core.util import get_registered_instances
            for instance in get_registered_instances():
                process = getattr(instance, "_process", None)
                if process and process.returncode is not None:
                    report["browserExitCode"] = process.returncode
                    report["browserStderr"] = (await process.stderr.read()).decode(errors="replace")[-3000:]
    finally:
        if browser:
            # Ask Chrome to close cleanly so its dedicated profile is flushed.
            try:
                await asyncio.wait_for(browser.connection.send(cdp.browser.close()), 5)
            except Exception:
                pass
            try:
                await asyncio.wait_for(browser._process.wait(), 5)
            except Exception:
                browser.stop()
                await asyncio.wait_for(browser._process.wait(), 5)
            report["browserClosed"] = browser._process.returncode is not None
            await asyncio.wait_for(browser.aclose(), 5)
        report["elapsedSeconds"] = round(time.monotonic() - began, 2)
        print(json.dumps(report), flush=True)


def run(args):
    report = {
        "startedAt": datetime.now(timezone.utc).isoformat(), "target": TARGET,
        "platform": platform.platform(), "python": platform.python_version(),
        "nodriver": importlib.metadata.version("nodriver"), "headless": False,
        "profileExisted": (ROOT / "profile").exists(),
        "manualIntervention": False, "runs": [], "status": "failed",
    }
    # Dedicated child process groups bound hangs and isolate browser cleanup.
    for attempt in range(2):
        child = subprocess.Popen(
            [sys.executable, __file__, "--worker", "--chrome", args.chrome,
             "--php", args.php], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, start_new_session=True,
        )
        result = {"status": "interrupted"}
        try:
            stdout, stderr = child.communicate(timeout=85)
            lines = [line for line in stdout.splitlines() if line.startswith('{')]
            result = json.loads(lines[-1]) if lines else {
                "status": "worker_error", "error": stderr[-2000:],
            }
        except subprocess.TimeoutExpired:
            result = {"status": "timeout"}
        except KeyboardInterrupt:
            result = {"status": "interrupted"}
        finally:
            # Only this probe's process group, never the user's Chrome sessions.
            if child.poll() is None:
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                except PermissionError as error:
                    result["cleanupError"] = str(error)
                    child.kill()
            child.communicate(timeout=5)
        report["runs"].append(result)
        if result["status"] != "ok":
            break
        if attempt == 0:
            time.sleep(3)
    if len(report["runs"]) == 2 and all(
        r["status"] == "ok" and r.get("browserClosed") for r in report["runs"]
    ):
        ids = [sorted(i["id"] for i in r["experiences"]) for r in report["runs"]]
        report["status"] = "ok" if ids[0] == ids[1] else "changed_between_runs"
    (ROOT / "reports").mkdir(exist_ok=True)
    path = ROOT / "reports" / (report["startedAt"].replace(":", "-") + ".json")
    path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    print(f"Report: {path}", file=sys.stderr)
    return 0 if report["status"] == "ok" else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chrome", default="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
                        if sys.platform == "darwin" else shutil.which("google-chrome"))
    parser.add_argument("--php", default=shutil.which("php"))
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    if sys.version_info[:2] != (3, 12):
        parser.error("Use Python 3.12; the pinned Nodriver package fails to import on Python 3.14.")
    if os.geteuid() == 0:
        parser.error("Run as a normal user; Chrome sandbox must remain enabled.")
    if not args.chrome or not Path(args.chrome).is_file() or not args.php:
        parser.error("Chrome and PHP CLI must exist; specify --chrome and --php if needed.")
    if sys.platform == "linux" and not os.environ.get("DISPLAY"):
        parser.error("Windowed Chrome needs a display. Run under xvfb-run on a headless server.")
    if args.worker:
        asyncio.run(visit(args))
        return 0
    with (ROOT / ".run.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            parser.error("Another diagnostic is using this profile.")
        return run(args)


if __name__ == "__main__":
    sys.exit(main())
