// The Margaret's cabin (2.4.0): its own screen, entered by the door on deck. A small wood-panelled room seen
// from the side: a porthole on the sea, a lamp, a chart on the wall, and on a desk the old computer where
// the catalog lives. Earl walks it with A / D; E at the desk opens the catalog; at the door (or Esc) he
// goes back out on deck.
import { drawEarl } from './earl_draw.js';
import { clamp, lerp, TAU } from './util.js';

const ROOM = { door: 0.12, desk: 0.66, min: 0.1, max: 0.9 }; // positions across the room (0..1)

export class Cabin {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.x = ROOM.door + 0.05; this.face = 1; this.walkT = 0; this.t = 0; this.keys = new Set();
    root.innerHTML = '<canvas class="cb-canvas"></canvas><div class="cb-plate"><b>The cabin</b><span>A / D walk · E use · Esc back on deck</span></div><div class="cb-prompt"></div>';
    this.c = root.querySelector('canvas'); this.prompt = root.querySelector('.cb-prompt');
    this.onKey = (ev) => {
      if (this.root.hidden || this.h.blocked()) return;
      const k = ev.key.toLowerCase();
      if (ev.type === 'keydown') {
        if (k === 'escape') { ev.preventDefault(); ev.stopPropagation(); this.h.close(); return; }
        if (k === 'e' || k === 'f') { ev.preventDefault(); ev.stopPropagation(); this.use(); return; }
        if (['a', 'd', 'arrowleft', 'arrowright'].includes(k)) { ev.preventDefault(); ev.stopPropagation(); this.keys.add(k); }
      } else this.keys.delete(k);
    };
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
  }
  show() { this.x = ROOM.door + 0.05; this.face = 1; this.keys.clear(); }
  near() { return Math.abs(this.x - (ROOM.desk - 0.1)) < 0.06 ? 'desk' : Math.abs(this.x - ROOM.door) < 0.07 ? 'door' : null; }
  use() { const n = this.near(); if (n === 'desk') this.h.catalog(); else if (n === 'door') this.h.close(); }
  update(dt) {
    this.t += dt;
    const dir = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    if (!this.h.blocked()) {
      this.x = clamp(this.x + dir * 0.22 * dt, ROOM.min, ROOM.max);
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
    const t = this.t, floor = H * 0.78, ceil = H * 0.14, X = (f) => W * f;
    // the walls: varnished planks, a darker skirting, the ceiling beams
    const wg = ctx.createLinearGradient(0, ceil, 0, floor); wg.addColorStop(0, '#4a3524'); wg.addColorStop(1, '#2e2016');
    ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = wg; ctx.fillRect(0, ceil, W, floor - ceil);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let y = ceil + 22; y < floor; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#24180f'; for (let x = 0; x < W; x += W / 6) ctx.fillRect(x, ceil - 10, 18, 14);
    ctx.fillStyle = '#20160e'; ctx.fillRect(0, floor - 14, W, 14);
    // the floor: worn boards
    const fg = ctx.createLinearGradient(0, floor, 0, H); fg.addColorStop(0, '#5a4028'); fg.addColorStop(1, '#2a1c10');
    ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; for (let x = -40; x < W; x += 70) { ctx.beginPath(); ctx.moveTo(x, floor); ctx.lineTo(x - 60, H); ctx.stroke(); }
    // the door, at the left: back out on deck (a slice of daylight round it)
    const dx = X(ROOM.door), dh = (floor - ceil) * 0.8;
    ctx.fillStyle = 'rgba(200,220,235,0.18)'; ctx.fillRect(dx - 44, floor - dh - 4, 88, dh + 4);
    ctx.fillStyle = '#6e5a44'; ctx.fillRect(dx - 40, floor - dh, 80, dh);
    ctx.strokeStyle = '#3a2c1e'; ctx.lineWidth = 3; ctx.strokeRect(dx - 40, floor - dh, 80, dh);
    ctx.fillStyle = '#9ab8c8'; ctx.beginPath(); ctx.arc(dx, floor - dh * 0.72, 16, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#c8a050'; ctx.fillRect(dx + 26, floor - dh * 0.45, 8, 4);
    // a porthole on the sea, the horizon rocking gently
    const px = X(0.38), py = ceil + (floor - ceil) * 0.36, pr = Math.min(70, H * 0.08);
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
    ctx.fillStyle = '#8cb8d8'; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.translate(px, py); ctx.rotate(Math.sin(t * 0.7) * 0.06);
    ctx.fillStyle = '#2a6a8a'; ctx.fillRect(-pr * 1.5, pr * 0.1, pr * 3, pr * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-pr * 1.5, pr * 0.1, pr * 3, 2);
    ctx.restore();
    ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#e0c070'; for (let k = 0; k < 8; k++) { const a = k * TAU / 8; ctx.beginPath(); ctx.arc(px + Math.cos(a) * (pr + 1), py + Math.sin(a) * (pr + 1), 2.2, 0, TAU); ctx.fill(); }
    // a chart pinned on the wall
    ctx.save(); ctx.translate(X(0.85), ceil + (floor - ceil) * 0.32); ctx.rotate(0.03);
    ctx.fillStyle = '#d8ccaa'; ctx.fillRect(-70, -45, 140, 90); ctx.strokeStyle = 'rgba(60,80,110,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-60, 20); ctx.bezierCurveTo(-20, -10, 10, 30, 60, -20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-60, 30); ctx.bezierCurveTo(-20, 0, 10, 40, 60, -8); ctx.stroke();
    ctx.restore();
    // the lamp, swinging a little, and its warm pool
    const lx = X(0.55) + Math.sin(t * 0.9) * 6, ly = ceil + 50;
    ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0.55), ceil); ctx.lineTo(lx, ly - 10); ctx.stroke();
    const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, H * 0.6); glow.addColorStop(0, 'rgba(255,200,120,0.32)'); glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3a3a2e'; ctx.beginPath(); ctx.moveTo(lx - 16, ly); ctx.lineTo(lx + 16, ly); ctx.lineTo(lx + 8, ly - 12); ctx.lineTo(lx - 8, ly - 12); ctx.fill();
    ctx.fillStyle = '#ffe4a8'; ctx.beginPath(); ctx.arc(lx, ly + 3, 5, 0, TAU); ctx.fill();
    // the desk and the computer: a beige CRT glowing green, a keyboard, a mug
    const kx = X(ROOM.desk), dTop = floor - (floor - ceil) * 0.36;
    ctx.fillStyle = '#5a3e26'; ctx.fillRect(kx - 110, dTop, 220, 14); ctx.fillRect(kx - 100, dTop + 14, 12, floor - dTop - 14); ctx.fillRect(kx + 88, dTop + 14, 12, floor - dTop - 14);
    ctx.fillStyle = '#d6ccb0'; ctx.fillRect(kx - 52, dTop - 92, 104, 90); ctx.fillStyle = '#c4b896'; ctx.fillRect(kx - 40, dTop - 4, 80, 4);
    ctx.fillStyle = '#0c2a18'; ctx.fillRect(kx - 42, dTop - 82, 84, 64);
    const on = this.near() === 'desk';
    ctx.fillStyle = `rgba(110,255,150,${on ? 0.9 : 0.6})`; ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillText('BAYSIDE MARINE', kx - 36, dTop - 66); ctx.fillText('SUPPLY  >_' + (Math.floor(t * 2) % 2 ? '' : '█'), kx - 36, dTop - 52);
    ctx.fillStyle = 'rgba(110,255,150,0.08)'; ctx.fillRect(kx - 42, dTop - 82, 84, 64);
    ctx.fillStyle = '#bcb090'; ctx.fillRect(kx - 46, dTop - 9, 70, 6);
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(kx + 50, dTop - 14, 12, 14); ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(kx + 64, dTop - 7, 4, -1.2, 1.2); ctx.stroke();
    if (on) { ctx.fillStyle = 'rgba(120,255,160,0.12)'; ctx.beginPath(); ctx.arc(kx, dTop - 50, 90, 0, TAU); ctx.fill(); }
    // Earl, standing and walking
    const ex = X(this.x), eh = (floor - ceil) * 0.5; // (his length with fins; he stands a head shorter than the door)
    ctx.save(); ctx.translate(ex, floor - eh * 0.5); ctx.scale(this.face, 1); ctx.rotate(-Math.PI / 2);
    drawEarl(ctx, eh, this.walkT * 7, this.walkT > 0 ? 0.35 : 0, null, null, { kind: 'none', tier: 0, t, suit: this.h.suit(), bag: [] });
    ctx.restore();
    // the vignette of a small room
    const vg = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
}
