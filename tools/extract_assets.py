"""Extract game sprites from the supplied concept sprite sheets.

Usage: python3 tools/extract_assets.py
Reads art/source/sheet1.jpg / sheet2.jpg, writes transparent PNGs to public/assets.
Background removal: near-white pixels connected to the crop border become transparent,
with a soft anti-aliased edge. `holes=True` additionally clears enclosed pure-white areas.
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'public', 'assets')

# name: (sheet, (x0, y0, x1, y1), mode) ; mode: 'cut' (remove white), 'cuth' (cut + holes), 'raw'
ASSETS = {
    # ---- symbols (sheet 1, chosen by the client) ----
    'sym_lampiao': (1, (17, 5, 208, 223), 'cut'),
    'sym_maria': (1, (225, 7, 418, 226), 'cut'),
    'sym_wild': (1, (428, 1, 619, 242), 'cut'),
    'sym_wanted': (1, (628, 24, 798, 241), 'cut'),
    'sym_map': (1, (802, 15, 998, 230), 'cut'),
    'sym_emblem': (1, (997, 13, 1204, 232), 'cut'),
    'sym_hat': (1, (12, 238, 215, 373), 'cut'),
    'sym_cartucheira': (1, (221, 251, 378, 367), 'cuth'),
    'sym_revolver': (1, (378, 248, 553, 361), 'cut'),
    'sym_sanfona': (1, (554, 244, 717, 361), 'cut'),
    'sym_rifles': (1, (706, 244, 883, 373), 'cuth'),
    'sym_facao': (1, (884, 235, 1017, 369), 'cut'),
    'sym_cactus': (1, (1021, 229, 1121, 367), 'cuth'),
    'sym_cantil': (1, (1148, 237, 1262, 369), 'cut'),
    # ---- props / decor (sheet 1) ----
    'lantern': (1, (975, 352, 1072, 516), 'cuth'),
    'saddle': (1, (1080, 372, 1272, 516), 'cuth'),
    'rooster': (1, (12, 375, 131, 510), 'cuth'),
    'wheel': (1, (156, 378, 289, 508), 'cuth'),
    'jug': (1, (307, 380, 407, 505), 'cut'),
    'drum': (1, (420, 370, 539, 508), 'cut'),
    'sunflower': (1, (548, 377, 681, 502), 'cut'),
    'hibiscus': (1, (688, 383, 824, 508), 'cut'),
    'bougainvillea': (1, (830, 381, 955, 518), 'cuth'),
    'chest_gold': (1, (29, 511, 167, 621), 'cut'),
    'chest_wood': (1, (177, 511, 325, 615), 'cut'),
    'coin_star': (1, (347, 514, 448, 612), 'cut'),
    'mult_2': (1, (455, 514, 562, 613), 'cut'),
    'mult_3': (1, (569, 514, 669, 613), 'cut'),
    'mult_5': (1, (685, 514, 783, 613), 'cut'),
    'mult_10': (1, (799, 514, 901, 613), 'cut'),
    'gem_star': (1, (916, 514, 1023, 616), 'cut'),
    'gem_heart': (1, (1039, 522, 1136, 611), 'cut'),
    'gem_diamond': (1, (1147, 520, 1252, 608), 'cut'),
    'logo': (1, (12, 616, 404, 762), 'cut'),
    'banner_escape': (1, (409, 624, 596, 753), 'cut'),
    'banner_hideout': (1, (596, 624, 776, 753), 'cut'),
    'banner_laststand': (1, (778, 624, 958, 753), 'cut'),
    'emblem_sun': (1, (961, 614, 1123, 769), 'cut'),
    'banner_star': (1, (1125, 624, 1277, 756), 'cut'),
    'btn_spin': (1, (9, 751, 119, 852), 'cut'),
    'btn_play': (1, (132, 769, 204, 840), 'cut'),
    'btn_auto': (1, (221, 769, 292, 840), 'cut'),
    'btn_menu': (1, (299, 771, 362, 838), 'cut'),
    'btn_bet': (1, (368, 771, 435, 838), 'cut'),
    'btn_settings': (1, (443, 771, 511, 838), 'cut'),
    'btn_info': (1, (518, 771, 586, 838), 'cut'),
    'btn_sound': (1, (593, 771, 660, 838), 'cut'),
    'btn_trophy': (1, (666, 771, 735, 838), 'cut'),
    'btn_minus': (1, (750, 776, 806, 834), 'cut'),
    'btn_plus': (1, (890, 774, 950, 836), 'cut'),
    # ---- sheet 2: environments, bonus UI, VFX ----
    'bg_village': (2, (12, 620, 292, 765), 'raw'),
    'bg_hideout': (2, (312, 620, 540, 760), 'raw'),
    'bg_canyon': (2, (560, 616, 814, 762), 'raw'),
    'title_escape': (2, (7, 351, 194, 491), 'cut'),
    'title_hideout': (2, (197, 351, 384, 491), 'cut'),
    'title_laststand': (2, (389, 351, 574, 494), 'cut'),
    'xmult_2': (2, (582, 361, 666, 451), 'cut'),
    'xmult_3': (2, (666, 361, 750, 451), 'cut'),
    'xmult_5': (2, (750, 361, 834, 451), 'cut'),
    'xmult_10': (2, (834, 361, 921, 451), 'cut'),
    'chest_closed': (2, (927, 357, 1046, 469), 'cut'),
    'chest_open': (2, (1046, 355, 1163, 471), 'cut'),
    'chest_gems': (2, (1163, 353, 1276, 478), 'cut'),
    'buy_escape': (2, (867, 486, 1001, 599), 'cut'),
    'buy_hideout': (2, (1003, 486, 1138, 599), 'cut'),
    'buy_laststand': (2, (1141, 486, 1279, 599), 'cut'),
    'coins_pile': (2, (825, 614, 908, 693), 'cut'),
    'coin_gold': (2, (910, 616, 991, 701), 'cut'),
    'medallion': (2, (996, 606, 1069, 703), 'cut'),
    'scarf': (2, (834, 777, 961, 842), 'cut'),
    'hat_straps': (2, (499, 189, 643, 344), 'cut'),
}


def cut(img, holes=False, thr=222):
    a = np.asarray(img.convert('RGB')).astype(np.int32)
    mn, mx = a.min(axis=2), a.max(axis=2)
    whiteish = (mn > thr) & ((mx - mn) < 34)
    lab, _ = nd.label(whiteish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    if holes:
        pure = (mn > 238) & ((mx - mn) < 22)
        lab2, n2 = nd.label(pure)
        sizes = nd.sum(pure, lab2, range(1, n2 + 1))
        for i, s in enumerate(sizes):
            if s > 60:
                bg |= lab2 == (i + 1)
    fg = ~bg
    fg = nd.binary_opening(fg, iterations=1)
    # keep only the largest few components (drop specks)
    lab3, n3 = nd.label(fg)
    if n3 > 1:
        sizes = nd.sum(fg, lab3, range(1, n3 + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s > max(40, sizes.max() * 0.04)]
        fg = np.isin(lab3, keep)
    alpha = fg.astype(np.float32)
    # soft edge: partial alpha for whiteish pixels on the rim, derived from distance to white
    rim = nd.binary_dilation(fg, iterations=1) & ~fg
    whiteness = np.clip((255 - mn) / (255 - thr + 1), 0, 1)
    alpha[rim] = whiteness[rim] * 0.5
    alpha = nd.gaussian_filter(alpha, 0.55)
    alpha = np.clip(alpha * 1.15, 0, 1)
    alpha[nd.binary_erosion(fg, iterations=2)] = 1.0
    rgb = a.astype(np.float32)
    # un-matte the white fringe
    al = np.clip(alpha, 0.05, 1)[..., None]
    rgb = np.clip((rgb - 255 * (1 - al)) / al, 0, 255)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    bbox = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(bbox) if bbox else out


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = {1: Image.open(os.path.join(SRC, 'sheet1.jpg')), 2: Image.open(os.path.join(SRC, 'sheet2.jpg'))}
    for name, (sheet, box, mode) in ASSETS.items():
        crop = sheets[sheet].crop(box)
        if mode == 'raw':
            # backgrounds: upscale 4x with lanczos + light sharpening; game applies blur/grade
            w, h = crop.size
            crop = crop.resize((w * 4, h * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(3, 60, 2))
            crop.convert('RGB').save(os.path.join(OUT, name + '.jpg'), quality=90)
        else:
            img = cut(crop, holes=(mode == 'cuth'))
            w, h = img.size
            img = img.resize((w * 2, h * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 40, 3))
            img.save(os.path.join(OUT, name + '.png'), optimize=True)
    print('extracted', len(ASSETS), 'assets ->', OUT)


if __name__ == '__main__':
    main()
