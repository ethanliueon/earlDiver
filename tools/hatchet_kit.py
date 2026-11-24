# (7.1.7) The loading screen's pictures, painted:
#   assets/loading/hatchetfish.png  a silver hatchetfish (Argyropelecus), facing right: the deep, thin hatchet-blade body
#     with its keel, a short dark back, a narrow tail stalk and small forked tail, big tubular eyes looking up, a near-
#     vertical mouth, mirror-silver flanks lit from above with a blue-violet sheen, fine scales, see-through rayed fins,
#     and the belly's rows of light organs with soft blue halos
#   assets/loading/wave.png        the bar, empty: a band of deep water, its top a row of small waves catching faint light
#   assets/loading/wave_fill.png   the same band full of pale, sunlit water, a lighter crest along each wave
# Run: python3 tools/hatchet_kit.py
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = 'assets/loading/'


def fish(W=1200, H=860, out_w=480):
    # (7.1.7) Drawn from photographs of Argyropelecus: the head and chest a deep silver blade, the body ending sharply in a
    # thin see-through tail stalk; the flank's mirror plates in vertical bands; a big blue tubular eye high at the front;
    # the mouth nearly upright with a heavy lower jaw; a spiny blade before the dorsal fin; and along the keel's edge a comb
    # of light organs (short upright bars), with a second group under the tail stalk.
    Z = W / 120
    P = lambda x, y: (x * Z, y * Z)
    def smooth(pts, n=12):  # a closed Catmull-Rom curve through the outline's points: no facets
        out = []; L = len(pts)
        for i in range(L):
            p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % L], pts[(i + 2) % L]
            for k in range(n):
                t = k / n; t2, t3 = t * t, t * t * t
                out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
        return out
    # the back near straight, rising to the dorsal fin; the face steep; the keel a straight blade cut back from the chin,
    # turning up sharply into the stalk
    outline = [(16, 35.5), (28, 34.6), (40, 32.4), (50, 27.5), (60, 22), (72, 19.6), (84, 19.6), (95, 21.8), (101.5, 25.5), (105, 30.5), (106.4, 35.5),
               (105.6, 41), (103.4, 46.5), (99.5, 53.5), (94, 61), (87, 66.5), (77, 69.6), (66, 70.4), (58, 69.4), (54.5, 65), (52, 56), (48.5, 47.5), (42, 42), (30, 40.2), (16, 39.6)]
    body = [P(*p) for p in smooth(outline)]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(body, fill=255); m = m.filter(ImageFilter.GaussianBlur(1.2))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / Z
    # silver lit from above: dark back, a bright band high on the flank, mirror-grey toward the keel
    v = np.clip((yy - 18) / 54, 0, 1)
    col = np.zeros((H, W, 3), np.float32)
    stops = [(0.0, (34, 42, 50)), (0.1, (92, 104, 114)), (0.24, (214, 220, 220)), (0.45, (178, 188, 194)), (0.7, (138, 148, 160)), (1.0, (92, 98, 116))]
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        t = np.clip((v - a) / (b - a), 0, 1)[..., None]; sel = ((v >= a) & (v <= b))[..., None]
        col = np.where(sel, np.array(ca) * (1 - t) + np.array(cb) * t, col)
    # the mirror plates: upright bands across the chest, each a little brighter or darker than the next
    band = (xx > 46) & (xx < 90)
    ph = np.cos((xx - 46) / 5.2 * math.pi)
    col *= (1 + np.where(band, 0.09 * ph, 0) * np.clip(1 - np.abs(v - 0.5) * 1.6, 0, 1))[..., None]
    # a blue-violet sheen where the flank turns
    sheen = np.exp(-((v - 0.55) / 0.13) ** 2)[..., None]
    col = col * (1 - sheen * 0.22) + np.array([128, 140, 200]) * sheen * 0.22
    # the tail stalk is nearly clear: the dark water shows through it
    clear = np.clip((50 - xx) / 22, 0, 1)
    alpha = np.asarray(m, np.float32) * (1 - clear * 0.5)
    col = col * (1 - clear[..., None] * 0.35)
    # the edges turn away from the light: darker toward the outline, so the body reads as rounded, not flat
    rim = np.asarray(m.filter(ImageFilter.GaussianBlur(Z * 3)), np.float32) / 255
    col *= (0.62 + 0.38 * np.clip((rim - 0.5) * 2.2, 0, 1))[..., None]
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(col, 0, 255); out[..., 3] = alpha.astype(np.uint8)
    im = Image.fromarray(out, 'RGBA')
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)  # (marks go on their own layer, then laid over: PIL's
    # own blending wrote them opaque)
    # the plates' seams, faint
    for k in range(9):
        x = 48.6 + k * 5.2
        top = 19.5 + max(0, 54 - x) * 0.25; bot = 66 - abs(x - 68) * 0.2
        d.line([P(x, top + 6), P(x - 0.6, bot - 4)], fill=(60, 66, 80, 34), width=max(1, int(Z * 0.3)))
    # through the clear stalk: the backbone and the muscle's chevrons
    d.line([P(17, 37.6), P(34, 37.2), P(50, 33)], fill=(190, 196, 206, 70), width=max(1, int(Z * 0.45)))
    for k in range(7):
        x = 20 + k * 4.0
        d.line([P(x + 1.6, 34.8 - k * 0.3), P(x, 37.4), P(x + 1.6, 40 + k * 0.4)], fill=(200, 206, 214, 34), width=max(1, int(Z * 0.3)))
    # the dark band along the back
    d.line([P(18, 36), P(30, 35.2), P(42, 32.6), P(52, 27.4), P(62, 22.2), P(74, 20.2), P(86, 20.2), P(96, 22.6)], fill=(18, 22, 30, 190), width=int(Z * 1.5))
    # the gill cover's edge and the cheek
    d.arc([P(80, 22), P(104, 56)], 105, 255, fill=(54, 60, 72, 120), width=int(Z * 0.55))
    d.arc([P(83, 26), P(103, 52)], 120, 240, fill=(236, 240, 240, 60), width=int(Z * 0.35))
    # the mouth: nearly upright, the lower jaw heavy and jutting
    d.line([P(106.6, 31.5), P(105.4, 39.5), P(103.6, 45)], fill=(26, 28, 36, 230), width=int(Z * 0.8))
    d.line([P(105.6, 40), P(99, 43.5), P(95, 44)], fill=(30, 32, 40, 150), width=int(Z * 0.5))
    d.line([P(104.2, 44.4), P(97, 49)], fill=(236, 240, 240, 70), width=int(Z * 0.4))
    # see-through rayed fins: tail, the spiny blade and dorsal fin, adipose, pectoral, pelvic, anal
    def fin(pts, rays, a=64):
        d.polygon([P(*p) for p in pts], fill=(196, 210, 222, a))
        for p1, p2 in rays: d.line([P(*p1), P(*p2)], fill=(222, 230, 238, 120), width=max(1, int(Z * 0.28)))
    fin([(17, 36), (5, 25), (2.5, 27), (8, 37.6), (2, 48), (5, 50.5), (17, 39.4)],
        [((17, 36.4), (4, 26)), ((17, 37), (6, 32)), ((17, 38.6), (5, 44)), ((17, 39.2), (3.5, 49.5))])
    fin([(48, 29), (51, 16), (58, 21.5)], [((49, 28), (51, 16.5)), ((52, 25.5), (53, 18)), ((55, 23.5), (55.5, 20))], 80)
    fin([(60, 21.6), (62, 11), (66, 10.4), (70, 12), (72, 19.4)],
        [((61.5, 21), (62.5, 11.2)), ((64, 20.4), (64.6, 10.6)), ((66.5, 20), (67, 11)), ((69, 19.6), (69.4, 12))])
    fin([(30, 34.6), (31.5, 31), (35, 33.6)], [], 70)
    fin([(84, 46), (70, 49), (64, 55), (70, 53), (84, 49)], [((84, 46.6), (66, 53.5)), ((84, 48), (70, 52.6))])
    fin([(60, 70), (56, 78), (59, 78.5), (64, 70.6)], [((61, 70.4), (57, 78))])
    fin([(48, 47), (38, 45.5), (31, 47), (38, 49), (50, 52)], [((48, 47.6), (33, 47.2)), ((49, 50.4), (38, 48.6))])
    # the eye: big, tubular, set high, its lens a deep blue that catches the light
    d.ellipse([P(88, 21), P(100.5, 33.5)], fill=(120, 132, 140, 255))
    d.ellipse([P(88.8, 21.8), P(99.7, 32.7)], fill=(24, 44, 70, 255))
    d.ellipse([P(89.8, 22.6), P(98.6, 31.4)], fill=(48, 84, 122, 255))
    d.ellipse([P(91.0, 23.2), P(96.0, 28.2)], fill=(74, 118, 160, 255))
    d.ellipse([P(92.6, 26.0), P(97.2, 30.6)], fill=(10, 16, 24, 255))
    d.ellipse([P(91.4, 23.4), P(93.4, 25.4)], fill=(230, 236, 232, 230))
    im = Image.alpha_composite(im, ov).filter(ImageFilter.SMOOTH)
    # the light organs: a comb of short upright bars along the keel's edge, a group under the stalk, two below the eye
    keel = [p for p in smooth(outline) if p[1] > 50 and 54 < p[0] < 103]
    keel.sort(key=lambda p: -p[0])
    organs = []
    step = max(1, len(keel) // 17)
    for i in range(0, len(keel), step):
        x, y = keel[i]
        organs.append((x - (x - 74) * 0.03, y - 2.6))
    organs += [(46 - i * 4.0, 44.2 - i * 1.3) for i in range(4)] + [(94, 38.5), (97, 40)]
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    for x, y in organs:
        g.ellipse([P(x - 2.2, y - 2.0), P(x + 2.2, y + 2.4)], fill=(100, 160, 226, 150))
    glow = glow.filter(ImageFilter.GaussianBlur(Z * 1.2))
    im = Image.alpha_composite(im, glow); ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for x, y in organs:
        # (7.2.8) each a small round light with a faint dark lid, not a bar with a rim: a row of rims read as teeth
        d.ellipse([P(x - 0.85, y - 0.9), P(x + 0.85, y + 1.0)], fill=(60, 70, 92, 90))
        d.ellipse([P(x - 0.55, y - 0.45), P(x + 0.55, y + 0.75)], fill=(176, 214, 244, 220))
    im = Image.alpha_composite(im, ov)
    bb = im.getbbox(); im = im.crop(bb)
    return im.resize((out_w, int(out_w * im.height / im.width)), Image.LANCZOS)


def wave(full):
    # (7.1.7) The bar is a band of sea of even depth, its bottom straight, its top a row of small rolling waves; the ends
    # rounded off. No taper: a tapering ripple with the fish at its head read as something else entirely.
    W, H = 2000, 160
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u = xx / W
    surf = H * 0.34 + np.sin(u * math.pi * 22) * H * 0.045 + np.sin(u * math.pi * 9 + 1.3) * H * 0.02
    floor = H * 0.74
    s = (yy - surf) / (floor - surf)  # 0 at the surface .. 1 at the floor
    inside = np.clip(np.minimum(s * 40, (1 - s) * 30), 0, 1)
    ends = np.clip(np.minimum(xx, W - 1 - xx) / (H * 0.2), 0, 1)
    rr = np.clip(np.minimum(xx, W - 1 - xx) / (H * 0.4), 0, 1)
    inside *= np.clip((1 - (1 - rr) ** 2 * np.clip(s * 0 + (yy - (surf + floor) / 2) ** 2 / ((floor - surf) / 2) ** 2, 0, 1) * 1.0) * 4, 0, 1) * ends ** 0.5
    a = inside
    if full:
        col = np.array([186, 212, 204], np.float32) * (1 - np.clip(s, 0, 1)[..., None] * 0.42)
        crest = np.exp(-(s / 0.12) ** 2)[..., None]
        col = col * (1 - crest * 0.5) + np.array([240, 242, 230]) * crest * 0.5
        a *= 0.92
    else:
        col = np.array([20, 42, 52], np.float32) * (1 - np.clip(s, 0, 1)[..., None] * 0.4)
        edge = np.exp(-(s / 0.1) ** 2)[..., None]
        col = col * (1 - edge * 0.7) + np.array([150, 188, 192]) * edge * 0.7
        a *= 0.9
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(col, 0, 255); out[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA').filter(ImageFilter.GaussianBlur(1.2)).resize((1000, 80), Image.LANCZOS)


if __name__ == '__main__':
    fish().save(OUT + 'hatchetfish.png', optimize=True)
    wave(False).save(OUT + 'wave.png', optimize=True)
    wave(True).save(OUT + 'wave_fill.png', optimize=True)
    print('painted')
