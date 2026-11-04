// HUD drawn on its own canvas (not affected by the dread filters):
// survival timer + oxygen bar (top right), the right-hand dive monitor
// (depth, radar, heart rate, journal), item slots and prompts.
import { clamp, lerp, formatTime, TAU } from './util.js';
import { SUB_LEVELS, diverDrainMult } from './player.js';
import { RESOURCES } from './world.js';

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace';

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
  toast(text, kind = '') { this.toasts.push({ text, kind, t: 0 }); if (this.toasts.length > 4) this.toasts.shift(); }

  draw(g, dt) {
    const ctx = this.ctx, W = this.c.width, H = this.c.height, s = this.s;
    ctx.clearRect(0, 0, W, H);
    if (g.mode === 'menu') return;
    const e = g.earl, fx = g.fx;
    const dying = g.mode === 'dying';
    const red = dying || false;

    // ---------- survival timer + oxygen (top right) ----------
    const pad = 26 * s;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.font = `500 ${40 * s}px ${MONO}`;
    let shown = g.survival;
    let col = 'rgba(236,240,240,0.92)';
    if (dying) { col = '#d8241e'; shown = g.survival + g.deathT; }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(formatTime(shown), W - pad + 2 * s, pad + 2 * s);
    ctx.fillStyle = col; ctx.fillText(formatTime(shown), W - pad, pad);
    // ---------- air: a slim bar; details only when they matter ----------
    const o2 = e.inSub ? g.sub.o2 / g.sub.o2Max : e.o2 / e.o2Max;
    const bw = 150 * s, bh = 5 * s, bx = W - pad - bw, by = pad + 50 * s;
    const bar = Math.max(0, Math.round(200 * clamp(o2, 0, 1)));
    ctx.font = `500 ${11 * s}px ${MONO}`; ctx.textAlign = 'right';
    if (g.noAir) { ctx.fillStyle = Math.sin(g.time * 9) > 0 ? '#ff5040' : '#a02820'; ctx.fillText(e.inSub ? 'CABIN: NO AIR' : 'NO AIR', bx - 8 * s, by - 3 * s); }
    else { ctx.fillStyle = 'rgba(220,230,232,0.7)'; ctx.fillText(`${e.inSub ? 'CABIN' : 'AIR'} ${bar}`, bx - 8 * s, by - 3 * s); }
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx, by, bw, bh);
    const oc = o2 > 0.5 ? [86, 200, 120] : o2 > 0.1 ? [lerp(230, 86, (o2 - 0.1) / 0.4), lerp(190, 200, (o2 - 0.1) / 0.4), 70] : [220, 50, 40];
    const pulse = o2 < 0.1 ? 0.6 + 0.4 * Math.sin(g.time * 10) : 1;
    ctx.fillStyle = `rgba(${oc[0] | 0},${oc[1] | 0},${oc[2] | 0},${pulse})`;
    ctx.fillRect(bx, by, bw * clamp(o2, 0, 1), bh);
    let ly = by + bh + 5 * s;
    ctx.font = `${11 * s}px ${MONO}`;
    const left = e.inSub ? g.sub.o2 / Math.max(0.0001, g.subDrain) : e.o2 / Math.max(0.0001, g.diverDrain);
    const sec = Math.max(0, Math.floor(left));
    if (g.noAir && !e.atSurface) { ctx.fillStyle = '#ff6a5a'; ctx.fillText((g.noAirRate || 1) > 1.3 ? 'under pressure — surface!' : 'holding your breath — surface!', W - pad, ly); ly += 15 * s; }
    else if (e.atSurface && o2 < 0.999) { ctx.fillStyle = 'rgba(220,230,232,0.6)'; ctx.fillText('refilling…', W - pad, ly); ly += 15 * s; }
    else if (!e.atSurface && o2 < 0.5) {
      ctx.fillStyle = o2 < 0.25 ? '#e8b040' : 'rgba(220,230,232,0.6)';
      ctx.fillText(sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s of air left` : `${sec} s of air left`, W - pad, ly); ly += 15 * s;
    }
    if (!e.atSurface) {
      const parts = [];
      if (e.sprint && e.speedNow > 1) parts.push(`sprinting ×${e.inSub ? 3 : 2}`);
      const press = e.inSub ? 1 : diverDrainMult(e.y);
      if (press > 1.05) parts.push(`pressure ×${press.toFixed(1)}`);
      if (parts.length) { ctx.fillStyle = '#e8a040'; ctx.fillText(parts.join(' · '), W - pad, ly); ly += 15 * s; }
    }

    // ---------- a compact strip down the right edge ----------
    const rx0 = W - pad;
    let yy = Math.max(ly + 10 * s, by + 34 * s);
    // depth, with small status icons beside it
    ctx.textAlign = 'right'; ctx.font = `500 ${22 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6';
    ctx.fillText(`${Math.max(0, e.y).toFixed(0)} m`, rx0, yy);
    const dw = ctx.measureText(`${Math.max(0, e.y).toFixed(0)} m`).width;
    let icx = rx0 - dw - 18 * s;
    const icy = yy + 12 * s;
    if (g.entity && g.entity.marked) {
      // an eye: dims a step with each good deed
      const calm = clamp((g.entity.calm || 0) / 60, 0, 1);
      const a = (0.95 - calm * 0.6) * (0.75 + 0.25 * Math.sin(g.time * 2));
      ctx.fillStyle = `rgba(230,70,60,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.ellipse(icx, icy, 9 * s, 5 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(10,0,0,0.9)'; ctx.beginPath(); ctx.ellipse(icx, icy, 6 * s, 1.4 * s, 0, 0, TAU); ctx.fill();
      icx -= 24 * s;
    } else if (g.concealed) {
      // a leaf: hidden
      ctx.fillStyle = 'rgba(150,200,170,0.8)';
      ctx.beginPath(); ctx.moveTo(icx - 7 * s, icy + 5 * s); ctx.quadraticCurveTo(icx - 6 * s, icy - 7 * s, icx + 7 * s, icy - 6 * s); ctx.quadraticCurveTo(icx + 5 * s, icy + 5 * s, icx - 7 * s, icy + 5 * s); ctx.fill();
      icx -= 24 * s;
    }
    yy += 32 * s;
    // heart: a small icon that beats at the heart rate, and the number
    this.beatPhase += dt * e.hr / 60;
    const ph = this.beatPhase % 1, beat = ph < 0.12 ? 1 + 0.25 * Math.sin(ph / 0.12 * Math.PI) : 1;
    const hcol = e.hr > 140 ? '#ff6a5a' : e.hr > 100 ? '#e8b060' : 'rgba(220,120,120,0.85)';
    ctx.font = `500 ${13 * s}px ${MONO}`; ctx.fillStyle = e.hr > 100 ? hcol : 'rgba(216,236,230,0.85)';
    ctx.fillText(`${Math.round(e.hr)}`, rx0, yy + 2 * s);
    const hx = rx0 - ctx.measureText(`${Math.round(e.hr)}`).width - 13 * s, hy = yy + 9 * s, hs = 5 * s * beat;
    ctx.fillStyle = hcol;
    ctx.beginPath(); ctx.moveTo(hx, hy + hs * 1.1);
    ctx.bezierCurveTo(hx - hs * 1.6, hy, hx - hs * 1.1, hy - hs * 1.2, hx, hy - hs * 0.4);
    ctx.bezierCurveTo(hx + hs * 1.1, hy - hs * 1.2, hx + hs * 1.6, hy, hx, hy + hs * 1.1); ctx.fill();
    yy += 26 * s;
    // the sub: one line, only inside it
    if (e.inSub) {
      const r = g.sub.y / g.sub.rated, hi = g.sub.hull;
      ctx.font = `${11 * s}px ${MONO}`;
      ctx.fillStyle = r > 1 || hi < 0.5 ? (Math.sin(g.time * 8) > 0 ? '#ff4a3a' : '#a02a20') : r > 0.85 || hi < 0.99 ? '#e8b040' : 'rgba(150,210,180,0.8)';
      ctx.fillText(`hull ${Math.round(hi * 100)}%${hi < 0.99 ? ' leaking' : ''} · ${Math.round(g.sub.y)}/${g.sub.rated} m`, rx0, yy);
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
    ctx.restore();
    ctx.fillStyle = 'rgba(216,236,230,0.8)'; ctx.beginPath(); ctx.arc(rcx, rcy, 1.6 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,200,0.2)'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.stroke();
    yy = rcy + rr + 10 * s;
    // journal: a small book button
    const jw = 26 * s, jh = 22 * s, jx = rx0 - jw, jy = yy;
    const kx = window.innerWidth / W;
    this.journalHot = { x: jx * kx, y: jy * kx, w: jw * kx, h: jh * kx };
    ctx.fillStyle = 'rgba(30,26,20,0.6)'; ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 4 * s); ctx.fill();
    ctx.fillStyle = '#6a4a2e'; ctx.fillRect(jx + 6 * s, jy + 4 * s, 14 * s, 14 * s);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(jx + 8 * s, jy + 5.5 * s, 10 * s, 11 * s);
    ctx.font = `${10 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,220,192,0.5)'; ctx.textAlign = 'right'; ctx.fillText('J', jx - 5 * s, jy + 6 * s);

    // ---------- items (bottom left): only what you are carrying or using ----------
    const glass = (x, y, w, h) => { ctx.fillStyle = 'rgba(6,12,14,0.55)'; ctx.strokeStyle = 'rgba(160,200,200,0.14)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8 * s); ctx.fill(); ctx.stroke(); };
    const sz = 56 * s, by2 = H - pad - sz;
    const slots = [];
    if (g.items.lure > 0 || g.lure) slots.push(['q', 'Q', 'LURE', g.items.lure, '#bfeaff', g.lure ? g.entity.lureT / 10 : 0]);
    if (g.items.necklace > 0 || g.necklaceT > 0) slots.push(['e', 'E', 'NECKLACE', g.items.necklace, '#f0dcb0', g.necklaceT > 0 ? g.necklaceT / 15 : 0]);
    this.slotHot = {};
    slots.forEach(([id, key, name, n, col, active], i) => {
      const x = pad + i * (sz + 8 * s), y = by2;
      this.slotHot[id] = { x: x * kx, y: y * kx, w: sz * kx, h: sz * kx };
      glass(x, y, sz, sz);
      ctx.fillStyle = col; ctx.globalAlpha = n > 0 ? 1 : 0.3;
      ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.48, 9 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (active > 0) { ctx.strokeStyle = col; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x + sz / 2, y + sz * 0.48, 14 * s, -Math.PI / 2, -Math.PI / 2 + TAU * active); ctx.stroke(); }
      ctx.font = `500 ${11 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6'; ctx.textAlign = 'left'; ctx.fillText(key, x + 6 * s, y + 5 * s);
      ctx.textAlign = 'right'; ctx.fillText(`×${n}`, x + sz - 6 * s, y + 5 * s);
      ctx.textAlign = 'center'; ctx.font = `${8 * s}px ${MONO}`; ctx.fillStyle = 'rgba(200,220,215,0.55)'; ctx.fillText(name, x + sz / 2, y + sz - 13 * s);
    });

    // ---------- interaction prompt ----------
    if (g.prompt && !dying) {
      ctx.font = `${15 * s}px ${MONO}`; ctx.textAlign = 'center';
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
      ctx.font = `${(tt.kind === 'big' ? 22 : 15) * s}px ${tt.kind === 'note' ? '"EB Garamond", Georgia, serif' : MONO}`;
      ctx.fillStyle = tt.kind === 'warn' ? `rgba(255,150,110,${a})` : tt.kind === 'note' ? `rgba(240,226,190,${a})` : `rgba(230,238,236,${a})`;
      ctx.fillText(tt.text, W / 2, pad + 6 * s + i * 26 * s);
    }
    this.toasts = this.toasts.filter((tt) => tt.t < 4.5);

    // ---------- death: everything but the red timer fades to black ----------
    const bleedOut = dying && g.deathKind === 'injury';
    if (dying) {
      ctx.fillStyle = bleedOut ? `rgba(26,0,0,${clamp(g.deathT / 3, 0, 1).toFixed(3)})` : `rgba(0,0,0,${clamp(g.deathT / 2.2, 0, 1).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `500 ${40 * s}px ${MONO}`;
      ctx.fillStyle = '#d8241e'; ctx.fillText(formatTime(g.survival + g.deathT), W - pad, pad);
      ctx.font = `${13 * s}px ${MONO}`; ctx.fillStyle = `rgba(216,36,30,${clamp(g.deathT - 0.5, 0, 0.8).toFixed(3)})`;
      ctx.fillText(g.deathCause || '', W - pad, pad + 50 * s);
    }
    // ---------- death countdown ----------
    if (dying && !bleedOut && g.deathT > 0) {
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
