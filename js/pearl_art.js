// (7.7.3, owner) the pearl packs, painted: a pail of pearls (the small pack) and a hoard (the big one), an old sea chest
// half buried in pearls spilling out over the sand. Drawn once on a canvas and kept as a picture. Until the owner's own
// pictures come; then these give way to them
const TAU = Math.PI * 2;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// one pearl: a soft contact shadow, a body lit from the upper left with a faint warm-to-cool sheen, a bright point
function pearl(x, cx, cy, r, tone = 0) {
  const sh = x.createRadialGradient(cx + r * 0.15, cy + r * 0.75, 0, cx + r * 0.15, cy + r * 0.75, r * 1.05);
  sh.addColorStop(0, 'rgba(10,8,4,0.45)'); sh.addColorStop(1, 'rgba(10,8,4,0)'); x.fillStyle = sh; x.beginPath(); x.ellipse(cx + r * 0.15, cy + r * 0.78, r * 1.05, r * 0.45, 0, 0, TAU); x.fill();
  const g = x.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.05, cx, cy, r);
  const warm = tone > 0.5; g.addColorStop(0, '#fffdf6'); g.addColorStop(0.35, warm ? '#efe6d4' : '#e9e6de'); g.addColorStop(0.78, warm ? '#bfb196' : '#aeaba2'); g.addColorStop(1, warm ? '#6f6450' : '#5f5d58');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  const ir = x.createLinearGradient(cx - r, cy + r, cx + r, cy - r); ir.addColorStop(0, 'rgba(176,196,214,0.22)'); ir.addColorStop(0.5, 'rgba(255,255,255,0)'); ir.addColorStop(1, 'rgba(226,196,206,0.18)');
  x.fillStyle = ir; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); // the nacre's play of colour
  x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.ellipse(cx - r * 0.36, cy - r * 0.4, r * 0.2, r * 0.13, -0.6, 0, TAU); x.fill();
  x.strokeStyle = 'rgba(40,34,24,0.35)'; x.lineWidth = Math.max(0.6, r * 0.06); x.beginPath(); x.arc(cx, cy, r * 0.98, 0.2, Math.PI * 0.95); x.stroke();
}
// a mound of pearls inside a shape: top(x) gives the mound's top at x; packed back to front, smaller toward the back
function mound(x, x0, x1, base, top, r0, seed, n) {
  const R = rng(seed), pts = [];
  for (let i = 0; i < n; i++) { const px = x0 + R() * (x1 - x0), t = top(px); if (t >= base) continue; const py = t + R() * (base - t); const depth = (py - t) / Math.max(1, base - t); pts.push([px, py, r0 * (0.78 + 0.32 * depth) * (0.9 + R() * 0.2), R()]); }
  pts.sort((a, b) => a[1] - b[1]);
  for (const [px, py, r, tone] of pts) pearl(x, px, py, r, tone);
}
function wood(x, path, x0, x1, y0, y1, dark = 0) {
  const g = x.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, dark ? '#3e2a18' : '#6e4c2c'); g.addColorStop(0.5, dark ? '#4c3420' : '#8a6440'); g.addColorStop(1, dark ? '#2e1f12' : '#56391f');
  x.fillStyle = g; x.fill(path);
}

function paintBucket(x, W, H) {
  const cx = W / 2, rimY = H * 0.42, rw = W * 0.27, rh = rw * 0.28, botY = H * 0.86, bw = rw * 0.8;
  // the ground: a soft shadow and a few pearls fallen out
  { const g = x.createRadialGradient(cx, botY + 4, 4, cx, botY + 4, rw * 1.5); g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, botY + 4, rw * 1.5, rh * 1.1, 0, 0, TAU); x.fill(); }
  // the handle behind: a rope over the top
  x.strokeStyle = '#7a6a4a'; x.lineWidth = W * 0.016; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx - rw * 0.98, rimY + rh * 0.4); x.bezierCurveTo(cx - rw * 0.9, rimY - H * 0.42, cx + rw * 0.9, rimY - H * 0.42, cx + rw * 0.98, rimY + rh * 0.4); x.stroke();
  x.strokeStyle = 'rgba(30,24,14,0.5)'; x.lineWidth = W * 0.005; x.setLineDash([W * 0.012, W * 0.01]); x.stroke(); x.setLineDash([]);
  // inside the rim, dark, then the pearls heaped up over it
  x.fillStyle = '#1c140c'; x.beginPath(); x.ellipse(cx, rimY, rw, rh, 0, 0, TAU); x.fill();
  mound(x, cx - rw * 0.92, cx + rw * 0.92, rimY + rh * 0.55, (px) => { const u = (px - cx) / rw; return rimY - H * 0.15 * Math.max(0, 1 - u * u) + rh * 0.2; }, W * 0.03, 7, 110);
  // the pail's front: staves narrowing to the foot, two iron hoops
  const body = new Path2D(); body.moveTo(cx - rw, rimY); body.lineTo(cx - bw, botY); body.ellipse(cx, botY, bw, rh * 0.8, 0, Math.PI, 0, true); body.lineTo(cx + rw, rimY); body.ellipse(cx, rimY, rw, rh, 0, 0, Math.PI, false); body.closePath();
  wood(x, body, cx - rw, cx + rw, rimY, rimY);
  x.save(); x.clip(body);
  for (let i = -4; i <= 4; i++) { const u = i / 4.6; x.strokeStyle = 'rgba(30,20,10,0.55)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(cx + u * rw, rimY); x.lineTo(cx + u * bw, botY + rh); x.stroke(); x.strokeStyle = 'rgba(255,220,170,0.08)'; x.beginPath(); x.moveTo(cx + u * rw + 2, rimY); x.lineTo(cx + u * bw + 2, botY + rh); x.stroke(); }
  const shade = x.createLinearGradient(cx - rw, 0, cx + rw, 0); shade.addColorStop(0, 'rgba(0,0,0,0.45)'); shade.addColorStop(0.35, 'rgba(0,0,0,0)'); shade.addColorStop(0.75, 'rgba(0,0,0,0.1)'); shade.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = shade; x.fillRect(cx - rw - 2, rimY - rh, rw * 2 + 4, botY - rimY + rh * 3);
  for (const [k, y] of [[0.25, rimY + (botY - rimY) * 0.22], [0.8, rimY + (botY - rimY) * 0.78]]) { const w2 = rw - (rw - bw) * k; x.strokeStyle = '#2c2822'; x.lineWidth = H * 0.035; x.beginPath(); x.ellipse(cx, y, w2 + 1, rh * (0.95 - k * 0.15), 0, 0.1, Math.PI - 0.1); x.stroke(); x.strokeStyle = 'rgba(160,96,52,0.55)'; x.lineWidth = H * 0.01; x.beginPath(); x.ellipse(cx, y - H * 0.008, w2, rh * (0.95 - k * 0.15), 0, 0.5, Math.PI - 0.9); x.stroke(); }
  x.restore();
  // the rim's lip, and the rope's knots on it
  x.strokeStyle = '#3a2816'; x.lineWidth = W * 0.012; x.beginPath(); x.ellipse(cx, rimY, rw, rh, 0, 0, Math.PI); x.stroke();
  x.fillStyle = '#2c2822'; for (const s of [-1, 1]) { x.beginPath(); x.arc(cx + s * rw * 0.98, rimY + rh * 0.4, W * 0.014, 0, TAU); x.fill(); }
  // a few out on the sand
  for (const [dx, dy, r] of [[-1.2, 0.02, 0.026], [-1.42, -0.01, 0.022], [1.25, 0.0, 0.026], [1.08, 0.05, 0.024]]) pearl(x, cx + dx * rw, botY + dy * H, r * W, 0.3);
}

function paintHoard(x, W, H) {
  const cx = W * 0.5, base = H * 0.88;
  { const g = x.createRadialGradient(cx, base, 6, cx, base, W * 0.48); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, base, W * 0.48, H * 0.12, 0, 0, TAU); x.fill(); }
  // the chest behind: its lid thrown back, iron-strapped, the box sunk in pearls
  const cw = W * 0.25, ch = H * 0.32, top = H * 0.42, lx = cx;
  const lid = new Path2D(); lid.moveTo(lx - cw, top); lid.lineTo(lx - cw * 0.92, top - H * 0.3); lid.quadraticCurveTo(lx, top - H * 0.42, lx + cw * 0.92, top - H * 0.3); lid.lineTo(lx + cw, top); lid.closePath();
  wood(x, lid, lx - cw, lx + cw, top - H * 0.4, top, 1); x.save(); x.clip(lid); x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 1; i < 4; i++) x.fillRect(lx - cw, top - H * 0.4 + i * H * 0.1, cw * 2, 1.5);
  x.fillStyle = '#2a2620'; for (const s of [-0.6, 0.6]) x.fillRect(lx + s * cw - W * 0.014, top - H * 0.42, W * 0.028, H * 0.42); x.restore();
  x.strokeStyle = '#1c130a'; x.lineWidth = 2; x.stroke(lid);
  const box = new Path2D(); box.rect(lx - cw, top, cw * 2, ch); wood(x, box, lx - cw, lx + cw, top, top + ch);
  x.save(); x.clip(box); x.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 1; i < 3; i++) x.fillRect(lx - cw, top + i * ch / 3, cw * 2, 1.5); x.fillStyle = '#2a2620'; for (const s of [-0.6, 0.6]) x.fillRect(lx + s * cw - W * 0.014, top, W * 0.028, ch);
  x.fillStyle = '#3a3128'; x.fillRect(lx - W * 0.03, top + ch * 0.12, W * 0.06, ch * 0.32); x.fillStyle = '#120d08'; x.beginPath(); x.arc(lx, top + ch * 0.25, W * 0.008, 0, TAU); x.fill(); x.restore();
  // the pearls: heaped over the chest's mouth, poured down its front and spread wide across the sand
  mound(x, lx - cw * 0.98, lx + cw * 0.98, top + H * 0.04, (px) => { const u = (px - lx) / cw; return top - H * 0.13 * Math.max(0, 1 - u * u); }, W * 0.022, 11, 170);
  // poured out over its front lip: a mound in front that buries the chest's lower half and runs out wide over the sand
  mound(x, W * 0.05, W * 0.95, base, (px) => { const u = (px - cx) / (W * 0.45), k = Math.max(0, 1 - u * u); return base - (base - (top + ch * 0.42)) * Math.pow(k, 1.6); }, W * 0.024, 23, 520);
  for (const [dx, dy, r] of [[-0.46, 0.0, 0.02], [0.45, -0.01, 0.021], [-0.4, 0.04, 0.018], [0.38, 0.05, 0.019]]) pearl(x, cx + dx * W, base + dy * H, r * W, 0.6);
  // a string of pearls thrown over the heap: the hoard's one piece of jewellery
  x.strokeStyle = 'rgba(60,48,30,0.6)'; x.lineWidth = 1; x.beginPath(); for (let i = 0; i <= 14; i++) { const u = i / 14, px = cx - W * 0.3 + u * W * 0.3, py = base - H * 0.12 - Math.sin(u * Math.PI) * H * 0.1 - u * H * 0.05; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
  for (let i = 0; i <= 14; i++) { const u = i / 14; pearl(x, cx - W * 0.3 + u * W * 0.3, base - H * 0.12 - Math.sin(u * Math.PI) * H * 0.1 - u * H * 0.05, W * 0.011, 0.9); }
}

const CACHE = new Map();
export function packPicture(i, W = 340, H = 220) {
  const key = i + ':' + W; if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  try { (i === 0 ? paintBucket : paintHoard)(x, W, H); } catch (e) { /* the card keeps its words */ }
  const url = c.toDataURL(); CACHE.set(key, url); return url;
}
