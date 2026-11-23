# (7.0.14) Paints the kelp blades as real pictures: assets/kelp/blade_L_V.png (layer L 0 back / 1 front, droop V 0..2),
# 256 x 128, the blade's base at the left middle. Smooth, as kelp is: no grain, no fine wrinkles (fine detail drawn small
# shimmered and crawled as the camera moved). The detail is broad and soft: lit along the upper edge, shaded below, a
# soft midrib, a few long faint veins running its length, a gentle ruffle on the edge, the tip a little lighter where
# light comes through. Painted 4x larger and scaled down once, so its edges are clean.
# Run: python3 tools/kelp_kit.py
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = 'assets/kelp/'
Z = 8  # paint at 8x of the 128 x 64 drawing size, saved at 2x


def blade(layer, v):
    W, H = 128 * Z, 64 * Z
    # (7.2.6) the front layer a touch darker (nearer, against the light); the back layer drawn toward the water's
    # colour and softer, so the forest reads as rows going back
    dark = 0.86 if layer == 1 else 1.0
    droop = [0.05, 0.3, 0.55][v] * 128
    rng = np.random.default_rng(31 + layer * 3 + v)
    P = lambda q, e: (128 * q * Z, (32 + droop * q * q + e + q * q * 128 * 0.08) * Z)
    left, right, mid = [], [], []
    for j in range(121):
        q = j / 120
        w0 = 9 * math.sin(math.pi * q ** 0.6) * (1 + 0.12 * math.sin(q * 11))
        ruf = 0.6 * math.sin(q * 38 + 1) * min(1, q * 3) if q > 0.12 else 0  # a gentle ruffle, not a saw edge
        left.append(P(q, w0 + ruf)); right.append(P(q, -(w0 + ruf * 0.7))); mid.append(P(q, 0))
    poly = left + right[::-1]
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).polygon(poly, fill=255)
    m = np.asarray(mask, np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # distance across the blade, -1 at the lower edge .. +1 at the upper, from the midline at each x
    q = np.clip(xx / W, 0, 1)
    cy = (32 + droop * q * q + q * q * 128 * 0.08) * Z
    half = np.maximum(1, 9 * np.sin(np.pi * q ** 0.6) * Z)
    s = np.clip((cy - yy) / half, -1, 1)
    # (7.2.6) lighter, a warm bronze-olive (the water's light does the darkening with depth)
    base = np.array([138, 116, 54], np.float32) * dark
    lit = np.array([204, 180, 104], np.float32) * dark
    shade = np.array([74, 60, 26], np.float32) * dark
    col = base[None, None, :] * np.ones((H, W, 1), np.float32)
    up = np.clip(s, 0, 1)[..., None] ** 1.4; dn = np.clip(-s, 0, 1)[..., None] ** 1.2
    col = col * (1 - up * 0.6) + lit * (up * 0.6)
    col = col * (1 - dn * 0.55) + shade * (dn * 0.55)
    # light through the thin tip
    tip = np.clip((q - 0.65) / 0.35, 0, 1)[..., None]
    col = col * (1 - tip * 0.3) + np.array([222, 200, 128], np.float32) * dark * (tip * 0.3)
    if layer == 0:  # the back row, a third of the way into the water's blue-grey
        col = col * 0.66 + np.array([56, 86, 96], np.float32) * 0.34
    im = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im, 'RGBA')
    # a few long, faint veins running the blade's length (broad, soft: nothing small enough to crawl)
    for k in (-0.55, -0.25, 0.3, 0.6):
        pts = [P(qq, k * 9 * math.sin(math.pi * qq ** 0.6)) for qq in np.linspace(0.08, 0.9, 40)]
        d.line(pts, fill=(int(70 * dark), int(54 * dark), int(20 * dark), 60), width=int(1.2 * Z))
    # the midrib, and the light along its upper side
    d.line([mid[j] for j in range(4, 112)], fill=(int(64 * dark), int(48 * dark), int(16 * dark), 150), width=int(1.4 * Z))
    d.line([(px, py - 0.9 * Z) for px, py in (mid[j] for j in range(4, 112))], fill=(int(206 * dark), int(184 * dark), int(110 * dark), 70), width=int(0.7 * Z))
    im = im.filter(ImageFilter.GaussianBlur((1.6 if layer == 0 else 0.8) * Z / 4))
    # (7.2.6) see-through: about 70 % on the blade, the thin tip and edges the most, the midrib the least
    rib = np.clip(1 - np.abs(s) * 2.5, 0, 1)
    alpha = (0.74 - 0.34 * np.clip((q - 0.55) / 0.45, 0, 1) - 0.12 * np.abs(s) ** 2 + 0.14 * rib) * (0.82 if layer == 0 else 1)
    if layer == 0: m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(Z * 0.6)), np.float32) / 255
    a = (m * np.clip(alpha, 0, 1) * 255).astype(np.uint8)
    out = im.convert('RGBA'); out.putalpha(Image.fromarray(a))
    # a soft dark edge, so a blade over another still reads
    edge = Image.fromarray(((m > 0.5) * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(Z * 0.4))
    ea = np.asarray(edge, np.float32) / 255
    o = np.asarray(out, np.float32); o[..., :3] = o[..., :3] * (1 - ea[..., None] * 0.5); out = Image.fromarray(o.astype(np.uint8), 'RGBA')
    return out.resize((256, 128), Image.LANCZOS)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for layer in (0, 1):
        for v in (0, 1, 2):
            blade(layer, v).save(f'{OUT}blade_{layer}_{v}.png', optimize=True)
    print('painted 6 blades')
