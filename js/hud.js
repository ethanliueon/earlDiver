import { drawPrompt, promptShade, parsePrompt, depthCounter, dymo, tubeGauge, brassBezel, keyCap, oliveNine, HUDF } from './fittings.js';
import { lockerTexture } from './textures.js';
import { drawGlyph } from './glyphs.js';
// (olive) a small plate of the locker's painted steel (the same painter, so the same material), cached by size
const PLATES = new Map();
function steelPlate(ctx, x, y, w, h, s) {
  const W2 = Math.round(w), H2 = Math.round(h), k = W2 + 'x' + H2;
  let im = PLATES.get(k);
  if (!im) { im = new Image(); im.src = lockerTexture(W2, H2, { plain: true }); PLATES.set(k, im); }
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 2 * s;
  ctx.fillStyle = '#3b4434'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 4 * s); ctx.fill(); ctx.restore();
  if (im.complete && im.naturalWidth) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 4 * s); ctx.clip(); ctx.drawImage(im, x, y, w, h); ctx.restore(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 4 * s); ctx.stroke();
}
// (4.27) the painted HUD icons (tools/icon_kit.py)
const ICONS = {};
const TIMG = {};
function touchImg(n) { let im = TIMG[n]; if (!im) { im = new Image(); im.src = `assets/ui/touch/${n}.png`; TIMG[n] = im; } return im.complete && im.naturalWidth ? im : null; }
function hudIcon(n) { let im = ICONS[n]; if (!im) { im = new Image(); im.src = `assets/ui/icons/${n}.png`; ICONS[n] = im; } return im.complete && im.naturalWidth ? im : null; }
const parsePromptKey = (t) => parsePrompt(t).some((p) => p.key);
import { TITLES, LEGEND_OF } from './species.js';
// (3.0.42) a Legendary's title in a message: never 'the the fangtooth', always 'the Fangtooth'
const TITLE_RE = Object.values(TITLES).concat(Object.values(LEGEND_OF).map((x) => x[0])).map((t) => [new RegExp(`\\b(?:the |an? )?${t}\\b`, 'gi'), t]);
export function titled(text) { let out = String(text); for (const [re, t] of TITLE_RE) out = out.replace(re, t); return out.charAt(0).toUpperCase() + out.slice(1); }
// HUD drawn on its own canvas (not affected by the dread filters):
// survival timer + oxygen bar (top right), the right-hand dive monitor
// (depth, radar, heart rate, journal), item slots and prompts.
import { clamp, lerp, formatTime, TAU } from './util.js';
import { SUB_LEVELS, diverDrainMult } from './player.js';
import { RESOURCES, boatDock } from './world.js';
import { GOODS, money, gear, owns } from './economy.js';
import { BOAT } from './world.js';
import { VARIANTS } from './variants.js';
import { speciesIcon } from './creatures_draw.js';
import { SETTINGS } from './settings.js';
import { toolIcon } from './tools_draw.js';
import { bagSlots, tankSlots, pressSlots, NETS_SUB, TOW_MAX, netKinds, netsOf, tankUsed, BIG, hasBigTank, bigIn } from './capture.js';
import { SPECIES_BY_ID } from './species.js';

const MONO = '"Barlow Semi Condensed", "Arial Narrow", sans-serif';
const HUDT = '"Barlow Condensed", "Arial Narrow", sans-serif'; // (4.28) the instruments' figures
const GAME = '"Barlow Semi Condensed", "Arial Narrow", system-ui, sans-serif'; // (4.27) the HUD face

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.ecg = new Array(120).fill(0); this.ecgT = 0; this.beatPhase = 0;
    this.sweep = 0; this.blip = null; this.toasts = []; this.journalHot = null; this.chartHot = null;
  }
  resize() {
    // (5.4) on a phone the page is wider than the screen (index.html): the HUD drawn at 1.5 pixels a real point, as before
    const dpr = window.__fingerK ? 1.5 / window.__fingerK : Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    // (4.17.0) the UI scale: from the screen's height, but never below 0.7 of the design (a phone held sideways is
    // only ~390 px tall) nor above 1.5; and the notch's safe areas kept clear
    this.s = Math.min(1.6 * dpr, Math.max(h / 780, 0.8 * dpr)); // (4.26) larger: readable at a glance // (claude-polish) as the comment above says: the clamp was never applied, so a phone's instruments were drawn at 0.43 and unreadable
    if (window.__fingerK) this.s *= 1.15; // (5.4) a phone's screen is smaller than a laptop's: the instruments' words a little larger (as the quest line)
    if (!this.safeEl) { this.safeEl = document.createElement('div'); this.safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(this.safeEl); }
    const cs = getComputedStyle(this.safeEl); this.safe = { l: parseFloat(cs.paddingLeft) * dpr || 0, r: parseFloat(cs.paddingRight) * dpr || 0, t: parseFloat(cs.paddingTop) * dpr || 0, b: parseFloat(cs.paddingBottom) * dpr || 0 };
  }
  // explanations: only when hints are on (H)
  hint(text) { if (this.hints) this.toast(text, 'note'); }
  toast(text, kind = '') {
    text = titled(String(text).replace(/\s+·\s+/g, ', ')); // (4.26) no middle dots in what the game says
    // the same line again while it is still up: count it ("x2") instead of stacking a copy
    const same = this.toasts.find((tt) => tt.text === text && tt.kind === kind && tt.t < 3.5);
    if (same) { same.t = Math.min(same.t, 0.4); if (this.onShow) this.onShow(text, kind); return; } // (4.5.0) said again: the line stays up (no count)
    this.toasts.push({ text, kind, t: 0 }); if (this.toasts.length > 4) this.toasts.shift();
    if (this.onShow) this.onShow(text, kind); // (3.4.0) said by the message line (messages.js), not drawn here
  }

  // The hotbar (1 net, 2 slurp gun) and a row of specimen slots above it.
  drawGear(g, W, H, s, dt) {
    const ctx = this.ctx, P = g.profile, e = g.earl;
    this.icons = this.icons || new Map();
    const icon = (kind, tier) => {
      const k = kind + (tier && typeof tier === 'object' ? (tier.fx || '') + (tier.base || 0) + (tier.hoop || '') + (tier.body || '') + (tier.shape || '') : tier); // (a special net's look is an object)
      if (!this.icons.has(k)) this.icons.set(k, toolIcon(kind, tier, 120, 60));
      return this.icons.get(k);
    };
    const G = (k) => gear(P, k);
    const tools = [['1', 'net', G('net').look, G('net').name]];
    if (owns(P, 'camera')) tools.push(['2', 'cam', G('cam').look, G('cam').name]);
    const tr = P.traps || {};
    const ownedTraps = ['pot', 'fish', 'steel', 'cage'].reduce((a, k) => a + (tr[k] || 0), 0);
    if (ownedTraps > 0) tools.push(['3', 'trap', ['pot', 'fish', 'steel', 'cage'].findIndex((k) => tr[k] > 0), 'Traps']);
    const sw = 84 * s, sh = 46 * s, gap = 8 * s;
    const total = tools.length * sw + (tools.length - 1) * gap;
    let x = W / 2 - total / 2;
    const y = H - sh - 22 * s;
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    for (const [key, kind, tier, name] of tools) {
      const on = kind === sel && !e.inSub;
      // (olive) a raised plate of the panels' painted steel with a well pressed into it; the tool in hand ringed in
      // the deck's cream paint
      if (!oliveNine(ctx, 'btn-olive', x - 3 * s, y - 3 * s, sw + 6 * s, sh + 6 * s, 28, 10 * s)) { ctx.fillStyle = 'rgba(44,48,42,0.9)'; ctx.beginPath(); ctx.roundRect(x, y, sw, sh, 5 * s); ctx.fill(); }
      oliveNine(ctx, 'well', x + 4 * s, y + 4 * s, sw - 8 * s, sh - 8 * s, 30, 6 * s);
      if (on) { ctx.strokeStyle = 'rgba(230,222,196,0.95)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.roundRect(x - 2 * s, y - 2 * s, sw + 4 * s, sh + 4 * s, 6 * s); ctx.stroke(); }
      ctx.globalAlpha = e.inSub ? 0.35 : on ? 1 : 0.55;
      ctx.drawImage(icon(kind, tier), x + 6 * s, y + 4 * s, sw - 12 * s, sh - 12 * s);
      ctx.globalAlpha = 1;
      ctx.font = `500 ${10 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (!this.touch) keyCap(ctx, x - 5 * s, y - 7 * s, key, s * 0.6); ctx.font = `500 ${10 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      { const kx2 = window.innerWidth / this.c.width; if (!e.inSub) this.hots.push({ x: (x + this.safeL) * kx2, y: (y + this.safeT) * kx2, w: sw * kx2, h: sh * kx2, key }); } // (5.1.1) a tool is picked by clicking (tapping) it too
      if (kind === 'cam') { ctx.textAlign = 'right'; ctx.fillStyle = g.items.film ? 'rgba(216,236,230,0.8)' : '#e0524a'; ctx.fillText(`${g.items.film || 0}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      if (kind === 'trap') { const free = ownedTraps - g.traps.length; ctx.textAlign = 'right'; ctx.fillStyle = free ? 'rgba(216,236,230,0.8)' : '#e86a50'; ctx.fillText(`${free}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      // sweep / reload progress along the bottom edge
      if (on && kind === 'cam' && g.photo) { ctx.fillStyle = 'rgba(200,230,215,0.7)'; ctx.fillRect(x + 4 * s, y + sh - 4 * s, (sw - 8 * s) * clamp(g.photo.t / g.photo.dur, 0, 1), 2 * s); }
      if (on && g.capture && g.capture.kind === kind) {
        ctx.fillStyle = 'rgba(200,230,215,0.7)';
        ctx.fillRect(x + 4 * s, y + sh - 4 * s, (sw - 8 * s) * clamp(g.capture.t / g.capture.dur, 0, 1), 2 * s);
      }
      if (on) { ctx.font = `${9 * s}px ${MONO}`; const nw = dymo(ctx, name, 0, -999, s, { align: 'left' }); dymo(ctx, name, x + sw / 2 - nw / 2, y + sh + 3 * s, s, { align: 'left' }); }
      x += sw + gap;
    }
    // specimen slots: the bag (or, in the sub, its tank). Each dot shows the animal's colour,
    // ringed by its condition: green healthy, amber stressed, red weak, grey dead.
    // (4.16.7) in the sub, just counts: the open tank's spaces, the chambers, the large tank if fitted
    if (e.inSub) {
      const sy0 = y - 18 * s, fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1));
      const parts = [['Tank', `${fmt(tankUsed(g))}/${tankSlots(g)}`]];
      if (pressSlots(g)) parts.push(['Chambers', `${g.subTank.filter((q) => q.pressed && q.chamber !== BIG).length}/${pressSlots(g)}`]);
      if (g.bag.length) parts.push(['Bag', `${g.bag.length}`]); // (4.28) what is still outside the tank, in the row (it was printed over it)
      if (hasBigTank(g)) parts.push(['Large tank', `${bigIn(g).length}/3`]);
      ctx.textBaseline = 'middle';
      const lab = `600 ${17 * s}px ${HUDF}`, val = `600 ${15 * s}px ${MONO}`, gapP = 26 * s;
      const widths = parts.map(([l, v]) => { ctx.font = lab; const a2 = ctx.measureText(l).width; ctx.font = val; return a2 + 6 * s + ctx.measureText(v).width; });
      let px = W / 2 - (widths.reduce((a2, b2) => a2 + b2, 0) + gapP * (parts.length - 1)) / 2;
      parts.forEach(([l, v], i) => { ctx.textAlign = 'left'; ctx.font = lab; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4 * s; ctx.fillStyle = 'rgba(230,224,204,0.85)'; ctx.fillText(l, px, sy0); const lw = ctx.measureText(l).width;
        ctx.font = val; ctx.fillStyle = '#efe8d2'; ctx.fillText(v, px + lw + 6 * s, sy0); ctx.shadowBlur = 0; px += widths[i] + gapP; });
    }
    const list = e.inSub ? [] : g.bag, slots = e.inSub ? 0 : bagSlots(g);
    const pList = [], pSlots = 0;
    const r = 7.5 * s, step = 21 * s, rowW = (slots + (pSlots ? pSlots + 0.6 : 0)) * step;
    let sx = W / 2 - rowW / 2 + step / 2;
    const sy = y - 18 * s;
    ctx.font = `${9 * s}px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    if (!e.inSub) { ctx.save(); ctx.font = `600 ${17 * s}px ${HUDF}`; ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4 * s; ctx.fillStyle = 'rgba(230,224,204,0.85)'; ctx.fillText('Bag', sx - step * 0.6 - 2 * s, sy); ctx.restore(); }
    for (let i = 0; i < slots; i++, sx += step) {
      const sp = list[i];
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU);
      ctx.fillStyle = 'rgba(6,12,14,0.55)'; ctx.fill();
      if (sp) {
        const c = sp.cond;
        ctx.fillStyle = SPECIES_BY_ID[sp.id].v.c[0];
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.62, 0, TAU); ctx.fill();
        ctx.strokeStyle = c <= 0.05 ? 'rgba(140,140,140,0.9)' : c >= 0.8 ? 'rgba(120,220,140,0.9)' : c >= 0.5 ? 'rgba(232,176,64,0.95)' : 'rgba(230,80,60,0.95)';
        ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
        // dying in the net (too far from its own pressure): a red ring pulses out from it
        if (c > 0.05 && sp.warnDying && !e.inSub) {
          const q = (g.time * 1.2) % 1;
          ctx.strokeStyle = `rgba(255,90,60,${(0.8 * (1 - q)).toFixed(3)})`; ctx.lineWidth = 1.4 * s;
          ctx.beginPath(); ctx.arc(sx, sy, r * (1 + q * 0.9), 0, TAU); ctx.stroke();
        }
      } else { ctx.strokeStyle = 'rgba(160,200,200,0.18)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    // the pressure tanks: brass-ringed, after a small gap
    if (pSlots) sx += step * 0.6;
    for (let i = 0; i < pSlots; i++, sx += step) {
      const sp = pList[i];
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fillStyle = 'rgba(6,12,14,0.55)'; ctx.fill();
      if (sp) { ctx.fillStyle = SPECIES_BY_ID[sp.id].v.c[0]; ctx.beginPath(); ctx.arc(sx, sy, r * 0.62, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = sp ? 'rgba(224,180,90,0.95)' : 'rgba(224,180,90,0.35)'; ctx.lineWidth = 1.8 * s;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.stroke();
    }
    // old gold coins: a little stack and the count, at the end of the row
    const coins = (g.profile && g.profile.coins) || 0;
    if (coins) {
      const cx0 = W / 2 + rowW / 2 + 12 * s;
      for (let k = 2; k >= 0; k--) {
        const cy0 = sy + 3 * s - k * 2.6 * s;
        const cg = ctx.createLinearGradient(cx0 - 6 * s, cy0 - 3 * s, cx0 + 6 * s, cy0 + 3 * s);
        cg.addColorStop(0, '#fff0b0'); cg.addColorStop(0.5, '#e0aa44'); cg.addColorStop(1, '#8a5a16');
        ctx.fillStyle = '#6a400c'; ctx.beginPath(); ctx.ellipse(cx0, cy0 + 1.2 * s, 6 * s, 3 * s, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(cx0, cy0, 6 * s, 3 * s, 0, 0, TAU); ctx.fill();
      }
      ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(240,212,138,0.9)'; ctx.font = `${10 * s}px ${MONO}`;
      ctx.fillText(String(coins), cx0 + 9 * s, sy);
      this.coinW = 30 * s + ctx.measureText(String(coins)).width;
    } else this.coinW = 0;
    // the arm's grip gauge: a marker sweeping a bar; close the claw in the green
    const A = g.armGame;
    if (A && A.phase === 'grip') {
      const bw = 260 * s, bh = 14 * s, bx = W / 2 - bw / 2, by = H * 0.62;
      ctx.fillStyle = 'rgba(6,12,14,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 6 * s, by - 6 * s, bw + 12 * s, bh + 12 * s, 6 * s); ctx.fill();
      ctx.fillStyle = 'rgba(200,80,60,0.55)'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(232,176,64,0.8)'; ctx.fillRect(bx + bw * A.amber[0], by, bw * (A.amber[1] - A.amber[0]), bh);
      ctx.fillStyle = 'rgba(120,220,140,0.9)'; ctx.fillRect(bx + bw * A.green[0], by, bw * (A.green[1] - A.green[0]), bh);
      ctx.fillStyle = '#f4f4ee'; ctx.fillRect(bx + bw * A.marker - 1.5 * s, by - 4 * s, 3 * s, bh + 8 * s);
      ctx.font = `${10 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,236,230,0.7)'; ctx.textBaseline = 'top';
      ctx.fillText('GRIP', W / 2, by + bh + 8 * s);
    }
    // the last photograph: a print in the corner, with the animal on it
    const pc = this.photoCard;
    if (pc) {
      pc.t += dt;
      if (pc.t > 3.5) this.photoCard = null;
      else {
        if (!pc.img) pc.img = speciesIcon(pc.sp, 200, 120);
        const a = clamp(Math.min(pc.t * 4, (3.5 - pc.t) * 2), 0, 1);
        const cw = 150 * s, ch = 118 * s, px = W - cw - 26 * s, py = H - ch - 26 * s;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(px + cw / 2, py + ch / 2); ctx.rotate(-0.04);
        ctx.fillStyle = '#ece6d6'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 14 * s;
        ctx.fillRect(-cw / 2, -ch / 2, cw, ch); ctx.shadowBlur = 0;
        ctx.fillStyle = '#163a4a'; ctx.fillRect(-cw / 2 + 8 * s, -ch / 2 + 8 * s, cw - 16 * s, ch - 34 * s);
        ctx.drawImage(pc.img, -cw / 2 + 10 * s, -ch / 2 + 10 * s, cw - 20 * s, ch - 38 * s);
        ctx.fillStyle = '#2b2620'; ctx.font = `600 ${13 * s}px ${HUDF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((pc.variant ? VARIANTS[pc.variant].name + ' ' : '') + pc.sp.name, 0, ch / 2 - 13 * s);
        ctx.restore();
      }
    }
    // a second row inside the sub: what is still in the bag outside the tank
    ctx.textBaseline = 'top';
  }

  // (5.1.1) A touch screen's hands, bottom right: one big button for the main action (swing the net, take the picture,
  // set a trap; in the sub, the claw), and round action buttons in a fixed arc round its upper left (observe or
  // whatever F does here, call the sub, the lamp, the lure, the glow stick, the pet; in the sub: leave, the tank room,
  // the autopilot, the trawl, the spare air, sell, the lamp). Each keeps its place: one that can't be used now is
  // greyed, never moved or hidden, so nothing jumps about. A picture and a word on each; no key letters.
  drawActions(g, W, H, s, dt, aboard) {
    const ctx = this.ctx, P = g.profile, e = g.earl, kx = window.innerWidth / this.c.width;
    const hot = (x, y, w, h, key) => this.hots.push({ x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, w: w * kx, h: h * kx, key });
    // (5.3) sized from the finger, not the screen: CSS pixels (about 0.18 mm each on a phone). The main button about
    // 2 cm across, the others about 1.4 cm, never below Apple's 44 pt
    const u = this.c.width / window.innerWidth * (window.__fingerK || 1), pad = 16 * u, R = 36 * u, cx = W - pad - R, cy = H - pad - R; // (5.3.1) small: about 1.3 cm
    const held = this.held || new Set();
    const parts = g.prompt && !g.tutHidePrompts ? parsePrompt(g.prompt) : [], partOf = (k) => parts.find((p) => p.key && p.key.toLowerCase() === k);
    const short = (t) => { const w = String(t).split(/\s+/).filter((x) => !/^(the|a|an|to|of)$/i.test(x)).map((x) => ({ submersible: 'sub' }[x.toLowerCase()] || x)); const out = w.slice(0, 2).join(' '); return out.length > 13 ? w[0] : out; };
    // (5.3.1) a button is a dark translucent disc with a thin light rim (as a phone game's), a real picture on it
    const plate = (x, y, r, on, down) => {
      ctx.fillStyle = down ? 'rgba(8,12,14,0.62)' : 'rgba(8,12,14,0.42)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = down ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.2 * u; ctx.stroke();
    };
    const pic = (name, x, y, w) => { const im = hudIcon('act-' + name); if (im) ctx.drawImage(im, x - w / 2, y - w / 2, w, w); };
    // the pictures on the buttons: plain shapes in the deck's cream paint
    const NAME = { eye: 'eye', hand: 'hand', leave: 'leave', sub: 'sub', lamp: 'lamp', lure: 'lure', glow: 'glow', pet: 'pet', tank: 'tank', trawl: 'trawl', air: 'air', sell: 'sell', auto: 'auto', pause: 'pause', bag: 'bag' };
    const glyph = (kind, x, y, r) => drawGlyph(ctx, kind, x, y, r * 2.35); // (5.3.3) one set of bold white symbols (glyphs.js)
    const glyph1 = (kind, x, y, r, col) => {
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const k = r / 22;
      ctx.scale(k, k); ctx.lineWidth = 2.6;
      const P0 = () => ctx.beginPath();
      if (kind === 'eye') { P0(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(0, -10, 11, 0); ctx.quadraticCurveTo(0, 10, -11, 0); ctx.stroke(); P0(); ctx.arc(0, 0, 3.6, 0, TAU); ctx.fill(); }
      else if (kind === 'hand') { P0(); ctx.moveTo(-8, 0); ctx.lineTo(6, 0); ctx.moveTo(1, -5); ctx.lineTo(7, 0); ctx.lineTo(1, 5); ctx.stroke(); P0(); ctx.moveTo(9, -9); ctx.lineTo(9, 9); ctx.stroke(); }
      else if (kind === 'leave') { P0(); ctx.moveTo(0, 8); ctx.lineTo(0, -7); ctx.moveTo(-5, -2); ctx.lineTo(0, -8); ctx.lineTo(5, -2); ctx.stroke(); P0(); ctx.moveTo(-9, 10); ctx.lineTo(9, 10); ctx.stroke(); }
      else if (kind === 'sub') { P0(); ctx.ellipse(0, 2, 11, 5, 0, 0, TAU); ctx.stroke(); P0(); ctx.rect(-3, -6, 6, 4); ctx.stroke(); }
      else if (kind === 'lamp') { P0(); ctx.arc(-3, 0, 4.5, 0, TAU); ctx.stroke(); for (const a of [-0.45, 0, 0.45]) { P0(); ctx.moveTo(4 + Math.cos(a) * 1, Math.sin(a) * 4); ctx.lineTo(4 + Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); } }
      else if (kind === 'lure') { P0(); ctx.moveTo(-8, 8); ctx.quadraticCurveTo(-8, -6, 3, -5); ctx.stroke(); P0(); ctx.arc(5, -4, 4, 0, TAU); ctx.fill(); }
      else if (kind === 'glow') { P0(); ctx.roundRect(-3, -10, 6, 20, 3); ctx.stroke(); P0(); ctx.rect(-1.2, -6, 2.4, 12); ctx.fill(); }
      else if (kind === 'pet') { P0(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-2, -7, 6, 0); ctx.quadraticCurveTo(-2, 7, -9, 0); ctx.stroke(); P0(); ctx.moveTo(6, 0); ctx.lineTo(11, -5); ctx.lineTo(11, 5); ctx.closePath(); ctx.stroke(); }
      else if (kind === 'tank') { P0(); ctx.rect(-10, -7, 20, 14); ctx.stroke(); P0(); ctx.moveTo(-10, -1); ctx.quadraticCurveTo(-5, -4, 0, -1); ctx.quadraticCurveTo(5, 2, 10, -1); ctx.stroke(); }
      else if (kind === 'trawl') { P0(); ctx.moveTo(-10, -7); ctx.lineTo(10, -2); ctx.lineTo(10, 2); ctx.lineTo(-10, 7); ctx.closePath(); ctx.stroke(); P0(); ctx.moveTo(-4, -5); ctx.lineTo(-4, 5); ctx.moveTo(3, -3); ctx.lineTo(3, 3); ctx.stroke(); }
      else if (kind === 'air') { P0(); ctx.roundRect(-5, -8, 10, 18, 4); ctx.stroke(); P0(); ctx.rect(-2, -11, 4, 3); ctx.fill(); }
      else if (kind === 'sell') { P0(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke(); ctx.font = `700 13px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 0, 1); }
      else if (kind === 'pause') { P0(); ctx.rect(-6, -8, 4, 16); ctx.rect(2, -8, 4, 16); ctx.fill(); }
      else if (kind === 'bag') { P0(); ctx.moveTo(-9, -3); ctx.lineTo(9, -3); ctx.lineTo(7, 10); ctx.lineTo(-7, 10); ctx.closePath(); ctx.stroke(); P0(); ctx.arc(0, -3, 5, Math.PI, 0); ctx.stroke(); P0(); ctx.moveTo(-3, 2); ctx.lineTo(3, 8); ctx.moveTo(3, 2); ctx.lineTo(-3, 8); ctx.stroke(); }
      else if (kind === 'auto') { P0(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke(); P0(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke(); }
      ctx.restore();
    };
    // ---- the actions, in fixed places ----
    const F = partOf('f'), ap = g.autopilot, sub = g.sub;
    const subLabel = e.inSub ? (g.homeRun ? 'Autopilot off' : 'Autopilot') : (ap && ap.state === 'coming' ? 'Stop sub' : 'Call sub');
    // the near ring: the three things done most (always there, greyed when they can't be done); the top row: the
    // rarer ones, small, beside pause and the bag
    const A = e.inSub ? [
      { key: 'f', icon: 'leave', on: !!F, bar: true, why: 'Nothing to do here' },
      { key: 't', icon: 'tank', on: true },
      { key: 'c', icon: 'auto', on: !sub.imploded && !sub.docked && !g.tutHidePrompts, lit: g.homeRun, why: 'She is at the boat' },
    ] : [
      { key: 'f', icon: F && /observe/i.test(F.label) ? 'eye' : 'hand', on: !!F, bar: true, why: 'Nothing here: swim up to something' },
      { key: 'c', icon: 'sub', on: !sub.imploded && !g.tutHidePrompts && !aboard, lit: ap && ap.state === 'coming', why: sub.imploded ? 'The sub is lost' : 'Not from the boat' },
      { key: 'l', icon: 'lamp', on: !aboard, lit: !!e.lampOn, why: 'Not on deck' },
    ];
    const TOP = [{ key: 'escape', icon: 'pause', on: true }, { key: 'b', icon: 'bag', on: true }].concat(e.inSub ? [
      { key: 'n', icon: 'trawl', on: !!g.subNet || netKinds(g.items).length > 0, lit: !!g.subNet, why: 'No trawl net: the boat sells them' },
      { key: 'r', icon: 'air', on: (g.items.airTank || 0) > 0, n: g.items.airTank, why: 'No spare air tank: the boat sells them' },
      { key: 'u', icon: 'sell', on: !!partOf('u'), why: 'Bring her alongside the boat to sell' },
      { key: 'l', icon: 'lamp', on: true, lit: !!e.lampOn },
    ] : aboard ? [] : [
      { key: 'q', icon: 'lure', on: (g.items.lure || 0) > 0, n: g.items.lure, why: 'No lure: the station and Dave sell them' },
      { key: 'e', icon: 'glow', on: (g.items.necklace || 0) > 0, n: g.items.necklace, lit: g.necklaceOn, why: 'No glow stick: the boat sells them' },
      { key: 'h', icon: 'pet', on: !!P.pet, lit: P.pet && P.petStay, why: 'No pet: at the surface, drag a big fish into the pet slot' },
    ]);
    const btn = (a, x, y, r) => {
      const down = held.has(a.key);
      ctx.save();
      plate(x, y, r, a.on, down); ctx.globalAlpha = a.on ? 1 : 0.35;
      if (a.lit) { ctx.strokeStyle = 'rgba(255,214,140,0.9)'; ctx.lineWidth = 2.5 * u; ctx.shadowColor = 'rgba(255,200,120,0.8)'; ctx.shadowBlur = 8 * u; ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0; }
      glyph(a.icon, x, y + (down ? 1.5 * u : 0), r * 0.4);
      if (a.n > 1) { ctx.font = `700 ${12 * u}px ${HUDT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ece6d2'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3 * u; ctx.fillText(String(a.n), x + r * 0.72, y - r * 0.72); }
      if (a.bar && g.promptBar != null && a.on) { ctx.strokeStyle = 'rgba(244,246,240,0.95)'; ctx.lineWidth = 3.5 * u; ctx.beginPath(); ctx.arc(x, y, r * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(g.promptBar, 0, 1)); ctx.stroke(); }
      ctx.restore();
      hot(x - r, y - r, r * 2, r * 2, a.on ? a.key : 'msg:' + (a.why || 'Not now'));
    };
    const r = 24 * u, gap = 14 * u, rho0 = R + r + gap;
    A.forEach((a, i) => { const ang = [-92, -146, -200][i] * Math.PI / 180; btn(a, cx + Math.cos(ang) * rho0, cy + Math.sin(ang) * rho0, r); });
    // (5.3.4) a column under the clipboard, clear of the quest's words; (5.4) it turns into a second column before it
    // would reach the stick's ring in the lower left (the sub has six of them)
    const r2 = 18 * u, step = r2 * 2 + 7 * u, fk = window.__fingerK || 1;
    const sR = Math.max(40, Math.min(52, window.innerHeight / fk * 0.12)) * fk, stickTop = (window.innerHeight - 2 * sR - 28 * fk) / kx - this.safeT;
    // the column starts under the clipboard group's second row (the journal, laid out even while folded), read from
    // the page once a second, so the opened group never lies over the pause button
    const nowMs = performance.now();
    if (!this.qhAt || nowMs - this.qhAt > 1000) { this.qhAt = nowMs; const j = document.getElementById('hud-journal'), r = j && j.getBoundingClientRect(); this.qhBottom = r && r.height ? r.bottom : 0; }
    const top0 = Math.max(84 * u, this.qhBottom ? this.qhBottom / kx - this.safeT + 8 * u : 0);
    const rows = Math.max(2, Math.floor((stickTop - top0 - 6 * u) / step));
    TOP.forEach((a, i) => btn(a, 44 * u + Math.floor(i / rows) * step, top0 + r2 + (i % rows) * step, r2));
    const rho1 = rho0;
    // ---- the big button: the main action ----
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    const armT = e.inSub && owns(P, 'arm');
    const can = aboard ? false : e.inSub ? !!(armT && g.capPrompt && g.capPrompt.startsWith('Space')) : sel === 'net' ? !!g.catchTarget : !!(g.capPrompt && /^Space/.test(g.capPrompt));
    ctx.save(); ctx.globalAlpha = aboard || (e.inSub && !armT) || !sel && !e.inSub ? 0.42 : can ? 1 : 0.7; // (5.3.6) on deck: there, greyed
    const bdown = held.has(' ');
    plate(cx, cy, R, can, bdown);
    if (can) { const q = 0.5 + 0.5 * Math.sin(g.time * 4); ctx.strokeStyle = `rgba(244,242,234,${(0.35 + 0.45 * q).toFixed(3)})`; ctx.lineWidth = 2.5 * u; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * u, 0, TAU); ctx.stroke(); }
    // (5.3.3) the main action's symbol: the net, the camera, a trap; in the sub, the claw. The ring pulses when it can reach
    if (e.inSub) drawGlyph(ctx, 'claw', cx, cy + (bdown ? 2 * u : 0), R * 1.1);
    else drawGlyph(ctx, sel || 'net', cx, cy + (bdown ? 2 * u : 0), R * 1.1); // (5.3.6) never an empty button
    const prog = g.photo ? g.photo.t / g.photo.dur : g.capture && g.capture.dur ? g.capture.t / g.capture.dur : 0;
    if (prog > 0) { ctx.strokeStyle = 'rgba(244,246,240,0.95)'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(cx, cy, R - 1.5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(prog, 0, 1)); ctx.stroke(); }
    ctx.restore();
    // what it would go for: its name above the button, in its rarity's colour
    const nm = this.capWant && this.capWant[0] ? parsePrompt(this.capWant[0]).map((p) => p.label).join(' ') : '';
    if (nm && can) { ctx.save(); ctx.font = `600 ${16 * u}px ${HUDF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = this.capWant[1] || '#ece6d2'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5 * s; ctx.textBaseline = 'middle'; ctx.fillText(nm, cx - rho1 - r - 14 * u, cy + R * 0.3); ctx.restore(); }
    hot(cx - R, cy - R, R * 2, R * 2, aboard ? 'msg:Jump in first: walk off the end of the deck' : e.inSub && !armT ? 'msg:This sub has no arm: the yard fits one' : !sel ? 'msg:Nothing in hand: pick the net in the bag' : ' ');
  }

  // A strip of sonar: the seabed profile 80 m each side of the sub, scaled to fit, with the sub at the
  // top and a sounding straight down. Refreshed with each ping (twice a second), not every frame.
  drawSonar(ctx, g, rx0, y0, s) {
    const w = 150 * s, h = 70 * s, x0 = rx0 - w, sub = g.sub, W = g.world, now = g.time;
    const P = this.sonarP;
    if (!P || now - P.t > 0.5 || Math.abs(P.x - sub.x) > 4 || Math.abs(P.y - sub.y) > 4) {
      const xs = [], N = 64;
      for (let i = 0; i <= N; i++) { const x = sub.x - 80 + 160 * i / N; xs.push(W.floorAt(Math.max(0, Math.min(4999, x)))); }
      this.sonarP = { t: now, x: sub.x, y: sub.y, fl: xs, below: W.floorAt(sub.x) - sub.y };
    }
    const S = this.sonarP, top = sub.y - 8, span = Math.max(40, Math.min(1500, Math.max(...S.fl) - top + 10));
    const Y = (d) => y0 + 12 * s + (d - top) / span * (h - 14 * s);
    ctx.save();
    // (olive) the trace behind glass set into a raised olive plate, as the other instruments
    oliveNine(ctx, 'btn-olive', x0 - 6 * s, y0 - 6 * s, w + 12 * s, h + 12 * s, 28, 10 * s);
    ctx.fillStyle = 'rgba(4,16,13,0.92)'; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 3 * s); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 5 * s); ctx.clip();
    // the seabed: a filled profile, brighter along its edge where the echo comes back
    ctx.beginPath(); ctx.moveTo(x0, y0 + h);
    S.fl.forEach((d, i) => ctx.lineTo(x0 + w * i / (S.fl.length - 1), Y(d)));
    ctx.lineTo(x0 + w, y0 + h); ctx.closePath();
    ctx.fillStyle = 'rgba(60,170,120,0.22)'; ctx.fill();
    ctx.strokeStyle = 'rgba(110,230,170,0.75)'; ctx.lineWidth = 1.2 * s; ctx.beginPath();
    S.fl.forEach((d, i) => { const x = x0 + w * i / (S.fl.length - 1), y = Y(d); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    // the ping: a ring going out from the sub, fading
    const ph = ((now % 0.5) / 0.5), sx = x0 + w / 2, sy = Y(sub.y);
    ctx.strokeStyle = `rgba(110,230,170,${(0.35 * (1 - ph)).toFixed(3)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(sx, sy, ph * w * 0.6, 0, Math.PI); ctx.stroke();
    // the sounding straight down, and the sub
    const by = Y(sub.y + S.below);
    ctx.setLineDash([3 * s, 3 * s]); ctx.strokeStyle = 'rgba(216,236,230,0.5)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8d8a8'; ctx.beginPath(); ctx.ellipse(sx, sy, 4 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = `600 ${13 * s}px ${HUDF}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(150,220,180,0.85)';
    ctx.textBaseline = 'bottom'; ctx.fillText(`bottom ${Math.max(0, Math.round(S.below))} m below`, x0 + 5 * s, y0 + h - 3 * s); ctx.textBaseline = 'top'; // (olive: in the reading face, low, clear of the sub's mark)
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(150,220,180,0.6)';
    ctx.fillText(`${Math.round(sub.y + S.below)} m`, x0 + w - 5 * s, y0 + 3 * s);
    ctx.restore();
  }

  // (4.0.0) a prompt's text fading in, and the one it replaced fading out; level: how much is showing
  fadeText(slot, text, col) {
    const st = (this.fadeState || (this.fadeState = {}))[slot] || (this.fadeState[slot] = { items: [], t: performance.now() });
    const now = performance.now(), dt = Math.min(0.1, (now - st.t) / 1000); st.t = now;
    if (text && !st.items.some((q) => q.text === text && q.on)) {
      for (const q of st.items) q.on = false;
      const back = st.items.find((q) => q.text === text); // (4.2.1) the same words coming back while they fade: they come back, not a second copy
      if (back) back.on = true; else st.items.push({ text, col, a: 0, on: true });
    }
    if (!text) for (const q of st.items) q.on = false;
    for (const q of st.items) { if (q.on) q.col = col || q.col; q.a = q.on ? Math.min(1, q.a + dt / 0.16) : Math.max(0, q.a - dt / 0.2); }
    st.items = st.items.filter((q) => q.on || q.a > 0.01).slice(-3);
    return { list: st.items.map((q) => [q.text, q.a, q.col]), level: st.items.reduce((m, q) => Math.max(m, q.a), 0) };
  }
  // (4.17.0) the HUD is drawn inside the screen's safe area (clear of a phone's notch and rounded corners)
  draw(g, dt) {
    const sf = this.safe || { l: 0, r: 0, t: 0, b: 0 }; this.safeL = sf.l; this.safeT = sf.t;
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
    this.ctx.save(); this.ctx.translate(sf.l, sf.t);
    try { this.drawIn(g, dt, this.c.width - sf.l - sf.r, this.c.height - sf.t - sf.b); } finally { this.ctx.restore(); }
  }
  drawIn(g, dt, W, H) {
    const touch = !!this.touch, ctx = this.ctx, s = this.s; this.hudNotes = []; this.hots = []; window.__hudHots = this.hots; // (5.4) for the tutorial's pointing on touch (5.3.1) the HUD keeps its size on a phone: only the controls are added
    if (g.mode === 'menu') return;
    const e = g.earl, fx = g.fx;
    const dying = g.mode === 'dying';
    if (g.holdCursor) { // (4.12.3) the weighted pointer during a long hold: a brass ring, trailing the real one
      const k = W / window.innerWidth, hx = g.holdCursor.x * k, hy = g.holdCursor.y * k, r = 9 * s;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4 * s; ctx.strokeStyle = 'rgba(230,222,196,0.9)'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(230,222,196,0.9)'; ctx.beginPath(); ctx.arc(hx, hy, 2 * s, 0, TAU); ctx.fill(); ctx.restore();
    }
    const red = dying || false;
    const aboard = !!g.aboard && !dying; // on the Margaret's deck or in her cabin: only cash, the prompt and the contracts

    // ---------- (4.27) the instruments ----------
    // Top right, one instrument on one plate: the depth large in a dark window and under it the air (and in the sub
    // the hull), each a painted icon and a wide tube; what it has to say written under it. Bottom right, the radar,
    // large, the sub's button beside it and the things he carries stacked above it. The journal and the chart are
    // pictures under the quest board at the left (HTML, #quests-hud).
    const pad = 26 * s;
    ctx.textBaseline = 'top'; ctx.textAlign = 'right';
    const rx0 = W - pad, CW = 212 * s, cx0 = rx0 - CW, ccx = cx0 + CW / 2;
    this.colX = ccx; this.journalHot = null; this.chartHot = null;
    const kx = window.innerWidth / this.c.width;
    const notes = []; // [text, colour]
    let yy = pad;
    if (!aboard) {
    const onTank = e.inSub && g.sub.o2 <= 0; // an empty cabin: the gauge shows his own tank
    const o2 = e.inSub && !onTank ? g.sub.o2 / g.sub.o2Max : e.o2 / e.o2Max;
    if (!dying) {
      // (4.28) no plate: the depth as bare figures, a dive computer's readout, and the air (in the sub, the hull) as
      // thin lines under it. It cools and dims as he goes down: bright in the sunlit water, a faint cold grey in the
      // dark, and it flickers when he is past what he (or the sub) is built for. Red only for danger.
      const warnD = e.inSub ? g.sub.y / g.sub.rated > 0.9 : e.y > (e.pressStart || 300);
      const past = e.inSub ? g.sub.y > g.sub.rated : e.y > (e.pressStart || 300) * 1.6;
      const dm = clamp((e.y - 120) / 1400, 0, 1), lit = 1 - dm * 0.42;
      const fl = past && Math.random() < 0.06 ? 0.35 : 1;
      const cr = Math.round(lerp(239, 170, dm)), cg = Math.round(lerp(232, 192, dm)), cb = Math.round(lerp(212, 204, dm));
      const ink = (a) => warnD ? `rgba(240,84,72,${(a * fl).toFixed(3)})` : `rgba(${cr},${cg},${cb},${(a * lit * fl).toFixed(3)})`;
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'right'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8 * s; ctx.shadowOffsetY = 1;
      const base = pad + 44 * s;
      ctx.font = `600 ${24 * s}px ${HUDT}`; ctx.fillStyle = ink(0.7); ctx.fillText('m', rx0, base);
      ctx.font = `600 ${58 * s}px ${HUDT}`; ctx.fillStyle = ink(1); ctx.fillText(String(Math.round(Math.max(0, e.y))), rx0 - 24 * s, base);
      ctx.restore(); ctx.textBaseline = 'top'; ctx.textAlign = 'right';
      // a thin line with its painted icon at the left
      // (5.0) a short line with its mark in the same letters as the depth: O2 for his air, HULL for the sub's
      const lineW = 132 * s, lx = rx0 - lineW, lh = 6 * s;
      const line = (name, y, frac, col, pulse = 1) => {
        ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4 * s;
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.8 * lit).toFixed(3)})`;
        if (name === 'air') { ctx.font = `600 ${15 * s}px ${HUDT}`; const sw2 = ctx.measureText('2').width * 0.7; ctx.fillText('O', lx - 8 * s - sw2 - 1 * s, y + lh / 2 + 1 * s); ctx.font = `600 ${10 * s}px ${HUDT}`; ctx.fillText('2', lx - 8 * s, y + lh / 2 + 5 * s); }
        else { ctx.font = `600 ${12 * s}px ${HUDT}`; ctx.fillText('HULL', lx - 8 * s, y + lh / 2 + 1 * s); }
        ctx.restore();
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(lx, y, lineW, lh, lh / 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${(0.14 * lit).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = lit * pulse; ctx.fillStyle = `rgb(${col.join(',')})`; ctx.shadowColor = `rgba(${col.join(',')},0.6)`; ctx.shadowBlur = 6 * s;
        ctx.beginPath(); ctx.roundRect(lx + 1, y + 1, Math.max(lh - 2, (lineW - 2) * clamp(frac, 0, 1)), lh - 2, (lh - 2) / 2); ctx.fill(); ctx.restore();
      };
      const oc = o2 > 0.25 ? [96, 172, 226] : [226, 66, 52]; // (5.0) blue, then red: no orange
      const ay = base + 16 * s;
      line('air', ay, o2, oc, o2 < 0.1 || g.noAir ? 0.55 + 0.45 * Math.sin(g.time * 10) : 1);
      if (e.inSub) { const hi = clamp(g.sub.hull, 0, 1); line('hull', ay + 22 * s, hi, hi < 0.5 ? [226, 66, 52] : [130, 196, 164]); }
      yy = ay + (e.inSub ? 22 * s : 0) + lh + 18 * s;
      if ((g.loadKg || 0) > 10 && !e.inSub) notes.push([`Heavy: ${Math.round(g.loadKg)} kg`, '#f06a5c']);
      const py = pad - 8 * s;
      // hidden: a small leaf at the plate's left
      if (g.concealed) {
        const icx = cx0 - 16 * s, icy = py + 22 * s;
        ctx.fillStyle = 'rgba(150,200,170,0.9)';
        ctx.beginPath(); ctx.moveTo(icx - 7 * s, icy + 5 * s); ctx.quadraticCurveTo(icx - 6 * s, icy - 7 * s, icx + 7 * s, icy - 6 * s); ctx.quadraticCurveTo(icx + 5 * s, icy + 5 * s, icx - 7 * s, icy + 5 * s); ctx.fill();
      }
    }
    const left = e.inSub && !onTank ? g.sub.o2 / Math.max(0.0001, g.subDrain) : e.o2 / Math.max(0.0001, g.diverDrain);
    const sec = Math.max(0, Math.floor(left));
    const flash = (a, b2) => (Math.sin(g.time * 8) > 0 ? a : b2);
    if (g.noAir && !e.atSurface) { /* (4.28) the message line says it; not twice */ }
    else if (!e.atSurface && o2 < 0.25) notes.push([sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s of air` : `${sec} s of air`, '#f06a5c']);
    // (4.28) no pressure multiplier: the air line draining faster says it
    if (e.inSub) {
      const r = g.sub.y / g.sub.rated, hi = clamp(g.sub.hull, 0, 1);
      if (g.sub.failing != null) notes.push(['Hull failing!', flash('#ff4a3a', '#a02a20')]);
      else if (r > 0.9) notes.push([`Near her ${g.sub.rated} m`, '#f06a5c']);
      else if (hi < 0.99) notes.push(['Hull leaking', '#f06a5c']);
    }
    const ap = g.autopilot;
    if (ap && e.inSub && g.homeRun) notes.push(['Autopilot home', '#e6dec4']);
    if (ap && !e.inSub && !g.sub.imploded && (ap.active || ap.state === 'waiting')) {
      const dsub = Math.hypot(g.sub.x - e.x, g.sub.y - e.y);
      let txt;
      if (ap.state === 'home') txt = `Sub going home`;
      else if (ap.holding && ap.remaining < 3) txt = `Sub holding at ${Math.round(g.sub.y)} m`;
      else if (ap.state === 'waiting') txt = `Sub ${Math.round(dsub)} m away`;
      else txt = `Sub coming, ${Math.ceil(ap.eta || 0)} s`;
      notes.push([txt, ap.holding ? '#f06a5c' : '#e6dec4']);
    }
    // the seafloor sonar (a fitted extra): under the instrument, the bottom below and around the sub, 160 m across
    if (e.inSub && g.addons && g.addons.sonar && !dying && !g.sub.imploded) { this.drawSonar(ctx, g, rx0, yy + 4 * s, s); yy += 88 * s; }
    // (5.1.1) on a touch screen the radar sits under the instrument; the bottom right is the actions'
    const rrT = 44 * s, rcyT = yy + 6 * s + rrT;
    if (touch) yy = rcyT + rrT + 16 * s;
    // ---------- the words: under the instrument, centred on it ----------
    {
      let ny = yy;
      ctx.save(); ctx.font = `600 ${19 * s}px ${HUDF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 5 * s; ctx.shadowOffsetY = 1;
      for (const [t, c] of notes) { ctx.fillStyle = c; ctx.fillText(t, ccx, ny); ny += 24 * s; }
      ctx.restore();
    }
    // ---------- the radar: large, in the bottom right corner ----------
    const rr = touch ? rrT : 64 * s, rcx = rx0 - rr, rcy = touch ? rcyT : H - pad - rr;
    ctx.save();
    ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.fillStyle = 'rgba(4,20,16,0.6)'; ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(80,200,150,0.15)'; ctx.lineWidth = 1;
    for (const k of [0.5, 1]) { ctx.beginPath(); ctx.arc(rcx, rcy, rr * k, 0, TAU); ctx.stroke(); }
    this.sweep = (this.sweep + dt * 1.6) % TAU;
    const sg = ctx.createConicGradient ? ctx.createConicGradient(this.sweep - 0.9, rcx, rcy) : null;
    if (sg) { sg.addColorStop(0, 'rgba(80,220,160,0)'); sg.addColorStop(0.14, 'rgba(80,220,160,0.22)'); sg.addColorStop(0.145, 'rgba(80,220,160,0)'); ctx.fillStyle = sg; ctx.fillRect(rcx - rr, rcy - rr, rr * 2, rr * 2); }
    // his traps: small amber marks where their lines are
    for (const tr of g.traps || []) {
      const dx = tr.x - e.x, dy = tr.y - e.y, d = Math.hypot(dx, dy);
      if (d > 200) continue;
      const k = rr * Math.min(1, d / 200);
      ctx.fillStyle = 'rgba(240,190,90,0.9)'; ctx.beginPath(); ctx.arc(rcx + dx / (d || 1) * k, rcy + dy / (d || 1) * k, 2 * s, 0, TAU); ctx.fill();
    }
    const ent = g.entity;
    if (ent && ent.dist < 200 && !dying) {
      const a = Math.atan2(ent.y - e.y, ent.x - e.x);
      const da = ((this.sweep - a) % TAU + TAU) % TAU;
      if (da < dt * 1.7 + 0.001) { this.blip = { a, d: ent.dist, life: 1 }; g.audio && g.audio.sonar(0.03 + fx.dread * 0.04); }
    }
    if (this.blip) {
      this.blip.life -= dt * 0.45;
      if (this.blip.life <= 0) this.blip = null;
      else {
        const r = (this.blip.d / 200) * rr;
        const bxp = rcx + Math.cos(this.blip.a) * r, byp = rcy + Math.sin(this.blip.a) * r;
        const bg2 = ctx.createRadialGradient(bxp, byp, 0, bxp, byp, 6 * s);
        bg2.addColorStop(0, `rgba(255,90,70,${this.blip.life})`); bg2.addColorStop(1, 'rgba(255,90,70,0)');
        ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bxp, byp, 6 * s, 0, TAU); ctx.fill();
      }
    }
    // the sapphire eye: sapphires within 150 m are blue points
    if (g.profile && g.profile.eye && !dying) {
      for (const p of g.world.pickups) {
        if (p.taken || p.type !== 'sapphire') continue;
        const ds = Math.hypot(p.x - e.x, p.y - e.y);
        if (ds > 150) continue;
        const as = Math.atan2(p.y - e.y, p.x - e.x), k = ds / 200;
        ctx.fillStyle = `rgba(110,150,255,${(0.6 + 0.3 * Math.sin(g.time * 3 + p.phase)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(rcx + Math.cos(as) * k * rr, rcy + Math.sin(as) * k * rr, 2 * s, 0, TAU); ctx.fill();
      }
    }
    // the sub's transponder: a steady pale square inside 200 m, a tick on the rim beyond
    if (!e.inSub && !g.sub.imploded && !dying) {
      const ds = Math.hypot(g.sub.x - e.x, g.sub.y - e.y), as = Math.atan2(g.sub.y - e.y, g.sub.x - e.x);
      const k = Math.min(1, ds / 200) * (ds > 200 ? 0.92 : 1);
      const sxp = rcx + Math.cos(as) * k * rr, syp = rcy + Math.sin(as) * k * rr;
      const on = ap && ap.active ? 0.55 + 0.45 * Math.sin(g.time * 5) : 0.75;
      ctx.fillStyle = `rgba(240,220,160,${on.toFixed(3)})`;
      const q = (ds > 200 ? 1.6 : 2.2) * s;
      ctx.fillRect(sxp - q, syp - q, q * 2, q * 2);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(216,236,230,0.8)'; ctx.beginPath(); ctx.arc(rcx, rcy, 1.6 * s, 0, TAU); ctx.fill();
    brassBezel(ctx, rcx, rcy, rr, s);
    const slotBase = rcy - rr - 20 * s; // the carried things stack upward from here
    // ---------- the sub: a button for C (call it to you, or the autopilot home) ----------
    this.subHot = null;
    if (!touch && !g.sub.imploded && !dying && !g.tutHidePrompts) { // (4.4.0) not during the tutorial (5.1.1: on touch, an action button)
      const ap = g.autopilot;
      const label = e.inSub ? (g.homeRun ? 'autopilot off' : g.sub.docked ? null : 'autopilot home') : (ap && ap.state === 'coming' ? 'stop sub' : 'call sub');
      if (label) {
        // bottom-right corner, a little larger
        const word = label.charAt(0).toUpperCase() + label.slice(1);
        ctx.font = `600 ${19 * s}px ${HUDF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(word).width, bw = tw + 40 * s, bh = 31 * s, bx = rcx - rr - 18 * s - bw, by = H - pad - bh;
        this.subHot = { x: (bx + this.safeL) * kx, y: (by + this.safeT) * kx, w: bw * kx, h: bh * kx };
        const on = g.homeRun || (ap && ap.state === 'coming');
        promptShade(ctx, bx + bw / 2, by + bh / 2, s * 0.45);
        keyCap(ctx, bx, by + 2 * s, 'C', s);
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 1;
        ctx.fillStyle = '#efe8d2'; ctx.fillText(word, bx + 38 * s, by + bh / 2 + 1 * s);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.textBaseline = 'top';
      }
    }

    // ---------- Q / E items: in the right-hand column, only when carried ----------
    // (claude-polish) a small steel plate in a brass rim, as the journal and chart buttons
    // (olive) the item slots: the same raised olive plate and well as the hotbar
    const glass = (x, y, w, h) => { if (!oliveNine(ctx, 'btn-olive', x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s, 28, 10 * s)) { ctx.fillStyle = 'rgba(44,48,42,0.9)'; ctx.fillRect(x, y, w, h); } oliveNine(ctx, 'well', x + 4 * s, y + 4 * s, w - 8 * s, h - 8 * s, 30, 6 * s); };
    const sz = 46 * s;
    const slots = [];
    if (g.items.lure > 0 || g.lure) slots.push(['q', 'Q', 'LURE', g.items.lure, '#bfeaff', g.lure ? g.entity.lureT / 10 : 0]);
    if (e.inSub && (g.items.airTank > 0 || g.tankFit)) slots.push(['r', 'R', 'AIR TANK', g.items.airTank, '#9fd4ff', g.tankFit ? g.tankFit / 3 : 0]);
    if (g.items.necklace > 0 || g.necklaceOn) slots.push(['e', 'E', g.necklaceOn ? `GLOW ${Math.ceil(g.glowT || 0)} S` : 'GLOW STICK', g.items.necklace, '#ffc070', g.necklaceOn ? 1 : 0]);
    // the sub's trawl net (N): which net is in the hatch, and while it is out, how long it has been towing
    if (e.inSub) {
      const n = g.subNet, kinds = netKinds(g.items), N = n ? n.T : kinds.length ? NETS_SUB[kinds[0]] : null; // (4.11.0) every kind in the hatch
      const state = n ? (n.phase === 'tow' ? (g.trawlTaught ? 'OUT' : 'OUT, N CLOSES') : n.phase === 'torn' ? 'TORN' : 'HAULING') : kinds.length ? kinds.map((k) => NETS_SUB[k].short).join(' + ') : 'NO NET';
      if (n || N) slots.push(['n', 'N', state, n || N ? 1 : 0, n ? '#e8b070' : kinds.includes('adv') ? '#f0c060' : '#e8b070', n && n.phase === 'tow' ? Math.min(1, n.pt / (n.T.tow || TOW_MAX)) : 0, n ? 0 : netsOf(g.items).basic]); // (the badge: two beginner nets)
    }
    this.slotHot = {}; this.itemSlots = slots;
    if (!touch) slots.forEach(([id, key, name, n, col, active, badge], i) => {
      const x = rx0 - sz, y = slotBase - (i + 1) * (sz + 10 * s) + 10 * s;
      this.slotHot[id] = { x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, w: sz * kx, h: sz * kx };
      glass(x, y, sz, sz);
      ctx.fillStyle = col; ctx.globalAlpha = n > 0 ? 1 : 0.3;
      ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.52, 8 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (active > 0) { ctx.strokeStyle = col; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.52, 13 * s, -Math.PI / 2, -Math.PI / 2 + TAU * active); ctx.stroke(); }
      ctx.font = `500 ${10 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6'; ctx.textAlign = 'left'; if (!(id === 'n' && g.trawlTaught)) keyCap(ctx, x - 6 * s, y - 6 * s, key, s * 0.62); // (4.0.6) N, once learned, is not shown
      ctx.textAlign = 'right'; if (id !== 'n') ctx.fillText(`×${n}`, x + sz - 5 * s, y + 4 * s);
      if (badge > 1) { // (4.11.0) how many nets are in the hatch: a number in a small brass circle at the corner
        const bw = 22 * s, bh = 14 * s, bx = x + sz - bw + 6 * s, by = y - 5 * s; // (4.11.1) a wider pill: ×2
        ctx.fillStyle = '#d8d0b6'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3 * s); ctx.fill(); ctx.strokeStyle = 'rgba(20,18,12,0.85)'; ctx.lineWidth = 1; ctx.stroke(); // (olive) cream, as the keys
        ctx.save(); ctx.fillStyle = '#26241a'; ctx.font = `600 ${10 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`×${badge}`, bx + bw / 2, by + bh / 2 + 0.5 * s); ctx.restore();
      }
      dymo(ctx, name.toLowerCase(), x - 9 * s, y + sz / 2 - 6 * s, s, { tape: name === 'NO NET' || name === 'TORN' ? '#4a1810' : '#1c1d1b' });
    });
    }
    // (4.28) no cash on the HUD: it cannot change under water. It is in the inventory, the journal and the shops.

    if (!aboard) {
    // ---------- tools and specimens, bottom centre ----------
    if (g.profile && g.mode === 'play' && !dying) this.drawGear(g, W, H, s, dt);

    // ---------- marked: a symbol, the red eye, bottom left ----------
    // each good deed fades it a step
    if (g.entity && g.entity.marked && !dying) {
      const calm = clamp((g.entity.calm || 0) / 60, 0, 1);
      const a = 1 - calm * 0.65;
      // (4.28) a real eye in the dark, not a sign: a wet dark lid line, an iris of deep amber going to blood red with
      // fibres in it, a slit that breathes, a point of light on the cornea; it opens slowly and blinks now and then
      const ex = touch ? W - pad - 210 * s : pad + 46 * s, ey = touch ? pad + 30 * s : H - pad - 30 * s, ew = (touch ? 30 : 40) * s, eh = (touch ? 18 : 24) * s; // (5.1.1) on touch, by the depth: the bottom left is for a stick
      const blink = (g.time % 7.3) < 0.18 ? Math.abs(Math.sin((g.time % 7.3) / 0.18 * Math.PI)) : 0, open = (1 - blink) * (0.85 + 0.15 * Math.sin(g.time * 0.5));
      ctx.save();
      const og = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew * 1.7);
      og.addColorStop(0, `rgba(160,20,10,${(0.22 * a).toFixed(3)})`); og.addColorStop(1, 'rgba(160,20,10,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ex, ey, ew * 1.7, 0, TAU); ctx.fill();
      const lid = () => { ctx.beginPath(); ctx.moveTo(ex - ew, ey); ctx.bezierCurveTo(ex - ew * 0.45, ey - eh * 1.15 * open, ex + ew * 0.5, ey - eh * 1.05 * open, ex + ew, ey + eh * 0.05);
        ctx.bezierCurveTo(ex + ew * 0.5, ey + eh * 0.95 * open, ex - ew * 0.45, ey + eh * 1.0 * open, ex - ew, ey); ctx.closePath(); };
      lid(); ctx.save(); ctx.clip();
      // the white of it, dark and bloodshot
      ctx.fillStyle = `rgba(52,14,10,${a.toFixed(3)})`; ctx.fillRect(ex - ew, ey - eh * 1.2, ew * 2, eh * 2.4);
      // the iris: amber in the middle, red, then almost black at its rim
      const ir = eh * 1.05, ig = ctx.createRadialGradient(ex + ew * 0.05, ey, 0, ex + ew * 0.05, ey, ir);
      ig.addColorStop(0, `rgba(255,170,60,${a.toFixed(3)})`); ig.addColorStop(0.45, `rgba(214,52,22,${a.toFixed(3)})`); ig.addColorStop(0.85, `rgba(110,14,8,${a.toFixed(3)})`); ig.addColorStop(1, `rgba(30,4,2,${a.toFixed(3)})`);
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex + ew * 0.05, ey, ir, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,190,110,${(0.22 * a).toFixed(3)})`; ctx.lineWidth = Math.max(1, 0.8 * s);
      for (let k = 0; k < 22; k++) { const an = k / 22 * TAU + 0.2 * Math.sin(k * 3.1); ctx.beginPath(); ctx.moveTo(ex + ew * 0.05 + Math.cos(an) * ir * 0.25, ey + Math.sin(an) * ir * 0.25); ctx.lineTo(ex + ew * 0.05 + Math.cos(an) * ir * (0.7 + 0.2 * Math.sin(k * 7.7)), ey + Math.sin(an) * ir * (0.7 + 0.2 * Math.sin(k * 7.7))); ctx.stroke(); }
      // the slit
      const sw = eh * (0.16 + 0.07 * Math.sin(g.time * 0.9));
      ctx.fillStyle = `rgba(4,1,1,${a.toFixed(3)})`; ctx.beginPath(); ctx.moveTo(ex + ew * 0.05, ey - ir * 0.92); ctx.quadraticCurveTo(ex + ew * 0.05 + sw, ey, ex + ew * 0.05, ey + ir * 0.92); ctx.quadraticCurveTo(ex + ew * 0.05 - sw, ey, ex + ew * 0.05, ey - ir * 0.92); ctx.fill();
      // shadow from the upper lid, and a point of wet light
      const sh = ctx.createLinearGradient(0, ey - eh, 0, ey); sh.addColorStop(0, 'rgba(0,0,0,0.75)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.fillRect(ex - ew, ey - eh * 1.2, ew * 2, eh * 1.2);
      ctx.fillStyle = `rgba(255,240,220,${(0.75 * a).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(ex - ew * 0.18, ey - eh * 0.38, 2.4 * s, 1.6 * s, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
      // the lid line: dark and wet
      lid(); ctx.strokeStyle = `rgba(10,3,2,${a.toFixed(3)})`; ctx.lineWidth = 2.2 * s; ctx.stroke();
      ctx.restore();
    }

    // ---------- what the tool can reach ----------
    // with hints off the prompts are short and quiet: just the key and the action, no box
    const short = (p) => p.split('  ·  ')[0].split(' · ')[0].replace(/\s*\(.*\)$/, '');
    // (2.6.6) "Space  Atlantic herring": the key, then the name, plain, in the name's rarity colour
    const keyLine = (txt, cx, y, px) => { ctx.font = `${px}px ${GAME}`; ctx.textAlign = 'center'; ctx.fillText(txt, cx, y); };
    const keyWidth = (txt, px) => { ctx.font = `${px}px ${GAME}`; return ctx.measureText(txt).width; };
    const capHidden = !SETTINGS.catchTags && !!g.catchTarget; // the catch tag is a setting (pause menu); other Space prompts stay
    // (2.6.3) Hints off hides only the tips (hud.hint); what F or Space does is always shown, in its box
    // (4.0.0) what the tool can reach, said below (the prompts are all drawn together, after this)
    const capOn = g.capPrompt && !capHidden && !dying && !g.kill && !g.tutHidePrompts; // (4.4.0) the tutorial shows its own
    this.capWant = capOn ? [g.capPrompt, g.capRarity ? g.capRarity.col : g.capPrompt.startsWith('Space') ? '#d6ecce' : '#ece6d2', g.capIcon] : null; // (4.0.6) a name alone, in its rarity's colour
    }
    // ---------- interaction prompts ----------
    // (4.0.0) both prompts fade in and out, and one crossfades into the next; the shade behind them is one
    // fixed soft pool that fades with them. (5.1.1) On a touch screen these are the action buttons instead.
    if (!touch) {
      const cw = aboard ? null : this.capWant;
      const capFx = this.fadeText('cap', cw ? cw[0] : null, cw ? cw[1] : null); this.capIconNow = cw ? cw[2] : this.capIconNow;
      const prFx = this.fadeText('pr', g.prompt && !dying && !g.kill && !g.tutHidePrompts ? g.prompt : null, '#ece6d2'); // (2.6.2: always: Hints off hid what F does, e.g. at the cabin door)
      const shadeA = Math.max(capFx.level, prFx.level);
      const both = capFx.level > 0.01 && prFx.level > 0.01, capY = H * 0.72 - (both || g.prompt ? 40 : 0) * s + 14 * s, prY = H * 0.72 + 15 * s;
      const sy = both ? (capY + prY) / 2 : capFx.level > prFx.level ? capY : prY; this.shadeY = shadeA > 0.02 && this.shadeY != null ? this.shadeY + (sy - this.shadeY) * 0.15 : sy;
      if (shadeA > 0.01) promptShade(ctx, W / 2, this.shadeY, s, shadeA);
      for (const [txt, a, col] of capFx.list) { ctx.save(); ctx.globalAlpha = a; drawPrompt(ctx, txt, W / 2, capY, s, { col, size: 18, shade: false, icon: parsePromptKey(txt) ? null : this.capIconNow }); ctx.restore(); } // (3.6.0) a brass key-cap and the words; a catch's name in its rarity's colour
      for (const [txt, a, col] of prFx.list) { ctx.save(); ctx.globalAlpha = a; drawPrompt(ctx, txt, W / 2, prY, s, { col, shade: false, named: g.promptName }); ctx.restore(); }
      if (g.promptBar != null && prFx.level > 0.01) { // (4.5.0) the hold's progress: a slim brass bar in a dark groove
        const bw = 150 * s, bh = 5 * s, bx = W / 2 - bw / 2, by = prY + 18 * s, k = Math.max(0, Math.min(1, g.promptBar));
        ctx.save(); ctx.globalAlpha = prFx.level;
        ctx.fillStyle = 'rgba(6,10,12,0.7)'; ctx.beginPath(); ctx.roundRect(bx - 1, by - 1, bw + 2, bh + 2, 3 * s); ctx.fill();
        const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#f4f6f0'); gr.addColorStop(1, '#b8bab0');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(bh, bw * k), bh, 2.5 * s); ctx.fill();
        ctx.restore();
      }
    }
    // (5.1.1) a touch screen: the actions, bottom right (on deck too: the F action is how he goes in)
    if (touch && g.profile && g.mode === 'play' && !dying && !g.kill && !(g.paused || (document.getElementById('pause') && !document.getElementById('pause').hidden))) this.drawActions(g, W, H, s, dt, aboard);
    // ---------- (3.0.0) the next step of the main quest line, under the Quests button ----------
    const qs = g.profile && g.profile.quests, step = qs && this.questMain ? this.questMain[qs.main] : null;
    if (false && step && step.on && g.mode === 'play' && !dying && !g.kill && !g.hideQuest) { // (3.0.1: shown beside the Quests button instead)
      const tx = W - pad, ty0 = H * 0.42 + 42 * s, ok = qs.mainProg >= step.need;
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `${15 * s}px ${GAME}`;
      const line = step.text + (ok ? ': done' : '') + (step.need > 1 && !ok ? `  ${qs.mainProg}/${step.need}` : '');
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(line, tx + 1, ty0 + 1);
      ctx.fillStyle = ok ? 'rgba(170,230,150,0.95)' : 'rgba(236,232,220,0.88)'; ctx.fillText(line, tx, ty0);
      if (ok) { ctx.font = `${12 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,210,150,0.75)'; ctx.fillText('claim it in Quests', tx, ty0 + 19 * s); }
    }
    // ---------- P: frames per second, the picture's resolution, and whether lite mode is on ----------
    if (this.showFps) { // (5.3.5) top right, everywhere (on deck too)
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = 'rgba(200,225,215,0.75)';
      ctx.fillText(`${Math.round(this.fps || 0)} fps · ${Math.round(Math.min(1, (this.quality ?? 1) * Math.min(window.devicePixelRatio || 1, 1.25)) * 100)} % sharp${this.lite ? ' · lite' : ''}`, W / 2, 6 * s);
    }
    // ---------- toasts ----------
    ctx.textAlign = 'center';
    let ty = pad + 6 * s; // each line below the last, spaced by its own size, so big and small lines never overlap
    for (let i = 0; i < this.toasts.length; i++) {
      const tt = this.toasts[i];
      tt.t += dt;
      if (this.onShow) continue; // (3.4.0) the message line shows them
      const a = clamp(Math.min(tt.t * 3, (4.5 - tt.t) * 1.5), 0, 1);
      const fs = (tt.kind === 'big' ? 24 : 18) * s;
      ctx.font = `${fs}px ${GAME}`;
      ctx.shadowColor = `rgba(0,0,0,${0.7 * a})`; ctx.shadowBlur = 6 * s;
      if (tt.kind.startsWith('rar:')) { ctx.globalAlpha = a; ctx.fillStyle = tt.kind.slice(4); }
      else ctx.fillStyle = tt.kind === 'warn' ? `rgba(244,110,98,${a})` : tt.kind === 'note' ? `rgba(240,226,190,${a})` : `rgba(230,238,236,${a})`;
      ctx.fillText(tt.text, W / 2, ty); // (3.0.0: no ×N on a repeated line: it just stays up) ctx.shadowBlur = 0;
      ty += fs * 1.45;
      ctx.globalAlpha = 1;
    }
    this.toasts = this.toasts.filter((tt) => tt.t < 4.5);

    // ---------- in its grip: what can still get him free, and how little time is left ----------
    const K = g.kill;
    if (K && K.window && !K.esc && K.t > K.window[0] && K.t < K.window[1] && g.mode === 'play') {
      const opts = [];
      if (!g.entity.flashed) opts.push(['L', 'FLASH IT']);
      if (g.items.lure > 0 || (g.profile.oldLures || 0) > 0) opts.push(['Q', 'LURE']);
      const left = 1 - (K.t - K.window[0]) / (K.window[1] - K.window[0]);
      const pulse = 0.75 + 0.25 * Math.sin(K.t * 22);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${30 * s}px ${MONO}`; ctx.fillStyle = `rgba(255,236,220,${pulse.toFixed(3)})`;
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12 * s;
      ctx.fillText(opts.length ? opts.map(([k, n]) => `${k}  ${n}`).join('     ') : 'NOTHING LEFT TO GIVE IT', W / 2, H * 0.72);
      ctx.shadowBlur = 0;
      const bw = 360 * s, bx = W / 2 - bw / 2, by = H * 0.72 + 30 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, 5 * s);
      ctx.fillStyle = 'rgba(255,90,70,0.95)'; ctx.fillRect(bx, by, bw * left, 5 * s);
      ctx.restore();
    }
    // ---------- death: everything but the red timer fades to black ----------
    const bleedOut = dying && g.deathKind === 'injury', crushed = dying && g.deathKind === 'implode';
    if (dying) {
      ctx.fillStyle = bleedOut ? `rgba(26,0,0,${clamp(g.deathT / 3, 0, 1).toFixed(3)})` : `rgba(0,0,0,${(g.deathKind === 'devoured' ? 1 : clamp(crushed ? (g.deathT - 1.6) / 1.6 : g.deathT / 2.2, 0, 1)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `500 ${40 * s}px ${MONO}`;
      ctx.fillStyle = '#d8241e'; ctx.fillText(formatTime(g.survival + g.deathT), W - pad, pad);
      ctx.font = `${13 * s}px ${MONO}`; ctx.fillStyle = `rgba(216,36,30,${clamp(g.deathT - (crushed ? 3.4 : 0.5), 0, 0.8).toFixed(3)})`;
      ctx.fillText(g.deathCause || '', W - pad, pad + 50 * s);
    }
    // ---------- death countdown ----------
    if (dying && !bleedOut && !crushed && g.deathT > 0) {
      const left = Math.max(0, 3 - Math.floor(g.deathT - g.deathDelay));
      if (g.deathT > g.deathDelay) {
        ctx.font = `500 ${120 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(216,36,30,${clamp(1 - ((g.deathT - g.deathDelay) % 1), 0.2, 1)})`;
        if (left > 0) ctx.fillText(String(left), W / 2, H / 2);
        ctx.textBaseline = 'top';
      }
    }
  }
}
