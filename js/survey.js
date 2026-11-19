// Tagging and photographs: survey work for the research program and the institute.
// Tags: a dart fired at a big animal; the program pays per tag (each one less than the last for
// the same species). Photos: the institute pays once for the first picture of each species and
// each rare form. Both are paid at the boat; neither survives his death (the data dies with him).
import { clamp, dist } from './util.js';
import { gear, owns } from './economy.js';
import { TAG, liveValue, tagPrice, rarityOf, rarityPrice } from './specimens.js';
import { variantMult, variantName } from './variants.js';
import { AGGRO } from './hunters.js';

// What can carry a tag: the big tag-only animals, and any other fish or animal that swims and is not
// too small for a dart (12 cm and up). Tiny things (krill, shrimp, lanternfish) are "too small".
export const TOO_SMALL = 0.12;
const isTagOnlyId = (sp) => (TAG[sp.id] || 0) > 0;
export const canTag = (sp) => isTagOnlyId(sp) || (sp.len >= TOO_SMALL && !/floor|plant|surface-plant/.test(sp.v.hab || ''));
export const tooSmall = (sp) => !isTagOnlyId(sp) && sp.len < TOO_SMALL && !/floor|plant|surface-plant/.test(sp.v.hab || '');
// which dart it needs: an advanced tag for the exotic, legendary and undocumented, and for any
// tag-only animal 2 m long or more; a basic tag for everything else
export const needsAdvanced = (sp) => { const r = rarityOf(sp); return r.id === 'exotic' || r.id === 'legendary' || r.id === 'undocumented' || (isTagOnlyId(sp) && sp.len >= 2); };
// a tag on a tag-only animal pays a share of its worth; on a fish he could also catch, a little ($0.50-2)
export function tagValue(sp, variant, pay) {
  const base = isTagOnlyId(sp) ? tagPrice(sp.id) : Math.min(2, Math.max(0.5, rarityPrice(sp) * 0.25));
  return base * variantMult(variant) * pay;
}
// what the institute pays for a first photograph
export function photoValue(sp, variant) {
  let v;
  if (TAG[sp.id]) v = tagPrice(sp.id) * 0.35;
  else if (sp.cat === 'Kelp & Plants' || sp.cat === 'Corals, Anemones & Sponges') v = 0.05 + sp.dmin * 0.002;
  else v = liveValue(sp) * 0.3;
  return clamp(v, 0.02, 100) * variantMult(variant);
}
export const photoKey = (sp, variant) => sp.id + (variant ? ':' + variant : '');

// which way he is aiming (the cursor, if he uses the mouse; otherwise straight ahead)
export function aimAngle(g) {
  if (g.aim !== null && g.aim !== undefined) return g.aim;
  return g.earl.facing > 0 ? 0 : Math.PI;
}
// the best target inside a cone along the aim
function inCone(g, range, cone, pick) {
  const e = g.earl, a = aimAngle(g);
  const ox = e.x + Math.cos(a) * 0.5, oy = e.y + Math.sin(a) * 0.5;
  let best = null, bs = 1e9;
  const test = (sp, x, y, len, ref) => {
    const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy) - len * 0.35;
    if (d > range) return;
    let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = 2 * Math.PI - da;
    if (da > cone + Math.atan2(len * 0.5, Math.max(1, d))) return;
    const score = pick(sp, ref, d, da);
    if (score !== null && score < bs) { bs = score; best = { sp, x, y, len, d, ...ref }; }
  };
  for (const c of g.fauna.list) if (!c.dead && !c.pet && !c.companion) test(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
  for (const s of g.world.statics) if (Math.abs(s.x - e.x) < range + 5) test(s.sp, s.x, s.y - s.sp.len * s.scale * 0.3, s.sp.len * s.scale, { s, variant: s.variant });
  return best;
}

export function findTagTarget(g) {
  if (!owns(g.profile, 'tagger')) return null;
  const def = gear(g.profile, 'tag');
  const t = inCone(g, def.range, 0.3, (sp, ref, d, da) => (ref.c && (canTag(sp) || tooSmall(sp)) ? d + da * 6 + (ref.c.tagged ? 50 : 0) + (tooSmall(sp) ? 8 : 0) : null));
  if (!t) return null;
  if (tooSmall(t.sp)) return { ...t, ok: false, why: 'too small to tag', small: true };
  if (t.c.tagged) return { ...t, ok: false, why: 'already tagged' };
  const adv = needsAdvanced(t.sp), it = g.items || {};
  if (adv && !(it.tagAdv > 0)) return { ...t, ok: false, why: 'needs an advanced tag', adv };
  if (!adv && !(it.tag > 0) && !(it.tagAdv > 0)) return { ...t, ok: false, why: 'no tags left', adv };
  return { ...t, ok: true, adv: adv || !(it.tag > 0), value: tagValue(t.sp, t.variant, def.pay), name: variantName(t.sp, t.variant) };
}
export function findPhotoSubject(g) {
  if (!owns(g.profile, 'camera')) return null;
  const def = gear(g.profile, 'cam'), have = new Set(g.profile.photos || []), pending = new Set(g.photos.map((p) => p.key));
  // prefer something not yet photographed
  const t = inCone(g, def.range, 0.35, (sp, ref, d, da) => {
    const k = photoKey(sp, ref.variant), old = have.has(k) || pending.has(k);
    return d + da * 4 + (old ? 40 : 0) - (ref.variant ? 3 : 0);
  });
  if (!t) return null;
  const k = photoKey(t.sp, t.variant);
  const old = have.has(k) || pending.has(k);
  return { ...t, key: k, ok: !old, why: old ? 'already photographed' : null, value: photoValue(t.sp, t.variant), name: variantName(t.sp, t.variant) };
}

// fire a tag dart along the aim
// Tags are ammunition (bought at the boat): the gun loads whichever the target needs (a basic tag
// when either will do). Returns a reason it did not fire, or null.
export function fireTag(g) {
  const def = gear(g.profile, 'tag'), e = g.earl, a = aimAngle(g), it = g.items;
  const t = findTagTarget(g);
  if (t && !t.ok && (t.small || t.why === 'already tagged' || t.why === 'needs an advanced tag')) return t.why;
  let adv = t ? !!t.adv : false;
  if (!adv && !(it.tag > 0)) adv = true;
  if (adv && !(it.tagAdv > 0)) return 'no tags left: the boat sells them';
  if (adv) it.tagAdv--; else it.tag--;
  const tip = g.toolTip || { x: e.x + Math.cos(a), y: e.y + Math.sin(a) };
  g.darts.push({ x: tip.x, y: tip.y, vx: Math.cos(a) * 22, vy: Math.sin(a) * 22, travelled: 0, max: def.range + 0.6, tier: def.look, def, adv });
  g.capture = { kind: 'tag', t: 0, dur: def.time, resolveAt: 1, done: true };
  if (e.y > 200) g.entity.disturb(g, 0.01);
  return null;
}
// darts in flight: a hit tags the animal; a miss may turn something aggressive on him
export function updateDarts(g, dt) {
  const ev = [];
  for (let i = g.darts.length - 1; i >= 0; i--) {
    const d = g.darts[i];
    const step = Math.hypot(d.vx, d.vy) * dt;
    d.x += d.vx * dt; d.y += d.vy * dt; d.travelled += step;
    let hit = null;
    let small = null;
    for (const c of g.fauna.list) {
      if (c.dead || c.tagged) continue;
      const r = Math.max(0.5, c.len * 0.32) * (d.adv ? 1.8 : 1); // an advanced dart has a wider spread
      if (dist(d.x, d.y, c.x, c.y) >= r) continue;
      if (!canTag(c.sp)) { if (tooSmall(c.sp)) small = c; continue; }
      if (needsAdvanced(c.sp) && !d.adv) continue; // a basic dart glances off what it can't hold
      hit = c; break;
    }
    if (!hit && small) { ev.push({ type: 'tooSmall', sp: small.sp }); g.darts.splice(i, 1); continue; }
    if (hit) {
      hit.tagged = true; hit.tagT = g.time;
      const def = d.def;
      ev.push({ type: 'tagged', sp: hit.sp, variant: hit.variant, value: tagValue(hit.sp, hit.variant, def.pay), name: variantName(hit.sp, hit.variant), key: 'tag' + hit.sp.id + (hit.variant ? ':' + hit.variant : '') });
      // the sting of it: it bolts; an aggressive animal may come back for him
      hit.fleeT = 3;
      if (AGGRO[hit.sp.id] && Math.random() < def.provoke * 0.5) provoke(hit);
      g.darts.splice(i, 1);
    } else if (d.travelled > d.max || g.world.floorAt(d.x) < d.y || g.world.rockAt(d.x, d.y)) {
      // a miss: anything aggressive close by takes it badly
      const def = d.def;
      for (const c of g.fauna.list) if (AGGRO[c.sp.id] && AGGRO[c.sp.id].kind !== 'lurk' && dist(c.x, c.y, d.x, d.y) < 6 && Math.random() < def.provoke) { provoke(c); ev.push({ type: 'provoked', sp: c.sp }); break; }
      ev.push({ type: 'dartMiss' });
      g.darts.splice(i, 1);
    }
  }
  return ev;
}
function provoke(c) { c.hunting = true; if (c.att) c.att.cool = 0; }

// (5.0) Photographs. The camera holds film (bought at the boat, a roll as long as the camera takes). Space starts
// an exposure: Earl holds still while the shutter is open (a cheap compact for nearly two seconds, a good housed
// camera for well under one), and keeps the animal in frame by aiming. What comes out is a picture kept with the
// catch and sold at the boat: a sharp, centred, close photograph pays in full, a blurred or off-centre one less,
// and the first of a species most of all. A better camera is quicker, and steadies the frame on the animal.
export function photoTarget(g) {
  if (!owns(g.profile, 'camera')) return null;
  const def = gear(g.profile, 'cam');
  const t = inCone(g, def.range, 0.45, (sp, ref, d, da) => d + da * 4 - (ref.variant ? 3 : 0) + (sp.len < 0.04 ? 20 : 0));
  return t ? { ...t, name: variantName(t.sp, t.variant) } : null;
}
export function startPhoto(g) {
  if (g.photo) return null;
  if (!((g.items.film || 0) > 0)) return 'No film: buy it at the boat';
  const def = gear(g.profile, 'cam'), t = photoTarget(g);
  g.photo = { t: 0, dur: def.exp || 1.6, def, s: t ? { c: t.c || null, st: t.s || null, sp: t.sp, variant: t.variant || null, x: t.x, y: t.y, len: t.len, name: t.name } : null, moved: 0 };
  return null;
}
const subjPos = (S) => (S.c ? { x: S.c.x, y: S.c.y } : { x: S.x, y: S.y });
// advance an exposure; at the end, the picture: { type: 'photo', ... } (or { type: 'photo', empty: true })
export function updatePhoto(g, dt) {
  const P = g.photo; if (!P) return null;
  const S = P.s;
  if (S && S.c && !S.c.dead) { const q = subjPos(S); P.moved += Math.hypot(q.x - (P.lx ?? q.x), q.y - (P.ly ?? q.y)); P.lx = q.x; P.ly = q.y; }
  P.t += dt;
  if (P.t < P.dur) return null;
  g.photo = null;
  g.items.film = Math.max(0, (g.items.film || 0) - 1);
  const def = P.def, e = g.earl;
  if (def.flash) {
    g.camFlash = 1;
    if (e.y > 200) g.entity.disturb(g, 0.05); // a flash in the dark is seen a long way off
    for (const c of g.fauna.list) if (c.flee > 0 && dist(c.x, c.y, e.x, e.y) < 6) c.fleeT = Math.max(c.fleeT, 1.2);
  }
  const a = aimAngle(g), ox = e.x + Math.cos(a) * 0.5, oy = e.y + Math.sin(a) * 0.5;
  if (!S || (S.c && S.c.dead)) return { type: 'photo', empty: true, aim: a, ox, oy };
  const q0 = subjPos(S), dx = q0.x - ox, dy = q0.y - oy, d = Math.max(0.3, Math.hypot(dx, dy) - S.len * 0.35);
  let da = Math.abs(Math.atan2(dy, dx) - a); if (da > Math.PI) da = 2 * Math.PI - da;
  const assist = def.assist || 0.2, half = 0.5 + Math.atan2(S.len * 0.5, Math.max(1, d));
  const daE = da * (1 - assist);
  if (daE > half || d > def.range + 1.5) return { type: 'photo', empty: true, aim: a, ox, oy };
  const centre = 1 - Math.min(1, daE / half);
  const sharp = 1 - Math.min(1, Math.max(0, (P.moved * (1 - assist * 0.5)) / (0.25 + S.len * 0.8) - 0.3));
  const size = Math.min(1, Math.max(0.25, S.len / (d * 0.18 + 0.05)));
  const q = Math.round((centre * 0.4 + sharp * 0.4 + size * 0.2) * 100) / 100;
  const grade = q >= 0.72 ? 'Good' : sharp < centre ? 'Blurry' : 'Off-centre';
  const sk = photoKey(S.sp, S.variant), have = new Set(g.profile.photos || []), first = !have.has(sk) && !g.photos.some((p) => p.sk === sk);
  let value = photoValue(S.sp, S.variant) * (0.3 + 0.7 * q) * (first ? 1 : 0.35);
  if (def.small && S.sp.len < 0.15) value *= def.small; // the macro camera: small animals pay more
  value = Math.max(0.05, Math.round(value * 100) / 100);
  // where the frame was: along the aim at the animal's distance, steadied toward it by the camera
  const fx = ox + Math.cos(a) * Math.hypot(dx, dy), fy = oy + Math.sin(a) * Math.hypot(dx, dy);
  return { type: 'photo', sp: S.sp, variant: S.variant, name: S.name, sk, first, q, grade, sharp, value,
    frame: { x: fx + (q0.x - fx) * Math.max(assist, 0.35), y: fy + (q0.y - fy) * Math.max(assist, 0.35), len: S.len, d,
      sub: { x: q0.x, y: q0.y, sp: S.sp, variant: S.variant, len: S.len, dir: S.c ? S.c.dir || 1 : 1, tilt: S.c ? Math.max(-0.5, Math.min(0.5, Math.atan2(S.c.vy || 0, Math.abs(S.c.vx || 0) + 0.2))) - (S.c.tired > 0 ? -0.3 : 0) : 0, phase: S.c ? S.c.phase || 0 : 0, still: !S.c, flash: !!def.flash } } };
}
