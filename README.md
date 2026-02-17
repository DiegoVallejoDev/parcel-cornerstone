# parcel-cornerstone

A static site template using Parcel, PostHTML, and Alpine.js.

This repository provides a setup for building static websites with localization support, component inclusion, and minimal runtime JavaScript. It moves complexity to the build step to ensure the output is standard, performant HTML.

## Overview

The goal of this template is to provide a modern developer experience (HMR, component modulation, SCSS support) that compiles down to simple static files.

* **Build Tool:** Parcel 2 (Zero config, Rust-based compiler).
* **Templating:** PostHTML (Static includes and variable injection).
* **State:** Alpine.js (Lightweight DOM manipulation).
* **Network:** HTMX (Optional partial content loading).
* **CSS:** PostCSS with Autoprefixer and PurgeCSS.

## Project Structure

The architecture separates source templates from the generated localized entry points.

```text
+---------------------+
|  parcel-cornerstone |
+---------------------+
|
+--- src/
|    +--- locales/          # JSON files (en.json, es.json)
|    +--- templates/        # Main layout and partials
|    |    +--- components/  # Reusable HTML snippets
|    |    +--- main.html    # The single source of truth for layout
|    +--- static/           # Assets served directly (HTMX endpoints)
|    +--- index.html        # Build entry point
|
+--- scripts/
|    +--- setup-locales.js  # Generates proxy files for languages
|
+--- package.json           # Build scripts and dependencies
```

## How it Works

### 1. Localization (i18n)
Instead of using JavaScript to swap strings at runtime, this project generates separate HTML files for each language during the build process.

* Language keys are defined in `src/locales/*.json`.
* The `npm run setup:locales` script reads these JSON files.
* It creates a proxy `index.html` for each language (e.g., `src/es/index.html`) that imports the main template.
* Parcel compiles all entry points in parallel.

### 2. Templating
We use `posthtml-include` and `posthtml-expressions`.

```html
<header>
    <h1>{{ ui.title }}</h1>
    
    <posthtml-include src="components/nav.html"></posthtml-include>
</header>
```

### 3. Static API (HTMX)
Files placed in `src/static/` are copied to `dist/api/`. These serve as endpoints for HTMX to fetch HTML fragments without a backend server.

## Usage

### Installation

```bash
git clone https://github.com/DiegoVallejoDev/parcel-cornerstone.git
cd parcel-cornerstone
npm install
```

### Development
Starts the dev server with Hot Module Replacement (HMR). The pre-start script will automatically generate the necessary proxy files for your locales.

```bash
npm start
```

### Production Build
Compiles minified HTML, CSS, and JS to the `dist/` folder. Source maps are disabled by default.

```bash
npm run build
```

## Configuration

### Adding a Language
1. Create a new file in `src/locales/` (e.g., `fr.json`).
2. Run `npm start` or `npm run build`.
3. The system automatically creates `src/fr/index.html` and includes it in the build pipeline.

### Customizing Headers
Modify `.parcelrc` to adjust compression settings or `.postcssrc` to change browser targeting and purge settings.

## License

MIT
