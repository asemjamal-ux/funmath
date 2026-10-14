# 003 — Front page from Fun with Multiplication, and printable worksheets

Status: Accepted (requested by the product owner on 2026-10-15). Builds on 002.

Source: the product owner's own site, github.com/asemjamal-ux/Kids_Fun_Multiplication (funmultiplication.netlify.app).

## Theme
`src/styles/front.css` ports that site's component system: pill buttons, ink "eyebrow" pills, a hero headline
with two tilted coloured words (whole words, so Arabic letters stay joined), tilted stickers with tags, card icons,
a stat box, banners and an ink footer. Fonts are Fredoka + Nunito (English) and Baloo Bhaijaan 2 + Cairo (Arabic),
self-hosted through @fontsource — the original loads Google Fonts, which N-01 forbids.

## Front page (Learner Home, `src/features/home/HomeFront.tsx`)
Same section order as the original: hero (greeting eyebrow, headline, next-step / games / worksheet buttons, the
Oasis with floating chips and a tappable Fanak instead of "Multi") → "Pick a world" chips (+ Daily Mix) → three ways
to learn → quick challenge → how it works → banners (Trophy Room, Grown-ups) → footer.

Adapted to Number Oasis rules:
- **Quick challenge** counts "5 right" instead of a streak: a wrong answer never resets progress and is shown in
  amber with a gentle message, never red (N-04, N-09, CS-07). It uses the learner's suggested Skill and Tier and is
  not recorded (no Seeds) — it is a warm-up, not a Practice Set.
- No videos page (not in MVP scope); "Watch" became "Learn" (Lessons).

## Printable worksheets (`/{locale}/worksheets`, `src/features/worksheets/WorksheetsPage.tsx`)
Modelled on the original worksheet maker and extended from times tables to every MVP Skill:
- Types: practice problems (across or stacked columns), missing-number puzzles, skip counting (choose tables),
  blank and full 10 × 10 times charts; optional answer-key page.
- Problems come from the Practice generators, so every item satisfies PRD §6.5. Levels Easy/Medium/Tricky map to
  Tiers 1–3. Missing-number blanks are only placed where the answer is unique.
- Arabic: Eastern digits (or Western per Number Style), operator side follows Math Direction, column digits stay
  right-aligned by place value.
- Privacy: no name field (N-02). The sheet prints a blank "Name" line; a checkbox can print the active profile's
  nickname. Nothing is stored or sent; printing uses the browser dialog.
- Reachable without an active profile (grown-ups use it too): Home, footer and the Grown-ups navigation link to it.
- Its strings live in `src/locales/{en,ar}/lazy/worksheets.json` and load only on that page to protect the
  200 KB initial-JS budget (Arabic entry page ≈ 198.5 KB gzip at level 6 after this change).
