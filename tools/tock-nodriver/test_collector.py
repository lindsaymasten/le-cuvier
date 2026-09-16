import os
from pathlib import Path
import sys
import tempfile
import time
import unittest

from collect import supervise


class CollectorLifecycle(unittest.TestCase):
    def test_success_requires_confirmed_browser_shutdown(self):
        result = supervise([sys.executable, "-c", 'print(\'{"status":"ok"}\')'])
        self.assertEqual(result["status"], "cleanup_failed")

    def test_timeout_terminates_worker_and_its_child(self):
        with tempfile.TemporaryDirectory() as directory:
            pid_file = Path(directory) / "pid"
            script = (
                "import subprocess,sys,time; from pathlib import Path; "
                "p=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); "
                "Path(sys.argv[1]).write_text(str(p.pid)); time.sleep(60)"
            )
            result = supervise([sys.executable, "-c", script, str(pid_file)], timeout=1)
            self.assertEqual(result["status"], "timeout")
            pid = int(pid_file.read_text())
            for _ in range(20):
                try:
                    os.kill(pid, 0)
                except ProcessLookupError:
                    return
                time.sleep(0.1)
            self.fail("Worker child survived timeout cleanup")


if __name__ == "__main__":
    unittest.main()
