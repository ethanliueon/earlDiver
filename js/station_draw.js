// The research station (3.0.0), on the summit of the seamount. A steel lattice tower stands on the summit
// (~315 m) and carries the station ~30 m up, so its docking collar sits at ~285 m, inside the starter sub's
// rating. Everything is drawn in metres from the foot of the tower (X(dx), Y(dy): dy negative is up).
// (6.8.0) redrawn as a real, old, lit object: two pressure modules as shaded steel cylinders with domed heads,
// rib rings, rivet lines, rust weeping from round brass-rimmed portholes; an observation sphere with a viewport;
// an I-beam deck; tubular tower legs with growth at the joints; an instrument pod at the foot (no lettering
// but the station's own name, worn, in the game's type); faded rust floats; a dim amber mast lamp that swells
// slowly. No cyan, no bright green, no flat rectangles. The still parts are painted once per scale into a
// canvas and laid down each frame; only the lamps and the figure at the window move.
import { TAU } from './util.js';

export const STATION_TOP = 30;    // how far above the summit the station's deck frame stands
export const STATION_COLLAR = { dx: 10.2, dy: -31.9 }; // the docking collar, east end

const L = -24, R = 24, T = -(STATION_TOP + 11), B = 1.5; // the painted area, metres from the foot
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const FONT = '"Barlow Semi Condensed", "Arial Narrow", sans-serif';
let cache = null;

function paint(ctx, X, Y, m) {
  const top = -STATION_TOP, cy = top - 1.9, r = 1.6;
  const lw = (w) => Math.max(1, w * m);
  // a steel tube seen side on: a dark edge, a lit stripe along its upper third, a shadowed underside
  const tube = (x0, y0, x1, y1, w, base = [86, 88, 82]) => {
    const [a, b, c] = base, len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgb(${a * 0.45 | 0},${b * 0.45 | 0},${c * 0.45 | 0})`; ctx.lineWidth = lw(w); ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
    ctx.strokeStyle = `rgb(${a},${b},${c})`; ctx.lineWidth = lw(w * 0.62); ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
    const o = w * 0.18 * Math.sign(-ny || 1); // the light comes from above
    ctx.strokeStyle = `rgba(${Math.min(255, a * 1.6) | 0},${Math.min(255, b * 1.6) | 0},${Math.min(255, c * 1.5) | 0},0.7)`; ctx.lineWidth = lw(w * 0.18);
    ctx.beginPath(); ctx.moveTo(X(x0 + nx * o), Y(y0 + ny * o)); ctx.lineTo(X(x1 + nx * o), Y(y1 + ny * o)); ctx.stroke();
  };
  // growth at a joint: a few pale sponges and anemones, the colour of old bone
  const growth = (x, y, n, seed) => {
    for (let i = 0; i < n; i++) {
      const gx = x + (hash(seed + i) - 0.5) * 0.9, gy = y + (hash(seed + i * 3.1) - 0.5) * 0.7, rr = (0.12 + hash(seed + i * 7.3) * 0.18) * m;
      const gr = ctx.createRadialGradient(X(gx) - rr * 0.3, Y(gy) - rr * 0.4, rr * 0.1, X(gx), Y(gy), rr);
      gr.addColorStop(0, 'rgba(206,196,170,0.85)'); gr.addColorStop(1, 'rgba(110,100,82,0.7)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(X(gx), Y(gy), rr, rr * 0.8, 0, 0, TAU); ctx.fill();
    }
  };

  // ---- the mooring cables and their anchor blocks ----
  for (const s of [-1, 1]) {
    ctx.strokeStyle = 'rgba(34,36,34,0.85)'; ctx.lineWidth = lw(0.08);
    ctx.beginPath(); ctx.moveTo(X(s * 6), Y(top + 1)); ctx.quadraticCurveTo(X(s * 11), Y(top / 2 + 2), X(s * 15), Y(-0.9)); ctx.stroke();
    const bx = s * 15, bw = 2.2, bh = 1.1, gb = ctx.createLinearGradient(0, Y(-bh), 0, Y(0));
    gb.addColorStop(0, '#6d6c62'); gb.addColorStop(0.25, '#58574f'); gb.addColorStop(1, '#2c2c28');
    ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(X(bx - bw / 2), Y(0)); ctx.lineTo(X(bx - bw / 2 + 0.15), Y(-bh)); ctx.lineTo(X(bx + bw / 2 - 0.15), Y(-bh)); ctx.lineTo(X(bx + bw / 2), Y(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(150,146,128,0.5)'; ctx.lineWidth = lw(0.05); ctx.beginPath(); ctx.moveTo(X(bx - bw / 2 + 0.15), Y(-bh)); ctx.lineTo(X(bx + bw / 2 - 0.15), Y(-bh)); ctx.stroke();
    ctx.strokeStyle = '#3a3630'; ctx.lineWidth = lw(0.1); ctx.beginPath(); ctx.arc(X(bx), Y(-bh - 0.15), 0.22 * m, Math.PI, 0); ctx.stroke(); // the shackle
    growth(bx - 0.6, -bh + 0.1, 3, 40 + s);
  }

  // ---- the tower: four tubular legs (two seen), splayed at the foot, braced in bays ----
  const legX = (dy, s) => s * (2.6 + (dy / top) * -1.2 + 1.2);
  const bays = 6;
  for (let i = 0; i < bays; i++) { // the far bracing first, darker
    const ya = (top * i) / bays, yb = (top * (i + 1)) / bays;
    tube(legX(ya, -1), ya, legX(yb, 1), yb, 0.14, [60, 62, 58]); tube(legX(ya, 1), ya, legX(yb, -1), yb, 0.14, [60, 62, 58]);
  }
  for (let i = 1; i < bays; i++) { const yb = (top * i) / bays; tube(legX(yb, -1), yb, legX(yb, 1), yb, 0.16, [74, 76, 70]); }
  for (const s of [-1, 1]) tube(legX(0, s), 0, legX(top, s), top, 0.42, [92, 92, 84]);
  for (let i = 0; i <= bays; i++) { const yb = (top * i) / bays; for (const s of [-1, 1]) if (hash(i * 5 + s) > 0.35) growth(legX(yb, s), yb, 2 + (hash(i + s * 9) * 3 | 0), i * 13 + s); }
  // the cable tray up one leg, a dull rusted run
  ctx.strokeStyle = 'rgba(110,64,36,0.6)'; ctx.lineWidth = lw(0.09); ctx.beginPath(); ctx.moveTo(X(legX(0, 1) - 0.45), Y(-0.4)); ctx.lineTo(X(legX(top, 1) - 0.45), Y(top + 0.5)); ctx.stroke();
  // the instrument pod at the foot: a squat cylinder with a domed head, a cable to the leg
  { const px = -0.2, pw = 2.2, ph = 1.2, g = ctx.createLinearGradient(X(px - pw / 2), 0, X(px + pw / 2), 0);
    g.addColorStop(0, '#3e3d36'); g.addColorStop(0.3, '#9a9584'); g.addColorStop(0.45, '#b9b29c'); g.addColorStop(1, '#45433a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(px - pw / 2), Y(0)); ctx.lineTo(X(px - pw / 2), Y(-ph)); ctx.ellipse(X(px), Y(-ph), pw / 2 * m, 0.55 * m, 0, Math.PI, 0); ctx.lineTo(X(px + pw / 2), Y(0)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(40,38,32,0.7)'; ctx.lineWidth = lw(0.05); for (const yy of [-0.25, -0.85]) { ctx.beginPath(); ctx.moveTo(X(px - pw / 2), Y(yy)); ctx.lineTo(X(px + pw / 2), Y(yy)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(20,20,18,0.8)'; ctx.lineWidth = lw(0.07); ctx.beginPath(); ctx.moveTo(X(px + pw / 2), Y(-0.6)); ctx.quadraticCurveTo(X(2.6), Y(0), X(legX(-2, 1)), Y(-2)); ctx.stroke();
    growth(px - 0.7, -0.2, 3, 77); }

  // ---- the deck: an I-beam frame, its flanges catching the light, cross-members under it ----
  { const d0 = -11, d1 = 11, y0 = top, h = 0.6;
    for (let x = d0 + 1; x < d1; x += 2.5) tube(x, y0 + h, x + 1.2, y0 + h + 0.9, 0.1, [64, 64, 58]);
    const g = ctx.createLinearGradient(0, Y(y0), 0, Y(y0 + h));
    g.addColorStop(0, '#8c887a'); g.addColorStop(0.18, '#5d5b52'); g.addColorStop(0.22, '#3c3b35'); g.addColorStop(0.78, '#34332e'); g.addColorStop(0.82, '#6a675c'); g.addColorStop(1, '#2a2925');
    ctx.fillStyle = g; ctx.fillRect(X(d0), Y(y0), (d1 - d0) * m, h * m);
    ctx.fillStyle = 'rgba(30,29,26,0.8)'; for (let x = d0 + 0.6; x < d1; x += 1.1) { ctx.beginPath(); ctx.arc(X(x), Y(y0 + 0.08), 0.045 * m, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 9; i++) { const x = d0 + hash(i + 200) * (d1 - d0), w = 0.15 + hash(i + 210) * 0.3; const rg = ctx.createLinearGradient(0, Y(y0 + h), 0, Y(y0 + h + 0.6 + hash(i) * 1.2)); rg.addColorStop(0, 'rgba(112,60,32,0.5)'); rg.addColorStop(1, 'rgba(112,60,32,0)'); ctx.fillStyle = rg; ctx.fillRect(X(x), Y(y0 + h), w * m, (0.6 + hash(i) * 1.2) * m); } }

  // ---- the modules: steel cylinders with domed heads, shaded top to bottom ----
  const mod = (x0, x1, seed) => {
    const yT = cy - r, yB = cy + r, head = 1.05;
    const body = () => { ctx.beginPath(); ctx.moveTo(X(x0 + head), Y(yT)); ctx.lineTo(X(x1 - head), Y(yT)); ctx.ellipse(X(x1 - head), Y(cy), head * m, r * m, 0, -Math.PI / 2, Math.PI / 2); ctx.lineTo(X(x0 + head), Y(yB)); ctx.ellipse(X(x0 + head), Y(cy), head * m, r * m, 0, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); };
    const g = ctx.createLinearGradient(0, Y(yT), 0, Y(yB));
    g.addColorStop(0, '#4f4d44'); g.addColorStop(0.12, '#8c8775'); g.addColorStop(0.28, '#a19b86'); g.addColorStop(0.5, '#77725f'); g.addColorStop(0.82, '#55524a'); g.addColorStop(1, '#2e2d29');
    ctx.fillStyle = g; body(); ctx.fill();
    ctx.save(); body(); ctx.clip();
    // the heads: a seam where each dome meets the body, the dome a little darker at its far edge
    for (const [hx, dir] of [[x0 + head, -1], [x1 - head, 1]]) {
      const hg = ctx.createLinearGradient(X(hx), 0, X(hx + dir * head), 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(18,18,16,0.5)');
      ctx.fillStyle = hg; ctx.fillRect(Math.min(X(hx), X(hx + dir * head)), Y(yT), head * m, 2 * r * m);
      ctx.strokeStyle = 'rgba(40,38,33,0.6)'; ctx.lineWidth = lw(0.06); ctx.beginPath(); ctx.moveTo(X(hx), Y(yT)); ctx.lineTo(X(hx), Y(yB)); ctx.stroke();
    }
    // rib rings: a shadow line and a lit line, every metre and a half
    for (let x = x0 + head + 1.1; x < x1 - head - 0.4; x += 1.5) {
      ctx.strokeStyle = 'rgba(36,34,30,0.55)'; ctx.lineWidth = lw(0.09); ctx.beginPath(); ctx.moveTo(X(x), Y(yT)); ctx.lineTo(X(x), Y(yB)); ctx.stroke();
      ctx.strokeStyle = 'rgba(214,206,182,0.28)'; ctx.lineWidth = lw(0.05); ctx.beginPath(); ctx.moveTo(X(x + 0.08), Y(yT)); ctx.lineTo(X(x + 0.08), Y(yB)); ctx.stroke();
    }
    // rivet lines along the top and bottom seams
    ctx.fillStyle = 'rgba(40,38,33,0.7)';
    for (let x = x0 + head; x < x1 - head; x += 0.42) for (const yy of [yT + 0.28, yB - 0.3]) { ctx.beginPath(); ctx.arc(X(x), Y(yy), 0.04 * m, 0, TAU); ctx.fill(); }
    // a faded band of old red paint, and the grime that settles on the underside
    ctx.fillStyle = 'rgba(104,52,34,0.55)'; ctx.fillRect(X(x0), Y(cy + r * 0.42), (x1 - x0) * m, 0.26 * m);
    const gg = ctx.createLinearGradient(0, Y(cy + r * 0.5), 0, Y(yB)); gg.addColorStop(0, 'rgba(30,34,26,0)'); gg.addColorStop(1, 'rgba(30,34,26,0.55)'); ctx.fillStyle = gg; ctx.fillRect(X(x0), Y(cy), (x1 - x0) * m, r * m);
    // mottling: patches where the paint has gone
    for (let i = 0; i < 14; i++) { const px = x0 + hash(seed + i) * (x1 - x0), py = yT + hash(seed + i * 2.7) * 2 * r, pr = (0.15 + hash(seed + i * 4.1) * 0.4) * m; ctx.fillStyle = `rgba(${hash(i + seed) > 0.5 ? '96,70,46' : '70,70,60'},0.22)`; ctx.beginPath(); ctx.ellipse(X(px), Y(py), pr, pr * 0.6, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    // the outline, a hard dark edge so the object stands off the water
    ctx.strokeStyle = 'rgba(22,22,20,0.8)'; ctx.lineWidth = lw(0.07); body(); ctx.stroke();
  };
  mod(-9.6, -1.4, 11); mod(1.4, 9.2, 23);

  // ---- portholes: round, brass-rimmed, rust weeping from each (the glass is laid on live, lit) ----
  const PORTS = [[-8, cy - 0.25], [-6.4, cy - 0.25], [-4.8, cy - 0.25], [-3.2, cy - 0.25], [3.1, cy - 0.25], [4.7, cy - 0.25], [6.3, cy - 0.25]];
  for (const [x, y] of PORTS) {
    const rg = ctx.createLinearGradient(0, Y(y + 0.35), 0, Y(y + 1.5 + hash(x) * 0.6)); rg.addColorStop(0, 'rgba(118,62,32,0.5)'); rg.addColorStop(1, 'rgba(118,62,32,0)');
    ctx.fillStyle = rg; ctx.fillRect(X(x - 0.12 + hash(x * 3) * 0.1), Y(y + 0.35), 0.16 * m, (1.2 + hash(x) * 0.6) * m);
    const rr = 0.42 * m, bg = ctx.createLinearGradient(0, Y(y) - rr, 0, Y(y) + rr);
    bg.addColorStop(0, '#857553'); bg.addColorStop(0.45, '#5c4e36'); bg.addColorStop(1, '#3a3022');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(X(x), Y(y), rr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(28,24,18,0.9)'; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.3; ctx.beginPath(); ctx.arc(X(x) + Math.cos(a) * rr * 0.83, Y(y) + Math.sin(a) * rr * 0.83, 0.03 * m, 0, TAU); ctx.fill(); }
  }
  // the station's name, painted long ago, in the game's own type, worn
  ctx.save(); ctx.font = `600 ${0.62 * m}px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(206,198,172,0.5)'; ctx.fillText('STATION 7', X(-9.0), Y(cy + 1.05));
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(0,0,0,${0.3 + hash(i + 400) * 0.5})`; ctx.fillRect(X(-9 + hash(i + 401) * 4), Y(cy + 0.75 + hash(i + 402) * 0.6), (0.05 + hash(i + 403) * 0.25) * m, 0.04 * m); }
  ctx.restore();
  // the same red, dulled, on the hull below the letters is the band drawn above; nothing else is written on it

  // ---- the observation sphere between the modules ----
  { const sr = 1.95, sg = ctx.createRadialGradient(X(-0.7), Y(cy - 0.8), 0.2 * m, X(0), Y(cy), sr * m);
    sg.addColorStop(0, '#a8a28c'); sg.addColorStop(0.45, '#777261'); sg.addColorStop(1, '#2f2e29');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(X(0), Y(cy), sr * m, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(22,22,20,0.8)'; ctx.lineWidth = lw(0.07); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,38,33,0.55)'; ctx.lineWidth = lw(0.06); ctx.beginPath(); ctx.ellipse(X(0), Y(cy), 0.35 * m, sr * m, 0, 0, TAU); ctx.stroke(); // its seam, turned with it
    const rr = 1.3 * m, bg = ctx.createLinearGradient(0, Y(cy) - rr, 0, Y(cy) + rr); bg.addColorStop(0, '#80704f'); bg.addColorStop(0.5, '#544731'); bg.addColorStop(1, '#2f271c');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(X(0), Y(cy), rr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(26,22,16,0.9)'; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; ctx.beginPath(); ctx.arc(X(0) + Math.cos(a) * rr * 0.9, Y(cy) + Math.sin(a) * rr * 0.9, 0.04 * m, 0, TAU); ctx.fill(); } }

  // ---- the docking collar at the east end: a short tube and a flanged ring, seen turned ----
  { const C = STATION_COLLAR, tg = ctx.createLinearGradient(0, Y(C.dy - 0.8), 0, Y(C.dy + 0.8));
    tg.addColorStop(0, '#5e5b50'); tg.addColorStop(0.3, '#aaa48f'); tg.addColorStop(1, '#34332d');
    ctx.fillStyle = tg; ctx.fillRect(X(9.0), Y(C.dy - 0.8), 0.95 * m, 1.6 * m);
    const fg = ctx.createLinearGradient(X(9.75), 0, X(10.25), 0); fg.addColorStop(0, '#8a8574'); fg.addColorStop(1, '#3a3832');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(X(10.0), Y(C.dy), 0.28 * m, 1.12 * m, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(22,22,20,0.8)'; ctx.lineWidth = lw(0.05); ctx.stroke(); }

  // ---- racks and a sample basket hung off the deck ----
  { const rk = (x, w, h) => { const g = ctx.createLinearGradient(X(x), 0, X(x + w), 0); g.addColorStop(0, '#4a4942'); g.addColorStop(0.3, '#6e6b5e'); g.addColorStop(1, '#2a2925'); ctx.fillStyle = g; ctx.fillRect(X(x), Y(top + 0.6), w * m, h * m);
      ctx.strokeStyle = 'rgba(20,20,18,0.7)'; ctx.lineWidth = lw(0.04); for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X(x), Y(top + 0.6 + h * i / 4)); ctx.lineTo(X(x + w), Y(top + 0.6 + h * i / 4)); ctx.stroke(); } };
    rk(-9.2, 1.6, 1.4); rk(5.4, 1.2, 1.8);
    ctx.strokeStyle = 'rgba(150,140,112,0.55)'; ctx.lineWidth = lw(0.035); for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(X(2 + i * 0.32), Y(top + 0.6)); ctx.lineTo(X(2.1 + i * 0.3), Y(top + 1.7)); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(X(2), Y(top + 1.7)); ctx.quadraticCurveTo(X(2.8), Y(top + 1.95), X(3.7), Y(top + 1.7)); ctx.stroke(); }

  // ---- the floats on the roof: rust-faded, shaded spheres ----
  for (const x of [-6, 5]) { const fy = cy - r - 0.5, fr = 0.6, g = ctx.createRadialGradient(X(x - 0.2), Y(fy - 0.22), 0.05 * m, X(x), Y(fy), fr * m);
    g.addColorStop(0, '#b47a4c'); g.addColorStop(0.5, '#7c4a2c'); g.addColorStop(1, '#2e1c12');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(x), Y(fy), fr * m, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(30,22,16,0.7)'; ctx.lineWidth = lw(0.04); ctx.beginPath(); ctx.ellipse(X(x), Y(fy), fr * m, 0.18 * m, 0, 0, TAU); ctx.stroke(); }
  // the mast
  tube(-2.5, cy - r, -2.5, cy - r - 4.5, 0.12, [96, 96, 88]); tube(-3.2, cy - r - 3.6, -1.8, cy - r - 3.6, 0.08, [96, 96, 88]);
}

export function drawStation(ctx, X, Y, m, t, lit) {
  const top = -STATION_TOP, cy = top - 1.9, r = 1.6;
  // the still parts, painted once at this scale
  const key = Math.round(m * 4) / 4;
  if (m < 70 && (!cache || cache.key !== key)) {
    const w = Math.ceil((R - L) * key), h = Math.ceil((B - T) * key), cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const c2 = cv.getContext('2d'); paint(c2, (dx) => (dx - L) * key, (dy) => (dy - T) * key, key); cache = { key, cv };
  }
  if (m < 70 && cache) ctx.drawImage(cache.cv, X(L), Y(T), (R - L) * m, (B - T) * m);
  else paint(ctx, X, Y, m);
  // the portholes' glass: warm lamplight from inside, a little brighter at its heart, with a crescent of reflection
  const PORTS = [[-8, cy - 0.25], [-6.4, cy - 0.25], [-4.8, cy - 0.25], [-3.2, cy - 0.25], [3.1, cy - 0.25], [4.7, cy - 0.25], [6.3, cy - 0.25]];
  const glass = (x, y, rr, k) => { const g = ctx.createRadialGradient(X(x - 0.08), Y(y - 0.08), 0, X(x), Y(y), rr * m);
    g.addColorStop(0, lit ? `rgba(214,184,128,${0.85 * k})` : '#1c2220'); g.addColorStop(1, lit ? `rgba(150,110,62,${0.85 * k})` : '#10140f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(x), Y(y), rr * m, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(240,226,190,0.35)'; ctx.lineWidth = Math.max(1, 0.05 * m); ctx.beginPath(); ctx.arc(X(x), Y(y), rr * m * 0.72, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke(); };
  PORTS.forEach(([x, y], i) => glass(x, y, 0.3, 0.8 + 0.2 * Math.sin(t * 0.7 + i * 1.7) * 0.25));
  // someone at the windows now and then: a dark shape crossing behind the glass
  const walk = (t * 0.12) % 1;
  if (walk < 0.5) { const px = -8 + walk * 2 * 4.8, near = PORTS.find(([x]) => Math.abs(x - px) < 0.3); if (near) { ctx.save(); ctx.beginPath(); ctx.arc(X(near[0]), Y(near[1]), 0.3 * m, 0, TAU); ctx.clip(); ctx.fillStyle = 'rgba(34,26,18,0.7)'; ctx.beginPath(); ctx.ellipse(X(px), Y(cy - 0.1), 0.2 * m, 0.32 * m, 0, 0, TAU); ctx.fill(); ctx.restore(); } }
  // the observation sphere's big viewport
  { const g = ctx.createRadialGradient(X(-0.35), Y(cy - 0.35), 0.1 * m, X(0), Y(cy), 1.12 * m);
    g.addColorStop(0, lit ? 'rgba(206,178,124,0.8)' : 'rgba(40,46,40,0.9)'); g.addColorStop(1, lit ? 'rgba(96,74,44,0.9)' : 'rgba(16,20,16,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(0), Y(cy), 1.12 * m, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,24,0.7)'; ctx.lineWidth = Math.max(1, 0.06 * m); ctx.beginPath(); ctx.moveTo(X(-1.12), Y(cy)); ctx.lineTo(X(1.12), Y(cy)); ctx.moveTo(X(0), Y(cy - 1.12)); ctx.lineTo(X(0), Y(cy + 1.12)); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,226,190,0.3)'; ctx.lineWidth = Math.max(1, 0.08 * m); ctx.beginPath(); ctx.arc(X(0), Y(cy), 0.85 * m, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke(); }
  // the docking lamp, and the mast's lamp: dim amber, swelling slowly, never blinking
  const C = STATION_COLLAR, sw = 0.55 + 0.45 * Math.sin(t * 0.9);
  ctx.fillStyle = `rgba(236,180,96,${0.55 + 0.35 * sw})`; ctx.beginPath(); ctx.arc(X(10.0), Y(C.dy - 1.3), 0.12 * m, 0, TAU); ctx.fill();
  ctx.fillStyle = `rgba(226,170,92,${0.35 + 0.45 * sw})`; ctx.beginPath(); ctx.arc(X(-2.5), Y(cy - r - 4.65), 0.15 * m, 0, TAU); ctx.fill();
}
