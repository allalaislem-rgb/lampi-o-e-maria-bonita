"""Cut the client's art pack v7 and pre-bake backgrounds for performance.

Usage: python3 tools/art/cut_v7.py   (then python3 tools/art/pack.py)

Sources (art/source/):
  in_6.webp   base-game village background (from pack v6)
  in_11.webp  Lampião draw / aim / fire animation, 8×3 frames (partial alpha; dark glass behind bullet holes)
  in_12.webp  Maria Bonita draw / aim / fire animation, 8×3 frames on black
  in_13.webp  three bonus backgrounds: Great Escape (top-left), Hideout cave (top-right), Last Stand (bottom)
  in_14.webp  treasure chest open (8) + treasure fill (8) animation, 15-frame coin spin, 6 sparkles (alpha)
  in_15.webp  reel frame on black

Backgrounds are written pre-graded with a pre-blurred low-res fill, so the game needs no
full-screen runtime filters (the main cause of lag).
"""
import os
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'art', 'render')
GFX = os.path.join(ROOT, 'public', 'gfx')
for d in (OUT, GFX):
    os.makedirs(d, exist_ok=True)


def src(n):
    return Image.open(os.path.join(SRC, n))


def save_png(name, im):
    im.save(os.path.join(OUT, name + '.png'), optimize=True)


def save_webp(name, im, q=86):
    (im if im.mode == 'RGBA' else im.convert('RGB')).save(os.path.join(GFX, name + '.webp'), 'WEBP', quality=q, method=6)


def key_dark(rgba, flood=True, thr=34, sat=16, min_blob=400):
    """Make near-black, low-saturation background transparent (flood from border + large dark blobs)."""
    a = np.asarray(rgba.convert('RGBA')).astype(np.float32)
    mx, mn = a[..., :3].max(2), a[..., :3].min(2)
    dark = (mx < thr) & ((mx - mn) < sat)
    lab, n = nd.label(dark)
    bg = np.zeros_like(dark)
    if flood:
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg |= np.isin(lab, list(border))
    if min_blob:
        sizes = nd.sum(dark, lab, range(1, n + 1))
        bg |= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > min_blob])
    # soft, luminance-weighted edge so glows / smoke fade instead of cutting
    soft = np.clip((mx - thr * 0.4) / (thr * 1.6), 0, 1)
    alpha = np.where(bg, 0.0, 1.0)
    edge = nd.binary_dilation(bg, iterations=2) & ~bg
    alpha = np.where(edge, np.minimum(1.0, soft + 0.15), alpha)
    alpha = nd.gaussian_filter(alpha, 0.6)
    alpha = np.minimum(alpha, a[..., 3] / 255.0)
    out = a.copy()
    out[..., 3] = alpha * 255
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def trim_common(frames, thr=10, pad=2):
    boxes = [f.getchannel('A').point(lambda v: 255 if v > thr else 0).getbbox() for f in frames]
    boxes = [b for b in boxes if b]
    x0 = max(0, min(b[0] for b in boxes) - pad)
    y0 = max(0, min(b[1] for b in boxes) - pad)
    x1 = max(b[2] for b in boxes) + pad
    y1 = max(b[3] for b in boxes) + pad
    return [f.crop((x0, y0, x1, y1)) for f in frames]


def grid(im, cols, rows, box=None):
    if box:
        im = im.crop(box)
    W, H = im.size
    cw, ch = W / cols, H / rows
    return [im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))) for r in range(rows) for c in range(cols)]


# ====================================================================== characters
def characters():
    # Lampião: already partly transparent – remove the dark grey glass/smoke patches behind bullet holes
    lamp = [key_dark(f, flood=True, thr=52, sat=12, min_blob=0) for f in grid(src('in_11.webp').convert('RGBA'), 8, 3)]
    maria = [key_dark(f, flood=True, thr=38, sat=15, min_blob=0) for f in grid(src('in_12.webp').convert('RGBA'), 8, 3)]
    # cell borders: clear 2 px around each cell (thin grid lines in the sheet)
    def clean(f):
        a = np.asarray(f).copy()
        a[:3, :, 3] = 0; a[-3:, :, 3] = 0; a[:, :3, 3] = 0; a[:, -3:, 3] = 0
        return Image.fromarray(a, 'RGBA')
    lamp = trim_common([clean(f) for f in lamp])
    maria = trim_common([clean(f) for f in maria])
    for i, f in enumerate(lamp):
        save_png(f'lampa_{i}', f)
    for i, f in enumerate(maria):
        save_png(f'mariaa_{i}', f)
    print('characters', len(lamp), lamp[0].size, len(maria), maria[0].size)


# ====================================================================== chest
def isolate(cell):
    """Keep only this cell's chest (largest blob) plus coins / sparkles near it; drop any slice of the
    neighbouring chest that leaks in from the left or right edge of the grid cell."""
    a = np.asarray(cell).copy()
    fg = a[..., 3] > 20
    lab, n = nd.label(nd.binary_dilation(fg, iterations=1))
    if n == 0:
        return cell
    sizes = nd.sum(fg, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    W = a.shape[1]
    keep = np.zeros(fg.shape, bool)
    for i in range(1, n + 1):
        comp = lab == i
        xs = np.nonzero(comp.any(0))[0]
        touches_side = xs[0] <= 1 or xs[-1] >= W - 2
        if i == main or (not touches_side and sizes[i - 1] < sizes.max() * 0.25):
            keep |= comp
    # the main blob itself may have absorbed a neighbour sliver joined at the very edge: cut a 6px side margin
    margin = np.zeros(fg.shape, bool)
    margin[:, :6] = True
    margin[:, -6:] = True
    keep &= ~margin
    a[..., 3] = np.where(nd.binary_dilation(keep, iterations=2), a[..., 3], 0)
    return Image.fromarray(a, 'RGBA')

def chest():
    im = src('in_14.webp').convert('RGBA')
    W = im.width
    row1 = grid(im, 8, 1, (0, 0, W, 250))
    row2 = grid(im, 8, 1, (0, 250, W, 540))
    frames = trim_common([isolate(f) for f in row1 + row2])
    for i, f in enumerate(frames):
        save_png(f'chesta_{i}', f)
    # coins + sparkles: segment the bottom strip by alpha columns
    strip = im.crop((0, 545, W, im.height))
    a = np.asarray(strip)[..., 3] > 25
    xs = np.nonzero(a.sum(0) > 1)[0]
    segs, st, pv = [], xs[0], xs[0]
    for x in xs[1:]:
        if x - pv > 3:
            segs.append((st, pv))
            st = x
        pv = x
    segs.append((st, pv))
    parts = [strip.crop((x0 - 2, 0, x1 + 3, strip.height)) for x0, x1 in segs]
    parts = [p.crop(p.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()) for p in parts]
    coins, sparks = parts[:15], parts[15:]
    for i, p in enumerate(coins):
        save_png(f'coinb_{i}', p)
    for i, p in enumerate(sparks):
        save_png(f'sparkb_{i}', p)
    print('chest', len(frames), frames[0].size, 'coins', len(coins), 'sparks', len(sparks))


# ====================================================================== backgrounds (pre-graded, pre-blurred)
def grade(im, theme):
    im = im.convert('RGB')
    if theme == 'base':
        im = ImageEnhance.Brightness(im).enhance(0.92)
    elif theme == 'laststand':
        im = ImageEnhance.Brightness(im).enhance(0.92)
    elif theme == 'hideout':
        im = ImageEnhance.Brightness(im).enhance(0.9)
    return im


def backgrounds():
    """Client full-screen 16:9 backgrounds (pack v8) → 1920×1080, plus a tiny blurred fill."""
    panels = {'base': 'in_19.webp', 'escape': 'in_17.webp', 'hideout': 'in_16.webp', 'laststand': 'in_18.webp'}
    for theme, f in panels.items():
        g = grade(src(f), theme).resize((1920, 1080), Image.LANCZOS)
        if src(f).width < 1920:
            g = g.filter(ImageFilter.UnsharpMask(1.6, 50, 2))
        save_webp(f'bgv_{theme}', g, 84)
        fill = g.resize((192, 108), Image.LANCZOS).filter(ImageFilter.GaussianBlur(4))
        save_webp(f'bgv_{theme}_fill', ImageEnhance.Brightness(fill).enhance(0.8), 80)
        print('bg', theme, g.size)


# ====================================================================== frame
def frame():
    im = src('in_15.webp').convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    mx, mn = a[..., :3].max(2), a[..., :3].min(2)
    dark = (mx < 26) & ((mx - mn) < 14)
    lab, _ = nd.label(dark)
    H, W = dark.shape
    seeds = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) | {lab[H // 2, W // 2]}
    seeds -= {0}
    bg = np.isin(lab, list(seeds))
    alpha = np.where(bg, 0.0, 1.0)
    edge = nd.binary_dilation(bg, iterations=2) & ~bg
    soft = np.clip((mx - 10) / 50, 0, 1)
    alpha = np.where(edge, np.maximum(0.0, soft), alpha)
    alpha = nd.gaussian_filter(alpha, 0.6)
    a[..., 3] = alpha * 255
    save_webp('frame_painted', Image.fromarray(a.astype(np.uint8), 'RGBA'), 90)
    print('frame', im.size)


if __name__ == '__main__':
    characters()
    chest()
    backgrounds()
    frame()
