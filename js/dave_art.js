// (7.0.8) Dave's dialogue as one painted piece: an olive steel plate with a porthole cut in its left end, a brass ring
// round it, and Dave inside, lit by his own lamp, framed by the porthole (never cut by a straight line). Painted once.
// Dave is built as one figure in soft form shading, lit from the front and above: a knit beanie wrapping the skull with
// a ribbed cuff, a real profile (brow, a heavy nose, a deep-set eye with its lids and lines), an ear behind the
// cheekbone, a grey beard grown from the cheek and jaw in strands, a neck turning into the shoulders under the jaw's
// shadow, a roll-neck collar wrapping the neck, an oilskin over the shoulders with seams and a lapel.
const TAU = Math.PI * 2;
const lin = (x, x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
const rad = (x, x0, y0, r0, x1, y1, r1, st) => { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); st.forEach(([o, c]) => g.addColorStop(o, c)); return g; };

// Dave, in a square of side S, facing right
function drawDave(x, S, room = true) {
  const k = S / 400; x.save(); x.scale(k, k);
  let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  // behind him: the inside of his habitat, a warm lamp up to the right, dark round the edges
  if (room) { x.fillStyle = rad(x, 300, 90, 10, 220, 200, 330, [[0, '#7a5a34'], [0.35, '#3e2e1c'], [1, '#0e0c08']]); x.fillRect(0, 0, 400, 400);
  x.fillStyle = 'rgba(20,16,10,0.6)'; x.fillRect(30, 40, 10, 360); x.fillRect(0, 150, 400, 8); } // a pipe and a shelf edge in the dark
  // the oilskin: shoulders filling the bottom, the far shoulder lower and darker, the near one rounding toward us
  const coat = new Path2D(); coat.moveTo(-20, 420); coat.lineTo(-20, 330); coat.bezierCurveTo(40, 290, 100, 272, 150, 268); coat.lineTo(262, 266); coat.bezierCurveTo(330, 276, 380, 320, 400, 380); coat.lineTo(420, 420); coat.closePath();
  x.fillStyle = lin(x, 0, 270, 0, 400, [[0, '#8a5232'], [0.5, '#6a3c22'], [1, '#2e1a0e']]); x.fill(coat);
  x.save(); x.clip(coat);
  x.fillStyle = lin(x, 0, 0, 400, 0, [[0, 'rgba(10,6,2,0.55)'], [0.45, 'rgba(10,6,2,0)'], [0.8, 'rgba(255,210,160,0.12)'], [1, 'rgba(10,6,2,0.2)']]); x.fillRect(0, 260, 400, 160); // turned: the far side in shadow
  x.strokeStyle = 'rgba(20,10,4,0.55)'; x.lineWidth = 3; for (const [a, b, c, d] of [[60, 300, 70, 400], [110, 282, 128, 400], [330, 300, 352, 400]]) { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c) / 2 + 8, (b + d) / 2, c, d); x.stroke(); } // folds
  x.strokeStyle = 'rgba(30,16,8,0.6)'; x.lineWidth = 2; x.setLineDash([6, 5]); x.beginPath(); x.moveTo(292, 274); x.bezierCurveTo(330, 292, 356, 330, 366, 400); x.stroke(); x.setLineDash([]); // the shoulder seam, stitched
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '255,220,180' : '0,0,0'},${0.03 + r() * 0.05})`; x.fillRect(r() * 400, 266 + r() * 140, 1 + r() * 8, 1 + r() * 2); } // worn
  x.restore();
  // the open front and its lapel, lit along the fold; the sweater beneath
  x.fillStyle = lin(x, 200, 290, 260, 400, [[0, '#5c5e4c'], [1, '#2e3026']]); x.beginPath(); x.moveTo(196, 290); x.bezierCurveTo(226, 300, 252, 340, 262, 400); x.lineTo(214, 400); x.bezierCurveTo(212, 350, 204, 316, 196, 290); x.fill();
  x.fillStyle = '#4e2c18'; x.beginPath(); x.moveTo(262, 290); x.bezierCurveTo(284, 318, 292, 360, 294, 400); x.lineTo(270, 400); x.bezierCurveTo(266, 356, 258, 320, 246, 296); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(255,214,170,0.35)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(262, 292); x.bezierCurveTo(284, 320, 292, 360, 294, 400); x.stroke();
  // the neck: from behind the ear and under the jaw down into the collar, in the jaw's shadow
  const neck = new Path2D(); neck.moveTo(150, 196); neck.bezierCurveTo(146, 230, 140, 254, 134, 270); neck.lineTo(250, 270); neck.bezierCurveTo(240, 250, 236, 236, 238, 214); neck.closePath();
  x.fillStyle = lin(x, 140, 0, 250, 0, [[0, '#5e3e2a'], [0.6, '#9a6c50'], [1, '#86593e']]); x.fill(neck);
  x.fillStyle = lin(x, 0, 200, 0, 250, [[0, 'rgba(30,16,8,0.55)'], [1, 'rgba(30,16,8,0)']]); x.fill(neck);
  x.strokeStyle = 'rgba(60,34,20,0.4)'; x.lineWidth = 3; x.beginPath(); x.moveTo(172, 206); x.quadraticCurveTo(196, 236, 226, 262); x.stroke(); // the muscle from behind the ear to the throat
  // the roll-neck collar: a thick knit band wrapping the neck, its top a curve seen a little from above, ribs following it
  const col = new Path2D(); col.moveTo(124, 262); col.bezierCurveTo(140, 240, 230, 236, 258, 256); col.bezierCurveTo(268, 272, 266, 296, 258, 306); col.bezierCurveTo(220, 318, 160, 316, 124, 300); col.bezierCurveTo(116, 288, 116, 274, 124, 262); col.closePath();
  x.fillStyle = lin(x, 0, 240, 0, 316, [[0, '#82846c'], [0.45, '#62644f'], [1, '#34362a']]); x.fill(col);
  x.fillStyle = 'rgba(16,16,10,0.55)'; x.beginPath(); x.ellipse(192, 254, 62, 11, -0.04, 0, TAU); x.fill(); // the dark of the collar's inside, round the neck
  x.save(); x.clip(col); x.strokeStyle = 'rgba(24,24,16,0.45)'; x.lineWidth = 3;
  for (let i = 0; i < 22; i++) { const u = i / 21, sx = 124 + u * 140; x.beginPath(); x.moveTo(sx, 250 + Math.sin(u * Math.PI) * -8); x.quadraticCurveTo(sx + 2, 282, sx - 1 + (u - 0.5) * 8, 318); x.stroke(); } // ribbing
  x.fillStyle = lin(x, 120, 0, 270, 0, [[0, 'rgba(10,8,4,0.5)'], [0.4, 'rgba(10,8,4,0)'], [0.75, 'rgba(255,240,210,0.12)'], [1, 'rgba(10,8,4,0.25)']]); x.fillRect(110, 230, 170, 100); x.restore();
  // the head: the skull's back, the face in profile (forehead, brow, a heavy nose, upper lip under the moustache)
  const head = new Path2D(); head.moveTo(150, 196); head.bezierCurveTo(112, 176, 104, 120, 128, 84); head.bezierCurveTo(152, 50, 216, 44, 248, 72);
  head.bezierCurveTo(258, 84, 262, 98, 262, 108); head.bezierCurveTo(266, 114, 270, 120, 268, 126); head.bezierCurveTo(274, 138, 286, 150, 288, 160); head.bezierCurveTo(290, 168, 282, 172, 272, 170);
  head.bezierCurveTo(270, 178, 268, 184, 266, 190); head.bezierCurveTo(262, 206, 250, 220, 236, 222); head.bezierCurveTo(206, 226, 172, 214, 150, 196); head.closePath();
  x.fillStyle = lin(x, 110, 0, 290, 0, [[0, '#6a442e'], [0.45, '#a4765a'], [0.8, '#c08e6e'], [1, '#b07e5e']]); x.fill(head);
  x.save(); x.clip(head);
  x.fillStyle = rad(x, 232, 128, 4, 232, 128, 44, [[0, 'rgba(255,222,190,0.28)'], [1, 'rgba(255,222,190,0)']]); x.fillRect(180, 80, 110, 100); // the cheekbone catching the light
  x.fillStyle = rad(x, 280, 156, 2, 280, 156, 16, [[0, 'rgba(200,110,90,0.35)'], [1, 'rgba(200,110,90,0)']]); x.fillRect(260, 136, 40, 40); // the nose's weathered red
  x.fillStyle = lin(x, 0, 96, 0, 120, [[0, 'rgba(40,20,10,0.4)'], [1, 'rgba(40,20,10,0)']]); x.fillRect(200, 96, 70, 24); // the shadow under the brow
  x.restore();
  x.strokeStyle = 'rgba(70,40,24,0.55)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(268, 126); x.bezierCurveTo(272, 132, 268, 140, 262, 142); x.stroke(); // the nose's wing
  x.strokeStyle = 'rgba(70,40,24,0.4)'; x.lineWidth = 2; for (const yy of [76, 84]) { x.beginPath(); x.moveTo(236, yy); x.quadraticCurveTo(246, yy - 3, 254, yy + 2); x.stroke(); } // lines on the forehead
  // the eye, deep-set: the socket's shade, the lids, the iris with its catchlight, lines fanning from the corner
  x.fillStyle = 'rgba(50,26,14,0.45)'; x.beginPath(); x.ellipse(244, 118, 14, 9, 0.1, 0, TAU); x.fill();
  x.fillStyle = '#cfc4ae'; x.beginPath(); x.moveTo(236, 118); x.quadraticCurveTo(246, 111, 254, 117); x.quadraticCurveTo(246, 123, 236, 118); x.fill();
  x.fillStyle = '#2e3436'; x.beginPath(); x.arc(248, 117, 3.4, 0, TAU); x.fill(); x.fillStyle = '#0a0a0a'; x.beginPath(); x.arc(249, 117, 2.2, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(250, 115.6, 1.1, 0, TAU); x.fill();
  x.strokeStyle = '#3a2214'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(234, 116); x.quadraticCurveTo(246, 108, 256, 115); x.stroke(); // the upper lid, heavy
  x.strokeStyle = 'rgba(70,40,24,0.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(238, 122); x.quadraticCurveTo(246, 126, 254, 121); x.stroke();
  for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(232, 116 + i * 4); x.lineTo(222, 112 + i * 7); x.stroke(); } // crow's feet
  x.strokeStyle = '#4e3a2a'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(232, 104); x.quadraticCurveTo(248, 98, 262, 104); x.stroke(); // the brow, grizzled
  // the beard: grown from the cheek and the jaw, full under the chin, grey in strands, darker underneath; the moustache over the lip
  const beard = new Path2D(); beard.moveTo(192, 124); beard.bezierCurveTo(198, 140, 212, 156, 234, 160); beard.bezierCurveTo(250, 164, 266, 164, 276, 172); beard.bezierCurveTo(278, 196, 266, 232, 244, 248);
  beard.bezierCurveTo(222, 258, 190, 250, 176, 230); beard.bezierCurveTo(176, 200, 184, 150, 192, 124); beard.closePath();
  x.save(); x.filter = 'blur(3px)'; x.fillStyle = lin(x, 0, 150, 0, 255, [[0, 'rgba(96,92,84,0.7)'], [0.5, 'rgba(82,78,72,0.85)'], [1, '#34322e']]); x.fill(beard); x.restore();
  x.lineCap = 'round';
  const M = x.getTransform(), inB = (px, py) => x.isPointInPath(beard, M.a * px + M.c * py + M.e, M.b * px + M.d * py + M.f); // (the test is in the canvas's own pixels)
  for (let i = 0; i < 700; i++) { let bx, by, tries = 0; do { bx = 164 + r() * 122; by = 120 + r() * 140; tries++; } while (!inB(bx, by) && tries < 30); if (!inB(bx, by)) continue;
    const len = 6 + r() * 13, a = 1.3 + (bx - 220) * 0.005 + (r() - 0.5) * 0.5, li = r();
    x.strokeStyle = li < 0.45 ? `rgba(214,208,196,${0.25 + r() * 0.35})` : li < 0.8 ? `rgba(126,122,114,${0.3 + r() * 0.3})` : `rgba(32,30,26,${0.3 + r() * 0.3})`; x.lineWidth = 0.7 + r() * 1.1;
    x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + Math.cos(a) * len * 0.5 + 2, by + Math.sin(a) * len * 0.5, bx + Math.cos(a) * len, by + Math.sin(a) * len); x.stroke(); }
  x.save(); x.clip(beard); x.fillStyle = lin(x, 160, 0, 290, 0, [[0, 'rgba(10,8,6,0.4)'], [0.5, 'rgba(10,8,6,0)'], [0.85, 'rgba(255,240,220,0.1)']]); x.fillRect(160, 140, 130, 120); x.restore();
  x.fillStyle = '#6e6a62'; x.beginPath(); x.moveTo(250, 168); x.bezierCurveTo(262, 162, 278, 164, 284, 174); x.bezierCurveTo(276, 180, 258, 180, 250, 176); x.fill(); // the moustache
  x.strokeStyle = 'rgba(210,204,192,0.55)'; x.lineWidth = 1.2; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(254 + i * 3, 168); x.lineTo(256 + i * 3.2, 177); x.stroke(); }
  // the ear, behind the cheekbone: its rim, the fold within, shaded on its far side
  x.fillStyle = 'rgba(40,20,10,0.5)'; x.beginPath(); x.ellipse(176, 144, 16, 26, -0.1, 0, TAU); x.fill(); x.fillStyle = lin(x, 158, 0, 190, 0, [[0, '#7a4c32'], [1, '#b07c5c']]); x.beginPath(); x.moveTo(176, 118); x.bezierCurveTo(156, 114, 154, 152, 164, 166); x.bezierCurveTo(170, 174, 182, 170, 184, 162); x.bezierCurveTo(188, 146, 190, 124, 176, 118); x.fill();
  x.strokeStyle = 'rgba(60,32,18,0.7)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(178, 126); x.bezierCurveTo(166, 126, 166, 150, 172, 158); x.stroke(); x.beginPath(); x.moveTo(180, 138); x.quadraticCurveTo(174, 144, 178, 152); x.stroke();
  // the beanie: knit wool wrapping the skull from the brow back, a folded cuff ribbed across, lit on top
  const cap = new Path2D(); cap.moveTo(122, 128); cap.bezierCurveTo(108, 70, 150, 36, 202, 36); cap.bezierCurveTo(240, 36, 262, 60, 266, 98); cap.bezierCurveTo(230, 92, 170, 100, 122, 128); cap.closePath();
  x.fillStyle = lin(x, 0, 36, 0, 128, [[0, '#5e5c46'], [0.6, '#46442f'], [1, '#2c2b1e']]); x.fill(cap);
  x.save(); x.clip(cap); x.strokeStyle = 'rgba(20,20,12,0.4)'; x.lineWidth = 2;
  for (let i = 0; i < 16; i++) { const u = i / 15; x.beginPath(); x.moveTo(120 + u * 150, 130 - Math.sin(u * Math.PI) * 30); x.quadraticCurveTo(150 + u * 100, 40, 200, 34); x.stroke(); } // the knit's ribs, gathering to the crown
  x.fillStyle = rad(x, 200, 50, 4, 200, 60, 70, [[0, 'rgba(240,236,200,0.18)'], [1, 'rgba(240,236,200,0)']]); x.fillRect(120, 30, 160, 90); x.restore();
  const cuff = new Path2D(); cuff.moveTo(118, 132); cuff.bezierCurveTo(170, 98, 232, 88, 268, 96); cuff.lineTo(268, 114); cuff.bezierCurveTo(232, 106, 172, 116, 124, 150); cuff.closePath();
  x.fillStyle = lin(x, 0, 92, 0, 150, [[0, '#615f48'], [1, '#383628']]); x.fill(cuff);
  x.save(); x.clip(cuff); x.strokeStyle = 'rgba(18,18,10,0.5)'; x.lineWidth = 2.4; for (let i = 0; i < 26; i++) { const u = i / 25, cx = 118 + u * 150, cy = 132 - u * 36 + Math.sin(u * Math.PI) * -6; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 3, cy + 18); x.stroke(); } x.restore();
  x.strokeStyle = 'rgba(14,14,8,0.6)'; x.lineWidth = 2; x.stroke(cuff);
  // a soft rim of cool light from the water behind his back
  x.restore();
}

// (7.0.9) the whole card, W x H: Dave stands at the left, leaning in behind the box, his head and shoulders above its top
// edge (the box cuts him where it stands in front of him, as a real box would), all one picture
export function daveTalkPlate(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let sd = 9; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const top = H * 0.56, plate = new Path2D(); plate.roundRect(6, top, W - 12, H - top - 10, H * 0.03);
  // Dave first, behind the box: a soft shadow round him so he sits on the water, then the figure
  const DS = H * 0.86, DX = H * 0.04, DY = -H * 0.06; x.save(); x.beginPath(); x.rect(0, 0, W, H - 12); x.clip(); /* nothing of him below the box */
  x.save(); x.filter = `blur(${(H * 0.03).toFixed(1)}px)`; x.globalAlpha = 0.5; x.translate(DX + 6, DY + 8); x.globalCompositeOperation = 'source-over'; drawDave(x, DS, false); x.restore();
  { const t = document.createElement('canvas'); t.width = W; t.height = H; const tx = t.getContext('2d'); tx.translate(DX + 6, DY + 8); drawDave(tx, DS, false); tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = 'rgba(0,0,0,0.45)'; tx.fillRect(0, 0, W, H); x.save(); x.filter = `blur(${(H * 0.025).toFixed(1)}px)`; x.drawImage(t, 0, 0); x.restore(); x.clearRect(0, 0, 0, 0); }
  x.save(); x.translate(DX, DY); drawDave(x, DS, false); x.restore(); x.restore();
  // the box in front of him
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.save(); x.translate(4, 10); x.fill(plate); x.restore();
  x.fillStyle = lin(x, 0, top, 0, H, [[0, '#6e7656'], [0.5, '#555c42'], [1, '#33382a']]); x.fill(plate);
  x.save(); x.clip(plate);
  for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '20,22,16' : '210,214,180'},${0.025 + r() * 0.06})`; x.fillRect(r() * W, top + r() * (H - top), 2 + r() * 50, 1 + r() * 2); }
  for (let i = 0; i < 14; i++) { const sx = r() * W, g = x.createLinearGradient(0, top, 0, H); g.addColorStop(0, 'rgba(120,58,26,0.4)'); g.addColorStop(1, 'rgba(120,58,26,0)'); x.fillStyle = g; x.fillRect(sx, top + r() * 20, 3 + r() * 5, (H - top) * (0.4 + r() * 0.4)); }
  x.restore();
  x.strokeStyle = 'rgba(12,14,8,0.85)'; x.lineWidth = 5; x.stroke(plate);
  x.strokeStyle = 'rgba(230,234,200,0.22)'; x.lineWidth = 2; x.beginPath(); x.moveTo(H * 0.14, top + 3); x.lineTo(W - H * 0.08, top + 3); x.stroke();
  for (const rx of [24, W - 24, W * 0.55]) for (const ry of [top + H * 0.07, H - H * 0.1]) { const g = x.createRadialGradient(rx - 2, ry - 2, 1, rx, ry, 9); g.addColorStop(0, '#c4c8a8'); g.addColorStop(1, '#262a1e'); x.fillStyle = g; x.beginPath(); x.arc(rx, ry, 8, 0, TAU); x.fill(); }
  return { url: c.toDataURL(), textLeft: (DX + DS * 0.78) / W, top: top / H };
}
