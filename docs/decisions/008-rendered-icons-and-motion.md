# 008 — Rendered icons and gentle motion

Status: Accepted (requested by the product owner on 2026-11-17). Follows decision 007 (the rendered, animated Fanak)
and replaces the drawn landmarks of decision 006 and the emoji avatars.

The product owner asked for the other icons to get the same treatment as Fanak: modern rendered pictures that move.

## What changed
- **World landmarks** (Well, Market, Palm Grove, Picnic, Cake, Measuring Jug, Tiled Courtyard): rendered pictures in
  Fanak's 3D-cartoon style replace the flat SVG drawings on Home's World cards, the World banner and the Skill page.
- **Game icons** (Bubble Pop, Number Line Hop, Match Pairs, Bingo, Number Hunt, True or False): rendered pictures
  replace the line icons on the Games page.
- **Avatars:** the twelve animals are rendered portraits instead of emoji, so they look the same on every device.
  The ids, their order and the accessible names are unchanged, so existing profiles keep their animal.
- **Motion, all in CSS (`scenery.css`):** landmark stickers sway out of step with each other, game pictures float
  and wiggle when pointed at, a picked avatar pops, earned trophies float and twinkle. The World banner's landmark
  plays a short looping clip (below). None of this is on the activity screens (lessons, practice, games in play),
  where DS §11.2 allows only Fanak's blink. Calm mode and `prefers-reduced-motion` stop all of it.

## How the pictures were made
On the owner's machine with ComfyUI: Qwen-Image 2.1 for the pictures (each on a flat green backdrop, or magenta for
subjects that are green themselves), and Wan 2.2 image-to-video for the landmark clips, the picture being the first
and last frame so the clip loops. `scripts/cutout-art.py` keys out the backdrop and writes transparent WebP files to
`src/assets/world/`, `src/assets/games/` and `src/assets/avatars/`; `scripts/mascot-clip.py` does the same for clips.
Avatars and game pictures are found by file name, so redrawing one is a file change only.

## Size
- Pictures: about 6–20 KB each (landmarks 256 px, game pictures and avatars 192 px). Landmark clips: 24 frames at
  168 px, 110–240 KB each, 1.2 MB for all seven; a World page loads only its own. Fanak's clip (decision 007) is
  474 KB. All of it is precached by the service worker so the app still works offline: the precache is now about
  3.4 MB, up from about 1.5 MB. If first-visit data use becomes a concern, the clips can move to a runtime cache.
- NFR-01: the picture lookups add a little startup JavaScript. Arabic Home is at 199.9 KB of 200 KB, so the next
  change that adds startup code must take something out.
- The landmark pictures are set as `background-image` in each rule rather than through a custom property: a `url()`
  inside a custom property resolves against the page address, not the stylesheet.

## Rules kept
No text in the pictures (DS §2); pictures are not mirrored in RTL (DS §6.3); all decorative, with the accessible
names unchanged (avatars keep `role="img"` and their label); served from this site only (N-01) and precached for
offline use. CSS takes colours from tokens only; the picture files carry their own.

## To review
The pictures were checked by eye for this change. A designer or the owner should confirm them before launch, as with
any generated artwork.
