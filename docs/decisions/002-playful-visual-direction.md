# 002 — Playful "sticker-book" visual direction

Status: Accepted (requested by the product owner on 2026-10-15) · Supersedes the colour values in design-system.md §3.

The product owner found the first UI too calm for children and pointed to funmultiplication.netlify.app as the
target feel. The redesign keeps the Oasis/Fanak theme and every DS token **name**, and changes the look:

- **Palette:** ink `#2B2140` for text and outlines, sand `#FFF4DE` with a two-colour dot pattern, and bright stickers:
  sun `#FFD23F`, coral `#FF6B6B`, teal `#4ECDC4`, lime `#8FD96C`, grape `#B08CFF`, tangerine `#FF9F1C`, pink `#FF7EB6`,
  sky `#4D9DE0`. Operations: addition = sky, subtraction = pink, multiplication = tangerine, division = grape.
- **Contrast rule:** text on a bright fill is always ink (≥ 4.5:1 on every fill). White text appears only on the
  Grown-ups danger button. Red still never appears in learner feedback (try-again is sun yellow).
- **Shape:** 3 px ink outlines and hard offset shadows (`--shadow-sticker`), mirrored in RTL via `--dir-sign`.
  Pressing a button slides it into its shadow; cards and world stickers sit at ±1° tilts.
- **Type:** Fredoka for English display text (self-hosted via @fontsource); Arabic keeps Baloo Bhaijaan 2.
- **Play:** on Home, number tiles float around the Oasis and spin when tapped, and Fanak jumps and cheers when tapped.
  No scoring and no timers. Everything stops under calm mode / `prefers-reduced-motion`.
- **Implementation:** a theme layer, `src/styles/playful.css`, loaded last. It restyles existing classes so markup and
  test selectors are unchanged.
