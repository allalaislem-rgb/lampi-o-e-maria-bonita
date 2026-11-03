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
# painted sheet cuts (tools/art/cut_sheet.py) + remaining code-drawn objects (tools/art/objects.mjs)
OBJECTS = ['chest_closed', 'chest_open', 'chest_treasure', 'chest_empty', 'coin', 'coin_blank', 'token_mult', 'coins_pile',
           'emblem_sun', 'medallion', 'gold_star', 'heart_gem', 'lantern', 'scarf', 'rider', 'ls_cell',
           'badge_1', 'badge_2', 'badge_3', 'badge_5', 'badge_10', 'bar_wide', 'bar_small', 'panel_ribbon', 'banner_bonus', 'card_scatter', 'card_hideout', 'card_last', 'tile_wild', 'tile_scatter', 'tile_fs', 'plank', 'pan_red', 'pan_rope', 'pan_sunset', 'btn_bonusbuy',
           'casing_1', 'casing_2', 'flower_0', 'flower_1', 'flower_2',
           *[f'coinspin_{i}' for i in range(7)], *[f'flare_{i}' for i in range(5)], *[f'smoke_{i}' for i in range(4)],
           'blast_0', 'blast_1', 'muzzle_0', 'muzzle_1', 'puff_0', 'puff_1',
           'fx_glow', 'fx_dot', 'fx_spark', 'fx_ring', 'fx_streak', 'fx_rays', 'fx_dust1', 'fx_dust2', 'fx_ember', 'fx_flare',
           'fx_shine', 'fx_smoke']
STANDALONE = {  # name: (max width, quality)
    # logo, bonus cards, painted background & reel frame are written directly by tools/art/cut_v6.py
    'win_big': (1080, 90), 'win_mega': (1080, 90), 'win_epic': (1080, 90),
}


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
    chars = [f'lamp_{i}' for i in range(6)] + [f'maria_{i}' for i in range(6)] + [f'glowcard_{i}' for i in range(10)] + [f'ride_{i}' for i in range(24)]
    pack('chars', [(n, load(n)) for n in chars], max_w=2048)
    anim = [f'lampa_{i}' for i in range(24)] + [f'mariaa_{i}' for i in range(24)] + [f'chesta_{i}' for i in range(16)] + [f'coinb_{i}' for i in range(15)] + [f'sparkb_{i}' for i in range(8)]
    pack('anim', [(n, load(n)) for n in anim], max_w=2048)
    for n, (mw, q) in STANDALONE.items():
        im = load(n.replace('_lg', ''))
        if im.width > mw:
            im = im.resize((mw, round(im.height * mw / im.width)), Image.LANCZOS)
        if im.width < mw and n.endswith('_lg'):
            im = im.resize((mw, round(im.height * mw / im.width)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 50, 2))
        if n.endswith('_back'):
            im.convert('RGB').save(os.path.join(OUT, f'{n}.webp'), 'WEBP', quality=q, method=6)
        else:
            im.save(os.path.join(OUT, f'{n}.webp'), 'WEBP', quality=q, method=6)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'standalone: {len(STANDALONE)}  total gfx size: {total / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
