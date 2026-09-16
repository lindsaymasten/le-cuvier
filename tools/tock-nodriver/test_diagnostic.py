import shutil
import unittest

from diagnose import ROOT, accepted, parse


class ParserContract(unittest.TestCase):
    def test_existing_fixture_preserves_experience_fields(self):
        items = parse((ROOT / "../../tests/Fixtures/tock-widget.html").read_text(), shutil.which("php"))
        self.assertTrue(accepted(items))
        self.assertEqual([item["id"] for item in items], ["184594", "191491", "353861"])
        self.assertEqual(items[0]["schedule"], "FRIDAY—MONDAY")
        self.assertEqual(items[0]["party_size_label"], "2–6 guests")
        self.assertEqual(items[0]["prices"], ["$10 | members", "$45 | non-members to be paid on-site"])

    def test_challenge_cannot_pass_as_experience_data(self):
        items = parse("<html><title>Just a moment...</title></html>", shutil.which("php"))
        self.assertEqual(items, [])
        self.assertFalse(accepted(items))


if __name__ == "__main__":
    unittest.main()
