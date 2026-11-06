// HUD drawn on its own canvas (not affected by the dread filters):
// survival timer + oxygen bar (top right), the right-hand dive monitor
// (depth, radar, heart rate, journal), item slots and prompts.
import { clamp, lerp, formatTime, TAU } from './util.js';
import { SUB_LEVELS, diverDrainMult } from './player.js';
import { RESOURCES } from './world.js';
import { GOODS, money, gear, owns } from './economy.js';
import { BOAT } from './world.js';
import { VARIANTS } from './variants.js';
import { speciesIcon } from './creatures_draw.js';
import { toolIcon } from './tools_draw.js';
import { bagSlots, tankSlots, pressSlots } from './capture.js';
import { SPECIES_BY_ID } from './species.js';

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';
const GAME = '"IM Fell English", "EB Garamond", Georgia, serif';

export class Hud {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.ecg = new Array(120).fill(0); this.ecgT = 0; this.beatPhase = 0;
    this.sweep = 0; this.blip = null; this.toasts = []; this.journalHot = null;
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
    this.s = h / 900; // UI scale
  }
  // explanations: only when hints are on (H)
  hint(text) { if (this.hints) this.toast(text, 'note'); }
  toast(text, kind = '') { this.toasts.push({ text, kind, t: 0 }); if (this.toasts.length > 4) this.toasts.shift(); }

  // The hotbar (1 net, 2 slurp gun) and a row of specimen slots above it.
  drawGear(g, W, H, s, dt) {
    const ctx = this.ctx, P = g.profile, e = g.earl;
    this.icons = this.icons || new Map();
    const icon = (kind, tier) => {
      const k = kind + tier;
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
    const sw = 84 * s, sh = 46 * s, gap = 8 * s;
    const total = tools.length * sw + (tools.length - 1) * gap;
    let x = W / 2 - total / 2;
    const y = H - sh - 22 * s;
    const sel = g.toolSel === 'none' ? null : g.toolSel === 'trap' ? 'trap' : g.toolSel === 'slurp' && owns(P, 'slurp') ? 'slurp' : g.toolSel === 'tag' && owns(P, 'tagger') ? 'tag' : g.toolSel === 'cam' && owns(P, 'camera') ? 'cam' : 'net';
    for (const [key, kind, tier, name] of tools) {
      const on = kind === sel && !e.inSub;
      ctx.fillStyle = on ? 'rgba(14,26,28,0.72)' : 'rgba(6,12,14,0.5)';
      ctx.strokeStyle = on ? 'rgba(200,230,215,0.55)' : 'rgba(160,200,200,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y, sw, sh, 6 * s); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = e.inSub ? 0.35 : on ? 1 : 0.55;
      ctx.drawImage(icon(kind, tier), x + 6 * s, y + 4 * s, sw - 12 * s, sh - 12 * s);
      ctx.globalAlpha = 1;
      ctx.font = `500 ${10 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(216,236,230,0.8)'; ctx.fillText(key, x + 5 * s, y + 4 * s);
      if (kind === 'cam') { ctx.textAlign = 'right'; ctx.fillStyle = g.shots ? 'rgba(216,236,230,0.8)' : '#e86a50'; ctx.fillText(`${g.shots}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      if (kind === 'trap') { const free = ownedTraps - g.traps.length; ctx.textAlign = 'right'; ctx.fillStyle = free ? 'rgba(216,236,230,0.8)' : '#e86a50'; ctx.fillText(`${free}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      if (kind === 'tag' && (g.tags.length)) { ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(232,176,42,0.9)'; ctx.fillText(`${g.tags.length}`, x + sw - 5 * s, y + 4 * s); ctx.textAlign = 'left'; }
      // sweep / reload progress along the bottom edge
      if (on && g.capture && g.capture.kind === kind) {
        ctx.fillStyle = 'rgba(200,230,215,0.7)';
        ctx.fillRect(x + 4 * s, y + sh - 4 * s, (sw - 8 * s) * clamp(g.capture.t / g.capture.dur, 0, 1), 2 * s);
      }
      if (on) { ctx.font = `${9 * s}px ${MONO}`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,220,215,0.55)'; ctx.fillText(name.toUpperCase(), x + sw / 2, y + sh + 4 * s); }
      x += sw + gap;
    }
    // specimen slots: the bag (or, in the sub, its tank). Each dot shows the animal's colour,
    // ringed by its condition: green healthy, amber stressed, red weak, grey dead.
    const list = e.inSub ? g.subTank.filter((q) => !q.pressed) : g.bag, slots = e.inSub ? tankSlots(g) : bagSlots(g);
    const pList = e.inSub ? g.subTank.filter((q) => q.pressed) : [], pSlots = e.inSub ? pressSlots(g) : 0;
    const r = 6 * s, step = 17 * s, rowW = (slots + (pSlots ? pSlots + 0.6 : 0)) * step;
    let sx = W / 2 - rowW / 2 + step / 2;
    const sy = y - 16 * s;
    ctx.font = `${9 * s}px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(200,220,215,0.5)'; ctx.fillText(e.inSub ? 'TANK' : 'BAG', sx - step * 0.6 - 2 * s, sy);
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
    const w = 150 * s, h = 70 * s, x0 = rx0 - w, sub = g.sub, W = g.world, now = g.time;
    const P = this.sonarP;
    if (!P || now - P.t > 0.5 || Math.abs(P.x - sub.x) > 4 || Math.abs(P.y - sub.y) > 4) {
      const xs = [], N = 64;
      for (let i = 0; i <= N; i++) { const x = sub.x - 80 + 160 * i / N; xs.push(W.floorAt(Math.max(0, Math.min(2999, x)))); }
      this.sonarP = { t: now, x: sub.x, y: sub.y, fl: xs, below: W.floorAt(sub.x) - sub.y };
    }
    const S = this.sonarP, top = sub.y - 8, span = Math.max(40, Math.min(1500, Math.max(...S.fl) - top + 10));
    const Y = (d) => y0 + 12 * s + (d - top) / span * (h - 14 * s);
    ctx.save();
    ctx.fillStyle = 'rgba(4,20,16,0.6)'; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 5 * s); ctx.fill();
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
    ctx.font = `${10 * s}px ${MONO}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(150,220,180,0.85)';
    ctx.fillText(`bottom ${Math.max(0, Math.round(S.below))} m below`, x0 + 5 * s, y0 + 3 * s);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(150,220,180,0.6)';
    ctx.fillText(`${Math.round(sub.y + S.below)} m`, x0 + w - 5 * s, y0 + h - 13 * s);
    ctx.restore();
  }

  draw(g, dt) {
    const ctx = this.ctx, W = this.c.width, H = this.c.height, s = this.s;
    ctx.clearRect(0, 0, W, H);
    if (g.mode === 'menu') return;
    const e = g.earl, fx = g.fx;
    const dying = g.mode === 'dying';
    const red = dying || false;

    // ---------- depth: the main number, big, top right ----------
    const pad = 26 * s;
    ctx.textBaseline = 'top'; ctx.textAlign = 'right';
    const rx0 = W - pad;
    if (!dying) {
      ctx.font = `500 ${46 * s}px ${MONO}`;
      const dtxt = `${Math.max(0, e.y).toFixed(0)} m`;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(dtxt, rx0 + 2 * s, pad + 2 * s);
      ctx.fillStyle = 'rgba(236,240,240,0.94)'; ctx.fillText(dtxt, rx0, pad);
    }
    // ---------- air: a short, thick, blue tank gauge under it ----------
    const onTank = e.inSub && g.sub.o2 <= 0; // an empty cabin: the gauge shows his own tank
    const o2 = e.inSub && !onTank ? g.sub.o2 / g.sub.o2Max : e.o2 / e.o2Max;
    const bw = 96 * s, bh = 12 * s, bx = rx0 - bw, by = pad + 58 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6 * s); ctx.fill();
    const oc = o2 > 0.25 ? [80, 170, 240] : o2 > 0.1 ? [230, 170, 60] : [225, 55, 45];
    const pulse = o2 < 0.1 ? 0.6 + 0.4 * Math.sin(g.time * 10) : 1;
    ctx.fillStyle = `rgba(${oc[0]},${oc[1]},${oc[2]},${pulse})`;
    ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6 * s); ctx.clip();
    ctx.fillRect(bx, by, bw * clamp(o2, 0, 1), bh);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(bx, by + 1.5 * s, bw * clamp(o2, 0, 1), 3 * s); // a glint along the top
    ctx.restore();
    ctx.strokeStyle = 'rgba(180,215,240,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6 * s); ctx.stroke();
    ctx.font = `500 ${11 * s}px ${MONO}`; ctx.textAlign = 'right';
    if (g.noAir) { ctx.fillStyle = Math.sin(g.time * 9) > 0 ? '#ff5040' : '#a02820'; ctx.fillText('NO AIR', bx - 8 * s, by); }
    else if (onTank) { ctx.fillStyle = '#e8b040'; ctx.fillText('CABIN EMPTY · O₂', bx - 8 * s, by); }
    else { ctx.fillStyle = 'rgba(180,215,240,0.75)'; ctx.fillText(e.inSub ? 'CABIN O₂' : 'O₂', bx - 8 * s, by); }
    let ly = by + bh + 6 * s;
    ctx.font = `${11 * s}px ${MONO}`;
    const left = e.inSub && !onTank ? g.sub.o2 / Math.max(0.0001, g.subDrain) : e.o2 / Math.max(0.0001, g.diverDrain);
    const sec = Math.max(0, Math.floor(left));
    if (g.noAir && !e.atSurface) { ctx.fillStyle = '#ff6a5a'; ctx.fillText((g.noAirRate || 1) > 1.3 ? 'under pressure — surface!' : 'holding your breath — surface!', rx0, ly); ly += 15 * s; }
    else if (e.atSurface && o2 < 0.999) { ctx.fillStyle = 'rgba(180,215,240,0.65)'; ctx.fillText('refilling…', rx0, ly); ly += 15 * s; }
    else if (!e.atSurface && o2 < 0.5) {
      ctx.fillStyle = o2 < 0.25 ? '#e8b040' : 'rgba(180,215,240,0.65)';
      ctx.fillText(sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s of air left` : `${sec} s of air left`, rx0, ly); ly += 15 * s;
    }
    if (!e.atSurface) {
      const parts = [];
      if (e.sprint && e.speedNow > 1) parts.push(`sprinting ×${e.inSub ? 3 : 2}`);
      const press = e.inSub ? 1 : diverDrainMult(e.y, e.pressStart || 300);
      if (press > 1.05) parts.push(`pressure ×${press.toFixed(1)}`);
      if (parts.length) { ctx.fillStyle = '#e8a040'; ctx.fillText(parts.join(' · '), rx0, ly); ly += 15 * s; }
    }
    let yy = ly + 8 * s;
    // hidden: a small leaf
    if (g.concealed) {
      const icx = rx0 - 8 * s, icy = yy + 6 * s;
      ctx.fillStyle = 'rgba(150,200,170,0.8)';
      ctx.beginPath(); ctx.moveTo(icx - 7 * s, icy + 5 * s); ctx.quadraticCurveTo(icx - 6 * s, icy - 7 * s, icx + 7 * s, icy - 6 * s); ctx.quadraticCurveTo(icx + 5 * s, icy + 5 * s, icx - 7 * s, icy + 5 * s); ctx.fill();
      yy += 20 * s;
    }
    // the sub: one line, only inside it
    if (e.inSub) {
      const r = g.sub.y / g.sub.rated, hi = g.sub.hull;
      ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = r > 1 || hi < 0.5 ? (Math.sin(g.time * 8) > 0 ? '#ff4a3a' : '#a02a20') : r > 0.85 || hi < 0.99 ? '#e8b040' : 'rgba(150,210,180,0.8)';
      ctx.fillText(`hull ${Math.round(hi * 100)}%${hi < 0.99 ? ' leaking' : ''}${g.sub.failing != null ? ' · FAILING' : ''} · ${Math.round(g.sub.y)}/${g.sub.rated} m`, rx0, yy);
      yy += 18 * s;
    }
    // the sub on autopilot: where it is and how long it will be
    const ap = g.autopilot;
    if (ap && e.inSub && g.homeRun) {
      ctx.font = `${11 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,214,160,0.85)';
      ctx.fillText(`autopilot home · ${Math.round(ap.remaining || 0)} m · ${Math.ceil(ap.eta || 0)} s · air ×0.8`, rx0, yy);
      yy += 18 * s;
    }
    if (ap && !e.inSub && !g.sub.imploded && (ap.active || ap.state === 'waiting')) {
      const dsub = Math.hypot(g.sub.x - e.x, g.sub.y - e.y);
      let txt;
      if (ap.state === 'home') txt = `sub returning · ${Math.round(Math.hypot(g.sub.x - (BOAT.x + 8.5), g.sub.y - 2.6))} m`;
      else if (ap.holding && ap.remaining < 3) txt = `sub holding at ${Math.round(g.sub.y)} m · rated depth`;
      else if (ap.state === 'waiting') txt = `sub waiting · ${Math.round(dsub)} m`;
      else txt = `sub coming · ${Math.round(dsub)} m · ${Math.ceil(ap.eta || 0)} s`;
      ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = ap.holding ? '#e8b040' : 'rgba(232,214,160,0.85)';
      ctx.fillText(txt, rx0, yy);
      yy += 18 * s;
    }
    // sonar: small, always there
    const rr = 36 * s, rcx = rx0 - rr, rcy = yy + rr;
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
    ctx.strokeStyle = 'rgba(160,200,200,0.2)'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.stroke();
    yy = rcy + rr + 10 * s;
    // the seafloor sonar (a fitted extra): the bottom below and around the sub, 160 m across
    if (e.inSub && g.addons && g.addons.sonar && !dying && !g.sub.imploded) { this.drawSonar(ctx, g, rx0, yy, s); yy += 82 * s; }
    // journal: a small book button
    const jw = 26 * s, jh = 22 * s, jx = rx0 - jw, jy = yy;
    const kx = window.innerWidth / W;
    this.journalHot = { x: jx * kx, y: jy * kx, w: jw * kx, h: jh * kx };
    ctx.fillStyle = 'rgba(30,26,20,0.6)'; ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 4 * s); ctx.fill();
    ctx.fillStyle = '#6a4a2e'; ctx.fillRect(jx + 6 * s, jy + 4 * s, 14 * s, 14 * s);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(jx + 8 * s, jy + 5.5 * s, 10 * s, 11 * s);
    ctx.font = `${10 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,220,192,0.5)'; ctx.textAlign = 'right'; ctx.fillText('J', jx - 5 * s, jy + 6 * s);

    // ---------- the sub: a button for C (call it to you, or the autopilot home) ----------
    yy = jy + jh + 10 * s;
    this.subHot = null;
    if (!g.sub.imploded && !dying) {
      const ap = g.autopilot;
      const label = e.inSub ? (g.homeRun ? 'autopilot off' : g.sub.docked ? null : 'autopilot home') : (ap && ap.state === 'coming' ? 'stop sub' : 'call sub');
      if (label) {
        // bottom-right corner, a little larger
        ctx.font = `${15 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const bw = ctx.measureText(label).width + 50 * s, bh = 31 * s, bx = rx0 - bw, by = H - pad - bh;
        this.subHot = { x: bx * kx, y: by * kx, w: bw * kx, h: bh * kx };
        const on = g.homeRun || (ap && ap.state === 'coming');
        ctx.fillStyle = on ? 'rgba(60,52,24,0.7)' : 'rgba(6,12,14,0.55)'; ctx.strokeStyle = on ? 'rgba(232,214,160,0.5)' : 'rgba(160,200,200,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7 * s); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(232,214,160,0.9)'; ctx.font = `500 ${14 * s}px ${MONO}`; ctx.fillText('C', bx + 11 * s, by + bh / 2);
        ctx.fillStyle = 'rgba(220,236,230,0.85)'; ctx.font = `${15 * s}px ${MONO}`; ctx.fillText(label, bx + 33 * s, by + bh / 2);
        ctx.textBaseline = 'top';
      }
    }

    // ---------- Q / E items: in the right-hand column, only when carried ----------
    const glass = (x, y, w, h) => { ctx.fillStyle = 'rgba(6,12,14,0.55)'; ctx.strokeStyle = 'rgba(160,200,200,0.14)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8 * s); ctx.fill(); ctx.stroke(); };
    const sz = 46 * s;
    const slots = [];
    if (g.items.lure > 0 || g.lure) slots.push(['q', 'Q', 'LURE', g.items.lure, '#bfeaff', g.lure ? g.entity.lureT / 10 : 0]);
    if (e.inSub && (g.items.airTank > 0 || g.tankFit)) slots.push(['r', 'R', 'AIR TANK', g.items.airTank, '#9fd4ff', g.tankFit ? g.tankFit / 3 : 0]);
    if (e.inSub && (g.items.sealant > 0 || g.seal)) slots.push(['k', 'K', 'SEALANT', g.items.sealant, '#e8c070', g.seal ? g.seal / 6 : 0]);
    if (!e.inSub && g.items.plate > 0 && g.sub.hull < 0.995) slots.push(['z', 'Z', 'PATCH PLATE', g.items.plate, '#b8c4cc', g.weld ? g.weld / 10 : 0]);
    if (g.items.necklace > 0 || g.necklaceT > 0) slots.push(['e', 'E', 'NECKLACE', g.items.necklace, '#f0dcb0', g.necklaceT > 0 ? g.necklaceT / 15 : 0]);
    this.slotHot = {};
    slots.forEach(([id, key, name, n, col, active], i) => {
      const x = rx0 - sz, y = yy + i * (sz + 8 * s);
      this.slotHot[id] = { x: x * kx, y: y * kx, w: sz * kx, h: sz * kx };
      glass(x, y, sz, sz);
      ctx.fillStyle = col; ctx.globalAlpha = n > 0 ? 1 : 0.3;
      ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.52, 8 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (active > 0) { ctx.strokeStyle = col; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.52, 13 * s, -Math.PI / 2, -Math.PI / 2 + TAU * active); ctx.stroke(); }
      ctx.font = `500 ${10 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6'; ctx.textAlign = 'left'; ctx.fillText(key, x + 5 * s, y + 4 * s);
      ctx.textAlign = 'right'; ctx.fillText(`×${n}`, x + sz - 5 * s, y + 4 * s);
      ctx.font = `${8 * s}px ${MONO}`; ctx.fillStyle = 'rgba(200,220,215,0.55)'; ctx.fillText(name, x - 6 * s, y + sz / 2 - 4 * s);
    });

    // ---------- P: frames per second, the picture's resolution, and whether lite mode is on ----------
    if (this.showFps) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = 'rgba(200,225,215,0.75)';
      ctx.fillText(`${Math.round(this.fps || 0)} fps · ${Math.round(Math.min(1, (this.quality ?? 1) * Math.min(window.devicePixelRatio || 1, 1.25)) * 100)} % sharp${this.lite ? ' · lite' : ''}`, pad, H - pad * 0.4);
    }
    // ---------- cash, top left: what is safe at the boat, and what is in the bag ----------
    if (g.profile && !dying) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = `500 ${20 * s}px ${MONO}`;
      const ctxt = money(g.profile.cash);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(ctxt, pad + 1.5 * s, pad + 1.5 * s);
      ctx.fillStyle = 'rgba(220,236,214,0.9)'; ctx.fillText(ctxt, pad, pad);
      let carried = 0;
      for (const [k, n] of Object.entries(g.inv)) if (n > 0 && GOODS[k]) carried += GOODS[k].price * n;
      if (carried > 0) {
        ctx.font = `${11 * s}px ${MONO}`; ctx.fillStyle = 'rgba(200,220,215,0.6)';
        ctx.fillText(`+ about ${money(carried, carried < 100)} unsold`, pad, pad + 27 * s);
      }
      if ((g.loadKg || 0) > 5 && !e.inSub) {
        ctx.font = `${11 * s}px ${MONO}`;
        ctx.fillStyle = g.loadKg > 10 ? '#e8b040' : 'rgba(200,220,215,0.6)';
        ctx.fillText(`load ${Math.round(g.loadKg)} kg${g.loadKg > 10 ? ' · heavy' : ''}`, pad, pad + (carried > 0 ? 43 : 27) * s);
      }
    }

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
    // "Space  Net the x" is drawn as "[Space] " then "net the x" in italics, centred as one line
    const keyLine = (txt, cx, y, px) => {
      const m = /^Space\s+(.*)$/.exec(txt);
      if (!m) { ctx.font = `${px}px ${GAME}`; ctx.textAlign = 'center'; ctx.fillText(txt, cx, y); return; }
      const k = '[Space] ', rest = m[1].charAt(0).toLowerCase() + m[1].slice(1);
      ctx.font = `${px}px ${GAME}`; const kw = ctx.measureText(k).width;
      ctx.font = `italic ${px}px ${GAME}`; const rw = ctx.measureText(rest).width;
      const x0 = cx - (kw + rw) / 2; ctx.textAlign = 'left';
      ctx.font = `${px}px ${GAME}`; ctx.fillText(k, x0, y);
      ctx.font = `italic ${px}px ${GAME}`; ctx.fillText(rest, x0 + kw, y);
      ctx.textAlign = 'center';
    };
    const keyWidth = (txt, px) => { ctx.font = `italic ${px}px ${GAME}`; return ctx.measureText(txt.replace(/^Space\s+/, '[Space] ')).width; };
    if (!this.hints && !dying && !g.kill) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `${16 * s}px ${GAME}`;
      const lines = [];
      if (g.capPrompt && g.capPrompt.startsWith('Space')) lines.push(short(g.capPrompt));
      if (g.prompt) lines.push(short(g.prompt));
      const capFirst = g.capPrompt && g.capPrompt.startsWith('Space');
      lines.forEach((ln, i) => {
        const draw = i === 0 && capFirst ? (t, x, y) => keyLine(t, x, y, 16 * s) : (t, x, y) => ctx.fillText(t, x, y);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; draw(ln, W / 2 + 1, H * 0.74 + i * 18 * s + 1);
        ctx.fillStyle = i === 0 && capFirst && g.capRarity ? g.capRarity.col : 'rgba(232,238,234,0.78)'; draw(ln, W / 2, H * 0.74 + i * 18 * s);
        ctx.font = `${16 * s}px ${GAME}`;
      });
    }
    if (g.capPrompt && !dying && !g.kill && this.hints) {
      ctx.font = `${17 * s}px ${GAME}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const tw = keyWidth(g.capPrompt, 17 * s) + 26 * s, py = H * 0.72 - (g.prompt ? 36 : 0) * s;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, py, tw, 28 * s, 6 * s); ctx.fill();
      ctx.fillStyle = g.capPrompt.startsWith('Space') ? (g.capRarity ? g.capRarity.col : 'rgba(214,236,206,0.95)') : 'rgba(240,190,160,0.9)';
      keyLine(g.capPrompt, W / 2, py + 7 * s, 17 * s);
    }
    // ---------- interaction prompt ----------
    if (g.prompt && !dying && !g.kill && this.hints) {
      ctx.font = `${18 * s}px ${GAME}`; ctx.textAlign = 'center';
      const tw = ctx.measureText(g.prompt).width + 30 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.roundRect(W / 2 - tw / 2, H * 0.72, tw, 30 * s, 6 * s); ctx.fill();
      ctx.fillStyle = 'rgba(236,240,236,0.92)'; ctx.fillText(g.prompt, W / 2, H * 0.72 + 7 * s);
    }
    // ---------- toasts ----------
    ctx.textAlign = 'center';
    for (let i = 0; i < this.toasts.length; i++) {
      const tt = this.toasts[i];
      tt.t += dt;
      const a = clamp(Math.min(tt.t * 3, (4.5 - tt.t) * 1.5), 0, 1);
      ctx.font = `${(tt.kind === 'big' ? 24 : 18) * s}px ${GAME}`;
      if (tt.kind.startsWith('rar:')) { ctx.globalAlpha = a; ctx.fillStyle = tt.kind.slice(4); }
      else ctx.fillStyle = tt.kind === 'warn' ? `rgba(255,150,110,${a})` : tt.kind === 'note' ? `rgba(240,226,190,${a})` : `rgba(230,238,236,${a})`;
      ctx.fillText(tt.text, W / 2, pad + 6 * s + i * 26 * s); ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    this.toasts = this.toasts.filter((tt) => tt.t < 4.5);

    // ---------- in its grip: what can still get him free, and how little time is left ----------
    const K = g.kill;
    if (K && K.window && !K.esc && K.t > K.window[0] && K.t < K.window[1] && g.mode === 'play') {
      const opts = [];
      if (!g.entity.flashed) opts.push(['L', 'FLASH IT']);
      if (g.items.lure > 0 || (g.profile.oldLures || 0) > 0) opts.push(['Q', 'LURE']);
      if (g.items.necklace > 0) opts.push(['E', 'NECKLACE']);
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
