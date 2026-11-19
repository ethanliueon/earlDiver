#!/usr/bin/env python3
"""Paints the touch controls as PNGs (assets/ui/touch/): the sub's panel buttons (a rubber boot over a push switch,
set in a worn brass bezel with four screws), up and pressed, a big one for the main action, and the joystick (a
recessed rubber well in a brass ring, direction ticks, a knurled knob). Drawn at 2-3x their largest size on screen,
from fixed seeds.

    python3 tools/touch_kit.py
"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui', 'touch')
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


def save(rgb, a, name):
    img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8), 'RGBA')
    p = os.path.join(OUT, name); img.save(p, optimize=True); print(f'  {name:20s} {img.size[0]}  {os.path.getsize(p) // 1024} KB')


def polar(S):
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32); c = (S - 1) / 2
    dx, dy = (xx - c) / c, (yy - c) / c
    return np.hypot(dx, dy), np.arctan2(dy, dx), dx, dy


def brass(S, r0, r1, rng, worn=1.0):
    """a turned brass ring between radii r0..r1 (0..1): lit from the top left, fine turning lines, tarnish and wear"""
    rr, th, dx, dy = polar(S)
    ring = np.clip((rr - r0) * S * 0.5, 0, 1) * np.clip((r1 - rr) * S * 0.5, 0, 1)
    t = np.clip((rr - r0) / (r1 - r0), 0, 1)
    bevel = np.cos((t - 0.35) * math.pi) * 0.5 + 0.5           # rounded profile: brightest a third of the way out
    light = 0.62 + 0.38 * (-(dx * 0.6 + dy * 0.8) / np.maximum(rr, 1e-3)) * (0.4 + 0.6 * bevel)
    turn = 0.94 + 0.06 * np.sin(rr * S * 2.2)                  # turning marks
    tarn = vnoise(S, S, S * 0.18, rng)
    base = np.array((168, 132, 70), np.float32)
    k = (light * turn * (0.85 + 0.25 * bevel))[..., None]
    rgb = base * k
    green = np.clip((tarn - 0.55) * 3 * worn, 0, 1)[..., None] * (1 - bevel[..., None] * 0.7)
    rgb = rgb * (1 - green * 0.6) + np.array((70, 92, 70), np.float32) * green * 0.6
    rgb += (np.clip(bevel - 0.6, 0, 1) * 120 * np.clip(light - 0.8, 0, 1) * 2)[..., None]  # a polished highlight
    return rgb, ring


def screws(rgb, a, S, rmid, n=4, rot=0.4, size=0.045):
    rr, th, dx, dy = polar(S)
    for i in range(n):
        ang = rot + i * 2 * math.pi / n; cx, cy = math.cos(ang) * rmid, math.sin(ang) * rmid
        d = np.hypot(dx - cx, dy - cy)
        head = np.clip((size - d) * S * 0.6, 0, 1)
        sh = 0.55 + 0.45 * np.clip(-((dx - cx) * 0.6 + (dy - cy) * 0.8) / size, -1, 1)
        rgb[:] = rgb * (1 - head[..., None]) + (np.array((150, 140, 120), np.float32) * sh[..., None]) * head[..., None]
        sa = ang + 0.9; slot = np.abs((dx - cx) * math.sin(sa) - (dy - cy) * math.cos(sa)) < size * 0.16
        rgb[:] = np.where((slot & (d < size * 0.8))[..., None], np.array((40, 36, 30), np.float32), rgb)


def button(name, S, pressed, seed, big=False):
    rng = np.random.default_rng(seed)
    rr, th, dx, dy = polar(S)
    a = np.clip((0.985 - rr) * S * 0.5, 0, 1)
    rgb = np.zeros((S, S, 3), np.float32)
    b_rgb, ring = brass(S, 0.70, 0.985, rng)
    rgb = rgb * (1 - ring[..., None]) + b_rgb * ring[..., None]
    screws(rgb, a, S, 0.85, n=4 if not big else 6, rot=0.79, size=0.04 if not big else 0.032)
    # the dark gap between ring and boot
    gap = np.clip((rr - 0.66) * S * 0.5, 0, 1) * np.clip((0.70 - rr) * S * 0.5, 0, 1)
    rgb = rgb * (1 - gap[..., None]) + np.array((14, 12, 10), np.float32) * gap[..., None]
    # the rubber boot: a dome, matte, lit from the top left; pressed, it is pushed in (flatter, darker, the light low)
    boot = np.clip((0.665 - rr) * S * 0.5, 0, 1)
    rb = np.clip(rr / 0.665, 0, 1)
    dome = np.sqrt(np.clip(1 - rb ** 2, 0, 1))
    lx, ly, lz = (-0.45, -0.6, 0.66) if not pressed else (-0.2, -0.3, 0.93)
    nx, ny = dx / 0.665, dy / 0.665
    shade = np.clip(nx * lx + ny * ly + dome * lz, 0, 1)
    tex = 0.92 + 0.16 * vnoise(S, S, S * 0.03, rng, 2)
    col = np.array((52, 56, 50), np.float32) if not pressed else np.array((40, 43, 38), np.float32)
    r_rgb = col * ((0.42 + 0.75 * shade) * tex)[..., None]
    spec = np.clip(shade - 0.86, 0, 1) * (0 if pressed else 260)
    r_rgb += spec[..., None]
    # a dust ring worn into the rubber where fingers press
    wear = np.clip(1 - np.abs(rb - 0.55) * 6, 0, 1) * 0.12 * (1 - pressed * 0.5)
    r_rgb += (wear * 40)[..., None]
    # the boot's own shadow on the brass (it stands proud when up)
    if not pressed:
        sh = blur(np.clip((0.68 - np.hypot(dx - 0.03, dy - 0.05)) * S * 0.5, 0, 1), S * 0.012) * (1 - boot)
        rgb = rgb * (1 - sh[..., None] * 0.35)
    rgb = rgb * (1 - boot[..., None]) + r_rgb * boot[..., None]
    save(rgb, a, name)


def stick_base(name, S, seed):
    rng = np.random.default_rng(seed)
    rr, th, dx, dy = polar(S)
    a = np.clip((0.99 - rr) * S * 0.5, 0, 1)
    rgb = np.zeros((S, S, 3), np.float32)
    b_rgb, ring = brass(S, 0.86, 0.99, rng, worn=0.7)
    rgb = rgb * (1 - ring[..., None]) + b_rgb * ring[..., None]
    well = np.clip((0.86 - rr) * S * 0.5, 0, 1)
    # a recessed rubber well: dark, shadowed at its upper rim, faint concentric moulding
    t = rr / 0.86
    shade = 0.55 + 0.25 * (dy * 0.8 + dx * 0.6) / np.maximum(rr, 1e-3) * np.clip(t, 0, 1) ** 2
    mould = 0.96 + 0.04 * np.sin(t * 40)
    w_rgb = np.array((34, 37, 33), np.float32) * (shade * mould * (0.9 + 0.2 * vnoise(S, S, S * 0.05, rng, 2)))[..., None]
    w_rgb *= (0.55 + 0.45 * np.clip((0.86 - rr) / 0.12, 0, 1))[..., None]   # darker at the rim (deep)
    # eight direction ticks, the four main ones longer
    for i in range(8):
        ang = i * math.pi / 4; L = 0.14 if i % 2 == 0 else 0.08
        d = np.abs(dx * math.sin(ang) - dy * math.cos(ang)); along = dx * math.cos(ang) + dy * math.sin(ang)
        tick = (d < 0.012) & (along > 0.78 - L) & (along < 0.78)
        w_rgb = np.where(tick[..., None], np.array((120, 116, 100), np.float32), w_rgb)
    rgb = rgb * (1 - well[..., None]) + w_rgb * well[..., None]
    save(rgb, a * 0.92, name)


def stick_knob(name, S, seed):
    rng = np.random.default_rng(seed)
    rr, th, dx, dy = polar(S)
    a = np.clip((0.98 - rr) * S * 0.5, 0, 1)
    dome = np.sqrt(np.clip(1 - (rr / 0.98) ** 2, 0, 1))
    shade = np.clip((dx / 0.98) * -0.45 + (dy / 0.98) * -0.6 + dome * 0.66, 0, 1)
    knurl = np.where(rr > 0.78, 0.82 + 0.18 * (np.sin(th * 48) > 0), 1.0)  # a knurled rim
    tex = 0.94 + 0.12 * vnoise(S, S, S * 0.03, rng, 2)
    rgb = np.array((58, 62, 54), np.float32) * ((0.4 + 0.8 * shade) * knurl * tex)[..., None]
    rgb += (np.clip(shade - 0.88, 0, 1) * 300)[..., None]
    # a brass cap in the middle
    cap = np.clip((0.3 - rr) * S * 0.5, 0, 1)
    c_rgb, _ = brass(S, 0.0, 0.3, rng, worn=0.4)
    rgb = rgb * (1 - cap[..., None]) + c_rgb * cap[..., None]
    save(rgb, a, name)


if __name__ == '__main__':
    button('btn.png', 192, False, 4)
    button('btn-down.png', 192, True, 4)
    button('btn-big.png', 300, False, 6, big=True)
    button('btn-big-down.png', 300, True, 6, big=True)
    stick_base('stick-base.png', 320, 9)
    stick_knob('stick-knob.png', 200, 10)
