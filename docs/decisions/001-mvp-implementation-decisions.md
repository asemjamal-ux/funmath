# 001 — MVP implementation decisions

Status: Accepted (engineering) · Date: 2026-10-15 · Items marked **Product** need Product sign-off.

Each item records an ambiguity or constraint met while implementing the MVP and the option chosen
(safer for children, more accessible, more private — agent-instructions §1 rule 3).

| # | Topic | Decision |
|---|---|---|
| 1 | Package manager | `pnpm` is not installed on the build machine; the project uses **npm** with exact versions and `package-lock.json`. Scripts are named as in agent-instructions §3 and run with `npm run …`. |
| 2 | Animation / audio libraries | Motion, lottie-web and Howler.js are **not** used. Animations are CSS (all disabled under `data-motion="reduced"`); SFX are short synthesized Web Audio tones (soft chime, gentle boop — never a buzzer). Fewer dependencies, smaller bundle, no network. |
| 3 | Narration audio | Recorded narration (A-08) does not exist yet. The Audio Manager plays files listed in `src/content/audio-manifest.json`; the manifest is empty, so speaker buttons are hidden and the text is always on screen (F-13, AX-08). Adding recordings needs no code change. |
| 4 | Star 3 "at Tier 3" (**Product**) | A set qualifies only if **every** item was presented at Tier 3 and ≥ 90 % were first-try correct. |
| 5 | Idempotency ledger | A `seedLedger` store keyed `[profileId, creditId]` (not in ARCH §5.2) makes Seed credits idempotent per `(sessionId, itemIndex)` / completion id; zero-amount `once:` entries guard counters (practice sets, daily mixes). |
| 6 | Small Stage 1 pools | Some Stage 1 Tiers have fewer distinct facts than a set has items (e.g. ADD-01 Tier 1). Generators first avoid any repeat in the set, then fall back to "never two identical items in a row" (P-08 still holds). |
| 7 | Celebrations | Trophy / Oasis dialogs raised mid-activity wait until the activity's summary so a dialog never interrupts an answer (DS §11.2 rule 2). |
| 8 | Numbers inside catalogue text | Digits written in message text (e.g. "Make 10 first") are routed through `formatNumber` by `useT`, so Arabic screens never mix digit systems. Only the two Number Style / Math Direction setting labels are exempt. |
| 9 | Avatars | The 12 animal avatars are system emoji in a coloured circle (no illustrator assets yet). |
| 10 | Number Line Hop (**Product**) | + / − / × ask "where does Fanak land?"; ÷ and missing-number items ask "how many hops?". Items with a zero hop are excluded from this game. |
| 11 | Lesson Seeds | +5 Seeds per Lesson completion event (each replay is a new completion). |
| 12 | Daily Mix Seeds | +1 per correct item and +5 for the first mix of the day; no extra +3 round bonus (PRD §7.1 lists +3 only for Practice Sets and Game rounds). |
| 13 | Locale catalogues | Namespaces are loaded per locale on demand (the other language only loads on switch), not per route. |
| 14 | Prerendering | `/en/`, `/ar/`, `/about` are emitted as static entry pages with the correct `<html lang dir>`, manifest and hreflang links; content renders client-side. |
| 15 | Browser test tooling | Playwright (`npm run test:e2e`, `test:a11y`, `test:visual`) and Lighthouse CI (`npm run lhci`) are configured; see `e2e/` and `lighthouserc.cjs`. Journeys run on Chromium desktop + Pixel 7; Firefox, WebKit and iPad run the smoke spec with `E2E_ALL_BROWSERS=1` after `npx playwright install`. E2E uses the dev server (the dev clock offset is dev-only); offline, a11y, visual and Lighthouse use the production build. Test servers use ports 5183 / 4183 / 4184 so they never reuse a developer's server. |
| 16 | Pseudo-locale | `en-XA` is a dev-only toggle in the debug panel (not a URL locale). |
| 17 | Arabic copy | All Arabic strings are marked `"pending"` in `src/locales/ar/_review.json`. `npm run build` reports them; `npm run build:production` fails until an educator marks them reviewed. |
| 18 | Lighthouse network profile (**Product**) | NFR-01 says "mid-range Android over 4G". LHCI uses 4× CPU slowdown with a regular 4G link (9 Mbps, 170 ms RTT). Measured: LCP 2.0–2.1 s, TBT ≤ 21 ms on Home / Practice / Lesson in both locales. Lighthouse's default *slow 4G* (1.6 Mbps) gives LCP ≈ 3.1–3.2 s; meeting 2.5 s there would need lighter core libraries (React DOM, router, Dexie ≈ 75 % of the JS). INP is checked through its lab proxy, Total Blocking Time ≤ 200 ms. |
| 19 | JS budget measurement | "Initial JavaScript ≤ 200 KB gzipped" is the gzipped body bytes of the scripts each audited page loads (`scripts/lhci-js-budget.mjs`): 191–194 KB. Lighthouse's own byte count adds response headers (≈ 13 KB here), so it is not used for this budget. |
| 20 | Load path (NFR-01) | ICU messages are precompiled at build time and the runtime ICU parser is dropped (`scripts/precompile-messages-plugin.mjs`); catalogue namespaces load in parallel; entry pages `modulepreload` the learner route chunk and their locale's catalogues; `/en/*` and `/ar/*` are served by their locale entry page (`public/_redirects`, mirrored in `vite preview`). |
| 21 | Finished activities | A Practice summary or completed Lesson is forgotten when the learner leaves the route in-app (including the browser Back button), so the next visit starts a new set. A reload or a language switch still shows it. |
| 22 | Digit samples | The two settings labels that show Western digits on purpose (decision 8) carry `data-digit-sample`; the Arabic digit scan in `e2e/a11y.spec.ts` skips only those and `lang="en"` nodes. |
