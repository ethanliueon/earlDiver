// Procedural renderers for every creature. Each draws in local space:
// origin at the body centre, facing +x, total length L pixels.
// Style goal: natural, layered, slightly translucent fins, countershading,
// soft specular light from above - never flat clip-art fills.
import { hexToRgb, rgbStr, mixRgb, shade, rgba, TAU, clamp } from './util.js';

const PI = Math.PI;

function bodyGradient(ctx, top, bot, c0, c1) {
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, shade(c0, -0.25));
  g.addColorStop(0.35, c0);
  g.addColorStop(0.62, c1);
  g.addColorStop(1, shade(c1, 0.12));
  return g;
}
function overlayShading(ctx, top, bot) {
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.0)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  return g;
}
function eye(ctx, x, y, r, col = '#d8d2b8', glint = true) {
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath(); ctx.arc(x, y, r * 1.12, 0, TAU); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#060606';
  ctx.beginPath(); ctx.arc(x + r * 0.08, y, r * 0.62, 0, TAU); ctx.fill();
  if (glint) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.22, 0, TAU); ctx.fill();
  }
}

// ---------- generic bony fish ----------
// Profile: half-heights along the body (u: 0 nose -> 1 tail base)
function profile(u, v) {
  const blunt = v.blunt ? 0.35 : 0;
  const nose = Math.pow(Math.sin(PI * clamp(u, 0, 1) * 0.5 + 0.0001), 0.55 - blunt * 0.4);
  const tail = Math.pow(Math.cos(PI * 0.5 * Math.pow(clamp(u, 0, 1), 1.6)), 0.9);
  return Math.max(0.06, nose * tail * 0.95 + 0.05);
}
function fishOutline(ctx, L, v, t, swim) {
  const H = L * v.h;
  const bodyL = L * 0.78; // tail fin takes the rest
  const x0 = -L / 2, steps = 22;
  const top = [], bot = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    let p = profile(u, v);
    if (v.hump && u < 0.3) p *= 1 + 0.18 * Math.sin((u / 0.3) * PI);
    const bend = Math.sin(t * 6 * swim - u * 3) * u * u * L * 0.025 * swim;
    const x = x0 + u * bodyL;
    top.push([x, -H / 2 * p * 1.02 + bend]);
    bot.push([x, H / 2 * p * (v.belly ? 1.15 : 0.98) + bend]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i][0], top[i][1]);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
  return { H, bodyL, x0, top, bot, tailX: x0 + bodyL, tailY: top[steps][1] * 0 + (top[steps][1] + bot[steps][1]) / 2 };
}
function finPath(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
function drawTail(ctx, o, L, v, t, swim, col) {
  const tx = o.tailX, ty = o.tailY;
  const flex = 0.55 + 0.45 * Math.abs(Math.cos(t * 6 * swim)); // foreshortening as it sweeps
  const tl = L * 0.24 * flex;
  const th = L * Math.max(v.h, 0.22) * 0.55 * (v.t === 'lunate' ? 1.15 : 1);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(tx - L * 0.02, ty - th * 0.12);
  switch (v.t) {
    case 'fork':
      ctx.quadraticCurveTo(tx + tl * 0.5, ty - th * 0.4, tx + tl, ty - th * 0.62);
      ctx.lineTo(tx + tl * 0.48, ty);
      ctx.lineTo(tx + tl, ty + th * 0.62);
      ctx.quadraticCurveTo(tx + tl * 0.5, ty + th * 0.4, tx - L * 0.02, ty + th * 0.12);
      break;
    case 'lunate':
      ctx.quadraticCurveTo(tx + tl * 0.6, ty - th * 0.3, tx + tl * 1.05, ty - th * 0.75);
      ctx.quadraticCurveTo(tx + tl * 0.55, ty - th * 0.1, tx + tl * 0.35, ty);
      ctx.quadraticCurveTo(tx + tl * 0.55, ty + th * 0.1, tx + tl * 1.05, ty + th * 0.75);
      ctx.quadraticCurveTo(tx + tl * 0.6, ty + th * 0.3, tx - L * 0.02, ty + th * 0.12);
      break;
    case 'round':
      ctx.bezierCurveTo(tx + tl * 0.4, ty - th * 0.55, tx + tl * 1.05, ty - th * 0.45, tx + tl * 1.0, ty);
      ctx.bezierCurveTo(tx + tl * 1.05, ty + th * 0.45, tx + tl * 0.4, ty + th * 0.55, tx - L * 0.02, ty + th * 0.12);
      break;
    case 'coel':
      ctx.lineTo(tx + tl * 0.7, ty - th * 0.45);
      ctx.lineTo(tx + tl * 0.75, ty - th * 0.1);
      ctx.lineTo(tx + tl * 1.1, ty - th * 0.08);
      ctx.lineTo(tx + tl * 1.1, ty + th * 0.08);
      ctx.lineTo(tx + tl * 0.75, ty + th * 0.1);
      ctx.lineTo(tx + tl * 0.7, ty + th * 0.45);
      ctx.lineTo(tx - L * 0.02, ty + th * 0.12);
      break;
    default: // truncate
      ctx.lineTo(tx + tl * 0.85, ty - th * 0.5);
      ctx.quadraticCurveTo(tx + tl * 0.95, ty, tx + tl * 0.85, ty + th * 0.5);
      ctx.lineTo(tx - L * 0.02, ty + th * 0.12);
  }
  ctx.closePath();
  ctx.fill();
  // fin rays
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = Math.max(0.5, L * 0.004);
  ctx.beginPath();
  for (let k = -3; k <= 3; k++) { ctx.moveTo(tx, ty); ctx.lineTo(tx + tl * 0.85, ty + th * 0.16 * k); }
  ctx.stroke();
}

function patternFish(ctx, o, L, v) {
  const H = o.H, x0 = o.x0, bl = o.bodyL;
  const pc = v.pc || '#222';
  ctx.save();
  switch (v.p) {
    case 'bands': {
      const n = v.n || 3;
      for (let i = 0; i < n; i++) {
        const x = x0 + bl * (0.18 + (i / Math.max(1, n - 1 || 1)) * 0.68) - (n === 1 ? 0 : 0);
        const w = bl * (n > 6 ? 0.03 : 0.07);
        if (v.edge) { ctx.fillStyle = v.edge; ctx.fillRect(x - w * 0.75, -H, w * 1.5, H * 2); }
        ctx.fillStyle = pc; ctx.fillRect(x - w / 2, -H, w, H * 2);
      }
      break;
    }
    case 'bars': {
      ctx.globalAlpha = 0.45; ctx.fillStyle = pc;
      for (let i = 0; i < 9; i++) { const x = x0 + bl * (0.2 + i * 0.08); ctx.fillRect(x, -H, bl * 0.025, H * 0.9); }
      break;
    }
    case 'stripes': {
      const n = v.n || 5;
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.05;
      for (let i = 0; i < n; i++) {
        const y = -H * 0.42 + (i / (n - 1)) * H * 0.8;
        ctx.beginPath(); ctx.moveTo(x0, y + H * 0.1); ctx.quadraticCurveTo(x0 + bl * 0.5, y - H * 0.08, x0 + bl, y * 0.3); ctx.stroke();
      }
      break;
    }
    case 'stripe1': {
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.16;
      ctx.beginPath(); ctx.moveTo(x0 + bl * 0.05, 0); ctx.lineTo(x0 + bl * 1.1, 0); ctx.stroke();
      break;
    }
    case 'bellystripes': {
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.05;
      for (let i = 0; i < 4; i++) { const y = H * (0.05 + i * 0.09); ctx.beginPath(); ctx.moveTo(x0 + bl * 0.3, y); ctx.lineTo(x0 + bl, y * 0.4); ctx.stroke(); }
      break;
    }
    case 'spots': case 'dots': case 'bellyspots': {
      ctx.fillStyle = pc;
      const big = v.p === 'bellyspots' ? 0.13 : v.p === 'spots' ? 0.05 : 0.03;
      let seed = 7;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < (v.p === 'bellyspots' ? 7 : 40); i++) {
        const x = x0 + bl * (0.15 + rnd() * 0.85), y = (rnd() - (v.p === 'bellyspots' ? -0.1 : 0.5)) * H * 0.9;
        ctx.beginPath(); ctx.arc(x, y, H * big * (0.6 + rnd() * 0.6), 0, TAU); ctx.fill();
      }
      break;
    }
    case 'mottle': {
      ctx.fillStyle = pc; ctx.globalAlpha = 0.5;
      let seed = 3;
      const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let i = 0; i < 30; i++) {
        const x = x0 + bl * rnd(), y = (rnd() - 0.5) * H;
        ctx.beginPath(); ctx.ellipse(x, y, H * (0.08 + rnd() * 0.12), H * (0.05 + rnd() * 0.08), rnd() * 3, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'chev': {
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.025; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 8; i++) { const x = x0 + bl * (0.2 + i * 0.09); ctx.beginPath(); ctx.moveTo(x - H * 0.2, -H * 0.5); ctx.lineTo(x, 0); ctx.lineTo(x - H * 0.2, H * 0.5); ctx.stroke(); }
      ctx.fillStyle = '#e8c22a'; ctx.globalAlpha = 0.9; ctx.fillRect(x0 + bl * 0.75, -H, bl * 0.4, H * 2);
      break;
    }
    case 'swirl': {
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.06;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x0 + bl * (0.2 + i * 0.11), (i % 2 ? -1 : 1) * H * 0.1, H * 0.18, 0, PI * 1.4); ctx.stroke(); }
      break;
    }
    case 'palette': {
      ctx.fillStyle = pc;
      ctx.beginPath(); ctx.moveTo(x0 + bl * 0.2, -H * 0.1); ctx.quadraticCurveTo(x0 + bl * 0.6, -H * 0.55, x0 + bl * 1.02, -H * 0.05);
      ctx.quadraticCurveTo(x0 + bl * 0.6, -H * 0.2, x0 + bl * 0.35, H * 0.08); ctx.closePath(); ctx.fill();
      break;
    }
    case 'half': {
      const g = ctx.createLinearGradient(x0 + bl * 0.4, 0, x0 + bl * 0.6, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, v.c[1]);
      ctx.fillStyle = g; ctx.fillRect(x0, -H, bl * 1.2, H * 2);
      break;
    }
    case 'lines': {
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.03;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0 + bl * 0.1, -H * 0.1 + i * H * 0.06); ctx.lineTo(x0 + bl * 0.35, -H * 0.25 + i * H * 0.1); ctx.stroke(); }
      ctx.fillStyle = '#1a1a1a'; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(x0 + bl * 0.7, H * 0.15, bl * 0.18, H * 0.2, -0.3, 0, TAU); ctx.fill();
      break;
    }
    case 'wavy': {
      ctx.strokeStyle = pc; ctx.lineWidth = H * 0.035;
      for (let i = 0; i < 14; i++) { const x = x0 + bl * (0.25 + i * 0.05); ctx.beginPath(); ctx.moveTo(x, -H * 0.5); ctx.quadraticCurveTo(x + H * 0.15, -H * 0.3, x, -H * 0.05); ctx.stroke(); }
      break;
    }
    case 'thumb': {
      ctx.fillStyle = pc; ctx.beginPath(); ctx.arc(x0 + bl * 0.45, 0, H * 0.13, 0, TAU); ctx.fill();
      break;
    }
    case 'sheephead': {
      ctx.fillStyle = pc; ctx.fillRect(x0, -H, bl * 0.28, H * 2); ctx.fillRect(x0 + bl * 0.75, -H, bl * 0.4, H * 2);
      break;
    }
  }
  ctx.restore();
}

function drawFish(ctx, L, v, t, swim) {
  const H = L * v.h;
  const finc = rgba(v.f, 0.72);
  // far pectoral / pelvic fins
  ctx.fillStyle = rgba(v.f, 0.45);
  finPath(ctx, [[-L * 0.12, H * 0.3], [-L * 0.02, H * 0.62], [L * 0.02, H * 0.34]]); ctx.fill();
  // dorsal + anal fins
  ctx.fillStyle = finc;
  const dTop = -H * 0.47;
  switch (v.d) {
    case 'spiny':
      finPath(ctx, [[-L * 0.2, dTop * 0.9], [-L * 0.16, dTop * 1.35], [-L * 0.1, dTop * 1.12], [-L * 0.05, dTop * 1.4], [L * 0.02, dTop * 1.15], [L * 0.12, dTop * 1.3], [L * 0.24, dTop * 0.75]]); ctx.fill(); break;
    case 'filament': {
      ctx.beginPath(); ctx.moveTo(-L * 0.18, dTop * 0.8);
      ctx.quadraticCurveTo(-L * 0.1, dTop * 2.1, L * 0.1 + Math.sin(t * 2) * L * 0.05, dTop * 2.8);
      ctx.quadraticCurveTo(L * 0.5 + Math.sin(t * 2.3) * L * 0.08, dTop * 3.2, L * 0.6, dTop * 2.9);
      ctx.quadraticCurveTo(L * 0.2, dTop * 2.2, L * 0.2, dTop * 0.7); ctx.closePath(); ctx.fill(); break;
    }
    case 'trail':
      finPath(ctx, [[-L * 0.15, dTop * 0.9], [L * 0.1, dTop * 1.5], [L * 0.38, dTop * 1.2 + Math.sin(t * 3) * H * 0.04], [L * 0.24, dTop * 0.6]]); ctx.fill();
      finPath(ctx, [[-L * 0.05, -dTop * 0.9], [L * 0.2, -dTop * 1.5], [L * 0.38, -dTop * 1.15], [L * 0.22, -dTop * 0.6]]); ctx.fill(); break;
    case 'long':
      finPath(ctx, [[-L * 0.32, dTop * 0.75], [-L * 0.25, dTop * 1.25], [L * 0.28, dTop * 0.9], [L * 0.28, dTop * 0.5]]); ctx.fill(); break;
    case 'lion': {
      ctx.fillStyle = rgba('#d8b0a0', 0.35);
      for (let k = 0; k < 9; k++) {
        const a = -2.2 + k * 0.17 + Math.sin(t * 2 + k) * 0.03;
        ctx.save(); ctx.translate(-L * 0.1, -H * 0.1); ctx.rotate(a);
        ctx.fillRect(0, -L * 0.01, L * 0.45, L * 0.02); ctx.restore();
      }
      ctx.fillStyle = rgba('#b8402c', 0.5);
      for (let k = 0; k < 8; k++) {
        ctx.save(); ctx.translate(-L * 0.12, H * 0.15); ctx.rotate(0.6 + k * 0.12 + Math.sin(t * 1.5 + k) * 0.05);
        ctx.beginPath(); ctx.ellipse(L * 0.18, 0, L * 0.2, L * 0.025, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      break;
    }
    default:
      finPath(ctx, [[-L * 0.12, dTop * 0.85], [-L * 0.02, dTop * 1.32], [L * 0.16, dTop * 1.1], [L * 0.24, dTop * 0.6]]); ctx.fill();
  }
  if (v.sail) { /* handled in billfish */ }
  if (v.longfin) {
    ctx.fillStyle = rgba(v.f, 0.85);
    finPath(ctx, [[L * 0.0, dTop * 0.9], [L * 0.12, dTop * 2.2], [L * 0.14, dTop * 0.8]]); ctx.fill();
    finPath(ctx, [[L * 0.05, -dTop * 0.9], [L * 0.16, -dTop * 2.2], [L * 0.18, -dTop * 0.8]]); ctx.fill();
  }
  // anal fin
  ctx.fillStyle = finc;
  finPath(ctx, [[L * 0.05, H * 0.42], [L * 0.14, H * 0.66], [L * 0.27, H * 0.5], [L * 0.27, H * 0.28]]); ctx.fill();
  if (v.adipose) { ctx.beginPath(); ctx.ellipse(L * 0.25, -H * 0.32, L * 0.03, H * 0.06, 0, 0, TAU); ctx.fill(); }

  // body
  const o = fishOutline(ctx, L, v, t, swim);
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]);
  ctx.fill();
  ctx.save();
  ctx.clip();
  patternFish(ctx, o, L, v);
  // scale texture
  if (L > 30) {
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    const sc = v.bigscale ? L * 0.04 : L * 0.022;
    ctx.beginPath();
    for (let x = o.x0 + L * 0.2; x < o.tailX; x += sc) for (let y = -H / 2; y < H / 2; y += sc) {
      ctx.moveTo(x + sc * 0.5, y); ctx.arc(x, y + (Math.floor(x / sc) % 2) * sc * 0.5, sc * 0.5, -0.9, 0.9);
    }
    ctx.stroke();
  }
  ctx.fillStyle = overlayShading(ctx, -H / 2, H / 2);
  ctx.fillRect(-L, -H, L * 2, H * 2);
  // lateral line
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = Math.max(0.5, H * 0.015);
  ctx.beginPath(); ctx.moveTo(o.x0 + L * 0.18, -H * 0.12); ctx.quadraticCurveTo(0, -H * 0.2, o.tailX, 0); ctx.stroke();
  ctx.restore();

  if (v.finlets) {
    ctx.fillStyle = v.p === undefined && v.f ? v.f : '#c8a82a';
    for (let k = 0; k < 6; k++) { const x = L * (0.28 + k * 0.025); ctx.fillRect(x, -H * (0.18 - k * 0.018) - 2, L * 0.012, L * 0.012); ctx.fillRect(x, H * (0.16 - k * 0.018), L * 0.012, L * 0.012); }
  }
  drawTail(ctx, o, L, v, t, swim, v.tailc || rgba(v.f, 0.82));
  // gill cover
  const gx = o.x0 + L * (v.h > 0.6 ? 0.22 : 0.2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.6, L * 0.008);
  ctx.beginPath(); ctx.arc(gx - H * 0.3, 0, H * 0.38, -0.9, 0.9); ctx.stroke();
  // near pectoral fin
  ctx.fillStyle = v.wings ? rgba(v.f, 0.75) : rgba(v.f, 0.55);
  if (v.wings) { finPath(ctx, [[gx, -H * 0.05], [gx + L * 0.45, -H * 0.8 + Math.sin(t * 3) * H * 0.1], [gx + L * 0.5, -H * 0.3], [gx + L * 0.1, H * 0.1]]); }
  else finPath(ctx, [[gx, H * 0.05], [gx + L * 0.12, H * 0.08 + Math.sin(t * 5) * H * 0.05], [gx + L * 0.09, H * 0.28], [gx + L * 0.01, H * 0.2]]);
  ctx.fill();
  // snout / mouth / eye
  const nx = o.x0;
  if (v.snout) {
    ctx.fillStyle = shade(v.c[0], -0.05);
    ctx.beginPath(); ctx.moveTo(nx + L * 0.06, -H * 0.12); ctx.lineTo(nx - L * 0.08 * v.snout, -H * 0.02); ctx.lineTo(nx - L * 0.08 * v.snout, H * 0.02); ctx.lineTo(nx + L * 0.06, H * 0.06); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(0.6, L * 0.008);
  ctx.beginPath(); ctx.moveTo(nx + L * 0.005, H * 0.06); ctx.lineTo(nx + L * (v.jaw ? 0.1 : 0.05), H * (v.jaw ? 0.1 : 0.08)); ctx.stroke();
  if (v.lips) { ctx.fillStyle = shade(v.c[1], -0.2); ctx.beginPath(); ctx.ellipse(nx + L * 0.015, H * 0.06, L * 0.025, H * 0.07, 0, 0, TAU); ctx.fill(); }
  if (v.beak) { ctx.fillStyle = '#e8e4d4'; ctx.beginPath(); ctx.ellipse(nx + L * 0.015, H * 0.04, L * 0.02, H * 0.06, 0, 0, TAU); ctx.fill(); }
  if (v.barbel) { ctx.beginPath(); ctx.moveTo(nx + L * 0.05, H * 0.15); ctx.lineTo(nx + L * 0.04, H * 0.3); ctx.stroke(); }
  if (v.spiny) {
    ctx.strokeStyle = 'rgba(40,30,20,0.6)';
    ctx.beginPath(); for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; ctx.moveTo(Math.cos(a) * H * 0.3 - L * 0.05, Math.sin(a) * H * 0.3); ctx.lineTo(Math.cos(a) * H * 0.48 - L * 0.05, Math.sin(a) * H * 0.48); } ctx.stroke();
  }
  if (v.eyespot) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L * 0.12, -H * 0.25, H * 0.07, 0, TAU); ctx.fill(); }
  const er = Math.max(1.2, H * (v.bigeye ? 0.16 : 0.1));
  eye(ctx, nx + L * (v.h > 0.6 ? 0.12 : 0.1), -H * 0.12, er, v.eyec || '#cfc6a4');
  if (v.photo) {
    // photophore row drawn here for lit view; glow handled separately
    ctx.fillStyle = 'rgba(160,220,255,0.6)';
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(o.x0 + L * (0.15 + k * 0.07), H * 0.32, Math.max(0.7, H * 0.035), 0, TAU); ctx.fill(); }
  }
}

// ---------- sharks ----------
function drawShark(ctx, L, v, t, swim) {
  const H = L * v.h;
  const sway = Math.sin(t * 3 * swim);
  const c0 = v.c[0], c1 = v.c[1];
  ctx.fillStyle = shade(v.f, -0.1);
  // far pectoral
  finPath(ctx, [[-L * 0.12, H * 0.25], [-L * 0.02, H * (v.longfin ? 1.2 : 0.85)], [L * 0.02, H * 0.3]]); ctx.fill();
  // body
  ctx.beginPath();
  const nose = -L / 2;
  ctx.moveTo(nose, H * 0.05);
  ctx.bezierCurveTo(nose + L * 0.04, -H * (v.blunt ? 0.5 : 0.38), nose + L * 0.25, -H * 0.55, nose + L * 0.45, -H * 0.5);
  ctx.bezierCurveTo(nose + L * 0.62, -H * 0.42, nose + L * 0.74, -H * 0.18, nose + L * 0.8, -H * 0.08 + sway * H * 0.04);
  ctx.lineTo(nose + L * 0.8, H * 0.08 + sway * H * 0.04);
  ctx.bezierCurveTo(nose + L * 0.68, H * 0.24, nose + L * 0.45, H * 0.5, nose + L * 0.25, H * 0.45);
  ctx.bezierCurveTo(nose + L * 0.1, H * 0.42, nose + L * 0.02, H * 0.3, nose, H * 0.05);
  ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, c0, c1);
  ctx.fill();
  ctx.save(); ctx.clip();
  // countershading line
  ctx.fillStyle = shade(c1, 0.05);
  ctx.beginPath(); ctx.moveTo(nose, H * 0.15); ctx.quadraticCurveTo(nose + L * 0.4, H * 0.02, nose + L * 0.82, H * 0.02); ctx.lineTo(nose + L * 0.82, H); ctx.lineTo(nose, H); ctx.fill();
  if (v.p) patternFish(ctx, { H, x0: nose, bodyL: L * 0.8 }, L, v);
  ctx.fillStyle = overlayShading(ctx, -H / 2, H / 2); ctx.fillRect(-L, -H, 2 * L, 2 * H);
  ctx.restore();
  // dorsal fin (first + second)
  ctx.fillStyle = c0;
  finPath(ctx, [[nose + L * 0.36, -H * 0.48], [nose + L * 0.43, -H * (v.small ? 0.8 : 1.15)], [nose + L * 0.52, -H * 0.42]]); ctx.fill();
  finPath(ctx, [[nose + L * 0.66, -H * 0.27], [nose + L * 0.69, -H * 0.45], [nose + L * 0.72, -H * 0.2]]); ctx.fill();
  if (v.tips) { ctx.fillStyle = v.tips; finPath(ctx, [[nose + L * 0.41, -H * 0.95], [nose + L * 0.43, -H * 1.15], [nose + L * 0.46, -H * 0.9]]); ctx.fill(); }
  // tail - heterocercal
  const tx = nose + L * 0.8, ty = sway * H * 0.04;
  const flex = 0.65 + 0.35 * Math.abs(Math.cos(t * 3 * swim));
  ctx.fillStyle = shade(c0, -0.05);
  ctx.beginPath(); ctx.moveTo(tx - L * 0.02, ty - H * 0.1);
  ctx.quadraticCurveTo(tx + L * 0.12 * flex, ty - H * 0.5, tx + L * 0.2 * flex, ty - H * 0.95);
  ctx.quadraticCurveTo(tx + L * 0.1 * flex, ty - H * 0.1, tx + L * 0.08 * flex, ty + H * 0.05);
  ctx.lineTo(tx + L * 0.12 * flex, ty + H * (v.wide ? 0.6 : 0.45));
  ctx.quadraticCurveTo(tx + L * 0.03, ty + H * 0.2, tx - L * 0.02, ty + H * 0.08);
  ctx.closePath(); ctx.fill();
  // gills
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(0.6, L * 0.005);
  for (let k = 0; k < (v.sixgill ? 6 : v.frill ? 6 : 5); k++) {
    const gx = nose + L * (0.2 + k * 0.022);
    ctx.beginPath(); ctx.moveTo(gx, -H * 0.12); ctx.quadraticCurveTo(gx + L * 0.008, H * 0.05, gx, H * 0.2); ctx.stroke();
  }
  // near pectoral
  ctx.fillStyle = shade(v.f, 0.0);
  finPath(ctx, [[nose + L * 0.27, H * 0.22], [nose + L * (v.longfin ? 0.42 : 0.36), H * (v.longfin ? 1.25 : 0.9) + sway * H * 0.04], [nose + L * 0.34, H * 0.3]]); ctx.fill();
  // eye & mouth
  eye(ctx, nose + L * 0.075, -H * 0.12, Math.max(1.2, H * 0.06), v.eyec || '#1a1a1a', true);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.moveTo(nose + L * 0.06, H * 0.22); ctx.quadraticCurveTo(nose + L * 0.12, H * (v.gape ? 0.4 : 0.3), nose + L * 0.16, H * 0.22); ctx.stroke();
  if (v.hammer) {
    ctx.fillStyle = shade(c0, 0.05);
    ctx.beginPath(); ctx.ellipse(nose + L * 0.03, 0, L * 0.035, H * 0.9, 0, 0, TAU); ctx.fill();
    eye(ctx, nose + L * 0.03, -H * 0.8, Math.max(1, H * 0.05), '#111');
  }
  if (v.goblin) { ctx.fillStyle = shade(c0, 0.05); finPath(ctx, [[nose + L * 0.02, -H * 0.2], [nose - L * 0.1, -H * 0.12], [nose + L * 0.03, H * 0.0]]); ctx.fill(); }
  if (v.saw) {
    ctx.fillStyle = shade(c0, -0.05); ctx.fillRect(nose - L * 0.22, -H * 0.06, L * 0.23, H * 0.12);
    ctx.fillStyle = '#e8e4d8'; for (let k = 0; k < 14; k++) { const x = nose - L * 0.21 + k * L * 0.016; ctx.fillRect(x, -H * 0.12, L * 0.004, H * 0.24); }
  }
  if (v.nurse) { ctx.strokeStyle = shade(c0, -0.3); ctx.beginPath(); ctx.moveTo(nose + L * 0.01, H * 0.1); ctx.lineTo(nose - L * 0.01, H * 0.28); ctx.stroke(); }
}

// ---------- rays (seen slightly from above) ----------
function drawRay(ctx, L, v, t) {
  const flap = Math.sin(t * (v.manta ? 1.6 : 2.4));
  const W = L * (v.manta ? 1.6 : 1.1);
  const c0 = v.c[0];
  ctx.save();
  // tail
  ctx.strokeStyle = shade(c0, -0.1); ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.beginPath(); ctx.moveTo(L * 0.15, 0); ctx.quadraticCurveTo(L * 0.6, Math.sin(t) * L * 0.04, L * (v.eagle ? 1.1 : 0.7), Math.sin(t * 1.3) * L * 0.06); ctx.stroke();
  // far wing
  ctx.fillStyle = shade(c0, -0.2);
  ctx.beginPath(); ctx.moveTo(-L * 0.3, 0);
  ctx.quadraticCurveTo(-L * 0.05, -W * 0.25 * (0.4 + flap * 0.6) - L * 0.05, L * 0.05, -W * 0.38 * (0.3 + 0.7 * flap) - L * 0.04);
  ctx.quadraticCurveTo(L * 0.1, -L * 0.02, L * 0.2, 0); ctx.fill();
  // body
  const g = ctx.createLinearGradient(0, -L * 0.1, 0, L * 0.1);
  g.addColorStop(0, shade(c0, 0.05)); g.addColorStop(1, shade(c0, -0.2));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(-L * 0.05, 0, L * 0.3, L * 0.07, 0, 0, TAU); ctx.fill();
  // near wing
  ctx.beginPath(); ctx.moveTo(-L * 0.32, 0);
  ctx.quadraticCurveTo(-L * 0.05, W * 0.18 * (0.5 - flap * 0.6) + L * 0.05, L * 0.08, W * 0.36 * (0.3 - 0.7 * flap) + L * 0.06);
  ctx.quadraticCurveTo(L * 0.12, L * 0.03, L * 0.2, 0); ctx.closePath();
  ctx.fillStyle = shade(c0, 0.0); ctx.fill();
  if (v.p) { ctx.save(); ctx.clip(); ctx.fillStyle = v.pc; for (let k = 0; k < 20; k++) { ctx.beginPath(); ctx.arc(-L * 0.25 + (k * 37 % 40) / 100 * L, ((k * 53) % 30 - 15) / 100 * L, L * 0.012, 0, TAU); ctx.fill(); } ctx.restore(); }
  if (v.manta) {
    ctx.fillStyle = shade(c0, -0.1);
    ctx.beginPath(); ctx.ellipse(-L * 0.36, -L * 0.03, L * 0.06, L * 0.018, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-L * 0.36, L * 0.03, L * 0.06, L * 0.018, -0.4, 0, TAU); ctx.fill();
  }
  eye(ctx, -L * 0.25, -L * 0.04, Math.max(1, L * 0.012), '#222', false);
  ctx.restore();
}

// ---------- eels ----------
function drawEel(ctx, L, v, t, swim) {
  const H = L * v.h;
  const n = 26, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = -L / 2 + u * L;
    const y = Math.sin(t * 4 * swim - u * 9) * H * 1.6 * (0.2 + u);
    pts.push([x, y]);
  }
  const w = (u) => H * 0.5 * (u < 0.12 ? 0.6 + u * 3.3 : 1 - Math.pow((u - 0.12) / 0.88, 1.6) * 0.92);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1] - w(i / n));
  for (let i = n; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + w(i / n));
  ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, -H, H, v.c[0], v.c[1]);
  ctx.fill();
  if (v.p) { ctx.save(); ctx.clip(); patternFish(ctx, { H: H * 2, x0: -L / 2, bodyL: L }, L, v); ctx.restore(); }
  // dorsal ridge
  ctx.strokeStyle = rgba(v.f || v.c[0], 0.55); ctx.lineWidth = Math.max(0.8, H * 0.3);
  ctx.beginPath(); for (let i = 3; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1] - w(i / n) - H * 0.12); ctx.stroke();
  if (v.frill) { ctx.strokeStyle = 'rgba(160,80,80,0.6)'; for (let k = 0; k < 6; k++) { const x = -L / 2 + L * (0.06 + k * 0.012); ctx.beginPath(); ctx.moveTo(x, -H * 0.4); ctx.lineTo(x, H * 0.5); ctx.stroke(); } }
  eye(ctx, -L / 2 + L * 0.03, pts[1][1] - H * 0.15, Math.max(1, H * 0.18), v.hag ? '#9a7a6a' : '#cfc28a', !v.hag);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-L / 2, pts[0][1] + H * 0.1); ctx.lineTo(-L / 2 + L * 0.05, pts[1][1] + H * 0.12); ctx.stroke();
}

// ---------- angler / deep sea oddities ----------
function drawAngler(ctx, L, v, t) {
  const H = L * v.h;
  const c0 = v.c[0];
  // body: big round head, tapering
  ctx.beginPath();
  ctx.moveTo(-L * 0.48, -H * 0.05);
  ctx.bezierCurveTo(-L * 0.45, -H * 0.62, L * 0.0, -H * 0.62, L * 0.18, -H * 0.25);
  ctx.lineTo(L * 0.3, -H * 0.12); ctx.lineTo(L * 0.3, H * 0.12);
  ctx.bezierCurveTo(L * 0.1, H * 0.5, -L * 0.3, H * 0.6, -L * 0.48, H * 0.2);
  ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, c0, v.c[1]);
  ctx.fill();
  ctx.save(); ctx.clip();
  if (v.p) patternFish(ctx, { H, x0: -L / 2, bodyL: L }, L, v);
  // wrinkled skin
  ctx.strokeStyle = 'rgba(255,230,200,0.08)'; ctx.lineWidth = 1;
  for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(-L * 0.2, -H * 0.1, H * (0.15 + k * 0.06), 0.5, 2.5); ctx.stroke(); }
  ctx.fillStyle = overlayShading(ctx, -H / 2, H / 2); ctx.fillRect(-L, -H, 2 * L, 2 * H);
  ctx.restore();
  // tail
  ctx.fillStyle = shade(c0, -0.1);
  finPath(ctx, [[L * 0.28, 0], [L * 0.5, -H * 0.3], [L * 0.5, H * 0.3]]); ctx.fill();
  // mouth + teeth
  ctx.fillStyle = '#080606';
  ctx.beginPath(); ctx.moveTo(-L * 0.48, -H * 0.02); ctx.quadraticCurveTo(-L * 0.3, H * 0.15, -L * 0.15, H * 0.05); ctx.quadraticCurveTo(-L * 0.3, H * 0.4, -L * 0.48, H * 0.22); ctx.fill();
  ctx.fillStyle = 'rgba(230,225,210,0.85)';
  for (let k = 0; k < 7; k++) {
    const x = -L * 0.46 + k * L * 0.04;
    finPath(ctx, [[x, H * 0.02], [x + L * 0.01, H * (0.13 + (k % 2) * 0.05)], [x + L * 0.02, H * 0.03]]); ctx.fill();
    finPath(ctx, [[x, H * 0.27], [x + L * 0.01, H * (0.16 - (k % 2) * 0.04)], [x + L * 0.02, H * 0.26]]); ctx.fill();
  }
  // illicium (lure)
  ctx.strokeStyle = shade(c0, 0.1); ctx.lineWidth = Math.max(1, L * 0.01);
  const lx = -L * 0.55 + Math.sin(t * 1.3) * L * 0.03, ly = -H * 0.75;
  ctx.beginPath(); ctx.moveTo(-L * 0.28, -H * 0.45); ctx.quadraticCurveTo(-L * 0.4, -H * 0.9, lx, ly); ctx.stroke();
  ctx.fillStyle = v.glow ? '#cfefff' : shade(c0, 0.2);
  ctx.beginPath(); ctx.arc(lx, ly, Math.max(1.5, L * 0.03), 0, TAU); ctx.fill();
  eye(ctx, -L * 0.25, -H * 0.25, Math.max(1, H * 0.05), '#6a8aa0');
  return [[lx, ly]];
}
function drawFangtooth(ctx, L, v, t, swim) {
  const H = L * v.h;
  drawFish(ctx, L, { ...v, h: v.h, t: 'fork', bigeye: 0, f: '#2a2420' }, t, swim);
  ctx.fillStyle = 'rgba(235,230,215,0.9)';
  for (let k = 0; k < 4; k++) { const x = -L * 0.48 + k * L * 0.045; finPath(ctx, [[x, H * 0.02], [x + L * 0.012, H * 0.3], [x + L * 0.025, H * 0.02]]); ctx.fill(); }
}
function drawViper(ctx, L, v, t, swim) {
  const H = L * v.h;
  drawEel(ctx, L, { ...v, h: v.h * 0.9, f: '#24343a' }, t, swim * 0.5);
  ctx.fillStyle = 'rgba(230,230,220,0.85)';
  for (let k = 0; k < 3; k++) { const x = -L * 0.5 + L * 0.015 + k * L * 0.02; finPath(ctx, [[x, -H * 0.4], [x + L * 0.006, H * 0.9], [x + L * 0.012, -H * 0.4]]); ctx.fill(); }
  return [[-L * 0.3, -H * 1.6]];
}
function drawBarreleye(ctx, L, v, t, swim) {
  drawFish(ctx, L, { ...v, t: 'fork', f: '#4a3a30' }, t, swim);
  const H = L * v.h;
  // transparent dome head with green tube eyes
  ctx.fillStyle = 'rgba(200,230,240,0.18)'; ctx.strokeStyle = 'rgba(220,240,255,0.35)';
  ctx.beginPath(); ctx.ellipse(-L * 0.28, -H * 0.42, L * 0.16, H * 0.42, 0, PI, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#4ad86a';
  ctx.beginPath(); ctx.ellipse(-L * 0.3, -H * 0.5, L * 0.03, H * 0.16, 0, 0, TAU); ctx.fill();
}
function drawGulper(ctx, L, v, t, swim) {
  const H = L * v.h;
  drawEel(ctx, L, { ...v, h: v.h * 0.5 }, t, swim * 0.5);
  ctx.fillStyle = v.c[0];
  ctx.beginPath(); ctx.moveTo(-L * 0.36, -H * 0.2); ctx.lineTo(-L * 0.62, -H * 2.2); ctx.lineTo(-L * 0.64, H * 2.4); ctx.lineTo(-L * 0.36, H * 0.3); ctx.fill();
  ctx.strokeStyle = 'rgba(80,60,60,0.5)'; ctx.stroke();
  return [[L * 0.5, 0]];
}
function drawHatchet(ctx, L, v, t, swim) {
  const H = L * v.h;
  ctx.beginPath(); ctx.moveTo(-L * 0.45, -H * 0.35); ctx.lineTo(L * 0.1, -H * 0.4); ctx.lineTo(L * 0.3, -H * 0.1);
  ctx.lineTo(L * 0.3, H * 0.05); ctx.quadraticCurveTo(-L * 0.1, H * 0.55, -L * 0.4, H * 0.1); ctx.closePath();
  const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2);
  g.addColorStop(0, '#3a4a56'); g.addColorStop(0.3, '#c8d4dc'); g.addColorStop(0.7, '#eef4f8'); g.addColorStop(1, '#8a9aa6');
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(200,210,220,0.5)'; finPath(ctx, [[L * 0.3, 0], [L * 0.5, -H * 0.2], [L * 0.5, H * 0.2]]); ctx.fill();
  eye(ctx, -L * 0.3, -H * 0.15, Math.max(1, H * 0.12), '#a8c0d0');
}
function drawBlob(ctx, L, v) {
  const H = L * v.h;
  const g = ctx.createRadialGradient(-L * 0.15, -H * 0.15, 0, 0, 0, L * 0.6);
  g.addColorStop(0, shade(v.c[1], 0.15)); g.addColorStop(1, shade(v.c[0], -0.2));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-L * 0.5, H * 0.1);
  ctx.bezierCurveTo(-L * 0.5, -H * 0.7, L * 0.2, -H * 0.6, L * 0.25, -H * 0.1);
  ctx.lineTo(L * 0.5, -H * 0.05); ctx.lineTo(L * 0.5, H * 0.1);
  ctx.bezierCurveTo(L * 0.2, H * 0.5, -L * 0.4, H * 0.5, -L * 0.5, H * 0.1); ctx.fill();
  ctx.fillStyle = shade(v.c[0], -0.2); ctx.beginPath(); ctx.ellipse(-L * 0.45, H * 0.05, L * 0.06, H * 0.08, 0, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.25, -H * 0.2, Math.max(1, H * 0.06), '#2a2020');
}
function drawRattail(ctx, L, v, t, swim) {
  const H = L * v.h;
  ctx.beginPath(); ctx.moveTo(-L * 0.5, 0);
  ctx.bezierCurveTo(-L * 0.45, -H * 0.7, -L * 0.15, -H * 0.6, 0, -H * 0.3);
  ctx.quadraticCurveTo(L * 0.3, -H * 0.05 + Math.sin(t * 2) * H * 0.1, L * 0.5, Math.sin(t * 2) * H * 0.2);
  ctx.quadraticCurveTo(L * 0.3, H * 0.1, 0, H * 0.3);
  ctx.bezierCurveTo(-L * 0.2, H * 0.6, -L * 0.45, H * 0.4, -L * 0.5, 0);
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]); ctx.fill();
  ctx.fillStyle = rgba(v.c[0], 0.6); finPath(ctx, [[-L * 0.25, -H * 0.5], [-L * 0.2, -H * 1.0], [-L * 0.12, -H * 0.45]]); ctx.fill();
  eye(ctx, -L * 0.38, -H * 0.15, Math.max(1, H * 0.16), '#b8c8c0');
}
function drawRatfish(ctx, L, v, t, swim) {
  drawRattail(ctx, L, v, t, swim);
  const H = L * v.h;
  ctx.fillStyle = rgba(v.c[1], 0.6);
  finPath(ctx, [[-L * 0.3, H * 0.1], [-L * 0.05, H * 0.9 + Math.sin(t * 2.4) * H * 0.2], [-L * 0.05, H * 0.2]]); ctx.fill();
  eye(ctx, -L * 0.38, -H * 0.15, Math.max(1.2, H * 0.2), v.eyec || '#4ac08a');
}
function drawTripod(ctx, L, v, t) {
  const H = L * v.h;
  ctx.strokeStyle = shade(v.c[0], 0.2); ctx.lineWidth = Math.max(0.5, L * 0.008);
  ctx.beginPath(); ctx.moveTo(-L * 0.1, H * 0.3); ctx.lineTo(-L * 0.12, L * 0.35); ctx.moveTo(L * 0.05, H * 0.3); ctx.lineTo(L * 0.08, L * 0.35);
  ctx.moveTo(L * 0.4, 0); ctx.lineTo(L * 0.6, L * 0.35); ctx.stroke();
  drawFish(ctx, L * 0.8, { ...v, t: 'fork', f: v.c[0] }, t, 0.1);
  ctx.beginPath(); ctx.moveTo(-L * 0.35, -H * 0.1); ctx.lineTo(-L * 0.6, -H * 0.5); ctx.stroke();
}
function drawMola(ctx, L, v, t) {
  const H = L * v.h;
  const flap = Math.sin(t * 1.4);
  ctx.fillStyle = shade(v.c[0], -0.1);
  finPath(ctx, [[-L * 0.05, -H * 0.4], [L * 0.05 + flap * L * 0.04, -H * 1.0], [L * 0.2, -H * 0.38]]); ctx.fill();
  finPath(ctx, [[-L * 0.05, H * 0.4], [L * 0.05 - flap * L * 0.04, H * 1.0], [L * 0.2, H * 0.38]]); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, H * 0.47, 0, 0, TAU);
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let k = 0; k < 30; k++) { ctx.beginPath(); ctx.arc(((k * 41) % 100 - 50) / 100 * L, ((k * 67) % 100 - 50) / 100 * H, L * 0.03, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = shade(v.c[0], 0.05);
  ctx.beginPath(); ctx.moveTo(L * 0.42, -H * 0.3); ctx.quadraticCurveTo(L * 0.6, 0, L * 0.42, H * 0.3); ctx.fill();
  eye(ctx, -L * 0.3, -H * 0.1, Math.max(1, L * 0.035), '#b8c0c4');
  ctx.fillStyle = '#2a2e30'; ctx.beginPath(); ctx.arc(-L * 0.48, H * 0.02, L * 0.02, 0, TAU); ctx.fill();
}
function drawBillfish(ctx, L, v, t, swim) {
  const H = L * v.h;
  const bodyL = L * (1 - v.bill);
  ctx.save(); ctx.translate(L * v.bill / 2, 0);
  if (v.sail) {
    ctx.fillStyle = rgba('#1a3a7a', 0.85);
    ctx.beginPath(); ctx.moveTo(-bodyL * 0.38, -H * 0.4); ctx.quadraticCurveTo(-bodyL * 0.2, -H * 2.6, bodyL * 0.15, -H * 1.9); ctx.lineTo(bodyL * 0.2, -H * 0.4); ctx.fill();
    ctx.fillStyle = 'rgba(20,20,40,0.5)'; for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.arc(-bodyL * 0.3 + k * bodyL * 0.05, -H * 1.3, H * 0.06, 0, TAU); ctx.fill(); }
  }
  drawFish(ctx, bodyL, { ...v, t: 'lunate', h: H / bodyL, d: v.sail ? 'none' : 'long' }, t, swim);
  ctx.restore();
  ctx.fillStyle = shade(v.c[0], 0.1);
  finPath(ctx, [[-L / 2 + L * v.bill + 2, -H * 0.12], [-L / 2, -H * 0.01], [-L / 2 + L * v.bill + 2, H * 0.06]]); ctx.fill();
}
function drawOarfish(ctx, L, v, t, swim) {
  const H = L * v.h;
  drawEel(ctx, L, { ...v, h: v.h }, t, swim * 0.35);
  ctx.strokeStyle = 'rgba(210,50,40,0.75)'; ctx.lineWidth = Math.max(1, H * 0.4);
  ctx.beginPath(); for (let i = 0; i <= 30; i++) { const u = i / 30; ctx.lineTo(-L / 2 + u * L, Math.sin(t * 4 * swim * 0.35 - u * 9) * H * 1.6 * (0.2 + u) - H * 0.7); } ctx.stroke();
  ctx.lineWidth = Math.max(1, H * 0.25);
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.48, -H * 0.5); ctx.lineTo(-L * 0.46 + k * L * 0.01, -H * (4 + k)); ctx.stroke(); }
}
function drawBox(ctx, L, v, t, swim) {
  const H = L * v.h;
  ctx.beginPath(); ctx.moveTo(-L * 0.45, -H * 0.15); ctx.quadraticCurveTo(-L * 0.4, -H * 0.5, -L * 0.1, -H * 0.5);
  ctx.lineTo(L * 0.25, -H * 0.42); ctx.lineTo(L * 0.3, -H * 0.1); ctx.lineTo(L * 0.3, H * 0.1); ctx.lineTo(L * 0.25, H * 0.42);
  ctx.lineTo(-L * 0.1, H * 0.5); ctx.quadraticCurveTo(-L * 0.4, H * 0.5, -L * 0.45, H * 0.15); ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]); ctx.fill();
  ctx.save(); ctx.clip(); patternFish(ctx, { H, x0: -L / 2, bodyL: L }, L, v); ctx.restore();
  ctx.fillStyle = rgba('#e0c84a', 0.6);
  drawTail(ctx, { tailX: L * 0.28, tailY: 0 }, L, { h: 0.3, t: 'round' }, t, swim, rgba(v.c[0], 0.8));
  eye(ctx, -L * 0.3, -H * 0.2, Math.max(1, H * 0.1), '#c8b45a');
}
function drawStone(ctx, L, v) {
  const H = L * v.h;
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.moveTo(-L * 0.5, H * 0.3);
  for (let k = 0; k <= 12; k++) { const u = k / 12; ctx.lineTo(-L * 0.5 + u * L, -H * 0.5 * Math.sin(u * PI) - Math.sin(k * 7.1) * H * 0.08 + H * 0.2); }
  ctx.lineTo(L * 0.5, H * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(30,20,10,0.4)'; for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.arc(-L * 0.4 + k * L * 0.07, -H * 0.05 + Math.sin(k * 3) * H * 0.1, H * 0.06, 0, TAU); ctx.fill(); }
  eye(ctx, -L * 0.3, -H * 0.1, Math.max(0.8, H * 0.05), '#6a5a48', false);
}
function drawFrog(ctx, L, v) {
  const H = L * v.h;
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.ellipse(0, -H * 0.1, L * 0.42, H * 0.42, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(v.c[0], -0.2);
  ctx.beginPath(); ctx.ellipse(-L * 0.15, H * 0.28, L * 0.1, H * 0.12, 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(80,50,20,0.35)';
  for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.arc(((k * 37) % 70 - 35) / 100 * L, ((k * 53) % 60 - 40) / 100 * H, H * 0.05, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = shade(v.c[0], -0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-L * 0.38, -H * 0.3); ctx.lineTo(-L * 0.45, -H * 0.55); ctx.stroke();
  eye(ctx, -L * 0.28, -H * 0.25, Math.max(1, H * 0.07), '#a88a3a');
}
function drawFlat(ctx, L, v) {
  const H = L * v.h * 0.25;
  ctx.fillStyle = bodyGradient(ctx, -H, H, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.ellipse(-L * 0.05, 0, L * 0.45, H, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.clip(); patternFish(ctx, { H: H * 2, x0: -L / 2, bodyL: L }, L, v); ctx.restore();
  ctx.fillStyle = rgba(v.c[0], 0.8); finPath(ctx, [[L * 0.38, 0], [L * 0.52, -H * 1.2], [L * 0.52, H * 0.8]]); ctx.fill();
  eye(ctx, -L * 0.36, -H * 0.9, Math.max(0.8, L * 0.015), '#a89a70');
  eye(ctx, -L * 0.3, -H * 0.95, Math.max(0.8, L * 0.015), '#a89a70');
}
function drawSeahorse(ctx, L, v, t) {
  // L = height
  const s = L;
  ctx.save(); ctx.rotate(Math.sin(t * 1.2) * 0.05);
  ctx.fillStyle = bodyGradient(ctx, -s / 2, s / 2, v.c[0], v.c[1]);
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, -s * 0.38);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.48, -s * 0.38, -s * 0.36); // snout
  ctx.lineTo(-s * 0.36, -s * 0.32);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.33, -s * 0.12, -s * 0.24);
  ctx.quadraticCurveTo(-s * 0.2, s * 0.0, -s * 0.05, s * 0.18);
  ctx.quadraticCurveTo(s * 0.1, s * 0.4, -s * 0.05, s * 0.45);
  ctx.quadraticCurveTo(-s * 0.2, s * 0.42, -s * 0.12, s * 0.33);
  ctx.quadraticCurveTo(s * 0.0, s * 0.38, 0.0, s * 0.28);
  ctx.quadraticCurveTo(s * (v.belly ? 0.28 : 0.18), s * 0.0, s * 0.08, -s * 0.28);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.45, -s * 0.05, -s * 0.38);
  ctx.fill();
  ctx.save(); ctx.clip(); patternFish(ctx, { H: s, x0: -s / 2, bodyL: s }, s, v);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.2 + k * s * 0.04); ctx.lineTo(s * 0.2, -s * 0.18 + k * s * 0.04); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = rgba(v.c[1], 0.5); ctx.beginPath(); ctx.ellipse(s * 0.1, -s * 0.05, s * 0.06, s * 0.03 + Math.sin(t * 9) * s * 0.01, 0.3, 0, TAU); ctx.fill();
  eye(ctx, -s * 0.12, -s * 0.33, Math.max(0.8, s * 0.035), '#c8a85a');
  ctx.restore();
}
function drawSeadragon(ctx, L, v, t) {
  ctx.save(); ctx.rotate(-0.2 + Math.sin(t * 0.8) * 0.06);
  drawPipe(ctx, L, { ...v, h: 0.06 }, t);
  ctx.fillStyle = rgba(v.c[1], 0.8);
  for (let k = 0; k < (v.leafy ? 12 : 7); k++) {
    const x = -L * 0.3 + k * L * 0.06;
    const len = L * (v.leafy ? 0.13 : 0.07);
    ctx.save(); ctx.translate(x, (k % 2 ? -1 : 1) * L * 0.02); ctx.rotate((k % 2 ? -1 : 1) * (1.0 + Math.sin(t + k) * 0.15));
    ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, len * (v.leafy ? 0.22 : 0.12), 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function drawPipe(ctx, L, v, t) {
  const H = L * v.h;
  ctx.beginPath(); ctx.moveTo(-L * 0.5, 0);
  ctx.lineTo(-L * 0.3, -H * 0.4); ctx.quadraticCurveTo(0, -H * 0.7, L * 0.4, -H * 0.2);
  ctx.lineTo(L * 0.4, H * 0.2); ctx.quadraticCurveTo(0, H * 0.7, -L * 0.3, H * 0.4); ctx.closePath();
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]); ctx.fill();
  if (v.p) { ctx.save(); ctx.clip(); ctx.fillStyle = v.pc; for (let k = 0; k < 14; k++) ctx.fillRect(-L * 0.3 + k * L * 0.05, -H, L * 0.02, H * 2); ctx.restore(); }
  ctx.fillStyle = v.c[0]; ctx.beginPath(); ctx.arc(L * 0.45, 0, H * 0.9, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.3, -H * 0.1, Math.max(0.6, H * 0.35), '#c8a85a', false);
}

// ---------- invertebrates ----------
function drawJelly(ctx, L, v, t) {
  // L = bell diameter * ~2 (total incl. tentacles)
  const B = L * 0.38;
  const pulse = Math.sin(t * 2.2);
  const bw = B * (1 + pulse * 0.08), bh = B * (0.6 - pulse * 0.08);
  const c0 = hexToRgb(v.c[0]), c1 = hexToRgb(v.c[1]);
  // tentacles
  ctx.strokeStyle = rgbStr(c0, v.lionsmane ? 0.35 : 0.25); ctx.lineWidth = Math.max(0.5, B * 0.02);
  const nt = v.lionsmane ? 26 : v.box ? 8 : 14, tl = L * (v.lionsmane ? 1.6 : v.moon ? 0.25 : v.atolla ? 0.4 : 1.0);
  for (let k = 0; k < nt; k++) {
    const x0 = -bw * 0.9 + (k / (nt - 1)) * bw * 1.8;
    ctx.beginPath(); ctx.moveTo(x0, 0);
    for (let s = 1; s <= 8; s++) { const u = s / 8; ctx.lineTo(x0 + Math.sin(t * 1.3 + k + u * 4) * B * 0.12 * u, u * tl); }
    ctx.stroke();
  }
  if (v.nettle || v.lionsmane) {
    ctx.fillStyle = rgbStr(c1, 0.35);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-B * 0.3 + k * B * 0.2, B * 0.5 + Math.sin(t + k) * B * 0.05, B * 0.08, B * 0.6, Math.sin(t * 0.7 + k) * 0.2, 0, TAU); ctx.fill(); }
  }
  // bell
  const g = ctx.createRadialGradient(0, -bh * 0.4, 0, 0, -bh * 0.2, bw);
  g.addColorStop(0, rgbStr(mixRgb(c0, [255, 255, 255], 0.3), v.moon || v.box ? 0.35 : 0.75));
  g.addColorStop(1, rgbStr(c0, v.moon || v.box ? 0.12 : 0.45));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-bw, 0);
  if (v.box) { ctx.lineTo(-bw, -bh * 1.3); ctx.quadraticCurveTo(0, -bh * 1.6, bw, -bh * 1.3); ctx.lineTo(bw, 0); }
  else ctx.bezierCurveTo(-bw, -bh * 1.5, bw, -bh * 1.5, bw, 0);
  ctx.quadraticCurveTo(0, -bh * 0.25, -bw, 0); ctx.fill();
  ctx.strokeStyle = rgbStr(mixRgb(c0, [255, 255, 255], 0.5), 0.35); ctx.lineWidth = 1; ctx.stroke();
  if (v.moon) {
    ctx.strokeStyle = 'rgba(220,200,230,0.6)'; ctx.lineWidth = Math.max(1, B * 0.05);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-bw * 0.45 + k * bw * 0.3, -bh * 0.55, B * 0.1, PI, TAU); ctx.stroke(); }
  }
  return v.glow ? [[0, -bh * 0.5]] : null;
}
function drawComb(ctx, L, v, t) {
  ctx.fillStyle = 'rgba(220,235,245,0.18)'; ctx.strokeStyle = 'rgba(220,240,255,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 0, L * 0.25, L * 0.45, 0, 0, TAU); ctx.fill(); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const hue = (t * 120 + k * 60) % 360;
    ctx.strokeStyle = `hsla(${hue},90%,70%,0.6)`;
    ctx.beginPath(); ctx.ellipse(0, 0, L * (0.08 + k * 0.05), L * 0.42, 0, -1.2, 1.2); ctx.stroke();
  }
}
function drawSiphon(ctx, L, v, t) {
  ctx.fillStyle = 'rgba(240,190,170,0.4)';
  const n = 30;
  for (let k = 0; k < n; k++) {
    const u = k / n;
    const x = -L / 2 + u * L, y = Math.sin(t * 0.6 + u * 6) * L * 0.03;
    ctx.beginPath(); ctx.arc(x, y, L * 0.006 + (k % 3 === 0 ? L * 0.004 : 0), 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(240,200,180,0.15)'; ctx.lineWidth = 1;
  ctx.beginPath(); for (let k = 0; k <= n; k++) { const u = k / n; ctx.lineTo(-L / 2 + u * L, Math.sin(t * 0.6 + u * 6) * L * 0.03); } ctx.stroke();
  const pts = [];
  for (let k = 0; k < n; k += 3) { const u = k / n; pts.push([-L / 2 + u * L, Math.sin(t * 0.6 + u * 6) * L * 0.03]); }
  return pts;
}
function drawManowar(ctx, L, v, t) {
  ctx.strokeStyle = 'rgba(80,80,200,0.3)'; ctx.lineWidth = 1;
  for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.2 + k * L * 0.04, 0); for (let s = 1; s < 8; s++) ctx.lineTo(-L * 0.2 + k * L * 0.04 + Math.sin(t + k + s) * L * 0.03, s * L * 0.3); ctx.stroke(); }
  const g = ctx.createLinearGradient(0, -L * 0.3, 0, 0);
  g.addColorStop(0, 'rgba(200,140,230,0.85)'); g.addColorStop(1, 'rgba(90,110,230,0.75)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -L * 0.08, L * 0.4, L * 0.14, -0.05, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-L * 0.25, -L * 0.15); ctx.quadraticCurveTo(0, -L * 0.45, L * 0.3, -L * 0.15); ctx.fill();
}
function drawSquid(ctx, L, v, t, swim) {
  const H = L * 0.16;
  const pulse = Math.sin(t * 3) * 0.06;
  // mantle points backward (+x), arms forward (-x) - squid swim mantle-first, but drawing head-first reads better
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.moveTo(-L * 0.05, -H * 0.5);
  ctx.quadraticCurveTo(L * 0.3, -H * (0.5 + pulse), L * 0.5, 0);
  ctx.quadraticCurveTo(L * 0.3, H * (0.5 + pulse), -L * 0.05, H * 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(v.c[0], 0.6);
  finPath(ctx, [[L * 0.38, 0], [L * 0.48, -H * 0.8], [L * 0.5, 0], [L * 0.48, H * 0.8]]); ctx.fill();
  ctx.fillStyle = shade(v.c[0], 0.05);
  ctx.beginPath(); ctx.ellipse(-L * 0.1, 0, L * 0.07, H * 0.42, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = shade(v.c[0], 0.1); ctx.lineWidth = Math.max(1, H * 0.1); ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++) {
    const y0 = (k - 3.5) * H * 0.08;
    ctx.beginPath(); ctx.moveTo(-L * 0.15, y0);
    ctx.quadraticCurveTo(-L * 0.3, y0 * 1.6 + Math.sin(t * 2 + k) * H * 0.2, -L * (k === 2 || k === 5 ? 0.5 : 0.38), y0 * 1.3 + Math.sin(t * 2.5 + k) * H * 0.3);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  eye(ctx, -L * 0.1, -H * 0.05, Math.max(1, H * (v.giant ? 0.3 : 0.18)), '#c8c0a0');
  if (v.photo) { ctx.fillStyle = 'rgba(120,200,255,0.7)'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(L * (0.0 + k * 0.05), H * ((k % 2) - 0.5) * 0.4, Math.max(0.6, H * 0.06), 0, TAU); ctx.fill(); } }
}
function drawCuttle(ctx, L, v, t) {
  const H = L * 0.35;
  ctx.fillStyle = rgba(v.c[1], 0.55);
  ctx.beginPath(); ctx.ellipse(L * 0.05, 0, L * 0.42, H * 0.62 + Math.sin(t * 6) * H * 0.04, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.ellipse(L * 0.05, 0, L * 0.38, H * 0.48, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = rgba(v.pc, 0.5); ctx.lineWidth = H * 0.06;
  for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.2 + k * L * 0.06 + Math.sin(t * 2 + k) * 2, -H); ctx.lineTo(-L * 0.25 + k * L * 0.06, H * 0.1); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = shade(v.c[0], 0.1); ctx.lineWidth = Math.max(1, H * 0.08);
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.3, (k - 2) * H * 0.08); ctx.quadraticCurveTo(-L * 0.42, (k - 2) * H * 0.12, -L * 0.5, (k - 2) * H * 0.1 + Math.sin(t * 2 + k) * H * 0.06); ctx.stroke(); }
  eye(ctx, -L * 0.22, -H * 0.18, Math.max(1, H * 0.12), '#c8b890');
}
function drawOctopus(ctx, L, v, t) {
  const s = L * (v.small ? 0.8 : 1);
  const c0 = v.c[0];
  ctx.strokeStyle = c0; ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++) {
    const side = k < 4 ? -1 : 1;
    const base = (k % 4) / 3;
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.beginPath(); ctx.moveTo(side * s * 0.05, s * 0.05);
    const cx = side * s * (0.15 + base * 0.15), cy = s * 0.18;
    const ex = side * s * (0.25 + base * 0.25) + Math.sin(t * 1.2 + k) * s * 0.04, ey = s * 0.22 + Math.cos(t * 1.1 + k) * s * 0.03;
    ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
    ctx.lineWidth = Math.max(0.6, s * 0.02);
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.quadraticCurveTo(ex + side * s * 0.08, ey - s * 0.04, ex + side * s * 0.1, ey - s * 0.08 + Math.sin(t + k) * s * 0.03); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const g = ctx.createRadialGradient(-s * 0.03, -s * 0.18, 0, 0, -s * 0.08, s * 0.25);
  g.addColorStop(0, shade(v.c[1], 0.1)); g.addColorStop(1, shade(c0, -0.15));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(s * 0.05, -s * 0.12, s * 0.16, s * 0.2, 0.5, 0, TAU); ctx.fill();
  if (v.p === 'rings') { ctx.strokeStyle = v.pc; ctx.lineWidth = Math.max(0.8, s * 0.015); for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(s * (-0.05 + (k % 3) * 0.07), -s * (0.05 + Math.floor(k / 3) * 0.12), s * 0.03, 0, TAU); ctx.stroke(); } }
  ctx.fillStyle = shade(c0, 0.05); ctx.beginPath(); ctx.ellipse(-s * 0.06, 0, s * 0.11, s * 0.08, 0, 0, TAU); ctx.fill();
  eye(ctx, -s * 0.1, -s * 0.03, Math.max(1, s * 0.03), '#d8c890');
}
function drawDumbo(ctx, L, v, t) {
  const s = L;
  const flap = Math.sin(t * 2);
  ctx.fillStyle = rgba(v.c[0], 0.85);
  ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.25, s * 0.12, s * 0.06, -0.6 - flap * 0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(s * 0.2, -s * 0.25, s * 0.12, s * 0.06, 0.6 + flap * 0.4, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(v.c[0], 0.6);
  ctx.beginPath(); ctx.moveTo(-s * 0.25, 0); ctx.quadraticCurveTo(0, s * (0.5 + flap * 0.05), s * 0.25, 0); ctx.fill();
  const g = ctx.createRadialGradient(0, -s * 0.2, 0, 0, -s * 0.1, s * 0.3);
  g.addColorStop(0, shade(v.c[1], 0.15)); g.addColorStop(1, v.c[0]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.22, s * 0.24, 0, 0, TAU); ctx.fill();
  eye(ctx, -s * 0.08, -s * 0.06, Math.max(1, s * 0.035), '#2a1a1a');
}
function drawVampire(ctx, L, v, t) {
  drawDumbo(ctx, L, { c: [v.c[0], v.c[1]] }, t);
  eye(ctx, -L * 0.08, -L * 0.06, Math.max(1, L * 0.05), v.eyec);
  return [[-L * 0.15, L * 0.2], [L * 0.15, L * 0.2]];
}
function drawNautilus(ctx, L, v, t) {
  const r = L * 0.42;
  ctx.strokeStyle = 'rgba(200,190,170,0.6)'; ctx.lineWidth = 1;
  for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.2); ctx.lineTo(-r * 1.1 + Math.sin(t + k) * r * 0.1, r * (0.0 + k * 0.04)); ctx.stroke(); }
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, 0, 0, 0, r);
  g.addColorStop(0, '#f4ece0'); g.addColorStop(1, '#c8b8a0');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  ctx.fillStyle = 'rgba(150,70,40,0.75)';
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(r * (0.0 + k * 0.15) - r * 0.3, -r); ctx.quadraticCurveTo(r * (0.2 + k * 0.15), 0, r * (0.0 + k * 0.15) - r * 0.2, -r * 0.0); ctx.lineTo(r * (0.06 + k * 0.15) - r * 0.2, 0); ctx.quadraticCurveTo(r * (0.27 + k * 0.15), -r * 0.3, r * (0.07 + k * 0.15) - r * 0.3, -r); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#6a4a3a'; ctx.beginPath(); ctx.ellipse(-r * 0.75, r * 0.15, r * 0.3, r * 0.25, 0, 0, TAU); ctx.fill();
  eye(ctx, -r * 0.8, r * 0.05, Math.max(1, r * 0.08), '#2a2420', false);
}
function legs(ctx, cx, cy, n, len, spread, t, col, lw) {
  ctx.strokeStyle = col; ctx.lineWidth = lw;
  for (let k = 0; k < n; k++) {
    const x = cx + (k - (n - 1) / 2) * spread;
    const kneeY = cy - len * 0.25 + Math.sin(t * 3 + k) * len * 0.04;
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + (k - (n - 1) / 2) * spread * 0.6, kneeY); ctx.lineTo(x + (k - (n - 1) / 2) * spread * 1.1, cy + len * 0.5); ctx.stroke();
  }
}
function drawCrab(ctx, L, v, t) {
  const s = L;
  const c0 = v.c[0];
  if (v.spider) {
    legs(ctx, 0, 0, 8, s * 1.0, s * 0.1, t * 0.5, shade(c0, 0.05), Math.max(1, s * 0.025));
  } else legs(ctx, 0, s * 0.02, 8, s * 0.6, s * 0.07, t * 0.5, shade(c0, -0.1), Math.max(1, s * 0.04));
  const bw = v.spider ? s * 0.18 : s * 0.38, bh = v.spider ? s * 0.16 : s * 0.18;
  const g = ctx.createLinearGradient(0, -bh, 0, bh);
  g.addColorStop(0, shade(c0, 0.1)); g.addColorStop(1, shade(c0, -0.3));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -bh * 0.3, bw, bh, 0, PI, TAU); ctx.lineTo(bw, -bh * 0.3); ctx.quadraticCurveTo(0, bh * 0.4, -bw, -bh * 0.3); ctx.fill();
  if (v.king || v.snow) { ctx.fillStyle = 'rgba(255,240,220,0.2)'; for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.arc(-bw * 0.8 + k * bw * 0.18, -bh * 0.6 - (k % 2) * bh * 0.2, s * 0.012, 0, TAU); ctx.fill(); } }
  if (v.yeti) { ctx.strokeStyle = 'rgba(240,235,220,0.6)'; ctx.lineWidth = 1; for (let k = 0; k < 20; k++) { ctx.beginPath(); ctx.moveTo(-bw - k * s * 0.01, -bh * 0.2); ctx.lineTo(-bw - k * s * 0.012, bh * 0.4); ctx.stroke(); } }
  // claws
  ctx.fillStyle = v.swim ? v.c[1] : shade(c0, 0.05);
  ctx.beginPath(); ctx.ellipse(-bw * 1.2, -bh * 0.5, s * 0.1, s * 0.05, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(bw * 1.2, -bh * 0.5, s * 0.1, s * 0.05, 0.4, 0, TAU); ctx.fill();
  eye(ctx, -bw * 0.25, -bh * 1.2, Math.max(0.7, s * 0.015), '#1a1a1a', false);
  eye(ctx, bw * 0.05, -bh * 1.2, Math.max(0.7, s * 0.015), '#1a1a1a', false);
}
function drawLobster(ctx, L, v, t) {
  const H = L * 0.14;
  const c0 = v.c[0];
  legs(ctx, -L * 0.05, H * 0.3, 4, L * 0.25, L * 0.06, t * 0.5, shade(c0, -0.1), Math.max(1, L * 0.012));
  ctx.fillStyle = bodyGradient(ctx, -H / 2, H / 2, c0, v.c[1]);
  ctx.beginPath(); ctx.ellipse(-L * 0.12, 0, L * 0.18, H * 0.5, 0, 0, TAU); ctx.fill();
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(L * (0.08 + k * 0.065), H * 0.04 * k, L * 0.045, H * (0.42 - k * 0.04), 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = shade(c0, -0.1); finPath(ctx, [[L * 0.38, H * 0.1], [L * 0.5, -H * 0.3], [L * 0.5, H * 0.6]]); ctx.fill();
  ctx.strokeStyle = shade(c0, 0.1); ctx.lineWidth = Math.max(0.6, L * 0.006);
  ctx.beginPath(); ctx.moveTo(-L * 0.3, -H * 0.2); ctx.quadraticCurveTo(-L * 0.6, -H * 1.5, -L * (v.spiny ? 0.9 : 0.7), -H * (v.spiny ? 0.6 : 2) + Math.sin(t) * H * 0.2); ctx.stroke();
  if (!v.spiny) {
    ctx.fillStyle = shade(c0, 0.05);
    ctx.beginPath(); ctx.ellipse(-L * 0.42, H * 0.3, L * 0.1, H * 0.35, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-L * 0.4, -H * 0.1, L * 0.09, H * 0.3, 0.2, 0, TAU); ctx.fill();
  }
  eye(ctx, -L * 0.28, -H * 0.35, Math.max(0.6, H * 0.08), '#111', false);
}
function drawShrimp(ctx, L, v, t) {
  const H = L * 0.16;
  ctx.save(); ctx.rotate(v.mantis ? 0 : -0.1);
  const g = ctx.createLinearGradient(0, -H, 0, H);
  g.addColorStop(0, v.c[0]); g.addColorStop(1, v.c[1]);
  ctx.fillStyle = g;
  ctx.globalAlpha = v.krill ? 0.8 : 1;
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.ellipse(-L * 0.25 + k * L * 0.08, Math.sin(k * 0.4) * H * 0.4, L * 0.07, H * (0.5 - k * 0.04), 0, 0, TAU); ctx.fill(); }
  if (!v.mantis) { ctx.strokeStyle = '#ece8e0'; ctx.lineWidth = Math.max(0.5, L * 0.012); ctx.beginPath(); ctx.moveTo(-L * 0.25, -H * 0.4); ctx.lineTo(L * 0.35, -H * 0.3); ctx.stroke(); }
  ctx.strokeStyle = shade(v.c[0], 0.2); ctx.lineWidth = Math.max(0.5, L * 0.008);
  ctx.beginPath(); ctx.moveTo(-L * 0.3, -H * 0.2); ctx.quadraticCurveTo(-L * 0.7, -H * 2, -L * 0.6 + Math.sin(t * 2) * L * 0.05, -H * 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-L * 0.3, -H * 0.2); ctx.quadraticCurveTo(-L * 0.8, -H, -L * 0.85, -H * 0.2); ctx.stroke();
  legs(ctx, -L * 0.05, H * 0.3, 5, L * 0.18, L * 0.05, t, shade(v.c[0], 0.1), Math.max(0.5, L * 0.008));
  eye(ctx, -L * 0.3, -H * 0.5, Math.max(0.7, H * (v.mantis ? 0.25 : 0.15)), v.mantis ? '#3ac87a' : '#111', false);
  ctx.restore();
}
function drawIsopod(ctx, L, v, t) {
  const H = L * 0.3;
  legs(ctx, 0, 0, 7, L * 0.25, L * 0.1, t * 0.4, shade(v.c[0], -0.2), Math.max(1, L * 0.02));
  ctx.fillStyle = bodyGradient(ctx, -H, 0, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.ellipse(0, -H * 0.1, L * 0.5, H * 0.75, 0, PI, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let k = 1; k < 9; k++) { const x = -L * 0.5 + k * L * 0.11; ctx.beginPath(); ctx.moveTo(x, -H * 0.1); ctx.quadraticCurveTo(x + L * 0.02, -H * 0.6, x, -H * 0.8 * Math.sin((k / 9) * PI)); ctx.stroke(); }
  eye(ctx, -L * 0.4, -H * 0.4, Math.max(0.8, H * 0.12), '#2a2a2a', true);
}
function drawStar(ctx, L, v, t) {
  // side view: low profile with arms splayed
  const n = v.arms;
  ctx.fillStyle = bodyGradient(ctx, -L * 0.1, 0, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.ellipse(0, -L * 0.03, L * 0.12, L * 0.05, 0, PI, TAU); ctx.fill();
  ctx.lineCap = 'round';
  for (let k = 0; k < Math.min(n, 9); k++) {
    const x = -L * 0.45 + (k / (Math.min(n, 9) - 1)) * L * 0.9;
    ctx.strokeStyle = shade(v.c[0], ((k % 3) - 1) * 0.1); ctx.lineWidth = Math.max(1, L * (n > 6 ? 0.04 : 0.08));
    ctx.beginPath(); ctx.moveTo(0, -L * 0.03); ctx.quadraticCurveTo(x * 0.5, -L * 0.08 - Math.sin(t * 0.3 + k) * L * 0.01, x, 0); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  if (v.spiny) { ctx.strokeStyle = 'rgba(220,180,180,0.6)'; ctx.lineWidth = 1; for (let k = 0; k < 20; k++) { const x = -L * 0.4 + k * L * 0.04; ctx.beginPath(); ctx.moveTo(x, -L * 0.04); ctx.lineTo(x, -L * 0.09); ctx.stroke(); } }
}
function drawUrchin(ctx, L, v) {
  const r = L * 0.3;
  ctx.strokeStyle = v.c[0]; ctx.lineWidth = Math.max(0.6, L * 0.02);
  for (let k = 0; k < 28; k++) { const a = PI + (k / 27) * PI; ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(Math.cos(a) * r * 1.6, -r * 0.5 + Math.sin(a) * r * 1.4); ctx.stroke(); }
  ctx.fillStyle = shade(v.c[0], -0.2); ctx.beginPath(); ctx.ellipse(0, -r * 0.4, r, r * 0.6, 0, PI, TAU); ctx.fill();
}
function drawCucumber(ctx, L, v, t) {
  const H = L * 0.2;
  ctx.fillStyle = bodyGradient(ctx, -H, 0, v.c[0], v.c[1]);
  ctx.beginPath(); ctx.ellipse(0, -H * 0.5, L * 0.5, H * 0.6, 0, 0, TAU); ctx.fill();
  if (v.p) { ctx.save(); ctx.clip(); ctx.fillStyle = v.pc; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(-L * 0.45 + k * L * 0.07, -H * 0.5 + Math.sin(k * 2) * H * 0.2, H * 0.12, 0, TAU); ctx.fill(); ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.arc(-L * 0.45 + k * L * 0.07, -H * 0.5 + Math.sin(k * 2) * H * 0.2, H * 0.05, 0, TAU); ctx.fill(); ctx.fillStyle = v.pc; } ctx.restore(); }
}
function drawSeapig(ctx, L, v, t) {
  const H = L * 0.35;
  legs(ctx, 0, -H * 0.1, 5, L * 0.3, L * 0.15, t * 0.3, shade(v.c[0], -0.05), Math.max(1, L * 0.04));
  const g = ctx.createLinearGradient(0, -H, 0, 0); g.addColorStop(0, 'rgba(240,200,210,0.75)'); g.addColorStop(1, 'rgba(200,150,170,0.7)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -H * 0.55, L * 0.45, H * 0.5, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(230,190,200,0.75)'; ctx.lineWidth = Math.max(1, L * 0.035);
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.1 + k * L * 0.1, -H); ctx.lineTo(-L * 0.12 + k * L * 0.1 + Math.sin(t + k) * L * 0.03, -H * 1.5); ctx.stroke(); }
}
function drawBasket(ctx, L, v, t) {
  ctx.strokeStyle = rgba(v.c[0], 0.85);
  const branch = (x, y, a, len, depth) => {
    if (depth <= 0 || len < 1) return;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    ctx.lineWidth = Math.max(0.5, depth * 0.5);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    const sw = Math.sin(t * 0.8 + depth) * 0.1;
    branch(ex, ey, a - 0.45 + sw, len * 0.72, depth - 1);
    branch(ex, ey, a + 0.45 + sw, len * 0.72, depth - 1);
  };
  for (let k = 0; k < 5; k++) branch(0, -L * 0.05, -PI / 2 + (k - 2) * 0.5, L * 0.15, 5);
  ctx.fillStyle = v.c[0]; ctx.beginPath(); ctx.ellipse(0, -L * 0.04, L * 0.08, L * 0.04, 0, 0, TAU); ctx.fill();
}

// ---------- plants / corals / sessile ----------
function drawSeagrass(ctx, L, v, t, phase) {
  ctx.lineCap = 'round';
  for (let k = 0; k < 9; k++) {
    const x = (k - 4) * L * 0.06;
    const h = L * (0.6 + ((k * 37) % 10) / 25);
    const sw = Math.sin(t * 1.2 + phase + k * 0.4) * h * 0.18;
    ctx.strokeStyle = shade(k % 2 ? v.c[0] : v.c[1], ((k % 3) - 1) * 0.08);
    ctx.lineWidth = Math.max(1, L * (v.wide ? 0.035 : 0.02));
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw * 0.3, -h * 0.5, x + sw, -h); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function drawSeaLettuce(ctx, L, v, t, phase) {
  for (let k = 0; k < 5; k++) {
    ctx.fillStyle = rgba(k % 2 ? v.c[0] : v.c[1], 0.75);
    ctx.save(); ctx.rotate(-0.8 + k * 0.4 + Math.sin(t + phase + k) * 0.08);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-L * 0.2, -L * 0.2, -L * 0.1, -L * 0.5, 0, -L * 0.45); ctx.bezierCurveTo(L * 0.12, -L * 0.5, L * 0.15, -L * 0.2, 0, 0); ctx.fill();
    ctx.restore();
  }
}
function drawKelpSmall(ctx, L, v, t, phase) {
  // sugar kelp / oarweed: a stipe with long blades
  ctx.strokeStyle = shade(v.c[0], -0.2); ctx.lineWidth = Math.max(1, L * 0.03);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(L * 0.05, -L * 0.2, Math.sin(t + phase) * L * 0.05, -L * 0.3); ctx.stroke();
  for (let k = 0; k < (v.s === 'oarweed' ? 5 : 1); k++) {
    ctx.fillStyle = rgba(k % 2 ? v.c[0] : v.c[1], 0.85);
    const sw = Math.sin(t * 0.9 + phase + k * 0.5) * L * 0.25;
    ctx.beginPath(); ctx.moveTo(0, -L * 0.3);
    ctx.bezierCurveTo(-L * 0.12 + sw * 0.3, -L * 0.6, sw - L * 0.05 + k * L * 0.03, -L * 0.85, sw + k * L * 0.03, -L);
    ctx.bezierCurveTo(sw + L * 0.06, -L * 0.8, L * 0.12 + sw * 0.3, -L * 0.6, 0, -L * 0.3); ctx.fill();
  }
}
function drawSargassum(ctx, L, v, t) {
  for (let k = 0; k < 18; k++) {
    const x = ((k * 37) % 100 - 50) / 100 * L, y = ((k * 53) % 40 - 10) / 100 * L;
    ctx.fillStyle = rgba(k % 2 ? v.c[0] : v.c[1], 0.85);
    ctx.beginPath(); ctx.ellipse(x, y + Math.sin(t + k) * 2, L * 0.05, L * 0.02, k, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c8a050'; ctx.beginPath(); ctx.arc(x + L * 0.03, y + L * 0.02, L * 0.012, 0, TAU); ctx.fill();
  }
}
function drawStaghorn(ctx, L, v) {
  ctx.strokeStyle = v.c[0]; ctx.lineCap = 'round';
  const br = (x, y, a, len, d) => {
    if (d <= 0) return;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    ctx.lineWidth = Math.max(1, d * L * 0.012); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    br(ex, ey, a - 0.4, len * 0.78, d - 1); if (d % 2) br(ex, ey, a + 0.45, len * 0.7, d - 1);
  };
  br(0, 0, -PI / 2 - 0.3, L * 0.22, 5); br(0, 0, -PI / 2 + 0.4, L * 0.2, 5);
  ctx.strokeStyle = v.c[1]; ctx.lineCap = 'butt';
}
function drawBrain(ctx, L, v) {
  const g = ctx.createRadialGradient(-L * 0.1, -L * 0.3, 0, 0, -L * 0.15, L * 0.5);
  g.addColorStop(0, v.c[1]); g.addColorStop(1, shade(v.c[0], -0.3));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.38, 0, PI, TAU); ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(60,50,20,0.4)'; ctx.lineWidth = Math.max(1, L * 0.015);
  for (let k = 0; k < 12; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.5, -L * 0.03 * k); for (let s = 0; s < 20; s++) ctx.lineTo(-L * 0.5 + s * L * 0.05, -L * 0.03 * k + Math.sin(s * 1.7 + k) * L * 0.012); ctx.stroke(); }
  ctx.restore();
}
function drawAnemone(ctx, L, v, t, phase) {
  ctx.fillStyle = shade(v.c[0], -0.1); ctx.fillRect(-L * 0.18, -L * 0.25, L * 0.36, L * 0.25);
  ctx.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const x = -L * 0.35 + (k / 25) * L * 0.7;
    const sw = Math.sin(t * 1.1 + phase + k * 0.3) * L * 0.08;
    ctx.strokeStyle = rgba(v.c[1], 0.85); ctx.lineWidth = Math.max(1, L * 0.035);
    ctx.beginPath(); ctx.moveTo(x * 0.5, -L * 0.24); ctx.quadraticCurveTo(x, -L * 0.4, x * 1.2 + sw, -L * 0.55 - Math.abs(Math.sin(k)) * L * 0.08); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
function drawPlumose(ctx, L, v, t, phase) {
  ctx.fillStyle = rgba(v.c[0], 0.9);
  ctx.fillRect(-L * 0.08, -L * 0.6, L * 0.16, L * 0.6);
  for (let k = 0; k < 16; k++) {
    ctx.fillStyle = rgba(v.c[1], 0.45);
    ctx.beginPath(); ctx.arc(Math.sin(k * 1.7) * L * 0.18 + Math.sin(t + phase) * L * 0.02, -L * 0.7 - Math.cos(k * 2.3) * L * 0.1, L * 0.1, 0, TAU); ctx.fill();
  }
}
function drawLophelia(ctx, L, v) {
  ctx.strokeStyle = v.c[0]; ctx.lineCap = 'round';
  const br = (x, y, a, len, d) => {
    if (d <= 0) return;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    ctx.lineWidth = Math.max(1, L * 0.018); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.arc(ex, ey, L * 0.022, 0, TAU); ctx.fill();
    br(ex, ey, a - 0.5, len * 0.85, d - 1); br(ex, ey, a + 0.5, len * 0.85, d - 1);
  };
  br(0, 0, -PI / 2, L * 0.14, 6); ctx.lineCap = 'butt';
}
function drawBubblegum(ctx, L, v, t) {
  ctx.strokeStyle = shade(v.c[0], -0.15); ctx.lineCap = 'round';
  const br = (x, y, a, len, d) => {
    if (d <= 0) { ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.arc(x, y, L * 0.03, 0, TAU); ctx.fill(); return; }
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    ctx.lineWidth = Math.max(1, d * L * 0.01); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    br(ex, ey, a - 0.6, len * 0.75, d - 1); br(ex, ey, a + 0.55, len * 0.75, d - 1);
  };
  br(0, 0, -PI / 2, L * 0.25, 5); ctx.lineCap = 'butt';
}
function drawGlassSponge(ctx, L, v) {
  ctx.strokeStyle = 'rgba(230,235,230,0.55)'; ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(220,225,220,0.15)';
  ctx.beginPath(); ctx.moveTo(-L * 0.06, 0); ctx.quadraticCurveTo(-L * 0.18, -L * 0.5, -L * 0.1, -L * 0.95); ctx.lineTo(L * 0.1, -L * 0.95); ctx.quadraticCurveTo(L * 0.18, -L * 0.5, L * 0.06, 0); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.clip();
  for (let k = -8; k < 8; k++) { ctx.beginPath(); ctx.moveTo(k * L * 0.04, 0); ctx.lineTo(k * L * 0.04 + L * 0.4, -L); ctx.moveTo(k * L * 0.04, 0); ctx.lineTo(k * L * 0.04 - L * 0.4, -L); ctx.stroke(); }
  ctx.restore();
}
function drawBarrelSponge(ctx, L, v) {
  const g = ctx.createLinearGradient(-L * 0.4, 0, L * 0.4, 0);
  g.addColorStop(0, shade(v.c[0], -0.3)); g.addColorStop(0.4, v.c[1]); g.addColorStop(1, shade(v.c[0], -0.35));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-L * 0.25, 0); ctx.lineTo(-L * 0.42, -L * 0.7); ctx.quadraticCurveTo(0, -L * 0.6, L * 0.42, -L * 0.7); ctx.lineTo(L * 0.25, 0); ctx.fill();
  ctx.fillStyle = '#1a0e0a'; ctx.beginPath(); ctx.ellipse(0, -L * 0.69, L * 0.36, L * 0.06, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.4)'; ctx.lineWidth = Math.max(1, L * 0.012);
  for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.3, -L * 0.08 * k); ctx.quadraticCurveTo(0, -L * 0.08 * k + L * 0.04, L * 0.3, -L * 0.08 * k); ctx.stroke(); }
}
function drawClam(ctx, L, v, t) {
  const W = L * 0.5, H = L * 0.22;
  const open = v.giant ? 0.25 + Math.sin(t * 0.5) * 0.03 : 0.05;
  if (v.giant) { ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.ellipse(0, -H * 0.9, W * 0.9, H * open * 2.5, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = bodyGradient(ctx, -H * 2, 0, shade(v.c[0], 0.1), shade(v.c[0], -0.3));
  ctx.beginPath(); ctx.moveTo(-W, -H * 0.7); ctx.bezierCurveTo(-W, -H * 2.2, W, -H * 2.2, W, -H * 0.7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-W, -H * 0.5); ctx.bezierCurveTo(-W, H * 0.4, W, H * 0.4, W, -H * 0.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-W * (0.8 - k * 0.35), -H * 0.6); ctx.lineTo(-W * (0.6 - k * 0.3), -H * 1.6); ctx.stroke(); }
}
function drawMussel(ctx, L, v) {
  for (let k = 0; k < 5; k++) {
    const x = (k - 2) * L * 0.22, a = -0.6 + k * 0.3;
    ctx.save(); ctx.translate(x, -L * 0.08); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, -L * 0.1, 0, L * 0.1); g.addColorStop(0, v.c[1]); g.addColorStop(1, v.c[0]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.18, L * 0.08, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(160,180,220,0.18)'; ctx.beginPath(); ctx.ellipse(-L * 0.04, -L * 0.03, L * 0.08, L * 0.02, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function drawScallop(ctx, L, v) {
  ctx.fillStyle = bodyGradient(ctx, -L * 0.4, 0, v.c[1], v.c[0]);
  ctx.beginPath(); ctx.moveTo(0, -L * 0.02); ctx.arc(0, -L * 0.05, L * 0.35, PI * 1.08, PI * 1.92); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(80,40,20,0.35)'; ctx.lineWidth = Math.max(1, L * 0.02);
  for (let k = 0; k < 9; k++) { const a = PI * 1.12 + k * PI * 0.095; ctx.beginPath(); ctx.moveTo(0, -L * 0.03); ctx.lineTo(Math.cos(a) * L * 0.34, -L * 0.05 + Math.sin(a) * L * 0.34); ctx.stroke(); }
  ctx.fillStyle = '#3a8aff'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(-L * 0.25 + k * L * 0.07, -L * 0.02, L * 0.01, 0, TAU); ctx.fill(); }
}
function drawConch(ctx, L, v) {
  const g = ctx.createLinearGradient(-L * 0.5, 0, L * 0.5, 0); g.addColorStop(0, v.c[0]); g.addColorStop(1, shade(v.c[0], -0.25));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-L * 0.5, -L * 0.05); ctx.lineTo(-L * 0.1, -L * 0.32); ctx.lineTo(L * 0.1, -L * 0.42); ctx.lineTo(L * 0.2, -L * 0.3); ctx.lineTo(L * 0.5, -L * 0.15); ctx.lineTo(L * 0.4, 0); ctx.lineTo(-L * 0.4, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.ellipse(-L * 0.15, -L * 0.05, L * 0.2, L * 0.06, -0.1, 0, TAU); ctx.fill();
}
function drawAbalone(ctx, L, v) {
  ctx.fillStyle = bodyGradient(ctx, -L * 0.25, 0, v.c[1], v.c[0]);
  ctx.beginPath(); ctx.ellipse(0, 0, L * 0.5, L * 0.22, 0, PI, TAU); ctx.fill();
  ctx.fillStyle = '#2a1a14'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(-L * 0.3 + k * L * 0.12, -L * (0.1 + k * 0.015), L * 0.025, 0, TAU); ctx.fill(); }
}
function drawOyster(ctx, L, v) {
  ctx.fillStyle = bodyGradient(ctx, -L * 0.3, 0, v.c[1], v.c[0]);
  ctx.beginPath(); ctx.moveTo(-L * 0.5, 0);
  for (let k = 0; k <= 10; k++) ctx.lineTo(-L * 0.5 + k * L * 0.1, -L * 0.15 - Math.sin(k * 2.1) * L * 0.06 - Math.sin((k / 10) * PI) * L * 0.08);
  ctx.lineTo(L * 0.5, 0); ctx.fill();
}
function drawNudi(ctx, L, v, t) {
  const H = L * 0.22;
  const wave = Math.sin(t * 3);
  ctx.fillStyle = v.c[0];
  ctx.beginPath(); ctx.moveTo(-L * 0.5, 0);
  for (let k = 0; k <= 16; k++) { const u = k / 16; ctx.lineTo(-L * 0.5 + u * L, -H * (0.4 + Math.sin(u * PI) * 0.6) + Math.sin(t * 4 + u * 10) * H * 0.2 * wave); }
  for (let k = 16; k >= 0; k--) { const u = k / 16; ctx.lineTo(-L * 0.5 + u * L, H * (0.4 + Math.sin(u * PI) * 0.6) - Math.sin(t * 4 + u * 10) * H * 0.2 * wave); }
  ctx.fill();
  ctx.fillStyle = shade(v.c[1], 0.1); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.4, H * 0.4, 0, 0, TAU); ctx.fill();
}
function drawGardenEel(ctx, L, v, t, phase) {
  for (let k = 0; k < 3; k++) {
    const x = (k - 1) * L * 0.5;
    const h = L * (0.5 + k * 0.1);
    const sw = Math.sin(t * 0.8 + phase + k) * L * 0.12;
    ctx.strokeStyle = v.c[0]; ctx.lineWidth = Math.max(1, L * 0.035); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw * 0.3, -h * 0.6, x + sw, -h); ctx.quadraticCurveTo(x + sw - L * 0.05, -h * 1.05, x + sw - L * 0.08, -h * 0.98); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + sw - L * 0.02, -h * 1.0, Math.max(0.6, L * 0.01), 0, TAU); ctx.fill();
  }
  ctx.lineCap = 'butt';
}
function drawTubeworm(ctx, L, v, t, phase) {
  for (let k = 0; k < 5; k++) {
    const x = (k - 2) * L * 0.08;
    const h = L * (0.6 + ((k * 7) % 5) * 0.08);
    ctx.strokeStyle = shade(v.c[0], -0.1 + k * 0.03); ctx.lineWidth = Math.max(1, L * 0.05);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + L * 0.04, -h * 0.5, x + Math.sin(phase + k) * L * 0.05, -h); ctx.stroke();
    ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.ellipse(x + Math.sin(phase + k) * L * 0.05 + Math.sin(t + k) * L * 0.01, -h - L * 0.05, L * 0.05, L * 0.08, 0, 0, TAU); ctx.fill();
  }
}
function drawXmasTree(ctx, L, v, t, phase) {
  for (let s = -1; s <= 1; s += 2) {
    ctx.fillStyle = s < 0 ? v.c[0] : v.c[1];
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(s * L * 0.12, -L * (0.12 + k * 0.08), L * (0.12 - k * 0.02), L * 0.03, 0, 0, TAU); ctx.fill(); }
  }
}
function drawBobbit(ctx, L, v, t, phase) {
  const s = L * 0.12;
  ctx.fillStyle = v.c[1];
  const open = 0.5 + Math.sin(t * 0.7 + phase) * 0.3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * open, -s * 1.2); ctx.lineTo(-s * 0.1, -s * 0.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * open, -s * 1.2); ctx.lineTo(s * 0.1, -s * 0.4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = v.c[0]; ctx.lineWidth = Math.max(1, s * 0.25); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.4); ctx.stroke();
}
function drawSeasquirt(ctx, L, v) {
  const g = ctx.createLinearGradient(-L * 0.2, 0, L * 0.2, 0); g.addColorStop(0, v.c[0]); g.addColorStop(0.5, shade(v.c[0], 0.25)); g.addColorStop(1, v.c[0]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -L * 0.3, L * 0.2, L * 0.32, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.arc(0, -L * 0.6, L * 0.06, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(L * 0.12, -L * 0.35, L * 0.05, 0, TAU); ctx.fill();
}
function drawTurtle(ctx, L, v, t) {
  const flap = Math.sin(t * 1.5);
  ctx.fillStyle = shade(v.c[0], -0.2);
  ctx.save(); ctx.translate(-L * 0.1, L * 0.02); ctx.rotate(0.6 + flap * 0.5); ctx.beginPath(); ctx.ellipse(L * 0.22, 0, L * 0.25, L * 0.05, 0, 0, TAU); ctx.fill(); ctx.restore();
  const g = ctx.createLinearGradient(0, -L * 0.25, 0, L * 0.1);
  g.addColorStop(0, '#6a5a3a'); g.addColorStop(0.5, v.c[0]); g.addColorStop(1, v.c[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.35, L * 0.18, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.35, L * 0.18, 0, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(30,25,10,0.4)'; ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.3 + k * L * 0.12, -L * 0.2); ctx.lineTo(-L * 0.28 + k * L * 0.12, L * 0.0); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.ellipse(-L * 0.43, -L * 0.02, L * 0.1, L * 0.07, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(v.c[0], -0.1);
  ctx.save(); ctx.translate(-L * 0.12, L * 0.02); ctx.rotate(0.3 - flap * 0.5); ctx.beginPath(); ctx.ellipse(L * 0.18, 0, L * 0.25, L * 0.06, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.ellipse(L * 0.33, L * 0.08, L * 0.08, L * 0.03, 0.4, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.46, -L * 0.04, Math.max(0.8, L * 0.015), '#1a1a1a');
}
function drawSwallower(ctx, L, v, t, swim) {
  drawFish(ctx, L, { ...v, t: 'fork', f: '#1a1414', belly: 1 }, t, swim);
  const H = L * v.h;
  ctx.fillStyle = 'rgba(60,40,40,0.8)'; ctx.beginPath(); ctx.ellipse(-L * 0.05, H * 0.45, L * 0.18, H * 0.5, 0, 0, TAU); ctx.fill();
}
function drawDragon(ctx, L, v, t, swim) {
  drawEel(ctx, L, { ...v, f: '#0c0a0a' }, t, swim * 0.5);
  const H = L * v.h;
  ctx.strokeStyle = 'rgba(40,30,30,0.9)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-L * 0.47, H * 0.4); ctx.quadraticCurveTo(-L * 0.45, H * 4, -L * 0.42, H * 5); ctx.stroke();
  return [[-L * 0.42, H * 5]];
}
function drawCoral(ctx, L, v) { drawLophelia(ctx, L, v); }

export const RENDERERS = {
  fish: drawFish, shark: drawShark, ray: drawRay, eel: drawEel, angler: drawAngler, fangtooth: drawFangtooth,
  viper: drawViper, barreleye: drawBarreleye, gulper: drawGulper, hatchet: drawHatchet, blob: drawBlob,
  rattail: drawRattail, ratfish: drawRatfish, tripod: drawTripod, mola: drawMola, billfish: drawBillfish,
  oarfish: drawOarfish, box: drawBox, stone: drawStone, frog: drawFrog, flat: drawFlat, seahorse: drawSeahorse,
  seadragon: drawSeadragon, pipefish: drawPipe, jelly: drawJelly, comb: drawComb, siphonophore: drawSiphon,
  manowar: drawManowar, squid: drawSquid, cuttle: drawCuttle, octopus: drawOctopus, dumbo: drawDumbo,
  vampire: drawVampire, nautilus: drawNautilus, crab: drawCrab, lobster: drawLobster, shrimp: drawShrimp,
  isopod: drawIsopod, star: drawStar, urchin: drawUrchin, cucumber: drawCucumber, seapig: drawSeapig,
  basketstar: drawBasket, seagrass: drawSeagrass, sealettuce: drawSeaLettuce, sugarkelp: drawKelpSmall,
  oarweed: drawKelpSmall, kelp: drawKelpSmall, bullkelp: drawKelpSmall, sargassum: drawSargassum,
  staghorn: drawStaghorn, brain: drawBrain, anemone: drawAnemone, plumose: drawPlumose, lophelia: drawLophelia,
  bubblegum: drawBubblegum, glasssponge: drawGlassSponge, barrelsponge: drawBarrelSponge, clam: drawClam,
  mussel: drawMussel, oyster: drawOyster, scallop: drawScallop, conch: drawConch, abalone: drawAbalone,
  nudibranch: drawNudi, gardeneel: drawGardenEel, tubeworm: drawTubeworm, xmastree: drawXmasTree,
  bobbit: drawBobbit, seasquirt: drawSeasquirt, turtle: drawTurtle, swallower: drawSwallower, dragon: drawDragon,
  coral: drawCoral,
};

// Draws a species. Returns local glow points (or null) for the bioluminescence pass.
export function drawSpecies(ctx, sp, L, t, swim = 1, phase = 0) {
  const fn = RENDERERS[sp.v.s] || drawFish;
  const r = fn(ctx, L, sp.v, t, swim, phase);
  return r || null;
}

// Small icon rendering into a standalone canvas (journal / pickups).
export function speciesIcon(sp, w = 160, h = 90) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.translate(w / 2, h / 2 + (sp.v.hab === 'plant' || sp.v.hab === 'floor' ? h * 0.3 : 0));
  const L = sp.v.hab === 'plant' ? h * 0.6 : w * 0.62;
  try { drawSpecies(ctx, sp, L, 1.3, 0.4, 0); } catch (e) { /* ignore */ }
  return c;
}
