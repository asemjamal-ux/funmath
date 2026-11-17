"""
Cuts an icon picture (World landmark, game icon, avatar) out of a flat-colour render and writes a small
transparent WebP (decision 008).

  python scripts/cutout-art.py <render.png> <out.webp> <size> [portrait]

The renders come from a local ComfyUI (Qwen-Image 2.1) on a flat backdrop: green, or magenta for subjects that are
green themselves (palms, turtle, parrot). The backdrop colour is read from the picture's border, so the key works
whatever shade the model painted. `portrait` crops to head and shoulders (avatars). Needs Pillow and numpy.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dest, size = sys.argv[1], sys.argv[2], int(sys.argv[3])
portrait = len(sys.argv) > 4 and sys.argv[4] == 'portrait'

a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
# The backdrop: the median colour of a band around the border.
band = np.concatenate([a[:24].reshape(-1, 3), a[-24:].reshape(-1, 3), a[:, :24].reshape(-1, 3), a[:, -24:].reshape(-1, 3)])
bgc = np.median(band, axis=0)
dist = np.sqrt(((a - bgc) ** 2).sum(axis=2))
alpha = np.clip((dist - 38) / (90 - 38), 0, 1)

# Keep every sizeable part (several bubbles, a sparkle) and drop specks: parts of at least 1 % of the largest.
solid = np.asarray(Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
h, w = solid.shape
labels = np.zeros((h, w), dtype=np.int32)
sizes = {}
current = 0
for y0 in range(0, h, 4):
    for x0 in range(0, w, 4):
        if not solid[y0, x0] or labels[y0, x0]:
            continue
        current += 1
        stack = [(y0, x0)]
        labels[y0, x0] = current
        count = 0
        while stack:
            y, x = stack.pop()
            count += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = current
                    stack.append((ny, nx))
        sizes[current] = count
biggest = max(sizes.values())
kept = [k for k, c in sizes.items() if c >= biggest * 0.01]
keep = np.isin(labels, kept)
keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
alpha = np.where(keep, alpha, 0)

# Take the backdrop's colour out of the soft edges: observed = alpha * colour + (1 - alpha) * backdrop.
soft = (alpha > 0.05) & (alpha < 0.999)
fg = (a - (1 - alpha[..., None]) * bgc) / np.maximum(alpha[..., None], 0.05)
a = np.where(soft[..., None], fg, a)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

out = Image.fromarray(np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
ys, xs = np.nonzero(alpha > 0.05)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
if portrait:
    # Head and shoulders: a square as wide as the animal, from just above the top of its head.
    side = int((x1 - x0) * 1.04)
    cx = (x0 + x1) // 2
    top = y0 - int(side * 0.04)
    box = (cx - side // 2, top, cx - side // 2 + side, top + side)
else:
    side = int(max(x1 - x0, y1 - y0) * 1.06)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
out = out.crop(box).resize((size, size), Image.LANCZOS)
out.save(dest, 'WEBP', quality=84, method=6)
print(dest, out.size)
