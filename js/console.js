// (ui-studio) The console: the parts every instrument and control on screen is built from, drawn once as vector art
// (assets/src/parts/*.svg, rendered to assets/ui/parts/*.png at 3x by tools/render_parts.cjs) and put on screen here.
// One family: matte black enamel, off-white printed figures, rubber keys, indicator lamps; signal orange for what
// wants attention, red for danger. Only what moves (figures, needles, sweeps) is drawn live, over the parts.
import { clamp, TAU } from './util.js';

export const INK = '#ece6d6', DIM = 'rgba(236,230,214,0.58)', ORANGE = '#ec6a2c', RED = '#d8392b', GREEN = '#7fcf74';
export const NUM = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
export const TEXT = '"EB Garamond", Georgia, serif';
const K = 3; // the PNGs are drawn at 3x their design size

const IMG = {};
for (const n of ['plate', 'window', 'screw', 'key', 'tile', 'tile-on', 'gauge', 'scope', 'lamp-off', 'lamp-orange', 'lamp-red', 'lamp-green']) {
  const im = new Image(); im.src = `assets/ui/parts/${n}.png`; IMG[n] = im;
}
const ready = (im) => im && im.complete && im.naturalWidth > 0;

// a part stretched to (w, h) without stretching its corners: c is the corner size in design px, s the HUD scale
export function nine(ctx, name, x, y, w, h, c, s) {
  const im = IMG[name]; if (!ready(im)) return false;
  const sw = im.naturalWidth, sh = im.naturalHeight, sc = c * K, dc = c * s;
  const xs = [0, sc, sw - sc, sw], ys = [0, sc, sh - sc, sh];
  const dx = [x, x + dc, x + w - dc, x + w], dy = [y, y + dc, y + h - dc, y + h];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const a = xs[j + 1] - xs[j], b = ys[i + 1] - ys[i], da = dx[j + 1] - dx[j], db = dy[i + 1] - dy[i];
    if (a > 0 && b > 0 && da > 0 && db > 0) ctx.drawImage(im, xs[j], ys[i], a, b, dx[j], dy[i], da, db);
  }
  return true;
}
// a part at its own proportions, w wide (design px x scale)
export function part(ctx, name, x, y, w, h) { const im = IMG[name]; if (!ready(im)) return false; ctx.drawImage(im, x, y, w, h); return true; }

export const plate = (ctx, x, y, w, h, s, screws = false) => {
  nine(ctx, 'plate', x, y, w, h, 12, s);
  if (screws) { const r = 10 * s; part(ctx, 'screw', x + 4 * s, y + h / 2 - r / 2, r, r); part(ctx, 'screw', x + w - 4 * s - r, y + h / 2 - r / 2, r, r); }
};
export const sunk = (ctx, x, y, w, h, s) => nine(ctx, 'window', x, y, w, h, 8, s);
export const tile = (ctx, x, y, w, h, s, on) => nine(ctx, on ? 'tile-on' : 'tile', x, y, w, h, 12, s);
export function lamp(ctx, x, y, state, s, size = 20) { const d = size * s; part(ctx, 'lamp-' + (state || 'off'), x - d / 2, y - d / 2, d, d); }

// a rubber key with its letter (or a short word, the key growing to fit); x, y its top left; returns its width
export function key(ctx, x, y, label, s) {
  const word = String(label), h = 26 * s;
  ctx.save(); ctx.font = `600 ${(word.length > 1 ? 12 : 15) * s}px ${NUM}`;
  const w = Math.max(h, ctx.measureText(word).width + 14 * s);
  nine(ctx, 'key', x, y, w, h, 8, s);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(word, x + w / 2, y + h * 0.44);
  ctx.restore();
  return w;
}

// the air gauge: its face, the needle at frac (0 empty .. 1 full), its name and a reading under the pivot
export function gauge(ctx, cx, cy, R, frac, s, { name = 'AIR', reading = '', warn = 0, t = 0 } = {}) {
  part(ctx, 'gauge', cx - R, cy - R, R * 2, R * 2);
  const k = R / 60, a = (144 + 252 * clamp(frac, 0, 1)) * Math.PI / 180;
  const jitter = warn > 1 ? Math.sin(t * 40) * 0.015 : 0; // (the needle trembles when it is nearly empty)
  ctx.save();
  ctx.font = `600 ${11 * k}px ${NUM}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = DIM; ctx.fillText(name, cx, cy + 16 * k);
  ctx.font = `600 ${17 * k}px ${NUM}`; ctx.fillStyle = warn > 1 ? (Math.sin(t * 9) > 0 ? RED : '#ff8a6a') : warn ? ORANGE : INK;
  ctx.fillText(reading, cx, cy + 30 * k);
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 2.6 * k; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - Math.cos(a + jitter) * 7 * k, cy - Math.sin(a + jitter) * 7 * k); ctx.lineTo(cx + Math.cos(a + jitter) * 38 * k, cy + Math.sin(a + jitter) * 38 * k); ctx.stroke();
  ctx.fillStyle = '#2b2f32'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1 * k; ctx.beginPath(); ctx.arc(cx, cy, 4.5 * k, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}
export const scopeFace = (ctx, cx, cy, R) => part(ctx, 'scope', cx - R, cy - R, R * 2, R * 2);
// the inner radius of a gauge or scope face drawn at outer radius R (what the live drawing fits in)
export const faceR = (R) => R * 46 / 60;

// small printed caps (labels on plates)
export function label(ctx, text, x, y, s, { align = 'left', col = DIM, size = 11, weight = 600, spacing = 1.6 } = {}) {
  ctx.save(); ctx.font = `${weight} ${size * s}px ${NUM}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * s}px`;
  ctx.fillText(text, x, y); ctx.restore();
}
