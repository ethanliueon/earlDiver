// (7.0.2) The in-game loading gauge, painted once on canvases (no CSS gradients): an old diver's depth gauge. A weathered
// bronze bezel, knurled, four screws, verdigris in its seams; an aged bone face, darker and grimier toward the rim, with
// painted ticks and figures 0 to 1,000 m over a 270-degree sweep and a faded rust band at the deep end; METRES small
// under the hub; glass with one soft reflection and a fine scratch. The needle (blued steel, a rust tip, a bronze cap) is
// its own canvas, turned by CSS to the real loading progress.
const TAU = Math.PI * 2, A0 = Math.PI * 0.75, SWEEP = Math.PI * 1.5;
let sd = 7; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);

export function gaugeFace(px) {
  const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'), R = px / 2;
  x.translate(R, R); sd = 7;
  // the shadow it casts
  x.fillStyle = 'rgba(0,0,0,0.5)'; x.beginPath(); x.arc(R * 0.02, R * 0.05, R * 0.97, 0, TAU); x.fill();
  // the bezel: dark weathered bronze, lit from the upper left
  const bz = x.createLinearGradient(-R, -R, R, R); bz.addColorStop(0, '#9a7c4a'); bz.addColorStop(0.45, '#6e5530'); bz.addColorStop(1, '#2e2414');
  x.fillStyle = bz; x.beginPath(); x.arc(0, 0, R * 0.95, 0, TAU); x.fill();
  // knurling round its outer edge
  x.lineWidth = Math.max(1, R * 0.012); for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU, li = Math.cos(a + 2.4) * 0.5 + 0.5; x.strokeStyle = `rgba(${li > 0.5 ? '230,206,150' : '20,14,6'},${0.12 + 0.25 * Math.abs(li - 0.5)})`; x.beginPath(); x.moveTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88); x.lineTo(Math.cos(a) * R * 0.945, Math.sin(a) * R * 0.945); x.stroke(); }
  // wear and verdigris on the bronze
  for (let i = 0; i < 70; i++) { const a = r() * TAU, d = R * (0.8 + r() * 0.13); x.fillStyle = r() < 0.4 ? `rgba(70,110,90,${0.12 + r() * 0.2})` : `rgba(${r() < 0.5 ? '230,210,160' : '20,14,6'},${0.06 + r() * 0.12})`; x.beginPath(); x.ellipse(Math.cos(a) * d, Math.sin(a) * d, R * (0.01 + r() * 0.03), R * (0.006 + r() * 0.015), a, 0, TAU); x.fill(); }
  // the inner lip, in shadow at the top (the face sits sunk in it)
  const lip = x.createLinearGradient(0, -R * 0.8, 0, R * 0.8); lip.addColorStop(0, '#1e170c'); lip.addColorStop(1, '#5a4626');
  x.fillStyle = lip; x.beginPath(); x.arc(0, 0, R * 0.8, 0, TAU); x.fill();
  // four screws
  for (const a of [0.78, 2.36, 3.93, 5.5]) { const sx = Math.cos(a) * R * 0.875, sy = Math.sin(a) * R * 0.875, sr = R * 0.04; x.fillStyle = '#3a2c16'; x.beginPath(); x.arc(sx, sy, sr * 1.15, 0, TAU); x.fill(); const sg = x.createLinearGradient(sx - sr, sy - sr, sx + sr, sy + sr); sg.addColorStop(0, '#b8995e'); sg.addColorStop(1, '#4a3818'); x.fillStyle = sg; x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill(); x.strokeStyle = 'rgba(20,14,6,0.8)'; x.lineWidth = Math.max(1, sr * 0.3); x.beginPath(); x.moveTo(sx - sr * 0.7 * Math.cos(a + 0.5), sy - sr * 0.7 * Math.sin(a + 0.5)); x.lineTo(sx + sr * 0.7 * Math.cos(a + 0.5), sy + sr * 0.7 * Math.sin(a + 0.5)); x.stroke(); }
  // the face: aged bone, yellowed and grimier toward the rim
  const fr = R * 0.74, fg = x.createRadialGradient(-fr * 0.2, -fr * 0.25, fr * 0.1, 0, 0, fr); fg.addColorStop(0, '#e4dcc2'); fg.addColorStop(0.7, '#cfc4a2'); fg.addColorStop(1, '#9a8c68');
  x.fillStyle = fg; x.beginPath(); x.arc(0, 0, fr, 0, TAU); x.fill();
  x.save(); x.beginPath(); x.arc(0, 0, fr, 0, TAU); x.clip();
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(${r() < 0.7 ? '90,74,40' : '255,250,235'},${0.03 + r() * 0.06})`; x.beginPath(); x.arc((r() - 0.5) * fr * 2, (r() - 0.5) * fr * 2, R * (0.004 + r() * 0.02), 0, TAU); x.fill(); } // foxing
  const ring = x.createRadialGradient(0, 0, fr * 0.7, 0, 0, fr); ring.addColorStop(0, 'rgba(60,44,20,0)'); ring.addColorStop(1, 'rgba(60,44,20,0.35)'); x.fillStyle = ring; x.fillRect(-fr, -fr, fr * 2, fr * 2);
  x.restore();
  // the danger band at the deep end: a faded rust arc
  x.strokeStyle = 'rgba(150,52,34,0.55)'; x.lineWidth = fr * 0.07; x.beginPath(); x.arc(0, 0, fr * 0.84, A0 + SWEEP * 0.8, A0 + SWEEP); x.stroke();
  // the ticks: every 20 m small, every 100 m longer, every 200 m with its figure
  for (let i = 0; i <= 50; i++) { const a = A0 + SWEEP * (i / 50), big = i % 5 === 0, lg = i % 10 === 0, r0 = fr * (lg ? 0.74 : big ? 0.77 : 0.8), r1 = fr * 0.88;
    x.strokeStyle = 'rgba(34,28,18,0.85)'; x.lineWidth = Math.max(0.8, fr * (lg ? 0.022 : big ? 0.016 : 0.009)); x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); x.stroke();
    if (lg) { const n = i * 20; x.font = `600 ${Math.round(fr * (n >= 1000 ? 0.12 : 0.14))}px "Barlow Semi Condensed", sans-serif`; x.fillStyle = 'rgba(34,28,18,0.88)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n ? String(n) : '0', Math.cos(a) * fr * 0.57, Math.sin(a) * fr * 0.57); } }
  x.font = `600 ${Math.round(fr * 0.1)}px "Barlow Semi Condensed", sans-serif`; x.fillStyle = 'rgba(52,42,24,0.75)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.save(); x.translate(0, fr * 0.42); x.fillText('M E T R E S', 0, 0); x.restore();
  // the face's edge, sunk in the bezel
  x.strokeStyle = 'rgba(20,14,6,0.7)'; x.lineWidth = fr * 0.03; x.beginPath(); x.arc(0, 0, fr, 0, TAU); x.stroke();
  return c;
}
export function gaugeNeedle(px) { // drawn pointing straight up from the centre of a px square
  const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'), R = px / 2, L = R * 0.62;
  x.translate(R, R);
  x.save(); x.translate(R * 0.02, R * 0.03); x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.moveTo(-R * 0.025, R * 0.12); x.lineTo(0, -L); x.lineTo(R * 0.025, R * 0.12); x.closePath(); x.fill(); x.restore(); // its shadow on the face
  const ng = x.createLinearGradient(-R * 0.03, 0, R * 0.03, 0); ng.addColorStop(0, '#3a4048'); ng.addColorStop(0.5, '#1a1e24'); ng.addColorStop(1, '#0c0e10');
  x.fillStyle = ng; x.beginPath(); x.moveTo(-R * 0.03, R * 0.14); x.lineTo(-R * 0.012, -L * 0.75); x.lineTo(0, -L); x.lineTo(R * 0.012, -L * 0.75); x.lineTo(R * 0.03, R * 0.14); x.closePath(); x.fill();
  x.fillStyle = '#8a3424'; x.beginPath(); x.moveTo(-R * 0.012, -L * 0.75); x.lineTo(0, -L); x.lineTo(R * 0.012, -L * 0.75); x.closePath(); x.fill(); // the rust tip
  const hg = x.createRadialGradient(-R * 0.02, -R * 0.02, 0, 0, 0, R * 0.07); hg.addColorStop(0, '#c8a868'); hg.addColorStop(1, '#4a3818'); x.fillStyle = hg; x.beginPath(); x.arc(0, 0, R * 0.065, 0, TAU); x.fill(); // the bronze cap
  return c;
}
export function gaugeGlass(px) { // the glass over it all: one soft reflection and a fine scratch
  const c = document.createElement('canvas'); c.width = c.height = px; const x = c.getContext('2d'), R = px / 2, fr = R * 0.74;
  x.translate(R, R);
  const gl = x.createLinearGradient(-fr, -fr, fr * 0.2, fr * 0.2); gl.addColorStop(0, 'rgba(255,252,240,0.2)'); gl.addColorStop(0.5, 'rgba(255,252,240,0.04)'); gl.addColorStop(1, 'rgba(255,252,240,0)');
  x.fillStyle = gl; x.beginPath(); x.arc(0, 0, fr, Math.PI * 0.95, Math.PI * 1.75); x.quadraticCurveTo(-fr * 0.1, -fr * 0.1, Math.cos(Math.PI * 0.95) * fr, Math.sin(Math.PI * 0.95) * fr); x.fill();
  x.strokeStyle = 'rgba(255,252,240,0.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(fr * 0.2, fr * 0.3); x.lineTo(fr * 0.5, fr * 0.12); x.stroke();
  return c;
}
