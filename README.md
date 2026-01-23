# Le Cuvier
Winery ecommerce site built on **Statamic (Laravel)** using a **Commerce7** integration by Web & Wolf LLC. 

## Stack
- PHP 8.4 · Laravel 12 · Statamic Pro
- Bedrock (Vite · Tailwind · Alpine)
- Node + Vite

## Deployment Workflow
Uses Statamic Git Automation so that content and assets edited in the Statamic Control Panel are committed to GitHub automatically on save by the production server bot. Production deployment via Laravel Forge.
- Templates, CSS, JavaScript, and configuration files are committed to GitHub from local test environment.
 - Always pull before working locally.
 - Before starting work:
```
git checkout main
git pull origin main
```
 - Do not edit content, users, or assets over SSH on production.
- Content, globals, users, and uploaded assets are edited in Statamic and are automatically committed and pushed to GitHub by Statamic Git Automation.

### Emergency Recovery
 If production ever becomes out of sync with GitHub and must be restored:
 ```
git fetch origin
git reset --hard origin/main
php please stache:clear
php please stache:warm

 ```
 _This will discard any unpushed CP edits on the server._

## License
Private project.
