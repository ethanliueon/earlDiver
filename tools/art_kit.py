#!/usr/bin/env python3
"""Paints the weathering laid over the boat and the submersibles (assets/art/*.png).

    python3 tools/art_kit.py

The hulls are drawn as clean shapes in code; these seamless tiles are laid over them (only where the hull is:
the game uses 'source-atop') so they read as painted steel that has been at sea: grime settling in blotches,
rust weeping down from fittings, salt bloom, scuffs and chipped paint. Fixed seed, the same art every run.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from ui_kit import noise  # the same exactly-tiling value noise as the UI kit

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'art')
os.makedirs(OUT, exist_ok=True)


def wrap_draw(d, w, h, fn):
    for ox in (-w, 0, w):
        for oy in (-h, 0, h):
            fn(d, ox, oy)


def weathering(T=512, seed=5, rust=1.0, salt=1.0, grime=1.0):
    r = random.Random(seed)
    out = np.zeros((T, T, 4), np.float32)

    def lay(rgb, a):  # alpha-over a colour with an alpha map (0..1) onto the layer stack
        a = np.clip(a, 0, 1)[..., None]
        out[..., :3] = out[..., :3] * (1 - a) + np.array(rgb, np.float32) * a
        out[..., 3:] = out[..., 3:] * (1 - a) + a

    # 1. grime: soft dark blotches, two scales
    g = np.clip((noise(T, T, 140, 5, seed) - 0.45) * 2.2, 0, 1) * 0.32 + np.clip((noise(T, T, 30, 3, seed + 1) - 0.6) * 3, 0, 1) * 0.18
    lay((26, 24, 18), g * grime)
    # 2. salt bloom: pale, chalky, patchy
    s = np.clip((noise(T, T, 60, 4, seed + 2) - 0.66) * 3.5, 0, 1) * 0.22
    lay((226, 224, 210), s * salt)
    # 3. weeping rust: streaks that start at a point and run down, fading and thinning, a few with a bead at the top
    im = Image.new('L', (T, T), 0); d = ImageDraw.Draw(im)
    streaks = []
    for _ in range(int(26 * rust)):
        x, y = r.uniform(0, T), r.uniform(0, T); L = r.uniform(40, 190); wdt = r.uniform(2.5, 7)
        streaks.append((x, y, L, wdt, r.uniform(0.45, 1)))
    def draw_streaks(d, ox, oy):
        for x, y, L, wdt, a in streaks:
            steps = 14
            for k in range(steps):
                t0, t1 = k / steps, (k + 1) / steps
                ww = max(1, wdt * (1 - t0 * 0.7))
                d.line([(x + ox + math.sin(t0 * 3 + x) * 1.2, y + oy + L * t0), (x + ox + math.sin(t1 * 3 + x) * 1.2, y + oy + L * t1)], fill=int(255 * a * (1 - t0) ** 1.3), width=int(round(ww)))
    wrap_draw(d, T, T, draw_streaks)
    rs = np.asarray(im.filter(ImageFilter.GaussianBlur(2.6)), np.float32) / 255
    rs *= 0.6 + 0.8 * noise(T, T, 12, 2, seed + 7)  # uneven along their length
    lay((112, 62, 30), rs * 0.32 * rust)
    # 4. scuffs: short pale horizontal rubs (fenders, the cradle, the cable)
    im = Image.new('L', (T, T), 0); d = ImageDraw.Draw(im)
    scuffs = [(r.uniform(0, T), r.uniform(0, T), r.uniform(8, 40), r.uniform(0.3, 0.9)) for _ in range(70)]
    wrap_draw(d, T, T, lambda d, ox, oy: [d.line([(x + ox, y + oy), (x + ox + L, y + oy + r.uniform(-1, 1))], fill=int(255 * a), width=1) for x, y, L, a in scuffs])
    sc = np.asarray(im.filter(ImageFilter.GaussianBlur(0.5)), np.float32) / 255
    lay((210, 206, 192), sc * 0.18)
    # 5. chipped paint: small hard-edged dark flecks with a light rim below (the paint edge catching light)
    chips = np.clip((noise(T, T, 7, 2, seed + 3) - 0.86) * 12, 0, 1)
    chips *= np.clip((noise(T, T, 90, 3, seed + 4) - 0.4) * 3, 0, 1)  # chips gather in patches
    lay((48, 44, 38), chips * 0.38)
    rim = np.roll(chips, 1, axis=0) - chips
    lay((236, 230, 214), np.clip(rim, 0, 1) * 0.35)
    out[..., 3] *= 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')


def save(img, name):
    p = os.path.join(OUT, name); img.save(p, optimize=True)
    print(f'  {name:24s} {img.size[0]}x{img.size[1]}  {os.path.getsize(p) // 1024} KB')


if __name__ == '__main__':
    print('assets/art:')
    save(weathering(seed=5), 'weather-boat.png')                          # the Margaret: all of it
    save(weathering(seed=9, rust=0.8, salt=0.6, grime=1.1), 'weather-sub.png')  # the subs: less salt (they live under water)
