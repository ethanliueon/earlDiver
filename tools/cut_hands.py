#!/usr/bin/env python3
"""(7.6.90, owner) the tutorial's pointing hands: the owner's own pictures of the diver's gloved hand (tools/ref/hands/
gloves.webp, on one flat blue), cut out with a soft edge and the blue taken back out of the half-clear pixels, the sleeve's
gold stripe muted to the game's olive piping, the forearm faded off into the water. The back of the hand pointing up
(hand_back.png) and the side pointing across (hand_side.png).   python3 tools/cut_hands.py"""
import os, json
import numpy as np
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, '..', 'assets', 'ui')
BG = np.array([30, 84, 111], np.float32)

def blur(a, r):
    r = max(1, int(r))
    for _ in range(3):
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), axis=1); a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), axis=0); a = (c[2 * r + 1:, :] - c[:-2 * r - 1, :]) / (2 * r + 1)
    return a

def cut(box, fade, up, keep):
    im = Image.open(os.path.join(D, 'ref', 'hands', 'gloves.webp')).convert('RGB').crop(box)
    p = np.asarray(im, np.float32)
    # how much of each pixel is glove: its distance from the blue, against the distance a dark glove would be
    FG = np.array([38, 39, 41], np.float32); a = np.clip(np.linalg.norm(p - BG, axis=-1) / np.linalg.norm(FG - BG), 0, 1)
    # the solid shape first (the dark sleeve is close to the blue, so a pixel's distance alone left it half clear): anything
    # clearly off the blue, closed up and filled, then only its outer edge softened
    hard = (np.linalg.norm(p - BG, axis=-1) > 16).astype(np.float32)
    H0, W0 = hard.shape; yy0, xx0 = np.mgrid[0:H0, 0:W0]; hard *= keep(xx0 + box[0], yy0 + box[1])  # only this hand, not the other's edge
    solid = (blur((blur(hard, 4) > 0.3).astype(np.float32), 4) > 0.7).astype(np.float32)
    a = np.maximum(np.clip(blur(solid, 1.0) * 1.05, 0, 1) * np.clip(a * 1.6, 0, 1), solid * (blur(solid, 2.5) > 0.97))
    fg = (p - (1 - a[..., None]) * BG) / np.maximum(a[..., None], 0.05)  # the blue taken back out of the edge
    fg = np.where(a[..., None] > 0.05, fg, FG); fg = np.clip(fg, 0, 255)
    # the sleeve's gold stripe muted to the olive piping (gold reads yellow on a phone)
    r, g, b = fg[..., 0], fg[..., 1], fg[..., 2]; gold = np.clip(((r - b) - 18) / 30, 0, 1) * np.clip((g - b) / 20, 0, 1)
    olive = np.stack([r * 0.5 + g * 0.22, g * 0.7 + r * 0.06, b * 0.8 + 14], -1)  # a dull olive, darker than the gold
    fg = fg * (1 - gold[..., None]) + olive * gold[..., None]
    # the forearm faded off into the water: fade (x0, y0, x1, y1) in the crop, from all there to gone
    H, W = a.shape; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); x0, y0, x1, y1 = fade; vx, vy = x1 - x0, y1 - y0
    t = np.clip(((xx - x0) * vx + (yy - y0) * vy) / (vx * vx + vy * vy), 0, 1); a = a * (1 - t) ** 1.5
    out = Image.fromarray(np.dstack([fg, a * 255]).astype(np.uint8), 'RGBA'); bb = out.getbbox(); out = out.crop(bb)
    al = np.asarray(out.split()[3]); ys, xs = np.nonzero(al > 140)
    tip = (int(xs[ys.argmin()]), int(ys.min())) if up else (int(xs.min()), int(ys[xs.argmin()]))
    return out, tip

meta = {}
for name, box, fade, up, keep in [('hand_back', (120, 10, 690, 540), (230, 360, 380, 500), True, lambda x, y: ~((x > 600) & (y < 240))),
                                  ('hand_side', (620, 50, 1536, 520), (560, 200, 780, 260), False, lambda x, y: ~((x < 700) & (y > 330)))]:
    im, tip = cut(box, fade, up, keep); im.save(os.path.join(OUT, name + '.png'), optimize=True); meta[name] = {'w': im.width, 'h': im.height, 'tip': tip}
print(json.dumps(meta))

# (7.6.91, owner) every tutorial pointer (the hand at the buttons, in the spotlights, in the drag lesson) is the same picture,
# assets/ui/icons/tut-point.png: a square, pointing down, the fingertip at (0.451, 0.883) of it (hud.js, tutspot.js, olive.css).
# Now the owner's short-cuffed glove, the back of the hand, turned to point down, its cuff fading out (no cut edge)
im, tip = cut((230, 535, 600, 1015), (0, 380, 0, 470), True, lambda x, y: np.ones_like(x, bool))
im = im.rotate(180, expand=True); tip = (im.width - 1 - tip[0], im.height - 1 - tip[1])
N = 256; tx, ty = 0.451 * N, 0.883 * N; k = min((ty - 4) / tip[1], (tx - 3) / tip[0], (N - 3 - tx) / (im.width - tip[0]))  # the whole glove inside the square, nothing clipped
im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS); tip = (tip[0] * k, tip[1] * k)
sq = Image.new('RGBA', (N, N), (0, 0, 0, 0)); sq.alpha_composite(im, (int(round(tx - tip[0])), int(round(ty - tip[1]))))
sq.save(os.path.join(OUT, 'icons', 'tut-point.png'), optimize=True); print('tut-point', sq.size, 'glove', im.size)
