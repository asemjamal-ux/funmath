# 007 — Fanak as a rendered, animated picture

Status: Accepted (requested by the product owner on 2026-11-17). Adds to the visual direction of decisions 002 and
006; replaces the drawn mascot of DS §8.6.

The product owner asked for a more modern, more attractive Fanak, made with the ComfyUI installed on their PC.

- **What changed:** `Mascot` now shows a rendered picture of Fanak (a soft 3D-cartoon fennec fox with the coral scarf)
  instead of the inline SVG drawing. There is one picture per expression: happy, thinking, cheer, curious, calm.
  Every screen that showed Fanak shows the new one; the component's props and class names are unchanged.
- **How the pictures were made:** on the owner's machine with ComfyUI and the Qwen-Image 2.1 model already installed
  there. The happy picture was generated from a text prompt on a flat green background; the other four are edits of
  that picture ("keep the same character, change only the expression"), so it is the same fox in all five. The
  animation frames are edits too: a blink for the three expressions with open eyes, and a paw wave for the happy one.
  `scripts/cutout-mascot.py` removes the green, keeps only what really changed in an animation frame (the eyes, the
  paw) so nothing else shimmers, crops everything to the same box and writes one transparent WebP strip of 384 px
  frames per expression to `src/assets/fanak/` (16–42 KB each, 131 KB in all). Nothing is fetched from another host
  at runtime (N-01).
- **Motion on activity screens, in CSS (`scenery.css`):** the `<img>` shows one frame of its strip and
  `object-position` steps to the blink frame every few seconds: the one idle motion DS §11.2 allows in activities.
- **Motion where Fanak greets the learner (Home, welcome, profile picker):** a three-second looping clip in which he
  blinks, wiggles his ears and waves a paw (`Mascot`'s `lively` prop). The clip was made on the owner's machine with
  Wan 2.2 image-to-video (Q4_K_M GGUF with the 4-step Lightning LoRAs), using the happy picture as both first and
  last frame so it loops without a jump. `scripts/mascot-clip.py` keys out the green and writes a transparent
  animated WebP (`happy-clip.webp`, 48 frames at 304 px, 474 KB). It loads after the page, like any image.
  Tapping Fanak on Home still makes him jump and cheer.
- **Calm mode and `prefers-reduced-motion`:** no clip, no blink, no bob: the still picture is shown.
- **Rules kept:** the pictures hold no text; Fanak never looks sad or angry (DS §2); decorative unless a label is
  passed (`alt=""`, `aria-hidden`). The pictures are precached by the service worker, so Fanak appears offline.
- **NFR-01:** the SVG drawing leaves the startup JavaScript: Arabic Home is back to 199.4 KB of 200 KB.
- **To review:** the pictures were checked by eye for this change. A designer or the owner should confirm the five
  expressions before launch, as with any generated artwork.
