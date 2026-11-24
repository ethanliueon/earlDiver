#!/usr/bin/env python3
"""(7.3.4, owner) The loading screen's and title's hatchetfish is the owner's own painting (tools/ref/hatchetfish_owner.webp),
used as it is: only lifted off its flat blue (the see-through fins and the open mouth kept see-through) and cropped.

    python3 tools/hatchet_owner.py            -> assets/loading/hatchetfish.png
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ref', 'hatchetfish_owner.webp')
OUT = os.path.join(HERE, '..', 'assets', 'loading', 'hatchetfish.png')
BG = np.array([30, 71, 100], np.float32)


def build(out_w=960):
    rgb = np.asarray(Image.open(SRC).convert('RGB'), np.float32)
    H, W = rgb.shape[:2]
    d = np.sqrt(((rgb - BG) ** 2).sum(-1))
    a = np.clip((d - 8) / 60, 0, 1)                                  # how far from the blue: 0 the water, 1 the fish
    # the body is solid wherever it is enclosed: close the outline's small gaps, flood the water in from every edge,
    # then give back what the closing added; whatever the water does not reach is fish
    closed = Image.fromarray(((a > 0.35) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).copy()
    for x in range(0, W, 8):
        for y in (0, H - 1):
            if closed.getpixel((x, y)) == 0: ImageDraw.floodfill(closed, (x, y), 128)
    for y in range(0, H, 8):
        for x in (0, W - 1):
            if closed.getpixel((x, y)) == 0: ImageDraw.floodfill(closed, (x, y), 128)
    inside = (np.asarray(closed) != 128).astype(np.uint8) * 255
    body = np.asarray(Image.fromarray(inside).filter(ImageFilter.MinFilter(13)).filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
    a = np.maximum(a, body)
    fg = (rgb - (1 - a[..., None]) * BG) / np.maximum(a[..., None], 0.05)   # the blue taken back out of the see-through parts
    img = Image.fromarray(np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8), 'RGBA')
    img = img.crop(img.getbbox())
    img = img.resize((out_w, int(out_w * img.height / img.width)), Image.LANCZOS)
    img.save(OUT, optimize=True)
    return img


if __name__ == '__main__':
    im = build(); print('hatchetfish.png', im.size)
