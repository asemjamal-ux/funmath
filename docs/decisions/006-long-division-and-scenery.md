# 006 — Remainders, long division, and scenery on the inner screens

Status: Accepted (requested by the product owner on 2026-11-17). Moves DIV-07 and DIV-08 from Future to MVP
(PRD §6.2, §15.2) and adds to the visual direction of decision 002. The Arabic strings await educator review like
the rest.

## Part 1 — Division goes on to Stage 4

| Skill | Stage | Range (PRD §6.2) | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|---|---|
| DIV-07 Division with remainders (القسمة مع باقٍ) | 4 | Dividend ≤ 100, divisor 2–9, 0 < remainder < divisor | ÷ 2–5, quotient ≤ 5 | ÷ 2–9, quotient ≤ 10 | ÷ 6–9, quotient 5–10 |
| DIV-08 Long division (القسمة المطوّلة) | 4 | Dividend ≤ 999 ÷ 1 digit, exact at Tiers 1–2 | 2-digit, every digit divides on its own (84 ÷ 4) | 2- and 3-digit with carrying (72 ÷ 3, 432 ÷ 4) | 3-digit with a remainder |

Each has a Lesson, Practice with the three Tiers, hints, Worked Examples, worksheets, and Bubble Pop, Bingo and True
or False. Match Pairs and Number Hunt are left out: "17 ÷ 5" on a card does not say whether the quotient or the
remainder is wanted.

### One unknown per question
PRD §6.5 rule 5 foresaw a quotient/remainder *pair* for DIV-07. The engine, the games and the worksheets all work with
one numeric answer, so a question with a remainder asks for one of the two and shows the other:
`22 ÷ 5 = 4 R ?` or `22 ÷ 5 = ? R 2`. Over a Practice Set both are asked. The checker still accepts exactly one
number, and a remainder is only asked when there is one. Entering both numbers in one question is left for later.

### What the learner sees
- **Remainders:** the hint and the Worked Example show the dividend as groups of the divisor, with the leftovers set
  apart in a dashed bag. The picture would give the answer away, so it is not part of the question itself.
- **Long division:** the question shows the bracket with the dividend, the divisor and an empty box for each quotient
  digit. The hint works the first round; the Worked Example and a correct answer show every round: the quotient
  digit, the product subtracted, and the next digit brought down (in its own colour). A zero left before bringing
  down is not written. The words follow the same rounds: "Bring down the 2 to make 12. 12 ÷ 3 = 4, because …".
- Digits keep their order in every locale. The divisor sits on the start side of the Math Direction (left in LTR,
  right in RTL), like the operator in column problems. **To confirm with the Arabic educator:** which long-division
  layout the target curriculum teaches; the layout is drawn in one place (`LongDivision` in
  `src/features/topics/TopicPicture.tsx`).
- After a correct answer the question now shows its answer in place of the blank, in every Skill.

### Who sees them
- Stage 4–5 profiles get DIV-07 open straight away; DIV-08 opens at 2 Stars on DIV-07 (Stage 5: both are open).
  Younger learners reach them the usual way, after DIV-06.
- The arithmetic Worlds still show their Stage 3 facts to Stage 4–5 learners even though Division now has Stage 4
  Skills: long division leans on the times tables (`visibleSkills()` caps the cut-off at Stage 3 for those Worlds).
- Home's quick challenge stays with the plain arithmetic Skills, as in decision 005.

### How it fits the engine
- One new form, `divRem` (`{ a, b, ask: 'q' | 'r', long }`), built by the advanced-topics module, so the generator,
  the pictures and the words load on demand (decision 005). A Skill needs that module when its `model` is `form`;
  the pages now test that instead of the World.
- `longDivSteps(a, b)` gives the rounds once; the picture and the Worked Example both read it, so they cannot disagree.
- Distractors come from typical slips: one group too many or too few, the remainder given for the quotient (and the
  other way round), what is missing to the next group, a digit off in the tens, a dropped zero (13 for 103).
- Tests: the property tests cover both Skills × three Tiers; example tests check the ranges above, that the rounds
  rebuild the quotient, and the unlock rules. Counts are now 40 Skills and 40 Lessons.
- NFR-01: startup JS for Home grows by about 0.4 KB gzipped (two catalogue entries, two titles, the Lessons), to
  199.8 KB of 200 KB for Arabic Home and 196.5 KB for English (measured with `npm run lhci`). Nothing else may be added to the startup bundle without taking something out.

## Part 2 — Scenery on the inner screens

Home had the sticker-book look of decision 002; the screens behind it were plain. `src/styles/scenery.css` (loaded
last) and ten small SVG pictures in `src/assets/art/` change that. As with `playful.css`, only existing classes are
restyled: markup and test selectors are unchanged, and no JavaScript is added.

- **World landmarks (DS §2):** the Well, the Market, the Palm Grove and the Picnic, plus a cake, a measuring jug and a
  tiled courtyard for the advanced Worlds. They appear as a sticker on each open World on Home, in the World page's
  banner (with sun and clouds) and on the Skill page.
- **Skill path:** a dotted trail joins one Skill to the next (straight on phones, winding from 600 px); Skill names
  sit on labels that show their state (new, in progress, mastered, locked).
- **Skill page:** one sticker card instead of loose elements on the background.
- **Games:** each game has its own colour band and a larger icon.
- **Practice:** the question sits on a sheet of paper; Fanak's prompt is a speech pill.
- **Lessons:** the opening and closing steps are set in the desert, under the sun.
- **Desert band:** dunes, palms and a cactus along the foot of the World, Skill, Games, Trophy Room, My Progress and
  welcome screens. Not in the Grown-ups Area, not on worksheets, not in print.

Rules kept: text on a bright fill is ink; pictures hold no text and are not mirrored in RTL (DS §2, §6.3); layout
uses logical properties; the only new motion is a hover tilt, off in calm mode. The SVG files hold their own colour
values (the palette of `tokens.css`); CSS and components still take colours from tokens only.

The visual-regression baselines in `e2e/__screenshots__` were regenerated with this change
(`npm run test:visual -- --update-snapshots`); regenerate them again after any further change to the look.

Also fixed along the way: `registerServiceWorker()` threw when the browser blocks service workers and `register()`
resolves with nothing (the accessibility suite caught it as an uncaught page error).
