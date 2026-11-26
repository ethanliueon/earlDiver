#!/usr/bin/env python3
"""(7.6.49, owner) the inside of the bag's gear slots, painted once: deep water seen through the well (light from far
above, darker below, a little sea snow), and a few hairline cracks in the steel. The first skill slot, the only one that
takes a mythical scroll, gets more: deeper water, more cracks and a worn seal pressed into its back.

    python3 tools/slot_wells.py   -> assets/ui/olive/slot_deep.png, slot_myth.png
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
    k = y ** 0.8
    rgb = np.array(top)[None, None, :] * (1 - k[..., None]) + np.array(bot)[None, None, :] * k[..., None]
    shaft = np.exp(-((x + 0.25 - y * 0.35) ** 2) / 0.08) * (1 - y) * light  # a faint slant of light from far above
    n = (noise(rng, 18) - 0.5) * 0.05 + (noise(rng, 5) - 0.5) * 0.025
    rgb = rgb * (1 + n[..., None]) + shaft[..., None] * np.array([40, 62, 66])[None, None, :]
    vig = 1 - 0.45 * np.clip((np.abs(x) ** 2 + (np.abs(y - 0.45) * 1.6) ** 2), 0, 1)  # darker into the corners of the well
    return np.clip(rgb * vig[..., None], 0, 255)


def snow(d, rng, n):
    for _ in range(n):
        x, y, r = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(0.5, 1.1)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(190, 204, 198, int(rng.uniform(18, 60))))


def cracks(d, rng, n, reach):
    for _ in range(n):
        side = rng.integers(4)  # a crack runs in from an edge of the well
        x, y = [(rng.uniform(10, W - 10), 2), (W - 2, rng.uniform(10, H - 10)), (rng.uniform(10, W - 10), H - 2), (2, rng.uniform(10, H - 10))][side]
        a = [math.pi / 2, math.pi, -math.pi / 2, 0][side] + rng.uniform(-0.5, 0.5); pts = [(x, y)]
        for _ in range(int(rng.integers(4, reach))):
            a += rng.uniform(-0.55, 0.55); x += math.cos(a) * rng.uniform(5, 10); y += math.sin(a) * rng.uniform(5, 10); pts.append((x, y))
            if rng.random() < 0.18:  # a short branch
                b = a + rng.choice([-1, 1]) * rng.uniform(0.6, 1.1); bx, by = x + math.cos(b) * rng.uniform(5, 12), y + math.sin(b) * rng.uniform(5, 12)
                d.line([(x, y), (bx, by)], fill=(2, 4, 5, 200), width=1)
        d.line([(px + 0.8, py + 0.8) for px, py in pts], fill=(150, 170, 165, 30), width=1)  # the lit lip of the crack
        d.line(pts, fill=(2, 4, 5, 230), width=1)


def well(name, seed, top, bot, light, n_snow, n_cracks, reach, seal=False):
    rng = np.random.default_rng(seed)
    im = Image.fromarray(water(rng, top, bot, light).astype(np.uint8), 'RGB').convert('RGBA')
    d = ImageDraw.Draw(im, 'RGBA')
    if seal:  # a worn seal pressed into the back of the well: two rings and a heart, faint, softened by the water
        L = Image.new('RGBA', im.size, (0, 0, 0, 0)); e = ImageDraw.Draw(L, 'RGBA'); cx, cy, r = W / 2, H * 0.46, 46
        for rr in (r, r - 7):
            e.ellipse([cx - rr + 1, cy - rr + 1, cx + rr + 1, cy + rr + 1], outline=(150, 170, 160, 34), width=2)
            e.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(1, 4, 5, 150), width=2)
        hp = []
        for i in range(60):
            t = i / 60 * 2 * math.pi; hx = 16 * math.sin(t) ** 3; hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
            hp.append((cx + hx * 1.25, cy + hy * 1.25 + 2))
        e.line([(x + 1, y + 1) for x, y in hp + [hp[0]]], fill=(150, 170, 160, 30), width=3); e.line(hp + [hp[0]], fill=(1, 4, 5, 140), width=3)
        im = Image.alpha_composite(im, L.filter(ImageFilter.GaussianBlur(0.9))); d = ImageDraw.Draw(im, 'RGBA')
    L2 = Image.new('RGBA', im.size, (0, 0, 0, 0)); d2 = ImageDraw.Draw(L2, 'RGBA'); snow(d2, rng, n_snow); cracks(d2, rng, n_cracks, reach)
    im = Image.alpha_composite(im, L2)
    im = im.filter(ImageFilter.GaussianBlur(0.35))
    im.save(os.path.join(OUT, name), optimize=True); print(name, im.size)


if __name__ == '__main__':
    well('slot_deep.png', 7, (24, 46, 54), (6, 13, 17), 0.55, 18, 2, 8)
    well('slot_myth.png', 19, (20, 38, 46), (4, 9, 12), 0.7, 26, 4, 11, seal=True)
