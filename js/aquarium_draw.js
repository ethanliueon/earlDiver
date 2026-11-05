// Earl's aquarium as seen from the water: a building on the far shore at the horizon. It grows a
// section for every wing built. s = pixels per metre (it is far away, so small). Origin: the
// ground in the middle of the site; the building rises toward -y.
import { TAU, clamp } from './util.js';

const W = { reef: 26, kelp: 9, open: 22, twilight: 16, deep: 16, abyss: 7 };

export function drawAquarium(ctx, s, wings, t, day, nVisitors) {
  const has = (w) => wings.includes(w);
  const night = clamp(1 - day * 1.6, 0, 1);
  const lit = (a = 1) => `rgba(255,214,150,${(0.85 * night * a).toFixed(3)})`;
  // the shore: a low strip of dunes the building stands on
  const span = 120 * s;
  const sg = ctx.createLinearGradient(0, -3 * s, 0, 2 * s);
  sg.addColorStop(0, '#b8ab86'); sg.addColorStop(1, '#8a7f60');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.moveTo(-span, 1 * s);
  for (let x = -span; x <= span; x += 6 * s) ctx.lineTo(x, -1.5 * s - Math.sin(x / s * 0.21) * 0.8 * s - Math.sin(x / s * 0.07) * 0.9 * s);
  ctx.lineTo(span, 1 * s); ctx.closePath(); ctx.fill();
  // dune grass
  ctx.strokeStyle = 'rgba(110,120,70,0.8)'; ctx.lineWidth = Math.max(0.6, 0.15 * s);
  for (let k = -40; k < 40; k += 3) { const x = k * 3 * s; ctx.beginPath(); ctx.moveTo(x, -1.5 * s); ctx.lineTo(x + Math.sin(t + k) * 0.4 * s, -3 * s); ctx.stroke(); }

  if (!wings.length) {
    // the empty plot: a fence and a sign
    ctx.strokeStyle = '#5a5040'; ctx.lineWidth = Math.max(0.8, 0.25 * s);
    for (let x = -14; x <= 14; x += 3.5) { ctx.beginPath(); ctx.moveTo(x * s, -1.5 * s); ctx.lineTo(x * s, -3.6 * s); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-14 * s, -3 * s); ctx.lineTo(14 * s, -3 * s); ctx.stroke();
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(-4 * s, -8 * s, 8 * s, 3.5 * s);
    ctx.fillStyle = '#5a5040'; ctx.fillRect(-0.2 * s, -4.5 * s, 0.4 * s, 3 * s);
    return;
  }
  // order along the shore, left to right: kelp tower, the hall, the dome, the galleries, the abyss tower
  const order = ['abyss', 'kelp', 'reef', 'open', 'twilight', 'deep'].filter(has);
  let total = order.reduce((a, w) => a + W[w] + 2, 0);
  let x = -total / 2 * s;
  const ground = -1.6 * s;
  for (const w of order) {
    const ww = W[w] * s;
    if (w === 'reef') {
      // the main hall: a white block with a curved glass roof, a canopy over the doors, the sign
      const h = 9 * s;
      ctx.fillStyle = '#e6e2d8'; ctx.fillRect(x, ground - h, ww, h);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x, ground - h, ww * 0.06, h);
      const rg = ctx.createLinearGradient(0, ground - h - 5 * s, 0, ground - h);
      rg.addColorStop(0, '#a8d4e4'); rg.addColorStop(1, '#5a98b4');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x, ground - h); ctx.quadraticCurveTo(x + ww / 2, ground - h - 9 * s, x + ww, ground - h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(0.5, 0.1 * s);
      for (let k = 1; k < 8; k++) { const px = x + ww * k / 8; ctx.beginPath(); ctx.moveTo(px, ground - h); ctx.lineTo(px, ground - h - Math.sin(Math.PI * k / 8) * 4.5 * s); ctx.stroke(); }
      // windows: a band of blue tank glass
      ctx.fillStyle = night > 0.1 ? lit() : '#3c6a80';
      for (let k = 0; k < 6; k++) ctx.fillRect(x + ww * (0.08 + k * 0.15), ground - h * 0.72, ww * 0.1, h * 0.3);
      // doors and canopy
      ctx.fillStyle = '#2a3238'; ctx.fillRect(x + ww * 0.44, ground - 3.4 * s, ww * 0.12, 3.4 * s);
      ctx.fillStyle = '#2f5c70'; ctx.fillRect(x + ww * 0.36, ground - 4 * s, ww * 0.28, 0.6 * s);
      // the sign along the parapet
      ctx.fillStyle = '#1e3a4a'; ctx.fillRect(x + ww * 0.22, ground - h + 0.6 * s, ww * 0.56, 1.8 * s);
      ctx.fillStyle = '#f0ead8'; ctx.font = `600 ${Math.max(5, 1.3 * s)}px "EB Garamond", Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (s > 2.5) ctx.fillText("EARL'S AQUARIUM", x + ww / 2, ground - h + 1.55 * s);
    } else if (w === 'kelp') {
      // a tall glass cylinder with kelp inside, ringed by steel bands
      const h = 20 * s;
      const g = ctx.createLinearGradient(x, 0, x + ww, 0);
      g.addColorStop(0, '#2c5a48'); g.addColorStop(0.45, '#5a9a7a'); g.addColorStop(1, '#1e4234');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, ground - h, ww, h, [ww / 2, ww / 2, 0, 0]); ctx.fill();
      ctx.strokeStyle = 'rgba(40,80,40,0.8)'; ctx.lineWidth = Math.max(0.6, 0.3 * s);
      for (let k = 0; k < 3; k++) { const kx = x + ww * (0.25 + k * 0.25); ctx.beginPath(); ctx.moveTo(kx, ground); ctx.quadraticCurveTo(kx + Math.sin(t * 0.6 + k) * 1.5 * s, ground - h * 0.5, kx, ground - h * 0.85); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,34,36,0.8)'; for (let k = 1; k < 5; k++) ctx.fillRect(x, ground - h * k / 5, ww, 0.4 * s);
      if (night > 0.1) { ctx.fillStyle = `rgba(150,230,190,${(0.35 * night).toFixed(3)})`; ctx.fillRect(x + ww * 0.2, ground - h * 0.9, ww * 0.6, h * 0.85); }
    } else if (w === 'open') {
      // a great glass dome on a low drum
      const h = 4 * s;
      ctx.fillStyle = '#d8d4ca'; ctx.fillRect(x, ground - h, ww, h);
      const dg = ctx.createRadialGradient(x + ww * 0.38, ground - h - ww * 0.32, ww * 0.05, x + ww / 2, ground - h, ww * 0.55);
      dg.addColorStop(0, '#d8eef4'); dg.addColorStop(0.6, '#4a8ab0'); dg.addColorStop(1, '#244e68');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(x + ww / 2, ground - h, ww / 2, ww * 0.42, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.5, 0.1 * s);
      for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + ww / 2, ground - h, ww / 2 * k / 5, ww * 0.42, 0, Math.PI, TAU); ctx.stroke(); }
      if (night > 0.1) { ctx.fillStyle = `rgba(110,190,240,${(0.4 * night).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x + ww / 2, ground - h, ww * 0.4, ww * 0.3, 0, Math.PI, TAU); ctx.fill(); }
    } else if (w === 'twilight' || w === 'deep') {
      // dark galleries: low blocks of black glass, the deep one with round portholes
      const h = (w === 'deep' ? 10 : 8) * s;
      ctx.fillStyle = w === 'deep' ? '#16191c' : '#1e2a3a'; ctx.fillRect(x, ground - h, ww, h);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, ground - h, ww, 0.5 * s);
      if (w === 'deep') {
        for (let k = 0; k < 4; k++) {
          const px = x + ww * (0.15 + k * 0.23), py = ground - h * 0.55;
          ctx.fillStyle = '#3a3e42'; ctx.beginPath(); ctx.arc(px, py, 1.5 * s, 0, TAU); ctx.fill();
          ctx.fillStyle = `rgba(120,255,210,${(0.35 + 0.5 * night).toFixed(3)})`; ctx.beginPath(); ctx.arc(px, py, 1.05 * s, 0, TAU); ctx.fill();
        }
      } else {
        ctx.fillStyle = `rgba(90,120,200,${(0.3 + 0.5 * night).toFixed(3)})`;
        for (let k = 0; k < 4; k++) ctx.fillRect(x + ww * (0.08 + k * 0.23), ground - h * 0.66, ww * 0.16, h * 0.3);
      }
    } else if (w === 'abyss') {
      // a slim black tower, a slow red light at the top
      const h = 26 * s;
      ctx.fillStyle = '#0e1012'; ctx.beginPath(); ctx.moveTo(x, ground); ctx.lineTo(x + ww * 0.15, ground - h); ctx.lineTo(x + ww * 0.85, ground - h); ctx.lineTo(x + ww, ground); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + ww * 0.2, ground - h, ww * 0.08, h);
      const blink = 0.4 + 0.6 * Math.max(0, Math.sin(t * 0.8));
      const rg = ctx.createRadialGradient(x + ww / 2, ground - h - 0.6 * s, 0, x + ww / 2, ground - h - 0.6 * s, 4 * s);
      rg.addColorStop(0, `rgba(255,60,40,${blink.toFixed(3)})`); rg.addColorStop(1, 'rgba(255,40,30,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x + ww / 2, ground - h - 0.6 * s, 4 * s, 0, TAU); ctx.fill();
    }
    x += ww + 2 * s;
  }
  // visitors on the promenade by day: small dark figures strolling, some stopping
  if (day > 0.35 && s > 1.5) {
    const n = Math.min(40, nVisitors);
    ctx.fillStyle = 'rgba(40,40,46,0.85)';
    for (let i = 0; i < n; i++) {
      const h1 = Math.abs(Math.sin(i * 12.9898) * 43758.5) % 1, h2 = Math.abs(Math.sin(i * 78.233) * 12345.6) % 1;
      const px = (-total / 2 - 6 + ((h1 * (total + 12) + t * (0.4 + h2 * 0.6) * (h2 < 0.5 ? 1 : -1)) % (total + 12) + total + 12) % (total + 12)) * s;
      const ph = (1.5 + h2 * 0.35) * s;
      ctx.fillRect(px, ground - ph, 0.45 * s, ph);
      ctx.beginPath(); ctx.arc(px + 0.22 * s, ground - ph - 0.3 * s, 0.32 * s, 0, TAU); ctx.fill();
    }
  }
}
