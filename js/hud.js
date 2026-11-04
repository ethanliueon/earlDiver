// HUD drawn on its own canvas (not affected by the dread filters):
// survival timer + oxygen bar (top right), the right-hand dive monitor
// (depth, radar, heart rate, journal), item slots and prompts.
import { clamp, lerp, formatTime, TAU } from './util.js';
import { SUB_LEVELS } from './player.js';
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
    // O2 bar
    const o2 = e.inSub ? g.sub.o2 / g.sub.o2Max : e.o2 / e.o2Max;
    const bw = 210 * s, bh = 9 * s, bx = W - pad - bw, by = pad + 52 * s;
    ctx.font = `500 ${12 * s}px ${MONO}`;
    ctx.fillStyle = 'rgba(220,230,232,0.75)';
    // air shown the way divers read it: cylinder pressure in bar (200 full, 50 reserve)
    const bar = Math.max(0, Math.round(200 * clamp(o2, 0, 1)));
    if (g.noAir) { ctx.fillStyle = Math.sin(g.time * 9) > 0 ? '#ff5040' : '#a02820'; ctx.fillText(e.inSub ? 'CABIN: NO AIR' : 'NO AIR', bx - 8 * s, by - 2 * s); }
    else ctx.fillText(e.inSub ? `CABIN O₂  ${bar} bar` : `AIR  ${bar} bar`, bx - 8 * s, by - 2 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(bx, by, bw, bh);
    const oc = o2 > 0.5 ? [86, 200, 120] : o2 > 0.1 ? [lerp(230, 86, (o2 - 0.1) / 0.4), lerp(190, 200, (o2 - 0.1) / 0.4), 70] : [220, 50, 40];
    const pulse = o2 < 0.1 ? 0.6 + 0.4 * Math.sin(g.time * 10) : 1;
    ctx.fillStyle = `rgba(${oc[0] | 0},${oc[1] | 0},${oc[2] | 0},${pulse})`;
    ctx.fillRect(bx, by, bw * clamp(o2, 0, 1), bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    // oxygen time left at current drain
    ctx.font = `${11 * s}px ${MONO}`; ctx.fillStyle = 'rgba(220,230,232,0.6)';
    const left = e.inSub ? g.sub.o2 / Math.max(0.0001, g.subDrain) : e.o2 / Math.max(0.0001, g.diverDrain);
    // how long the air lasts at the current rate of use, in plain words, counting down
    const sec = Math.max(0, Math.floor(left));
    const leftTxt = sec >= 3600 ? 'plenty of air' : sec >= 60 ? `${Math.floor(sec / 60)} min ${sec % 60} s of air left` : `${sec} s of air left`;
    if (g.noAir && !e.atSurface) { ctx.fillStyle = '#ff6a5a'; ctx.fillText('holding your breath — surface!', W - pad, by + bh + 5 * s); }
    else ctx.fillText(e.atSurface ? (o2 < 0.999 ? 'refilling…' : 'tank full') : leftTxt, W - pad, by + bh + 5 * s);
    if (!e.atSurface && o2 < 0.25 && o2 >= 0.1) { ctx.fillStyle = '#e8b040'; ctx.textAlign = 'left'; ctx.fillText('RESERVE', bx, by + bh + 5 * s); ctx.textAlign = 'right'; }
    if (g.diverDrain > 1.5 && !e.inSub && !e.atSurface) { ctx.fillStyle = '#e8a040'; ctx.fillText(`pressure: air going ${g.diverDrain.toFixed(1)}× faster`, W - pad, by + bh + 20 * s); }

    // ---------- dive monitor (right) ----------
    const mw = 188 * s, mh = 470 * s, mx = W - pad - mw, my = by + 50 * s;
    const glass = (x, y, w, h) => {
      ctx.fillStyle = 'rgba(6,12,14,0.62)'; ctx.strokeStyle = 'rgba(160,200,200,0.16)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 8 * s); ctx.fill(); ctx.stroke();
    };
    glass(mx, my, mw, mh);
    const label = (txt, x, y) => { ctx.font = `${10 * s}px ${MONO}`; ctx.fillStyle = 'rgba(150,190,185,0.65)'; ctx.textAlign = 'left'; ctx.fillText(txt, x, y); };
    const ix = mx + 14 * s;
    let yy = my + 12 * s;
    // depth
    label('DEPTH', ix, yy);
    ctx.font = `500 ${28 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6'; ctx.textAlign = 'left';
    ctx.fillText(`${Math.max(0, e.y).toFixed(0)} m`, ix, yy + 14 * s);
    ctx.font = `${10 * s}px ${MONO}`; ctx.fillStyle = 'rgba(180,210,205,0.55)';
    ctx.fillText(`max ${e.maxDepth.toFixed(0)} m`, ix + 110 * s, yy + 30 * s);
    if (g.concealed) { ctx.fillStyle = 'rgba(150,200,170,0.75)'; ctx.fillText('CONCEALED', ix + 110 * s, yy + 2 * s); }
    yy += 56 * s;
    if (e.inSub) {
      label('HULL', ix, yy);
      const r = g.sub.y / g.sub.rated;
      ctx.font = `${12 * s}px ${MONO}`;
      ctx.fillStyle = r > 1 ? (Math.sin(g.time * 8) > 0 ? '#ff4a3a' : '#a02a20') : r > 0.85 ? '#e8b040' : '#8ad0a0';
      ctx.fillText(`${(r * 100).toFixed(0)}% of ${g.sub.rated} m`, ix, yy + 13 * s);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ix, yy + 30 * s, mw - 28 * s, 5 * s);
      ctx.fillStyle = r > 1 ? '#ff4a3a' : r > 0.85 ? '#e8b040' : '#6ab890';
      ctx.fillRect(ix, yy + 30 * s, (mw - 28 * s) * clamp(r / 1.3, 0, 1), 5 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(ix + (mw - 28 * s) / 1.3, yy + 27 * s, 1, 11 * s);
      yy += 46 * s;
      label('INTEGRITY', ix, yy);
      const hi = g.sub.hull;
      ctx.font = `${12 * s}px ${MONO}`; ctx.textAlign = 'right';
      ctx.fillStyle = hi < 0.5 ? '#ff6a5a' : hi < 0.99 ? '#e8b040' : '#8ad0a0';
      ctx.fillText(`${Math.round(hi * 100)} %${hi < 0.99 ? '  LEAKING' : ''}`, mx + mw - 14 * s, yy - 1 * s);
      ctx.textAlign = 'left';
      yy += 18 * s;
    }
    // radar
    label('SONAR · 200 m', ix, yy);
    const rr = 74 * s, rcx = mx + mw / 2, rcy = yy + 16 * s + rr;
    ctx.save();
    ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.fillStyle = 'rgba(4,20,16,0.85)'; ctx.fill();
    ctx.clip();
    ctx.strokeStyle = 'rgba(80,200,150,0.18)'; ctx.lineWidth = 1;
    for (const k of [0.33, 0.66, 1]) { ctx.beginPath(); ctx.arc(rcx, rcy, rr * k, 0, TAU); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(rcx - rr, rcy); ctx.lineTo(rcx + rr, rcy); ctx.moveTo(rcx, rcy - rr); ctx.lineTo(rcx, rcy + rr); ctx.stroke();
    this.sweep = (this.sweep + dt * 1.6) % TAU;
    const sg = ctx.createConicGradient ? ctx.createConicGradient(this.sweep - 0.9, rcx, rcy) : null;
    if (sg) { sg.addColorStop(0, 'rgba(80,220,160,0)'); sg.addColorStop(0.14, 'rgba(80,220,160,0.28)'); sg.addColorStop(0.145, 'rgba(80,220,160,0)'); ctx.fillStyle = sg; ctx.fillRect(rcx - rr, rcy - rr, rr * 2, rr * 2); }
    // blip
    const ent = g.entity;
    if (ent && ent.dist < 200 && !dying) {
      const a = Math.atan2(ent.y - e.y, ent.x - e.x);
      let da = ((this.sweep - a) % TAU + TAU) % TAU;
      if (da < dt * 1.7 + 0.001) { this.blip = { a, d: ent.dist, life: 1 }; g.audio && g.audio.sonar(0.03 + fx.dread * 0.04); }
    }
    if (this.blip) {
      this.blip.life -= dt * 0.45;
      if (this.blip.life <= 0) this.blip = null;
      else {
        const r = (this.blip.d / 200) * rr;
        const bxp = rcx + Math.cos(this.blip.a) * r, byp = rcy + Math.sin(this.blip.a) * r;
        const bg2 = ctx.createRadialGradient(bxp, byp, 0, bxp, byp, 9 * s);
        bg2.addColorStop(0, `rgba(255,90,70,${this.blip.life})`); bg2.addColorStop(1, 'rgba(255,90,70,0)');
        ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bxp, byp, 9 * s, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    ctx.fillStyle = '#d8ece6'; ctx.beginPath(); ctx.arc(rcx, rcy, 2.2 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(160,200,200,0.25)'; ctx.beginPath(); ctx.arc(rcx, rcy, rr, 0, TAU); ctx.stroke();
    yy = rcy + rr + 14 * s;
    // heart rate
    label('HEART', ix, yy);
    ctx.font = `500 ${22 * s}px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillStyle = e.hr > 140 ? '#ff6a5a' : e.hr > 100 ? '#e8b060' : '#d8ece6';
    ctx.fillText(`${Math.round(e.hr)}`, mx + mw - 14 * s, yy - 4 * s);
    ctx.font = `${10 * s}px ${MONO}`; ctx.fillStyle = 'rgba(180,210,205,0.55)'; ctx.fillText('BPM', mx + mw - 14 * s, yy + 20 * s);
    // ECG trace
    this.ecgT += dt;
    this.beatPhase += dt * e.hr / 60;
    const step = 1 / 60;
    while (this.ecgT > step) {
      this.ecgT -= step;
      const p = this.beatPhase % 1;
      let v = 0;
      if (p < 0.04) v = Math.sin(p / 0.04 * Math.PI) * 0.15;
      else if (p > 0.1 && p < 0.13) v = -0.25;
      else if (p >= 0.13 && p < 0.16) v = 1;
      else if (p >= 0.16 && p < 0.19) v = -0.4;
      else if (p > 0.3 && p < 0.42) v = Math.sin((p - 0.3) / 0.12 * Math.PI) * 0.25;
      this.ecg.push(v + (Math.random() - 0.5) * 0.04 * (1 + fx.dread * 3)); this.ecg.shift();
    }
    const ex0 = ix, ey0 = yy + 50 * s, ew = mw - 28 * s;
    ctx.strokeStyle = e.hr > 140 ? 'rgba(255,110,90,0.9)' : 'rgba(110,230,170,0.85)'; ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    for (let i = 0; i < this.ecg.length; i++) ctx.lineTo(ex0 + (i / (this.ecg.length - 1)) * ew, ey0 - this.ecg[i] * 20 * s);
    ctx.stroke();
    yy = ey0 + 30 * s;
    // journal icon
    const jx = ix, jy = yy, jw = mw - 28 * s, jh = 36 * s;
    this.journalHot = { x: jx / (W / window.innerWidth), y: jy / (H / window.innerHeight), w: jw / (W / window.innerWidth), h: jh / (H / window.innerHeight) };
    ctx.fillStyle = 'rgba(30,26,20,0.75)'; ctx.strokeStyle = 'rgba(200,180,140,0.35)';
    ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 6 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6a4a2e'; ctx.fillRect(jx + 10 * s, jy + 8 * s, 16 * s, 20 * s);
    ctx.fillStyle = '#d8c8a0'; ctx.fillRect(jx + 12 * s, jy + 10 * s, 12 * s, 16 * s);
    ctx.font = `${12 * s}px ${MONO}`; ctx.textAlign = 'left'; ctx.fillStyle = '#e8dcc0';
    ctx.fillText(`Journal ${g.journal.size}`, jx + 34 * s, jy + 11 * s);
    ctx.font = `${10 * s}px ${MONO}`; ctx.fillStyle = 'rgba(232,220,192,0.5)'; ctx.textAlign = 'right'; ctx.fillText('J', jx + jw - 10 * s, jy + 12 * s); ctx.textAlign = 'left';
    yy = jy + jh + 12 * s;
    // sapphires
    label('SAPPHIRES', ix, yy);
    for (let k = 0; k < 8; k++) {
      const sx = ix + k * 20 * s, sy = yy + 16 * s;
      ctx.fillStyle = k < g.sapphires ? '#3a6ae8' : 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.moveTo(sx + 6 * s, sy); ctx.lineTo(sx + 12 * s, sy + 5 * s); ctx.lineTo(sx + 6 * s, sy + 12 * s); ctx.lineTo(sx, sy + 5 * s); ctx.closePath(); ctx.fill();
    }

    // ---------- items (bottom left) ----------
    const slot = (x, y, key, name, n, col, active) => {
      glass(x, y, 74 * s, 74 * s);
      ctx.fillStyle = col; ctx.globalAlpha = n > 0 ? 1 : 0.25;
      ctx.beginPath(); ctx.arc(x + 37 * s, y + 34 * s, 12 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      if (active > 0) { ctx.strokeStyle = col; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x + 37 * s, y + 34 * s, 18 * s, -Math.PI / 2, -Math.PI / 2 + TAU * active); ctx.stroke(); }
      ctx.font = `500 ${12 * s}px ${MONO}`; ctx.fillStyle = '#d8ece6'; ctx.textAlign = 'left'; ctx.fillText(key, x + 8 * s, y + 6 * s);
      ctx.textAlign = 'right'; ctx.fillText(`×${n}`, x + 68 * s, y + 6 * s);
      ctx.textAlign = 'center'; ctx.font = `${9 * s}px ${MONO}`; ctx.fillStyle = 'rgba(200,220,215,0.6)'; ctx.fillText(name, x + 37 * s, y + 58 * s);
    };
    const by2 = H - pad - 74 * s;
    slot(pad, by2, 'Q', 'LURE', g.items.lure, '#bfeaff', g.lure ? g.entity.lureT / 10 : 0);
    slot(pad + 84 * s, by2, 'E', 'NECKLACE', g.items.necklace, '#f0dcb0', g.necklaceT > 0 ? g.necklaceT / 15 : 0);
    // resources
    ctx.textAlign = 'left'; ctx.font = `${11 * s}px ${MONO}`;
    let rx = pad + 176 * s;
    for (const [k, n] of Object.entries(g.inv)) {
      if (!n) continue;
      const txt = `${RESOURCES[k].name} ${n}`;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      const tw = ctx.measureText(txt).width + 14 * s;
      ctx.beginPath(); ctx.roundRect(rx, H - pad - 26 * s, tw, 22 * s, 5 * s); ctx.fill();
      ctx.fillStyle = 'rgba(220,232,228,0.8)'; ctx.fillText(txt, rx + 7 * s, H - pad - 20 * s);
      rx += tw + 6 * s;
    }

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
