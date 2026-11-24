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


def point():
    # (7.2.8) the tutorial's pointing hand: Earl's own diving glove (the interact button's leather and wetsuit cuff), the
    # fist closed, the thumb across it, the index finger straight out. Drawn pointing down (tutspot.js turns it toward what
    # to tap); no outline, only its shadow, so it looks the same over sky, sea, cabin and paper
    I = Icon(); TAN = (214, 170, 128); FOLD = (150, 110, 78)
    I.fill(mask(lambda d: d.rounded_rectangle((180, 28, 340, 104), 18, fill=255)), (60, 70, 52), light=0.2)             # the wetsuit cuff
    I.fill(mask(lambda d: d.rounded_rectangle((170, 88, 352, 262), 50, fill=255)), TAN, light=0.22)                      # the back of the hand
    for box, r in (((258, 226, 304, 312), 23), ((298, 222, 340, 302), 21), ((332, 212, 366, 286), 17)):                  # the three curled fingers
        I.fill(mask(lambda d, box=box, r=r: d.rounded_rectangle(box, r, fill=255)), (206, 162, 122), light=0.25, edge=0.4)
    I.fill(mask(lambda d: d.rounded_rectangle((200, 214, 262, 452), 31, fill=255)), TAN, light=0.14, edge=0.36)          # the index finger, straight out
    I.fill(mask(lambda d: d.polygon([(166, 140), (198, 132), (226, 232), (204, 262), (172, 228)], fill=255)), (200, 156, 116), light=0.2)  # the thumb along its side
    I.line(lambda d: d.line([(212, 382), (250, 382)], fill=255, width=5), FOLD)                                          # the finger's creases
    I.line(lambda d: d.line([(212, 304), (250, 304)], fill=255, width=5), FOLD)
    I.save('tut-point.png', 128, outline=False)


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
