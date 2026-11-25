// (6.5.1) The sub's trawl nets, the traps and the small supplies, drawn as the suits and hand nets are: turned, lit,
// solid things seen a little from above and to the side, worn by use. Light comes from the upper left; round things
// seen from the side are ovals; mesh is knotted twine or galvanised wire with its near side brighter than its far side.
// Each painter fills a w x h picture (the shop, the locker, the cards, the gains).
const TAU = Math.PI * 2;


const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
// a float or a ball, lit from the upper left
function ball(x, cx, cy, r, base, hi, lo) {
  const g = x.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r); g.addColorStop(0, hi); g.addColorStop(0.5, base); g.addColorStop(1, lo);
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; x.stroke();
}
// its shadow on the floor of the picture
function floorShadow(x, cx, cy, rx, ry, a = 0.28) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, `rgba(20,24,24,${a})`); g.addColorStop(1, 'rgba(20,24,24,0)'); x.save(); x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rx, 0, TAU); x.fill(); x.restore(); }

// ---------- the trawl nets ----------
// (6.5.1) a solid cone of netting hanging from a ring, as the hand nets are drawn: the mouth at the left is a thick ring
// seen at an angle (an oval, its far side behind the bag, its near side in front), the bag starts on that ring all the
// way round and narrows, sagging a little, to the tied cod end. The mesh follows the cone: rings of twine round it and
// lines running from the rim to the tip, the near side bright, the far side faint through the gaps; the cone is shaded
// as a solid (light on its upper flank, dark beneath, the inside of the mouth darkest). Floats ride on the ring: cork on
// the basic net, glass in netting on the advanced, whose steel hoop also has its chain; the bridles run off to the left
export function drawTrawl3(x, w, h, k) {
  const adv = k !== 'basic';
  const mx = w * 0.22, my = h * 0.48, ry = h * (adv ? 0.34 : 0.3), rx = ry * 0.36, L = w * (adv ? 0.64 : 0.58), sag = h * 0.06;
  const C = (u) => [mx + L * u, my + sag * Math.sin(u * Math.PI * 0.9) + h * 0.04 * u]; // the bag's axis
  const rad = (u) => Math.max(0.06, Math.pow(1 - u, 0.85) * 0.94 + 0.06 * (1 - u)); // its girth along it
  const P = (u, t) => { const [cx, cy] = C(u), r = rad(u); return [cx - rx * r * Math.cos(t), cy + ry * r * Math.sin(t)]; }; // t: round the bag; cos(t) > 0 is the near side
  const twine = adv ? [52, 48, 40] : [92, 116, 80], dark = adv ? 'rgba(14,13,11,' : 'rgba(26,38,24,';
  floorShadow(x, mx + L * 0.5, my + ry + h * 0.08, L * 0.62, h * 0.05);
  // the ring's far half (behind the bag)
  const ring = (from, to, lw, col) => { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.ellipse(mx, my, rx, ry, 0, from, to); x.stroke(); };
  const ringCol = adv ? lin(x, mx - rx, my - ry, mx + rx, my + ry, [[0, '#a4a6a0'], [0.5, '#585a56'], [1, '#2a2c28']]) : lin(x, 0, my - ry, 0, my + ry, [[0, '#d2c094'], [1, '#6e5e40']]);
  ring(-Math.PI / 2, Math.PI / 2, adv ? 6 : 5, ringCol); // the right half of the oval is its far side
  // the bag's body, shaded as a solid: upper flank lit, underside dark
  x.beginPath(); for (let i = 0; i <= 30; i++) { const [a, b2] = P(i / 30, -Math.PI / 2); i ? x.lineTo(a, b2) : x.moveTo(a, b2); } for (let i = 30; i >= 0; i--) { const [a, b2] = P(i / 30, Math.PI / 2); x.lineTo(a, b2); }
  for (let j = 1; j < 24; j++) { const [a, b2] = P(0, Math.PI / 2 - Math.PI * j / 24); x.lineTo(a, b2); } x.closePath(); // round the ring's near half too: the bag starts on the whole ring
  x.fillStyle = lin(x, 0, my - ry, 0, my + ry, [[0, `rgba(${twine.join(',')},0.34)`], [0.45, `rgba(${twine.map((v) => v * 0.6 | 0).join(',')},0.3)`], [1, dark + '0.55)']]); x.fill();
  x.save(); x.clip();
  // the far side's mesh, faint, seen through
  const lines = (near) => { const T = near ? [-Math.PI / 2, Math.PI / 2] : [Math.PI / 2, Math.PI * 1.5], nT = 9, nU = adv ? 15 : 12;
    x.strokeStyle = near ? `rgba(${twine.map((v) => Math.min(255, v * 1.5 | 0)).join(',')},0.95)` : `rgba(${twine.join(',')},0.45)`; x.lineWidth = near ? 1.25 : 0.8;
    for (let j = 0; j <= nT; j++) { const t = T[0] + (T[1] - T[0]) * j / nT; x.beginPath(); for (let i = 0; i <= 24; i++) { const [a, b2] = P(i / 24, t); i ? x.lineTo(a, b2) : x.moveTo(a, b2); } x.stroke(); } // rim to tip
    for (let i = 1; i <= nU; i++) { const u = Math.pow(i / (nU + 1), 0.9); x.beginPath(); for (let j = 0; j <= 16; j++) { const t = T[0] + (T[1] - T[0]) * j / 16, [a, b2] = P(u, t); j ? x.lineTo(a, b2) : x.moveTo(a, b2); } x.stroke(); } // the rings round it
    if (near) { x.fillStyle = dark + '0.75)'; for (let j = 0; j <= nT; j++) for (let i = 1; i <= nU; i++) { const [a, b2] = P(Math.pow(i / (nU + 1), 0.9), T[0] + (T[1] - T[0]) * j / nT); x.beginPath(); x.arc(a, b2, 1.2, 0, TAU); x.fill(); } } }; // knots
  lines(false);
  // the inside of the mouth, darkest, then the near mesh over it
  const ig = x.createRadialGradient(mx + rx * 0.5, my, 1, mx + rx * 0.5, my, ry * 1.1); ig.addColorStop(0, dark + '0.6)'); ig.addColorStop(1, dark + '0)'); x.fillStyle = ig; x.fillRect(mx - rx, my - ry, L * 0.4, ry * 2);
  lines(true);
  x.fillStyle = lin(x, 0, my - ry, 0, my, [[0, 'rgba(255,250,232,0.18)'], [1, 'rgba(255,250,232,0)']]); x.fillRect(0, 0, w, my); // light on the upper flank
  x.restore();
  // its outline along the top and bottom (the headrope's line and the belly)
  x.strokeStyle = `rgba(${twine.map((v) => v * 0.7 | 0).join(',')},0.9)`; x.lineWidth = 1.6;
  for (const t of [-Math.PI / 2, Math.PI / 2]) { x.beginPath(); for (let i = 0; i <= 30; i++) { const [a, b2] = P(i / 30, t); i ? x.lineTo(a, b2) : x.moveTo(a, b2); } x.stroke(); }
  // the cod end, gathered and tied, the tail of its rope
  const [ex, ey] = C(1); x.fillStyle = adv ? '#26221c' : '#3e4e34'; x.beginPath(); x.ellipse(ex, ey, w * 0.022, h * 0.045, 0, 0, TAU); x.fill();
  ball(x, ex + w * 0.022, ey, h * 0.03, '#a8844a', '#dcbc84', '#54401e');
  x.strokeStyle = '#8a6a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(ex + w * 0.04, ey + 2); x.quadraticCurveTo(ex + w * 0.06, ey + h * 0.07, ex + w * 0.05, ey + h * 0.12); x.stroke();
  // the ring's near half, in front of the bag, lit along its upper edge
  ring(Math.PI / 2, Math.PI * 1.5, adv ? 6 : 5, ringCol);
  x.lineWidth = 1.2; x.strokeStyle = 'rgba(255,248,230,0.5)'; x.beginPath(); x.ellipse(mx - 1, my - 1, rx, ry, 0, Math.PI * 1.08, Math.PI * 1.45); x.stroke();
  if (!adv) { x.strokeStyle = 'rgba(60,46,26,0.5)'; x.lineWidth = 1; for (let i = 0; i < 30; i++) { const t = Math.PI / 2 + i / 30 * Math.PI; x.beginPath(); x.moveTo(mx + Math.cos(t) * rx * 0.85, my + Math.sin(t) * ry * 0.97); x.lineTo(mx + Math.cos(t + 0.1) * rx * 1.15, my + Math.sin(t + 0.1) * ry * 1.03); x.stroke(); } } // the rope's lay
  else for (const t of [Math.PI * 0.8, Math.PI, Math.PI * 1.2]) ball(x, mx + Math.cos(t) * rx, my + Math.sin(t) * ry, 2.4, '#6a6c68', '#c8cac4', '#2a2c28'); // the hoop's bolts
  // the bridles: from the top and bottom of the ring forward to a shackle, where the sub's cable takes it
  const sx = mx - w * 0.14, sy2 = my - h * 0.02; x.strokeStyle = adv ? '#4a4840' : '#9a8658'; x.lineWidth = adv ? 2 : 1.6;
  x.beginPath(); x.moveTo(mx - rx * 0.2, my - ry * 0.98); x.lineTo(sx, sy2); x.lineTo(mx - rx * 0.2, my + ry * 0.98); x.stroke();
  ball(x, sx, sy2, h * 0.022, '#7a7c76', '#cfd0ca', '#2e302c');
  // floats on the ring's top
  if (adv) { for (let i = -1; i <= 1; i++) { const t = -Math.PI / 2 + i * 0.5, fx = mx - Math.cos(t) * rx * 1.05, fy = my + Math.sin(t) * ry - h * 0.045; ball(x, fx, fy, h * 0.048, 'rgba(96,128,112,0.94)', 'rgba(214,236,222,0.96)', 'rgba(36,56,48,0.96)');
      x.strokeStyle = 'rgba(40,36,28,0.7)'; x.lineWidth = 0.8; for (let a2 = 0; a2 < 4; a2++) { x.beginPath(); x.arc(fx, fy, h * 0.048, a2 * 0.8, a2 * 0.8 + 1.4); x.stroke(); } }
    for (let i = 0; i < 6; i++) { const t = Math.PI / 2 + 0.25, cx = mx - Math.cos(t) * rx - i * w * 0.004, cy = my + Math.sin(t) * ry + h * 0.025 + i * h * 0.02; x.strokeStyle = i % 2 ? '#4a4c48' : '#6a6c68'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, w * 0.008, h * 0.014, i % 2 ? 0 : Math.PI / 2, 0, TAU); x.stroke(); } } // the chain hanging from its foot
  else for (let i = -1; i <= 1; i++) { const t = -Math.PI / 2 + i * 0.45, fx = mx - Math.cos(t) * rx * 1.05, fy = my + Math.sin(t) * ry - h * 0.03; x.save(); x.translate(fx, fy); x.rotate(i * 0.3);
    x.fillStyle = lin(x, -w * 0.022, 0, w * 0.022, 0, [[0, '#c89a62'], [0.5, '#9a6e3e'], [1, '#5e4022']]); x.beginPath(); x.ellipse(0, 0, w * 0.024, h * 0.036, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(40,26,12,0.6)'; x.lineWidth = 1; x.stroke(); x.restore(); }
}

// ---------- the traps ----------
// a box in perspective: front face, the side going back to the right, the top
function boxFaces(x0, y0, W, H, D, ang = 0.42) { const dx = D * Math.cos(ang), dy = -D * Math.sin(ang);
  return { front: [[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]], side: [[x0 + W, y0], [x0 + W + dx, y0 + dy], [x0 + W + dx, y0 + H + dy], [x0 + W, y0 + H]], top: [[x0, y0], [x0 + dx, y0 + dy], [x0 + W + dx, y0 + dy], [x0 + W, y0]], dx, dy }; }
const poly = (x, P) => { x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); };
// a face of wire mesh: a square grid in the face's own perspective
function meshFace(x, P, n, m, col, lw) { const [a, b, c, d] = P; x.strokeStyle = col; x.lineWidth = lw;
  for (let i = 0; i <= n; i++) { const f = i / n; x.beginPath(); x.moveTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f); x.lineTo(d[0] + (c[0] - d[0]) * f, d[1] + (c[1] - d[1]) * f); x.stroke(); }
  for (let j = 0; j <= m; j++) { const f = j / m; x.beginPath(); x.moveTo(a[0] + (d[0] - a[0]) * f, a[1] + (d[1] - a[1]) * f); x.lineTo(b[0] + (c[0] - b[0]) * f, b[1] + (c[1] - b[1]) * f); x.stroke(); } }
function frameEdges(x, F, col, lw) { x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'round'; for (const P of [F.front, F.side, F.top]) { poly(x, P); x.stroke(); } }
// a funnel seen end-on in a face: rings narrowing to a dark hole
function funnel(x, cx, cy, rx, ry, col) { for (let i = 0; i < 4; i++) { const k = 1 - i * 0.22; x.strokeStyle = col; x.lineWidth = 1.1; x.beginPath(); x.ellipse(cx + i * rx * 0.08, cy, rx * k, ry * k, 0, 0, TAU); x.stroke(); }
  x.fillStyle = 'rgba(10,12,12,0.75)'; x.beginPath(); x.ellipse(cx + rx * 0.26, cy, rx * 0.26, ry * 0.26, 0, 0, TAU); x.fill(); }
export function drawTrap3(x, w, h, k) {

  if (k === 'cage') { // a tall cage on a weighted steel base, its lit lure hanging inside
    const W = w * 0.3, H = h * 0.66, D = w * 0.16, x0 = w * 0.32, y0 = h * 0.2, F = boxFaces(x0, y0, W, H, D, 0.5);
    floorShadow(x, x0 + W * 0.7, y0 + H + h * 0.04, W * 1.1, h * 0.05);
    poly(x, F.side); x.fillStyle = 'rgba(20,24,22,0.35)'; x.fill(); poly(x, F.front); x.fillStyle = 'rgba(30,34,30,0.25)'; x.fill();
    const lg = x.createRadialGradient(x0 + W * 0.55, y0 + H * 0.42, 1, x0 + W * 0.55, y0 + H * 0.42, W * 0.9); lg.addColorStop(0, 'rgba(255,214,150,0.75)'); lg.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = lg; x.fillRect(x0 - W * 0.4, y0, W * 2.2, H); // the lure's light
    x.strokeStyle = '#6a6c66'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(x0 + W * 0.55, y0 + 4); x.lineTo(x0 + W * 0.55, y0 + H * 0.36); x.stroke();
    ball(x, x0 + W * 0.55, y0 + H * 0.42, h * 0.035, '#ffd89a', '#fff6e0', '#c8904a');
    meshFace(x, F.side, 6, 9, 'rgba(60,62,58,0.6)', 1); meshFace(x, F.front, 6, 9, 'rgba(120,124,118,0.85)', 1.3);
    frameEdges(x, F, '#3c3e3a', 3);
    const b = boxFaces(x0 - 4, y0 + H - h * 0.06, W + 8, h * 0.07, D + 4, 0.5); poly(x, b.top); x.fillStyle = '#5a5c58'; x.fill(); poly(x, b.front); x.fillStyle = lin(x, 0, b.front[0][1], 0, b.front[2][1], [[0, '#4a4c48'], [1, '#22231f']]); x.fill(); poly(x, b.side); x.fillStyle = '#2a2b27'; x.fill(); // the weighted base
    x.strokeStyle = '#7a6a48'; x.lineWidth = 3; x.beginPath(); x.moveTo(x0 + W * 0.5 + F.dx * 0.5, y0 + F.dy * 0.5); x.quadraticCurveTo(x0 + W * 0.7, h * 0.05, x0 + W * 1.4, h * 0.02); x.stroke(); // the heavy rope
    return; }
  const big = k === 'fish' || k === 'steel', W = w * (big ? 0.44 : 0.36), H = h * (big ? 0.42 : 0.38), D = w * (big ? 0.2 : 0.17), x0 = w * (big ? 0.16 : 0.22), y0 = h * (big ? 0.38 : 0.4), F = boxFaces(x0, y0, W, H, D);
  floorShadow(x, x0 + W * 0.65, y0 + H + h * 0.03, W * 0.95, h * 0.05);
  const wire = k === 'steel' ? ['rgba(54,56,52,0.65)', 'rgba(96,100,94,0.9)'] : k === 'fish' ? ['rgba(62,74,66,0.55)', 'rgba(118,132,120,0.9)'] : ['rgba(96,102,100,0.5)', 'rgba(172,178,174,0.92)'];
  // the far faces first (seen through the mesh), the bait bag inside, then the near faces
  poly(x, F.side); x.fillStyle = 'rgba(20,26,24,0.22)'; x.fill(); meshFace(x, F.side, 7, 6, wire[0], 0.9);
  poly(x, F.top); x.fillStyle = 'rgba(240,244,238,0.06)'; x.fill(); meshFace(x, F.top, 9, 4, wire[0], 0.9);
  if (k === 'steel') { const mx2 = x0 + W * 0.5; x.strokeStyle = '#2e302c'; x.lineWidth = 3; x.beginPath(); x.moveTo(mx2, y0); x.lineTo(mx2 + F.dx, y0 + F.dy); x.lineTo(mx2 + F.dx, y0 + F.dy + H); x.stroke(); } // the wall between its two chambers
  // the bait bag: a little mesh pouch of fish
  ball(x, x0 + W * 0.42, y0 + H * 0.62, h * 0.05, 'rgba(150,120,96,0.9)', 'rgba(214,190,160,0.9)', 'rgba(80,60,44,0.9)');
  x.strokeStyle = 'rgba(40,30,20,0.6)'; x.lineWidth = 0.8; for (let a = 0; a < 4; a++) { x.beginPath(); x.arc(x0 + W * 0.42, y0 + H * 0.62, h * 0.05, a * 0.9, a * 0.9 + 1.6); x.stroke(); }
  // the funnels: one in the side for the pot, one at each end for the fish trap
  const sc = [(F.side[0][0] + F.side[2][0]) / 2, (F.side[0][1] + F.side[2][1]) / 2]; funnel(x, sc[0] - D * 0.08, sc[1], D * 0.22, H * 0.26, wire[1]);
  if (big) funnel(x, x0 + W * 0.12, y0 + H * 0.5, W * 0.08, H * 0.26, wire[1]);
  poly(x, F.front); x.fillStyle = 'rgba(236,240,234,0.05)'; x.fill(); meshFace(x, F.front, big ? 10 : 8, 6, wire[1], 1.2);
  // the frame: galvanised rod for the pots, square tube for the fish trap, riveted angle steel for the steel pot
  if (k === 'steel') { frameEdges(x, F, '#3a3c38', 5); x.strokeStyle = 'rgba(200,204,198,0.4)'; x.lineWidth = 1; poly(x, F.top); x.stroke();
    for (const P of [F.front, F.side]) for (const [a, b] of P) ball(x, a, b, 2.6, '#6a6c68', '#c4c6c0', '#2a2c28'); }
  else { frameEdges(x, F, k === 'fish' ? '#4a5a4e' : '#8a908c', k === 'fish' ? 3.2 : 2.4); x.strokeStyle = 'rgba(244,248,242,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(F.top[0][0], F.top[0][1]); x.lineTo(F.top[3][0], F.top[3][1]); x.lineTo(F.top[2][0], F.top[2][1]); x.stroke(); }
  // the line up to its float (an orange float for the pots, a buoy with a flag for the steel pot)
  const tx = F.top[1][0] + (F.top[2][0] - F.top[1][0]) * 0.5, ty = F.top[1][1];
  x.strokeStyle = k === 'steel' ? '#6a5a3a' : '#a08a5a'; x.lineWidth = k === 'steel' ? 3 : 1.6; x.beginPath(); x.moveTo(tx - D * 0.3, ty + 4); x.quadraticCurveTo(tx + w * 0.06, h * 0.18, tx + w * 0.12, h * 0.14); x.stroke();
  ball(x, tx + w * 0.13, h * 0.13, h * (k === 'steel' ? 0.07 : 0.055), '#c86a32', '#f0a870', '#6a2e12');
  if (k === 'steel') { x.strokeStyle = '#2a2a28'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(tx + w * 0.13, h * 0.06); x.lineTo(tx + w * 0.13, h * -0.02 + 8); x.stroke(); }
}

// ---------- small supplies ----------
// (6.5.1) film: one short strip of unexposed black film, a frame and a little more, lying with a gentle curl, its
// sprocket holes along both edges; the stock dull black, its upper edge catching the light, its shadow under it
export function drawFilm3(x, w, h) {
  const x0 = w * 0.2, x1 = w * 0.8, yc = h * 0.5, sw = h * 0.42, curl = h * 0.07;
  const top = (f) => yc - sw / 2 + Math.sin(f * Math.PI) * -curl + f * h * 0.03, bot = (f) => top(f) + sw * (0.96 + 0.04 * Math.cos(f * Math.PI));
  floorShadow(x, w * 0.52, h * 0.82, w * 0.36, h * 0.05);
  x.beginPath(); for (let i = 0; i <= 20; i++) { const f = i / 20, X = x0 + (x1 - x0) * f; i ? x.lineTo(X, top(f)) : x.moveTo(X, top(f)); } for (let i = 20; i >= 0; i--) { const f = i / 20; x.lineTo(x0 + (x1 - x0) * f, bot(f)); } x.closePath();
  x.fillStyle = lin(x, x0, 0, x1, 0, [[0, '#121110'], [0.3, '#26241f'], [0.55, '#151412'], [1, '#0a0a09']]); x.fill();
  x.save(); x.clip();
  x.fillStyle = lin(x, 0, yc - sw / 2, 0, yc, [[0, 'rgba(255,248,230,0.14)'], [1, 'rgba(255,248,230,0)']]); x.fillRect(0, 0, w, h); // a sheen across its upper half
  x.restore();
  // the sprocket holes: little rounded windows through the stock, showing the floor behind
  const n = 9; for (let i = 0; i < n; i++) { const f = (i + 0.5) / n, X = x0 + (x1 - x0) * f - w * 0.012;
    for (const yy of [top(f) + sw * 0.06, bot(f) - sw * 0.06 - sw * 0.1]) { x.fillStyle = 'rgba(196,208,213,0.92)'; x.beginPath(); x.roundRect(X, yy, w * 0.024, sw * 0.1, 1.5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 0.8; x.stroke(); } }
  // the frame's faint edges between the rows of holes, and the light along its top edge
  x.strokeStyle = 'rgba(80,76,68,0.35)'; x.lineWidth = 1; for (const f of [0.08, 0.92]) { const X = x0 + (x1 - x0) * f; x.beginPath(); x.moveTo(X, top(f) + sw * 0.2); x.lineTo(X, bot(f) - sw * 0.2); x.stroke(); }
  x.strokeStyle = 'rgba(230,224,210,0.45)'; x.lineWidth = 1.2; x.beginPath(); for (let i = 0; i <= 20; i++) { const f = i / 20, X = x0 + (x1 - x0) * f; i ? x.lineTo(X, top(f) + 0.6) : x.moveTo(X, top(f) + 0.6); } x.stroke();
}
