#!/usr/bin/env python3
"""Paints the HUD's icons as PNGs (assets/ui/icons/): the quest board, the journal, the chart, the air tank and the
sub's hull. Each is drawn at 512 px from shapes, every shape shaded (lit from above, darker towards its edges) and
given a little grain, the whole thing outlined in one dark line with a soft shadow under it, then reduced to 128 px,
so they sit together as one set and read at a glance on a small screen.

    python3 tools/icon_kit.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui', 'icons')
os.makedirs(OUT, exist_ok=True)
S = 512
YY = np.linspace(0, 1, S, dtype=np.float32)[:, None] * np.ones((1, S), np.float32)
RNG = np.random.default_rng(7)
GRAIN = np.asarray(Image.fromarray((RNG.random((S // 4, S // 4)) * 255).astype(np.uint8)).resize((S, S), Image.BICUBIC), np.float32) / 255.0
OUTLINE = (24, 26, 20)


def mask(fn):
    im = Image.new('L', (S, S), 0); fn(ImageDraw.Draw(im)); return np.asarray(im, np.float32) / 255.0


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0


def grow(a, px):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(px)), np.float32) / 255.0


class Icon:
    def __init__(self):
        self.rgb = np.zeros((S, S, 3), np.float32); self.a = np.zeros((S, S), np.float32)

    def fill(self, m, col, light=0.22, edge=0.28, grain=0.07, flat=False):
        c = np.array(col, np.float32)[None, None, :]
        if flat: k = np.ones((S, S), np.float32)
        else:
            inner = blur(m, 22)  # 1 deep inside the shape, falling to ~0.5 at its edge
            k = (1 - edge) + edge * np.clip(inner * 1.6 - 0.3, 0, 1)
            k = k * (1 + light * (0.5 - YY) * 2)
        k = k * (1 + grain * (GRAIN - 0.5) * 2)
        col_l = np.clip(c * k[..., None], 0, 255)
        self.rgb = self.rgb * (1 - m[..., None]) + col_l * m[..., None]
        self.a = np.maximum(self.a, m)

    def line(self, fn, col):  # an unshaded mark (ink, a seam), drawn on what is there
        self.fill(mask(fn), col, flat=True, grain=0.03)

    def save(self, name, size=128, outline=True):
        sil = self.a
        ring = grow(sil, 17) if outline else sil * 0  # the outline: the silhouette grown by ~8 px ((7.2.8) or none: the tutorial's glove, only its shadow)
        sh = blur(grow(sil, 17), 10); shadow = np.zeros_like(sh); shadow[14:, 6:] = sh[:-14, :-6]; shadow *= 0.55  # (no wrap round the edge)
        rgb = np.zeros((S, S, 3), np.float32); a = np.maximum(shadow, sil)  # (7.2.8) the shape itself solid (with no outline it was left see-through)
        o = np.array(OUTLINE, np.float32)[None, None, :]
        rgb = rgb * (1 - ring[..., None]) + o * ring[..., None]; a = np.maximum(a, ring)
        rgb = rgb * (1 - sil[..., None]) + self.rgb * sil[..., None]
        # premultiplied composite of the shadow under the outline is fine: the shadow is black
        img = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8), 'RGBA')
        img = img.resize((size, size), Image.LANCZOS)
        p = os.path.join(OUT, name); img.save(p, optimize=True); print(f'  {name:16s} {size}x{size}  {os.path.getsize(p) // 1024 or 1} KB')


def quest():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((104, 74, 408, 462), 34, fill=255)), (132, 88, 52))  # the board
    I.fill(mask(lambda d: d.rounded_rectangle((136, 124, 376, 430), 10, fill=255)), (234, 226, 200), light=0.12, edge=0.12)  # the paper
    for i, y in enumerate((196, 272, 348)):
        I.line(lambda d, y=y: d.rounded_rectangle((164, y - 22, 206, y + 20), 6, outline=255, width=9), (70, 64, 50))
        I.line(lambda d, y=y: d.rounded_rectangle((228, y - 6, 348 - (i * 26), y + 7), 6, fill=255), (96, 88, 70))
        if i < 2: I.line(lambda d, y=y: d.line([(166, y - 2), (184, y + 16), (220, y - 34)], fill=255, width=15, joint='curve'), (176, 58, 42))
    I.fill(mask(lambda d: d.rounded_rectangle((188, 40, 324, 128), 22, fill=255)), (150, 158, 150))  # the clip
    I.line(lambda d: d.ellipse((238, 56, 274, 92), fill=255), (40, 44, 38))
    I.line(lambda d: d.rounded_rectangle((200, 104, 312, 116), 4, fill=255), (96, 102, 96))
    I.save('quest.png')


def journal():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((150, 92, 410, 440), 14, fill=255)), (236, 228, 204), light=0.1, edge=0.15)  # the pages' edge
    for y in range(110, 430, 22): I.line(lambda d, y=y: d.line([(392, y), (410, y)], fill=255, width=4), (196, 186, 160))
    I.fill(mask(lambda d: d.rounded_rectangle((104, 70, 394, 450), 26, fill=255)), (118, 74, 44))  # the cover
    I.fill(mask(lambda d: d.rounded_rectangle((104, 70, 156, 450), 22, fill=255)), (86, 52, 30), light=0.15)  # the spine
    I.line(lambda d: d.line([(156, 82), (156, 438)], fill=255, width=6), (62, 36, 20))
    # a fish pressed into the leather
    I.line(lambda d: d.ellipse((196, 214, 324, 286), outline=255, width=10), (150, 104, 66))
    I.line(lambda d: d.line([(318, 250), (360, 222), (360, 278), (318, 250)], fill=255, width=10, joint='curve'), (150, 104, 66))
    I.line(lambda d: d.ellipse((218, 238, 236, 256), fill=255), (150, 104, 66))
    I.fill(mask(lambda d: d.rounded_rectangle((330, 70, 362, 450), 6, fill=255)), (78, 46, 26), light=0.1, edge=0.2)  # the strap
    I.fill(mask(lambda d: d.rounded_rectangle((320, 236, 372, 288), 10, fill=255)), (150, 158, 150))  # its clasp
    I.fill(mask(lambda d: d.polygon([(232, 440), (268, 440), (268, 500), (250, 484), (232, 500)], fill=255)), (176, 52, 40), light=0.1)  # the ribbon
    I.save('journal.png')


def chart():
    I = Icon()
    I.fill(mask(lambda d: d.polygon([(104, 110), (420, 128), (408, 408), (92, 392)], fill=255)), (232, 222, 190), light=0.1, edge=0.14)  # the sheet
    I.fill(mask(lambda d: d.polygon([(110, 118), (414, 134), (403, 400), (98, 385)], fill=255)), (120, 166, 180), light=0.12, edge=0.1)  # the sea
    I.fill(mask(lambda d: d.polygon([(110, 118), (290, 128), (270, 170), (300, 214), (238, 250), (210, 310), (150, 300), (124, 360), (100, 360)], fill=255)), (196, 180, 128), light=0.1, edge=0.1)  # the coast
    I.line(lambda d: d.line([(110, 118), (290, 128), (270, 170), (300, 214), (238, 250), (210, 310), (150, 300), (124, 360), (100, 360)], fill=255, width=6), (110, 96, 64))
    for k in range(6):  # the course, dashed
        x0, y0 = 214 + k * 26, 352 - k * 26
        I.line(lambda d, x0=x0, y0=y0: d.line([(x0, y0), (x0 + 14, y0 - 14)], fill=255, width=10), (44, 52, 56))
    I.line(lambda d: d.line([(330, 186), (380, 236)], fill=255, width=16), (186, 52, 40))
    I.line(lambda d: d.line([(380, 186), (330, 236)], fill=255, width=16), (186, 52, 40))
    for x0, x1 in ((72, 126), (392, 446)):  # the two rolled ends
        I.fill(mask(lambda d, x0=x0, x1=x1: d.rounded_rectangle((x0, 96 if x0 < 200 else 112, x1, 410 if x0 < 200 else 424), 26, fill=255)), (214, 202, 166), light=0.15, edge=0.45)
    I.save('chart.png')


def air():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((196, 46, 316, 92), 14, fill=255)), (52, 56, 52))  # the knob
    I.fill(mask(lambda d: d.rectangle((232, 86, 280, 150), fill=255)), (96, 102, 98))  # the valve
    I.fill(mask(lambda d: d.rounded_rectangle((150, 132, 362, 470), 96, fill=255)), (196, 202, 198), light=0.3, edge=0.5)  # the cylinder
    I.fill(mask(lambda d: d.rectangle((150, 196, 362, 236), fill=255)), (230, 222, 196), light=0.2, edge=0.3)  # the band
    I.line(lambda d: d.rounded_rectangle((184, 270, 206, 430), 10, fill=255), (232, 236, 232))  # the highlight
    I.save('air.png')


def hull():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((210, 112, 316, 220), 20, fill=255)), (96, 106, 82))  # the tower
    I.fill(mask(lambda d: d.polygon([(420, 260), (478, 196), (478, 324)], fill=255)), (82, 92, 70))  # the tail
    I.fill(mask(lambda d: d.ellipse((40, 180, 450, 340), fill=255)), (110, 122, 92), light=0.3, edge=0.45)  # the hull
    for x in (150, 220, 290):
        I.line(lambda d, x=x: d.ellipse((x - 20, 240, x + 20, 280), fill=255), (36, 40, 32))
        I.line(lambda d, x=x: d.ellipse((x - 13, 247, x + 13, 273), fill=255), (214, 226, 220))
    I.line(lambda d: d.line([(70, 300), (420, 300)], fill=255, width=5), (70, 78, 58))
    I.save('hull.png')


if __name__ == '__main__':
    quest(); journal(); chart(); air(); hull()
