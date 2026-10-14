# Number Oasis — Instructions for the AI Coding Agent

| | |
|---|---|
| **Product** | Number Oasis (واحة الأرقام) |
| **Document** | `agent-instructions.md` (v1.0, Draft) |
| **Date** | 14 October 2026 |
| **Companion documents** | `product-requirements.md` (PRD) · `website-architecture.md` (ARCH) · `design-system.md` (DS) |
| **Owns** | Implementation order, conventions, localization/RTL/a11y implementation rules, testing, acceptance criteria |

---

## 1. Your role and sources of truth

You are implementing the **MVP** of Number Oasis, a bilingual (English LTR / Arabic RTL) math-learning PWA for children aged 6–12.

| Question | Read |
|---|---|
| *What* to build, scope, terms, learning rules, rewards | PRD (wins on scope and behaviour) |
| *How the system is structured*: routes, modules, data model, i18n/RTL architecture | ARCH |
| *How it looks and moves*: tokens, typography, components, states, motion | DS |
| *How to implement and prove it works* | This document |

**Rules of engagement**

1. Build only items marked **MVP** (PRD §15.1). Do not build Future items; leave extension points only where ARCH says so.
2. Use the glossary terms (PRD §5) in code identifiers, file names, and UI copy keys (e.g. `PracticeSet`, `dailyMix`, `seeds`, `trophyAwards`).
3. When a requirement is ambiguous, choose the option that is **safer for children, more accessible, and more private**, record it in `docs/decisions/NNN-title.md`, and continue. Do not invent new features.
4. Never weaken a non-negotiable (§2) to make a test pass or meet a deadline.

---

## 2. Non-negotiables

| # | Rule | Source |
|---|---|---|
| N-01 | No network requests to third-party domains at runtime. No analytics SDKs, ad SDKs, social embeds, or CDN-hosted fonts/scripts. | CS-03, NFR-10 |
| N-02 | No collection of real names, birthdays, ages, gender, photos, voice, location, contacts, or email from children. | CS-02 |
| N-03 | No external links, chat, sharing, or user-generated content in learner screens. | CS-04, CS-05 |
| N-04 | No time limits, countdowns, lives, streak penalties, loot-box style rewards, or loss of Stars/Seeds. | CS-07, AX-04 |
| N-05 | Every generated math item satisfies PRD §6.5. | NFR-08 |
| N-06 | No hard-coded user-visible strings; every string comes from the `en` and `ar` catalogues. | FR-40 |
| N-07 | No physical-direction CSS (`left`, `right`, `margin-left`, `padding-right`, `text-align: left`, `float: right`, etc.). Use logical properties. | ARCH §9.6 |
| N-08 | Every number shown to users goes through `services/formatting` (`MathNumber` in components). Never render `String(n)` or template-literal numbers in UI. | ARCH §9.3 |
| N-09 | WCAG 2.2 AA; red never used for learner feedback. | AX-01, DS §3.3 |
| N-10 | Progress is persisted after every answered item. | NFR-05 |

---

## 3. Stack and setup

Use the stack in ARCH §6.1. Pin exact versions in `package.json` and commit the lockfile.

```
Node 22 LTS · pnpm · TypeScript (strict) · React 19 · Vite · React Router · Zustand · Dexie
react-intl (FormatJS) · Zod · Motion · lottie-web (lazy) · Howler.js · vite-plugin-pwa
Vitest · @testing-library/react · fast-check · Playwright · @axe-core/playwright · Lighthouse CI
ESLint (typescript-eslint, jsx-a11y, formatjs, custom rules) · Stylelint (stylelint-use-logical) · Prettier
```

**Scripts** (all must exist and pass in CI):

| Script | Purpose |
|---|---|
| `pnpm dev` | Dev server (includes debug panel: seed replay, Tier override, locale/style toggles) |
| `pnpm build` | Validates content (Zod), builds, prerenders `/en/`, `/ar/`, `/about` |
| `pnpm lint` | ESLint + Stylelint + i18n key parity + content validation |
| `pnpm test` | Unit + property-based + component tests |
| `pnpm test:e2e` | Playwright in both locales, compact and expanded viewports |
| `pnpm test:visual` | Visual regression matrix (§12.5) |
| `pnpm test:a11y` | axe-core across all routes and states |
| `pnpm lhci` | Performance budgets (NFR-01) |

Folder structure: follow ARCH §6.2 exactly.

---

## 4. Implementation priorities (milestones)

Work in this order. Each milestone ends with its exit criteria passing in CI and a preview deploy reviewed in **both** languages.

| # | Milestone | Deliverables | Exit criteria |
|---|---|---|---|
| **M0** | Foundations | Repo, tooling, CI, `tokens.css` from DS, fonts self-hosted, router with `/en` `/ar`, `<html lang dir>`, i18n provider, formatting service, lint rules (N-06–N-08), pseudo-locale | Hello screen renders correctly in en/ar; lint blocks a physical CSS property and a hard-coded string; key-parity check runs |
| **M1** | Math engine | Seeded PRNG, generators for all 26 MVP Skills × 3 Tiers, distractors, checker, worked-example steps, spoken tokens | Property tests (§8) pass at 10,000 runs per Skill per Tier; 100 % branch coverage in `domain/math` |
| **M2** | Content & core components | Zod schemas, `content/` JSON for Skills, Lessons (EN + AR placeholders flagged for review), Trophies, Oasis; DS components: Button, AnswerChoice, NumberPad, AnswerField, MathNumber, MathExpression, VerticalProblem, ProgressDots, Mascot, SpeechBubble, FeedbackBanner | Storybook-style component stories in both locales and both Number Styles; component tests pass |
| **M3** | Storage & profiles | Dexie schema + migrations, repositories, Welcome/Profile Picker, Setup, Grown-up Gate (challenge + PIN) | J-01 E2E passes in both locales; data persists across reload |
| **M4** | Practice & adaptivity | Practice Runner, hints, Worked Examples, Tier controller, Star evaluator, review scheduler, summary screen | Rules in PRD §6.6–6.9 verified by unit + E2E tests |
| **M5** | Lessons & manipulatives | Lesson Player; Counters, TenFrame, BaseTenBlocks, NumberLine, ArrayGrid, SharingPlates with keyboard alternatives; narration via Audio Manager | All 26 Lessons playable; keyboard-only E2E passes for one Lesson per Operation |
| **M6** | Home, Worlds, rewards | Learner Home with OasisScene, World pages, Skill page, Rewards engine, Trophies, Trophy Room, My Progress, Daily Mix | Seeds/Trophy idempotency tests pass; J-02, J-04 E2E pass |
| **M7** | Games | Bubble Pop, Number Line Hop, Match Pairs | Each Game playable by touch, mouse, keyboard; untimed; reduced-motion variants |
| **M8** | Grown-ups Area | Report, profile management, settings, backup/import/delete, privacy page, break reminder | J-07 E2E; export→delete→import round trip restores identical data |
| **M9** | PWA, performance, hardening | Service worker, per-locale manifests, offline, security headers/CSP, budgets, full a11y and visual regression passes, (Should) opt-in stats | All acceptance criteria in §13 pass; Lighthouse budgets met |

---

## 5. Domain implementation notes

- Keep `src/domain/**` **pure**: no React, no DOM, no Dexie, no `Date.now()` (inject a clock), no `Math.random()` (inject the seeded RNG).
- Implement Star rules, Tier rules, Daily Mix weighting, review intervals, Seeds, and Oasis thresholds **exactly** as numbers in PRD §6–7. Put the constants in `domain/constants.ts` with a comment citing the PRD section.
- Rewards are derived from domain events (ARCH §4.1, §8). Use completion event IDs and composite keys so that replaying events never double-awards.
- "Different calendar days" uses the device local date string `YYYY-MM-DD` from the injected clock.

---

## 6. Coding conventions

### 6.1 TypeScript and React

- `strict: true`, `noUncheckedIndexedAccess: true`, no `any` (use `unknown` + narrowing). Exhaustive `switch` on unions with a `never` check.
- Function components only; hooks for logic; props typed with `interface XxxProps`.
- Components never call Dexie directly; use repository hooks from `services/storage`.
- Session/UI state in Zustand stores scoped by feature; persistent data in repositories.
- Errors: domain functions return typed results; UI wraps routes in an error boundary that shows a friendly Fanak screen with "Back to my Oasis" (no stack traces to users).
- No comments that restate code; comment *why*, and cite PRD/ARCH IDs where rules come from.

### 6.2 Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase, DS names | `AnswerChoice.tsx` |
| Hooks | `useXxx` | `usePracticeSet` |
| Domain functions | camelCase verbs | `generateItem`, `evaluateStars` |
| Skill IDs | Exactly as PRD | `ADD-04` |
| i18n keys | `namespace.area.item` | `practice.feedback.tryAgain` |
| Audio keys | `{skillId}.{lessonStep}` or `ui.{name}` | `ADD-04.model`, `ui.tryAgain` |
| CSS custom properties | DS token names | `--color-add-strong` |

### 6.3 Styling

- CSS Modules + DS tokens. No raw hex values outside `tokens.css` (lint rule).
- Logical properties only (N-07). Use `inset-inline-start`, `margin-block`, `padding-inline-end`, `border-start-start-radius`, `text-align: start`.
- Transforms with a horizontal direction (e.g. slide-in) use a `--dir-sign` variable (`1` in LTR, `-1` in RTL) set on `:root[dir]`.
- Mirroring for icons is done by the `Icon` component's `mirrorInRtl` prop (`transform: scaleX(-1)` under `[dir="rtl"]`), never ad hoc.
- Script-specific typography via `:lang(ar)` / `:lang(en)` selectors and DS type tokens.

### 6.4 Content

- All content in `src/content/**` and `src/locales/**` is validated by Zod at build; invalid content fails the build.
- Lesson JSON references i18n keys and audio keys, never inline text.
- Arabic strings delivered before educator review must carry a `"_review": "pending"` marker in a sidecar file; the build prints a report of pending strings (does not fail in preview, **fails in production builds**).

### 6.5 Git and PRs

- Small PRs per feature slice; conventional commits (`feat:`, `fix:`, `test:` …).
- Every PR includes: screenshots/recordings in **en and ar**, test evidence, and the checklist in §14.

---

## 7. Localization implementation

### 7.1 Setup

1. `services/i18n` loads `locales/{locale}/{namespace}.json` lazily per route; the `common` namespace loads with the shell.
2. `IntlProvider` receives `locale` (`en` or `ar-SA`) and messages.
3. The shell sets `document.documentElement.lang` and `.dir` on every locale change; prerendered HTML already contains the correct values for the entry route.

### 7.2 Adding a string (checklist)

- [ ] Add the key to **both** `en` and `ar` catalogues in the same PR.
- [ ] Use ICU arguments for every number (`{count, number}` is not enough — pass pre-formatted numbers via `formatNumber` *or* use the `MathNumber` component for math; for plurals use `{count, plural, …}` with all Arabic categories).
- [ ] Arabic uses "let's/we" phrasing for learner-facing instructions (FR-44).
- [ ] No string concatenation to build sentences; whole sentences live in the catalogue.
- [ ] Check the string at 130 % length in pseudo-locale and in real Arabic at compact width.

### 7.3 Plurals

English: `one`, `other` (+ `=0` where helpful). Arabic: **must** define `zero`, `one`, `two`, `few`, `many`, `other` (or `=0` plus all five others). Lint fails if an Arabic plural message lacks a category. Example in ARCH §9.2.

### 7.4 Numbers

```ts
// services/formatting/number.ts
export function formatNumber(n: number, opts: { locale: Locale; numberStyle: 'arab' | 'latn' }): string {
  return new Intl.NumberFormat(opts.locale === 'ar' ? 'ar-SA' : 'en', {
    numberingSystem: opts.numberStyle,
    useGrouping: 'min2',
    maximumFractionDigits: 0,
  }).format(n);
}

export function parseDigits(input: string): number | null {
  // Map ٠–٩ (U+0660–0669) and ۰–۹ (U+06F0–06F9) to 0–9; strip spaces and separators (, ٬ .)
}
```

- Cache `Intl.NumberFormat` instances per `(locale, style)`.
- If `useGrouping: 'min2'` is unsupported, fall back to `useGrouping: n >= 10000`.
- Unit-test outputs: `formatNumber(345, ar/arab) === '٣٤٥'`, `formatNumber(345, ar/latn) === '345'`, `formatNumber(12000, ar/arab) === '١٢٬٠٠٠'`, `formatNumber(3456, en/latn) === '3456'`.

### 7.5 Dates

Grown-ups Area only. `Intl.DateTimeFormat` with explicit `calendar` (`gregory` | `islamic-umalqura`) and `numberingSystem` from the profile. `Intl.RelativeTimeFormat` for "2 days ago". Week start per ARCH §9.4.

### 7.6 Math rendering

Implement `MathExpression`, `VerticalProblem`, and `NumberLine` exactly per ARCH §9.5:

- Build expressions from tokens; container `dir` = profile `mathDirection` (independent of UI `dir`).
- Each number = `<bdi dir="ltr">` + `formatNumber`.
- `aria-label` from an ICU message per template (`math.spoken.add`: "{a} plus {b} equals what?" / "{a} زائد {b} يساوي كم؟"); the visual tokens get `aria-hidden="true"`.
- Column entry focus starts at the ones column in all locales.
- Number Pad grid is `dir="ltr"`; backspace icon mirrors.

### 7.7 Language switching

Implement per ARCH §9.8. The activity store must be keyed by route path **without** the locale prefix so state survives `/en/practice/ADD-04` → `/ar/practice/ADD-04`. Use `navigate(newPath, { replace: true })`.

### 7.8 Pseudo-locale

Add `en-XA` (dev only): wraps strings in `⟦…⟧`, expands length 30 %, and forces `dir="rtl"` to expose mirroring bugs with readable text.

---

## 8. Math engine: required invariants and tests

Use **fast-check** with the seeded RNG. For **every MVP Skill × Tier**, generate ≥ 10,000 items and assert:

| # | Invariant |
|---|---|
| P-01 | All operands, answers, and choices are integers ≥ 0. |
| P-02 | Values stay within the Skill's catalogue range (PRD §6.2) and Tier constraints. |
| P-03 | `answer` equals the true result of the operation (recomputed independently in the test). |
| P-04 | Subtraction results ≥ 0. "No regrouping" Skills never require a regroup in any column; Tier-3 "with regrouping" items always require ≥ 1 regroup; SUB-07 Tier 3 includes regrouping across zero in ≥ 20 % of items. |
| P-05 | Division: divisor ≠ 0; dividend % divisor === 0 for all MVP Skills; dividend = 0 only in DIV-03–06. |
| P-06 | Multiplication facts have factors in 0–10; ×0/×1 items ≤ 2 per generated Practice Set. |
| P-07 | Choices: correct answer appears exactly once; distractors unique, ≥ 0, ≠ answer, count = 2 (Stage 1) or 3 (Stage 2+); at most one distractor is answer ± 1. |
| P-08 | No two consecutive identical items in a set; re-queued items differ from the original. |
| P-09 | `checkAnswer` accepts the answer in Western, Eastern Arabic, and Persian digit forms and rejects every distractor. |
| P-10 | Same `(seed, index)` → identical item (determinism). |
| P-11 | `workedExample(item)` final step value equals `item.answer`. |

Also add **example-based tests** for edge cases: `0 + 0`, `10 − 10`, `0 × 7`, `7 × 0`, `0 ÷ 5`, `100 − 1` (SUB-06 boundary), `999` sums, `302 − 158`, `10 × 10`, `90 ÷ 9`.

**Adaptivity & mastery tests:** table-driven tests for step-up after 3 consecutive first-try correct, step-down after 2 consecutive incorrect, Star 1/2/3 thresholds (including exactly 80 % and 90 %, the "half the items Tier ≥ 2" rule, and "two different calendar days"), and review intervals (+7/+21/+60 days).

---

## 9. Responsive design implementation

- Mobile-first CSS with DS breakpoints: compact `< 600px`, medium `600–1023px`, expanded `≥ 1024px` (use `@media (width >= 600px)` syntax and container queries for cards).
- Activity layout: stacked on compact/medium portrait; side-by-side (work area inline-start 60 %, answer area inline-end 40 %) on expanded or landscape with height ≥ 480 px.
- Answer area stays within the bottom thumb zone on phones; never hidden by on-screen keyboards (use the Number Pad, not the OS keyboard, for answers; set `inputmode="none"` on answer fields when the pad is visible).
- Support 360 px width and 200 % text zoom without horizontal scrolling or overlap; use `clamp()` only within DS token ranges.
- Respect `env(safe-area-inset-*)`; test notch devices in Playwright device profiles.
- Pointer types: hover styles only under `@media (hover: hover)`.

---

## 10. Accessibility implementation

| Area | Implementation |
|---|---|
| Semantics | Native elements first (`button`, `input`, `dialog`); one `h1` per page; landmarks (`header`, `main`, `nav` in Grown-ups Area). |
| Focus | Visible two-tone ring (DS §9); on route change move focus to the page `h1`; dialogs trap and restore focus. |
| Keyboard | Every interaction keyboard-operable; arrow keys in radio groups/grids follow **visual** order (reverse logical left/right handling in RTL); `Esc` closes non-destructive dialogs. |
| Drag alternatives | Select-then-place pattern for every drag (DS §8.4). |
| Live regions | One polite region for feedback and answer value; never announce celebrations twice. |
| Math | `aria-label` spoken forms (§7.6); manipulatives expose text summaries. |
| Language | `lang` on `<html>`; `lang` attribute on any inline text in the other language (e.g. the LanguageSwitch label). |
| Motion | `prefers-reduced-motion` and calm mode both map to `data-motion="reduced"` on `<html>`; components read it. |
| Audio | Never autoplay before user interaction; every narrated line has visible text. |
| Targets | DS §5.2 sizes; add an automated check that interactive elements' bounding boxes ≥ 48 × 48 px. |
| Timing | No timeouts on learner input. Celebrations never block input > 600 ms. |

Manual screen-reader passes per milestone M5–M9: VoiceOver (iOS Safari) and TalkBack (Android Chrome) in **both** languages, plus NVDA (Firefox) in English.

---

## 11. Child safety and privacy implementation

- Implement CSP and headers exactly as ARCH §11 in the hosting config; add an E2E test that fails if any request goes to a non-same-origin host.
- Nickname input: max 12 characters, trimmed, no URLs (reject strings containing `http`, `www`, `@`, or `.` followed by letters), shown only on this device; never in URLs, logs, error reports, or stats.
- No `console.log` of profile data in production (lint rule `no-console` with allow-list for `warn`/`error` without payload).
- Grown-up Gate: press-and-hold 2 s, then three digit words in the current language; three wrong attempts → 30 s cooldown with neutral copy. PIN hashed with PBKDF2 (Web Crypto, ≥ 100,000 iterations, random salt).
- External links only in Grown-ups Area, with `rel="noopener noreferrer"` and a "You are leaving Number Oasis" confirmation.
- Opt-in stats (Should): disabled by default; payload whitelist test; no `profileId`, nickname, or timestamps finer than the date.
- Data deletion is immediate; verify with a test that inspects IndexedDB after deletion.

---

## 12. Testing strategy

### 12.1 Test pyramid

| Layer | Tool | Scope | Gate |
|---|---|---|---|
| Unit | Vitest | Domain, services, formatting, repositories | ≥ 90 % lines overall; 100 % branches in `domain/math`, `domain/adaptivity` |
| Property-based | fast-check | Math invariants P-01–P-11 | 10,000 runs per Skill × Tier in CI nightly; 1,000 per PR |
| Component | Testing Library | DS components in en/ar, both Number Styles, both Math Directions | Required for every component |
| E2E | Playwright | Journeys J-01–J-08 | Chromium, WebKit, Firefox; Pixel 7 and iPad profiles; both locales |
| Visual regression | Playwright screenshots | Matrix in §12.5 | Zero unapproved diffs |
| Accessibility | axe-core + manual SR | All routes and key states | Zero serious/critical violations |
| Performance | Lighthouse CI | Home, Practice, Lesson | NFR-01 budgets |
| Content | Zod + custom scripts | Schema, key parity, plural categories, audio files exist, pending-review report | Build fails on error |

### 12.2 Required E2E scenarios

1. First run in Arabic: welcome → gate → create profile → Home renders RTL with Eastern Arabic digits.
2. First run in English → complete ADD-01 Lesson → Star 1 → TR-01 awarded once.
3. Practice ADD-04: answer 3 first-try correct → Tier increases; 2 incorrect → Tier decreases.
4. Wrong twice → Worked Example shown → similar item re-queued; set length ≤ 12.
5. Reach Star 2 on ADD-05 → Multiplication World unlocks.
6. Mastery across two simulated days (injected clock) → Star 3 → review scheduled +7 days.
7. Switch language mid-Practice → same item, same attempts, new digits and direction; nothing lost.
8. Reload mid-set → answered items persisted; Seeds unchanged after reload (no duplicates).
9. Keyboard-only: complete a Practice Set and a Lesson with drag manipulatives.
10. Offline: load once, go offline, complete a Lesson and a Game.
11. Grown-ups: change Number Style to Western → learner screens update; export → delete profile → import → identical data.
12. No third-party requests across all journeys.

### 12.3 Localization tests

- Key and ICU-argument parity between `en` and `ar`.
- Every Arabic plural message has all categories.
- Formatting unit tests (§7.4) and date tests for both calendars.
- Screenshot check that no page in `ar` contains Western digits when Number Style = `arab` (DOM scan for `[0-9]` inside `main`, excluding `lang="en"` nodes).
- Pseudo-locale run of all E2E smoke tests.

### 12.4 Design-token tests

- Contrast test over every allowed text/background token pair in DS §3 (fail < 4.5:1 for text pairs, < 3:1 for large-text/graphic pairs).
- Lint: no raw colours outside `tokens.css`; no physical CSS properties.

### 12.5 Visual regression matrix

For Home, World, Skill page, Lesson step (model + guided), Practice (choice, number entry, column entry), Feedback states, Summary, each Game, Trophy Room, Grown-ups report:

`{ en, ar-arab-rtl, ar-latn-ltr } × { 360×780, 820×1180, 1280×800 } × { default, reduced-motion final frame }`

---

## 13. Acceptance criteria

Format: **Given / When / Then**. A feature is accepted only when its criteria pass in **both** English and Arabic.

### F-01 / F-02 — First run and profiles (US-01, US-20)

- **Given** no saved data, **when** the site opens, **then** a bilingual welcome shows equal "English" and "العربية" buttons, and nothing else is required before choosing.
- **Given** the learner chose Arabic, **then** `<html lang="ar" dir="rtl">`, the layout is mirrored, and Arabic fonts are used.
- **When** creating the first profile, **then** the Grown-up Gate must be passed, and the form asks only for nickname, avatar, and starting Stage (plus Number Style/Math Direction confirmation in Arabic).
- **Given** 6 profiles exist, **then** "Add profile" is hidden and a note explains the limit.
- **Then** no network request contains the nickname (verified by request interception).

### F-03 / F-04 — Home, Worlds, Skill Path

- Home shows the Oasis at the correct Oasis Stage for the profile's Seeds, four World cards with correct lock states (PRD §6.9), Daily Mix, Trophy Room, and My Progress.
- A locked Skill node, when tapped, shows the unlock explanation and does not navigate.
- Starting Stage 3 profile: Addition, Subtraction, Multiplication, and Division Worlds are open; Stage 1–2 Skills unlocked; first Stage 3 Skill unlocked in each World.

### F-05 — Lessons (US-02, US-03)

- Each of the 26 MVP Skills has a Lesson with 4–7 steps following Hook → Model → Guided tries (2–3) → Key idea → Ready.
- Narration plays on tap of the speaker button and (if narration is on) automatically on each step after the first user interaction; text is always visible.
- Completing the Lesson with ≥ 1 guided try correct sets Stars to ≥ 1 and awards +5 Seeds once.

### F-06 — Practice (US-04, US-05)

- Set length: 8 (Stage 1 Skills) or 10 (others), up to 12 with re-queues.
- First wrong attempt: gentle message, Hint 1, wrong option greyed; second wrong: Worked Example; no red colours or buzzer sounds.
- Tier changes exactly per PRD §6.7; Stars per §6.8; Seeds per §7.1.
- Exiting mid-set shows the confirmation; answered items keep their Seeds; the partial set does not count toward Stars.
- Every item satisfies P-01–P-11 (verified by tests, and by a runtime assertion in development builds).

### F-07 — Daily Mix

- Contains 10 items from unlocked Skills with ≥ 1 Star, weighted 40/40/20 (PRD §6.10) — verified statistically over 1,000 generated mixes (±5 %).
- First completion per day adds +5 bonus Seeds; a second completion that day does not.

### F-08 — Games (US-08)

- Bubble Pop, Number Line Hop, and Match Pairs each load a Skill, use the shared generator, are untimed, award Seeds, and are fully playable with keyboard.
- Wrong taps never remove Seeds or end the round.
- In reduced motion, bubbles are static tiles and hops are instant.

### F-09 / F-10 — Seeds, Oasis, Trophies (US-06, US-07)

- Seeds and Oasis Stage thresholds match PRD §7.1; crossing a threshold plays the growth animation once.
- All 18 Trophies award under the exact rules in PRD §7.2, exactly once each (replaying events does not duplicate).
- Trophy Room shows earned Trophies and locked silhouettes with hints.

### F-11 — My Progress (US-10)

- Shows Stars per World and Mastered counts with numbers in the active Number Style; no percentages.

### F-12 — Grown-ups Area (US-21–US-26)

- Gate: press-and-hold + three digit words (or PIN); three failures → 30 s cooldown.
- Report shows Stars per Skill, 30-day first-try accuracy, "needs help" Skills (accuracy < 60 % over ≥ 10 items), weekly time, Trophies with dates in the chosen calendar.
- Settings changes apply immediately to learner screens.
- Export → delete → import round trip restores identical data; "delete all" leaves no learner data in IndexedDB.

### F-13 — Audio

- Narration, SFX, and music toggles work independently; nothing plays before user interaction; missing audio files fail silently with text shown.

### F-14 — Offline

- After one online visit, J-08 passes with the network disabled. The update prompt never appears during an activity.

### F-15 — Localization (US-09, US-22)

- 100 % key parity; all Arabic plural categories present; no Western digits on Arabic screens when Number Style = `arab`.
- Math Direction `rtl` renders `7 + 5 = ?` visually as `? = ٥ + ٧`; multi-digit numbers keep digit order (e.g. `٣٤`).
- Switching language preserves activity state (E2E scenario 7).
- No physical CSS properties in the codebase (lint).

### F-16 — Break reminders

- After the configured minutes of active use, `BreakReminder` appears at the next item boundary (never mid-answer) with "Keep going" and "Take a break"; setting "Off" disables it.

### Cross-cutting

- axe: zero serious/critical violations on all routes/states in both locales.
- Lighthouse: NFR-01 budgets on Home, Lesson, Practice.
- No third-party requests (E2E scenario 12).

---

## 14. Definition of Done (per PR)

- [ ] Implements only MVP scope; cites PRD/ARCH IDs in the PR description.
- [ ] Strings added to `en` and `ar`; Arabic marked for review if not yet reviewed.
- [ ] No physical CSS, raw colours, raw numbers in UI, or hard-coded strings.
- [ ] Unit/component tests added; property tests updated if the math engine changed.
- [ ] Works with keyboard, screen reader labels present, reduced motion handled.
- [ ] Screenshots: en, ar (Eastern digits, RTL math), compact and expanded.
- [ ] No new runtime dependencies that make network calls; bundle budget respected.
- [ ] CI green: lint, test, e2e, a11y, visual, lhci (as applicable).

---

## 15. Things you must not do

- Add accounts, sign-in, email capture, or cloud sync (Future).
- Add timers, leaderboards, streak counters that reset, lives, or purchasable items.
- Use machine translation as final Arabic copy, or ship Arabic with `"_review": "pending"` to production.
- Mirror digits, operators, the Number Pad grid, or non-directional icons.
- Render math expressions as plain strings or rely on the Unicode bidi algorithm alone for equation order.
- Load fonts, scripts, images, or audio from third-party hosts.
- Show learners percentages, "wrong" labels, or red error states.
- Change PRD numbers (thresholds, set lengths, Seeds) without a decision record approved by Product.
