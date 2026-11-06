// The things a diver owns (2.6.0): each net, slurp gun, tag gun, camera, set of fins, air tank and catch
// bag is its own item, bought once from the catalog (or Dave, or the old one) and changed in the inventory
// (B). They replace the upgrade ladders for those tools. The suits are their own list (economy.js SUITS).
// Every item after the free one is a choice, not a strict step up: most have a "bad" line.
//
// stats, by kind:
//   net / slurp: range (m), time (s a sweep), minLen / maxLen (m), success (0..1), harm (condition lost),
//                noise, multi (more fish from a school at once)
//   tag: range, time, provoke (chance a miss angers the animal), pay (the program pays ×)
//   cam: range, shots (a dive), flash, small (pay × for animals under 15 cm)
//   fins: swim (cruising ×), sprint (sprinting ×)
//   tank: air (s), speed (×, a heavy tank slows him)
//   bag: slots
// look: how the game draws it (the old tiers' drawings)
export const KINDS = ['net', 'slurp', 'tag', 'cam', 'fins', 'tank', 'bag'];
export const KIND_NAME = { net: 'Hand nets', slurp: 'Slurp guns', tag: 'Tag guns', cam: 'Cameras', fins: 'Fins', tank: 'Air', bag: 'Bags' };
export const FREE = { net: 'hand', fins: 'rubber', tank: 'al80', bag: 'mesh' }; // what he starts with (the tools 2-4 start empty)
export const SHOP_OF = { catalog: 'The catalog', dave: "Dave's Haul", old: 'The old one' };

export const ITEMS = {
  // ---------- hand nets (key 1) ----------
  hand: { kind: 'net', name: 'Hand net', price: 0, shop: 'catalog', look: 0, line: 'The green net he started with.', good: 'Everyday fish, up to 45 cm',
    range: 1.2, time: 1.0, maxLen: 0.45, success: 0.65, harm: 0.15, noise: 0.01 },
  dip: { kind: 'net', name: 'Aquarium dip net', price: 35, shop: 'catalog', look: 1, tag: 'Gentle', line: "Knotless mesh that won't split a fin.", good: 'Fish arrive almost unmarked, so they sell for more', bad: 'Anything over 25 cm',
    range: 1.3, time: 0.8, maxLen: 0.25, success: 0.75, harm: 0.03, noise: 0.01 },
  bait: { kind: 'net', name: 'Bait-ball net', price: 120, shop: 'catalog', look: 1, tag: 'Three at once', line: 'A wide, shallow net for schooling fish.', good: 'Up to three schooling fish (to 35 cm) in one sweep', bad: 'Slow to swing, and rough on fish',
    range: 1.4, time: 1.5, maxLen: 0.35, success: 0.72, harm: 0.25, noise: 0.012, multi: 3 },
  long: { kind: 'net', name: 'Long-handle net', price: 260, shop: 'catalog', look: 2, tag: 'Long reach', line: 'A telescopic pole and a deep bag.', good: 'Reaching a fish before it bolts', bad: 'Quick fish up close: it swings slowly',
    range: 2.4, time: 1.45, maxLen: 0.6, success: 0.72, harm: 0.12, noise: 0.015 },
  coarse: { kind: 'net', name: 'Coarse game net', price: 900, shop: 'catalog', look: 3, tag: 'Big fish', line: 'Big mesh on a heavy hoop.', good: 'Big fish, 30 cm to 1.1 m', bad: 'Small fish slip through',
    range: 1.5, time: 1.2, minLen: 0.3, maxLen: 1.1, success: 0.72, harm: 0.14, noise: 0.015 },
  pronet: { kind: 'net', name: 'Pro capture net', price: 3500, shop: 'dave', look: 3, tag: 'Quick and gentle', line: 'A D-frame with a padded rim and a clear rubber bag.', good: 'Fish up to 1.1 m, quick and gentle',
    range: 2.4, time: 0.6, maxLen: 1.1, success: 0.93, harm: 0.04, noise: 0.008 },
  master: { kind: 'net', name: "Master's net", price: 28000, shop: 'old', look: 3, tag: 'Anything', line: 'Woven from something that is not rope.', good: 'Anything up to two metres, unharmed',
    range: 2.8, time: 0.6, maxLen: 2.0, success: 0.96, harm: 0.02, noise: 0.004 },
  // ---------- slurp guns (key 2) ----------
  slurp: { kind: 'slurp', name: 'Slurp gun', price: 75, shop: 'catalog', look: 0, line: 'A clear tube and a spring plunger.', good: 'Small, fast fish up to 20 cm',
    range: 1.8, time: 2.0, maxLen: 0.2, success: 0.85, harm: 0.05, noise: 0.005 },
  sipper: { kind: 'slurp', name: 'Shrimp sipper', price: 300, shop: 'catalog', look: 0, tag: 'Tiny animals', line: 'A thin barrel and a soft plunger.', good: 'Tiny animals up to 8 cm, unharmed, a quick reload', bad: 'Anything bigger',
    range: 1.6, time: 0.9, maxLen: 0.08, success: 0.92, harm: 0, noise: 0.004 },
  proslurp: { kind: 'slurp', name: 'Pro slurp gun', price: 1400, shop: 'dave', look: 1, line: 'A longer barrel, a stronger spring, a pistol grip.', good: 'Fish up to 28 cm, from further off',
    range: 2.6, time: 1.2, maxLen: 0.28, success: 0.95, harm: 0.03, noise: 0.004 },
  // ---------- tag guns (key 3) ----------
  pole: { kind: 'tag', name: 'Pole tagger', price: 160, shop: 'catalog', look: 0, line: 'A dart on a pole, driven by a rubber sling.', good: "Big animals you can't bring up", bad: 'You have to get close',
    range: 2.5, time: 4, provoke: 0.5, pay: 1 },
  pneumatic: { kind: 'tag', name: 'Pneumatic tag gun', price: 2500, shop: 'dave', look: 1, line: 'Air-powered, accurate to six metres.', good: 'Big animals barely notice',
    range: 6, time: 3, provoke: 0.25, pay: 1 },
  satellite: { kind: 'tag', name: 'Satellite tag gun', price: 40000, shop: 'old', look: 2, line: 'Pop-up tags that report for months.', good: 'The program pays double',
    range: 10, time: 3, provoke: 0.15, pay: 2 },
  // ---------- cameras (key 4) ----------
  compact: { kind: 'cam', name: 'Waterproof compact', price: 50, shop: 'catalog', look: 0, line: 'A yellow plastic camera with a flash.', good: 'First photographs of each species',
    range: 8, shots: 5, flash: true },
  macro: { kind: 'cam', name: 'Macro camera', price: 400, shop: 'catalog', look: 0, tag: 'Small animals pay more', line: 'A close-up lens and a ring light.', good: 'Animals under 15 cm pay one and a half times', bad: 'Range only 2 m',
    range: 2, shots: 8, flash: true, small: 1.5 },
  housed: { kind: 'cam', name: 'Housed camera', price: 2500, shop: 'dave', look: 1, line: 'A real camera in an aluminium housing, two strobes on arms.', good: '24 shots a dive, range 12 m',
    range: 12, shots: 24, flash: true },
  lowlight: { kind: 'cam', name: 'Low-light camera', price: 12000, shop: 'dave', look: 2, line: 'A huge sensor that needs no flash.', good: 'Nothing in the dark sees you take the picture',
    range: 12, shots: 24, flash: false },
  // ---------- fins ----------
  rubber: { kind: 'fins', name: 'Rubber fins', price: 0, shop: 'catalog', line: 'Standard blades.', good: 'Everyday swimming', swim: 1, sprint: 1.5 },
  split: { kind: 'fins', name: 'Split fins', price: 70, shop: 'catalog', line: 'Blades split down the middle.', good: 'Easy cruising', bad: 'A weaker sprint', swim: 1.25, sprint: 1.4 },
  longfin: { kind: 'fins', name: 'Long-blade fins', price: 250, shop: 'catalog', line: 'Long, stiff blades.', good: 'Faster cruising and sprint', swim: 1.4, sprint: 1.7 },
  jet: { kind: 'fins', name: 'Jet fins', price: 900, shop: 'catalog', tag: 'A strong sprint', line: 'Heavy vented rubber.', good: 'A strong sprint, for getting away', bad: 'No faster cruising', swim: 1.1, sprint: 2.2 },
  carbon: { kind: 'fins', name: 'Carbon fins', price: 3000, shop: 'dave', line: 'Carbon fibre blades.', good: 'The fastest fins', swim: 1.9, sprint: 1.95 },
  monofin: { kind: 'fins', name: 'Monofin', price: 9000, shop: 'old', line: 'One wide blade, both feet in it, like a tail.', good: 'Faster than anything that swims near him', swim: 2.5, sprint: 1.95 },
  // ---------- air ----------
  al80: { kind: 'tank', name: 'Aluminium 80', price: 0, shop: 'catalog', line: 'Dented, honest.', good: 'About 50 s of air', air: 50, speed: 1 },
  s100: { kind: 'tank', name: 'Steel 100', price: 25, shop: 'catalog', line: 'A heavier steel cylinder.', good: 'About 70 s of air', air: 70, speed: 1 },
  s130: { kind: 'tank', name: 'Steel 130', price: 90, shop: 'catalog', line: 'A big high-pressure cylinder.', good: 'About 95 s of air', bad: 'A little slower', air: 95, speed: 0.97 },
  twin: { kind: 'tank', name: 'Twin set', price: 350, shop: 'catalog', line: 'Two cylinders on a manifold.', good: 'About 2 min 20 s of air', bad: 'Slower', air: 140, speed: 0.92 },
  sidemount: { kind: 'tank', name: 'Sidemount pair', price: 1100, shop: 'catalog', line: 'Two tanks slung along his sides.', good: 'About 2 min 20 s of air, with no slowing', air: 140, speed: 1 },
  ccr: { kind: 'tank', name: 'Closed-circuit rebreather', price: 2500, shop: 'dave', line: 'Recycles every breath.', good: 'About 3 min 20 s of air, and no bubbles', air: 200, speed: 1, quiet: true },
  // ---------- bags ----------
  mesh: { kind: 'bag', name: 'Mesh bag', price: 0, shop: 'catalog', line: 'Clipped to his belt.', good: '5 animals', slots: 5 },
  large: { kind: 'bag', name: 'Large catch bag', price: 60, shop: 'catalog', line: 'A spring-loaded mouth.', good: '7 animals', slots: 7 },
  divided: { kind: 'bag', name: 'Divided specimen bag', price: 400, shop: 'catalog', line: 'A pocket for each.', good: '9 animals; nothing eats anything else', slots: 9 },
  expedition: { kind: 'bag', name: 'Expedition bag', price: 1800, shop: 'dave', line: "Dave's own design, patched twice.", good: '11 animals', slots: 11 },
};
for (const [id, it] of Object.entries(ITEMS)) it.id = id;
export const ITEMS_OF = (kind, shop = null) => Object.values(ITEMS).filter((it) => it.kind === kind && (!shop || it.shop === shop));

// the profile's kit: what he owns of each kind and what he has on. P.kit = { own: { net: [...] }, on: { net: id|null } }
export function kitOf(P) {
  if (!P.kit) P.kit = { own: {}, on: {} };
  const K = P.kit;
  for (const k of KINDS) {
    if (!K.own[k]) K.own[k] = FREE[k] ? [FREE[k]] : [];
    if (FREE[k] && !K.own[k].includes(FREE[k])) K.own[k].unshift(FREE[k]);
    if (K.on[k] === undefined) K.on[k] = FREE[k] || null;
    if (K.on[k] && !K.own[k].includes(K.on[k])) K.on[k] = FREE[k] || null;
  }
  return K;
}
export const ownsItem = (P, id) => { const it = ITEMS[id]; return !!it && kitOf(P).own[it.kind].includes(id); };
export const worn = (P, kind) => { const id = kitOf(P).on[kind]; return id ? ITEMS[id] : null; };
export function giveItem(P, id, putOn = false) { const it = ITEMS[id], K = kitOf(P); if (!K.own[it.kind].includes(id)) K.own[it.kind].push(id); if (putOn) K.on[it.kind] = id; }
export function putOn(P, id) { const it = ITEMS[id]; if (it && ownsItem(P, id)) kitOf(P).on[it.kind] = id; }
export function takeOff(P, kind) { if (!FREE[kind]) kitOf(P).on[kind] = null; } // the free things (net, fins, tank, bag) always have one on
