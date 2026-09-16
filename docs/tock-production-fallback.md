# Tock fallback: production runbook

Activated and verified in production on September 16, 2026. **Production deploys only main**, using Lindsay's Forge GUI button. GitHub pushes do not trigger deployment. No feature-branch deployment or Forge CLI installation.

## Verified production setup

- Deployed implementation: merge `44098c1`, feature commit `48c3613`.
- Ubuntu 24.04 x86_64; PHP 8.5.4 with DOM, JSON and mbstring verified; Python 3.12.3.
- Python venv support, Xvfb and xauth installed; Xvfb startup verified as `forge`.
- Google Chrome 153.0.8010.47 installed at `/usr/bin/google-chrome` from Google's amd64 Debian package. Package previews and installation reported no existing-package upgrades or removals.
- `/home/forge/tock-runtime` is owned by `forge:forge`, mode 700. Its `venv` contains the pinned dependencies below; Nodriver import passed.
- Three previous experiences backed up to `legacy-backup.json` before deployment, then imported successfully using `tock:seed`.
- Manual production collector returned HTTP 200, all three experiences and `browserClosed: true` in 15.34 seconds. Full `tock:refresh` subsequently returned `browser_ok` and published a valid snapshot.
- Forge job **Tock Experiences — Refresh Saved Data** runs as `forge` every five minutes (`*/5 * * * *`), using the command in section 5. Existing Composer-update and unused-package maintenance jobs were left unchanged.
- Scheduled execution advanced `last_attempt_at` while retaining `last_browser_attempt_at`, with outcome `browser_cooldown`: six-hour eligibility was respected.
- Production now has `TOCK_BROWSER_ENABLED=true` and `TOCK_SNAPSHOT_READS=true`. The other paths match section 3. Config cache was rebuilt after activation.
- Live browser verification: Wine Tasting displayed all three experiences, and search for `cheese` returned Wine, Cheese & Charcuterie with its Wine Tasting anchor link and no experience-unavailable warning.
- Actual production environment has `STATAMIC_STATIC_CACHING_STRATEGY=null`; it was left unchanged. Full static caching was covered by local tests, not enabled for production verification.
- Forge deployment script was left unchanged. It deploys in place, checks for a clean tree and fast-forward history, runs Composer install, reloads PHP-FPM, builds assets and runs optimize/Stache/search commands. Its Composer hooks clear Laravel cache; persistent Tock runtime files are outside that cache and checkout.

Use Forge GUI recipes for setup and checks. Lindsay runs them on **le-cuvier only**. Installation recipes run as `root`; Python environment, collector and application commands run as `forge`. Forge sometimes showed no output in its run viewer even when emailed logs contained successful results; consult emailed logs before repeating an operation. Related checks can be grouped in one recipe. The sections below document the original installation/activation sequence; do not repeat it on an already activated server.

## Behavior

- New snapshot-read and browser-fallback modes default **off**. With modes off, the old PHP/cache behavior remains unchanged.
- One Forge scheduled command runs `php artisan tock:refresh` every five minutes. No queue worker is needed.
- Every refresh tries the existing direct Tock HTTP source, then the existing rendered HTTP source. Valid PHP data never starts Chrome.
- Only after both sources fail, and browser fallback is enabled, may Nodriver run **once per six hours**. Failed attempts also consume the cooldown. Persistent HTTP failure permits at most four browser attempts daily.
- The production collector makes **one visit**, not the diagnostic's two. Its supervisor allows 85 seconds, then terminates its own process group with five seconds of grace. PHP's process timeout is 100 seconds. Chrome and per-run Xvfb exit; only the dedicated profile remains on disk.
- Filesystem locks prevent concurrent refreshes/browser use. The attempt timestamp is saved before launch. Laravel cache clearing cannot reset cooldown state or delete the last-good snapshot.
- Valid data atomically replaces the snapshot. Failed/empty/malformed results preserve last-good data indefinitely, matching existing behavior. `tock:status` reports age and outcome; retained data is not described as fresh.
- Snapshot-enabled visitor requests read saved data only: no external HTTP requests or browser launches. Wine Tasting and search share the repository. Their design, content and templates are unchanged. The block already uses `nocache`; search already sends no-store/uncacheable headers.
- Browser-sourced description/price changes can take approximately six hours to appear while HTTP is blocked. Booking availability stays handled by Tock.

## Local / Git sequence

Finish tests, commit the feature branch, confirm production edits have been pushed by Git Automation, pull latest main, merge and rerun affected checks, then push main. Wait on deployment while preparing the server. Requirements are pinned in `tools/tock-nodriver/requirements.txt`; root dependency files are unchanged.

## 1. Production read-only checks

Use Forge's GUI recipes, grouping related checks when useful. Confirm clean working tree, main, fetched origin and no local-only commits before deployment:

```sh
git -C /home/forge/le-cuvier-dpslpel8.on-forge.com status --short --branch
```

After reviewing that result:

```sh
git -C /home/forge/le-cuvier-dpslpel8.on-forge.com fetch origin
```

```sh
git -C /home/forge/le-cuvier-dpslpel8.on-forge.com rev-list --left-right --count HEAD...origin/main
```

The left count must be zero. Inspect the actual Forge deploy script and active release path; do not discard live edits.

Inspect separately: `uname -m`, `python3.12 --version`, `php --version`, `php -m`, `free -h`, `df -h /home/forge`, `command -v google-chrome`, `command -v xvfb-run`. Screenshots show Ubuntu 24.04, PHP 8.5, 4 GB RAM and 2 vCPU; architecture and installed libraries remain unverified.

## 2. Add missing prerequisites

Needed: Python 3.12 venv support, regular Chrome for the server architecture, its Linux libraries, Xvfb and xauth. Do not copy Mac binaries, a Mac venv or a personal Chrome profile. Python 3.14 fails importing pinned Nodriver; isolated local 3.12.14 works.

Preview package changes first:

```sh
apt-get --simulate install python3.12-venv xvfb xauth
```

Choose the Chrome installation command after checking architecture and package inventory. Review upgrades/removals and service restart implications before installation. Do not change PHP/Node defaults, Nginx, queue configuration or browser sandbox settings. No public port or permanent display/browser service is needed.

Create private persistent storage outside the deployment checkout as `forge`:

```sh
install -d -m 700 /home/forge/tock-runtime
```

```sh
python3.12 -m venv /home/forge/tock-runtime/venv
```

Install the exact reviewed requirements from **main**. Before deployment, the equivalent pinned installation is:

```sh
/home/forge/tock-runtime/venv/bin/python -m pip install 'Deprecated==1.3.1' 'mss==10.2.0' 'nodriver==0.50.3' 'websockets==17.1' 'wrapt==2.4.1'
```

```sh
/home/forge/tock-runtime/venv/bin/python -c 'import nodriver; print("import OK")'
```

## 3. Preserve data and configure disabled defaults

Normal Composer deployment invokes Statamic installation and clears Laravel cache. **Before Deploy**, export `tock.lecuvier.experiences.last-good.v2` from the current application to `/home/forge/tock-runtime/legacy-backup.json`. A reviewed one-shot PHP command will be supplied after checking the live checkout/PHP path. It must write only that cache value and validate nonempty data; do not print environment contents or clear caches during preparation.

The backup protects the data but does not itself prevent a brief legacy cache miss during deployment. Inspect the actual deploy script before promising zero interruption.

Add only these integration settings via Forge's environment editor, with executable paths verified:

```dotenv
TOCK_SNAPSHOT_READS=false
TOCK_BROWSER_ENABLED=false
TOCK_RUNTIME_PATH=/home/forge/tock-runtime
TOCK_PYTHON=/home/forge/tock-runtime/venv/bin/python
TOCK_CHROME=/usr/bin/google-chrome
TOCK_XVFB=/usr/bin/xvfb-run
TOCK_PHP=/usr/bin/php8.5
```

No local environment file is changed. Runtime ownership must match the existing site process user; never make it world-writable.

## 4. Deploy main and verify

Lindsay clicks Forge Deploy when preparation is complete. After deployment, from the live checkout:

```sh
php artisan tock:seed --file=/home/forge/tock-runtime/legacy-backup.json
```

This validates/imports saved experiences only if no valid snapshot exists. Without `--file`, it reads the old cache. It makes no external request and records unknown freshness for legacy data.

```sh
php artisan tock:status
```

Enable `TOCK_BROWSER_ENABLED=true`, leaving snapshot reads off for first verification. Refresh Laravel config cache according to the existing deploy process whenever integration settings change.

```sh
php artisan tock:refresh
```

Check status, real experience fields and Forge resource use. PHP success must not start a browser. If HTTP works and a separate browser-installation test is needed, run the deployed `collect.py` once explicitly with the configured paths. Direct collector invocation bypasses the six-hour PHP eligibility check and is **not** a routine refresh command. Do not erase cooldown state to force a test.

Require real production data and confirmed Chrome/Xvfb shutdown. Local Mac success does not prove Linux/IP success. Keep saved data on failure and investigate before activation.

## 5. Activate scheduled refresh and snapshot reads

Create **one** Forge scheduled job, every five minutes, as `forge`. Verify the paths first:

```sh
cd /home/forge/le-cuvier-dpslpel8.on-forge.com && /usr/bin/php8.5 artisan tock:refresh
```

Each HTTP source has a 15-second timeout; the browser has its own supervisor deadline. Use a 150-second job limit if Forge exposes one. Do not install a second scheduling mechanism for the same command.

Verify a scheduled invocation and a valid populated snapshot. Then enable `TOCK_SNAPSHOT_READS=true`, refresh config cache and check Wine Tasting plus search with production static caching active. No broad cache-strategy change or template edit is planned.

## Status and rollback

`php artisan tock:status` reports flags, validity, count, age, source and operational state without fetching anything. Imported legacy data has unknown age until refreshed.

Disable browser fallback alone to retain PHP refreshes and snapshot reads. For full rollback, disable snapshot reads and the scheduled job; retain runtime data/profile. Old request-time/cache limitations return in legacy mode. Never delete cooldown state, snapshots or profiles as routine deployment cleanup.

Activation is complete. Future automated retrieval can still fail if Tock changes its page or access checks; the last valid snapshot remains available and `tock:status` exposes its age and latest outcome. No ongoing browser process or additional paid service was added.
