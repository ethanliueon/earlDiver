// (6.0.3) Metric or Imperial, chosen in Settings (Metric unless changed). The game is written in metres, centimetres and
// kilograms; with Imperial on, every figure is turned into feet, inches and pounds where it is shown: in the page's
// text (a watch on the document, below) and in everything drawn on the canvases (fillText and measureText, cached),
// so no screen is missed. The depth gauge draws its number and unit apart, so it asks depthShown / depthUnit itself.
const KEY = 'earl.units';
let UNITS = (() => { try { return localStorage.getItem(KEY) === 'imperial' ? 'imperial' : 'metric'; } catch (e) { return 'metric'; } })();
export const units = () => UNITS;
export const imperial = () => UNITS === 'imperial';
export function setUnits(u) { UNITS = u === 'imperial' ? 'imperial' : 'metric'; cache.clear(); try { localStorage.setItem(KEY, UNITS); } catch (e) { /* not saved */ } }

const FT = 3.28084, LB = 2.20462, IN = 1 / 2.54;
const num = (s) => parseFloat(String(s).replace(/,/g, ''));
const fmt = (v, dec) => { const r = Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(dec); return Math.abs(r) >= 1000 ? Math.round(r).toLocaleString('en-US') : String(r); };
// a figure in metres as feet (depth and lengths: whole feet from 10 up, one decimal below)
export const ft = (m) => fmt(m * FT, Math.abs(m * FT) < 10 ? 1 : 0);
export const depthShown = (m) => (imperial() ? Math.round(m * FT) : Math.round(m));
export const depthUnit = () => (imperial() ? 'ft' : 'm');

// "16 m", "1,000 m", "0.22 m", "22 cm", "12 kg", "4.5 kg" (and ranges such as "200-300 m") -> Imperial
const RX = /(?<![$\d.,])(\d[\d,]*(?:\.\d+)?)(\s?(?:-|–|to)\s?(\d[\d,]*(?:\.\d+)?))?(\s?)(cm|kg|m)\b(?![a-z²³])/g;
const cache = new Map();
export function conv(text) {
  if (UNITS !== 'imperial' || typeof text !== 'string' || text.length < 3 || !/\d\s?(?:cm|kg|m)\b/.test(text)) return text;
  const hit = cache.get(text); if (hit !== undefined) return hit;
  const out = text.replace(RX, (all, a, rng, b, sp, u) => {
    const one = (v) => (u === 'm' ? ft(num(v)) : u === 'cm' ? fmt(num(v) * IN, num(v) * IN < 10 ? 1 : 0) : fmt(num(v) * LB, num(v) * LB < 10 ? 1 : 0));
    const U = u === 'm' ? 'ft' : u === 'cm' ? 'in' : 'lb';
    return rng ? `${one(a)}${rng.replace(b, one(b))}${sp}${U}` : `${one(a)}${sp}${U}`;
  });
  if (cache.size > 2000) cache.clear(); cache.set(text, out); return out;
}

// every canvas: text drawn or measured goes through conv (a cached look-up; strings without a figure and a unit pass at once)
{ const P = CanvasRenderingContext2D.prototype, fT = P.fillText, sT = P.strokeText, mT = P.measureText;
  P.fillText = function (t, ...a) { return fT.call(this, UNITS === 'imperial' ? conv(String(t)) : t, ...a); };
  P.strokeText = function (t, ...a) { return sT.call(this, UNITS === 'imperial' ? conv(String(t)) : t, ...a); };
  P.measureText = function (t) { return mT.call(this, UNITS === 'imperial' ? conv(String(t)) : t); }; }

// the page: text as it is put in (panels, cards, the shop, the journal) is turned as it arrives; a panel built again after
// a change of setting shows the new units
function walk(n) {
  if (n.nodeType === 3) { const t = n.nodeValue, c = conv(t); if (c !== t) n.nodeValue = c; return; }
  if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
  for (const ch of n.childNodes) walk(ch);
}
export function watchPage() {
  const mo = new MutationObserver((list) => { if (UNITS !== 'imperial') return; for (const m of list) { if (m.type === 'characterData') walk(m.target); else for (const n of m.addedNodes) walk(n); } });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  if (UNITS === 'imperial') walk(document.body);
}
