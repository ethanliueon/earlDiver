# (7.0.0) Paints the title's steel plate, the save slots' locker doors, and a chipped-paint mask for lettering:
#   assets/ui/front/title_plate.png  riveted weathered steel, bevelled, rust weeping from the rivets, scratches, a dent
#   assets/ui/front/locker_door.png  a narrow steel locker door: louvres at the top, a card holder, a latch, wear
#   assets/ui/front/paint_wear.png   white where the paint holds, clear where it has chipped (for CSS mask-image)
# Run: python3 tools/front_kit2.py
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = 'assets/ui/front/'


def noise(rng, W, H, scale):
    gw, gh = max(2, W // scale + 2), max(2, H // scale + 2)
    g = rng.random((gh, gw)).astype(np.float32)
    im = Image.fromarray((g * 255).astype(np.uint8)).resize((W + scale * 2, H + scale * 2), Image.BICUBIC)
    return np.asarray(im, dtype=np.float32)[scale:scale + H, scale:scale + W] / 255


def steel(rng, W, H, base, bevel=10, rivets=(), rust=0.5):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    col = np.zeros((H, W, 3), np.float32); col[:] = base
    m = noise(rng, W, H, 120) * 0.5 + noise(rng, W, H, 30) * 0.3 + noise(rng, W, H, 6) * 0.2
    col *= (0.86 + 0.24 * m)[..., None]
    # brushed grain, horizontal
    gr = rng.random((H, 1)).astype(np.float32) * 0.06 - 0.03
    col *= (1 + gr)[..., None]
    # light from above-left across the plate
    col *= (1.08 - 0.16 * (yy / H) - 0.05 * (xx / W))[..., None]
    # scratches
    sc = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sc)
    for _ in range(int(W * H / 2600)):
        x, y = rng.random() * W, rng.random() * H; a = rng.normal(0.1, 0.5); L = 10 + rng.random() * 80
        d.line([(x, y), (x + np.cos(a) * L, y + np.sin(a) * L)], fill=int(60 + rng.random() * 120), width=1)
    s = np.asarray(sc.filter(ImageFilter.GaussianBlur(0.5)), np.float32) / 255
    col = col * (1 - s[..., None] * 0.25) + np.array([200, 196, 178], np.float32) * (s[..., None] * 0.18)
    # rust: blooms around the rivets and along the lower edge, weeping down
    rs = np.zeros((H, W), np.float32)
    for (rx, ry) in rivets:
        rs += np.exp(-(((xx - rx) / 22) ** 2 + ((yy - ry) / 16) ** 2)) * 0.8
        streak = np.exp(-((xx - rx - rng.normal(0, 2)) / 3.5) ** 2) * np.clip((yy - ry) / 3, 0, 1) * np.exp(-(yy - ry) / (30 + rng.random() * 50))
        rs += streak * 0.7
    rs += np.clip(1 - (H - 1 - yy) / (H * 0.25), 0, 1) ** 2 * noise(rng, W, H, 18) * 0.9
    rs *= (0.6 + 0.8 * noise(rng, W, H, 9)) * rust
    rs = np.clip(rs, 0, 1)
    col = col * (1 - rs[..., None] * 0.75) + np.array([110, 58, 30], np.float32) * (rs[..., None] * 0.75)
    # bevel: lit top/left edges, dark bottom/right
    e = np.minimum.reduce([xx, yy, W - 1 - xx, H - 1 - yy])
    bv = np.clip(1 - e / bevel, 0, 1)
    lit = ((yy < H / 2) & (yy <= xx * H / W + 1)) | (xx < bevel)
    tl = np.where((yy < bevel) | (xx < bevel), 1.0, 0.0) * np.where((yy < bevel) & (xx > W - bevel), 0, 1)
    col *= (1 + bv * 0.28 * tl - bv * 0.42 * (1 - tl))[..., None]
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(col, 0, 255).astype(np.uint8); out[..., 3] = 255
    im = Image.fromarray(out, 'RGBA'); d = ImageDraw.Draw(im)
    for (rx, ry) in rivets:  # domed rivet heads, lit from above-left
        for r, c in [(9, (26, 24, 20, 255)), (7, (96, 92, 80, 255)), (5, (128, 122, 104, 255)), (2, (176, 170, 150, 255))]:
            ox = -1.5 if r < 7 else 0
            d.ellipse([rx - r + ox, ry - r + ox, rx + r + ox, ry + r + ox], fill=c)
    # rounded corners (a cut plate)
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=bevel * 1.4, fill=255)
    im.putalpha(mask)
    return im


def paint_wear(rng, W=1024, H=256):
    a = np.ones((H, W), np.float32)
    n = noise(rng, W, H, 22) * 0.6 + noise(rng, W, H, 5) * 0.4
    a[n > 0.64] = 0  # chips where the paint has flaked
    sp = rng.random((H, W)) > 0.985  # specks of bare steel
    a[sp] = 0
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32)
    a = 255 * (0.12 + 0.88 * (a / 255))  # thin paint over most of it: never fully gone
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'L')


def locker(rng, W=480, H=640):
    im = steel(rng, W, H, np.array([92, 98, 82], np.float32), bevel=12, rivets=[(24, 24), (W - 24, 24), (24, H - 24), (W - 24, H - 24)], rust=0.9)
    d = ImageDraw.Draw(im)
    # louvres near the top: slots pressed into the door, shadow above and a lit lip below
    for i in range(5):
        y = 60 + i * 18
        d.rounded_rectangle([90, y, W - 90, y + 9], radius=4, fill=(22, 22, 18, 255))
        d.line([(92, y + 10), (W - 92, y + 10)], fill=(150, 150, 128, 255), width=2)
    # the card holder: a small brass frame, empty, for the slot's number and name to sit over
    d.rounded_rectangle([W / 2 - 92, 180, W / 2 + 92, 236], radius=4, outline=(116, 98, 62, 255), width=4)
    d.line([(W / 2 - 88, 182), (W / 2 + 88, 182)], fill=(170, 146, 96, 255), width=2)
    # the latch at the lower right
    d.rounded_rectangle([W - 70, H / 2 + 60, W - 46, H / 2 + 150], radius=6, fill=(34, 34, 28, 255))
    d.rounded_rectangle([W - 66, H / 2 + 64, W - 52, H / 2 + 146], radius=4, fill=(112, 108, 92, 255))
    return im


if __name__ == '__main__':
    rng = np.random.default_rng(7)
    W, H = 1500, 420
    riv = [(30, 30), (W - 30, 30), (30, H - 30), (W - 30, H - 30), (W // 2, 26), (W // 2, H - 26)]
    steel(rng, W, H, np.array([84, 90, 76], np.float32), bevel=14, rivets=riv, rust=1.0).save(OUT + 'title_plate.png', optimize=True)
    locker(np.random.default_rng(11)).save(OUT + 'locker_door.png', optimize=True)
    paint_wear(np.random.default_rng(5)).save(OUT + 'paint_wear.png', optimize=True)
    print('painted')
