# Nodriver Tock diagnostic

## Scope

Branch: `codex/tock-nodriver-diagnostic`, based on main. The previous Puppeteer branch and diagnostic were discarded at Lindsay's request.

This standalone tool reads `https://www.exploretock.com/lecuvierwinery` using windowed regular Chrome, Nodriver and a dedicated persistent profile. It passes rendered HTML into the existing PHP experience parser without booting Laravel. No application cache, route, template, deployment setting or root dependency manifest is changed. No reservations are made.

It allows 30 seconds after navigation for experience data, requiring two consecutive identical parsed results with IDs, titles, descriptions and booking URLs. If the first visit succeeds, Chrome closes and a second process starts with the same profile. Overall success requires both visits to succeed and return the same experience IDs. This does not prove the list is exhaustive or future retrieval is reliable. Failure stops further live visits.

The manual run must be left untouched: do not click a challenge, sign in or interact with the diagnostic window. Reports label runs as having no manual intervention under that operating assumption; the tool cannot detect outside user input. If anyone intervenes, the result must be classified as assisted, not unattended success.

## Local installation and use

Use **Python 3.12**. Nodriver 0.50.3 fails to import on Python 3.14 because of an upstream source-encoding problem ([issue #35](https://github.com/ultrafunkamsterdam/nodriver/issues/35)). Earlier 0.50.2 and 0.48.1 packages also failed our 3.14 import checks. The 0.50.3 import succeeds on 3.12.14. No upstream package source was edited.

On this Mac an isolated Python 3.12.14 runtime was downloaded into `tools/tock-nodriver/.runtime/`; the system Python was not changed. The working environment is `.venv312/`. Dependencies are pinned in `requirements.txt`; Python, profiles, dependencies and reports are ignored by Git.

For a fresh checkout with Python 3.12 already available, from the repository root:

```sh
python3.12 -m venv tools/tock-nodriver/.venv312
```

```sh
tools/tock-nodriver/.venv312/bin/python -m pip install --cache-dir tools/tock-nodriver/.cache/pip -r tools/tock-nodriver/requirements.txt
```

Verify the dependency imports before opening a browser:

```sh
tools/tock-nodriver/.venv312/bin/python -c 'import nodriver; print("import OK")'
```

Run the parser-contract tests (offline, no Chrome or Tock requests):

```sh
tools/tock-nodriver/.venv312/bin/python -m unittest discover -s tools/tock-nodriver -p 'test_*.py' -v
```

Run the live diagnostic:

```sh
tools/tock-nodriver/.venv312/bin/python tools/tock-nodriver/diagnose.py
```

Mac Chrome defaults to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. PHP is found on PATH. Use `--chrome /absolute/executable` and `--php /absolute/executable` when necessary. The local test used Herd's PHP executable at `/Users/LMASTEN1/Library/Application Support/Herd/bin/php`.

JSON reports live in `tools/tock-nodriver/reports/`. Exit 0 means both visits passed; exit 1 means a failed/changed result; exit 2 means invalid prerequisites or another running probe. Each visit has an 85-second external deadline. A file lock prevents concurrent use of the profile. Chrome's own sandbox remains enabled; root execution is rejected. The dedicated `profile/` persists for future visits and must not be committed, copied from a personal profile, or shared between simultaneous jobs.

## Recorded local result — September 16, 2026

Final validation at **17:14:03 UTC** succeeded unattended on macOS arm64, Python 3.12.14, Nodriver 0.50.3 and regular Chrome 153.0.8010.48:

| Visit | HTTP | Experiences | Browser PID | Closed | Duration including cleanup |
| --- | --- | --- | --- | --- | --- |
| First | 200 | 3 | 11897 | Yes | 10.75 seconds |
| After restart | 200 | Same 3 IDs | 11953 | Yes | 10.46 seconds |

The parser extracted **The “Original” Wine & Food Pairing**, **Entrée & Flight Experience**, and **Wine, Cheese & Charcuterie**, including descriptions, prices, schedules, party sizes and booking URLs. No manual challenge interaction, login or personal Chrome profile was used. The dedicated profile already existed from this diagnostic's earlier automated attempts.

Evidence: `tools/tock-nodriver/reports/2026-09-16T17-14-03.604062+00-00.json` (local ignored report). Both offline parser-contract tests and PHP syntax validation passed. Earlier setup attempts failed before retrieval; Python compatibility and launch/cleanup diagnostics were corrected before this final run.

This establishes local reading and browser-restart success. It does not isolate whether the library, windowed mode, profile, different endpoint or their combination caused success versus the discarded Puppeteer test. It does not establish production compatibility or long-term reliability.

## Production workflow

Use [the production fallback runbook](tock-production-fallback.md). Production is deployed **only from main**, by Lindsay clicking Deploy in Forge. Never deploy this diagnostic branch separately. The diagnostic runs twice for restart verification; scheduled production uses `collect.py` for one visit only.
