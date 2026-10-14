# Number Oasis — Product Requirements

| | |
|---|---|
| **Product** | Number Oasis (Arabic: واحة الأرقام) — a bilingual math-learning website for children |
| **Document** | `product-requirements.md` (v1.0, Draft) |
| **Date** | 14 October 2026 |
| **Companion documents** | `website-architecture.md` · `design-system.md` · `agent-instructions.md` |
| **Owns** | Vision, scope, terminology, learning model, features, requirements, metrics |

> **Source-of-truth rule.** This document is authoritative for *what* is built: terminology, skill catalogue, learning rules, rewards, and MVP scope. `website-architecture.md` owns *how the system is structured*, `design-system.md` owns *how it looks and moves*, and `agent-instructions.md` owns *how it is implemented and accepted*. If documents conflict, this one wins on scope and behaviour; raise the conflict rather than guessing.

---

## 1. Product vision

Number Oasis helps children aged 6–12 build confident, flexible understanding of **addition, subtraction, multiplication, and division** through short visual lessons, adaptive practice, and calm, playful games — in **English or Arabic**, with each language feeling native rather than translated.

The learner tends a growing desert **Oasis** guided by **Fanak** (فَنَك), a friendly fennec fox. Every lesson, practice set, and game helps the Oasis grow. Progress rewards effort and understanding, never speed alone, and there is nothing to lose: no lives, no streak penalties, no leaderboards.

**Vision statement:** *Every child leaves each session understanding a little more and wanting to come back — without the product ever asking for more of their personal information or attention than it needs.*

### Product principles

1. **Understanding before speed.** Lessons use concrete models (counters, ten-frames, base-ten blocks, number lines, arrays, sharing plates) before abstract facts.
2. **Supportive, never punishing.** Mistakes trigger hints and worked examples, not red crosses or lost points.
3. **Bilingual by design.** English (LTR) and Arabic (RTL) are equal first-class experiences.
4. **Private by default.** No child accounts, no ads, no trackers, no chat, no real names required.
5. **Accessible to every learner.** WCAG 2.2 AA, audio support for early readers, no time pressure by default.
6. **Mathematically exact.** Every generated question is valid, solvable, and age-appropriate — guaranteed by automated tests.

---

## 2. Assumptions

These fill in details not specified in the brief. Each can be revised; IDs are referenced from the other documents.

| ID | Assumption | Impact if wrong |
|---|---|---|
| A-01 | Target learners are **ages 6–12** (roughly Grades 1–6). | Skill catalogue and stage mapping change. |
| A-02 | Primary market is **Saudi Arabia and the wider Gulf**, with English-speaking families as a second audience. Default Arabic variant is **Modern Standard Arabic (MSA)**, locale `ar-SA`; English is `en`. | Copy tone, digits, and calendar defaults. |
| A-03 | Devices are **shared family tablets and phones** first, laptops second. Touch is the primary input; keyboard and mouse are fully supported. | Layout and target sizes. |
| A-04 | The MVP is a **local-first Progressive Web App** with no learner accounts and no server-side storage of child data. | Architecture; cross-device sync is a Future enhancement. |
| A-05 | The product is **free, with no ads and no in-app purchases** in MVP. | Monetisation is out of scope. |
| A-06 | Arabic learners in Saudi primary schools commonly read **Eastern Arabic digits (٠١٢٣٤٥٦٧٨٩)** and write horizontal equations **right-to-left**. These are the Arabic defaults, switchable by a grown-up. **Must be validated with Saudi primary teachers before content production** (see OQ-01). | Default number style and math direction. |
| A-07 | Curriculum alignment is **broadly consistent** with common Grade 1–6 sequences (including Saudi and international curricula) but is not certified against any one curriculum in MVP. | Marketing claims; skill order. |
| A-08 | Instruction and lesson narration audio is **professionally recorded** in English and Arabic (no runtime text-to-speech in MVP). | Audio budget and production timeline. |
| A-09 | One device holds **up to 6 learner profiles**. | Profile picker layout, storage. |
| A-10 | Legal review will confirm compliance obligations (e.g., Saudi PDPL, COPPA, GDPR/UK Age-Appropriate Design Code) before public launch. | Privacy and consent flows. |
| A-11 | The site will later be packaged as an **Android app** from the same PWA (Trusted Web Activity), which must meet Google Play Families policy. | Child-safety constraints apply from day one. |

---

## 3. Target users

### 3.1 Learners (primary)

| Stage | Typical age | Reading level | Design implications |
|---|---|---|---|
| **Stage 1** | 6–7 | Emerging reader | Audio for every instruction, ≤ 8 words per instruction, 3 answer choices, visuals always shown, numbers ≤ 20. |
| **Stage 2** | 7–8 | Developing reader | Audio available, numbers ≤ 100, introduction to equal groups. |
| **Stage 3** | 8–9 | Independent reader | Numbers ≤ 1,000, times tables and division facts. |
| **Stage 4** | 9–10 | Fluent reader | Multi-digit operations, remainders. |
| **Stage 5** | 10–12 | Fluent reader | Extension work (largely Future). |

**Personas**

- **Layan, 6, Stage 1 (Arabic).** Recognises numbers to 20, reads slowly. Needs audio, big buttons, and lots of encouragement. Plays on her mother's phone.
- **Omar, 9, Stage 3 (Arabic/English).** Knows ×2, ×5, ×10 but avoids ×7 and ×8. Gets frustrated by timers. Likes collecting things.
- **Mia, 8, Stage 2 (English).** Comfortable adding to 20, unsure about regrouping. Uses a family laptop with a keyboard.

### 3.2 Grown-ups (secondary)

Parents, guardians, or older siblings who set up profiles, choose a starting stage and language settings, and check progress.

- **Noura, parent of Layan and Omar.** Wants to see what each child struggles with, set a session-length reminder, and trust that nothing is collected about her children.

### 3.3 Out of scope for MVP

Teachers and classrooms (Future, see §15), children under 6, and learners needing fractions, decimals, or negative numbers.

---

## 4. Goals and non-goals

### Goals

| ID | Goal |
|---|---|
| G-01 | Learners gain measurable fluency and understanding across the four operations. |
| G-02 | Learners voluntarily return for short, healthy sessions (about 10–20 minutes). |
| G-03 | Both English and Arabic experiences are complete, correct, and natural. |
| G-04 | Grown-ups can understand progress at a glance and control settings. |
| G-05 | The product meets children's privacy and accessibility expectations. |

### Non-goals (MVP)

- Competitive features (leaderboards, multiplayer, public profiles).
- Social features of any kind (chat, sharing, friends, user-generated content).
- Grading or certification; replacement of school instruction.
- Monetisation, advertising, or third-party content.

---

## 5. Glossary (canonical terms)

All four documents use these terms exactly. UI strings come from the localisation catalogues; the Arabic terms below are the approved translations.

| Term | Arabic | Definition |
|---|---|---|
| **Operation** | العملية | One of Addition (الجمع), Subtraction (الطرح), Multiplication (الضرب), Division (القسمة). |
| **World** | عالَم | The area of the app for one Operation, e.g. "Addition World" (عالم الجمع). Contains a Skill Path. |
| **Skill Path** | مسار المهارات | The ordered sequence of Skills inside a World. |
| **Skill** | مهارة | A single learning objective with an ID (e.g. `ADD-04`). Has one Lesson, Practice, and supports Games. |
| **Stage** | المرحلة | Age/grade band 1–5 used to group Skills and set a starting point. |
| **Tier** | المستوى | Difficulty level 1–3 within a Skill, adjusted adaptively. |
| **Lesson** | درس | A short guided explanation (3–5 minutes) with interactive "guided tries". |
| **Practice Set** | جولة تدريب | 8 items (Stage 1) or 10 items (Stages 2+) of adaptive questions for one Skill. |
| **Daily Mix** | مراجعة اليوم | A 10-item mixed review across unlocked Skills, weighted to weak and due-for-review Skills. |
| **Game** | لعبة | A playful activity using the same question engine, e.g. Bubble Pop. |
| **Item** | سؤال | One question presented to the learner. |
| **First-try correct** | صحيح من المحاولة الأولى | Answered correctly on the first attempt without using a hint. |
| **Hint** | تلميح | Help shown on request or after a first wrong attempt. |
| **Worked Example** | مثال محلول | A step-by-step visual solution shown after a second wrong attempt. |
| **Stars** | نجوم | Per-Skill progress indicator, 0–3. Never decrease. |
| **Mastered** | متقَن | A Skill with 3 Stars. |
| **Seeds** | بذور | Reward points earned from activities; grow the Oasis. Never decrease. |
| **Oasis** | الواحة | The learner's home-screen scene that grows through 10 Oasis Stages as Seeds accumulate. |
| **Trophy** | كأس | An achievement for a milestone, shown in the Trophy Room (قاعة الكؤوس). |
| **Learner Profile** | ملف المتعلم | A local, nickname-based profile for one child. |
| **Grown-ups Area** | ركن الكبار | Gated area for settings, profiles, progress reports, and data controls. |
| **Grown-up Gate** | بوابة الكبار | A challenge (and optional PIN) that keeps children out of the Grown-ups Area. |
| **Number Style** | شكل الأرقام | Digit set: Eastern Arabic (٠–٩) or Western (0–9). |
| **Math Direction** | اتجاه كتابة المسائل | Visual order of equations and number lines: right-to-left or left-to-right. |
| **Fanak** | فَنَك | The fennec-fox mascot and guide. |

---

## 6. Learning model

### 6.1 Structure

```
Operation (4) → World → Skill Path → Skill (ID) → { Lesson, Practice Sets (Tiers 1–3), Games, Daily Mix items }
```

### 6.2 Skill catalogue

Each Skill has a stable ID used in content files, data, analytics, and tests. **MVP** = in launch scope. **Future** = later release (see §15).

#### Addition (الجمع)

| ID | Skill | Stage | Number range & constraints | Key models / strategies | Scope |
|---|---|---|---|---|---|
| ADD-01 | Adding within 5 | 1 | Sums ≤ 5, addends ≥ 0 | Counters, "put together" | MVP |
| ADD-02 | Adding within 10 | 1 | Sums ≤ 10 | Ten-frame, counting on | MVP |
| ADD-03 | Making 10 (number bonds) | 1 | Pairs summing to 10; missing addend | Ten-frame, bonds | MVP |
| ADD-04 | Adding within 20 | 1 | Sums ≤ 20, includes bridging 10 | Make-ten strategy, number line | MVP |
| ADD-05 | Adding 2-digit numbers, no regrouping | 2 | Sums ≤ 99, ones digits sum ≤ 9 | Base-ten blocks, place value | MVP |
| ADD-06 | Adding 2-digit numbers with regrouping | 2 | Sums ≤ 100, ones digits sum ≥ 10 (Tier 3) | Trade 10 ones for 1 ten; column method | MVP |
| ADD-07 | Adding 3-digit numbers | 3 | Sums ≤ 1,000, regrouping in ones and/or tens | Column method | MVP |
| ADD-08 | Adding 4-digit numbers | 4 | Sums ≤ 10,000 | Column method, estimation check | Future |

#### Subtraction (الطرح)

| ID | Skill | Stage | Number range & constraints | Key models / strategies | Scope |
|---|---|---|---|---|---|
| SUB-01 | Taking away within 5 | 1 | Minuend ≤ 5, result ≥ 0 | Counters, "take away" | MVP |
| SUB-02 | Subtracting within 10 | 1 | Minuend ≤ 10 | Ten-frame, counting back | MVP |
| SUB-03 | Fact families and missing numbers within 10 | 1 | `a + ? = c`, `c − ? = a`, all ≤ 10 | Part–part–whole, "think addition" | MVP |
| SUB-04 | Subtracting within 20 | 1 | Minuend ≤ 20, includes bridging 10 | Back-through-ten, number line | MVP |
| SUB-05 | Subtracting 2-digit numbers, no regrouping | 2 | Each ones digit of minuend ≥ subtrahend's | Base-ten blocks | MVP |
| SUB-06 | Subtracting 2-digit numbers with regrouping | 2 | Ones digit of minuend < subtrahend's (Tier 3) | Trade 1 ten for 10 ones; column method | MVP |
| SUB-07 | Subtracting 3-digit numbers | 3 | Minuend ≤ 999, includes regrouping across zero at Tier 3 (e.g. 302 − 158) | Column method | MVP |
| SUB-08 | Subtracting 4-digit numbers | 4 | Minuend ≤ 9,999 | Column method, check with addition | Future |

#### Multiplication (الضرب)

| ID | Skill | Stage | Number range & constraints | Key models / strategies | Scope |
|---|---|---|---|---|---|
| MUL-01 | Equal groups and repeated addition | 2 | 2–5 groups of 2–5 | Groups of objects, skip counting | MVP |
| MUL-02 | Arrays and the order of factors | 2 | Arrays up to 5 × 5 | Arrays, commutativity (3 × 4 = 4 × 3) | MVP |
| MUL-03 | Facts: ×0, ×1, ×2, ×5, ×10 | 3 | Factors 0–10 | Zero and one rules, doubling, skip counting | MVP |
| MUL-04 | Facts: ×3, ×4 | 3 | Factors 0–10 | Double-double (×4), skip counting | MVP |
| MUL-05 | Facts: ×6, ×7 | 3 | Factors 0–10 | ×6 = ×5 + one more group; known facts | MVP |
| MUL-06 | Facts: ×8, ×9 | 3 | Factors 0–10 | ×8 = double ×4; ×9 = ×10 − one group | MVP |
| MUL-07 | Multiplying by multiples of 10 | 4 | e.g. 3 × 40, 6 × 300 (products ≤ 9,000) | Place value | Future |
| MUL-08 | 2-digit × 1-digit | 4 | e.g. 34 × 6 | Area model, partial products | Future |

#### Division (القسمة)

| ID | Skill | Stage | Number range & constraints | Key models / strategies | Scope |
|---|---|---|---|---|---|
| DIV-01 | Fair sharing | 2 | Dividend ≤ 20, divisor 2–5, exact | Sharing plates | MVP |
| DIV-02 | Grouping and linking to multiplication | 3 | Dividend ≤ 30, divisor 2–5, exact | Grouping, fact families | MVP |
| DIV-03 | Facts: ÷1, ÷2, ÷5, ÷10 | 3 | Quotient 0–10, exact | Inverse of ×; 0 ÷ n = 0 | MVP |
| DIV-04 | Facts: ÷3, ÷4 | 3 | Quotient 0–10, exact | Think multiplication | MVP |
| DIV-05 | Facts: ÷6, ÷7 | 3 | Quotient 0–10, exact | Think multiplication | MVP |
| DIV-06 | Facts: ÷8, ÷9 | 3 | Quotient 0–10, exact | Think multiplication | MVP |
| DIV-07 | Division with remainders | 4 | Dividend ≤ 100, divisor 2–9, remainder < divisor | Leftovers on sharing plates | Future |
| DIV-08 | 2- and 3-digit ÷ 1-digit | 4 | Dividend ≤ 999, exact at Tier 1–2 | Partial quotients; locale-specific long-division notation | Future |

**MVP totals:** 26 Skills (ADD-01–07, SUB-01–07, MUL-01–06, DIV-01–06). **Future:** 6 listed Skills plus Stage 5 extensions (e.g. 2-digit × 2-digit, 4-digit ÷ 1-digit).

### 6.3 Tiers (adaptive difficulty within a Skill)

Each Skill defines three Tiers in its generator configuration. Example for **ADD-04 (Adding within 20)**:

| Tier | Constraint | Example |
|---|---|---|
| 1 | One addend ≤ 5, no bridging 10 | 12 + 3 |
| 2 | Bridging 10 with one addend ≤ 5 | 8 + 5 |
| 3 | Any sum ≤ 20 incl. bridging with both addends 6–9 | 7 + 9 |

Example for **MUL-05 (×6, ×7)**: Tier 1 = factor pairs with the other factor 0–5; Tier 2 = other factor 0–10 in order (6 × 1, 6 × 2 …); Tier 3 = mixed order, both ×6 and ×7, including commuted forms (8 × 7).

### 6.4 Item formats

| Format | Description | Used in |
|---|---|---|
| Multiple choice | 3 options (Stage 1) or 4 options (Stage 2+) | All Stages |
| Number entry | On-screen Number Pad or keyboard | Stage 1 Tier 3 onward |
| Column entry | Vertical problem, digit-by-digit entry starting at the ones column | ADD-06/07, SUB-06/07 |
| Missing number | Blank in any position (`? + 4 = 9`) | ADD-03, SUB-03, MUL/DIV fact families |
| Drag to build | Drag counters into a ten-frame, onto plates, or into an array | Lessons, Stage 1–2 practice |
| Number line tap | Tap the landing point after a jump | ADD/SUB Stage 1–2, Number Line Hop game |
| True or false | Is `6 × 4 = 24` true? | Stage 3 review |

### 6.5 Mathematical accuracy rules (mandatory)

These rules are enforced by automated property-based tests (see `agent-instructions.md` §8).

1. All operands, answers, and distractors are **non-negative integers** in MVP.
2. **Subtraction:** result ≥ 0 always. "No regrouping" Skills never require regrouping in any column; "with regrouping" Tier 3 items always require at least one regroup.
3. **Division:** divisor is **never 0**. Dividend may be 0 only in DIV-03 and later (0 ÷ n = 0). MVP division is **always exact**; remainders appear only in DIV-07 (Future), where `0 ≤ remainder < divisor`.
4. **Multiplication facts** span factors 0–10. ×0 and ×1 items appear at most twice per Practice Set to avoid trivial sets.
5. Every item has **exactly one correct answer** and the checker accepts only that integer (and, for DIV-07, the exact quotient/remainder pair).
6. **Distractors** are unique, non-negative, different from the answer, within the Skill's plausible range, and drawn from common error patterns: off-by-one, wrong operation (e.g. 7 + 3 offered for 7 × 3), place-value slip (forgot to regroup), adjacent fact (6 × 7 vs 6 × 8). At most one distractor may be "off by one".
7. No two consecutive items in a set are identical, and no item repeats within a set except a deliberate re-queue after a Worked Example (which uses a *similar*, not identical, item).
8. Number ranges in the catalogue are hard limits; generators must never exceed them.
9. Story contexts (e.g. "5 dates shared among 5 plates") use culturally neutral, friendly objects and never produce non-sensical quantities (no "2.5 children").

### 6.6 Feedback, hints, and Worked Examples

| Event | Behaviour |
|---|---|
| First-try correct | Short celebration (≤ 1.2 s), positive phrase, Seeds awarded, next item. |
| First wrong attempt | Gentle message ("Not quite — let's try again!" / "ليس تمامًا — لنحاول مرة أخرى!"), Hint level 1 shown automatically, learner retries. The wrong choice is greyed out (multiple choice). |
| Second wrong attempt | Worked Example with the Skill's visual model; learner taps "Got it". Item is recorded as incorrect. A similar item is re-queued later in the set (max set length 12 items). |
| Hint requested | Hint level 1 (strategy prompt, e.g. "Make 10 first"); a second tap shows Hint level 2 (partial visual). Using a hint means the item is not first-try correct, but correct answers still earn Seeds. |
| Never | Red crosses, buzzer sounds, "Wrong!", lost Seeds, or lost Stars. |

### 6.7 Adaptivity (within a Practice Set)

- A set starts at the learner's **current Tier** for that Skill (Tier 1 for new Skills).
- **Step up** one Tier after **3 consecutive first-try correct** items.
- **Step down** one Tier after **2 consecutive incorrect** items (an item is incorrect after two wrong attempts).
- The learner's current Tier for a Skill is saved at the end of each set as the Tier most recently in use.
- Speed is recorded but **never** affects Tier, Stars, or Seeds in MVP.

### 6.8 Stars and mastery

| Stars | Status (shown to learner) | Rule |
|---|---|---|
| 0 | New (جديدة) | Skill unlocked, not started. |
| 1 | Learning (أتعلّمها) | Lesson completed with ≥ 1 guided try correct. |
| 2 | Strong (قوية) | One Practice Set with **≥ 80 % first-try correct** where at least half the items were Tier 2 or higher. |
| 3 | Mastered (متقَنة) | Two Practice Sets with **≥ 90 % first-try correct** at Tier 3, completed on **two different calendar days** (device local date). |

- **Stars never decrease.** Mastered Skills become **"due for review"** 7 days after mastery, then 21 days, then 60 days. Due Skills are prioritised in the Daily Mix and show a small, friendly "review" leaf on the Skill node — never a warning.
- A learner may practise a Skill at any Star level.

### 6.9 Unlocking and starting points

- **Addition** and **Subtraction** Worlds are open from the start.
- **Multiplication** World unlocks when **ADD-05 reaches 2 Stars**, or when the profile's starting Stage is 2 or higher.
- **Division** World unlocks when **MUL-02 reaches 2 Stars**, or when the starting Stage is 3 or higher.
- Within a World, the next Skill unlocks when the previous Skill reaches **2 Stars**.
- When a grown-up creates a profile they choose a **starting Stage**. All Skills in earlier Stages are unlocked (with 0 Stars), as is the first Skill of the chosen Stage in each open World.
- Grown-ups can **unlock all Skills** for a profile in the Grown-ups Area.
- Locked Skills show their name and a padlock with "Get 2 stars on the skill before to open this!" — never a shaming message.

### 6.10 Daily Mix

- 10 items drawn from unlocked Skills with ≥ 1 Star.
- Weighting: 40 % Skills due for review, 40 % Skills at 1–2 Stars with the lowest recent accuracy, 20 % random other unlocked Skills.
- Items use each Skill's current Tier. Daily Mix results count toward accuracy statistics but **not** toward the Star 2/3 rules (which need focused Practice Sets).
- Available any time; a bonus of +5 Seeds applies to the first Daily Mix completed each calendar day.

---

## 7. Rewards and Trophies

### 7.1 Seeds and the Oasis

| Activity | Seeds |
|---|---|
| Lesson completed | +5 |
| Practice Set or Game item answered correctly (any attempt) | +1 per item |
| Practice Set or Game round completed | +3 |
| First Daily Mix of the day completed | +5 bonus |

- Seeds never decrease and cannot be bought or spent in MVP.
- The **Oasis** grows through **10 Oasis Stages** at cumulative Seed thresholds: 0, 25, 75, 150, 300, 500, 800, 1,200, 1,700, 2,500. Each stage adds visual elements (sprouting grass, the first palm tree, a pond, birds, a tent, lanterns, and so on).
- **Future:** spend Seeds on Oasis decorations (cosmetic only, never purchasable with money).

### 7.2 Trophies (MVP set)

| ID | Trophy (EN) | Arabic | Earned when |
|---|---|---|---|
| TR-01 | First Steps | الخطوة الأولى | First Lesson completed |
| TR-02 | Brave Try | محاولة شجاعة | First item answered correctly after a hint |
| TR-03 | Never Give Up | لا أستسلم | 10 items answered correctly after a hint (cumulative) |
| TR-04 | Shining Star | نجمة لامعة | First Skill reaches 3 Stars |
| TR-05 | Practice Pro | بطل التدريب | 10 Practice Sets completed |
| TR-06 | Addition Explorer | مستكشف الجمع | All MVP Addition Skills at ≥ 2 Stars |
| TR-07 | Subtraction Explorer | مستكشف الطرح | All MVP Subtraction Skills at ≥ 2 Stars |
| TR-08 | Multiplication Explorer | مستكشف الضرب | All MVP Multiplication Skills at ≥ 2 Stars |
| TR-09 | Division Explorer | مستكشف القسمة | All MVP Division Skills at ≥ 2 Stars |
| TR-10 | Ten Friends | أصدقاء العشرة | ADD-03 Mastered |
| TR-11 | Regrouping Ranger | بطل إعادة التجميع | ADD-06 and SUB-06 Mastered |
| TR-12 | Times Table Champion | بطل جدول الضرب | MUL-03 to MUL-06 Mastered |
| TR-13 | Sharing Expert | خبير المشاركة | DIV-01 Mastered |
| TR-14 | Game Explorer | مستكشف الألعاب | Played all 3 MVP Games |
| TR-15 | Daily Mixer | صديق المراجعة | 5 Daily Mix sessions completed |
| TR-16 | Practice Days | أيام التدريب | Practised on 5 different days (not necessarily consecutive) |
| TR-17 | Oasis Grower | مُنمّي الواحة | Reached Oasis Stage 5 |
| TR-18 | Master of the Oasis | سيد الواحة | All 26 MVP Skills Mastered |

Trophy design rules: achievable through effort; no Trophy depends on speed, consecutive-day streaks, or comparison with other children. Locked Trophies are shown as silhouettes with a short hint about how to earn them.

---

## 8. Core features

| ID | Feature | Summary | Scope |
|---|---|---|---|
| F-01 | First run and language choice | Bilingual welcome; choose English or العربية; grown-up creates the first profile. | MVP |
| F-02 | Learner Profiles | Up to 6 local profiles: nickname, avatar, starting Stage. No real names, photos, birthdays, or emails. | MVP |
| F-03 | Learner Home and Oasis | Oasis scene, Fanak greeting, four World entry cards, Daily Mix, Trophy Room, My Progress. | MVP |
| F-04 | Worlds and Skill Paths | Path of Skill nodes with Stars, lock state, and review leaf. | MVP |
| F-05 | Lessons | 3–5 min, 4–7 steps: Hook → Model → Guided tries → Key idea → Ready to practise. Narrated. | MVP |
| F-06 | Practice | Adaptive Practice Sets (§6.7) with hints and Worked Examples. | MVP |
| F-07 | Daily Mix | Mixed spaced review (§6.10). | MVP |
| F-08 | Games | Bubble Pop, Number Line Hop, Match Pairs (§9). | MVP |
| F-09 | Seeds and Oasis growth | §7.1. | MVP |
| F-10 | Trophies and Trophy Room | §7.2. | MVP |
| F-11 | My Progress (learner view) | Child-friendly view of Stars per World and Trophies; no percentages. | MVP |
| F-12 | Grown-ups Area | Gate, progress report, profile management, settings, data export/import/delete, privacy information. | MVP |
| F-13 | Audio | Narration of instructions and Lesson steps, sound effects, music; independent toggles. | MVP |
| F-14 | Offline support | Installable PWA; all MVP content works offline after first load. | MVP |
| F-15 | Localization | English (LTR) and Arabic (RTL), Number Style and Math Direction settings, locale formatting. | MVP |
| F-16 | Break reminders | Optional gentle reminder after a grown-up-set duration (default 20 min). | MVP |
| F-17 | Anonymous usage statistics | Opt-in (off by default) aggregate event counts with no identifiers. | MVP (Should) |

---

## 9. Games (MVP)

All Games take a Skill ID, use the same question engine and accuracy rules as Practice, are **untimed by default**, and award Seeds. Game results count toward accuracy statistics but not toward Star 2/3 rules.

| Game | Arabic | Mechanic | Skills supported | Round |
|---|---|---|---|---|
| **Bubble Pop** | فقاعات الأرقام | A question appears; answer bubbles float slowly upward; tap the correct one. Wrong taps make the bubble wobble and drift aside (no penalty). | All MVP Skills except column-entry formats | 8 items |
| **Number Line Hop** | قفزات خط الأعداد | Fanak hops along a number line. Learner taps where Fanak lands (addition/subtraction) or how many equal hops (multiplication/division). | ADD-01–06, SUB-01–06, MUL-01–04, DIV-01–04 | 6 items |
| **Match Pairs** | مطابقة الأزواج | Flip cards to match an expression with its answer (e.g. `6 × 3` ↔ `18`). | All MVP Skills | 6 pairs |

**Future games:** Fact Race (timed, enabled only by a grown-up), Array Builder, Treasure Path (board-style review), cooperative two-player mode on one device.

---

## 10. User stories

Acceptance criteria for each story are in `agent-instructions.md` §13.

### Learner

| ID | Story | Feature |
|---|---|---|
| US-01 | As a learner, I want to pick my avatar from the profile screen so I can start playing without typing. | F-02 |
| US-02 | As an early reader, I want to hear instructions read aloud so I can play without help. | F-13 |
| US-03 | As a learner, I want short lessons with pictures so I understand *why* an answer is right. | F-05 |
| US-04 | As a learner, I want practice that gets a bit harder when I'm doing well and easier when I'm stuck. | F-06 |
| US-05 | As a learner, I want a hint when I'm stuck instead of being told I'm wrong. | F-06 |
| US-06 | As a learner, I want to see my Oasis grow so I feel my effort matters. | F-09 |
| US-07 | As a learner, I want to earn Trophies and see which ones I can earn next. | F-10 |
| US-08 | As a learner, I want to play games with the skills I'm learning. | F-08 |
| US-09 | As a learner, I want to switch between Arabic and English and keep my place. | F-15 |
| US-10 | As a learner, I want to see which skills I've mastered. | F-11 |
| US-11 | As a learner who uses a keyboard or screen reader, I want to do every activity without a mouse or touch. | F-05–F-08 |

### Grown-up

| ID | Story | Feature |
|---|---|---|
| US-20 | As a grown-up, I want to create a profile for each child with a starting Stage. | F-02, F-12 |
| US-21 | As a grown-up, I want to see each child's Stars, recent accuracy, and skills that need help. | F-12 |
| US-22 | As a grown-up, I want to choose Number Style and Math Direction for Arabic. | F-15 |
| US-23 | As a grown-up, I want to set a break reminder and turn sounds on or off. | F-13, F-16 |
| US-24 | As a grown-up, I want to back up, restore, or delete a child's data. | F-12 |
| US-25 | As a grown-up, I want assurance that my child cannot leave the app to external sites or contact strangers. | §12 |
| US-26 | As a grown-up, I want to unlock all skills for an advanced child. | F-12 |

---

## 11. Functional requirements

Priority: **M** = Must (MVP), **S** = Should (MVP if time allows), **F** = Future.

### 11.1 First run, language, profiles

| ID | Requirement | Pri |
|---|---|---|
| FR-01 | On first visit, show a bilingual welcome with two equally sized buttons: "English" and "العربية". If a saved preference exists, skip to the profile picker in that language. | M |
| FR-02 | First profile creation requires passing the Grown-up Gate. | M |
| FR-03 | A profile stores: nickname (chosen from a generated list such as "Brave Falcon / صقر شجاع", or typed, max 12 characters), avatar (one of 12 illustrated animals), starting Stage (1–5), and preferences. No other personal data. | M |
| FR-04 | When a nickname is typed, show the note "Use a nickname, not your full name." Nicknames are never transmitted off the device. | M |
| FR-05 | Up to 6 profiles per device; the profile picker shows avatar and nickname only. | M |
| FR-06 | Profiles can be renamed, have their avatar changed, or be deleted in the Grown-ups Area (deletion requires confirmation). | M |

### 11.2 Learning

| ID | Requirement | Pri |
|---|---|---|
| FR-10 | Learner Home shows the Oasis, four World cards (with lock state), Daily Mix, Trophy Room, My Progress, and the language switch. | M |
| FR-11 | Each World shows its Skill Path with Stars, lock state, and review leaves per §6.8–6.9. | M |
| FR-12 | Selecting a Skill opens the Skill page with "Lesson", "Practice", and "Play a Game" options. Practice is available before the Lesson is done, but Fanak recommends the Lesson first if Stars = 0. | M |
| FR-13 | Lessons follow the 5-part structure in F-05, include 2–3 guided tries with immediate feedback, and can be replayed. | M |
| FR-14 | Practice Sets follow §6.4–6.8 exactly. | M |
| FR-15 | The learner can exit any activity at any time; partial Practice Sets are discarded for Star calculation but answered items still count toward Seeds and statistics. A confirmation asks "Leave now? Your Seeds are saved." | M |
| FR-16 | Daily Mix follows §6.10. | M |
| FR-17 | Three Games per §9. | M |
| FR-18 | Item generation and answer checking follow §6.5. | M |
| FR-19 | Placement check ("Find my starting point") to suggest a Stage. | F |

### 11.3 Rewards

| ID | Requirement | Pri |
|---|---|---|
| FR-20 | Award Seeds per §7.1 and update the Oasis per Oasis Stage thresholds with a short growth animation when a new stage is reached. | M |
| FR-21 | Award Trophies per §7.2 immediately when earned, with a celebration dialog that can be dismissed in one tap. | M |
| FR-22 | Trophy Room shows earned Trophies (with date earned in the grown-up report only) and locked silhouettes with hints. | M |
| FR-23 | Awards are idempotent: re-running the evaluation never duplicates a Trophy or Seeds. | M |

### 11.4 Grown-ups Area

| ID | Requirement | Pri |
|---|---|---|
| FR-30 | Entry requires the Grown-up Gate: press-and-hold for 2 seconds, then enter three digits whose names are shown as words in the current language (e.g. "seven, two, nine" / "سبعة، اثنان، تسعة"). Grown-ups may set an optional 4-digit PIN instead. | M |
| FR-31 | Progress report per profile: Stars per Skill, first-try accuracy per Skill over the last 30 days, Skills needing help (accuracy < 60 % over ≥ 10 items), time spent this week, Trophies with dates. | M |
| FR-32 | Settings per profile: language, Number Style, Math Direction (Arabic), narration on/off, sound effects on/off, music on/off, break reminder (off/10/15/20/30/45 min), calm mode (reduced animation), unlock all Skills. | M |
| FR-33 | Device settings: calendar for dates (Gregorian default; Umm al-Qura Hijri optional in Arabic), Grown-up PIN, anonymous statistics opt-in. | M |
| FR-34 | Export a profile's data as a JSON backup file; import a backup; delete one profile; delete all data on the device. | M |
| FR-35 | Plain-language privacy information in both languages. | M |
| FR-36 | External links (feedback email, privacy policy page) exist only inside the Grown-ups Area. | M |
| FR-37 | Optional parent account with cloud sync across devices. | F |

### 11.5 Localization

| ID | Requirement | Pri |
|---|---|---|
| FR-40 | All UI text, Lesson content, audio, and images containing text are available in English and Arabic. | M |
| FR-41 | Arabic renders with `dir="rtl"`, mirrored layout, Arabic typography, and Arabic plural rules (six plural categories). | M |
| FR-42 | Numbers render with the profile's Number Style; Math Direction controls equation order and number-line orientation (see `website-architecture.md` §9). | M |
| FR-43 | Switching language at any time preserves the current screen and in-progress activity state. | M |
| FR-44 | Arabic learner-facing copy avoids gendered second-person forms by using "let's/we" phrasing and nouns (e.g. "هيا نجمع!" not "اجمع!"). | M |
| FR-45 | Stage 1–2 Arabic Lesson text includes full diacritics (tashkeel) for key words; UI labels do not. | S |

---

## 12. Child safety and privacy

| ID | Requirement |
|---|---|
| CS-01 | **No accounts for children.** Profiles are local to the device. |
| CS-02 | **Data minimisation.** Collect only nickname, avatar, starting Stage, settings, and learning activity. Never collect real name, birthday, age, gender, school, photos, voice, location, contacts, or email from or about the child. |
| CS-03 | **No ads, no in-app purchases, no third-party trackers, no third-party SDKs that collect data**, no fingerprinting, no cookies other than strictly necessary (none needed in MVP). |
| CS-04 | **No communication features:** no chat, comments, sharing, or user-generated content visible to others. |
| CS-05 | **No external navigation from the child area.** All external links sit behind the Grown-up Gate. |
| CS-06 | **No device permissions** requested (camera, microphone, location, notifications) in MVP. |
| CS-07 | **No manipulative design:** no loss aversion, no streak penalties, no countdowns to rewards, no randomised loot rewards, no "come back or lose" messages, no autoplay of the next activity without a learner action. |
| CS-08 | **Healthy session length:** optional break reminders; no endless feeds. |
| CS-09 | Child-facing content is reviewed by an educator for each language; stories avoid violence, scary content, brands, and stereotypes. |
| CS-10 | Optional anonymous statistics (F-17) are off by default, enabled only by a grown-up, and send only aggregate event counts (e.g. "practice_set_completed, ADD-04, tier 2, locale ar") without device IDs, profile IDs, nicknames, timestamps finer than the day, or stored IP addresses. |
| CS-11 | The grown-up can delete all data at any time; deletion is immediate and complete on the device. |
| CS-12 | Legal review (A-10) and Google Play Families policy review (A-11) occur before public launch. |

> **Note on the Grown-up Gate:** it is a deterrent, not a security control. Older children may be able to pass it; the optional PIN gives stronger protection. Because no sensitive data is stored, the residual risk is low.

---

## 13. Accessibility

| ID | Requirement |
|---|---|
| AX-01 | Conform to **WCAG 2.2 Level AA** in both languages. |
| AX-02 | All activities are operable by **touch, mouse, and keyboard**; drag interactions have a tap/keyboard alternative (select item, then select destination). |
| AX-03 | Screen-reader support (VoiceOver, TalkBack, NVDA) with localised accessible names; math expressions have spoken labels such as "7 plus 5 equals what?" / "سبعة زائد خمسة يساوي كم؟". |
| AX-04 | **No time limits by default.** Any timed feature (Future Fact Race) is opt-in by a grown-up and can be extended or paused. |
| AX-05 | Touch targets ≥ 48 × 48 CSS px everywhere; answer choices and Number Pad keys ≥ 64 × 64 px (≥ 80 × 80 px for Stage 1), per `design-system.md` §5.2. |
| AX-06 | Information is never conveyed by colour alone (correctness, Operation, lock state all use icon + text). |
| AX-07 | Respect `prefers-reduced-motion` and offer an in-app **calm mode**; nothing flashes more than 3 times per second. |
| AX-08 | Narration audio has on-screen text equivalents; sound is never required to complete an activity. |
| AX-09 | Text resizes to 200 % without loss of content or function. |
| AX-10 | Plain language: Stage 1 instructions ≤ 8 words; Stage 2–3 ≤ 15 words. |

---

## 14. Nonfunctional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | Largest Contentful Paint ≤ 2.5 s and Interaction to Next Paint ≤ 200 ms on a mid-range Android phone over 4G (lab-tested). Initial JavaScript ≤ 200 KB gzipped. |
| NFR-02 | Offline | After first load, all MVP Skills, Lessons, Games, and the active locale's audio work offline. |
| NFR-03 | Browser support | Latest 2 versions of Chrome, Edge, Firefox, Samsung Internet; Safari/iOS 16+. |
| NFR-04 | Devices | Works from 360 px wide phones to desktop; portrait and landscape; optimised for tablets. |
| NFR-05 | Reliability | Progress is saved after every item; no progress is lost on reload, crash, or language switch. Request persistent storage where supported. |
| NFR-06 | Security | Strict Content Security Policy; HTTPS only; no inline scripts; dependencies audited. |
| NFR-07 | Maintainability | Skills, Lessons, Trophies, and strings are data files, editable without code changes. |
| NFR-08 | Correctness | Math generators pass property-based tests (≥ 10,000 generated items per Skill per Tier) with zero violations of §6.5. |
| NFR-09 | Localization quality | 100 % key parity between `en` and `ar` catalogues; native-speaker educator review for all Arabic content. |
| NFR-10 | Privacy | No network requests to third-party domains at runtime. |

---

## 15. MVP scope and future enhancements

### 15.1 MVP (launch)

- 26 Skills across four Operations (§6.2), each with a narrated Lesson and adaptive Practice.
- Daily Mix, three Games, Seeds with 10 Oasis Stages, 18 Trophies, My Progress.
- Up to 6 local profiles; Grown-ups Area with report, settings, backup/restore/delete.
- English and Arabic with RTL, Number Style, Math Direction, locale number/date formatting.
- Installable, offline-capable PWA; WCAG 2.2 AA.
- Opt-in anonymous statistics (Should).

### 15.2 Future enhancements (not in MVP)

| Area | Enhancement |
|---|---|
| Content | ADD-08, SUB-08, MUL-07–08, DIV-07–08; Stage 5 extensions; word problems with dynamic read-aloud. |
| Learning | Placement check; mistake-pattern diagnostics in the report; printable worksheets. |
| Games | Fact Race (opt-in timed), Array Builder, Treasure Path, two-player on one device. |
| Rewards | Spend Seeds on cosmetic Oasis decorations; seasonal Oasis themes. |
| Accounts | Optional grown-up account with encrypted cloud sync; teacher/classroom dashboards (separate consent model). |
| Platforms | Android app via Trusted Web Activity on Google Play (Families policy); iOS wrapper. |
| Accessibility | High-contrast theme; dyslexia-friendly font option; switch-access testing. |
| Localization | Additional locales; Arabic dialect narration option. |

---

## 16. Success metrics

Metrics are measured through moderated usability studies, content QA, automated tests, and — only where a grown-up has opted in — aggregate anonymous counts.

| Area | Metric | MVP target |
|---|---|---|
| Learning | Learners completing ≥ 3 Practice Sets in a Skill who reach 2 Stars in it | ≥ 60 % |
| Learning | Change in first-try accuracy between a learner's 1st and 4th Practice Set on the same Skill (study cohort) | +15 percentage points median |
| Engagement | Opted-in active devices returning the following week | ≥ 40 % |
| Healthy use | Median session length | 10–20 min; < 5 % of sessions > 45 min |
| Usability | Children (n ≥ 8 per language per Stage band) who start a Lesson unaided in moderated tests | ≥ 85 % |
| Usability | Grown-ups who can find a child's "needs help" Skills in < 60 s | ≥ 90 % |
| Accessibility | Serious/critical axe-core violations | 0 |
| Correctness | Known math errors in shipped content/generators | 0 |
| Localization | Untranslated strings; RTL layout defects at launch | 0 |
| Performance | NFR-01 budgets met in CI | 100 % of builds |

---

## 17. Risks and open questions

| ID | Item | Mitigation / owner |
|---|---|---|
| OQ-01 | Confirm Saudi classroom conventions: digit style, equation direction, number-line orientation, operator placement in column problems, and long-division notation. | Interview ≥ 3 Saudi primary teachers before Lesson content production; implementation supports both directions (Product). |
| OQ-02 | Narration voice: one MSA voice for all Stages, or a younger-sounding voice for Stage 1? | Test both with Stage 1 learners (Design). |
| OQ-03 | Should Daily Mix contribute to mastery for very confident learners? | Revisit after MVP data (Product). |
| R-01 | Local-only storage can be lost if a browser clears site data. | Persistent-storage request, backup export, clear guidance in Grown-ups Area. |
| R-02 | Arabic content quality and consistency. | Glossary (§5), native educator review, string-length testing. |
| R-03 | Over-gamification distracting from learning. | Rewards tied to effort and mastery; celebrations short; calm mode. |
| R-04 | Grown-up Gate bypassed by older children. | Optional PIN; low data sensitivity. |
