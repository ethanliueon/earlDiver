// (5.11.4) The shop's suits as a supplier photographs them: each suit upright as if worn (no stand, no one in it),
// turned about 35 degrees away and lit from one side, then cut out and turned on its side, head to the left, to lie
// across the picture (mirrored before turning, so the light falls from the top). No floor shadow (it is a turned photograph), only a faint shadow round its own outline.
// Samples for the owner first: the Wetsuit and the Iron Lung; every other suit is still drawn by drawSuitFlat.
// The drawing is the approved proof of concept (docs/poc/suits_samples.html, hardsuit_A.html), on an 800 x 900 page.
const TAU = Math.PI * 2;
let x = null, C = { width: 800, height: 900 }, seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function grain(x0, y0, w, h, n, a) { for (let i = 0; i < n; i++) { x.fillStyle = rnd() < 0.5 ? `rgba(40,32,20,${rnd() * a})` : `rgba(255,250,238,${rnd() * a})`; x.fillRect(x0 + rnd() * w, y0 + rnd() * h, 1.2, 1.2); } }
// fill a path, then shade it inside: a gradient across the form, and its edges rolled into shadow
function form(path, base, across, edge = 0.5, edgeW = 18) {
  x.save(); path(); x.fillStyle = base; x.fill(); x.clip();
  if (across) { x.fillStyle = across; x.fillRect(0, 0, C.width, C.height); }
  if (edge) { path(); x.strokeStyle = `rgba(6,7,8,${edge})`; x.lineWidth = edgeW; x.filter = 'blur(6px)'; x.stroke(); x.filter = 'none'; }
  x.restore();
}
function lin(x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); for (const [k, c] of stops) g.addColorStop(k, c); return g; }
// a fold in cloth: a soft dark valley with a lit ridge beside it, on the side the light comes from
function fold(pts, w = 5, dark = 0.5, lite = 0.12, clip) {
  x.save(); if (clip) { clip(); x.clip(); }
  const line = (dx, dy) => { x.beginPath(); x.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (let i = 1; i < pts.length; i += 3) x.bezierCurveTo(pts[i][0] + dx, pts[i][1] + dy, pts[i + 1][0] + dx, pts[i + 1][1] + dy, pts[i + 2][0] + dx, pts[i + 2][1] + dy); };
  x.lineCap = 'round'; x.filter = `blur(${Math.max(1, w * 0.45)}px)`;
  line(0, 0); x.strokeStyle = `rgba(4,5,6,${dark})`; x.lineWidth = w; x.stroke();
  line(-w * 0.75, -w * 0.25); x.strokeStyle = `rgba(150,160,166,${lite})`; x.lineWidth = w * 0.55; x.stroke();
  x.filter = 'none'; x.restore();
}
function stitch(pts, clip, a = 0.28) {
  x.save(); if (clip) { clip(); x.clip(); }
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 3) x.bezierCurveTo(...pts[i], ...pts[i + 1], ...pts[i + 2]);
  x.setLineDash([3, 3]); x.strokeStyle = `rgba(170,176,178,${a})`; x.lineWidth = 1.1; x.stroke();
  x.setLineDash([]); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2.2; x.globalCompositeOperation = 'multiply'; x.stroke();
  x.restore();
}


function wetsuit(ox) {
  const X = (v) => ox + v; // panel coordinates
  const N = { base: '#272b2d', lite: '#4a5054', dark: '#121415' };
  // --- the far leg (left): empty, flattened, hanging; behind the near leg, a little darker ---
  const farLeg = () => { x.beginPath(); x.moveTo(X(316), 488); x.bezierCurveTo(X(318), 560, X(326), 640, X(322), 712); x.bezierCurveTo(X(320), 750, X(318), 776, X(320), 790);
    x.bezierCurveTo(X(334), 796, X(352), 796, X(366), 790); x.bezierCurveTo(X(364), 770, X(368), 720, X(372), 660); x.bezierCurveTo(X(376), 600, X(380), 560, X(384), 520); x.closePath(); };
  form(farLeg, '#1e2123', lin(X(316), 0, X(380), 0, [[0, 'rgba(70,76,80,0.55)'], [0.4, 'rgba(40,44,46,0.2)'], [1, 'rgba(0,0,0,0.5)']]), 0.55, 14);
  fold([[X(344), 540], [X(340), 600], [X(350), 650], [X(346), 720]], 4, 0.45, 0.08, farLeg);
  fold([[X(330), 650], [X(338), 664], [X(352), 668], [X(364), 660]], 4, 0.55, 0.1, farLeg); // the knee, slack
  fold([[X(326), 768], [X(338), 774], [X(352), 776], [X(364), 770]], 3, 0.5, 0.1, farLeg);

  // --- the near leg (right): larger, in front ---
  const nearLeg = () => { x.beginPath(); x.moveTo(X(380), 518); x.bezierCurveTo(X(392), 560, X(396), 620, X(398), 700); x.bezierCurveTo(X(398), 746, X(400), 776, X(402), 796);
    x.bezierCurveTo(X(418), 802, X(438), 802, X(452), 794); x.bezierCurveTo(X(448), 760, X(450), 700, X(456), 640); x.bezierCurveTo(X(460), 590, X(466), 540, X(468), 500); x.closePath(); };
  form(nearLeg, N.base, lin(X(384), 0, X(468), 0, [[0, 'rgba(92,100,104,0.55)'], [0.35, 'rgba(60,66,70,0.25)'], [0.7, 'rgba(0,0,0,0.15)'], [1, 'rgba(0,0,0,0.55)']]), 0.5, 16);
  // knee pad: a slightly paler, pebbled panel, creased because nothing is inside
  const pad = () => { x.beginPath(); x.moveTo(X(402), 628); x.bezierCurveTo(X(414), 620, X(440), 620, X(452), 628); x.lineTo(X(450), 692); x.bezierCurveTo(X(436), 700, X(414), 700, X(401), 692); x.closePath(); };
  x.save(); pad(); x.clip(); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(X(390), 610, 80, 100); x.strokeStyle = 'rgba(120,124,120,0.16)'; x.lineWidth = 1; for (let i = -10; i < 20; i++) { x.beginPath(); x.moveTo(X(380 + i * 6), 610); x.lineTo(X(380 + i * 6 + 90), 710); x.stroke(); x.beginPath(); x.moveTo(X(380 + i * 6 + 90), 610); x.lineTo(X(380 + i * 6), 710); x.stroke(); } x.restore();
  stitch([[X(402), 628], [X(414), 620], [X(440), 620], [X(452), 628]], nearLeg); stitch([[X(401), 692], [X(414), 700], [X(436), 700], [X(450), 692]], nearLeg);
  fold([[X(404), 650], [X(418), 662], [X(436), 664], [X(452), 652]], 5, 0.6, 0.12, nearLeg);
  fold([[X(410), 676], [X(424), 670], [X(438), 672], [X(450), 680]], 3, 0.45, 0.1, nearLeg);
  fold([[X(430), 530], [X(424), 570], [X(434), 600], [X(428), 622]], 5, 0.4, 0.1, nearLeg);
  fold([[X(426), 704], [X(420), 740], [X(430), 770], [X(424), 800]], 5, 0.4, 0.1, nearLeg);
  fold([[X(404), 776], [X(418), 784], [X(434), 784], [X(450), 778]], 3, 0.5, 0.1, nearLeg);
  stitch([[X(462), 540], [X(458), 620], [X(452), 720], [X(450), 806]], nearLeg, 0.18); // the outside seam

  // --- the far sleeve (left): behind the torso, only its outer edge and cuff show ---
  const farArm = () => { x.beginPath(); x.moveTo(X(318), 214); x.bezierCurveTo(X(300), 214, X(286), 232, X(282), 262); x.bezierCurveTo(X(279), 284, X(278), 300, X(280), 320); x.bezierCurveTo(X(282), 380, X(286), 430, X(288), 470);
    x.bezierCurveTo(X(298), 476, X(310), 476, X(318), 470); x.lineTo(X(318), 260); x.closePath(); };
  form(farArm, '#1b1e20', lin(X(278), 0, X(318), 0, [[0, 'rgba(80,86,90,0.45)'], [1, 'rgba(0,0,0,0.5)']]), 0.5, 12);
  fold([[X(282), 350], [X(292), 360], [X(304), 362], [X(316), 356]], 4, 0.5, 0.1, farArm);
  fold([[X(286), 456], [X(296), 462], [X(308), 462], [X(318), 456]], 3, 0.45, 0.08, farArm);

  // --- the torso, filled by the stand: a lit front plane (left) and a darker side plane (right) ---
  const torso = () => { x.beginPath(); x.moveTo(X(303), 232); x.bezierCurveTo(X(304), 220, X(312), 210, X(326), 202); x.bezierCurveTo(X(344), 190, X(356), 181, X(366), 178); x.bezierCurveTo(X(384), 184, X(404), 186, X(420), 184);
    x.bezierCurveTo(X(444), 196, X(464), 210, X(476), 226); x.bezierCurveTo(X(482), 250, X(480), 270, X(476), 290); x.bezierCurveTo(X(470), 340, X(460), 384, X(460), 424);
    x.bezierCurveTo(X(464), 456, X(470), 480, X(468), 502); x.bezierCurveTo(X(440), 512, X(410), 524, X(382), 524); x.bezierCurveTo(X(360), 516, X(334), 498, X(314), 490);
    x.bezierCurveTo(X(316), 460, X(326), 440, X(328), 418); x.bezierCurveTo(X(320), 360, X(308), 310, X(306), 280); x.bezierCurveTo(X(303), 260, X(302), 246, X(303), 232); x.closePath(); };
  form(torso, N.base, lin(X(300), 0, X(482), 0, [[0, 'rgba(98,106,110,0.5)'], [0.28, 'rgba(78,86,90,0.42)'], [0.56, 'rgba(36,40,42,0.1)'], [0.66, 'rgba(0,0,0,0.32)'], [1, 'rgba(0,0,0,0.55)']]), 0.45, 18);
  // the chest's roundness on the form, catching the light
  x.save(); torso(); x.clip(); let g = x.createRadialGradient(X(352), 262, 6, X(360), 280, 90); g.addColorStop(0, 'rgba(150,158,162,0.22)'); g.addColorStop(1, 'rgba(150,158,162,0)'); x.fillStyle = g; x.fillRect(X(280), 180, 220, 200); x.restore();
  // shoulder panels: a slightly different neoprene, seamed across the chest
  stitch([[X(304), 250], [X(344), 262], [X(400), 262], [X(450), 246]], torso); stitch([[X(450), 246], [X(462), 300], [X(462), 380], [X(466), 500]], torso, 0.2);
  x.save(); torso(); x.clip(); x.beginPath(); x.moveTo(X(296), 196); x.lineTo(X(304), 250); x.bezierCurveTo(X(344), 262, X(400), 262, X(450), 246); x.lineTo(X(486), 210); x.lineTo(X(420), 170); x.closePath(); x.fillStyle = 'rgba(96,96,86,0.34)'; x.fill(); x.restore();
  // the waist: the stand narrows, the suit goes slack
  fold([[X(322), 420], [X(350), 432], [X(390), 434], [X(436), 424]], 5, 0.42, 0.1, torso);
  fold([[X(330), 448], [X(362), 456], [X(398), 456], [X(440), 446]], 4, 0.35, 0.08, torso);
  fold([[X(330), 478], [X(350), 492], [X(368), 506], [X(384), 520]], 5, 0.5, 0.1, torso); // into the crotch
  fold([[X(454), 480], [X(436), 494], [X(412), 508], [X(390), 520]], 5, 0.55, 0.06, torso);
  // the neck: a smooth glide-skin collar, dark inside
  x.save(); x.fillStyle = lin(X(360), 0, X(424), 0, [[0, '#596064'], [0.4, '#3a4044'], [1, '#141617']]); x.beginPath(); x.ellipse(X(393), 178, 33, 8, -0.08, 0, TAU); x.fill();
  x.fillStyle = 'rgba(6,7,7,0.85)'; x.beginPath(); x.ellipse(X(394), 177, 24, 4.5, -0.08, 0, TAU); x.fill(); // (5.11.5) a flatter, softer opening: turned on its side it read as a bottle's mouth
  x.fillStyle = 'rgba(160,166,170,0.25)'; x.beginPath(); x.ellipse(X(380), 172, 12, 3, -0.2, Math.PI, TAU); x.fill();
  x.fillStyle = lin(X(408), 0, X(432), 0, [[0, '#3c4244'], [1, '#191c1d']]); x.beginPath(); x.moveTo(X(406), 178); x.lineTo(X(430), 182); x.lineTo(X(432), 194); x.lineTo(X(408), 192); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(150,156,158,0.3)'; x.setLineDash([2, 2]); x.lineWidth = 1; x.stroke(); x.setLineDash([]); x.restore(); // the collar's closure tab

  // --- the near sleeve (right): over the side plane, hanging empty from the stand's shoulder ---
  const nearArm = () => { x.beginPath(); x.moveTo(X(446), 202); x.bezierCurveTo(X(474), 202, X(498), 216, X(503), 246); x.bezierCurveTo(X(508), 290, X(506), 350, X(502), 400);
    x.bezierCurveTo(X(500), 430, X(498), 460, X(496), 482); x.bezierCurveTo(X(486), 490, X(472), 490, X(464), 484); x.bezierCurveTo(X(466), 440, X(466), 380, X(466), 330); x.bezierCurveTo(X(466), 290, X(462), 250, X(450), 206); x.closePath(); };
  form(nearArm, N.base, lin(X(466), 0, X(516), 0, [[0, 'rgba(96,104,108,0.5)'], [0.45, 'rgba(60,66,70,0.2)'], [1, 'rgba(0,0,0,0.55)']]), 0.5, 14);
  x.save(); nearArm(); x.clip(); x.beginPath(); x.moveTo(X(440), 196); x.lineTo(X(520), 236); x.lineTo(X(520), 318); x.bezierCurveTo(X(500), 326, X(480), 324, X(460), 314); x.closePath(); x.fillStyle = 'rgba(96,96,86,0.34)'; x.fill(); x.restore();
  stitch([[X(460), 314], [X(480), 324], [X(500), 326], [X(510), 320]], nearArm); stitch([[X(452), 210], [X(474), 216], [X(492), 226], [X(502), 244]], nearArm); // the panel and the shoulder seam
  // where the shoulder of the stand ends, the sleeve drapes: diagonal pulls from the shoulder, a bunch at the elbow
  fold([[X(470), 236], [X(486), 250], [X(498), 270], [X(504), 296]], 5, 0.5, 0.12, nearArm);
  fold([[X(474), 278], [X(486), 290], [X(494), 306], [X(498), 326]], 4, 0.4, 0.1, nearArm);
  fold([[X(472), 360], [X(484), 370], [X(498), 372], [X(510), 364]], 5, 0.6, 0.14, nearArm);
  fold([[X(474), 378], [X(486), 386], [X(498), 388], [X(508), 382]], 3, 0.45, 0.1, nearArm);
  fold([[X(470), 466], [X(482), 472], [X(494), 472], [X(504), 466]], 3, 0.5, 0.1, nearArm);

  // cuffs: a smooth seal band, a dull sheen
  for (const [cx, cy, rx] of [[X(485), 484, 18], [X(303), 472, 15]]) { x.save(); x.fillStyle = 'rgba(120,128,132,0.18)'; x.beginPath(); x.ellipse(cx, cy - 6, rx, 5, 0, 0, TAU); x.fill(); x.restore(); }
  // the neoprene's surface: very fine, not a texture you notice
  x.save(); x.globalCompositeOperation = 'source-atop'; grain(X(270), 170, 260, 650, 7000, 0.06); x.restore();
}


const PAL = ['#3a3a36', '#6a6a62', '#4a4a44', '#a07a3a', '#1a1a18']; // dv_iron: base, light, mid, the brass, gloves
const ST = { deep: '#141412', dark: '#26261f', mid: '#3e3e38', body: '#4e4e47', lite: '#7c7c72', pale: '#a6a698' };
const BRS = { dark: '#4a3416', mid: '#7e5e2c', lite: '#b8935a' };
const steel = (x0, x1) => lin(x0, 0, x1, 0, [[0, ST.deep], [0.12, ST.dark], [0.3, ST.body], [0.4, ST.pale], [0.5, ST.lite], [0.74, ST.dark], [0.92, ST.deep], [1, '#2a2a24']]);
const brass = (x0, x1) => lin(x0, 0, x1, 0, [[0, BRS.dark], [0.3, BRS.mid], [0.42, BRS.lite], [0.7, BRS.mid], [1, BRS.dark]]);
// a plated limb segment between two points, round, shaded across; then a brass ring band at its far joint
function plate(ax, ay, bx, by, ra, rb, k = 1) {
  const a = Math.atan2(by - ay, bx - ax), L = Math.hypot(bx - ax, by - ay);
  x.save(); x.translate(ax, ay); x.rotate(a - Math.PI / 2);
  x.fillStyle = steel(-ra, ra); x.beginPath(); x.moveTo(-ra, 0); x.bezierCurveTo(-ra * 1.04, L * 0.4, -rb * 1.05, L * 0.7, -rb, L); x.lineTo(rb, L); x.bezierCurveTo(rb * 1.05, L * 0.7, ra * 1.04, L * 0.4, ra, 0); x.closePath(); x.fill();
  if (k < 1) { x.fillStyle = `rgba(10,10,8,${1 - k})`; x.fill(); }
  // a faint seam down the plate and the dents of use
  x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-ra * 0.25, L * 0.08); x.lineTo(-rb * 0.25, L * 0.92); x.stroke();
  x.restore();
}
function band(cx, cy, r, ang, k = 1) { // a brass joint ring seen on a limb at angle ang: an ellipse band
  x.save(); x.translate(cx, cy); x.rotate(ang);
  x.fillStyle = brass(-r, r); x.beginPath(); x.ellipse(0, 0, r, r * 0.34, 0, 0, TAU); x.fill();
  x.fillStyle = brass(-r, r); x.fillRect(-r, -4, r * 2, 8); x.beginPath(); x.ellipse(0, -4, r, r * 0.34, 0, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(20,14,4,0.6)'; x.lineWidth = 1; x.beginPath(); x.ellipse(0, 4, r, r * 0.34, 0, 0, Math.PI); x.stroke();
  x.fillStyle = 'rgba(230,200,140,0.35)'; x.beginPath(); x.ellipse(-r * 0.35, -5, r * 0.3, 1.4, 0, 0, TAU); x.fill();
  if (k < 1) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(10,10,8,${1 - k})`; x.fillRect(-r - 2, -12, r * 2 + 4, 24); }
  x.restore();
}
function glove(cx, cy, r, ang, k = 1) { x.save(); x.translate(cx, cy); x.rotate(ang); x.fillStyle = lin(-r, 0, r, 0, [[0, '#2a2a26'], [0.35, '#3c3c36'], [1, '#0e0e0c']]);
  x.beginPath(); x.ellipse(0, r * 0.6, r * 0.9, r * 1.25, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(-r * 0.75, r * 0.2, r * 0.32, r * 0.6, -0.5, 0, TAU); x.fill();
  if (k < 1) { x.fillStyle = `rgba(10,10,8,${1 - k})`; x.beginPath(); x.ellipse(0, r * 0.6, r * 0.9, r * 1.25, 0, 0, TAU); x.fill(); } x.restore(); }
function boot(cx, cy, r, k = 1) { x.save(); x.fillStyle = lin(cx - r * 1.6, 0, cx + r, 0, [[0, ST.dark], [0.35, ST.lite], [1, ST.deep]]);
  x.beginPath(); x.moveTo(cx - r, cy - 14); x.bezierCurveTo(cx - r * 1.3, cy - 4, cx - r * 2.0, cy - 2, cx - r * 2.1, cy + 6); x.lineTo(cx + r * 1.05, cy + 6); x.bezierCurveTo(cx + r * 1.1, cy - 4, cx + r, cy - 10, cx + r * 0.95, cy - 14); x.closePath(); x.fill();
  x.fillStyle = '#121210'; x.fillRect(cx - r * 2.15, cy + 4, r * 3.25, 7); if (k < 1) { x.fillStyle = `rgba(10,10,8,${1 - k})`; x.fillRect(cx - r * 2.2, cy - 16, r * 3.4, 28); } x.restore(); }

function shoulder(cx, cy, r) { // a domed shoulder joint: a steel cap with a brass ring round its rim
  x.save(); x.fillStyle = lin(cx - r, cy - r, cx + r, cy + r, [[0, ST.pale], [0.35, ST.body], [0.8, ST.dark], [1, ST.deep]]); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  x.strokeStyle = BRS.mid; x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, r - 2, 0.3, Math.PI - 0.3); x.stroke(); x.strokeStyle = 'rgba(20,14,4,0.5)'; x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.stroke(); x.restore();
}
function ironLung(ox) {
  const X = (v) => ox + v, FLOOR = 822;
  // far side (left) first, in shadow: the far leg and arm
  const F = 1; x.save(); x.filter = 'brightness(0.68)';
  plate(X(378), 500, X(368), 650, 30, 25, F); plate(X(368), 660, X(364), 800, 24, 19, F); band(X(368), 655, 27, 0.04, F); band(X(364), 800, 21, 0, F); boot(X(366), FLOOR - 8, 20, F);
  plate(X(318), 254, X(304), 380, 22, 19, F); plate(X(304), 388, X(310), 494, 18, 15, F); band(X(304), 384, 21, 0.1, F); band(X(310), 494, 16, -0.05, F); glove(X(310), 500, 15, 0.05, F);
  shoulder(X(322), 256, 26); x.restore();
  // the near leg
  plate(X(436), 500, X(446), 650, 32, 27); plate(X(446), 660, X(450), 800, 26, 21); band(X(446), 655, 29, -0.04); band(X(450), 800, 23, 0); boot(X(452), FLOOR - 6, 22);
  // the body: his build, a plated chest and back; brass bands at the waist and hips
  const torso = () => { x.beginPath(); x.moveTo(X(318), 246); x.bezierCurveTo(X(340), 228, X(372), 222, X(400), 222); x.bezierCurveTo(X(432), 222, X(462), 230, X(486), 248);
    x.bezierCurveTo(X(494), 300, X(484), 360, X(474), 404); x.bezierCurveTo(X(476), 440, X(474), 480, X(468), 506); x.bezierCurveTo(X(440), 520, X(380), 520, X(350), 506);
    x.bezierCurveTo(X(342), 480, X(336), 440, X(338), 404); x.bezierCurveTo(X(328), 360, X(314), 300, X(318), 246); x.closePath(); };
  x.save(); torso(); x.fillStyle = steel(X(314), X(494)); x.fill(); x.clip();
  let g = x.createRadialGradient(X(370), 290, 6, X(380), 310, 120); g.addColorStop(0, 'rgba(200,200,186,0.32)'); g.addColorStop(1, 'rgba(200,200,186,0)'); x.fillStyle = g; x.fillRect(X(300), 220, 210, 300);
  // the chest plate's edge and the side plate; dents; a few dark streaks where water ran off
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X(432), 228); x.bezierCurveTo(X(444), 300, X(444), 360, X(436), 404); x.stroke();
  x.strokeStyle = 'rgba(190,190,176,0.18)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(X(429), 230); x.bezierCurveTo(X(441), 300, X(441), 360, X(433), 404); x.stroke();
  for (let i = 0; i < 14; i++) { const sx = X(346 + rnd() * 120), sy = 300 + rnd() * 180; x.strokeStyle = `rgba(20,18,12,${0.08 + rnd() * 0.12})`; x.lineWidth = 2 + rnd() * 3; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (rnd() - 0.5) * 4, sy + 20 + rnd() * 40); x.stroke(); }
  torso(); x.strokeStyle = 'rgba(8,8,6,0.6)'; x.lineWidth = 16; x.filter = 'blur(6px)'; x.stroke(); x.filter = 'none';
  x.restore();
  // the ring bands across the body, as on Earl in the water: chest, waist, hips
  for (const [cy, r] of [[300, 82], [404, 70], [500, 62]]) { x.save(); x.beginPath(); x.ellipse(X(406), cy, r, r * 0.2, 0, 0, Math.PI); x.strokeStyle = BRS.dark; x.lineWidth = 10; x.stroke(); x.beginPath(); x.ellipse(X(406), cy - 3, r, r * 0.2, 0, 0.1, Math.PI - 0.1); x.strokeStyle = BRS.lite; x.lineWidth = 3; x.stroke(); x.restore(); }
  // the near arm, out of a round shoulder joint
  shoulder(X(484), 256, 30);
  plate(X(486), 258, X(500), 384, 24, 21); plate(X(500), 392, X(494), 498, 20, 17); band(X(500), 388, 23, -0.1); band(X(494), 498, 18, 0.05); glove(X(494), 504, 17, -0.05);
  // the helmet: a round dome on a brass neck ring, one big window turned a little to the left with the suit
  x.save(); x.translate(X(404), 222); x.fillStyle = brass(-56, 56); x.beginPath(); x.ellipse(0, 0, 56, 14, 0, 0, TAU); x.fill(); x.fillRect(-56, -8, 112, 8); x.beginPath(); x.ellipse(0, -8, 56, 14, 0, 0, TAU); x.fillStyle = brass(-56, 56); x.fill();
  for (let i = 0; i < 12; i++) { const a = 0.15 + (Math.PI - 0.3) * i / 11; x.fillStyle = '#2a1e0c'; x.beginPath(); x.arc(Math.cos(a) * 52, -2 + Math.sin(a) * 12, 2.4, 0, TAU); x.fill(); x.fillStyle = BRS.lite; x.beginPath(); x.arc(Math.cos(a) * 52 - 0.6, -2.6 + Math.sin(a) * 12, 1.2, 0, TAU); x.fill(); }
  x.restore();
  x.save(); x.beginPath(); x.arc(X(404), 160, 64, 0, TAU); x.fillStyle = steel(X(340), X(468)); x.fill(); x.clip();
  g = x.createRadialGradient(X(380), 128, 4, X(388), 140, 70); g.addColorStop(0, 'rgba(214,214,200,0.45)'); g.addColorStop(1, 'rgba(214,214,200,0)'); x.fillStyle = g; x.fillRect(X(330), 90, 150, 140);
  x.beginPath(); x.arc(X(404), 160, 64, 0, TAU); x.strokeStyle = 'rgba(6,6,4,0.6)'; x.lineWidth = 14; x.filter = 'blur(5px)'; x.stroke(); x.filter = 'none'; x.restore();
  // the window: a thick brass ring, dark glass with the studio in it
  x.save(); x.translate(X(384), 168); x.fillStyle = 'rgba(8,6,2,0.5)'; x.beginPath(); x.ellipse(2, 3, 38, 42, 0, 0, TAU); x.fill();
  x.fillStyle = lin(-34, -38, 34, 38, [[0, BRS.lite], [0.45, BRS.mid], [1, BRS.dark]]); x.beginPath(); x.ellipse(0, 0, 36, 40, 0, 0, TAU); x.fill();
  x.fillStyle = lin(-28, -32, 28, 32, [[0, '#2e3a3c'], [0.5, '#0c1214'], [1, '#040606']]); x.beginPath(); x.ellipse(1, 1, 27, 31, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(214,220,210,0.24)'; x.beginPath(); x.ellipse(-9, -12, 10, 6, -0.6, 0, TAU); x.fill();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; x.fillStyle = '#2a1e0c'; x.beginPath(); x.arc(Math.cos(a) * 32, Math.sin(a) * 36, 2.2, 0, TAU); x.fill(); }
  x.restore();
  x.save(); x.globalCompositeOperation = 'source-atop'; grain(X(280), 90, 260, 740, 6000, 0.07); x.restore();
}

// the figure's box on the page, per drawing (helmet or hood at the top, feet at the bottom)
const FIG = { wet: { draw: (o) => wetsuit(o), box: [270, 166, 522, 808] }, iron: { draw: (o) => ironLung(o), box: [278, 92, 522, 836] } };
const pageCache = new Map();
function page(kind) {
  if (pageCache.has(kind)) return pageCache.get(kind);
  const c = document.createElement('canvas'); c.width = 800; c.height = 900;
  const prev = x; x = c.getContext('2d'); C = c; seed = 7; FIG[kind].draw(0); x = prev;
  pageCache.set(kind, c); return c;
}
export function suit3qKind(def) { const id = def && def.id; return id === 'wet' ? 'wet' : id === 'dv_iron' ? 'iron' : null; }
// draws the suit across a w x h picture; false if this suit has no turned photograph yet
export function drawSuit3q(ctx, w, h, def) {
  const kind = suit3qKind(def); if (!kind) return false;
  const pg = page(kind), [x0, y0, x1, y1] = FIG[kind].box, fw = x1 - x0, fh = y1 - y0;
  // turned on its side: the figure's height runs across the picture; fit it with a margin
  const k = Math.min((w * 0.86) / fh, (h * 0.84) / fw);
  const draw = (c2, sh) => { c2.save(); c2.translate(w / 2 + (sh ? sh[0] : 0), h / 2 + (sh ? sh[1] : 0)); c2.rotate(-Math.PI / 2); c2.scale(-k, k); /* (5.11.5) mirrored first, so once turned the light falls from the top */ c2.drawImage(pg, x0, y0, fw, fh, -fw / 2, -fh / 2, fw, fh); c2.restore(); };
  // the faint shadow round its outline: the figure itself, darkened and softened, a touch below
  const sc = document.createElement('canvas'); sc.width = Math.ceil(w); sc.height = Math.ceil(h); const sx = sc.getContext('2d');
  draw(sx); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(20,24,28,1)'; sx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = 0.22; ctx.filter = `blur(${Math.max(1, h * 0.018).toFixed(1)}px)`; ctx.drawImage(sc, Math.max(0.5, h * 0.004), Math.max(1, h * 0.012)); ctx.restore();
  draw(ctx);
  return true;
}
