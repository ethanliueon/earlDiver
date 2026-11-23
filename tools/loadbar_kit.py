# (7.0.15) Paints the loading bar as one made object: a short, sturdy bronze depth gauge (assets/loading/gauge.png):
# a dark sunken channel with a bevelled bronze rim, rounded ends with a rivet each, the brass worn bright where hands
# have rubbed it; and its fill (assets/loading/gauge_fill.png): an aged bone strip, lit along the top, shaded below,
# with faint depth ticks pressed into it. Run: python3 tools/loadbar_kit.py
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = 'assets/loading/'
W, H, R = 1040, 96, 40  # the gauge; R: its end radius


def rounded(w, h, r, inset=0):
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([inset, inset, w - 1 - inset, h - 1 - inset], radius=max(1, r - inset), fill=255); return m


def gauge():
    rng = np.random.default_rng(3)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # the bronze: lit across the top edge, dark below, uneven patina
    v = yy / H
    col = np.zeros((H, W, 3), np.float32)
    top, mid, bot = np.array([196, 160, 104]), np.array([120, 92, 52]), np.array([46, 34, 18])
    k = v[..., None]
    col = np.where(k < 0.5, top * (1 - k * 2) + mid * (k * 2), mid * (1 - (k - 0.5) * 2) + bot * ((k - 0.5) * 2))
    n = np.asarray(Image.fromarray((rng.random((H // 6 + 2, W // 6 + 2)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    col *= (0.86 + 0.22 * n)[..., None]
    patina = np.clip(n - 0.62, 0, 1)[..., None] * 2.2
    col = col * (1 - patina * 0.5) + np.array([70, 92, 70]) * (patina * 0.5)
    im = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).convert('RGBA')
    im.putalpha(rounded(W, H, R))
    d = ImageDraw.Draw(im)
    # the channel: sunk into the rim, dark, with an inner shadow along its top
    ci = 18
    ch = rounded(W, H, R, ci)
    dark = Image.new('RGBA', (W, H), (14, 16, 12, 255)); im.paste(dark, (0, 0), ch)
    sh = Image.new('L', (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([ci, ci, W - 1 - ci, ci + 14], radius=R - ci, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(4)); shm = Image.composite(sh, Image.new('L', (W, H), 0), ch)
    im = Image.composite(Image.new('RGBA', (W, H), (0, 0, 0, 255)), im, shm.point(lambda a: a // 2))
    d = ImageDraw.Draw(im)
    # the channel's lower lip catching light
    d.rounded_rectangle([ci, ci, W - 1 - ci, H - 1 - ci], radius=R - ci, outline=(150, 122, 78, 160), width=2)
    # rivets at the two ends
    for cx in (R * 0.62, W - R * 0.62):
        cy = H / 2
        for r, c in [(9, (30, 22, 12, 255)), (7, (150, 118, 72, 255)), (4, (210, 180, 130, 255))]:
            o = -1.5 if r < 7 else 0
            d.ellipse([cx - r + o, cy - r + o, cx + r + o, cy + r + o], fill=c)
    im.save(OUT + 'gauge.png', optimize=True)


def fill():
    w, h = W - 2 * 22, H - 2 * 22
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    v = yy / h
    col = np.array([232, 220, 186])[None, None, :] * (1.06 - 0.36 * v[..., None] ** 1.3)
    col *= (0.96 + 0.06 * np.sin(xx / 7.0))[..., None] * 0 + 1
    im = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).convert('RGBA')
    d = ImageDraw.Draw(im)
    for i in range(1, 20):  # depth ticks pressed into the strip
        x = i * w / 20
        d.line([(x, h * (0.25 if i % 5 else 0.12)), (x, h * 0.75)], fill=(120, 104, 70, 150 if i % 5 else 200), width=2)
    im.putalpha(rounded(w, h, R - 22))
    im.save(OUT + 'gauge_fill.png', optimize=True)


if __name__ == '__main__':
    gauge(); fill(); print('painted the gauge')
