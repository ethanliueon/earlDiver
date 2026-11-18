#!/usr/bin/env python3
"""Paints the olive locker as PNGs (assets/ui/olive/): the inventory's door, a panel for the other screens, and the
pressed-steel wells things sit in.

    python3 tools/olive_kit.py

The look is the original olive (js/textures.js), painted with far more care: steel under red-oxide primer under olive
topcoat, and wear that goes through the layers in order (olive -> primer -> bright steel) where hands and boots and
the sea have been; the paint's own mottle and orange-peel; grime settling low; rust weeping from the rivets and
blooming along the foot; the seam, the hinge, the vent, the tread plate, the maker's plate and the stencil. Everything
is drawn at twice the size it is shown, from a fixed seed.
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui', 'olive')
os.makedirs(OUT, exist_ok=True)
K = 2  # drawn at 2x
FONT_MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
FONT_SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


# ---------------------------------------------------------------- noise
def vnoise(w, h, cell, rng, octaves=4, persist=0.5):
    """value noise, 0..1, summed octaves (cell = size of the coarsest feature in px)"""
    acc = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        c = max(1.0, cell / (2 ** o))
        gw, gh = int(w / c) + 2, int(h / c) + 2
        g = rng.random((gh, gw)).astype(np.float32)
        im = Image.fromarray((g * 255).astype(np.uint8)).resize((int(gw * c), int(gh * c)), Image.BICUBIC)
        acc += np.asarray(im, np.float32)[:h, :w] / 255.0 * amp; tot += amp; amp *= persist
    return acc / tot


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0


def lerp(a, b, t):
    return a + (b - a) * t


def mix(col, rgb, t):
    t = np.clip(t, 0, 1)[..., None]
    return col * (1 - t) + np.array(rgb, np.float32) * t


def stroke_mask(w, h, draw_fn, blur_r=0):
    im = Image.new('L', (w, h), 0); draw_fn(ImageDraw.Draw(im))
    if blur_r: im = im.filter(ImageFilter.GaussianBlur(blur_r))
    return np.asarray(im, np.float32) / 255.0


# ---------------------------------------------------------------- the painted steel
def painted_steel(w, h, seed, olive=(78, 90, 64), wear=1.0, light=(0.3, -0.15)):
    """returns (rgb float array, wear map) for a plate of painted steel w x h"""
    rng = np.random.default_rng(seed); R = random.Random(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # the paint: an olive topcoat, uneven from the roller (large mottle), with orange-peel (fine), and its own
    # faded patches where the sun and salt have been at it
    mott = vnoise(w, h, 260 * K, rng, 5)
    peel = vnoise(w, h, 3 * K, rng, 2)
    fade = np.clip((vnoise(w, h, 180 * K, rng, 4) - 0.55) * 2.4, 0, 1)
    base = np.array(olive, np.float32)
    mott2 = vnoise(w, h, 60 * K, rng, 3)
    col = base[None, None] * (0.86 + 0.2 * mott[..., None]) * (0.93 + 0.14 * mott2[..., None]) * (0.96 + 0.08 * peel[..., None])
    col = mix(col, (128, 136, 108), fade * 0.35)                       # sun-faded, chalky
    # brush and roller marks: faint long streaks, mostly vertical (it was painted standing)
    streak = vnoise(w, h, 2 * K, rng, 1)
    streak = np.asarray(Image.fromarray((streak * 255).astype(np.uint8)).resize((w // 6 + 1, h)).resize((w, h), Image.BICUBIC), np.float32) / 255
    col *= (0.975 + 0.05 * streak[..., None])
    # wear: where things rub. The edges, a band where hands go (mid height), the lower third (boots, crates), and
    # random knocks. Thresholded noise, so it chips in ragged islands, deeper wear exposing primer then steel.
    edge = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy))
    rub = np.exp(-edge / (10 * K)) * 0.62
    hands = np.exp(-((yy / h - 0.55) ** 2) / 0.02) * 0.35
    low = np.clip((yy / h - 0.72) / 0.28, 0, 1) * 0.45
    knock = np.clip((vnoise(w, h, 90 * K, rng, 3) - 0.66) * 2.5, 0, 1) * 0.35
    want = (rub + hands + low + knock) * wear
    chip_n = vnoise(w, h, 7 * K, rng, 3, 0.55)
    w1 = np.clip((want * 0.9 + chip_n * 0.75 - 1.02) * 9, 0, 1)        # through the olive: primer
    w2 = np.clip((want * 0.9 + chip_n * 0.75 - 1.16) * 9, 0, 1)        # through the primer: bare steel
    primer = np.array((108, 66, 48), np.float32) * (0.85 + 0.25 * mott[..., None])
    steel = np.array((150, 150, 142), np.float32) * (0.75 + 0.3 * vnoise(w, h, 4 * K, rng, 2)[..., None])
    col = col * (1 - w1[..., None]) + primer * w1[..., None]
    col = col * (1 - w2[..., None]) + steel * w2[..., None]
    # the chip's edge: paint is thick, so each chip has a thin dark lip on its lower side and a pale one above
    lip = np.clip(np.roll(w1, 1, 0) - w1, 0, 1)
    col = mix(col, (40, 44, 32), lip * 0.6)
    lip2 = np.clip(np.roll(w1, -1, 0) - w1, 0, 1)
    col = mix(col, (170, 176, 150), lip2 * 0.35)
    # scratches: fine bright lines through the paint, short ones in clusters (things dragged against it)
    def scr(d):  # few, each its own length and weight; most fine, a few deep enough to show steel
        for _ in range(int(w * h / (26000 * K * K))):
            cx, cy = R.uniform(0, w), R.uniform(0, h); ang = R.uniform(0, math.pi); L = R.expovariate(1 / 18) * K + 3 * K
            bend = R.uniform(-0.15, 0.15); pts = [(cx + math.cos(ang + bend * t) * L * t, cy + math.sin(ang + bend * t) * L * t) for t in np.linspace(0, 1, 6)]
            d.line(pts, fill=int(R.uniform(40, 120) if R.random() < 0.85 else 230), width=1)
    sc = stroke_mask(w, h, scr, 0.4)
    col = mix(col, (40, 44, 32), np.roll(sc, 1, 0) * 0.3)        # each scratch's dark lower edge
    col = mix(col, (170, 172, 160), sc * 0.6)
    # grime: settles low and in the corners, darker and browner, with drip lines from the top
    grime = np.clip(vnoise(w, h, 120 * K, rng, 4) * 0.6 + (yy / h) ** 2 * 0.5 + np.exp(-edge / (40 * K)) * 0.25 - 0.45, 0, 1)
    col = mix(col, (34, 34, 22), grime * 0.55)
    drips = vnoise(w, h, 3 * K, rng, 1)
    drips = np.asarray(Image.fromarray((drips * 255).astype(np.uint8)).resize((w // 10 + 1, h // 60 + 1)).resize((w, h), Image.BICUBIC), np.float32) / 255
    col = mix(col, (40, 40, 28), np.clip((drips - 0.6) * 2, 0, 1) * 0.25)
    # touched-up paint: rough-edged patches of a slightly different olive, brushed over old knocks
    def patches(dr):
        for _ in range(int(w * h / (220000 * K * K)) + 2):
            px, py = R.uniform(0, w), R.uniform(0, h); pw, ph = R.uniform(30, 110) * K, R.uniform(20, 70) * K
            pts = [(px + math.cos(a) * pw * (0.7 + 0.3 * R.random()), py + math.sin(a) * ph * (0.7 + 0.3 * R.random())) for a in np.linspace(0, 2 * math.pi, 14)]
            dr.polygon(pts, fill=R.randint(120, 255))
    tp = stroke_mask(w, h, patches, 0.7 * K)
    col = col * (1 - tp[..., None] * 0.55) + (np.array(olive, np.float32) * np.array((1.07, 1.06, 1.03), np.float32))[None, None] * (0.95 + 0.1 * peel[..., None]) * tp[..., None] * 0.55
    # hand smudges: soft dark prints at hand height near the edges of the plate, where it is pushed shut
    def smudge(dr):
        for _ in range(5):
            px = R.choice([R.uniform(0.04, 0.2), R.uniform(0.8, 0.96)]) * w; py = R.uniform(0.4, 0.7) * h
            for k in range(4): dr.ellipse([px + k * 9 * K - 8 * K, py - 6 * K + R.uniform(-3, 3) * K, px + k * 9 * K + 4 * K, py + 10 * K], fill=R.randint(60, 140))
    sm = stroke_mask(w, h, smudge, 4 * K)
    col = mix(col, (30, 30, 20), sm * 0.22)
    # the paint's own grain
    col *= (0.97 + 0.06 * rng.random((h, w), dtype=np.float32))[..., None]
    # the lamp above: light falls on it unevenly, brighter high and to one side, a soft vignette
    lx, ly = light
    lamp = 1.08 - 0.28 * np.hypot((xx / w - 0.5 - lx * 0.5), (yy / h - 0.15 + ly)) ** 1.3
    col *= lamp[..., None]
    return col, w1


def rivet(img, cx, cy, r, R, rust=0.5):
    """a domed rivet, painted over, the crown worn to steel, a weep of rust under it"""
    d = ImageDraw.Draw(img, 'RGBA')
    if R.random() < rust * 0.6:  # a faint weep of rust under some of them
        L = R.uniform(5, 22) * K; wob = R.uniform(-0.3, 0.3)
        for k in range(int(L)):
            a = int(36 * (1 - k / L) ** 2)
            d.ellipse([cx - r * 0.35 + k * wob, cy + k - r * 0.3, cx + r * 0.35 + k * wob, cy + k + r * 0.3], fill=(104, 62, 34, a))
    d.ellipse([cx - r - 1, cy - r + 1, cx + r + 1, cy + r + 3], fill=(0, 0, 0, 110))          # its shadow
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(70, 80, 58, 255))                       # painted head
    d.ellipse([cx - r * 0.75, cy - r * 0.85, cx + r * 0.35, cy + r * 0.2], fill=(104, 116, 86, 255))  # lit side
    if R.random() < 0.7:
        d.ellipse([cx - r * 0.45, cy - r * 0.6, cx + r * 0.1, cy - r * 0.1], fill=(168, 168, 158, 230))  # worn crown
    d.arc([cx - r, cy - r, cx + r, cy + r], 20, 160, fill=(20, 22, 16, 200), width=max(1, int(r * 0.25)))


def to_img(col):
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- the locker door (the inventory, 1240 x 820)
def locker_door(W=1240, H=820, split=605):
    w, h, sp = W * K, H * K, split * K
    R = random.Random(7)
    left, wl = painted_steel(sp, h, 11, olive=(80, 92, 66), wear=0.9)
    right, wr = painted_steel(w - sp, h, 12, olive=(74, 86, 60), wear=1.25, light=(-0.3, -0.15))  # the right plate: older
    col = np.concatenate([left, right], axis=1)
    img = to_img(col); d = ImageDraw.Draw(img, 'RGBA')  # (an opaque image: translucent strokes blend on it; on RGBA they would overwrite)
    # the frame round the door: a bevel, light along the top and left, dark along the bottom and right
    for i in range(10 * K):
        a = int(90 * (1 - i / (10 * K)))
        d.line([(i, i), (w - 1 - i, i)], fill=(210, 220, 190, a // 9)); d.line([(i, i), (i, h - 1 - i)], fill=(210, 220, 190, a // 12))
        d.line([(i, h - 1 - i), (w - 1 - i, h - 1 - i)], fill=(0, 0, 0, a)); d.line([(w - 1 - i, i), (w - 1 - i, h - 1 - i)], fill=(0, 0, 0, a // 2))
    d.rectangle([0, 0, w - 1, h - 1], outline=(10, 12, 8, 255), width=2 * K)
    # the seam: the right plate lapped over the left; its edge throws a shadow; a row of rivets down it
    d.rectangle([sp - 3 * K, 0, sp + 1 * K, h], fill=(14, 16, 10, 190))
    d.line([(sp + 2 * K, 0), (sp + 2 * K, h)], fill=(190, 200, 170, 60), width=K)
    y = 22 * K
    while y < h - 20 * K:
        rivet(img, sp + 9 * K, y + R.uniform(-1, 1) * K, 4.2 * K, R, 0.35); y += R.uniform(44, 50) * K
    # rivets along the top and the foot, where the plates meet the frame
    for yy in (14 * K, h - 70 * K):
        x = 26 * K
        while x < w - 20 * K:
            if abs(x - sp) > 18 * K: rivet(img, x + R.uniform(-1, 1) * K, yy + R.uniform(-1, 1) * K, 3.8 * K, R, 0.5 if yy > h / 2 else 0.3)
            x += R.uniform(54, 62) * K
    # the hinge strap down the left edge: a steel strap with three knuckles and their pins
    d.rectangle([4 * K, 30 * K, 16 * K, h - 80 * K], fill=(58, 62, 52, 255))
    d.line([(16 * K, 30 * K), (16 * K, h - 80 * K)], fill=(0, 0, 0, 140), width=K)
    for ky in (90, 410, 690):
        kyk = ky * K
        d.rounded_rectangle([0, kyk - 34 * K, 14 * K, kyk + 34 * K], radius=5 * K, fill=(66, 70, 60, 255), outline=(16, 18, 14, 255), width=K)
        d.line([(3 * K, kyk - 30 * K), (3 * K, kyk + 30 * K)], fill=(150, 154, 140, 120), width=K)
        for by in (-22, 0, 22): rivet(img, 10 * K, kyk + by * K, 2.6 * K, R, 0.3)
    # the vent louvre high on the right plate: slats, each lit on its top, dark gap under, dust caught in them
    vx, vy, vw = w - 190 * K, 38 * K, 120 * K
    d.rounded_rectangle([vx - 6 * K, vy - 6 * K, vx + vw + 6 * K, vy + 46 * K], radius=3 * K, fill=(40, 46, 34, 255), outline=(12, 14, 10, 255), width=K)
    for i in range(7):
        sy = vy + i * 6 * K
        d.rectangle([vx, sy, vx + vw, sy + 3 * K], fill=(92, 104, 78, 255)); d.line([(vx, sy), (vx + vw, sy)], fill=(170, 180, 150, 140), width=K)
        d.rectangle([vx, sy + 3 * K, vx + vw, sy + 6 * K], fill=(10, 12, 8, 255))
    # the kick plate along the foot: diamond tread, embossed, worn bright where boots go
    ky0 = h - 46 * K
    tread = Image.new('RGBA', (w, 46 * K), (88, 90, 84, 255)); td = ImageDraw.Draw(tread, 'RGBA')
    rr = random.Random(3)
    for ty in range(0, 46 * K, 12 * K):
        for tx in range(-12 * K, w, 24 * K):
            ox = tx + (12 * K if (ty // (12 * K)) % 2 else 0)
            cx, cy = ox + 12 * K, ty + 6 * K
            pts = [(cx - 7 * K, cy + 2 * K), (cx + 5 * K, cy - 3 * K), (cx + 7 * K, cy - 2 * K), (cx - 5 * K, cy + 3 * K)]
            td.polygon([(px + K, py + K) for px, py in pts], fill=(30, 32, 28, 200))
            bright = 0.5 + 0.5 * math.exp(-((cx / w - 0.5) ** 2) / 0.04)
            td.polygon(pts, fill=(int(150 + 60 * bright), int(152 + 60 * bright), int(144 + 56 * bright), 255))
    ta = np.asarray(tread, np.float32)
    tn = vnoise(w, 46 * K, 30 * K, np.random.default_rng(4), 3)
    ta[..., :3] *= (0.75 + 0.35 * tn[..., None])
    rust_t = np.clip((vnoise(w, 46 * K, 40 * K, np.random.default_rng(5), 3) - 0.62) * 3, 0, 1)
    ta[..., :3] = ta[..., :3] * (1 - rust_t[..., None] * 0.6) + np.array([112, 60, 28], np.float32) * rust_t[..., None] * 0.6
    tim = Image.fromarray(np.clip(ta, 0, 255).astype(np.uint8), 'RGBA'); img.paste(tim, (0, ky0), tim)
    d = ImageDraw.Draw(img, 'RGBA')
    d.line([(0, ky0), (w, ky0)], fill=(0, 0, 0, 200), width=2 * K); d.line([(0, ky0 + 2 * K), (w, ky0 + 2 * K)], fill=(220, 220, 210, 60), width=K)
    for x in range(20 * K, w, 120 * K): rivet(img, x, ky0 + 23 * K, 3.4 * K, R, 0.6)
    # the maker's plate: a small aluminium plate, riveted, engraved
    mx, my = w - 370 * K, h - 136 * K
    d.rounded_rectangle([mx, my, mx + 142 * K, my + 26 * K], radius=2 * K, fill=(176, 172, 158, 255), outline=(60, 58, 50, 255), width=K)
    f = ImageFont.truetype(FONT_MONO, 9 * K)
    d.text((mx + 12 * K, my + 3 * K), 'DIVE LOCKER  No. 07', font=f, fill=(48, 46, 40, 255))
    d.text((mx + 12 * K, my + 13 * K), 'BAYSIDE MARINE  1974', font=ImageFont.truetype(FONT_MONO, 7 * K), fill=(70, 68, 60, 255))
    rivet(img, mx + 5 * K, my + 13 * K, 2 * K, R, 0); rivet(img, mx + 137 * K, my + 13 * K, 2 * K, R, 0)
    # the stencilled 07, sprayed and weathered, low on the right plate
    st = Image.new('L', (w, h), 0); sd = ImageDraw.Draw(st)
    sd.text((w - 230 * K, h - 260 * K), '07', font=ImageFont.truetype(FONT_SANS, 170 * K), fill=255)
    sm = np.asarray(st.filter(ImageFilter.GaussianBlur(1.2 * K)), np.float32) / 255
    sm *= np.clip(vnoise(w, h, 9 * K, np.random.default_rng(8), 3) * 1.6 - 0.35, 0, 1)
    a = np.asarray(img, np.float32)
    a[..., :3] = a[..., :3] * (1 - sm[..., None] * 0.13) + np.array([226, 222, 200], np.float32) * sm[..., None] * 0.13
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    # a faded handling decal on the left plate's top corner
    dm = Image.new('L', (w, h), 0); ImageDraw.Draw(dm).text((44 * K, h - 112 * K), 'KEEP CLOSED AT SEA', font=ImageFont.truetype(FONT_SANS, 9 * K), fill=255)
    dmm = np.asarray(dm.filter(ImageFilter.GaussianBlur(0.6 * K)), np.float32) / 255 * np.clip(vnoise(w, h, 4 * K, np.random.default_rng(9), 2) * 1.8 - 0.5, 0, 1)
    a = np.asarray(img, np.float32); a[..., :3] = a[..., :3] * (1 - dmm[..., None] * 0.3) + np.array([214, 208, 184], np.float32) * dmm[..., None] * 0.3
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return img


# ---------------------------------------------------------------- a panel for the other screens (nine-slice) + a tile
def panel(S=360):
    w = h = S * K
    col, _ = painted_steel(w, h, 21, olive=(78, 90, 64), wear=0.75)
    img = to_img(col); d = ImageDraw.Draw(img, 'RGBA'); R = random.Random(22)
    for i in range(8 * K):
        a = int(90 * (1 - i / (8 * K)))
        d.line([(i, i), (w - 1 - i, i)], fill=(210, 220, 190, a // 9)); d.line([(i, i), (i, h - 1 - i)], fill=(210, 220, 190, a // 12))
        d.line([(i, h - 1 - i), (w - 1 - i, h - 1 - i)], fill=(0, 0, 0, a)); d.line([(w - 1 - i, i), (w - 1 - i, h - 1 - i)], fill=(0, 0, 0, a // 2))
    d.rectangle([0, 0, w - 1, h - 1], outline=(10, 12, 8, 255), width=2 * K)
    for (x, y) in ((14, 14), (S - 14, 14), (14, S - 14), (S - 14, S - 14)):
        rivet(img, x * K + R.uniform(-1, 1) * K, y * K + R.uniform(-1, 1) * K, 3.8 * K, R, 0.5 if y > S / 2 else 0.25)
    return img


def tile(S=512):
    """the paint alone, seamless (mirrored, so it wraps): for the middle of any panel"""
    col, _ = painted_steel(S * K // 2, S * K // 2, 31, olive=(78, 90, 64), wear=0.25)
    q = to_img(col)
    full = Image.new('RGB', (S * K, S * K))
    full.paste(q, (0, 0)); full.paste(q.transpose(Image.FLIP_LEFT_RIGHT), (S * K // 2, 0))
    full.paste(q.transpose(Image.FLIP_TOP_BOTTOM), (0, S * K // 2)); full.paste(q.transpose(Image.ROTATE_180), (S * K // 2, S * K // 2))
    return full


# ---------------------------------------------------------------- a well: a recess pressed into the door (nine-slice)
def well(S=96, depth=1.0):
    w = h = S * K
    rng = np.random.default_rng(41)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.array((34, 39, 28), np.float32)
    n = vnoise(w, h, 30 * K, rng, 4)
    col = base[None, None] * (0.85 + 0.3 * n[..., None])
    edge_top = np.clip(1 - yy / (14 * K), 0, 1) ** 1.6
    edge_l = np.clip(1 - xx / (10 * K), 0, 1) ** 1.6
    col *= (1 - 0.6 * depth * np.maximum(edge_top, edge_l * 0.7))[..., None]   # the shadow of the lip
    bot = np.clip(1 - (h - 1 - yy) / (3 * K), 0, 1)
    col = mix(col, (150, 160, 130), bot * 0.35)                                  # light caught on the lower lip
    img = to_img(col); d = ImageDraw.Draw(img, 'RGBA')
    # the pressed lip: the paint worn on it, a thin bright edge outside, dark inside
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=6 * K, outline=(12, 14, 10, 255), width=K)
    d.line([(6 * K, h - 1), (w - 6 * K, h - 1)], fill=(190, 196, 170, 70), width=K)
    rng2 = random.Random(42)
    for _ in range(26):
        x = rng2.uniform(0, w); L = rng2.uniform(4, 16) * K
        d.line([(x, 1), (x + L, 1)], fill=(160, 158, 148, rng2.randint(40, 110)), width=K)  # the top lip, chipped
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=6 * K, fill=255)
    img.putalpha(m)
    return img


def pegboard(S=88):
    """perforated steel for the locker's back (seamless): painted olive, darker than the door, a hole every 11 px
    with its punched rim and a little rust in some"""
    w = h = S * K; rng = np.random.default_rng(51); R = random.Random(52)
    n = vnoise(w, h, 40 * K, rng, 3)
    col = np.array((58, 68, 46), np.float32)[None, None] * (0.85 + 0.25 * n[..., None]) * (0.95 + 0.1 * rng.random((h, w), dtype=np.float32))[..., None]
    img = to_img(col); d = ImageDraw.Draw(img, 'RGBA'); st = 11 * K
    for y in range(st // 2, h, st):
        for x in range(st // 2, w, st):
            r = 1.9 * K
            d.ellipse([x - r - K * 0.6, y - r + K * 0.5, x + r + K * 0.6, y + r + K * 1.2], fill=(150, 160, 130, 45))   # the punched rim catching light below
            d.ellipse([x - r, y - r, x + r, y + r], fill=(6, 7, 5, 255))
            if R.random() < 0.12: d.arc([x - r - K, y - r - K, x + r + K, y + r + K], 0, 180, fill=(110, 60, 30, 90), width=K)
    return img

def button(kind='olive', W=120, H=48, pressed=False, seed=61):
    """a raised plate (nine-slice: 14 px corners at 1x): painted steel with a bevel, a cast shadow, paint chipped at its
    corners where thumbs go. kind 'cream' is the Margaret's white deck paint (the one thing to do); 'olive' the rest"""
    w, h = W * K, H * K; pad = 4 * K
    paint = (214, 206, 182) if kind == 'cream' else (86, 98, 70)
    col, wear = painted_steel(w - 2 * pad, h - 2 * pad, seed, olive=paint, wear=0.0)
    rng = np.random.default_rng(seed + 1); yy, xx = np.mgrid[0:h - 2 * pad, 0:w - 2 * pad].astype(np.float32)
    ih, iw = h - 2 * pad, w - 2 * pad
    # chips at the corners and along the lower edge: through to olive (on cream) or to primer (on olive)
    cd = np.minimum(np.hypot(xx, yy), np.minimum(np.hypot(iw - xx, yy), np.minimum(np.hypot(xx, ih - yy), np.hypot(iw - xx, ih - yy))))
    want = np.exp(-cd / (9 * K)) * 1.0 + np.clip((yy / ih - 0.85) * 4, 0, 1) * 0.4
    chip = np.clip((want + vnoise(iw, ih, 5 * K, rng, 3) * 0.7 - 1.05) * 8, 0, 1)
    under = (78, 90, 64) if kind == 'cream' else (108, 66, 48)
    col = mix(col, under, chip)
    # the bevel: lit along the top and left, shadowed along the bottom and right, 3 px at 1x
    e = 3 * K
    top = np.clip(1 - yy / e, 0, 1); left = np.clip(1 - xx / e, 0, 1); bot = np.clip(1 - (ih - 1 - yy) / e, 0, 1); right = np.clip(1 - (iw - 1 - xx) / e, 0, 1)
    k = -1 if pressed else 1
    col *= (1 + k * 0.28 * np.maximum(top, left * 0.7))[..., None]
    col *= (1 - k * 0.35 * np.maximum(bot, right * 0.7))[..., None]
    if pressed: col *= 0.9
    face = to_img(col)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sh = Image.new('L', (w, h), 0); ImageDraw.Draw(sh).rounded_rectangle([pad + K, pad + (1 if pressed else 3) * K, w - pad + K, h - pad + (1 if pressed else 3) * K], radius=4 * K, fill=170)
    out.putalpha(sh.filter(ImageFilter.GaussianBlur(2 * K)))
    out = Image.composite(out, Image.new('RGBA', (w, h), (0, 0, 0, 0)), out.getchannel('A'))
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 255)); shadow.putalpha(out.getchannel('A'))
    m = Image.new('L', (iw, ih), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, iw - 1, ih - 1], radius=4 * K, fill=255)
    face.putalpha(m)
    base = Image.new('RGBA', (w, h), (0, 0, 0, 0)); base.alpha_composite(shadow); base.alpha_composite(face, (pad, pad))
    d = ImageDraw.Draw(base); d.rounded_rectangle([pad, pad, w - pad - 1, h - pad - 1], radius=4 * K, outline=(14, 16, 12, 255), width=K)
    return base


# ---------------------------------------------------------------- (olive-studio) the instruments in the corner of the play screen
def plate(W, H, seed, rivets=True, wear=0.55, olive=(78, 90, 64), radius=5):
    """a small raised plate of the locker's painted steel: bevel, a cast shadow, a rivet in each corner"""
    w, h = W * K, H * K; pad = 5 * K
    col, _ = painted_steel(w - 2 * pad, h - 2 * pad, seed, olive=olive, wear=wear, light=(0.2, -0.2))
    iw, ih = w - 2 * pad, h - 2 * pad
    yy, xx = np.mgrid[0:ih, 0:iw].astype(np.float32); e = 3 * K
    col *= (1 + 0.24 * np.maximum(np.clip(1 - yy / e, 0, 1), np.clip(1 - xx / e, 0, 1) * 0.6))[..., None]
    col *= (1 - 0.34 * np.maximum(np.clip(1 - (ih - 1 - yy) / e, 0, 1), np.clip(1 - (iw - 1 - xx) / e, 0, 1) * 0.6))[..., None]
    face = to_img(col).convert('RGBA')
    m = Image.new('L', (iw, ih), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, iw - 1, ih - 1], radius=radius * K, fill=255); face.putalpha(m)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sh = Image.new('L', (w, h), 0); ImageDraw.Draw(sh).rounded_rectangle([pad, pad + 3 * K, w - pad, h - pad + 3 * K], radius=radius * K, fill=190)
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 255)); shadow.putalpha(sh.filter(ImageFilter.GaussianBlur(3 * K)))
    out.alpha_composite(shadow); out.alpha_composite(face, (pad, pad))
    d = ImageDraw.Draw(out); d.rounded_rectangle([pad, pad, w - pad - 1, h - pad - 1], radius=radius * K, outline=(12, 14, 10, 255), width=K)
    if rivets:
        R = random.Random(seed + 7); r = 2.6 * K; m2 = pad + 8 * K
        for (x, y) in ((m2, m2), (w - m2, m2), (m2, h - m2), (w - m2, h - m2)): rivet(out, x, y, r, R, 0.0)
    return out


def recess(img, box, radius=4, depth=1.0, glass=None, seed=91):
    """press a window into a plate: a dark recess with a shadowed upper lip and light on the lower one; glass
    (an rgb) gives it a dark tinted face with a soft reflection"""
    x0, y0, x1, y1 = [int(v) for v in box]; w, h = x1 - x0, y1 - y0
    rng = np.random.default_rng(seed); yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    base = np.array(glass or (22, 26, 18), np.float32)
    col = base[None, None] * (0.85 + 0.25 * vnoise(w, h, 24 * K, rng, 3)[..., None])
    col *= (1 - 0.65 * depth * np.maximum(np.clip(1 - yy / (7 * K), 0, 1) ** 1.5, np.clip(1 - xx / (6 * K), 0, 1) ** 1.5 * 0.6))[..., None]
    col = mix(col, (150, 160, 130), np.clip(1 - (h - 1 - yy) / (2 * K), 0, 1) * 0.3)
    if glass:  # a soft reflection across the glass, upper left
        refl = np.exp(-(((xx / w) - 0.25) ** 2) / 0.05 - (((yy / h) - 0.2) ** 2) / 0.04) * 0.12
        col = col + 255 * refl[..., None]
    face = to_img(col).convert('RGBA'); m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius * K, fill=255); face.putalpha(m)
    img.alpha_composite(face, (x0, y0))
    ImageDraw.Draw(img).rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=radius * K, outline=(8, 10, 6, 255), width=K)
    return img


def hud_depth():
    """the depth gauge: a riveted plate with a deep dark window for large figures (drawn live)"""
    W, H = 200, 84; img = plate(W, H, 101)
    return recess(img, (16 * K, 15 * K, (W - 16) * K, (H - 17) * K), radius=4, glass=(14, 20, 20), seed=102)


def hud_bar():
    """a gauge housing for a level (air, hull): a long plate with a slot for the reading (nine-slice across)"""
    W, H = 200, 30; img = plate(W, H, 111, rivets=False, wear=0.35, radius=4)
    return recess(img, (62 * K, 11 * K, (W - 12) * K, (H - 12) * K), radius=2, seed=112)  # the name is painted on the plate to the slot's left


def hud_scope(S=96):
    """the sonar: a dark glass face in a riveted ring of painted steel; faint range rings and a glare (the sweep is live)"""
    w = h = S * K; c = w / 2; R0 = c - 4 * K
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    col, _ = painted_steel(w, h, 121, wear=0.5, light=(0.2, -0.2)); ring = to_img(col).convert('RGBA')
    m = Image.new('L', (w, h), 0); dm = ImageDraw.Draw(m); dm.ellipse([4 * K, 4 * K, w - 4 * K, h - 4 * K], fill=255); dm.ellipse([14 * K, 14 * K, w - 14 * K, h - 14 * K], fill=0)
    ring.putalpha(m)
    sh = Image.new('L', (w, h), 0); ImageDraw.Draw(sh).ellipse([5 * K, 8 * K, w - 3 * K, h], fill=180)
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 255)); shadow.putalpha(sh.filter(ImageFilter.GaussianBlur(3 * K)))
    out.alpha_composite(shadow)
    # the glass: dark sea-green, deeper at the rim
    rng = np.random.default_rng(122); yy, xx = np.mgrid[0:h, 0:w].astype(np.float32); rr = np.hypot(xx - c, yy - c) / (c - 14 * K)
    g = np.array((10, 24, 22), np.float32)[None, None] * (1.15 - 0.5 * np.clip(rr, 0, 1) ** 2)[..., None] * (0.9 + 0.2 * vnoise(w, h, 20 * K, rng, 3)[..., None])
    glass = to_img(g).convert('RGBA'); gm = Image.new('L', (w, h), 0); ImageDraw.Draw(gm).ellipse([14 * K, 14 * K, w - 14 * K, h - 14 * K], fill=255); glass.putalpha(gm)
    out.alpha_composite(glass)
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0)); dl = ImageDraw.Draw(lay)  # (faint lines on their own layer: drawing on RGBA replaces, it does not blend)
    for f in (0.33, 0.66): rr2 = (c - 14 * K) * f; dl.ellipse([c - rr2, c - rr2, c + rr2, c + rr2], outline=(130, 186, 160, 34), width=K)
    dl.line([(c, 16 * K), (c, h - 16 * K)], fill=(130, 186, 160, 20), width=K); dl.line([(16 * K, c), (w - 16 * K, c)], fill=(130, 186, 160, 20), width=K)
    out.alpha_composite(lay)
    out.alpha_composite(ring)
    d = ImageDraw.Draw(out, 'RGBA')
    # the ring's bevel and its screws
    d.ellipse([4 * K, 4 * K, w - 4 * K, h - 4 * K], outline=(10, 12, 8, 255), width=K)
    d.ellipse([14 * K, 14 * K, w - 14 * K, h - 14 * K], outline=(6, 8, 6, 255), width=2 * K)
    lay2 = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(lay2).arc([6 * K, 6 * K, w - 6 * K, h - 6 * K], 200, 300, fill=(200, 210, 180, 60), width=K); out.alpha_composite(lay2)
    R = random.Random(123)
    for a in (45, 135, 225, 315):
        x = c + math.cos(math.radians(a)) * (R0 - 5 * K); y = c + math.sin(math.radians(a)) * (R0 - 5 * K); rivet(out, x, y, 2.4 * K, R, 0.0)
    # a glare on the glass
    gl = Image.new('L', (w, h), 0); ImageDraw.Draw(gl).ellipse([24 * K, 20 * K, c, c - 6 * K], fill=46); gl = gl.filter(ImageFilter.GaussianBlur(6 * K))
    glare = Image.new('RGBA', (w, h), (230, 240, 230, 255)); glare.putalpha(Image.fromarray(np.minimum(np.asarray(gl), np.asarray(gm))))
    out.alpha_composite(glare)
    return out


def hud_slot(on=False):
    """a tool's slot on the hotbar: a raised plate with a well pressed into it; the tool in hand ringed in cream paint"""
    W, H = 92, 56; img = plate(W, H, 131 if not on else 133, rivets=False, wear=0.45, radius=5)
    recess(img, (9 * K, 9 * K, (W - 9) * K, (H - 10) * K), radius=3, seed=132)
    if on:
        lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); pad = 5 * K
        ImageDraw.Draw(lay).rounded_rectangle([pad - K, pad - K, W * K - pad, H * K - pad], radius=6 * K, outline=(226, 218, 190, 235), width=2 * K); img.alpha_composite(lay)
    return img


def save(img, name):
    p = os.path.join(OUT, name); img.save(p, optimize=True)
    print(f'  {name:22s} {img.size[0]}x{img.size[1]}  {os.path.getsize(p) // 1024} KB')


if __name__ == '__main__':
    print('assets/ui/olive:')
    im = locker_door().convert('RGB'); p = os.path.join(OUT, 'locker-door.jpg'); im.save(p, quality=88, optimize=True); print(f'  locker-door.jpg        {im.size[0]}x{im.size[1]}  {os.path.getsize(p) // 1024} KB')
    save(panel(), 'panel.png')
    save(tile(), 'tile.png')
    save(well(), 'well.png')
    save(pegboard(), 'pegboard.png')
    save(button('cream'), 'btn-cream.png'); save(button('cream', pressed=True), 'btn-cream-down.png')
    save(button('olive', seed=63), 'btn-olive.png'); save(button('olive', pressed=True, seed=63), 'btn-olive-down.png')
    save(hud_depth(), 'hud-depth.png')
    save(hud_bar(), 'hud-bar.png')
    save(hud_scope(), 'hud-scope.png')
    save(hud_slot(), 'hud-slot.png'); save(hud_slot(True), 'hud-slot-on.png')
    save(plate(150, 44, 141), 'hud-plate.png')
