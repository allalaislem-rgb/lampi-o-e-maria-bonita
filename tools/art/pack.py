"""Pack rendered art into texture atlases (Pixi/TexturePacker JSON-hash format)
and export large standalone images as WebP.

Usage: python3 tools/art/pack.py
Input : art/render/*.png|jpg   (from tools/art/render.mjs)
Output: public/gfx/*.webp, public/gfx/*.json
"""
import json
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'art', 'render')
OUT = os.path.join(ROOT, 'public', 'gfx')
os.makedirs(OUT, exist_ok=True)

SYMBOLS = ['sym_lampiao', 'sym_maria', 'sym_wild', 'sym_wanted', 'sym_map', 'sym_emblem', 'sym_hat', 'sym_cartucheira',
           'sym_revolver', 'sym_sanfona', 'sym_rifles', 'sym_facao', 'sym_cactus', 'sym_cantil']
OBJECTS = ['chest_closed', 'chest_open', 'chest_treasure', 'chest_empty', 'coin', 'coin_blank', 'mult_2', 'mult_3', 'mult_5',
           'mult_10', 'token_mult', 'coins_pile', 'emblem_sun', 'medallion', 'gold_star', 'heart_gem', 'lantern', 'scarf', 'rider',
           'plate_wide', 'plate_mid', 'plate_meter', 'ls_cell',
           'fx_glow', 'fx_dot', 'fx_spark', 'fx_ring', 'fx_streak', 'fx_rays', 'fx_dust1', 'fx_dust2', 'fx_ember', 'fx_flare',
           'fx_shine', 'fx_smoke']
STANDALONE = {  # name: (max width, quality)
    'logo': (1400, 90), 'title_escape': (840, 90), 'title_hideout': (840, 90), 'title_last': (840, 90),
    'win_big': (1080, 90), 'win_mega': (1080, 90), 'win_epic': (1080, 90),
    'frame_base': (1792, 90), 'frame_hideout': (1792, 90), 'frame_last': (1792, 90),
}
for scene in ['base', 'escape', 'hideout', 'laststand']:
    STANDALONE[f'bg_{scene}_back'] = (1920, 84)
    STANDALONE[f'bg_{scene}_mid'] = (1920, 86)
    STANDALONE[f'bg_{scene}_front'] = (1920, 86)


def load(name):
    for ext in ('png', 'jpg'):
        p = os.path.join(SRC, f'{name}.{ext}')
        if os.path.exists(p):
            return Image.open(p).convert('RGBA')
    raise FileNotFoundError(name)


def motion_blur(im):
    """Vertical motion-blur variant for spinning reels (half resolution)."""
    small = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    pad = 24
    canvas = Image.new('RGBA', (small.width, small.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(small, (0, pad))
    acc = None
    steps = 15
    for i in range(steps):
        off = int((i - steps // 2) * 2.2)
        layer = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        layer.paste(canvas, (0, off))
        acc = layer if acc is None else Image.blend(acc, layer, 1 / (i + 1))
    return acc.crop((0, pad, small.width, small.height + pad)).filter(ImageFilter.GaussianBlur(0.6))


def pack(name, items, max_w=2048, pad=3):
    items = sorted(items, key=lambda kv: -kv[1].height)
    x = y = row_h = 0
    places = {}
    for key, im in items:
        if x + im.width + pad > max_w:
            x = 0
            y += row_h + pad
            row_h = 0
        places[key] = (x, y)
        x += im.width + pad
        row_h = max(row_h, im.height)
    h = y + row_h
    H = 1
    while H < h:
        H *= 2
    sheet = Image.new('RGBA', (max_w, H), (0, 0, 0, 0))
    frames = {}
    for key, im in items:
        px, py = places[key]
        sheet.paste(im, (px, py))
        frames[key] = {'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                       'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
    sheet.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=92, method=6)
    meta = {'frames': frames, 'meta': {'app': 'lmb-art-pack', 'image': f'{name}.webp', 'format': 'RGBA8888', 'size': {'w': max_w, 'h': H}, 'scale': '1'}}
    with open(os.path.join(OUT, f'{name}.json'), 'w') as f:
        json.dump(meta, f)
    print(f'{name}: {len(items)} frames -> {max_w}x{H}')


def main():
    syms = []
    for n in SYMBOLS:
        im = load(n)
        syms.append((n, im))
        syms.append((n + '_blur', motion_blur(im)))
    pack('symbols', syms, max_w=4096)
    pack('objects', [(n, load(n)) for n in OBJECTS], max_w=2048)
    for n, (mw, q) in STANDALONE.items():
        im = load(n)
        if im.width > mw:
            im = im.resize((mw, round(im.height * mw / im.width)), Image.LANCZOS)
        if n.endswith('_back'):
            im.convert('RGB').save(os.path.join(OUT, f'{n}.webp'), 'WEBP', quality=q, method=6)
        else:
            im.save(os.path.join(OUT, f'{n}.webp'), 'WEBP', quality=q, method=6)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'standalone: {len(STANDALONE)}  total gfx size: {total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
