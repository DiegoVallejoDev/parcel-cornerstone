# Parcel Cornerstone — Agent Context

## Project Snapshot

Parcel Cornerstone is a static-first site template powered by **Parcel 2**,
**PostHTML**, **Alpine.js**, **Tailwind CSS v4**, and **Vercel serverless
functions**. The build pipeline generates fully static, localized HTML pages at
compile time — the browser receives plain HTML with zero templating overhead.
Alpine.js handles client-side interactivity, and Vercel serverless functions
provide JSON APIs. Build-time i18n produces a separate HTML file per locale with
all strings baked in.

---

## Repository Layout

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
│   ├── locales/              # JSON locale files (en.json, es.json, …)
│   ├── stores/               # Alpine.js global stores
│   │   ├── app.js            # Theme state + toggle
│   │   └── toasts.js         # Toast notification store
│   ├── templates/
│   │   ├── components/       # Reusable HTML partials (build-time includes)
│   │   ├── main.html         # Main page body layout
│   │   ├── post.html         # Blog post page layout
│   │   └── 404.html          # Not-found page layout
│   ├── index.js              # Alpine.js bootstrap, stores + data components
│   └── styles.css            # Tailwind + custom utilities + dark mode config
├── cornerstone.config.json   # Default language + site URL
├── vercel.json               # Routing, headers, CSP
├── .parcelrc                 # Parcel pipeline (custom transformer + compressors)
├── .postcssrc                # PostCSS / Tailwind config
└── package.json
```

---

## Architecture / Build Pipeline

The build runs in two stages:

### Stage 1 — Stub Generation (`scripts/setup-locales.js`)

Reads `cornerstone.config.json` and `src/locales/*.json`, scans
`src/content/blog/*.md`, and writes thin HTML entry points into `.build/` — one
per locale × page — along with `sitemap.xml` and `feed.xml`. Each stub contains
an `<include>` tag (not yet resolved), asset references, and language-specific
paths (default language → root, others → `/{lang}/`).

### Stage 2 — Parcel Transform (`parcel-transformer-cornerstone`)

The custom Parcel plugin (`packages/parcel-transformer-cornerstone/index.js`):

1. Detects the locale from the file path and loads the matching locale JSON.
2. Resolves `<include src="…">` tags recursively (supports nested includes).
3. If a `data-content` attribute is present, reads the `.md` file, parses YAML
   front-matter, renders Markdown via `marked`, and injects `post.*` locals.
4. Evaluates `posthtml-expressions` (`{{ }}` interpolation, `<each>`, `<if>`).
5. Registers every touched file with Parcel's invalidation system for HMR.

For Mermaid diagrams and deeper explanations, see
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Commands

> **pnpm is required.** The `packageManager` field in `package.json` pins the
> exact version. Never use `npm` or `yarn`.

| Command                 | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `pnpm install`          | Install all dependencies                             |
| `pnpm run clean`        | Remove `dist/`, `.parcel-cache/`, `.build/`          |
| `pnpm run setup`        | Clean + run `scripts/setup-locales.js`               |
| `pnpm start`            | Dev server with HMR (auto-runs `setup` via prestart) |
| `pnpm run build`        | Production build to `dist/` (auto-runs `setup`)      |
| `pnpm run lint`         | ESLint check                                         |
| `pnpm run lint:fix`     | ESLint auto-fix                                      |
| `pnpm run format`       | Prettier write                                       |
| `pnpm run format:check` | Prettier check (CI gate)                             |
| `vercel dev`            | Full-stack local dev (static + serverless)           |
| `vercel deploy --prod`  | Production deploy to Vercel                          |

---

## Conventions per Area

### JavaScript Modules

- `src/**` and `scripts/**` — **ESM** (`import`/`export`).
- `api/**` — **CommonJS** (`module.exports = function handler(req, res) { … }`)
  per Vercel serverless convention.

### HTML Templates

Templates are body-content fragments composed at build time:

```html
<main>
  <h1>{{ ui.title }}</h1>
  <include src="templates/components/features.html"></include>
</main>
```

- **Interpolation:** `{{ ui.someKey }}`
- **Loops:** `<each loop="item in ui.items">…</each>`
- **Conditionals:** `<if condition="…">…</if>`

All expressions are evaluated at build time by `posthtml-expressions`. The
browser receives plain HTML.

### Alpine.js

- Register reusable component state via `Alpine.data('name', () => ({…}))` in
  `src/index.js`.
- Global state lives in `src/stores/` and is registered via `Alpine.store()`.
- Keep templates clean: `<div x-data="counter">` rather than inline objects.

### CSS

- Tailwind CSS v4 via PostCSS (config in `.postcssrc`).
- Class-based dark mode (`dark:` variants).
- Custom utilities defined in `src/styles.css`.

### i18n

- Add a new locale by creating `src/locales/{lang}.json` matching the key shape
  of `en.json`.
- The default language (`cornerstone.config.json → defaultLang`) builds to
  `dist/index.html`; others build to `dist/{lang}/index.html`.
- `<link rel="alternate" hreflang="…">` tags are auto-injected.

### Blog Posts

- Markdown files in `src/content/blog/` with YAML front-matter (`title`,
  `date`).
- `setup-locales.js` discovers `.md` files and emits per-language page stubs.
- The transformer renders Markdown and injects `post.title`, `post.date`, and
  `post.body`.

### Serverless API

- Handlers in `api/` return JSON using CommonJS exports (Vercel convention).
- Not served by Parcel dev server — use `vercel dev` for full-stack testing.

### CSP / Alpine Note

Alpine.js v3 standard build evaluates directive expressions (`x-data`, `@click`,
`:class`) using `new Function()`, which **requires `'unsafe-eval'` in the CSP
`script-src` directive** (configured in `vercel.json`). Do **not** switch to
`@alpinejs/csp` without a planned refactor of all inline expressions.

---

## Workflow Expectations for Agents

- **Always use `pnpm`** — never `npm` or `yarn`.
- Run `pnpm run lint` and `pnpm run format:check` before proposing changes.
- When changing build behavior, verify both `pnpm start` and `pnpm run build`
  still work.
- When adding a locale, component, blog post, or API endpoint, follow the
  recipes in the **Common Task Recipes** section below.
- Do **not** commit `dist/`, `.parcel-cache/`, or `.build/` (already in
  `.gitignore`).

---

## Common Task Recipes

### Adding a Language

1. Create `src/locales/{lang}.json` matching the key structure of `en.json`.
2. Run `pnpm start` or `pnpm run build`.
3. `dist/{lang}/index.html` is generated automatically.

### Adding a Component

1. Create an HTML partial in `src/templates/components/`.
2. Include it from a template:
   ```html
   <include src="templates/components/my-widget.html"></include>
   ```
3. The transformer resolves the include and watches the file for changes.

### Adding a Serverless Endpoint

1. Create `api/{name}.js`:
   ```javascript
   module.exports = function handler(req, res) {
     res.status(200).json({ value: 42 });
   };
   ```
2. Consume it via Alpine.js `fetch()` in a template.
3. Test locally with `vercel dev`.

### Adding a Blog Post

1. Create `src/content/blog/{slug}.md` with YAML front-matter:

   ```markdown
   ---
   title: My Post
   date: 2025-01-15
   ---

   Post content here.
   ```

2. The build generates `dist/{lang?}/blog/{slug}.html` per language.

---

## Out of Scope / Non-Goals

- No SSR (server-side rendering).
- No client-side routing.
- No runtime translation lookup.
- No test framework is currently configured.

---

## Where to Look First

| What you want to understand    | Where to look                                      |
| ------------------------------ | -------------------------------------------------- |
| Build pipeline (stage 1)       | `scripts/setup-locales.js`                         |
| Build pipeline (stage 2)       | `packages/parcel-transformer-cornerstone/index.js` |
| Routing, headers, CSP          | `vercel.json`                                      |
| Parcel asset pipeline          | `.parcelrc`                                        |
| Entry JavaScript               | `src/index.js`                                     |
| Styling                        | `src/styles.css` + `.postcssrc`                    |
| Locale data                    | `src/locales/`                                     |
| Blog content                   | `src/content/blog/`                                |
| Deeper architecture + diagrams | `docs/ARCHITECTURE.md`                             |
