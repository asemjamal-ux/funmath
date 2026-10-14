# Number Oasis — Design System

| | |
|---|---|
| **Product** | Number Oasis (واحة الأرقام) |
| **Document** | `design-system.md` (v1.0, Draft) |
| **Date** | 14 October 2026 |
| **Companion documents** | `product-requirements.md` · `website-architecture.md` · `agent-instructions.md` |
| **Owns** | Visual direction, tokens, typography, layout, components, states, motion, sound, voice |

> Terms follow `product-requirements.md` §5. Token names here are the exact CSS custom properties implemented in `src/styles/tokens.css` (see `website-architecture.md` §6.2).

---

## 1. Design principles

| Principle | What it means in practice |
|---|---|
| **Cheerful, not chaotic** | Warm colours and playful shapes on calm, uncluttered screens. One focal point per screen. |
| **Big, obvious, forgiving** | Large targets, clear affordances, generous spacing, undo/exit always visible. |
| **Show, then tell** | Visual models first; text short; audio for early readers. |
| **Kind feedback** | Encouraging language and gentle motion; no red crosses or harsh sounds. |
| **Two native languages** | Arabic layouts are designed, not flipped; typography tuned per script. |
| **Accessible by default** | WCAG 2.2 AA contrast, focus, motion, and target sizes are baked into every token and component. |

---

## 2. Visual direction

**Theme: the Number Oasis.** A sunny desert oasis that grows as the learner learns: sand dunes, palm trees, a pond, lanterns, birds. Rounded, soft shapes; flat illustration with gentle gradients and subtle texture; friendly characters with large eyes and simple features.

**Mascot — Fanak (فَنَك):** a fennec fox with oversized ears, a sand-coloured coat, and a teal scarf (brand colour). Expressions: happy, thinking, cheering, curious, calm. Fanak points to things, celebrates, and offers hints, but never looks disappointed or angry.

**Operation identities:** each Operation has a colour, a symbol, and a landmark in the Oasis so it is recognisable without colour.

| Operation | Symbol | Colour family | World landmark | Icon shape |
|---|---|---|---|---|
| Addition (الجمع) | + | Sky blue | The Well (more water joins) | Circle |
| Subtraction (الطرح) | − | Rose | The Market (items taken away) | Square |
| Multiplication (الضرب) | × | Sunset orange | The Palm Grove (rows of trees) | Triangle |
| Division (القسمة) | ÷ | Lavender | The Picnic (sharing equally) | Hexagon |

**Illustration rules:** no text inside illustrations (localisation, see `website-architecture.md` §9.7); diverse, culturally appropriate depictions of families and children; modest clothing; no brands, flags, religious symbols, weapons, or scary imagery; dates, fruit, cups, books, shells, and stars as countable objects.

---

## 3. Colour

### 3.1 Core tokens

All text/background pairs below meet WCAG AA (≥ 4.5:1 for text, ≥ 3:1 for large text and UI graphics) on both `--color-bg` and `--color-surface`. Contrast is verified automatically in CI (`agent-instructions.md` §12).

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#FFF9EF` | App background (warm cream) |
| `--color-surface` | `#FFFFFF` | Cards, dialogs |
| `--color-surface-sunken` | `#F5EBDD` | Wells, input backgrounds, track of progress bars |
| `--color-ink` | `#1F2A44` | Primary text, icons |
| `--color-ink-muted` | `#4A5675` | Secondary text |
| `--color-border` | `#D9CBB6` | Dividers, card outlines (decorative) |
| `--color-border-strong` | `#8C7B63` | Input borders, focusable outlines (≥ 3:1) |
| `--color-brand` | `#0E7C7B` | Brand teal: primary buttons, links in Grown-ups Area |
| `--color-brand-strong` | `#0A5E5D` | Brand pressed state, button bottom edge |
| `--color-brand-soft` | `#D8F1EF` | Brand tints, selected backgrounds |
| `--color-sun` | `#FFC93C` | Seeds, Stars, highlights (always with dark text/outline) |
| `--color-sun-strong` | `#8A5A00` | Text on sun tints; star outline |
| `--color-focus` | `#1F2A44` (outer) + `#FFC93C` (inner) | Two-tone focus ring visible on any background |

### 3.2 Operation colours

| Token | Strong (text/icons on light) | Fill (buttons with white text, large) | Soft (backgrounds) |
|---|---|---|---|
| Addition | `--color-add-strong: #1F5FBF` | `--color-add: #2F6FED` | `--color-add-soft: #E1ECFD` |
| Subtraction | `--color-sub-strong: #B8326F` | `--color-sub: #D14883` | `--color-sub-soft: #FBE3EE` |
| Multiplication | `--color-mul-strong: #B4530B` | `--color-mul: #D96F14` | `--color-mul-soft: #FFEBD9` |
| Division | `--color-div-strong: #7A3FC2` | `--color-div: #9A63E0` | `--color-div-soft: #EEE4FB` |

Rules: body-size text uses only the *strong* value. White text on a *fill* value is allowed only at ≥ 24 px regular / ≥ 19 px bold (large text) and must be verified ≥ 3:1. Never use Operation colour as the sole indicator — always pair with the symbol.

### 3.3 Feedback colours

| Token | Hex | Use |
|---|---|---|
| `--color-success-strong` | `#1E7A43` | "Correct" text and check icon |
| `--color-success-soft` | `#DFF5E7` | Correct answer background |
| `--color-tryagain-strong` | `#8A5A00` | "Not quite" text and hint icon (warm amber, not red) |
| `--color-tryagain-soft` | `#FFF3D6` | Try-again background |
| `--color-locked` | `#8C7B63` | Padlock icons, locked node outline |
| `--color-danger-strong` | `#B42318` | **Grown-ups Area only**: destructive actions (delete data) |

Red is reserved for destructive grown-up actions. It never appears in learner feedback.

### 3.4 Theme

MVP ships a single light theme. A high-contrast theme is a Future enhancement; tokens are structured so a theme can override them on `:root[data-theme]`.

---

## 4. Typography

### 4.1 Families

| Role | English (Latin) | Arabic | Notes |
|---|---|---|---|
| Display (titles, big numbers, buttons) | **Baloo 2** (600–800) | **Baloo Bhaijaan 2** (600–800) | Same design family → consistent personality across scripts. |
| Body (instructions, lessons, Grown-ups Area) | **Nunito** (400–700) | **Noto Sans Arabic** (400–700) | Noto Sans Arabic renders tashkeel (diacritics) reliably. |
| Numerals in math | Baloo 2, tabular figures (`font-variant-numeric: tabular-nums`) | Baloo Bhaijaan 2 for Eastern Arabic digits; Baloo 2 when Number Style is Western | Equal-width digits keep columns aligned. |

Fonts are self-hosted, subset per script, `font-display: swap`, selected with `:lang(en)` / `:lang(ar)`. Fallbacks: `system-ui, "Segoe UI", Tahoma, sans-serif` (Tahoma has good Arabic coverage).

### 4.2 Type scale

Arabic glyphs appear smaller at the same point size and need more vertical room for ascenders, descenders, and diacritics, so Arabic sizes are ~8–10 % larger with taller line heights.

| Token | Use | EN size / line height | AR size / line height | Weight |
|---|---|---|---|---|
| `--type-display-xl` | Celebration titles | 48 / 56 | 52 / 76 | 800 |
| `--type-display-l` | Page titles (learner) | 36 / 44 | 40 / 60 | 700 |
| `--type-title` | Section titles, World names | 28 / 36 | 30 / 46 | 700 |
| `--type-heading` | Card titles, Skill names | 22 / 30 | 24 / 38 | 700 |
| `--type-body-l` | **Default learner text**, instructions | 20 / 30 | 22 / 38 | 600 |
| `--type-body` | Lesson paragraphs, Grown-ups Area emphasis | 18 / 28 | 20 / 34 | 400–600 |
| `--type-body-s` | Grown-ups Area body | 16 / 24 | 18 / 30 | 400 |
| `--type-label` | Button labels (secondary), chips | 16 / 22 | 17 / 26 | 700 |
| `--type-caption` | Grown-ups Area metadata only | 14 / 20 | 15 / 24 | 400 |
| `--type-math-xl` | Main expression in an Item | 56 / 64 | 56 / 72 | 700 |
| `--type-math-l` | Answer choices, vertical problems | 40 / 48 | 40 / 56 | 700 |
| `--type-math-m` | Number Pad keys, Match Pairs cards | 32 / 40 | 32 / 44 | 700 |

**Minimums:** learner screens never use text smaller than `--type-body` (18 px EN / 20 px AR). `--type-caption` is Grown-ups Area only.

### 4.3 Script-specific rules

| Rule | English | Arabic |
|---|---|---|
| Alignment | `text-align: start` (left) | `text-align: start` (right) |
| Letter spacing | 0 for body; ≤ 0.01em on display | **Always 0** — letter spacing breaks joining |
| Italics | Avoid in learner UI | **Never** (Arabic has no true italics) |
| All caps | Avoid; sentence case | Not applicable |
| Emphasis | Weight 700 or colour | Weight 700 or colour; never underline (collides with dots) |
| Diacritics | — | Full tashkeel on key Lesson words for Stages 1–2 (FR-45); none on UI labels; never on display font at < 28 px |
| Line length | 45–65 characters | 40–60 characters |
| Mixed-script | Wrap embedded English terms or numbers in `<bdi>` | Wrap embedded Latin/number runs in `<bdi>` |
| Kashida (tatweel) | — | Do not use for justification; never justify text |

### 4.4 Numerals

- Eastern Arabic digits ٠١٢٣٤٥٦٧٨٩ are the Arabic default; Western digits 0–9 when the grown-up chooses (PRD §5 Number Style).
- Never mix digit systems on one screen (the formatting service guarantees this).
- Use the true minus sign `−` (U+2212), multiplication `×` (U+00D7), division `÷` (U+00F7). Operators are not mirrored in RTL.

---

## 5. Spacing, sizing, shape, elevation

### 5.1 Spacing scale (4 px base)

| Token | px | Typical use |
|---|---|---|
| `--space-1` | 4 | Icon-to-text tight |
| `--space-2` | 8 | Inside chips |
| `--space-3` | 12 | Between related controls |
| `--space-4` | 16 | Default padding; mobile page gutter |
| `--space-5` | 24 | Card padding; gap between answer choices |
| `--space-6` | 32 | Section spacing; tablet gutter |
| `--space-7` | 48 | Large section separation |
| `--space-8` | 64 | Page top/bottom on large screens |

### 5.2 Touch targets

| Context | Minimum size | Spacing between targets |
|---|---|---|
| All interactive elements | 48 × 48 px | ≥ 8 px |
| Answer choices, Number Pad keys (Stage 2+) | 64 × 64 px | ≥ 12 px |
| Answer choices (Stage 1) | 80 × 80 px | ≥ 16 px |
| Drag sources/targets | 56 × 56 px hit area | ≥ 12 px |

### 5.3 Radius and elevation

| Token | Value | Use |
|---|---|---|
| `--radius-s` | 8 px | Chips, inputs |
| `--radius-m` | 16 px | Buttons, answer choices |
| `--radius-l` | 24 px | Cards, dialogs |
| `--radius-pill` | 999 px | Progress bars, toggles, Seeds counter |
| `--shadow-card` | `0 2px 0 rgba(31,42,68,.08), 0 8px 24px rgba(31,42,68,.08)` | Cards |
| `--shadow-button` | `0 4px 0 var(--btn-edge)` | "Chunky" tactile buttons; pressed = `0 1px 0` + `translateY(3px)` |
| `--shadow-dialog` | `0 16px 48px rgba(31,42,68,.24)` | Dialogs, celebrations |

---

## 6. Layout

### 6.1 Breakpoints and grid

| Name | Width | Columns | Gutter / margin | Typical device |
|---|---|---|---|---|
| Compact | < 600 px | 4 | 16 px | Phones (portrait) |
| Medium | 600–1023 px | 8 | 24 px | Tablets portrait, phones landscape |
| Expanded | ≥ 1024 px | 12 | 32 px | Tablets landscape, laptops |

- Activity screens cap content width at 960 px; Grown-ups Area at 1120 px.
- Support 360 px minimum width without horizontal scrolling.
- Respect safe-area insets (`env(safe-area-inset-*)`).

### 6.2 Screen templates

**Activity screen (Lesson, Practice, Daily Mix, Games)**

```
┌──────────────────────────────────────────────┐
│ [✕ Exit]   ● ● ● ○ ○ ○ ○ ○ ○ ○   [💡][🔊]   │  Top bar (56–64 px)
├──────────────────────────────────────────────┤
│  (Fanak)  Instruction text  [🔊]             │  Prompt area
│                                              │
│          7 + 5 = ?   / manipulative          │  Work area (focal point)
│                                              │
│   [ 11 ]   [ 12 ]   [ 13 ]   [ 2 ]           │  Answer area (thumb zone, bottom)
└──────────────────────────────────────────────┘
```

- **Compact/Medium portrait:** stacked as above; answer area pinned to the bottom.
- **Expanded/landscape:** work area occupies the inline-start ~60 %, answer area the inline-end ~40 % (mirrored in Arabic: work area on the right).
- The Exit button is always at the inline-start of the top bar (left in English, right in Arabic); hint and audio at inline-end.

**Learner Home:** Oasis scene as hero (top 45 % on compact), Fanak greeting bubble, a 2 × 2 grid of World cards (1 column below 400 px), then Daily Mix card and a row with Trophy Room and My Progress. Language switch and profile avatar sit in the top bar.

**World / Skill Path:** a winding path of Skill nodes running from the inline-start top to inline-end bottom; on compact screens it becomes a vertical path. Nodes are 88 px circles with the Skill number, Stars below, and a short title.

**Grown-ups Area:** conventional, calmer layout: side navigation on expanded screens (inline-start), tabs on compact; tables and simple charts; neutral palette with brand teal accents.

### 6.3 RTL mirroring rules

| Element | Mirror in Arabic? | Notes |
|---|---|---|
| Page layout, navigation order, top-bar placement | **Yes** | Via `dir="rtl"` and logical properties |
| Text alignment | **Yes** | `text-align: start` |
| Progress bars, progress dots | **Yes** | Fill from inline-start (right) |
| Skill Path direction | **Yes** | Path starts at the right |
| Back/next arrows, chevrons, "continue" arrows | **Yes** | `mirrorInRtl` |
| Carousels/swipe direction | **Yes** | Next item comes from inline-end |
| Fanak's facing direction | **Yes** | Faces toward the content's reading direction |
| Equations, number lines, column-operator side | **Follows Math Direction**, not UI direction | See `website-architecture.md` §9.5 |
| Digits within a number | **Never** | Most significant digit first, always |
| Number Pad grid | **No** | 1-2-3 top row left-to-right; backspace icon mirrors |
| Media controls (play/pause), checkmark, star, speaker, padlock, clock, lightbulb | **No** | Non-directional |
| Charts in Grown-ups Area | **Yes** for time axes | Time flows from inline-start |
| Logos, Trophy artwork, illustrations | **No** | Unless they show directional motion |

---

## 7. Iconography

- Style: rounded line icons, 2.5 px stroke at 24 px, with optional soft fill; sizes 24, 32, 48 px.
- Every icon-only button has a localised accessible name and a visible tooltip on hover/focus for Grown-ups Area.
- Directional icons (mirror in RTL): `arrow-back`, `arrow-forward`, `chevron-start`, `chevron-end`, `undo`, `redo`, `backspace`, `exit-door`.
- Non-directional icons (never mirror): `check`, `star`, `seed`, `trophy`, `lock`, `speaker`, `speaker-off`, `music`, `play`, `pause`, `lightbulb` (hint), `globe` (language), `gear`, `shield` (Grown-ups), `plus`, `minus`, `times`, `divide`.

---

## 8. Components

Each component lists anatomy, variants, states, RTL behaviour, and accessibility. Components live in `src/components/`; names below are their exact component names.

### 8.1 Actions

**`Button`**
- Variants: `primary` (brand teal fill, white text), `secondary` (white with brand border), `operation` (Operation fill + symbol), `ghost` (text only, Grown-ups Area), `danger` (Grown-ups Area only).
- Sizes: `l` (64 px height, learner default), `m` (48 px), `s` (40 px visual, 48 px hit area; Grown-ups Area only).
- Anatomy: optional leading icon (inline-start), label, optional trailing icon (inline-end, mirrors if directional).
- Tactile style: bottom edge shadow; pressed state sinks 3 px.

**`IconButton`** — 48 × 48 minimum; circular; requires `label` prop for accessible name.

**`LanguageSwitch`** — globe icon + other language's name in its own script (`العربية` / `English`); has `lang` attribute on the label; never a flag.

### 8.2 Answering

**`AnswerChoice`** — large rounded tile showing a number via `MathNumber`. States: default, hover, focus, pressed, selected, correct (green check + soft green bg), try-again (amber, greyed after wrong, `aria-disabled`), disabled. Group uses `role="radiogroup"` semantics with arrow-key navigation following visual order.

**`NumberPad`** — 3 × 4 grid: `1 2 3 / 4 5 6 / 7 8 9 / ⌫ 0 ✓`. Digits in active Number Style. Grid always `dir="ltr"`; backspace icon mirrors in Arabic. Keys 64 × 64 (80 × 80 Stage 1). Physical keyboard input mirrored to the display.

**`AnswerField`** — displays the typed answer with a blinking caret; max 6 digits; `aria-live="polite"` announces the current value.

**`ColumnEntry`** (inside `VerticalProblem`) — one box per digit; focus begins at the ones column; after each digit, focus moves to the next higher place value; carry boxes above columns are optional inputs.

### 8.3 Math display

**`MathNumber`** — renders one number through the formatting service inside `<bdi dir="ltr">` with tabular figures.

**`MathExpression`** — renders a token list (`website-architecture.md` §9.5) with container `dir` from Math Direction; blank shown as a dashed rounded box; spoken label via `aria-label`; sizes `xl` / `l` / `m`.

**`VerticalProblem`** — column layout aligned by place value; operator on the side defined by Math Direction; optional place-value header (ones/tens/hundreds labels localised, Stage 2–3); regroup marks.

### 8.4 Manipulatives (lessons and visual items)

| Component | Description | Interaction | Keyboard alternative |
|---|---|---|---|
| `Counters` | Round tokens (fruit, shells) in groups | Tap to add/remove; drag to group | Select counter → select group |
| `TenFrame` | 2 × 5 grid; double ten-frame for ≤ 20 | Tap cells or drag counters | Arrow keys move focus; Space fills |
| `BaseTenBlocks` | Units, rods (10), flats (100) | Drag; "trade" button to regroup 10 units ↔ 1 rod | Trade button and select-to-move |
| `NumberLine` | Ticks with labelled multiples; Fanak hops | Tap landing point | Arrow keys to move marker; Enter to confirm |
| `ArrayGrid` | Rows × columns of objects | Tap to build rows; rotate to show commutativity | Buttons for +row/+column |
| `SharingPlates` | Plates and items to share equally | Drag items to plates; auto-deal animation option | Select item → select plate |

All manipulatives expose a live text summary for screen readers (e.g. "3 groups of 4 dates, 12 in total"). Orientation follows Math Direction where order matters (number lines); grids and plates simply follow layout direction.

### 8.5 Progress and rewards

| Component | Description |
|---|---|
| `ProgressDots` | One dot per Item in a set: upcoming (outline), current (enlarged, brand), done-correct (filled teal + check), done-incorrect (filled sand, no X). Fills from inline-start. Label: "Question 4 of 10". |
| `StarRating` | 3 stars; filled = `--color-sun` with `--color-sun-strong` outline; accessible label "2 of 3 stars". |
| `SeedCounter` | Pill with seed icon and count; animates +n on earn (respect reduced motion). |
| `OasisScene` | Layered illustration showing Oasis Stage 1–10; decorative (`aria-hidden`) with a text caption "Your Oasis: stage 4 of 10". |
| `SkillNode` | Circle with Skill number, title, `StarRating`; states: locked (padlock, `--color-locked`), new, in progress, mastered (gold ring), review due (small leaf badge). |
| `WorldCard` | Operation colour soft background, symbol, landmark illustration, World name, mastered count ("3 of 7 mastered"), lock state. |
| `TrophyCard` | Earned: full-colour artwork + name; locked: silhouette + hint text. |
| `SummaryPanel` | End of set/round: correct count, Seeds earned, Star change, next-step buttons. Never shows percentages to learners. |

### 8.6 Guidance and feedback

| Component | Description |
|---|---|
| `Mascot` | Fanak with expressions `happy`, `thinking`, `cheer`, `curious`, `calm`; decorative unless speaking. |
| `SpeechBubble` | Fanak's message; tail points toward Fanak (mirrors); includes a speaker button when narration exists. |
| `FeedbackBanner` | Slides in above the answer area: `correct` (green check, positive phrase) or `tryAgain` (amber lightbulb, gentle phrase). Announced via `aria-live="polite"`. |
| `HintPanel` | Expands within the prompt area; Hint level 1 (text + small visual), level 2 (partial model). |
| `WorkedExample` | Step-by-step reveal using the Skill's manipulative; "Next step" and "Got it" buttons. |
| `LessonStepCard` | Card for each Lesson step with step indicator, text, model area, narration control. |
| `CelebrationDialog` | Trophy or Oasis Stage celebration; single "Yay!" / "رائع!" dismiss button; auto-focus on button. |

### 8.7 Profiles, gate, and Grown-ups Area

| Component | Description |
|---|---|
| `ProfileCard` | Avatar (illustrated animal) + nickname; 120 px min; "Add profile" variant (Grown-ups only). |
| `AvatarPicker` | Grid of 12 animal avatars; radio-group semantics. |
| `NicknamePicker` | Generated name suggestions ("Brave Falcon" / "صقر شجاع") with shuffle, or text input (max 12 chars) with privacy note. |
| `GrownUpGate` | Dialog: press-and-hold button (2 s, with progress ring), then three digit words to enter (or PIN pad). Adult-oriented copy; no mascot. |
| `Toggle`, `Select`, `RadioGroup` | Standard form controls, 48 px rows; labels at inline-start. |
| `ReportTable` | Skills × Stars × accuracy; sortable; numbers formatted per locale. |
| `MiniBarChart` | Weekly time/accuracy bars with text alternative table. |
| `ConfirmDialog` | For destructive actions; danger button; requires explicit confirmation text for "delete all". |

### 8.8 General

`TopBar`, `Card`, `Dialog` (focus-trapped, `Esc` closes unless destructive), `Toast` (non-blocking, 4 s, pausable), `EmptyState`, `OfflineNotice`, `BreakReminder` (Fanak stretching: "Time for a stretch break!" / "حان وقت استراحة قصيرة!", buttons "Keep going" / "Take a break").

---

## 9. Interaction states

| State | Visual treatment | Notes |
|---|---|---|
| Default | Base colours, bottom-edge shadow | |
| Hover (pointer) | Lighten fill 6 %, lift 1 px | Not relied on for touch |
| Focus-visible | 3 px `--color-focus` outer ring + 2 px sun inner ring, 2 px offset | Never removed; visible on all backgrounds |
| Pressed | Sink 3 px, shadow reduced | 100 ms |
| Selected | Brand-soft background, 3 px brand border, check badge | Not colour alone |
| Disabled | 40 % opacity of content, no shadow, `cursor: not-allowed` | Keep label readable for screen readers |
| Correct | Success-soft background, check icon, "Correct!" text | |
| Try again | Try-again-soft background, lightbulb icon, gentle text; chosen wrong option greyed | No shaking > 2 cycles |
| Locked | Padlock icon, desaturated, hint on tap | Tapping explains how to unlock |
| Loading | Skeleton shapes or Fanak "thinking"; never > 1 spinner | Announce "Loading" politely |
| Offline | Small cloud-off badge in top bar | Activities continue |

---

## 10. Voice, tone, and microcopy

- **Voice:** warm, encouraging, brief; Fanak speaks as a friend learning alongside the child.
- **Praise effort and strategy:** "You made a ten first — smart!" rather than "You're so clever!".
- **Arabic:** MSA, simple vocabulary; use "let's/we" forms and nouns to avoid gendered imperatives (FR-44).

| Situation | English | Arabic |
|---|---|---|
| Correct | "Correct! Great thinking!" | "إجابة صحيحة! تفكير رائع!" |
| Try again | "Not quite — let's try again!" | "ليس تمامًا — لنحاول مرة أخرى!" |
| Hint offer | "Want a hint?" | "هل نجرّب تلميحًا؟" |
| Worked example | "Let's solve it together." | "هيا نحلّها معًا." |
| Start practice | "Let's practise!" | "هيا نتدرّب!" |
| Locked Skill | "Get 2 stars on the skill before to open this!" | "لنجمع نجمتين في المهارة السابقة لنفتح هذه!" |
| Leave activity | "Leave now? Your Seeds are saved." | "هل نخرج الآن؟ بذورنا محفوظة." |
| Break reminder | "Time for a stretch break!" | "حان وقت استراحة قصيرة!" |
| Trophy | "You earned a trophy!" | "حصلنا على كأس جديدة!" |

All final copy lives in the message catalogues and is reviewed by native-speaker educators.

---

## 11. Motion

### 11.1 Tokens

| Token | Duration | Use |
|---|---|---|
| `--motion-instant` | 100 ms | Press feedback |
| `--motion-quick` | 160 ms | Hover, toggles, focus |
| `--motion-base` | 240 ms | Panels, banners, page transitions |
| `--motion-gentle` | 400 ms | Hints, manipulative moves, Fanak expressions |
| `--motion-celebrate` | 800–1200 ms | Correct-answer burst, Trophy, Oasis growth |

Easing: `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`; `--ease-out: cubic-bezier(0, 0, 0.2, 1)`; spring (stiffness 300, damping 20) for success bounces.

### 11.2 Rules

1. Motion explains (objects moving into a group, a rod breaking into ten units) or rewards (short celebration). No idle animation loops on activity screens other than Fanak's subtle blink.
2. Correct-answer celebrations ≤ 1.2 s and never block input for more than 600 ms.
3. Try-again motion: a single gentle wobble (≤ 2 cycles, ≤ 4 px). No shaking screens.
4. Directional motion follows reading direction (slides from inline-end) and Math Direction for math objects.
5. Nothing flashes more than 3 times per second; confetti is soft, slow, and limited to ≤ 40 particles.
6. **Reduced motion** (`prefers-reduced-motion: reduce` or calm mode): replace movement with ≤ 150 ms opacity cross-fades; no confetti, parallax, or bouncing; Oasis growth shows the final state with a fade; manipulatives snap into place.
7. Page transitions: 240 ms fade + 8 px slide from inline-end; disabled in reduced motion.

---

## 12. Sound

- **Narration:** clear, warm MSA or English voice; 0.9× natural pace for Stage 1; every narrated line has on-screen text.
- **SFX:** soft chime (correct), gentle "boop" (try again — never a buzzer), pop (Bubble Pop), whoosh (page), sparkle (Seeds), fanfare ≤ 2 s (Trophy).
- **Music:** optional calm loop on Home and Games only; off by default; never during Lessons or Practice.
- Independent toggles for narration, SFX, and music (FR-32); audio never autoplays before the first user interaction.
- Loudness normalised (−16 LUFS narration, SFX 3 dB quieter).

---

## 13. Accessibility checklist (design)

- [ ] Every text/background pair uses approved tokens (≥ 4.5:1; ≥ 3:1 large text and graphics).
- [ ] Targets meet §5.2 sizes and spacing.
- [ ] State never shown by colour alone (icon + text).
- [ ] Focus order matches visual order in both directions; focus ring visible.
- [ ] Every screen has one clear heading and a logical heading order.
- [ ] Drag interactions have tap/keyboard alternatives.
- [ ] All images have alt text or are marked decorative; manipulatives have live text summaries.
- [ ] Reduced-motion variant designed for every animation.
- [ ] Layouts verified at 200 % text size and 360 px width in both languages.
- [ ] Arabic screens reviewed by a native reader for line height, diacritics, and mirroring.

---

## 14. Design deliverables and handoff

- Figma (or equivalent) library mirroring token and component names exactly.
- Every screen designed in **English and Arabic**, compact and expanded, with Western and Eastern Arabic digit variants for math screens.
- Redlines for RTL-specific placements (Exit button, Skill Path start, answer-area side).
- Exported assets: SVG icons (directional ones flagged), Lottie files ≤ 150 KB each with static fallback frames, WebP/AVIF illustrations at 1× and 2×.
