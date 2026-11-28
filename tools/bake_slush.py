#!/usr/bin/env python3
"""(7.9.0, owner) Bake the ice V slush of the second sea's deepest water into PNGs.

Reference: frazil ice, the slush that forms in supercooled water: thin platelets (hexagonal discs a fraction of a
millimetre to a few millimetres across, seen face-on as clear plates, edge-on as slivers), needles, and loose flocs of
several plates frozen together. Under pressure the ice that forms is ice V, denser than the water, so it sinks and
settles: a slow snow of glassy flakes that thickens to slush and a mush on the floor. Nothing glows; the flakes are
clear, and only a face turned to a lamp catches its light.

Outputs (assets/textures/):
  slush_far.png    512x512 tileable: a sparse field of tiny, sharp flakes (the water a metre or two off)
  slush_soft.png   512x512 tileable: larger, out-of-focus flakes (close to the lens, or far behind)
  slush_mush.png   512x512 tileable: the dense grain of slush near the floor, a cloudy milky body with grains in it
  ice_pieces.png   atlas, 8 columns x 3 rows of 64 px: the near pieces, matte (row 0), with a lit facet (row 1),
                   and out of focus (row 2)
Usage: python3 tools/bake_slush.py
"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'textures')
SS = 4  # supersampling for clean, soft edges
ICE = (214, 230, 238)        # clear ice catching dim light: pale, faintly blue
EDGE = (236, 244, 248)
rnd = random.Random(44444)


def hexagon(cx, cy, r, ang, squash=1.0, jitter=0.08):
    pts = []
    for k in range(6):
        a = ang + k * math.pi / 3
        rr = r * (1 + (rnd.random() - 0.5) * jitter * 2)
        px, py = math.cos(a) * rr, math.sin(a) * rr * squash
        ca, sa = math.cos(ang * 0.3), math.sin(ang * 0.3)
        pts.append((cx + px * ca - py * sa, cy + px * sa + py * ca))
    return pts


def draw_platelet(d, cx, cy, r, ang, tilt, alpha, glint=False):
    """a thin plate of clear ice: tilt 1 face-on, towards 0 edge-on (a sliver). Clear: the body barely there, a sheen
    across one side where it bends the light, the rim catching light; irregular, and now and then a corner broken off"""
    pts = hexagon(cx, cy, r, ang, squash=max(0.08, tilt), jitter=0.16)
    if rnd.random() < 0.3:  # a broken corner
        k = rnd.randrange(6); a, b = pts[k], pts[(k + 1) % 6]; m = ((a[0] + b[0]) / 2 + (cx - (a[0] + b[0]) / 2) * 0.35, (a[1] + b[1]) / 2 + (cy - (a[1] + b[1]) / 2) * 0.35)
        pts = pts[:k + 1] + [m] + pts[k + 1:]
    body = int(alpha * (0.1 + 0.22 * (1 - tilt)))     # edge-on reads denser
    d.polygon(pts, fill=ICE + (body,))
    # the sheen: a smaller copy pushed toward one side, a touch brighter
    sh = [(cx + (px - cx) * 0.55 + r * 0.18, cy + (py - cy) * 0.55 - r * 0.12 * tilt) for px, py in pts]
    d.polygon(sh, fill=EDGE + (int(body * 0.9),))
    d.line(pts + [pts[0]], fill=EDGE + (int(alpha * 0.5),), width=max(1, int(SS * 0.45)))
    if glint:  # one facet turned to the light: a bright sliver along an edge, never a star
        k = rnd.randrange(len(pts))
        d.line([pts[k], pts[(k + 1) % len(pts)]], fill=(255, 255, 255, int(min(255, alpha * 1.5))), width=max(2, int(SS * 0.9)))


def draw_needle(d, cx, cy, ln, ang, alpha, glint=False):
    dx, dy = math.cos(ang) * ln / 2, math.sin(ang) * ln / 2
    d.line([(cx - dx, cy - dy), (cx + dx, cy + dy)], fill=EDGE + (int(alpha * 0.8),), width=max(1, int(SS * 0.7)))
    if glint:
        d.line([(cx - dx * 0.3, cy - dy * 0.3), (cx + dx * 0.2, cy + dy * 0.2)], fill=(255, 255, 255, int(min(255, alpha * 1.6))), width=max(2, SS))


def piece(kind, size, glint):
    """one near piece on a 64 px cell"""
    S = 64 * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = S / 2
    if kind == 'plate':
        draw_platelet(d, c, c, size * S * 0.36, rnd.random() * 6.28, 0.55 + rnd.random() * 0.45, 230, glint)
    elif kind == 'sliver':
        draw_platelet(d, c, c, size * S * 0.4, rnd.random() * 6.28, 0.1 + rnd.random() * 0.12, 240, glint)
    elif kind == 'needle':
        draw_needle(d, c, c, size * S * 0.8, rnd.random() * 6.28, 230, glint)
    else:  # a floc: several plates and slivers frozen together, loosely
        n = rnd.randint(3, 6)
        for i in range(n):
            ox, oy = (rnd.random() - 0.5) * S * 0.36 * size, (rnd.random() - 0.5) * S * 0.36 * size
            draw_platelet(d, c + ox, c + oy, S * (0.1 + rnd.random() * 0.12) * size, rnd.random() * 6.28, 0.15 + rnd.random() * 0.8, 200, glint and i == 0)
    return im.resize((64, 64), Image.LANCZOS)


def atlas():
    kinds = ['plate', 'plate', 'sliver', 'sliver', 'needle', 'floc', 'floc', 'plate']
    sizes = [0.9, 0.6, 0.9, 0.6, 0.8, 1.0, 0.75, 0.4]
    A = Image.new('RGBA', (64 * 8, 64 * 3), (0, 0, 0, 0))
    for i, (k, s) in enumerate(zip(kinds, sizes)):
        st = rnd.getstate()
        m = piece(k, s, False)
        rnd.setstate(st)                     # the lit version is the same piece
        gl = piece(k, s, True)
        A.paste(m, (i * 64, 0))
        A.paste(gl, (i * 64, 64))
        blur = m.filter(ImageFilter.GaussianBlur(3.2))
        arr = np.array(blur).astype(np.float32)
        arr[..., 3] = np.clip(arr[..., 3] * 1.6, 0, 255)   # out of focus: wider, softer, a little fainter in the middle
        A.paste(Image.fromarray(arr.astype(np.uint8)), (i * 64, 128))
    A.save(os.path.join(OUT, 'ice_pieces.png'))


def field(name, n, rmin, rmax, alpha, blur=0.0, size=512):
    """a tileable field of tiny flakes: each drawn at its place and wrapped across the edges"""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(n):
        x, y = rnd.random() * S, rnd.random() * S
        r = (rmin + (rmax - rmin) * rnd.random() ** 2.2) * SS     # most flakes tiny, a few larger
        ang, tilt = rnd.random() * 6.28, rnd.random() ** 0.7
        a = alpha * (0.5 + 0.5 * rnd.random())
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                cx, cy = x + ox, y + oy
                if -r * 3 < cx < S + r * 3 and -r * 3 < cy < S + r * 3:
                    if rnd.random() < 0.15:
                        draw_needle(d, cx, cy, r * 3, ang, a)
                    else:
                        draw_platelet(d, cx, cy, r, ang, max(0.08, tilt), a, glint=rnd.random() < 0.04)
    im = im.resize((size, size), Image.LANCZOS)
    if blur:
        # blur with wrap: tile 3x3, blur, cut the middle
        big = Image.new('RGBA', (size * 3, size * 3))
        for ox in range(3):
            for oy in range(3):
                big.paste(im, (ox * size, oy * size))
        im = big.filter(ImageFilter.GaussianBlur(blur)).crop((size, size, size * 2, size * 2))
    im.save(os.path.join(OUT, name))


def mush(size=512):
    """the slush near the floor: a milky veil, only gently uneven (it is a suspension, not smoke), packed with fine grain"""
    def tile_noise(scale, seed):
        g = np.random.default_rng(seed)
        n = max(2, size // scale)
        base = g.random((n, n)).astype(np.float32)
        big = np.tile(base, (3, 3))                       # tiled 3x3 and cut from the middle: the edges match, no seam
        img = Image.fromarray((big * 255).astype(np.uint8)).resize((size * 3, size * 3), Image.BICUBIC).crop((size, size, size * 2, size * 2))
        return np.array(img).astype(np.float32) / 255
    body = 0.6 * tile_noise(128, 1) + 0.4 * tile_noise(40, 2)
    a = (54 + body * 46).astype(np.uint8)                   # 54-100 of 255: an even veil, barely mottled
    rgb = np.zeros((size, size, 3), np.uint8); rgb[..., 0] = 196; rgb[..., 1] = 210; rgb[..., 2] = 218
    im = Image.fromarray(np.dstack([rgb, a]), 'RGBA')
    S = size * SS
    gr = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(gr)
    for i in range(9000):
        x, y, r = rnd.random() * S, rnd.random() * S, (0.4 + rnd.random() ** 3 * 1.4) * SS
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                if -8 * SS < x + ox < S + 8 * SS and -8 * SS < y + oy < S + 8 * SS:
                    draw_platelet(d, x + ox, y + oy, r, rnd.random() * 6.28, rnd.random(), 140, glint=rnd.random() < 0.015)
    gr = gr.resize((size, size), Image.LANCZOS)
    im.alpha_composite(gr)
    im.save(os.path.join(OUT, 'slush_mush.png'))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    atlas()
    field('slush_far.png', 900, 0.6, 2.4, 170)
    field('slush_soft.png', 140, 2.5, 7.0, 120, blur=3.0)
    mush()
    print('baked: ice_pieces.png, slush_far.png, slush_soft.png, slush_mush.png')
