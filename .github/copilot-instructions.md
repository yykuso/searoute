# Copilot Instructions for searoute

## 1. Project Context
- This repository is a frameworkless JavaScript web app for ferry route exploration in Japan.
- Keep deployment constraints in mind: static hosting (GitHub Pages / Cloudflare Pages), PWA support, and browser-first runtime.
- Prioritize behavior stability for existing user flows (map view, route list, route filters, share URL restore).

## 2. Architecture Rules
- Preserve the existing layer boundaries:
  - `js/domain`: pure domain logic
  - `js/application`: use cases / orchestration
  - `js/adapters`: external systems (MapLibre, persistence, HTTP, geocoding, analytics)
  - `js/presentation`: UI rendering and user interaction wiring
  - `js/entrypoints`: composition root only (dependency setup and wiring)
- Do not move browser APIs (`document`, `window`, DOM, MapLibre instances) into domain or application modules.
- For MVVM migration work, keep ViewModel logic framework-agnostic and testable without DOM.

## 3. Coding Guidelines
- Use small, focused functions and keep side effects localized.
- Prefer explicit dependency injection over hidden imports for new modules.
- Maintain current naming and file layout conventions unless migration docs require a rename.
- Avoid broad refactors unrelated to the user request.
- Keep comments short and only where logic is non-obvious.

## 4. UI and Accessibility
- Keep existing UI behavior and selectors unless intentionally migrating with tests updated.
- Ensure interactive controls remain keyboard accessible.
- Preserve Japanese user-facing content and route metadata fidelity.

## 5. Testing Policy
- For logic changes, add or update `vitest` tests near the affected module.
- For behavior touching map/list user flows, consider relevant Playwright coverage.
- Use these commands:
  - `npm run test`
  - `npm run test:e2e`
- If CSS classes or markup semantics change, validate whether Tailwind output must be rebuilt:
  - `npm run build:css`

## 6. Data and Network Safety
- Do not alter external data source URLs or PMTiles integration behavior without explicit request.
- Handle network failures defensively in adapter code paths.
- Keep persistence compatibility for existing cookie keys and share URL parameters.

## 7. Change Delivery Expectations
- Keep diffs minimal and scoped to the task.
- When fixing bugs, include a regression test whenever practical.
- Document important trade-offs in the PR/commit message or related docs if behavior changes are unavoidable.

## 8. Priority References
- `README.md`
- `docs/searoute-spec.md`

If guidance conflicts, follow explicit user instructions first, then repository docs, then this file.
