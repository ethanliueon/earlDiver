#!/usr/bin/env python3
"""Paints the UI kit: the textures and nine-slice plates every panel, button and gauge is built from.

    python3 tools/ui_kit.py          (writes assets/ui/*.png)

Everything is drawn at twice the size it is shown (the CSS halves it), from a fixed seed, so the same
art comes out every time. The aim is objects that look made and used: paint worn through at the edges
and corners where hands go, rivets only where plates are joined (and no two alike), brass gone dull with
a little verdigris in the recesses, paper with fibres, foxing and a deckled edge.
"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'ui')
os.makedirs(OUT, exist_ok=True)
R = random.Random(1974)          # the year Bayside Marine opened
NP = np.random.default_rng(1974)


# ---------------------------------------------------------------- noise and masks
def noise(w, h, scale, octaves=4, seed=None, tile=True):
    """Value noise in 0..1, summed over octaves. Tileable (the random grid wraps)."""
    rng = np.random.default_rng(seed if seed is not None else NP.integers(1 << 30))
    acc = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        gw, gh = max(2, int(w / scale) * (2 ** o)), max(2, int(h / scale) * (2 ** o))
        g = rng.random((gh, gw)).astype(np.float32)
        if tile:  # exactly periodic: the grid repeated 3x3, scaled, and the middle cut out
            big = Image.fromarray((np.tile(g, (3, 3)) * 255).astype(np.uint8)).resize((w * 3, h * 3), Image.BICUBIC)
            a = np.asarray(big, np.float32)[h:2 * h, w:2 * w] / 255.0
        else:
            a = np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) / 255.0
        acc += a * amp; tot += amp; amp *= 0.5
    return acc / tot


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def rgba(base_rgb, light):
    """base colour times a light map (h, w) -> RGB array"""
    b = np.array(base_rgb, np.float32)[None, None, :]
    return b * light[..., None]


def scratches(w, h, n, length, alpha, angle=None, seed=None, width=1, wrap=False):
    r = random.Random(seed)
    im = Image.new('L', (w, h), 0); d = ImageDraw.Draw(im)
    offs = [(ox, oy) for ox in (-w, 0, w) for oy in (-h, 0, h)] if wrap else [(0, 0)]  # (wrap: drawn again across each seam)
    for _ in range(n):
        x, y = r.uniform(0, w), r.uniform(0, h)
        a = angle + r.uniform(-0.25, 0.25) if angle is not None else r.uniform(0, math.pi)
        L = r.uniform(0.3, 1) * length
        pts = []
        for k in range(6):  # a scratch is never quite straight
            t = k / 5
            pts.append((x + math.cos(a) * L * t + r.uniform(-1, 1), y + math.sin(a) * L * t + r.uniform(-1, 1)))
        f = int(255 * r.uniform(0.3, 1) * alpha)
        for ox, oy in offs: d.line([(px + ox, py + oy) for px, py in pts], fill=f, width=width)
    return np.asarray(im, np.float32) / 255.0


def edge_dist(w, h, inset=0):
    """distance from the nearest edge, in pixels"""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    return np.minimum(np.minimum(x - inset, w - 1 - inset - x), np.minimum(y - inset, h - 1 - inset - y))


def rounded_mask(w, h, r, inset=0):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).rounded_rectangle([inset, inset, w - 1 - inset, h - 1 - inset], r, fill=255)
    return im


def save(img, name):
    img.save(os.path.join(OUT, name), optimize=True)
    print(f'  {name:28s} {img.size[0]}x{img.size[1]}  {os.path.getsize(os.path.join(OUT, name)) // 1024} KB')


# ---------------------------------------------------------------- pieces
def rivet(img, cx, cy, r, tone=(150, 156, 138), seed=0):
    """a domed rivet head: lit from the top left, a dark ring where it meets the plate, a speck of rust"""
    rr = random.Random(seed)
    s = int(r * 2 + 6); pad = 3
    a = np.zeros((s, s, 4), np.float32)
    y, x = np.mgrid[0:s, 0:s].astype(np.float32)
    ox, oy = s / 2 + rr.uniform(-0.3, 0.3), s / 2 + rr.uniform(-0.3, 0.3)
    d = np.hypot(x - ox, y - oy) / r
    dome = np.clip(1 - d, 0, 1)
    nx, ny = (x - ox) / r, (y - oy) / r
    lit = np.clip(0.55 + 0.9 * dome - 0.55 * (nx * 0.7 + ny * 0.7), 0.15, 1.5)
    base = np.array(tone, np.float32) * (0.92 + 0.16 * rr.random())
    a[..., :3] = base[None, None] * lit[..., None]
    a[..., 3] = np.clip((1.05 - d) * r, 0, 1) * 255
    # the shadow ring it casts
    sh = np.clip(1 - np.abs(d - 1.12) * 3.2, 0, 1) * 0.55
    sh_img = np.zeros_like(a); sh_img[..., 3] = sh * 255
    if rr.random() < 0.6:  # a little rust bleeding from under one side
        ang = rr.uniform(0, 2 * math.pi)
        rx, ry = ox + math.cos(ang) * r * 0.9, oy + math.sin(ang) * r * 0.9
        rd = np.hypot(x - rx, y - ry) / (r * 0.7)
        rust = np.clip(1 - rd, 0, 1) * 0.5
        a[..., 0] = a[..., 0] * (1 - rust) + 120 * rust; a[..., 1] = a[..., 1] * (1 - rust) + 66 * rust; a[..., 2] = a[..., 2] * (1 - rust) + 30 * rust
    shadow = Image.fromarray(sh_img.astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(1))
    head = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
    img.alpha_composite(shadow, (int(cx - s / 2 + 1), int(cy - s / 2 + 1.5)))
    img.alpha_composite(head, (int(cx - s / 2), int(cy - s / 2)))


def screw(img, cx, cy, r, seed=0, tone=(196, 172, 112)):
    """a slotted brass screw, the slot at whatever angle it was left"""
    rivet(img, cx, cy, r, tone, seed)
    rr = random.Random(seed + 7); ang = rr.uniform(0, math.pi)
    d = ImageDraw.Draw(img)
    dx, dy = math.cos(ang) * r * 0.78, math.sin(ang) * r * 0.78
    d.line([(cx - dx, cy - dy), (cx + dx, cy + dy)], fill=(58, 42, 16, 230), width=max(2, int(r * 0.32)))
    d.line([(cx - dx + 0.8, cy - dy + 1), (cx + dx + 0.8, cy + dy + 1)], fill=(255, 236, 180, 70), width=1)


# ---------------------------------------------------------------- materials
def painted_steel(w, h, paint=(78, 88, 74), seed=1, wear=1.0, corner_r=16):
    """olive deck paint on steel plate: mottled, scratched, worn through to bare metal at the edges"""
    mott = noise(w, h, 90, 5, seed)
    fine = noise(w, h, 6, 2, seed + 1)
    light = 0.86 + 0.22 * (mott - 0.5) + 0.06 * (fine - 0.5)
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    light = light * (1.08 - 0.18 * y)                      # lit from above, grime settles lower down
    col = rgba(paint, light)
    # grime: darker blotches, mostly low
    grime = np.clip((noise(w, h, 40, 4, seed + 2) - 0.55) * 3, 0, 1) * (0.25 + 0.5 * y)
    col *= (1 - 0.35 * grime)[..., None]
    # scratches through the paint (bright metal) and shallow scuffs (lighter paint)
    sc = scratches(w, h, int(w * h / 9000 * wear), 22, 0.55, seed=seed + 3)
    scuff = scratches(w, h, int(w * h / 2400 * wear), 14, 0.5, angle=0.1, seed=seed + 4)
    metal = np.array([118, 120, 112], np.float32)
    col = col * (1 - 0.6 * sc[..., None]) + np.array([150, 150, 140], np.float32) * 0.6 * sc[..., None]
    col = col * (1 - 0.18 * scuff[..., None]) + np.array([150, 160, 140], np.float32) * 0.18 * scuff[..., None]
    # paint worn off near the edges, ragged: bare steel, a touch of rust where it has been wet
    ed = edge_dist(w, h)
    rag = noise(w, h, 9, 3, seed + 5)
    worn = np.clip((5 * wear - ed) / 5 + (rag - 0.5) * 1.3, 0, 1) * (ed < 14)
    rust = np.clip((noise(w, h, 14, 3, seed + 6) - 0.62) * 4, 0, 1) * worn
    bare = metal * (0.62 + 0.25 * fine[..., None])
    col = col * (1 - worn[..., None]) + bare * worn[..., None]
    col = col * (1 - 0.6 * rust[..., None]) + np.array([112, 62, 30], np.float32) * 0.6 * rust[..., None]
    # a bevel: highlight on the top/left lip, shadow on the bottom/right
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    lip = np.clip(1 - ed / 3.5, 0, 1)
    side = np.where((xx < w / 2) & (yy < h / 2), 1, 0)
    top = np.clip(1 - yy / 4, 0, 1) + np.clip(1 - xx / 4, 0, 1)
    bot = np.clip(1 - (h - 1 - yy) / 4, 0, 1) + np.clip(1 - (w - 1 - xx) / 4, 0, 1)
    col = col * (1 + 0.35 * np.clip(top, 0, 1)[..., None]) * (1 - 0.45 * np.clip(bot, 0, 1)[..., None])
    img = to_img(col).convert('RGBA')
    img.putalpha(rounded_mask(w, h, corner_r))
    return img


def aged_brass(w, h, seed=11, corner_r=8, bright=1.0):
    """brass gone dull with handling: brushed grain, darker at the edges, verdigris in the corners"""
    grain = noise(w, h, 2, 1, seed)
    grain = np.asarray(Image.fromarray((grain * 255).astype(np.uint8)).resize((w, h)).filter(ImageFilter.BoxBlur(0)), np.float32) / 255
    streak = noise(w * 1, h, 1, 1, seed + 1)
    streak = np.asarray(Image.fromarray((streak * 255).astype(np.uint8)).resize((w, h)).filter(ImageFilter.GaussianBlur((12, 0)) if hasattr(ImageFilter, 'x') else ImageFilter.BoxBlur(0)), np.float32) / 255
    # horizontal brushing: blur noise along x only
    b = noise(w, h, 3, 1, seed + 2)
    bi = Image.fromarray((b * 255).astype(np.uint8)).resize((w * 4, h)).resize((w, h), Image.BILINEAR)
    brush = np.asarray(bi.filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255
    mott = noise(w, h, 50, 4, seed + 3)
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    light = (0.82 + 0.30 * (1 - y) ** 1.4) * (0.9 + 0.2 * mott) * (0.94 + 0.12 * brush) * bright
    base = np.array([186, 154, 92], np.float32)
    col = base[None, None] * light[..., None]
    ed = edge_dist(w, h)
    dark = np.clip(1 - ed / 10, 0, 1)
    col *= (1 - 0.35 * dark)[..., None]
    verd = np.clip((noise(w, h, 10, 3, seed + 4) - 0.5) * 3, 0, 1) * np.clip(1 - ed / 7, 0, 1) * 0.6
    col = col * (1 - verd[..., None]) + np.array([92, 130, 108], np.float32) * verd[..., None]
    sc = scratches(w, h, int(w * h / 3000), 18, 0.6, angle=0.0, seed=seed + 5)
    col = col * (1 + 0.12 * sc[..., None])
    # a stamped border line, a few px in
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    groove = np.exp(-((ed - 5.5) ** 2) / 1.2)
    col *= (1 - 0.32 * groove)[..., None]
    col *= (1 + 0.18 * np.exp(-((ed - 7) ** 2) / 1.0))[..., None]
    top = np.clip(1 - yy / 3, 0, 1); bot = np.clip(1 - (h - 1 - yy) / 3, 0, 1)
    col = col * (1 + 0.4 * top[..., None]) * (1 - 0.5 * bot[..., None])
    img = to_img(col).convert('RGBA')
    img.putalpha(rounded_mask(w, h, corner_r))
    return img


def paper(w, h, seed=21, tone=(232, 222, 196), foxing=1.0, tile=True):
    """laid paper: fibres, a faint chain-line texture, foxing spots and a tea-coloured edge"""
    fib = noise(w, h, 3, 2, seed, tile)
    mott = noise(w, h, 70, 5, seed + 1, tile)
    light = 0.93 + 0.08 * (mott - 0.5) + 0.05 * (fib - 0.5)
    col = rgba(tone, light)
    # fibres: tiny dark curls
    fr = random.Random(seed + 2); im = Image.new('L', (w, h), 0); d = ImageDraw.Draw(im)
    for _ in range(int(w * h / 900)):
        x, y = fr.uniform(0, w), fr.uniform(0, h); a = fr.uniform(0, math.pi); L = fr.uniform(2, 7)
        d.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], fill=fr.randint(30, 90), width=1)
    f = np.asarray(im.filter(ImageFilter.GaussianBlur(0.4)), np.float32) / 255
    col *= (1 - 0.25 * f)[..., None]
    # foxing: brown age spots
    fox = np.clip((noise(w, h, 22, 3, seed + 3, tile) - 0.74) * 4, 0, 1) * foxing
    col = col * (1 - 0.18 * fox[..., None]) + np.array([170, 120, 70], np.float32) * 0.18 * fox[..., None]
    return to_img(col).convert('RGBA')


def deckle(img, seed=31, depth=5, shadow=True, tea=True):
    """a torn, uneven paper edge and a darker, tea-stained margin; returns the sheet with a drop shadow"""
    w, h = img.size
    rr = random.Random(seed)
    m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    pts = []
    def wob(n):
        return [depth * (0.4 + 0.6 * rr.random()) for _ in range(n)]
    N = 140
    for i, o in enumerate(wob(N)): pts.append((w * i / N, o + 2))
    for i, o in enumerate(wob(N)): pts.append((w - o - 2, h * i / N))
    for i, o in enumerate(wob(N)): pts.append((w - w * i / N, h - o - 2))
    for i, o in enumerate(wob(N)): pts.append((o + 2, h - h * i / N))
    d.polygon(pts, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(img, np.float32)
    if tea:
        ed = edge_dist(w, h)
        stain = np.clip(1 - ed / 26, 0, 1) ** 1.6 * (0.6 + 0.4 * noise(w, h, 20, 3, seed + 1))
        a[..., :3] = a[..., :3] * (1 - 0.32 * stain[..., None]) + np.array([150, 104, 52], np.float32) * 0.32 * stain[..., None]
    out = Image.fromarray(a.astype(np.uint8), 'RGBA'); out.putalpha(m)
    return out


def with_shadow(img, pad=14, blur=8, off=(0, 6), alpha=150):
    w, h = img.size
    c = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', c.size, (0, 0, 0, 0))
    s = Image.new('RGBA', img.size, (8, 6, 4, alpha)); s.putalpha(ImageChops.multiply(img.getchannel('A'), Image.new('L', img.size, alpha)))
    sh.alpha_composite(s, (pad + off[0], pad + off[1]))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    c.alpha_composite(sh); c.alpha_composite(img, (pad, pad))
    return c


# ---------------------------------------------------------------- the kit
def build():
    print('assets/ui:')
    # 1. the boat's steel panel: nine-slice, 320 square at 2x; rivets only at the four corners, where the
    #    angle iron is, each a little different. CSS: border-image-slice 56 (= 28 px shown)
    S = 320
    p = painted_steel(S, S, seed=3, wear=1.0, corner_r=18)
    for i, (x, y) in enumerate([(22, 22), (S - 22, 22), (22, S - 22), (S - 22, S - 22)]):
        rivet(p, x + R.uniform(-1.5, 1.5), y + R.uniform(-1.5, 1.5), 6.5, seed=100 + i)
    save(p, 'panel-steel.png')
    # the same paint as a seamless tile for the middle of any panel (the frame above is only for its edges):
    # no top light, no edge wear, every layer wrapping, the scratches drawn three times over so they cross the seams
    T = 512
    mott = noise(T, T, 110, 5, 3); fine = noise(T, T, 6, 2, 4)
    light = 0.9 + 0.09 * (mott - 0.5) + 0.05 * (fine - 0.5)
    col = rgba((78, 88, 74), light)
    grime = np.clip((noise(T, T, 48, 4, 5) - 0.6) * 3, 0, 1)
    col *= (1 - 0.1 * grime)[..., None]
    sc = scratches(T, T, int(T * T / 9000), 22, 0.55, seed=6, wrap=True)
    col = col * (1 - 0.6 * sc[..., None]) + np.array([150, 150, 140], np.float32) * 0.6 * sc[..., None]
    save(to_img(col).convert('RGBA'), 'steel-tile.png')
    # a seam plate: rivets along a joint, for headers (a strip with rivets spaced unevenly by hand)
    W, H = 640, 44
    st = painted_steel(W, H, paint=(70, 80, 67), seed=8, wear=0.6, corner_r=4)
    x = 16
    while x < W - 10:
        rivet(st, x + R.uniform(-1, 1), H / 2 + R.uniform(-0.8, 0.8), 4.6, seed=int(x)); x += R.uniform(34, 42)
    save(st, 'seam-strip.png')
    # 2. brass nameplate: nine-slice 360x96 at 2x, two slotted screws at the ends
    bp = aged_brass(360, 96, seed=12, corner_r=10)
    screw(bp, 18, 48, 6, seed=5); screw(bp, 342, 48, 6, seed=9)
    save(bp, 'plate-brass.png')
    # 3. buttons, stamped brass (primary) and blackened steel (secondary), three states each, 9-slice 200x72
    for kind in ('brass', 'steel'):
        for st_name, k in (('', 1.0), ('-hover', 1.12), ('-down', 0.86)):
            if kind == 'brass':
                b = aged_brass(200, 72, seed=40, corner_r=12, bright=k)
            else:
                b = painted_steel(200, 72, paint=(46, 52, 44), seed=41, wear=0.7, corner_r=12)
                if k != 1.0:
                    a = np.asarray(b, np.float32); a[..., :3] *= k; b = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
            if st_name == '-down':  # pressed in: lit from below now, inner shadow on top
                a = np.asarray(b, np.float32); yy = np.arange(72, dtype=np.float32)[:, None]
                a[..., :3] *= (0.82 + 0.18 * np.clip(yy / 18, 0, 1))[..., None]
                b = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
            save(b, f'btn-{kind}{st_name}.png')
    # 4. paper: a tile for any page, and a deckled sheet (nine-slice 400 square) for notes and dialogs
    save(paper(512, 512, seed=21), 'paper-tile.png')
    sheet = deckle(paper(400, 400, seed=22, tile=False), seed=23)
    save(sheet, 'paper-sheet.png')
    # a pale ruled logbook page tile (lines every 28 px at 1x), for the title's log
    lg = paper(512, 448, seed=24, tone=(232, 222, 196))
    d = ImageDraw.Draw(lg)
    for yy in range(56, 448, 56): d.line([(0, yy), (512, yy)], fill=(120, 150, 170, 70), width=2)
    save(lg, 'log-tile.png')
    # 5. a strip of label-maker tape (nine-slice 120x40): embossed black plastic, a little curl at the ends
    tw, th = 160, 40
    t = np.zeros((th, tw, 3), np.float32) + np.array([24, 24, 26], np.float32)
    t *= (0.9 + 0.2 * noise(tw, th, 4, 2, 50))[..., None]
    yy = np.arange(th, dtype=np.float32)[:, None]
    t *= (1.25 - 0.5 * np.abs(yy - th * 0.42) / th)[..., None]
    tape = to_img(t).convert('RGBA')
    m = Image.new('L', (tw, th), 0); md = ImageDraw.Draw(m)
    md.polygon([(3, 4), (tw - 2, 2), (tw - 4, th - 3), (1, th - 2)], fill=255)
    tape.putalpha(m.filter(ImageFilter.GaussianBlur(0.5)))
    save(tape, 'tape.png')
    # 6. the loading gauge: a brass tube with a glass window (nine-slice 400x48) and the lamp-oil fill tile
    gw, gh = 400, 48
    g = aged_brass(gw, gh, seed=60, corner_r=22)
    win = Image.new('RGBA', (gw - 28, gh - 22), (0, 0, 0, 0))
    wa = np.zeros((gh - 22, gw - 28, 4), np.float32)
    wy = np.linspace(0, 1, gh - 22, dtype=np.float32)[:, None]
    wa[..., 0] = 14 + 10 * (1 - wy); wa[..., 1] = 18 + 12 * (1 - wy); wa[..., 2] = 20 + 14 * (1 - wy); wa[..., 3] = 255
    win = Image.fromarray(np.broadcast_to(wa, wa.shape).astype(np.uint8), 'RGBA')
    wm = rounded_mask(gw - 28, gh - 22, 12); win.putalpha(wm)
    g.alpha_composite(win, (14, 11))
    d = ImageDraw.Draw(g)
    for k in range(1, 10):  # engraved ticks along the top
        x = 14 + (gw - 28) * k / 10
        d.line([(x, 4), (x, 9 if k % 5 else 11)], fill=(60, 44, 18, 200), width=2)
    save(g, 'gauge.png')
    fw, fh = 64, 26
    f = np.zeros((fh, fw, 3), np.float32)
    fy = np.linspace(0, 1, fh, dtype=np.float32)[:, None]
    f[..., 0] = 255 * (0.95 - 0.25 * fy); f[..., 1] = 170 * (1.0 - 0.45 * fy); f[..., 2] = 70 * (1 - 0.6 * fy)
    f *= (0.92 + 0.12 * noise(fw, fh, 8, 2, 61))[..., None]
    hl = np.exp(-((fy - 0.22) ** 2) / 0.008) * 0.5
    f = f + 255 * hl[..., None] * np.array([1, 0.9, 0.7], np.float32)
    save(to_img(f).convert('RGBA'), 'gauge-fill.png')
    # 7. the welcome/confirm card: a shipping tag on string (nine-slice 420x300), punched hole, reinforcement ring
    tw, th = 420, 300
    tag = paper(tw, th, seed=70, tone=(214, 190, 140), foxing=0.6, tile=False)
    tm = Image.new('L', (tw, th), 0); tdraw = ImageDraw.Draw(tm)
    c = 34
    tdraw.polygon([(c, 6), (tw - c, 6), (tw - 6, c), (tw - 6, th - c), (tw - c, th - 6), (c, th - 6), (6, th - c), (6, c)], fill=255)
    tag.putalpha(tm.filter(ImageFilter.GaussianBlur(0.6)))
    tag = deckle(tag, seed=71, depth=2, tea=True); tag.putalpha(ImageChops.multiply(tag.getchannel('A'), tm))
    save(tag, 'tag.png')
    # the tag's eyelet and the twine it hangs from (separate, so stretching the tag never stretches the hole)
    ew, eh = 60, 120
    ey = Image.new('RGBA', (ew, eh), (0, 0, 0, 0)); edr = ImageDraw.Draw(ey)
    rr = random.Random(72); pts = [(ew / 2 + rr.uniform(-1.5, 1.5), y) for y in range(0, eh - 26, 6)] + [(ew / 2, eh - 30)]
    edr.line(pts, fill=(176, 150, 104, 255), width=5); edr.line([(x - 1, y) for x, y in pts], fill=(214, 190, 140, 200), width=2)
    edr.ellipse([ew / 2 - 17, eh - 47, ew / 2 + 17, eh - 13], fill=(200, 176, 128, 255), outline=(140, 112, 66, 255), width=3)
    edr.ellipse([ew / 2 - 8, eh - 38, ew / 2 + 8, eh - 22], fill=(34, 26, 16, 255))
    edr.line([(ew / 2, eh - 48), (ew / 2, eh - 30)], fill=(176, 150, 104, 255), width=5)
    save(ey, 'tag-eyelet.png')

    # 8. the vignette of grime for big panels (optional overlay)
    v = noise(512, 512, 120, 4, 80)
    vy, vx = np.mgrid[0:512, 0:512] / 511.0
    rad = np.hypot(vx - 0.5, vy - 0.45) * 1.6
    va = np.clip(rad - 0.45, 0, 1) * (0.6 + 0.6 * v) * 140
    vi = np.zeros((512, 512, 4), np.uint8); vi[..., :3] = (14, 12, 8); vi[..., 3] = np.clip(va, 0, 255).astype(np.uint8)
    save(Image.fromarray(vi, 'RGBA'), 'grime.png')


if __name__ == '__main__':
    build()
