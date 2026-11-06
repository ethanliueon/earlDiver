// The shop's showcase: the thing you are looking at, drawn as it looks in the water. A window at the
// top of the Diver, Tools and Sub tabs shows the selected item now and, where the next step changes
// how it looks, beside it as it will be: the next hull, the next net, Earl in a new suit. Drawn with
// the game's own drawings (earl_draw.js, tools_draw.js), gently moving while the shop is open.
import { drawEarl, drawSub } from './earl_draw.js';
import { toolIcon } from './tools_draw.js';
import { speciesIcon } from './creatures_draw.js';
import { SPECIES_BY_ID } from './species.js';
import { TRACKS, gear, lv } from './economy.js';
import { TRAP_ORDER } from './economy.js';
import { subLook } from './render.js';

// the profile as it would be one step further up a ladder
function stepped(P, t) { return { ...P, tlvV: 2, tlv: { ...(P.tlv || {}), [t]: Math.min(TRACKS[t].max, lv(P, t) + 1) } }; }

const SUB_TRACKS = new Set(['tHull', 'tEngine', 'tChambers', 'tOpen', 'tRack', 'tClaw']);
const TOOL_OF = { tNet: ['net', 'net'], tSlurp: ['slurp', 'slurp'], tTag: ['tag', 'tag'], tCam: ['cam', 'cam'] };
const GEAR_TOOL = { slurp: 'slurp', tagger: 'tag', camera: 'cam' };

// what to draw for a shop key: { kind, now, next } (next null when the next step looks the same)
export function previewOf(key, P) {
  const k = key.replace(/^card:/, '');
  if (k.startsWith('up:')) {
    const t = k.slice(3), T = TRACKS[t], maxed = lv(P, t) >= T.max, Pn = maxed ? null : stepped(P, t);
    if (SUB_TRACKS.has(t)) return { kind: 'sub', now: subLook(P), next: Pn ? subLook(Pn) : null };
    if (TOOL_OF[t]) {
      const [tool, gk] = TOOL_OF[t], a = gear(P, gk).look, b = Pn ? gear(Pn, gk).look : a;
      return { kind: 'tool', tool, now: a, next: b !== a ? b : null };
    }
    if (t === 'tBuyers') return { kind: 'fish', id: 55 };
    return { kind: 'earl', suit: P.suit || 'wet', bag: t === 'tBag' ? Math.min(6, 2 + lv(P, t)) : 0, swim: t === 'tFins', tank: t === 'tTank' };
  }
  if (k.startsWith('suit:')) return { kind: 'earl', suit: k.slice(5), from: P.suit || 'wet' };
  if (k.startsWith('trap:')) return { kind: 'tool', tool: 'trap', now: TRAP_ORDER.indexOf(k.slice(5)), next: null };
  if (k.startsWith('gear:')) {
    const g = k.slice(5);
    if (GEAR_TOOL[g]) return { kind: 'tool', tool: GEAR_TOOL[g], now: 0, next: null };
    if (g === 'arm') return { kind: 'sub', now: subLook(P), next: null, arm: true };
  }
  return null;
}

const iconCache = new Map();
function icon(tool, tier, w, h) {
  const key = tool + tier + ':' + w + 'x' + h;
  if (!iconCache.has(key)) iconCache.set(key, toolIcon(tool, tier, w, h));
  return iconCache.get(key);
}

// draw one picture of the preview into a box (x, y, w, h) of a 2D context
function drawOne(ctx, pv, look, x, y, w, h, t) {
  ctx.save();
  if (pv.kind === 'sub') {
    const L = Math.min(w * 0.9, h * 1.7);
    ctx.translate(x + w * 0.52, y + h * 0.52 + Math.sin(t * 1.1) * h * 0.015);
    ctx.scale(-1, 1); // bow to the right, toward "next"
    const arm = pv.arm ? { ext: 0.8 + 0.2 * Math.sin(t), closed: false, lx: -L * 0.62, ly: L * 0.22 } : null;
    drawSub(ctx, L, t, 0, true, arm, look);
  } else if (pv.kind === 'tool') {
    const c = icon(pv.tool, look, Math.round(w * 2), Math.round(h * 2));
    ctx.translate(x + w / 2, y + h / 2 + Math.sin(t * 1.3) * h * 0.02);
    ctx.drawImage(c, -w / 2, -h / 2, w, h);
  } else if (pv.kind === 'earl') {
    // Earl is drawn lying along +x: stood up, drifting, kicking slowly (faster when it's about fins)
    const L = h * 0.95;
    ctx.translate(x + w / 2, y + h * 0.5 + Math.sin(t * 0.9) * h * 0.02);
    ctx.rotate(-Math.PI / 2 + 0.12 * Math.sin(t * 0.5));
    const bag = Array.from({ length: pv.bag || 0 }, (_, i) => ({ col: ['#e8783a', '#4a90c8', '#e0c040', '#9a5ac8', '#5ab070', '#d04a4a'][i % 6] }));
    drawEarl(ctx, L, t * (pv.swim ? 5 : 2), pv.swim ? 0.7 : 0.15, null, null, { kind: 'none', tier: 0, t, suit: look, bag });
  } else if (pv.kind === 'fish') {
    const key = 'fish' + pv.id + ':' + Math.round(w) + 'x' + Math.round(h);
    if (!iconCache.has(key)) iconCache.set(key, speciesIcon(SPECIES_BY_ID[pv.id], Math.round(w * 2), Math.round(h * 2)));
    ctx.translate(x + w / 2, y + h / 2 + Math.sin(t * 1.2) * h * 0.03);
    ctx.drawImage(iconCache.get(key), -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

// the whole window: water behind, light from above, now (and next, with an arrow and a label)
export function drawShowcase(canvas, pv, t) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1f5a6e'); bg.addColorStop(1, '#071c26');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.06; ctx.fillStyle = '#e8f8ff';
  for (let k = 0; k < 5; k++) { const x0 = W * (0.1 + k * 0.2) + Math.sin(t * 0.3 + k) * 12; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 26, 0); ctx.lineTo(x0 + 70, H); ctx.lineTo(x0 + 40, H); ctx.fill(); }
  ctx.globalAlpha = 0.25; ctx.fillStyle = '#cfe8f0';
  for (let k = 0; k < 9; k++) { const bx = W * ((k * 0.113 + 0.05) % 1), by = H - ((t * 14 + k * 37) % H); ctx.beginPath(); ctx.arc(bx + Math.sin(t + k) * 3, by, 1 + (k % 3) * 0.6, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (!pv) return;
  const two = pv.next !== null && pv.next !== undefined || (pv.kind === 'earl' && pv.from && pv.from !== pv.suit);
  if (!two) { drawOne(ctx, pv, pv.kind === 'earl' ? pv.suit : pv.now, W * 0.1, H * 0.06, W * 0.8, H * 0.88, t); return; }
  const a = pv.kind === 'earl' ? pv.from : pv.now, b = pv.kind === 'earl' ? pv.suit : pv.next;
  ctx.globalAlpha = 0.6; drawOne(ctx, pv, a, W * 0.0, H * 0.12, W * 0.45, H * 0.74, t); ctx.globalAlpha = 1;
  drawOne(ctx, pv, b, W * 0.5, H * 0.04, W * 0.5, H * 0.86, t + 0.7);
  ctx.fillStyle = 'rgba(240,212,138,0.85)'; ctx.font = `${Math.round(H * 0.16)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('→', W * 0.48, H * 0.5);
  ctx.font = `${Math.max(9, Math.round(H * 0.075))}px "IBM Plex Mono", monospace`; ctx.fillStyle = 'rgba(220,236,240,0.6)';
  ctx.fillText(pv.kind === 'earl' ? 'WORN NOW' : 'NOW', W * 0.23, H * 0.92); ctx.fillStyle = 'rgba(240,212,138,0.9)'; ctx.fillText(pv.kind === 'earl' ? 'THIS SUIT' : 'NEXT', W * 0.75, H * 0.92);
}
