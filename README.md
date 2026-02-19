# parcel-cornerstone

A static-first site template using Parcel, PostHTML, Alpine.js, and Vercel.

Build-time localization and component composition produce static HTML served from a CDN. Alpine.js handles client-side interactivity when needed, and Vercel serverless functions provide JSON APIs.

## Overview

This is my personal template for building static sites with optional dynamic features.

The goal is to provide a modern developer experience (HMR, component modulation, i18n) that compiles down to static files with minimal JavaScript. Alpine.js is only included on pages that need it.

- **Build Tool:** Parcel 2 (Zero config, Rust-based compiler).
- **Templating:** PostHTML Expressions (Build-time variable injection).
- **Interactivity:** Alpine.js (Lightweight, included only when needed).
- **API:** Vercel Serverless Functions (JSON endpoints, consumed via `fetch`).
- **CSS:** Tailwind CSS v4 (via PostCSS).
- **Deployment:** Vercel (Static CDN + Serverless Functions).

## Project Structure

```text
parcel-cornerstone/
├── api/                      # Vercel Serverless Functions (JSON APIs)
│   └── status.js             # GET /api/status → JSON
├── src/
│   ├── locales/              # JSON files (en.json, es.json)
│   ├── templates/
│   │   ├── components/       # Reusable HTML partials (build-time includes)
│   │   │   ├── navbar.html   # Nav + language switcher + dark mode toggle
│   │   │   ├── dashboard.html # Alpine.js-powered live status widget
│   │   │   └── footer.html
│   │   ├── main.html         # Body layout (fragment, not a full document)
│   │   └── 404.html          # Not-found page layout
│   ├── styles.css            # Tailwind directives + dark mode config
│   └── index.js              # Alpine.js bootstrap (only included when needed)
├── scripts/
│   └── setup-locales.js      # Generates build entries + detects Alpine.js usage
├── vercel.json               # Routing, headers, CSP
├── .parcelrc                 # Parcel compressor config
├── .postcssrc                # PostCSS / Tailwind config
└── package.json
```

## How it Works

### 1. Localization (i18n)

Instead of swapping strings at runtime, the build generates a separate HTML file per language with all text baked in.

- Language keys are defined in `src/locales/*.json`.
- `pnpm run setup:locales` reads each JSON file, resolves all `<posthtml-include>` tags in the template tree, and writes a fully composed HTML entry to `.build/`.
- The default language (`es`) is placed at `.build/index.html` → `dist/index.html` (root).
- Other languages are placed at `.build/{lang}/index.html` → `dist/{lang}/index.html`.
- A per-locale `.posthtmlrc` is generated alongside each entry so `posthtml-expressions` resolves `{{ ui.* }}` placeholders with the correct locale data.
- `<link rel="alternate" hreflang="...">` tags are automatically injected into every page for SEO.
- A language switcher in the navbar links to each locale's path.

### 2. Templating

`src/templates/main.html` is a body-content fragment. It uses `<posthtml-include>` tags to reference components (navbar, dashboard, footer). These includes are resolved by the setup script at build time, not by Parcel.

```html
<main>
  <h1>{{ ui.title }}</h1>
  <posthtml-include
    src="templates/components/dashboard.html"
  ></posthtml-include>
</main>
```

### 3. Alpine.js (Conditional)

Alpine.js is only bundled into pages that actually use it. During the build, `setup-locales.js` scans each resolved page body for Alpine directives (`x-data`, `x-show`, `@click`, `:class`, etc.). If none are found, the `<script>` tag for `index.js` is omitted entirely — the page ships with zero JavaScript (besides a tiny inline dark-mode init).

This means you can have purely static pages (e.g., 404) that load only CSS, and interactive pages that load Alpine on demand.

### 4. Serverless API

Functions in `api/` are Vercel serverless endpoints that return **JSON**. Client-side code (Alpine.js + `fetch`) consumes the data and renders it.

```javascript
// api/status.js
module.exports = function handler(req, res) {
  res.status(200).json({
    status: "operational",
    cpu: 42,
    time: new Date().toISOString(),
  });
};
```

```html
<!-- Alpine.js fetches and renders the data -->
<div
  x-data="{ status: null, init() { fetch('/api/status').then(r => r.json()).then(d => this.status = d) } }"
>
  <span x-text="status?.cpu + '%'"></span>
</div>
```

### Data Flow

```text
Build Time (Parcel)          Request Time (Vercel)
─────────────────────        ─────────────────────
src/locales/*.json ──┐
src/templates/*.html ┤       Browser ──► CDN ──► dist/index.html
setup-locales.js ────┤                           (Alpine.js included if needed)
                     ▼
              .build/ ──► dist/        fetch() ──► /api/status ──► JSON response
                                                                    │
                                                                    ▼
                                                        Alpine.js renders in DOM
```

### 5. Dark Mode

Dark mode uses Tailwind's class-based strategy with `dark:` variants. The preference is persisted in `localStorage` and respects `prefers-color-scheme` on first visit. A toggle button is included in the navbar.

### 6. 404 Page

A localized 404 page is generated per language alongside the main `index.html`. The template at `src/templates/404.html` uses the same navbar and footer components.

## Usage

### Installation

```bash
git clone https://github.com/DiegoVallejoDev/parcel-cornerstone.git
cd parcel-cornerstone
pnpm install
```

### Development

Starts the dev server with HMR. The pre-start script generates locale entries automatically.

```bash
pnpm start
```

Note: Serverless functions in `api/` are not served by Parcel's dev server. To test the full stack locally (static + serverless), use `vercel dev`:

```bash
pnpm i -g vercel   # if not installed
vercel dev          # runs static + serverless locally
```

### Production Build

Compiles minified HTML, CSS, and JS to `dist/`. Source maps are disabled by default.

```bash
pnpm run build
```

### Deploy to Vercel

```bash
vercel deploy --prod
```

The `vercel.json` config handles routing, security headers (including CSP), and query-param redirects (`?lang=en` → `/en`).

## Configuration

### Adding a Language

1. Create a new file in `src/locales/` (e.g., `fr.json`) with the same key structure as `en.json`.
2. Run `pnpm start` or `pnpm run build`.
3. The build automatically generates `dist/fr/index.html`.

### Changing the Default Language

Edit the `defaultLang` variable in `scripts/setup-locales.js`. The default language is built to the root (`dist/index.html`).

### Adding a Serverless Endpoint

1. Create a handler in `api/` (e.g., `api/metrics.js`) that returns JSON:

```javascript
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate");
  res.status(200).json({ value: 42 });
};
```

2. Consume it from a template using Alpine.js + `fetch`:

```html
<div
  x-data="{ data: null, init() { fetch('/api/metrics').then(r => r.json()).then(d => this.data = d) } }"
>
  <span x-text="data?.value"></span>
</div>
```

Alpine.js will be automatically detected and included for that page.

## License

MIT
