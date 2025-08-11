# Le Cuvier Website (Statamic + Bedrock + Commerce7)

Custom winery site built on **Statamic (Laravel)** using the **Bedrock** starter kit and a bespoke, accessible primary navigation. **Commerce7 Front-end v2** integration is planned (cart, auth, collections).

## Stack
- PHP 8.4 · Laravel 12 · Statamic Pro (latest)
- Bedrock (Vite · Tailwind · Alpine)
- Node + Vite dev server
- Herd local dev — domain: `https://le-cuvier.test`

## Getting Started
1. Copy `.env.example` → `.env` and set:
   - `APP_URL=https://le-cuvier.test`
   - `APP_KEY=` (generate with `php artisan key:generate` if blank)
2. Install dependencies:
   ```bash
   composer install
   npm install
   ```
3. Create a super user:
   ```bash
   php please make:user
   ```
4. Start development:
   ```bash
   npm run dev
   ```
   Open `https://le-cuvier.test/`.

## Project Structure (high level)
```
resources/
  css/
    site.css                  # Tailwind entry (imports components & utilities)
    components/
      nav.css                 # Custom primary nav (overrides Bedrock where needed)
  js/
    site.js                   # Vite JS entry
    nav.js                    # Nav interactions (drawer, focus, cart badge)
  views/
    layout.antlers.html       # Loads Vite CSS/JS
    partials/
      header.antlers.html     # Renders only our nav partial
      nav.antlers.html        # Custom nav markup (CMS-driven links)
```
## Navigation Notes
- Custom nav **replaces** Bedrock’s header.
- Links come from Statamic Navigation: `handle="header"`.
- Drawer is accessible (focus trap, ESC close, `aria-live` updates).
- Center logo is injected on desktop: JS clones `.center-logo` and adds `.desktop-only`.

## Commerce7 (planned)
- Dynamic cart count (placeholder ready; listens for `c7:cart:change`).
- Open side cart when `window.c7action.showSideCart()` is available.
- Login via modal (no dropdown), homepage product collections.

## Git
- Default branch: `main`
- Remote: `origin` → `git@github.com:lindsaymasten/le-cuvier.git`
- Typical flow:
  ```bash
  git pull --rebase
  git push
  ```

## Environment
Never commit `.env`. Keep a sanitized `.env.example` for setup.

## License
Private project.
