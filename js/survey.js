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
  for (const c of g.fauna.list) if (!c.dead && !c.pet) test(c.sp, c.x, c.y, c.len, { c, variant: c.variant });
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

// take a picture of the best subject in front of him
export function takePhoto(g) {
  const def = gear(g.profile, 'cam'), e = g.earl;
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
