// (6.7.0) The diver's bare head in profile, drawn from the look chosen in the creator (P.look): man or woman, a face
// shape, how deep the eyes are set, a hairstyle and a skin tone. The head is designed facing right with y down
// (X forward, Y down, about 16 units from crown to chin) and turned into earl_draw.js's local axes (+x up, +y toward
// the face). Painted, not outlined: a lit skin gradient, the socket and cheek in soft shadow; the hair a mass with
// volume standing above the skull, from the hairline over the forehead to behind the ear, strands catching the light.
export const DEFAULT_LOOK = { sex: 'm', face: 0, eyes: 1, hair: 'swept', skin: 2 };
export const FACES = ['Oval', 'Square', 'Narrow', 'Round'];
export const EYES = ['Open', 'Even', 'Deep-set'];
export const HAIRS = ['crop', 'swept', 'curly', 'buzz', 'bob', 'ponytail', 'bun'];
export const HAIR_NAMES = { crop: 'Crop', swept: 'Swept', curly: 'Curly', buzz: 'Buzz', bob: 'Bob', ponytail: 'Ponytail', bun: 'Bun' };
// light, middle and shadow of each skin, fair to deep
export const SKINS = [['#f0d2b8', '#d8ae90', '#b28366'], ['#e2b896', '#c69472', '#9c6c50'], ['#d2a586', '#b08368', '#80604a'], ['#ae7a58', '#8c5c3e', '#63412b'], ['#86583c', '#68422b', '#472c1c'], ['#5e3e2b', '#4a2f20', '#301e14']];
const HAIR = '#33261d';
// (7.1.3) more to choose: beard (none, stubble, short, full), hair colour, eye colour, and a few playful skins kept muted
export const BEARDS = ['None', 'Stubble', 'Short', 'Full'];
export const HAIR_COLS = [['Black', ['#3a332e', '#1c1814', '#0c0a08']], ['Dark brown', ['#54402f', '#33261d', '#1c140e']], ['Brown', ['#7a5a3e', '#58402a', '#33241a']], ['Auburn', ['#8c4a2e', '#663220', '#3a1c12']], ['Blonde', ['#c8a970', '#a08550', '#6a5636']], ['Grey', ['#b4ada2', '#8a847a', '#55514a']], ['Sea green', ['#6e8a6e', '#4c654e', '#2c3c2e']], ['Ink blue', ['#4e5e78', '#343f54', '#1c2230']]];
export const EYE_COLS = [['Brown', '#3a2e22'], ['Hazel', '#6a5532'], ['Green', '#4a6040'], ['Grey-blue', '#55687a'], ['Amber', '#8a6430']];
SKINS.push(['#b8c8cc', '#94a8ae', '#6c8088'], ['#b4c2a6', '#93a386', '#6a7a60'], ['#c4bcb0', '#a39a8e', '#776e64']); // pale blue, sea green, ash
export const lookOf = (L) => { const o = Object.assign({}, DEFAULT_LOOK, L || {}); if (o.hc != null && !o.hairCol) o.hairCol = (HAIR_COLS[o.hc] || HAIR_COLS[1])[1]; return o; };

// the jaw by face shape: [chin front X, chin front Y, chin bottom X, chin bottom Y, jaw angle X, jaw angle Y, the angle's softness]
const JAW = [
  [6.0, 7.3, 4.5, 8.4, -1.0, 6.6, 1.0], // oval
  [6.2, 7.4, 4.9, 8.6, -1.9, 7.2, 0.35], // square: a strong, low angle and a broad chin
  [5.8, 7.9, 4.0, 9.2, -0.4, 6.2, 1.1], // narrow: a long face, a small chin, the angle high
  [5.8, 7.0, 4.2, 8.2, -1.4, 6.8, 1.9], // round: a soft short jaw and full cheeks
];

export function drawFace(ctx, hx, hy, u, look) {
  const L = lookOf(look), f = L.sex === 'f', S = SKINS[L.skin] || SKINS[2], k = 0.86; HC = L.hairCol || null;
  const Q = (X, Y) => [hx - Y * k * u, hy + X * k * u]; // design space to the diver's local axes
  const J = JAW[L.face] || JAW[0], [cfx, cfy, cbx, cby, jax, jay, soft] = f ? [J[0] - 0.2, J[1] - 0.2, J[2] - 0.2, J[3] - 0.25, J[4] + 0.5, J[5] - 0.3, J[6] + 0.6] : J;
  const nose = f ? [7.0, 2.4] : [7.6, 2.6];
  const head = new Path2D(), mv = (X, Y) => head.moveTo(...Q(X, Y)), qc = (a, b, c, d) => head.quadraticCurveTo(...Q(a, b), ...Q(c, d)), ln = (X, Y) => head.lineTo(...Q(X, Y));
  mv(-5.2, 4.4);
  qc(-7.3, 2.0, -7.1, -1.6);           // the back of the skull
  qc(-6.9, -6.4, -3.4, -7.7);          // up over the back
  qc(0.6, -8.8, 3.8, -6.9);            // the crown
  qc(5.5, -5.4, 5.6, -1.7);            // the forehead, near upright
  qc(6.1, -1.1, 5.6, -0.3);            // the brow, the bridge of the nose set back under it
  qc(6.6, 1.0, nose[0], nose[1]);      // the nose
  qc(7.3, 3.4, 6.3, 3.35);             // under it
  qc(6.25, 3.9, f ? 6.6 : 6.45, 4.35); // the upper lip
  ln(6.0, 4.75);                        // the mouth's corner
  qc(f ? 6.75 : 6.55, 5.1, 6.35, 5.5); // the lower lip
  qc(5.6, 5.9, 5.75, 6.3);             // the dip under it
  qc(cfx + 0.2, cfy - 0.6, cfx, cfy);  // the chin's front
  qc(cfx - 0.1, cby + 0.1, cbx, cby);  // under the chin
  qc(1.2 + soft * 0.4, jay + 1.2, jax, jay);           // the jaw line
  qc(jax - 0.6 * (2 - soft), jay - 1.4, -1.6, 3.4);   // the jaw's angle, up to below the ear
  qc(-3.2, 4.6, -5.2, 4.4); head.closePath();
  hairBack(ctx, Q, u * k, L.hair);
  const sk = ctx.createLinearGradient(...Q(6, -6), ...Q(-6, 6)); sk.addColorStop(0, S[0]); sk.addColorStop(0.5, S[1]); sk.addColorStop(1, S[2]);
  ctx.fillStyle = sk; ctx.fill(head);
  ctx.save(); ctx.clip(head);
  const blob = (X, Y, r, a, col = '60,36,24') => { const [bx, by] = Q(X, Y), g = ctx.createRadialGradient(bx, by, 0.2 * u, bx, by, r * u * k); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r * u * k, 0, Math.PI * 2); ctx.fill(); };
  blob(2.4, 3.4, L.face === 3 ? 2.2 : 2.6, L.face === 3 ? 0.12 : 0.28);          // under the cheekbone, (7.1.3) deeper
  blob(3.4, 1.4, 1.6, 0.2, '255,232,206');                                   // (7.1.3) the cheekbone itself catching the light
  { const cb = new Path2D(); cb.moveTo(...Q(1.2, 2.6)); cb.quadraticCurveTo(...Q(2.8, 2.2), ...Q(4.6, 2.9)); ctx.save(); ctx.filter = `blur(${(0.5 * u).toFixed(1)}px)`; ctx.strokeStyle = 'rgba(70,40,26,0.22)'; ctx.lineWidth = 0.6 * u; ctx.stroke(cb); ctx.restore(); } // the hollow's upper edge
  blob(-4.6, 2.0, 2.2, 0.22);                                               // (7.1.3) the back of the head into the neck, in shadow
  blob(4.6, -0.3, 1.5 + 0.2 * L.eyes, [0.12, 0.26, 0.42][L.eyes] || 0.26);   // the eye's socket
  blob(0.6, 7.2, 2.6, 0.16); blob(-2.6, 5.4, 2.4, 0.18);                   // under the jaw, toward the neck
  blob(5.6, -4.2, 2.2, 0.16, '255,236,214');                               // light on the forehead
  const BD = L.beard === true ? 3 : (L.beard ?? (f ? 0 : 1)); // (7.1.3) 0 none, 1 stubble, 2 short, 3 full
  if (BD >= 1) { // a shadow of stubble along the jaw and over the lip: a soft darkening in the hair's own colour, not dots
    const jw = new Path2D(); jw.moveTo(...Q(6.5, 3.6)); jw.quadraticCurveTo(...Q(6.6, 8.2), ...Q(cbx, cby)); jw.quadraticCurveTo(...Q(1.4, jay + 1.2), ...Q(jax, jay)); jw.lineTo(...Q(jax + 0.6, jay - 1.8)); jw.quadraticCurveTo(...Q(3.0, 5.4), ...Q(5.2, 3.6)); jw.closePath();
    ctx.save(); ctx.filter = `blur(${(0.7 * u).toFixed(1)}px)`; ctx.fillStyle = HC ? HC[2] : 'rgb(30,24,20)'; ctx.globalAlpha = 0.26; ctx.fill(jw); ctx.restore();
  }
  if (f) { blob(4.0, 2.6, 1.8, 0.12, '190,90,80'); } // a little colour in a woman's cheek
  ctx.restore();
  // a faint glint down the nose's ridge (the forehead's light is in the skin's own gradient, never a line)
  ctx.strokeStyle = 'rgba(252,226,204,0.22)'; ctx.lineWidth = 0.35 * u; ctx.beginPath(); ctx.moveTo(...Q(5.9, 0.4)); ctx.quadraticCurveTo(...Q(6.6, 1.2), ...Q(nose[0] - 0.2, nose[1] - 0.1)); ctx.stroke();
  // the nostril's wing, the lips (a little colour), the mouth's line
  ctx.strokeStyle = 'rgba(70,40,28,0.55)'; ctx.lineWidth = 0.35 * u; ctx.beginPath(); ctx.moveTo(...Q(6.2, 2.0)); ctx.quadraticCurveTo(...Q(5.6, 2.6), ...Q(6.1, 3.2)); ctx.stroke();
  ctx.fillStyle = f ? 'rgba(150,64,56,0.4)' : 'rgba(120,60,50,0.18)'; ctx.beginPath(); ctx.moveTo(...Q(6.4, 4.3)); ctx.quadraticCurveTo(...Q(6.9, 4.8), ...Q(6.35, 5.45)); ctx.lineTo(...Q(5.9, 4.8)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(70,38,28,0.6)'; ctx.lineWidth = 0.3 * u; ctx.beginPath(); ctx.moveTo(...Q(6.05, 4.75)); ctx.lineTo(...Q(5.3, 4.65)); ctx.stroke();
  // the ear (hidden under a bob)
  if (L.hair !== 'bob') { ctx.fillStyle = S[1]; ctx.beginPath(); ctx.ellipse(...Q(-1.9, 1.2), 1.3 * u * k, 2.1 * u * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,34,24,0.45)'; ctx.lineWidth = 0.35 * u; ctx.beginPath(); ctx.arc(...Q(-1.8, 1.1), 1.0 * u * k, -2.2, 1.2); ctx.stroke(); }
  // the eye: white, iris, catchlight, lid; lashes for a woman; deep-set eyes sit further in under a heavier brow
  const ex = 4.5 - 0.15 * (L.eyes - 1), ey = -0.2;
  ctx.fillStyle = '#eadfce'; ctx.beginPath(); ctx.ellipse(...Q(ex, ey), 0.5 * u * k, 0.62 * u * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = (EYE_COLS[L.eyeCol] || EYE_COLS[0])[1]; ctx.beginPath(); ctx.arc(...Q(ex + 0.2, ey + 0.05), 0.38 * u * k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#0c0a08'; ctx.beginPath(); ctx.arc(...Q(ex + 0.24, ey + 0.05), 0.17 * u * k, 0, Math.PI * 2); ctx.fill(); // (7.1.3) its colour, and the pupil
  ctx.fillStyle = 'rgba(255,250,240,0.9)'; ctx.beginPath(); ctx.arc(...Q(ex + 0.32, ey - 0.12), 0.12 * u * k, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,26,18,0.9)'; ctx.lineWidth = (f ? 0.42 : 0.32) * u; ctx.beginPath(); ctx.moveTo(...Q(ex - 0.5, ey - 0.45)); ctx.quadraticCurveTo(...Q(ex + 0.2, ey - 0.75), ...Q(ex + 0.65, ey - 0.25)); ctx.stroke();
  if (f) { ctx.lineWidth = 0.22 * u; ctx.beginPath(); ctx.moveTo(...Q(ex + 0.6, ey - 0.3)); ctx.lineTo(...Q(ex + 1.0, ey - 0.6)); ctx.stroke(); }
  const by = -1.35 - (L.eyes === 0 ? 0.25 : 0) + (L.eyes === 2 ? 0.12 : 0);
  ctx.strokeStyle = 'rgba(52,40,30,0.9)'; ctx.lineWidth = (f ? 0.4 : 0.6) * u; ctx.beginPath(); ctx.moveTo(...Q(ex - 0.9, by + 0.15)); ctx.quadraticCurveTo(...Q(ex + 0.1, by - 0.35), ...Q(ex + 1.1, by + 0.05)); ctx.stroke();
  if (L.age) { // (6.7.1) years: a crease at the eye's corner, two across the forehead, one from the nose to the mouth
    ctx.strokeStyle = 'rgba(70,40,28,0.35)'; ctx.lineWidth = 0.22 * u; ctx.lineCap = 'round';
    for (const [a, b, c, d] of [[3.6, -0.7, 3.1, -0.2], [3.7, 0.1, 3.2, 0.3], [4.6, -3.0, 3.0, -3.3], [4.7, -2.3, 3.3, -2.6], [5.6, 2.9, 4.9, 4.6]]) { ctx.beginPath(); ctx.moveTo(...Q(a, b)); ctx.lineTo(...Q(c, d)); ctx.stroke(); }
  }
  if (BD >= 2) { // (6.7.1) a beard: from the sideburn along the jaw round the chin, and over the lip; (7.1.3) short is the same shape held close (thinner, lighter)
    const bd = new Path2D(), bq = (a, b, c, d) => bd.quadraticCurveTo(...Q(a, b), ...Q(c, d));
    bd.moveTo(...Q(-0.4, 0.6)); bq(0.6, 3.4, 3.4, 3.2); bq(5.4, 3.0, 6.3, 3.5); bq(6.0, 4.4, 5.6, 4.9); bq(6.5, 5.6, 6.4, 6.4); bq(6.6, 8.6, cbx - 0.2, cby + 0.6); bq(1.2, jay + 1.9, jax - 0.4, jay + 0.4); bq(jax - 1.2, 3.2, -1.2, 1.6); bd.closePath();
    paintHair(ctx, bd, Q, u * k, BD === 2 ? 0.7 : 1); ctx.fillStyle = 'rgba(120,70,56,0.4)'; ctx.beginPath(); ctx.ellipse(...Q(6.2, 5.0), 0.5 * u * k, 0.35 * u * k, 0, 0, Math.PI * 2); ctx.fill(); // the lip showing through
  }
  if (L.cap) { // (6.7.1) a knit cap pulled down to the brow: ribbed wool and its folded band
    const cp = new Path2D(), cq = (a, b, c, d) => cp.quadraticCurveTo(...Q(a, b), ...Q(c, d));
    cp.moveTo(...Q(5.6, -4.2)); cq(5.6, -9.6, 0.2, -10.2); cq(-6.0, -10.0, -7.8, -4.4); cq(-8.0, -2.0, -7.2, -1.6); cq(-1.0, -2.4, 5.6, -4.2); cp.closePath();
    const cg = ctx.createLinearGradient(...Q(2, -10), ...Q(-6, -1)); cg.addColorStop(0, L.cap); cg.addColorStop(1, '#1c1a16'); ctx.fillStyle = cg; ctx.fill(cp);
    ctx.save(); ctx.clip(cp); ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.3 * u;
    for (let i = -7; i <= 6; i += 0.9) { ctx.beginPath(); ctx.moveTo(...Q(i, -11)); ctx.lineTo(...Q(i - 0.4, -1)); ctx.stroke(); }
    const band = new Path2D(); band.moveTo(...Q(5.7, -4.0)); band.quadraticCurveTo(...Q(-1.0, -2.2), ...Q(-7.4, -1.4)); band.lineTo(...Q(-7.6, -3.6)); band.quadraticCurveTo(...Q(-1.0, -4.6), ...Q(5.6, -6.2)); band.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill(band); ctx.strokeStyle = 'rgba(255,240,220,0.12)'; ctx.lineWidth = 0.25 * u; ctx.stroke(band); ctx.restore();
    return;
  }
  hairTop(ctx, Q, u * k, L.hair);
}

// the hair that falls behind (a bob to the jaw, a ponytail), under the head
function hairBack(ctx, Q, u, h) {
  const p = new Path2D(), mv = (X, Y) => p.moveTo(...Q(X, Y)), qc = (a, b, c, d) => p.quadraticCurveTo(...Q(a, b), ...Q(c, d));
  if (h === 'bob') { mv(-1.0, -5.6); qc(-8.4, -5.0, -7.8, 2.6); qc(-7.4, 6.0, -4.4, 6.6); qc(-2.0, 6.6, -0.6, 5.2); qc(-2.4, 2.0, -1.0, -1.0); p.closePath(); }
  else if (h === 'ponytail') { mv(-6.0, -3.6); qc(-9.2, -3.2, -9.0, 1.6); qc(-8.8, 5.6, -8.0, 7.2); qc(-7.6, 4.4, -7.0, 1.2); qc(-6.8, -1.4, -5.4, -2.4); p.closePath(); }
  else return;
  paintHair(ctx, p, Q, u);
}
// the hair on top of the head: a mass standing above the skull, from the hairline at the top of the forehead back over
// the crown to behind the ear, a short sideburn in front of the ear. Each style its own height and edge
function hairTop(ctx, Q, u, h) {
  const p = new Path2D(), mv = (X, Y) => p.moveTo(...Q(X, Y)), qc = (a, b, c, d) => p.quadraticCurveTo(...Q(a, b), ...Q(c, d)), ln = (X, Y) => p.lineTo(...Q(X, Y));
  // the line under the hair, on the skin: the hairline, the temple, round above the ear, down the back to behind it
  const under = () => { ln(-6.6, 0.4); qc(-4.6, -0.6, -3.0, -0.4); qc(-2.0, -1.2, -0.6, -0.8); ln(-0.4, 1.0); ln(0.4, 1.0); qc(0.8, -1.8, 2.8, -3.2); qc(4.0, -4.6, 4.6, -5.4); p.closePath(); };
  if (h === 'buzz') { mv(4.6, -5.4); qc(3.6, -7.6, 0.4, -8.3); qc(-4.2, -8.4, -6.6, -5.0); qc(-7.6, -2.2, -6.6, 0.4); under(); paintHair(ctx, p, Q, u, 0.5); return; }
  if (h === 'crop') { mv(4.8, -5.6); qc(4.4, -8.4, 0.6, -9.2); qc(-4.6, -9.3, -7.0, -5.6); qc(-8.0, -2.4, -6.6, 0.4); under(); }
  else if (h === 'swept') { mv(5.2, -5.4); qc(6.4, -8.6, 3.4, -9.8); qc(-0.6, -10.6, -5.2, -8.8); qc(-8.0, -6.6, -7.8, -2.6); qc(-7.6, -0.6, -6.6, 0.4); under(); } // lifted and combed back from the brow
  else if (h === 'curly') { mv(5.0, -5.4); qc(6.0, -9.4, 1.0, -10.6); qc(-5.4, -10.8, -8.0, -6.4); qc(-8.8, -2.4, -6.8, 0.6); under(); }
  else { mv(5.0, -5.2); qc(5.0, -8.6, 1.0, -9.4); qc(-4.8, -9.6, -7.2, -5.8); qc(-8.0, -2.6, -6.6, 0.0); under(); } // bob, ponytail, bun: smooth, close, parted back
  paintHair(ctx, p, Q, u);
  if (h === 'curly') { // tight coils: many small part-arcs, and an edge broken by curls
    ctx.save(); ctx.clip(p); ctx.lineWidth = 0.22 * u; ctx.lineCap = 'round'; let sd = 11; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 110; i++) { const [cx, cy] = Q(-7.6 + rr() * 13, -10.4 + rr() * 9), a0 = rr() * 6.28; ctx.strokeStyle = rr() < 0.5 ? 'rgba(140,110,86,0.32)' : 'rgba(10,8,6,0.32)'; ctx.beginPath(); ctx.arc(cx, cy, (0.3 + rr() * 0.22) * u, a0, a0 + 2.4); ctx.stroke(); }
    ctx.restore(); ctx.fillStyle = HC ? HC[1] : HAIR;
    for (let i = 0; i <= 16; i++) { const t = i / 16, a = Math.PI * (1.02 + 0.98 * t), [cx, cy] = Q(-1.2 + Math.cos(a) * 6.7, -3.6 + Math.sin(a) * 6.6); ctx.beginPath(); ctx.arc(cx, cy, 0.85 * u, 0, Math.PI * 2); ctx.fill(); }
  }
  if (h === 'bun') { const [bx, by] = Q(-6.0, -7.4), g = ctx.createRadialGradient(bx, by, 0.2 * u, bx, by, 2.4 * u); g.addColorStop(0, HC ? HC[0] : '#5a4636'); g.addColorStop(1, HC ? HC[1] : HAIR); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 2.3 * u, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(14,10,8,0.4)'; ctx.lineWidth = 0.3 * u; ctx.beginPath(); ctx.arc(bx, by, 1.3 * u, 0.4, 3.4); ctx.stroke(); }
  if (h === 'ponytail') { const [tx, ty] = Q(-6.2, -2.8); ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(tx, ty, 0.7 * u, 0, Math.PI * 2); ctx.fill(); } // the tie
}
let HC = null; // (6.7.1) a character's own hair colour [light, middle, dark] (the creator's divers keep the dark brown)
function paintHair(ctx, p, Q, u, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(...Q(2, -10), ...Q(-6, 0)); g.addColorStop(0, HC ? HC[0] : '#54402f'); g.addColorStop(0.45, HC ? HC[1] : HAIR); g.addColorStop(1, HC ? HC[2] : '#1c140e');
  ctx.fillStyle = g; ctx.fill(p);
  // (7.1.3) locks, then strands: the hair is clumps of strands, each lock a tapered band following the head's curve,
  // lit on its upper side and dark in the gaps between, then fine strands over them; never a smooth fill
  ctx.clip(p); let sd = 7; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const C0 = HC ? HC[0] : '#54402f', C2 = HC ? HC[2] : '#1c140e';
  ctx.lineCap = 'round';
  for (let i = 0; i < 22; i++) { const r = 5.8 + rr() * 4.4, a0 = Math.PI * (1.08 + rr() * 0.86), a1 = a0 + 0.3 + rr() * 0.3, wdt = (0.7 + rr() * 0.9) * u;
    const pts = []; for (let t = 0; t <= 1.001; t += 0.2) { const a = a0 + (a1 - a0) * t; pts.push(Q(-1.0 + Math.cos(a) * r, -3.0 + Math.sin(a) * r)); }
    const line = () => { ctx.beginPath(); pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
    ctx.strokeStyle = C2; ctx.globalAlpha = 0.3; ctx.lineWidth = wdt * 1.1; line(); ctx.stroke(); // the gap's shadow
    ctx.strokeStyle = C0; ctx.globalAlpha = 0.18 + rr() * 0.14; ctx.lineWidth = wdt * 0.7; line(); ctx.stroke(); } // the lock's lit crest, soft
  ctx.globalAlpha = alpha; ctx.lineWidth = 0.14 * u;
  for (let i = 0; i < 70; i++) { const r = 6.0 + rr() * 4.0, a0 = Math.PI * (1.1 + rr() * 0.8), a1 = a0 + 0.18 + rr() * 0.22;
    ctx.strokeStyle = rr() < 0.5 ? 'rgba(220,196,160,0.22)' : 'rgba(8,6,4,0.3)'; ctx.beginPath();
    for (let t = 0; t <= 1.001; t += 0.25) { const a = a0 + (a1 - a0) * t, [x, y] = Q(-1.0 + Math.cos(a) * r, -3.0 + Math.sin(a) * r); if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke(); }
  ctx.restore();
}
