# Architecture

## Overview

Parcel Cornerstone is a **static-first site template** that combines Parcel 2,
a custom HTML transformer plugin, Alpine.js, and Vercel serverless functions.
The build pipeline generates fully static, localized HTML pages served from a
CDN, with lightweight client-side interactivity added by Alpine.js.

The key design principle is **build-time resolution**: i18n strings, component
includes, Markdown content, and template expressions are all evaluated during
the build — the browser receives plain HTML with zero templating overhead.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Sources
        CONFIG[cornerstone.config.json]
        LOCALES[src/locales/*.json]
        TEMPLATES[src/templates/**/*.html]
        CONTENT[src/content/blog/*.md]
        STYLES[src/styles.css]
        JS[src/index.js]
    end

    subgraph "Stage 1 — Stub Generation"
        SETUP[scripts/setup-locales.js]
    end

    subgraph "Stage 2 — Parcel Build"
        TRANSFORMER[parcel-transformer-cornerstone]
        PARCEL[Parcel Default Pipeline]
    end

    subgraph Output
        DIST[dist/]
        SITEMAP[dist/sitemap.xml]
    end

    CONFIG --> SETUP
    LOCALES --> SETUP
    CONTENT --> SETUP
    SETUP --> |.build/ stubs| TRANSFORMER
    TEMPLATES --> TRANSFORMER
    LOCALES --> TRANSFORMER
    CONTENT --> TRANSFORMER
    CONFIG --> TRANSFORMER
    TRANSFORMER --> |resolved HTML| PARCEL
    STYLES --> PARCEL
    JS --> PARCEL
    PARCEL --> DIST
    PARCEL --> SITEMAP
```

---

## Two-Stage Build Pipeline

### Stage 1 — Stub Generation (`setup-locales.js`)

```mermaid
flowchart LR
    A[Read cornerstone.config.json] --> B[Scan src/locales/*.json]
    B --> C[Scan src/content/blog/*.md]
    C --> D{For each locale}
    D --> E[Generate index.html stub]
    D --> F[Generate 404.html stub]
    D --> G[Generate blog post stubs]
    D --> H[Generate sitemap.xml]
    E --> I[.build/]
    F --> I
    G --> I
    H --> I
```

Each stub is a minimal `<!DOCTYPE html>` shell containing:

- An `<include src="templates/...">` tag (not yet resolved)
- Asset references to `src/styles.css` and `src/index.js`
- A `data-content` attribute for blog posts (path to the `.md` file)
- Language-specific paths: default language → root, others → `/{lang}/`

### Stage 2 — Parcel Transform (`parcel-transformer-cornerstone`)

```mermaid
flowchart TD
    A[Receive .build/*.html stub] --> B[Detect locale from file path]
    B --> C[Load locale JSON]
    C --> D[Resolve include tags recursively]
    D --> E{Has data-content?}
    E -- Yes --> F[Parse Markdown front-matter + body]
    F --> G[Render Markdown to HTML via marked]
    G --> H[Inject post locals]
    E -- No --> H
    H --> I[Evaluate posthtml-expressions]
    I --> J[Register file dependencies for HMR]
    J --> K[Output resolved HTML]
```

Every source file touched during transformation is registered with Parcel's
invalidation system, enabling automatic rebuilds and hot module replacement.

---

## Runtime Architecture

```mermaid
graph LR
    subgraph Browser
        HTML[Static HTML]
        ALPINE[Alpine.js]
        STORES[Alpine Stores]
        COMPONENTS[Alpine Data Components]
    end

    subgraph "Vercel Edge"
        CDN[CDN / Static Assets]
        API[Serverless Functions]
    end

    CDN --> |dist/*.html| HTML
    HTML --> ALPINE
    ALPINE --> STORES
    ALPINE --> COMPONENTS
    ALPINE -.-> |fetch| API
    API -.-> |JSON| ALPINE
```

### Client-Side Layer

Alpine.js bootstraps in `src/index.js` and registers:

| Store / Data   | Purpose                                  |
| -------------- | ---------------------------------------- |
| `app` store    | Theme state (light / dark / system)      |
| `toasts` store | Toast notification queue                 |
| `counter` data | Simple counter component state           |
| `modal` data   | Modal open/close state                   |
| `toastItem`    | Per-toast display logic and icon mapping |

### Serverless API

Functions in `api/` are Vercel serverless endpoints (CommonJS) returning JSON.
They are independent of the static build and accessed via `fetch()` from the
client.

---

## Localization Flow

```mermaid
flowchart TD
    A[src/locales/en.json] --> C[setup-locales.js]
    B[src/locales/es.json] --> C
    C --> D[".build/index.html (es — default)"]
    C --> E[".build/en/index.html"]
    D --> F[Transformer injects es locale as ui.*]
    E --> G[Transformer injects en locale as ui.*]
    F --> H["dist/index.html (Spanish)"]
    G --> I["dist/en/index.html (English)"]
```

- The default language (from `cornerstone.config.json`) builds to the root path.
- Other languages build to `/{lang}/` subpaths.
- Missing locale keys emit build-time warnings.
- `hreflang` alternate links and a sitemap are generated for SEO.

---

## Component Composition

```mermaid
graph TD
    STUB[".build/index.html stub"]
    MAIN[templates/main.html]
    NAV[components/navbar.html]
    FEAT[components/features.html]
    COUNT[components/counter.html]
    ACC[components/accordion.html]
    TABS[components/tabs.html]
    MODAL[components/modal.html]
    TOAST[components/toast.html]
    FOOTER[components/footer.html]
    ABOUT[components/about.html]

    STUB --> |"&lt;include&gt;"| MAIN
    MAIN --> NAV
    MAIN --> FEAT
    MAIN --> COUNT
    MAIN --> ACC
    MAIN --> TABS
    MAIN --> MODAL
    MAIN --> TOAST
    MAIN --> FOOTER
    MAIN --> ABOUT
```

`<include src="...">` tags are resolved **recursively** at build time.
The transformer replaces each tag with the file's contents, supporting nested
includes. Every included file is tracked for HMR.

---

## Deployment Architecture

```mermaid
graph LR
    subgraph Vercel
        direction TB
        CDN[CDN Edge Network]
        SF[Serverless Functions]
    end

    DEV[Developer] --> |git push| VERCEL_BUILD[Vercel Build]
    VERCEL_BUILD --> |pnpm run build| CDN
    VERCEL_BUILD --> |api/*.js| SF

    USER[User] --> CDN
    USER --> |/api/*| SF

    CDN --> |static HTML/CSS/JS| USER
    SF --> |JSON| USER
```

- **Static assets** are served from Vercel's CDN with immutable cache headers
  for hashed files (`max-age=31536000`).
- **Security headers** (CSP, X-Frame-Options, X-Content-Type-Options) are
  configured in `vercel.json`.
- **Brotli and Gzip compression** are enabled via Parcel compressor plugins.
- **Rewrites** handle SPA-like 404 fallbacks per locale.

---

## Technology Stack

| Layer         | Technology                              |
| ------------- | --------------------------------------- |
| Bundler       | Parcel 2                                |
| Transformer   | parcel-transformer-cornerstone (custom) |
| Templating    | posthtml-expressions (build-time)       |
| Markdown      | marked + front-matter                   |
| CSS           | Tailwind CSS v4 via PostCSS             |
| Interactivity | Alpine.js v3                            |
| API           | Vercel Serverless Functions             |
| Hosting       | Vercel (CDN + serverless)               |
