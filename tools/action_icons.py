#!/usr/bin/env python3
"""Paints the touch buttons' pictures (assets/ui/icons/act-*.png) in the same hand as the HUD's other icons
(tools/icon_kit.py): shapes shaded from above, a little grain, one dark outline and a soft shadow, reduced to 128 px.

    python3 tools/action_icons.py
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from icon_kit import Icon, mask

CREAM = (234, 226, 200)


def eye():
    I = Icon()
    I.fill(mask(lambda d: d.chord((60, 150, 452, 362), 180, 360, fill=255) or d.chord((60, 150, 452, 362), 0, 180, fill=255)), (236, 230, 214), light=0.15, edge=0.3)
    I.fill(mask(lambda d: d.ellipse((186, 186, 326, 326), fill=255)), (62, 120, 150), light=0.25, edge=0.4)
    I.fill(mask(lambda d: d.ellipse((222, 222, 290, 290), fill=255)), (18, 22, 24), flat=True)
    I.line(lambda d: d.ellipse((232, 212, 262, 242), fill=255), (250, 250, 246))
    I.save('act-eye.png')


def hand():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((150, 236, 360, 440), 70, fill=255)), (214, 170, 128), light=0.2)
    for x0, top in ((150, 120), (204, 86), (258, 96), (312, 140)):
        I.fill(mask(lambda d, x0=x0, top=top: d.rounded_rectangle((x0, top, x0 + 50, 300), 25, fill=255)), (214, 170, 128), light=0.2)
    I.fill(mask(lambda d: d.polygon([(360, 330), (430, 236), (468, 262), (400, 380)], fill=255)), (204, 160, 118), light=0.2)
    I.fill(mask(lambda d: d.rounded_rectangle((150, 400, 360, 470), 18, fill=255)), (60, 70, 52), light=0.2)  # the wetsuit cuff
    I.save('act-hand.png')


def spline(pts, closed=True, n=14):
    # (7.3.0) a smooth curve through the points (Catmull-Rom), so a shape is drawn as an outline by hand, not built
    # from rectangles and ovals
    P = list(pts); out = []; m = len(P)
    rng = range(m) if closed else range(m - 1)
    for i in rng:
        p0 = P[(i - 1) % m] if closed else P[max(i - 1, 0)]; p1 = P[i]; p2 = P[(i + 1) % m]; p3 = P[(i + 2) % m] if closed else P[min(i + 2, m - 1)]
        for k in range(n):
            t = k / n; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    if not closed: out.append(P[-1])
    return out


def point():
    # (7.2.8) the tutorial's pointing hand: Earl's own diving glove, the fist closed, the index finger straight out. Drawn
    # pointing down (hud.js turns it toward what to tap); no outline, only its shadow, so it looks the same over sky, sea,
    # cabin and paper. (7.3.0) bone-coloured, the thumb tucked across the fist so it cannot read as the other finger, and
    # (owner) every part an outline drawn by hand through points (spline), never a rectangle or an oval
    I = Icon(); BONE = (202, 186, 154); KNUC = (190, 174, 142); THUMB = (208, 192, 160); FOLD = (112, 98, 78)
    poly = lambda pts: mask(lambda d: d.polygon(spline(pts), fill=255))
    ink = lambda pts, w: (lambda d: d.line(spline(pts, closed=False), fill=255, width=w, joint='curve'))
    # the wetsuit cuff: a little flared, its hem uneven
    I.fill(poly([(206, 34), (240, 26), (282, 30), (318, 26), (330, 50), (326, 88), (306, 104), (262, 100), (220, 106), (198, 88), (196, 56)]), (60, 70, 52), light=0.2)
    I.line(ink([(204, 70), (240, 66), (284, 72), (322, 64)], 5), (44, 52, 38))                                           # a crease in the neoprene
    # the back of the hand, wider at the knuckles
    I.fill(poly([(206, 96), (258, 90), (310, 98), (336, 124), (358, 172), (370, 222), (354, 266), (302, 282), (244, 276), (200, 262), (172, 226), (174, 172), (188, 126)]), BONE, light=0.22)
    # the three curled fingers, each its own knuckle, peeping out under the thumb
    for pts in ([(258, 236), (284, 228), (306, 238), (308, 282), (296, 306), (272, 308), (256, 290)],
                [(300, 230), (324, 222), (342, 234), (344, 276), (332, 298), (310, 298), (300, 276)],
                [(336, 222), (356, 214), (370, 228), (372, 262), (362, 282), (344, 284), (336, 262)]):
        I.fill(poly(pts), KNUC, light=0.25, edge=0.4)
    # the index finger: tapering a little to a rounded tip, the knuckle joints just swelling it
    I.fill(poly([(204, 222), (234, 214), (262, 224), (264, 300), (258, 312), (260, 372), (254, 420), (246, 448), (232, 458), (216, 448), (208, 420), (204, 372), (206, 312), (200, 300)]), BONE, light=0.14, edge=0.36)
    I.line(ink([(212, 378), (230, 384), (250, 378)], 5), FOLD)                                                           # the finger's creases, curved
    I.line(ink([(210, 306), (232, 312), (254, 304)], 5), FOLD)
    # the thumb, laid across the curled fingers: thick at its root, rounding to its tip, a dark line under it
    I.fill(poly([(248, 246), (290, 240), (338, 248), (370, 262), (372, 286), (346, 296), (296, 292), (254, 284), (244, 266)]), FOLD, flat=True)
    I.fill(poly([(246, 238), (290, 230), (336, 238), (366, 252), (368, 276), (342, 286), (294, 282), (252, 274), (242, 256)]), THUMB, light=0.3, edge=0.45)
    I.fill(poly([(326, 246), (348, 244), (360, 256), (356, 272), (336, 276), (324, 264)]), (224, 214, 192), light=0.1, edge=0.25)  # its nail
    I.line(ink([(294, 240), (290, 258), (294, 276)], 4), FOLD)                                                           # its knuckle crease
    I.save('tut-point.png', 128, outline=False)


def compare_arrow():
    # (7.3.0) the inventory's "this one, then that one" mark between two cards: a small riveted steel tab, a little
    # uneven, with an arrow in worn bone paint stencilled on it (it was a CSS circle in brass yellow with a typed arrow)
    I = Icon(); STEEL = (88, 96, 76); RIVET = (124, 130, 110); BONE = (214, 206, 182)
    tab = [(96, 150), (180, 118), (330, 122), (420, 160), (436, 256), (416, 352), (330, 392), (180, 394), (94, 360), (76, 256)]
    I.fill(mask(lambda d: d.polygon(spline(tab), fill=255)), STEEL, light=0.3, edge=0.35)
    for cx, cy in ((128, 186), (128, 326), (384, 186), (384, 326)):
        I.fill(mask(lambda d, cx=cx, cy=cy: d.polygon(spline([(cx - 15, cy), (cx - 4, cy - 15), (cx + 12, cy - 12), (cx + 15, cy + 4), (cx + 2, cy + 15), (cx - 12, cy + 11)]), fill=255)), RIVET, light=0.5, edge=0.5)
    # the arrow, stencilled: a shaft and a head, with the stencil's bridges left as gaps, and the paint worn at the edges
    I.fill(mask(lambda d: d.polygon(spline([(168, 236), (282, 232), (284, 276), (166, 280), (160, 258)]), fill=255)), BONE, light=0.15, edge=0.3, grain=0.16)
    I.fill(mask(lambda d: d.polygon(spline([(300, 190), (366, 252), (300, 322), (292, 290), (294, 222)], n=6), fill=255)), BONE, light=0.15, edge=0.3, grain=0.16)
    I.line(lambda d: d.line(spline([(170, 284), (230, 284), (282, 280)], closed=False), fill=255, width=4), (60, 66, 52))  # the shadow under the paint
    I.save('ip-arrow.png', 128)


def sub():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((210, 130, 300, 220), 16, fill=255)), (96, 106, 82))
    I.fill(mask(lambda d: d.polygon([(420, 256), (478, 196), (478, 316)], fill=255)), (82, 92, 70))
    I.fill(mask(lambda d: d.ellipse((40, 180, 450, 330), fill=255)), (110, 122, 92), light=0.3, edge=0.45)
    for x in (150, 230, 310):
        I.line(lambda d, x=x: d.ellipse((x - 20, 236, x + 20, 276), fill=255), (36, 40, 32))
        I.line(lambda d, x=x: d.ellipse((x - 13, 243, x + 13, 269), fill=255), (226, 214, 150))
    I.fill(mask(lambda d: d.ellipse((150, 300, 270, 420), fill=255)), (88, 96, 76), light=0.3, edge=0.4)  # the sphere under her
    I.save('act-sub.png')


def lamp():
    I = Icon()
    I.fill(mask(lambda d: d.polygon([(300, 210), (500, 110), (500, 400), (300, 300)], fill=255)), (250, 236, 170), light=0.05, edge=0.05, grain=0.02)  # the beam
    I.fill(mask(lambda d: d.rounded_rectangle((60, 206, 250, 306), 30, fill=255)), (70, 76, 70), light=0.3)
    I.fill(mask(lambda d: d.polygon([(240, 186), (320, 170), (320, 342), (240, 326)], fill=255)), (150, 156, 150), light=0.3)
    I.fill(mask(lambda d: d.ellipse((296, 172, 336, 340), fill=255)), (255, 248, 210), light=0.05, edge=0.1)
    I.line(lambda d: d.rounded_rectangle((120, 226, 150, 286), 6, fill=255), (196, 60, 44))
    I.save('act-lamp.png')


def lure():
    I = Icon()
    I.line(lambda d: d.arc((90, 120, 400, 520), 190, 300, fill=255, width=22), (70, 60, 50))
    I.fill(mask(lambda d: d.ellipse((300, 70, 430, 200), fill=255)), (170, 236, 255), light=0.1, edge=0.2)
    I.fill(mask(lambda d: d.ellipse((330, 100, 400, 170), fill=255)), (240, 252, 255), flat=True)
    I.save('act-lure.png')


def glow():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((216, 60, 296, 452), 40, fill=255)), (160, 240, 120), light=0.2, edge=0.3)
    I.line(lambda d: d.rounded_rectangle((236, 100, 256, 410), 10, fill=255), (220, 255, 200))
    I.fill(mask(lambda d: d.rounded_rectangle((226, 40, 286, 80), 10, fill=255)), (70, 76, 70))
    I.save('act-glow.png')


def pet():
    I = Icon()
    I.fill(mask(lambda d: d.polygon([(370, 256), (470, 170), (450, 256), (470, 342)], fill=255)), (220, 110, 50))
    I.fill(mask(lambda d: d.ellipse((50, 156, 400, 356), fill=255)), (236, 128, 56), light=0.3, edge=0.4)
    I.fill(mask(lambda d: d.polygon([(170, 170), (260, 100), (300, 176)], fill=255)), (220, 110, 50))
    I.line(lambda d: d.ellipse((104, 214, 140, 250), fill=255), (24, 22, 20))
    I.line(lambda d: d.arc((200, 160, 300, 352), 110, 250, fill=255, width=10), (180, 80, 36))
    I.save('act-pet.png')


def pause():
    I = Icon()
    for x0 in (150, 290):
        I.fill(mask(lambda d, x0=x0: d.rounded_rectangle((x0, 110, x0 + 72, 402), 18, fill=255)), CREAM, light=0.15, edge=0.2)
    I.save('act-pause.png')


def bag():
    I = Icon()
    I.fill(mask(lambda d: d.polygon([(120, 170), (392, 170), (350, 450), (162, 450)], fill=255)), (90, 110, 80), light=0.25)
    for k in range(-4, 6):
        I.line(lambda d, k=k: d.line([(140 + k * 50, 170), (240 + k * 50, 450)], fill=255, width=7), (40, 52, 36))
        I.line(lambda d, k=k: d.line([(370 - k * 50, 170), (270 - k * 50, 450)], fill=255, width=7), (40, 52, 36))
    I.fill(mask(lambda d: d.rounded_rectangle((100, 146, 412, 190), 20, fill=255)), (150, 156, 150), light=0.3)  # the hoop
    I.save('act-bag.png')


def leave():
    I = Icon()
    I.fill(mask(lambda d: d.ellipse((70, 330, 442, 470), fill=255)), (96, 106, 82), light=0.2)  # the hatch, open
    I.fill(mask(lambda d: d.ellipse((120, 360, 392, 444), fill=255)), (24, 28, 22), flat=True)
    I.fill(mask(lambda d: d.polygon([(256, 50), (380, 190), (300, 190), (300, 330), (212, 330), (212, 190), (132, 190)], fill=255)), CREAM, light=0.15)
    I.save('act-leave.png')


def tank():
    I = Icon()
    I.fill(mask(lambda d: d.rounded_rectangle((60, 120, 452, 420), 16, fill=255)), (110, 120, 116), light=0.3)
    I.fill(mask(lambda d: d.rectangle((84, 150, 428, 396), fill=255)), (60, 140, 170), light=0.3, edge=0.2)
    I.fill(mask(lambda d: d.polygon([(84, 360), (200, 340), (300, 356), (428, 340), (428, 396), (84, 396)], fill=255)), (180, 156, 110))
    I.fill(mask(lambda d: d.ellipse((190, 230, 320, 300), fill=255)), (236, 128, 56), light=0.3)
    I.fill(mask(lambda d: d.polygon([(310, 265), (350, 235), (350, 295)], fill=255)), (220, 110, 50))
    I.save('act-tank.png')


def wheel():
    I = Icon()
    I.line(lambda d: d.ellipse((96, 96, 416, 416), outline=255, width=34), (128, 84, 46))
    for k in range(8):
        a = k * math.pi / 4
        I.line(lambda d, a=a: d.line([(256 + math.cos(a) * 40, 256 + math.sin(a) * 40), (256 + math.cos(a) * 200, 256 + math.sin(a) * 200)], fill=255, width=22), (128, 84, 46))
        I.fill(mask(lambda d, a=a: d.ellipse((256 + math.cos(a) * 214 - 22, 256 + math.sin(a) * 214 - 22, 256 + math.cos(a) * 214 + 22, 256 + math.sin(a) * 214 + 22), fill=255)), (140, 92, 50))
    I.fill(mask(lambda d: d.ellipse((206, 206, 306, 306), fill=255)), (176, 140, 80), light=0.3)
    I.save('act-auto.png')


def trawl():
    I = Icon()
    I.fill(mask(lambda d: d.polygon([(70, 130), (430, 220), (430, 292), (70, 382)], fill=255)), (150, 140, 100), light=0.2)
    for k in range(7):
        x = 90 + k * 50
        I.line(lambda d, x=x, k=k: d.line([(x, 136 + k * 12), (x, 376 - k * 12)], fill=255, width=6), (70, 60, 40))
    for y in (200, 256, 312):
        I.line(lambda d, y=y: d.line([(70, y), (430, 256 + (y - 256) * 0.25)], fill=255, width=6), (70, 60, 40))
    I.fill(mask(lambda d: d.rounded_rectangle((50, 110, 92, 400), 14, fill=255)), (120, 126, 120), light=0.3)
    I.save('act-trawl.png')


def sell():
    I = Icon()
    for k, y in enumerate((330, 280, 230)):
        I.fill(mask(lambda d, y=y: d.ellipse((120, y, 392, y + 110), fill=255)), (214, 172, 84), light=0.3, edge=0.3)
    I.fill(mask(lambda d: d.ellipse((120, 140, 392, 300), fill=255)), (232, 192, 100), light=0.3, edge=0.3)
    I.line(lambda d: d.ellipse((170, 166, 342, 274), outline=255, width=8), (150, 110, 40))
    I.save('act-sell.png')


if __name__ == '__main__':
    for f in (eye, hand, sub, lamp, lure, glow, pet, pause, bag, leave, tank, wheel, trawl, sell):
        f()
