#!/usr/bin/env python3
"""(7.6.24, owner) The seabed's textures by zone, each a seamless 512 px tile laid over the floor's colour by multiplying
(near white leaves the colour as it is; darker parts shade it). The sandy shelf is tools/seabed_tex.py (seabed.png);
these are the rest, shallow to deep:

    kelp    darker sand under the kelp: holdfast scars, drift weed, more broken shell
    slope   grey-brown silt on the drop: soft layers, burrow holes, a few slumps, little shell
    ooze    the deep plain: fine soft ooze, worm tracks wandering over it, sparse pale specks
    trench  dark broken rock and gravel, cracks, mineral veins

    python3 tools/seabed_zones.py   -> assets/textures/seabed_<zone>.png
"""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

N = 512
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'textures')


def periodic_noise(rng, scale, octaves=4, amp_fall=0.5):
    """value noise that tiles: random grids upsampled with wrap-around"""
    out = np.zeros((N, N)); amp = 1.0; tot = 0
    for o in range(octaves):
        g = max(2, int(N / scale * (2 ** o)))
        grid = rng.random((g, g))
        img = Image.fromarray((grid * 255).astype(np.uint8))
        tiled = Image.new('L', (g * 3, g * 3))
        for i in range(3):
            for j in range(3): tiled.paste(img, (i * g, j * g))
        big = tiled.resize((N * 3, N * 3), Image.BICUBIC).crop((N, N, 2 * N, 2 * N))
        out += amp * (np.asarray(big, np.float32) / 255 - 0.5); tot += amp; amp *= amp_fall
    return out / tot


def to_img(L, warm=(1.0, 0.97, 0.9), blur=0.6):
    img = np.clip(L, 0, 1)
    rgb = np.dstack([img * warm[0], img * warm[1], img * warm[2]])
    return Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(blur))


def wrap(d, fn, cx, cy):
    for ox in (-N, 0, N):
        for oy in (-N, 0, N): fn(d, cx + ox, cy + oy)


def grains(rng, L, dark=0.93, light=0.025, dmin=0.06, dmax=0.2):
    gr = rng.random((N, N))
    L -= (gr > dark) * rng.uniform(dmin, dmax, (N, N))
    L += (gr < light) * rng.uniform(0.03, 0.08, (N, N))
    return L


def kelp(rng):
    y, x = np.mgrid[0:N, 0:N] / N
    warp = periodic_noise(rng, 150, 3) * 2.0
    lay = np.sin((y * 6 + x + warp * 1.4) * 2 * np.pi) * np.clip(periodic_noise(rng, 120, 3) * 3 + 0.3, 0, 1)
    L = 0.76 + 0.03 * lay + 0.12 * periodic_noise(rng, 200, 4) + 0.05 * periodic_noise(rng, 36, 3)
    im = to_img(grains(rng, L), warm=(0.98, 0.97, 0.88))
    d = ImageDraw.Draw(im, 'RGBA')
    # holdfast scars: dark knots where kelp held, with root fingers
    for _ in range(9):
        cx, cy = rng.uniform(0, N, 2)
        roots = [(rng.uniform(0.2, math.pi - 0.2), rng.uniform(4, 9)) for _ in range(int(rng.integers(3, 5)))]
        def hold(d, px, py, roots=roots):
            for a, r in roots: d.line([px, py, px + math.cos(a) * r, py + math.sin(a) * r * 0.6], fill=(70, 66, 48, 60), width=2)
            d.ellipse([px - 7, py - 3, px + 7, py + 3], fill=(66, 62, 44, 80)); d.ellipse([px - 4, py - 2, px + 4, py + 2], fill=(60, 56, 40, 90))
        wrap(d, hold, cx, cy)
    # drift weed: thin olive strands lying on the sand
    for _ in range(14):
        cx, cy = rng.uniform(0, N, 2); a = rng.uniform(0, math.pi); ln = rng.uniform(18, 46); bend = rng.uniform(-0.5, 0.5)
        def weed(d, px, py, a=a, ln=ln, bend=bend):
            pts = [(px + math.cos(a + bend * t) * ln * t, py + math.sin(a + bend * t) * ln * t * 0.5) for t in np.linspace(0, 1, 8)]
            d.line(pts, fill=(96, 100, 58, 150), width=3); d.line(pts, fill=(140, 140, 84, 90), width=1)
        wrap(d, weed, cx, cy)
    # broken shell
    for _ in range(36):
        cx, cy = rng.uniform(0, N, 2); r = rng.uniform(2.5, 6); a0 = rng.uniform(0, 360)
        def shell(d, px, py, r=r, a0=a0): d.arc([px - r, py - r, px + r, py + r], a0, a0 + 150, fill=(250, 244, 228, 220), width=2)
        wrap(d, shell, cx, cy)
    return im


def slope(rng):
    y, x = np.mgrid[0:N, 0:N] / N
    warp = periodic_noise(rng, 180, 3) * 2.4
    lay = np.sin((y * 5 + x * 0.6 + warp * 1.2) * 2 * np.pi) * np.clip(periodic_noise(rng, 140, 3) * 3 + 0.2, 0, 1)
    slump = np.clip(periodic_noise(rng, 200, 3) * 4 - 0.6, 0, 1)  # soft darker patches where silt slid
    L = 0.8 + 0.025 * lay + 0.1 * periodic_noise(rng, 230, 4) + 0.03 * periodic_noise(rng, 50, 2) - 0.08 * slump
    im = to_img(grains(rng, L, dark=0.95, dmax=0.12), warm=(0.96, 0.95, 0.9), blur=0.9)
    d = ImageDraw.Draw(im, 'RGBA')
    # burrow holes: a dark mouth with a lighter rim of thrown-up silt
    for _ in range(26):
        cx, cy = rng.uniform(0, N, 2); r = rng.uniform(1.8, 4.2)
        def hole(d, px, py, r=r):
            d.ellipse([px - r * 1.8, py - r * 0.9, px + r * 1.8, py + r * 0.9], fill=(236, 232, 220, 80))
            d.ellipse([px - r, py - r * 0.55, px + r, py + r * 0.55], fill=(52, 48, 42, 190))
        wrap(d, hole, cx, cy)
    for _ in range(8):
        cx, cy = rng.uniform(0, N, 2); r = rng.uniform(2, 4); a0 = rng.uniform(0, 360)
        def shell(d, px, py, r=r, a0=a0): d.arc([px - r, py - r, px + r, py + r], a0, a0 + 130, fill=(238, 232, 214, 170), width=1)
        wrap(d, shell, cx, cy)
    return im


def ooze(rng):
    L = 0.84 + 0.07 * periodic_noise(rng, 260, 4) + 0.02 * periodic_noise(rng, 60, 2)
    im = to_img(grains(rng, L, dark=0.97, light=0.01, dmax=0.08), warm=(0.95, 0.96, 0.94), blur=1.1)
    d = ImageDraw.Draw(im, 'RGBA')
    # worm tracks: thin meandering furrows, a darker groove with a pale lip
    for _ in range(11):
        px, py = rng.uniform(0, N, 2); a = rng.uniform(0, 2 * math.pi); pts = []
        for _ in range(60):
            a += rng.uniform(-0.35, 0.35); px += math.cos(a) * 3; py += math.sin(a) * 1.6; pts.append((px, py))
        def track(d, ox, oy, pts=pts, sx=pts[0][0], sy=pts[0][1]):
            q = [(x - sx + ox, y - sy + oy) for x, y in pts]
            d.line([(x, y + 1) for x, y in q], fill=(240, 238, 228, 90), width=2); d.line(q, fill=(70, 70, 64, 120), width=1)
        wrap(d, track, pts[0][0], pts[0][1])
    # sparse pale specks: sea snow come to rest
    for _ in range(70):
        cx, cy = rng.uniform(0, N, 2); r = rng.uniform(0.6, 1.4)
        def speck(d, px, py, r=r): d.ellipse([px - r, py - r, px + r, py + r], fill=(252, 250, 244, 160))
        wrap(d, speck, cx, cy)
    return im


def trench(rng):
    L = 0.6 + 0.14 * periodic_noise(rng, 160, 4) + 0.06 * periodic_noise(rng, 30, 3)
    im = to_img(grains(rng, L, dark=0.9, light=0.04, dmax=0.22), warm=(0.94, 0.93, 0.92), blur=0.5)
    d = ImageDraw.Draw(im, 'RGBA')
    # gravel: small angular stones, lit on top, a shadow under
    for _ in range(140):
        cx, cy = rng.uniform(0, N, 2); r = rng.uniform(1.5, 5); n = int(rng.integers(4, 7))
        poly = [(math.cos(2 * math.pi * k / n + rng.uniform(-0.3, 0.3)) * r * rng.uniform(0.7, 1.2), math.sin(2 * math.pi * k / n) * r * 0.75) for k in range(n)]
        tone = int(rng.uniform(70, 130))
        def stone(d, px, py, poly=poly, tone=tone):
            d.polygon([(px + x + 1, py + y + 1.5) for x, y in poly], fill=(20, 20, 20, 110))
            d.polygon([(px + x, py + y) for x, y in poly], fill=(tone, tone - 2, tone - 6, 255))
            d.line([(px + x, py + y) for x, y in poly[:2]], fill=(200, 196, 186, 90), width=1)
        wrap(d, stone, cx, cy)
    # cracks across the rock
    for _ in range(9):
        px, py = rng.uniform(0, N, 2); a = rng.uniform(0, 2 * math.pi); pts = [(px, py)]
        for _ in range(int(rng.integers(6, 14))):
            a += rng.uniform(-0.6, 0.6); px += math.cos(a) * 9; py += math.sin(a) * 5; pts.append((px, py))
        def crack(d, ox, oy, pts=pts, sx=pts[0][0], sy=pts[0][1]):
            d.line([(x - sx + ox, y - sy + oy) for x, y in pts], fill=(18, 18, 18, 170), width=2)
        wrap(d, crack, pts[0][0], pts[0][1])
    # mineral veins: rust and pale streaks
    for _ in range(7):
        px, py = rng.uniform(0, N, 2); a = rng.uniform(-0.4, 0.4); ln = rng.uniform(40, 110); col = (150, 92, 54, 110) if rng.random() < 0.6 else (220, 214, 196, 90)
        def vein(d, ox, oy, a=a, ln=ln, col=col): d.line([ox, oy, ox + math.cos(a) * ln, oy + math.sin(a) * ln * 0.5], fill=col, width=2)
        wrap(d, vein, px, py)
    return im


if __name__ == '__main__':
    for name, fn, seed in [('kelp', kelp, 31), ('slope', slope, 47), ('ooze', ooze, 59), ('trench', trench, 73)]:
        im = fn(np.random.default_rng(seed))
        im.save(os.path.join(OUT, f'seabed_{name}.png'), optimize=True)
        print(f'seabed_{name}.png', im.size)
