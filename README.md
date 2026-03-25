# parcel-cornerstone

A static-first site template using Parcel, PostHTML, Alpine.js, and Vercel.

**[Live Demo](https://parcel-cornerstone.vercel.app)**

Build-time localization and component composition produce fully static HTML
served from a CDN. Alpine.js handles client-side interactivity, and Vercel
serverless functions provide JSON APIs.

## Overview

A personal template for building static sites with optional dynamic features.

The goal is a modern developer experience (HMR, component modulation, i18n) that
compiles down to static files with minimal JavaScript.

- **Build Tool:** Parcel 2 — zero-config bundler with HMR.
- **Transformer:** Custom Parcel plugin (`parcel-transformer-cornerstone`) —
  resolves `<include>` tags, injects locale data, and processes Markdown at
  build time with full dependency tracking for HMR.
- **Templating:** PostHTML Expressions — build-time `{{ }}` variable injection.
- **Interactivity:** Alpine.js — lightweight client-side reactivity.
- **API:** Vercel Serverless Functions — JSON endpoints (CJS, Vercel
  convention).
- **CSS:** Tailwind CSS v4 via PostCSS.
- **Deployment:** Vercel (static CDN + serverless functions).

## Project Structure

```text
parcel-cornerstone/
├── api/                      # Vercel Serverless Functions (CJS)
│   └── status.js             # GET /api/status → JSON
├── packages/
│   └── parcel-transformer-cornerstone/
│       ├── index.js          # Custom Parcel transformer plugin
│       └── package.json
├── scripts/
│   └── setup-locales.js      # Generates thin HTML stubs in .build/
├── src/
│   ├── content/
│   │   └── blog/             # Markdown blog posts (front-matter + body)
│   │       └── hello-world.md
│   ├── locales/              # JSON locale files (en.json, es.json, ...)
│   ├── stores/               # Alpine.js global stores
│   │   ├── app.js            # Theme state + toggle
│   │   └── toasts.js         # Toast notification store
│   ├── templates/
│   │   ├── components/       # Reusable HTML partials (build-time includes)
│   │   │   ├── about.html
│   │   │   ├── accordion.html
│   │   │   ├── counter.html
│   │   │   ├── features.html
│   │   │   ├── footer.html
│   │   │   ├── modal.html
│   │   │   ├── navbar.html
│   │   │   ├── tabs.html
│   │   │   └── toast.html
│   │   ├── main.html         # Main page body layout
│   │   ├── post.html         # Blog post page layout
│   │   └── 404.html          # Not-found page layout
│   ├── index.js              # Alpine.js bootstrap, stores + data components
│   └── styles.css            # Tailwind + .card utility + dark mode config
├── cornerstone.config.json   # Default language + site URL
├── vercel.json               # Routing, headers, CSP
├── .parcelrc                 # Parcel pipeline (custom transformer + compressors)
├── .postcssrc                # PostCSS / Tailwind config
└── package.json
```

## Architecture

The build runs in two stages:

1. **Stub Generation** — `scripts/setup-locales.js` produces thin HTML entry
   points in `.build/` (one per locale × page) plus a `sitemap.xml`.
2. **Parcel Transform** — the custom `parcel-transformer-cornerstone` plugin
   resolves `<include>` tags, injects locale data, renders Markdown, and
   evaluates `posthtml-expressions` — producing fully resolved HTML in `dist/`.

Every source file touched is registered with Parcel's invalidation system,
enabling automatic rebuilds and HMR during development.

For detailed diagrams and deeper explanations, see
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## How it Works

### Localization (i18n)

Instead of swapping strings at runtime, the build generates a separate HTML file
per language with all text baked in.

- Language keys live in `src/locales/*.json`.
- The default language (set in `cornerstone.config.json`) is built to the root
  (`dist/index.html`); other languages go to `dist/{lang}/index.html`.
- `<link rel="alternate" hreflang="...">` tags are injected for SEO.
- A language switcher in the navbar links to each locale's path.

### Templating

Templates are body-content fragments composed via `<include>` tags. These are
resolved recursively by the custom Parcel transformer at build time.

```html
<main>
  <h1>{{ ui.title }}</h1>
  <include src="templates/components/features.html"></include>
  <include src="templates/components/counter.html"></include>
</main>
```

Expressions like `{{ ui.features.title }}` and loops like
`<each loop="feature in ui.features.items">` are evaluated at build time via
`posthtml-expressions`. Conditionals use `<if condition="...">` tags.

### Alpine.js

Alpine.js provides client-side reactivity for interactive components (accordion,
counter, modal, tabs, toast notifications, dark mode toggle). Global state is
managed via Alpine stores in `src/stores/`. Reusable component state (counter,
modal, toasts) is registered via `Alpine.data()` in `src/index.js`, keeping
templates clean:

```html
<!-- Template just references the registered name -->
<div x-data="counter">...</div>
<div x-data="modal">...</div>
```

```javascript
// src/index.js
Alpine.data('counter', () => ({ count: 0 }));
Alpine.data('modal', () => ({ open: false }));
```

> **Note:** Alpine.js v3 standard build requires `'unsafe-eval'` in the CSP
> `script-src` directive. This is because Alpine evaluates directive expressions
> (`x-data`, `@click`, `:class`, etc.) using `new Function()`. The
> CSP-compatible build (`@alpinejs/csp`) exists but would require rewriting all
> inline expressions to use `Alpine.data()` registration — a significant
> refactor.

### Blog Posts

Markdown files in `src/content/blog/` are processed at build time:

1. `setup-locales.js` discovers `.md` files and generates a stub with
   `<include src="templates/post.html" data-content="content/blog/file.md">`.
2. The transformer reads the `.md` file, parses YAML front-matter, renders
   Markdown via `marked`, and injects `post.title`, `post.date`, and `post.body`
   as template locals.

### Serverless API

Functions in `api/` are Vercel serverless endpoints returning JSON. They use
CommonJS (`module.exports`) which is Vercel's default convention.

```javascript
// api/status.js
module.exports = function handler(req, res) {
  res.status(200).json({
    status: 'operational',
    cpu: 42,
    time: new Date().toISOString(),
  });
};
```

### Dark Mode

Uses Tailwind's class-based `dark:` variants. Preference is persisted in
`localStorage` and respects `prefers-color-scheme` on first visit. A toggle is
in the navbar.

### 404 Page

A localized 404 page is generated per language. It uses the same navbar and
footer components as the main page.

## Usage

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/)

### Installation

```bash
git clone https://github.com/DiegoVallejoDev/parcel-cornerstone.git
cd parcel-cornerstone
pnpm install
```

### Development

Starts the dev server with HMR. The pre-start script generates locale stubs
automatically.

```bash
pnpm start
```

Serverless functions in `api/` are not served by Parcel's dev server. To test
the full stack locally:

```bash
pnpm i -g vercel
vercel dev
```

### Production Build

```bash
pnpm run build
```

Compiles minified HTML, CSS, and JS to `dist/`. Source maps are disabled.

### Deploy to Vercel

```bash
vercel deploy --prod
```

`vercel.json` handles routing, security headers (CSP), and query-param redirects
(`?lang=en` → `/en`).

## Configuration

### Changing the Default Language

Edit `cornerstone.config.json`:

```json
{
  "defaultLang": "es",
  "siteUrl": "https://parcel-cornerstone.vercel.app"
}
```

The default language is built to the root (`dist/index.html`). Other languages
are placed at `dist/{lang}/index.html`.

### Adding a Language

1. Create a new file in `src/locales/` (e.g., `fr.json`) matching the key
   structure of `en.json`.
2. Run `pnpm start` or `pnpm run build`.
3. `dist/fr/index.html` is generated automatically.

### Adding a Component

1. Create an HTML partial in `src/templates/components/`.
2. Include it from a template:
   ```html
   <include src="templates/components/my-widget.html"></include>
   ```
3. The transformer resolves the include and watches the file for changes.

### Adding a Serverless Endpoint

1. Create a handler in `api/` (e.g., `api/metrics.js`):

```javascript
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(200).json({ value: 42 });
};
```

2. Consume it from a template with Alpine.js + `fetch`:

```html
<div
  x-data="{ data: null, init() { fetch('/api/metrics').then(r => r.json()).then(d => this.data = d) } }"
>
  <span x-text="data?.value"></span>
</div>
```

### Adding a Blog Post

1. Create a Markdown file in `src/content/blog/` with YAML front-matter:

```markdown
---
title: My Post
date: 2025-01-15
---

Post content here.
```

2. The build generates a page per language at `dist/{lang?}/blog/my-post.html`.

## License

MIT
