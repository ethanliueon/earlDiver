#!/usr/bin/env python3
# (7.6.37) The automatic check for one painted head piece from ChatGPT, against its template. It prints a JSON report and
# writes <piece>_overlay.png (the piece at 50 % over the template) for the eye check. Exit code 0 = passed.
#   python3 check_piece.py <piece.png> <head|hair|beard|cap> [m|f]
import sys, os, json
from PIL import Image, ImageChops, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CROSSES = [(48, 48), (976, 48), (48, 976), (976, 976)]

def key_mask(im):
    """True where the pixel is the piece (not key green)."""
    px = im.load(); W, H = im.size
    m = Image.new('L', (W, H), 0); mp = m.load()
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y][:3]
            if not (g > 150 and g > r * 1.6 and g > b * 1.6): mp[x, y] = 255
    return m

def cross_at(im, cx, cy):
    """Where the dark cross is near (cx, cy): the centre of its dark pixels within 40 px, or None."""
    px = im.load(); xs = ys = n = 0
    for y in range(cy - 40, cy + 41):
        for x in range(cx - 40, cx + 41):
            r, g, b = px[x, y][:3]
            if r < 90 and g < 90 and b < 90: xs += x; ys += y; n += 1
    return (xs / n, ys / n) if n > 20 else None

def main():
    piece, kind = sys.argv[1], sys.argv[2]; sex = sys.argv[3] if len(sys.argv) > 3 else 'm'
    tpl = Image.open(os.path.join(HERE, f'template_{sex}.png')).convert('RGB')
    im = Image.open(piece).convert('RGB'); rep = {'piece': os.path.basename(piece), 'kind': kind, 'checks': {}}
    C = rep['checks']
    C['size'] = {'ok': im.size == (1024, 1024), 'got': list(im.size)}
    if im.size != (1024, 1024): im = im.resize((1024, 1024))  # still look at the rest
    offs = []
    for (cx, cy) in CROSSES:
        c = cross_at(im, cx, cy); t = cross_at(tpl, cx, cy)
        offs.append(None if not c or not t else round(((c[0] - t[0]) ** 2 + (c[1] - t[1]) ** 2) ** 0.5, 1))
    C['crosses'] = {'ok': all(o is not None and o <= 2 for o in offs), 'offsets_px': offs}
    # the border band (outside the crosses) must still be key green
    W, H = im.size; px = im.load(); bad = tot = 0
    for y in range(0, H, 4):
        for x in range(0, W, 4):
            if 80 < x < W - 80 and 80 < y < H - 80: continue
            if any(abs(x - cx) < 30 and abs(y - cy) < 30 for cx, cy in CROSSES): continue
            r, g, b = px[x, y]; tot += 1
            if not (g > 200 and r < 70 and b < 70): bad += 1
    C['key_border'] = {'ok': bad / max(1, tot) < 0.01, 'off_key_share': round(bad / max(1, tot), 4)}
    pm, tm = key_mask(im), key_mask(tpl)
    tbox = tm.getbbox()  # the template head's box
    if kind == 'head':
        # the skull, ear and nape are shared by every face: the back 55 % of the head's width must match closely
        x0, y0, x1, y1 = tbox; back = (x0, y0, x0 + int((x1 - x0) * 0.55), y1)
        a, b = pm.crop(back), tm.crop(back)
        inter = ImageChops.multiply(a, b).histogram()[255]; union = ImageChops.lighter(a, b).histogram()[255]
        iou = inter / max(1, union); C['skull_match'] = {'ok': iou >= 0.96, 'iou': round(iou, 3)}
        whole = ImageChops.multiply(pm, tm).histogram()[255] / max(1, ImageChops.lighter(pm, tm).histogram()[255])
        C['head_overall'] = {'ok': whole >= 0.80, 'iou': round(whole, 3)}
    else:
        # hair / beard / cap: the piece must sit on the template's head (within a band round it) and, for hair and the cap,
        # stay off the face (the front 30 % of the head below the brow)
        near = tm.filter(ImageFilter.MaxFilter(121 if kind != 'beard' else 61))
        total = pm.histogram()[255]; inside = ImageChops.multiply(pm, near).histogram()[255]
        C['on_the_head'] = {'ok': total > 2000 and inside / max(1, total) >= 0.97, 'share_near_head': round(inside / max(1, total), 3), 'pixels': total}
        if kind in ('hair', 'cap'):
            x0, y0, x1, y1 = tbox; face = (x0 + int((x1 - x0) * 0.7), y0 + int((y1 - y0) * 0.42), x1 + 40, y1)
            fz = pm.crop(face).histogram()[255]; C['off_the_face'] = {'ok': fz / max(1, total) < 0.02, 'share_on_face': round(fz / max(1, total), 3)}
    ov = Image.blend(tpl, im, 0.5); ov.save(os.path.splitext(piece)[0] + '_overlay.png')
    rep['passed'] = all(v['ok'] for v in C.values()); print(json.dumps(rep, indent=1)); sys.exit(0 if rep['passed'] else 1)

if __name__ == '__main__': main()
