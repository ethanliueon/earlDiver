// Procedural renderers for every creature. Each draws in local space:
// origin at the body centre, facing +x, total length L pixels.
// Style goal: natural, layered, slightly translucent fins, countershading,
// soft specular light from above - never flat clip-art fills.
import { hexToRgb, rgbStr, mixRgb, shade, rgba, TAU, clamp } from './util.js';
import { drawSleeper } from './sleeper_draw.js';
import { UNDOCUMENTED_RENDERERS } from './undocumented_draw.js';

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
  if (ctx) {
    ctx.beginPath();
    smoothPath(ctx, top, true);
    ctx.lineTo(bot[steps][0], bot[steps][1]);
    smoothPath(ctx, bot.slice().reverse(), false);
    ctx.closePath();
  }
  const ty = (top[steps][1] + bot[steps][1]) / 2, ty1 = (top[steps - 1][1] + bot[steps - 1][1]) / 2;
  return { H, bodyL, x0, top, bot, steps, tailX: x0 + bodyL, tailY: ty, tailA: Math.atan2(ty - ty1, bodyL / steps) };
}
function finPath(ctx, pts) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
// y of the body's top or bottom edge at x (follows the bend and the taper)
function edgeAt(o, x, side) {
  const arr = side < 0 ? o.top : o.bot;
  const f = clamp((x - o.x0) / o.bodyL * o.steps, 0, o.steps - 0.0001), i = Math.floor(f), k = f - i;
  return arr[i][1] + (arr[i + 1][1] - arr[i][1]) * k;
}
// A fin growing out of the body edge between xa and xb: its base runs along (and slightly inside)
// the body, so it stays attached as the body bends; a translucent membrane with visible rays.
// side -1 = top, +1 = bottom; h(u) = height along the base; rake = how far tips sweep back.
function membraneFin(ctx, o, side, xa, xb, h, rake, col, t, phase = 0, n = 9) {
  const H = o.H, inset = H * 0.07;
  const base = [], tip = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = xa + (xb - xa) * u, ey = edgeAt(o, x, side);
    const hh = h(u), ripple = Math.sin(t * 4 + u * 5 + phase) * hh * 0.06;
    base.push([x, ey - side * inset]);
    tip.push([x + hh * rake, ey + side * (hh + ripple)]);
  }
  const g = ctx.createLinearGradient(0, edgeAt(o, (xa + xb) / 2, side), 0, edgeAt(o, (xa + xb) / 2, side) + side * h(0.3));
  const c = hexToRgb(col);
  g.addColorStop(0, rgbStr(c, 0.85)); g.addColorStop(1, rgbStr(mixRgb(c, [255, 255, 255], 0.15), 0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(base[0][0], base[0][1]);
  ctx.lineTo(tip[0][0], tip[0][1]);
  smoothPath(ctx, tip, false);
  ctx.lineTo(base[n][0], base[n][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(base[i][0], base[i][1]);
  ctx.closePath(); ctx.fill();
  // rays
  ctx.strokeStyle = rgbStr(mixRgb(c, [0, 0, 0], 0.35), 0.45); ctx.lineWidth = Math.max(0.4, o.H * 0.012);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { ctx.moveTo(base[i][0], base[i][1]); ctx.lineTo(tip[i][0], tip[i][1]); }
  ctx.stroke();
  return tip;
}
function drawTail(ctx, o, L, v, t, swim, col) {
  const tx = o.tailX, ty = o.tailY;
  // the tail follows the angle of the bending body where it joins
  ctx.save(); ctx.translate(tx, ty); ctx.rotate((o.tailA || 0) * 1.6); ctx.translate(-tx, -ty);
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
  ctx.restore();
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
  // body geometry first (bend included), so every fin can be rooted on the actual outline
  const og = fishOutline(null, L, v, t, swim);
  const fk = Math.min(1, 0.42 / v.h);            // deep-bodied fish get proportionally lower fins
  const hD = H * 0.34 * fk;
  // far pelvic fin, rooted on the belly
  ctx.save(); ctx.globalAlpha = 0.6;
  membraneFin(ctx, og, 1, -L * 0.1, -L * 0.02, (u) => H * 0.22 * fk * (1 - u * 0.6), 0.5, v.f, t, 1, 4);
  ctx.restore();
  // dorsal fin
  const dorsal = (xa, xb, hfn, rake, n) => membraneFin(ctx, og, -1, xa, xb, hfn, rake, v.f, t, 0, n);
  switch (v.d) {
    case 'spiny': // a row of spines joined by membrane, then the soft rear part
      dorsal(-L * 0.2, L * 0.24, (u) => hD * (u < 0.6 ? 0.85 + 0.25 * ((Math.round(u * 12) % 2) ? -1 : 1) : 0.9 - (u - 0.6) * 1.2), 0.25, 12); break;
    case 'filament': {
      const tip = dorsal(-L * 0.16, L * 0.2, (u) => hD * (u < 0.2 ? 0.5 + u * 3 : 1.1 - (u - 0.2) * 0.9), 0.3, 9);
      const [fx, fy] = tip[2];
      ctx.strokeStyle = rgba(v.f, 0.85); ctx.lineWidth = Math.max(0.8, H * 0.025); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx, fy);
      ctx.bezierCurveTo(fx + L * 0.15, fy - H * 0.35, fx + L * 0.4 + Math.sin(t * 2) * L * 0.05, fy - H * 0.25, fx + L * 0.65 + Math.sin(t * 2.3) * L * 0.08, fy - H * 0.05);
      ctx.stroke(); ctx.lineCap = 'butt'; break;
    }
    case 'trail': // angelfish: tall, sweeping back past the tail
      dorsal(-L * 0.12, L * 0.26, (u) => hD * (0.6 + u * 0.9), 0.55, 9);
      membraneFin(ctx, og, 1, L * 0.0, L * 0.26, (u) => hD * (0.6 + u * 0.9), 0.55, v.f, t, 2, 9); break;
    case 'long': // mahi-mahi: one long fin from head to tail
      dorsal(-L * 0.34, L * 0.28, (u) => hD * (u < 0.1 ? 0.5 + u * 5 : 1 - (u - 0.1) * 0.6), 0.2, 16); break;
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
    default: // tall at the front, sloping back
      dorsal(-L * 0.12, L * 0.22, (u) => hD * (u < 0.25 ? 0.55 + u * 1.8 : 1 - (u - 0.25) * 0.85), 0.35, 9);
  }
  if (v.longfin) { // yellowfin tuna: long sickle-shaped second dorsal and anal fins
    membraneFin(ctx, og, -1, L * 0.04, L * 0.12, (u) => H * 1.1 * (1 - u * 0.75), 0.8, v.f, t, 3, 4);
    membraneFin(ctx, og, 1, L * 0.08, L * 0.16, (u) => H * 1.1 * (1 - u * 0.75), 0.8, v.f, t, 4, 4);
  }
  // anal fin, rooted on the belly
  if (v.d !== 'trail') membraneFin(ctx, og, 1, L * 0.04, L * 0.26, (u) => hD * 0.8 * (u < 0.2 ? 0.6 + u * 2 : 1 - (u - 0.2) * 0.8), 0.35, v.f, t, 5, 8);
  // adipose fin (salmon): a small fleshy lobe on the back
  if (v.adipose) membraneFin(ctx, og, -1, L * 0.2, L * 0.25, (u) => H * 0.12 * Math.sin(u * PI), 0.4, v.c[0], t, 6, 4);
  // finlets (tuna, mackerel): a row of small yellow flags along the back and belly toward the tail
  if (v.finlets) for (let k = 0; k < 6; k++) {
    const x = L * (0.2 + k * 0.026);
    for (const side of [-1, 1]) {
      const ey = edgeAt(og, x, side);
      ctx.fillStyle = v.f === '#e2b82a' || !v.f ? '#c8a82a' : '#c8a82a';
      ctx.beginPath(); ctx.moveTo(x - L * 0.006, ey - side * H * 0.02); ctx.lineTo(x + L * 0.012, ey + side * H * 0.09); ctx.lineTo(x + L * 0.014, ey - side * H * 0.02); ctx.fill();
    }
  }

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
  // the head reads darker and denser than the flank: bone under thin skin
  {
    const hx = o.x0 + L * 0.1, hg = ctx.createRadialGradient(hx, -H * 0.05, 0, hx, -H * 0.05, L * 0.26);
    hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.55, 'rgba(0,0,0,0.05)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg; ctx.fillRect(o.x0 - L * 0.1, -H, L * 0.6, H * 2);
  }
  // light catching the scale rows of the upper flank
  if (L > 40) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = Math.max(0.5, L * 0.003);
    const sc = v.bigscale ? L * 0.04 : L * 0.024;
    ctx.beginPath();
    for (let x = o.x0 + L * 0.24; x < o.tailX - L * 0.04; x += sc) for (let y = -H * 0.4; y < -H * 0.02; y += sc) {
      const yy = y + (Math.floor(x / sc) % 2) * sc * 0.5; ctx.moveTo(x - sc * 0.35, yy - sc * 0.32); ctx.arc(x, yy, sc * 0.48, -2.4, -1.2);
    }
    ctx.stroke();
  }
  // a silver sheen low on the flank (strongest on pale-bellied fish)
  {
    const sh = ctx.createLinearGradient(0, H * 0.02, 0, H * 0.34);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(o.x0 + L * 0.15, H * 0.02, L * 0.55, H * 0.32);
  }
  // lateral line
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = Math.max(0.5, H * 0.015);
  ctx.beginPath(); ctx.moveTo(o.x0 + L * 0.18, -H * 0.12); ctx.quadraticCurveTo(0, -H * 0.2, o.tailX, 0); ctx.stroke();
  ctx.restore();

  drawTail(ctx, o, L, v, t, swim, v.tailc || rgba(v.f, 0.82));
  // a fine darker edge round the body, so it holds its shape against the water
  ctx.save(); fishOutline(ctx, L, v, t, swim); ctx.strokeStyle = rgba(shade(v.c[0], -0.45), 0.35); ctx.lineWidth = Math.max(0.6, L * 0.006); ctx.stroke(); ctx.restore();
  // gill cover: the bony operculum, a shadow under its free edge and a thin light on its rim
  const gx = o.x0 + L * (v.h > 0.6 ? 0.22 : 0.2);
  ctx.save(); fishOutline(ctx, L, v, t, swim); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.beginPath(); ctx.arc(gx - H * 0.3, 0, H * 0.38, -0.9, 0.9); ctx.arc(gx - H * 0.3 + L * 0.02, 0, H * 0.4, 0.9, -0.9, true); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(0.6, L * 0.008);
  ctx.beginPath(); ctx.arc(gx - H * 0.3, 0, H * 0.38, -0.9, 0.9); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = Math.max(0.4, L * 0.004);
  ctx.beginPath(); ctx.arc(gx - H * 0.3 - L * 0.006, 0, H * 0.38, -0.85, 0.2); ctx.stroke();
  // the preopercle, a fainter curve in front of it
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = Math.max(0.4, L * 0.005);
  ctx.beginPath(); ctx.arc(gx - H * 0.3 - L * 0.035, H * 0.02, H * 0.3, -0.5, 1.0); ctx.stroke();
  // near pectoral fin
  {
    const pl = v.wings ? L * 0.5 : L * 0.13, pw = v.wings ? H * 0.5 : H * 0.17, beat = Math.sin(t * (v.wings ? 3 : 5)) * 0.18;
    ctx.save(); ctx.translate(gx + L * 0.005, H * 0.06); ctx.rotate((v.wings ? -0.55 : 0.32) + beat);
    const c = hexToRgb(v.f);
    const pg = ctx.createLinearGradient(0, 0, pl, 0);
    pg.addColorStop(0, rgbStr(c, 0.8)); pg.addColorStop(1, rgbStr(mixRgb(c, [255, 255, 255], 0.2), 0.35));
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.moveTo(0, -pw * 0.25); ctx.quadraticCurveTo(pl * 0.6, -pw * 0.6, pl, -pw * 0.1); ctx.quadraticCurveTo(pl * 0.7, pw * 0.5, 0, pw * 0.25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgbStr(mixRgb(c, [0, 0, 0], 0.35), 0.4); ctx.lineWidth = Math.max(0.4, H * 0.012);
    ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = -0.35 + k * 0.13; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * pl * 0.95, Math.sin(a) * pl * 0.5); } ctx.stroke();
    ctx.restore();
  }
  // snout / mouth / eye
  const nx = o.x0;
  if (v.snout) {
    ctx.fillStyle = shade(v.c[0], -0.05);
    ctx.beginPath(); ctx.moveTo(nx + L * 0.06, -H * 0.12); ctx.lineTo(nx - L * 0.08 * v.snout, -H * 0.02); ctx.lineTo(nx - L * 0.08 * v.snout, H * 0.02); ctx.lineTo(nx + L * 0.06, H * 0.06); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(0.6, L * 0.008); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(nx + L * 0.005, H * 0.05); ctx.quadraticCurveTo(nx + L * (v.jaw ? 0.05 : 0.025), H * (v.jaw ? 0.11 : 0.09), nx + L * (v.jaw ? 0.1 : 0.055), H * (v.jaw ? 0.09 : 0.07)); ctx.stroke(); ctx.lineCap = 'butt';
  if (v.lips) { ctx.fillStyle = shade(v.c[1], -0.2); ctx.beginPath(); ctx.ellipse(nx + L * 0.015, H * 0.06, L * 0.025, H * 0.07, 0, 0, TAU); ctx.fill(); }
  if (v.beak) { ctx.fillStyle = '#e8e4d4'; ctx.beginPath(); ctx.ellipse(nx + L * 0.015, H * 0.04, L * 0.02, H * 0.06, 0, 0, TAU); ctx.fill(); }
  if (v.barbel) { ctx.beginPath(); ctx.moveTo(nx + L * 0.05, H * 0.15); ctx.lineTo(nx + L * 0.04, H * 0.3); ctx.stroke(); }
  if (v.spiny) { // a sharp spine on the gill cover, pointing back (squirrelfish, soldierfish, scorpionfish)
    ctx.fillStyle = rgba(shade(v.c[1], 0.2), 0.9);
    ctx.beginPath(); ctx.moveTo(gx - L * 0.01, H * 0.02); ctx.lineTo(gx + L * 0.07, H * 0.08); ctx.lineTo(gx - L * 0.005, H * 0.08); ctx.fill();
  }
  if (v.eyespot) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L * 0.12, -H * 0.25, H * 0.07, 0, TAU); ctx.fill(); }
  const er = Math.max(1.2, Math.min(H * (v.bigeye ? 0.16 : 0.1), L * (v.bigeye ? 0.055 : 0.036)));
  const ex = nx + L * (v.h > 0.6 ? 0.12 : 0.1), ey = -H * 0.12;
  ctx.fillStyle = rgba(shade(v.c[0], -0.4), 0.35); ctx.beginPath(); ctx.arc(ex, ey, er * 1.45, 0, TAU); ctx.fill(); // the eye socket
  eye(ctx, ex, ey, er, v.eyec || '#cfc6a4');
  if (v.photo) {
    // photophore row drawn here for lit view; glow handled separately
    ctx.fillStyle = 'rgba(160,220,255,0.6)';
    for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(o.x0 + L * (0.15 + k * 0.07), H * 0.32, Math.max(0.7, H * 0.035), 0, TAU); ctx.fill(); }
  }
  // light organs (glow points: [x, y, size]): the belly photophore row, and one by the eye
  if (v.glow) {
    const P = [[nx + L * 0.1, H * 0.12, 0.7]];
    for (let k = 0; k < 9; k += 2) P.push([o.x0 + L * (0.15 + k * 0.07), H * 0.32, 0.45]);
    return P;
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
  const dTop = -H * (v.small ? 0.8 : 1.15);
  finPath(ctx, [[nose + L * 0.36, -H * 0.48], [nose + L * 0.43, dTop], [nose + L * 0.52, -H * 0.42]]); ctx.fill();
  // (4.1.2) white tips (the whitetip reef shark's): the fin's own top, fading softly into it, not a pasted triangle
  const tipOf = (top, base) => { const g2 = ctx.createLinearGradient(0, top, 0, base); g2.addColorStop(0, v.tips); g2.addColorStop(0.3, v.tips); g2.addColorStop(0.42, rgba(v.tips, 0)); ctx.save(); ctx.clip(); ctx.fillStyle = g2; ctx.fillRect(-L, top - H, L * 2, base - top + H); ctx.restore(); };
  if (v.tips) tipOf(dTop, -H * 0.45);
  ctx.fillStyle = c0;
  finPath(ctx, [[nose + L * 0.66, -H * 0.27], [nose + L * 0.69, -H * 0.45], [nose + L * 0.72, -H * 0.2]]); ctx.fill();
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
  if (v.tips) tipOf(ty - H * 0.95, ty - H * 0.2); // and the tail's upper lobe
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
  if (v.goblin) {
    // (3.7.5) the goblin shark: a long, flat blade of a snout dotted with sensory pores, and beneath it the jaws
    // slung forward out of the head on their ligaments, pink gums and rows of long, nail-like teeth
    const sn = new Path2D(); sn.moveTo(nose + L * 0.04, -H * 0.24); sn.quadraticCurveTo(nose - L * 0.08, -H * 0.24, nose - L * 0.16, -H * 0.1); sn.quadraticCurveTo(nose - L * 0.1, -H * 0.02, nose + L * 0.04, H * 0.0); sn.closePath();
    const sg = ctx.createLinearGradient(0, -H * 0.25, 0, 0); sg.addColorStop(0, shade(c0, 0.08)); sg.addColorStop(1, shade(c1, -0.05)); ctx.fillStyle = sg; ctx.fill(sn);
    ctx.fillStyle = rgba(shade(c0, -0.35), 0.5); for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.arc(nose - L * 0.12 + hashN(k, 51) * L * 0.15, -H * 0.2 + hashN(k, 52) * H * 0.16, Math.max(0.4, L * 0.0025), 0, TAU); ctx.fill(); }
    const jx = nose - L * 0.02, jy = H * 0.12, gape = 0.6 + 0.4 * Math.sin(t * 0.7);
    ctx.fillStyle = '#4a1a20'; ctx.beginPath(); ctx.moveTo(jx + L * 0.09, H * 0.08); ctx.lineTo(jx - L * 0.04, jy - H * 0.06); ctx.lineTo(jx - L * 0.05, jy + H * 0.18 * gape); ctx.lineTo(jx + L * 0.09, H * 0.26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c87880'; ctx.beginPath(); ctx.moveTo(jx + L * 0.09, H * 0.06); ctx.lineTo(jx - L * 0.045, jy - H * 0.08); ctx.lineTo(jx - L * 0.04, jy - H * 0.02); ctx.lineTo(jx + L * 0.09, H * 0.1); ctx.fill(); // upper gum
    ctx.beginPath(); ctx.moveTo(jx + L * 0.09, H * 0.24); ctx.lineTo(jx - L * 0.055, jy + H * 0.16 * gape); ctx.lineTo(jx - L * 0.05, jy + H * 0.22 * gape); ctx.lineTo(jx + L * 0.09, H * 0.29); ctx.fill(); // lower gum
    for (let k = 0; k < 8; k++) { const u = k / 7, x = jx - L * 0.04 + u * L * 0.12; glassFang(ctx, x, jy - H * 0.05, H * (0.2 + (k % 2) * 0.08), 1, Math.max(0.5, L * 0.003), 0.15); glassFang(ctx, x, jy + H * 0.2 * gape - u * H * 0.02, H * (0.18 + (k % 2) * 0.08), -1, Math.max(0.5, L * 0.003), 0.15); }
  }
  if (v.saw) {
    ctx.fillStyle = shade(c0, -0.05); ctx.fillRect(nose - L * 0.22, -H * 0.06, L * 0.23, H * 0.12);
    ctx.fillStyle = '#e8e4d8'; for (let k = 0; k < 14; k++) { const x = nose - L * 0.21 + k * L * 0.016; ctx.fillRect(x, -H * 0.12, L * 0.004, H * 0.24); }
  }
  if (v.nurse) { ctx.strokeStyle = shade(c0, -0.3); ctx.beginPath(); ctx.moveTo(nose + L * 0.01, H * 0.1); ctx.lineTo(nose - L * 0.01, H * 0.28); ctx.stroke(); }
  // a glowing belly (cookiecutter): a row along the underside
  if (v.glow) { const P = []; for (let k = 0; k < 5; k++) P.push([-L * 0.15 + k * L * 0.11, H * 0.3, 0.5]); return P; }
}

// ---------- rays (seen slightly from above) ----------
function drawRay(ctx, L, v, t) {
  // Seen from above at a shallow angle: a flattened diamond whose wingtips rise and fall.
  const flap = Math.sin(t * (v.manta ? 1.5 : 2.3));
  const W = L * (v.manta ? 1.25 : v.round ? 0.75 : 0.95); // wingspan
  const c0 = v.c[0];
  const sq = 0.38; // perspective squash
  const tipY = (s) => (-flap * s * W * 0.22);
  // tail
  ctx.strokeStyle = shade(c0, -0.15); ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.beginPath(); ctx.moveTo(L * 0.2, 0); ctx.quadraticCurveTo(L * 0.55, Math.sin(t) * L * 0.03, L * (v.eagle || v.manta ? 1.0 : 0.65), Math.sin(t * 1.3) * L * 0.05); ctx.stroke();
  if (v.sting) { ctx.lineWidth = Math.max(1, L * 0.006); ctx.beginPath(); ctx.moveTo(L * 0.4, 0); ctx.lineTo(L * 0.48, -L * 0.02); ctx.stroke(); }
  const body = new Path2D();
  const nose = v.round ? -L * 0.32 : -L * 0.36;
  body.moveTo(nose, 0);
  body.quadraticCurveTo(-L * 0.12, -W * sq * 0.2 + tipY(0.4), L * 0.0, -W * sq * 0.5 + tipY(1)); // far wingtip
  body.quadraticCurveTo(L * 0.1, -W * sq * 0.15 + tipY(0.4), L * 0.22, 0);
  body.quadraticCurveTo(L * 0.1, W * sq * 0.15 - tipY(0.4) * 0.6, L * 0.0, W * sq * 0.5 - tipY(1) * 0.6); // near wingtip
  body.quadraticCurveTo(-L * 0.12, W * sq * 0.2 - tipY(0.4) * 0.6, nose, 0);
  const g = ctx.createLinearGradient(0, -W * sq * 0.5, 0, W * sq * 0.5);
  g.addColorStop(0, shade(c0, -0.25)); g.addColorStop(0.45, c0); g.addColorStop(1, shade(c0, -0.1));
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  if (v.p) { ctx.fillStyle = v.pc; for (let k = 0; k < 24; k++) { ctx.beginPath(); ctx.arc(-L * 0.3 + ((k * 37) % 50) / 100 * L, ((k * 53) % 60 - 30) / 100 * W * sq, Math.max(0.8, L * 0.012), 0, TAU); ctx.fill(); } }
  if (v.manta) { ctx.fillStyle = 'rgba(230,230,225,0.35)'; ctx.beginPath(); ctx.ellipse(-L * 0.12, -W * sq * 0.08, L * 0.1, W * sq * 0.1, 0.4, 0, TAU); ctx.fill(); }
  // ridge highlight down the back
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = Math.max(1, L * 0.01);
  ctx.beginPath(); ctx.moveTo(nose + L * 0.05, 0); ctx.lineTo(L * 0.18, 0); ctx.stroke();
  ctx.restore();
  if (v.manta) {
    ctx.fillStyle = shade(c0, -0.1);
    ctx.beginPath(); ctx.ellipse(nose - L * 0.02, -L * 0.03, L * 0.05, L * 0.015, 0.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(nose - L * 0.02, L * 0.03, L * 0.05, L * 0.015, -0.5, 0, TAU); ctx.fill();
  }
  if (v.eagle) { ctx.fillStyle = shade(c0, -0.05); ctx.beginPath(); ctx.ellipse(nose - L * 0.03, 0, L * 0.05, L * 0.025, 0, 0, TAU); ctx.fill(); }
  eye(ctx, nose + L * 0.08, -L * 0.03, Math.max(1, L * 0.012), '#2a2a24', false);
  eye(ctx, nose + L * 0.08, L * 0.03, Math.max(1, L * 0.012), '#2a2a24', false);
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
// (3.7.4) an anglerfish, drawn properly: a globe of a body with an underslung jaw, the mouth open on two rows of
// glassy needle fangs of different lengths, a jointed rod (illicium) with a glowing bulb (esca) trailing
// filaments, velvet skin with sensory pores, soft rayed fins and a tail that fans and flexes as it swims.
// Head toward -x. The monkfish (flatten) is lower and broader, the whipnose (low h) long.
const lum = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
function hashN(i, k = 1) { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); }
function rayFin(ctx, base, tips, col, alpha, rays = true) {
  // a soft fin: from a base segment out to a curved edge through the tip points, with its rays
  const [b0, b1] = base;
  ctx.beginPath(); ctx.moveTo(b0[0], b0[1]);
  for (let i = 0; i < tips.length; i++) { const p = tips[i], q = tips[i + 1]; if (q) ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); else ctx.lineTo(p[0], p[1]); }
  ctx.lineTo(b1[0], b1[1]); ctx.closePath();
  ctx.fillStyle = rgba(col, alpha); ctx.fill();
  if (!rays) return;
  ctx.strokeStyle = lum(col) < 0.3 ? rgba(shade(col, 0.45), Math.min(1, alpha + 0.15)) : rgba(shade(col, -0.35), Math.min(1, alpha + 0.2)); ctx.lineWidth = 0.6;
  const n = tips.length;
  for (let i = 0; i < n; i++) { const u = n > 1 ? i / (n - 1) : 0.5, bx = b0[0] + (b1[0] - b0[0]) * u, by = b0[1] + (b1[1] - b0[1]) * u; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tips[i][0], tips[i][1]); ctx.stroke(); }
}
function drawAngler(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], flat = !!v.flatten, pale = lum(c0) > 0.5;
  const fin = pale ? shade(c1, -0.12) : shade(c1, 0.16); // fins: thin, so a little lighter than the body on a dark fish
  const sw = Math.sin(t * 4) * swim; // the tail's beat
  const lw = Math.max(0.5, L * 0.004);
  // ---- the tail first (behind the body): a rounded fan of rays that bends with the beat
  const tx = L * 0.29, tl = L * 0.25, bend = sw * H * 0.14;
  const tips = []; for (let k = 0; k <= 10; k++) { const a = -0.72 + k * (1.44 / 10), r = tl * (0.9 + 0.1 * Math.cos(a * 2.6)); tips.push([tx + Math.cos(a) * r, Math.sin(a) * r * Math.max(1.4, (H / L) * 2.4) + bend * (0.6 + Math.cos(a) * 0.4)]); }
  rayFin(ctx, [[tx, -H * 0.12], [tx, H * 0.12]], tips, fin, 0.62);
  // a soft, ragged edge to the tail
  ctx.strokeStyle = rgba(shade(c1, 0.15), 0.35); ctx.lineWidth = lw; ctx.beginPath(); tips.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
  // ---- the dorsal and anal fins, low and soft, near the tail
  rayFin(ctx, [[L * 0.08, -H * 0.42], [L * 0.27, -H * 0.17]], [[L * 0.1, -H * 0.56], [L * 0.17, -H * 0.55 + sw * H * 0.02], [L * 0.24, -H * 0.42], [L * 0.29, -H * 0.27]], fin, 0.55);
  rayFin(ctx, [[L * 0.1, H * 0.4], [L * 0.27, H * 0.17]], [[L * 0.13, H * 0.52], [L * 0.2, H * 0.5 - sw * H * 0.02], [L * 0.26, H * 0.36], [L * 0.29, H * 0.24]], fin, 0.55);
  // ---- the body: a big round head and belly, a short tail stalk; the lower jaw jutting past the upper
  const body = new Path2D();
  const top = flat ? -H * 0.42 : -H * 0.6, bot = flat ? H * 0.42 : H * 0.62;
  body.moveTo(-L * 0.44, -H * 0.06);                                          // the snout, above the upper jaw
  body.bezierCurveTo(-L * 0.46, top * 0.85, -L * 0.18, top * 1.04, L * 0.02, top * 0.95); // the domed head and back
  body.bezierCurveTo(L * 0.16, top * 0.85, L * 0.26, -H * 0.24, L * 0.31, -H * 0.11);     // down to the tail stalk
  body.lineTo(L * 0.31, H * 0.11);
  body.bezierCurveTo(L * 0.24, H * 0.3, L * 0.1, bot, -L * 0.1, bot * 0.98);  // the round belly
  body.bezierCurveTo(-L * 0.32, bot * 0.92, -L * 0.48, H * 0.42, -L * 0.52, H * 0.26); // under the chin to the lower jaw's tip
  body.lineTo(-L * 0.5, H * 0.18);
  body.closePath();
  const bg = ctx.createRadialGradient(-L * 0.12, -H * 0.25, L * 0.02, -L * 0.02, H * 0.05, L * 0.5);
  bg.addColorStop(0, shade(c1, pale ? 0.05 : 0.22)); bg.addColorStop(0.55, c1); bg.addColorStop(1, shade(c0, pale ? -0.12 : -0.35));
  ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  if (v.p) patternFish(ctx, { H, x0: -L / 2, bodyL: L }, L, v);
  // velvet skin: a fine speckle of darker and lighter flecks
  for (let i = 0; i < 160; i++) { const x = -L * 0.5 + hashN(i) * L * 0.82, y = -H * 0.6 + hashN(i, 2) * H * 1.22, r = Math.max(0.4, L * 0.003 * (0.6 + hashN(i, 3)));
    ctx.fillStyle = hashN(i, 4) < 0.5 ? rgba(shade(c0, -0.5), 0.35) : rgba(shade(c1, 0.35), pale ? 0.2 : 0.12); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  // light from above along the back, and the shadowed belly
  const sh = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.62); sh.addColorStop(0, 'rgba(255,240,220,0.1)'); sh.addColorStop(0.35, 'rgba(255,240,220,0)'); sh.addColorStop(0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = sh; ctx.fillRect(-L, -H, 2 * L, 2 * H);
  // the lateral line: a row of sensory pores arching back from behind the eye
  ctx.fillStyle = rgba(shade(c1, pale ? -0.25 : 0.45), 0.45);
  for (let k = 0; k < 11; k++) { const u = k / 10, x = -L * 0.2 + u * L * 0.46, y = -H * 0.12 - Math.sin(u * PI) * H * 0.14 + u * H * 0.06; ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, L * 0.0055), 0, TAU); ctx.fill(); }
  // pores around the head, and a few creases where the skin folds behind the jaw
  for (let k = 0; k < 7; k++) { const a = 0.9 + k * 0.32; ctx.beginPath(); ctx.arc(-L * 0.3 + Math.cos(a) * L * 0.09, -H * 0.12 + Math.sin(a) * H * 0.2, Math.max(0.5, L * 0.005), 0, TAU); ctx.fill(); }
  ctx.strokeStyle = rgba(shade(c0, -0.6), 0.4); ctx.lineWidth = lw;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-L * 0.12 + k * L * 0.03, H * 0.08, H * (0.28 + k * 0.05), 1.7, 2.6); ctx.stroke(); }
  ctx.restore();
  // ---- the mouth: wide open, the gape running back under the eye; a dark throat
  const gape = new Path2D();
  gape.moveTo(-L * 0.45, -H * 0.04);
  gape.quadraticCurveTo(-L * 0.32, -H * 0.02, -L * 0.19, H * 0.1);   // the upper jaw's edge back to the corner
  gape.quadraticCurveTo(-L * 0.33, H * 0.36, -L * 0.52, H * 0.26);  // the lower jaw's edge forward to its tip
  gape.closePath();
  const mg = ctx.createRadialGradient(-L * 0.3, H * 0.1, 0, -L * 0.3, H * 0.1, L * 0.16); mg.addColorStop(0, '#1a0708'); mg.addColorStop(0.7, '#090304'); mg.addColorStop(1, '#030102');
  ctx.fillStyle = mg; ctx.fill(gape);
  // lips: a paler rim on the lower jaw
  ctx.strokeStyle = rgba(shade(c1, pale ? -0.15 : 0.3), 0.55); ctx.lineWidth = Math.max(0.7, L * 0.007);
  ctx.beginPath(); ctx.moveTo(-L * 0.19, H * 0.1); ctx.quadraticCurveTo(-L * 0.33, H * 0.36, -L * 0.52, H * 0.26); ctx.stroke();
  // the fangs: glassy, curved inward, long and short mixed; the lower ones longest
  const fang = (x, y, len, dir, w) => {
    const tipx = x + len * 0.18, tipy = y + dir * len;
    const fg = ctx.createLinearGradient(x, y, tipx, tipy); fg.addColorStop(0, 'rgba(210,205,190,0.95)'); fg.addColorStop(0.7, 'rgba(235,232,222,0.85)'); fg.addColorStop(1, 'rgba(255,255,250,0.55)');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.2, y + dir * len * 0.6, tipx, tipy); ctx.quadraticCurveTo(x + w * 0.6, y + dir * len * 0.5, x + w, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.3, w * 0.3); ctx.beginPath(); ctx.moveTo(x - w * 0.4, y + dir * len * 0.1); ctx.quadraticCurveTo(x - w * 0.1, y + dir * len * 0.55, tipx, tipy); ctx.stroke();
  };
  const UP = [0.17, 0.08, 0.2, 0.06, 0.13, 0.05], DN = [0.24, 0.1, 0.27, 0.08, 0.18, 0.07, 0.11];
  UP.forEach((len, k) => { const u = k / (UP.length - 1), x = -L * 0.44 + u * L * 0.22, y = -H * 0.035 + u * H * 0.12;
    fang(x, y, H * len * (1 - u * 0.4), 1, L * (0.008 + len * 0.03)); });
  DN.forEach((len, k) => { const u = k / (DN.length - 1), x = -L * 0.5 + u * L * 0.28, y = H * 0.25 - u * H * 0.13 + Math.sin(u * PI) * H * 0.06;
    fang(x, y, H * len * (1 - u * 0.35), -1, L * (0.009 + len * 0.03)); });
  // ---- the pectoral fin, a rounded paddle behind the gill opening
  ctx.strokeStyle = rgba(shade(c0, -0.6), 0.6); ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-L * 0.06, -H * 0.02); ctx.quadraticCurveTo(-L * 0.03, H * 0.14, -L * 0.07, H * 0.26); ctx.stroke();
  const pw = Math.sin(t * 3 + 1) * swim * H * 0.04;
  rayFin(ctx, [[-L * 0.04, H * 0.06], [-L * 0.03, H * 0.2]], [[L * 0.06, H * 0.02 + pw], [L * 0.1, H * 0.12 + pw], [L * 0.08, H * 0.24 + pw], [L * 0.02, H * 0.3]], fin, 0.5);
  // ---- the eye: small, dark, ringed, with a cold glint
  const ex = -L * 0.29, ey = -H * 0.22, er = Math.max(1, Math.min(L * 0.028, H * 0.06));
  ctx.fillStyle = rgba(shade(c0, -0.6), 0.9); ctx.beginPath(); ctx.arc(ex, ey, er * 1.6, 0, TAU); ctx.fill();
  eye(ctx, ex, ey, er, pale ? '#3a4a58' : '#4a6a80');
  // ---- the rod and its glowing bait
  const base = [-L * 0.33, top * 0.78], rodL = L * (v.h < 0.5 ? 0.95 : 0.42);
  const lx = base[0] - rodL * 0.5 + Math.sin(t * 1.3) * L * 0.03, ly = base[1] - rodL * (v.h < 0.5 ? 0.12 : 0.55) + Math.cos(t * 1.1) * L * 0.015;
  const cx = base[0] - rodL * 0.05, cy = base[1] - rodL * 0.75;
  ctx.strokeStyle = shade(c0, pale ? -0.1 : 0.18); ctx.lineWidth = Math.max(1, L * 0.012); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo(cx, cy, lx, ly); ctx.stroke();
  // the joints along it
  ctx.fillStyle = shade(c0, pale ? -0.2 : 0.3);
  for (const u of [0.25, 0.5, 0.75]) { const x = (1 - u) * (1 - u) * base[0] + 2 * (1 - u) * u * cx + u * u * lx, y = (1 - u) * (1 - u) * base[1] + 2 * (1 - u) * u * cy + u * u * ly; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, L * 0.007), 0, TAU); ctx.fill(); }
  ctx.lineCap = 'butt';
  // the bulb: a halo, a translucent sac and a bright core; filaments trailing below
  const er2 = Math.max(1.8, L * 0.032), glow = v.glow || null;
  if (glow) { const hg = ctx.createRadialGradient(lx, ly, 0, lx, ly, er2 * 4.5); hg.addColorStop(0, rgba(glow, 0.55)); hg.addColorStop(0.4, rgba(glow, 0.16)); hg.addColorStop(1, rgba(glow, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lx, ly, er2 * 4.5, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = glow ? rgba(glow, 0.55) : rgba(shade(c1, 0.2), 0.6); ctx.lineWidth = Math.max(0.4, L * 0.003);
  for (let k = 0; k < 4; k++) { const a = 1.2 + k * 0.25 + Math.sin(t * 2 + k) * 0.1; ctx.beginPath(); ctx.moveTo(lx, ly + er2 * 0.6); ctx.quadraticCurveTo(lx + Math.cos(a) * er2 * 1.5, ly + er2 * 1.6, lx + Math.cos(a) * er2 * 2.2 + Math.sin(t * 1.7 + k) * er2 * 0.4, ly + er2 * (2.4 + k * 0.4)); ctx.stroke(); }
  const sac = ctx.createRadialGradient(lx - er2 * 0.3, ly - er2 * 0.3, 0, lx, ly, er2);
  if (glow) { sac.addColorStop(0, '#ffffff'); sac.addColorStop(0.35, shade(glow, 0.3)); sac.addColorStop(1, rgba(glow, 0.55)); } else { sac.addColorStop(0, shade(c1, 0.35)); sac.addColorStop(1, shade(c0, 0.1)); }
  ctx.fillStyle = sac; ctx.beginPath(); ctx.ellipse(lx, ly, er2, er2 * 1.15, 0, 0, TAU); ctx.fill();
  return [[lx, ly, 1.6]];
}
// (3.7.5) a long body that bends as it swims: its centreline from the head (-x) to the tail, half-widths along it
function bendBody(L, t, swim, half, n = 28, amp = 0.05, waves = 1.6) {
  const top = [], bot = [], mid = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -L / 2 + u * L, y = Math.sin(t * 3 - u * waves * TAU) * amp * L * Math.pow(u, 1.4) * swim, h = half(u);
    mid.push([x, y]); top.push([x, y - h]); bot.push([x, y + h]);
  }
  const path = new Path2D(); top.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]))); for (let i = bot.length - 1; i >= 0; i--) path.lineTo(bot[i][0], bot[i][1]); path.closePath();
  return { top, bot, mid, path, at: (u) => { const f = u * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; return [mid[i][0] + (mid[i + 1][0] - mid[i][0]) * k, mid[i][1] + (mid[i + 1][1] - mid[i][1]) * k, half(u)]; } };
}
function glassFang(ctx, x, y, len, dir, w, lean = 0.15) {
  const tx = x + len * lean, ty = y + dir * len;
  const g = ctx.createLinearGradient(x, y, tx, ty); g.addColorStop(0, 'rgba(205,200,186,0.95)'); g.addColorStop(0.75, 'rgba(238,236,228,0.88)'); g.addColorStop(1, 'rgba(255,255,252,0.5)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.15, y + dir * len * 0.6, tx, ty); ctx.quadraticCurveTo(x + w * 0.6, y + dir * len * 0.45, x + w, y); ctx.closePath(); ctx.fill();
}
function photophores(ctx, B, u0, u1, n, off, r, col) {
  const P = [];
  for (let k = 0; k < n; k++) { const [x, y, h] = B.at(u0 + (u1 - u0) * (k / Math.max(1, n - 1))), py = y + h * off;
    ctx.fillStyle = 'rgba(8,10,12,0.85)'; ctx.beginPath(); ctx.arc(x, py, r * 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, py, r, 0, TAU); ctx.fill(); P.push([x, py, 0.4]); }
  return P;
}
// the fangtooth: short and deep, a huge armoured head, two great fangs in the lower jaw that fold into sockets
// either side of the brain, rough plated skin, small eye, a forked tail
function drawFangtooth(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], fin = shade(c1, 0.18), sw = Math.sin(t * 4) * swim;
  // tail
  const tx = L * 0.3, tips = []; for (let k = 0; k <= 8; k++) { const a = -0.7 + k * 0.175, fork = 1 - 0.35 * Math.cos(a * 4.4) * (Math.abs(a) < 0.25 ? 1 : 0); tips.push([tx + L * 0.2 * fork * Math.cos(a), Math.sin(a) * L * 0.24 + sw * H * 0.12]); }
  rayFin(ctx, [[tx, -H * 0.1], [tx, H * 0.1]], tips, fin, 0.65);
  rayFin(ctx, [[-L * 0.02, -H * 0.44], [L * 0.24, -H * 0.18]], [[L * 0.02, -H * 0.56], [L * 0.12, -H * 0.5], [L * 0.22, -H * 0.32]], fin, 0.55);
  rayFin(ctx, [[L * 0.08, H * 0.4], [L * 0.25, H * 0.17]], [[L * 0.12, H * 0.52], [L * 0.2, H * 0.42], [L * 0.27, H * 0.26]], fin, 0.55);
  const body = new Path2D();
  body.moveTo(-L * 0.47, -H * 0.02);
  body.bezierCurveTo(-L * 0.47, -H * 0.5, -L * 0.2, -H * 0.62, L * 0.0, -H * 0.5);
  body.bezierCurveTo(L * 0.16, -H * 0.42, L * 0.27, -H * 0.2, L * 0.31, -H * 0.1);
  body.lineTo(L * 0.31, H * 0.1);
  body.bezierCurveTo(L * 0.2, H * 0.3, L * 0.02, H * 0.55, -L * 0.18, H * 0.55);
  body.bezierCurveTo(-L * 0.36, H * 0.55, -L * 0.5, H * 0.4, -L * 0.5, H * 0.2);
  body.closePath();
  const bg = ctx.createRadialGradient(-L * 0.18, -H * 0.2, L * 0.02, -L * 0.05, H * 0.05, L * 0.5); bg.addColorStop(0, shade(c1, 0.2)); bg.addColorStop(0.6, c1); bg.addColorStop(1, shade(c0, -0.3));
  ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // rough plated skin: small overlapping scales, the head's bony ridges and pits
  ctx.strokeStyle = rgba(shade(c1, 0.3), 0.18); ctx.lineWidth = Math.max(0.4, L * 0.003);
  for (let r = 0; r < 9; r++) for (let k = 0; k < 9; k++) { const x = -L * 0.05 + k * L * 0.042 + (r % 2) * L * 0.021, y = -H * 0.45 + r * H * 0.12; ctx.beginPath(); ctx.arc(x, y, L * 0.024, 0.2 * PI, 0.8 * PI); ctx.stroke(); }
  ctx.strokeStyle = rgba(shade(c0, -0.5), 0.55); ctx.lineWidth = Math.max(0.5, L * 0.005);
  for (const [a, b2, r] of [[-0.3, -0.3, 0.12], [-0.28, -0.18, 0.2], [-0.22, -0.05, 0.26]]) { ctx.beginPath(); ctx.arc(L * a, H * b2, H * r, 1.0, 2.6); ctx.stroke(); }
  ctx.fillStyle = rgba(shade(c0, -0.6), 0.5); for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(-L * 0.42 + hashN(k, 7) * L * 0.3, -H * 0.4 + hashN(k, 8) * H * 0.5, Math.max(0.5, L * 0.006), 0, TAU); ctx.fill(); }
  const shd = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6); shd.addColorStop(0, 'rgba(255,240,220,0.08)'); shd.addColorStop(0.4, 'rgba(0,0,0,0)'); shd.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = shd; ctx.fillRect(-L, -H, 2 * L, 2 * H);
  ctx.restore();
  // the mouth, a dark slash, then the fangs: two huge ones in front of the lower jaw, the rest small
  ctx.fillStyle = '#050304'; ctx.beginPath(); ctx.moveTo(-L * 0.48, H * 0.04); ctx.quadraticCurveTo(-L * 0.33, H * 0.18, -L * 0.18, H * 0.12); ctx.quadraticCurveTo(-L * 0.33, H * 0.3, -L * 0.5, H * 0.22); ctx.closePath(); ctx.fill();
  glassFang(ctx, -L * 0.46, H * 0.22, H * 0.55, -1, L * 0.014, 0.05); glassFang(ctx, -L * 0.41, H * 0.24, H * 0.5, -1, L * 0.013, 0.05);
  for (let k = 0; k < 4; k++) glassFang(ctx, -L * 0.36 + k * L * 0.04, H * 0.22, H * (0.12 + (k % 2) * 0.06), -1, L * 0.008);
  for (let k = 0; k < 5; k++) glassFang(ctx, -L * 0.46 + k * L * 0.05, H * 0.06, H * (0.1 + (k % 2) * 0.08), 1, L * 0.008);
  // the gill cover, the pectoral, the small eye
  ctx.strokeStyle = rgba(shade(c0, -0.6), 0.7); ctx.lineWidth = Math.max(0.6, L * 0.006); ctx.beginPath(); ctx.moveTo(-L * 0.12, -H * 0.3); ctx.quadraticCurveTo(-L * 0.04, H * 0.05, -L * 0.14, H * 0.4); ctx.stroke();
  rayFin(ctx, [[-L * 0.08, H * 0.05], [-L * 0.08, H * 0.16]], [[L * 0.04, H * 0.0], [L * 0.07, H * 0.12], [L * 0.02, H * 0.22]], fin, 0.5);
  eye(ctx, -L * 0.3, -H * 0.24, Math.max(1, L * 0.025), '#5a6a70');
}
// the viperfish: long and narrow, iridescent, its lower jaw's fangs so long they close outside the mouth past the eye;
// the first ray of its dorsal fin a long whip with a light at the tip; rows of lights along the belly
function drawViper(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], fin = shade(c1, 0.2), glow = v.glow || '#6ad0ff';
  const B = bendBody(L, t, swim * 0.6, (u) => H * 0.5 * (u < 0.1 ? 0.75 + u * 2.5 : u < 0.8 ? 1 - (u - 0.1) * 0.55 : 0.6 - (u - 0.8) * 2.2), 30, 0.04, 1.3);
  // tail and the small fins along the back of the body
  const [txx, tyy] = B.at(1);
  rayFin(ctx, [[txx - L * 0.01, tyy - H * 0.1], [txx - L * 0.01, tyy + H * 0.1]], [[txx + L * 0.08, tyy - H * 0.55], [txx + L * 0.05, tyy - H * 0.1], [txx + L * 0.03, tyy], [txx + L * 0.05, tyy + H * 0.1], [txx + L * 0.08, tyy + H * 0.55]], fin, 0.6);
  { const [x, y, h] = B.at(0.78); rayFin(ctx, [[x - L * 0.05, y + h], [x + L * 0.04, y + h * 0.9]], [[x - L * 0.03, y + h + H * 0.5], [x + L * 0.02, y + h + H * 0.45]], fin, 0.5); }
  const bg = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6); bg.addColorStop(0, shade(c0, -0.3)); bg.addColorStop(0.45, c1); bg.addColorStop(1, shade(c0, -0.2));
  ctx.fillStyle = bg; ctx.fill(B.path);
  ctx.save(); ctx.clip(B.path);
  // its hexagonal scale net, catching the light in blue and violet
  ctx.strokeStyle = 'rgba(140,190,220,0.16)'; ctx.lineWidth = Math.max(0.4, L * 0.0025);
  for (let i = 0; i < 26; i++) { const [x, y, h] = B.at(0.08 + i * 0.034); for (let j = -2; j <= 2; j++) { const yy = y + j * h * 0.42 + (i % 2) * h * 0.21; ctx.beginPath(); ctx.moveTo(x - L * 0.014, yy); ctx.lineTo(x, yy - h * 0.2); ctx.lineTo(x + L * 0.014, yy); ctx.lineTo(x, yy + h * 0.2); ctx.closePath(); ctx.stroke(); } }
  const sheen = ctx.createLinearGradient(-L * 0.5, 0, L * 0.5, 0); sheen.addColorStop(0, 'rgba(120,90,200,0.12)'); sheen.addColorStop(0.5, 'rgba(90,180,200,0.1)'); sheen.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sheen; ctx.fillRect(-L, -H * 2, 2 * L, 4 * H);
  ctx.restore();
  const P = photophores(ctx, B, 0.08, 0.9, 16, 0.72, Math.max(0.6, L * 0.004), rgba(glow, 0.85));
  P.push(...photophores(ctx, B, 0.12, 0.6, 9, 0.3, Math.max(0.5, L * 0.003), rgba(glow, 0.6)));
  // the head: a large eye, the gill cover, a light below the eye; the jaw opened, the fangs reaching past the eye
  const [hx, hy, hh] = B.at(0.04);
  ctx.fillStyle = '#060506'; ctx.beginPath(); ctx.moveTo(-L * 0.5, hy - hh * 0.1); ctx.lineTo(-L * 0.38, hy + hh * 0.2); ctx.lineTo(-L * 0.5, hy + hh * 0.75); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(shade(c1, 0.3), 0.5); ctx.lineWidth = Math.max(0.5, L * 0.004); ctx.beginPath(); ctx.moveTo(-L * 0.4, hy - hh * 0.8); ctx.quadraticCurveTo(-L * 0.36, hy, -L * 0.41, hy + hh * 0.9); ctx.stroke();
  eye(ctx, -L * 0.455, hy - hh * 0.45, Math.max(1, hh * 0.32), '#7a9aa8');
  ctx.fillStyle = rgba(glow, 0.9); ctx.beginPath(); ctx.arc(-L * 0.45, hy + hh * 0.05, Math.max(0.7, hh * 0.12), 0, TAU); ctx.fill(); P.push([-L * 0.45, hy + hh * 0.05, 0.7]);
  // (the lower fangs close outside the mouth, reaching up past the eye)
  glassFang(ctx, -L * 0.497, hy + hh * 0.72, Math.max(hh * 2.4, L * 0.055), -1, Math.max(0.7, L * 0.0055), -0.04);
  glassFang(ctx, -L * 0.48, hy + hh * 0.74, Math.max(hh * 1.9, L * 0.042), -1, Math.max(0.6, L * 0.0045), -0.02);
  glassFang(ctx, -L * 0.462, hy + hh * 0.74, Math.max(hh * 1.2, L * 0.026), -1, Math.max(0.5, L * 0.0035), 0);
  glassFang(ctx, -L * 0.492, hy - hh * 0.08, Math.max(hh * 1.3, L * 0.03), 1, Math.max(0.5, L * 0.004), 0.08);
  glassFang(ctx, -L * 0.474, hy - hh * 0.05, Math.max(hh * 0.9, L * 0.02), 1, Math.max(0.4, L * 0.0035), 0.08);
  // the dorsal whip and its lure, swaying forward over the head
  const [dx, dy, dh] = B.at(0.1), lx = -L * 0.48 + Math.sin(t * 1.2) * L * 0.02, ly = dy - dh - H * 2.2;
  ctx.strokeStyle = rgba(fin, 0.8); ctx.lineWidth = Math.max(0.5, L * 0.0035); ctx.beginPath(); ctx.moveTo(dx, dy - dh); ctx.quadraticCurveTo(dx - L * 0.02, ly - H * 0.6, lx, ly); ctx.stroke();
  const hg = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(3, L * 0.02)); hg.addColorStop(0, rgba(glow, 0.9)); hg.addColorStop(1, rgba(glow, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(lx, ly, Math.max(3, L * 0.02), 0, TAU); ctx.fill();
  P.push([lx, ly, 1.3]);
  return P;
}
// (3.7.5) the barreleye: a small dark fish whose head is a clear, fluid-filled dome; inside it two green tubular eyes
// look up, and the two dark spots above the mouth that look like eyes are its nostrils. Big scales, broad flat fins.
function drawBarreleye(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], fin = shade(c1, 0.2), sw = Math.sin(t * 3) * swim, eyec = v.eyec || '#5ac85a';
  const tx = L * 0.32, tips = []; for (let k = 0; k <= 8; k++) { const a = -0.6 + k * 0.15; tips.push([tx + L * 0.16 * (1 - 0.3 * Math.cos(a * 5) * (Math.abs(a) < 0.3 ? 1 : 0)), Math.sin(a) * L * 0.16 + sw * H * 0.1]); }
  rayFin(ctx, [[tx, -H * 0.12], [tx, H * 0.12]], tips, fin, 0.6);
  rayFin(ctx, [[L * 0.0, H * 0.36], [L * 0.22, H * 0.2]], [[L * 0.05, H * 0.62], [L * 0.15, H * 0.55], [L * 0.24, H * 0.32]], fin, 0.5);
  const body = new Path2D();
  body.moveTo(-L * 0.46, H * 0.08); body.bezierCurveTo(-L * 0.45, -H * 0.32, -L * 0.2, -H * 0.44, L * 0.05, -H * 0.4);
  body.bezierCurveTo(L * 0.2, -H * 0.36, L * 0.3, -H * 0.18, L * 0.33, -H * 0.1); body.lineTo(L * 0.33, H * 0.1);
  body.bezierCurveTo(L * 0.25, H * 0.3, L * 0.0, H * 0.45, -L * 0.2, H * 0.42); body.bezierCurveTo(-L * 0.36, H * 0.4, -L * 0.46, H * 0.3, -L * 0.46, H * 0.08); body.closePath();
  const bg = ctx.createLinearGradient(0, -H * 0.45, 0, H * 0.45); bg.addColorStop(0, shade(c0, -0.2)); bg.addColorStop(0.6, c1); bg.addColorStop(1, shade(c0, -0.3)); ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // large scales, each edged lighter
  ctx.strokeStyle = rgba(shade(c1, 0.35), 0.3); ctx.lineWidth = Math.max(0.4, L * 0.003);
  for (let r = 0; r < 5; r++) for (let k = 0; k < 9; k++) { const x = -L * 0.12 + k * L * 0.05 + (r % 2) * L * 0.025, y = -H * 0.35 + r * H * 0.17; ctx.beginPath(); ctx.arc(x, y, L * 0.03, -0.4 * PI, 0.4 * PI); ctx.stroke(); }
  ctx.restore();
  // the pectoral fin, broad and flat, held out
  rayFin(ctx, [[-L * 0.14, H * 0.1], [-L * 0.12, H * 0.22]], [[L * 0.05, H * 0.15 + sw * H * 0.03], [L * 0.08, H * 0.32], [-L * 0.02, H * 0.42]], fin, 0.55);
  // the dome: clear, a little blue, a bright rim; the green eyes and the brain behind them seen through it
  const dx = -L * 0.27, dy = -H * 0.08, dw = L * 0.17, dh = H * 0.62; // (the dome is the top of the head itself)
  const dome = new Path2D(); dome.ellipse(dx, dy, dw, dh, 0, PI, TAU); dome.lineTo(dx + dw, dy); dome.closePath();
  const dg = ctx.createRadialGradient(dx - dw * 0.3, dy - dh * 0.5, 1, dx, dy, dw * 1.1); dg.addColorStop(0, 'rgba(230,248,255,0.28)'); dg.addColorStop(0.7, 'rgba(160,210,230,0.14)'); dg.addColorStop(1, 'rgba(160,210,230,0.24)');
  ctx.fillStyle = dg; ctx.fill(dome);
  ctx.fillStyle = 'rgba(190,150,140,0.35)'; ctx.beginPath(); ctx.ellipse(dx + dw * 0.45, dy - dh * 0.12, dw * 0.2, dh * 0.16, 0, 0, TAU); ctx.fill(); // the brain
  for (const [ox, k] of [[-0.12, 0.85], [0.08, 1]]) { // two tube eyes, the far one behind, each a barrel with a green lens on top
    const ex = dx + dw * ox, top = dy - dh * 0.72;
    ctx.fillStyle = rgba(shade(eyec, -0.45), 0.85 * k); ctx.beginPath(); ctx.roundRect(ex - dw * 0.16, top, dw * 0.32, dh * 0.62, dw * 0.12); ctx.fill();
    const lg = ctx.createRadialGradient(ex, top + dh * 0.04, 0, ex, top + dh * 0.04, dw * 0.2); lg.addColorStop(0, shade(eyec, 0.5)); lg.addColorStop(1, eyec);
    ctx.fillStyle = lg; ctx.globalAlpha = k; ctx.beginPath(); ctx.ellipse(ex, top + dh * 0.05, dw * 0.17, dh * 0.1, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = 'rgba(230,250,255,0.5)'; ctx.lineWidth = Math.max(0.5, L * 0.003); ctx.beginPath(); ctx.ellipse(dx, dy, dw, dh, 0, PI * 1.05, PI * 1.6); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,250,255,0.25)'; ctx.beginPath(); ctx.ellipse(dx, dy, dw, dh, 0, PI, TAU); ctx.stroke();
  // the nostrils that look like eyes, and the small mouth at the tip
  for (const k of [0, 1]) { ctx.fillStyle = '#0c0a0a'; ctx.beginPath(); ctx.arc(-L * 0.4 + k * L * 0.035, H * 0.0, Math.max(0.8, L * 0.011), 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(-L * 0.403 + k * L * 0.035, -H * 0.02, Math.max(0.3, L * 0.003), 0, TAU); ctx.fill(); }
  ctx.strokeStyle = rgba(shade(c0, -0.5), 0.8); ctx.lineWidth = Math.max(0.5, L * 0.004); ctx.beginPath(); ctx.moveTo(-L * 0.46, H * 0.08); ctx.lineTo(-L * 0.42, H * 0.12); ctx.stroke();
}
function drawGulper(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], glow = v.glow || '#ff7aa0';
  const B = bendBody(L, t, swim * 0.8, (u) => H * 0.5 * (u < 0.3 ? 1.2 - u : Math.max(0.05, 0.9 - (u - 0.3) * 1.25)), 34, 0.07, 1.9);
  const bg = ctx.createLinearGradient(0, -H, 0, H); bg.addColorStop(0, shade(c1, 0.1)); bg.addColorStop(1, shade(c0, -0.2)); ctx.fillStyle = bg; ctx.fill(B.path);
  // the fin along the back, a low fringe
  ctx.strokeStyle = rgba(shade(c1, 0.2), 0.5); ctx.lineWidth = Math.max(0.4, L * 0.002);
  for (let i = 0; i < 30; i++) { const [x, y, h] = B.at(0.25 + i * 0.022); ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + L * 0.006, y - h - H * 0.25); ctx.stroke(); }
  // the tail's light organ
  const [ex, ey] = B.at(1), pulse = 0.7 + 0.3 * Math.sin(t * 2.4);
  const tg = ctx.createRadialGradient(ex, ey, 0, ex, ey, Math.max(3, L * 0.03)); tg.addColorStop(0, rgba(glow, 0.9 * pulse)); tg.addColorStop(1, rgba(glow, 0)); ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(ex, ey, Math.max(3, L * 0.03), 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(shade(glow, 0.3), pulse); ctx.beginPath(); ctx.ellipse(ex - L * 0.008, ey, Math.max(1, L * 0.008), Math.max(0.8, L * 0.004), 0, 0, TAU); ctx.fill();
  // (4.1.1) the head: a small skull behind the jaws' hinge, a slim upper jaw and a long lower jaw slung under it,
  // the mouth a little open, and below the lower jaw the vast pouch of black skin, stretched thin, with a sheen
  // where it bellies out. Fine pale rims on the jaws, needle teeth, a tiny eye at the front of the skull.
  const [hx, hy, hh] = B.at(0.03), gape = H * (2.1 + 0.2 * Math.sin(t * 0.9)), tipX = -L * 0.66;
  const hinge = [hx + L * 0.03, hy - hh * 0.2];
  const up = { x0: hinge[0], y0: hy - hh * 0.75, cx: -L * 0.35, cy: hy - gape * 0.42, x1: tipX, y1: hy - gape * 0.22 };
  const lo = { x0: hx + L * 0.06, y0: hy + hh * 0.75, cx: -L * 0.36, cy: hy + gape * 0.24, x1: tipX + L * 0.015, y1: hy + gape * 0.02 };
  // the pouch: from the lower jaw's tip, sagging in a deep curve, back to the throat
  const pouch = new Path2D();
  pouch.moveTo(lo.x1, lo.y1); pouch.quadraticCurveTo(lo.cx, lo.cy, lo.x0, lo.y0);
  const sag = 1.15 + 0.05 * Math.sin(t * 1.3), X = (u) => lo.x1 + (lo.x0 - lo.x1) * u; // the pouch: a deep, rounded bag hanging under the whole lower jaw
  pouch.bezierCurveTo(lo.x0, hy + gape * 0.65, X(0.78), hy + gape * sag, X(0.48), hy + gape * sag);
  pouch.bezierCurveTo(X(0.16), hy + gape * sag, lo.x1 - L * 0.015, hy + gape * 0.62, lo.x1, lo.y1); pouch.closePath();
  const pg = ctx.createRadialGradient(X(0.48), hy + gape * 0.6, H * 0.2, X(0.48), hy + gape * 0.5, gape * 0.9);
  pg.addColorStop(0, rgba(shade(c1, 0.22), 0.92)); pg.addColorStop(0.6, rgba(shade(c0, 0.02), 0.95)); pg.addColorStop(1, rgba(shade(c0, -0.2), 0.97));
  ctx.fillStyle = pg; ctx.fill(pouch);
  ctx.save(); ctx.clip(pouch);
  ctx.strokeStyle = rgba(shade(c1, 0.4), 0.16); ctx.lineWidth = Math.max(0.4, L * 0.0018); // the skin's stretch lines, fanning from the throat
  for (let k = 1; k < 9; k++) { const u = k / 9; ctx.beginPath(); ctx.moveTo(lo.x0, lo.y0); ctx.quadraticCurveTo(X(0.85 - u * 0.2), hy + gape * (0.4 + u * 0.55), X(0.9 - u * 0.85), hy + gape * (1.15 - u * 0.9)); ctx.stroke(); }
  const sh = ctx.createRadialGradient(X(0.4), hy + gape * 0.55, 0, X(0.4), hy + gape * 0.55, gape * 0.35); sh.addColorStop(0, 'rgba(200,170,220,0.16)'); sh.addColorStop(1, 'rgba(200,170,220,0)');
  ctx.fillStyle = sh; ctx.fillRect(X(0) - L * 0.05, hy, X(1) - X(0) + L * 0.1, gape * 1.3); // a dull violet sheen where it is stretched thinnest
  ctx.restore();
  ctx.strokeStyle = rgba(shade(c1, 0.3), 0.5); ctx.lineWidth = Math.max(0.5, L * 0.0025); ctx.stroke(pouch);
  // the mouth between the jaws: dark, a hint of the throat
  ctx.fillStyle = 'rgba(6,3,5,0.92)'; ctx.beginPath(); ctx.moveTo(up.x0, up.y0 + hh * 0.4); ctx.quadraticCurveTo(up.cx, up.cy + gape * 0.1, up.x1 + L * 0.01, up.y1 + gape * 0.04);
  ctx.quadraticCurveTo(lo.cx, lo.cy - gape * 0.05, lo.x0, lo.y0 - hh * 0.3); ctx.closePath(); ctx.fill();
  // the jaws as bones, pale-rimmed, with needle teeth
  const bone = (J, w) => {
    ctx.strokeStyle = shade(c0, 0.06); ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(J.x0, J.y0); ctx.quadraticCurveTo(J.cx, J.cy, J.x1, J.y1); ctx.stroke();
    ctx.strokeStyle = rgba(shade(c1, 0.55), 0.55); ctx.lineWidth = Math.max(0.5, w * 0.3); ctx.stroke();
  };
  bone(up, Math.max(1.2, L * 0.011)); bone(lo, Math.max(1.4, L * 0.013));
  ctx.fillStyle = 'rgba(230,226,214,0.75)';
  for (let k = 1; k < 12; k++) { const u = k / 12, q = (a, b, c) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
    const ux = q(up.x0, up.cx, up.x1), uy = q(up.y0, up.cy, up.y1), lx = q(lo.x0, lo.cx, lo.x1), ly = q(lo.y0, lo.cy, lo.y1), tl = Math.max(0.8, L * 0.006);
    ctx.beginPath(); ctx.moveTo(ux - tl * 0.4, uy); ctx.lineTo(ux, uy + tl); ctx.lineTo(ux + tl * 0.4, uy); ctx.fill();
    ctx.beginPath(); ctx.moveTo(lx - tl * 0.4, ly); ctx.lineTo(lx, ly - tl); ctx.lineTo(lx + tl * 0.4, ly); ctx.fill(); }
  ctx.lineCap = 'butt';
  // the skull: a small dome over the hinge, darker, with a gill slit behind it
  const sk = ctx.createRadialGradient(hx - L * 0.005, hy - hh * 0.6, 0, hx, hy - hh * 0.2, hh * 1.4); sk.addColorStop(0, shade(c1, 0.18)); sk.addColorStop(1, shade(c0, -0.05));
  ctx.fillStyle = sk; ctx.beginPath(); ctx.ellipse(hx + L * 0.012, hy - hh * 0.35, L * 0.03, hh * 0.75, -0.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(shade(c1, 0.4), 0.45); ctx.lineWidth = Math.max(0.5, L * 0.002);
  ctx.beginPath(); ctx.moveTo(hx + L * 0.045, hy - hh * 0.3); ctx.quadraticCurveTo(hx + L * 0.055, hy + hh * 0.2, hx + L * 0.04, hy + hh * 0.7); ctx.stroke();
  // the lateral line's pores, pale dots running back down the body
  ctx.fillStyle = rgba(shade(c1, 0.5), 0.35);
  for (let k = 0; k < 26; k++) { const [x, y] = B.at(0.08 + k * 0.032); ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, L * 0.0025), 0, TAU); ctx.fill(); }
  // the eye: tiny, at the very front of the skull
  eye(ctx, hx - L * 0.02, hy - hh * 0.75, Math.max(0.9, L * 0.007), '#8a9aa0');
  return [[ex, ey, 1.4]];
}
function drawHatchet(ctx, L, v, t, swim) {
  // A marine hatchetfish (head toward -x): a deep, knife-thin silver body that drops into a keel of
  // belly lights, a short tail stalk, big tubular eyes tilted upward, a mouth that points straight up.
  const H = L * v.h, w = Math.sin(t * 6) * swim * L * 0.02;
  const back = v.c[0], belly = v.c[1];
  // tail fin and stalk first
  ctx.fillStyle = rgba(belly, 0.55);
  finPath(ctx, [[L * 0.3, -H * 0.04], [L * 0.5, -H * 0.22 + w], [L * 0.44, w * 0.5], [L * 0.5, H * 0.18 + w], [L * 0.3, H * 0.05]]); ctx.fill();
  ctx.strokeStyle = rgba(shade(belly, -0.3), 0.5); ctx.lineWidth = Math.max(0.4, L * 0.006);
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(L * 0.31, k * H * 0.02); ctx.lineTo(L * 0.48, k * H * 0.09 + w); ctx.stroke(); }
  // the body: flat back, a deep breast that falls to the keel, then the narrow stalk
  const body = new Path2D();
  body.moveTo(-L * 0.44, -H * 0.12);
  body.quadraticCurveTo(-L * 0.4, -H * 0.36, -L * 0.18, -H * 0.38);
  body.lineTo(L * 0.12, -H * 0.3); body.quadraticCurveTo(L * 0.25, -H * 0.16, L * 0.32, -H * 0.06);
  body.lineTo(L * 0.32, H * 0.06);
  body.quadraticCurveTo(L * 0.18, H * 0.12, L * 0.06, H * 0.3);
  body.quadraticCurveTo(-L * 0.12, H * 0.56, -L * 0.3, H * 0.42);
  body.quadraticCurveTo(-L * 0.46, H * 0.2, -L * 0.44, -H * 0.12);
  const g = ctx.createLinearGradient(0, -H * 0.4, 0, H * 0.5);
  g.addColorStop(0, shade(back, -0.35)); g.addColorStop(0.18, back); g.addColorStop(0.4, shade(belly, 0.1)); g.addColorStop(0.7, belly); g.addColorStop(1, shade(belly, -0.25));
  ctx.fillStyle = g; ctx.fill(body);
  // mirror sheen: soft vertical bands of light on the silver flank
  ctx.save(); ctx.clip(body);
  for (let k = 0; k < 4; k++) { const x = -L * 0.3 + k * L * 0.13; const sg = ctx.createLinearGradient(x, 0, x + L * 0.08, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.28)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(x, -H * 0.3, L * 0.08, H * 0.8); }
  // the dark back line and the armour-like scutes along the keel
  ctx.fillStyle = rgba(shade(back, -0.5), 0.8); ctx.fillRect(-L * 0.42, -H * 0.42, L * 0.76, H * 0.07);
  ctx.strokeStyle = rgba(shade(belly, -0.4), 0.45); ctx.lineWidth = Math.max(0.4, L * 0.005);
  for (let k = 0; k < 7; k++) { const x = -L * 0.32 + k * L * 0.06; ctx.beginPath(); ctx.moveTo(x, H * 0.18); ctx.lineTo(x + L * 0.02, H * 0.36 - Math.abs(k - 2.5) * H * 0.03); ctx.stroke(); }
  ctx.restore();
  // the gill cover, the dorsal spine and its little blade of fin
  ctx.strokeStyle = rgba(shade(belly, -0.45), 0.6); ctx.lineWidth = Math.max(0.5, L * 0.007);
  ctx.beginPath(); ctx.moveTo(-L * 0.24, -H * 0.3); ctx.quadraticCurveTo(-L * 0.16, H * 0.02, -L * 0.26, H * 0.3); ctx.stroke();
  ctx.fillStyle = rgba(belly, 0.5); finPath(ctx, [[-L * 0.02, -H * 0.34], [L * 0.06, -H * 0.5], [L * 0.12, -H * 0.3]]); ctx.fill();
  // the big tubular eye, tilted up, and the upturned mouth
  const ex = -L * 0.32, ey = -H * 0.2, er = Math.max(1, L * 0.065);
  ctx.fillStyle = shade(back, -0.4); ctx.beginPath(); ctx.ellipse(ex, ey - er * 0.2, er * 1.2, er * 1.35, 0, 0, TAU); ctx.fill();
  eye(ctx, ex, ey - er * 0.3, er, '#a8c8d8');
  ctx.strokeStyle = shade(back, -0.5); ctx.lineWidth = Math.max(0.6, L * 0.01); ctx.beginPath(); ctx.moveTo(-L * 0.45, -H * 0.18); ctx.lineTo(-L * 0.4, -H * 0.02); ctx.stroke();
  // the belly lights in a row along the keel, pointing down
  const P = []; for (let k = 0; k < 6; k++) { const x = -L * 0.3 + k * L * 0.07, y = H * (0.36 + 0.08 * Math.sin((k + 0.5) / 6 * Math.PI)); P.push([x, y, 0.35]); ctx.fillStyle = 'rgba(30,40,50,0.7)'; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, L * 0.012), 0, TAU); ctx.fill(); }
  return P;
}
// (3.7.5) the blobfish (and the blob sculpin and snailfish that share it): a soft, gelatinous tadpole of a fish,
// its skin loose and glistening, the nose sagging over a downturned mouth, small dark eyes, little fins, a tapering
// tail. Its flesh is barely denser than water: it sags as it is drawn.
function drawBlob(ctx, L, v, t, swim = 1) {
  const H = L * (v.h || 0.55), c0 = v.c[0], c1 = v.c[1], wob = Math.sin(t * 1.6) * 0.02 * swim;
  // the tail fin, soft and rounded
  const tx = L * 0.36; rayFin(ctx, [[tx, -H * 0.06], [tx, H * 0.06]], [[tx + L * 0.12, -H * 0.2 + wob * L], [tx + L * 0.16, wob * L], [tx + L * 0.12, H * 0.2 + wob * L]], shade(c1, 0.05), 0.55);
  const body = new Path2D();
  body.moveTo(-L * 0.36, -H * 0.28);
  body.bezierCurveTo(-L * 0.3, -H * 0.62, L * 0.02, -H * 0.66, L * 0.12, -H * 0.35); // the soft dome of the head
  body.bezierCurveTo(L * 0.2, -H * 0.18, L * 0.3, -H * 0.08, L * 0.37, -H * 0.06);   // thinning to the tail
  body.lineTo(L * 0.37, H * 0.06);
  body.bezierCurveTo(L * 0.25, H * 0.12, L * 0.18, H * 0.5, -L * 0.02, H * 0.56);      // the sagging belly
  body.bezierCurveTo(-L * 0.22, H * 0.6, -L * 0.36, H * 0.48, -L * 0.42, H * 0.26);
  body.bezierCurveTo(-L * 0.48, H * 0.1, -L * 0.44, -H * 0.12, -L * 0.36, -H * 0.28); body.closePath();
  const bg = ctx.createRadialGradient(-L * 0.12, -H * 0.25, L * 0.02, -L * 0.05, H * 0.1, L * 0.5); bg.addColorStop(0, shade(c1, 0.18)); bg.addColorStop(0.6, c1); bg.addColorStop(1, shade(c0, -0.18));
  ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // the gelatinous look: a glossy highlight, faint veins, loose folds of skin, scattered pores
  const hl = ctx.createRadialGradient(-L * 0.14, -H * 0.4, 0, -L * 0.14, -H * 0.4, L * 0.16); hl.addColorStop(0, 'rgba(255,255,255,0.35)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hl; ctx.fillRect(-L, -H, 2 * L, 2 * H);
  ctx.strokeStyle = rgba(shade(c0, -0.25), 0.3); ctx.lineWidth = Math.max(0.5, L * 0.004);
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.08 + k * L * 0.06, -H * 0.2); ctx.quadraticCurveTo(-L * 0.02 + k * L * 0.07, H * 0.2, -L * 0.12 + k * L * 0.07, H * 0.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(160,60,70,0.12)'; ctx.lineWidth = Math.max(0.3, L * 0.002);
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.2 + hashN(k, 3) * L * 0.4, -H * 0.4 + hashN(k, 4) * H * 0.3); ctx.quadraticCurveTo(-L * 0.1 + hashN(k, 5) * L * 0.3, hashN(k, 6) * H * 0.3, -L * 0.15 + hashN(k, 7) * L * 0.4, H * 0.3); ctx.stroke(); }
  ctx.fillStyle = rgba(shade(c0, -0.3), 0.25); for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(-L * 0.4 + hashN(i, 9) * L * 0.7, -H * 0.5 + hashN(i, 10) * H, Math.max(0.4, L * 0.003), 0, TAU); ctx.fill(); }
  const sh = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(60,20,20,0.25)'); ctx.fillStyle = sh; ctx.fillRect(-L, -H, 2 * L, 2 * H);
  ctx.restore();
  // the small pectoral fin
  rayFin(ctx, [[-L * 0.05, H * 0.1], [-L * 0.03, H * 0.22]], [[L * 0.08, H * 0.12], [L * 0.1, H * 0.26], [L * 0.02, H * 0.34]], shade(c1, 0.05), 0.45);
  // the drooping nose and the downturned mouth beneath it
  const nose = new Path2D(); nose.moveTo(-L * 0.4, -H * 0.12); nose.bezierCurveTo(-L * 0.52, -H * 0.06, -L * 0.52, H * 0.22, -L * 0.42, H * 0.26); nose.bezierCurveTo(-L * 0.36, H * 0.28, -L * 0.34, H * 0.05, -L * 0.4, -H * 0.12);
  const ng = ctx.createRadialGradient(-L * 0.46, H * 0.02, 0, -L * 0.44, H * 0.1, L * 0.08); ng.addColorStop(0, shade(c1, 0.12)); ng.addColorStop(1, shade(c0, -0.08)); ctx.fillStyle = ng; ctx.fill(nose);
  ctx.strokeStyle = rgba(shade(c0, -0.35), 0.35); ctx.lineWidth = Math.max(0.4, L * 0.003); ctx.stroke(nose);
  ctx.strokeStyle = rgba(shade(c0, -0.55), 0.85); ctx.lineWidth = Math.max(0.7, L * 0.008); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-L * 0.42, H * 0.36); ctx.quadraticCurveTo(-L * 0.33, H * 0.28, -L * 0.22, H * 0.4); ctx.stroke(); ctx.lineCap = 'butt';
  ctx.strokeStyle = rgba(shade(c1, 0.25), 0.4); ctx.lineWidth = Math.max(0.5, L * 0.004); ctx.beginPath(); ctx.moveTo(-L * 0.41, H * 0.4); ctx.quadraticCurveTo(-L * 0.33, H * 0.33, -L * 0.24, H * 0.44); ctx.stroke(); // the lower lip
  // small, wet, dark eyes
  for (const [x, y, r] of [[-L * 0.26, -H * 0.2, 0.034], [-L * 0.33, -H * 0.17, 0.026]]) { ctx.fillStyle = rgba(shade(c0, -0.3), 0.5); ctx.beginPath(); ctx.arc(x, y, L * r * 1.5, 0, TAU); ctx.fill(); eye(ctx, x, y, Math.max(1, L * r), '#2a2020'); }
}
// (3.7.5) a grenadier (rattail): a big head with a huge eye and a pointed, armoured snout, the mouth slung beneath
// with a chin barbel, a tall spiny first dorsal fin, and a body that tapers to a long thin point fringed above and
// below by fin; rough, spiny scales
function drawRattail(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], fin = shade(c1, 0.15);
  const B = bendBody(L, t, swim * 0.6, (u) => H * 0.5 * (u < 0.08 ? 0.5 + u * 6 : u < 0.25 ? 1 : Math.max(0.03, 1 - (u - 0.25) * 1.3)), 32, 0.035, 1.2);
  // the long fringe of fin along back and belly, out to the tip
  ctx.fillStyle = rgba(fin, 0.45);
  for (const side of [-1, 1]) { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const u = (side < 0 ? 0.38 : 0.3) + i * (side < 0 ? 0.0207 : 0.0233), [x, y, h] = B.at(Math.min(1, u)); ctx.lineTo(x, y + side * (h + H * 0.1 * (1 - u * 0.7))); } for (let i = 30; i >= 0; i--) { const u = (side < 0 ? 0.38 : 0.3) + i * (side < 0 ? 0.0207 : 0.0233), [x, y, h] = B.at(Math.min(1, u)); ctx.lineTo(x, y + side * h); } ctx.fill(); }
  // the first dorsal: tall, with a stout leading spine
  { const [x, y, h] = B.at(0.17); rayFin(ctx, [[x - L * 0.02, y - h], [x + L * 0.07, y - h]], [[x - L * 0.01, y - h - H * 0.85], [x + L * 0.03, y - h - H * 0.6], [x + L * 0.07, y - h - H * 0.2]], fin, 0.6);
    ctx.strokeStyle = shade(c0, -0.2); ctx.lineWidth = Math.max(0.6, L * 0.005); ctx.beginPath(); ctx.moveTo(x - L * 0.02, y - h); ctx.lineTo(x - L * 0.01, y - h - H * 0.88); ctx.stroke(); }
  const bg = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6); bg.addColorStop(0, shade(c0, -0.15)); bg.addColorStop(0.5, c1); bg.addColorStop(1, shade(c0, -0.25)); ctx.fillStyle = bg; ctx.fill(B.path);
  ctx.save(); ctx.clip(B.path);
  ctx.strokeStyle = rgba(shade(c1, 0.35), 0.22); ctx.lineWidth = Math.max(0.4, L * 0.0025); // spiny scales in rows
  for (let i = 0; i < 24; i++) { const [x, y, h] = B.at(0.1 + i * 0.035); for (let j = -2; j <= 2; j++) { const yy = y + j * h * 0.38; ctx.beginPath(); ctx.arc(x, yy, Math.max(1, h * 0.25), -0.5 * PI, 0.5 * PI); ctx.stroke(); } }
  ctx.restore();
  // the head: armoured snout ridge, a huge silver eye, the mouth under the snout, the chin barbel, the gill cover
  const [hx, hy, hh] = B.at(0.08);
  ctx.fillStyle = shade(c1, 0.12); ctx.beginPath(); ctx.moveTo(-L * 0.5, hy - hh * 0.1); ctx.quadraticCurveTo(-L * 0.44, hy - hh * 0.9, -L * 0.34, hy - hh * 1.0); ctx.lineTo(-L * 0.38, hy - hh * 0.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(shade(c0, -0.45), 0.7); ctx.lineWidth = Math.max(0.6, L * 0.004);
  ctx.beginPath(); ctx.moveTo(-L * 0.33, hy - hh * 0.95); ctx.quadraticCurveTo(-L * 0.28, hy, -L * 0.33, hy + hh * 0.95); ctx.stroke();
  ctx.fillStyle = '#0c0a08'; ctx.beginPath(); ctx.moveTo(-L * 0.45, hy + hh * 0.45); ctx.quadraticCurveTo(-L * 0.4, hy + hh * 0.75, -L * 0.36, hy + hh * 0.55); ctx.lineTo(-L * 0.43, hy + hh * 0.4); ctx.fill();
  ctx.strokeStyle = rgba(shade(c1, 0.3), 0.7); ctx.lineWidth = Math.max(0.4, L * 0.003); ctx.beginPath(); ctx.moveTo(-L * 0.41, hy + hh * 0.7); ctx.quadraticCurveTo(-L * 0.42, hy + hh * 1.3, -L * 0.4 + Math.sin(t) * L * 0.005, hy + hh * 1.6); ctx.stroke();
  const er = Math.max(1, hh * 0.42); ctx.fillStyle = rgba(shade(c0, -0.4), 0.8); ctx.beginPath(); ctx.arc(-L * 0.4, hy - hh * 0.3, er * 1.3, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.4, hy - hh * 0.3, er, '#b8c4c4');
  rayFin(ctx, [[-L * 0.31, hy + hh * 0.1], [-L * 0.3, hy + hh * 0.35]], [[-L * 0.2, hy + hh * 0.2], [-L * 0.2, hy + hh * 0.6], [-L * 0.27, hy + hh * 0.75]], fin, 0.5);
}
function drawRatfish(ctx, L, v, t, swim) {
  drawRattail(ctx, L, v, t, swim);
  const H = L * v.h;
  ctx.fillStyle = rgba(v.c[1], 0.6);
  finPath(ctx, [[-L * 0.3, H * 0.1], [-L * 0.05, H * 0.9 + Math.sin(t * 2.4) * H * 0.2], [-L * 0.05, H * 0.2]]); ctx.fill();
  eye(ctx, -L * 0.38, -H * 0.15, Math.max(1.2, H * 0.2), v.eyec || '#4ac08a');
}
// (4.1.1) the tripod fish standing on the mud: two long pelvic rays under the front of the body and one from the
// lower lobe of the tail, all three tapering to the same footing; the pectoral rays held up and forward over the
// head like feelers. The stilts belong to the fish: nothing floats free of it.
function drawTripod(ctx, L, v, t) {
  const H = L * v.h, foot = L * 0.34, c0 = v.c[0];
  const stilt = (x0, y0, x1, y1, w0, col) => { // a fin ray: thick where it leaves the body, a fine point on the mud
    const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1, y1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x1, y1, w0 * 0.9, w0 * 0.35, 0, 0, TAU); ctx.fill(); // its tip, splayed a little
  };
  const w = Math.max(0.7, L * 0.008), far = shade(c0, -0.15), near = shade(c0, 0.18);
  // the far pelvic stilt, then the tail stilt from the lower lobe, then (after the body) the near one
  stilt(-L * 0.02, H * 0.3, L * 0.02, foot, w, far);
  stilt(L * 0.27, H * 0.22, L * 0.37, foot, w * 0.9, near);
  drawFish(ctx, L * 0.8, { ...v, t: 'fork', f: c0 }, t, 0.1);
  stilt(-L * 0.08, H * 0.32, -L * 0.1, foot, w, near);
  // the pectoral rays: two fine filaments arching up and forward from behind the head, swaying in the current
  const sw = Math.sin(t * 0.8) * L * 0.01;
  ctx.strokeStyle = rgba(near, 0.85); ctx.lineCap = 'round';
  for (const [k, lw] of [[0, 1], [1, 0.75]]) {
    ctx.lineWidth = Math.max(0.5, L * 0.004 * lw);
    ctx.beginPath(); ctx.moveTo(-L * 0.22, -H * 0.05); ctx.bezierCurveTo(-L * 0.24, -H * (1.6 + k * 0.4), -L * 0.42 + sw, -H * (2.1 + k * 0.3), -L * (0.58 + k * 0.05) + sw, -H * (1.5 + k * 0.5)); ctx.stroke();
  }
  ctx.lineCap = 'butt';
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
// (3.7.5) the oarfish: a long, flat silver ribbon flecked with dark streaks, a red dorsal fin running its whole
// length, a crest of long red rays above the head, and long red pelvic rays ending in paddle-shaped tips (the oars)
function drawOarfish(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], red = v.f || '#d0322a';
  const B = bendBody(L, t, swim * 0.6, (u) => H * 0.5 * (u < 0.04 ? 0.6 + u * 10 : Math.max(0.08, 1 - Math.pow(u, 1.5) * 0.85)), 60, 0.035, 2.4);
  // the dorsal fin: a red ribbon of rays, waving along the back
  ctx.strokeStyle = rgba(red, 0.8); ctx.lineWidth = Math.max(0.5, L * 0.0016);
  for (let i = 0; i < 90; i++) { const u = 0.03 + i * 0.0107, [x, y, h] = B.at(Math.min(1, u)), fh = H * (0.55 + 0.15 * Math.sin(t * 4 - u * 30)) * (1 - u * 0.5); ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + L * 0.003, y - h - fh); ctx.stroke(); }
  ctx.fillStyle = rgba(red, 0.25); ctx.beginPath(); for (let i = 0; i <= 90; i++) { const u = 0.03 + i * 0.0107, [x, y, h] = B.at(Math.min(1, u)), fh = H * (0.55 + 0.15 * Math.sin(t * 4 - u * 30)) * (1 - u * 0.5); ctx.lineTo(x + L * 0.003, y - h - fh); } for (let i = 90; i >= 0; i--) { const u = 0.03 + i * 0.0107, [x, y, h] = B.at(Math.min(1, u)); ctx.lineTo(x, y - h); } ctx.fill();
  // the silver body, bluish along the back, with dark streaks and spots
  const bg = ctx.createLinearGradient(0, -H, 0, H); bg.addColorStop(0, '#9aa6b4'); bg.addColorStop(0.35, c1); bg.addColorStop(0.7, c0); bg.addColorStop(1, shade(c0, -0.2)); ctx.fillStyle = bg; ctx.fill(B.path);
  ctx.save(); ctx.clip(B.path);
  ctx.fillStyle = 'rgba(40,50,70,0.45)';
  for (let i = 0; i < 70; i++) { const [x, y, h] = B.at(0.05 + hashN(i, 11) * 0.9); ctx.beginPath(); ctx.ellipse(x, y + (hashN(i, 12) - 0.5) * h * 1.2, Math.max(0.6, L * 0.004 + hashN(i, 13) * L * 0.006), Math.max(0.4, h * 0.12), 0, 0, TAU); ctx.fill(); }
  const sh = ctx.createLinearGradient(0, -H, 0, H); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.45, 'rgba(255,255,255,0.3)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); ctx.fillStyle = sh; ctx.fillRect(-L, -H * 2, 2 * L, 4 * H);
  ctx.restore();
  // the head: the crest of long red rays streaming back, a large eye, a small upturned mouth
  const [hx, hy, hh] = B.at(0.02);
  ctx.strokeStyle = rgba(red, 0.9); ctx.lineWidth = Math.max(0.6, L * 0.0025);
  for (let k = 0; k < 7; k++) { const len = H * (2.4 + k * 0.5), a = -1.25 + k * 0.08 + Math.sin(t * 1.3 + k) * 0.05; ctx.beginPath(); ctx.moveTo(hx + k * L * 0.004, hy - hh); ctx.quadraticCurveTo(hx + Math.cos(a) * len * 0.5 + L * 0.02, hy - hh + Math.sin(a) * len * 0.6, hx + Math.cos(a + 0.4) * len + L * 0.03, hy - hh + Math.sin(a + 0.25) * len); ctx.stroke(); }
  eye(ctx, -L * 0.488, hy - hh * 0.2, Math.max(1, hh * 0.45), '#c0c8d0');
  ctx.strokeStyle = 'rgba(40,40,50,0.7)'; ctx.lineWidth = Math.max(0.4, L * 0.0025); ctx.beginPath(); ctx.moveTo(-L * 0.5, hy + hh * 0.2); ctx.lineTo(-L * 0.49, hy - hh * 0.05); ctx.stroke();
  // the pelvic 'oars': two long red rays hanging from under the head, each ending in a small red paddle
  for (const k of [0, 1]) { const [px, py, ph] = B.at(0.045), sway = Math.sin(t * 1.1 + k) * L * 0.02, ex = px + L * 0.04 + k * L * 0.02 + sway, ey = py + ph + H * (5 + k);
    ctx.strokeStyle = rgba(red, 0.85); ctx.lineWidth = Math.max(0.5, L * 0.0022); ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.quadraticCurveTo(px + L * 0.01, py + ph + H * 3, ex, ey); ctx.stroke();
    ctx.fillStyle = rgba(red, 0.9); ctx.beginPath(); ctx.ellipse(ex, ey, Math.max(1, L * 0.006), Math.max(1.6, L * 0.011), 0.3, 0, TAU); ctx.fill(); }
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
  // A pulsing translucent bell: a quick contraction, a slow relaxation. Layers: trailing tentacles,
  // frilled oral arms, the bell with its radial canals or gonads, a scalloped rim, a soft highlight.
  const B = L * (v.lionsmane ? 0.42 : 0.36);
  const ph = (t * 0.55) % 1;
  const pulse = ph < 0.3 ? Math.sin(ph / 0.3 * Math.PI / 2) : 1 - (ph - 0.3) / 0.7; // fast squeeze, slow release
  const bw = B * (1 - pulse * 0.14), bh = B * (0.55 + pulse * 0.12);
  const c0 = hexToRgb(v.c[0]), c1 = hexToRgb(v.c[1]);
  const clear = v.moon || v.box;
  // tentacles: many fine strands, fading, drifting in loose curves
  const nt = v.lionsmane ? 70 : v.box ? 16 : v.atolla ? 22 : v.moon ? 60 : 24;
  const tl = L * (v.lionsmane ? 1.9 : v.moon ? 0.16 : v.atolla ? 0.3 : v.box ? 1.3 : 1.2);
  for (let k = 0; k < nt; k++) {
    const u = k / (nt - 1);
    let x0 = -bw * 0.95 + u * bw * 1.9;
    if (v.box) x0 = (k % 4 < 2 ? -1 : 1) * bw * (0.85 + (k % 2) * 0.08);
    const len = tl * (0.6 + ((k * 37) % 10) / 25);
    const grad = ctx.createLinearGradient(0, 0, 0, len);
    grad.addColorStop(0, rgbStr(c0, clear ? 0.35 : 0.55)); grad.addColorStop(1, rgbStr(c0, 0));
    ctx.strokeStyle = grad; ctx.lineWidth = Math.max(0.5, B * (v.lionsmane ? 0.008 : 0.012));
    ctx.beginPath(); ctx.moveTo(x0, -bh * 0.02);
    for (let sgm = 1; sgm <= 10; sgm++) {
      const w = sgm / 10;
      ctx.lineTo(x0 + Math.sin(t * 1.1 + k * 0.7 + w * 5) * B * 0.14 * w + pulse * x0 * 0.05 * w, w * len);
    }
    ctx.stroke();
  }
  // oral arms: frilled ribbons hanging from the centre
  if (!v.box && !v.atolla) {
    const na = 4, alen = L * (v.moon ? 0.22 : v.nettle ? 0.9 : v.lionsmane ? 0.7 : 0.4);
    for (let a = 0; a < na; a++) {
      const ax = (a - (na - 1) / 2) * B * 0.16;
      ctx.fillStyle = rgbStr(mixRgb(c1, [255, 255, 255], 0.15), clear ? 0.28 : 0.5);
      ctx.beginPath(); ctx.moveTo(ax - B * 0.05, 0);
      const pts = [];
      for (let sgm = 0; sgm <= 14; sgm++) { const w = sgm / 14; pts.push([ax + Math.sin(t * 0.9 + a * 1.7 + w * 6) * B * 0.12 * w, w * alen]); }
      for (const [x, y] of pts) ctx.lineTo(x - B * 0.05 * (1 - (y / alen) * 0.6) - Math.sin((y / alen) * 18 + a) * B * 0.03, y);
      for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = pts[i]; ctx.lineTo(x + B * 0.05 * (1 - (y / alen) * 0.6) + Math.sin((y / alen) * 22 + a + 1) * B * 0.03, y); }
      ctx.closePath(); ctx.fill();
    }
  }
  // the bell
  const bell = new Path2D();
  if (v.box) {
    bell.moveTo(-bw, 0); bell.lineTo(-bw * 0.95, -bh * 1.35); bell.quadraticCurveTo(0, -bh * 1.65, bw * 0.95, -bh * 1.35); bell.lineTo(bw, 0);
    bell.quadraticCurveTo(0, bh * 0.12, -bw, 0);
  } else {
    bell.moveTo(-bw, 0);
    bell.bezierCurveTo(-bw * 1.02, -bh * (v.atolla ? 0.9 : 1.25), -bw * 0.5, -bh * 1.55, 0, -bh * 1.55);
    bell.bezierCurveTo(bw * 0.5, -bh * 1.55, bw * 1.02, -bh * (v.atolla ? 0.9 : 1.25), bw, 0);
    // scalloped rim
    for (let k = 16; k >= 0; k--) { const x = -bw + (k / 16) * bw * 2; bell.lineTo(x, (k % 2 ? bh * 0.06 : -bh * 0.02) + Math.sin(t * 2 + k) * bh * 0.01); }
  }
  const g = ctx.createRadialGradient(-bw * 0.25, -bh * 1.1, 0, 0, -bh * 0.6, bw * 1.2);
  g.addColorStop(0, rgbStr(mixRgb(c0, [255, 255, 255], 0.45), clear ? 0.4 : 0.85));
  g.addColorStop(0.55, rgbStr(c0, clear ? 0.2 : 0.65));
  g.addColorStop(1, rgbStr(mixRgb(c0, [0, 0, 0], 0.2), clear ? 0.12 : 0.5));
  ctx.fillStyle = g; ctx.fill(bell);
  ctx.save(); ctx.clip(bell);
  if (v.moon) {
    // four horseshoe gonads and a fine net of radial canals
    ctx.strokeStyle = 'rgba(205,170,215,0.75)'; ctx.lineWidth = Math.max(1, B * 0.05);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-bw * 0.5 + k * bw * 0.33, -bh * 0.55, B * 0.11, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,230,240,0.25)'; ctx.lineWidth = 1;
    for (let k = 0; k < 16; k++) { const a = Math.PI + (k / 15) * Math.PI; ctx.beginPath(); ctx.moveTo(0, -bh * 0.2); ctx.lineTo(Math.cos(a) * bw, -bh * 0.2 + Math.sin(a) * bh * 1.35); ctx.stroke(); }
  } else if (v.nettle) {
    // dark radiating stripes on a golden bell
    ctx.strokeStyle = 'rgba(110,50,20,0.45)'; ctx.lineWidth = Math.max(1, B * 0.035);
    for (let k = 0; k < 14; k++) { const a = Math.PI + (k / 13) * Math.PI; ctx.beginPath(); ctx.moveTo(0, -bh * 1.5); ctx.lineTo(Math.cos(a) * bw * 1.1, -bh * 0.2 + Math.sin(a) * bh * 0.3); ctx.stroke(); }
  } else if (v.lionsmane) {
    // eight lobes, a dense dark centre
    ctx.fillStyle = 'rgba(120,40,20,0.35)';
    ctx.beginPath(); ctx.ellipse(0, -bh * 0.7, bw * 0.45, bh * 0.45, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,170,0.25)'; ctx.lineWidth = Math.max(1, B * 0.02);
    for (let k = 0; k < 8; k++) { const a = Math.PI + (k / 7) * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a) * bw * 0.3, -bh * 0.7 + Math.sin(a) * bh * 0.3); ctx.lineTo(Math.cos(a) * bw, -bh * 0.1 + Math.sin(a) * bh * 1.3); ctx.stroke(); }
  } else if (v.atolla) {
    // the coronal groove: a ring dividing the dome from the rim
    ctx.strokeStyle = 'rgba(40,0,0,0.6)'; ctx.lineWidth = Math.max(1, B * 0.05);
    ctx.beginPath(); ctx.ellipse(0, -bh * 0.35, bw * 0.95, bh * 0.25, 0, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(60,0,10,0.5)'; ctx.beginPath(); ctx.ellipse(0, -bh * 0.9, bw * 0.4, bh * 0.4, 0, 0, TAU); ctx.fill();
  } else if (v.box) {
    // rhopalia: a small eye cluster on each face, the manubrium inside
    ctx.fillStyle = 'rgba(40,40,40,0.7)';
    for (const sx of [-0.55, 0.55]) { ctx.beginPath(); ctx.arc(bw * sx, -bh * 0.2, B * 0.03, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(230,220,200,0.25)'; ctx.beginPath(); ctx.ellipse(0, -bh * 0.6, bw * 0.15, bh * 0.6, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // rim and highlight
  ctx.strokeStyle = rgbStr(mixRgb(c0, [255, 255, 255], 0.6), clear ? 0.45 : 0.35); ctx.lineWidth = Math.max(1, B * 0.012); ctx.stroke(bell);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, B * 0.02);
  ctx.beginPath(); ctx.ellipse(-bw * 0.2, -bh * 1.1, bw * 0.45, bh * 0.35, -0.25, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
  if (v.atolla && v.glow) return [[0, -bh * 0.35], [-bw * 0.6, -bh * 0.3], [bw * 0.6, -bh * 0.3]];
  return v.glow ? [[0, -bh * 0.5]] : null;
}

function drawComb(ctx, L, v, t) {
  // Lobate comb jelly: a glassy body with two oral lobes; eight rows of beating combs scatter
  // light into travelling rainbows (diffraction, not bioluminescence).
  const H = L * 0.48, W = L * 0.24;
  const body = new Path2D();
  body.moveTo(0, -H);
  body.bezierCurveTo(W * 0.9, -H, W * 1.05, -H * 0.2, W * 0.9, H * 0.35);
  body.bezierCurveTo(W * 1.25, H * 0.7, W * 0.6, H * 1.05, W * 0.15, H * 0.75); // lobe
  body.lineTo(-W * 0.15, H * 0.75);
  body.bezierCurveTo(-W * 0.6, H * 1.05, -W * 1.25, H * 0.7, -W * 0.9, H * 0.35);
  body.bezierCurveTo(-W * 1.05, -H * 0.2, -W * 0.9, -H, 0, -H);
  const g = ctx.createRadialGradient(-W * 0.3, -H * 0.4, 0, 0, 0, H * 1.1);
  g.addColorStop(0, 'rgba(235,245,250,0.32)'); g.addColorStop(1, 'rgba(200,220,235,0.1)');
  ctx.fillStyle = g; ctx.fill(body);
  ctx.strokeStyle = 'rgba(225,240,250,0.4)'; ctx.lineWidth = Math.max(0.8, L * 0.006); ctx.stroke(body);
  // gut and statocyst
  ctx.fillStyle = 'rgba(210,190,160,0.28)'; ctx.beginPath(); ctx.ellipse(0, -H * 0.05, W * 0.18, H * 0.55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(240,240,230,0.6)'; ctx.beginPath(); ctx.arc(0, -H * 0.95, Math.max(1, L * 0.01), 0, TAU); ctx.fill();
  // comb rows: dots of shifting hue running down the meridians
  for (let r = 0; r < 4; r++) {
    const xr = (r - 1.5) / 1.5;
    for (let k = 0; k < 16; k++) {
      const u = k / 15, y = -H * 0.85 + u * H * 1.25;
      const x = xr * W * Math.sin(0.25 + u * 2.6) * 0.95;
      const hue = (t * 260 - k * 28 + r * 40) % 360;
      const a = 0.35 + 0.5 * Math.max(0, Math.sin(t * 6 - k * 0.7));
      ctx.fillStyle = `hsla(${hue},95%,72%,${a.toFixed(2)})`;
      ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.8, L * 0.008), Math.max(0.6, L * 0.004), 0, 0, TAU); ctx.fill();
    }
  }
}

function drawSiphon(ctx, L, v, t) {
  // Praya: two glassy swimming bells lead a long contractile stem; repeating groups of leafy
  // bracts and fishing tentacles hang from it, glowing faintly blue.
  const pts = [];
  const n = 46;
  for (let k = 0; k <= n; k++) { const u = k / n; pts.push([-L / 2 + u * L, Math.sin(t * 0.5 + u * 7) * L * 0.025 + Math.sin(t * 0.3 + u * 3) * L * 0.015]); }
  // fishing tentacles first (behind)
  ctx.lineWidth = Math.max(0.5, L * 0.0012);
  for (let k = 4; k < n; k += 2) {
    const [x, y] = pts[k];
    const len = L * (0.05 + ((k * 13) % 7) / 90);
    ctx.strokeStyle = 'rgba(240,190,170,0.22)';
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s2 = 1; s2 <= 6; s2++) ctx.lineTo(x + Math.sin(t + k + s2) * L * 0.006, y + (s2 / 6) * len);
    ctx.stroke();
  }
  // stem
  ctx.strokeStyle = 'rgba(245,215,200,0.4)'; ctx.lineWidth = Math.max(0.8, L * 0.002);
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  // bracts (small, leaf-like, translucent) along the stem
  for (let k = 4; k < n; k++) {
    const [x, y] = pts[k];
    ctx.fillStyle = k % 2 ? 'rgba(240,215,200,0.22)' : 'rgba(250,200,180,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + L * 0.006, L * 0.008, L * 0.005, Math.sin(t + k) * 0.4, 0, TAU); ctx.fill();
  }
  // two swimming bells (nectophores) at the front
  for (const [dx, dy] of [[-0.018, -0.008], [0.004, 0.006]]) {
    const x = pts[0][0] + dx * L, y = pts[0][1] + dy * L;
    const g = ctx.createRadialGradient(x - L * 0.005, y - L * 0.005, 0, x, y, L * 0.022);
    g.addColorStop(0, 'rgba(240,248,255,0.4)'); g.addColorStop(1, 'rgba(200,225,240,0.12)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, L * 0.022, L * 0.014, 0.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(230,245,255,0.45)'; ctx.lineWidth = Math.max(0.6, L * 0.0015); ctx.stroke();
  }
  const glow = [];
  for (let k = 4; k < n; k += 4) glow.push(pts[k]);
  return glow;
}

function drawManowar(ctx, L, v, t) {
  // A colony, not a jellyfish: an iridescent gas-filled float with a crimped sail riding the
  // surface; below it, clusters of blue polyps and long stinging tentacles.
  const roll = Math.sin(t * 0.9) * 0.08;
  ctx.save(); ctx.rotate(roll);
  for (let k = 0; k < 14; k++) {
    const x0 = -L * 0.22 + k * L * 0.034;
    const len = L * (0.6 + ((k * 31) % 10) / 9);
    const gr = ctx.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, 'rgba(90,90,220,0.55)'); gr.addColorStop(1, 'rgba(90,90,220,0)');
    ctx.strokeStyle = gr; ctx.lineWidth = Math.max(0.6, L * 0.006);
    ctx.beginPath(); ctx.moveTo(x0, 0);
    for (let s2 = 1; s2 <= 10; s2++) { const w = s2 / 10; ctx.lineTo(x0 + Math.sin(t * 1.2 + k + w * 5) * L * 0.04 * w, w * len); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,120,240,0.5)';
    for (let b = 1; b < 5; b++) { const w = b / 10; ctx.beginPath(); ctx.arc(x0 + Math.sin(t * 1.2 + k + w * 5) * L * 0.04 * w, w * len, Math.max(0.6, L * 0.006), 0, TAU); ctx.fill(); }
  }
  ctx.fillStyle = 'rgba(70,90,210,0.6)';
  for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.ellipse(-L * 0.18 + k * L * 0.045, L * 0.03, L * 0.025, L * 0.04, 0.2, 0, TAU); ctx.fill(); }
  const f = new Path2D();
  f.moveTo(-L * 0.4, -L * 0.02);
  f.bezierCurveTo(-L * 0.42, -L * 0.18, L * 0.25, -L * 0.2, L * 0.4, -L * 0.07);
  f.quadraticCurveTo(L * 0.42, L * 0.01, L * 0.3, L * 0.02);
  f.lineTo(-L * 0.35, L * 0.02); f.closePath();
  const g = ctx.createLinearGradient(-L * 0.4, -L * 0.2, L * 0.4, L * 0.02);
  g.addColorStop(0, 'rgba(120,150,240,0.75)'); g.addColorStop(0.5, 'rgba(190,140,230,0.7)'); g.addColorStop(1, 'rgba(240,150,190,0.7)');
  ctx.fillStyle = g; ctx.fill(f);
  ctx.strokeStyle = 'rgba(240,230,255,0.6)'; ctx.lineWidth = Math.max(0.8, L * 0.006); ctx.stroke(f);
  ctx.fillStyle = 'rgba(200,120,200,0.55)';
  ctx.beginPath(); ctx.moveTo(-L * 0.28, -L * 0.13);
  for (let k = 0; k <= 12; k++) { const u = k / 12; ctx.lineTo(-L * 0.28 + u * L * 0.6, -L * 0.17 - Math.sin(u * Math.PI) * L * 0.12 + (k % 2 ? L * 0.02 : 0)); }
  ctx.lineTo(L * 0.32, -L * 0.1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, L * 0.008);
  ctx.beginPath(); ctx.ellipse(-L * 0.1, -L * 0.1, L * 0.18, L * 0.035, -0.08, Math.PI * 1.1, Math.PI * 1.85); ctx.stroke();
  ctx.restore();
}

function drawSquid(ctx, L, v, t, swim) {
  // A torpedo mantle speckled with chromatophores that flicker, rippling triangular fins at the
  // rear, a large eye, eight sucker-lined arms and two longer feeding tentacles with clubs.
  const H = L * 0.15;
  const pulse = Math.sin(t * 3) * 0.05;
  const finWave = Math.sin(t * 4);
  // tentacles and arms (arms at -x, the head end)
  ctx.lineCap = 'round';
  for (let k = 0; k < 8; k++) {
    const y0 = (k - 3.5) * H * 0.08;
    const len = L * (0.24 + (k % 3) * 0.03);
    ctx.strokeStyle = shade(v.c[0], k % 2 ? -0.15 : 0.05); ctx.lineWidth = Math.max(1, H * 0.12 * (1 - Math.abs(k - 3.5) / 6));
    ctx.beginPath(); ctx.moveTo(-L * 0.15, y0);
    ctx.quadraticCurveTo(-L * 0.15 - len * 0.5, y0 * 1.8 + Math.sin(t * 2 + k) * H * 0.2, -L * 0.15 - len, y0 * 1.4 + Math.sin(t * 2.5 + k) * H * 0.35);
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    const ex = -L * 0.15 - L * (v.giant ? 0.75 : 0.42), ey = side * H * 0.3 + Math.sin(t * 1.7 + side) * H * 0.4;
    ctx.strokeStyle = shade(v.c[0], -0.05); ctx.lineWidth = Math.max(0.8, H * 0.06);
    ctx.beginPath(); ctx.moveTo(-L * 0.15, side * H * 0.05); ctx.quadraticCurveTo(-L * 0.4, side * H * 0.5, ex, ey); ctx.stroke();
    ctx.fillStyle = shade(v.c[0], 0.05); ctx.beginPath(); ctx.ellipse(ex - L * 0.02, ey, L * 0.035, H * 0.12, 0, 0, TAU); ctx.fill(); // club
  }
  ctx.lineCap = 'butt';
  // fins at the rear
  ctx.fillStyle = rgba(v.c[0], 0.75);
  ctx.beginPath(); ctx.moveTo(L * 0.28, 0); ctx.quadraticCurveTo(L * 0.4, -H * (1.1 + finWave * 0.2), L * 0.5, 0); ctx.quadraticCurveTo(L * 0.4, H * (1.1 - finWave * 0.2), L * 0.28, 0); ctx.fill();
  // mantle
  const m = new Path2D();
  m.moveTo(-L * 0.08, -H * 0.5);
  m.quadraticCurveTo(L * 0.3, -H * (0.6 + pulse), L * 0.5, 0);
  m.quadraticCurveTo(L * 0.3, H * (0.6 + pulse), -L * 0.08, H * 0.5); m.closePath();
  const g = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6);
  g.addColorStop(0, shade(v.c[0], -0.15)); g.addColorStop(0.5, v.c[0]); g.addColorStop(1, shade(v.c[1], 0.15));
  ctx.fillStyle = g; ctx.fill(m);
  ctx.save(); ctx.clip(m);
  // chromatophores: dots that open and close
  for (let k = 0; k < 40; k++) {
    const x = -L * 0.06 + ((k * 37) % 100) / 100 * L * 0.52, y = (((k * 53) % 100) / 100 - 0.5) * H * 1.1;
    const open = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7);
    ctx.fillStyle = `rgba(110,30,25,${(0.25 + open * 0.4).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, H * (0.03 + open * 0.04)), 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-L, -H, L * 2, H * 0.35);
  ctx.restore();
  // head with a big eye
  ctx.fillStyle = shade(v.c[0], 0.05);
  ctx.beginPath(); ctx.ellipse(-L * 0.11, 0, L * 0.06, H * 0.42, 0, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.1, -H * 0.05, Math.max(1, H * (v.giant ? 0.32 : 0.2)), '#c8c0a0');
  if (v.photo) { ctx.fillStyle = 'rgba(120,200,255,0.75)'; for (let k = 0; k < 10; k++) { ctx.beginPath(); ctx.arc(L * (-0.02 + k * 0.045), H * ((k % 2) - 0.5) * 0.4, Math.max(0.6, H * 0.06), 0, TAU); ctx.fill(); } }
  if (v.glow) {
    const P = [[-L * 0.42, -H * 0.15, 0.9], [-L * 0.42, H * 0.15, 0.9]];
    for (let k = 0; k < 10; k += 3) P.push([L * (-0.02 + k * 0.045), H * ((k % 2) - 0.5) * 0.4, 0.4]);
    return P;
  }
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
  // Sitting on the bottom: a bulbous, textured mantle above the head, a horizontal-slit eye,
  // and eight muscular arms with rows of pale suckers, their tips curling and exploring.
  const s = L * (v.small ? 0.8 : 1);
  const c0 = v.c[0], c1 = v.c[1];
  const arm = (k, near) => {
    const side = k < 4 ? -1 : 1, j = k % 4;
    const reach = s * (0.28 + j * 0.07 + (near ? 0.04 : 0));
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const curl = u > 0.7 ? (u - 0.7) / 0.3 : 0;
      const ang = side * (0.25 + j * 0.28) + Math.sin(t * 1.1 + k * 1.7 + u * 3) * 0.12 * u;
      let x = side * u * reach * Math.cos(ang * 0.4) * 1.3, y = -s * 0.04 + u * s * 0.06 - Math.sin(u * Math.PI) * s * (0.05 + j * 0.015);
      if (curl) { x += side * Math.sin(curl * 2.4 + t + k) * s * 0.03; y -= curl * curl * s * 0.06; }
      pts.push([x - side * s * 0.02, Math.min(-s * 0.005, y)]);
    }
    const w0 = s * (near ? 0.06 : 0.05);
    ctx.fillStyle = near ? c0 : shade(c0, -0.25);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) { const w = w0 * (1 - i / 15); ctx.lineTo(pts[i][0], pts[i][1] - w / 2); }
    for (let i = pts.length - 1; i >= 0; i--) { const w = w0 * (1 - i / 15); ctx.lineTo(pts[i][0], pts[i][1] + w / 2); }
    ctx.closePath(); ctx.fill();
    if (near) {
      ctx.fillStyle = shade(c1, 0.25);
      for (let i = 1; i < 13; i++) { const w = w0 * (1 - i / 15); ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1] + w * 0.35, Math.max(0.5, w * 0.22), 0, TAU); ctx.fill(); }
    }
  };
  for (let k = 0; k < 8; k++) if (k % 2) arm(k, false);
  // web between the arm bases
  ctx.fillStyle = shade(c0, -0.1);
  ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.03); ctx.quadraticCurveTo(0, -s * 0.12, s * 0.16, -s * 0.03); ctx.lineTo(s * 0.1, -s * 0.01); ctx.lineTo(-s * 0.1, -s * 0.01); ctx.fill();
  // head and mantle
  const mx = s * 0.07, my = -s * 0.24;
  const mg = ctx.createRadialGradient(mx - s * 0.04, my - s * 0.06, 0, mx, my, s * 0.2);
  mg.addColorStop(0, shade(c1, 0.15)); mg.addColorStop(0.6, c0); mg.addColorStop(1, shade(c0, -0.3));
  ctx.fillStyle = mg;
  ctx.beginPath(); ctx.ellipse(mx, my, s * 0.13, s * 0.17, 0.45, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s * 0.04, -s * 0.09, s * 0.11, s * 0.085, 0, 0, TAU); ctx.fill();
  // skin papillae and mottling
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let k = 0; k < 22; k++) { const a = k * 2.39, r = (k % 7) / 7; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * r * s * 0.11, my + Math.sin(a) * r * s * 0.14, s * (0.006 + (k % 3) * 0.004), 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,240,220,0.12)';
  for (let k = 0; k < 10; k++) { const a = k * 1.7; ctx.beginPath(); ctx.arc(mx + Math.cos(a) * s * 0.07, my + Math.sin(a) * s * 0.09, s * 0.008, 0, TAU); ctx.fill(); }
  if (v.p === 'rings') { ctx.strokeStyle = v.pc; ctx.lineWidth = Math.max(0.8, s * 0.012); for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(mx + ((k % 3) - 1) * s * 0.06, my + (Math.floor(k / 3) - 1) * s * 0.08, s * 0.022, 0, TAU); ctx.stroke(); } }
  if (v.p === 'bands') { ctx.fillStyle = rgba(v.pc, 0.5); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(mx, my - s * 0.1 + k * s * 0.06, s * 0.12, s * 0.012, 0.45, 0, TAU); ctx.fill(); } }
  // eye: raised, with a horizontal bar pupil
  const ex = -s * 0.06, ey = -s * 0.13, er = Math.max(1.2, s * 0.024);
  ctx.fillStyle = shade(c0, 0.1); ctx.beginPath(); ctx.arc(ex, ey, er * 1.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#c8b070'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(ex - er * 0.8, ey - er * 0.2, er * 1.6, er * 0.4);
  // siphon
  ctx.fillStyle = shade(c0, -0.15); ctx.beginPath(); ctx.ellipse(s * 0.04, -s * 0.07, s * 0.025, s * 0.015, -0.4, 0, TAU); ctx.fill();
  for (let k = 0; k < 8; k++) if (!(k % 2)) arm(k, true);
}

// (3.7.5) a dumbo octopus, from the side: a soft, translucent bell of a mantle, a pair of ear-like fins that flap to
// swim, large eyes, and below them the arms joined by a web into a frilled skirt edged with fine cirri; it hovers,
// the skirt opening and closing slowly
function drawDumbo(ctx, L, v, t, swim = 1) {
  const c0 = v.c[0], c1 = v.c[1], H = L * 0.8, flap = Math.sin(t * 2.2) * swim, puls = 0.5 + 0.5 * Math.sin(t * 1.1);
  const ear = (x, y, s2, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); const eg = ctx.createLinearGradient(0, 0, L * 0.18 * s2, 0); eg.addColorStop(0, rgba(c1, 0.95)); eg.addColorStop(1, rgba(shade(c1, 0.25), 0.7));
    ctx.fillStyle = eg; ctx.beginPath(); ctx.moveTo(0, -L * 0.03 * s2); ctx.quadraticCurveTo(L * 0.14 * s2, -L * 0.1 * s2, L * 0.2 * s2, 0); ctx.quadraticCurveTo(L * 0.14 * s2, L * 0.1 * s2, 0, L * 0.03 * s2); ctx.fill();
    ctx.strokeStyle = rgba(shade(c0, -0.25), 0.3); ctx.lineWidth = Math.max(0.4, L * 0.003); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(L * 0.02 * s2, 0); ctx.lineTo(L * 0.17 * s2, k * L * 0.04 * s2); ctx.stroke(); } ctx.restore(); };
  ear(-L * 0.02, -H * 0.18, 1.35, -2.5 - flap * 0.35);   // the far ear, sticking out from the far side of the mantle
  // the skirt: the webbed arms below and forward, scalloped, edged with cirri
  const top = H * 0.02, sk = []; for (let k = 0; k <= 8; k++) { const u = k / 8, a = PI * (0.12 + u * 0.82); sk.push([Math.cos(a) * L * (0.38 + puls * 0.06), top + Math.sin(a) * H * (0.42 + puls * 0.08)]); }
  const skirt = new Path2D(); skirt.moveTo(L * 0.3, top);
  sk.forEach((p, k) => { if (!k) return skirt.lineTo(p[0], p[1]); const q = sk[k - 1]; skirt.quadraticCurveTo((p[0] + q[0]) / 2 * 0.86, (p[1] + q[1]) / 2 * 0.9, p[0], p[1]); });
  skirt.lineTo(-L * 0.3, top); skirt.closePath();
  const sg = ctx.createLinearGradient(0, top, 0, top + H * 0.5); sg.addColorStop(0, rgba(c1, 0.95)); sg.addColorStop(1, rgba(shade(c0, -0.12), 0.85)); ctx.fillStyle = sg; ctx.fill(skirt);
  ctx.strokeStyle = rgba(shade(c0, -0.3), 0.35); ctx.lineWidth = Math.max(0.6, L * 0.006); for (const p of sk) { ctx.beginPath(); ctx.moveTo(0, top + H * 0.05); ctx.lineTo(p[0] * 0.98, p[1] * 0.98); ctx.stroke(); }
  ctx.strokeStyle = rgba(shade(c1, 0.35), 0.6); ctx.lineWidth = Math.max(0.3, L * 0.002);
  for (const p of sk) for (let k = 1; k < 5; k++) { const u = k / 5, x = p[0] * u, y = top + (p[1] - top) * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L * 0.012, y + L * 0.006); ctx.stroke(); }
  // the mantle: a soft dome, a little see-through, veined
  const mantle = new Path2D(); mantle.moveTo(-L * 0.3, top + H * 0.02); mantle.bezierCurveTo(-L * 0.34, -H * 0.5, L * 0.3, -H * 0.56, L * 0.3, top + H * 0.02); mantle.closePath();
  const mg = ctx.createRadialGradient(-L * 0.05, -H * 0.3, L * 0.02, 0, -H * 0.1, L * 0.36); mg.addColorStop(0, shade(c1, 0.22)); mg.addColorStop(0.6, c1); mg.addColorStop(1, shade(c0, -0.12)); ctx.fillStyle = mg; ctx.fill(mantle);
  ctx.save(); ctx.clip(mantle); ctx.strokeStyle = 'rgba(200,90,100,0.15)'; ctx.lineWidth = Math.max(0.3, L * 0.002);
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.25 + k * L * 0.08, top); ctx.quadraticCurveTo(-L * 0.2 + k * L * 0.07 + hashN(k, 31) * L * 0.05, -H * 0.2, -L * 0.1 + k * L * 0.04, -H * 0.42); ctx.stroke(); }
  const hl = ctx.createRadialGradient(-L * 0.1, -H * 0.36, 0, -L * 0.1, -H * 0.36, L * 0.12); hl.addColorStop(0, 'rgba(255,255,255,0.4)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hl; ctx.fillRect(-L, -H, 2 * L, 2 * H); ctx.restore();
  ear(L * 0.16, -H * 0.2, 1.6, -0.45 + flap * 0.45);     // the near ear, the one it rows with
  // the eye, large and dark
  const er = Math.max(1.4, L * 0.05); ctx.fillStyle = rgba(shade(c0, -0.3), 0.6); ctx.beginPath(); ctx.arc(-L * 0.12, -H * 0.04, er * 1.35, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.12, -H * 0.04, er, '#1a1214');
  return v.glow ? sk.map((p) => [p[0], p[1], 0.4]) : null;
}
function drawVampire(ctx, L, v, t, swim = 1) {
  const c0 = v.c[0], c1 = v.c[1], glow = v.glow || '#5ac8ff', eyec = v.eyec || '#c83a2a';
  const H = L * 0.5, open = 0.55 + 0.45 * Math.sin(t * 1.4) * swim, P = [];
  // the far-side fin
  const fin = (x, y, s2, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = rgba(shade(c1, 0.12), 0.85); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.09 * s2, L * 0.05 * s2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(shade(c1, 0.3), 0.4); ctx.lineWidth = Math.max(0.4, L * 0.003); for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.07 * s2, 0); ctx.lineTo(L * 0.08 * s2, k * L * 0.018 * s2); ctx.stroke(); } ctx.restore(); };
  fin(L * 0.3, -H * 0.42, 0.85, -0.9 + Math.sin(t * 2) * 0.15);
  // the cloak: the webbed arms reaching forward (-x), their outer edge scalloped between the arm tips
  const cx = -L * 0.08, cy = H * 0.02, reach = L * 0.42, spread = H * (0.45 + open * 0.55);
  const arms = []; for (let k = 0; k < 6; k++) { const u = k / 5, a = PI + (u - 0.5) * (0.8 + open * 0.9); arms.push([cx + Math.cos(a) * reach * (0.92 + 0.08 * Math.sin(k * 2.1)), cy + Math.sin(a) * reach * 0.9 * (spread / H)]); }
  const cloak = new Path2D(); cloak.moveTo(cx + L * 0.04, cy - H * 0.28);
  arms.forEach((p, k) => { if (k) { const q = arms[k - 1], mx = (p[0] + q[0]) / 2 + L * 0.06, my = (p[1] + q[1]) / 2; cloak.quadraticCurveTo(mx, my, p[0], p[1]); } else cloak.lineTo(p[0], p[1]); });
  cloak.lineTo(cx + L * 0.04, cy + H * 0.28); cloak.closePath();
  const cg = ctx.createRadialGradient(cx, cy, L * 0.02, cx - reach * 0.4, cy, reach); cg.addColorStop(0, shade(c1, 0.05)); cg.addColorStop(0.6, c0); cg.addColorStop(1, shade(c0, -0.35));
  ctx.fillStyle = cg; ctx.fill(cloak);
  // inside the web: the arms as darker ribs, each lined with pale cirri
  for (const [ax, ay] of arms) {
    ctx.strokeStyle = rgba(shade(c0, -0.45), 0.8); ctx.lineWidth = Math.max(0.8, L * 0.008); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.strokeStyle = 'rgba(235,225,215,0.7)'; ctx.lineWidth = Math.max(0.4, L * 0.0028);
    for (let k = 1; k < 7; k++) { const u = k / 7, x = cx + (ax - cx) * u, y = cy + (ay - cy) * u, nx = -(ay - cy), ny = ax - cx, nl = Math.hypot(nx, ny) || 1, c = L * 0.018 * (1 - u * 0.4); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (nx / nl) * c, y + (ny / nl) * c); ctx.stroke(); }
    // the arm tip, dark, with its light
    ctx.fillStyle = '#0a0406'; ctx.beginPath(); ctx.arc(ax, ay, Math.max(0.9, L * 0.01), 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(glow, 0.5 + 0.4 * Math.sin(t * 3 + ax)); ctx.beginPath(); ctx.arc(ax, ay, Math.max(0.6, L * 0.006), 0, TAU); ctx.fill(); P.push([ax, ay, 0.6]);
  }
  ctx.strokeStyle = rgba(shade(c0, -0.5), 0.5); ctx.lineWidth = Math.max(0.5, L * 0.004); ctx.stroke(cloak);
  // the head, where the arms and the cloak gather: rounded, joining cloak to mantle
  const hd = ctx.createRadialGradient(-L * 0.02, -H * 0.1, L * 0.01, 0, 0, L * 0.14); hd.addColorStop(0, shade(c1, 0.1)); hd.addColorStop(1, shade(c0, -0.2));
  ctx.fillStyle = hd; ctx.beginPath(); ctx.ellipse(-L * 0.02, 0, L * 0.12, H * 0.34, 0, 0, TAU); ctx.fill();
  // the mantle: a soft rounded bag behind the head, velvety, with a near-side fin
  const mantle = new Path2D(); mantle.moveTo(-L * 0.02, -H * 0.3); mantle.bezierCurveTo(L * 0.12, -H * 0.52, L * 0.38, -H * 0.42, L * 0.44, -H * 0.06); mantle.bezierCurveTo(L * 0.46, H * 0.2, L * 0.2, H * 0.42, -L * 0.02, H * 0.3); mantle.closePath();
  const mg = ctx.createRadialGradient(L * 0.15, -H * 0.18, L * 0.02, L * 0.2, 0, L * 0.3); mg.addColorStop(0, shade(c1, 0.18)); mg.addColorStop(0.6, c1); mg.addColorStop(1, shade(c0, -0.25)); ctx.fillStyle = mg; ctx.fill(mantle);
  ctx.save(); ctx.clip(mantle); ctx.fillStyle = rgba(shade(c0, -0.5), 0.25); for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc(-L * 0.02 + hashN(i, 21) * L * 0.46, -H * 0.5 + hashN(i, 22) * H, Math.max(0.4, L * 0.003), 0, TAU); ctx.fill(); }
  const hl = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.4); hl.addColorStop(0, 'rgba(255,220,220,0.14)'); hl.addColorStop(0.5, 'rgba(0,0,0,0)'); ctx.fillStyle = hl; ctx.fillRect(-L, -H, 2 * L, 2 * H); ctx.restore();
  // the light organ behind the fin
  ctx.fillStyle = rgba(glow, 0.6); ctx.beginPath(); ctx.ellipse(L * 0.34, -H * 0.12, Math.max(0.8, L * 0.012), Math.max(0.6, L * 0.008), 0, 0, TAU); ctx.fill(); P.push([L * 0.34, -H * 0.12, 0.8]);
  fin(L * 0.32, -H * 0.36, 1, -0.7 + Math.sin(t * 2 + 0.6) * 0.18);
  // the eye: very large for its size, a dark lens in a red-blue iris
  const er = Math.max(1.5, L * 0.055); ctx.fillStyle = rgba(shade(c0, -0.4), 0.9); ctx.beginPath(); ctx.arc(L * 0.02, -H * 0.04, er * 1.3, 0, TAU); ctx.fill();
  eye(ctx, L * 0.02, -H * 0.04, er, shade(eyec, -0.35)); // (deep red in most light; blue in some)
  return P;
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
  // Standing on the bottom: jointed walking legs (three segments each), a domed carapace with
  // tubercles and a serrated front, stalked eyes, and heavy claws with a moving finger.
  const s = L;
  const c0 = v.c[0], c1 = v.c[1];
  const bw = v.spider ? s * 0.12 : s * 0.3, bh = v.spider ? s * 0.12 : s * 0.13;
  const by = -s * (v.spider ? 0.32 : 0.12); // body height above the floor
  const leg = (x0, side, k, far) => {
    const reach = s * (v.spider ? 0.75 : 0.32) * (1 - Math.abs(k - 1.5) * 0.08);
    const step = Math.sin(t * 1.4 + k * 1.3 + (side > 0 ? 0 : 1.5)) * s * 0.015;
    const kx = x0 + side * reach * 0.45, ky = by - s * (v.spider ? 0.18 : 0.07);
    const fx = x0 + side * reach + step, fy = 0;
    const mx = (kx + fx) / 2 + side * s * 0.02, my = ky + (fy - ky) * 0.35;
    ctx.strokeStyle = far ? shade(c0, -0.35) : shade(c0, -0.05); ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, s * (v.spider ? 0.018 : 0.032));
    ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * (v.spider ? 0.014 : 0.026));
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(mx, my); ctx.stroke();
    ctx.lineWidth = Math.max(0.8, s * (v.spider ? 0.01 : 0.018));
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(fx, fy); ctx.stroke();
    if (!far) { ctx.fillStyle = shade(c1, 0.2); ctx.beginPath(); ctx.arc(kx, ky, Math.max(0.8, s * 0.012), 0, TAU); ctx.fill(); }
    if (v.yeti) { ctx.strokeStyle = 'rgba(240,235,220,0.55)'; ctx.lineWidth = 0.8; for (let h = 0; h < 6; h++) { const u = h / 6; ctx.beginPath(); ctx.moveTo(kx + (mx - kx) * u, ky + (my - ky) * u); ctx.lineTo(kx + (mx - kx) * u, ky + (my - ky) * u + s * 0.03); ctx.stroke(); } }
    ctx.lineCap = 'butt';
  };
  for (let k = 0; k < 4; k++) { leg(-bw * 0.4 + k * bw * 0.15, -1, k, true); leg(bw * 0.4 - k * bw * 0.15, 1, k, true); }
  // claws (chelipeds)
  const claw = (side, far) => {
    const open = 0.15 + Math.max(0, Math.sin(t * 0.7 + side)) * 0.25;
    const sx = side * bw * 0.75, sy = by - bh * 0.1;
    const hx = side * bw * (v.spider ? 1.6 : 1.25), hy = by - bh * (v.spider ? 0.6 : 0.45);
    ctx.strokeStyle = far ? shade(c0, -0.3) : c0; ctx.lineWidth = Math.max(1, s * (v.spider ? 0.018 : 0.04)); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(side * bw * 1.1, sy + bh * 0.2, hx, hy); ctx.stroke();
    ctx.lineCap = 'butt';
    const pw = s * (v.spider ? 0.05 : v.king ? 0.09 : 0.11), ph = pw * 0.55;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(side, 1); ctx.rotate(-0.3);
    const pg = ctx.createLinearGradient(0, -ph, 0, ph);
    pg.addColorStop(0, shade(v.swim ? c1 : c0, 0.12)); pg.addColorStop(1, shade(v.swim ? c1 : c0, -0.3));
    ctx.fillStyle = far ? shade(c0, -0.3) : pg;
    ctx.beginPath(); ctx.ellipse(pw * 0.4, 0, pw * 0.55, ph, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(pw * 0.8, -ph * 0.4); ctx.quadraticCurveTo(pw * 1.3, -ph * 0.5, pw * 1.45, -ph * 0.05); ctx.lineTo(pw * 0.85, 0); ctx.fill(); // fixed finger
    ctx.save(); ctx.translate(pw * 0.85, ph * 0.1); ctx.rotate(open);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(pw * 0.4, ph * 0.5, pw * 0.6, ph * 0.1); ctx.lineTo(0, ph * 0.35); ctx.fill(); // moving finger
    ctx.restore();
    if (!far) { ctx.fillStyle = '#141210'; ctx.beginPath(); ctx.ellipse(pw * 1.42, -ph * 0.05, pw * 0.06, ph * 0.12, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
  claw(-1, true);
  // carapace
  const car = new Path2D();
  car.moveTo(-bw, by + bh * 0.2);
  car.bezierCurveTo(-bw * 1.02, by - bh * 1.1, bw * 1.02, by - bh * 1.1, bw, by + bh * 0.2);
  car.quadraticCurveTo(0, by + bh * 0.55, -bw, by + bh * 0.2);
  const cg = ctx.createLinearGradient(0, by - bh, 0, by + bh * 0.5);
  cg.addColorStop(0, shade(c0, 0.18)); cg.addColorStop(0.55, c0); cg.addColorStop(1, shade(c0, -0.4));
  ctx.fillStyle = cg; ctx.fill(car);
  ctx.save(); ctx.clip(car);
  // tubercles / spines / hairs depending on species, and the gastric-region grooves
  ctx.fillStyle = v.yeti ? 'rgba(255,255,250,0.35)' : 'rgba(255,240,220,0.22)';
  for (let k = 0; k < (v.king || v.snow ? 28 : 14); k++) { const a = k * 2.39, r = Math.sqrt((k + 1) / 28); ctx.beginPath(); ctx.arc(Math.cos(a) * r * bw * 0.9, by - bh * 0.35 + Math.sin(a) * r * bh * 0.6, Math.max(0.6, s * (v.king ? 0.01 : 0.006)), 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = Math.max(0.6, s * 0.004);
  ctx.beginPath(); ctx.moveTo(-bw * 0.3, by - bh * 0.7); ctx.quadraticCurveTo(0, by - bh * 0.2, bw * 0.3, by - bh * 0.7); ctx.stroke();
  ctx.restore();
  // serrated front margin
  ctx.fillStyle = shade(c0, -0.1);
  for (let k = 0; k < 9; k++) { const x = -bw * 0.95 + k * bw * 0.24; ctx.beginPath(); ctx.moveTo(x - s * 0.012, by + bh * 0.15); ctx.lineTo(x, by + bh * 0.28); ctx.lineTo(x + s * 0.012, by + bh * 0.15); ctx.fill(); }
  // stalked eyes and antennules
  for (const ex of [-bw * 0.18, bw * 0.06]) {
    ctx.strokeStyle = shade(c0, -0.1); ctx.lineWidth = Math.max(0.8, s * 0.012);
    ctx.beginPath(); ctx.moveTo(ex, by - bh * 0.7); ctx.lineTo(ex - s * 0.01, by - bh * 1.15); ctx.stroke();
    eye(ctx, ex - s * 0.01, by - bh * 1.18, Math.max(0.8, s * 0.016), '#1a1a1a', true);
  }
  ctx.strokeStyle = shade(c1, 0.1); ctx.lineWidth = Math.max(0.5, s * 0.004);
  ctx.beginPath(); ctx.moveTo(-bw * 0.05, by - bh * 0.8); ctx.quadraticCurveTo(-bw * 0.2, by - bh * 1.6, -bw * 0.35 + Math.sin(t * 2) * s * 0.01, by - bh * 1.7); ctx.stroke();
  for (let k = 0; k < 4; k++) { leg(-bw * 0.45 + k * bw * 0.17, -1, k + 0.5, false); leg(bw * 0.45 - k * bw * 0.17, 1, k + 0.5, false); }
  claw(1, false);
}

function drawLobster(ctx, L, v, t) {
  // On the bottom, head to -x: a spined carapace, a segmented tail ending in a fan, long antennae,
  // jointed walking legs and (in clawed lobsters) a heavy crusher and a slimmer cutter claw.
  const H = L * 0.13, by = -H * 0.9;
  const c0 = v.c[0], c1 = v.c[1];
  // walking legs
  for (let k = 0; k < 4; k++) {
    const x = -L * 0.2 + k * L * 0.07, step = Math.sin(t * 1.2 + k) * L * 0.01;
    ctx.strokeStyle = shade(c0, -0.15); ctx.lineWidth = Math.max(0.8, L * 0.01); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, by + H * 0.3); ctx.lineTo(x - L * 0.02, by + H * 0.6); ctx.lineTo(x - L * 0.04 + step, 0); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // antennae (very long on the spiny lobster) and antennules
  ctx.strokeStyle = shade(c0, 0.1); ctx.lineWidth = Math.max(0.6, L * (v.spiny ? 0.012 : 0.006));
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(-L * 0.36, by - H * 0.3);
    ctx.bezierCurveTo(-L * 0.55, by - H * (1.5 + side * 0.3), -L * 0.75, by - H * (2.6 + side * 0.4), -L * (v.spiny ? 1.05 : 0.9) + Math.sin(t + side) * L * 0.02, by - H * (side > 0 ? 3.2 : 1.6));
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(0.5, L * 0.004);
  for (const dy of [-0.1, 0.1]) { ctx.beginPath(); ctx.moveTo(-L * 0.38, by + H * dy); ctx.lineTo(-L * 0.5, by - H * 0.5 + dy * H); ctx.stroke(); }
  // tail segments and fan
  for (let k = 0; k < 6; k++) {
    const x = L * (0.06 + k * 0.06), w = H * (0.62 - k * 0.04);
    const g = ctx.createLinearGradient(0, by - w, 0, by + w);
    g.addColorStop(0, shade(c0, 0.15)); g.addColorStop(1, shade(c0, -0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, by + k * H * 0.03, L * 0.04, w, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.fillStyle = shade(c0, -0.1);
  for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(L * 0.44, by + H * 0.2 + k * H * 0.1, L * 0.05, H * 0.1, k * 0.3, 0, TAU); ctx.fill(); }
  // carapace
  const car = new Path2D();
  car.moveTo(-L * 0.4, by);
  car.quadraticCurveTo(-L * 0.36, by - H * 0.8, -L * 0.15, by - H * 0.75);
  car.lineTo(L * 0.05, by - H * 0.65); car.lineTo(L * 0.05, by + H * 0.55);
  car.quadraticCurveTo(-L * 0.2, by + H * 0.7, -L * 0.38, by + H * 0.25); car.closePath();
  const cg = ctx.createLinearGradient(0, by - H, 0, by + H);
  cg.addColorStop(0, shade(c0, 0.2)); cg.addColorStop(0.6, c0); cg.addColorStop(1, shade(c1, -0.2));
  ctx.fillStyle = cg; ctx.fill(car);
  ctx.save(); ctx.clip(car);
  ctx.fillStyle = v.spiny ? 'rgba(240,220,170,0.4)' : 'rgba(0,0,0,0.18)';
  for (let k = 0; k < 24; k++) { ctx.beginPath(); ctx.arc(-L * 0.35 + ((k * 37) % 40) / 100 * L, by + (((k * 53) % 100) / 100 - 0.5) * H * 1.2, Math.max(0.6, L * 0.006), 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.6, L * 0.003);
  ctx.beginPath(); ctx.moveTo(-L * 0.2, by - H * 0.7); ctx.quadraticCurveTo(-L * 0.15, by, -L * 0.2, by + H * 0.6); ctx.stroke();
  if (v.p === 'spots') { ctx.fillStyle = rgba(v.pc, 0.75); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(L * (0.07 + k * 0.06), by - H * 0.25, L * 0.012, 0, TAU); ctx.fill(); } }
  ctx.restore();
  // rostrum spike and eyes
  ctx.fillStyle = shade(c0, 0.05); ctx.beginPath(); ctx.moveTo(-L * 0.36, by - H * 0.45); ctx.lineTo(-L * 0.46, by - H * 0.5); ctx.lineTo(-L * 0.36, by - H * 0.25); ctx.fill();
  eye(ctx, -L * 0.35, by - H * 0.55, Math.max(0.7, H * 0.09), '#111', true);
  if (!v.spiny) {
    // claws: the crusher (near) is heavier than the cutter (far)
    const claw = (dy, size, near) => {
      ctx.save(); ctx.translate(-L * 0.38, by + H * dy);
      ctx.fillStyle = near ? shade(c0, 0.05) : shade(c0, -0.25);
      ctx.beginPath(); ctx.ellipse(-L * 0.06, 0, L * 0.07, H * 0.25, 0.15, 0, TAU); ctx.fill(); // arm
      ctx.beginPath(); ctx.ellipse(-L * 0.18, -H * 0.05, L * 0.1 * size, H * 0.42 * size, -0.1, 0, TAU); ctx.fill(); // palm
      ctx.beginPath(); ctx.moveTo(-L * 0.25 * size - L * 0.02, -H * 0.3 * size); ctx.lineTo(-L * 0.36 * size - L * 0.02, -H * 0.15); ctx.lineTo(-L * 0.25 * size - L * 0.02, -H * 0.05); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-L * 0.25 * size - L * 0.02, H * 0.05); ctx.lineTo(-L * 0.34 * size - L * 0.02, H * 0.15); ctx.lineTo(-L * 0.25 * size - L * 0.02, H * 0.25 * size); ctx.fill();
      if (near) { ctx.fillStyle = 'rgba(255,240,200,0.2)'; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(-L * (0.12 + k * 0.012), -H * 0.2 + (k % 2) * H * 0.15, L * 0.004, 0, TAU); ctx.fill(); } }
      ctx.restore();
    };
    claw(-0.45, 0.85, false);
    claw(0.15, 1.05, true);
  }
}

function drawShrimp(ctx, L, v, t) {
  // Curved, segmented abdomen ending in a tail fan, a smooth carapace with a toothed rostrum,
  // fringed swimmerets beating underneath, long whip antennae. Mantis shrimp get raptorial clubs
  // and stalked, banded eyes; krill are glassy with glowing dots.
  const H = L * 0.14;
  const c0 = hexToRgb(v.c[0]), c1 = hexToRgb(v.c[1]);
  const glassy = v.krill;
  const segs = 6, pts = [];
  for (let k = 0; k <= segs; k++) { const u = k / segs; pts.push([-L * 0.08 + u * L * 0.52, Math.sin(u * 1.4) * H * (v.mantis ? 0.2 : 0.9)]); }
  // swimmerets
  ctx.strokeStyle = rgbStr(mixRgb(c0, [255, 255, 255], 0.3), 0.7); ctx.lineWidth = Math.max(0.5, L * 0.006);
  for (let k = 1; k < segs; k++) { const [x, y] = pts[k]; ctx.beginPath(); ctx.moveTo(x, y + H * 0.35); ctx.lineTo(x - L * 0.01 + Math.sin(t * 9 + k) * L * 0.012, y + H * 0.8); ctx.stroke(); }
  // walking legs
  ctx.strokeStyle = rgbStr(c0, 0.85); ctx.lineWidth = Math.max(0.5, L * 0.006);
  for (let k = 0; k < 5; k++) { const x = -L * 0.3 + k * L * 0.045; ctx.beginPath(); ctx.moveTo(x, H * 0.3); ctx.lineTo(x - L * 0.02, H * 0.7); ctx.lineTo(x - L * 0.01, H * 1.1); ctx.stroke(); }
  // abdomen segments (back to front so they overlap correctly) and tail fan
  const [tx, ty] = pts[segs];
  ctx.fillStyle = rgbStr(mixRgb(c0, [255, 255, 255], 0.1), glassy ? 0.55 : 0.95);
  for (const a of [-0.5, 0, 0.5]) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(0.9 + a); ctx.beginPath(); ctx.ellipse(L * 0.05, 0, L * 0.055, H * 0.18, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  for (let k = segs - 1; k >= 0; k--) {
    const [x, y] = pts[k], w = H * (0.5 - k * 0.035);
    const g = ctx.createLinearGradient(x, y - w, x, y + w);
    g.addColorStop(0, rgbStr(mixRgb(c0, [255, 255, 255], 0.2), glassy ? 0.6 : 1)); g.addColorStop(1, rgbStr(mixRgb(c1, [0, 0, 0], 0.1), glassy ? 0.5 : 1));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, L * 0.05, w, Math.atan2(pts[Math.min(segs, k + 1)][1] - y, L * 0.087), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
  }
  // carapace
  const cg = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.5);
  cg.addColorStop(0, rgbStr(mixRgb(c0, [255, 255, 255], 0.2), glassy ? 0.6 : 1)); cg.addColorStop(1, rgbStr(c1, glassy ? 0.5 : 1));
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(-L * 0.2, -H * 0.05, L * 0.16, H * 0.5, 0, 0, TAU); ctx.fill();
  if (!v.mantis) {
    // a white stripe (cleaner shrimp), then the toothed rostrum
    if (v.c[1] === '#ecece4') { ctx.fillStyle = 'rgba(245,245,240,0.9)'; ctx.fillRect(-L * 0.36, -H * 0.55, L * 0.75, H * 0.12); }
    ctx.fillStyle = rgbStr(c0, 0.9);
    ctx.beginPath(); ctx.moveTo(-L * 0.3, -H * 0.35); ctx.lineTo(-L * 0.48, -H * 0.55);
    for (let k = 0; k < 5; k++) ctx.lineTo(-L * (0.46 - k * 0.03), -H * (0.5 - (k % 2) * 0.12));
    ctx.lineTo(-L * 0.3, -H * 0.2); ctx.fill();
  } else {
    // mantis shrimp: banded body stripes and folded raptorial clubs
    ctx.strokeStyle = 'rgba(30,60,40,0.4)'; ctx.lineWidth = Math.max(1, L * 0.01);
    for (let k = 0; k < segs; k++) { const [x, y] = pts[k]; ctx.beginPath(); ctx.moveTo(x - L * 0.03, y - H * 0.45); ctx.lineTo(x - L * 0.03, y + H * 0.45); ctx.stroke(); }
    ctx.fillStyle = '#e8502a';
    ctx.beginPath(); ctx.ellipse(-L * 0.36, H * 0.45, L * 0.05, H * 0.2, -0.6 + Math.max(0, Math.sin(t * 0.6)) * 0.4, 0, TAU); ctx.fill();
  }
  // antennae and antennal scale
  ctx.strokeStyle = rgbStr(mixRgb(c0, [255, 255, 255], 0.3), 0.85); ctx.lineWidth = Math.max(0.4, L * 0.004);
  for (const [a, len] of [[-0.2, 1.1], [0.15, 0.8]]) {
    ctx.beginPath(); ctx.moveTo(-L * 0.32, -H * 0.15);
    ctx.bezierCurveTo(-L * 0.6, -H * (2 + a * 3), -L * 0.4 * len, -H * 4 * len, -L * 0.2 * len + Math.sin(t * 1.5 + a) * L * 0.05, -H * 4.5 * len); ctx.stroke();
  }
  // eye (stalked and banded on the mantis shrimp)
  if (v.mantis) {
    ctx.strokeStyle = rgbStr(c0, 1); ctx.lineWidth = Math.max(1, L * 0.012);
    ctx.beginPath(); ctx.moveTo(-L * 0.3, -H * 0.3); ctx.lineTo(-L * 0.34, -H * 0.8); ctx.stroke();
    ctx.fillStyle = '#3ac87a'; ctx.beginPath(); ctx.ellipse(-L * 0.34, -H * 0.85, L * 0.02, H * 0.14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#123'; ctx.fillRect(-L * 0.36, -H * 0.87, L * 0.04, H * 0.04);
  } else eye(ctx, -L * 0.32, -H * 0.3, Math.max(0.7, H * 0.13), '#111', true);
  if (glassy) { ctx.fillStyle = 'rgba(150,220,255,0.8)'; for (let k = 0; k < 6; k++) { const [x, y] = pts[k]; ctx.beginPath(); ctx.arc(x, y + H * 0.3, Math.max(0.6, L * 0.008), 0, TAU); ctx.fill(); } }
}

// (3.7.5) a giant isopod, from the side: a domed back of overlapping armour plates (seven, then the tail shield),
// each with a rolled edge; a head with a large faceted eye and two pairs of antennae, the second long; seven
// pairs of jointed walking legs ending in hooked claws; swimming legs under the tail
function drawIsopod(ctx, L, v, t, swim = 1) {
  const c0 = v.c[0], c1 = v.c[1], H = L * 0.36, walk = t * 3 * swim;
  // the legs on the far side first, then the body, then the near legs
  const legs = (side) => {
    for (let k = 0; k < 7; k++) {
      const x = -L * 0.26 + k * L * 0.085, ph = walk + k * 0.9 + (side > 0 ? PI : 0), lift = Math.max(0, Math.sin(ph)) * H * 0.08, swing = Math.cos(ph) * L * 0.025;
      const kx = x + L * 0.02 * (side > 0 ? 1 : 0.6) + swing * 0.5, ky = H * 0.32 - lift, fx = x + L * 0.035 + swing, fy = H * 0.55 - lift * 0.6;
      ctx.strokeStyle = side > 0 ? shade(c0, -0.05) : shade(c0, -0.3); ctx.lineWidth = Math.max(1, L * (side > 0 ? 0.013 : 0.011)); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, H * 0.1); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.lineWidth = Math.max(0.6, L * 0.006); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + L * 0.012, fy + H * 0.02, fx + L * 0.018, fy - H * 0.01); ctx.stroke(); // the claw
      ctx.fillStyle = side > 0 ? shade(c1, 0.1) : shade(c0, -0.15); ctx.beginPath(); ctx.arc(kx, ky, Math.max(0.6, L * 0.006), 0, TAU); ctx.fill(); // the joint
    }
    ctx.lineCap = 'butt';
  };
  legs(-1);
  // the swimming legs and the tail shield's fringe
  ctx.fillStyle = rgba(shade(c1, 0.1), 0.6); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(L * 0.32 + k * L * 0.03, H * 0.2, L * 0.02, H * 0.12, 0.3, 0, TAU); ctx.fill(); }
  // the body: the domed back, plate by plate from head to tail
  const back = (u) => -H * (0.12 + 0.42 * Math.sin(Math.min(1, Math.max(0, u)) * PI) ** 0.7);
  const body = new Path2D(); body.moveTo(-L * 0.46, H * 0.12);
  for (let i = 0; i <= 40; i++) { const u = i / 40; body.lineTo(-L * 0.46 + u * L * 0.92, back(u)); }
  body.lineTo(L * 0.47, H * 0.14); body.quadraticCurveTo(0, H * 0.26, -L * 0.46, H * 0.12); body.closePath();
  const bg = ctx.createLinearGradient(0, -H * 0.55, 0, H * 0.2); bg.addColorStop(0, shade(c1, 0.18)); bg.addColorStop(0.55, c1); bg.addColorStop(1, shade(c0, -0.2)); ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // the plates: each overlapping the next, a dark seam and a light rolled edge, faint pits across them
  const seams = [0.16, 0.27, 0.37, 0.47, 0.56, 0.65, 0.74, 0.83];
  for (const u of seams) { const x = -L * 0.46 + u * L * 0.92;
    const sg = ctx.createLinearGradient(x - L * 0.03, 0, x + L * 0.01, 0); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(0.75, rgba(shade(c0, -0.4), 0.45)); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - L * 0.03, -H, L * 0.04, 2 * H);
    ctx.strokeStyle = rgba(shade(c1, 0.4), 0.55); ctx.lineWidth = Math.max(0.6, L * 0.004); ctx.beginPath(); ctx.moveTo(x + L * 0.004, back(u) + 1); ctx.quadraticCurveTo(x + L * 0.012, 0, x + L * 0.004, H * 0.2); ctx.stroke(); }
  ctx.fillStyle = rgba(shade(c0, -0.3), 0.22); for (let i = 0; i < 70; i++) { ctx.beginPath(); ctx.arc(-L * 0.4 + hashN(i, 41) * L * 0.85, -H * 0.5 + hashN(i, 42) * H * 0.6, Math.max(0.4, L * 0.003), 0, TAU); ctx.fill(); }
  // the side flanges (the plates' lower edges), a paler band along the bottom
  ctx.fillStyle = rgba(shade(c1, 0.25), 0.35); ctx.fillRect(-L, H * 0.04, 2 * L, H * 0.06);
  ctx.restore();
  ctx.strokeStyle = rgba(shade(c0, -0.45), 0.6); ctx.lineWidth = Math.max(0.5, L * 0.004); ctx.stroke(body);
  legs(1);
  // the head: two pairs of antennae, the long second pair sweeping back, a big faceted eye
  ctx.strokeStyle = shade(c0, -0.1); ctx.lineWidth = Math.max(0.6, L * 0.005);
  ctx.beginPath(); ctx.moveTo(-L * 0.45, H * 0.0); ctx.quadraticCurveTo(-L * 0.56, -H * 0.15, -L * 0.6, -H * 0.06 + Math.sin(t * 1.3) * H * 0.04); ctx.stroke();
  ctx.lineWidth = Math.max(0.7, L * 0.006); ctx.beginPath(); ctx.moveTo(-L * 0.44, H * 0.06); ctx.bezierCurveTo(-L * 0.62, H * 0.2, -L * 0.6, H * 0.5, -L * 0.42 + Math.sin(t * 0.9) * L * 0.02, H * 0.6); ctx.stroke();
  for (let k = 1; k < 8; k++) { const u = k / 8; ctx.fillStyle = shade(c0, -0.25); ctx.beginPath(); ctx.arc(-L * 0.44 - Math.sin(u * PI) * L * 0.15, H * 0.06 + u * H * 0.55, Math.max(0.4, L * 0.003), 0, TAU); ctx.fill(); } // its segments
  const ex = -L * 0.39, ey = -H * 0.14, er = Math.max(1.4, L * 0.04);
  ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.1, er, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(160,170,180,0.25)'; ctx.lineWidth = Math.max(0.3, L * 0.0015);
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(ex + i * er * 0.3, ey - er); ctx.lineTo(ex + i * er * 0.3 + er * 0.2, ey + er); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ex - er, ey + i * er * 0.3); ctx.lineTo(ex + er, ey + i * er * 0.3 - er * 0.1); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(ex - er * 0.35, ey - er * 0.4, er * 0.3, er * 0.18, -0.4, 0, TAU); ctx.fill();
}
function drawStar(ctx, L, v, t) {
  // Seen from slightly above where it lies: tapering arms from a central disc, the upper surface
  // crowded with spines and pustules, a paler edge, and a slow ripple along the arms.
  const n = v.arms, R = L * 0.48, sq = 0.38; // perspective squash
  const body = new Path2D();
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU - Math.PI / 2 + 0.2;
    const wob = Math.sin(t * 0.4 + k * 1.3) * 0.04;
    const r = R * (0.92 + ((k * 37) % 10) / 80);
    pts.push([Math.cos(a + wob) * r, Math.sin(a + wob) * r * sq, a + wob]);
  }
  const disc = R * (n > 6 ? 0.42 : 0.24);
  const armW = (TAU / n) * 0.5;
  body.moveTo(Math.cos(pts[0][2] - armW) * disc, Math.sin(pts[0][2] - armW) * disc * sq);
  for (let k = 0; k < n; k++) {
    const [tx, ty, a] = pts[k];
    const a0 = a - armW, a1 = a + armW;
    body.quadraticCurveTo(Math.cos(a0 + armW * 0.4) * disc * 1.6, Math.sin(a0 + armW * 0.4) * disc * 1.6 * sq, tx, ty);
    body.quadraticCurveTo(Math.cos(a1 - armW * 0.4) * disc * 1.6, Math.sin(a1 - armW * 0.4) * disc * 1.6 * sq, Math.cos(a1) * disc, Math.sin(a1) * disc * sq);
  }
  ctx.save(); ctx.translate(0, -R * sq * 0.6);
  // shadow on the sand
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, R * sq * 0.35, R * 1.0, R * sq * 0.5, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-R * 0.2, -R * sq * 0.4, 0, 0, 0, R);
  g.addColorStop(0, shade(v.c[1], 0.15)); g.addColorStop(0.6, v.c[0]); g.addColorStop(1, shade(v.c[0], -0.3));
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // texture: rows of pustules along each arm
  for (let k = 0; k < n; k++) {
    const [tx, ty] = pts[k];
    for (let i = 1; i < 9; i++) {
      const u = i / 9;
      ctx.fillStyle = i % 2 ? 'rgba(255,240,230,0.22)' : 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.arc(tx * u, ty * u, Math.max(0.6, L * (0.012 - u * 0.006)), 0, TAU); ctx.fill();
    }
  }
  if (v.spiny) {
    ctx.strokeStyle = 'rgba(230,200,200,0.6)'; ctx.lineWidth = Math.max(0.5, L * 0.004);
    for (let k = 0; k < 80; k++) { const a = k * 2.39, r = Math.sqrt(k / 80) * R; const x = Math.cos(a) * r, y = Math.sin(a) * r * sq; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L * 0.004, y - L * 0.03); ctx.stroke(); }
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,240,230,0.25)'; ctx.lineWidth = Math.max(0.6, L * 0.004); ctx.stroke(body);
  // madreporite on the disc
  ctx.fillStyle = 'rgba(240,200,120,0.6)'; ctx.beginPath(); ctx.arc(disc * 0.35, -disc * sq * 0.3, Math.max(0.8, L * 0.012), 0, TAU); ctx.fill();
  ctx.restore();
}

function drawUrchin(ctx, L, v, t) {
  // A rounded test bristling with long spines that sway a little, tube feet reaching from between
  // them, and highlights on the spine tips.
  const r = L * 0.22, cy = -r * 0.85;
  const c0 = v.c[0];
  // back spines
  for (let k = 0; k < 48; k++) {
    const a = Math.PI * 0.95 + (k / 47) * Math.PI * 1.1 + Math.sin(t * 0.6 + k) * 0.03;
    const len = r * (1.5 + ((k * 13) % 7) / 10);
    ctx.strokeStyle = shade(c0, -0.35); ctx.lineWidth = Math.max(0.6, L * 0.009); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.6); ctx.lineTo(Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len) * 0.85); ctx.stroke();
  }
  // the test
  const g = ctx.createRadialGradient(-r * 0.3, cy - r * 0.4, 0, 0, cy, r * 1.1);
  g.addColorStop(0, shade(c0, 0.2)); g.addColorStop(1, shade(c0, -0.45));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, cy, r, r * 0.85, 0, 0, TAU); ctx.fill();
  // tube feet
  ctx.strokeStyle = 'rgba(200,150,210,0.6)'; ctx.lineWidth = Math.max(0.5, L * 0.004);
  for (let k = 0; k < 10; k++) { const a = Math.PI + (k / 9) * Math.PI; const x = Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.85; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x * 1.25 + Math.sin(t + k) * L * 0.01, y - L * 0.03); ctx.stroke(); }
  // front spines with lighter tips
  for (let k = 0; k < 40; k++) {
    const a = Math.PI * 1.02 + (k / 39) * Math.PI * 0.96 + Math.sin(t * 0.6 + k * 2) * 0.03;
    const len = r * (1.2 + ((k * 7) % 9) / 10);
    const x0 = Math.cos(a) * r * 0.8, y0 = cy + Math.sin(a) * r * 0.7, x1 = Math.cos(a) * (r + len), y1 = cy + Math.sin(a) * (r + len) * 0.85;
    const sg = ctx.createLinearGradient(x0, y0, x1, y1);
    sg.addColorStop(0, shade(c0, -0.1)); sg.addColorStop(1, shade(c0, 0.35));
    ctx.strokeStyle = sg; ctx.lineWidth = Math.max(0.6, L * 0.011);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawCucumber(ctx, L, v, t) {
  // A long, soft body lying on the sand, contracting slowly; warty papillae along the back,
  // leopard spots with pale centres, a ring of feeding tentacles at the front.
  const H = L * 0.16;
  const sq = 1 + Math.sin(t * 0.5) * 0.04;
  const body = new Path2D();
  body.moveTo(-L * 0.5 * sq, -H * 0.3);
  body.bezierCurveTo(-L * 0.45 * sq, -H * 1.3, L * 0.4 * sq, -H * 1.35, L * 0.5 * sq, -H * 0.35);
  body.quadraticCurveTo(L * 0.5 * sq, 0, L * 0.4, 0);
  body.lineTo(-L * 0.42, 0); body.quadraticCurveTo(-L * 0.5 * sq, 0, -L * 0.5 * sq, -H * 0.3);
  const g = ctx.createLinearGradient(0, -H * 1.2, 0, 0);
  g.addColorStop(0, shade(v.c[1], 0.1)); g.addColorStop(1, shade(v.c[0], -0.3));
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  if (v.p) for (let k = 0; k < 18; k++) {
    const x = -L * 0.44 + k * L * 0.05, y = -H * (0.5 + Math.sin(k * 2.1) * 0.25);
    ctx.fillStyle = v.pc; ctx.beginPath(); ctx.arc(x, y, H * 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.arc(x, y, H * 0.06, 0, TAU); ctx.fill();
  }
  // papillae
  ctx.fillStyle = 'rgba(255,245,225,0.25)';
  for (let k = 0; k < 26; k++) { const x = -L * 0.45 + k * L * 0.036, y = -H * (0.95 - Math.abs(Math.sin(k)) * 0.15); ctx.beginPath(); ctx.arc(x, y, H * 0.06, 0, TAU); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-L, -H * 0.3, L * 2, H * 0.3);
  ctx.restore();
  // feeding tentacles
  ctx.fillStyle = shade(v.c[1], -0.1);
  for (let k = 0; k < 6; k++) { const a = Math.PI + (k - 2.5) * 0.35; ctx.beginPath(); ctx.ellipse(-L * 0.5 + Math.cos(a) * H * 0.3, -H * 0.4 + Math.sin(a) * H * 0.3 + Math.sin(t + k) * H * 0.05, H * 0.12, H * 0.07, a, 0, TAU); ctx.fill(); }
}

function drawSeapig(ctx, L, v, t) {
  // A plump, translucent pink sea cucumber that walks the abyssal mud on tube-foot legs, with
  // long papillae waving above like antennae.
  const H = L * 0.36;
  const step = t * 1.1;
  // legs (enlarged tube feet), alternating
  for (let k = 0; k < 6; k++) {
    const x = -L * 0.32 + k * L * 0.13, lift = Math.max(0, Math.sin(step + k * 1.2)) * H * 0.08;
    ctx.fillStyle = 'rgba(220,160,175,0.85)';
    ctx.beginPath(); ctx.moveTo(x - L * 0.025, -H * 0.3); ctx.quadraticCurveTo(x - L * 0.02, -H * 0.1, x + Math.sin(step + k) * L * 0.01, -lift);
    ctx.lineTo(x + L * 0.03 + Math.sin(step + k) * L * 0.01, -lift); ctx.quadraticCurveTo(x + L * 0.025, -H * 0.1, x + L * 0.03, -H * 0.3); ctx.fill();
  }
  // body
  const g = ctx.createRadialGradient(-L * 0.1, -H * 0.85, 0, 0, -H * 0.55, L * 0.5);
  g.addColorStop(0, 'rgba(250,220,228,0.85)'); g.addColorStop(0.6, 'rgba(225,165,180,0.75)'); g.addColorStop(1, 'rgba(180,110,130,0.7)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, -H * 0.55, L * 0.45, H * 0.42, 0, 0, TAU); ctx.fill();
  // internal gut, seen through the body
  ctx.strokeStyle = 'rgba(120,70,60,0.35)'; ctx.lineWidth = Math.max(1, L * 0.015);
  ctx.beginPath(); ctx.moveTo(-L * 0.38, -H * 0.55); ctx.bezierCurveTo(-L * 0.1, -H * 0.3, L * 0.1, -H * 0.75, L * 0.38, -H * 0.5); ctx.stroke();
  // papillae on top
  ctx.strokeStyle = 'rgba(235,180,195,0.85)'; ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const x = -L * 0.2 + k * L * 0.07;
    ctx.lineWidth = Math.max(1, L * 0.03);
    ctx.beginPath(); ctx.moveTo(x, -H * 0.9); ctx.quadraticCurveTo(x - L * 0.02, -H * 1.3, x - L * 0.05 + Math.sin(t * 0.9 + k) * L * 0.04, -H * (1.6 + k * 0.08)); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  // feeding tentacles at the front, in the mud
  ctx.fillStyle = 'rgba(210,150,165,0.8)';
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(-L * 0.45, -H * (0.25 + k * 0.08), L * 0.03, L * 0.015, 0.5, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,240,245,0.4)'; ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.beginPath(); ctx.ellipse(-L * 0.08, -H * 0.72, L * 0.25, H * 0.18, -0.1, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
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
  // A tall, smooth column with a collar, crowned by a lobed, feathery cloud of hundreds of fine
  // tentacles that sway together in the current.
  const sway = Math.sin(t * 0.6 + phase) * L * 0.03;
  const colH = L * 0.62;
  const c0 = hexToRgb(v.c[0]), c1 = hexToRgb(v.c[1]);
  // column
  const g = ctx.createLinearGradient(-L * 0.08, 0, L * 0.08, 0);
  g.addColorStop(0, rgbStr(mixRgb(c0, [0, 0, 0], 0.2), 0.95)); g.addColorStop(0.45, rgbStr(mixRgb(c0, [255, 255, 255], 0.1), 0.95)); g.addColorStop(1, rgbStr(mixRgb(c0, [0, 0, 0], 0.25), 0.95));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-L * 0.1, 0); ctx.quadraticCurveTo(-L * 0.06, -colH * 0.5, -L * 0.07 + sway, -colH); ctx.lineTo(L * 0.07 + sway, -colH); ctx.quadraticCurveTo(L * 0.06, -colH * 0.5, L * 0.1, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.08 + k * L * 0.032, 0); ctx.lineTo(-L * 0.06 + k * L * 0.026 + sway, -colH); ctx.stroke(); }
  ctx.fillStyle = rgbStr(mixRgb(c0, [0, 0, 0], 0.1), 1); ctx.beginPath(); ctx.ellipse(sway, -colH, L * 0.1, L * 0.025, 0, 0, TAU); ctx.fill();
  // the lobed crown: several overlapping tufts made of radiating fine tentacles
  const lobes = [[-0.12, -0.08, 0.12], [0.1, -0.1, 0.12], [0, -0.17, 0.13], [-0.05, -0.02, 0.1], [0.07, -0.02, 0.1]];
  for (const [lx, ly, r] of lobes) {
    const cx = sway * 1.3 + lx * L, cy = -colH + ly * L;
    ctx.fillStyle = rgbStr(c1, 0.25); ctx.beginPath(); ctx.arc(cx, cy, r * L, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgbStr(mixRgb(c1, [255, 255, 255], 0.2), 0.55); ctx.lineWidth = Math.max(0.4, L * 0.004);
    for (let f = 0; f < 34; f++) {
      const a = (f / 34) * TAU + Math.sin(t * 0.7 + f) * 0.05;
      const rr = r * L * (0.75 + ((f * 7) % 5) / 12);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6 - L * 0.01, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); ctx.stroke();
    }
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
  // squat, ridged, slightly asymmetric barrel with a dark osculum
  const g = ctx.createLinearGradient(-L * 0.45, 0, L * 0.45, 0);
  g.addColorStop(0, shade(v.c[0], -0.45)); g.addColorStop(0.35, v.c[1]); g.addColorStop(0.7, v.c[0]); g.addColorStop(1, shade(v.c[0], -0.5));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-L * 0.28, 0);
  ctx.bezierCurveTo(-L * 0.45, -L * 0.2, -L * 0.5, -L * 0.45, -L * 0.42, -L * 0.62);
  for (let k = 0; k <= 8; k++) ctx.lineTo(-L * 0.42 + k * L * 0.105, -L * 0.62 - Math.sin(k * 1.9) * L * 0.025 + (k % 2) * L * 0.02);
  ctx.bezierCurveTo(L * 0.5, -L * 0.42, L * 0.44, -L * 0.18, L * 0.3, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(12,6,4,0.9)'; ctx.beginPath(); ctx.ellipse(0, -L * 0.6, L * 0.32, L * 0.045, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,12,0.35)'; ctx.lineWidth = Math.max(1, L * 0.02);
  for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.36 + k * L * 0.09, -L * 0.04); ctx.quadraticCurveTo(-L * 0.4 + k * L * 0.1, -L * 0.35, -L * 0.38 + k * L * 0.095, -L * 0.58); ctx.stroke(); }
}
function drawClam(ctx, L, v, t) {
  // A heavy, fluted shell whose zigzag lips part to show the mantle: in the giant clam a velvet
  // blue-green mantle patterned with spots and a dark inhalant siphon.
  const W = L * 0.5, H = L * (v.giant ? 0.3 : 0.2);
  const open = v.giant ? 0.18 + Math.sin(t * 0.4) * 0.03 : 0.05;
  const shellCol = v.c[0];
  // lower valve
  const lower = new Path2D();
  lower.moveTo(-W, -H * 0.55);
  for (let k = 0; k <= 10; k++) { const x = -W + (k / 10) * W * 2; lower.lineTo(x, -H * 0.55 + (k % 2 ? H * 0.12 : -H * 0.05)); }
  lower.bezierCurveTo(W * 1.05, H * 0.1, -W * 1.05, H * 0.1, -W, -H * 0.55);
  // mantle showing between the valves
  if (v.giant) {
    const mg = ctx.createLinearGradient(-W, 0, W, 0);
    mg.addColorStop(0, '#1e5a8a'); mg.addColorStop(0.5, '#3aa0a8'); mg.addColorStop(1, '#2a5aa0');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.moveTo(-W * 0.95, -H * 0.55);
    for (let k = 0; k <= 20; k++) { const x = -W * 0.95 + (k / 20) * W * 1.9; ctx.lineTo(x, -H * (0.6 + open * 3) - Math.sin(k * 1.3 + t) * H * 0.06); }
    ctx.lineTo(W * 0.95, -H * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,240,230,0.55)';
    for (let k = 0; k < 24; k++) { ctx.beginPath(); ctx.arc(-W * 0.85 + k * W * 0.075, -H * (0.68 + open * 1.8) + Math.sin(k * 2.3) * H * 0.1, Math.max(0.6, L * 0.008), 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#0c1a24'; ctx.beginPath(); ctx.ellipse(W * 0.15, -H * (0.7 + open * 2), W * 0.08, H * 0.05, 0, 0, TAU); ctx.fill();
  }
  // upper valve, fluted with radiating ribs
  const upper = new Path2D();
  upper.moveTo(-W, -H * (0.6 + open));
  upper.bezierCurveTo(-W, -H * (2.1 + open), W, -H * (2.1 + open), W, -H * (0.6 + open));
  for (let k = 10; k >= 0; k--) { const x = -W + (k / 10) * W * 2; upper.lineTo(x, -H * (0.6 + open) + (k % 2 ? -H * 0.12 : H * 0.05)); }
  const sg = ctx.createLinearGradient(0, -H * 2, 0, 0);
  sg.addColorStop(0, shade(shellCol, 0.2)); sg.addColorStop(1, shade(shellCol, -0.35));
  for (const [path, flip] of [[lower, 1], [upper, -1]]) {
    ctx.fillStyle = sg; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = Math.max(1, L * 0.012);
    for (let k = 0; k < 6; k++) { const x = -W * 0.85 + k * W * 0.34; ctx.beginPath(); ctx.moveTo(x * 0.3, flip < 0 ? -H * 1.8 : 0); ctx.lineTo(x, -H * 0.6); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,250,235,0.15)'; ctx.lineWidth = Math.max(0.6, L * 0.004);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(0, flip < 0 ? -H * 0.6 : -H * 0.55, W * (0.3 + k * 0.2), H * (0.4 + k * 0.3), 0, flip < 0 ? Math.PI : 0, flip < 0 ? TAU : Math.PI); ctx.stroke(); }
    // encrusting growth
    ctx.fillStyle = 'rgba(120,140,90,0.25)';
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(-W * 0.6 + k * W * 0.25, -H * (flip < 0 ? 1.4 : 0.2), L * 0.02, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
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
  // Spanish dancer: a plump red sea slug whose mantle edge flares into ruffled, white-edged skirts
  // that ripple as it swims; a pair of rhinophores at the front and a gill plume at the back.
  const H = L * 0.2;
  const wave = Math.sin(t * 2.4);
  const skirt = (sign, col, k) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-L * 0.45, 0);
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, x = -L * 0.45 + u * L * 0.9;
      const env = Math.sin(u * Math.PI);
      const r = H * (0.08 + env * 0.85) * k;
      const ruff = Math.sin(u * 34 + t * 3) * H * 0.14 * env;
      ctx.lineTo(x, sign * (r + ruff) + Math.sin(t * 2.4 + u * 5) * H * 0.35 * wave * env);
    }
    ctx.lineTo(L * 0.45, 0); ctx.closePath(); ctx.fill();
  };
  skirt(-1, '#f2e6e2', 1.06); skirt(1, '#f2e6e2', 1.06);
  skirt(-1, v.c[0], 1.0); skirt(1, v.c[0], 1.0);
  // body
  const g = ctx.createLinearGradient(0, -H * 0.6, 0, H * 0.6);
  g.addColorStop(0, shade(v.c[1], 0.15)); g.addColorStop(1, shade(v.c[0], -0.3));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.38, H * 0.55, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,240,0.25)';
  for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(-L * 0.3 + k * L * 0.045, -H * 0.15 + Math.sin(k * 2) * H * 0.15, L * 0.007, 0, TAU); ctx.fill(); }
  // rhinophores and gill plume
  ctx.fillStyle = shade(v.c[0], 0.1);
  for (const dx of [0, 0.03]) { ctx.beginPath(); ctx.ellipse(-L * (0.32 - dx), -H * 0.6, L * 0.012, H * 0.28, -0.3, 0, TAU); ctx.fill(); }
  ctx.strokeStyle = '#f0d0c0'; ctx.lineWidth = Math.max(0.6, L * 0.006);
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.3; ctx.beginPath(); ctx.moveTo(L * 0.3, -H * 0.4); ctx.lineTo(L * 0.3 + Math.cos(a) * H * 0.5, -H * 0.4 + Math.sin(a) * H * 0.5 + Math.sin(t * 2 + k) * H * 0.05); ctx.stroke(); }
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
  // Two spiralled crowns of feathery radioles rising from a lump of living coral; each tier of
  // the spiral is a ring of fine filaments, and the whole crown sways slightly.
  const s = L;
  // coral head the worm's tube is buried in
  const cg = ctx.createRadialGradient(-s * 0.05, -s * 0.12, 0, 0, -s * 0.05, s * 0.3);
  cg.addColorStop(0, '#b8a878'); cg.addColorStop(1, '#6a6040');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.32, s * 0.16, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(60,50,30,0.35)';
  for (let k = 0; k < 18; k++) { const a = Math.PI + (k / 17) * Math.PI; ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.25, Math.sin(a) * s * 0.11, s * 0.012, 0, TAU); ctx.fill(); }
  const crown = (cx, col) => {
    const sway = Math.sin(t * 0.8 + phase + cx) * s * 0.012;
    // operculum spike
    ctx.strokeStyle = '#a89070'; ctx.lineWidth = Math.max(0.6, s * 0.008);
    ctx.beginPath(); ctx.moveTo(cx, -s * 0.1); ctx.lineTo(cx + s * 0.04, -s * 0.2); ctx.stroke();
    const tiers = 9;
    const cc = hexToRgb(col);
    const dark = rgbStr(mixRgb(cc, [0, 0, 0], 0.25), 0.9), light = rgbStr(mixRgb(cc, [255, 255, 255], 0.15), 0.95), tip = rgbStr(mixRgb(cc, [255, 255, 255], 0.5), 0.85);
    for (let tier = 0; tier < tiers; tier++) {
      const u = tier / (tiers - 1);
      const y = -s * (0.12 + tier * 0.055);
      const rw = s * (0.13 - u * 0.105), rh = rw * 0.42;
      const x = cx + sway * u * 2;
      // back half of the whorl, darker
      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(0.5, s * 0.006);
      for (let f = 0; f < 26; f++) {
        const a = Math.PI + (f / 26) * Math.PI + tier * 0.7;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rw * 0.2, y); ctx.quadraticCurveTo(x + Math.cos(a) * rw * 0.7, y + Math.sin(a) * rh * 0.6 - s * 0.012, x + Math.cos(a) * rw, y + Math.sin(a) * rh - s * 0.03); ctx.stroke();
      }
      // front half, lighter, with a pale tip on each radiole
      ctx.strokeStyle = light;
      for (let f = 0; f < 26; f++) {
        const a = (f / 26) * Math.PI + tier * 0.7;
        const ex = x + Math.cos(a) * rw, ey = y + Math.sin(a) * rh - s * 0.03;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rw * 0.2, y); ctx.quadraticCurveTo(x + Math.cos(a) * rw * 0.7, y + Math.sin(a) * rh * 0.6 - s * 0.012, ex, ey); ctx.stroke();
        ctx.fillStyle = tip; ctx.fillRect(ex - 0.5, ey - 0.5, Math.max(1, s * 0.006), Math.max(1, s * 0.006));
      }
    }
  };
  crown(-s * 0.09, v.c[0]);
  crown(s * 0.09, v.c[1]);
}

function drawBobbit(ctx, L, v, t, phase) {
  // Only the front of a three-metre worm shows above the sand: an iridescent, segmented neck,
  // five banded antennae, and a pair of scissor jaws that open... and wait.
  const s = L * 0.3;
  const open = 0.35 + Math.max(0, Math.sin(t * 0.35 + phase)) * 0.55;
  // burrow mound
  ctx.fillStyle = 'rgba(150,130,90,0.6)'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.12, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(20,14,10,0.8)'; ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.14, s * 0.05, 0, 0, TAU); ctx.fill();
  // segmented, iridescent neck
  const segs = 7;
  for (let k = 0; k < segs; k++) {
    const u = k / (segs - 1);
    const x = Math.sin(t * 0.4 + phase) * s * 0.04 * u, y = -s * 0.05 - u * s * 0.45;
    const hue = 30 + Math.sin(t + k) * 20 + k * 8;
    const g = ctx.createLinearGradient(x - s * 0.1, y, x + s * 0.1, y);
    g.addColorStop(0, `hsl(${hue},45%,22%)`); g.addColorStop(0.5, `hsl(${hue + 140},50%,45%)`); g.addColorStop(1, `hsl(${hue},45%,20%)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s * (0.11 - u * 0.02), s * 0.045, 0, 0, TAU); ctx.fill();
  }
  const hx = Math.sin(t * 0.4 + phase) * s * 0.04, hy = -s * 0.52;
  // antennae
  ctx.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.32;
    const len = s * (0.28 + (k % 2) * 0.06);
    for (let b = 0; b < 6; b++) {
      ctx.strokeStyle = b % 2 ? '#e8e0d0' : '#5a3a2a'; ctx.lineWidth = Math.max(0.6, s * 0.018);
      const u0 = b / 6, u1 = (b + 1) / 6, sw = Math.sin(t * 1.5 + k) * 0.08;
      ctx.beginPath(); ctx.moveTo(hx + Math.cos(a + sw * u0) * len * u0, hy - s * 0.04 + Math.sin(a + sw * u0) * len * u0);
      ctx.lineTo(hx + Math.cos(a + sw * u1) * len * u1, hy - s * 0.04 + Math.sin(a + sw * u1) * len * u1); ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  // jaws
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(hx + side * s * 0.03, hy); ctx.rotate(side * open);
    ctx.fillStyle = '#c8a050';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(side * s * 0.12, -s * 0.12, side * s * 0.02, -s * 0.28); ctx.lineTo(side * -s * 0.02, -s * 0.2); ctx.quadraticCurveTo(side * s * 0.04, -s * 0.1, -side * s * 0.02, 0); ctx.fill();
    ctx.fillStyle = '#f0e0a8';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(side * s * 0.005, -s * (0.06 + k * 0.05)); ctx.lineTo(-side * s * 0.025, -s * (0.075 + k * 0.05)); ctx.lineTo(side * s * 0.005, -s * (0.09 + k * 0.05)); ctx.fill(); }
    ctx.restore();
  }
}

function drawSeasquirt(ctx, L, v, t) {
  // A thick, translucent tunic in purple and gold, a mouth siphon at the top and an outflow
  // siphon at the side, with the latticed gill basket faintly visible inside.
  const s = L;
  const pulse = 1 + Math.sin(t * 0.8) * 0.02;
  const body = new Path2D();
  body.moveTo(-s * 0.16, 0);
  body.bezierCurveTo(-s * 0.26, -s * 0.25, -s * 0.24 * pulse, -s * 0.55, -s * 0.09, -s * 0.66);
  body.lineTo(s * 0.09, -s * 0.66);
  body.bezierCurveTo(s * 0.24 * pulse, -s * 0.55, s * 0.26, -s * 0.25, s * 0.16, 0);
  body.closePath();
  const g = ctx.createLinearGradient(-s * 0.25, 0, s * 0.25, 0);
  g.addColorStop(0, shade(v.c[0], -0.35)); g.addColorStop(0.4, shade(v.c[0], 0.2)); g.addColorStop(1, shade(v.c[0], -0.4));
  ctx.fillStyle = g; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // gold blotches on the tunic
  ctx.fillStyle = rgba(v.c[1], 0.55);
  for (let k = 0; k < 16; k++) { ctx.beginPath(); ctx.ellipse(((k * 37) % 40 - 20) / 100 * s, -((k * 53) % 60) / 100 * s - s * 0.04, s * (0.02 + (k % 3) * 0.012), s * (0.015 + (k % 2) * 0.01), k, 0, TAU); ctx.fill(); }
  // the gill basket, faintly visible
  ctx.strokeStyle = 'rgba(255,230,240,0.12)'; ctx.lineWidth = 1;
  for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * (0.1 + k * 0.055)); ctx.lineTo(s * 0.15, -s * (0.1 + k * 0.055)); ctx.stroke(); }
  for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.12 + k * s * 0.04, -s * 0.08); ctx.lineTo(-s * 0.12 + k * s * 0.04, -s * 0.58); ctx.stroke(); }
  ctx.restore();
  // siphons, with gold rims
  const siphon = (x, y, a, r) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = shade(v.c[0], -0.1); ctx.fillRect(-r, -r * 1.2, r * 2, r * 1.2);
    ctx.fillStyle = v.c[1]; ctx.beginPath(); ctx.ellipse(0, -r * 1.2, r * 1.1, r * 0.45, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0a1a'; ctx.beginPath(); ctx.ellipse(0, -r * 1.2, r * 0.6, r * 0.25, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
  siphon(0, -s * 0.64, 0, s * 0.07);
  siphon(s * 0.19, -s * 0.38, 0.9, s * 0.055);
  ctx.strokeStyle = 'rgba(255,230,250,0.25)'; ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath(); ctx.moveTo(-s * 0.15, -s * 0.12); ctx.quadraticCurveTo(-s * 0.22, -s * 0.35, -s * 0.12, -s * 0.58); ctx.stroke();
}

function drawTurtle(ctx, L, v, t) {
  // Green sea turtle in profile: domed carapace of costal and marginal scutes with radiating
  // streaks, a pale plastron, a scaled head with a horny beak, and long wing-like fore-flippers
  // that sweep in slow, flying strokes.
  const stroke = Math.sin(t * 1.3), stroke2 = Math.sin(t * 1.3 - 0.6);
  const shell = '#5c5a34', shellDark = '#33301c', skin = '#6e6a4c', skinDark = '#3c3a28', belly = '#d8c890';
  const flipper = (x, y, len, w, ang, col, far) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, far ? shade(col, -0.35) : shade(col, 0.08)); g.addColorStop(1, far ? shade(col, -0.5) : shade(col, -0.25));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -w * 0.5);
    ctx.bezierCurveTo(len * 0.35, -w * 1.1, len * 0.8, -w * 0.6, len, 0);
    ctx.bezierCurveTo(len * 0.75, w * 0.35, len * 0.3, w * 0.7, 0, w * 0.5); ctx.closePath(); ctx.fill();
    if (!far) {
      // polygonal scales along the flipper, a claw on the leading edge
      ctx.strokeStyle = 'rgba(20,18,10,0.35)'; ctx.lineWidth = Math.max(0.6, L * 0.004);
      for (let i = 1; i < 7; i++) { const x0 = len * i / 7; ctx.beginPath(); ctx.moveTo(x0, -w * 0.55 * (1 - i / 8)); ctx.lineTo(x0 - len * 0.04, w * 0.5 * (1 - i / 8)); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -w * 0.1, len * 0.95, 0); ctx.stroke();
      ctx.fillStyle = '#d8d0b0'; ctx.beginPath(); ctx.moveTo(len * 0.3, -w * 0.85); ctx.lineTo(len * 0.34, -w * 1.05); ctx.lineTo(len * 0.37, -w * 0.82); ctx.fill();
    }
    ctx.restore();
  };
  // far flippers (behind the shell)
  flipper(-L * 0.18, L * 0.02, L * 0.48, L * 0.09, 0.55 + stroke * 0.55, skin, true);
  flipper(L * 0.22, L * 0.05, L * 0.18, L * 0.06, 0.35 + stroke2 * 0.2, skin, true);
  // neck and head
  const hx = -L * 0.43, hy = -L * 0.01 + Math.sin(t * 1.3 + 1) * L * 0.006;
  ctx.fillStyle = skinDark;
  ctx.beginPath(); ctx.moveTo(-L * 0.28, -L * 0.07); ctx.quadraticCurveTo(-L * 0.36, -L * 0.07, hx + L * 0.04, hy - L * 0.05);
  ctx.lineTo(hx + L * 0.05, hy + L * 0.05); ctx.quadraticCurveTo(-L * 0.34, L * 0.07, -L * 0.27, L * 0.06); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(0.6, L * 0.003);
  for (let i = 0; i < 4; i++) { const x = -L * 0.3 - i * L * 0.025; ctx.beginPath(); ctx.moveTo(x, -L * 0.05); ctx.quadraticCurveTo(x - L * 0.01, 0, x, L * 0.05); ctx.stroke(); }
  const hg = ctx.createRadialGradient(hx - L * 0.01, hy - L * 0.03, 0, hx, hy, L * 0.08);
  hg.addColorStop(0, shade(skin, 0.15)); hg.addColorStop(1, skinDark);
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(hx + L * 0.06, hy - L * 0.05);
  ctx.bezierCurveTo(hx - L * 0.01, hy - L * 0.075, hx - L * 0.075, hy - L * 0.04, hx - L * 0.085, hy + L * 0.005);
  ctx.quadraticCurveTo(hx - L * 0.08, hy + L * 0.035, hx - L * 0.05, hy + L * 0.045);
  ctx.lineTo(hx + L * 0.06, hy + L * 0.05); ctx.closePath(); ctx.fill();
  // head scales: a mosaic of tiles separated by dark seams, lighter tiles on top of the head
  const tiles = [[-0.065, -0.04], [-0.035, -0.055], [-0.002, -0.052], [0.03, -0.045], [-0.05, -0.018], [-0.015, -0.028], [0.018, -0.022], [0.045, -0.02], [-0.002, 0.0], [0.03, 0.005]];
  for (let i = 0; i < tiles.length; i++) {
    const [px, py] = tiles[i], cx = hx + px * L, cy = hy + py * L, r = L * 0.016;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + i; const rr = r * (0.85 + ((i * 7 + k * 3) % 5) / 20); ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8); }
    ctx.closePath();
    ctx.fillStyle = py < -0.03 ? 'rgba(150,140,100,0.35)' : 'rgba(110,104,76,0.3)'; ctx.fill();
    ctx.strokeStyle = 'rgba(25,22,12,0.55)'; ctx.lineWidth = Math.max(0.6, L * 0.003); ctx.stroke();
  }
  // beak and jaw
  ctx.fillStyle = '#2a2618';
  ctx.beginPath(); ctx.moveTo(hx - L * 0.085, hy + L * 0.008); ctx.quadraticCurveTo(hx - L * 0.07, hy + L * 0.03, hx - L * 0.03, hy + L * 0.03); ctx.lineTo(hx - L * 0.03, hy + L * 0.022); ctx.quadraticCurveTo(hx - L * 0.06, hy + L * 0.02, hx - L * 0.085, hy + L * 0.008); ctx.fill();
  ctx.fillStyle = shade(belly, -0.15); ctx.beginPath(); ctx.ellipse(hx - L * 0.03, hy + L * 0.04, L * 0.04, L * 0.012, 0.1, 0, TAU); ctx.fill();
  // eye with a heavy lid
  eye(ctx, hx - L * 0.04, hy - L * 0.012, Math.max(1, L * 0.011), '#2a1c10', true);
  ctx.strokeStyle = skinDark; ctx.lineWidth = Math.max(1, L * 0.006);
  ctx.beginPath(); ctx.arc(hx - L * 0.04, hy - L * 0.012, L * 0.013, Math.PI * 1.1, Math.PI * 1.95); ctx.stroke();
  // plastron
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.moveTo(-L * 0.3, L * 0.03); ctx.quadraticCurveTo(0, L * 0.11, L * 0.3, L * 0.03); ctx.lineTo(L * 0.28, L * 0.0); ctx.quadraticCurveTo(0, L * 0.07, -L * 0.29, L * 0.0); ctx.fill();
  ctx.strokeStyle = 'rgba(120,100,50,0.4)'; ctx.lineWidth = Math.max(0.6, L * 0.003);
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * L * 0.08, L * 0.04 + Math.abs(i) * -L * 0.006); ctx.lineTo(i * L * 0.08, L * 0.085 - Math.abs(i) * L * 0.01); ctx.stroke(); }
  // carapace dome
  const car = new Path2D();
  car.moveTo(-L * 0.32, L * 0.03);
  car.bezierCurveTo(-L * 0.3, -L * 0.13, -L * 0.1, -L * 0.2, L * 0.05, -L * 0.19);
  car.bezierCurveTo(L * 0.22, -L * 0.17, L * 0.33, -L * 0.07, L * 0.33, L * 0.03);
  car.quadraticCurveTo(0, L * 0.05, -L * 0.32, L * 0.03);
  const cg = ctx.createLinearGradient(0, -L * 0.2, 0, L * 0.04);
  cg.addColorStop(0, shade(shell, 0.12)); cg.addColorStop(0.6, shell); cg.addColorStop(1, shellDark);
  ctx.fillStyle = cg; ctx.fill(car);
  ctx.save(); ctx.clip(car);
  // costal scutes: four big plates, each with olive/amber rays radiating from its upper edge
  const cost = [[-0.24, -0.02, -0.15, -0.16], [-0.12, -0.18, 0.0, -0.19], [0.02, -0.19, 0.14, -0.17], [0.15, -0.16, 0.28, -0.08]];
  for (const [ax, ay, bx2, by2] of cost) {
    const x0 = ax * L, x1 = bx2 * L;
    ctx.fillStyle = 'rgba(40,34,14,0.25)';
    ctx.beginPath(); ctx.moveTo(x0, ay * L + L * 0.02); ctx.lineTo(x1, by2 * L + L * 0.02); ctx.lineTo(x1, -L * 0.02); ctx.lineTo(x0, -L * 0.02); ctx.closePath(); ctx.fill();
    for (let k = 0; k < 9; k++) {
      const u = k / 8, sx = lerpN(x0, x1, u), sy = lerpN(ay, by2, u) * L + L * 0.03;
      ctx.strokeStyle = k % 2 ? 'rgba(196,160,70,0.45)' : 'rgba(30,26,12,0.35)';
      ctx.lineWidth = Math.max(0.8, L * 0.006);
      ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, -L * 0.035); ctx.lineTo(sx, sy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(20,18,8,0.6)'; ctx.lineWidth = Math.max(1, L * 0.005);
    ctx.beginPath(); ctx.moveTo(x1, by2 * L); ctx.lineTo(x1 - L * 0.01, -L * 0.015); ctx.stroke();
  }
  // vertebral ridge highlight
  ctx.strokeStyle = 'rgba(230,220,170,0.18)'; ctx.lineWidth = Math.max(1, L * 0.012);
  ctx.beginPath(); ctx.moveTo(-L * 0.22, -L * 0.14); ctx.bezierCurveTo(-L * 0.08, -L * 0.2, L * 0.12, -L * 0.2, L * 0.26, -L * 0.1); ctx.stroke();
  ctx.restore();
  // marginal scutes: the scalloped rim of small plates
  for (let i = 0; i < 12; i++) {
    const u = i / 11, x = lerpN(-L * 0.31, L * 0.32, u), y = L * 0.02 - Math.sin(u * Math.PI) * L * 0.012;
    ctx.fillStyle = i % 2 ? shade(shell, -0.1) : shade(shell, -0.22);
    ctx.beginPath(); ctx.ellipse(x, y, L * 0.03, L * 0.016, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(15,12,6,0.5)'; ctx.lineWidth = Math.max(0.5, L * 0.0025); ctx.stroke();
  }
  // near flippers in front of the shell
  flipper(L * 0.2, L * 0.05, L * 0.17, L * 0.055, 0.25 + stroke2 * 0.25, skin, false);
  flipper(-L * 0.2, L * 0.03, L * 0.5, L * 0.1, 0.35 + stroke * 0.6, skin, false);
}

// (3.7.5) the black swallower: a slim dark fish whose belly has stretched into a pale, see-through sac with its last
// meal curled inside, a fish longer than itself
function drawSwallower(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], fin = shade(c1, 0.2);
  const B = bendBody(L, t, swim * 0.6, (u) => H * 0.5 * (u < 0.12 ? 0.8 + u * 1.6 : 1 - (u - 0.12) * 0.75), 26, 0.04, 1.3);
  const [tx, ty] = B.at(1);
  rayFin(ctx, [[tx - L * 0.01, ty - H * 0.12], [tx - L * 0.01, ty + H * 0.12]], [[tx + L * 0.09, ty - H * 0.6], [tx + L * 0.05, ty], [tx + L * 0.09, ty + H * 0.6]], fin, 0.6);
  { const [x, y, h] = B.at(0.6); rayFin(ctx, [[x - L * 0.1, y - h], [x + L * 0.12, y - h * 0.8]], [[x - L * 0.08, y - h - H * 0.35], [x + L * 0.02, y - h - H * 0.3], [x + L * 0.1, y - h - H * 0.2]], fin, 0.5); }
  // the stomach first, a translucent sac hanging below the front half, the swallowed fish inside
  const [sx, sy, shh] = B.at(0.33), sr = H * 0.95;
  ctx.save(); ctx.beginPath(); ctx.ellipse(sx, sy + shh * 0.3 + sr * 0.45, L * 0.19, sr * 0.75, 0, 0, TAU);
  const sg = ctx.createRadialGradient(sx - L * 0.05, sy + shh + sr * 0.3, 2, sx, sy + shh + sr * 0.6, L * 0.22); sg.addColorStop(0, 'rgba(170,140,132,0.55)'); sg.addColorStop(0.7, 'rgba(80,56,54,0.8)'); sg.addColorStop(1, 'rgba(40,28,28,0.9)');
  ctx.fillStyle = sg; ctx.fill(); ctx.clip();
  ctx.save(); ctx.translate(sx, sy + shh * 0.3 + sr * 0.5); ctx.rotate(0.15); ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.ellipse(0, 0, L * 0.17, sr * 0.25, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a564c'; ctx.beginPath(); ctx.moveTo(L * 0.15, 0); ctx.lineTo(L * 0.2, -sr * 0.2); ctx.lineTo(L * 0.2, sr * 0.2); ctx.fill(); // its tail, folded
  ctx.globalAlpha = 1; ctx.restore();
  ctx.strokeStyle = 'rgba(230,210,200,0.3)'; ctx.lineWidth = Math.max(0.4, L * 0.003);
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(sx, sy + shh * 0.3 + sr * 0.45, L * (0.06 + k * 0.032), sr * (0.2 + k * 0.12), 0, 0.2, 2.9); ctx.stroke(); } // the stretched skin's lines
  ctx.restore();
  const bg = ctx.createLinearGradient(0, -H, 0, H); bg.addColorStop(0, shade(c0, -0.2)); bg.addColorStop(0.5, c1); bg.addColorStop(1, shade(c0, -0.1)); ctx.fillStyle = bg; ctx.fill(B.path);
  // the head: big jaws lined with hooked teeth, the eye well forward
  const [hx, hy, hh] = B.at(0.05);
  ctx.fillStyle = '#060404'; ctx.beginPath(); ctx.moveTo(-L * 0.5, hy - hh * 0.05); ctx.lineTo(-L * 0.36, hy + hh * 0.3); ctx.lineTo(-L * 0.5, hy + hh * 0.7); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 6; k++) { glassFang(ctx, -L * 0.49 + k * L * 0.022, hy + hh * 0.02, hh * 0.35, 1, Math.max(0.4, L * 0.003), 0.25); glassFang(ctx, -L * 0.49 + k * L * 0.022, hy + hh * 0.68, hh * 0.32, -1, Math.max(0.4, L * 0.003), 0.25); }
  eye(ctx, -L * 0.44, hy - hh * 0.45, Math.max(1, hh * 0.3), '#7a8a8a');
}
// (3.7.5) a dragonfish: long, black, velvet-skinned, a long barbel from the chin with a glowing bulb, fangs in a
// jaw that opens wide, rows of small lights along the belly, the dorsal and anal fins far back by the tail
function drawDragon(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], glow = v.glow || '#ff6a5a', fin = shade(c1, 0.22);
  const B = bendBody(L, t, swim * 0.7, (u) => H * 0.5 * (u < 0.06 ? 0.85 + u * 2.5 : u < 0.85 ? 1 - (u - 0.06) * 0.35 : 0.72 - (u - 0.85) * 3.2), 36, 0.05, 1.8);
  const [tx, ty] = B.at(1);
  rayFin(ctx, [[tx - L * 0.01, ty - H * 0.15], [tx - L * 0.01, ty + H * 0.15]], [[tx + L * 0.06, ty - H * 1.1], [tx + L * 0.035, ty], [tx + L * 0.06, ty + H * 1.1]], fin, 0.55);
  { const [x, y, h] = B.at(0.86); rayFin(ctx, [[x - L * 0.05, y - h], [x + L * 0.05, y - h * 0.8]], [[x - L * 0.03, y - h - H * 1.1], [x + L * 0.04, y - h - H * 0.9]], fin, 0.5);
    rayFin(ctx, [[x - L * 0.06, y + h], [x + L * 0.05, y + h * 0.8]], [[x - L * 0.04, y + h + H * 1.1], [x + L * 0.04, y + h + H * 0.9]], fin, 0.5); }
  const bg = ctx.createLinearGradient(0, -H, 0, H); bg.addColorStop(0, shade(c0, -0.3)); bg.addColorStop(0.5, shade(c1, 0.08)); bg.addColorStop(1, shade(c0, -0.2));
  ctx.fillStyle = bg; ctx.fill(B.path);
  ctx.save(); ctx.clip(B.path); ctx.fillStyle = 'rgba(160,180,200,0.06)'; for (let i = 0; i < 40; i++) { const [x, y, h] = B.at(i / 40); ctx.fillRect(x, y - h, L * 0.004, h * 0.6); } ctx.restore();
  const P = photophores(ctx, B, 0.06, 0.82, 22, 0.75, Math.max(0.5, L * 0.003), rgba(shade(glow, 0.2), 0.75));
  // the head, the jaw open, fangs
  const [hx, hy, hh] = B.at(0.03);
  ctx.fillStyle = '#050304'; ctx.beginPath(); ctx.moveTo(-L * 0.5, hy - hh * 0.15); ctx.lineTo(-L * 0.42, hy + hh * 0.15); ctx.lineTo(-L * 0.505, hy + hh * 0.8); ctx.closePath(); ctx.fill();
  for (let k = 0; k < 4; k++) { glassFang(ctx, -L * 0.498 + k * L * 0.018, hy - hh * 0.1, hh * (0.5 + (k % 2) * 0.4), 1, Math.max(0.4, L * 0.0025), 0.2); glassFang(ctx, -L * 0.5 + k * L * 0.018, hy + hh * 0.78, hh * (0.6 + (k % 2) * 0.5), -1, Math.max(0.4, L * 0.0025), 0.2); }
  eye(ctx, -L * 0.475, hy - hh * 0.5, Math.max(0.9, hh * 0.32), '#6a7a80');
  // the light under the eye
  ctx.fillStyle = rgba(glow, 0.9); ctx.beginPath(); ctx.ellipse(-L * 0.468, hy + hh * 0.05, Math.max(0.8, hh * 0.18), Math.max(0.6, hh * 0.1), 0, 0, TAU); ctx.fill();
  // the chin barbel, long and drifting, with its glowing bulb and a few filaments
  const bx = -L * 0.49, by = hy + hh * 0.85, sway = Math.sin(t * 1.1) * L * 0.03, ex = -L * 0.44 + sway, ey = by + H * 4.5;
  ctx.strokeStyle = rgba(shade(c1, 0.35), 0.75); ctx.lineWidth = Math.max(0.4, L * 0.0025);
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(bx - L * 0.02, by + H * 1.5, ex + L * 0.03, ey - H * 1.5, ex, ey); ctx.stroke();
  const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, Math.max(3, L * 0.016)); hg.addColorStop(0, rgba(glow, 0.95)); hg.addColorStop(1, rgba(glow, 0)); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(ex, ey, Math.max(3, L * 0.016), 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(shade(glow, 0.5), 0.95); ctx.beginPath(); ctx.ellipse(ex, ey, Math.max(0.9, L * 0.005), Math.max(1.2, L * 0.008), 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(glow, 0.5); ctx.lineWidth = Math.max(0.3, L * 0.0015); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + (k - 1) * L * 0.006 + sway * 0.2, ey + H * (0.8 + k * 0.3)); ctx.stroke(); }
  return [[ex, ey, 1.3], [-L * 0.468, hy + hh * 0.05, 0.8], ...P];
}
function drawCoral(ctx, L, v) { drawLophelia(ctx, L, v); }

// ---------- marine mammals (nose at -x; the tail beats up and down, not side to side) ----------
function cetaceanBody(L, t, swim, top, bot, beat = 0.16) {
  // top/bot: arrays of [u, halfHeight/L] along the body (u: 0 nose .. 0.86 tail stock)
  const phase = t * 2.6 * swim;
  const bend = (u) => (u < 0.5 ? 0 : Math.sin(phase - u * 2.2) * Math.pow((u - 0.5) / 0.36, 1.6) * beat * L);
  const pts = (arr, sign) => arr.map(([u, h]) => [-L / 2 + u * L, sign * h * L + bend(u)]);
  return { top: pts(top, -1), bot: pts(bot, 1), bend, phase };
}
function smoothPath(ctx, pts, first) {
  if (first) ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
}
function flukes(ctx, L, x, y, ang, span, col) {
  // horizontal flukes seen edge-on: a thin, swept blade that tilts with each beat
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-L * 0.01, -L * 0.012);
  ctx.quadraticCurveTo(span * 0.5, -L * 0.03, span, -L * 0.012);
  ctx.quadraticCurveTo(span * 0.9, L * 0.008, span * 0.75, L * 0.018);
  ctx.quadraticCurveTo(span * 0.4, L * 0.02, -L * 0.01, L * 0.012); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawSperm(ctx, L, v, t, swim) {
  // huge squarish head (a third of the body), narrow underslung jaw, wrinkled skin, knuckled back
  const top = [[0, 0.02], [0.01, 0.075], [0.06, 0.088], [0.2, 0.09], [0.33, 0.085], [0.42, 0.08], [0.52, 0.083], [0.6, 0.07], [0.7, 0.05], [0.8, 0.032], [0.86, 0.02]];
  const bot = [[0, 0.02], [0.02, 0.06], [0.08, 0.07], [0.18, 0.075], [0.3, 0.085], [0.42, 0.088], [0.55, 0.075], [0.66, 0.05], [0.76, 0.03], [0.86, 0.018]];
  const b = cetaceanBody(L, t, swim * 0.6, top, bot, 0.1);
  const body = new Path2D();
  body.moveTo(b.top[0][0], b.top[0][1]);
  const tp = new Path2D(); // build manually for smoothness
  ctx.beginPath(); smoothPath(ctx, b.top, true);
  for (let i = b.bot.length - 1; i >= 0; i--) ctx.lineTo(b.bot[i][0], b.bot[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -0.09 * L, 0, 0.09 * L);
  g.addColorStop(0, shade(v.c[0], -0.25)); g.addColorStop(0.5, v.c[0]); g.addColorStop(1, v.c[1]);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  // wrinkled skin behind the head, pale scars on the head
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = Math.max(1, L * 0.002);
  for (let k = 0; k < 70; k++) {
    const u = 0.36 + ((k * 37) % 50) / 100, hh = (((k * 53) % 140) / 100 - 0.7) * 0.075;
    const x = -L / 2 + u * L, y = hh * L + b.bend(u);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + L * 0.01, y - L * 0.003, x + L * 0.02, y + L * 0.001); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(220,215,205,0.22)';
  for (let k = 0; k < 9; k++) { const x = -L / 2 + L * (0.04 + k * 0.03); ctx.beginPath(); ctx.moveTo(x, -L * 0.06 + (k % 3) * L * 0.02); ctx.lineTo(x + L * 0.05, -L * 0.04 + (k % 2) * L * 0.03); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(-L / 2, -L * 0.1, L * 0.35, L * 0.03);
  ctx.restore();
  // dorsal hump and knuckles
  ctx.fillStyle = shade(v.c[0], -0.12);
  const hu = 0.6, hx = -L / 2 + hu * L, hy = -0.07 * L + b.bend(hu);
  ctx.beginPath(); ctx.moveTo(hx - L * 0.04, hy + L * 0.004); ctx.quadraticCurveTo(hx, hy - L * 0.025, hx + L * 0.04, hy + L * 0.01); ctx.fill();
  for (let k = 0; k < 4; k++) { const u = 0.67 + k * 0.045, x = -L / 2 + u * L, y = -(0.05 - k * 0.007) * L + b.bend(u); ctx.beginPath(); ctx.arc(x, y, L * 0.006, Math.PI, 0); ctx.fill(); }
  // narrow lower jaw, set back under the head; pale lip
  ctx.fillStyle = '#d8d2c6';
  ctx.beginPath(); ctx.moveTo(-L * 0.47, L * 0.062); ctx.quadraticCurveTo(-L * 0.35, L * 0.08, -L * 0.25, L * 0.074); ctx.lineTo(-L * 0.25, L * 0.066); ctx.quadraticCurveTo(-L * 0.36, L * 0.07, -L * 0.47, L * 0.056); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(1, L * 0.0025);
  ctx.beginPath(); ctx.moveTo(-L * 0.47, L * 0.056); ctx.quadraticCurveTo(-L * 0.36, L * 0.066, -L * 0.24, L * 0.064); ctx.stroke();
  // small eye near the corner of the mouth, flipper
  eye(ctx, -L * 0.22, L * 0.035, Math.max(1, L * 0.006), '#2a2420', false);
  ctx.fillStyle = shade(v.c[0], -0.1);
  ctx.beginPath(); ctx.ellipse(-L * 0.16, L * 0.085, L * 0.035, L * 0.012, 0.5, 0, TAU); ctx.fill();
  // flukes
  const u = 0.86, fx = -L / 2 + u * L, fy = b.bend(u);
  flukes(ctx, L, fx, fy, Math.cos(b.phase * 0.6 - 1.9) * 0.35, L * 0.15, shade(v.c[0], -0.15));
}
function drawDolphin(ctx, L, v, t, swim) {
  const top = [[0.0, 0.004], [0.05, 0.012], [0.09, 0.03], [0.13, 0.07], [0.2, 0.09], [0.35, 0.1], [0.5, 0.09], [0.62, 0.07], [0.72, 0.045], [0.82, 0.022], [0.86, 0.016]];
  const bot = [[0.0, 0.006], [0.07, 0.016], [0.12, 0.04], [0.2, 0.075], [0.35, 0.095], [0.5, 0.085], [0.6, 0.06], [0.72, 0.035], [0.86, 0.015]];
  const b = cetaceanBody(L, t, swim, top, bot, 0.18);
  ctx.beginPath(); smoothPath(ctx, b.top, true);
  for (let i = b.bot.length - 1; i >= 0; i--) ctx.lineTo(b.bot[i][0], b.bot[i][1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -0.1 * L, 0, 0.1 * L);
  g.addColorStop(0, shade(v.c[0], -0.2)); g.addColorStop(0.45, v.c[0]); g.addColorStop(0.62, mixHex(v.c[0], v.c[1], 0.6)); g.addColorStop(1, v.c[1]);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  if (v.common) {
    // the hourglass: a tan patch forward, grey behind, crossing below the dorsal fin
    ctx.fillStyle = rgba(v.pc, 0.75);
    ctx.beginPath(); ctx.ellipse(-L * 0.12, L * 0.02, L * 0.17, L * 0.035, -0.12, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(150,150,150,0.45)';
    ctx.beginPath(); ctx.ellipse(L * 0.17, L * 0.02 + b.bend(0.67), L * 0.14, L * 0.03, 0.15, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(-L / 2, -L * 0.1, L, L * 0.04);
  ctx.restore();
  // melon crease, mouth line
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(1, L * 0.004);
  ctx.beginPath(); ctx.moveTo(-L * 0.45, L * 0.005); ctx.quadraticCurveTo(-L * 0.4, -L * 0.02, -L * 0.37, -L * 0.04); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-L * 0.5, L * 0.003); ctx.quadraticCurveTo(-L * 0.42, L * 0.018, -L * 0.36, L * 0.012); ctx.stroke();
  eye(ctx, -L * 0.34, -L * 0.005, Math.max(1, L * 0.009), '#1a1a1a', true);
  // falcate dorsal fin, pectoral fin
  ctx.fillStyle = shade(v.c[0], -0.15);
  const du = 0.45, dx = -L / 2 + du * L, dy = -0.095 * L + b.bend(du);
  ctx.beginPath(); ctx.moveTo(dx - L * 0.06, dy + L * 0.01); ctx.quadraticCurveTo(dx + L * 0.0, dy - L * 0.04, dx + L * 0.07, dy - L * 0.075); ctx.quadraticCurveTo(dx + L * 0.03, dy - L * 0.02, dx + L * 0.06, dy + L * 0.012); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-L * 0.24, L * 0.06); ctx.quadraticCurveTo(-L * 0.17, L * 0.11, -L * 0.12, L * 0.13); ctx.quadraticCurveTo(-L * 0.15, L * 0.08, -L * 0.18, L * 0.06); ctx.fill();
  const u = 0.86;
  flukes(ctx, L, -L / 2 + u * L, b.bend(u), Math.cos(b.phase - 1.9) * 0.45, L * 0.13, shade(v.c[0], -0.15));
}
function drawOrca(ctx, L, v, t, swim) {
  const top = [[0.0, 0.03], [0.04, 0.07], [0.12, 0.1], [0.28, 0.115], [0.45, 0.11], [0.6, 0.085], [0.72, 0.055], [0.82, 0.03], [0.86, 0.022]];
  const bot = [[0.0, 0.03], [0.05, 0.06], [0.15, 0.095], [0.3, 0.115], [0.48, 0.1], [0.62, 0.07], [0.74, 0.04], [0.86, 0.02]];
  const b = cetaceanBody(L, t, swim * 0.8, top, bot, 0.14);
  ctx.beginPath(); smoothPath(ctx, b.top, true);
  for (let i = b.bot.length - 1; i >= 0; i--) ctx.lineTo(b.bot[i][0], b.bot[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#0d0f12'; ctx.fill();
  ctx.save(); ctx.clip();
  // white throat and belly, sweeping up the flank behind the dorsal fin
  ctx.fillStyle = v.c[1];
  ctx.beginPath(); ctx.moveTo(-L * 0.5, L * 0.04);
  ctx.quadraticCurveTo(-L * 0.35, L * 0.03, -L * 0.2, L * 0.07);
  ctx.quadraticCurveTo(-L * 0.05, L * 0.09, L * 0.05, L * 0.06 + b.bend(0.55));
  ctx.quadraticCurveTo(L * 0.14, L * 0.0 + b.bend(0.64), L * 0.2, L * 0.03 + b.bend(0.7));
  ctx.quadraticCurveTo(L * 0.12, L * 0.1, -L * 0.1, L * 0.13);
  ctx.lineTo(-L * 0.5, L * 0.13); ctx.closePath(); ctx.fill();
  // grey saddle behind the dorsal fin
  ctx.fillStyle = 'rgba(120,124,128,0.55)';
  ctx.beginPath(); ctx.ellipse(-L * 0.02, -L * 0.1 + b.bend(0.48), L * 0.07, L * 0.025, 0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(-L / 2, -L * 0.12, L, L * 0.04);
  ctx.restore();
  // white eye patch, small eye just in front of it
  ctx.fillStyle = v.c[1];
  ctx.beginPath(); ctx.ellipse(-L * 0.33, -L * 0.035, L * 0.04, L * 0.014, -0.15, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.39, -L * 0.012, Math.max(1, L * 0.005), '#111', false);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = Math.max(1, L * 0.003);
  ctx.beginPath(); ctx.moveTo(-L * 0.5, L * 0.035); ctx.quadraticCurveTo(-L * 0.43, L * 0.045, -L * 0.39, L * 0.035); ctx.stroke();
  // tall dorsal fin, paddle-shaped pectoral
  ctx.fillStyle = '#0a0c0e';
  const du = 0.44, dx = -L / 2 + du * L, dy = -0.11 * L + b.bend(du);
  ctx.beginPath(); ctx.moveTo(dx - L * 0.06, dy + L * 0.01); ctx.lineTo(dx - L * 0.005, dy - L * 0.19); ctx.quadraticCurveTo(dx + L * 0.02, dy - L * 0.08, dx + L * 0.05, dy + L * 0.01); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-L * 0.24, L * 0.12, L * 0.055, L * 0.03, 0.6, 0, TAU); ctx.fill();
  const u = 0.86;
  flukes(ctx, L, -L / 2 + u * L, b.bend(u), Math.cos(b.phase * 0.8 - 1.9) * 0.4, L * 0.14, '#0d0f12');
}
function mixHex(a, b, k) { return rgbStr(mixRgb(hexToRgb(a), hexToRgb(b), k)); }


function lerpN(a, b, t) { return a + (b - a) * t; }

// A webbed skirt seen from the side: it flares out from under the mantle like an umbrella,
// arm tips at the points and a sagging, scalloped web between them.
function umbrella(s, spread, depth, n, ph, ripple) {
  const p = new Path2D();
  p.moveTo(-s * 0.16, -s * 0.06);
  const tips = [];
  for (let k = 0; k <= n; k++) {
    const a = -1.25 + (k / n) * 2.5;
    tips.push([Math.sin(a) * spread * 1.25, Math.cos(a) * depth * 0.7 + s * 0.02 + Math.sin(ph + k) * s * ripple * 0.5]);
  }
  p.quadraticCurveTo(tips[0][0] * 0.8, -s * 0.02, tips[0][0], tips[0][1]);
  for (let k = 1; k <= n; k++) {
    const [x0, y0] = tips[k - 1], [x1, y1] = tips[k];
    p.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) - depth * 0.12 + Math.sin(ph * 1.3 + k) * s * ripple, x1, y1);
  }
  p.quadraticCurveTo(tips[n][0] * 0.8, -s * 0.02, s * 0.16, -s * 0.06);
  p.closePath();
  return p;
}

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
  coral: drawCoral, sperm: drawSperm, dolphin: drawDolphin, orca: drawOrca, sleeper: drawSleeper,
  ...UNDOCUMENTED_RENDERERS,
};

// Draws a species. Returns local glow points (or null) for the bioluminescence pass.
// (3.7.5) the coelacanth: a heavy, deep-blue fish flecked with pale blotches, covered in thick, rough scales; its
// pectoral, pelvic, second dorsal and anal fins each grow from a fleshy, scaled lobe like a limb; the tail has
// three lobes, a small paddle sticking out between the upper and lower ones; a large eye that shines
function drawCoelacanth(ctx, L, v, t, swim = 1) {
  const H = L * v.h, c0 = v.c[0], c1 = v.c[1], fin = shade(c1, 0.12), sw = Math.sin(t * 2.5) * swim;
  // a lobed fin: a fleshy, scaled stalk, then the rayed fan at its end
  const lobe = (bx, by, ang, len, w, fan, alpha = 0.7) => {
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len, nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
    ctx.fillStyle = shade(c1, 0.05); ctx.beginPath(); ctx.moveTo(bx + nx, by + ny); ctx.quadraticCurveTo((bx + ex) / 2 + nx * 1.2, (by + ey) / 2 + ny * 1.2, ex + nx * 0.5, ey + ny * 0.5); ctx.lineTo(ex - nx * 0.5, ey - ny * 0.5); ctx.quadraticCurveTo((bx + ex) / 2 - nx * 1.2, (by + ey) / 2 - ny * 1.2, bx - nx, by - ny); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(shade(c1, 0.3), 0.3); ctx.lineWidth = Math.max(0.4, L * 0.0025); for (let k = 1; k < 4; k++) { const u = k / 4; ctx.beginPath(); ctx.arc(bx + (ex - bx) * u, by + (ey - by) * u, w * 0.8, ang - 0.9 + PI / 2, ang + 0.9 + PI / 2); ctx.stroke(); }
    const tips = []; for (let k = 0; k <= 6; k++) { const a = ang - 0.6 + k * 0.2; tips.push([ex + Math.cos(a) * fan, ey + Math.sin(a) * fan]); }
    rayFin(ctx, [[ex + nx * 0.5, ey + ny * 0.5], [ex - nx * 0.5, ey - ny * 0.5]], tips, fin, alpha);
  };
  // the tail: upper and lower lobes, and the little central paddle
  const tx = L * 0.32, bend = sw * H * 0.15;
  rayFin(ctx, [[tx, -H * 0.12], [tx, -H * 0.02]], [[tx + L * 0.05, -H * 0.55 + bend], [tx + L * 0.12, -H * 0.42 + bend], [tx + L * 0.15, -H * 0.12 + bend]], fin, 0.7);
  rayFin(ctx, [[tx, H * 0.02], [tx, H * 0.12]], [[tx + L * 0.15, H * 0.12 + bend], [tx + L * 0.12, H * 0.42 + bend], [tx + L * 0.05, H * 0.55 + bend]], fin, 0.7);
  ctx.fillStyle = shade(c1, 0.05); ctx.beginPath(); ctx.moveTo(tx + L * 0.1, -H * 0.04 + bend * 0.7); ctx.lineTo(tx + L * 0.2, -H * 0.03 + bend); ctx.lineTo(tx + L * 0.2, H * 0.03 + bend); ctx.lineTo(tx + L * 0.1, H * 0.04 + bend * 0.7); ctx.fill();
  rayFin(ctx, [[tx + L * 0.2, -H * 0.03 + bend], [tx + L * 0.2, H * 0.03 + bend]], [[tx + L * 0.25, -H * 0.12 + bend], [tx + L * 0.27, bend], [tx + L * 0.25, H * 0.12 + bend]], fin, 0.7);
  // the lobed fins on the far side, behind the body
  lobe(L * 0.16, -H * 0.36, -1.25, H * 0.3, H * 0.07, H * 0.32);
  lobe(L * 0.16, H * 0.36, 1.2, H * 0.3, H * 0.07, H * 0.3);
  // the first dorsal: an ordinary fan of spines
  rayFin(ctx, [[-L * 0.08, -H * 0.46], [L * 0.04, -H * 0.48]], [[-L * 0.06, -H * 0.95], [-L * 0.01, -H * 0.92], [L * 0.04, -H * 0.62]], fin, 0.6);
  const body = new Path2D();
  body.moveTo(-L * 0.48, -H * 0.02); body.bezierCurveTo(-L * 0.47, -H * 0.42, -L * 0.25, -H * 0.55, -L * 0.02, -H * 0.5);
  body.bezierCurveTo(L * 0.18, -H * 0.46, L * 0.3, -H * 0.24, L * 0.34, -H * 0.13); body.lineTo(L * 0.34, H * 0.13);
  body.bezierCurveTo(L * 0.3, H * 0.26, L * 0.18, H * 0.48, -L * 0.02, H * 0.5); body.bezierCurveTo(-L * 0.25, H * 0.52, -L * 0.46, H * 0.4, -L * 0.48, H * 0.12); body.closePath();
  const bg = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.5); bg.addColorStop(0, shade(c0, -0.2)); bg.addColorStop(0.5, c1); bg.addColorStop(1, shade(c0, -0.1)); ctx.fillStyle = bg; ctx.fill(body);
  ctx.save(); ctx.clip(body);
  // thick, rough scales in overlapping rows, each with a raised spiny edge
  for (let r = 0; r < 7; r++) for (let k = 0; k < 16; k++) { const x = -L * 0.3 + k * L * 0.042 + (r % 2) * L * 0.021, y = -H * 0.48 + r * H * 0.16;
    ctx.strokeStyle = rgba(shade(c1, 0.35), 0.28); ctx.lineWidth = Math.max(0.5, L * 0.003); ctx.beginPath(); ctx.arc(x, y, L * 0.026, -0.45 * PI, 0.45 * PI); ctx.stroke();
    ctx.fillStyle = rgba(shade(c1, 0.4), 0.12); ctx.beginPath(); ctx.arc(x + L * 0.02, y, Math.max(0.4, L * 0.004), 0, TAU); ctx.fill(); }
  if (v.p) patternFish(ctx, { H, x0: -L / 2, bodyL: L }, L, v);
  const sh = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.5); sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)'); ctx.fillStyle = sh; ctx.fillRect(-L, -H, 2 * L, 2 * H);
  ctx.restore();
  // head plates and the jaw, the near side's lobed fins, the eye
  ctx.strokeStyle = rgba(shade(c0, -0.5), 0.7); ctx.lineWidth = Math.max(0.6, L * 0.005);
  ctx.beginPath(); ctx.moveTo(-L * 0.24, -H * 0.42); ctx.quadraticCurveTo(-L * 0.16, H * 0.02, -L * 0.26, H * 0.44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-L * 0.48, H * 0.1); ctx.lineTo(-L * 0.32, H * 0.16); ctx.stroke();
  lobe(-L * 0.14, H * 0.2, 2.2 + sw * 0.1, H * 0.34, H * 0.08, H * 0.32, 0.75);   // the pectoral, swinging like a limb
  lobe(L * 0.06, H * 0.44, 1.9 - sw * 0.1, H * 0.28, H * 0.07, H * 0.26, 0.75);   // the pelvic
  const er = Math.max(1.2, H * 0.1); ctx.fillStyle = rgba(shade(c0, -0.5), 0.8); ctx.beginPath(); ctx.arc(-L * 0.36, -H * 0.12, er * 1.4, 0, TAU); ctx.fill();
  eye(ctx, -L * 0.36, -H * 0.12, er, '#d8c878'); // (the eye shines yellow-green in a light, from the mirror at its back)
}
export function drawSpecies(ctx, sp, L, t, swim = 1, phase = 0) {
  const fn = sp.v.t === 'coel' ? drawCoelacanth : RENDERERS[sp.v.s] || drawFish; // (3.7.5) the coelacanth has its own
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

// (3.2.0) how big a species really draws: its painted outline measured once (at length 1, around the point it is
// drawn from), so a picture can be fitted to a box by what shows, not by its length: a frogfish and a shark
// then fill a card's picture alike, and a deep-bodied fish can be kept wholly inside a tank's window.
const BOXES = new Map();
export function speciesBox(sp) {
  if (BOXES.has(sp.id)) return BOXES.get(sp.id);
  const S = 400, L = 200, c = document.createElement('canvas'); c.width = S; c.height = S;
  const x = c.getContext('2d'); x.translate(S / 2, S / 2);
  let box = { x0: -0.5, x1: 0.5, y0: -0.2, y1: 0.2 };
  try {
    drawSpecies(x, sp, L, 1.3, 0.4, 0);
    const d = x.getImageData(0, 0, S, S).data; let x0 = S, x1 = -1, y0 = S, y1 = -1;
    for (let y = 0; y < S; y++) for (let i = 0; i < S; i++) if (d[(y * S + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0 && y1 > y0) box = { x0: (x0 - S / 2) / L, x1: (x1 + 1 - S / 2) / L, y0: (y0 - S / 2) / L, y1: (y1 + 1 - S / 2) / L };
  } catch (e) { /* the default box */ }
  box.w = box.x1 - box.x0; box.h = box.y1 - box.y0;
  BOXES.set(sp.id, box);
  return box;
}
// a picture of a species fitted to w x h by what shows (pad: the margin, a share of the box), centred
export function fittedIcon(sp, w = 240, h = 150, pad = 0.08) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), B = speciesBox(sp);
  const L = Math.min((w * (1 - pad * 2)) / B.w, (h * (1 - pad * 2)) / B.h);
  x.translate(w / 2 - (B.x0 + B.w / 2) * L, h / 2 - (B.y0 + B.h / 2) * L);
  try { drawSpecies(x, sp, L, 1.3, 0.4, 0); } catch (e) { /* ignore */ }
  return c;
}
