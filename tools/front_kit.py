#!/usr/bin/env python3
"""Paints the title's diver select as PNGs (assets/ui/front/): an aluminium dog tag (a used one and a blank one), a
length of ball chain, and the wheelhouse's steel rail with its hooks. Drawn at twice the size shown, from fixed
seeds, so the select screen is built from things, not CSS boxes.

    python3 tools/front_kit.py
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui', 'front')
os.makedirs(OUT, exist_ok=True)


def vnoise(w, h, cell, rng, octaves=4, persist=0.5):
    acc = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        c = max(1.0, cell / (2 ** o)); gw, gh = int(w / c) + 2, int(h / c) + 2
        g = rng.random((gh, gw)).astype(np.float32)
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((int(gw * c), int(gh * c)), Image.BICUBIC)
        acc += np.asarray(im, np.float32)[:h, :w] / 255.0 * amp; tot += amp; amp *= persist
    return acc / tot


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0


def mask(w, h, fn, r=0):
    im = Image.new('L', (w, h), 0); fn(ImageDraw.Draw(im))
    if r: im = im.filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im, np.float32) / 255.0


def save(rgb, a, name, q=None):
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8), 'RGBA')
    p = os.path.join(OUT, name); img.save(p, optimize=True); print(f'  {name:18s} {img.size[0]}x{img.size[1]}  {os.path.getsize(p) // 1024} KB')


def dog_tag(name, seed, W=360, H=520, base=(176, 180, 172), worn=1.0):
    """a stamped aluminium dog tag, portrait: rounded corners, a notch in the left edge, the chain hole at the top"""
    rng = np.random.default_rng(seed); R = random.Random(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    m = 14
    shape = mask(W, H, lambda d: d.rounded_rectangle((m, m, W - m, H - m), 58, fill=255))
    notch = mask(W, H, lambda d: d.ellipse((m - 26, H * 0.56 - 26, m + 18, H * 0.56 + 26), fill=255))
    hole = mask(W, H, lambda d: d.ellipse((W / 2 - 20, m + 26, W / 2 + 20, m + 66), fill=255))
    a = np.clip(shape - notch - hole, 0, 1)
    # aluminium: a soft vertical sheen, fine brushing across, a coarse mottle, darker towards the edges
    sheen = 0.88 + 0.16 * np.cos((xx / W - 0.38) * 3.0) - 0.08 * (yy / H)
    brush = blur(rng.random((H, W)).astype(np.float32), 0.6)
    brush = np.asarray(Image.fromarray((brush * 255).astype(np.uint8)).resize((W * 3, H), Image.BILINEAR).resize((W, H), Image.BILINEAR), np.float32) / 255.0
    mott = vnoise(W, H, 90, rng)
    inner = blur(a, 10)
    k = sheen * (0.9 + 0.12 * (brush - 0.5) * 2) * (0.93 + 0.12 * (mott - 0.5) * 2) * (0.78 + 0.22 * np.clip(inner * 1.6 - 0.3, 0, 1))
    rgb = np.array(base, np.float32)[None, None, :] * k[..., None]
    # the rolled rim: a light line just inside the top-left edge, a dark one at the bottom-right
    edge = np.clip(a - blur(a, 3) * 1.0, 0, 1) * 3
    sh = np.roll(np.roll(a, 3, 0), 3, 1); hi = np.roll(np.roll(a, -3, 0), -3, 1)
    rgb += (np.clip(a - sh, 0, 1) * 60)[..., None]; rgb -= (np.clip(a - hi, 0, 1) * 70)[..., None]
    # a raised border pressed into it, a little in from the rim
    border = mask(W, H, lambda d: d.rounded_rectangle((m + 22, m + 92, W - m - 22, H - m - 22), 36, outline=255, width=5))
    rgb += (np.roll(border, -2, 0) * 34)[..., None]; rgb -= (np.roll(border, 2, 0) * 30)[..., None]
    # wear: scratches in all directions, a few deep; grime in the corners and round the hole
    sc = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sc)
    for _ in range(int(140 * worn)):
        x0, y0 = R.uniform(0, W), R.uniform(0, H); ang = R.uniform(0, math.pi); L = R.uniform(10, 120)
        d.line([(x0, y0), (x0 + math.cos(ang) * L, y0 + math.sin(ang) * L)], fill=R.randint(30, 120), width=1)
    scr = np.asarray(sc, np.float32) / 255.0
    rgb += (scr * 46)[..., None]
    grime = np.clip((1 - np.clip(inner * 1.8, 0, 1)) * 0.8 + blur(hole, 14) * 2.0, 0, 1) * vnoise(W, H, 40, rng) * worn
    rgb = rgb * (1 - grime[..., None] * 0.45) + np.array((70, 66, 52), np.float32) * grime[..., None] * 0.2
    # the hole's own lit rim
    hr = np.clip(blur(hole, 2) * 3 - hole * 3, 0, 1)
    rgb -= (hr * 60)[..., None]
    # a soft shadow under the tag (it hangs off the wall a little)
    shadow = blur(np.roll(np.roll(a, 10, 0), 6, 1), 9) * 0.5
    out_a = np.maximum(a, shadow)
    rgb = rgb * a[..., None] + np.zeros_like(rgb) * (1 - a[..., None])
    save(rgb, out_a, name)


def chain(name, W=24, H=360):
    """a ball chain hanging straight: small steel beads with a highlight each, joined by thin links"""
    rgb = np.zeros((H, W, 3), np.float32); a = np.zeros((H, W), np.float32)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    y = 4
    while y < H - 6:
        d.line([(W / 2, y), (W / 2, y + 12)], fill=(120, 124, 118, 255), width=2)
        d.ellipse((W / 2 - 6, y, W / 2 + 6, y + 12), fill=(150, 154, 146, 255))
        d.ellipse((W / 2 - 4, y + 2, W / 2 + 1, y + 6), fill=(230, 232, 224, 255))
        d.ellipse((W / 2 - 1, y + 7, W / 2 + 5, y + 12), fill=(80, 82, 76, 255))
        y += 15
    p = os.path.join(OUT, name); im.save(p, optimize=True); print(f'  {name:18s} {W}x{H}')


def rail(name, W=2400, H=120, seed=5):
    """the wheelhouse's steel rail the tags hang from: painted olive, worn to primer and steel along its top, bolted
    to the wall at intervals; a hook is drawn by the page under each tag"""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    body = mask(W, H, lambda d: d.rectangle((0, 30, W, 84), fill=255))
    t = (yy - 30) / 54
    shade = np.where(t < 0.18, 1.25, np.where(t > 0.82, 0.62, 1.0 - 0.25 * t))
    mott = vnoise(W, H, 60, rng)
    rgb = np.array((84, 96, 68), np.float32)[None, None, :] * (shade * (0.9 + 0.2 * mott))[..., None]
    wear = np.clip((vnoise(W, H, 30, rng) - 0.6) * 4, 0, 1) * (t < 0.3)
    rgb = rgb * (1 - wear[..., None]) + np.array((150, 90, 60), np.float32) * wear[..., None] * 0.7 + np.array((170, 172, 166), np.float32) * (wear > 0.8)[..., None] * 0.3
    for x in range(60, W, 300):
        b = mask(W, H, lambda d, x=x: d.ellipse((x - 9, 48, x + 9, 66), fill=255))
        rgb = rgb * (1 - b[..., None]) + np.array((60, 64, 52), np.float32) * b[..., None]
        rgb += (mask(W, H, lambda d, x=x: d.ellipse((x - 5, 50, x + 1, 56), fill=255)) * 60)[..., None]
        rust = blur(mask(W, H, lambda d, x=x: d.line([(x, 66), (x + rng.integers(-4, 5), 84 + rng.integers(0, 20))], fill=255, width=4)), 3) * body
        rgb = rgb * (1 - rust[..., None] * 0.6) + np.array((120, 60, 30), np.float32) * rust[..., None] * 0.6
    shadow = blur(np.roll(body, 8, 0), 6) * 0.55
    save(rgb * body[..., None], np.maximum(body, shadow), name)


if __name__ == '__main__':
    dog_tag('tag.png', 3)
    dog_tag('tag-blank.png', 8, base=(124, 128, 122), worn=0.6)
    chain('chain.png')
    rail('rail.png')
