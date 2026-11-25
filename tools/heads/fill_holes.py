# (7.6.37) Fill any key green enclosed by the head (gaps at the lips) with the skin's middle tone: only the green reached
# from the canvas's border is background. Run after make_template.cjs:  python3 tools/heads/fill_holes.py
import sys, os
from PIL import Image, ImageDraw
HERE = os.path.dirname(__file__)
for sex in ('m', 'f'):
    p = os.path.join(HERE, f'template_{sex}.png'); im = Image.open(p).convert('RGB'); W, H = im.size
    marked = im.copy(); ImageDraw.floodfill(marked, (2, 2), (255, 0, 255), thresh=40)
    px, mk = im.load(), marked.load(); n = 0
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            if g > 200 and r < 80 and b < 80 and mk[x, y] != (255, 0, 255): px[x, y] = (169, 158, 144); n += 1
    im.save(p); print(sex, 'filled', n)
