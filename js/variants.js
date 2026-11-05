// Rare variants. Once Earl has caught (or tagged) a normal animal of a species, any new one of
// that species has a 5 % chance to be rare. Each variant is a layer over the species' own drawing:
// a colour change worked into the pixels, a size change, or a deformity.
import { clamp } from './util.js';

export const VARIANT_CHANCE = 0.05;
export const VARIANTS = {
  giant: { name: 'Giant', share: 0.35, mult: 2, desc: 'Far bigger than any normal adult, and old: scarred, slower to bolt.' },
  albino: { name: 'Albino', share: 0.20, mult: 2.5, desc: 'No pigment at all: bone white, pink-eyed, fins like frosted glass.' },
  golden: { name: 'Golden', share: 0.15, mult: 3, desc: 'Xanthic: a mutation that leaves only yellow pigment. Deep gold.' },
  melanistic: { name: 'Melanistic', share: 0.15, mult: 3, desc: 'Almost black, its markings left as pale ghosts.' },
  abnormal: { name: 'Abnormal', share: 0.10, mult: 3, desc: 'Wrong in some way: a bent spine, a second dorsal fin, a clouded eye. It swims wrong.' },
  crimson: { name: 'Crimson', share: 0.05, mult: 5, desc: 'Lit from inside by a dull red glow, veins of light under the skin. Only in the deep, and more often when something else is near.' },
};
export const VARIANT_KEYS = Object.keys(VARIANTS);

// pick a variant for a new animal (or null): depth decides whether crimson is possible, and the
// entity being close makes it three times likelier
export function rollVariant(rng, depth, entityNear) {
  if (rng() >= VARIANT_CHANCE) return null;
  const w = {};
  let tot = 0;
  for (const k of VARIANT_KEYS) {
    let s = VARIANTS[k].share;
    if (k === 'crimson') s = depth > 200 ? s * (entityNear ? 3 : 1) : 0;
    w[k] = s; tot += s;
  }
  let r = rng() * tot;
  for (const k of VARIANT_KEYS) { r -= w[k]; if (r <= 0) return k; }
  return 'giant';
}
export const variantName = (sp, v) => (v ? `${VARIANTS[v].name} ${sp.name.charAt(0).toLowerCase()}${sp.name.slice(1)}` : sp.name);
export const variantLabel = (sp, v) => (v ? `${VARIANTS[v].name} ${sp.name}` : sp.name);
export const variantMult = (v) => (v ? VARIANTS[v].mult : 1);

// a small deterministic random sequence (so a species' scars are always in the same places)
function seeded(n) { let s = n * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }

// ---------------- the drawing ----------------
// base: a square canvas with the species drawn at its centre, nose toward -x, length L px.
// Returns a new canvas with the variant applied.
export function makeVariantSprite(base, v, L, sp) {
  const box = base.width;
  const out = document.createElement('canvas');
  out.width = out.height = box;
  const ctx = out.getContext('2d');
  const cx = box / 2, cy = box / 2;
  const h = clamp(sp.v.h || 0.3, 0.12, 0.6) * L; // body depth
  const rnd = seeded(sp.id);
  if (v === 'abnormal') {
    // a bent spine: the body drawn in thin vertical slices, each shifted along a curve
    const bend = L * 0.095;
    for (let x = 0; x < box; x += 2) {
      const k = (x - cx) / (L * 0.5);
      const dy = Math.sin(k * 1.6) * bend * (0.4 + 0.6 * Math.abs(k));
      ctx.drawImage(base, x, 0, 2, box, x, dy, 2, box);
    }
    // a second dorsal fin: the top of the back, copied up and back, behind the body
    ctx.globalCompositeOperation = 'destination-over';
    const sx = cx - L * 0.2, sw = L * 0.36, sy = cy - h * 1.1, sh = h * 0.75;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(base, sx, sy, sw, sh, sx + L * 0.16, sy - h * 0.32, sw * 0.8, sh);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // a clouded, oversized eye
    const ex = cx - L * 0.34, ey = cy - h * 0.12 + Math.sin(-0.68 * 1.6) * bend * 0.8, er = Math.max(1.5, L * 0.045);
    const eg = ctx.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.1, ex, ey, er);
    eg.addColorStop(0, 'rgba(235,240,245,0.95)'); eg.addColorStop(0.6, 'rgba(170,190,200,0.9)'); eg.addColorStop(1, 'rgba(40,40,45,0.9)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return out;
  }
  ctx.drawImage(base, 0, 0);
  if (v === 'giant') {
    // old scars and a weathered skin: pale healed slashes, darker blotches
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(30,24,18,0.14)'; ctx.fillRect(0, 0, box, box);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const x0 = cx + (rnd() - 0.5) * L * 0.6, y0 = cy + (rnd() - 0.5) * h * 0.8, len = L * (0.06 + rnd() * 0.1), a = (rnd() - 0.5) * 1.2 + 0.8;
      ctx.strokeStyle = `rgba(232,224,212,${(0.35 + rnd() * 0.3).toFixed(2)})`; ctx.lineWidth = Math.max(0.8, L * 0.008);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(a) * len * 0.5, y0 + Math.sin(a) * len * 0.5 - L * 0.01, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    return out;
  }
  // colour variants: remap every pixel by its brightness
  const img = ctx.getImageData(0, 0, box, box), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = 0.3 * r + 0.59 * g + 0.11 * b, t = lum / 255;
    let o;
    if (v === 'albino') {
      if (lum < 38) o = [226, 192, 196];                         // dark marks gone pale; a pink tinge of blood beneath
      else { const k = 0.62 + 0.38 * t; o = [236 * k, 229 * k, 220 * k]; }
      d[i + 3] *= 0.94;                                           // fins a little translucent
    } else if (v === 'golden') {
      // xanthic: the dark pigment is gone too, so even the darkest marks are only a deeper gold
      o = t < 0.5 ? mix([150, 92, 18], [222, 158, 34], t * 2) : mix([222, 158, 34], [255, 230, 140], (t - 0.5) * 2);
    } else if (v === 'melanistic') {
      o = lum > 190 ? [150, 158, 166] : [12 + t * 26, 13 + t * 26, 16 + t * 30];
    } else if (v === 'crimson') {
      o = t < 0.5 ? mix([40, 4, 6], [150, 20, 18], t * 2) : mix([150, 20, 18], [236, 92, 62], (t - 0.5) * 2);
    } else o = [r, g, b];
    d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2];
  }
  ctx.putImageData(img, 0, 0);
  if (v === 'crimson') {
    // veins of light under the skin: a lateral line and branches, brightest at the core
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineCap = 'round';
    const lines = [[0, 1], [-0.32, 0.7], [0.3, 0.7]];
    for (const [off, w] of lines) {
      ctx.strokeStyle = 'rgba(255,90,50,0.85)'; ctx.lineWidth = Math.max(0.7, L * 0.011 * w);
      ctx.beginPath();
      for (let k = 0; k <= 12; k++) {
        const x = cx - L * 0.42 + k / 12 * L * 0.82, y = cy + off * h + Math.sin(k * 1.3 + off * 4) * h * 0.08;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    const gl = ctx.createRadialGradient(cx - L * 0.05, cy, 0, cx, cy, L * 0.45);
    gl.addColorStop(0, 'rgba(255,80,40,0.35)'); gl.addColorStop(1, 'rgba(255,60,30,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, box, box);
    ctx.globalCompositeOperation = 'source-over';
  }
  return out;
}
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
