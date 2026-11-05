// Tagging and photographs: survey work for the research program and the institute.
// Tags: a dart fired at a big animal; the program pays per tag (each one less than the last for
// the same species). Photos: the institute pays once for the first picture of each species and
// each rare form. Both are paid at the boat; neither survives his death (the data dies with him).
import { clamp, dist } from './util.js';
import { TAGGERS, CAMERAS } from './economy.js';
import { TAG, liveValue, tagPrice } from './specimens.js';
import { variantMult, variantName } from './variants.js';
import { AGGRO } from './hunters.js';

export const canTag = (sp) => (TAG[sp.id] || 0) > 0;
export function tagValue(sp, variant, tier) {
  return tagPrice(sp.id) * variantMult(variant) * TAGGERS[tier].pay;
}
// what the institute pays for a first photograph
export function photoValue(sp, variant) {
  let v;
  if (TAG[sp.id]) v = tagPrice(sp.id) * 0.35;
  else if (sp.cat === 'Kelp & Plants' || sp.cat === 'Corals, Anemones & Sponges') v = 0.5 + sp.dmin * 0.03;
  else v = liveValue(sp) * 0.3;
  return clamp(v, 0.25, 2000) * variantMult(variant);
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
  for (const c of g.fauna.list) if (!c.dead) test(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
  for (const s of g.world.statics) if (Math.abs(s.x - e.x) < range + 5) test(s.sp, s.x, s.y - s.sp.len * s.scale * 0.3, s.sp.len * s.scale, { s, variant: s.variant });
  return best;
}

export function findTagTarget(g) {
  const tier = g.profile.tagger;
  if (tier < 0) return null;
  const def = TAGGERS[tier];
  const t = inCone(g, def.range, 0.3, (sp, ref, d, da) => (ref.c && canTag(sp) ? d + da * 6 + (ref.c.tagged ? 50 : 0) : null));
  if (!t) return null;
  if (t.c.tagged) return { ...t, ok: false, why: 'already tagged' };
  return { ...t, ok: true, value: tagValue(t.sp, t.variant, tier), name: variantName(t.sp, t.variant) };
}
export function findPhotoSubject(g) {
  const tier = g.profile.camera;
  if (tier < 0) return null;
  const def = CAMERAS[tier], have = new Set(g.profile.photos || []), pending = new Set(g.photos.map((p) => p.key));
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
export function fireTag(g) {
  const tier = g.profile.tagger, def = TAGGERS[tier], e = g.earl, a = aimAngle(g);
  const tip = g.toolTip || { x: e.x + Math.cos(a), y: e.y + Math.sin(a) };
  g.darts.push({ x: tip.x, y: tip.y, vx: Math.cos(a) * 22, vy: Math.sin(a) * 22, travelled: 0, max: def.range + 0.6, tier });
  g.capture = { kind: 'tag', t: 0, dur: def.time, resolveAt: 1, done: true };
  if (e.y > 200) g.entity.disturb(g, 0.01);
}
// darts in flight: a hit tags the animal; a miss may turn something aggressive on him
export function updateDarts(g, dt) {
  const ev = [];
  for (let i = g.darts.length - 1; i >= 0; i--) {
    const d = g.darts[i];
    const step = Math.hypot(d.vx, d.vy) * dt;
    d.x += d.vx * dt; d.y += d.vy * dt; d.travelled += step;
    let hit = null;
    for (const c of g.fauna.list) {
      if (c.dead || c.tagged || !canTag(c.sp)) continue;
      if (dist(d.x, d.y, c.x, c.y) < Math.max(0.5, c.len * 0.32)) { hit = c; break; }
    }
    if (hit) {
      hit.tagged = true; hit.tagT = g.time;
      const def = TAGGERS[d.tier];
      ev.push({ type: 'tagged', sp: hit.sp, variant: hit.variant, value: tagValue(hit.sp, hit.variant, d.tier), name: variantName(hit.sp, hit.variant), key: 'tag' + hit.sp.id + (hit.variant ? ':' + hit.variant : '') });
      // the sting of it: it bolts; an aggressive animal may come back for him
      hit.fleeT = 3;
      if (AGGRO[hit.sp.id] && Math.random() < def.provoke * 0.5) provoke(hit);
      g.darts.splice(i, 1);
    } else if (d.travelled > d.max || g.world.floorAt(d.x) < d.y || g.world.rockAt(d.x, d.y)) {
      // a miss: anything aggressive close by takes it badly
      const def = TAGGERS[d.tier];
      for (const c of g.fauna.list) if (AGGRO[c.sp.id] && AGGRO[c.sp.id].kind !== 'lurk' && dist(c.x, c.y, d.x, d.y) < 6 && Math.random() < def.provoke) { provoke(c); ev.push({ type: 'provoked', sp: c.sp }); break; }
      ev.push({ type: 'dartMiss' });
      g.darts.splice(i, 1);
    }
  }
  return ev;
}
function provoke(c) { c.hunting = true; if (c.att) c.att.cool = 0; }

// take a picture of the best subject in front of him
export function takePhoto(g) {
  const tier = g.profile.camera, def = CAMERAS[tier], e = g.earl;
  if (g.shots <= 0) return { type: 'noShots' };
  g.shots--;
  g.capture = { kind: 'cam', t: 0, dur: 0.9, resolveAt: 1, done: true };
  if (def.flash) {
    g.camFlash = 1;
    if (e.y > 200) g.entity.disturb(g, 0.05); // a flash in the dark is seen a long way off
    // a flash makes nearby fish start
    for (const c of g.fauna.list) if (c.flee > 0 && dist(c.x, c.y, e.x, e.y) < 6) c.fleeT = Math.max(c.fleeT, 1.2);
  }
  const s = findPhotoSubject(g);
  if (!s) return { type: 'photo', empty: true };
  if (!s.ok) return { type: 'photo', old: true, sp: s.sp, name: s.name, variant: s.variant };
  g.photos.push({ key: s.key, id: s.sp.id, variant: s.variant || null, value: s.value, name: s.name });
  return { type: 'photo', sp: s.sp, variant: s.variant, value: s.value, name: s.name };
}
