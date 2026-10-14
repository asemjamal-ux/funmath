# Number Oasis · واحة الأرقام

Bilingual (English LTR / Arabic RTL) math-learning PWA for children aged 6–12, built from
`product-requirements.md`, `website-architecture.md`, `design-system.md` and `agent-instructions.md`.

## Run

```bash
npm install
npm run dev          # http://localhost:5173 (dev debug panel: ⚙ bottom corner — clock offset, tier/stars override, pseudo-locale)
npm test             # math property tests (P-01…P-11), adaptivity, stars, Daily Mix, rewards, formatting, storage
npm run lint         # i18n parity + Arabic plurals + hard-coded text, logical-CSS lint, content validation, typecheck
npm run build        # validated production bundle in dist/ (PWA, per-locale entry pages)
npm run preview      # serve dist/ with the production CSP headers on http://localhost:4173
npm run test:e2e     # Playwright journeys (agent-instructions §12.2) + offline journey on the production build
npm run test:a11y    # axe-core (no serious/critical), Arabic Western-digit scan, 48×48 target sizes — every route, en + ar
npm run test:visual  # screenshot matrix (§12.5); approve changes with: npm run test:visual -- --update-snapshots
npm run lhci         # Lighthouse CI budgets (NFR-01) on Home / Practice / Lesson + initial-JS gzip budget
```

First time only: `npx playwright install chromium`. Every Playwright test fails on any request that leaves the
page's origin and on any console error.

`PROPERTY_RUNS=10000 npm test` runs the nightly-size property tests.

## Where things are

- `src/domain/` — pure math engine, adaptivity, mastery, scheduler, rewards (no React / DOM / Date.now).
- `src/content/` — skills (generator specs), lessons, trophies; `scripts/author-lessons.mjs` regenerates lessons.
- `src/locales/{en,ar}/` — ICU message catalogues; `ar/_review.json` tracks educator review.
- `src/services/` — formatting, i18n, IndexedDB repositories (Dexie), backup, audio, clock.
- `src/components/`, `src/features/`, `src/pages/` — design-system components, activity runners, routes.
- `docs/decisions/` — implementation decisions and items awaiting Product sign-off.
