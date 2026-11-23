# (6.9.0) Paints the book's two pages (assets/ui/book/page_left.jpg, page_right.jpg): old matte paper that has been
# used. Fibres at several scales, foxing spots of many sizes clustered toward the edges, damp darkening that wanders
# along the edges, the page curling into the gutter, a faint ring where a mug stood (left page) and a thumb smudge where
# the page is turned (right page). Each page has its own seed, so nothing repeats between them or within them.
# Run: python3 tools/paper_kit.py
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 960, 1200
OUT = 'assets/ui/book/'


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255


def noise(rng, scale):  # value noise: random at a coarse grid, smoothly upscaled
    gw, gh = max(2, W // scale + 2), max(2, H // scale + 2)
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((W + scale * 2, H + scale * 2), Image.BICUBIC)
    a = np.asarray(im, dtype=np.float32)[scale:scale + H, scale:scale + W] / 255
    return a


def page(seed, gutter_right, ring, smudge):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # the paper's own colour, a little warmer and darker toward the foot
    base = np.zeros((H, W, 3), np.float32)
    top, foot = np.array([226, 214, 182], np.float32), np.array([214, 198, 160], np.float32)
    k = (yy / H)[..., None]
    base[:] = top * (1 - k) + foot * k
    # mottling at three scales, low
    mott = noise(rng, 220) * 0.5 + noise(rng, 70) * 0.3 + noise(rng, 18) * 0.2
    base *= (0.93 + 0.1 * mott)[..., None]
    # fibres: short thin strokes, a few light, most a shade darker, at every angle
    fl = Image.new('L', (W, H), 128); d = ImageDraw.Draw(fl)
    for _ in range(5200):
        x, y = rng.random() * W, rng.random() * H
        a = rng.random() * np.pi; L = 3 + rng.random() ** 2 * 26
        c = 128 + int((rng.random() - 0.62) * 46)
        d.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=c, width=1)
    fib = np.asarray(fl.filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 128 - 1
    base *= (1 + fib * 0.22)[..., None]
    # damp edges: darker, the width wandering along each edge; the gutter side darker still, curling in
    ed = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy])
    wob = 26 + 40 * noise(rng, 120)
    damp = np.clip(1 - ed / wob, 0, 1) ** 1.6
    gx = (W - 1 - xx) if gutter_right else xx
    gut = np.clip(1 - gx / 150, 0, 1) ** 2.2
    tint = np.array([0.80, 0.70, 0.52], np.float32)
    base = base * (1 - (damp * 0.32)[..., None] * (1 - tint)) * (1 - (damp * 0.12)[..., None])
    base *= (1 - gut * 0.28)[..., None]
    # tide lines: a faint darker rim where an old damp patch dried, along one edge
    # (a dried damp patch: one soft, irregular darker blot reaching in from an edge, not a line)
    blot = np.clip(noise(rng, 260) * 1.6 - 0.9, 0, 1) * np.clip(1 - ed / 260, 0, 1)
    base *= (1 - blot * 0.07)[..., None]
    # foxing: spots of many sizes (log-spread), more of them near the edges, each a cluster of soft blots
    fx = Image.new('L', (W, H), 0); fd = ImageDraw.Draw(fx)
    n = 0
    while n < 230:
        x, y = rng.random() * W, rng.random() * H
        e = min(x, W - x, y, H - y)
        if rng.random() > 0.25 + 0.75 * np.exp(-e / 160):
            continue
        n += 1
        r = 0.5 + 11 * rng.random() ** 2.4  # sizes from a speck to a blot, most of them small
        for _ in range(1 + int(r / 2.5)):
            ox, oy, rr = rng.normal(0, r * 0.45), rng.normal(0, r * 0.45), r * rng.uniform(0.35, 0.8)
            a = int(min(255, 60 + 120 * rng.random()))
            fd.ellipse([x + ox - rr, y + oy - rr * rng.uniform(0.7, 1.1), x + ox + rr, y + oy + rr], fill=a)
    fox = np.asarray(fx.filter(ImageFilter.GaussianBlur(1.1)), np.float32) / 255
    fox_core = np.asarray(fx.filter(ImageFilter.GaussianBlur(0.4)), np.float32) / 255
    rust = np.array([140, 100, 62], np.float32)
    amt = (fox * 0.3 + fox_core * 0.1)[..., None]
    base = base * (1 - amt) + rust * amt
    # the mug ring: an uneven, broken circle, a darker outer edge, faint
    if ring:
        cx, cy, R = ring
        ang = np.arctan2(yy - cy, xx - cx); dist = np.hypot(xx - cx, yy - cy)
        thick = 5 + 4 * np.sin(ang * 3 + 1.3) + 3 * np.sin(ang * 7)
        present = np.clip(0.55 + 0.6 * np.sin(ang + 0.7) + 0.3 * np.sin(ang * 5), 0, 1)
        band = np.exp(-((dist - R) / np.maximum(2, thick)) ** 2) * present
        edge = np.exp(-((dist - R - thick * 0.8) / 1.4) ** 2) * present
        stain = np.array([140, 100, 58], np.float32)
        a = (band * 0.08 + edge * 0.12)[..., None]
        base = base * (1 - a) + stain * a
    # the thumb smudge: a soft grey-brown oval near the outer foot, with the faint ridges of a print
    if smudge:
        cx, cy, rx, ry, rot = smudge
        c, s = np.cos(rot), np.sin(rot)
        u, v = ((xx - cx) * c + (yy - cy) * s) / rx, (-(xx - cx) * s + (yy - cy) * c) / ry
        dd = np.hypot(u, v)
        soft = np.clip(1 - dd, 0, 1) ** 1.5
        ridges = 0.5 + 0.5 * np.sin(np.hypot(u * rx, v * ry * 1.25) * 0.75)
        a = (soft * (0.08 + 0.05 * ridges))[..., None]
        base = base * (1 - a) + np.array([96, 86, 70], np.float32) * a
    # grain
    base *= (1 + (rng.random((H, W)).astype(np.float32) - 0.5) * 0.05)[..., None]
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    page(11, True, (700, 930, 92), None).save(OUT + 'page_left.jpg', quality=86, optimize=True, progressive=True)
    page(29, False, None, (820, 1090, 70, 52, -0.5)).save(OUT + 'page_right.jpg', quality=86, optimize=True, progressive=True)
    print('painted the pages')
