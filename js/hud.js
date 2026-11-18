import { drawPrompt, promptShade, parsePrompt, depthCounter, dymo, tubeGauge, brassBezel, keyCap } from './fittings.js';
import * as C from './console.js';
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

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
const GAME = '"IM Fell English", "EB Garamond", Georgia, serif';

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.ecg = new Array(120).fill(0); this.ecgT = 0; this.beatPhase = 0;
    this.sweep = 0; this.blip = null; this.toasts = []; this.journalHot = null; this.chartHot = null;
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    // (4.17.0) the UI scale: from the screen's height, but never below 0.7 of the design (a phone held sideways is
    // only ~390 px tall) nor above 1.5; and the notch's safe areas kept clear
    this.s = Math.min(1.5 * dpr, Math.max(h / 900, 0.7 * dpr)); // (claude-polish) as the comment above says: the clamp was never applied, so a phone's instruments were drawn at 0.43 and unreadable
    if (!this.safeEl) { this.safeEl = document.createElement('div'); this.safeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(this.safeEl); }
    const cs = getComputedStyle(this.safeEl); this.safe = { l: parseFloat(cs.paddingLeft) * dpr || 0, r: parseFloat(cs.paddingRight) * dpr || 0, t: parseFloat(cs.paddingTop) * dpr || 0, b: parseFloat(cs.paddingBottom) * dpr || 0 };
  }
  // explanations: only when hints are on (H)
  hint(text) { if (this.hints) this.toast(text, 'note'); }
  toast(text, kind = '') {
    text = titled(text);
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
    if (owns(P, 'slurp')) tools.push(['2', 'slurp', G('slurp').look, G('slurp').name]);
    if (owns(P, 'tagger')) tools.push(['3', 'tag', G('tag').look, G('tag').name]);
    if (owns(P, 'camera')) tools.push(['4', 'cam', G('cam').look, G('cam').name]);
    const tr = P.traps || {};
    const ownedTraps = ['pot', 'fish', 'steel', 'cage'].reduce((a, k) => a + (tr[k] || 0), 0);
    if (ownedTraps > 0) tools.push(['5', 'trap', ['pot', 'fish', 'steel', 'cage'].findIndex((k) => tr[k] > 0), 'Traps']);
    // (ui-studio) the belt rack: an enamel tile per tool; the one in hand ringed off-white with its lamp lit orange;
    // the key printed in the corner, the name printed along the bottom, the tool's picture in the well
    const sw = 86 * s, sh = 62 * s, gap = 10 * s;
    const total = tools.length * sw + (tools.length - 1) * gap;
    let x = W / 2 - total / 2;
    const y = H - sh - 20 * s;
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'slurp' && owns(P, 'slurp') ? 'slurp' : g.toolSel === 'tag' && owns(P, 'tagger') ? 'tag' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    for (const [key, kind, tier, name] of tools) {
      const on = kind === sel && !e.inSub;
      C.tile(ctx, x, y, sw, sh, s, on);
      C.label(ctx, key, x + 10 * s, y + 13 * s, s, { col: on ? C.INK : C.DIM, size: 13 });
      const ic = icon(kind, tier), iw = sw - 28 * s;
      ctx.globalAlpha = e.inSub ? 0.35 : 1;
      ctx.drawImage(C.tinted(ic, on ? 1 : 0.5), x + 14 * s, y + 10 * s, iw, iw / 2);
      ctx.globalAlpha = 1;
      const nm = String(name || '').toLowerCase(), short = nm.length > 13 ? nm.split(' ').slice(-2).join(' ').slice(0, 13) : nm;
      if (on) C.inverse(ctx, short, x + 2 * s, y + sh - 19 * s, sw - 4 * s, 17 * s, s, { size: 11 });
      else C.label(ctx, short, x + sw / 2, y + sh - 11 * s, s, { align: 'center', size: 11 });
      const count = (n, warn) => C.label(ctx, String(n), x + sw - 10 * s, y + 13 * s, s, { align: 'right', col: warn ? C.RED : C.INK, size: 13, spacing: 0 });
      if (kind === 'cam') count(g.shots, !g.shots);
      if (kind === 'trap') { const free = ownedTraps - g.traps.length; C.label(ctx, `x${free}`, x + sw - 10 * s, y + 13 * s, s, { align: 'right', col: free ? C.DIM : C.RED, size: 12, spacing: 0 }); }
      if (kind === 'tag' && g.tags.length) count(g.tags.length, false);
      // sweep / reload progress along the bottom edge of the well
      if (on && g.capture && g.capture.kind === kind) {
        ctx.fillStyle = C.ORANGE;
        ctx.fillRect(x + 8 * s, y + sh - 6 * s, (sw - 16 * s) * clamp(g.capture.t / g.capture.dur, 0, 1), 2 * s);
      }
      x += sw + gap;
    }
    // specimen slots: the bag (or, in the sub, its tank). Each dot shows the animal's colour,
    // ringed by its condition: green healthy, amber stressed, red weak, grey dead.
    // (4.16.7) in the sub, just counts: the open tank's spaces, the chambers, the large tank if fitted
    const list = e.inSub ? [] : g.bag, slots = e.inSub ? 0 : bagSlots(g);
    const pList = [], pSlots = 0;
    const r = 6 * s, step = 17 * s, rowW = (slots + (pSlots ? pSlots + 0.6 : 0)) * step;
    let sx = W / 2 - rowW / 2 + step / 2;
    const sy = y - 18 * s;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    if (!e.inSub) C.label(ctx, 'BAG', sx - step * 0.6 - 2 * s, sy, s, { align: 'right', size: 11 });
    for (let i = 0; i < slots; i++, sx += step) {
      const sp = list[i];
      ctx.beginPath(); ctx.rect(sx - r, sy - r, r * 2, r * 2);
      ctx.fillStyle = C.GLASS; ctx.fill();
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
      } else { ctx.strokeStyle = C.P(0.6); ctx.lineWidth = Math.max(1, s); ctx.stroke(); }
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
        ctx.fillStyle = '#2b2620'; ctx.font = `italic ${12 * s}px "EB Garamond", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((pc.variant ? VARIANTS[pc.variant].name + ' ' : '') + pc.sp.name, 0, ch / 2 - 13 * s);
        ctx.restore();
      }
    }
    // a second row inside the sub: what is still in the bag outside the tank
    if (e.inSub && g.bag.length) { ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(232,176,64,0.8)'; ctx.fillText(`+${g.bag.length} in the bag${list.length >= slots ? ' (tank full)' : ''}`, W / 2 + rowW / 2 + 8 * s + (this.coinW || 0), sy); }
    ctx.textBaseline = 'top';
  }

  // A strip of sonar: the seabed profile 80 m each side of the sub, scaled to fit, with the sub at the
  // top and a sounding straight down. Refreshed with each ping (twice a second), not every frame.
  drawSonar(ctx, g, rx0, y0, s) {
    // (ui-studio) on an enamel plate the instrument column's width, the trace in a sunk window
    const PW = 220 * s, PH = 78 * s, w = PW - 20 * s, h = PH - 30 * s, x0 = rx0 - PW + 10 * s, sub = g.sub, W = g.world, now = g.time;
    C.plate(ctx, rx0 - PW, y0, PW, PH, s); C.sunk(ctx, x0 - 2 * s, y0 + 22 * s, w + 4 * s, h + 2 * s, s);
    C.label(ctx, 'SEAFLOOR', rx0 - PW + 12 * s, y0 + 12 * s, s, { col: C.INK, size: 11 });
    y0 += 23 * s;
    const P = this.sonarP;
    if (!P || now - P.t > 0.5 || Math.abs(P.x - sub.x) > 4 || Math.abs(P.y - sub.y) > 4) {
      const xs = [], N = 64;
      for (let i = 0; i <= N; i++) { const x = sub.x - 80 + 160 * i / N; xs.push(W.floorAt(Math.max(0, Math.min(4999, x)))); }
      this.sonarP = { t: now, x: sub.x, y: sub.y, fl: xs, below: W.floorAt(sub.x) - sub.y };
    }
    const S = this.sonarP, top = sub.y - 8, span = Math.max(40, Math.min(1500, Math.max(...S.fl) - top + 10));
    const Y = (d) => y0 + 12 * s + (d - top) / span * (h - 14 * s);
    ctx.save();
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
    C.label(ctx, `BOTTOM ${Math.max(0, Math.round(S.below))} M BELOW`, rx0 - 10 * s, y0 - 11 * s, s, { align: 'right', col: C.GREEN, size: 11, spacing: 1 });
    C.label(ctx, `${Math.round(sub.y + S.below)} M`, x0 + w - 4 * s, y0 + h - 7 * s, s, { align: 'right', col: 'rgba(127,207,116,0.7)', size: 10, spacing: 0.6 });
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
    const ctx = this.ctx, s = this.s;
    if (g.mode === 'menu') return;
    const e = g.earl, fx = g.fx;
    const dying = g.mode === 'dying';
    if (g.holdCursor) { // (4.12.3) the weighted pointer during a long hold: a brass ring, trailing the real one
      const k = W / window.innerWidth, hx = g.holdCursor.x * k, hy = g.holdCursor.y * k, r = 9 * s;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4 * s; ctx.strokeStyle = 'rgba(232,208,146,0.9)'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(232,208,146,0.9)'; ctx.beginPath(); ctx.arc(hx, hy, 2 * s, 0, TAU); ctx.fill(); ctx.restore();
    }
    const red = dying || false;
    const aboard = !!g.aboard && !dying; // on the Margaret's deck or in her cabin: only cash, the prompt and the contracts

    // ---------- (ui-studio) the dive computer: one screen, top right. Depth large; air (and in the sub cabin air, the
    // hull, the rating, the cargo) as rows of blocks; the sonar at its foot. Phosphor on glass (docs/UI_BRIEF.md).
    const pad = 26 * s;
    ctx.textBaseline = 'top'; ctx.textAlign = 'right';
    const rx0 = W - pad, CW = 220 * s, cx0 = rx0 - CW, IX = cx0 + 12 * s, IR = rx0 - 12 * s;
    let yy = pad - 6 * s;
    const ap = g.autopilot;
    if (!aboard) {
    const onTank = e.inSub && g.sub.o2 <= 0; // an empty cabin: the reading is his own tank
    const o2 = e.inSub && !onTank ? g.sub.o2 / g.sub.o2Max : e.o2 / e.o2Max;
    const left = e.inSub && !onTank ? g.sub.o2 / Math.max(0.0001, g.subDrain) : e.o2 / Math.max(0.0001, g.diverDrain);
    const sec = Math.max(0, Math.floor(left)), secTxt = e.atSurface && o2 < 0.999 ? 'filling' : sec >= 600 ? `${Math.floor(sec / 60)} min` : sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec} s`;
    const airWarn = g.noAir || o2 < 0.1 ? 2 : o2 < 0.25 ? 1 : 0;
    const hi = e.inSub ? clamp(g.sub.hull, 0, 1) : 1, rr8 = e.inSub ? g.sub.y / g.sub.rated : 0;
    const GR = 46 * s;
    // its height: the depth block, air, (hull, rating, cargo), the sonar
    let cargo = [];
    if (e.inSub) {
      const fmt = (n) => (Number.isInteger(n) ? n : n.toFixed(1));
      cargo.push(['tank', `${fmt(tankUsed(g))} / ${tankSlots(g)}`, tankUsed(g) >= tankSlots(g)]);
      if (pressSlots(g)) { const n = g.subTank.filter((q) => q.pressed && q.chamber !== BIG).length; cargo.push(['chambers', `${n} / ${pressSlots(g)}`, n >= pressSlots(g)]); }
      if (hasBigTank(g)) cargo.push(['large tank', `${bigIn(g).length} / 3`, bigIn(g).length >= 3]);
      if (g.bag.length) cargo.push(['in the bag', String(g.bag.length), false]);
    }
    const SH = (dying ? 0 : 86 * s) + 46 * s + (e.inSub ? 46 * s + 24 * s + cargo.length * 20 * s + 8 * s : 0) + GR * 2 + 22 * s;
    C.screen(ctx, cx0, yy, CW, SH, s);
    let iy = yy;
    if (!dying) {
      const d = Math.max(0, e.y), warnD = e.inSub ? rr8 > 0.9 : e.y > (e.pressStart || 300);
      const vy = (this.lastDepth == null ? 0 : (d - this.lastDepth) / Math.max(dt, 1e-3)); this.lastDepth = d;
      this.vyS = (this.vyS || 0) * 0.9 + vy * 0.1;
      C.label(ctx, 'depth', IX, iy + 16 * s, s);
      C.label(ctx, `max ${Math.round(Math.max(d, e.maxDepth || 0))}`, IR, iy + 16 * s, s, { align: 'right' });
      C.reading(ctx, String(Math.round(d)), IR - 26 * s, iy + 72 * s, 62 * s, { col: warnD ? C.RED : C.INK });
      C.reading(ctx, 'm', IR, iy + 72 * s, 30 * s, { col: C.DIM });
      if (Math.abs(this.vyS) > 0.25) C.reading(ctx, this.vyS > 0 ? '▼' : '▲', IX, iy + 66 * s, 24 * s, { align: 'left' });
      iy += 86 * s; C.rule(ctx, IX - 2 * s, IR + 2 * s, iy - 4 * s, s);
    }
    // air
    const airName = g.noAir ? 'no air' : onTank ? 'his tank' : e.inSub ? 'cabin air' : 'air';
    C.label(ctx, airName, IX, iy + 12 * s, s, { col: airWarn > 1 ? C.RED : C.DIM, glow: airWarn > 1 });
    C.label(ctx, secTxt, IR, iy + 12 * s, s, { align: 'right', col: airWarn > 1 ? C.RED : C.INK, size: 14, glow: true });
    C.blocks(ctx, IX, iy + 24 * s, IR - IX, 10 * s, o2, s, { warn: airWarn, t: g.time });
    iy += 46 * s;
    if (e.inSub) {
      C.label(ctx, 'hull', IX, iy + 12 * s, s, { col: hi < 0.4 ? C.RED : C.DIM });
      C.label(ctx, `${Math.round(hi * 100)}%${hi < 0.99 ? ' leaking' : ''}`, IR, iy + 12 * s, s, { align: 'right', col: hi < 0.4 ? C.RED : C.INK, size: 14, glow: true });
      C.blocks(ctx, IX, iy + 24 * s, IR - IX, 10 * s, hi, s, { warn: g.sub.failing != null || hi < 0.25 ? 2 : 0, t: g.time });
      iy += 46 * s;
      // the rating: a lamp, what it means, her depth against it
      const st = g.sub.failing != null ? 'hull failing' : rr8 > 1 ? 'past her rating' : rr8 > 0.9 ? 'near her rating' : 'within rating';
      const bad = g.sub.failing != null || rr8 > 1, flick = bad ? Math.sin(g.time * 8) > 0 : true;
      C.lamp(ctx, IX + 4 * s, iy + 8 * s, bad ? (flick ? 'red' : 'off') : rr8 > 0.9 ? 'on' : 'off', s);
      C.label(ctx, st, IX + 14 * s, iy + 8 * s, s, { col: bad ? C.RED : rr8 > 0.9 ? C.INK : C.DIM });
      C.label(ctx, `${Math.round(g.sub.y)} / ${g.sub.rated} m`, IR, iy + 8 * s, s, { align: 'right', col: C.DIM });
      iy += 24 * s; C.rule(ctx, IX - 2 * s, IR + 2 * s, iy - 4 * s, s);
      for (const [l, v, full] of cargo) { C.label(ctx, l, IX, iy + 10 * s, s); C.label(ctx, v, IR, iy + 10 * s, s, { align: 'right', col: C.INK, size: 13, glow: full }); iy += 20 * s; }
      iy += 8 * s;
    }
    C.rule(ctx, IX - 2 * s, IR + 2 * s, iy - 4 * s, s);
    let rcx = cx0 + CW / 2, rcy = iy + GR + 8 * s; const rr = GR;
    C.label(ctx, '200 m', IR, iy + 10 * s, s, { align: 'right', size: 10 });
    if (e.inSub && ap && g.homeRun) { C.inverse(ctx, 'autopilot', IX - 4 * s, iy + 2 * s, 86 * s, 16 * s, s, { size: 11 }); C.label(ctx, 'air x0.6', IX, iy + 30 * s, s, { size: 10 }); }
    // the scope: range rings and a cross, ghosted
    ctx.save(); ctx.strokeStyle = C.GHOST; ctx.lineWidth = Math.max(1, s);
    for (const k of [1 / 3, 2 / 3, 1]) { ctx.beginPath(); ctx.arc(rcx, rcy, rr * k, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(rcx - rr, rcy); ctx.lineTo(rcx + rr, rcy); ctx.moveTo(rcx, rcy - rr); ctx.lineTo(rcx, rcy + rr); ctx.stroke(); ctx.restore();
    yy += SH + 10 * s;
    // the sonar: what it shows, clipped to the scope
    ctx.save();
    ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.clip();
    this.sweep = (this.sweep + dt * 1.6) % TAU;
    const sg = ctx.createConicGradient ? ctx.createConicGradient(this.sweep - 0.9, rcx, rcy) : null;
    if (sg) { sg.addColorStop(0, C.P(0)); sg.addColorStop(0.14, C.P(0.32)); sg.addColorStop(0.145, C.P(0)); ctx.fillStyle = sg; ctx.fillRect(rcx - rr, rcy - rr, rr * 2, rr * 2); }
    // his traps: small orange marks where their lines are
    for (const tr of g.traps || []) {
      const dx = tr.x - e.x, dy = tr.y - e.y, d = Math.hypot(dx, dy);
      if (d > 200) continue;
      const k = rr * Math.min(1, d / 200);
      ctx.fillStyle = C.ORANGE; ctx.beginPath(); ctx.arc(rcx + dx / (d || 1) * k, rcy + dy / (d || 1) * k, 2 * s, 0, TAU); ctx.fill();
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
      const on = ap && ap.active ? 0.55 + 0.45 * Math.sin(g.time * 5) : 0.8;
      ctx.fillStyle = C.P(on);
      const q = (ds > 200 ? 1.6 : 2.2) * s;
      ctx.fillRect(sxp - q, syp - q, q * 2, q * 2);
    }
    ctx.restore();
    ctx.fillStyle = C.INK; ctx.beginPath(); ctx.arc(rcx, rcy, 2 * s, 0, TAU); ctx.fill();
    // in the sub, what the scope sits beside: the autopilot's state, the sub's air rate
    // status lines under the instruments, printed small: what is draining the air, the sub on its way
    const lines = [];
    if (g.noAir && !e.atSurface) lines.push([(g.noAirRate || 1) > 1.3 ? 'UNDER PRESSURE: SURFACE!' : 'HOLDING YOUR BREATH: SURFACE!', C.RED]);
    if (!e.atSurface) {
      const parts = [];
      if (e.sprint && e.speedNow > 1) parts.push(`SPRINT ×${e.inSub ? 3 : 2}`);
      const press = e.inSub ? 1 : diverDrainMult(e.y, e.pressStart || 300);
      if (press > 1.05) parts.push(press >= 100 ? 'PRESSURE ×100+' : `PRESSURE ×${press.toFixed(press < 10 ? 1 : 0)}`); // past x100 the number means nothing (it grows to millions in the abyss)
      if (parts.length) lines.push([parts.join('  ·  '), C.ORANGE]);
    }
    if (ap && !e.inSub && !g.sub.imploded && (ap.active || ap.state === 'waiting')) {
      const dsub = Math.hypot(g.sub.x - e.x, g.sub.y - e.y);
      let txt;
      if (ap.state === 'home') txt = `SUB RETURNING · ${Math.round(Math.hypot(g.sub.x - boatDock(), g.sub.y - 2.6))} M`;
      else if (ap.holding && ap.remaining < 3) txt = `SUB HOLDING AT ${Math.round(g.sub.y)} M · RATED DEPTH`;
      else if (ap.state === 'waiting') txt = `SUB WAITING · ${Math.round(dsub)} M`;
      else txt = `SUB COMING · ${Math.round(dsub)} M · ${Math.ceil(ap.eta || 0)} S`;
      lines.push([txt, ap.holding ? C.ORANGE : C.INK]);
    }
    if (g.concealed) lines.push(['HIDDEN', C.GREEN]);
    for (const [t2, col] of lines) { C.label(ctx, t2, rx0, yy + 7 * s, s, { align: 'right', col, size: 12, spacing: 1.2 }); yy += 18 * s; }
    if (lines.length) yy += 4 * s;
    // the seafloor sonar (a fitted extra): the bottom below and around the sub, 160 m across
    if (e.inSub && g.addons && g.addons.sonar && !dying && !g.sub.imploded) { this.drawSonar(ctx, g, rx0, yy, s); yy += 88 * s; }
    // journal and chart: rubber keys with their names printed beside them, in one row; each key and word clickable
    const kx = window.innerWidth / this.c.width;
    const kw1 = C.key(ctx, cx0 + 4 * s, yy, 'J', s); C.label(ctx, 'journal', cx0 + 4 * s + kw1 + 8 * s, yy + 11 * s, s, { col: C.INK, size: 12 });
    this.journalHot = { x: (cx0 + this.safeL) * kx, y: (yy + this.safeT) * kx, w: 92 * s * kx, h: 26 * s * kx };
    const kx2 = cx0 + 120 * s;
    const kw2 = C.key(ctx, kx2, yy, 'K', s); C.label(ctx, 'chart', kx2 + kw2 + 8 * s, yy + 11 * s, s, { col: C.INK, size: 12 });
    this.chartHot = { x: (kx2 + this.safeL) * kx, y: (yy + this.safeT) * kx, w: 86 * s * kx, h: 26 * s * kx };
    yy += 26 * s + 14 * s;
    // ---------- the sub: a button for C (call it to you, or the autopilot home) ----------
    this.subHot = null;
    if (!g.sub.imploded && !dying && !g.tutHidePrompts) { // (4.4.0) not during the tutorial
      const ap = g.autopilot;
      const label = e.inSub ? (g.homeRun ? 'autopilot off' : g.sub.docked ? null : 'autopilot home') : (ap && ap.state === 'coming' ? 'stop sub' : 'call sub');
      if (label) {
        // bottom-right corner, a little larger
        const word = label.charAt(0).toUpperCase() + label.slice(1);
        ctx.font = `500 ${17 * s}px "EB Garamond", Georgia, serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(word).width, bw = tw + 36 * s, bh = 31 * s, bx = rx0 - bw, by = H - pad - bh;
        this.subHot = { x: (bx + this.safeL) * kx, y: (by + this.safeT) * kx, w: bw * kx, h: bh * kx };
        const on = g.homeRun || (ap && ap.state === 'coming');
        promptShade(ctx, bx + bw / 2, by + bh / 2, s * 0.45);
        keyCap(ctx, bx, by + 2 * s, 'C', s);
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6 * s; ctx.shadowOffsetY = 1;
        ctx.fillStyle = on ? '#f0d890' : '#ece6d2'; ctx.fillText(word, bx + 36 * s, by + bh / 2 + 1 * s);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.textBaseline = 'top';
      }
    }

    // ---------- Q / E items: in the right-hand column, only when carried ----------
    // (ui-studio) the things in reach of a hand (Q lure, E glow stick, R a backup tank, N the sub's net): enamel tiles
    // in a row under J and K, the key printed in the corner, the lamp lit while it is working, the name along the bottom
    const slots = [];
    if (g.items.lure > 0 || g.lure) slots.push(['q', 'Q', 'LURE', g.items.lure, '#bfeaff', g.lure ? g.entity.lureT / 10 : 0]);
    if (e.inSub && (g.items.airTank > 0 || g.tankFit)) slots.push(['r', 'R', 'AIR TANK', g.items.airTank, '#9fd4ff', g.tankFit ? g.tankFit / 3 : 0]);
    if (g.items.necklace > 0 || g.necklaceOn) slots.push(['e', 'E', g.necklaceOn ? `GLOW ${Math.ceil(g.glowT || 0)} S` : 'GLOW', g.items.necklace, '#ffc070', g.necklaceOn ? 1 : 0]);
    // the sub's trawl net (N): which net is in the hatch, and while it is out, how long it has been towing
    if (e.inSub) {
      const n = g.subNet, kinds = netKinds(g.items), N = n ? n.T : kinds.length ? NETS_SUB[kinds[0]] : null; // (4.11.0) every kind in the hatch
      const state = n ? (n.phase === 'tow' ? (g.trawlTaught ? 'OUT' : 'OUT · N CLOSES') : n.phase === 'torn' ? 'TORN' : 'HAULING') : kinds.length ? kinds.map((k) => NETS_SUB[k].short).join(' + ') : 'NO NET';
      slots.push(['n', 'N', state, n || N ? 1 : 0, n ? '#e8b070' : kinds.includes('adv') ? '#f0c060' : '#e8b070', n && n.phase === 'tow' ? Math.min(1, n.pt / (n.T.tow || TOW_MAX)) : 0, n ? 0 : netsOf(g.items).basic]); // (the badge: two beginner nets)
    }
    this.slotHot = {};
    const sg2 = 8 * s, sz = Math.min(64 * s, (CW - (slots.length - 1) * sg2) / Math.max(1, slots.length)), sh2 = 56 * s; // (the row never wider than the instruments)
    slots.forEach(([id, key, name, n, col, active, badge], i) => {
      const x = rx0 - (slots.length - i) * sz - (slots.length - 1 - i) * sg2, y = yy;
      this.slotHot[id] = { x: (x + this.safeL) * kx, y: (y + this.safeT) * kx, w: sz * kx, h: sh2 * kx };
      const empty = !(n > 0) && !active, bad = name === 'NO NET' || name === 'TORN';
      C.tile(ctx, x, y, sz, sh2, s, false);
      C.lamp(ctx, x + sz - 12 * s, y + 12 * s, active > 0 ? 'on' : 'off', s, 16);
      if (!(id === 'n' && g.trawlTaught)) C.label(ctx, key, x + 10 * s, y + 13 * s, s, { col: C.INK, size: 13, raw: true });
      // the thing itself: a coloured bead (lure, glow, air), the net as a drawn mesh
      const icx = x + sz / 2, icy = y + 27 * s;
      ctx.save(); ctx.globalAlpha = empty ? 0.3 : 1;
      if (id === 'n') { ctx.strokeStyle = C.INK; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(icx - 12 * s, icy - 6 * s); ctx.lineTo(icx + 12 * s, icy - 6 * s); ctx.lineTo(icx + 6 * s, icy + 7 * s); ctx.lineTo(icx - 6 * s, icy + 7 * s); ctx.closePath(); ctx.stroke();
        ctx.globalAlpha *= 0.5; ctx.beginPath(); for (let k = -2; k <= 2; k++) { ctx.moveTo(icx + k * 5 * s, icy - 6 * s); ctx.lineTo(icx + k * 2.5 * s, icy + 7 * s); } ctx.moveTo(icx - 9 * s, icy); ctx.lineTo(icx + 9 * s, icy); ctx.stroke(); }
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(icx, icy, 6.5 * s, 0, TAU); ctx.fill(); }
      ctx.restore();
      if (active > 0) { ctx.strokeStyle = C.ORANGE; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(icx, icy, 11 * s, -Math.PI / 2, -Math.PI / 2 + TAU * active); ctx.stroke(); }
      const cnt = id !== 'n' ? n : badge > 1 ? badge : null, narrow = sz < 58 * s; // (a narrow tile: the count goes with the name)
      if (cnt != null && !narrow) C.label(ctx, `×${cnt}`, x + sz - 22 * s, y + 13 * s, s, { align: 'right', col: cnt > 0 ? C.DIM : C.RED, size: 12, spacing: 0 });
      const nm = (name.length > 12 ? name.slice(0, 12) : name) + (cnt != null && narrow ? ` ×${cnt}` : '');
      C.label(ctx, nm, icx, y + sh2 - 11 * s, s, { align: 'center', col: bad || empty ? C.DIM : C.INK, size: 10 });
    });
    // ---------- P: frames per second, the picture's resolution, and whether lite mode is on ----------
    if (this.showFps) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = 'rgba(200,225,215,0.75)';
      ctx.fillText(`${Math.round(this.fps || 0)} fps · ${Math.round(Math.min(1, (this.quality ?? 1) * Math.min(window.devicePixelRatio || 1, 1.25)) * 100)} % sharp${this.lite ? ' · lite' : ''}`, pad, H - pad * 0.4);
    }
    }
    // ---------- cash, top left: what is safe at the boat, and what is in the bag ----------
    // (claude-polish) not while the inventory is open: it has its own cash counter, and its edge cut this one in half
    const invOpen = (this._invEl || (this._invEl = document.getElementById('inventory'))) && !this._invEl.hidden;
    if (g.profile && !dying && !invOpen) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      // (ui-studio) an enamel plate: CASH printed on it, the sum in a sunk window
      const ctxt = money(g.profile.cash);
      ctx.font = `500 ${22 * s}px ${C.NUM}`; const vw = ctx.measureText(ctxt).width;
      const cpx = pad - 8 * s, cpy = pad - 10 * s, cph = 40 * s, cww = vw + 22 * s, cpw = cww + 72 * s;
      C.plate(ctx, cpx, cpy, cpw, cph, s);
      C.label(ctx, 'CASH', cpx + 14 * s, cpy + cph / 2, s, { col: C.INK, size: 12 });
      C.sunk(ctx, cpx + cpw - cww - 9 * s, cpy + 7 * s, cww, cph - 14 * s, s);
      ctx.save(); ctx.font = `500 ${22 * s}px ${C.NUM}`; ctx.fillStyle = C.INK; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(ctxt, cpx + cpw - 20 * s, cpy + cph / 2 + 1 * s); ctx.restore();
      ctx.textBaseline = 'top';
      let carried = 0;
      for (const [k, n] of Object.entries(g.inv)) if (n > 0 && GOODS[k]) carried += GOODS[k].price * n;
      if (carried > 0) {
        C.label(ctx, `+ ABOUT ${money(carried, carried < 100)} UNSOLD`, pad - 4 * s, pad + 42 * s, s, { size: 12, spacing: 1 });
      }
      if ((g.loadKg || 0) > 5 && !e.inSub) {
        C.label(ctx, `LOAD ${Math.round(g.loadKg)} KG${g.loadKg > 10 ? ' · HEAVY' : ''}`, pad - 4 * s, pad + (carried > 0 ? 60 : 42) * s, s, { size: 12, spacing: 1, col: g.loadKg > 10 ? C.ORANGE : C.DIM });
      }
    }

    if (!aboard) {
    // ---------- tools and specimens, bottom centre ----------
    if (g.profile && g.mode === 'play' && !dying) this.drawGear(g, W, H, s, dt);

    // ---------- marked: a symbol, the red eye, bottom left ----------
    // A pointed almond in flat orange-red with a vertical black slit and a soft glow. The slit slowly
    // narrows and widens; each good deed fades it a step.
    if (g.entity && g.entity.marked && !dying) {
      const calm = clamp((g.entity.calm || 0) / 60, 0, 1);
      const a = 1 - calm * 0.65;
      const ex = pad + 52 * s, ey = H - pad - 34 * s, ew = 48 * s, eh = 30 * s;
      const og = ctx.createRadialGradient(ex, ey, 0, ex, ey, ew * 1.5);
      og.addColorStop(0, `rgba(255,60,30,${(0.28 * a).toFixed(3)})`); og.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(ex, ey, ew * 1.5, 0, TAU); ctx.fill();
      // the almond: two arcs meeting in sharp points at either side
      ctx.fillStyle = `rgba(240,52,28,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(ex - ew, ey);
      ctx.quadraticCurveTo(ex, ey - eh * 1.4, ex + ew, ey);
      ctx.quadraticCurveTo(ex, ey + eh * 1.4, ex - ew, ey);
      ctx.closePath(); ctx.fill();
      // the vertical slit, pointed at top and bottom
      const sw = eh * (0.22 + 0.08 * Math.sin(g.time * 0.9));
      ctx.fillStyle = `rgba(8,2,2,${(0.97 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(ex, ey - eh * 0.6);
      ctx.quadraticCurveTo(ex + sw, ey, ex, ey + eh * 0.6);
      ctx.quadraticCurveTo(ex - sw, ey, ex, ey - eh * 0.6);
      ctx.closePath(); ctx.fill();
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
    this.capWant = capOn ? [g.capPrompt, g.capRarity ? g.capRarity.col : g.capPrompt.startsWith('Space') ? '#d6ecce' : '#f0c2a6', g.capIcon] : null; // (4.0.6) a name alone, in its rarity's colour
    }
    // ---------- interaction prompts ----------
    // (4.0.0) both prompts fade in and out, and one crossfades into the next; the shade behind them is one
    // fixed soft pool that fades with them
    {
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
        const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#f0d48a'); gr.addColorStop(1, '#a8823c');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(bx, by, Math.max(bh, bw * k), bh, 2.5 * s); ctx.fill();
        ctx.restore();
      }
    }
    // ---------- (3.0.0) the next step of the main quest line, under the Quests button ----------
    const qs = g.profile && g.profile.quests, step = qs && this.questMain ? this.questMain[qs.main] : null;
    if (false && step && step.on && g.mode === 'play' && !dying && !g.kill && !g.hideQuest) { // (3.0.1: shown beside the Quests button instead)
      const tx = W - pad, ty0 = H * 0.42 + 42 * s, ok = qs.mainProg >= step.need;
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `${15 * s}px ${GAME}`;
      const line = (ok ? '✓ ' : '') + step.text + (step.need > 1 && !ok ? `  ${qs.mainProg}/${step.need}` : '');
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillText(line, tx + 1, ty0 + 1);
      ctx.fillStyle = ok ? 'rgba(170,230,150,0.95)' : 'rgba(236,232,220,0.88)'; ctx.fillText(line, tx, ty0);
      if (ok) { ctx.font = `${12 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,210,150,0.75)'; ctx.fillText('claim it in Quests', tx, ty0 + 19 * s); }
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
      else ctx.fillStyle = tt.kind === 'warn' ? `rgba(255,150,110,${a})` : tt.kind === 'note' ? `rgba(240,226,190,${a})` : `rgba(230,238,236,${a})`;
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
      ctx.font = `italic ${17 * s}px "EB Garamond", Georgia, serif`; ctx.fillStyle = `rgba(216,36,30,${clamp(g.deathT - (crushed ? 3.4 : 0.5), 0, 0.8).toFixed(3)})`;
      ctx.fillText(g.deathCause || '', W - pad, pad + 50 * s);
    }
    // ---------- death countdown ----------
    if (dying && !bleedOut && !crushed && g.deathT > 0) {
      const left = Math.max(0, 3 - Math.floor(g.deathT - g.deathDelay));
      if (g.deathT > g.deathDelay) {
        ctx.font = `${150 * s}px "IM Fell English", "EB Garamond", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; // (ui-studio) printed, not the code font
        ctx.fillStyle = `rgba(216,36,30,${clamp(1 - ((g.deathT - g.deathDelay) % 1), 0.2, 1)})`;
        if (left > 0) ctx.fillText(String(left), W / 2, H / 2);
        ctx.textBaseline = 'top';
      }
    }
  }
}
