# AGENTS.md — Le Cuvier Winery Website

This file is the durable working agreement for Codex in the Le Cuvier repository. Follow it before making plans, editing files, running commands, or suggesting refactors.


## Project identity

Le Cuvier is a winery ecommerce website built with Statamic on Laravel and integrated with Commerce7. The site is not a generic Laravel app and not a generic ecommerce rebuild. Statamic owns the website/CMS layer. Commerce7 owns ecommerce, account, cart, checkout, clubs, and product-purchase behavior.

Primary local project path:

```text
/Users/lindsaymasten/Herd/le-cuvier
```

Local site URL:

```text
https://le-cuvier.test/
```

Production path, for reference only:

```text
/home/forge/le-cuvier-dpslpel8.on-forge.com
```

GitHub repository:

```text
lindsaymasten/le-cuvier
```

Default/deploy branch:

```text
main
```


## Project Architecture Overview

**Bedrock** is a Statamic starter-kit that demonstrates a Statamic CMS built on Laravel with a flat-file architecture. This is a sophisticated CMS project with custom CLI tooling and a component-based architecture.

- **Demo Site**: https://bedrock.remarkable.dev
- **Primary Tech Stack**: Statamic (Laravel CMS), Antlers templating, TailwindCSS, AlpineJS
- **Architecture Pattern**: Component-based with modular blocks and sets
- **Content Strategy**: Flat-file CMS with YAML front matter and Markdown content

## Core Technologies & Their Usage

### Statamic CMS (Laravel-based)
- **Flat-file CMS**: Content stored in YAML/Markdown files, not database
- **Control Panel**: Available at `/cp` for content management
- **Collections**: Posts, Pages, Team, Testimonials
- **Custom CLI Commands**: `php please make:block`, `php please make:set`, etc.

### Templating & Frontend
- **Antlers**: Statamic's templating engine (similar to Twig/Blade)
- **TailwindCSS**: Utility-first CSS framework
- **AlpineJS**: JavaScript framework for interactive components
- **Embla Carousel**: Lightweight carousel library


## Current stack and source of truth

This project is a Laravel + Statamic + Commerce7 site using Bedrock patterns, Vite, Tailwind, Alpine, Antlers, and vanilla CSS components.

Current repo dependency files are the source of truth when they conflict with older notes or README text. Check `composer.json`, `composer.lock`, `package.json`, and `package-lock.json` before making version-specific assumptions.

Known current architecture from the repo:

- Laravel 12.
- Statamic Pro/CMS. Check `composer.json` for the exact current Statamic version before making version-specific changes.
- PHP requirement is defined by `composer.json`; do not assume the README is current if it conflicts.
- Vite is the frontend build tool.
- Tailwind is present, but this project also uses explicit vanilla CSS component files.
- Alpine is present and should be used only for small behavior/state interactions.
- Commerce7 Front-end V2 is the only Commerce7 frontend integration to use unless Lindsay explicitly asks otherwise.


## Architecture Patterns

### 1. Blocks System (Page Building)
Blocks are reusable page-building components based on Statamic's Replicator fieldtype:

```
resources/views/blocks/           # Block templates
resources/fieldsets/blocks.yaml  # Block definitions
resources/fieldsets/{name}.yaml  # Individual block fieldsets
```

**Creating Blocks:**
```bash
php please make:block          # Creates fieldset + template + adds to blocks.yaml
php please delete:block        # Removes block and all associated files
```

**Block Naming Convention:**
- Files: `kebab-case` (e.g., `blog-excerpt.antlers.html`)
- Fieldsets: `snake_case` (e.g., `blog_excerpt.yaml`)

### 2. Sets System (Content Composition)
Sets are content components for articles/posts using Statamic's Bard fieldtype:

```
resources/views/sets/           # Set templates
resources/fieldsets/article.yaml # Article field with sets
resources/fieldsets/{name}.yaml  # Individual set fieldsets
```

**Creating Sets:**
```bash
php please make:set           # Creates set fieldset + template + adds to article.yaml
php please delete:set         # Removes set and associated files
```

### 3. Component Hierarchy

```
resources/views/
├── blocks/                    # Page building blocks (Replicator fields)
├── components/               # Project-specific reusable components
│   └── ui/                   # shadcn/ui style Alpine.js components
│       └── form/             # Form-specific components
│           └── fields/       # Individual form field types
├── partials/                 # Template fragments (not highly reusable)
│   └── alpine/              # Alpine.js specific partials
├── posts/                   # Posts collection templates
├── sets/                    # Content sets for Article blocks
├── sitemap/                 # Sitemap templates
└── errors/                  # Error page templates
```

## Development Guidelines

### File Naming Conventions
- **Antlers Templates**: `kebab-case.antlers.html`
- **YAML Files**: `snake_case.yaml` or `kebab-case.yaml`
- **PHP Classes**: `PascalCase.php`
- **CSS Files**: `kebab-case.css`
- **JavaScript**: `camelCase.js`

### Component Development Patterns

#### 1. Creating New Blocks
When creating page-building blocks:
1. Use the CLI: `php please make:block`
2. Follow the existing block structure in `resources/views/blocks/`
3. Keep blocks focused and reusable
4. Include proper Antlers conditionals for optional fields

#### 2. Creating UI Components
For reusable UI components:
- Place in `resources/views/components/ui/`
- Follow shadcn/ui patterns and naming
- Use AlpineJS for interactivity
- Apply Tailwind classes consistently

#### 3. Styling Guidelines
- **Primary Framework**: TailwindCSS
- **Custom Config**: `resources/css/config.css`
- **Typography**: Customized prose classes in `resources/css/typography.css`
- **Component Styles**: Use `@apply` directives for component-specific styles

### Statamic-Specific Patterns

#### Content Structure
```
content/
├── collections/           # Content collections
│   ├── pages/            # Static pages
│   ├── posts/            # Blog posts
│   ├── team/             # Team members
│   └── testimonials/     # Customer testimonials
├── globals/              # Global content (site settings, etc.)
├── navigation/           # Navigation menus
└── taxonomies/           # Categories, tags, etc.
```

#### Fieldset Patterns
- Use consistent field naming across fieldsets
- Include `common.yaml` for shared fields
- Follow existing field group patterns
- Include proper field instructions and validation

#### Antlers Template Patterns
```antlers
{{# Conditional rendering #}}
{{ if field_name }}
    <div>{{ field_name }}</div>
{{ /if }}

{{# Collection loops #}}
{{ collection:posts limit="5" }}
    <article>{{ title }}</article>
{{ /collection:posts }}

{{# Partials inclusion #}}
{{ partial:components/ui/button :content="button_text" }}
```

## CLI Commands & Workflows

### Development Commands
```bash
# Start development environment
composer run dev              # Runs Laravel dev server + npm dev + queue

# Content Management
php please make:user         # Create Statamic user
php please stache:warm       # Warm content cache
php please static:clear      # Clear static cache

# Asset Management
npm run dev                  # Development build
npm run build               # Production build
```

### Custom CLI Commands
```bash
# Block Management
php please make:block       # Create new block
php please delete:block     # Remove block

# Set Management
php please make:set         # Create new set
php please delete:set       # Remove set
```

## High-level architecture

### Statamic/Laravel layer

- Statamic renders the website, page structure, CMS content, globals, blueprints, blocks, templates, partials, navigation, and non-Commerce7 UI.
- Laravel routes are used where needed for custom behavior.
- Antlers templates are the default view layer. Do not convert Antlers to Blade unless explicitly asked or unless an existing file already uses Blade and the task is specific to that file.

Important paths:

```text
routes/web.php
app/Http/Controllers/
resources/views/
resources/views/layout.antlers.html
resources/views/partials/
resources/views/blocks/
resources/css/site.css
resources/css/components/
resources/js/site.js
```

### Commerce7 layer

Commerce7 owns ecommerce behavior. The site should integrate with Commerce7 rather than recreate it.

- The global layout conditionally loads Commerce7 V2 CSS and JavaScript from Commerce7 globals.
- Commerce7 globals such as `commerce7:enable_c7`, `commerce7:tenant_id`, `commerce7:c7_css_url`, `commerce7:c7_js_url`, `commerce7:c7_script_id`, and `commerce7:c7_defer` are used by the layout.
- Product pages route through Laravel/Statamic and mount Commerce7 content in `#c7-content`.
- Cart, club, checkout, and profile/account routes are Statamic routes that rely on Commerce7 rendering and behavior.
- The navigation includes Commerce7 account and cart mount points.

Do not replace Commerce7 widgets with a custom ecommerce implementation. Do not reintroduce Commerce7 Front-end V1. Do not attempt an API/SSR product rebuild unless Lindsay explicitly asks.

### Product pages

Product pages use:

```text
GET /product/{handle}
app/Http/Controllers/ProductController.php
resources/views/product.antlers.html
```

The product template mounts:

```html
<div id="c7-content"></div>
```

Earlier SSR/API product-page work hit Commerce7 401 tenant issues and was intentionally deferred. The current working direction is Commerce7 client/widget rendering unless Lindsay reopens the API/SSR task.

### Layout and global assets

The main layout is:

```text
resources/views/layout.antlers.html
```

It is responsible for global head/body structure, SEO partials, browser appearance, Commerce7 asset loading, Vite CSS, header/nav, template content, footer, pushed scripts, site JavaScript, and footer scripts.

The main CSS entry is:

```text
resources/css/site.css
```

Preserve the import structure and order unless the task specifically requires changing it. CSS is organized into config, tokens, global styles, elements, objects, components, and utilities.

### CSS conventions

- Prefer existing CSS architecture over new one-off systems.
- Put component-specific styling in the matching file under `resources/css/components/`.
- All typographic styles relating specifically to Article blocks and other text-based blocks belong in:

```text
resources/css/components/typography.css
```

- Scope Commerce7 overrides to Le Cuvier/project classes or specific Commerce7 integration areas.
- Do not make broad global CSS resets or global element changes unless explicitly asked.
- Flexbox is preferred for layout unless an existing component uses grid or grid is specifically appropriate/requested.
- No floats.
- No JavaScript for layout unless there is no reasonable CSS/HTML approach and Lindsay approves.

### JavaScript conventions

The main JavaScript entry is:

```text
resources/js/site.js
```

It initializes Alpine, imports small behavior scripts, and contains targeted site behavior.

- Keep JavaScript minimal and behavior-focused.
- Do not use JavaScript to solve pure layout problems.
- Do not add frontend frameworks.
- Do not rewrite working vanilla scripts into a framework.
- Keep imports explicit and localized.

### Navigation

Navigation uses Statamic navigation data, not hardcoded page links.

- The current nav partial uses `{{ nav handle="header" ... }}`.
- Do not hardcode primary navigation links unless explicitly asked.
- Preserve accessibility affordances such as the aria-live region, mobile drawer labels, account/cart labels, and keyboard-relevant behavior.

### Content and assets

Production uses Statamic Git Automation for content and assets edited in the Control Panel.

- Code/template/CSS/JS/config changes are made locally and committed through normal Git workflow.
- Content, globals, users, and uploaded assets are edited in Statamic Control Panel and may be committed automatically by production Git Automation.
- Do not edit production content, users, or uploaded assets over SSH.
- Do not casually change content files locally during code refactors. If content changes are necessary, call them out clearly.

## Refactoring rules

Most Codex work on this project should be narrow refactoring, not redesign.

When refactoring:

- Preserve the frontend design unless Lindsay explicitly asks for a visual change.
- Preserve current CMS behavior.
- Preserve existing class names unless the task is specifically to rename/restructure them.
- Preserve Commerce7 mount points and required IDs/classes.
- Avoid changes that would require client-side content authors to relearn the CMS unless explicitly requested.
- Do not remove comments that explain integration behavior unless they are obsolete and the cleanup is requested.
- Keep changes reviewable.

## Testing and verification

Choose the smallest verification that matches the change.

Common local checks:

```bash
npm run build
```

```bash
php artisan test
```

```bash
php please cache:clear
```

Do not run the full Composer `dev` script without permission because it starts multiple long-running processes. Do not run install/update commands unless explicitly asked.

When finished, report:

- Files changed.
- What was changed.
- What was intentionally not changed.
- Verification command(s) run and results.
- Any risks or follow-up questions.

## Deployment preferences

Production deployment is via Laravel Forge, not manual production `git pull`, unless Lindsay explicitly asks otherwise.

Before any production deploy is even considered, confirm:

- Production working tree is clean.
- Production is on the expected branch.
- Origin has been fetched.
- Production is only behind `origin/main` and has no local-only commits.

Do not deploy, push, or modify production unless Lindsay explicitly asks.

## Protected files and actions

Do not touch these without explicit permission:

```text
.env
.env.*
composer.lock
package-lock.json
config/*
database/*
storage/*
vendor/*
node_modules/*
public/build/*
```

Lockfiles may change only when Lindsay explicitly asks to install, remove, or update dependencies.

Be especially cautious with:

```text
content/*
users/*
public/assets/*
resources/blueprints/*
resources/fieldsets/*
```

Blueprints and fieldsets may be legitimate code/CMS-structure changes, but they affect the Control Panel editing experience and should not be changed casually.

## Preferred task workflow

For each task:

1. Restate the requested outcome briefly.
2. Inspect relevant files.
3. Identify the smallest safe change.
4. Make the change.
5. Run the relevant check if safe.
6. Show the diff summary.
7. Stop and wait for Lindsay’s next direction.

Do not continue into adjacent improvements after completing the requested change.


## Common Patterns & Best Practices

### 1. Working with Collections
- Use collection tags in Antlers templates
- Leverage Statamic's built-in filtering and pagination
- Follow REST-like URL patterns for collection routes

### 2. Asset Management
- Store assets in `public/assets/`
- Use Statamic's asset management for uploads
- Optimize images using Statamic's image manipulation

### 3. Form Handling
- Define forms in `resources/forms/`
- Create custom form field templates in `resources/views/components/ui/form/`
- Use snake_case for form field names to match Statamic conventions

### 4. SEO & Performance
- Utilize full static caching in production (`STATAMIC_STATIC_CACHING_STRATEGY=full`)
- Include proper meta tags using SEO globals
- Optimize images and use responsive image techniques

## Code Style Guidelines

### PHP (Laravel/Statamic)
- Follow PSR-12 coding standards
- Use Laravel's coding conventions
- Leverage Statamic's helper methods and facades
- Keep controller methods thin, use services for business logic

### Antlers Templates
- Use consistent indentation (2 spaces)
- Keep logic minimal in templates
- Use partials for reusable template fragments
- Include comments for complex conditional logic

### CSS (Tailwind)
- Prefer utility classes over custom CSS
- Use `@apply` for component-specific styling
- Follow mobile-first responsive design
- Group related utilities logically

### JavaScript (Alpine.js)
- Keep Alpine.js data simple and focused
- Use `x-data` for component state
- Follow Alpine.js naming conventions
- Avoid complex logic in Alpine directives
- If the component uses more than a few methods, create a separate JS file and load conditionally when component is used. Check for example inside `resources/views/components/ui/form/combobox.antlers.html`

## Troubleshooting & Common Issues

### Statamic-Specific
- **Cache Issues**: Run `php please stache:warm` after content changes
- **Asset Issues**: Check asset container configuration in `content/assets/`
- **Template Errors**: Verify Antlers syntax and field names
- **Collection Issues**: Check collection configuration in `content/collections/`

### Development Environment
- **Local Development**: Use `composer run dev` for full development stack
- **Build Issues**: Clear caches and rebuild assets
- **Permission Issues**: Ensure proper file permissions for `storage/` and `content/`

## When Working on This Project

1. **Always use the CLI commands** for creating blocks and sets rather than manual file creation
2. **Follow the established component hierarchy** - don't create components in wrong directories
3. **Test in both development and static generation modes** since this supports static site generation
4. **Consider SEO implications** - this is a marketing/business website
5. **Maintain the existing design system** - it follows shadcn/ui patterns with Tailwind
6. **Remember this is a flat-file CMS** - content changes are file-based, not database-based


## Non-negotiable safety rules

- Work only inside this repository unless Lindsay explicitly asks otherwise.
- Do not modify parent directories, sibling Herd sites, global shell config, global Composer config, global npm config, Herd config, Valet config, SSH config, or Codex config unless explicitly asked.
- Do not modify environment files or environment settings unless explicitly asked. This includes `.env`, `.env.*`, app keys, database settings, Commerce7 credentials, Forge settings, Herd settings, and machine-level PHP/Node/Composer settings.
- Do not run destructive commands unless explicitly asked. This includes `rm -rf`, `git reset`, `git clean`, force pushes, database resets, migrations that alter data, and any command that discards local or production state.
- Do not commit, push, deploy, SSH into production, or run Forge deploys unless explicitly asked.
- Do not add, remove, or update dependencies unless explicitly asked. Do not run `composer update`, `npm update`, or package-install commands as a side effect of refactoring.
- Do not run long-lived servers without permission. Herd serves the local Laravel site; `npm run dev` may be appropriate only when Lindsay wants an active Vite dev session.
- Do not edit generated/vendor/cache directories directly, including `vendor/`, `node_modules/`, `storage/framework/`, and Vite build output.

## Before doing work

1. Run or request a `git status` check first.
2. Confirm the current branch before editing.
3. Inspect the relevant existing files before proposing changes.
4. State a concise plan with the exact files expected to change.
5. Make the smallest targeted change that satisfies the request.
6. Preserve existing behavior unless Lindsay explicitly asks for behavior changes.

Do not perform a broad cleanup, rename, formatting pass, architectural rewrite, or design change while doing a focused task.


## Canonical documentation

When external documentation is needed, prefer these sources:

- Statamic documentation: `https://statamic.dev/`
- Bedrock starter repository: `https://github.com/jasonbaciulis/bedrock`
- Commerce7 Design Docs, Front-end V2 only: `https://design-docs.commerce7.com/`
- Commerce7 Developer Docs: `https://developer.commerce7.com/docs/`

Do not use Commerce7 Front-end V1 examples. Do not invent Statamic/Antlers syntax.


## Communication style

Lindsay prefers concise, practical, high-signal development help.

- Give one terminal command at a time when commands are needed.
- Label commands as `LOCAL` or `PRODUCTION` when context matters.
- Do not give multi-command scripts unless Lindsay asks for them.
- Do not guess when file contents, APIs, or framework behavior matter. Inspect the repo or check the canonical docs.
- If something is uncertain, say so directly and identify the missing file, setting, or documentation.
- Do not propose code until enough context has been checked.
- Do not silently remove functionality.
- Do not summarize documentation pages unless asked.
- Prefer complete copy-pasteable file replacements or narrow diffs over vague descriptions.
- Explain risky changes before making them.


## Helpful Resources

- [Statamic Documentation](https://statamic.dev/)
- [Antlers Template Language](https://statamic.dev/antlers)
- [Statamic Fieldtypes](https://statamic.dev/fieldtypes)
- [Laravel Documentation](https://laravel.com/docs) (underlying framework)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Alpine.js Documentation](https://alpinejs.dev/)
