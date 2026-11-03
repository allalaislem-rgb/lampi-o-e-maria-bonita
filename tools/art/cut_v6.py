"""Cut the client's art pack v6 (background, rider animation, font, UI sheet, reel frame).

Usage: python3 tools/art/cut_v6.py   (then python3 tools/art/pack.py)

Sources (art/source/):
  in_6.webp   2000×667  painted sunset village background (opaque)
  in_7.webp   2000×667  24-frame rider gallop animation (true alpha)
  in_8.webp   1371×771  western bitmap font on black (A–Z 0–9 $,.+%-!?)
  in_9.webp   1536×1024 UI sheet: logo, bonus cards, buttons, panels, badges (painted light background)
  in_10.webp  1672×941  reel frame (true alpha)
Outputs: art/render/*.png (atlas inputs), public/gfx/* (standalone), public/fonts/western.{png,fnt}, public/ui/*.webp
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'art', 'render')
GFX = os.path.join(ROOT, 'public', 'gfx')
UI = os.path.join(ROOT, 'public', 'ui')
FONTS = os.path.join(ROOT, 'public', 'fonts')
for d in (OUT, GFX, UI, FONTS):
    os.makedirs(d, exist_ok=True)


def src(n):
    return Image.open(os.path.join(SRC, n))


def trim(im, thr=8):
    bb = im.getchannel('A').point(lambda v: 255 if v > thr else 0).getbbox()
    return im.crop(bb) if bb else im


def matte_light(crop, thr=222, holes_min=None):
    """Remove a painted light/checkerboard background (flood from the border)."""
    a = np.asarray(crop.convert('RGB')).astype(np.float32)
    mn, mx = a.min(2), a.max(2)
    light = (mn > thr) & ((mx - mn) < 26)
    lab, n = nd.label(light)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    if holes_min:
        sizes = nd.sum(light, lab, range(1, n + 1))
        for i, s in enumerate(sizes):
            if s > holes_min:
                bg |= lab == (i + 1)
    fg = nd.binary_opening(~bg, iterations=1)
    lab2, n2 = nd.label(fg)
    if n2 > 1:
        sizes = nd.sum(fg, lab2, range(1, n2 + 1))
        main = lab2 == (int(np.argmax(sizes)) + 1)
        near = nd.binary_dilation(main, iterations=5)
        keep = [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * 0.003 and (near & (lab2 == i + 1)).any()]
        fg = np.isin(lab2, keep)
    core = nd.binary_erosion(fg, iterations=1)
    alpha = np.clip(nd.gaussian_filter(core.astype(np.float32), 0.8) * 1.25, 0, 1)
    alpha[nd.binary_erosion(fg, iterations=2)] = 1
    al = np.clip(alpha, 0.08, 1)[..., None]
    rgb = np.clip((a - 250 * (1 - al)) / al, 0, 255)
    rgb = np.where(alpha[..., None] > 0.97, a, rgb)
    return trim(Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA'))


def up(im, k):
    if abs(k - 1) < 1e-3:
        return im
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    return im.filter(ImageFilter.UnsharpMask(1.4, 40, 2)) if k > 1 else im


def save(name, im, where=OUT, fmt='png', q=90):
    p = os.path.join(where, f'{name}.{fmt}')
    if fmt == 'png':
        im.save(p, optimize=True)
    else:
        (im if im.mode == 'RGBA' else im.convert('RGB')).save(p, 'WEBP', quality=q, method=6)


def erase_text(im, box, fill_from='left'):
    """Fill a rectangular label area (in image coords) with the panel's own interior colour."""
    a = np.asarray(im).copy()
    x0, y0, x1, y1 = box
    reg = a[y0:y1, x0:x1].reshape(-1, 4)
    lum = reg[:, :3].max(1)
    dark = reg[(lum < np.percentile(lum, 35)) & (reg[:, 3] > 200)]
    col = np.median(dark if len(dark) else reg, axis=0)
    a[y0:y1, x0:x1, :3] = col[:3]
    out = Image.fromarray(a, 'RGBA')
    blur = out.filter(ImageFilter.GaussianBlur(2))
    m = Image.new('L', out.size, 0)
    ImageDraw.Draw(m).rectangle(box, fill=255)
    return Image.composite(blur, out, m.filter(ImageFilter.GaussianBlur(1.5)))


# ====================================================================== background
def background():
    bg = src('in_6.webp').convert('RGB')
    # widen to 21:9-ish for ultrawide by mirroring soft edge strips is unnecessary – cover-scaled at runtime
    save('bg_painted', bg, GFX, 'webp', 86)


# ====================================================================== riders
def riders():
    im = src('in_7.webp').convert('RGBA')
    W, H = im.size
    cw, ch = W / 8, H / 3
    frames = []
    for r in range(3):
        for c in range(8):
            fr = im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            frames.append(fr)
    # common bbox so frames align
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox() for f in frames]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    for i, f in enumerate(frames):
        fr = f.crop((x0, y0, x1, y1))
        a = np.asarray(fr).copy()
        h = a.shape[0]
        fade = np.clip(np.arange(h)[::-1] / 18.0, 0, 1)  # soften dust cut at the cell bottom
        a[..., 3] = (a[..., 3] * fade[:, None]).astype(np.uint8)
        side = np.clip(np.minimum(np.arange(a.shape[1]), np.arange(a.shape[1])[::-1]) / 10.0, 0, 1)
        a[..., 3] = (a[..., 3] * side[None, :]).astype(np.uint8)
        save(f'ride_{i}', Image.fromarray(a, 'RGBA'))
    print('riders', len(frames), (x1 - x0, y1 - y0))


# ====================================================================== font
CHARS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ', '0123456789', '$,.+%-!?']


def font():
    im = src('in_8.webp').convert('RGB')
    a = np.asarray(im).astype(np.float32)
    lum = a.max(2)
    fg = lum > 70
    rows = np.nonzero(fg.sum(1) > 3)[0]
    bands, s, p = [], rows[0], rows[0]
    for r in rows[1:]:
        if r - p > 6:
            bands.append((s, p))
            s = r
        p = r
    bands.append((s, p))
    # alpha from luminance (keeps the outer glow); colour un-premultiplied against black
    alpha = np.clip((lum - 18) / 120, 0, 1)
    rgb = np.clip(a / np.maximum(alpha[..., None], 0.05), 0, 255)
    rgba = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    glyphs = {}
    base_top, base_h = None, None
    for (y0, y1), chars in zip(bands, CHARS):
        cols = fg[y0:y1 + 1].sum(0) > 1
        xs = np.nonzero(cols)[0]
        segs, st, pv = [], xs[0], xs[0]
        for x in xs[1:]:
            if x - pv > 4:
                segs.append((st, pv))
                st = x
            pv = x
        segs.append((st, pv))
        segs = [g for g in segs if g[1] - g[0] > 6]
        assert len(segs) == len(chars), (chars, len(segs))
        for (sx0, sx1), ch in zip(segs, chars):
            pad = 7
            cy0 = int(np.nonzero(fg[y0:y1 + 1, sx0:sx1 + 1].sum(1) > 0)[0][0]) + y0
            cy1 = int(np.nonzero(fg[y0:y1 + 1, sx0:sx1 + 1].sum(1) > 0)[0][-1]) + y0
            glyphs[ch] = {'im': rgba.crop((sx0 - pad, cy0 - pad, sx1 + pad + 1, cy1 + pad + 1)), 'band': (y0, y1), 'ink': (cy0, cy1)}
    # line metrics from the letter rows: cap height ≈ band height of 'A'
    capH = glyphs['A']['band'][1] - glyphs['A']['band'][0]
    # punctuation rows contain descenders – place by their band top relative to cap line
    # accented glyphs (built from base letters + painted-style diacritics)
    def accent(base, kind):
        g = glyphs[base]['im']
        w, h = g.size
        extra = int(capH * 0.32)
        c = Image.new('RGBA', (w, h + extra), (0, 0, 0, 0))
        c.alpha_composite(g, (0, extra))
        d = ImageDraw.Draw(c)
        cx = w / 2
        y = extra * 0.55
        col_o, col_i = (90, 30, 6, 255), (240, 150, 50, 255)
        def stroke(pts, wdt):
            d.line(pts, fill=col_o, width=wdt + 6, joint='curve')
            d.line(pts, fill=col_i, width=wdt, joint='curve')
        if kind == 'tilde':
            pts = [(cx - w * 0.22 + i * w * 0.44 / 12, y + np.sin(i / 12 * 2 * np.pi) * extra * -0.22) for i in range(13)]
            stroke(pts, max(7, int(capH * 0.1)))
        elif kind == 'acute':
            stroke([(cx - w * 0.06, y + extra * 0.22), (cx + w * 0.12, y - extra * 0.28)], max(8, int(capH * 0.11)))
        elif kind == 'grave':
            stroke([(cx + w * 0.06, y + extra * 0.22), (cx - w * 0.12, y - extra * 0.28)], max(8, int(capH * 0.11)))
        elif kind == 'circ':
            stroke([(cx - w * 0.16, y + extra * 0.22), (cx, y - extra * 0.25), (cx + w * 0.16, y + extra * 0.22)], max(7, int(capH * 0.1)))
        elif kind == 'cedilla':
            c2 = Image.new('RGBA', (w, h + extra), (0, 0, 0, 0))
            c2.alpha_composite(g, (0, 0))
            d2 = ImageDraw.Draw(c2)
            by = h - 4
            d2.line([(cx, by), (cx + w * 0.08, by + extra * 0.45), (cx - w * 0.08, by + extra * 0.85)], fill=col_o, width=max(8, int(capH * 0.1)), joint='curve')
            d2.line([(cx, by), (cx + w * 0.08, by + extra * 0.45), (cx - w * 0.08, by + extra * 0.85)], fill=col_i, width=max(4, int(capH * 0.06)), joint='curve')
            return c2.filter(ImageFilter.SMOOTH_MORE), 0
        return c.filter(ImageFilter.SMOOTH), extra
    ACC = {'Ã': ('A', 'tilde'), 'Õ': ('O', 'tilde'), 'Á': ('A', 'acute'), 'É': ('E', 'acute'), 'Í': ('I', 'acute'), 'Ó': ('O', 'acute'), 'Ú': ('U', 'acute'),
           'Â': ('A', 'circ'), 'Ê': ('E', 'circ'), 'Ô': ('O', 'circ'), 'À': ('A', 'grave'), 'Ç': ('C', 'cedilla')}
    extra_up = {}
    for ch, (b, k) in ACC.items():
        im2, ex = accent(b, k)
        glyphs[ch] = {'im': im2, 'band': glyphs[b]['band']}
        extra_up[ch] = ex
    # extra symbols built from existing ones
    glyphs['×'] = {'im': glyphs['X']['im'].resize((int(glyphs['X']['im'].width * 0.62), int(glyphs['X']['im'].height * 0.62)), Image.LANCZOS), 'band': None}
    # pack into a single texture + AngelCode .fnt (text) for Pixi BitmapFont
    order = list(glyphs.keys())
    pad = 2
    maxw = 2048
    x = y = rowh = 0
    place = {}
    for ch in order:
        g = glyphs[ch]['im']
        if x + g.width + pad > maxw:
            x = 0
            y += rowh + pad
            rowh = 0
        place[ch] = (x, y)
        x += g.width + pad
        rowh = max(rowh, g.height)
    H = y + rowh
    sheet = Image.new('RGBA', (maxw, H), (0, 0, 0, 0))
    for ch in order:
        sheet.paste(glyphs[ch]['im'], place[ch])
    sheet.save(os.path.join(FONTS, 'western.png'), optimize=True)
    # metrics: cap line at y=pad+7 of a letter crop; lineHeight ≈ capH*1.35
    line = int(capH * 1.32)
    base = int(capH + 7 + 4)
    lines = [f'info face="Western" size={capH} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=0,0',
             f'common lineHeight={line} base={base} scaleW={maxw} scaleH={H} pages=1 packed=0',
             'page id=0 file="western.png"', f'chars count={len(order) + 1}']
    letter_top = {}
    for ch in order:
        g = glyphs[ch]
        im_ = g['im']
        px, py = place[ch]
        band = g['band']
        if ch == '×':
            yoff = int(capH * 0.3)
        else:
            ink = g.get('ink') or glyphs[ch[0]].get('ink')
            # each sheet row: digits/letters share the row's cap line = band top; punctuation row uses digit cap line
            rowtop = band[0]
            if ch in '$,.+%-!?':
                # reference: the '!' ink top is the cap line of the punctuation row
                rowtop = glyphs['!']['ink'][0]
            yoff = (ink[0] - rowtop) if ink else 0
        yoff -= extra_up.get(ch, 0)
        adv = im_.width - 14 + 3
        lines.append(f'char id={ord(ch)} x={px} y={py} width={im_.width} height={im_.height} xoffset=-7 yoffset={yoff} xadvance={adv} page=0 chnl=15')
    lines.append(f'char id=32 x=0 y=0 width=0 height=0 xoffset=0 yoffset=0 xadvance={int(capH * 0.36)} page=0 chnl=15')
    open(os.path.join(FONTS, 'western.fnt'), 'w').write('\n'.join(lines) + '\n')
    print('font', len(order), 'glyphs, capH', capH, 'sheet', sheet.size)


# ====================================================================== UI sheet
UIB = {
    'logo2': (18, 10, 658, 413), 'card_escape': (672, 6, 935, 433), 'card_hideout2': (945, 5, 1218, 432), 'card_last2': (1227, 5, 1506, 434),
    'btn_bonusbuy': (809, 431, 1005, 585),
    'pan_balance': (9, 610, 246, 717), 'pan_win': (248, 610, 462, 717), 'pan_bet': (465, 610, 673, 717), 'pan_betctl': (684, 608, 935, 720),
    'chip_010': (946, 615, 1042, 705), 'chip_100': (1240, 615, 1331, 705),
    'ic_home': (11, 746, 105, 839), 'ic_info': (112, 746, 203, 839), 'ic_settings': (210, 746, 301, 839), 'ic_sound': (309, 746, 401, 839),
    'ic_music': (408, 746, 499, 839), 'ic_full': (507, 748, 595, 838), 'ic_prev': (602, 749, 690, 838), 'ic_next': (697, 748, 785, 838),
    'bars': (806, 721, 1167, 879), 'plank': (1180, 726, 1525, 877), 'tile_wild': (10, 849, 187, 1010), 'tile_scatter': (189, 849, 346, 1009),
    'tile_fs': (347, 849, 506, 1009), 'pan_sunset': (514, 875, 837, 1015), 'pan_red': (839, 876, 1185, 1018), 'pan_rope': (1191, 885, 1528, 1014),
}


def ui_sheet():
    im = src('in_9.webp').convert('RGB')
    for n, box in {'btn_spin2': (17, 411, 212, 609), 'btn_auto2': (214, 435, 364, 585), 'btn_spinword': (368, 452, 592, 578), 'btn_stop': (596, 452, 803, 578)}.items():
        save(n, up(matte_light(im.crop(box)), 1.25), UI, 'webp', 92)
    badges = matte_light(im.crop((1011, 456, 1528, 572)))
    a = np.asarray(badges)[..., 3] > 30
    xs = np.nonzero(a.sum(0) > 2)[0]
    segs, st, pv = [], xs[0], xs[0]
    for x in xs[1:]:
        if x - pv > 2:
            segs.append((st, pv))
            st = x
        pv = x
    segs.append((st, pv))
    for (x0, x1), n in zip(segs, ['badge_1', 'badge_2', 'badge_3', 'badge_5', 'badge_10']):
        save(n, up(trim(badges.crop((x0, 0, x1 + 1, badges.height))), 1.6))
    for n, box in UIB.items():
        part = matte_light(im.crop(box), holes_min=None)
        if n == 'logo2':
            save('logo', part, GFX, 'webp', 92)
            continue
        if n.startswith('card_'):
            save(n, part, GFX, 'webp', 90)
            continue
        if n.startswith('pan_') and n in ('pan_balance', 'pan_win', 'pan_bet'):
            # erase the baked label / value text, keep the icon + frame
            w, h = part.size
            part = erase_text(part, (int(w * 0.33), int(h * 0.18), int(w * 0.93), int(h * 0.82)))
        if n == 'pan_betctl':
            w, h = part.size
            part = erase_text(part, (int(w * 0.3), int(h * 0.12), int(w * 0.7), int(h * 0.38)))
            part = erase_text(part, (int(w * 0.33), int(h * 0.45), int(w * 0.67), int(h * 0.82)))
        if n in ('chip_010', 'chip_100'):
            w, h = part.size
            part = erase_text(part, (int(w * 0.18), int(h * 0.25), int(w * 0.82), int(h * 0.75)))
        save(n, part, UI, 'webp', 92)
        if n in ('tile_wild', 'tile_scatter', 'tile_fs', 'plank', 'pan_red', 'pan_rope', 'pan_sunset', 'bars', 'btn_bonusbuy'):
            save(n, part)  # also into atlas
    print('ui sheet done')


# ====================================================================== frame
def frame():
    im = src('in_10.webp').convert('RGBA')
    save('frame_painted', im, GFX, 'webp', 90)
    print('frame', im.size)


if __name__ == '__main__':
    background()
    riders()
    font()
    ui_sheet()
    frame()
