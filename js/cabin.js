// The Margaret's cabin (2.4.0, furnished 2.4.1, lit 2.4.2): its own screen, entered by the door on deck.
// A small working boat's cabin seen from the side: varnished tongue-and-groove panelling, deck beams and
// pipes overhead, a bunk under the porthole, a galley corner (a gimballed stove with a kettle, mugs and
// jars behind a fiddle rail), a brass clock and barometer, oilskins on a hook, a life jacket, a fire
// extinguisher, a fuse panel, a fish chart and a photo of the boat; and on a desk the old computer where
// the catalog lives. Earl walks it with A / D, in his boots and without his tank; F (or E) at the desk
// opens the catalog; at the door (or Esc) he goes back out on deck.
// The light (2.4.2): the room is drawn plain, then a light map multiplies over it: the swinging lamp's warm
// pool, cool daylight from the porthole and round the door, the green of the screen and the desk lamp, dark
// corners everywhere else. Things on the walls cast soft shadows away from the lamp, so they swing with
// it, and furniture sits in contact shadows. The wood grain is baked once into a canvas (a procedural grain:
// the free texture sites were out of reach, and this keeps the boat's own colours).
import { promptHtml } from './fittings.js';
import { drawEarl } from './earl_draw.js';
import { clamp, TAU } from './util.js';
import { drawSpecies } from './creatures_draw.js';
import { SPECIES_BY_ID } from './species.js';

// positions across the room, in screen widths: the room is wider than the screen (2.5.0) and the view
// follows him. Left of 1.0 is the cabin as it was; to the right, the front of the wheelhouse: the radio,
// the windows and the wheel. Each STATION is where he stands to use something.
const ROOM = { door: 0.075, desk: 0.74, min: 0.07, max: 1.4, width: 1.45, radio: 1.1, wheel: 1.31, tank: 0.965 }; // (2.6.8) the aquarium: a lit tank across the room from the door
const STATIONS = [
  { id: 'door', x: ROOM.door, label: 'F  Out on deck' },
  { id: 'desk', x: ROOM.desk - 0.03, label: 'F  Shop' }, // (3.0.20: the computer is the shop; 4.0.0: centred on it)
  { id: 'tank', x: ROOM.tank, label: 'F  The aquarium' },
  { id: 'wheel', x: ROOM.wheel - 0.075, label: 'F  Take the wheel' },
];

// a small seeded random, so the grain is the same every time the cabin is drawn
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

// the panelling: vertical boards with a fine wavy grain, the odd knot the grain bends round, and a groove
// between boards with its lit bevel
function bakeWall(w, h, pw, seed) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext('2d'), r = rng(seed);
  for (let x0 = 0; x0 < w; x0 += pw) {
    const tone = 1 + (r() - 0.5) * 0.16;
    x.fillStyle = `rgb(${Math.round(96 * tone)},${Math.round(64 * tone)},${Math.round(38 * tone)})`; x.fillRect(x0, 0, pw + 1, h);
    const knots = [];
    if (r() < 0.4) knots.push({ y: r() * h, cx: x0 + pw * (0.3 + r() * 0.4), r: 2 + r() * 2.5 });
    const ph = r() * 10;
    for (let gx = x0 + 1.5; gx < x0 + pw - 1; gx += 1.4 + r() * 1.8) {
      const a = 0.03 + r() * 0.07, light = r() < 0.28, f = 0.003 + r() * 0.006, amp = 0.5 + r() * 1.4, p2 = r() * 6;
      x.strokeStyle = light ? `rgba(255,214,160,${a * 0.8})` : `rgba(28,12,2,${a * 1.5})`; x.lineWidth = 0.5 + r() * 0.9;
      x.beginPath();
      for (let y = 0; y <= h + 6; y += 6) {
        let dx = Math.sin(y * f + p2 + ph) * amp;
        for (const kn of knots) { const dy = y - kn.y, ddx = gx - kn.cx; dx += Math.sign(ddx || 1) * kn.r * 2.4 * Math.exp(-(dy * dy) / (kn.r * kn.r * 40)) * Math.exp(-(ddx * ddx) / (kn.r * kn.r * 20)); }
        if (y === 0) x.moveTo(gx + dx, y); else x.lineTo(gx + dx, y);
      }
      x.stroke();
    }
    for (const kn of knots) {
      const g = x.createRadialGradient(kn.cx, kn.y, 0, kn.cx, kn.y, kn.r * 1.8); g.addColorStop(0, 'rgba(36,16,4,0.85)'); g.addColorStop(0.6, 'rgba(60,30,10,0.4)'); g.addColorStop(1, 'rgba(60,30,10,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(kn.cx, kn.y, kn.r * 1.8, kn.r * 3.2, 0, 0, TAU); x.fill();
      x.strokeStyle = 'rgba(30,12,2,0.25)'; x.lineWidth = 0.7; for (let i = 1; i < 3; i++) { x.beginPath(); x.ellipse(kn.cx, kn.y, kn.r * (1 + i * 0.5), kn.r * (2 + i * 1.2), 0, 0, TAU); x.stroke(); }
    }
    x.fillStyle = 'rgba(8,4,0,0.6)'; x.fillRect(x0, 0, 1.5, h);
    x.fillStyle = 'rgba(255,222,176,0.08)'; x.fillRect(x0 + 1.5, 0, 1.2, h);
  }
  return c;
}

// the floor: boards running away from us, wider the nearer they are, with butt joints and a worn track
// down the middle where he walks
function bakeFloor(w, h, seed) {
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#4a3420'; x.fillRect(0, 0, w, h);
  for (let y = 0, bh = h * 0.06; y < h; y += bh, bh *= 1.22) {
    let bx = -r() * 300;
    while (bx < w) {
      const len = 220 + r() * 260, tone = 1 + (r() - 0.5) * 0.18;
      x.fillStyle = `rgb(${Math.round(84 * tone)},${Math.round(58 * tone)},${Math.round(34 * tone)})`; x.fillRect(bx, y, len, bh);
      for (let gy = y + 1; gy < y + bh - 0.5; gy += 1.2 + r() * 1.6) {
        const a = 0.04 + r() * 0.07; x.strokeStyle = r() < 0.3 ? `rgba(255,214,160,${a * 0.6})` : `rgba(28,12,2,${a * 1.4})`; x.lineWidth = 0.5 + r() * 0.8;
        const amp = r() * 1.2, f = 0.01 + r() * 0.02; x.beginPath(); for (let gx = bx; gx <= bx + len; gx += 8) { const yy = gy + Math.sin(gx * f) * amp; if (gx === bx) x.moveTo(gx, yy); else x.lineTo(gx, yy); } x.stroke();
      }
      x.fillStyle = 'rgba(8,4,0,0.55)'; x.fillRect(bx, y, 1.5, bh); // the butt joint
      bx += len;
    }
    x.fillStyle = 'rgba(8,4,0,0.6)'; x.fillRect(0, y, w, 1.3);
    x.fillStyle = 'rgba(255,222,176,0.05)'; x.fillRect(0, y + 1.3, w, 1);
  }
  const wear = x.createLinearGradient(0, 0, 0, h); wear.addColorStop(0, 'rgba(255,230,190,0)'); wear.addColorStop(0.35, 'rgba(255,230,190,0.05)'); wear.addColorStop(0.7, 'rgba(255,230,190,0)');
  x.fillStyle = wear; x.fillRect(0, 0, w, h);
  return c;
}

export class Cabin {
  constructor(root, hooks) {
    this.root = root; this.h = hooks; this.x = ROOM.door + 0.05; this.face = 1; this.walkT = 0; this.t = 0; this.keys = new Set();
    root.innerHTML = '<canvas class="cb-canvas"></canvas><div class="cb-prompt"></div>';
    this.c = root.querySelector('canvas'); this.prompt = root.querySelector('.cb-prompt');
    this.lc = document.createElement('canvas'); // the light map
    this.onKey = (ev) => {
      if (this.root.hidden || this.h.blocked()) return;
      const k = ev.key.toLowerCase();
      if (ev.type === 'keydown') {
        if (k === 'escape') { ev.preventDefault(); ev.stopImmediatePropagation(); this.h.close(); return; }
        if (k === 'e' || k === 'f') { ev.preventDefault(); ev.stopImmediatePropagation(); this.use(); return; }
        if ((k === ' ' || k === 'w' || k === 'arrowup') && !this.hop) { ev.preventDefault(); ev.stopImmediatePropagation(); this.hop = 0.55; return; } // (4.0.0) a jump, as on deck
        if (['a', 'd', 'arrowleft', 'arrowright', 'shift'].includes(k)) { ev.preventDefault(); ev.stopImmediatePropagation(); this.keys.add(k); this.goal = null; if (k !== 'shift') this.keyAt = performance.now(); }
      } else this.keys.delete(k);
    };
    // (2.6.2) the mouse: click to walk there; click on a thing (or where he stands at it) to use it
    this.c.addEventListener('mousedown', (ev) => {
      if (this.root.hidden || this.h.blocked() || ev.button !== 0) return;
      const W = window.innerWidth, camX = this.camX || 0, fx = (ev.clientX + camX) / W;
      const st = STATIONS.find((q) => Math.abs(fx - q.x) < 0.09 || (q.id === 'desk' && Math.abs(fx - ROOM.desk) < 0.12) || (q.id === 'wheel' && Math.abs(fx - ROOM.wheel) < 0.06));
      if (st && this.near() === st.id) { this.use(); return; }
      this.goal = clamp(st ? st.x : fx, ROOM.min, ROOM.max); this.goalUse = !!st;
    });
    // (3.0.0) as in the water: he walks toward the cursor (after it has moved since the cabin opened, and since a key)
    this.c.addEventListener('mousemove', (ev) => {
      this.mcx = ev.clientX;
      if (Math.abs(ev.clientX - (this.mlx ?? ev.clientX)) > 1) this.mMoved = performance.now();
      this.mlx = ev.clientX;
    });
    this.c.addEventListener('mouseleave', () => { this.mcx = null; });
    this.c.style.cursor = 'pointer';
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
  }
  show() { this.x = ROOM.door + 0.05; this.face = 1; this.keys.clear(); this.goal = null; this.mMoved = -1e9; this.mlx = null; }
  // (3.0.20) wider: each thing answers from 0.09 of a screen either side (twice what it was), the nearest one if two do
  near() { let best = null, bd = 1; for (const q of STATIONS) { const d = Math.abs(this.x - q.x) / (q.id === 'desk' ? 0.11 : 0.09); if (d < bd) { bd = d; best = q; } } return best ? best.id : null; } // (4.0.0) the desk answers from the whole width of it
  use() { const n = this.near(); if (n === 'desk') this.h.catalog(); else if (n === 'door') this.h.close(); else if (n) this.h.station(n === 'wheel' ? 'helm' : n === 'tank' ? 'gallery' : n); }
  atTank() { this.x = ROOM.tank; this.face = 1; this.keys.clear(); this.goal = null; }
  atWheel() { this.x = ROOM.wheel - 0.075; this.face = 1; this.keys.clear(); }
  update(dt) {
    this.t += dt;
    let dir = (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) - (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0);
    if (!dir && this.goal != null) { const d = this.goal - this.x; if (Math.abs(d) < 0.006) { this.x = this.goal; this.goal = null; if (this.goalUse) { this.goalUse = false; if (this.near()) this.use(); } } else dir = Math.sign(d); }
    // (2.6.2) the same walk as on deck: the stride, footsteps; Shift runs
    // following the cursor: a dead zone round him, a run when it is far
    let mRun = false;
    if (!dir && this.goal == null && this.mcx != null && (this.mMoved || -1e9) > (this.keyAt || -1e9) && !this.h.blocked()) {
      const d = clamp((this.mcx + (this.camX || 0)) / window.innerWidth, ROOM.min, ROOM.max) - this.x;
      if (Math.abs(d) > 0.05) { dir = Math.sign(d); this.ease = clamp((Math.abs(d) - 0.05) / 0.06, 0.35, 1); } // (3.0.27) a steady walk; Shift runs
    }
    const run = this.keys.has('shift') || mRun, pace = (run ? 0.32 : 0.2) * (this.ease || 1); this.ease = 1; // (4.0.0) his own pace again, and Shift runs
    if (!this.h.blocked()) {
      const step = this.goal != null ? Math.min(Math.abs(this.goal - this.x), pace * dt) : pace * dt;
      this.x = clamp(this.x + dir * step, ROOM.min, ROOM.max);
      if (dir) { this.face = dir; this.walkT += dt; } else this.walkT = 0;
    } else dir = 0;
    this.walk = (this.walk || 0) + ((dir ? 1 : 0) - (this.walk || 0)) * Math.min(1, dt * (dir ? 8 : 6));
    if (this.hop) { this.hop = Math.max(0, this.hop - dt); if (!this.hop) this.h.footstep && this.h.footstep(0.1); }
    // (4.0.0) the stride keeps pace with the floor going by, so his feet grip it instead of sliding
    if (dir || this.walk > 0.05) { const s0 = this.step || 0, eh = window.innerHeight * 0.34; this.step = s0 + dt * Math.max(2, (dir ? pace : 0.1) * window.innerWidth / eh * 6.1); if (Math.floor(this.step / Math.PI) !== Math.floor(s0 / Math.PI) && this.walk > 0.35) this.h.footstep && this.h.footstep(0.05 * this.walk); }
    const n = this.near();
    { const html = n ? promptHtml(STATIONS.find((q) => q.id === n).label) : ''; if (this.promptSrc !== html) { this.promptSrc = html; this.prompt.innerHTML = html; } } // (3.6.0) a brass key-cap and the words
    this.prompt.hidden = !n;
    this.draw();
  }
  // the baked wood, remade only when the window changes size
  textures(W, H, ceil, floor, k) {
    const key = `${W}x${H}`;
    if (this.texKey !== key) { this.texKey = key; const RW = W * ROOM.width; this.wall = bakeWall(RW, floor - ceil, 34 * k, 11); this.floorTex = bakeFloor(RW, H - floor, 23); this.beams = bakeWall(RW, ceil, 120 * k, 5); }
  }
  draw() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight, c = this.c;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const camX = this.camX = clamp(W * this.x - W * 0.5, 0, W * (ROOM.width - 1)); // the view follows him along the room
    const t = this.t, floor = H * 0.8, ceil = H * 0.12, X = (f) => W * f - camX, RH = floor - ceil, k = Math.min(W / 1400, H / 820) * 1.05; // k: the room's furniture scale
    const roll = Math.sin(t * 0.55) * 0.012; // the boat's slow roll: things that hang swing with it
    const dayK = this.h.daylight ? this.h.daylight() : 1;
    this.textures(W, H, ceil, floor, k);
    // the lamp first: everything's shadow is cast away from it
    const lx0 = X(0.56), lx = lx0 + Math.sin(t * 0.55 + 0.5) * 9 * k, ly = ceil + 62 * k;
    const lx2 = X(1.2) + Math.sin(t * 0.55 + 1.2) * 7 * k; // a second lamp over the wheel
    const shadow = (x, y, blur = 10, a = 0.55) => { const nl = Math.abs(x - lx2) < Math.abs(x - lx) ? lx2 : lx; const dx = x - nl, dy = y - ly, d = Math.hypot(dx, dy) || 1; ctx.shadowColor = `rgba(12,6,0,${a})`; ctx.shadowBlur = blur * k; ctx.shadowOffsetX = dx / d * 9 * k * Math.min(1, d / (W * 0.25)); ctx.shadowOffsetY = Math.max(3 * k, dy / d * 9 * k); };
    const noShadow = () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };
    const contact = (cx, cy, rx, ry, a) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(10,5,0,${a})`); g.addColorStop(0.6, `rgba(10,5,0,${a * 0.5})`); g.addColorStop(1, 'rgba(10,5,0,0)'); ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore(); };
    const shg0 = (x) => { const g0 = ctx.createLinearGradient(x - 20 * k, 0, x + 20 * k, 0); g0.addColorStop(0, '#5a6a52'); g0.addColorStop(0.4, '#4a5a44'); g0.addColorStop(1, '#26301f'); return g0; };
    const brass = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#e8c878'); g.addColorStop(0.45, '#b8913e'); g.addColorStop(1, '#6e5220'); return g; };
    // ---------- the walls: varnished tongue-and-groove, darker below the chair rail ----------
    ctx.fillStyle = '#140d08'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(this.wall, -camX, ceil);
    const wg = ctx.createLinearGradient(0, ceil, 0, floor); wg.addColorStop(0, 'rgba(40,20,6,0)'); wg.addColorStop(0.75, 'rgba(20,10,2,0.12)'); wg.addColorStop(0.78, 'rgba(10,5,0,0.3)'); wg.addColorStop(1, 'rgba(10,5,0,0.4)');
    ctx.fillStyle = wg; ctx.fillRect(0, ceil, W, RH);
    const railY = floor - RH * 0.22;
    ctx.fillStyle = '#3a2412'; ctx.fillRect(0, railY - 2, W, 7); ctx.fillStyle = 'rgba(255,222,176,0.12)'; ctx.fillRect(0, railY - 2, W, 1.5); ctx.fillStyle = 'rgba(8,4,0,0.35)'; ctx.fillRect(0, railY + 5, W, 3); // the chair rail
    // ---------- overhead: the deckhead, beams, a pipe and a cable run ----------
    ctx.drawImage(this.beams, -camX, 0); ctx.fillStyle = 'rgba(10,5,0,0.55)'; ctx.fillRect(0, 0, W, ceil);
    ctx.fillStyle = '#2a1b10'; ctx.fillRect(0, ceil - 16, W, 16);
    for (let x = 30 - camX; x < W; x += 210 * k) {
      const bg = ctx.createLinearGradient(x, 0, x + 26 * k, 0); bg.addColorStop(0, '#2e1e12'); bg.addColorStop(0.3, '#3a2616'); bg.addColorStop(1, '#170e06');
      ctx.fillStyle = bg; ctx.fillRect(x, ceil - 4, 26 * k, 22 * k); ctx.fillStyle = 'rgba(10,5,0,0.4)'; ctx.fillRect(x, ceil + 18 * k, 26 * k, 4 * k);
    }
    const ao = ctx.createLinearGradient(0, ceil, 0, ceil + 60 * k); ao.addColorStop(0, 'rgba(8,4,0,0.6)'); ao.addColorStop(1, 'rgba(8,4,0,0)'); ctx.fillStyle = ao; ctx.fillRect(0, ceil, W, 60 * k); // where the wall meets the deckhead
    shadow(W / 2, ceil + 30 * k, 6, 0.5);
    const pg = ctx.createLinearGradient(0, ceil + 27 * k, 0, ceil + 33 * k); pg.addColorStop(0, '#a4a8a4'); pg.addColorStop(0.4, '#6a6e6a'); pg.addColorStop(1, '#3a3e3a');
    ctx.strokeStyle = pg; ctx.lineWidth = 6 * k; ctx.beginPath(); ctx.moveTo(0, ceil + 30 * k); ctx.lineTo(W, ceil + 30 * k); ctx.stroke();
    noShadow();
    ctx.fillStyle = '#4a4e4a'; for (let x = 80 - camX; x < W; x += 260 * k) ctx.fillRect(x, ceil + 24 * k, 10 * k, 12 * k); // pipe clips
    shadow(W / 2, ceil + 46 * k, 4, 0.4);
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.moveTo(-camX, ceil + 44 * k); for (let x = -camX; x <= W; x += 120 * k) ctx.quadraticCurveTo(x + 60 * k, ceil + 50 * k, x + 120 * k, ceil + 44 * k); ctx.stroke();
    noShadow();
    // ---------- the floor: worn boards, a rubber mat, the wall's shadow along its foot ----------
    ctx.drawImage(this.floorTex, -camX, floor);
    const fg = ctx.createLinearGradient(0, floor, 0, H); fg.addColorStop(0, 'rgba(8,4,0,0.55)'); fg.addColorStop(0.18, 'rgba(8,4,0,0.1)'); fg.addColorStop(1, 'rgba(8,4,0,0.35)');
    ctx.fillStyle = fg; ctx.fillRect(0, floor, W, H - floor);
    const mx0 = X(0.3), mw = X(0.36), mh = (H - floor) * 0.5;
    ctx.fillStyle = '#232527'; ctx.fillRect(mx0, floor + 6, mw, mh);
    ctx.fillStyle = 'rgba(255,255,255,0.025)'; for (let x = mx0; x < mx0 + mw; x += 8) ctx.fillRect(x, floor + 6, 3, mh);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(mx0, floor + 6, mw, 1.5); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(mx0, floor + 6 + mh, mw, 3);
    ctx.fillStyle = '#1a120a'; ctx.fillRect(0, floor - 6, W, 6); // the skirting
    const ao2 = ctx.createLinearGradient(0, floor - 40 * k, 0, floor); ao2.addColorStop(0, 'rgba(8,4,0,0)'); ao2.addColorStop(1, 'rgba(8,4,0,0.45)'); ctx.fillStyle = ao2; ctx.fillRect(0, floor - 40 * k, W, 34 * k);
    // ---------- the door, at the left (2.6.8: made plain to see): a painted steel weathertight door, its
    // rounded frame, two dog levers and a brass handle; daylight through its window; "DECK" lit over it ----------
    const dx = X(ROOM.door), dh = RH * 0.84, dw = 108 * k, dTopY = floor - dh, dr = 16 * k;
    ctx.fillStyle = '#0a0705'; ctx.beginPath(); ctx.roundRect(dx - dw / 2 - 12 * k, dTopY - 12 * k, dw + 24 * k, dh + 12 * k, [dr + 10 * k, dr + 10 * k, 0, 0]); ctx.fill(); // the opening
    const fr = ctx.createLinearGradient(dx - dw / 2 - 10 * k, 0, dx + dw / 2 + 10 * k, 0); fr.addColorStop(0, '#6a7a72'); fr.addColorStop(0.5, '#56665e'); fr.addColorStop(1, '#3a4842');
    ctx.fillStyle = fr; ctx.beginPath(); ctx.roundRect(dx - dw / 2 - 9 * k, dTopY - 9 * k, dw + 18 * k, dh + 9 * k, [dr + 8 * k, dr + 8 * k, 0, 0]); ctx.fill(); // the steel frame
    ctx.fillStyle = '#0c0805'; ctx.beginPath(); ctx.roundRect(dx - dw / 2 - 2, dTopY - 2, dw + 4, dh + 2, [dr + 2, dr + 2, 0, 0]); ctx.fill();
    const dg = ctx.createLinearGradient(dx - dw / 2, 0, dx + dw / 2, 0); dg.addColorStop(0, '#5f8a78'); dg.addColorStop(0.45, '#557e6c'); dg.addColorStop(1, '#3c5c4e');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.roundRect(dx - dw / 2, dTopY, dw, dh, [dr, dr, 0, 0]); ctx.fill(); // the door leaf, ship's green
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.roundRect(dx - dw / 2 + 9 * k, dTopY + 9 * k, dw - 18 * k, dh - 18 * k, [dr - 6 * k, dr - 6 * k, 3 * k, 3 * k]); ctx.stroke(); // the pressed rim
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.roundRect(dx - dw / 2 + 11 * k, dTopY + 11 * k, dw - 22 * k, dh - 22 * k, [dr - 8 * k, dr - 8 * k, 3 * k, 3 * k]); ctx.stroke();
    ctx.fillStyle = 'rgba(30,20,10,0.25)'; for (let i = 0; i < 9; i++) ctx.fillRect(dx - dw / 2 + ((i * 37) % 90) * k, floor - (8 + (i * 13) % 30) * k, (4 + i % 3) * k, 2 * k); // scuffs at the foot
    for (const ly of [dTopY + dh * 0.3, dTopY + dh * 0.72]) { // the dogs: two levers on the latch side
      ctx.fillStyle = '#2a2a28'; ctx.beginPath(); ctx.arc(dx + dw / 2 - 16 * k, ly, 6 * k, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2e302c'; ctx.lineWidth = 6 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(dx + dw / 2 - 16 * k, ly); ctx.lineTo(dx + dw / 2 - 40 * k, ly + 10 * k); ctx.stroke(); ctx.lineCap = 'butt';
    }
    ctx.fillStyle = brass(0, floor - dh * 0.5, 0, floor - dh * 0.5 + 8 * k); ctx.beginPath(); ctx.roundRect(dx + dw / 2 - 30 * k, floor - dh * 0.5, 22 * k, 8 * k, 3 * k); ctx.fill(); // the handle
    const gy0 = dTopY + dh * 0.2, gr0 = 21 * k; // its window, the day outside it
    const gl = ctx.createLinearGradient(0, gy0 - gr0, 0, gy0 + gr0); gl.addColorStop(0, `rgb(${Math.round(70 + 140 * dayK)},${Math.round(90 + 140 * dayK)},${Math.round(110 + 135 * dayK)})`); gl.addColorStop(1, `rgb(${Math.round(40 + 110 * dayK)},${Math.round(60 + 120 * dayK)},${Math.round(80 + 120 * dayK)})`);
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(dx, gy0, gr0, 0, TAU); ctx.fill();
    ctx.strokeStyle = brass(dx - gr0, gy0 - gr0, dx + gr0, gy0 + gr0); ctx.lineWidth = 6 * k; ctx.stroke();
    // the sign over it: an enamel plate, lit, "DECK" and an arrow out
    const sgW = 96 * k, sgH = 26 * k, sgY = dTopY - 46 * k;
    ctx.fillStyle = '#0a0705'; ctx.fillRect(dx - sgW / 2 + 2 * k, sgY + 3 * k, sgW, sgH);
    ctx.fillStyle = '#1e6a3a'; ctx.beginPath(); ctx.roundRect(dx - sgW / 2, sgY, sgW, sgH, 4 * k); ctx.fill();
    ctx.strokeStyle = '#e6d8b8'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.roundRect(dx - sgW / 2 + 3 * k, sgY + 3 * k, sgW - 6 * k, sgH - 6 * k, 3 * k); ctx.stroke();
    ctx.fillStyle = '#f2e6c8'; ctx.font = `700 ${13 * k}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('\u2190 DECK', dx, sgY + sgH / 2 + 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    this.doorSign = [dx, sgY + sgH / 2];
    // ---------- oilskins and a sou'wester on a hook by the door ----------
    const ox = X(0.165), oy = ceil + RH * 0.24;
    shadow(ox, oy, 6, 0.5); ctx.fillStyle = '#2a1d10'; ctx.fillRect(ox - 30 * k, oy - 6 * k, 60 * k, 6 * k); noShadow();
    ctx.fillStyle = '#b8954a'; ctx.fillRect(ox - 3 * k, oy, 4 * k, 10 * k);
    ctx.save(); ctx.translate(ox, oy + 8 * k); ctx.rotate(roll * 3);
    shadow(ox, oy + RH * 0.2, 14, 0.6);
    ctx.fillStyle = '#d8a428'; ctx.beginPath(); ctx.moveTo(-18 * k, 0); ctx.lineTo(18 * k, 0); ctx.quadraticCurveTo(26 * k, RH * 0.2, 34 * k, RH * 0.42); ctx.lineTo(-34 * k, RH * 0.42); ctx.quadraticCurveTo(-26 * k, RH * 0.2, -18 * k, 0); ctx.closePath(); ctx.fill(); // the jacket
    noShadow();
    const jg = ctx.createLinearGradient(-34 * k, 0, 34 * k, 0); jg.addColorStop(0, 'rgba(60,30,0,0.28)'); jg.addColorStop(0.35, 'rgba(255,240,180,0.08)'); jg.addColorStop(0.55, 'rgba(0,0,0,0)'); jg.addColorStop(1, 'rgba(60,30,0,0.32)');
    ctx.fillStyle = jg; ctx.fillRect(-34 * k, 0, 68 * k, RH * 0.42);
    ctx.strokeStyle = 'rgba(80,46,0,0.3)'; ctx.lineWidth = 1.5 * k; for (const fx of [-16, -6, 9, 20]) { ctx.beginPath(); ctx.moveTo(fx * 0.5 * k, 6 * k); ctx.quadraticCurveTo(fx * k, RH * 0.2, fx * 1.3 * k, RH * 0.4); ctx.stroke(); } // folds
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(-1.5 * k, 4 * k, 3 * k, RH * 0.38); ctx.fillStyle = '#a8801a'; ctx.fillRect(-34 * k, RH * 0.39, 68 * k, RH * 0.03);
    shadow(ox, oy, 8, 0.45);
    ctx.fillStyle = '#e0b030'; ctx.beginPath(); ctx.ellipse(0, -2 * k, 26 * k, 7 * k, 0, Math.PI, TAU); ctx.fill(); ctx.beginPath(); ctx.roundRect(-14 * k, -15 * k, 28 * k, 13 * k, [6 * k, 6 * k, 0, 0]); ctx.fill(); // the sou'wester
    noShadow(); ctx.fillStyle = 'rgba(80,46,0,0.25)'; ctx.fillRect(-14 * k, -5 * k, 28 * k, 3 * k);
    ctx.restore();
    // ---------- the bunk under the porthole: a lee board, a grey blanket, a pillow ----------
    const bx0 = X(0.24), bx1 = X(0.43), by = floor - RH * 0.24;
    shadow((bx0 + bx1) / 2, by, 16, 0.5); ctx.fillStyle = '#3a2614'; ctx.fillRect(bx0, by, bx1 - bx0, floor - by); noShadow();
    const blg = ctx.createLinearGradient(0, by - 16 * k, 0, by + 2 * k); blg.addColorStop(0, '#6a7076'); blg.addColorStop(1, '#41464b');
    ctx.fillStyle = blg; ctx.beginPath(); ctx.roundRect(bx0 + 6 * k, by - 16 * k, bx1 - bx0 - 12 * k, 18 * k, [5 * k, 5 * k, 0, 0]); ctx.fill(); // the blanket
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = bx0 + 20 * k; x < bx1 - 20 * k; x += 40 * k) ctx.fillRect(x, by - 15 * k, 3 * k, 17 * k);
    const plg = ctx.createLinearGradient(0, by - 26 * k, 0, by - 10 * k); plg.addColorStop(0, '#e8e0cc'); plg.addColorStop(1, '#a8a090');
    ctx.fillStyle = plg; ctx.beginPath(); ctx.roundRect(bx0 + 8 * k, by - 26 * k, 54 * k, 16 * k, 7 * k); ctx.fill(); // the pillow
    ctx.fillStyle = '#4a3018'; ctx.fillRect(bx0, by + 4 * k, bx1 - bx0, 10 * k); ctx.fillStyle = 'rgba(255,222,176,0.1)'; ctx.fillRect(bx0, by + 4 * k, bx1 - bx0, 1.5); // the lee board
    for (let x = bx0 + 30 * k; x < bx1; x += 80 * k) { ctx.fillStyle = '#2a1a0c'; ctx.fillRect(x, by + 20 * k, 40 * k, floor - by - 26 * k); ctx.fillStyle = 'rgba(8,4,0,0.5)'; ctx.fillRect(x, by + 20 * k, 40 * k, 2.5); ctx.fillStyle = brass(0, 0, 0, 4 * k); ctx.fillRect(x + 16 * k, by + 30 * k, 8 * k, 3 * k); } // drawers under it
    contact((bx0 + bx1) / 2, floor + 4 * k, (bx1 - bx0) * 0.6, 14 * k, 0.6);
    // ---------- the porthole on the sea, the horizon rolling; dark at night ----------
    const px = X(0.335), py = ceil + RH * 0.33, pr = 54 * k;
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.clip();
    const sky = ctx.createLinearGradient(0, py - pr, 0, py); sky.addColorStop(0, `rgb(${Math.round(20 + 100 * dayK)},${Math.round(30 + 140 * dayK)},${Math.round(50 + 170 * dayK)})`); sky.addColorStop(1, `rgb(${Math.round(30 + 150 * dayK)},${Math.round(40 + 175 * dayK)},${Math.round(60 + 175 * dayK)})`);
    ctx.fillStyle = sky; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.translate(px, py); ctx.rotate(Math.sin(t * 0.55) * 0.08);
    const sea = ctx.createLinearGradient(0, pr * 0.12, 0, pr); sea.addColorStop(0, `rgb(${Math.round(20 + 40 * dayK)},${Math.round(45 + 80 * dayK)},${Math.round(65 + 90 * dayK)})`); sea.addColorStop(1, `rgb(${Math.round(8 + 18 * dayK)},${Math.round(22 + 45 * dayK)},${Math.round(36 + 55 * dayK)})`);
    ctx.fillStyle = sea; ctx.fillRect(-pr * 1.5, pr * 0.12, pr * 3, pr * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.3 * dayK})`; ctx.fillRect(-pr * 1.5, pr * 0.12, pr * 3, 1.5);
    ctx.rotate(-Math.sin(t * 0.55) * 0.08);
    const inner = ctx.createRadialGradient(0, pr * 0.2, pr * 0.6, 0, 0, pr); inner.addColorStop(0, 'rgba(0,0,0,0)'); inner.addColorStop(1, 'rgba(0,0,0,0.45)'); // the depth of the hull round the glass
    ctx.fillStyle = inner; ctx.fillRect(-pr, -pr, pr * 2, pr * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.ellipse(-pr * 0.3, -pr * 0.35, pr * 0.5, pr * 0.16, -0.6, 0, TAU); ctx.fill(); // the glass
    ctx.restore();
    shadow(px, py, 12, 0.55); ctx.strokeStyle = brass(px - pr, py - pr, px + pr, py + pr); ctx.lineWidth = 9 * k; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.stroke(); noShadow();
    ctx.strokeStyle = '#6a4e1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, pr + 5 * k, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(px, py, pr - 4.5 * k, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8, bx = px + Math.cos(a) * (pr + 1), byy = py + Math.sin(a) * (pr + 1); ctx.fillStyle = '#5a4018'; ctx.beginPath(); ctx.arc(bx + 0.6, byy + 0.8, 2.4 * k, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8cc80'; ctx.beginPath(); ctx.arc(bx, byy, 2.1 * k, 0, TAU); ctx.fill(); }
    // ---------- a photo of the Margaret, a little crooked ----------
    ctx.save(); ctx.translate(X(0.415), ceil + RH * 0.2); ctx.rotate(-0.05);
    shadow(X(0.415), ceil + RH * 0.2, 6, 0.55); ctx.fillStyle = '#e0d8c2'; ctx.fillRect(-24 * k, -18 * k, 48 * k, 36 * k); noShadow();
    ctx.fillStyle = '#7aa8c4'; ctx.fillRect(-20 * k, -14 * k, 40 * k, 20 * k); ctx.fillStyle = '#3a6a8a'; ctx.fillRect(-20 * k, 6 * k, 40 * k, 8 * k);
    ctx.fillStyle = '#e8e4da'; ctx.fillRect(-12 * k, -2 * k, 22 * k, 6 * k); ctx.fillStyle = '#b8443a'; ctx.fillRect(-14 * k, 4 * k, 26 * k, 3 * k); ctx.fillStyle = '#f0ece0'; ctx.fillRect(-4 * k, -8 * k, 8 * k, 6 * k);
    ctx.fillStyle = 'rgba(120,90,40,0.18)'; ctx.fillRect(-24 * k, -18 * k, 48 * k, 36 * k); // yellowed
    ctx.restore();
    // ---------- the brass clock and barometer, side by side ----------
    for (const [fx, face] of [[0.475, 'clock'], [0.53, 'baro']]) {
      const cx = X(fx), cy = ceil + RH * 0.27, r = 24 * k;
      shadow(cx, cy, 10, 0.6); ctx.fillStyle = '#3a2614'; ctx.beginPath(); ctx.arc(cx, cy, r + 9 * k, 0, TAU); ctx.fill(); noShadow();
      ctx.fillStyle = brass(cx - r, cy - r, cx + r, cy + r); ctx.beginPath(); ctx.arc(cx, cy, r + 4 * k, 0, TAU); ctx.fill();
      const fc = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 0, cx, cy, r); fc.addColorStop(0, '#f4ecd8'); fc.addColorStop(1, '#cfc4a8');
      ctx.fillStyle = fc; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a2016'; ctx.lineWidth = 1.2; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95); ctx.stroke(); }
      const hands = face === 'clock' ? [[(t / 600) % 1 * TAU, 0.5, 2.2], [(t / 50) % 1 * TAU, 0.78, 1.4]] : [[-0.6 + Math.sin(t * 0.05) * 0.05, 0.8, 1.4], [-0.9, 0.7, 1]];
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1.5;
      for (const [a, l, w] of hands) { ctx.strokeStyle = face === 'baro' && w < 1.2 ? '#b8954a' : '#1a1410'; ctx.lineWidth = w * k; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(a) * r * l, cy - Math.cos(a) * r * l); ctx.stroke(); }
      noShadow();
      ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy, 2.5 * k, 0, TAU); ctx.fill();
      const inr = ctx.createRadialGradient(cx, cy + r * 0.15, r * 0.7, cx, cy, r); inr.addColorStop(0, 'rgba(0,0,0,0)'); inr.addColorStop(1, 'rgba(40,20,0,0.35)'); ctx.fillStyle = inr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); // the bezel's shadow on the face
    }
    // ---------- the galley corner: a shelf of mugs and jars behind a fiddle rail, a gimballed stove ----------
    const gx0 = X(0.455), gx1 = X(0.6), shelfY = ceil + RH * 0.44;
    shadow((gx0 + gx1) / 2, shelfY, 8, 0.6); ctx.fillStyle = '#3a2614'; ctx.fillRect(gx0, shelfY, gx1 - gx0, 7 * k); noShadow();
    ctx.fillStyle = 'rgba(255,222,176,0.12)'; ctx.fillRect(gx0, shelfY, gx1 - gx0, 1.5);
    const jars = ['#c8a050', '#8a3a2a', '#e8e0d0', '#5a7a5a', '#d8d0c0', '#7a5a3a'];
    for (let i = 0; i < 6; i++) {
      const jx = gx0 + 10 * k + i * (gx1 - gx0 - 20 * k) / 6, jw = i % 2 ? 16 * k : 14 * k, jh = i % 2 ? 20 * k : 16 * k;
      shadow(jx, shelfY - jh, 5, 0.5); ctx.fillStyle = jars[i]; ctx.fillRect(jx, shelfY - jh, jw, jh); noShadow();
      if (i % 2) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(jx, shelfY - 22 * k, 16 * k, 4 * k); } else { ctx.strokeStyle = jars[i]; ctx.lineWidth = 2.5 * k; ctx.beginPath(); ctx.arc(jx + 16 * k, shelfY - 8 * k, 4 * k, -1.3, 1.3); ctx.stroke(); }
      const cyl = ctx.createLinearGradient(jx, 0, jx + jw, 0); cyl.addColorStop(0, 'rgba(0,0,0,0.25)'); cyl.addColorStop(0.3, 'rgba(255,255,255,0.18)'); cyl.addColorStop(0.5, 'rgba(255,255,255,0)'); cyl.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = cyl; ctx.fillRect(jx, shelfY - jh, jw, jh); // round, lit from the lamp side
    }
    ctx.strokeStyle = brass(0, shelfY - 11 * k, 0, shelfY - 9 * k); ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(gx0, shelfY - 10 * k); ctx.lineTo(gx1, shelfY - 10 * k); ctx.stroke(); // the fiddle rail
    const sx = (gx0 + gx1) / 2, stoveTop = floor - RH * 0.3;
    shadow(sx, stoveTop + 40 * k, 16, 0.5);
    const cg = ctx.createLinearGradient(gx0, 0, gx1, 0); cg.addColorStop(0, '#383c40'); cg.addColorStop(0.5, '#2e3236'); cg.addColorStop(1, '#202326');
    ctx.fillStyle = cg; ctx.fillRect(gx0 + 4 * k, stoveTop, gx1 - gx0 - 8 * k, floor - stoveTop); noShadow(); // the galley cabinet
    for (const ddx of [gx0 + 12 * k, sx + 4 * k]) { const dw0 = (gx1 - gx0) / 2 - 16 * k, dh0 = floor - stoveTop - 24 * k; ctx.fillStyle = '#363a3e'; ctx.fillRect(ddx, stoveTop + 14 * k, dw0, dh0); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(ddx, stoveTop + 14 * k, dw0, 2); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(ddx, stoveTop + 14 * k + dh0 - 1.5, dw0, 1.5); }
    contact(sx, floor + 4 * k, (gx1 - gx0) * 0.6, 12 * k, 0.6);
    ctx.save(); ctx.translate(sx, stoveTop); ctx.rotate(-roll * 2); // the stove swings level on its gimbals
    const stg = ctx.createLinearGradient(0, -16 * k, 0, 0); stg.addColorStop(0, '#d4d8dc'); stg.addColorStop(1, '#868a8e');
    ctx.fillStyle = stg; ctx.fillRect(-46 * k, -16 * k, 92 * k, 16 * k); ctx.fillStyle = '#1a1c1e'; ctx.fillRect(-36 * k, -18 * k, 26 * k, 3 * k); ctx.fillRect(10 * k, -18 * k, 26 * k, 3 * k);
    ctx.fillStyle = '#5a5e62'; ctx.fillRect(-46 * k, -4 * k, 92 * k, 4 * k);
    // the kettle, on the left burner: a dome, a spout, a black handle
    const kb = -18 * k; // the burner's top
    contact(-23 * k, kb, 17 * k, 3 * k, 0.6);
    const ktg = ctx.createLinearGradient(-38 * k, 0, -8 * k, 0); ktg.addColorStop(0, '#8a8a84'); ktg.addColorStop(0.3, '#e4e2d8'); ktg.addColorStop(0.55, '#b8b6ac'); ktg.addColorStop(1, '#6a6a64');
    ctx.fillStyle = ktg; ctx.beginPath(); ctx.moveTo(-40 * k, kb); ctx.quadraticCurveTo(-40 * k, kb - 16 * k, -23 * k, kb - 18 * k); ctx.quadraticCurveTo(-6 * k, kb - 16 * k, -6 * k, kb); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-9 * k, kb - 6 * k); ctx.lineTo(2 * k, kb - 15 * k); ctx.lineTo(3 * k, kb - 12 * k); ctx.lineTo(-7 * k, kb - 2 * k); ctx.closePath(); ctx.fill(); // the spout
    ctx.fillStyle = '#3a3a36'; ctx.beginPath(); ctx.ellipse(-23 * k, kb - 18 * k, 4 * k, 1.8 * k, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(-34 * k, kb - 13 * k); ctx.quadraticCurveTo(-23 * k, kb - 34 * k, -12 * k, kb - 13 * k); ctx.stroke();
    ctx.restore();
    // ---------- the fish chart, pinned up over the desk ----------
    ctx.save(); ctx.translate(X(0.665), ceil + RH * 0.24); ctx.rotate(0.025);
    shadow(X(0.665), ceil + RH * 0.24, 8, 0.5);
    ctx.fillStyle = '#e0d8c0'; ctx.beginPath(); ctx.moveTo(-58 * k, -40 * k); ctx.lineTo(58 * k, -40 * k); ctx.lineTo(58 * k, 36 * k); ctx.quadraticCurveTo(50 * k, 42 * k, 40 * k, 40 * k); ctx.lineTo(-58 * k, 40 * k); ctx.closePath(); ctx.fill(); noShadow(); // a corner curling off the wall
    const pa = ctx.createLinearGradient(0, -40 * k, 0, 40 * k); pa.addColorStop(0, 'rgba(120,90,40,0.05)'); pa.addColorStop(1, 'rgba(120,90,40,0.2)'); ctx.fillStyle = pa; ctx.fillRect(-58 * k, -40 * k, 116 * k, 80 * k);
    ctx.fillStyle = '#3a3226'; ctx.font = `${Math.round(8 * k)}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.fillText('FISHES OF THE SHELF', 0, -28 * k);
    const fcols = ['#5a7a8a', '#c86a3a', '#7a8a5a', '#a85a6a', '#5a6a9a', '#c8a050'];
    for (let i = 0; i < 6; i++) { const fx = -36 * k + (i % 3) * 36 * k, fy = -8 * k + Math.floor(i / 3) * 26 * k; ctx.fillStyle = fcols[i]; ctx.beginPath(); ctx.ellipse(fx, fy, 12 * k, 5 * k, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(fx + 11 * k, fy); ctx.lineTo(fx + 18 * k, fy - 5 * k); ctx.lineTo(fx + 18 * k, fy + 5 * k); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(58 * k, 36 * k); ctx.quadraticCurveTo(50 * k, 42 * k, 40 * k, 40 * k); ctx.lineTo(56 * k, 30 * k); ctx.fill();
    ctx.fillStyle = '#b83a2a'; ctx.beginPath(); ctx.arc(-54 * k, -36 * k, 2.5 * k, 0, TAU); ctx.arc(54 * k, -36 * k, 2.5 * k, 0, TAU); ctx.fill();
    ctx.restore();
    // ---------- the desk and the computer: a beige CRT glowing green, a keyboard, a mug, a desk lamp ----------
    const kx = X(ROOM.desk), dTop = floor - RH * 0.34, on = this.near() === 'desk';
    shadow(kx, dTop + 40 * k, 16, 0.5);
    ctx.fillStyle = '#4a3018'; ctx.fillRect(kx - 112 * k, dTop + 14 * k, 70 * k, floor - dTop - 14 * k); ctx.fillRect(kx + 104 * k, dTop + 14 * k, 12 * k, floor - dTop - 14 * k);
    noShadow();
    ctx.fillStyle = 'rgba(8,4,0,0.5)'; ctx.fillRect(kx - 42 * k, dTop + 14 * k, 146 * k, 10 * k); // under the desktop
    const tg = ctx.createLinearGradient(0, dTop, 0, dTop + 14 * k); tg.addColorStop(0, '#7a5634'); tg.addColorStop(0.2, '#5a3e26'); tg.addColorStop(1, '#3e2814');
    ctx.fillStyle = tg; ctx.fillRect(kx - 120 * k, dTop, 240 * k, 14 * k);
    for (let i = 0; i < 3; i++) { const yy = dTop + 24 * k + i * 30 * k; ctx.fillStyle = '#3a2410'; ctx.fillRect(kx - 106 * k, yy, 58 * k, 24 * k); ctx.fillStyle = 'rgba(8,4,0,0.45)'; ctx.fillRect(kx - 106 * k, yy, 58 * k, 2); ctx.fillStyle = 'rgba(255,222,176,0.08)'; ctx.fillRect(kx - 106 * k, yy + 22.5 * k, 58 * k, 1.5); ctx.fillStyle = brass(0, yy + 10 * k, 0, yy + 13 * k); ctx.fillRect(kx - 80 * k, yy + 10 * k, 8 * k, 3 * k); }
    contact(kx - 77 * k, floor + 4 * k, 60 * k, 10 * k, 0.6); contact(kx + 110 * k, floor + 4 * k, 18 * k, 6 * k, 0.5);
    contact(kx, dTop, 70 * k, 5 * k, 0.55);
    shadow(kx, dTop - 50 * k, 14, 0.55);
    const crt = ctx.createLinearGradient(kx - 58 * k, 0, kx + 58 * k, 0); crt.addColorStop(0, '#e0d6ba'); crt.addColorStop(0.6, '#cfc4a4'); crt.addColorStop(1, '#a89c7c');
    ctx.fillStyle = crt; ctx.beginPath(); ctx.roundRect(kx - 58 * k, dTop - 100 * k, 116 * k, 96 * k, 6 * k); ctx.fill(); noShadow();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(kx - 54 * k, dTop - 99 * k, 108 * k, 1.5);
    ctx.fillStyle = '#b4a888'; ctx.fillRect(kx - 30 * k, dTop - 6 * k, 60 * k, 6 * k);
    ctx.fillStyle = '#8a7e60'; ctx.beginPath(); ctx.roundRect(kx - 49 * k, dTop - 93 * k, 98 * k, 74 * k, 9 * k); ctx.fill(); // the bezel's recess
    const scr = ctx.createRadialGradient(kx, dTop - 56 * k, 8 * k, kx, dTop - 56 * k, 60 * k); scr.addColorStop(0, on ? '#0e3a22' : '#0c2c1a'); scr.addColorStop(1, '#03100a');
    ctx.fillStyle = scr; ctx.beginPath(); ctx.roundRect(kx - 46 * k, dTop - 90 * k, 92 * k, 68 * k, 8 * k); ctx.fill();
    const flick = 0.92 + Math.sin(t * 31) * 0.03;
    ctx.fillStyle = `rgba(110,255,150,${(on ? 0.95 : 0.7) * flick})`; ctx.font = `${Math.round(10 * k)}px "IBM Plex Mono", monospace`; ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(110,255,150,0.6)'; ctx.shadowBlur = 5 * k;
    ctx.fillText('BAYSIDE MARINE', kx - 38 * k, dTop - 72 * k); ctx.fillText('SUPPLY', kx - 38 * k, dTop - 58 * k); ctx.fillText('>_' + (Math.floor(t * 2) % 2 ? '' : '█'), kx - 38 * k, dTop - 40 * k);
    noShadow();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = dTop - 90 * k; y < dTop - 22 * k; y += 3) ctx.fillRect(kx - 46 * k, y, 92 * k, 1); // scan lines
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.ellipse(kx - 18 * k, dTop - 78 * k, 26 * k, 8 * k, -0.25, 0, TAU); ctx.fill(); // the curve of the glass
    ctx.fillStyle = '#c0b494'; ctx.fillRect(kx - 52 * k, dTop - 9 * k, 84 * k, 7 * k); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 12; i++) ctx.fillRect(kx - 50 * k + i * 6.8 * k, dTop - 7 * k, 5 * k, 1.2); // the keyboard
    shadow(kx + 64 * k, dTop - 8 * k, 5, 0.5);
    const mg = ctx.createLinearGradient(kx + 58 * k, 0, kx + 71 * k, 0); mg.addColorStop(0, '#f4ecdc'); mg.addColorStop(1, '#b8b0a0');
    ctx.fillStyle = mg; ctx.fillRect(kx + 58 * k, dTop - 16 * k, 13 * k, 16 * k); noShadow();
    ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 2.2 * k; ctx.beginPath(); ctx.arc(kx + 73 * k, dTop - 8 * k, 4.5 * k, -1.2, 1.2); ctx.stroke(); // the mug
    shadow(kx + 90 * k, dTop - 40 * k, 6, 0.5);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(kx + 96 * k, dTop); ctx.lineTo(kx + 96 * k, dTop - 50 * k); ctx.lineTo(kx + 78 * k, dTop - 66 * k); ctx.stroke(); // the desk lamp
    ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.moveTo(kx + 66 * k, dTop - 62 * k); ctx.lineTo(kx + 86 * k, dTop - 74 * k); ctx.lineTo(kx + 92 * k, dTop - 62 * k); ctx.closePath(); ctx.fill();
    noShadow();
    ctx.fillStyle = '#fff0c8'; ctx.beginPath(); ctx.arc(kx + 79 * k, dTop - 63 * k, 3 * k, 0, Math.PI); ctx.fill();
    // ---------- the right-hand bulkhead: a fuse panel, a life jacket, a fire extinguisher ----------
    const rx = X(0.868); // (2.6.8: moved along for the aquarium)
    shadow(rx, ceil + RH * 0.2, 8, 0.55);
    const fpg = ctx.createLinearGradient(rx - 26 * k, 0, rx + 26 * k, 0); fpg.addColorStop(0, '#5a5e62'); fpg.addColorStop(1, '#383c40');
    ctx.fillStyle = fpg; ctx.fillRect(rx - 26 * k, ceil + RH * 0.16, 52 * k, 70 * k); noShadow();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(rx - 26 * k, ceil + RH * 0.16, 52 * k, 1.5);
    ctx.fillStyle = '#22262a'; for (let i = 0; i < 6; i++) ctx.fillRect(rx - 18 * k + (i % 3) * 13 * k, ceil + RH * 0.16 + 10 * k + Math.floor(i / 3) * 26 * k, 8 * k, 16 * k);
    ctx.fillStyle = '#7ad890'; ctx.fillRect(rx + 16 * k, ceil + RH * 0.16 + 6 * k, 4 * k, 4 * k);
    ctx.save(); ctx.translate(rx, ceil + RH * 0.42); ctx.rotate(roll * 2);
    shadow(rx, ceil + RH * 0.5, 12, 0.55);
    ctx.fillStyle = '#e0602a'; ctx.beginPath(); ctx.roundRect(-24 * k, 0, 48 * k, 74 * k, 10 * k); ctx.fill(); noShadow();
    const ljg = ctx.createLinearGradient(-24 * k, 0, 24 * k, 0); ljg.addColorStop(0, 'rgba(255,220,180,0.12)'); ljg.addColorStop(0.5, 'rgba(0,0,0,0)'); ljg.addColorStop(1, 'rgba(60,10,0,0.35)');
    ctx.fillStyle = ljg; ctx.beginPath(); ctx.roundRect(-24 * k, 0, 48 * k, 74 * k, 10 * k); ctx.fill();
    ctx.fillStyle = '#b8401a'; ctx.fillRect(-2 * k, 4 * k, 4 * k, 66 * k);
    ctx.fillStyle = '#d8d4ca'; ctx.fillRect(-24 * k, 26 * k, 48 * k, 5 * k); ctx.fillRect(-24 * k, 48 * k, 48 * k, 5 * k);
    ctx.restore();
    const fx2 = X(0.843), fTop = floor - 110 * k; // (2.6.8: moved along for the aquarium)
    shadow(fx2, fTop + 40 * k, 10, 0.55);
    const exg = ctx.createLinearGradient(fx2 - 13 * k, 0, fx2 + 13 * k, 0); exg.addColorStop(0, '#9a1c14'); exg.addColorStop(0.3, '#d0342a'); exg.addColorStop(0.5, '#b8241a'); exg.addColorStop(1, '#5e100a');
    ctx.fillStyle = exg; ctx.beginPath(); ctx.roundRect(fx2 - 13 * k, fTop, 26 * k, 96 * k, 9 * k); ctx.fill(); noShadow();
    ctx.fillStyle = '#d8d4ca'; ctx.fillRect(fx2 - 13 * k, fTop + 30 * k, 26 * k, 16 * k); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(fx2 - 6 * k, fTop - 12 * k, 12 * k, 12 * k); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(fx2 + 6 * k, fTop - 6 * k); ctx.quadraticCurveTo(fx2 + 24 * k, fTop, fx2 + 16 * k, fTop + 30 * k); ctx.stroke();
    ctx.fillStyle = '#5a5e62'; ctx.fillRect(fx2 - 16 * k, fTop + 60 * k, 32 * k, 4 * k);
    // ---------- the aquarium (2.6.8): a lit tank on a wooden stand, the animals kept in it swimming ----------
    {
      const tx = X(ROOM.tank), tw = 170 * k, sh = RH * 0.27, gh = RH * 0.3, gb = floor - sh, gt = gb - gh;
      contact(tx, floor + 4 * k, tw * 0.6, 7 * k, 0.6);
      shadow(tx, floor - sh * 0.5, 10, 0.5);
      const sg = ctx.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0); sg.addColorStop(0, '#4a3018'); sg.addColorStop(0.5, '#3e2812'); sg.addColorStop(1, '#2a1a0a');
      ctx.fillStyle = sg; ctx.fillRect(tx - tw / 2 - 4 * k, gb + 6 * k, tw + 8 * k, sh - 6 * k); noShadow(); // the stand
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(tx - 1, gb + 14 * k, 2, sh - 20 * k);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(tx - tw / 2 + 6 * k, gb + 14 * k, tw / 2 - 10 * k, sh - 20 * k); ctx.strokeRect(tx + 4 * k, gb + 14 * k, tw / 2 - 10 * k, sh - 20 * k);
      ctx.fillStyle = brass(0, 0, 0, 6 * k); ctx.fillRect(tx - 12 * k, gb + sh * 0.5, 5 * k, 10 * k); ctx.fillRect(tx + 7 * k, gb + sh * 0.5, 5 * k, 10 * k); // knobs
      ctx.fillStyle = '#1a1a18'; ctx.fillRect(tx - tw / 2 - 2 * k, gb, tw + 4 * k, 7 * k); // the base rim
      // the water
      const L0 = this.h.light ? this.h.light() : 'day';
      const wc = L0 === 'red' ? ['#5a1e20', '#2a0c0e'] : L0 === 'dim' ? ['#1e5464', '#0a2832'] : ['#4ab0c8', '#1a6478'];
      const wg = ctx.createLinearGradient(0, gt, 0, gb); wg.addColorStop(0, wc[0]); wg.addColorStop(1, wc[1]);
      ctx.fillStyle = wg; ctx.fillRect(tx - tw / 2, gt, tw, gh);
      ctx.save(); ctx.beginPath(); ctx.rect(tx - tw / 2, gt, tw, gh); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 4; i++) { const bx = tx - tw / 2 + (0.15 + i * 0.24) * tw + Math.sin(t * 0.4 + i) * 6 * k; ctx.beginPath(); ctx.moveTo(bx, gt); ctx.lineTo(bx + 14 * k, gt); ctx.lineTo(bx + 30 * k, gb); ctx.lineTo(bx + 18 * k, gb); ctx.fill(); } // light shafts
      ctx.fillStyle = '#a89470'; ctx.beginPath(); ctx.moveTo(tx - tw / 2, gb); for (let x = 0; x <= tw; x += 10 * k) ctx.lineTo(tx - tw / 2 + x, gb - 9 * k - Math.sin(x / (30 * k)) * 3 * k); ctx.lineTo(tx + tw / 2, gb); ctx.fill(); // sand
      ctx.fillStyle = '#5e5446'; ctx.beginPath(); ctx.ellipse(tx + tw * 0.24, gb - 10 * k, 26 * k, 18 * k, 0, Math.PI, TAU); ctx.fill(); // a rock
      ctx.strokeStyle = '#5f9a3a'; ctx.lineWidth = 2.5 * k; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const x = tx - tw * 0.38 + i * 6 * k, h = gh * (0.35 + (i % 3) * 0.12), sw = Math.sin(t * 0.9 + i) * 5 * k; ctx.beginPath(); ctx.moveTo(x, gb - 6 * k); ctx.quadraticCurveTo(x + sw * 0.5, gb - h * 0.5, x + sw, gb - h); ctx.stroke(); }
      ctx.lineCap = 'butt';
      // the animals kept in it: each swims slowly back and forth at its own depth
      const fish = (this.h.tankFish ? this.h.tankFish() : []).slice(0, 10);
      fish.forEach((d, i) => {
        const sp = SPECIES_BY_ID[d.id]; if (!sp) return;
        const L = clamp((d.len || sp.len) * 90 * k, 14 * k, 54 * k), dead = (d.cond ?? 1) <= 0.05;
        const span = tw / 2 - L * 0.7, ph = t * (0.12 + (i % 4) * 0.03) + i * 1.7, xq = Math.sin(ph), dir = Math.cos(ph) >= 0 ? 1 : -1;
        const fy = dead ? gt + 10 * k : gt + gh * (0.22 + ((i * 0.37) % 0.6)) + Math.sin(t * 0.7 + i) * 3 * k;
        ctx.save(); ctx.translate(tx + xq * span, fy); if (dir > 0) ctx.scale(-1, 1); if (dead) ctx.rotate(Math.PI);
        try { drawSpecies(ctx, sp, L, t * 2 + i, dead ? 0 : 0.8, 0); } catch (e) { /* a shape that cannot be drawn this small */ }
        ctx.restore();
      });
      ctx.fillStyle = 'rgba(230,245,255,0.35)'; for (let i = 0; i < 7; i++) { const bx = tx + tw * 0.4 + Math.sin(t * 2 + i) * 2 * k, by = gb - ((t * 30 * k + i * 23 * k) % gh); ctx.beginPath(); ctx.arc(bx, by, (1.2 + (i % 3) * 0.6) * k, 0, TAU); ctx.fill(); } // the air stone's bubbles
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(tx - tw / 2, gt + 4 * k, tw, 2 * k); // the waterline
      ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(tx - tw / 2 + 8 * k, gt); ctx.lineTo(tx - tw / 2 + 22 * k, gt); ctx.lineTo(tx - tw / 2 + 4 * k, gb); ctx.lineTo(tx - tw / 2, gb); ctx.fill(); // a glint on the glass
      ctx.strokeStyle = '#141412'; ctx.lineWidth = 5 * k; ctx.strokeRect(tx - tw / 2, gt, tw, gh); // the frame
      shadow(tx, gt - 8 * k, 6, 0.5); ctx.fillStyle = '#1e1e1c'; ctx.fillRect(tx - tw / 2 - 5 * k, gt - 14 * k, tw + 10 * k, 14 * k); noShadow(); // the hood, its lamp inside
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(tx - tw / 2 - 5 * k, gt - 14 * k, tw + 10 * k, 1.5);
      this.tankAt = [tx, gt, tw, gh];
    }
    // ---------- the front of the wheelhouse (2.5.0): the radio, the windows on the sea, the wheel ----------
    if (X(1.0) < W + 50) {
      // the radio on its shelf: a grey-green set, an amber dial, two knobs, a speaker grille, the handset on its hook
      const rx0 = X(ROOM.radio), ry0 = ceil + RH * 0.4, rw = 112 * k, rh = 58 * k;
      shadow(rx0, ry0 + rh, 8, 0.55); ctx.fillStyle = '#3a2614'; ctx.fillRect(rx0 - rw / 2 - 14 * k, ry0 + rh, rw + 28 * k, 7 * k); noShadow();
      ctx.fillStyle = '#2a1a0c'; ctx.beginPath(); ctx.moveTo(rx0 - rw / 2 - 6 * k, ry0 + rh + 7 * k); ctx.lineTo(rx0 - rw / 2 - 6 * k, ry0 + rh + 30 * k); ctx.lineTo(rx0 - rw / 2 + 16 * k, ry0 + rh + 7 * k); ctx.fill(); // its bracket
      shadow(rx0, ry0 + rh * 0.5, 10, 0.55);
      const rg = ctx.createLinearGradient(0, ry0, 0, ry0 + rh); rg.addColorStop(0, '#5a6458'); rg.addColorStop(1, '#343c34');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.roundRect(rx0 - rw / 2, ry0, rw, rh, 4 * k); ctx.fill(); noShadow();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(rx0 - rw / 2 + 2, ry0 + 1, rw - 4, 1.5);
      ctx.fillStyle = '#1a1408'; ctx.fillRect(rx0 - rw / 2 + 10 * k, ry0 + 10 * k, 48 * k, 18 * k);
      const dial = ctx.createLinearGradient(0, ry0 + 10 * k, 0, ry0 + 28 * k); dial.addColorStop(0, '#ffcf70'); dial.addColorStop(1, '#c88a2a');
      ctx.fillStyle = dial; ctx.fillRect(rx0 - rw / 2 + 12 * k, ry0 + 12 * k, 44 * k, 14 * k);
      ctx.fillStyle = 'rgba(60,30,0,0.6)'; for (let i = 0; i < 9; i++) ctx.fillRect(rx0 - rw / 2 + 14 * k + i * 5 * k, ry0 + 13 * k, 0.8, i % 2 ? 4 * k : 7 * k);
      ctx.fillStyle = '#b8241a'; ctx.fillRect(rx0 - rw / 2 + 30 * k + Math.sin(t * 0.3) * 3 * k, ry0 + 12 * k, 1.5, 14 * k); // the needle
      for (const [kx2, kr] of [[rx0 - rw / 2 + 20 * k, 6], [rx0 - rw / 2 + 46 * k, 6]]) { ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(kx2, ry0 + 42 * k, kr * k, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(kx2 - 1.5 * k, ry0 + 40.5 * k, 1.5 * k, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (let yy = ry0 + 12 * k; yy < ry0 + rh - 8 * k; yy += 4 * k) ctx.fillRect(rx0 + 10 * k, yy, 34 * k, 2 * k); // the speaker grille
      ctx.fillStyle = '#7ad890'; ctx.fillRect(rx0 + rw / 2 - 10 * k, ry0 + 8 * k, 4 * k, 4 * k);
      shadow(rx0 + rw / 2 + 18 * k, ry0 + 20 * k, 6, 0.5);
      ctx.fillStyle = '#161616'; ctx.beginPath(); ctx.roundRect(rx0 + rw / 2 + 12 * k, ry0 + 4 * k, 12 * k, 34 * k, 5 * k); ctx.fill(); noShadow(); // the handset
      ctx.strokeStyle = '#161616'; ctx.lineWidth = 1.6 * k; ctx.beginPath(); ctx.moveTo(rx0 + rw / 2 + 18 * k, ry0 + 38 * k); for (let i = 0; i < 8; i++) ctx.quadraticCurveTo(rx0 + rw / 2 + (i % 2 ? 22 : 12) * k, ry0 + (42 + i * 4) * k, rx0 + rw / 2 + 16 * k, ry0 + (44 + i * 4) * k); ctx.lineTo(rx0 + rw / 2 - 2 * k, ry0 + rh - 6 * k); ctx.stroke(); // its coiled cord
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.moveTo(rx0 - rw / 2 + 8 * k, ry0); ctx.lineTo(rx0 - rw / 2 + 8 * k, ceil + 40 * k); ctx.stroke(); // the antenna lead up to the deckhead
      // the front windows, the sea beyond them rolling with the boat
      const wx0 = X(1.18), wx1 = X(1.43), wy0 = ceil + RH * 0.1, wy1 = ceil + RH * 0.4, n = 3, gap = 12 * k, ww = (wx1 - wx0 - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const x0 = wx0 + i * (ww + gap);
        shadow(x0 + ww / 2, wy0, 6, 0.5); ctx.fillStyle = '#2a2e30'; ctx.beginPath(); ctx.roundRect(x0 - 6 * k, wy0 - 6 * k, ww + 12 * k, wy1 - wy0 + 12 * k, 6 * k); ctx.fill(); noShadow();
        ctx.save(); ctx.beginPath(); ctx.roundRect(x0, wy0, ww, wy1 - wy0, 4 * k); ctx.clip();
        const sk2 = ctx.createLinearGradient(0, wy0, 0, wy1); sk2.addColorStop(0, `rgb(${Math.round(20 + 100 * dayK)},${Math.round(30 + 140 * dayK)},${Math.round(50 + 170 * dayK)})`); sk2.addColorStop(1, `rgb(${Math.round(30 + 150 * dayK)},${Math.round(40 + 175 * dayK)},${Math.round(60 + 175 * dayK)})`);
        ctx.fillStyle = sk2; ctx.fillRect(x0, wy0, ww, wy1 - wy0);
        const hz = wy0 + (wy1 - wy0) * 0.62 + Math.sin(t * 0.55) * 7 * k + (x0 - wx0) * Math.sin(t * 0.55) * 0.05;
        ctx.fillStyle = `rgb(${Math.round(18 + 40 * dayK)},${Math.round(40 + 80 * dayK)},${Math.round(60 + 90 * dayK)})`; ctx.fillRect(x0, hz, ww, wy1 - hz + 4);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.3 * dayK})`; ctx.fillRect(x0, hz, ww, 1.5);
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.beginPath(); ctx.moveTo(x0 + ww * 0.2, wy0); ctx.lineTo(x0 + ww * 0.45, wy0); ctx.lineTo(x0 + ww * 0.1, wy1); ctx.lineTo(x0 - ww * 0.15, wy1); ctx.fill(); // the glass
        ctx.restore();
      }
      ctx.fillStyle = '#3a2614'; ctx.fillRect(wx0 - 14 * k, wy1 + 6 * k, wx1 - wx0 + 28 * k, 9 * k); ctx.fillStyle = 'rgba(255,222,176,0.12)'; ctx.fillRect(wx0 - 14 * k, wy1 + 6 * k, wx1 - wx0 + 28 * k, 1.5); // the sill
      // the wheel's console: a wooden stand with a brass compass binnacle and the throttle
      const cx0 = X(ROOM.wheel), cTop = floor - RH * 0.36, cw = 92 * k;
      shadow(cx0, cTop + 60 * k, 16, 0.5);
      const cg2 = ctx.createLinearGradient(cx0 - cw / 2, 0, cx0 + cw / 2, 0); cg2.addColorStop(0, '#5a3e26'); cg2.addColorStop(0.5, '#4a3018'); cg2.addColorStop(1, '#2e1c0c');
      ctx.fillStyle = cg2; ctx.fillRect(cx0 - cw / 2, cTop, cw, floor - cTop); noShadow();
      ctx.fillStyle = '#6a4a2c'; ctx.fillRect(cx0 - cw / 2 - 6 * k, cTop - 8 * k, cw + 12 * k, 10 * k); ctx.fillStyle = 'rgba(255,222,176,0.14)'; ctx.fillRect(cx0 - cw / 2 - 6 * k, cTop - 8 * k, cw + 12 * k, 1.5);
      ctx.fillStyle = 'rgba(8,4,0,0.35)'; ctx.fillRect(cx0 - cw / 2 + 10 * k, cTop + 20 * k, cw - 20 * k, floor - cTop - 34 * k); ctx.fillStyle = 'rgba(255,222,176,0.06)'; ctx.fillRect(cx0 - cw / 2 + 10 * k, floor - 15 * k, cw - 20 * k, 1.5);
      contact(cx0, floor + 4 * k, cw * 0.75, 10 * k, 0.6);
      ctx.fillStyle = brass(cx0 + 10 * k, cTop - 40 * k, cx0 + 40 * k, cTop - 8 * k); ctx.beginPath(); ctx.ellipse(cx0 + 24 * k, cTop - 8 * k, 16 * k, 22 * k, 0, Math.PI, TAU); ctx.fill(); // the binnacle
      ctx.fillStyle = 'rgba(200,230,240,0.35)'; ctx.beginPath(); ctx.ellipse(cx0 + 24 * k, cTop - 18 * k, 9 * k, 7 * k, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3 * k; ctx.beginPath(); ctx.moveTo(cx0 - 30 * k, cTop - 6 * k); ctx.lineTo(cx0 - 36 * k, cTop - 34 * k); ctx.stroke(); ctx.fillStyle = '#b8241a'; ctx.beginPath(); ctx.arc(cx0 - 36 * k, cTop - 36 * k, 4.5 * k, 0, TAU); ctx.fill(); // the throttle
      // the wheel itself, seen nearly edge-on from the side: a rim, its spokes and handles, turning slowly with the sea
      const wcx = cx0 - cw / 2 - 4 * k, wcy = cTop - 22 * k, wr = 66 * k, sq = 0.3, wa = Math.sin(t * 0.4) * 0.25;
      ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 8 * k; ctx.beginPath(); ctx.moveTo(wcx, wcy); ctx.lineTo(cx0 - cw / 2 + 6 * k, wcy); ctx.stroke(); // the shaft
      shadow(wcx, wcy, 10, 0.5);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 7 * k; ctx.beginPath(); ctx.ellipse(wcx, wcy, wr * sq, wr, 0, 0, TAU); ctx.stroke(); noShadow();
      ctx.strokeStyle = 'rgba(255,222,176,0.2)'; ctx.lineWidth = 1.5 * k; ctx.beginPath(); ctx.ellipse(wcx, wcy, wr * sq, wr, 0, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = wa + i * TAU / 8, ex2 = wcx + Math.cos(a) * wr * 1.32 * sq, ey2 = wcy + Math.sin(a) * wr * 1.32;
        ctx.strokeStyle = '#6a4626'; ctx.lineWidth = 4 * k; ctx.beginPath(); ctx.moveTo(wcx, wcy); ctx.lineTo(ex2, ey2); ctx.stroke(); // a spoke, out through the rim to a handle
        ctx.strokeStyle = '#8a6038'; ctx.lineWidth = 6 * k; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(wcx + Math.cos(a) * wr * 1.08 * sq, wcy + Math.sin(a) * wr * 1.08); ctx.lineTo(ex2, ey2); ctx.stroke(); ctx.lineCap = 'butt';
      }
      ctx.fillStyle = brass(wcx - 10 * k, wcy - 10 * k, wcx + 10 * k, wcy + 10 * k); ctx.beginPath(); ctx.ellipse(wcx, wcy, 5 * k, 11 * k, 0, 0, TAU); ctx.fill(); // the brass hub
      // the second lamp, over the wheel
      ctx.strokeStyle = '#1a140e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(1.2), ceil); ctx.lineTo(lx2, ly - 12 * k); ctx.stroke();
      ctx.fillStyle = shg0(lx2); ctx.beginPath(); ctx.moveTo(lx2 - 17 * k, ly); ctx.lineTo(lx2 + 17 * k, ly); ctx.lineTo(lx2 + 8 * k, ly - 12 * k); ctx.lineTo(lx2 - 8 * k, ly - 12 * k); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(lx2 - 17 * k, ly - 1.5 * k, 34 * k, 1.5 * k);
    }
    // ---------- the hanging lamp: its flex, a green enamel shade ----------
    ctx.strokeStyle = '#1a140e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx0, ceil); ctx.lineTo(lx, ly - 12 * k); ctx.stroke();
    const shg = ctx.createLinearGradient(lx - 20 * k, 0, lx + 20 * k, 0); shg.addColorStop(0, '#5a6a52'); shg.addColorStop(0.4, '#4a5a44'); shg.addColorStop(1, '#26301f');
    ctx.fillStyle = shg; ctx.beginPath(); ctx.moveTo(lx - 20 * k, ly); ctx.lineTo(lx + 20 * k, ly); ctx.lineTo(lx + 9 * k, ly - 14 * k); ctx.lineTo(lx - 9 * k, ly - 14 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(lx - 20 * k, ly - 1.5 * k, 40 * k, 1.5 * k); // the white enamel inside, its lip showing
    // ---------- Earl, standing and walking: boots on, tank off ----------
    const ex = X(this.x), eh = RH * 0.5;
    contact(ex + (ex - lx) / W * 30 * k, floor + 6 * k, 34 * k, 6 * k, 0.65);
    const hopY = this.hop ? Math.sin((1 - this.hop / 0.55) * Math.PI) * eh * 0.22 : 0;
    ctx.save(); ctx.translate(ex, floor - eh * 0.5 - hopY); ctx.scale(this.face, 1); ctx.rotate(-Math.PI / 2);
    drawEarl(ctx, eh, this.step || 0, 0, null, null, { kind: 'none', tier: 0, t, suit: this.h.suit(), bag: [], land: true, noTank: true, noMask: true, walk: this.walk || 0 });
    ctx.restore();
    // ---------- the light: dim everywhere, warm under the lamp, cool by the porthole and door, green at the screen ----------
    const q = 0.5, lw = Math.ceil(W * q), lh = Math.ceil(H * q), lc = this.lc;
    if (lc.width !== lw || lc.height !== lh) { lc.width = lw; lc.height = lh; }
    const l = lc.getContext('2d');
    l.setTransform(1, 0, 0, 1, 0, 0); l.globalCompositeOperation = 'source-over';
    l.fillStyle = 'rgb(76,64,58)'; l.fillRect(0, 0, lw, lh);
    l.setTransform(q, 0, 0, q, 0, 0); l.globalCompositeOperation = 'lighter';
    const pool = (x, y, r, col, a, sy = 1) => { l.save(); l.translate(x, y); l.scale(1, sy); const gr = l.createRadialGradient(0, 0, 0, 0, 0, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.3, `rgba(${col},${a * 0.6})`); gr.addColorStop(0.65, `rgba(${col},${a * 0.2})`); gr.addColorStop(1, `rgba(${col},0)`); l.fillStyle = gr; l.fillRect(-r, -r, r * 2, r * 2); l.restore(); };
    pool(lx, ly + RH * 0.42, RH * 1.15, '255,190,120', 0.85, 0.8); // the lamp's pool, thrown downward by the shade
    pool(lx, ly + 20 * k, RH * 0.35, '255,206,150', 0.5);
    pool(lx, ceil + 4 * k, 90 * k, '255,190,120', 0.18, 0.4); // a little light round the shade's top on the deckhead
    const dl = 0.08 + 0.4 * dayK;
    pool(px, py, pr * 3.2, '150,180,215', dl); pool(px + 20 * k, floor + 10 * k, pr * 2.4, '150,180,215', dl * 0.5, 0.3); // the porthole, and its light on the floor
    pool(dx, floor - dh * 0.45, dw * 1.6, '150,175,205', dl * 0.75, 1.6);
    if (this.tankAt) { const [tx, gt, tw, gh] = this.tankAt; pool(tx, gt + gh * 0.5, tw * 1.1, '120,200,230', 0.75, 0.75); pool(tx, gt + gh * 0.5, tw * 0.55, '160,220,240', 0.5, 0.6); } // (2.6.8) the aquarium's own light
    if (this.doorSign) pool(this.doorSign[0], this.doorSign[1], 70 * k, '140,230,170', 0.45, 0.6); // the lit DECK sign
    pool(kx, dTop - 56 * k, 150 * k, '90,210,130', on ? 0.5 : 0.36); // the screen
    pool(kx + 78 * k, dTop - 10 * k, 120 * k, '255,200,130', 0.55, 0.6); // the desk lamp on the desktop
    pool(lx2, ly + RH * 0.4, RH * 0.85, '255,190,120', 0.6, 0.8); pool(lx2, ly + 20 * k, RH * 0.25, '255,206,150', 0.4); // the lamp over the wheel
    pool((X(1.18) + X(1.43)) / 2, ceil + RH * 0.25, RH * 0.75, '150,180,215', dl * 1.1, 0.8); // daylight through the front windows
    pool(X(ROOM.radio) - 30 * k, ceil + RH * 0.4 + 19 * k, 70 * k, '255,190,90', 0.35); // the radio's dial
    ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(lc, 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter'; // a little bloom round what glows
    const bloom = (x, y, r, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    if (this.tankAt) bloom(this.tankAt[0], this.tankAt[1] + this.tankAt[3] * 0.4, this.tankAt[2] * 0.6, '120,200,230', 0.12);
    if (this.doorSign) bloom(this.doorSign[0], this.doorSign[1], 60 * k, '120,230,150', 0.14);
    bloom(lx, ly + 3 * k, 26 * k, '255,220,160', 0.55); bloom(lx2, ly + 3 * k, 22 * k, '255,220,160', 0.45); bloom(X(ROOM.radio) - 22 * k, ceil + RH * 0.4 + 19 * k, 30 * k, '255,190,90', 0.3); bloom(kx, dTop - 56 * k, 70 * k, '80,200,120', on ? 0.16 : 0.1); bloom(kx + 79 * k, dTop - 62 * k, 16 * k, '255,220,160', 0.4);
    // daylight: through the gap round the door, and the porthole's glass bright against the dim room
    const dc = `${Math.round(120 + 90 * dayK)},${Math.round(140 + 90 * dayK)},${Math.round(160 + 80 * dayK)}`, da = 0.1 + 0.45 * dayK;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(ex - eh * 0.16, floor - eh * 1.05, eh * 0.32, eh * 1.1); ctx.clip('evenodd'); // Earl stands in front of it
    const gapG = ctx.createLinearGradient(0, dTopY, 0, floor); gapG.addColorStop(0, `rgba(${dc},${da * 0.35})`); gapG.addColorStop(0.5, `rgba(${dc},${da * 0.8})`); gapG.addColorStop(1, `rgba(${dc},${da * 0.3})`);
    ctx.fillStyle = gapG; ctx.fillRect(dx + dw / 2 + 1, dTopY - 2, 1.2, dh + 2); ctx.fillRect(dx - dw / 2 - 2.2, dTopY + dh * 0.1, 1, dh * 0.85); // brightest on the latch side, where it fits worst
    ctx.fillStyle = `rgba(${dc},${da * 0.3})`; ctx.fillRect(dx - dw / 2, dTopY - 2.2, dw, 1);
    ctx.fillStyle = `rgba(${dc},${da * 0.25})`; ctx.fillRect(dx - dw / 2 - 1, floor, dw + 2, 3);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr - 4 * k, 0, TAU); ctx.clip(); ctx.fillStyle = `rgba(140,170,200,${0.05 + 0.3 * dayK})`; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(dx, gy0, gr0 - 2 * k, 0, TAU); ctx.clip(); ctx.fillStyle = `rgba(140,170,200,${0.05 + 0.3 * dayK})`; ctx.fillRect(dx - gr0, gy0 - gr0, gr0 * 2, gr0 * 2); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff2d0'; ctx.beginPath(); ctx.arc(lx, ly + 2 * k, 5.5 * k, 0, Math.PI); ctx.arc(lx2, ly + 2 * k, 4.5 * k, 0, Math.PI); ctx.fill(); // the bulbs
    // glints: the brass and glass nearest the lamp catch it
    const glint = (x, y, r) => { const a = clamp(1 - Math.hypot(x - lx, y - ly) / (W * 0.35), 0, 1) * 0.7; if (a <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,240,210,${a})`); g.addColorStop(1, 'rgba(255,240,210,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    for (const fx of [0.475, 0.53]) glint(X(fx) + 12 * k, ceil + RH * 0.27 - 18 * k, 7 * k);
    glint(px + pr * 0.55, py - pr * 0.75, 8 * k); glint(sx - 30 * k, stoveTop - 30 * k, 6 * k); glint(kx - 40 * k, dTop - 84 * k, 6 * k);
    // the steam off the kettle's spout, soft, drawn over the light so it catches it
    const spx = sx + 3 * k, spy = stoveTop - 33 * k;
    for (let i = 0; i < 7; i++) {
      const ph = ((t * 0.3 + i / 7) % 1), r = (4 + ph * 16) * k, x = spx + ph * 14 * k + Math.sin(ph * 5 + i) * 6 * k, y = spy - ph * 90 * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); const a = 0.13 * Math.sin(ph * Math.PI); g.addColorStop(0, `rgba(240,230,215,${a})`); g.addColorStop(1, 'rgba(240,230,215,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}
