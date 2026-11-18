// (ui-studio) The instruments: everything the game tells Earl is a return on dark glass, in the green phosphor of the
// Margaret's sonar and the cabin's CRT (docs/UI_BRIEF.md). Drawn live, as light: no plates, no gradients, no accent
// colour. Emphasis is inverse video (a lit block, the words cut out of it); urgency is flicker; red is kept for the
// thing in the deep and for dying.
import { clamp, TAU } from './util.js';

const PH = [185, 230, 154];
export const P = (a = 1) => `rgba(${PH[0]},${PH[1]},${PH[2]},${a})`;
export const INK = P(1), DIM = P(0.58), GHOST = P(0.18), GLASS = 'rgba(6,17,14,0.86)', GLASS_INK = '#06110e', RED = '#ff5a46';
// (the names the HUD used before: attention is lit phosphor now, not orange)
export const ORANGE = INK, GREEN = INK;
export const NUM = 'VT323, "IBM Plex Mono", monospace';
export const TEXT = '"EB Garamond", Georgia, serif';

// a screen: dark glass behind a thin black bezel, a faint lit rim, scan bands across it
export function screen(ctx, x, y, w, h, s, { rim = 0.16 } = {}) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s);
  ctx.fillStyle = GLASS; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = P(rim); ctx.lineWidth = Math.max(1, s); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = P(0.05); const step = Math.max(2, 3 * s); for (let yy = y + 2; yy < y + h - 1; yy += step) ctx.fillRect(x + 1, yy, w - 2, Math.max(1, s * 0.6));
  ctx.restore();
}
export const plate = (ctx, x, y, w, h, s) => screen(ctx, x, y, w, h, s);
export const sunk = () => {};
export const tile = (ctx, x, y, w, h, s, on) => screen(ctx, x, y, w, h, s, { rim: on ? 0.75 : 0.16 });
// a rule across a screen
export const rule = (ctx, x0, x1, y, s) => { ctx.fillStyle = GHOST; ctx.fillRect(x0, Math.round(y), x1 - x0, Math.max(1, s * 0.8)); };

// phosphor type: labels print in lower case (no tracked capitals); a reading glows
export function label(ctx, text, x, y, s, { align = 'left', col = DIM, size = 11, glow = false, raw = false } = {}) {
  ctx.save(); ctx.font = `${Math.round(size * 1.6 * s)}px ${NUM}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle';
  const t = raw ? String(text) : String(text).toLowerCase().replace(/×/g, 'x'); // (VT323's × is oversized)
  if (glow) { ctx.shadowColor = col === RED ? 'rgba(255,90,70,0.6)' : P(0.5); ctx.shadowBlur = 6 * s; }
  ctx.fillText(t, x, y); ctx.restore();
}
export function reading(ctx, text, x, y, px, { align = 'right', col = INK } = {}) {
  ctx.save(); ctx.font = `${Math.round(px)}px ${NUM}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = col === RED ? 'rgba(255,90,70,0.6)' : P(0.5); ctx.shadowBlur = px * 0.14; ctx.fillText(text, x, y); ctx.shadowBlur = 0; ctx.fillText(text, x, y); ctx.restore();
}
// a key: a phosphor outline, its letter centred by measuring the letter itself (not the line box); returns its width
export function key(ctx, x, y, word, s) {
  const h = 22 * s; ctx.save(); ctx.font = `${Math.round((String(word).length > 1 ? 16 : 20) * s)}px ${NUM}`;
  const w = Math.max(h, ctx.measureText(word).width + 10 * s);
  ctx.strokeStyle = P(0.85); ctx.lineWidth = Math.max(1, s); ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w) - 1, Math.round(h) - 1);
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; // (set before measuring: the measure is from the baseline in force)
  const m = ctx.measureText(word), asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
  ctx.fillText(word, x + w / 2, y + h / 2 + (asc - desc) / 2);
  ctx.restore(); return w;
}
// a lamp: a small phosphor square, lit or dark (red only for danger)
export function lamp(ctx, x, y, state, s, size = 14) {
  const d = Math.round(size * 0.5 * s); ctx.save();
  if (state === 'red') { ctx.fillStyle = RED; ctx.shadowColor = 'rgba(255,90,70,0.7)'; ctx.shadowBlur = 6 * s; ctx.fillRect(x - d / 2, y - d / 2, d, d); }
  else if (state && state !== 'off') { ctx.fillStyle = INK; ctx.shadowColor = P(0.7); ctx.shadowBlur = 6 * s; ctx.fillRect(x - d / 2, y - d / 2, d, d); }
  else { ctx.strokeStyle = P(0.45); ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - d / 2) + 0.5, Math.round(y - d / 2) + 0.5, d - 1, d - 1); }
  ctx.restore();
}
// a bar of blocks: n of them, the first frac lit; warn flickers them; red for danger
export function blocks(ctx, x, y, w, h, frac, s, { n = 12, warn = 0, t = 0 } = {}) {
  const gap = 3 * s, bw = (w - gap * (n - 1)) / n, lit = Math.ceil(clamp(frac, 0, 1) * n - 1e-6);
  const on = warn > 1 ? (Math.sin(t * 10) > -0.2) : true;
  ctx.save();
  for (let k = 0; k < n; k++) { ctx.fillStyle = k < lit && on ? (warn > 1 ? RED : INK) : GHOST; ctx.fillRect(Math.round(x + k * (bw + gap)), Math.round(y), Math.max(1, Math.round(bw)), Math.round(h)); }
  ctx.restore();
}
// inverse video: a lit block with the words cut out of it (the selected thing, the one action)
export function inverse(ctx, text, x, y, w, h, s, { size = 12, align = 'center' } = {}) {
  ctx.save(); ctx.fillStyle = INK; ctx.fillRect(x, y, w, h);
  ctx.font = `${Math.round(size * 1.6 * s)}px ${NUM}`; ctx.fillStyle = GLASS_INK; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(String(text).toLowerCase().replace(/×/g, 'x'), align === 'center' ? x + w / 2 : x + 6 * s, y + h / 2 + 1 * s); ctx.restore();
}

// a picture as phosphor: its silhouette, lit (the tools' coloured drawings would break the one-colour screen)
const TINT = new Map();
export function tinted(img, a = 1) {
  const k = img; let c = TINT.get(k); if (c && c.a === a) return c.c;
  const o = document.createElement('canvas'); o.width = img.width; o.height = img.height; const x = o.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = P(a); x.fillRect(0, 0, o.width, o.height);
  TINT.set(k, { a, c: o }); return o;
}
