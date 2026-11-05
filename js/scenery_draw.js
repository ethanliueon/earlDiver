// Scenery drawn once into a picture and reused: the sunken freighters and the vent chimneys.
// Everything is in local pixels; lighting is applied by the scene's light model afterwards.
import { TAU, clamp, lerp } from './util.js';

// a small seeded random source, so every wreck is always the same wreck
function seeded(seed) {
  let s = (Math.floor(seed * 9973) % 2147483647) || 1;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  r.range = (a, b) => a + (b - a) * r();
  return r;
}
const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;

// an irregular blob (rust patches, growth, silt)
function blob(ctx, x, y, rx, ry, rnd, pts = 9, jag = 0.45) {
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * TAU, k = 1 + (rnd() - 0.5) * jag;
    const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// A small steel freighter, sunk upright with a list and settled into the sediment: raked bow, sheer
// rising forward, cargo hatches and derricks, a two-tier bridge with a funnel aft, riveted plating
// gone to rust, a torn breach in her side, growth along every edge and silt on every ledge.
// Local frame: x along the hull (bow at -x), y down; the keel line sits at y = 0.15 H.
// Returns the drawing's bounding box in the same frame.
export function drawShipwreck(ctx, L, seed, silt) {
  const rnd = seeded(seed);
  const H = L * 0.13;
  const u = L / 100; // one percent of her length
  const lw = (w) => Math.max(1, w * u);
  // the line of her deck from bow to stern (sheer), and the hull outline
  const deckY = (x) => { const f = x / L; return -H * (1.0 + 0.25 * Math.pow(Math.max(0, -f - 0.05) / 0.45, 2) + 0.05 * Math.pow(Math.max(0, f - 0.1) / 0.4, 2)); };
  const hull = new Path2D();
  hull.moveTo(-L * 0.5, deckY(-L * 0.5));
  hull.bezierCurveTo(-L * 0.485, -H * 0.6, -L * 0.47, -H * 0.1, -L * 0.41, H * 0.15); // raked stem down to the forefoot
  hull.lineTo(L * 0.36, H * 0.15);                                                    // keel
  hull.quadraticCurveTo(L * 0.41, H * 0.12, L * 0.43, -H * 0.18);                     // run up to the stern post
  hull.bezierCurveTo(L * 0.46, -H * 0.45, L * 0.5, -H * 0.62, L * 0.495, deckY(L * 0.495)); // counter stern
  for (let x = L * 0.495; x > -L * 0.5; x -= L * 0.02) hull.lineTo(x, deckY(x));
  hull.closePath();

  // ---- hull: steel gone dark, a little lighter towards the deck ----
  const hg = ctx.createLinearGradient(0, -H * 1.3, 0, H * 0.2);
  hg.addColorStop(0, '#5e4c3c'); hg.addColorStop(0.18, '#4a3b2f'); hg.addColorStop(0.6, '#30261e'); hg.addColorStop(1, '#130f0b');
  ctx.fillStyle = hg; ctx.fill(hull);
  ctx.save(); ctx.clip(hull);
  // plating: strakes following the sheer, staggered butt joints, each plate its own shade
  const strakes = 5;
  for (let k = 0; k < strakes; k++) {
    let x = -L * 0.5 + rnd() * L * 0.05;
    while (x < L * 0.5) {
      const w = L * rnd.range(0.05, 0.09);
      const y0 = deckY(x) + (k / strakes) * (H * 1.15 - deckY(x) * 0.0) * 1.0, y1 = y0 + H * 1.15 / strakes;
      const tone = rnd();
      ctx.fillStyle = tone < 0.5 ? rgba(0, 0, 0, 0.04 + rnd() * 0.08) : rgba(150, 110, 80, 0.03 + rnd() * 0.06);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + w, deckY(x + w) + (y0 - deckY(x))); ctx.lineTo(x + w, deckY(x + w) + (y1 - deckY(x))); ctx.lineTo(x, y1); ctx.closePath(); ctx.fill();
      // butt joint and its rivets
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = lw(0.12);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      for (let r = y0 + H * 0.04; r < y1; r += H * 0.055) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(x + u * 0.25, r, lw(0.09), 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(190,150,110,0.18)'; ctx.beginPath(); ctx.arc(x + u * 0.22, r - u * 0.05, lw(0.05), 0, TAU); ctx.fill();
      }
      x += w;
    }
  }
  // strake seams (lap joints) with rivet rows, following the sheer
  for (let k = 1; k < strakes; k++) {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = lw(0.16);
    ctx.beginPath();
    for (let x = -L * 0.5; x <= L * 0.5; x += L * 0.01) { const y = deckY(x) + (k / strakes) * H * 1.15; if (x === -L * 0.5) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,160,120,0.08)'; ctx.lineWidth = lw(0.08);
    ctx.beginPath();
    for (let x = -L * 0.5; x <= L * 0.5; x += L * 0.01) { const y = deckY(x) + (k / strakes) * H * 1.15 - u * 0.18; if (x === -L * 0.5) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = -L * 0.49; x < L * 0.49; x += u * 0.6) { const y = deckY(x) + (k / strakes) * H * 1.15 + u * 0.22; ctx.beginPath(); ctx.arc(x, y, lw(0.07), 0, TAU); ctx.fill(); }
  }
  // the old paint line: faded red antifouling below, a dark boot-top band
  const wl = (x) => deckY(x) + H * 0.62;
  ctx.fillStyle = 'rgba(110,38,28,0.32)';
  ctx.beginPath(); for (let x = -L * 0.5; x <= L * 0.5; x += L * 0.02) ctx.lineTo(x, wl(x)); ctx.lineTo(L * 0.5, H * 0.3); ctx.lineTo(-L * 0.5, H * 0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,10,0.5)'; ctx.lineWidth = lw(0.5);
  ctx.beginPath(); for (let x = -L * 0.5; x <= L * 0.5; x += L * 0.02) ctx.lineTo(x, wl(x) - u * 0.3); ctx.stroke();
  // rust: blotches eating through, and streaks running down from every seam and opening
  for (let i = 0; i < 34; i++) {
    const x = rnd.range(-L * 0.48, L * 0.48), y = deckY(x) + rnd.range(0.05, 1.05) * H;
    const r = u * rnd.range(0.5, 3.2);
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r * 1.3);
    const c = rnd() < 0.4 ? [140, 66, 30] : rnd() < 0.5 ? [95, 50, 28] : [60, 52, 44];
    rg.addColorStop(0, rgba(c[0], c[1], c[2], rnd.range(0.2, 0.42))); rg.addColorStop(1, rgba(c[0], c[1], c[2], 0));
    ctx.fillStyle = rg; blob(ctx, x, y, r * 1.3, r, rnd, 10, 0.6); ctx.fill();
  }
  for (let i = 0; i < 48; i++) {
    // run-off clusters under the seams: a few thin streaks together, not an even comb
    const x = rnd.range(-L * 0.49, L * 0.49) + (i % 3) * u * 0.5, y0 = deckY(x) + rnd.range(0, 0.7) * H, len = H * rnd.range(0.1, 0.5), w = u * rnd.range(0.08, 0.35);
    const sg = ctx.createLinearGradient(0, y0, 0, y0 + len);
    sg.addColorStop(0, rgba(140, 68, 32, rnd.range(0.18, 0.38))); sg.addColorStop(1, rgba(120, 60, 30, 0));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - w / 2, y0); ctx.lineTo(x + w / 2, y0); ctx.lineTo(x + w * 0.15, y0 + len); ctx.lineTo(x - w * 0.15, y0 + len); ctx.closePath(); ctx.fill();
  }
  // portholes aft, below the bridge: brass rims gone green-black, a few lost
  for (let k = 0; k < 7; k++) {
    const x = L * (0.12 + k * 0.042), y = deckY(x) + H * 0.28, r = u * 0.75;
    ctx.fillStyle = '#080605'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (k !== 2 && k !== 5) { ctx.fillStyle = 'rgba(70,90,95,0.35)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.45, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(120,120,90,0.45)'; ctx.lineWidth = lw(0.22); ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, TAU); ctx.stroke();
    const sg = ctx.createLinearGradient(0, y + r, 0, y + r + H * 0.35);
    sg.addColorStop(0, 'rgba(140,70,32,0.5)'); sg.addColorStop(1, 'rgba(140,70,32,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - r * 0.35, y + r, r * 0.7, H * 0.35);
  }
  // the hawse pipe at the bow, rust bleeding from it
  { const x = -L * 0.455, y = deckY(-L * 0.455) + H * 0.25; ctx.fillStyle = '#060504'; ctx.beginPath(); ctx.ellipse(x, y, u * 1.1, u * 0.8, 0, 0, TAU); ctx.fill();
    const sg = ctx.createLinearGradient(0, y, 0, y + H * 0.7); sg.addColorStop(0, 'rgba(150,70,30,0.6)'); sg.addColorStop(1, 'rgba(150,70,30,0)'); ctx.fillStyle = sg; ctx.fillRect(x - u * 0.6, y, u * 1.2, H * 0.7); }
  // faded name on the bow
  ctx.save(); ctx.translate(-L * 0.4, deckY(-L * 0.4) + H * 0.2); ctx.rotate(0.06);
  ctx.font = `600 ${(u * 2.2).toFixed(1)}px Georgia, serif`; ctx.fillStyle = 'rgba(205,190,160,0.16)'; ctx.fillText('A N N A   K', 0, 0);
  ctx.restore();
  // the breach: torn plating, bent inwards, the frames of the hold showing through
  {
    const bx = -L * 0.02, by = deckY(0) + H * 0.55, bw = L * 0.075, bh = H * 0.55;
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, k = 0.7 + rnd() * 0.5; pts.push([bx + Math.cos(a) * bw * 0.5 * k, by + Math.sin(a) * bh * 0.5 * k]); }
    ctx.fillStyle = '#050403'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(70,55,42,0.55)'; ctx.lineWidth = lw(0.6);
    ctx.strokeStyle = 'rgba(60,48,36,0.35)';
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(bx + k * bw * 0.3, by - bh); ctx.lineTo(bx + k * bw * 0.3 + u * 0.4, by + bh); ctx.stroke(); } // frames, deep in the dark
    ctx.fillStyle = 'rgba(40,30,22,0.6)'; blob(ctx, bx + bw * 0.1, by + bh * 0.35, bw * 0.35, bh * 0.18, rnd, 9, 0.6); ctx.fill(); // cargo spilled in the hold
    ctx.strokeStyle = 'rgba(70,55,42,0.35)'; ctx.lineWidth = lw(0.35);
    ctx.beginPath(); ctx.moveTo(bx - bw, by - bh * 0.1); ctx.lineTo(bx + bw, by - bh * 0.15); ctx.stroke(); // a stringer
    ctx.restore();
    // bent edges catching the light
    ctx.strokeStyle = 'rgba(160,120,85,0.45)'; ctx.lineWidth = lw(0.3);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#3a2c22';
    for (let i = 0; i < 5; i++) { const [x, y] = pts[Math.floor(rnd() * pts.length)]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (bx - x) * 0.35 + rnd.range(-1, 1) * u, y + (by - y) * 0.35); ctx.lineTo(x + rnd.range(-1, 1) * u, y + rnd.range(-1, 1) * u); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore(); // hull clip

  // ---- rudder and propeller at the stern, half in the silt ----
  ctx.fillStyle = '#211a14';
  ctx.beginPath(); ctx.moveTo(L * 0.43, -H * 0.2); ctx.lineTo(L * 0.47, -H * 0.16); ctx.lineTo(L * 0.465, H * 0.12); ctx.lineTo(L * 0.425, H * 0.1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b2219';
  for (const a of [-0.9, 0.2, 1.3]) { ctx.beginPath(); ctx.ellipse(L * 0.41 + Math.cos(a) * u * 1.3, -H * 0.02 + Math.sin(a) * u * 1.6, u * 1.4, u * 0.55, a, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#17120e'; ctx.beginPath(); ctx.arc(L * 0.41, -H * 0.02, u * 0.6, 0, TAU); ctx.fill();

  // ---- deck: bulwark, hatches, bollards, winches ----
  const deck = (x) => deckY(x);
  ctx.strokeStyle = '#2c231b'; ctx.lineWidth = lw(0.5);
  ctx.beginPath(); for (let x = -L * 0.5; x <= L * 0.47; x += L * 0.01) ctx.lineTo(x, deck(x) - u * 0.8); ctx.stroke(); // bulwark top
  for (const hx of [-0.3, -0.17, 0.0]) {
    const x = L * hx, w = L * 0.09, y = deck(x);
    ctx.fillStyle = '#3a2e24'; ctx.fillRect(x - w / 2, y - u * 1.6, w, u * 1.6);                          // coaming
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - w / 2, y - u * 0.5, w, u * 0.5);
    ctx.save(); ctx.translate(x + w * 0.1, y - u * 1.7); ctx.rotate(rnd.range(-0.12, 0.2));             // its lid, slid askew
    ctx.fillStyle = '#44372b'; ctx.fillRect(-w * 0.45, -u * 0.5, w * 0.8, u * 0.5); ctx.restore();
  }
  for (const bx of [-0.44, -0.38, 0.06, 0.44]) { const x = L * bx, y = deck(x); ctx.fillStyle = '#251d16'; ctx.fillRect(x - u * 0.3, y - u * 1.3, u * 0.6, u * 1.3); ctx.fillRect(x + u * 0.5, y - u * 1.3, u * 0.6, u * 1.3); }
  for (const wx of [-0.235, -0.085]) { const x = L * wx, y = deck(x); ctx.fillStyle = '#2a2119'; ctx.beginPath(); ctx.roundRect(x - u * 1.2, y - u * 1.8, u * 2.4, u * 1.8, u * 0.4); ctx.fill(); ctx.fillStyle = '#1a140f'; ctx.beginPath(); ctx.arc(x, y - u * 1.1, u * 0.7, 0, TAU); ctx.fill(); }

  // ---- foremast, snapped, and its derricks ----
  {
    const mx = -L * 0.235, my = deck(mx);
    ctx.strokeStyle = '#231b14'; ctx.lineCap = 'round';
    ctx.lineWidth = lw(0.9); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + u * 0.4, my - H * 1.55); ctx.lineTo(mx + u * 4.5, my - H * 1.85); ctx.stroke();
    ctx.lineWidth = lw(0.5); ctx.beginPath(); ctx.moveTo(mx - u * 2.5, my - H * 1.1); ctx.lineTo(mx + u * 2.8, my - H * 1.12); ctx.stroke(); // crosstree
    // derricks: one still topped up, one fallen across the hatch
    ctx.lineWidth = lw(0.45); ctx.beginPath(); ctx.moveTo(mx + u * 0.3, my - u * 1.5); ctx.lineTo(mx + L * 0.09, my - H * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - u * 0.3, my - u * 1.2); ctx.lineTo(mx - L * 0.1, deck(mx - L * 0.1) - u * 1.9); ctx.stroke();
    // rigging hanging slack, furred with growth
    ctx.strokeStyle = 'rgba(40,32,25,0.85)'; ctx.lineWidth = lw(0.12);
    const sag = (x0, y0, x1, y1, d) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + d, x1, y1); ctx.stroke(); };
    sag(mx + u * 0.4, my - H * 1.5, -L * 0.47, deck(-L * 0.47) - u * 0.8, H * 0.35);
    sag(mx + u * 0.4, my - H * 1.45, mx + L * 0.09, my - H * 1.03, H * 0.2);
    sag(mx + L * 0.09, my - H * 1.05, mx + L * 0.11, deck(mx + L * 0.11), H * 0.15);
    sag(mx + u * 0.4, my - H * 1.3, L * 0.18, deck(L * 0.18) - H * 1.0, H * 0.5);
  }

  // ---- the bridge: deckhouse, bridge deck with its windows, wings, rails ----
  const sx0 = L * 0.19, sx1 = L * 0.41, base = deck(L * 0.3);
  const t1 = base - H * 0.85, t2 = t1 - H * 0.62, t3 = t2 - H * 0.1;
  const house = (x0, x1, y0, y1, slant, col) => {
    const g = ctx.createLinearGradient(0, y1, 0, y0);
    g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + slant, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = lw(0.15); ctx.stroke();
  };
  house(sx0, sx1, base, t1, u * 0.6, ['#4e4032', '#2e251d']);
  house(sx0 + L * 0.03, sx1 - L * 0.03, t1, t2, u * 1.4, ['#544535', '#30271e']);
  // the deckhouse plating: seams, and rust running down from every opening
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = lw(0.1);
  for (let x = sx0 + L * 0.02; x < sx1; x += L * 0.028) { ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, t1); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(sx0, (base + t1) / 2); ctx.lineTo(sx1, (base + t1) / 2); ctx.stroke();
  for (let i = 0; i < 16; i++) { const x = rnd.range(sx0 + u, sx1 - u), y0 = rnd() < 0.5 ? t1 : t2, len = H * rnd.range(0.15, 0.55); const sg = ctx.createLinearGradient(0, y0, 0, y0 + len); sg.addColorStop(0, rgba(140, 66, 30, 0.35)); sg.addColorStop(1, rgba(140, 66, 30, 0)); ctx.fillStyle = sg; ctx.fillRect(x, y0, u * rnd.range(0.1, 0.3), len); }
  ctx.fillStyle = '#3a2f25'; ctx.fillRect(sx0 + L * 0.02, t2 - H * 0.1, sx1 - sx0 - L * 0.045, H * 0.1); // roof
  ctx.fillStyle = '#2b231b'; ctx.fillRect(sx0 - L * 0.012, t1 - u * 0.4, L * 0.035, u * 0.4); // bridge wing
  // deckhouse doors and portholes
  ctx.fillStyle = '#0a0806';
  for (const dx of [0.03, 0.12]) ctx.fillRect(sx0 + L * dx, base - H * 0.62, u * 1.3, H * 0.6);
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(sx0 + L * (0.06 + k * 0.03), base - H * 0.5, u * 0.45, 0, TAU); ctx.fill(); }
  // bridge windows: dark panes in frames, two smashed
  for (let k = 0; k < 7; k++) {
    const x = sx0 + L * 0.045 + k * L * 0.021, y = t1 - H * 0.47, w = L * 0.016, h = H * 0.3;
    ctx.fillStyle = '#060504'; ctx.fillRect(x, y, w, h);
    if (k !== 1 && k !== 4) { ctx.fillStyle = 'rgba(80,100,105,0.22)'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.6, y); ctx.lineTo(x, y + h * 0.7); ctx.closePath(); ctx.fill(); }
    else { ctx.strokeStyle = 'rgba(120,130,130,0.35)'; ctx.lineWidth = lw(0.08); ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x + w * 0.5, y + h * 0.55); ctx.lineTo(x + w * 0.2, y + h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(30,24,18,0.9)'; ctx.lineWidth = lw(0.18); ctx.strokeRect(x, y, w, h);
  }
  // rails along the bridge deck and the boat deck, with a ladder down
  const rail = (x0, x1, y) => { ctx.strokeStyle = 'rgba(42,34,26,0.95)'; ctx.lineWidth = lw(0.14); ctx.beginPath(); ctx.moveTo(x0, y - u * 1.1); ctx.lineTo(x1, y - u * 1.1); ctx.moveTo(x0, y - u * 0.55); ctx.lineTo(x1, y - u * 0.55); for (let x = x0; x <= x1; x += u * 1.1) { ctx.moveTo(x, y); ctx.lineTo(x, y - u * 1.1); } ctx.stroke(); };
  rail(sx0 - L * 0.012, sx0 + L * 0.03, t1); rail(sx0 + L * 0.03, sx1 - L * 0.03, t2 - H * 0.1);
  ctx.strokeStyle = 'rgba(42,34,26,0.95)'; ctx.lineWidth = lw(0.12);
  ctx.beginPath(); ctx.moveTo(sx1 - u * 0.5, base); ctx.lineTo(sx1 - u * 0.5, t1); ctx.moveTo(sx1 + u * 0.6, base); ctx.lineTo(sx1 + u * 0.6, t1); for (let y = base; y > t1; y -= u * 0.8) { ctx.moveTo(sx1 - u * 0.5, y); ctx.lineTo(sx1 + u * 0.6, y); } ctx.stroke();
  // a lifeboat davit, empty, its falls hanging
  { const dx = sx1 - L * 0.02, dy = t1; ctx.strokeStyle = '#231b14'; ctx.lineWidth = lw(0.35); ctx.beginPath(); ctx.moveTo(dx, dy); ctx.quadraticCurveTo(dx + u * 2, dy - u * 2.5, dx + u * 3, dy - u * 0.5); ctx.stroke();
    ctx.lineWidth = lw(0.08); ctx.beginPath(); ctx.moveTo(dx + u * 3, dy - u * 0.5); ctx.lineTo(dx + u * 3.2, dy + H * 0.4); ctx.stroke(); }
  // the funnel: tapered, its old company band faded, leaning, with the mast and the dead radar
  ctx.save(); ctx.translate(L * 0.335, t2 - H * 0.08); ctx.rotate(0.1);
  { const w0 = L * 0.032, w1 = L * 0.026, fh = H * 0.95;
    const fg = ctx.createLinearGradient(-w0, 0, w0, 0); fg.addColorStop(0, '#2a2018'); fg.addColorStop(0.45, '#4a3a2c'); fg.addColorStop(1, '#1e1812');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-w0, 0); ctx.lineTo(-w1, -fh); ctx.lineTo(w1, -fh); ctx.lineTo(w0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(130,40,30,0.4)'; ctx.fillRect(-w1 * 1.05, -fh * 0.8, w1 * 2.1, fh * 0.16);
    ctx.fillStyle = '#120e0a'; ctx.beginPath(); ctx.ellipse(0, -fh, w1, u * 0.45, 0, 0, TAU); ctx.fill();
    const sg = ctx.createLinearGradient(0, -fh, 0, -fh * 0.3); sg.addColorStop(0, 'rgba(150,70,30,0.5)'); sg.addColorStop(1, 'rgba(150,70,30,0)'); ctx.fillStyle = sg; ctx.fillRect(-w1 * 0.4, -fh, w1 * 0.5, fh * 0.7); }
  ctx.restore();
  ctx.strokeStyle = '#231b14'; ctx.lineWidth = lw(0.4); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx0 + L * 0.06, t2 - H * 0.1); ctx.lineTo(sx0 + L * 0.065, t2 - H * 0.9); ctx.stroke();
  ctx.lineWidth = lw(0.25); ctx.beginPath(); ctx.moveTo(sx0 + L * 0.05, t2 - H * 0.75); ctx.lineTo(sx0 + L * 0.085, t2 - H * 0.72); ctx.stroke();

  // ---- growth: sponges, soft corals, anemones and hydroids along every edge; silt on top ----
  const grow = (x, y, s) => {
    const kind = rnd();
    if (kind < 0.35) { ctx.fillStyle = rgba(200, 160, 110, 0.35); blob(ctx, x, y - s * 0.4, s, s * 0.7, rnd, 8, 0.6); ctx.fill(); }               // sponge
    else if (kind < 0.6) { ctx.strokeStyle = rgba(220, 200, 170, 0.32); ctx.lineWidth = lw(0.1); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + rnd.range(-1, 1) * s, y - s, x + rnd.range(-1.5, 1.5) * s, y - s * rnd.range(1.4, 2.2)); ctx.stroke(); } } // hydroids
    else if (kind < 0.8) { ctx.fillStyle = rgba(230, 150, 120, 0.3); ctx.beginPath(); ctx.ellipse(x, y - s * 0.6, s * 0.7, s * 0.9, 0, 0, TAU); ctx.fill(); ctx.fillStyle = rgba(250, 220, 200, 0.25); ctx.beginPath(); ctx.ellipse(x, y - s * 1.3, s * 0.9, s * 0.3, 0, 0, TAU); ctx.fill(); } // plumose anemone
    else { ctx.fillStyle = rgba(170, 130, 190, 0.28); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + rnd.range(-1, 1) * s, y - rnd.range(0, 1) * s, s * 0.35, 0, TAU); ctx.fill(); } } // encrusting soft coral
  };
  for (let x = -L * 0.49; x < L * 0.47; x += u * rnd.range(0.6, 1.6)) if (rnd() < 0.7) grow(x, deck(x) - u * 0.8, u * rnd.range(0.4, 1.0));
  for (let x = sx0; x < sx1; x += u * rnd.range(0.8, 1.8)) if (rnd() < 0.6) grow(x, t2 - H * 0.1, u * rnd.range(0.3, 0.8));
  for (let x = sx0 - L * 0.012; x < sx0 + L * 0.03; x += u * 1.3) grow(x, t1, u * 0.5);
  ctx.fillStyle = rgba(silt[0], silt[1], silt[2], 0.35); // silt settled on what faces up
  ctx.beginPath(); for (let x = -L * 0.5; x <= L * 0.47; x += L * 0.01) ctx.lineTo(x, deck(x) - u * 0.85); for (let x = L * 0.47; x >= -L * 0.5; x -= L * 0.01) ctx.lineTo(x, deck(x) - u * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillRect(sx0 + L * 0.02, t2 - H * 0.12, sx1 - sx0 - L * 0.045, u * 0.35);

  // ---- the anchor chain, run out from the hawse into the silt ahead of her ----
  {
    const x0 = -L * 0.455, y0 = deckY(x0) + H * 0.25, x1 = -L * 0.62, y1 = H * 0.18;
    ctx.strokeStyle = '#1e1813'; ctx.lineWidth = lw(0.22);
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, x = lerp(x0, x1, t), y = lerp(y0, y1, t) + Math.sin(t * Math.PI) * H * 0.25;
      ctx.beginPath(); ctx.ellipse(x, y, u * 0.35, u * 0.2, i % 2 ? 0.6 : -0.4, 0, TAU); ctx.stroke();
    }
  }
  // ---- sediment heaped against her where she settled ----
  {
    const sg = ctx.createLinearGradient(0, -H * 0.2, 0, H * 0.3);
    sg.addColorStop(0, rgba(silt[0], silt[1], silt[2], 0)); sg.addColorStop(0.4, rgba(silt[0], silt[1], silt[2], 0.9)); sg.addColorStop(1, rgba(silt[0] * 0.8, silt[1] * 0.8, silt[2] * 0.8, 1));
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(-L * 0.66, H * 0.3);
    for (let x = -L * 0.66; x <= L * 0.56; x += L * 0.02) ctx.lineTo(x, H * 0.12 - Math.sin(((x + L * 0.66) / (L * 1.22)) * Math.PI) * H * 0.18 + Math.sin(x * 0.02 / u) * H * 0.03);
    ctx.lineTo(L * 0.56, H * 0.3); ctx.closePath(); ctx.fill();
  }
  return { x0: -L * 0.68, x1: L * 0.58, y0: t2 - H * 1.3, y1: H * 0.35 };
}

// A black-smoker chimney: a craggy column of sulphide, built up in knobbly layers, with little
// spires on its flanks, pale bacterial mats near the base and a rusty-orange stain where it seeps.
// Local frame: the base centre at (0, 0), growing up (-y). Height h, base width w (pixels).
export function drawVentChimney(ctx, h, w, seed) {
  const rnd = seeded(seed + 3.1);
  const col = (k) => { const c = lerp(42, 20, k); return `rgb(${c + 6},${c},${c - 4})`; };
  // the mound it stands on
  ctx.fillStyle = '#231e1a'; blob(ctx, 0, 0, w * 1.6, w * 0.45, rnd, 12, 0.35); ctx.fill();
  // the column: stacked knobbly lumps, narrowing upwards, each a little darker
  const n = Math.max(12, Math.round(h / (w * 0.16)));
  for (let i = 0; i < n; i++) {
    // lumps overlap heavily and wander a little side to side, so the column reads as one crusted mass
    const t = i / (n - 1), y = -t * h + rnd.range(-0.06, 0.06) * w, r = lerp(w * 0.7, w * 0.26, t) * rnd.range(0.8, 1.2), x = Math.sin(t * 5 + seed) * w * 0.12 + rnd.range(-0.18, 0.18) * r;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r * 1.2);
    g.addColorStop(0, col(t * 0.4)); g.addColorStop(1, col(1));
    ctx.fillStyle = g; blob(ctx, x, y, r, r * 0.75, rnd, 10, 0.5); ctx.fill();
  }
  // side spires (beehive growths)
  for (let i = 0; i < 4; i++) {
    const t = rnd.range(0.15, 0.7), side = rnd() < 0.5 ? -1 : 1, bx = side * lerp(w * 0.5, w * 0.25, t), by = -t * h, sh = h * rnd.range(0.12, 0.3);
    ctx.fillStyle = col(0.6);
    ctx.beginPath(); ctx.moveTo(bx - w * 0.12, by); ctx.quadraticCurveTo(bx + side * w * 0.3, by - sh * 0.6, bx + side * w * 0.22, by - sh); ctx.lineTo(bx + side * w * 0.32, by - sh * 0.95); ctx.quadraticCurveTo(bx + side * w * 0.38, by - sh * 0.4, bx + w * 0.12, by + w * 0.05); ctx.closePath(); ctx.fill();
  }
  // mineral staining: rust-orange where iron oxidises, sulphur-yellow flecks, white bacterial mats at the foot
  for (let i = 0; i < 10; i++) { const t = rnd(), x = rnd.range(-0.4, 0.4) * lerp(w, w * 0.4, t), y = -t * h; ctx.fillStyle = rnd() < 0.6 ? rgba(150, 80, 35, 0.35) : rgba(190, 170, 70, 0.3); blob(ctx, x, y, w * 0.14, w * 0.09, rnd, 7, 0.6); ctx.fill(); }
  for (let i = 0; i < 9; i++) { const x = rnd.range(-1.3, 1.3) * w, y = -rnd.range(0, 0.25) * w; ctx.fillStyle = rgba(225, 225, 210, 0.3); blob(ctx, x, y, w * rnd.range(0.12, 0.3), w * 0.07, rnd, 8, 0.5); ctx.fill(); }
  // the orifice at the top, faintly hot
  const oy = -h - w * 0.05;
  ctx.fillStyle = '#0c0a09'; ctx.beginPath(); ctx.ellipse(0, oy + w * 0.08, w * 0.17, w * 0.07, 0, 0, TAU); ctx.fill();
  const hg = ctx.createRadialGradient(0, oy + w * 0.08, 0, 0, oy + w * 0.08, w * 0.3);
  hg.addColorStop(0, 'rgba(255,140,60,0.35)'); hg.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, oy + w * 0.08, w * 0.3, 0, TAU); ctx.fill();
  return { x0: -w * 1.8, x1: w * 1.8, y0: -h * 1.35, y1: w * 0.6 };
}
