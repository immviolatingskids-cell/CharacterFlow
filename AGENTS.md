# Repository Guidelines

## Project Structure & Module Organization

CharacterFlow is a vanilla browser application. Runtime source modules and the main shell live at the repository root (`app.js`, `studio-core.js`, `resolver-v1.js`, `style-packs.js`, `library-data.js`, and `assisted-creation.js`). Shared styles and UI assets are in `styles.css`, `tokens.css`, `audit-overrides.css`, `ui-assets.js`, and `assets/`. Cloud adapters and schema material live in `cloud-store.js`, `cloud-config.example.js`, and `backend/`. Tests are in `tests/`; the deployable, mirrored release is under `dist/`.

## Build, Test, and Development Commands

Install dependencies with `npm install`. Run the full automated suite with:

```text
npm test
```

This uses Node’s built-in test runner over `tests/*.test.mjs`. For syntax checks, use `node --check <file>` on changed JavaScript modules. Browser-level checks can be run with `node tests/browser-smoke.mjs` when the local browser automation endpoint is available. There is no separate bundler or build script; keep root source and corresponding `dist/` files synchronized for releases.

## Coding Style & Naming Conventions

Use modern ES modules, two-space indentation, semicolons, and single-quoted strings where consistent with the surrounding file. Prefer descriptive camelCase functions and variables, PascalCase only for classes, and kebab-case filenames such as `assisted-creation.js`. Keep Character Core canonical: contextual suggestions and Style Packs may guide generation but must not overwrite identity state. Preserve deterministic resolver/suggestion behavior by passing explicit seeds or context rather than using ambient randomness.

## Testing Guidelines

Add focused tests in `tests/` with the `.test.mjs` suffix and descriptive names such as `assisted-creation.test.mjs`. Cover migrations, deterministic outputs, persistence, resolver boundaries, and compatibility paths. Run `npm test` before submitting; also run syntax checks for changed modules and `git diff --check`. New behavior should include deterministic assertions rather than snapshotting unstable output.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects; existing history includes both plain subjects (`Add Assisted Creation v1`) and conventional prefixes (`fix:`, `feat:`). Keep commits focused. Pull requests should explain user-visible behavior, compatibility or migration impact, tests run, and any source/`dist` synchronization. Include screenshots or a short manual verification note for UI changes, and call out cloud or persistence changes explicitly.

## Security & Configuration

Never commit real credentials or private service configuration. Use `cloud-config.example.js` as the template for local setup. Treat local persistence, authenticated cloud mode, and legacy saved data as compatibility surfaces when changing state schemas.
