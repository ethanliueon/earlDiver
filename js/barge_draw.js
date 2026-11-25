// (7.6.23, owner) the shipyard: a working steel barge moored off the Margaret's bow, painted once into a picture (as the
// boat is) and laid in each frame. A low riveted hull, rust-streaked, red below the waterline, old tyres on ropes along
// her side; on deck a chain rail, bollards, a stack of hull plates, oil drums, gas bottles strapped to a rack, a coil of
// rope, the yard's tin shed with its door and window, and a dark steel derrick with a plate hanging off its hook. The
// yard's board is weathered planks between two posts on the shed, lettered by hand. Day and night pictures.
export const BARGE = { PPM: 64, W: 14, H: 8, WL: 5.4, X0: 1 }; // metres; WL: the waterline from the picture's top; X0: the hull's left end

const cache = {};
export function bargePicture(night = false) {
  const key = night ? 'n' : 'd'; if (cache[key]) return cache[key];
  const { PPM: k, W, H, WL } = BARGE, c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const x = c.getContext('2d'); x.scale(k, k); x.lineJoin = 'round'; x.lineCap = 'round';
  let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const L0 = 1, L1 = 13, deck = WL - 1.0, keel = WL + 1.15;
  // ---- the hull ----
  const hull = new Path2D(); hull.moveTo(L0 - 0.5, deck); hull.lineTo(L1 + 0.5, deck); hull.bezierCurveTo(L1 + 0.35, deck + 1.0, L1 - 0.2, keel, L1 - 1.0, keel); hull.lineTo(L0 + 1.0, keel); hull.bezierCurveTo(L0 + 0.2, keel, L0 - 0.35, deck + 1.0, L0 - 0.5, deck); hull.closePath();
  let gr = x.createLinearGradient(0, deck, 0, keel); gr.addColorStop(0, '#6e7464'); gr.addColorStop(0.35, '#5a604f'); gr.addColorStop(1, '#2c302a'); x.fillStyle = gr; x.fill(hull);
  x.save(); x.clip(hull);
  x.fillStyle = '#6a2a1e'; x.fillRect(0, WL - 0.02, W, 3); x.fillStyle = '#2a2622'; x.fillRect(0, WL - 0.2, W, 0.18); // red below the waterline, a dark boot-top
  x.strokeStyle = 'rgba(18,18,14,0.35)'; x.lineWidth = 0.035; for (let px = L0 + 1.1; px < L1; px += 1.45) { x.beginPath(); x.moveTo(px, deck); x.lineTo(px + 0.03, keel); x.stroke(); } // plate seams
  x.beginPath(); x.moveTo(L0 - 0.4, deck + 0.55); x.lineTo(L1 + 0.4, deck + 0.55); x.stroke();
  x.fillStyle = 'rgba(20,20,16,0.55)'; for (let px = L0 + 0.3; px < L1; px += 0.29) { x.beginPath(); x.arc(px, deck + 0.14, 0.028, 0, Math.PI * 2); x.fill(); } // a row of rivets under the rail
  for (let i = 0; i < 16; i++) { const rx = L0 + 0.4 + rnd() * 11.4, ln = 0.25 + rnd() * 0.75, rg = x.createLinearGradient(0, deck + 0.1, 0, deck + 0.1 + ln); rg.addColorStop(0, 'rgba(132,66,30,0.7)'); rg.addColorStop(1, 'rgba(132,66,30,0)'); x.fillStyle = rg; x.fillRect(rx, deck + 0.1, 0.05 + rnd() * 0.06, ln); } // rust runs
  for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(${rnd() < 0.5 ? '30,30,24' : '120,124,108'},${(0.12 + rnd() * 0.12).toFixed(2)})`; x.beginPath(); x.ellipse(L0 + 0.6 + rnd() * 11, deck + 0.25 + rnd() * 0.6, 0.15 + rnd() * 0.4, 0.06 + rnd() * 0.12, 0, 0, Math.PI * 2); x.fill(); } // scuffs and patches
  x.restore();
  x.strokeStyle = 'rgba(14,14,10,0.6)'; x.lineWidth = 0.03; x.stroke(hull);
  x.strokeStyle = '#33352c'; x.lineWidth = 0.14; x.beginPath(); x.moveTo(L0 - 0.45, deck + 0.06); x.lineTo(L1 + 0.45, deck + 0.06); x.stroke(); // rubbing strake
  x.strokeStyle = 'rgba(200,200,180,0.25)'; x.lineWidth = 0.03; x.beginPath(); x.moveTo(L0 - 0.45, deck); x.lineTo(L1 + 0.45, deck); x.stroke();
  for (const tx of [L0 + 1.6, L0 + 4.6, L0 + 7.6, L0 + 10.4]) { x.strokeStyle = '#4a3e2a'; x.lineWidth = 0.035; x.beginPath(); x.moveTo(tx, deck + 0.05); x.lineTo(tx, deck + 0.25); x.stroke();
    x.fillStyle = '#141414'; x.beginPath(); x.ellipse(tx, deck + 0.5, 0.2, 0.28, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#2b2b2a'; x.beginPath(); x.ellipse(tx, deck + 0.5, 0.08, 0.13, 0, 0, Math.PI * 2); x.fill(); } // tyres on ropes
  // ---- on deck ----
  const D = deck - 0.02;
  x.strokeStyle = '#3c3e34'; x.lineWidth = 0.05; for (let px = L0 + 0.2; px <= L1 - 0.2; px += 1.2) { x.beginPath(); x.moveTo(px, D); x.lineTo(px, D - 0.55); x.stroke(); } // stanchions
  x.lineWidth = 0.025; x.beginPath(); for (let px = L0 + 0.2; px < L1 - 1.3; px += 1.2) { x.moveTo(px, D - 0.5); x.quadraticCurveTo(px + 0.6, D - 0.38, px + 1.2, D - 0.5); } x.stroke(); // a chain rail sagging between them
  for (const bx of [L0 + 0.5, L1 - 0.5]) { x.fillStyle = '#26271f'; x.fillRect(bx - 0.13, D - 0.28, 0.26, 0.28); x.fillRect(bx - 0.18, D - 0.34, 0.36, 0.08); } // bollards
  // the yard's tin shed, toward her stern: corrugated walls, a door, a window lit warm at night
  const s0 = L1 - 4.3, s1 = L1 - 1.2, sTop = D - 2.0;
  x.fillStyle = '#7a7f6c'; x.fillRect(s0, sTop, s1 - s0, D - sTop);
  x.strokeStyle = 'rgba(30,32,26,0.35)'; x.lineWidth = 0.02; for (let px = s0 + 0.1; px < s1; px += 0.13) { x.beginPath(); x.moveTo(px, sTop); x.lineTo(px, D); x.stroke(); } // corrugations
  gr = x.createLinearGradient(s0, 0, s1, 0); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = gr; x.fillRect(s0, sTop, s1 - s0, D - sTop);
  x.fillStyle = '#4c4f43'; x.beginPath(); x.moveTo(s0 - 0.2, sTop + 0.05); x.lineTo(s1 + 0.2, sTop - 0.12); x.lineTo(s1 + 0.2, sTop + 0.04); x.lineTo(s0 - 0.2, sTop + 0.2); x.closePath(); x.fill(); // the sloped roof
  x.fillStyle = '#2e3028'; x.fillRect(s0 + 0.35, D - 1.45, 0.75, 1.45); x.fillStyle = '#8a7a52'; x.beginPath(); x.arc(s0 + 0.98, D - 0.75, 0.04, 0, Math.PI * 2); x.fill(); // the door and its handle
  x.fillStyle = night ? '#d8b878' : '#3a4a52'; x.fillRect(s0 + 1.6, D - 1.45, 0.9, 0.6); x.strokeStyle = '#2a2a22'; x.lineWidth = 0.06; x.strokeRect(s0 + 1.6, D - 1.45, 0.9, 0.6); x.beginPath(); x.moveTo(s0 + 2.05, D - 1.45); x.lineTo(s0 + 2.05, D - 0.85); x.stroke(); // the window
  for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(130,66,30,0.45)'; x.fillRect(s0 + 0.2 + i * 0.75 + rnd() * 0.3, sTop + 0.2, 0.04, 0.3 + rnd() * 0.5); }
  // the yard's board: three weathered planks on two posts above the shed, the name painted by hand
  const bL = s0 - 0.1, bR = s1 + 0.1, bT = sTop - 1.15, bB = sTop - 0.25;
  x.fillStyle = '#3a2e20'; x.fillRect(bL + 0.35, bB - 0.05, 0.12, 0.38); x.fillRect(bR - 0.47, bB - 0.05, 0.12, 0.38); // posts
  for (let i = 0; i < 3; i++) { const py = bT + i * (bB - bT) / 3, ph = (bB - bT) / 3 - 0.02; gr = x.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, i === 1 ? '#5e4a32' : '#644e34'); gr.addColorStop(1, '#4a3a28'); x.fillStyle = gr; x.fillRect(bL, py, bR - bL, ph);
    x.strokeStyle = 'rgba(30,22,12,0.35)'; x.lineWidth = 0.012; for (let j = 0; j < 3; j++) { x.beginPath(); x.moveTo(bL, py + 0.05 + j * 0.08 + rnd() * 0.02); x.bezierCurveTo(bL + 1, py + 0.04 + j * 0.08, bL + 2, py + 0.08 + j * 0.08, bR, py + 0.06 + j * 0.08); x.stroke(); } } // grain
  x.strokeStyle = '#2c2216'; x.lineWidth = 0.05; x.strokeRect(bL, bT, bR - bL, bB - bT);
  x.fillStyle = '#1e1810'; for (const [nx, ny] of [[bL + 0.12, bT + 0.12], [bR - 0.12, bT + 0.12], [bL + 0.12, bB - 0.12], [bR - 0.12, bB - 0.12]]) { x.beginPath(); x.arc(nx, ny, 0.035, 0, Math.PI * 2); x.fill(); } // nail heads
  x.save(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 0.46px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '0.06px';
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillText('SHIPYARD', (bL + bR) / 2 + 0.02, bT + 0.36 + 0.02); x.fillStyle = '#e6dcc0'; x.fillText('SHIPYARD', (bL + bR) / 2, bT + 0.36);
  x.font = '500 0.2px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; if ('letterSpacing' in x) x.letterSpacing = '0.02px'; x.fillStyle = '#d4c8a6'; x.fillText('SUBS  ·  REFITS  ·  HULL WORK', (bL + bR) / 2, bT + 0.72); x.restore();
  x.fillStyle = 'rgba(240,230,200,0.08)'; x.fillRect(bL + 0.6, bT + 0.15, 0.5, 0.6); // a worn, sun-bleached patch
  // a stack of hull plates toward her bow, each a little askew, edges lit
  for (let i = 0; i < 5; i++) { const py = D - 0.1 - i * 0.12, px = L0 + 1.0 + (i % 2) * 0.12; x.fillStyle = ['#5c6253', '#646a5a', '#575c4e', '#6a7060', '#5e6455'][i]; x.fillRect(px, py - 0.1, 2.6, 0.1); x.fillStyle = 'rgba(220,220,200,0.25)'; x.fillRect(px, py - 0.1, 2.6, 0.018); }
  // oil drums and a gas-bottle rack
  for (const [dx, cl] of [[L0 + 4.0, '#6a3424'], [L0 + 4.55, '#4a5a44']]) { x.fillStyle = cl; x.fillRect(dx, D - 0.85, 0.48, 0.85); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 0.025; for (const yy of [0.25, 0.6]) { x.beginPath(); x.moveTo(dx, D - yy); x.lineTo(dx + 0.48, D - yy); x.stroke(); } gr = x.createLinearGradient(dx, 0, dx + 0.48, 0); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = gr; x.fillRect(dx, D - 0.85, 0.48, 0.85); }
  for (let i = 0; i < 3; i++) { const gx = L0 + 5.4 + i * 0.22; x.fillStyle = i === 1 ? '#3e5248' : '#5a4a3a'; x.beginPath(); x.roundRect(gx, D - 1.1, 0.17, 1.1, 0.08); x.fill(); x.fillStyle = '#2a2a24'; x.fillRect(gx + 0.05, D - 1.2, 0.07, 0.12); }
  x.strokeStyle = '#3a3a30'; x.lineWidth = 0.05; x.strokeRect(L0 + 5.33, D - 0.8, 0.75, 0.0001); x.beginPath(); x.moveTo(L0 + 5.33, D - 0.8); x.lineTo(L0 + 6.1, D - 0.8); x.stroke(); // the rack's strap
  // a coil of rope
  x.strokeStyle = '#8a7650'; x.lineWidth = 0.05; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(L0 + 6.6, D - 0.1 - i * 0.05, 0.42 - i * 0.05, 0.1, 0, 0, Math.PI * 2); x.stroke(); }
  // the derrick: a dark steel mast with cross-bracing, a jib out over the water, a wire to the hook and a plate on it
  const mx = L0 + 7.6, mTop = D - 4.3, jx = L0 + 3.2, jy = mTop + 0.35;
  x.strokeStyle = '#2f332c'; x.lineWidth = 0.16; x.beginPath(); x.moveTo(mx - 0.18, D); x.lineTo(mx - 0.05, mTop); x.moveTo(mx + 0.18, D); x.lineTo(mx + 0.05, mTop); x.stroke();
  x.lineWidth = 0.04; x.beginPath(); for (let i = 0; i < 6; i++) { const ya = D - i * 0.7, yb = D - (i + 1) * 0.7; x.moveTo(mx - 0.17, ya); x.lineTo(mx + 0.15, yb); } x.stroke();
  x.lineWidth = 0.12; x.beginPath(); x.moveTo(mx, D - 0.9); x.lineTo(jx, jy); x.stroke(); x.lineWidth = 0.03; x.beginPath(); x.moveTo(mx, mTop); x.lineTo(jx + 0.1, jy); x.stroke(); // jib and its stay
  x.strokeStyle = '#1e1f1a'; x.lineWidth = 0.02; x.beginPath(); x.moveTo(jx, jy); x.lineTo(jx, jy + 2.0); x.stroke();
  x.fillStyle = '#2a2b24'; x.fillRect(jx - 0.1, jy + 2.0, 0.2, 0.22); x.strokeStyle = '#2a2b24'; x.lineWidth = 0.04; x.beginPath(); x.arc(jx, jy + 2.32, 0.08, 0, Math.PI); x.stroke();
  x.fillStyle = '#62685a'; x.save(); x.translate(jx, jy + 2.4); x.rotate(0.05); x.fillRect(-0.6, 0, 1.2, 0.5); x.fillStyle = 'rgba(132,66,30,0.4)'; x.fillRect(-0.4, 0.15, 0.04, 0.3); x.restore(); // a plate on the hook
  x.fillStyle = '#26271f'; x.fillRect(mx - 0.35, D - 0.55, 0.7, 0.4); x.fillStyle = '#4a4636'; x.beginPath(); x.arc(mx, D - 0.35, 0.16, 0, Math.PI * 2); x.fill(); // the winch at its foot
  if (night) { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const y = o.getContext('2d'); y.drawImage(c, 0, 0); y.globalCompositeOperation = 'source-atop'; y.fillStyle = 'rgba(8,12,20,0.5)'; y.fillRect(0, 0, o.width, o.height);
    y.globalCompositeOperation = 'source-over'; y.fillStyle = '#d8b878'; y.fillRect((s0 + 1.6) * k, (D - 1.45) * k, 0.9 * k, 0.6 * k); cache[key] = o; return o; } // the shed's window still lit
  cache[key] = c; return c;
}
