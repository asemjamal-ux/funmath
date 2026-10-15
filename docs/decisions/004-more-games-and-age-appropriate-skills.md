# 004 — More games, and age-appropriate skills

Status: Accepted (requested by the product owner on 2026-10-15). Product sign-off noted on the PRD items below.

## Age-appropriate skills (changes PRD §6.9 behaviour)
A learner who starts at a higher Stage goes straight to their own skills: skills from earlier Stages are **hidden**
(not just unlocked) on Home, World paths, Daily Mix, the games skill picker and My Progress.
- Rule: show skills with `stage ≥ min(startingStage, top MVP Stage)`. Stage 4–5 profiles see Stage 3 skills because
  Stages 4–5 have no MVP skills yet. `visibleSkills()` in `src/domain/adaptivity/unlock.ts`.
- As a child grows, a grown-up raises the starting Stage in Grown-ups → Profiles; the learner screens update at once.
- Grown-ups can bring the basics back per learner with Settings → "Show skills from earlier stages" (default off,
  stored as `prefs.showEarlierSkills`; older profiles and backups without it read as off).
- Stars and progress on hidden skills are kept; the grown-up report and worksheets still list every skill.
- Trophies only count visible skills, so they stay earnable: "Explorer"/"Master" rules use the visible part of
  their skill list, and a trophy whose skills are all hidden (e.g. "Ten Friends" for a Stage 3 starter) can't be
  earned rather than being handed out.

## Three more games (extends PRD §9, which lists three MVP games)
Adapted from the Fun with Multiplication site to Number Oasis rules — untimed, no lives, wrong taps cost nothing:
- **Bingo** — 3 × 3 card with a free centre star; find each called answer; three in a row wins. Its card mixes
  Tiers so small Skills still fill 8 distinct answers. (The original's 5 × 5 card, decoy calls and timer are dropped.)
- **Number Hunt** — tap every tile that makes the target (2–4 per target, 4 targets). The original's countdown is
  dropped.
- **True or False** — PRD §6.4's true/false format: is the shown equation right? A wrong pick shows the real answer.
All three are available for every MVP Skill and use the Practice generators. The "Game Explorer" trophy still needs
any 3 different games.
