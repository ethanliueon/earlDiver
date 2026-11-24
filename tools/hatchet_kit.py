# (7.1.7) The loading screen's pictures, painted:
#   assets/loading/hatchetfish.png  a silver hatchetfish (Argyropelecus), facing right: the deep, thin hatchet-blade body
#     with its keel, a short dark back, a narrow tail stalk and small forked tail, big tubular eyes looking up, a near-
#     vertical mouth, mirror-silver flanks lit from above with a blue-violet sheen, fine scales, see-through rayed fins,
#     and the belly's rows of light organs with soft blue halos
#   assets/loading/wave.png        the bar, empty: a band of deep water, its top a row of small waves catching faint light
#   assets/loading/wave_fill.png   the same band full of pale, sunlit water, a lighter crest along each wave
# Run: python3 tools/hatchet_kit.py
import math, os
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
    # (7.3.0, round 1, after a photograph of Argyropelecus gigas) the flank is a mirror made of upright plates: each one
    # tilted a little differently, so each catches a different amount of the light above - bright and dark side by side,
    # with hard edges between them (not a soft gradient). Each plate is lightest a little above its middle
    rngp = np.random.default_rng(23)
    wav = np.sin(yy * 0.45) * 0.35 + np.sin(yy * 0.13 + 1.0) * 0.5
    pidx = np.floor((xx - 44 + wav) / 4.4).astype(np.int32)
    pk = rngp.uniform(0.62, 1.32, 64); pk[::3] *= 0.85
    plate = np.where((xx > 44) & (xx < 100), pk[np.clip(pidx, 0, 63)], 1.0)
    inband = np.clip((v - 0.14) * 5, 0, 1) * np.clip((0.93 - v) * 6, 0, 1)
    col *= (1 + (plate - 1) * inband)[..., None]
    across = 1 + 0.16 * np.exp(-(((v - 0.4) / 0.17) ** 2)) * inband     # the band where the light above hits it squarely
    col *= across[..., None]
    col = col * 0.92 + np.array([14, 18, 26]) * 0.08                    # the cold of the water in its shadows
    # the back: near black, a ragged edge into the silver
    rag = (np.sin(xx * 1.7) * 0.012 + np.sin(xx * 0.53 + 2) * 0.01)
    back = np.clip((0.15 + rag - v) * 18, 0, 1)
    col = col * (1 - back[..., None] * 0.85) + np.array([16, 19, 26]) * back[..., None] * 0.85
    # the head: darker than the flank, the gill cover a silver plate of its own
    head = np.clip((xx - 84) / 6, 0, 1)
    col *= (1 - 0.3 * head)[..., None]
    oper = np.exp(-(((xx - 90) / 5.5) ** 2 + ((yy - 41) / 9) ** 2))
    col = col * (1 - oper[..., None] * 0.45) + np.array([206, 210, 208]) * oper[..., None] * 0.45
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
    # (7.3.0, round 1) each organ is an upright silver tube with a dark pigment bar between it and the next, so the keel
    # reads as a comb (as in the photograph), each tube with a faint blue core at its foot
    for i, (x, y) in enumerate(organs):
        k = 0.95 + rng.random() * 0.1
        d.rectangle([P(x - 1.15, y - 2.6), P(x + 1.15, y + 1.3)], fill=(22, 24, 30, 200))                    # the pigment bar round it
        d.rounded_rectangle([P(x - 0.75 * k, y - 2.3), P(x + 0.75 * k, y + 0.9)], radius=int(Z * 0.4), fill=(196, 204, 210, 235))  # the silver tube
        d.line([P(x - 0.3, y - 2.0), P(x - 0.3, y + 0.4)], fill=(238, 240, 236, 170), width=max(1, int(Z * 0.25)))               # its shine
        d.ellipse([P(x - 0.55, y + 0.1), P(x + 0.55, y + 1.0)], fill=(124, 160, 206, 210))                                        # the light
    im = Image.alpha_composite(im, ov)
    bb = im.getbbox(); im = im.crop(bb)
    return im.resize((out_w, int(out_w * im.height / im.width)), Image.LANCZOS)


def fish2(W=2400, H=1720, out_w=960):
    # (7.3.0, rounds 2-3) painted after a photograph of Argyropelecus gigas: an angular hatchet (an almost straight back,
    # a straight keel cut back from the throat and turning up sharply into a short stalk), a big dark head about a third
    # of the fish with a heavy upturned jaw and a tubular eye on top; the flank a dark mirror of fine scales with patchy
    # bright sparkle; the keel a dark band packed with tall silver light-organ tubes; small faint spiny fins; a clear tail.
    # The deep's mood: cold shadows, bone-white highlights, no pure white, no cyan.
    Z = W / 120; P = lambda x, y: (x * Z, y * Z)
    rng = np.random.default_rng(5)
    def line(a, b, n):  # points along a straight edge, so the spline keeps it straight
        return [(a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n) for t in range(n)]
    def smooth(pts, n=8):
        out = []; L = len(pts)
        for i in range(L):
            p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % L], pts[(i + 2) % L]
            for k in range(n):
                t = k / n; t2, t3 = t * t, t * t * t
                out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
        return out
    # the outline, clockwise from the top of the stalk: back, brow, face, jaw, throat, keel, the turn, the stalk below
    outline = (line((24, 34.5), (58, 22.5), 6) + line((58, 22.5), (86, 17.5), 5) + [(92, 17.2), (97, 18.6), (101, 21.5)]
               + [(103.5, 26), (104.5, 31)] + [(107.5, 33.5), (108.2, 37.5), (105.5, 41.5), (102, 45)]      # the upturned lower jaw
               + line((100, 48), (66, 74.5), 8) + [(62, 74.8), (58.5, 72)] + line((56, 67), (44, 45), 4) + [(38, 41.8), (31, 40.6), (24, 40)])
    body = [P(*q) for q in smooth(outline)]
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(body, fill=255); m = m.filter(ImageFilter.GaussianBlur(1.0))
    A = np.asarray(m, np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / Z
    # height within the body at each column (0 the back, 1 the keel), for the bands
    cols = np.where(A.max(0) > 0.5)[0]; top = np.full(W, np.nan); bot = np.full(W, np.nan)
    for c in cols: r = np.where(A[:, c] > 0.5)[0]; top[c] = r[0] / Z; bot[c] = r[-1] / Z
    top = np.nan_to_num(top, nan=0)[None, :]; bot = np.nan_to_num(bot, nan=1)[None, :]
    v = np.clip((yy - top) / np.maximum(1, bot - top), 0, 1)
    # the silver: dark overall, the light above caught most in a band high on the flank
    base = 70 + 120 * np.exp(-((v - 0.36) / 0.2) ** 2) - 30 * np.clip((v - 0.7) * 3, 0, 1)
    col = np.stack([base * 0.96, base * 0.99, base * 1.04], -1)
    # fine scales: a net of small diamonds, each a little brighter at its upper edge; and the sparkle - scales turned to
    # the light, bright in ragged patches (the photograph's glitter), strongest where the light band is
    jit = np.asarray(Image.fromarray((rng.random((H // 30, W // 30)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    su, sv = (xx * 1.0 + yy * 0.62) / 1.05 + jit * 0.9, (xx * 1.0 - yy * 0.62) / 1.05 + jit * 0.7   # (round 3) irregular, not a net
    cell = np.abs(np.sin(su * np.pi)) * np.abs(np.sin(sv * np.pi))
    col *= (0.92 + 0.1 * cell ** 0.5)[..., None]
    nz = np.asarray(Image.fromarray((rng.random((H // 10, W // 10)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    nz2 = np.asarray(Image.fromarray((rng.random((H // 40, W // 40)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    spark = np.clip((nz * 0.6 + nz2 * 0.6 - 0.72) * 4, 0, 1) * cell * np.clip(1 - np.abs(v - 0.42) * 1.8, 0, 1) * (xx > 30)
    col += (spark * 150)[..., None]; col *= (0.9 + 0.2 * nz)[..., None]   # (round 3) the glitter, stronger
    # the mirror plates, faint: upright, each tilted a hair differently
    pid = np.floor((xx - 40 + np.sin(yy * 0.4) * 0.3) / 4.2).astype(np.int32); pk = rng.uniform(0.86, 1.14, 64)
    col *= np.where((xx > 40) & (xx < 92), pk[np.clip(pid, 0, 63)], 1.0)[..., None]
    # the back: near black, with a ragged lower edge; the head darker, its gill cover a dull silver plate; the cold of
    # the water in every shadow
    back = np.clip((0.13 + 0.012 * np.sin(xx * 1.9) - v) * 16, 0, 1)
    col = col * (1 - back[..., None] * 0.88) + np.array([14, 17, 24]) * back[..., None] * 0.88
    head = np.clip((xx - 80) / 5, 0, 1)
    col *= (1 - 0.42 * head)[..., None]
    oper = np.exp(-(((xx - 89) / 5.0) ** 2 + ((yy - 40) / 8.5) ** 2)) * (1 - back)
    col = col * (1 - oper[..., None] * 0.5) + np.array([170, 176, 180]) * oper[..., None] * 0.5
    # the keel: a dark band along the lower edge, where the light organs sit
    keelband = np.clip((v - 0.74) * 9, 0, 1) * (xx > 44) * (xx < 102)
    col = col * (1 - keelband[..., None] * 0.9) + np.array([10, 12, 16]) * keelband[..., None] * 0.9
    # the stalk: thin and partly clear, the backbone showing as a pale line
    clear = np.clip((44 - xx) / 16, 0, 1)
    col = col * (1 - clear[..., None] * 0.35)
    alpha = A * (1 - clear * 0.4)
    # the rim turns away from the light; and the water's cold in the shadows
    rim = np.asarray(m.filter(ImageFilter.GaussianBlur(Z * 2.2)), np.float32) / 255
    col *= (0.55 + 0.45 * np.clip((rim - 0.5) * 2.4, 0, 1))[..., None]
    col = col * 0.9 + np.array([12, 16, 24]) * 0.1
    col = np.minimum(col, 232)                                       # never pure white: bone at most
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(col, 0, 255); out[..., 3] = (alpha * 255).astype(np.uint8)
    im = Image.fromarray(out, 'RGBA')
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    # fins: small, faint, spiny, ragged
    def fin(pts, rays, a=46):
        sp = smooth(pts, 6); jag = [(x + (rng.random() - 0.5) * 0.4, y + (rng.random() - 0.5) * 0.4) for x, y in sp]
        d.polygon([P(*q) for q in jag], fill=(150, 160, 170, a))
        for p1, p2 in rays: d.line([P(*p1), P(*p2)], fill=(200, 206, 212, 110), width=max(1, int(Z * 0.16)))
    fin([(24, 35.5), (13, 27.5), (11, 29.5), (17, 37.5), (11, 45.5), (13, 47.5), (24, 39.6)], [((24, 36), (12.5, 28.5)), ((24, 37), (14, 32)), ((24, 38.6), (13.5, 43.5)), ((24, 39.3), (12, 46.8))], 58)
    fin([(52, 25.8), (55, 17.5), (59, 23.8)], [((53, 25), (55, 17.8)), ((56, 24.4), (56.3, 19.5))], 52)            # the spiny blade
    fin([(62, 21.8), (64, 14.5), (68, 14.2), (70, 20.3)], [((63, 21.4), (64.2, 15)), ((65.5, 21), (66, 14.6)), ((68, 20.6), (68.3, 15))])
    fin([(84, 44), (74, 47.5), (71, 50.5), (76, 49.5), (84, 46.5)], [((84, 44.5), (72, 50)), ((84, 45.8), (75, 49.2))], 40)  # the pectoral, thin
    fin([(50, 62), (44, 66.5), (47, 67), (53, 63.5)], [((51, 62.5), (45, 66.6))], 40)
    # the jaw: a dark edge to the mouth, the upturned lower jaw catching a little light, tiny teeth
    d.polygon([P(104.6, 31.2), P(107.6, 33.4), P(108.0, 37.0), P(104.0, 36.0), P(101.5, 33.8)], fill=(8, 8, 12, 235))   # (round 3) the gape, dark
    d.line([P(101.5, 34.2), P(104.2, 36.4), P(108.0, 37.2), P(105.4, 41.2)], fill=(150, 152, 150, 170), width=int(Z * 0.45))  # the upturned lower jaw's lit edge
    d.line([P(103.5, 34), P(98, 39.5)], fill=(20, 20, 26, 160), width=int(Z * 0.5))
    for k in range(6): d.line([P(107.4 - k * 0.25, 34 + k * 0.7), P(106.6 - k * 0.25, 34.2 + k * 0.7)], fill=(210, 206, 196, 150), width=max(1, int(Z * 0.18)))
    d.arc([P(80, 24), P(100, 56)], 110, 250, fill=(10, 12, 16, 150), width=int(Z * 0.55))                         # the gill cover's edge
    # pepper pigment on the back's lower edge
    for _ in range(520):
        x = 26 + rng.random() * 72; t = (x - 24) / (86 - 24); y = (34.5 + (17.5 - 34.5) * min(1, t)) + 1.6 + abs(rng.normal()) * 2.6
        r = 0.05 + rng.random() ** 2 * 0.14; d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=(10, 12, 16, int(60 + rng.random() * 120)))
    im = Image.alpha_composite(im, ov)
    # the eye: a big tube on top of the head, looking up: a dark lens on top, a silver ring, a dark pupil seen sideways
    ex, ey = 94.0, 24.5; E = np.zeros((H, W, 4), np.float32)  # (round 3) smaller, lower contrast: a tube, not a googly eye
    r1 = np.sqrt(((xx - ex) / 4.2) ** 2 + ((yy - ey) / 5.6) ** 2); ring = np.clip((1 - r1) * 9, 0, 1)
    r2 = np.sqrt(((xx - ex) / 2.6) ** 2 + ((yy - (ey - 1.4)) / 3.8) ** 2); pup = np.clip((1 - r2) * 6, 0, 1)
    silver = np.array([112, 120, 128]) * (0.7 + 0.4 * np.clip(1 - (yy - (ey - 7)) / 14, 0, 1))[..., None]
    c = silver * (1 - pup[..., None]) + (np.array([8, 12, 20]) + np.array([34, 56, 84]) * np.clip(1 - r2, 0, 1)[..., None] ** 3 * 0.6) * pup[..., None]
    c = c * (1 - 0.2 * np.exp(-((r1 - 0.93) / 0.07) ** 2))[..., None]
    rl = np.sqrt(((xx - ex) / 2.8) ** 2 + ((yy - (ey - 4.7)) / 1.2) ** 2); lens = np.clip((1 - rl) * 5, 0, 1)
    c = c * (1 - lens[..., None]) + np.array([40, 66, 94]) * lens[..., None]
    c += np.array([150, 160, 166]) * np.exp(-(((xx - (ex - 1.2)) / 1.5) ** 2 + ((yy - (ey - 5.4)) / 0.35) ** 2))[..., None] * 0.3
    E[..., :3] = np.clip(c, 0, 255); E[..., 3] = np.maximum(ring, lens) * 255
    im = Image.alpha_composite(im, Image.fromarray(E.astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(Z * 0.1)))
    # the light organs: tall silver tubes packed along the keel (as in the photograph), each with a dark bar beside it and
    # a faint blue light at its foot; a short group under the stalk
    def keel_pts(a, b, n):
        return [(a[0] + (b[0] - a[0]) * (i + 0.5) / n, a[1] + (b[1] - a[1]) * (i + 0.5) / n) for i in range(n)]
    organs = keel_pts((98.6, 47.0), (65.8, 72.4), 21) + keel_pts((56.9, 67.8), (46.8, 50.4), 7) + keel_pts((42, 42.2), (31, 40.0), 5)  # (round 3) inside the keel, not below it
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for x, y in organs: gd.ellipse([P(x - 1.4, y - 1.4), P(x + 1.4, y + 0.6)], fill=(80, 120, 190, 55))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(Z * 1.0)))
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i, (x, y) in enumerate(organs):
        hgt = 4.4 if i < 28 else 1.8; wd = 0.72  # (round 3) tall, packed: a comb
        b = 0.6 + rng.random() * 0.55                                       # (round 3) each tube catches the light its own way
        d.rounded_rectangle([P(x - wd, y - hgt), P(x + wd, y + 0.4)], radius=int(Z * 0.35), fill=tuple(int(c * b) for c in (150, 158, 166)) + (235,))
        d.rounded_rectangle([P(x - wd, y - hgt * 0.45), P(x + wd, y + 0.4)], radius=int(Z * 0.35), fill=(20, 22, 28, 110))   # its foot in shadow
        d.line([P(x - wd * 0.35, y - hgt + 0.4), P(x - wd * 0.35, y - hgt * 0.4)], fill=tuple(int(min(232, c * (b + 0.25))) for c in (214, 216, 210)) + (190,), width=max(1, int(Z * 0.2)))
        d.line([P(x + wd + 0.12, y - hgt), P(x + wd + 0.12, y + 0.4)], fill=(6, 8, 10, 200), width=max(1, int(Z * 0.18)))       # the dark seam to the next
        d.ellipse([P(x - 0.34, y - 0.55), P(x + 0.34, y + 0.05)], fill=(108, 142, 190, 170))   # its light, inside its foot
    im = Image.alpha_composite(im, ov)
    bb = im.getbbox(); im = im.crop(bb)
    return im.resize((out_w, int(out_w * im.height / im.width)), Image.LANCZOS)


def fish3(ref=os.path.join(os.path.dirname(__file__), 'ref', 'argyropelecus_gigas_noaa_pd.jpg'), out_w=960):
    # (7.3.0, owner: "trace the image itself") traced from a photograph of Argyropelecus gigas (NOAA's Fisheries
    # Collection, public domain; Wikimedia Commons, File:Argyropelecus_gigas.jpg): its outline traced point by point by
    # hand (turned to face right), its light and dark taken from the photograph itself and recoloured in the game's own
    # palette (cold, near-black shadows up to bone, never pure white), with a faint paint grain; a soft blue glow under
    # the rows of light organs, as on a living fish
    import os
    src = Image.open(ref).convert('RGB')
    src = src.crop((0, 40, 820, 460)).transpose(Image.FLIP_LEFT_RIGHT)  # the same frame the outline was traced on
    K2 = 2.4; W, H = int(820 * K2), int(420 * K2)
    body = [(100, 156), (150, 140), (200, 122), (250, 104), (300, 88), (345, 70), (395, 50), (450, 40), (500, 37), (550, 42),
            (600, 58), (645, 78), (685, 105), (708, 140), (716, 172), (708, 196), (735, 210), (762, 218), (748, 232), (722, 250),
            (700, 272), (680, 300), (655, 330), (622, 352), (585, 372), (545, 388), (500, 397), (450, 398), (405, 392), (368, 376),
            (340, 345), (315, 310), (290, 282), (262, 258), (230, 240), (195, 228), (150, 216), (100, 206)]
    tail = [(100, 158), (70, 150), (42, 148), (55, 172), (60, 190), (52, 212), (48, 236), (78, 220), (100, 206)]
    S2 = lambda pts: [(x * K2, y * K2) for x, y in pts]
    m = Image.new('L', (W, H), 0); dm = ImageDraw.Draw(m); dm.polygon(S2(body), fill=255)
    mt = Image.new('L', (W, H), 0); ImageDraw.Draw(mt).polygon(S2(tail), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.4)); mt = mt.filter(ImageFilter.GaussianBlur(1.4))
    lum = np.asarray(src.convert('L').resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(0.8)), np.float32)
    # the light map stretched a little so the shadows are deep and the silver bright, as the photograph is
    lo, hi = np.percentile(lum[np.asarray(m) > 128], [3, 99]); t = np.clip((lum - lo) / max(1, hi - lo), 0, 1)
    stops = [(0.0, (6, 8, 12)), (0.25, (22, 26, 34)), (0.5, (70, 78, 90)), (0.75, (150, 158, 166)), (0.92, (206, 208, 204)), (1.0, (228, 224, 212))]
    col = np.zeros((H, W, 3), np.float32)
    for (a0, c0), (a1, c1) in zip(stops, stops[1:]):
        k = np.clip((t - a0) / (a1 - a0), 0, 1)[..., None]; sel = ((t >= a0) & (t <= a1))[..., None]
        col = np.where(sel, np.array(c0) * (1 - k) + np.array(c1) * k, col)
    rng = np.random.default_rng(9)
    grain = np.asarray(Image.fromarray((rng.random((H // 3, W // 3)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    col *= (0.95 + 0.1 * grain)[..., None]
    # the tray it lay on shows through where the traced line runs a hair outside the fish: warm and pale, where the fish's
    # silver is neutral - those pixels are left out, so the edge follows the fish exactly
    rgb = np.asarray(src.resize((W, H), Image.BICUBIC), np.float32)
    tray = np.clip(((rgb[..., 0] - rgb[..., 2]) - 10) / 12, 0, 1) * np.clip((lum - 120) / 40, 0, 1)
    tray = np.asarray(Image.fromarray((tray * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255
    inner = np.asarray(m.filter(ImageFilter.MinFilter(41)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255  # well inside: the flank reflects the tray too, and stays
    tray *= (1 - inner)
    A = np.asarray(m, np.float32) / 255 * (1 - tray); At = np.asarray(mt, np.float32) / 255 * 0.55 * (1 - tray * 0.6)
    alpha = np.maximum(A, At)
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.clip(col, 0, 255); out[..., 3] = (alpha * 255).astype(np.uint8)
    im = Image.fromarray(out, 'RGBA')
    # the living fish's light: a soft blue glow under its rows of organs (along the keel, under the flank, the stalk)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    rows = [((372, 384), (650, 338)), ((340, 292), (600, 280)), ((150, 224), (300, 266))]
    for (a0, b0) in rows:
        for i in range(24):
            q = i / 23; x = a0[0] + (b0[0] - a0[0]) * q; y = a0[1] + (b0[1] - a0[1]) * q
            gd.ellipse([(x - 9) * K2, (y - 2) * K2, (x + 9) * K2, (y + 12) * K2], fill=(70, 110, 180, 26))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(8 * K2)))
    a2 = np.asarray(im)[..., 3]; im.putalpha(Image.fromarray(np.minimum(a2, (alpha * 255).astype(np.uint8))))
    bb = im.getbbox(); im = im.crop(bb)
    return im.resize((out_w, int(out_w * im.height / im.width)), Image.LANCZOS)


def fish4(out_w=960):
    # (7.3.3, owner: "more game-like, not a photo, not so dark") the traced outline of fish3 (from the NOAA photograph),
    # repainted in the game's own hand: broad soft-shaded zones lit from above (a dark back, a bright silver band high on
    # the flank, the belly falling into shadow), a rim of light round the edge so it reads on the blue, and a few details
    # placed by hand - the tube eye, the gill cover, the comb of light organs as soft rounded tubes, faint scales only
    # where the light falls. Cold shadows, bone highlights, no pure white
    K2 = 2.4; W, H = int(820 * K2), int(420 * K2); S2 = lambda pts: [(x * K2, y * K2) for x, y in pts]
    body = [(100, 156), (150, 140), (200, 122), (250, 104), (300, 88), (345, 70), (395, 50), (450, 40), (500, 37), (550, 42),
            (600, 58), (645, 78), (685, 105), (708, 140), (716, 172), (708, 196), (735, 210), (762, 218), (748, 232), (722, 250),
            (700, 272), (680, 300), (655, 330), (622, 352), (585, 372), (545, 388), (500, 397), (450, 398), (405, 392), (368, 376),
            (340, 345), (315, 310), (290, 282), (262, 258), (230, 240), (195, 228), (150, 216), (100, 206)]
    def smooth(pts, n=6):
        out = []; L = len(pts)
        for i in range(L):
            p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % L], pts[(i + 2) % L]
            for k in range(n):
                t = k / n; t2, t3 = t * t, t * t * t
                out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
        return out
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(S2(smooth(body)), fill=255); m = m.filter(ImageFilter.GaussianBlur(1.2))
    A = np.asarray(m, np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / K2
    cols = np.where(A.max(0) > 0.5)[0]; top = np.full(W, np.nan); bot = np.full(W, np.nan)
    for c in cols: r = np.where(A[:, c] > 0.5)[0]; top[c] = r[0] / K2; bot[c] = r[-1] / K2
    top = np.nan_to_num(top, nan=0)[None, :]; bot = np.nan_to_num(bot, nan=1)[None, :]
    v = np.clip((yy - top) / np.maximum(1, bot - top), 0, 1)          # 0 the back .. 1 the keel, in every column
    # the zones: back, the lit band, the flank, the belly in shadow
    def ramp(stops):
        out = np.zeros((H, W, 3), np.float32)
        for (a0, c0), (a1, c1) in zip(stops, stops[1:]):
            k = np.clip((v - a0) / (a1 - a0), 0, 1)[..., None]; sel = ((v >= a0) & (v <= a1))[..., None]
            out = np.where(sel, np.array(c0) * (1 - k) + np.array(c1) * k, out)
        return out
    col = ramp([(0.0, (30, 36, 46)), (0.12, (52, 60, 72)), (0.2, (150, 160, 170)), (0.34, (214, 216, 210)), (0.5, (176, 184, 192)),
                (0.72, (128, 138, 152)), (0.86, (78, 86, 100)), (1.0, (46, 52, 64))])
    # the stalk a little darker and see-through toward the tail; the head darker than the flank
    col *= (0.82 + 0.18 * np.clip((xx - 120) / 140, 0, 1))[..., None]
    head = np.clip((xx - 560) / 60, 0, 1); col = col * (1 - 0.28 * head[..., None])
    # faint scales only in the lit band: soft rows, brighter at their top edge
    su, sv = (xx + yy * 0.55) / 13, (xx - yy * 0.55) / 13
    sc = np.abs(np.sin(su * np.pi)) * np.abs(np.sin(sv * np.pi))
    lit = np.exp(-((v - 0.34) / 0.16) ** 2) * (xx > 150) * (xx < 560)
    col *= (1 - 0.07 * lit * (1 - sc ** 0.6))[..., None]
    # the mirror plates: a few soft upright bands across the chest, alternately a touch lighter and darker
    plate = np.sin((xx - 330) / 26 * np.pi) * np.clip((xx - 330) / 30, 0, 1) * np.clip((560 - xx) / 30, 0, 1) * (xx > 330) * (xx < 560)
    col *= (1 + 0.06 * plate * np.clip((v - 0.25) * 4, 0, 1) * np.clip((0.85 - v) * 4, 0, 1))[..., None]
    # a rim of light from above along the back, a cool reflected light along the belly
    rimm = np.asarray(m.filter(ImageFilter.GaussianBlur(5 * K2)), np.float32) / 255
    edge = np.clip(1 - (rimm - 0.5) * 3, 0, 1) * A
    col = col + (np.array([60, 64, 66]) * (edge * (v < 0.3))[..., None]) + (np.array([20, 36, 60]) * (edge * (v > 0.7))[..., None])
    # the keel: a dark band along the lower edge, where the light organs sit
    kb = np.clip((v - 0.8) * 8, 0, 1) * (xx > 320) * (xx < 700)
    col = col * (1 - kb[..., None] * 0.75) + np.array([22, 26, 36]) * kb[..., None] * 0.75
    # painted, not airbrushed: a broken grain, long soft brush strokes along the body, a little mottling
    rg = np.random.default_rng(12)
    g1 = np.asarray(Image.fromarray((rg.random((H // 3, W // 3)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    g2 = np.asarray(Image.fromarray((rg.random((H // 18, W // 3)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    g3 = np.asarray(Image.fromarray((rg.random((H // 60, W // 60)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    col *= (0.93 + 0.08 * g1 + 0.06 * g2 + 0.05 * g3)[..., None]
    col = np.minimum(col, 230)
    im = Image.fromarray(np.dstack([np.clip(col, 0, 255), A * 255]).astype(np.uint8), 'RGBA')
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    P = lambda x, y: (x * K2, y * K2)
    # fins: soft, see-through, a few rays; the tail, the spiny dorsal blade, the dorsal, pectoral and anal fins
    def fin(pts, rays, a=70):
        d.polygon([P(*q) for q in smooth(pts, 5)], fill=(170, 182, 194, a))
        for p1, p2 in rays: d.line([P(*p1), P(*p2)], fill=(206, 214, 220, 120), width=max(1, int(K2 * 1.2)))
    fin([(102, 158), (72, 146), (40, 140), (50, 172), (58, 188), (46, 216), (44, 242), (76, 222), (102, 204)],
        [((100, 165), (44, 144)), ((100, 176), (50, 168)), ((100, 190), (50, 210)), ((100, 200), (46, 238))], 80)
    fin([(336, 80), (360, 30), (378, 26), (374, 66)], [((344, 74), (362, 30)), ((358, 70), (372, 28))], 70)
    fin([(392, 58), (408, 20), (440, 14), (456, 46)], [((400, 48), (410, 20)), ((418, 44), (424, 16)), ((436, 41), (440, 15))], 60)
    fin([(560, 240), (500, 262), (474, 282), (508, 274), (562, 256)], [((560, 246), (480, 279)), ((560, 252), (500, 272))], 55)
    fin([(330, 320), (300, 350), (318, 352), (348, 330)], [((334, 322), (306, 348))], 55)
    # the gill cover: a soft darker curve with a lit edge behind it
    d.arc([P(530, 70), P(640, 380)], 100, 260, fill=(30, 36, 46, 150), width=int(5 * K2))
    d.arc([P(538, 74), P(648, 376)], 110, 250, fill=(226, 228, 220, 70), width=int(2.5 * K2))
    # the mouth: a dark line up the face, the upturned jaw with a lit lower edge, small teeth
    d.line([P(716, 172), P(724, 204), P(760, 218)], fill=(14, 16, 22, 230), width=int(4 * K2))
    d.line([P(708, 232), P(748, 230), P(760, 220)], fill=(200, 204, 200, 170), width=int(2 * K2))
    for k in range(6): d.line([P(728 + k * 5, 206 + k * 2), P(728 + k * 5, 213 + k * 2)], fill=(224, 222, 212, 200), width=max(1, int(K2 * 1.3)))
    im = Image.alpha_composite(im, ov)
    # the eye: a big tube on the head, looking up; a silver socket, a dark lens catching the light at its top
    E = np.zeros((H, W, 4), np.float32); ex, ey = 636, 112
    r1 = np.sqrt(((xx - ex) / 28) ** 2 + ((yy - ey) / 36) ** 2); ring = np.clip((1 - r1) * 8, 0, 1)
    r2 = np.sqrt(((xx - ex) / 18) ** 2 + ((yy - (ey - 8)) / 24) ** 2); pup = np.clip((1 - r2) * 6, 0, 1)
    sock = np.array([150, 160, 170]) * (0.75 + 0.35 * np.clip(1 - (yy - (ey - 40)) / 80, 0, 1))[..., None]
    lens = np.array([16, 26, 40]) + np.array([40, 70, 100]) * np.clip(1 - r2, 0, 1)[..., None] ** 2
    c = sock * (1 - pup[..., None]) + lens * pup[..., None]
    c += np.array([170, 176, 178]) * np.exp(-(((xx - (ex - 7)) / 7) ** 2 + ((yy - (ey - 22)) / 4) ** 2))[..., None] * 0.7   # the light on the lens
    E[..., :3] = np.clip(c, 0, 255); E[..., 3] = ring * 255
    im = Image.alpha_composite(im, Image.fromarray(E.astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(K2 * 0.6)))
    # the light organs: rounded silver tubes in a comb along the keel and the tail, each with a soft blue light at its
    # foot, a little uneven in size and spacing (placed along the traced keel)
    keel = [q for q in smooth(body, 12) if q[1] > 250 and 330 < q[0] < 690]; keel.sort(key=lambda q: q[0])
    stalk = [q for q in smooth(body, 12) if 140 < q[0] < 320 and q[1] > 200]; stalk.sort(key=lambda q: q[0])
    rng = np.random.default_rng(4); organs = []
    for i in range(0, len(keel), max(1, len(keel) // 22)): x, y = keel[i]; organs.append((x, y - 10, 22 + rng.random() * 10))
    for i in range(0, len(stalk), max(1, len(stalk) // 7)): x, y = stalk[i]; organs.append((x, y - 7, 11 + rng.random() * 4))
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    for x, y, h in organs: gd.ellipse([P(x - 9, y - 6), P(x + 9, y + 14)], fill=(90, 140, 210, 120))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(7 * K2)))
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for x, y, h in organs:
        w2 = 4.2 + rng.random() * 1.4
        d.rounded_rectangle([P(x - w2, y - h), P(x + w2, y)], radius=int(w2 * K2), fill=(34, 40, 52, 200))                 # its dark sheath
        d.rounded_rectangle([P(x - w2 + 1.3, y - h + 1.5), P(x + w2 - 1.3, y - 1)], radius=int(w2 * K2 * 0.8), fill=(188, 196, 204, 235))
        d.line([P(x - w2 * 0.35, y - h + 3), P(x - w2 * 0.35, y - h * 0.45)], fill=(228, 230, 226, 200), width=max(1, int(K2 * 1.4)))
        d.ellipse([P(x - w2 * 0.6, y - 5), P(x + w2 * 0.6, y - 0.5)], fill=(150, 190, 236, 230))                        # its light
    im = Image.alpha_composite(im, ov)
    a2 = np.asarray(im)[..., 3]; keep = np.maximum((A * 255).astype(np.uint8), a2 * 0)
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
    # (7.3.4, owner) the hatchetfish is now the owner's own painting: tools/hatchet_owner.py writes it; nothing here does
    wave(False).save(OUT + 'wave.png', optimize=True)
    wave(True).save(OUT + 'wave_fill.png', optimize=True)
    print('painted')
