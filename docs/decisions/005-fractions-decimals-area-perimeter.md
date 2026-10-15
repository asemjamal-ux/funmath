# 005 — Fractions, decimals, area & perimeter for older learners

Status: Accepted (requested by the product owner on 2026-10-15). Changes PRD §4 (non-target learners "needing
fractions, decimals") and §6.2 (Skill catalogue); the Arabic strings await educator review like the rest.

## What's added
Three new Worlds, 12 MVP Skills, for Stages 4 (ages 9–10) and 5 (ages 10–12):

| World | Stage 4 | Stage 5 |
|---|---|---|
| Fractions (عالم الكسور) | FRA-01 Parts of a whole · FRA-02 Fraction of a number | FRA-03 Equivalent fractions · FRA-04 Add & subtract fractions (same denominator) |
| Decimals (عالم الأعداد العشرية) | DEC-01 Tenths | DEC-02 Hundredths · DEC-03 Add & subtract decimals (tenths) · DEC-04 × and ÷ by 10 and 100 |
| Area & Perimeter (عالم المساحة والمحيط) | GEO-01 Area by counting squares · GEO-02 Perimeter | GEO-03 Area = length × width · GEO-04 Missing side |

Each has a Lesson (hook, picture model, 2–3 guided tries with choices built from typical mistakes, key idea), Practice
with the usual three Tiers and adaptivity, hints (level 2 shows a helping picture), Worked Examples, games and
worksheets. Games: Bubble Pop, Bingo and True or False for all twelve; Match Pairs and Number Hunt only where the
question side reads well on a card (FRA-02, DEC-03, DEC-04, GEO-03). Number Line Hop stays with whole-number Skills.

## Who sees them
- The advanced Worlds appear only for profiles whose starting Stage is 4 or 5, or when a grown-up turns on
  "unlock all". Younger learners never see them (not even locked); raise the starting Stage in Grown-ups → Profiles
  as a child grows. `ADVANCED_FROM_STAGE` and `visibleSkills()` in `src/domain/adaptivity/unlock.ts`.
- Decision 004's "go straight to your own skills" now applies per World, capped at that World's top Stage: Stage 4–5
  learners still see the Stage 3 times-table and division facts, a Stage 5 learner sees only the Stage 5 advanced
  Skills, and "Show skills from earlier stages" brings the Stage 4 ones back.
- Home's "Start here" points older learners at a Skill of their own Stage first. The quick challenge on Home stays
  with arithmetic so the advanced module never loads on the start page.

## How it fits the engine
- Every question still has exactly one numeric answer. Fraction questions ask for the unknown numerator or
  denominator; decimal answers carry `Item.dp` and are typed with a decimal-point key (., ٫ or , accepted).
- Decimal values are built as integer ÷ 10^k, so they equal the written literal; answers compare at the item's
  precision. Numbers are formatted with up to two fraction digits (`formatNumber`).
- New items carry a `form` (what the question shows); `operands[2]` is always the answer, so fixed lesson items read
  the same way as arithmetic ones. PRD §6.5 rules hold: `itemViolations()` checks the answer against the form,
  distractors are unique, non-negative, in range and never accepted by the checker (property tests, 1,000 runs per
  Skill × Tier).
- NFR-01: the generators, pictures and words load on demand (`TopicsGate`, `src/features/topics`, lazy
  `topics` catalogue); the twelve Skills' generator settings live in `src/content/topic-generators.json` and attach
  when that module loads. Startup JS for Arabic Home stays at 199.4 KB of 200 KB, as before this change.
- Fixed along the way: numbers now format with up to two decimal places, and the catalogue digit-localiser no
  longer re-formats the digits of a decimal (it turned 0.06 into 0.6).
