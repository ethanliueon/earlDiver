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


def fish(W=2400, H=1720, out_w=960):  # (7.3.0) twice the size, for the detail
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
    # (7.3.0) the finer detail: rows of thin scales (a faint diamond net, brighter at each scale's upper edge), a soft
    # rainbow sheen where the mirror catches the light at a slant (thin-film colour, faint), and a little mottling
    rng = np.random.default_rng(7)
    jit = np.asarray(Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    su, sv = (xx + yy * 0.55) / 2.1 + jit * 0.8, (xx - yy * 0.55) / 2.1 + jit * 0.6
    net = np.minimum(np.abs(np.sin(su * math.pi)), np.abs(np.sin(sv * math.pi)))
    scal = np.clip(1 - net * 6, 0, 1) * (xx > 44) * np.clip((v - 0.12) * 4, 0, 1)
    col *= (1 - 0.035 * scal * (0.5 + jit))[..., None]
    lift = np.clip(np.sin(sv * math.pi) * np.sin(su * math.pi), 0, 1) ** 6 * (xx > 44) * np.clip((v - 0.15) * 3, 0, 1) * np.clip((0.85 - v) * 3, 0, 1)
    col += (lift * 9 * (0.4 + jit))[..., None]
    hue = (xx * 0.09 + yy * 0.05)
    irid = np.stack([np.sin(hue) * 0.5 + 0.5, np.sin(hue + 2.1) * 0.5 + 0.5, np.sin(hue + 4.2) * 0.5 + 0.5], -1)
    band2 = (np.exp(-((v - 0.36) / 0.12) ** 2) * (xx > 46) * (xx < 96))[..., None]
    col = col * (1 - band2 * 0.04) + irid * np.array([226, 218, 236]) * band2 * 0.04
    mott = np.asarray(Image.fromarray((rng.random((H // 24, W // 24)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    col *= (0.98 + 0.035 * mott)[..., None]
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
    # (7.3.0) pepper-dot pigment cells scattered below the dark back, thinning down the flank
    for _ in range(420):
        x = 20 + rng.random() * 78; top = 36 - max(0, (x - 18)) * 0.33 if x < 62 else 20.5 + max(0, x - 86) * 0.15
        if x < 52: top = 35.6 - (x - 18) * 0.25
        y = top + 1.2 + abs(rng.normal()) * 2.2
        r = 0.05 + rng.random() ** 2 * 0.16
        d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=(20, 24, 34, int(40 + rng.random() * 90)))
    # the gill cover's edge and the cheek
    d.arc([P(80, 22), P(104, 56)], 105, 255, fill=(54, 60, 72, 120), width=int(Z * 0.55))
    d.arc([P(83, 26), P(103, 52)], 120, 240, fill=(236, 240, 240, 60), width=int(Z * 0.35))
    # the mouth: nearly upright, the lower jaw heavy and jutting
    d.line([P(106.6, 31.5), P(105.4, 39.5), P(103.6, 45)], fill=(26, 28, 36, 230), width=int(Z * 0.8))
    d.line([P(105.6, 40), P(99, 43.5), P(95, 44)], fill=(30, 32, 40, 150), width=int(Z * 0.5))
    d.line([P(104.2, 44.4), P(97, 49)], fill=(236, 240, 240, 70), width=int(Z * 0.4))
    # see-through rayed fins: tail, the spiny blade and dorsal fin, adipose, pectoral, pelvic, anal
    def fin(pts, rays, a=64):
        # (7.3.0) a thin membrane, its edge a little ragged, and fine rays fanned between the ones given
        sp = smooth(pts, 6); jag = [(x + (rng.random() - 0.5) * 0.35, y + (rng.random() - 0.5) * 0.35) for x, y in sp]
        d.polygon([P(*p) for p in jag], fill=(196, 210, 222, a))
        full = []
        for (p1, p2), (q1, q2) in zip(rays, rays[1:] + rays[-1:]):
            for t in (0, 0.33, 0.66):
                full.append(((p1[0] + (q1[0] - p1[0]) * t, p1[1] + (q1[1] - p1[1]) * t), (p2[0] + (q2[0] - p2[0]) * t, p2[1] + (q2[1] - p2[1]) * t)))
        for p1, p2 in full: d.line([P(*p1), P(*p2)], fill=(226, 234, 240, 105), width=max(1, int(Z * 0.18)))
    fin([(17, 36), (5, 25), (2.5, 27), (8, 37.6), (2, 48), (5, 50.5), (17, 39.4)],
        [((17, 36.4), (4, 26)), ((17, 37), (6, 32)), ((17, 38.6), (5, 44)), ((17, 39.2), (3.5, 49.5))])
    fin([(48, 29), (51, 16), (58, 21.5)], [((49, 28), (51, 16.5)), ((52, 25.5), (53, 18)), ((55, 23.5), (55.5, 20))], 80)
    fin([(60, 21.6), (62, 11), (66, 10.4), (70, 12), (72, 19.4)],
        [((61.5, 21), (62.5, 11.2)), ((64, 20.4), (64.6, 10.6)), ((66.5, 20), (67, 11)), ((69, 19.6), (69.4, 12))])
    fin([(30, 34.6), (31.5, 31), (35, 33.6)], [], 70)
    fin([(84, 46), (70, 49), (64, 55), (70, 53), (84, 49)], [((84, 46.6), (66, 53.5)), ((84, 48), (70, 52.6))])
    fin([(60, 70), (56, 78), (59, 78.5), (64, 70.6)], [((61, 70.4), (57, 78))])
    fin([(48, 47), (38, 45.5), (31, 47), (38, 49), (50, 52)], [((48, 47.6), (33, 47.2)), ((49, 50.4), (38, 48.6))])
    # the eye: (7.3.0) as the real fish's, a short silver tube standing up from the head with the lens on top, looking
    # upward for the silhouettes of prey against the faint light above; the black pupil seen from the side as a dark
    # crescent under the lens. No white sparkle
    eye_at = (94.2, 27.6)  # painted after the marks, below
    im = Image.alpha_composite(im, ov).filter(ImageFilter.SMOOTH)
    # (7.3.0) the eye, painted in soft gradients: a tall oval set into the head (the tube seen from the side), a silver
    # ring round a dark centre aimed upward, the lens just showing above, a faint shine on its upper edge. No hard shape
    ex, ey = eye_at; E = np.zeros((H, W, 4), np.float32)
    dx_, dy_ = (xx - ex) / 5.0, (yy - ey) / 6.6; r1 = np.sqrt(dx_ ** 2 + dy_ ** 2)
    ring = np.clip((1 - r1) * 9, 0, 1)                                                     # the whole eye, soft-edged
    px_, py_ = (xx - ex) / 3.3, (yy - (ey - 1.6)) / 4.4; r2 = np.sqrt(px_ ** 2 + py_ ** 2)
    pup = np.clip((1 - r2) * 6, 0, 1)                                                      # the dark centre, high in it
    silver = np.array([168, 178, 188]) * (0.75 + 0.35 * np.clip(1 - (yy - (ey - 6)) / 13, 0, 1))[..., None]
    dark = np.array([14, 22, 34]) + np.array([40, 70, 104]) * np.clip(1 - r2, 0, 1)[..., None] ** 3 * 0.6
    c = silver * (1 - pup[..., None]) + dark * pup[..., None]
    edge = np.exp(-((r1 - 0.93) / 0.07) ** 2); c = c * (1 - 0.35 * edge[..., None])   # a faint darker rim, so it sits in the silver
    lx, ly = (xx - ex) / 3.2, (yy - (ey - 5.2)) / 1.35; rl = np.sqrt(lx ** 2 + ly ** 2)
    lens = np.clip((1 - rl) * 5, 0, 1)                                                     # the lens, a low dome on top
    c = c * (1 - lens[..., None]) + np.array([58, 96, 132]) * lens[..., None]
    shine = np.exp(-(((xx - (ex - 1.0)) / 1.4) ** 2 + ((yy - (ey - 5.9)) / 0.4) ** 2))
    c = c + np.array([150, 170, 180]) * shine[..., None] * 0.5
    a_ = np.maximum(ring, lens) * 255
    E[..., :3] = np.clip(c, 0, 255); E[..., 3] = a_
    im = Image.alpha_composite(im, Image.fromarray(E.astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(Z * 0.12)))
    # the light organs: a comb of short upright bars along the keel's edge, a group under the stalk, two below the eye
    # the light organs: (7.3.0) as on the real fish, in groups along the keel (a long row under the chest, a short group
    # behind it, a few under the tail stalk, two below the eye), each a small oval light under a dark pigment cap, a silver
    # reflector round it, and a soft blue halo
    keel = [p for p in smooth(outline, 40) if p[1] > 50 and 54 < p[0] < 103]; keel.sort(key=lambda p: -p[0])
    def along(n, f0, f1):
        return [keel[min(len(keel) - 1, int((f0 + (f1 - f0) * i / max(1, n - 1)) * (len(keel) - 1)))] for i in range(n)]
    organs = [(x - (x - 74) * 0.03, y - 2.4) for (x, y) in along(12, 0.02, 0.55) + along(5, 0.64, 0.84) + along(3, 0.9, 0.99)]
    organs += [(47 - i * 3.6, 44.0 - i * 1.15) for i in range(4)] + [(93.6, 38.6), (96.4, 40.0)]
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    for x, y in organs: g.ellipse([P(x - 2.0, y - 1.6), P(x + 2.0, y + 2.4)], fill=(96, 150, 222, 120))
    glow = glow.filter(ImageFilter.GaussianBlur(Z * 1.1))
    im = Image.alpha_composite(im, glow); ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i, (x, y) in enumerate(organs):
        x += (rng.random() - 0.5) * 0.5; y += (rng.random() - 0.5) * 0.4; k = 0.8 + rng.random() * 0.35
        d.ellipse([P(x - 0.75 * k, y - 0.5 * k), P(x + 0.75 * k, y + 0.95 * k)], fill=(206, 216, 226, 110))   # the silver reflector
        d.ellipse([P(x - 0.45 * k, y - 0.15 * k), P(x + 0.45 * k, y + 0.75 * k)], fill=(156, 200, 238, 225))  # the light
        d.chord([P(x - 0.7 * k, y - 0.6 * k), P(x + 0.7 * k, y + 0.3 * k)], 200, 340, fill=(48, 54, 66, 90))  # a thin pigment cap
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
