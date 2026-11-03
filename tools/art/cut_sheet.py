"""Cut the client's painted asset sheet into game sprites.

Usage: python3 tools/art/cut_sheet.py        (then python3 tools/art/pack.py)

Source: art/source/sheet_v5.webp (1125×750, true alpha) – the final art sheet chosen by the client
(winking Lampião). Writes PNGs to art/render/ with the names the game and atlas packer expect, and
the DOM HUD images to public/ui/.
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'art', 'source', 'sheet_v5.webp')
OUT = os.path.join(ROOT, 'art', 'render')
UI_DIR = os.path.join(ROOT, 'public', 'ui')
os.makedirs(OUT, exist_ok=True)
os.makedirs(UI_DIR, exist_ok=True)

SHEET = Image.open(SRC).convert('RGBA')
SYM_W, SYM_H = 480, 432  # symbol canvas (reel cell 200×180 at ×2.4)


def cut(box, main_only=True, soft=False):
    """Crop by alpha; optionally keep only the main shape (drops slivers of neighbouring sprites)."""
    im = SHEET.crop(box)
    a = np.asarray(im).copy()
    # the sheet has a faint alpha haze (≈5–20) around every sprite – remap it away
    al = a[..., 3].astype(np.float32)
    a[..., 3] = np.clip((al - 24) * 255 / 231, 0, 255).astype(np.uint8)
    if main_only and not soft:
        fg = a[..., 3] > 40
        lab, n = nd.label(nd.binary_dilation(fg, iterations=1))
        if n > 1:
            sizes = nd.sum(fg, lab, range(1, n + 1))
            main = lab == (int(np.argmax(sizes)) + 1)
            near = nd.binary_dilation(main, iterations=4)
            keep = np.zeros_like(main)
            for i, s in enumerate(sizes):
                comp = lab == (i + 1)
                if s > sizes.max() * 0.01 and (near & comp).any():
                    keep |= comp
            a[..., 3] = np.where(nd.binary_dilation(keep, iterations=2), a[..., 3], 0)
    im = Image.fromarray(a, 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def up(im, k):
    if k == 1:
        return im
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(1.6, 45, 2))


def fit(im, w, h, fill=0.96):
    k = min(w * fill / im.width, h * fill / im.height)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    if k > 1.2:
        im = im.filter(ImageFilter.UnsharpMask(1.8, 55, 2))
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    c.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2))
    return c


def save(name, im):
    im.save(os.path.join(OUT, name + '.png'), optimize=True)


def main():
    # ------------------------------------------------------------ reel symbols
    SYM = {
        'sym_lampiao': ((16, 0, 217, 161), 0.99),
        'sym_maria': ((231, 0, 427, 161), 0.99),
        'sym_wild': ((10, 284, 141, 440), 0.99),
        'sym_hat': ((432, 22, 613, 159), 0.94),
        'sym_cartucheira': ((618, 16, 762, 143), 0.94),
        'sym_revolver': ((762, 5, 937, 156), 0.95),
        'sym_sanfona': ((919, 19, 1122, 153), 0.94),
        'sym_rifles': ((13, 164, 179, 289), 0.95),
        'sym_facao': ((181, 162, 318, 287), 0.95),
        'sym_cactus': ((319, 162, 463, 289), 0.95),
        'sym_cantil': ((464, 158, 607, 289), 0.95),
        'sym_wanted': ((616, 158, 770, 287), 0.98),
        'sym_map': ((778, 162, 942, 285), 0.98),
        'sym_emblem': ((946, 159, 1113, 289), 0.98),
        # decorative trigger cards (paytable / intros)
        'card_scatter': ((146, 297, 269, 430), 0.98),
        'card_hideout': ((273, 288, 394, 439), 0.98),
        'card_last': ((397, 290, 511, 439), 0.98),
    }
    for name, (box, fill) in SYM.items():
        save(name, fit(cut(box), SYM_W, SYM_H, fill))

    # ------------------------------------------------------------ character frames
    lamp = [(516, 293, 600, 370), (608, 293, 693, 370), (701, 294, 789, 370), (797, 294, 883, 370), (894, 297, 989, 370), (993, 296, 1118, 370)]
    w = (1123 - 814) / 3
    maria = [(518, 372, 613, 451), (618, 372, 712, 450), (718, 373, 807, 450)] + [(round(814 + i * w), 372, round(814 + (i + 1) * w), 450) for i in range(3)]
    for i, b in enumerate(lamp):
        save(f'lamp_{i}', up(cut(b), 2.2))
    for i, b in enumerate(maria):
        save(f'maria_{i}', up(cut(b, main_only=i < 3), 2.2))

    # ------------------------------------------------------------ UI / props
    UI = {
        'logo': ((7, 593, 259, 739), 3.0),
        'title_escape': ((754, 573, 870, 657), 3.0),
        'title_hideout': ((875, 563, 986, 657), 3.0),
        'title_last': ((992, 572, 1118, 657), 3.0),
        'banner_bonus': ((619, 574, 748, 632), 2.6),
        'btn_spin': ((267, 615, 340, 687), 2.6),
        'btn_auto': ((343, 624, 395, 678), 2.4),
        'btn_turbo': ((399, 632, 436, 670), 2.6),
        'btn_coins': ((438, 632, 476, 670), 2.6),
        'btn_menu': ((481, 633, 516, 669), 2.6),
        'btn_info': ((522, 633, 558, 669), 2.6),
        'btn_sound': ((564, 634, 599, 669), 2.6),
        'btn_sound2': ((605, 635, 638, 669), 2.6),
        'btn_full': ((641, 639, 690, 680), 2.6),
        'badge_1': ((755, 666, 823, 736), 2.4),
        'badge_2': ((827, 666, 895, 736), 2.4),
        'badge_3': ((899, 666, 967, 736), 2.4),
        'badge_5': ((971, 666, 1040, 736), 2.4),
        'badge_10': ((1044, 666, 1115, 736), 2.4),
        'bar_wide': ((264, 693, 476, 732), 2.4),
        'panel_ribbon': ((484, 681, 633, 745), 2.6),
        'bar_small': ((644, 698, 745, 728), 2.4),
        'casing_1': ((619, 522, 652, 558), 2.0),
        'casing_2': ((656, 526, 701, 557), 2.0),
    }
    for name, (box, k) in UI.items():
        save(name, up(cut(box), k))
    # muted sound icon = sound icon desaturated & darkened (the sheet has no mute glyph)
    snd = Image.open(os.path.join(OUT, 'btn_sound.png'))
    g = snd.convert('LA').convert('RGBA')
    g.putalpha(snd.getchannel('A'))
    save('btn_mute', Image.blend(g, Image.new('RGBA', g.size, (0, 0, 0, 0)), 0.0))

    coins = [(339, 461, 381, 505), (385, 462, 417, 503), (424, 461, 458, 503), (466, 462, 497, 504), (498, 458, 532, 502), (528, 459, 570, 502), (565, 459, 604, 499)]
    for i, b in enumerate(coins):
        save(f'coinspin_{i}', up(cut(b, soft=True), 2.4))
    save('coin', up(cut(coins[0], soft=True), 3.0))
    for i, b in enumerate([(917, 523, 953, 557), (982, 527, 1015, 556), (1062, 526, 1097, 558)]):
        save(f'flower_{i}', up(cut(b), 2.0))

    # ------------------------------------------------------------ translucent FX
    FX = {
        'flare_0': (11, 455, 60, 499), 'flare_1': (68, 451, 120, 504), 'flare_2': (129, 451, 187, 505), 'flare_3': (199, 448, 258, 505), 'flare_4': (268, 452, 326, 505),
        'smoke_0': (614, 458, 668, 504), 'smoke_1': (664, 457, 719, 507), 'smoke_2': (719, 457, 780, 512), 'smoke_3': (782, 457, 839, 511),
        'blast_0': (844, 455, 912, 513), 'blast_1': (916, 455, 993, 516), 'muzzle_0': (1001, 463, 1057, 515), 'muzzle_1': (1062, 462, 1116, 514),
        'puff_0': (704, 516, 769, 560), 'puff_1': (822, 523, 873, 555),
    }
    for name, box in FX.items():
        save(name, up(cut(box, soft=True), 2.6))
    cards = [(9, 513, 53, 585), (63, 513, 107, 585), (117, 513, 164, 586), (174, 510, 221, 586), (230, 510, 280, 587), (289, 510, 340, 590), (353, 509, 406, 590), (417, 508, 471, 590), (484, 508, 538, 595), (549, 507, 603, 595)]
    for i, b in enumerate(cards):
        save(f'glowcard_{i}', up(cut(b, soft=True), 2.8))

    # ------------------------------------------------------------ DOM UI → public/ui (WebP)
    for n in ['btn_spin', 'btn_auto', 'btn_turbo', 'btn_coins', 'btn_menu', 'btn_info', 'btn_sound', 'btn_mute', 'btn_full', 'banner_bonus', 'bar_wide', 'bar_small', 'panel_ribbon']:
        Image.open(os.path.join(OUT, n + '.png')).save(os.path.join(UI_DIR, n + '.webp'), 'WEBP', quality=92, method=6)
    print('cut done ->', OUT)


if __name__ == '__main__':
    main()
