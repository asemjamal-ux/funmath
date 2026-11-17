"""
Cuts Fanak out of green-screen renders and writes a small transparent WebP sprite (decision 007).

  python scripts/cutout-mascot.py <out.webp> <size> <box|auto> <frame1.png> [frame2.png ...]

The renders come from a local ComfyUI (Qwen-Image 2.1) on a flat green background. Needs Pillow and numpy.
Frames are laid side by side: frame 1 is the picture, the others are its animation frames (a blink, a wave).
An animation frame keeps only what really changed from frame 1 (the eyes, the paw), so nothing else shimmers when
the frames alternate. All expressions use the same box, so Fanak does not jump when the expression changes.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

dest, size, box_arg, frames = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4:]


def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(np.float32)


def only_changes(base, frame):
    """The frame where it differs clearly from the base (feathered), the base everywhere else."""
    diff = np.abs(frame - base).max(axis=2)
    mask = Image.fromarray(((diff > 36) * 255).astype(np.uint8))
    # Drop single-pixel noise, then grow and feather the changed area.
    mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(8))
    m = (np.asarray(mask).astype(np.float32) / 255)[..., None]
    return base * (1 - m) + frame * m


def cut(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # How much greener than anything else a pixel is: high on the backdrop, low or negative on fur, scarf and eyes.
    green = g - np.maximum(r, b)
    alpha = 1 - np.clip((green - 18) / (55 - 18), 0, 1)

    # Keep only the character: the largest opaque blob (drops stray specks and the soft ground shadow).
    solid = alpha > 0.5
    labels = np.zeros(solid.shape, dtype=np.int32)
    best, best_count, current = 0, 0, 0
    h, w = solid.shape
    for y0 in range(0, h, 8):
        for x0 in range(0, w, 8):
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
            if count > best_count:
                best, best_count = current, count
    keep = np.asarray(Image.fromarray(((labels == best) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    alpha = np.where(keep, alpha, 0)

    # Take the green cast off the soft edge pixels.
    g = g - np.clip(g - np.maximum(r, b), 0, None) * (alpha < 0.999)
    return Image.fromarray(np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')


base = load(frames[0])
cuts = [cut(base)] + [cut(only_changes(base, load(f))) for f in frames[1:]]

if box_arg == 'auto':
    alpha = np.max([np.asarray(c)[..., 3] for c in cuts], axis=0)
    ys, xs = np.nonzero(alpha > 12)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    side = int(max(x1 - x0, y1 - y0) * 1.06)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
else:
    box = tuple(int(v) for v in box_arg.split(','))
print('box=' + ','.join(str(v) for v in box))

sheet = Image.new('RGBA', (size * len(cuts), size), (0, 0, 0, 0))
for i, c in enumerate(cuts):
    sheet.paste(c.crop(box).resize((size, size), Image.LANCZOS), (i * size, 0))
sheet.save(dest, 'WEBP', quality=84, method=6)
print(dest, sheet.size)
