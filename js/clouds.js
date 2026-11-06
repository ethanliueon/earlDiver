// Sky clouds, generated once at load as large textures and drawn as parallax layers.
//
// Each layer is a seamless (horizontally tiling) image built from fractal noise, shaped into a
// cloud type and lit from the sun: density is sampled again a little toward the sun, and the
// difference gives bright sunlit tops and grey, self-shadowed undersides, the way real cumulus
// look. Layers:  high thin cirrus streaks, mid-level cumulus, a low haze band on the horizon.
//
// Real photos can replace any layer: put a wide, horizontally tileable PNG with transparency at
// assets/sky/clouds_high.png, clouds_mid.png or clouds_low.png and it is used instead.

const PERIOD = 16; // noise lattice cells across one tile, so the texture wraps seamlessly

function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// value noise that wraps every `per` cells in x
function noise(x, y, per, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % per) + per) % per, x1 = (x0 + 1) % per;
  const a = hash(x0, iy, seed), b = hash(x1, iy, seed), c = hash(x0, iy + 1, seed), d = hash(x1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
// x is in lattice cells (period `per`); yScale > 1 squashes features into horizontal streaks
function fbm(x, y, oct, seed, yScale, per, gain = 0.5) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += noise(x * f, y * f * yScale, per * f, seed + i * 31) * amp;
    n += amp; amp *= gain; f *= 2;
  }
  return s / n;
}

// type: 'cumulus' | 'cirrus' | 'haze'
function bake(W, H, type, seed) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const px = img.data;
  const den = new Float32Array(W * H);
  // fewer cells across the tile = bigger cloud masses
  const per = type === 'cumulus' ? 5 : type === 'cirrus' ? 4 : 6;
  const sc = per / W;
  const yScale = type === 'cirrus' ? 5 : type === 'haze' ? 4 : 1.2;
  const oct = 6;
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      let n = fbm(x * sc, y * sc, oct, seed, yScale, per, type === 'cumulus' ? 0.48 : 0.5);
      let d;
      if (type === 'cumulus') {
        // big rounded masses: a low-frequency "where are the clouds" mask times billowy detail,
        // with a flat-ish base near the bottom of the band and puffy domes above
        const mask = noise(x * sc, 7.3, per, seed + 99);
        const base = 1 - Math.pow(Math.max(0, (v - 0.55) / 0.45), 1.6);   // fade out toward the base
        const top = Math.min(1, v / 0.25);                                   // and toward the top edge
        d = (n * 1.25 + mask * 0.75 - 0.8) * 3.4 * base * top;
      } else if (type === 'cirrus') {
        const band = Math.sin(v * Math.PI);
        d = (n - 0.5) * 3.2 * band;
      } else {
        const band = Math.pow(Math.sin(v * Math.PI), 0.7);
        d = (n * 0.7 + 0.1) * band * 0.55;
      }
      den[y * W + x] = Math.max(0, Math.min(1, d));
    }
  }
  // lighting: compare with density a few pixels toward the sun (up and to the left)
  const off = Math.round(W / 110);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, d = den[i];
      if (d <= 0.001) { px[i * 4 + 3] = 0; continue; }
      const sxp = ((x - off) % W + W) % W, syp = Math.max(0, y - off);
      const toward = den[syp * W + sxp];
      let light = 0.92 + (d - toward) * 0.9;                 // gentle relief toward the sun
      light -= Math.max(0, y / H - 0.5) * (type === 'cumulus' ? 0.2 : 0.05); // slightly softer bases
      light += (1 - d) * 0.1;                                 // thin parts glow (light passes through)
      light = Math.max(0.78, Math.min(1.04, light));
      const warm = type === 'cirrus' ? 1 : 0.97;
      px[i * 4] = 255 * light;
      px[i * 4 + 1] = 252 * light * warm + 3;
      px[i * 4 + 2] = 250 * light * warm + 8 * (1 - light);
      // soft edges: alpha rises smoothly with density
      const a = type === 'haze' ? d * 0.55 : Math.min(0.82, Math.pow(d * 1.7, 1.4)) * (type === 'cirrus' ? 0.75 : 1);
      px[i * 4 + 3] = 255 * a;
    }
  }
  ctx.putImageData(img, 0, 0);
  // a touch of blur removes pixel noise and gives the soft, diffuse edges of real cloud
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const octx = out.getContext('2d');
  octx.filter = `blur(${type === 'cumulus' ? 3 : 3}px)`;
  octx.drawImage(c, -W, 0); octx.drawImage(c, 0, 0); octx.drawImage(c, W, 0); // wrap so the seam stays clean
  return out;
}

function tryPhoto(path) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = path;
  });
}

export class Clouds {
  constructor() {
    this.layers = null;
    this.tint = document.createElement('canvas');
  }
  // generated at modest resolution and scaled up: clouds are soft, so this costs nothing in quality
  build() {
    if (this.layers) return;
    const t0 = performance.now();
    this.layers = [
      { img: bake(1600, 240, 'cirrus', 11), name: 'high', y0: 0.3, h: 0.28, speed: 1.2, par: 0.05, alpha: 0.75 },
      { img: bake(2000, 500, 'cumulus', 23), name: 'mid', y0: 0.46, h: 0.5, speed: 3.0, par: 0.12, alpha: 1 },
      { img: bake(1024, 120, 'haze', 37), name: 'low', y0: 0.86, h: 0.16, speed: 5.0, par: 0.25, alpha: 0.6 },
    ];
    this.buildMs = performance.now() - t0;
    // drop-in photos replace generated layers
    for (const L of this.layers) tryPhoto(`assets/sky/clouds_${L.name}.png`).then((im) => { if (im) L.img = im; });
  }
  // Draw the clouds into the sky band above `horizon` (screen px). skyH = how tall the sky band is.
  // tint: [r,g,b] colour of the light on them (white by day, orange at sunset, dark blue at night)
  draw(ctx, W, horizon, skyH, t, camX, ppm, tint, light) {
    if (horizon < 4) return;
    this.build();
    const tc = this.tint;
    // a fixed-size buffer (re-allocating it as the horizon moved cost time every frame)
    const th = Math.max(1, Math.ceil(skyH * 1.25));
    if (tc.width !== W || tc.height < th) { tc.width = W; tc.height = th; }
    const hz = Math.min(horizon, tc.height);
    const tctx = tc.getContext('2d');
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, tc.width, tc.height);
    for (const L of this.layers) {
      const dh = skyH * L.h, dw = dh * (L.img.width / L.img.height);
      const y = hz - skyH + skyH * L.y0 - dh * 0.25;
      // drift with the wind, and slide slowly as Earl moves (far layers move least). The position is
      // worked out as a fraction of one tile, in fixed reference units (a 1280 x 720 screen) that
      // never depend on the current render size, and only then turned into pixels. (It used to be
      // camX x screen width, wrapped by a tile width that follows the screen height: camX is in the
      // thousands, so each small change of render resolution - the adaptive quality steps it a few
      // times a second while moving - shifted the clouds by tens of pixels at once.)
      // Drawn as one seamless repeating pattern at the exact (sub-pixel) offset.
      const refTile = 612 * L.h * (L.img.width / L.img.height);
      const phase = (((t * L.speed + camX * 32 * L.par) / refTile) % 1 + 1) % 1;
      const off = -phase * dw;
      if (!L.pat || L.patImg !== L.img) { L.pat = tctx.createPattern(L.img, 'repeat-x'); L.patImg = L.img; }
      tctx.globalAlpha = L.alpha;
      tctx.save();
      tctx.translate(off, y); tctx.scale(dw / L.img.width, dh / L.img.height);
      tctx.fillStyle = L.pat; tctx.fillRect(-off * L.img.width / dw - L.img.width, 0, (W + dw * 2) * L.img.width / dw, L.img.height);
      tctx.restore();
    }
    tctx.globalAlpha = 1;
    // light the whole cloud deck at once: multiply by the colour of the light, keep the alpha
    tctx.globalCompositeOperation = 'source-atop';
    tctx.fillStyle = `rgba(${tint[0] | 0},${tint[1] | 0},${tint[2] | 0},${(1 - light * 0.85).toFixed(3)})`;
    tctx.fillRect(0, 0, tc.width, tc.height);
    tctx.globalCompositeOperation = 'source-over';
    // only the part above the horizon is shown (clouds never hang below the sea)
    if (hz >= 1) ctx.drawImage(tc, 0, 0, W, hz, 0, horizon - hz, W, hz);
  }
}
