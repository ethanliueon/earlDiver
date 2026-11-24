// (6.1.2) The chests, painted: each a solid box seen from the front and a little above and to the right, its lid
// hinged at the back edge and swinging up (lid 0 shut .. 1 open). Every face is drawn flat in its own frame (u across,
// v down, in box units) and laid onto the box by an affine map, so grain, slats, rivets, rust and labels sit on the
// faces as they would on the real thing. Detail rises with the price: a pine crate of the back room, the station's
// aluminium case, Dave's tea chest, a riveted strongbox, a bosun's painted footlocker, and the expedition trunk of
// leather, oak and brass with its crest scratched off. Nothing glows; the light from inside is the only colour.
import { TAU } from './util.js';

const KX = 0.46, KY = 0.3; // a step back in depth goes this far right and up (of the box's own unit)
const SIZE = { // width, body height, depth, lid height (box units; width is 1)
  crate: [1, 0.56, 0.5, 0.1], case: [1, 0.5, 0.42, 0.14], tea: [0.86, 0.66, 0.6, 0.06],
  strongbox: [0.96, 0.5, 0.48, 0.13], footlocker: [1, 0.5, 0.5, 0.16], trunk: [1, 0.54, 0.52, 0.2],
  // (6.4.0) the large ones, the salvage trunk, and the three legendary chests
  crate_big: [1.25, 0.62, 0.56, 0.1], case_big: [1.22, 0.55, 0.46, 0.15], salvage: [1, 0.54, 0.52, 0.2],
  siren: [0.92, 0.42, 0.5, 0.22], leviathan: [1.2, 0.6, 0.58, 0.18], poseidon: [1.05, 0.56, 0.56, 0.24],
};
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

// ---------- small painted things, all in a face's own units ----------
function grain(x, fw, fh, col, n, wav, r) { // fine wood grain running along u
  x.strokeStyle = col; x.lineWidth = 0.0035;
  for (let i = 0; i < n; i++) { const y0 = r() * fh, ph = r() * 9, a = (0.002 + r() * 0.006) * wav; x.beginPath(); for (let u = 0; u <= fw + 0.01; u += fw / 24) { const y = y0 + Math.sin(u * 14 + ph) * a + Math.sin(u * 41 + ph * 2) * a * 0.4; u ? x.lineTo(u, y) : x.moveTo(u, y); } x.stroke(); }
}
function knot(x, u, v, s, dark) { x.save(); x.translate(u, v); x.scale(1.8, 1); for (let k = 3; k >= 1; k--) { x.strokeStyle = dark; x.globalAlpha = 0.35 + 0.15 * k; x.lineWidth = 0.003; x.beginPath(); x.arc(0, 0, s * k / 3, 0, TAU); x.stroke(); } x.fillStyle = dark; x.globalAlpha = 0.7; x.beginPath(); x.arc(0, 0, s * 0.3, 0, TAU); x.fill(); x.restore(); x.globalAlpha = 1; }
function nail(x, u, v, s = 0.009) { x.fillStyle = '#2a2420'; x.beginPath(); x.arc(u, v, s, 0, TAU); x.fill(); x.fillStyle = 'rgba(200,190,170,0.35)'; x.beginPath(); x.arc(u - s * 0.3, v - s * 0.3, s * 0.4, 0, TAU); x.fill(); x.fillStyle = 'rgba(110,60,30,0.25)'; x.beginPath(); x.ellipse(u, v + s * 2.2, s * 0.7, s * 2, 0, 0, TAU); x.fill(); } // with a rust tear under it
function rivet(x, u, v, s = 0.011, hi = 'rgba(230,226,214,0.45)') { x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.arc(u + s * 0.25, v + s * 0.3, s, 0, TAU); x.fill(); x.fillStyle = '#5e6262'; x.beginPath(); x.arc(u, v, s, 0, TAU); x.fill(); x.fillStyle = hi; x.beginPath(); x.arc(u - s * 0.35, v - s * 0.35, s * 0.42, 0, TAU); x.fill(); }
function scratches(x, fw, fh, n, r, light = 'rgba(240,232,210,0.22)', dark = 'rgba(0,0,0,0.25)') { x.lineWidth = 0.0025; for (let i = 0; i < n; i++) { const u = r() * fw, v = r() * fh, l = 0.02 + r() * 0.07, a = (r() - 0.5) * 1.2; x.strokeStyle = r() < 0.6 ? light : dark; x.beginPath(); x.moveTo(u, v); x.lineTo(u + Math.cos(a) * l, v + Math.sin(a) * l); x.stroke(); } }
function grime(x, fw, fh, a = 0.35) { const g = x.createLinearGradient(0, 0, 0, fh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.65, 'rgba(20,14,8,0)'); g.addColorStop(1, `rgba(20,14,8,${a})`); x.fillStyle = g; x.fillRect(0, 0, fw, fh); }
function edges(x, fw, fh, a = 0.35, w = 0.05) { // corners darkened and rubbed, as handled things are
  const side = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, `rgba(10,8,6,${a})`); g.addColorStop(1, 'rgba(10,8,6,0)'); x.fillStyle = g; x.fillRect(rx, ry, rw, rh); };
  side(0, 0, w, 0, 0, 0, w, fh); side(fw, 0, fw - w, 0, fw - w, 0, w, fh); side(0, 0, 0, w, 0, 0, fw, w); side(0, fh, 0, fh - w, 0, fh - w, fw, w);
}
function blotch(x, u, v, rw, rh, col, r, n = 7) { x.fillStyle = col; for (let i = 0; i < n; i++) { x.beginPath(); x.ellipse(u + (r() - 0.5) * rw, v + (r() - 0.5) * rh, rw * (0.15 + r() * 0.3), rh * (0.15 + r() * 0.3), r() * 3, 0, TAU); x.fill(); } }
function rustStreak(x, u, v, len, r) { const g = x.createLinearGradient(0, v, 0, v + len); g.addColorStop(0, 'rgba(120,64,28,0.55)'); g.addColorStop(1, 'rgba(120,64,28,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(u - 0.006, v); x.quadraticCurveTo(u + (r() - 0.5) * 0.01, v + len * 0.6, u, v + len); x.quadraticCurveTo(u + 0.004, v + len * 0.5, u + 0.006, v); x.fill(); }
function stencil(x, txt, u, v, size, col, r, rot = 0) { // stencilled, worn through in places
  x.save(); x.translate(u, v); x.rotate(rot); x.font = `700 ${size}px "Barlow Semi Condensed", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(txt, 0, 0);
  x.globalCompositeOperation = 'destination-out'; const w = x.measureText(txt).width; for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.4})`; x.beginPath(); x.arc((r() - 0.5) * w, (r() - 0.5) * size, size * (0.03 + r() * 0.07), 0, TAU); x.fill(); }
  x.restore();
}
function label(x, u, v, lw, lh, r, rot, lines) { // a paper label, yellowed, a corner torn
  x.save(); x.translate(u, v); x.rotate(rot); x.fillStyle = '#c9bc96'; x.beginPath(); x.moveTo(0, 0); x.lineTo(lw, 0); x.lineTo(lw, lh * 0.7); x.lineTo(lw * 0.82, lh); x.lineTo(0, lh); x.closePath(); x.fill();
  const g = x.createRadialGradient(lw / 2, lh / 2, 0, lw / 2, lh / 2, lw * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(90,60,20,0.35)'); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(60,44,24,0.55)'; x.lineWidth = 0.003; for (let i = 0; i < lines; i++) { x.beginPath(); x.moveTo(lw * 0.1, lh * (0.25 + i * 0.22)); x.lineTo(lw * (0.5 + r() * 0.4), lh * (0.25 + i * 0.22)); x.stroke(); }
  blotch(x, lw * 0.7, lh * 0.6, lw * 0.4, lh * 0.4, 'rgba(110,80,40,0.12)', r, 4); x.restore();
}

// ---------- each chest's faces ----------
// face: 'front' | 'side' | 'top' | 'lidF' | 'lidS' | 'under'; drawn in [0,fw] x [0,fh]
const PAINT = {
  crate(x, f, fw, fh, r) {
    const base = ['#b08c5a', '#a8834f', '#b9945f'];
    if (f === 'under') { x.fillStyle = '#7a5e3a'; x.fillRect(0, 0, fw, fh); grain(x, fw, fh, 'rgba(60,40,20,0.3)', 18, 1, r); return; }
    const slats = f === 'top' ? 3 : f === 'lidF' || f === 'lidS' ? 1 : 3, gap = 0.012;
    x.fillStyle = '#2a2014'; x.fillRect(0, 0, fw, fh); // between the slats: dark, straw in it
    for (let i = 0; i < slats; i++) {
      const y0 = (fh / slats) * i + (i ? gap / 2 : 0), y1 = (fh / slats) * (i + 1) - (i < slats - 1 ? gap / 2 : 0);
      x.fillStyle = base[(i + (f === 'side' ? 1 : 0)) % 3]; x.fillRect(0, y0, fw, y1 - y0);
      x.save(); x.beginPath(); x.rect(0, y0, fw, y1 - y0); x.clip(); grain(x, fw, fh, 'rgba(90,60,30,0.32)', 26, 1.4, r); if (r() < 0.7) knot(x, r() * fw, y0 + (y1 - y0) * (0.3 + r() * 0.4), 0.014, '#5a3e20');
      x.fillStyle = 'rgba(255,240,200,0.08)'; x.fillRect(0, y0, fw, 0.006); x.restore();
    }
    if (f === 'top') { x.strokeStyle = '#c8b070'; x.lineWidth = 0.004; for (let i = 0; i < 22; i++) { const v = (fh / 3) * (1 + (i % 2)) + (r() - 0.5) * 0.01, u = r() * fw, a = (r() - 0.5) * 1.6; x.beginPath(); x.moveTo(u, v); x.lineTo(u + Math.cos(a) * 0.04, v + Math.sin(a) * 0.03); x.stroke(); } } // straw poking through
    if (f === 'front' || f === 'side') { // the end battens, nailed
      const bw = 0.075; x.fillStyle = '#94724a'; for (const u of [0, fw - bw]) { x.fillRect(u, 0, bw, fh); x.strokeStyle = 'rgba(70,46,24,0.3)'; x.lineWidth = 0.003; for (let k = 0; k < 6; k++) { const uu = u + 0.008 + r() * (bw - 0.016); x.beginPath(); x.moveTo(uu, 0); x.bezierCurveTo(uu + 0.006, fh * 0.3, uu - 0.006, fh * 0.7, uu + 0.003, fh); x.stroke(); } x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(u + (u ? 0 : bw - 0.006), 0, 0.006, fh); x.fillStyle = '#94724a'; }
      for (const u of [bw / 2, fw - bw / 2]) for (let i = 0; i < 3; i++) nail(x, u, (fh / 3) * (i + 0.5));
      if (f === 'front') { stencil(x, 'B.M.S.', fw * 0.42, fh * 0.42, 0.075, 'rgba(40,30,20,0.6)', r); stencil(x, 'LOT 7', fw * 0.62, fh * 0.62, 0.05, 'rgba(40,30,20,0.5)', r, -0.03); }
    }
    edges(x, fw, fh, 0.3, 0.04); grime(x, fw, fh, 0.3); scratches(x, fw, fh, 14, r);
  },
  case(x, f, fw, fh, r) {
    if (f === 'under') { x.fillStyle = '#3a3e40'; x.fillRect(0, 0, fw, fh); x.fillStyle = '#2a2a28'; x.fillRect(0.03, 0.03, fw - 0.06, fh - 0.06); blotch(x, fw / 2, fh / 2, fw * 0.6, fh * 0.6, 'rgba(70,70,64,0.4)', r, 9); return; } // foam, gone hard and grey
    const g = x.createLinearGradient(0, 0, fw * 0.3, fh); g.addColorStop(0, '#b8bfc0'); g.addColorStop(1, '#8e9698'); x.fillStyle = g; x.fillRect(0, 0, fw, fh);
    if (f === 'front' || f === 'side' || f === 'top') { for (let i = 1; i < (f === 'top' ? 10 : 7); i++) { const v = f === 'top' ? null : (fh * i) / 7; if (v === null) { const u = (fw * i) / 10; x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(u, 0, 0.006, fh); x.fillStyle = 'rgba(0,0,0,0.14)'; x.fillRect(u + 0.006, 0, 0.005, fh); } else { x.fillStyle = 'rgba(255,255,255,0.2)'; x.fillRect(0.03, v, fw - 0.06, 0.005); x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(0.03, v + 0.005, fw - 0.06, 0.005); } } } // ribbing
    x.strokeStyle = '#5e6668'; x.lineWidth = 0.022; x.strokeRect(0.011, 0.011, fw - 0.022, fh - 0.022); x.strokeStyle = 'rgba(255,255,255,0.3)'; x.lineWidth = 0.004; x.strokeRect(0.024, 0.024, fw - 0.048, fh - 0.048); // the extruded rim
    for (let i = 0; i < 4; i++) { const u = 0.1 + r() * (fw - 0.2), v = 0.1 + r() * (fh - 0.2), s = 0.02 + r() * 0.03, dg = x.createRadialGradient(u - s * 0.3, v - s * 0.3, 0, u, v, s); dg.addColorStop(0, 'rgba(0,0,0,0.22)'); dg.addColorStop(0.7, 'rgba(255,255,255,0.08)'); dg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = dg; x.beginPath(); x.arc(u, v, s, 0, TAU); x.fill(); } // dents
    for (const u of [0.04, fw - 0.04]) for (const v of [0.04, fh - 0.04]) rivet(x, u, v, 0.009);
    if (f === 'front') {
      stencil(x, 'STN', fw * 0.5, fh * 0.32, 0.07, 'rgba(50,46,40,0.7)', r); stencil(x, 'STORES  04', fw * 0.5, fh * 0.62, 0.045, 'rgba(50,46,40,0.55)', r);
      for (const u of [fw * 0.2, fw * 0.8]) { x.fillStyle = '#4a4e50'; x.fillRect(u - 0.035, 0, 0.07, fh * 0.2); x.fillStyle = '#6e7476'; x.fillRect(u - 0.028, 0.004, 0.056, fh * 0.17); x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(u - 0.028, 0.004, 0.056, 0.006); rivet(x, u, fh * 0.14, 0.008); } // draw latches
    }
    if (f === 'side') { x.fillStyle = '#1e1e1c'; x.beginPath(); x.roundRect(fw * 0.3, fh * 0.3, fw * 0.4, 0.05, 0.02); x.fill(); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(fw * 0.32, fh * 0.3 + 0.008, fw * 0.36, 0.008); for (const u of [fw * 0.3, fw * 0.7]) { x.fillStyle = '#4a4e50'; x.fillRect(u - 0.02, fh * 0.26, 0.04, 0.1); rivet(x, u, fh * 0.31, 0.007); } } // the rubber grip
    if (f === 'top') label(x, fw * 0.3, fh * 0.25, fw * 0.36, fh * 0.42, r, -0.04, 3);
    scratches(x, fw, fh, 26, r, 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0.2)'); grime(x, fw, fh, 0.32); edges(x, fw, fh, 0.22, 0.03);
  },
  tea(x, f, fw, fh, r) {
    if (f === 'under') { x.fillStyle = '#6a4e30'; x.fillRect(0, 0, fw, fh); x.fillStyle = 'rgba(200,190,170,0.25)'; x.fillRect(0, 0, fw, fh); grain(x, fw, fh, 'rgba(40,28,14,0.25)', 14, 3, r); return; } // lined with foil gone dull
    x.fillStyle = '#9a7248'; x.fillRect(0, 0, fw, fh); grain(x, fw, fh, 'rgba(80,52,26,0.3)', 34, 3.5, r); // plywood: wide, wandering figure
    blotch(x, fw * 0.6, fh * 0.6, fw * 0.6, fh * 0.6, 'rgba(70,44,20,0.12)', r, 8); // water marks
    if (f === 'front') { stencil(x, 'FINEST', fw * 0.5, fh * 0.3, 0.06, 'rgba(50,30,16,0.55)', r); stencil(x, 'CEYLON', fw * 0.5, fh * 0.45, 0.1, 'rgba(50,30,16,0.6)', r); stencil(x, 'No. 2214', fw * 0.5, fh * 0.6, 0.045, 'rgba(50,30,16,0.45)', r); label(x, fw * 0.62, fh * 0.68, fw * 0.22, fh * 0.17, r, 0.08, 2); }
    if (f === 'side') { stencil(x, 'THIS SIDE UP', fw * 0.5, fh * 0.3, 0.04, 'rgba(50,30,16,0.5)', r); }
    // tin strips folded over every edge, tacked, dented
    const sw = 0.03; x.fillStyle = '#8a8a7e';
    for (const [rx, ry, rw, rh] of [[0, 0, fw, sw], [0, fh - sw, fw, sw], [0, 0, sw, fh], [fw - sw, 0, sw, fh]]) { x.fillRect(rx, ry, rw, rh); }
    x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(0, 0, fw, 0.005); x.fillRect(0, 0, 0.005, fh);
    for (let u = 0.05; u < fw - 0.03; u += 0.07) for (const v of [sw / 2, fh - sw / 2]) nail(x, u + (r() - 0.5) * 0.01, v, 0.005);
    for (let v = 0.06; v < fh - 0.03; v += 0.07) for (const u of [sw / 2, fw - sw / 2]) nail(x, u, v + (r() - 0.5) * 0.01, 0.005);
    blotch(x, sw, fh - sw, 0.06, 0.06, 'rgba(110,62,30,0.4)', r, 4); blotch(x, fw - sw, sw, 0.05, 0.05, 'rgba(110,62,30,0.35)', r, 4); // rust where the tin folds
    edges(x, fw, fh, 0.25, 0.04); grime(x, fw, fh, 0.3); scratches(x, fw, fh, 10, r);
  },
  strongbox(x, f, fw, fh, r) {
    if (f === 'under') { x.fillStyle = '#3e4244'; x.fillRect(0, 0, fw, fh); blotch(x, fw / 2, fh / 2, fw, fh, 'rgba(120,64,28,0.3)', r, 10); return; }
    x.fillStyle = '#5c6264'; x.fillRect(0, 0, fw, fh);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '30,32,32' : '120,124,120'},${0.08 + r() * 0.1})`; x.fillRect(r() * fw, r() * fh, 0.004 + r() * 0.01, 0.003 + r() * 0.006); } // matte, pitted plate
    // a raised panel, its bevel catching the light top and left
    const m = 0.07; x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(m, m, fw - 2 * m, 0.006); x.fillRect(m, m, 0.006, fh - 2 * m); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(m, fh - m - 0.008, fw - 2 * m, 0.008); x.fillRect(fw - m - 0.008, m, 0.008, fh - 2 * m);
    for (let u = 0.035; u < fw; u += (fw - 0.07) / Math.round((fw - 0.07) / 0.08)) for (const v of [0.035, fh - 0.035]) rivet(x, u, v, 0.012);
    for (let v = 0.035 + 0.08; v < fh - 0.07; v += 0.08) for (const u of [0.035, fw - 0.035]) rivet(x, u, v, 0.012);
    for (let i = 0; i < 6; i++) { const u = r() * fw, v = r() * fh * 0.8; blotch(x, u, v, 0.08, 0.06, 'rgba(120,64,28,0.35)', r, 5); rustStreak(x, u, v, 0.08 + r() * 0.12, r); } // rust blooms and their tears
    if (f === 'front') { // the hasp, the lock long gone: the staple stands empty
      x.fillStyle = '#3a3e40'; x.fillRect(fw / 2 - 0.035, 0, 0.07, 0.11); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(fw / 2 - 0.035, 0, 0.07, 0.006); rivet(x, fw / 2, 0.025, 0.009);
      x.strokeStyle = '#2a2c2c'; x.lineWidth = 0.012; x.beginPath(); x.arc(fw / 2, 0.11, 0.022, 0, Math.PI); x.stroke(); rustStreak(x, fw / 2, 0.13, 0.12, r);
    }
    if (f === 'side') { x.strokeStyle = '#2e3030'; x.lineWidth = 0.016; x.beginPath(); x.moveTo(fw * 0.32, fh * 0.32); x.quadraticCurveTo(fw * 0.5, fh * 0.62, fw * 0.68, fh * 0.32); x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.15)'; x.lineWidth = 0.004; x.stroke(); for (const u of [fw * 0.32, fw * 0.68]) rivet(x, u, fh * 0.3, 0.016); } // the drop handle
    scratches(x, fw, fh, 22, r, 'rgba(220,220,210,0.25)'); grime(x, fw, fh, 0.4); edges(x, fw, fh, 0.3, 0.04);
  },
  footlocker(x, f, fw, fh, r) {
    if (f === 'under') { x.fillStyle = '#6a5034'; x.fillRect(0, 0, fw, fh); grain(x, fw, fh, 'rgba(40,26,12,0.3)', 16, 1, r); label(x, fw * 0.3, fh * 0.25, fw * 0.4, fh * 0.45, r, 0.05, 4); return; } // a packing list pasted inside
    x.fillStyle = '#4e5a3a'; x.fillRect(0, 0, fw, fh); grain(x, fw, fh, 'rgba(30,36,20,0.25)', 20, 1, r); // olive paint over wood, the grain showing through
    blotch(x, fw / 2, fh / 2, fw, fh, 'rgba(70,80,50,0.2)', r, 10);
    for (let i = 0; i < 16; i++) { const u = r() < 0.5 ? r() * 0.08 + (r() < 0.5 ? 0 : fw - 0.08) : r() * fw, v = r() < 0.6 ? (r() < 0.5 ? r() * 0.06 : fh - r() * 0.06) : r() * fh; x.fillStyle = '#8a6a40'; x.beginPath(); x.ellipse(u, v, 0.01 + r() * 0.02, 0.006 + r() * 0.012, r() * 3, 0, TAU); x.fill(); } // paint chipped to the wood
    const sw = 0.03; x.fillStyle = '#34362f'; for (const [rx, ry, rw, rh] of [[0, 0, fw, sw], [0, fh - sw, fw, sw], [0, 0, sw, fh], [fw - sw, 0, sw, fh]]) x.fillRect(rx, ry, rw, rh); // steel binding
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, 0, fw, 0.004);
    for (let u = 0.06; u < fw - 0.04; u += 0.09) for (const v of [sw / 2, fh - sw / 2]) rivet(x, u, v, 0.007);
    if (f === 'front' || f === 'side' || f === 'lidF' || f === 'lidS') for (const u of [0, fw - 0.09]) for (const v of f.startsWith('lid') ? [0] : [fh - 0.09]) { x.fillStyle = '#8a6c34'; x.beginPath(); if (u) { x.moveTo(fw, v); x.lineTo(fw, v + 0.09); x.lineTo(fw - 0.09, v + 0.09); } else { x.moveTo(0, v); x.lineTo(0, v + 0.09); x.lineTo(0.09, v + 0.09); } if (f.startsWith('lid')) { x.closePath(); x.fill(); } else { x.closePath(); x.fill(); } x.fillStyle = 'rgba(255,230,170,0.25)'; x.fillRect(u ? fw - 0.06 : 0.01, v + 0.075, 0.05, 0.004); rivet(x, u ? fw - 0.025 : 0.025, v + 0.065, 0.006, 'rgba(255,230,170,0.5)'); } // brass corners, worn bright at the tips
    if (f === 'front') { stencil(x, 'J. R. KEMBLE', fw * 0.5, fh * 0.38, 0.06, 'rgba(214,206,178,0.75)', r); stencil(x, '4471', fw * 0.5, fh * 0.56, 0.05, 'rgba(214,206,178,0.6)', r);
      x.fillStyle = '#8a6c34'; x.fillRect(fw / 2 - 0.03, 0, 0.06, 0.1); x.fillStyle = 'rgba(255,230,170,0.3)'; x.fillRect(fw / 2 - 0.03, 0, 0.06, 0.005); x.fillStyle = '#2a2014'; x.beginPath(); x.arc(fw / 2, 0.06, 0.008, 0, TAU); x.fill(); x.fillRect(fw / 2 - 0.003, 0.06, 0.006, 0.018); } // the brass hasp with a keyhole
    if (f === 'side') { x.fillStyle = '#3a2a18'; x.beginPath(); x.moveTo(fw * 0.3, fh * 0.3); x.quadraticCurveTo(fw * 0.5, fh * 0.42, fw * 0.7, fh * 0.3); x.lineTo(fw * 0.7, fh * 0.36); x.quadraticCurveTo(fw * 0.5, fh * 0.48, fw * 0.3, fh * 0.36); x.closePath(); x.fill(); x.strokeStyle = 'rgba(200,170,120,0.25)'; x.lineWidth = 0.003; x.setLineDash([0.008, 0.008]); x.stroke(); x.setLineDash([]); for (const u of [fw * 0.3, fw * 0.7]) rivet(x, u, fh * 0.33, 0.01); } // a stitched leather handle
    if (f === 'top') stencil(x, 'H.M.S.', fw * 0.5, fh * 0.5, 0.07, 'rgba(214,206,178,0.4)', r);
    scratches(x, fw, fh, 16, r, 'rgba(200,190,150,0.25)'); grime(x, fw, fh, 0.35); edges(x, fw, fh, 0.3, 0.04);
  },
  trunk(x, f, fw, fh, r) {
    if (f === 'under') { x.fillStyle = '#5a2a24'; x.fillRect(0, 0, fw, fh); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '120,60,50' : '40,16,12'},0.35)`; x.beginPath(); x.arc(r() * fw, r() * fh, 0.004 + r() * 0.01, 0, TAU); x.fill(); } x.strokeStyle = '#8a6c34'; x.lineWidth = 0.008; x.strokeRect(0.05, 0.05, fw - 0.1, fh - 0.1); return; } // faded red cloth, a brass bead round it
    x.fillStyle = '#4a2e1c'; x.fillRect(0, 0, fw, fh); // leather over wood
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '110,74,46' : '24,14,8'},${0.15 + r() * 0.2})`; x.beginPath(); x.ellipse(r() * fw, r() * fh, 0.004 + r() * 0.02, 0.003 + r() * 0.008, r() * 3, 0, TAU); x.fill(); } // its pebble and scuffs
    const slat = (y0, h) => { x.fillStyle = '#7a5a34'; x.fillRect(0, y0, fw, h); x.save(); x.beginPath(); x.rect(0, y0, fw, h); x.clip(); grain(x, fw, fh, 'rgba(60,36,16,0.35)', 30, 1, r); x.restore(); x.fillStyle = 'rgba(255,230,180,0.12)'; x.fillRect(0, y0, fw, 0.004); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, y0 + h - 0.004, fw, 0.004); for (let u = 0.12; u < fw - 0.1; u += 0.1) rivet(x, u, y0 + h / 2, 0.007, 'rgba(255,230,170,0.55)'); }; // oak slats, brass-studded
    if (f === 'front' || f === 'side') { slat(fh * 0.22, 0.055); slat(fh * 0.66, 0.055); }
    if (f === 'top') { x.fillStyle = '#7a5a34'; for (const u of [fw * 0.22, fw * 0.72]) { x.fillRect(u, 0, 0.055, fh); x.strokeStyle = 'rgba(60,36,16,0.35)'; x.lineWidth = 0.003; for (let k = 0; k < 5; k++) { const uu = u + 0.006 + r() * 0.043; x.beginPath(); x.moveTo(uu, 0); x.bezierCurveTo(uu + 0.005, fh * 0.3, uu - 0.005, fh * 0.7, uu, fh); x.stroke(); } x.fillStyle = '#7a5a34'; for (let v = 0.06; v < fh - 0.04; v += 0.1) rivet(x, u + 0.0275, v, 0.007, 'rgba(255,230,170,0.55)'); x.fillStyle = '#7a5a34'; } }
    if (f === 'lidF' || f === 'lidS') { x.fillStyle = '#7a5a34'; x.fillRect(0, fh - 0.04, fw, 0.04); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, fh - 0.04, fw, 0.004); }
    // brass corners: a cap on each corner, engraved with a line, worn bright on the edge
    const cap = 0.11;
    for (const [u, v, su, sv] of [[0, 0, 1, 1], [fw, 0, -1, 1], [0, fh, 1, -1], [fw, fh, -1, -1]]) {
      if ((f === 'front' || f === 'side') && sv > 0) continue; if ((f === 'lidF' || f === 'lidS') && sv < 0) continue;
      x.fillStyle = '#8e6e34'; x.beginPath(); x.moveTo(u, v); x.lineTo(u + su * cap, v); x.quadraticCurveTo(u + su * cap * 0.55, v + sv * cap * 0.55, u, v + sv * cap); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(60,40,10,0.6)'; x.lineWidth = 0.003; x.beginPath(); x.moveTo(u + su * cap * 0.75, v); x.quadraticCurveTo(u + su * cap * 0.4, v + sv * cap * 0.4, u, v + sv * cap * 0.75); x.stroke();
      x.strokeStyle = 'rgba(255,232,170,0.45)'; x.lineWidth = 0.004; x.beginPath(); x.moveTo(u + su * 0.004, v + sv * cap * 0.9); x.lineTo(u + su * 0.004, v + sv * 0.004); x.lineTo(u + su * cap * 0.9, v + sv * 0.004); x.stroke();
      rivet(x, u + su * cap * 0.28, v + sv * cap * 0.28, 0.007, 'rgba(255,230,170,0.55)');
    }
    if (f === 'front') { // the lock plate: brass, a keyhole, the society's escutcheon worn smooth
      x.fillStyle = '#8e6e34'; x.beginPath(); x.roundRect(fw / 2 - 0.06, 0, 0.12, 0.13, 0.015); x.fill(); x.strokeStyle = 'rgba(50,34,10,0.6)'; x.lineWidth = 0.003; x.beginPath(); x.roundRect(fw / 2 - 0.05, 0.008, 0.1, 0.112, 0.01); x.stroke();
      x.fillStyle = 'rgba(255,232,170,0.35)'; x.fillRect(fw / 2 - 0.055, 0.004, 0.11, 0.004); x.fillStyle = '#1a1008'; x.beginPath(); x.arc(fw / 2, 0.06, 0.011, 0, TAU); x.fill(); x.beginPath(); x.moveTo(fw / 2 - 0.006, 0.065); x.lineTo(fw / 2 + 0.006, 0.065); x.lineTo(fw / 2 + 0.004, 0.095); x.lineTo(fw / 2 - 0.004, 0.095); x.fill();
      for (const u of [fw / 2 - 0.042, fw / 2 + 0.042]) for (const v of [0.02, 0.11]) rivet(x, u, v, 0.005, 'rgba(255,230,170,0.6)');
    }
    if (f === 'side') { x.fillStyle = '#2a180c'; x.beginPath(); x.roundRect(fw * 0.32, fh * 0.42, fw * 0.36, 0.05, 0.02); x.fill(); x.strokeStyle = 'rgba(210,170,110,0.3)'; x.lineWidth = 0.003; x.setLineDash([0.007, 0.007]); x.stroke(); x.setLineDash([]); for (const u of [fw * 0.32, fw * 0.68]) { x.fillStyle = '#8e6e34'; x.fillRect(u - 0.025, fh * 0.39, 0.05, 0.11); rivet(x, u, fh * 0.445, 0.007, 'rgba(255,230,170,0.55)'); } } // a leather handle in brass loops
    if (f === 'top') { // the crest plaque, the name on it scratched out
      const u = fw / 2, v = fh / 2; x.fillStyle = '#8e6e34'; x.beginPath(); x.ellipse(u, v, 0.11, 0.075, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(50,34,10,0.6)'; x.lineWidth = 0.003; x.beginPath(); x.ellipse(u, v, 0.095, 0.062, 0, 0, TAU); x.stroke();
      for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; x.fillStyle = 'rgba(50,34,10,0.5)'; x.beginPath(); x.arc(u + Math.cos(a) * 0.084, v + Math.sin(a) * 0.054, 0.0025, 0, TAU); x.fill(); } // a ring of beading
      x.strokeStyle = 'rgba(50,34,10,0.65)'; x.lineWidth = 0.005; x.beginPath(); x.moveTo(u - 0.03, v - 0.03); x.lineTo(u, v - 0.042); x.lineTo(u + 0.03, v - 0.03); x.stroke(); // what is left of an engraved device above the name
      x.strokeStyle = 'rgba(40,26,8,0.7)'; x.lineWidth = 0.003; for (let i = 0; i < 26; i++) { const uu = u - 0.06 + r() * 0.12, vv = v - 0.005 + r() * 0.03; x.beginPath(); x.moveTo(uu, vv); x.lineTo(uu + (r() - 0.3) * 0.04, vv + (r() - 0.5) * 0.02); x.stroke(); } // the name gouged out
      x.strokeStyle = 'rgba(255,232,170,0.4)'; x.lineWidth = 0.003; x.beginPath(); x.ellipse(u, v, 0.108, 0.073, 0, Math.PI * 1.1, Math.PI * 1.7); x.stroke();
    }
    scratches(x, fw, fh, 18, r, 'rgba(200,160,110,0.25)'); grime(x, fw, fh, 0.35); edges(x, fw, fh, 0.35, 0.04);
  },
};

// (6.4.0) the large crate and case: the same box, bigger, a rope round it (or a second hasp); the salvage trunk: the
// expedition trunk after years on the bottom, weed and barnacles on it, its brass gone green
const rope = (x, u, fh) => { x.strokeStyle = '#7a6440'; x.lineWidth = 0.018; x.beginPath(); x.moveTo(u, 0); x.lineTo(u, fh); x.stroke(); x.strokeStyle = 'rgba(40,28,12,0.5)'; x.lineWidth = 0.004; for (let v = 0; v < fh; v += 0.02) { x.beginPath(); x.moveTo(u - 0.008, v); x.lineTo(u + 0.008, v + 0.012); x.stroke(); } };
function barnacles(x, fw, fh, r, n, region = 1) { for (let i = 0; i < n; i++) { const u = r() * fw, v = fh * (1 - region) + r() * fh * region, s2 = 0.007 + r() * 0.014; // small grey cones, lit from the upper left, a slit on top
    const g = x.createRadialGradient(u - s2 * 0.4, v - s2 * 0.4, s2 * 0.1, u, v, s2); g.addColorStop(0, '#d8d0bc'); g.addColorStop(0.7, '#9a927e'); g.addColorStop(1, '#5e584a'); x.fillStyle = g; x.beginPath(); x.ellipse(u, v, s2, s2 * 0.85, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(40,36,28,0.7)'; x.lineWidth = 0.0025; x.beginPath(); x.moveTo(u - s2 * 0.3, v - s2 * 0.1); x.lineTo(u + s2 * 0.3, v - s2 * 0.05); x.stroke(); } }
function weed(x, fw, fh, r, n) { x.strokeStyle = 'rgba(70,90,40,0.75)'; x.lineWidth = 0.006; for (let i = 0; i < n; i++) { const u = r() * fw; x.beginPath(); x.moveTo(u, fh); x.quadraticCurveTo(u + (r() - 0.5) * 0.06, fh * (0.75 - r() * 0.2), u + (r() - 0.5) * 0.08, fh * (0.5 - r() * 0.3)); x.stroke(); } }
Object.assign(PAINT, {
  crate_big(x, f, fw, fh, r) { PAINT.crate(x, f, fw, fh, r); if (f === 'front' || f === 'top' || f === 'lidF') { rope(x, fw * 0.3, fh); rope(x, fw * 0.7, fh); } },
  case_big(x, f, fw, fh, r) { PAINT.case(x, f, fw, fh, r); if (f === 'front') { x.fillStyle = '#3a3e40'; for (const u of [fw * 0.5]) { x.fillRect(u - 0.03, 0.01, 0.06, 0.05); rivet(x, u, 0.035, 0.008); } } },
  salvage(x, f, fw, fh, r) { PAINT.trunk(x, f, fw, fh, r); if (f === 'under') return;
    x.fillStyle = 'rgba(60,90,70,0.35)'; x.fillRect(0, 0, fw, fh); blotch(x, fw * 0.5, fh * 0.85, fw, fh * 0.4, 'rgba(40,60,30,0.35)', r, 10);
    if (f !== 'top') weed(x, fw, fh, r, 6); barnacles(x, fw, fh, r, f === 'top' ? 10 : 16, f === 'top' ? 1 : 0.6); grime(x, fw, fh, 0.45); },
  siren(x, f, fw, fh, r) { // black coral lacquer, panels of mother-of-pearl, a branching coral inlay, pearls at the corners
    x.fillStyle = '#16120f'; x.fillRect(0, 0, fw, fh); if (f === 'under') { x.fillStyle = '#2a2420'; x.fillRect(0, 0, fw, fh); return; }
    const g = x.createLinearGradient(0, 0, fw, fh); g.addColorStop(0, 'rgba(90,70,60,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.3)'); x.fillStyle = g; x.fillRect(0, 0, fw, fh);
    const m = 0.05, pw = fw - m * 2, ph = fh - m * 2;
    if (pw > 0.1 && ph > 0.05) { const ng = x.createLinearGradient(m, m, m + pw, m + ph); ng.addColorStop(0, '#6e7472'); ng.addColorStop(0.3, '#8a8c90'); ng.addColorStop(0.55, '#7e7078'); ng.addColorStop(0.8, '#6a7466'); ng.addColorStop(1, '#4e4c48'); x.fillStyle = ng; x.fillRect(m, m, pw, ph); // nacre, dulled with age
      for (let i = 0; i < 10; i++) { const u = m + r() * pw, v = m + r() * ph; const sg = x.createRadialGradient(u, v, 0, u, v, 0.06); sg.addColorStop(0, `rgba(${r() < 0.5 ? '200,220,215' : '220,200,215'},0.28)`); sg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sg; x.fillRect(u - 0.06, v - 0.06, 0.12, 0.12); } // its sheen in patches
      x.strokeStyle = 'rgba(30,24,20,0.5)'; x.lineWidth = 0.002; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(m, m + r() * ph); x.lineTo(m + pw, m + r() * ph); x.stroke(); } // the joins between the shell pieces
      x.lineCap = 'round'; const br = (u, v, a, l, d) => { if (d > 5 || l < 0.008) return; const u2 = u + Math.cos(a) * l, v2 = v + Math.sin(a) * l; x.strokeStyle = d < 2 ? '#3a0e0c' : '#5e1a14'; x.lineWidth = 0.009 * Math.pow(0.75, d); x.beginPath(); x.moveTo(u, v); x.quadraticCurveTo((u + u2) / 2 + (r() - 0.5) * l * 0.3, (v + v2) / 2, u2, v2); x.stroke(); br(u2, v2, a - 0.35 - r() * 0.4, l * (0.6 + r() * 0.2), d + 1); if (r() < 0.75) br(u2, v2, a + 0.3 + r() * 0.4, l * (0.55 + r() * 0.2), d + 1); };
      br(m + pw * 0.1, m + ph, -Math.PI / 2 + 0.35, ph * 0.28, 0); br(m + pw * 0.9, m + ph, -Math.PI / 2 - 0.35, ph * 0.26, 0); x.lineCap = 'butt'; } // black coral grown in from the corners
    for (const [u, v] of [[m * 0.5, m * 0.5], [fw - m * 0.5, m * 0.5], [m * 0.5, fh - m * 0.5], [fw - m * 0.5, fh - m * 0.5]]) { const pg = x.createRadialGradient(u - 0.006, v - 0.006, 0.001, u, v, 0.02); pg.addColorStop(0, '#fffaf0'); pg.addColorStop(0.6, '#d8d0c0'); pg.addColorStop(1, '#8a8478'); x.fillStyle = pg; x.beginPath(); x.arc(u, v, 0.018, 0, TAU); x.fill(); }
    scratches(x, fw, fh, 8, r); edges(x, fw, fh, 0.4, 0.03); },
  leviathan(x, f, fw, fh, r) { // black tarred planks bound by great curved ribs of bone, iron pins, barnacles low down
    x.fillStyle = '#1e1a16'; x.fillRect(0, 0, fw, fh); if (f === 'under') { x.fillStyle = '#2a241c'; x.fillRect(0, 0, fw, fh); return; }
    const n = f === 'top' ? 4 : 3; for (let i = 0; i < n; i++) { const y0 = fh / n * i + 0.006, y1 = fh / n * (i + 1) - 0.006; x.fillStyle = ['#2c2620', '#262019', '#302a22'][i % 3]; x.fillRect(0, y0, fw, y1 - y0); x.save(); x.beginPath(); x.rect(0, y0, fw, y1 - y0); x.clip(); grain(x, fw, fh, 'rgba(90,76,56,0.25)', 18, 1.2, r); x.restore(); }
    const rib = (u) => { const g = x.createLinearGradient(u - 0.04, 0, u + 0.04, 0); g.addColorStop(0, '#8a8068'); g.addColorStop(0.4, '#e0d6bc'); g.addColorStop(1, '#a29880'); x.fillStyle = g; x.beginPath(); x.moveTo(u - 0.03, 0); x.quadraticCurveTo(u - 0.05, fh / 2, u - 0.03, fh); x.lineTo(u + 0.035, fh); x.quadraticCurveTo(u + 0.055, fh / 2, u + 0.03, 0); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(60,50,36,0.5)'; x.lineWidth = 0.003; for (let v = 0.03; v < fh; v += 0.05) { x.beginPath(); x.moveTo(u - 0.03, v); x.lineTo(u + 0.03, v + (r() - 0.5) * 0.01); x.stroke(); } };
    if (f !== 'under') { rib(fw * 0.18); rib(fw * 0.82); if (f === 'front') rib(fw * 0.5); }
    for (let i = 0; i < 6; i++) { const u = r() * fw, v = r() * fh; x.fillStyle = '#3a3430'; x.beginPath(); x.arc(u, v, 0.01, 0, TAU); x.fill(); }
    if (f === 'front' || f === 'side') barnacles(x, fw, fh, r, 18, 0.35); grime(x, fw, fh, 0.5); edges(x, fw, fh, 0.45, 0.04); },
  poseidon(x, f, fw, fh, r) { // cast bronze gone to verdigris, waves cast round its edges, a trident on the lid, barnacles; the sea still in its seams
    const g = x.createLinearGradient(0, 0, fw, fh); g.addColorStop(0, '#7a8a5e'); g.addColorStop(0.5, '#5a7058'); g.addColorStop(1, '#3e5044'); x.fillStyle = g; x.fillRect(0, 0, fw, fh);
    if (f === 'under') { x.fillStyle = '#2e3a30'; x.fillRect(0, 0, fw, fh); return; }
    blotch(x, fw * 0.5, fh * 0.5, fw, fh, 'rgba(150,110,60,0.35)', r, 14); blotch(x, fw * 0.3, fh * 0.3, fw * 0.6, fh * 0.6, 'rgba(110,170,150,0.25)', r, 10); // bronze showing through, and the green
    x.strokeStyle = 'rgba(180,150,90,0.55)'; x.lineWidth = 0.006; const band = (v) => { x.beginPath(); for (let u = 0; u <= fw; u += 0.01) { const y = v + Math.sin(u * 40) * 0.012; u ? x.lineTo(u, y) : x.moveTo(u, y); } x.stroke(); }; band(0.03); band(fh - 0.03); // cast waves round the edges
    if (f === 'lidF') { // (7.4.8, owner) the trident, raised, lying the length of the lid's front (the top is seen too steeply: it read as an E): sized to the face so its head never runs off it,
      // its relief a darker stroke laid under it (a canvas shadow drew a dark block in the chest's opening scene)
      const cu = fw / 2, cv = fh / 2, L = Math.min(fw * 0.36, fh * 1.25), sp = L * 0.28, hx = cu + L * 0.5;
      const tip = hx + L * 0.5, path = () => { x.beginPath(); x.moveTo(cu - L * 1.05, cv); x.lineTo(tip - L * 0.06, cv); // the shaft, running on as the middle prong
        for (const d of [-sp, sp]) { x.moveTo(hx - L * 0.02, cv); x.bezierCurveTo(hx + L * 0.06, cv, hx + L * 0.1, cv + d, hx + L * 0.22, cv + d); x.lineTo(tip - L * 0.1, cv + d); } // the outer prongs curve out of it
        x.moveTo(hx - L * 0.1, cv - L * 0.05); x.lineTo(hx - L * 0.1, cv + L * 0.05); }; // a collar where the head meets the shaft
      const barbs = (col) => { x.fillStyle = col; for (const d of [-sp, 0, sp]) { const ex = d ? tip - L * 0.1 : tip - L * 0.06, ey = cv + d, w = L * 0.055; x.beginPath(); x.moveTo(ex + L * 0.1, ey); x.lineTo(ex - L * 0.01, ey - w); x.lineTo(ex + L * 0.02, ey); x.lineTo(ex - L * 0.01, ey + w); x.closePath(); x.fill(); } }; // a barbed point on each prong
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.save(); x.translate(0.004, 0.006); x.strokeStyle = 'rgba(20,24,16,0.55)'; x.lineWidth = Math.min(0.022, fh * 0.06); path(); x.stroke(); barbs('rgba(20,24,16,0.55)'); x.restore();
      x.strokeStyle = '#d4b46a'; x.lineWidth = Math.min(0.02, fh * 0.055); path(); x.stroke(); barbs('#d4b46a');
      x.strokeStyle = 'rgba(255,240,200,0.4)'; x.lineWidth = Math.min(0.006, fh * 0.02); x.beginPath(); x.moveTo(cu - L * 1.05, cv - x.lineWidth); x.lineTo(hx - L * 0.12, cv - x.lineWidth); x.stroke(); x.lineCap = 'butt'; }
    if (f === 'top') { // (7.4.8) the lid's top: a cast band of waves along it
      x.strokeStyle = 'rgba(212,180,106,0.85)'; x.lineWidth = Math.min(0.012, fh * 0.05); x.beginPath(); for (let u = 0.06; u <= fw - 0.06; u += 0.008) { const y = fh * 0.5 + Math.sin(u * 26) * fh * 0.12; u > 0.06 ? x.lineTo(u, y) : x.moveTo(u, y); } x.stroke(); }
    if (f === 'front') { x.fillStyle = '#c8a860'; x.beginPath(); x.ellipse(fw / 2, fh * 0.42, 0.05, 0.065, 0, 0, TAU); x.fill(); x.fillStyle = '#1a1a14'; x.beginPath(); x.arc(fw / 2, fh * 0.4, 0.012, 0, TAU); x.fill(); x.fillRect(fw / 2 - 0.005, fh * 0.4, 0.01, 0.03); } // the lock, a scallop of bronze
    x.strokeStyle = 'rgba(120,220,200,0.35)'; x.lineWidth = 0.004; x.strokeRect(0.012, 0.012, fw - 0.024, fh - 0.024); // the sea's faint light in its seams
    barnacles(x, fw, fh, r, f === 'top' ? 6 : 12, 0.45); scratches(x, fw, fh, 10, r, 'rgba(230,210,160,0.25)'); edges(x, fw, fh, 0.35, 0.04); },
});
const FALLBACK = 'crate';

// ---------- the box ----------
export function drawChest(ctx, look, w, h, lid = 0, light = null) {
  if (!PAINT[look]) look = FALLBACK;
  const [BW, BH, D, LH] = SIZE[look] || SIZE.crate;
  const s = Math.min(w / (BW + D * KX) * 0.8, h / (BH + LH + D * KY + 0.5 * lid) * 0.82);
  const ox = w / 2 - ((BW + D * KX) * s) / 2 + (BW / 2) * s, base = h * 0.9;
  const P = (x, y, z) => [ox + (x + z * KX) * s, base - (y + z * KY) * s]; // x across (centre 0), y up, z back
  const seedOf = (f) => { let k = 7; for (const ch of look + f) k = (k * 31 + ch.charCodeAt(0)) >>> 0; return k; };
  // a face from three corners (origin, along u, along v) and its size in box units, with a light level
  const face = (O, U, V, fw, fh, f, shade) => {
    const [ax, ay] = O, [bx, by] = U, [cx, cy] = V;
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (Math.abs(area) < 0.5) return;
    ctx.save(); ctx.transform((bx - ax) / fw, (by - ay) / fw, (cx - ax) / fh, (cy - ay) / fh, ax, ay);
    ctx.beginPath(); ctx.rect(0, 0, fw, fh); ctx.clip();
    PAINT[look](ctx, f, fw, fh, rng(seedOf(f)));
    if (shade) { ctx.fillStyle = shade > 0 ? `rgba(8,6,4,${shade})` : `rgba(255,246,226,${-shade})`; ctx.fillRect(0, 0, fw, fh); }
    ctx.restore();
  };
  const x0 = -BW / 2, x1 = BW / 2;
  // its shadow on the ground
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.filter = `blur(${Math.max(1, s * 0.02)}px)`; ctx.beginPath();
  for (const [x, z] of [[x0 - 0.03, -0.02], [x1 + 0.05, -0.02], [x1 + 0.08, D + 0.03], [x0, D + 0.03]]) { const [px, py] = P(x, 0, z); ctx.lineTo(px, py); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  // the lid: hinged on the back top edge (y = BH, z = D), turned up and back by a (0 .. 1.95 rad)
  const a = lid * 1.95, ca = Math.cos(a), sa = Math.sin(a);
  const L = (x, dy, dz) => P(x, BH + dy * ca - dz * sa, D + dy * sa + dz * ca); // dy up from the hinge, dz from it (negative is forward)
  const drawLid = () => {
    // seen faces: its front (dz = -D), its right end (x = x1), its top (dy = LH) or, turned past upright, its underside
    if (ca > -0.2) face(L(x0, LH, -D), L(x1, LH, -D), L(x0, 0, -D), BW, LH, 'lidF', 0.12 + (1 - ca) * 0.25);
    face(L(x1, LH, -D), L(x1, LH, 0), L(x1, 0, -D), D, LH, 'lidS', 0.4);
    const topVis = (() => { const A = L(x0, LH, 0), B = L(x1, LH, 0), C = L(x0, LH, -D); return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]); })();
    if (topVis > 0) face(L(x0, LH, 0), L(x1, LH, 0), L(x0, LH, -D), BW, D, 'top', -0.04 + lid * 0.3);
    else { face(L(x0, 0, 0), L(x1, 0, 0), L(x0, 0, -D), BW, D, 'under', 0.55);
      // (6.2.0) the inside of the lid is worked, not blank: two battens across it, its hinges, and it is in shadow, dimmest at
      // its free edge; only the edge by the hinge picks up a little of the light from the box
      const quad = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); };
      ctx.save(); quad([L(x0, 0, 0), L(x1, 0, 0), L(x1, 0, -D), L(x0, 0, -D)]); ctx.clip();
      const [h0x, h0y] = L(0, 0, 0), [f0x, f0y] = L(0, 0, -D), sg = ctx.createLinearGradient(h0x, h0y, f0x, f0y);
      sg.addColorStop(0, light ? light.replace('A', (0.1 * lid).toFixed(3)) : 'rgba(0,0,0,0)'); sg.addColorStop(0.35, 'rgba(6,5,3,0.18)'); sg.addColorStop(1, 'rgba(6,5,3,0.55)');
      ctx.fillStyle = sg; ctx.fillRect(Math.min(h0x, f0x) - s, Math.min(h0y, f0y) - s, s * 3, s * 3);
      for (const dz of [-D * 0.22, -D * 0.78]) { // the battens: a board across the lid, its near edge catching what light there is
        const w = Math.min(0.06, D * 0.12); quad([L(x0 + 0.03, 0, dz - w), L(x1 - 0.03, 0, dz - w), L(x1 - 0.03, 0, dz + w), L(x0 + 0.03, 0, dz + w)]);
        ctx.fillStyle = 'rgba(20,14,8,0.42)'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = Math.max(1, s * 0.004); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (const x of [x0 + 0.07, x1 - 0.07]) { const [nx, ny] = L(x, 0, dz); ctx.beginPath(); ctx.arc(nx, ny, Math.max(1, s * 0.006), 0, TAU); ctx.fill(); } }
      ctx.fillStyle = 'rgba(30,26,20,0.9)'; for (const x of [x0 + BW * 0.18, x1 - BW * 0.18]) { const hw = BW * 0.06; quad([L(x - hw, 0, 0), L(x + hw, 0, 0), L(x + hw, 0, -D * 0.16), L(x - hw, 0, -D * 0.16)]); ctx.fill(); ctx.strokeStyle = 'rgba(200,180,140,0.18)'; ctx.stroke(); } // the hinge leaves
      ctx.restore(); }
    if (ca <= -0.2) face(L(x0, LH, -D), L(x1, LH, -D), L(x0, 0, -D), BW, LH, 'lidF', 0.5);
  };
  const drawBody = () => {
    face(P(x0, BH, 0), P(x1, BH, 0), P(x0, 0, 0), BW, BH, 'front', 0.08);
    face(P(x1, BH, 0), P(x1, BH, D), P(x1, 0, 0), D, BH, 'side', 0.38);
  };
  const drawMouth = () => { // the open top, dark inside, the light from what is in it
    const q = [P(x0 + 0.02, BH, 0.02), P(x1 - 0.02, BH, 0.02), P(x1 - 0.02, BH, D - 0.02), P(x0 + 0.02, BH, D - 0.02)];
    ctx.save(); ctx.beginPath(); q.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); ctx.fillStyle = '#0c0a08'; ctx.fill();
    // the inside of the back and left walls, a little lit
    ctx.clip(); const [bx, by] = P(0, BH, D); ctx.fillStyle = 'rgba(70,56,40,0.35)'; ctx.fillRect(bx - s, by - s * 0.02, s * 2, s * 0.06);
    if (light) { const [mx, my] = P(0, BH, D / 2), g = ctx.createRadialGradient(mx, my, 0, mx, my, s * 0.6); g.addColorStop(0, light.replace('A', (0.7 * lid).toFixed(3))); g.addColorStop(1, light.replace('A', (0.12 * lid).toFixed(3))); ctx.fillStyle = g; ctx.fillRect(mx - s, my - s, s * 2, s * 2); }
    ctx.restore();
    if (look === 'crate' && lid > 0.1) { ctx.save(); ctx.strokeStyle = 'rgba(200,176,112,0.85)'; ctx.lineWidth = Math.max(1, s * 0.004); const rr = rng(99); for (let i = 0; i < 40; i++) { const [px, py] = P(x0 + 0.04 + rr() * (BW - 0.08), BH + 0.005, 0.03 + rr() * (D - 0.06)), an = rr() * TAU, l = s * (0.02 + rr() * 0.04); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(an) * l, py + Math.sin(an) * l * 0.5); ctx.stroke(); } ctx.restore(); } // straw spilling over
  };
  const beam = () => { // the light from inside: a soft column, never a beam
    if (!light || lid < 0.05) return; const [mx, my] = P(0, BH, D / 2), g = ctx.createRadialGradient(mx, my, 0, mx, my - s * 0.1, s * 0.45 * lid);
    g.addColorStop(0, light.replace('A', (0.16 * lid).toFixed(3))); g.addColorStop(1, light.replace('A', '0')); /* (6.2.0) softer: the lid must stay in shadow */ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(mx - s, my - s * 1.2, s * 2, s * 1.4); ctx.restore();
  };
  if (a < 0.12) { drawBody(); drawLid(); } else { drawLid(); drawBody(); drawMouth(); beam(); }
}
