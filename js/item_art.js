// Pictures of the special things (2.8.1): every Exotic and Legendary drawn for the shops, the locker and the
// chest reveal, on the same background as everything else. Natural materials and colours (bone, rope, brass,
// wood, hide); only a bioluminescent part shows any light, and softly. The things use the same looks as on
// Earl (item_data.js LOOKS); the Legendaries that aren't nets are drawn one by one here.
import { toolIcon, drawSlurp, drawTagger, drawCamera } from './tools_draw.js';
import { drawEarl, drawSpecialTank } from './earl_draw.js';
import { TAU, clamp } from './util.js';

const rgb = (hex) => { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
// a small seeded random, so a picture is the same every time
const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const seedOf = (id) => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// ---------- the things ----------
// a pair of fins laid side by side on a slant: foot pockets with heel straps and buckles, the blades with
// their stiff rails and moulded channels, then whatever makes these ones their own
function finsPic(ctx, w, h, FL, legend) {
  const S = Math.min(w / 220, h / 132);
  for (const [ox, oy, a, rot] of [[w * 0.2, h * 0.36, 0.7, -0.08], [w * 0.14, h * 0.6, 1, -0.05]]) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(ox, oy); ctx.rotate(rot); ctx.scale(S, S);
    // the blade: wide at the tip, waisted where it meets the pocket
    const blade = new Path2D();
    if (FL.fx === 'rays') { blade.moveTo(40, -9); for (let k = 0; k <= 12; k++) { const f = k / 12; blade.lineTo(40 + f * 118, -10 - Math.sin(f * Math.PI) * 8 - (k % 2) * 7); } blade.lineTo(162, 12); blade.quadraticCurveTo(100, 16, 40, 9); }
    else { blade.moveTo(40, -9); blade.bezierCurveTo(80, -12, 120, -20, 158, -22); blade.quadraticCurveTo(164, 0, 158, 22); blade.bezierCurveTo(120, 20, 80, 12, 40, 9); }
    blade.closePath();
    const g = ctx.createLinearGradient(40, 0, 160, 0); g.addColorStop(0, FL.c[0]); g.addColorStop(0.6, FL.c[1]); g.addColorStop(1, FL.c[2]);
    ctx.fillStyle = g; ctx.fill(blade);
    // light across the blade, and its edge
    const sh = ctx.createLinearGradient(0, -20, 0, 20); sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)'); ctx.fillStyle = sh; ctx.fill(blade);
    ctx.strokeStyle = FL.fx === 'glass' ? 'rgba(230,250,255,0.9)' : 'rgba(0,0,0,0.55)'; ctx.lineWidth = FL.fx === 'glass' ? 1.4 : 2.2; ctx.stroke(blade); // the rails
    if (FL.fx === 'rays') { ctx.strokeStyle = 'rgba(255,205,180,0.65)'; ctx.lineWidth = 0.9; for (let k = 1; k < 12; k++) { const f = k / 12; ctx.beginPath(); ctx.moveTo(44, 0); ctx.quadraticCurveTo(40 + f * 60, -4, 40 + f * 118, -9 - Math.sin(f * Math.PI) * 8); ctx.stroke(); } }
    else if (FL.fx === 'bone') { for (let k = 0; k < 7; k++) { const x = 52 + k * 15, gg = ctx.createLinearGradient(0, -7, 0, 7); gg.addColorStop(0, '#fbfff8'); gg.addColorStop(1, '#a8b4ac'); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(x, 0, 6.5, 5 + k * 0.6, 0, 0, TAU); ctx.fill(); } ctx.strokeStyle = '#d8e4e8'; ctx.lineWidth = 0.8; for (let k = 0; k < 6; k++) { const x = 58 + k * 15; ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 3, 4); ctx.stroke(); } } // vertebrae and silver wire
    else if (FL.fx === 'glass') { ctx.strokeStyle = 'rgba(255,170,240,0.45)'; ctx.lineWidth = 1; for (const y of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(48, y * 0.5); ctx.quadraticCurveTo(100, y * 1.1, 154, y * 2.2); ctx.stroke(); } }
    else { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.2; for (const y of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(50, y * 0.6); ctx.quadraticCurveTo(100, y * 1.2, 150, y * 2.4); ctx.stroke(); } } // channels
    // the foot pocket, its heel strap and buckle
    const pg = ctx.createLinearGradient(0, -12, 0, 12); pg.addColorStop(0, '#2a2e32'); pg.addColorStop(0.5, '#16181b'); pg.addColorStop(1, '#0a0b0c');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(-6, 0, 0, 9); ctx.lineTo(46, 10); ctx.quadraticCurveTo(52, 0, 46, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(42, -8); ctx.stroke();
    ctx.fillStyle = FL.fx === 'vintage' ? '#6a5030' : '#222'; ctx.fillRect(-6, -3, 14, 6);
    ctx.fillStyle = FL.fx === 'vintage' ? '#c8a050' : '#8a9094'; ctx.fillRect(4, -4, 5, 8);
    if (FL.fx === 'vintage') { ctx.fillStyle = 'rgba(210,180,120,0.75)'; ctx.font = 'italic 9px Georgia'; ctx.fillText('No. 3', 70, 4); }
    ctx.restore();
  }
}
function tankPic(ctx, w, h, TL, def) {
  const u = Math.min(w / 46, h / 22); ctx.save(); ctx.translate(w * 0.5 - 16 * u, h * 0.5 + 12 * u);
  if (TL && TL.fx !== 'brass') drawSpecialTank(ctx, u, TL, 0.7);
  else {
    const n = def.arch === 'twin' || def.arch === 'side' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const y0 = (n === 2 ? -19 + i * 6.5 : -17.5) * u, hh = (n === 2 ? 6 : 11.5) * u, g = ctx.createLinearGradient(0, y0, 0, y0 + hh);
      g.addColorStop(0, '#4a3814'); g.addColorStop(0.3, '#b8984e'); g.addColorStop(0.6, '#86682e'); g.addColorStop(1, '#2e220c');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-2 * u, y0, 32 * u, hh, hh / 2); ctx.fill();
      ctx.fillStyle = 'rgba(40,28,8,0.5)'; ctx.fillRect(9 * u, y0, 0.8 * u, hh); ctx.fillRect(20 * u, y0, 0.8 * u, hh);
    }
    ctx.fillStyle = '#2a2016'; ctx.beginPath(); ctx.roundRect(29 * u, -15 * u, 4 * u, 6 * u, 1 * u); ctx.fill();
    ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(34 * u, -12 * u, 2.2 * u, 0, TAU); ctx.fill(); ctx.fillStyle = '#f0e4c8'; ctx.beginPath(); ctx.arc(34 * u, -12 * u, 1.5 * u, 0, TAU); ctx.fill(); // a pressure gauge
    ctx.strokeStyle = '#2a1e10'; ctx.lineWidth = 0.25 * u; ctx.beginPath(); ctx.moveTo(34 * u, -12 * u); ctx.lineTo(34.8 * u, -12.9 * u); ctx.stroke();
  }
  ctx.restore();
}
function bagPic(ctx, w, h, def) {
  const cx = w / 2, cy = h * 0.52, bw = h * 0.44, bh = h * 0.6, glow = def.glow;
  ctx.save();
  if (def.id === 'broodpouch') {
    const g = ctx.createRadialGradient(cx - bw * 0.2, cy - bh * 0.1, 0, cx, cy, bh * 0.7); g.addColorStop(0, '#d8b8b8'); g.addColorStop(0.6, '#a07a80'); g.addColorStop(1, '#5a3a42');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - bw * 0.35, cy - bh * 0.45); ctx.bezierCurveTo(cx - bw * 0.9, cy - bh * 0.1, cx - bw * 0.6, cy + bh * 0.5, cx, cy + bh * 0.5); ctx.bezierCurveTo(cx + bw * 0.6, cy + bh * 0.5, cx + bw * 0.9, cy - bh * 0.1, cx + bw * 0.35, cy - bh * 0.45); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#4a2a32';
    for (let k = 0; k < 7; k++) { const x = cx + Math.sin(k * 2.3) * bw * 0.35, y = cy + Math.cos(k * 1.7) * bh * 0.2; ctx.beginPath(); ctx.ellipse(x, y, bw * 0.07, bw * 0.04, k, 0, TAU); ctx.fill(); ctx.fillRect(x + bw * 0.05, y - bw * 0.01, bw * 0.06, bw * 0.02); } // little shapes inside, like seahorse fry
  } else if (def.id === 'stomach') {
    const g = ctx.createRadialGradient(cx, cy - bh * 0.1, 0, cx, cy, bh * 0.7); g.addColorStop(0, '#c89a7a'); g.addColorStop(0.6, '#8a5a40'); g.addColorStop(1, '#4a2818');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, bw * 0.75, bh * 0.45, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,30,15,0.5)'; ctx.lineWidth = h * 0.012; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(cx + k * bw * 0.18, cy, bw * 0.1, bh * 0.36, 0.3, 0.5, 2.6); ctx.stroke(); } // folds
    ctx.fillStyle = '#4a1a0e'; ctx.beginPath(); ctx.ellipse(cx - bw * 0.5, cy - bh * 0.32, bw * 0.16, bw * 0.1, 0.6, 0, TAU); ctx.fill();
  } else if (def.id === 'eelpurse') {
    const g = ctx.createLinearGradient(cx - bw, cy, cx + bw, cy); g.addColorStop(0, '#141a14'); g.addColorStop(0.45, '#2e3a2c'); g.addColorStop(0.55, '#3a4836'); g.addColorStop(1, '#10140e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(cx - bw * 0.7, cy - bh * 0.3, bw * 1.4, bh * 0.7, bh * 0.2); ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,130,0.3)'; ctx.lineWidth = h * 0.005; for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.arc(cx - bw * 0.6 + k * bw * 0.11, cy + bh * 0.05, bw * 0.06, Math.PI, TAU); ctx.stroke(); } // scales
    ctx.fillStyle = '#e8e4d0'; for (let k = 0; k < 9; k++) { const x = cx - bw * 0.4 + k * bw * 0.1; ctx.beginPath(); ctx.moveTo(x, cy - bh * 0.3); ctx.lineTo(x + bw * 0.04, cy - bh * 0.2); ctx.lineTo(x + bw * 0.08, cy - bh * 0.3); ctx.fill(); } // a clasp of teeth
  } else {
    // an Exotic satchel: waxed canvas, leather straps, brass rings
    const g = ctx.createLinearGradient(0, cy - bh * 0.3, 0, cy + bh * 0.4); g.addColorStop(0, '#8a7a52'); g.addColorStop(1, '#5a4c30');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(cx - bw * 0.75, cy - bh * 0.25, bw * 1.5, bh * 0.68, bh * 0.06); ctx.fill();
    ctx.fillStyle = '#6a5838'; ctx.beginPath(); ctx.moveTo(cx - bw * 0.78, cy - bh * 0.25); ctx.lineTo(cx + bw * 0.78, cy - bh * 0.25); ctx.lineTo(cx + bw * 0.7, cy + bh * 0.08); ctx.quadraticCurveTo(cx, cy + bh * 0.16, cx - bw * 0.7, cy + bh * 0.08); ctx.closePath(); ctx.fill(); // the flap
    ctx.fillStyle = '#4a3420'; for (const x of [-0.4, 0.4]) ctx.fillRect(cx + x * bw - bw * 0.05, cy - bh * 0.26, bw * 0.1, bh * 0.45);
    ctx.strokeStyle = '#c8a050'; ctx.lineWidth = h * 0.015; for (const x of [-0.4, 0.4]) { ctx.beginPath(); ctx.arc(cx + x * bw, cy + bh * 0.14, bw * 0.06, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(40,30,15,0.5)'; ctx.lineWidth = h * 0.006; ctx.setLineDash([h * 0.02, h * 0.015]); ctx.strokeRect(cx - bw * 0.7, cy - bh * 0.2, bw * 1.4, bh * 0.58); ctx.setLineDash([]); // stitching
  }
  ctx.restore();
}
function suitPic(ctx, w, h, def, legend) {
  // the suit, standing, in its own colours (a Legendary's seams glowing)
  ctx.save(); ctx.translate(w / 2, h * 0.5); ctx.rotate(-Math.PI / 2);
  drawEarl(ctx, h * 0.84, 0, 0, null, null, { kind: 'none', tier: 0, t: 0, suit: def.pal || def.look, bag: [], noTank: true, suitGlow: def.suitGlow });
  ctx.restore();
}
function sideToolPic(ctx, w, h, def, legend) {
  // the side tools: their usual drawing, then a Legendary's own parts over it
  const ic = toolIcon(def.kind, typeof def.look === 'number' ? def.look : 0, Math.round(w * 0.8), Math.round(h * 0.8));
  ctx.drawImage(ic, w * 0.1, h * 0.1);
  if (!legend) return;
  ctx.save();
  if (def.id === 'lamprey') { // a round mouth of teeth on the barrel's end
    const x = w * 0.78, y = h * 0.46, r = h * 0.16; ctx.fillStyle = '#4a3a3a'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8e0cc'; for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + ring * 0.2, r1 = r * (0.9 - ring * 0.3), r2 = r * (0.65 - ring * 0.3); ctx.beginPath(); ctx.moveTo(x + Math.cos(a - 0.1) * r1, y + Math.sin(a - 0.1) * r1); ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); ctx.lineTo(x + Math.cos(a + 0.1) * r1, y + Math.sin(a + 0.1) * r1); ctx.fill(); }
    ctx.fillStyle = '#100810'; ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, TAU); ctx.fill();
  } else if (def.id === 'narwhal') { // a spiralled tusk along the barrel
    ctx.translate(w * 0.12, h * 0.55); ctx.rotate(-0.12); const L = w * 0.82, g = ctx.createLinearGradient(0, -h * 0.05, 0, h * 0.05); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#c8bca0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -h * 0.045); ctx.lineTo(L, 0); ctx.lineTo(0, h * 0.045); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,70,0.55)'; ctx.lineWidth = h * 0.006; for (let k = 0; k < 16; k++) { const x = k / 16 * L, hh = h * 0.045 * (1 - x / L); ctx.beginPath(); ctx.moveTo(x, -hh); ctx.lineTo(x + L / 22, hh); ctx.stroke(); }
  } else if (def.id === 'barreleye') { // a clear dome with two green eyes looking up inside it
    const x = w * 0.5, y = h * 0.42, r = h * 0.2; const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); g.addColorStop(0, 'rgba(220,235,230,0.45)'); g.addColorStop(1, 'rgba(160,190,180,0.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, TAU); ctx.lineTo(x + r, y + r * 0.2); ctx.lineTo(x - r, y + r * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5aa070'; for (const dx of [-0.35, 0.35]) { ctx.beginPath(); ctx.ellipse(x + dx * r, y - r * 0.15, r * 0.16, r * 0.3, 0, 0, TAU); ctx.fill(); }
  } else if (def.id === 'flashlightfish') { // two living light organs in place of strobes
    for (const [x, y] of [[w * 0.24, h * 0.24], [w * 0.76, h * 0.24]]) { const g = ctx.createRadialGradient(x, y, 0, x, y, h * 0.14); g.addColorStop(0, 'rgba(225,240,245,0.75)'); g.addColorStop(0.3, 'rgba(150,200,220,0.35)'); g.addColorStop(1, 'rgba(150,200,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, h * 0.09, 0, TAU); ctx.fill(); } // its two light organs, the only light it has
  }
  ctx.restore();
}

// the whole picture: just the thing, on the background every picture shares
export function drawSpecialPicture(ctx, def, w, h) {
  const legend = def.rarity === 'legendary';
  if (def.kind === 'net') { const ic = toolIcon('net', def.look, Math.round(w * 0.86), Math.round(h * 0.86)); ctx.drawImage(ic, w * 0.07, h * 0.07); }
  else if (def.kind === 'fins') finsPic(ctx, w, h, def.finLook, legend);
  else if (def.kind === 'tank') tankPic(ctx, w, h, def.tankLook, def);
  else if (def.kind === 'bag') bagPic(ctx, w, h, def);
  else if (def.kind === 'suit') suitPic(ctx, w, h, def, legend);
  else sideToolPic(ctx, w, h, def, legend);
}
