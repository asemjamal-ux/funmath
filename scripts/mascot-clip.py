"""
Turns a flat-backdrop clip (a folder of PNG frames) into a small looping animated WebP with transparency
(decisions 007, 008): Fanak's greeting and the World landmarks.

  python scripts/mascot-clip.py <frames-dir> <out.webp> [size=320] [fps=16] [box=x0,y0,x1,y1 | auto] [unused] [step=1]

The clips come from a local ComfyUI (Wan 2.2 image-to-video) and start and end on the same picture, so they loop.
The backdrop colour is read from the first frame's border, as in cutout-art.py. Needs Pillow and numpy.
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dest = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 320
fps = float(sys.argv[4]) if len(sys.argv) > 4 else 16
box = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 and sys.argv[5] != 'auto' else None
# Keep every n-th frame (and slow the frame rate to match) for small clips.
step = int(sys.argv[7]) if len(sys.argv) > 7 else 1


def backdrop(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    band = np.concatenate([a[:16].reshape(-1, 3), a[-16:].reshape(-1, 3), a[:, :16].reshape(-1, 3), a[:, -16:].reshape(-1, 3)])
    return np.median(band, axis=0)


def cut(path, bgc):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    alpha = np.clip((np.sqrt(((a - bgc) ** 2).sum(axis=2)) - 38) / (90 - 38), 0, 1)
    # Drop specks away from the subject: keep what touches a generous blur of the solid shape.
    solid = Image.fromarray(((alpha > 0.5) * 255).astype(np.uint8))
    body = solid.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(21))
    alpha = np.where(np.asarray(body) > 0, alpha, 0)
    # Take the backdrop's colour out of the soft edges: observed = alpha * colour + (1 - alpha) * backdrop.
    soft = (alpha > 0.05) & (alpha < 0.999)
    fg = (a - (1 - alpha[..., None]) * bgc) / np.maximum(alpha[..., None], 0.05)
    a = np.where(soft[..., None], fg, a)
    return Image.fromarray(np.dstack([a, alpha[..., None] * 255]).clip(0, 255).astype(np.uint8), 'RGBA')


names = sorted(f for f in os.listdir(src) if f.endswith('.png'))
bgc = backdrop(os.path.join(src, names[0]))
frames = [cut(os.path.join(src, n), bgc) for n in names]
# The last frame repeats the first one; leaving it out keeps the loop even.
frames = frames[:-1]
if box is None:
    # One square around everything that moves across the whole clip, with a little air.
    alpha = np.max([np.asarray(f)[..., 3] for f in frames], axis=0)
    ys, xs = np.nonzero(alpha > 12)
    side = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.06)
    cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
    box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
frames = [f.crop(box) for f in frames]
frames = [f.resize((size, size), Image.LANCZOS) for f in frames[::step]]
fps = fps / step
frames[0].save(dest, 'WEBP', save_all=True, append_images=frames[1:], duration=round(1000 / fps), loop=0, quality=50, method=4, minimize_size=True)
print(dest, len(frames), 'frames', os.path.getsize(dest) // 1024, 'KB')
