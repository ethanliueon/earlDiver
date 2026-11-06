// The Margaret's cabin (2.4.0, furnished 2.4.1): its own screen, entered by the door on deck. A small
// working boat's cabin seen from the side: varnished tongue-and-groove panelling, deck beams and pipes
// overhead, a bunk under the porthole, a galley corner (a gimballed stove with a kettle, mugs and jars
// behind a fiddle rail), a brass clock and barometer, oilskins on a hook, a life jacket, a fire
// extinguisher, a fuse panel, a fish chart and a photo of the boat; and on a desk the old computer where
// the catalog lives. Earl walks it with A / D, in his boots and without his tank; E at the desk opens the
// catalog; at the door (or Esc) he goes back out on deck.
import { drawEarl } from './earl_draw.js';
import { clamp, TAU } from './util.js';

const ROOM = { door: 0.075, desk: 0.74, min: 0.07, max: 0.93 }; // positions across the room (0..1)

export class Cabin {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.x = ROOM.door + 0.05; this.face = 1; this.walkT = 0; this.t = 0; this.keys = new Set();
    root.innerHTML = '<canvas class="cb-canvas"></canvas><div class="cb-plate"><b>The cabin</b><span>A / D walk · E use · Esc back on deck</span></div><div class="cb-prompt"></div>';
    this.c = root.querySelector('canvas'); this.prompt = root.querySelector('.cb-prompt');
    this.onKey = (ev) => {
      if (this.root.hidden || this.h.blocked()) return;
      const k = ev.key.toLowerCase();
      if (ev.type === 'keydown') {
        if (k === 'escape') { ev.preventDefault(); ev.stopImmediatePropagation(); this.h.close(); return; }
        if (k === 'e' || k === 'f') { ev.preventDefault(); ev.stopImmediatePropagation(); this.use(); return; }
        if (['a', 'd', 'arrowleft', 'arrowright'].includes(k)) { ev.preventDefault(); ev.stopImmediatePropagation(); this.keys.add(k); }
      } else this.keys.delete(k);
    };
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
  }
  show() { this.x = ROOM.door + 0.05; this.face = 1; this.keys.clear(); }
  near() { return Math.abs(this.x - (ROOM.desk - 0.085)) < 0.05 ? 'desk' : Math.abs(this.x - ROOM.door) < 0.05 ? 'door' : null; }
  use() { const n = this.near(); if (n === 'desk') this.h.catalog(); else if (n === 'door') this.h.close(); }
  update(dt) {
    this.t += dt;
    const dir = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    if (!this.h.blocked()) {
      this.x = clamp(this.x + dir * 0.2 * dt, ROOM.min, ROOM.max);
      if (dir) { this.face = dir; this.walkT += dt; } else this.walkT = 0;
    }
    const n = this.near();
    this.prompt.textContent = n === 'desk' ? 'E  Use the computer: the catalog' : n === 'door' ? 'E  Back out on deck' : '';
    this.prompt.hidden = !n;
    this.draw();
  }
  draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight, c = this.c;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const t = this.t, floor = H * 0.8, ceil = H * 0.12, X = (f) => W * f, RH = floor - ceil, k = Math.min(W / 1400, H / 820) * 1.05; // k: the room's furniture scale
    const roll = Math.sin(t * 0.55) * 0.012; // the boat's slow roll: things that hang swing with it
    // ---------- the walls: varnished tongue-and-groove, vertical boards, a darker band at the bottom ----------
    ctx.fillStyle = '#140d08'; ctx.fillRect(0, 0, W, H);
    const wg = ctx.createLinearGradient(0, ceil, 0, floor); wg.addColorStop(0, '#5a3d24'); wg.addColorStop(0.6, '#4a301c'); wg.addColorStop(1, '#2e1d10');
    ctx.fillStyle = wg; ctx.fillRect(0, ceil, W, RH);
    for (let x = 0, i = 0; x < W; x += 34 * k, i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,220,170,0.035)' : i % 3 === 1 ? 'rgba(0,0,0,0.05)' : 'rgba(255,220,170,0.015)'; ctx.fillRect(x, ceil, 34 * k, RH);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, ceil, 1.2, RH);
    }
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(0, floor - RH * 0.22, W, 5); // the chair rail
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, floor - RH * 0.22 + 5, W, RH * 0.22 - 5);
    // ---------- overhead: deck beams, a pipe and a cable run ----------
    ctx.fillStyle = '#2a1b10'; ctx.fillRect(0, ceil - 16, W, 16);
    for (let x = 30; x < W; x += 210 * k) { ctx.fillStyle = '#1e130a'; ctx.fillRect(x, ceil - 4, 26 * k, 22 * k); ctx.fillStyle = 'rgba(255,220,170,0.05)'; ctx.fillRect(x, ceil - 4, 26 * k, 3); }
    ctx.strokeStyle = '#6a6e6a'; ctx.lineWidth = 6 * k; ctx.beginPath(); ctx.moveTo(0, ceil + 30 * k); ctx.lineTo(W, ceil + 30 * k); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ceil + 28 * k); ctx.lineTo(W, ceil + 28 * k); ctx.stroke();
    ctx.fillStyle = '#4a4e4a'; for (let x = 80; x < W; x += 260 * k) ctx.fillRect(x, ceil + 24 * k, 10 * k, 12 * k); // pipe clips
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.moveTo(0, ceil + 44 * k); for (let x = 0; x <= W; x += 120 * k) ctx.quadraticCurveTo(x + 60 * k, ceil + 50 * k, x + 120 * k, ceil + 44 * k); ctx.stroke();
    // ---------- the floor: a rubber mat over worn boards ----------
    const fg = ctx.createLinearGradient(0, floor, 0, H); fg.addColorStop(0, '#5a4028'); fg.addColorStop(1, '#22170c');
    ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1; for (let x = -40; x < W + 80; x += 70 * k) { ctx.beginPath(); ctx.moveTo(x, floor); ctx.lineTo(x - 60 * k, H); ctx.stroke(); }
    ctx.fillStyle = '#26282a'; ctx.fillRect(X(0.3), floor + 6, X(0.36), (H - floor) * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (let x = X(0.3); x < X(0.66); x += 8) ctx.fillRect(x, floor + 6, 3, (H - floor) * 0.5);
    ctx.fillStyle = '#1a120a'; ctx.fillRect(0, floor - 6, W, 6);
    // ---------- the door, at the left: back out on deck, daylight round its edges ----------
    const dx = X(ROOM.door), dh = RH * 0.82, dw = 92 * k;
    ctx.fillStyle = 'rgba(210,228,240,0.22)'; ctx.fillRect(dx - dw / 2 - 4, floor - dh - 4, dw + 8, dh + 4);
    ctx.fillStyle = '#6e5a44'; ctx.fillRect(dx - dw / 2, floor - dh, dw, dh);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(dx - dw / 2 + 8 * k, floor - dh + 10 * k, dw - 16 * k, dh * 0.42); ctx.fillRect(dx - dw / 2 + 8 * k, floor - dh * 0.5, dw - 16 * k, dh * 0.42);
    ctx.fillStyle = '#9ab8c8'; ctx.beginPath(); ctx.arc(dx, floor - dh * 0.74, 17 * k, 0, TAU); ctx.fill(); ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 5 * k; ctx.stroke();
    ctx.fillStyle = '#b8954a'; ctx.fillRect(dx + dw / 2 - 18 * k, floor - dh * 0.48, 10 * k, 5 * k);
    // ---------- oilskins and a sou'wester on a hook by the door ----------
    const ox = X(0.165), oy = ceil + RH * 0.24;
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(ox - 30 * k, oy - 6 * k, 60 * k, 6 * k); ctx.fillStyle = '#b8954a'; ctx.fillRect(ox - 3 * k, oy, 4 * k, 10 * k);
    ctx.save(); ctx.translate(ox, oy + 8 * k); ctx.rotate(roll * 3);
    ctx.fillStyle = '#d8a428'; ctx.beginPath(); ctx.moveTo(-18 * k, 0); ctx.lineTo(18 * k, 0); ctx.lineTo(34 * k, RH * 0.42); ctx.lineTo(-34 * k, RH * 0.42); ctx.closePath(); ctx.fill(); // the jacket
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-2 * k, 4 * k, 4 * k, RH * 0.38); ctx.fillStyle = '#b88a1e'; ctx.fillRect(-34 * k, RH * 0.38, 68 * k, RH * 0.04);
    ctx.fillStyle = '#e0b030'; ctx.beginPath(); ctx.ellipse(0, -2 * k, 26 * k, 7 * k, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(-14 * k, -14 * k, 28 * k, 12 * k); // the sou'wester
    ctx.restore();
    // ---------- the bunk under the porthole: a lee board, a grey blanket, a pillow ----------
    const bx0 = X(0.24), bx1 = X(0.43), by = floor - RH * 0.24;
    ctx.fillStyle = '#3a2614'; ctx.fillRect(bx0, by, bx1 - bx0, floor - by);
    ctx.fillStyle = '#5a6066'; ctx.fillRect(bx0 + 6 * k, by - 16 * k, bx1 - bx0 - 12 * k, 18 * k); // the blanket
    ctx.fillStyle = '#6a7076'; for (let x = bx0 + 20 * k; x < bx1 - 20 * k; x += 40 * k) ctx.fillRect(x, by - 16 * k, 3 * k, 18 * k);
    ctx.fillStyle = '#d8d0bc'; ctx.beginPath(); ctx.roundRect(bx0 + 8 * k, by - 26 * k, 54 * k, 16 * k, 6 * k); ctx.fill(); // the pillow
    ctx.fillStyle = '#4a3018'; ctx.fillRect(bx0, by + 4 * k, bx1 - bx0, 10 * k); // the lee board
    ctx.fillStyle = '#2a1a0c'; for (let x = bx0 + 30 * k; x < bx1; x += 80 * k) ctx.fillRect(x, by + 20 * k, 40 * k, floor - by - 26 * k); // drawers under it
    // ---------- the porthole on the sea, the horizon rolling; dark at night ----------
    const px = X(0.335), py = ceil + RH * 0.33, pr = 54 * k;
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
    const dayK = this.h.daylight ? this.h.daylight() : 1;
    ctx.fillStyle = `rgb(${Math.round(30 + 110 * dayK)},${Math.round(40 + 150 * dayK)},${Math.round(60 + 160 * dayK)})`; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.translate(px, py); ctx.rotate(Math.sin(t * 0.55) * 0.08);
    ctx.fillStyle = `rgb(${Math.round(15 + 30 * dayK)},${Math.round(40 + 70 * dayK)},${Math.round(60 + 80 * dayK)})`; ctx.fillRect(-pr * 1.5, pr * 0.12, pr * 3, pr * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-pr * 1.5, pr * 0.12, pr * 3, 2);
    ctx.restore();
    ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 9 * k; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#8a6a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, pr + 5 * k, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e0c070'; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.arc(px + Math.cos(a) * (pr + 1), py + Math.sin(a) * (pr + 1), 2.3 * k, 0, TAU); ctx.fill(); }
    // ---------- a photo of the Margaret, a little crooked ----------
    ctx.save(); ctx.translate(X(0.415), ceil + RH * 0.2); ctx.rotate(-0.05);
    ctx.fillStyle = '#e8e0cc'; ctx.fillRect(-24 * k, -18 * k, 48 * k, 36 * k); ctx.fillStyle = '#7aa8c4'; ctx.fillRect(-20 * k, -14 * k, 40 * k, 20 * k); ctx.fillStyle = '#3a6a8a'; ctx.fillRect(-20 * k, 6 * k, 40 * k, 8 * k);
    ctx.fillStyle = '#e8e4da'; ctx.fillRect(-12 * k, -2 * k, 22 * k, 6 * k); ctx.fillStyle = '#b8443a'; ctx.fillRect(-14 * k, 4 * k, 26 * k, 3 * k); ctx.fillStyle = '#f0ece0'; ctx.fillRect(-4 * k, -8 * k, 8 * k, 6 * k);
    ctx.restore();
    // ---------- the brass clock and barometer, side by side ----------
    for (const [fx, face] of [[0.475, 'clock'], [0.53, 'baro']]) {
      const cx = X(fx), cy = ceil + RH * 0.27, r = 24 * k;
      ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.arc(cx, cy, r + 9 * k, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(cx, cy, r + 4 * k, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f0e8d4'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95); ctx.stroke(); }
      const hands = face === 'clock' ? [[(t / 600) % 1 * TAU, 0.5, 2.2], [(t / 50) % 1 * TAU, 0.78, 1.4]] : [[-0.6 + Math.sin(t * 0.05) * 0.05, 0.8, 1.4], [-0.9, 0.7, 1]];
      for (const [a, l, w] of hands) { ctx.strokeStyle = face === 'baro' && w < 1.2 ? '#b8954a' : '#1a1410'; ctx.lineWidth = w * k; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a) * r * l, cy - Math.cos(a) * r * l); ctx.stroke(); }
      ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy, 2.5 * k, 0, TAU); ctx.fill();
    }
    // ---------- the galley corner: a shelf of mugs and jars behind a fiddle rail, a gimballed stove ----------
    const gx0 = X(0.455), gx1 = X(0.6), shelfY = ceil + RH * 0.44;
    ctx.fillStyle = '#3a2614'; ctx.fillRect(gx0, shelfY, gx1 - gx0, 7 * k);
    const jars = ['#c8a050', '#8a3a2a', '#e8e0d0', '#5a7a5a', '#d8d0c0', '#7a5a3a'];
    for (let i = 0; i < 6; i++) { const jx = gx0 + 10 * k + i * (gx1 - gx0 - 20 * k) / 6; ctx.fillStyle = jars[i]; if (i % 2) { ctx.fillRect(jx, shelfY - 20 * k, 16 * k, 20 * k); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(jx, shelfY - 22 * k, 16 * k, 4 * k); } else { ctx.fillRect(jx, shelfY - 16 * k, 14 * k, 16 * k); ctx.strokeStyle = jars[i]; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.arc(jx + 16 * k, shelfY - 8 * k, 4 * k, -1.3, 1.3); ctx.stroke(); } }
    ctx.strokeStyle = '#b8954a'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(gx0, shelfY - 10 * k); ctx.lineTo(gx1, shelfY - 10 * k); ctx.stroke(); // the fiddle rail
    const sx = (gx0 + gx1) / 2, stoveTop = floor - RH * 0.3;
    ctx.fillStyle = '#2e3236'; ctx.fillRect(gx0 + 4 * k, stoveTop, gx1 - gx0 - 8 * k, floor - stoveTop); // the galley cabinet
    ctx.fillStyle = '#3a3e42'; ctx.fillRect(gx0 + 12 * k, stoveTop + 14 * k, (gx1 - gx0) / 2 - 16 * k, floor - stoveTop - 24 * k); ctx.fillRect(sx + 4 * k, stoveTop + 14 * k, (gx1 - gx0) / 2 - 16 * k, floor - stoveTop - 24 * k);
    ctx.save(); ctx.translate(sx, stoveTop); ctx.rotate(-roll * 2); // the stove swings level on its gimbals
    ctx.fillStyle = '#b8bcc0'; ctx.fillRect(-46 * k, -16 * k, 92 * k, 16 * k); ctx.fillStyle = '#1a1c1e'; ctx.fillRect(-36 * k, -18 * k, 26 * k, 3 * k); ctx.fillRect(10 * k, -18 * k, 26 * k, 3 * k);
    ctx.fillStyle = '#c8c4b8'; ctx.beginPath(); ctx.ellipse(-23 * k, -26 * k, 15 * k, 10 * k, 0, Math.PI, TAU); ctx.fill(); ctx.fillRect(-38 * k, -27 * k, 30 * k, 9 * k); // the kettle
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.arc(-23 * k, -36 * k, 9 * k, Math.PI, TAU); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(235,235,235,0.18)'; for (let i = 0; i < 6; i++) { const ph = ((t * 0.35 + i / 6) % 1); ctx.beginPath(); ctx.arc(sx - 8 * k + Math.sin(ph * 6 + i) * 8 * k, stoveTop - 44 * k - ph * 80 * k, (5 + ph * 12) * k, 0, TAU); ctx.fill(); } // steam
    // ---------- the fish chart, pinned up over the desk ----------
    ctx.save(); ctx.translate(X(0.665), ceil + RH * 0.24); ctx.rotate(0.025);
    ctx.fillStyle = '#e4dcc4'; ctx.fillRect(-58 * k, -40 * k, 116 * k, 80 * k);
    ctx.fillStyle = '#3a3226'; ctx.font = `${Math.round(8 * k)}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.fillText('FISHES OF THE SHELF', 0, -28 * k);
    const fcols = ['#5a7a8a', '#c86a3a', '#7a8a5a', '#a85a6a', '#5a6a9a', '#c8a050'];
    for (let i = 0; i < 6; i++) { const fx = -36 * k + (i % 3) * 36 * k, fy = -8 * k + Math.floor(i / 3) * 26 * k; ctx.fillStyle = fcols[i]; ctx.beginPath(); ctx.ellipse(fx, fy, 12 * k, 5 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx + 11 * k, fy); ctx.lineTo(fx + 18 * k, fy - 5 * k); ctx.lineTo(fx + 18 * k, fy + 5 * k); ctx.fill(); }
    ctx.fillStyle = '#b83a2a'; ctx.beginPath(); ctx.arc(-54 * k, -36 * k, 2.5 * k, 0, TAU); ctx.arc(54 * k, -36 * k, 2.5 * k, 0, TAU); ctx.fill();
    ctx.restore();
    // ---------- the swinging lamp and its warm pool ----------
    const lx0 = X(0.56), lx = lx0 + Math.sin(t * 0.55 + 0.5) * 9 * k, ly = ceil + 62 * k;
    ctx.strokeStyle = '#1a140e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx0, ceil); ctx.lineTo(lx, ly - 12 * k); ctx.stroke();
    const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, H * 0.65); glow.addColorStop(0, 'rgba(255,196,120,0.3)'); glow.addColorStop(1, 'rgba(255,196,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4a5a44'; ctx.beginPath(); ctx.moveTo(lx - 20 * k, ly); ctx.lineTo(lx + 20 * k, ly); ctx.lineTo(lx + 9 * k, ly - 14 * k); ctx.lineTo(lx - 9 * k, ly - 14 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe4a8'; ctx.beginPath(); ctx.arc(lx, ly + 3 * k, 6 * k, 0, TAU); ctx.fill();
    // ---------- the desk and the computer: a beige CRT glowing green, a keyboard, a mug, a desk lamp ----------
    const kx = X(ROOM.desk), dTop = floor - RH * 0.34, on = this.near() === 'desk';
    ctx.fillStyle = '#5a3e26'; ctx.fillRect(kx - 120 * k, dTop, 240 * k, 14 * k); ctx.fillStyle = '#4a3018'; ctx.fillRect(kx - 112 * k, dTop + 14 * k, 70 * k, floor - dTop - 14 * k); ctx.fillRect(kx + 104 * k, dTop + 14 * k, 12 * k, floor - dTop - 14 * k);
    ctx.fillStyle = '#3a2410'; for (let i = 0; i < 3; i++) { ctx.fillRect(kx - 106 * k, dTop + 24 * k + i * 30 * k, 58 * k, 24 * k); ctx.fillStyle = '#b8954a'; ctx.fillRect(kx - 80 * k, dTop + 34 * k + i * 30 * k, 8 * k, 3 * k); ctx.fillStyle = '#3a2410'; }
    ctx.fillStyle = '#d6ccb0'; ctx.beginPath(); ctx.roundRect(kx - 58 * k, dTop - 100 * k, 116 * k, 96 * k, 6 * k); ctx.fill(); ctx.fillStyle = '#c4b896'; ctx.fillRect(kx - 30 * k, dTop - 6 * k, 60 * k, 6 * k);
    ctx.fillStyle = '#0a2416'; ctx.beginPath(); ctx.roundRect(kx - 46 * k, dTop - 90 * k, 92 * k, 68 * k, 8 * k); ctx.fill();
    ctx.fillStyle = `rgba(110,255,150,${on ? 0.95 : 0.65})`; ctx.font = `${Math.round(10 * k)}px "IBM Plex Mono", monospace`; ctx.textAlign = 'left';
    ctx.fillText('BAYSIDE MARINE', kx - 38 * k, dTop - 72 * k); ctx.fillText('SUPPLY', kx - 38 * k, dTop - 58 * k); ctx.fillText('>_' + (Math.floor(t * 2) % 2 ? '' : '█'), kx - 38 * k, dTop - 40 * k);
    ctx.fillStyle = 'rgba(110,255,150,0.07)'; for (let y = dTop - 90 * k; y < dTop - 22 * k; y += 3) ctx.fillRect(kx - 46 * k, y, 92 * k, 1); // scan lines
    ctx.fillStyle = '#b8ac8c'; ctx.fillRect(kx - 52 * k, dTop - 9 * k, 84 * k, 7 * k);
    ctx.fillStyle = '#f0e8d8'; ctx.fillRect(kx + 58 * k, dTop - 16 * k, 13 * k, 16 * k); ctx.strokeStyle = '#f0e8d8'; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.arc(kx + 73 * k, dTop - 8 * k, 4.5 * k, -1.2, 1.2); ctx.stroke(); // the mug
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(kx + 96 * k, dTop); ctx.lineTo(kx + 96 * k, dTop - 50 * k); ctx.lineTo(kx + 78 * k, dTop - 66 * k); ctx.stroke(); // the desk lamp
    ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.moveTo(kx + 66 * k, dTop - 62 * k); ctx.lineTo(kx + 86 * k, dTop - 74 * k); ctx.lineTo(kx + 92 * k, dTop - 62 * k); ctx.closePath(); ctx.fill();
    if (on) { const sg = ctx.createRadialGradient(kx, dTop - 56 * k, 10, kx, dTop - 56 * k, 120 * k); sg.addColorStop(0, 'rgba(120,255,160,0.16)'); sg.addColorStop(1, 'rgba(120,255,160,0)'); ctx.fillStyle = sg; ctx.fillRect(kx - 130 * k, dTop - 180 * k, 260 * k, 220 * k); }
    // ---------- the right-hand bulkhead: a fuse panel, a life jacket, a fire extinguisher ----------
    const rx = X(0.885);
    ctx.fillStyle = '#4a4e52'; ctx.fillRect(rx - 26 * k, ceil + RH * 0.16, 52 * k, 70 * k); ctx.fillStyle = '#2a2e32'; for (let i = 0; i < 6; i++) ctx.fillRect(rx - 18 * k + (i % 3) * 13 * k, ceil + RH * 0.16 + 10 * k + Math.floor(i / 3) * 26 * k, 8 * k, 16 * k);
    ctx.fillStyle = '#7ad890'; ctx.fillRect(rx + 16 * k, ceil + RH * 0.16 + 6 * k, 4 * k, 4 * k);
    ctx.save(); ctx.translate(rx, ceil + RH * 0.42); ctx.rotate(roll * 2);
    ctx.fillStyle = '#e8622a'; ctx.beginPath(); ctx.roundRect(-24 * k, 0, 48 * k, 74 * k, 10 * k); ctx.fill(); ctx.fillStyle = '#c84a1a'; ctx.fillRect(-2 * k, 4 * k, 4 * k, 66 * k);
    ctx.fillStyle = '#e8e4da'; ctx.fillRect(-24 * k, 26 * k, 48 * k, 5 * k); ctx.fillRect(-24 * k, 48 * k, 48 * k, 5 * k);
    ctx.restore();
    const fx2 = X(0.935), fTop = floor - 110 * k;
    ctx.fillStyle = '#b8241a'; ctx.beginPath(); ctx.roundRect(fx2 - 13 * k, fTop, 26 * k, 96 * k, 9 * k); ctx.fill();
    ctx.fillStyle = '#e8e4da'; ctx.fillRect(fx2 - 13 * k, fTop + 30 * k, 26 * k, 16 * k); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(fx2 - 6 * k, fTop - 12 * k, 12 * k, 12 * k); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(fx2 + 6 * k, fTop - 6 * k); ctx.quadraticCurveTo(fx2 + 24 * k, fTop, fx2 + 16 * k, fTop + 30 * k); ctx.stroke();
    ctx.fillStyle = '#5a5e62'; ctx.fillRect(fx2 - 16 * k, fTop + 60 * k, 32 * k, 4 * k);
    // ---------- Earl, standing and walking: boots on, tank off ----------
    const ex = X(this.x), eh = RH * 0.5;
    ctx.save(); ctx.translate(ex, floor - eh * 0.5); ctx.scale(this.face, 1); ctx.rotate(-Math.PI / 2);
    drawEarl(ctx, eh, this.walkT * 7, this.walkT > 0 ? 0.35 : 0, null, null, { kind: 'none', tier: 0, t, suit: this.h.suit(), bag: [], land: true, noTank: true });
    ctx.restore();
    // ---------- the dim of a small room, warmest round the lamp ----------
    const vg = ctx.createRadialGradient(lx, H * 0.5, H * 0.25, W / 2, H * 0.5, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,4,0,0.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
}
