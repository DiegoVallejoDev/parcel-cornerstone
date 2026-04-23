# Claude — Parcel Cornerstone

A static-first site template using Parcel 2, PostHTML, Alpine.js, Tailwind CSS
v4, and Vercel serverless functions, with build-time i18n.

> **See [`AGENTS.md`](AGENTS.md) for full project standards, architecture, and
> workflows. That file is the canonical context for all coding agents in this
> repo.**

---

## Claude-Specific Quick Reminders

- **Use `pnpm`** — never `npm` or `yarn` (enforced by `packageManager` in
  `package.json`).
- **`src/**`and`scripts/**` are ESM**;
  **`api/**`is CommonJS** (Vercel serverless convention —`module.exports =
  function handler(req, res) { … }`).
- **Alpine.js v3 standard build requires `'unsafe-eval'` in CSP** — do not "fix"
  this without a planned refactor of all inline `x-data` / `@click` / `:class`
  expressions.
- **Verification commands:** `pnpm run lint`, `pnpm run format:check`,
  `pnpm run build`.
