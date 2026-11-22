// (6.5.1) The sub's trawl nets, the traps and the small supplies, drawn as the suits and hand nets are: turned, lit,
// solid things seen a little from above and to the side, worn by use. Light comes from the upper left; round things
// seen from the side are ovals; mesh is knotted twine or galvanised wire with its near side brighter than its far side.
// Each painter fills a w x h picture (the shop, the locker, the cards, the gains).
const TAU = Math.PI * 2;
let SEED = 1;
const rnd = () => ((SEED = (SEED * 16807) % 2147483647) / 2147483647);
const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
// a float or a ball, lit from the upper left
function ball(x, cx, cy, r, base, hi, lo) {
  const g = x.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r); g.addColorStop(0, hi); g.addColorStop(0.5, base); g.addColorStop(1, lo);
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 1; x.stroke();
}
// its shadow on the floor of the picture
function floorShadow(x, cx, cy, rx, ry, a = 0.28) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, `rgba(20,24,24,${a})`); g.addColorStop(1, 'rgba(20,24,24,0)'); x.save(); x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rx, 0, TAU); x.fill(); x.restore(); }

// ---------- the trawl nets ----------
// The net lies on its side, its mouth at the left seen a little open (an oval), the bag tapering right to the tied
// cod end. The basic net: green twine on a rope headline with cork floats. The advanced: dark tarred twine on a steel
// mouth frame with chain and glass floats in their netting, a heavier, longer bag
export function drawTrawl3(x, w, h, k) {
  SEED = k === 'adv' ? 31 : 17; const adv = k === 'adv';
  const mx = w * 0.2, my = h * 0.5, mrx = w * 0.055, mry = h * (adv ? 0.36 : 0.31), ex = w * (adv ? 0.9 : 0.86), ey = h * 0.56;
  floorShadow(x, w * 0.55, h * 0.88, w * 0.42, h * 0.05);
  const top = (f) => [mx + (ex - mx) * f, my - mry * (1 - f * 0.86) + Math.sin(f * Math.PI) * h * 0.03 + (ey - my) * f];
  const bot = (f) => [mx + (ex - mx) * f, my + mry * (1 - f * 0.86) + Math.sin(f * Math.PI) * h * 0.05 + (ey - my) * f];
  // the bag's body: a faint fill, darker underneath (the far side seen through the mesh)
  x.beginPath(); for (let i = 0; i <= 24; i++) { const [a, b] = top(i / 24); i ? x.lineTo(a, b) : x.moveTo(a, b); } for (let i = 24; i >= 0; i--) { const [a, b] = bot(i / 24); x.lineTo(a, b); } x.closePath();
  x.fillStyle = lin(x, 0, my - mry, 0, my + mry, adv ? [[0, 'rgba(40,40,34,0.22)'], [1, 'rgba(14,14,12,0.42)']] : [[0, 'rgba(70,96,70,0.18)'], [1, 'rgba(30,44,30,0.4)']]); x.fill();
  // the mesh: diamonds, the knots darker; the near side brighter than the far
  x.save(); x.clip();
  const twNear = adv ? 'rgba(74,70,58,0.95)' : 'rgba(96,124,84,0.95)', twFar = adv ? 'rgba(46,44,36,0.6)' : 'rgba(64,86,58,0.55)';
  const rows = adv ? 11 : 9, cols = adv ? 22 : 18;
  for (const [col, off, lw] of [[twFar, 0.5, 1], [twNear, 0, 1.4]]) { x.strokeStyle = col; x.lineWidth = lw;
    for (let j = -rows; j <= rows * 2; j++) { x.beginPath(); for (let i = 0; i <= cols; i++) { const f = i / cols, [ta, tb] = top(f), [, bb] = bot(f), v = ((j + i + off) / rows) % 2, yy = tb + (bb - tb) * Math.abs(v > 1 ? 2 - v : v); i ? x.lineTo(ta, yy) : x.moveTo(ta, yy); } x.stroke(); } }
  for (let i = 0; i <= cols; i += 2) for (let j = 0; j <= rows; j++) { const f = i / cols, [ta, tb] = top(f), [, bb] = bot(f), yy = tb + (bb - tb) * j / rows; x.fillStyle = adv ? 'rgba(28,26,20,0.8)' : 'rgba(48,66,42,0.8)'; x.beginPath(); x.arc(ta, yy, 1.3, 0, TAU); x.fill(); }
  // light along the upper side of the bag
  x.fillStyle = lin(x, 0, my - mry, 0, my, [[0, 'rgba(255,250,232,0.16)'], [1, 'rgba(255,250,232,0)']]); x.fillRect(0, 0, w, my);
  x.restore();
  // its outline: the headrope along the top, the footrope along the bottom
  x.lineCap = 'round'; x.strokeStyle = adv ? '#3a362c' : '#5a6a4a'; x.lineWidth = adv ? 2.4 : 2;
  x.beginPath(); for (let i = 0; i <= 24; i++) { const [a, b] = top(i / 24); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke();
  x.beginPath(); for (let i = 0; i <= 24; i++) { const [a, b] = bot(i / 24); i ? x.lineTo(a, b) : x.moveTo(a, b); } x.stroke();
  // the cod end, bunched and tied off with a rope knot
  x.fillStyle = adv ? '#2e2a22' : '#4a5a3c'; x.beginPath(); x.ellipse(ex, ey + h * 0.015, w * 0.03, h * 0.05, 0, 0, TAU); x.fill();
  ball(x, ex + w * 0.03, ey + h * 0.015, h * 0.032, '#b08a4e', '#e0c08a', '#5a4422');
  x.strokeStyle = '#8a6a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(ex + w * 0.05, ey + h * 0.02); x.quadraticCurveTo(ex + w * 0.07, ey + h * 0.08, ex + w * 0.06, ey + h * 0.13); x.stroke();
  // the mouth
  if (adv) { // a steel frame, an oval hoop with a crossbar of flat bar, bolted; a short chain at its foot
    x.lineWidth = 5; x.strokeStyle = lin(x, mx - mrx, my - mry, mx + mrx, my + mry, [[0, '#a4a6a2'], [0.5, '#5e605c'], [1, '#2e302c']]); x.beginPath(); x.ellipse(mx, my, mrx, mry, 0, 0, TAU); x.stroke();
    x.lineWidth = 1; x.strokeStyle = 'rgba(230,232,226,0.5)'; x.beginPath(); x.ellipse(mx - 1, my - 1, mrx, mry, 0, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
    for (const t of [-0.75, 0, 0.75]) ball(x, mx + mrx * Math.cos(Math.PI / 2 + t) * 0.3, my - mry * Math.sin(Math.PI / 2 + t) * 1.0 * (t ? 0.82 : 1), 2.2, '#6a6c68', '#c8cac4', '#2a2c28');
    // glass floats in their netting along the top of the hoop
    for (let i = 0; i < 3; i++) { const fx = mx - mrx * 0.2 + i * w * 0.045, fy = my - mry - h * 0.06 + i * h * 0.03; ball(x, fx, fy, h * 0.05, 'rgba(96,128,112,0.92)', 'rgba(214,236,222,0.95)', 'rgba(36,56,48,0.95)');
      x.strokeStyle = 'rgba(40,36,28,0.7)'; x.lineWidth = 0.8; for (let a = 0; a < 4; a++) { x.beginPath(); x.arc(fx, fy, h * 0.05, a * 0.8, a * 0.8 + 1.4); x.stroke(); } }
    // the chain at its foot
    for (let i = 0; i < 6; i++) { const cx = mx - w * 0.01 - i * w * 0.018, cy = my + mry + h * 0.02 + i * h * 0.012; x.strokeStyle = i % 2 ? '#4a4c48' : '#6a6c68'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, w * 0.011, h * 0.018, i % 2 ? 0.6 : -0.4, 0, TAU); x.stroke(); }
  } else { // a rope headline round the mouth, cork floats along its top
    x.lineWidth = 3.2; x.strokeStyle = lin(x, 0, my - mry, 0, my + mry, [[0, '#c8b48a'], [1, '#7a6a48']]); x.beginPath(); x.ellipse(mx, my, mrx, mry, 0, 0, TAU); x.stroke();
    x.lineWidth = 1; x.strokeStyle = 'rgba(60,48,30,0.5)'; for (let a = 0; a < 26; a++) { const t = a / 26 * TAU; x.beginPath(); x.moveTo(mx + Math.cos(t) * mrx * 0.92, my + Math.sin(t) * mry * 0.96); x.lineTo(mx + Math.cos(t + 0.12) * mrx * 1.08, my + Math.sin(t + 0.12) * mry * 1.02); x.stroke(); } // the rope's lay
    for (let i = 0; i < 4; i++) { const t = -Math.PI / 2 + (i - 1.5) * 0.42, fx = mx + Math.cos(t) * mrx, fy = my + Math.sin(t) * mry - h * 0.02; x.save(); x.translate(fx, fy); x.rotate(t + Math.PI / 2);
      x.fillStyle = lin(x, -w * 0.02, 0, w * 0.02, 0, [[0, '#c89a62'], [0.5, '#9a6e3e'], [1, '#5e4022']]); x.beginPath(); x.ellipse(0, 0, w * 0.02, h * 0.04, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(40,26,12,0.6)'; x.lineWidth = 1; x.stroke(); x.restore(); }
    for (let i = 0; i < 3; i++) { const t = Math.PI / 2 + (i - 1) * 0.5, fx = mx + Math.cos(t) * mrx, fy = my + Math.sin(t) * mry + h * 0.015; ball(x, fx, fy, h * 0.022, '#4a4c48', '#8a8c86', '#1a1a18'); } // lead weights on the footrope
  }
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
  SEED = ({ pot: 3, fish: 5, steel: 7, cage: 9 })[k] || 3;
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
// a film canister: a dull steel can with its lid, the leader of film curling out
export function drawFilm3(x, w, h) {
  const cx = w * 0.46, cy = h * 0.52, r = h * 0.2, L = h * 0.46;
  floorShadow(x, cx + w * 0.05, cy + L * 0.55, w * 0.22, h * 0.05);
  x.fillStyle = lin(x, cx - r, 0, cx + r, 0, [[0, '#4a4c48'], [0.3, '#b8bab4'], [0.6, '#7a7c76'], [1, '#2e302c']]); x.fillRect(cx - r, cy - L / 2, r * 2, L);
  x.fillStyle = '#2a2b28'; x.beginPath(); x.ellipse(cx, cy + L / 2, r, r * 0.32, 0, 0, Math.PI); x.fill();
  x.fillStyle = lin(x, cx - r, 0, cx + r, 0, [[0, '#5a5c58'], [0.4, '#d4d6d0'], [1, '#3a3c38']]); x.beginPath(); x.ellipse(cx, cy - L / 2, r * 1.04, r * 0.34, 0, 0, TAU); x.fill(); // the lid
  x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1; x.stroke();
  x.fillStyle = '#c8b070'; x.fillRect(cx - r, cy - L * 0.12, r * 2, L * 0.22); x.fillStyle = 'rgba(40,30,10,0.55)'; x.font = `600 ${Math.round(h * 0.07)}px "Barlow Semi Condensed", sans-serif`; x.textAlign = 'center'; x.fillText('36', cx, cy + L * 0.03); // its worn label
  // the leader: a flat strip drawn straight out of the slot at the can's foot and lying along the floor, its sprocket
  // holes along both edges (a curl read as a cup's handle)
  const sy = cy + L * 0.36, sw = h * 0.07, sx0 = cx + r * 0.85, sx1 = cx + r * 3.1;
  x.fillStyle = 'rgba(16,10,4,0.35)'; x.fillRect(sx0, sy + sw * 0.6, sx1 - sx0, sw * 0.5);
  x.fillStyle = lin(x, 0, sy - sw / 2, 0, sy + sw / 2, [[0, '#5a4220'], [0.5, '#3a2a14'], [1, '#22180a']]); x.beginPath(); x.moveTo(sx0, sy - sw / 2); x.lineTo(sx1, sy - sw / 2 + 1); x.lineTo(sx1 - sw * 0.6, sy + sw / 2 + 1); x.lineTo(sx0, sy + sw / 2); x.closePath(); x.fill();
  x.fillStyle = 'rgba(226,206,160,0.55)'; for (let i = 0; i < 9; i++) { const hx = sx0 + sw * 0.4 + i * (sx1 - sx0 - sw) / 9; x.fillRect(hx, sy - sw * 0.42, sw * 0.16, sw * 0.2); x.fillRect(hx, sy + sw * 0.22, sw * 0.16, sw * 0.2); }
  x.strokeStyle = 'rgba(255,236,200,0.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(sx0, sy - sw / 2); x.lineTo(sx1, sy - sw / 2 + 1); x.stroke();
  x.fillStyle = '#1a1612'; x.fillRect(cx + r * 0.78, sy - sw * 0.65, r * 0.16, sw * 1.3); // the felt-lined slot it comes from
}
// the anglerfish's lure: a pale bulb on its stalk, lit from inside
export function drawLure3(x, w, h) {
  const bx = w * 0.56, by = h * 0.4, r = h * 0.12;
  const gl = x.createRadialGradient(bx, by, 1, bx, by, r * 3.2); gl.addColorStop(0, 'rgba(200,236,214,0.55)'); gl.addColorStop(1, 'rgba(200,236,214,0)'); x.fillStyle = gl; x.fillRect(0, 0, w, h);
  x.strokeStyle = lin(x, w * 0.2, 0, bx, 0, [[0, '#2a2622'], [1, '#5a524a']]); x.lineWidth = h * 0.035; x.lineCap = 'round'; x.beginPath(); x.moveTo(w * 0.18, h * 0.82); x.bezierCurveTo(w * 0.24, h * 0.36, w * 0.4, h * 0.3, bx - r * 0.8, by + r * 0.3); x.stroke();
  ball(x, bx, by, r, 'rgba(214,240,224,0.95)', 'rgba(255,255,248,1)', 'rgba(96,140,120,0.95)');
  x.fillStyle = 'rgba(255,255,250,0.85)'; x.beginPath(); x.arc(bx - r * 0.25, by - r * 0.3, r * 0.22, 0, TAU); x.fill();
  for (let i = 0; i < 3; i++) { x.strokeStyle = 'rgba(70,60,52,0.8)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(bx + r * 0.6, by + r * 0.4 + i * 2); x.quadraticCurveTo(bx + r * 1.4, by + r * (1 + i * 0.4), bx + r * (1.1 + i * 0.3), by + r * (1.8 + i * 0.3)); x.stroke(); } // its little filaments
}
