#!/usr/bin/env python3
"""(7.6.49-50, owner) the inside of the bag's gear slots, painted once: dark water seen through the well, no shaft of
light (every slot had the same one, a row of identical rays): the light uneven and soft, each slot its own; tiny sharp
specks of sea snow, the odd one drawn out as it sinks; a few hairline cracks in the steel. Four variants, so no two
neighbouring slots match. The first skill slot, the only one that takes a mythical scroll, gets deeper water, more
cracks and a worn seal pressed into its back, cut unevenly by hand: rings broken where the steel has worn, a heart
that is not quite symmetrical.

    python3 tools/slot_wells.py   -> assets/ui/olive/slot_deep1..4.png, slot_myth.png
"""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'assets', 'ui', 'olive')
W, H = 176, 216


def noise(rng, scale):
    g = rng.random((max(2, H // scale), max(2, W // scale)))
    return np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255


def water(rng, top, bot, light):
    y = np.linspace(0, 1, H)[:, None]; x = np.linspace(-1, 1, W)[None, :]
    k = y ** 0.9
    rgb = np.array(top)[None, None, :] * (1 - k[..., None]) + np.array(bot)[None, None, :] * k[..., None]
    glow = np.clip(noise(rng, 70) - 0.45, 0, 1) * (1 - y) * light  # uneven light coming down through the water, soft and patchy
    n = (noise(rng, 22) - 0.5) * 0.07 + (noise(rng, 6) - 0.5) * 0.035 + (noise(rng, 2) - 0.5) * 0.02
    rgb = rgb * (1 + n[..., None]) + glow[..., None] * np.array([34, 54, 58])[None, None, :]
    vig = 1 - 0.5 * np.clip((np.abs(x) ** 2.2 + (np.abs(y - 0.42) * 1.5) ** 2), 0, 1)
    return np.clip(rgb * vig[..., None], 0, 255)


def snow(d, rng, n):
    for _ in range(n):
        x, y = rng.uniform(2, W - 2), rng.uniform(2, H - 2); a = int(rng.uniform(40, 120)); c = (196, 208, 200)
        if rng.random() < 0.2: d.line([(x, y), (x + rng.uniform(-0.6, 0.6), y + rng.uniform(1.5, 3))], fill=c + (a // 2,), width=1)  # sinking: drawn out
        elif rng.random() < 0.25: d.rectangle([x, y, x + 1, y + 1], fill=c + (a,))
        else: d.point((x, y), fill=c + (a,))


def crack_path(rng, x, y, a, steps, step=(4, 9)):
    pts = [(x, y)]
    for _ in range(steps):
        a += rng.uniform(-0.6, 0.6); x += math.cos(a) * rng.uniform(*step); y += math.sin(a) * rng.uniform(*step); pts.append((x, y))
    return pts, a


def cracks(d, rng, n, reach):
    for _ in range(n):
        side = rng.integers(4)
        x, y = [(rng.uniform(10, W - 10), 1), (W - 1, rng.uniform(10, H - 10)), (rng.uniform(10, W - 10), H - 1), (1, rng.uniform(10, H - 10))][side]
        a = [math.pi / 2, math.pi, -math.pi / 2, 0][side] + rng.uniform(-0.5, 0.5)
        pts, _ = crack_path(rng, x, y, a, int(rng.integers(3, reach)))
        for i in range(1, len(pts) - 1):
            if rng.random() < 0.22: br, _ = crack_path(rng, *pts[i], a + rng.choice([-1, 1]) * rng.uniform(0.7, 1.2), int(rng.integers(1, 3)), (3, 7)); d.line(br, fill=(2, 4, 5, 170), width=1)
        d.line([(px + 0.7, py + 0.9) for px, py in pts], fill=(150, 170, 165, 26), width=1)
        d.line(pts, fill=(2, 4, 5, 220), width=1)


def seal(rng):
    """a worn seal pressed into steel, cut by hand: two broken rings that wander a little, a lopsided heart, nicks"""
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); e = ImageDraw.Draw(L, 'RGBA'); cx, cy = W / 2 + 2, H * 0.46
    def ring(r, wob, gaps):
        ph = rng.uniform(0, 6.3); segs = []; cur = []
        for i in range(181):
            t = i / 180 * 2 * math.pi
            if any(g0 < t < g1 for g0, g1 in gaps): (segs.append(cur) if len(cur) > 1 else None); cur = []; continue
            rr = r + wob * math.sin(3 * t + ph) + wob * 0.6 * math.sin(7 * t + ph * 2) + rng.uniform(-0.3, 0.3)
            cur.append((cx + rr * math.cos(t), cy + rr * math.sin(t) * 1.02))
        if len(cur) > 1: segs.append(cur)
        return segs
    def gaps(n):
        out = []
        for _ in range(n): g = rng.uniform(0, 2 * math.pi); out.append((g, g + rng.uniform(0.12, 0.45)))
        return out
    for r, w in ((46, 1.3), (38, 1.0)):
        for s in ring(r, w, gaps(3)):
            e.line([(x + 1, y + 1) for x, y in s], fill=(150, 170, 160, 30), width=2); e.line(s, fill=(1, 4, 5, 150), width=2)
    hp = []
    for i in range(72):
        t = i / 72 * 2 * math.pi; hx = 16 * math.sin(t) ** 3; hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        lop = 1.08 if hx < 0 else 0.95  # one lobe a little fuller
        hp.append((cx + hx * 1.2 * lop + rng.uniform(-0.5, 0.5), cy + hy * 1.18 + 1 + (1.5 if hx > 0 else 0) * (hy < 0) + rng.uniform(-0.5, 0.5)))
    cut = int(rng.integers(10, 60)); hs = hp[cut:] + hp[:cut - 3]  # a short break where the die wore
    e.line([(x + 1, y + 1) for x, y in hs], fill=(150, 170, 160, 26), width=3); e.line(hs, fill=(1, 4, 5, 140), width=3)
    for _ in range(5):  # nicks in the face of the seal
        a = rng.uniform(0, 2 * math.pi); r = rng.uniform(20, 44); x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        e.line([(x, y), (x + rng.uniform(-3, 3), y + rng.uniform(-3, 3))], fill=(1, 4, 5, 110), width=1)
    return L.filter(ImageFilter.GaussianBlur(0.7))


def well(name, seed, top, bot, light, n_snow, n_cracks, reach, with_seal=False):
    rng = np.random.default_rng(seed)
    im = Image.fromarray(water(rng, top, bot, light).astype(np.uint8), 'RGB').convert('RGBA').filter(ImageFilter.GaussianBlur(0.3))
    if with_seal: im = Image.alpha_composite(im, seal(rng))
    L2 = Image.new('RGBA', im.size, (0, 0, 0, 0)); d2 = ImageDraw.Draw(L2, 'RGBA'); cracks(d2, rng, n_cracks, reach); snow(d2, rng, n_snow)
    im = Image.alpha_composite(im, L2)
    im.save(os.path.join(OUT, name), optimize=True); print(name, im.size)


if __name__ == '__main__':
    tones = [((22, 42, 50), (6, 12, 16)), ((20, 40, 46), (5, 11, 14)), ((24, 44, 50), (7, 13, 16)), ((21, 40, 48), (6, 12, 15))]
    for i, (top, bot) in enumerate(tones):
        well(f'slot_deep{i + 1}.png', 101 + i * 17, top, bot, 0.5, 34, 2 + i % 2, 7)
    well('slot_myth.png', 23, (18, 36, 44), (4, 9, 12), 0.6, 40, 4, 10, with_seal=True)
