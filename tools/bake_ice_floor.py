# (7.9.8, owner) The inside of the second sea's ice floor, baked once into a tile that repeats sideways
# (assets/textures/ice_floor.png). Clear ice V seen through its top: dark glass that deepens downward, cracks running
# down into it (a bright split with its shadow beside it, branching), bubbles trapped as it froze (flattened, a lit rim
# on top, some in frozen strings), and grit caught in it. Drawn under the floor's line in play, before the light map, so
# only what his lamp falls on shows. The surface's own lit edge is drawn in code along the real floor line.
# Usage: python3 tools/bake_ice_floor.py
import math, random
from PIL import Image, ImageDraw, ImageFilter

W, H, S = 512, 384, 2           # the tile, and the supersampling
random.seed(44444)
img = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
d = ImageDraw.Draw(img, 'RGBA')

# the glass: a little lighter just under the top, darker and denser further in, with slow uneven veils
for y in range(H * S):
    t = y / (H * S)
    a = int(120 + 95 * t)
    c = (int(70 - 30 * t), int(100 - 38 * t), int(112 - 40 * t), a)
    d.line([(0, y), (W * S, y)], fill=c)
veil = Image.new('L', (W * S, H * S), 0); vd = ImageDraw.Draw(veil)
for _ in range(26):
    x, y = random.uniform(0, W * S), random.uniform(0, H * S * 0.8); rw, rh = random.uniform(60, 240) * S, random.uniform(8, 30) * S
    for ox in (-W * S, 0, W * S): vd.ellipse([x + ox - rw, y - rh, x + ox + rw, y + rh], fill=random.randint(10, 26))
veil = veil.filter(ImageFilter.GaussianBlur(14 * S))
lift = Image.new('RGBA', (W * S, H * S), (150, 182, 196, 0)); lift.putalpha(veil)
img = Image.alpha_composite(img, lift)
# the details on their own layer, laid over the glass after (drawn straight onto the half-clear glass, a faint fill
# would replace its alpha and punch a hole)
ov = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(ov, 'RGBA')

def wrap_line(pts, fill, width):
    for ox in (-W * S, 0, W * S):
        d.line([(x + ox, y) for x, y in pts], fill=fill, width=width, joint='curve')

# cracks: fractures in the glass, not roots: long straight runs with a sharp kink now and then, hairline-thin, the
# fracture's face catching the light as a faint sheet along one side; now and then a branch at a hard angle
def crack(x, y, ang, length, w, depth=0):
    pts = [(x, y)]; seg = 9 * S; side = random.choice((-1, 1)); sheet = random.uniform(4, 11) * S
    for _ in range(int(length / seg)):
        ang += random.uniform(-0.06, 0.06)
        if random.random() < 0.09: ang += random.choice((-1, 1)) * random.uniform(0.35, 0.8)
        ang = max(0.3, min(math.pi - 0.3, ang))
        x += math.cos(ang) * seg; y += math.sin(ang) * seg; pts.append((x, y))
        if depth < 1 and random.random() < 0.05: crack(x, y, ang + random.choice((-1, 1)) * random.uniform(0.7, 1.2), length * random.uniform(0.2, 0.45), 1, depth + 1)
    fade = max(30, int(190 - y / (H * S) * 150))
    nx, ny = -math.sin(ang) * side, math.cos(ang) * side
    face = pts + [(px + nx * sheet, py + ny * sheet) for px, py in reversed(pts)]
    for ox in (-W * S, 0, W * S): d.polygon([(px + ox, py) for px, py in face], fill=(170, 200, 212, int(fade * 0.12)))
    wrap_line([(px - nx * S, py - ny * S) for px, py in pts], (8, 16, 20, int(fade * 0.35)), w)
    wrap_line(pts, (220, 236, 244, fade), w)
for _ in range(11):
    crack(random.uniform(0, W * S), random.uniform(0, 50 * S), random.uniform(0.9, 2.2), random.uniform(50, 230) * S, random.choice((1, 1, 2)))

# bubbles trapped as it froze: flattened, lit along their top, dark along their foot; some in strings
def bubble(x, y, r):
    rw, rh = r * random.uniform(1.0, 1.6), r * random.uniform(0.55, 0.85)
    for ox in (-W * S, 0, W * S):
        bx = x + ox
        d.ellipse([bx - rw, y - rh, bx + rw, y + rh], fill=(120, 150, 162, 70))
        d.arc([bx - rw, y - rh, bx + rw, y + rh], 200, 340, fill=(228, 242, 248, 200), width=max(1, int(r * 0.35)))
        d.arc([bx - rw, y - rh, bx + rw, y + rh], 20, 160, fill=(10, 18, 22, 150), width=max(1, int(r * 0.3)))
for _ in range(8):  # strings
    x, y = random.uniform(0, W * S), random.uniform(30, 300) * S
    for k in range(random.randint(5, 12)):
        bubble(x + random.uniform(-3, 3) * S, y, random.uniform(1.2, 3.2) * S); y -= random.uniform(5, 11) * S; x += random.uniform(-2, 2) * S
for _ in range(70):
    bubble(random.uniform(0, W * S), random.uniform(10, 360) * S, random.uniform(1.0, 4.5) * S * (1 if random.random() < 0.8 else 1.8))

# grit: small dark flecks, irregular, more near the top (it froze in as the ice grew)
for _ in range(260):
    x, y = random.uniform(0, W * S), (random.random() ** 1.6) * H * S; r = random.uniform(0.6, 2.0) * S
    pts = [(x + math.cos(a) * r * random.uniform(0.5, 1.2), y + math.sin(a) * r * random.uniform(0.5, 1.2)) for a in [i / 5 * 6.283 for i in range(5)]]
    for ox in (-W * S, 0, W * S): d.polygon([(px + ox, py) for px, py in pts], fill=(20, 22, 20, random.randint(90, 170)))

img = Image.alpha_composite(img, ov)
img = img.resize((W, H), Image.LANCZOS)
img.save('assets/textures/ice_floor.png', optimize=True)
print('assets/textures/ice_floor.png', img.size)
