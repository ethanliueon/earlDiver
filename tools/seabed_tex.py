#!/usr/bin/env python3
"""(7.4.17, owner; 7.4.28 wavier) The seabed's own texture: a seamless 512 px tile of sand, painted as sand looks close to, seen from
the side: thin wavy layers, grains light and dark, a few pebbles and broken shell. Near white, so it is laid over the floor's colour by
multiplying (its light parts leave the colour as it is, its dark parts shade it).

    python3 tools/seabed_tex.py            -> assets/textures/seabed.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

N = 512
rng = np.random.default_rng(20261124)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'textures', 'seabed.png')

def periodic_noise(scale, octaves=4, amp_fall=0.5):
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

y, x = np.mgrid[0:N, 0:N] / N
warp = periodic_noise(160, 3) * 2.2 + periodic_noise(60, 2) * 0.6
# (7.4.28, owner) no ruled lines: the layers undulate, swell and pinch out, and sets of them lie at slight angles
# (cross-bedding) in some patches; ripple marks only here and there
ph = (y * 7 + x * 1 + warp * 1.6) * 2 * np.pi
rip = np.sin(ph); rip = np.where(rip > 0, np.abs(rip) ** 0.7, -(np.abs(rip) ** 1.6) * 0.6)
fade = np.clip(periodic_noise(120, 3) * 3 + 0.35, 0, 1)            # the layers show in places and fade out in others
cb_ph = (y * 11 - x * 4 + warp * 0.8) * 2 * np.pi; cross = np.sin(cb_ph) * np.clip(periodic_noise(140, 2) * 4 - 0.3, 0, 1)
mott = periodic_noise(220, 4)  # large mottling: patches of darker and lighter sand
mud = np.clip(periodic_noise(180, 3) * 5 - 0.9, 0, 1)                 # darker silt patches
L = 0.84 + 0.04 * rip * fade + 0.025 * cross + 0.13 * mott + 0.05 * periodic_noise(40, 3) - 0.09 * mud
# grains: fine speckle, mostly dark, some bright
gr = rng.random((N, N))
L -= (gr > 0.93) * rng.uniform(0.06, 0.2, (N, N))
L += (gr < 0.025) * rng.uniform(0.04, 0.1, (N, N))
img = np.clip(L, 0, 1)
rgb = np.dstack([img * 1.0, img * 0.97, img * 0.9])  # a faint warmth
im = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').filter(ImageFilter.GaussianBlur(0.6))
d = ImageDraw.Draw(im, 'RGBA')

def wrap_draw(fn, cx, cy):
    for ox in (-N, 0, N):
        for oy in (-N, 0, N): fn(cx + ox, cy + oy)

# pebbles: small, rounded, darker, with a lit top and a shadow under
for _ in range(46):
    cx, cy = rng.uniform(0, N, 2); r = rng.uniform(1.5, 4) if rng.random() < 0.7 else rng.uniform(5, 10); rx, ry = r * rng.uniform(1, 1.5), r
    tone = int(rng.uniform(120, 175))
    def peb(px, py, rx=rx, ry=ry, tone=tone):
        d.ellipse([px - rx + 1, py - ry + 2, px + rx + 1, py + ry + 2], fill=(60, 54, 44, 70))
        d.ellipse([px - rx, py - ry, px + rx, py + ry], fill=(tone, tone - 6, tone - 16, 255))
        d.ellipse([px - rx * 0.6, py - ry * 0.75, px + rx * 0.2, py - ry * 0.1], fill=(255, 250, 235, 60))
    wrap_draw(peb, cx, cy)
# broken shell: pale arcs and flakes
for _ in range(30):
    cx, cy = rng.uniform(0, N, 2); r = rng.uniform(3, 7); a0 = rng.uniform(0, 360)
    def shell(px, py, r=r, a0=a0):
        d.arc([px - r, py - r, px + r, py + r], a0, a0 + rng.uniform(100, 200), fill=(250, 244, 230, 230), width=2)
        d.arc([px - r + 1, py - r + 2, px + r + 1, py + r + 2], a0, a0 + 120, fill=(90, 80, 64, 60), width=1)
    wrap_draw(shell, cx, cy)
im.save(OUT, optimize=True)
print('seabed.png', im.size)
