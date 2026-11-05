// The money side of the game: the save (what survives death), prices, the market, and the
// catalogue of things Earl can buy at the boat.
//
// What persists between runs lives in the *profile*: cash, upgrades, the journal, notes, the
// market. A run (one life, one generated ocean) holds only what Earl is carrying and has not sold.

// Nothing about a game is saved: every page load is a fresh start. Within one sitting, cash and
// gear carry over from one dive to the next (and through death). Only the deepest depth ever
// reached is remembered between visits.
const BEST_KEY = 'earlDiver.best.v1';

// ---------------- upgrades ----------------
// Diver tanks: seconds of air at the surface rate.
export const TANKS = [
  { name: 'Aluminium 80', air: 50, price: 0, desc: 'The tank he started with. Dented, honest.' },
  { name: 'Steel 100', air: 90, price: 10, desc: 'Heavier steel cylinder, more gas.' },
  { name: 'Steel 130', air: 140, price: 60, desc: 'A big high-pressure steel tank.' },
  { name: 'Twin set', air: 200, price: 400, desc: 'Two cylinders on a manifold.' },
  { name: 'Closed-circuit rebreather', air: 300, price: 3000, desc: 'Recycles every breath. No bubbles: almost nothing to hear.', quiet: true },
];
export const FINS = [
  { name: 'Rubber fins', speed: 1, price: 0, desc: 'Standard blades.' },
  { name: 'Long-blade fins', speed: 1.15, price: 20, desc: 'Stiffer, longer blades. +15 % speed.' },
  { name: 'Carbon freediving fins', speed: 1.3, price: 150, desc: 'Carbon fibre. +30 % speed.' },
];
// Submersible hull ratings. Past 1.3x rated depth it implodes.
export const SUB_TIERS = [
  { rated: 400, o2: 150, price: 0 },
  { rated: 700, o2: 200, price: 50 },
  { rated: 1000, o2: 260, price: 400 },
  { rated: 1500, o2: 330, price: 1500 },
  { rated: 2000, o2: 420, price: 3500 },
  { rated: 2700, o2: 540, price: 6000 },
  { rated: 3000, o2: 660, price: 10000 },
];
// add-ons for the submersible (bought once)
export const SUB_ADDONS = {
  recall: { name: 'Recall unit', price: 100, desc: 'An acoustic link to the autopilot. Called with C, the sub comes 1.5× faster.' },
  quiet: { name: 'Quiet engine', price: 400, desc: 'Rubber-mounted motors and a slower prop. The sub makes half the noise down there.' },
};
// ---------------- catching gear ----------------
// range: reach beyond his hand (m) · time: sweep / reload (s) · maxLen: biggest animal (m)
// success: chance on a calm animal · harm: condition it costs the animal · noise: attention below 200 m
export const NETS = [
  { name: 'Hand net', price: 0, range: 1.2, time: 1.0, maxLen: 0.45, success: 0.65, harm: 0.15, noise: 0.01,
    desc: 'A small green nylon net on a short aluminium handle.' },
  { name: 'Fine-mesh net', price: 5, range: 1.5, time: 0.8, maxLen: 0.60, success: 0.78, harm: 0.08, noise: 0.01,
    desc: 'Soft knotless mesh that does not split fins. Lighter, quicker.' },
  { name: 'Long-handle net', price: 40, range: 2.4, time: 1.1, maxLen: 0.85, success: 0.82, harm: 0.10, noise: 0.015,
    desc: 'A telescopic pole and a deep bag. Reach animals before they bolt.' },
  { name: 'Pro capture net', price: 300, range: 2.4, time: 0.6, maxLen: 1.10, success: 0.93, harm: 0.04, noise: 0.008,
    desc: 'D-frame with a padded rim and a clear rubber bag, as public aquaria use.' },
];
export const SLURPS = [
  { name: 'Slurp gun', price: 15, range: 1.8, time: 2.0, maxLen: 0.20, success: 0.85, harm: 0.05, noise: 0.005,
    desc: 'A clear tube and a spring plunger. Sucks in small fish, even fast ones.' },
  { name: 'Pro slurp gun', price: 120, range: 2.5, time: 1.2, maxLen: 0.28, success: 0.95, harm: 0.03, noise: 0.004,
    desc: 'Longer barrel, stronger spring, a one-way valve and a pistol grip.' },
];
// Tag guns: put a research tag on an animal too big to bring up. provoke: chance a miss (or a
// clumsy hit) turns an aggressive animal on him. pay: multiplier on what the program pays.
export const TAGGERS = [
  { name: 'Pole tagger', price: 30, range: 2.5, time: 4, provoke: 0.5, pay: 1, desc: 'A tag dart on the end of a pole, driven by a rubber sling. You have to get close.' },
  { name: 'Pneumatic tag gun', price: 250, range: 6, time: 3, provoke: 0.25, pay: 1, desc: 'Air-powered, accurate to six metres. Big animals barely notice.' },
  { name: 'Satellite tag gun', price: 1500, range: 10, time: 3, provoke: 0.15, pay: 2, desc: 'Fires pop-up satellite tags that report for months. The program pays double.' },
];
// Cameras: the institute pays for the first photograph of each species (and each rare form).
export const CAMERAS = [
  { name: 'Waterproof compact', price: 10, range: 8, shots: 5, flash: true, desc: 'A yellow plastic compact. Five pictures a dive, and a flash.' },
  { name: 'Housed camera', price: 100, range: 12, shots: 24, flash: true, desc: 'A real camera in an aluminium housing, with two strobes on arms.' },
  { name: 'Low-light camera', price: 800, range: 12, shots: 24, flash: false, desc: 'A huge sensor that needs no flash. Nothing in the dark sees you take the picture.' },
];
// Traps: set on the bottom, marked by a line to a buoy, hauled up later.
export const TRAPS = {
  pot: { name: 'Wire pot trap', price: 6, max: 3, maxDepth: 200, holds: 2, every: 45, chance: 0.5, maxLen: 0.6,
    desc: 'A galvanised wire cage with a funnel and a bait jar. Crabs, lobsters, eels. Rated to 200 m.' },
  deep: { name: 'Deep trap', price: 300, max: 2, maxDepth: 2000, holds: 4, every: 50, chance: 0.5, maxLen: 0.9,
    desc: 'A steel cylinder with a lit bait chamber, rated to 2,000 m. The light that draws deep fish draws other things too.' },
};
export const BAGS = [
  { name: 'Mesh goody bag', slots: 3, price: 0, desc: 'Clipped to his belt.' },
  { name: 'Large catch bag', slots: 5, price: 8, desc: 'A bigger mesh bag with a spring-loaded mouth.' },
  { name: 'Divided specimen bag', slots: 8, price: 60, desc: 'Separate pockets, so nothing eats anything else.' },
];
export const SUB_TANKS = [
  { slots: 4, price: 0 },
  { slots: 8, price: 40 },
  { slots: 12, price: 300 },
];
export const CANISTERS = { name: 'Pressure canisters', price: 250, desc: 'Sealed steel canisters that keep a deep animal at the pressure it lives at. No barotrauma on the way up.' };
// what things weigh (kg) - a heavy load slows him and costs air
export const WEIGHT = { iron: 4, rock: 3, clam: 0.8, mussel: 0.3, kelp: 0.5, glass: 1, tentacle: 0.5, ink: 0.2, scale: 0, pearl: 0, sapphire: 0.5, coral: 0.3 };

// The sub's claw, in three steps. reach: how far from the claw (m) · maxLen: biggest animal (m) ·
// out/back: seconds to reach and to fold back · green/amber: half-widths of the grip zones ·
// sweep: how fast the gauge marker moves (slower is easier)
export const ARMS = [
  { name: 'Claw arm', price: 600, reach: 3, maxLen: 1.0, out: 1.1, back: 1.1, green: 0.06, amber: 0.18, sweep: 1.4,
    desc: 'Hydraulics for the old claw under the sphere. Slow, short, and the grip needs care.' },
  { name: 'Hydraulic arm', price: 1500, reach: 4.5, maxLen: 1.4, out: 0.7, back: 0.8, green: 0.09, amber: 0.22, sweep: 1.1,
    desc: 'New rams and a telescoping forearm: further, quicker, and a surer grip.' },
  { name: 'Heavy-lift arm', price: 5000, reach: 6, maxLen: 2.0, out: 0.45, back: 0.6, green: 0.12, amber: 0.26, sweep: 0.85,
    desc: 'A three-jointed work-class arm with padded jaws. Takes animals up to two metres.' },
];
export const PATCH_PRICE = 5;      // +40 % hull integrity
export const HOSPITAL_SHARE = 0.10;  // a death costs this share of cash
// a replacement sub after an implosion: built to the same rating, a share of what it cost
export function replacementPrice(P) {
  let c = 0; for (let i = 0; i < lv(P, 'depth'); i++) c += UPGRADES.depth.cost * Math.pow(UPGRADES.depth.growth, i);
  return Math.max(10, Math.round(c * 0.3 + 10));
}
export const SUPPLIES = {
  lure: { name: 'Anglerfish lure', price: 80, max: 3, desc: 'Thrown (Q). The thing in the deep follows its light for a while.' },
  necklace: { name: 'Fangtooth necklace', price: 120, max: 3, desc: 'Worn (E). Keeps it away for 15 s.' },
};

// ---------------- prices ----------------
// What the buyers on the radio pay for each kind of thing, before the market moves.
export const GOODS = {
  clam: { name: 'Clam', price: 0.3 },
  mussel: { name: 'Mussels', price: 0.15 },
  rock: { name: 'Rock', price: 0.05 },
  kelp: { name: 'Kelp', price: 0.1 },
  iron: { name: 'Scrap iron', price: 1.5 },
  scale: { name: 'Fish scales', price: 0.2 },
  tentacle: { name: 'Squid tentacle', price: 3 },
  ink: { name: 'Ink sac', price: 5 },
  pearl: { name: 'Pearl', price: 40 },
  glass: { name: 'Glass sponge', price: 20 },
  sapphire: { name: 'Deep sapphire', price: 150 },
  lure: { name: 'Anglerfish lure', price: 50 },
  necklace: { name: 'Fangtooth necklace', price: 80 },
};
export const SATURATE = 0.15;       // each sale knocks this much off the next one
const RECOVER_PER_SEC = 0.004;      // the market forgets: ~4 minutes to recover from a glut

// ---------------- upgrades: small steps, always another one ----------------
// Every stat is levelled one step at a time; each step costs a little more than the last
// (cost x growth^level). value = base + step x level. needs: the gear it belongs to.
// fmt: how to show the value.
export const UPGRADES = {
  // the diver
  air:       { group: 'Diver', name: 'Air', base: 50, step: 5, max: 50, cost: 0.5, growth: 1.3, fmt: 's' },
  swim:      { group: 'Diver', name: 'Swim speed', base: 1, step: 0.02, max: 20, cost: 1, growth: 1.35, fmt: 'x' },
  bag:       { group: 'Diver', name: 'Bag space', base: 3, step: 1, max: 6, cost: 2, growth: 1.9, fmt: 'n' },
  // the net
  netSize:   { group: 'Net', name: 'Net size', base: 0.45, step: 0.05, max: 15, cost: 0.5, growth: 1.4, fmt: 'cm' },
  netReach:  { group: 'Net', name: 'Net reach', base: 1.2, step: 0.1, max: 14, cost: 0.75, growth: 1.4, fmt: 'm' },
  netSpeed:  { group: 'Net', name: 'Swing speed', base: 1.0, step: -0.04, max: 12, cost: 0.75, growth: 1.4, fmt: 'sec' },
  netGrip:   { group: 'Net', name: 'Catch odds', base: 0.65, step: 0.02, max: 15, cost: 1, growth: 1.4, fmt: '%' },
  netSoft:   { group: 'Net', name: 'Gentle mesh', base: 0.15, step: -0.01, max: 12, cost: 1, growth: 1.45, fmt: 'harm' },
  // the slurp gun
  slurpSize: { group: 'Slurp gun', needs: 'slurp', name: 'Barrel size', base: 0.2, step: 0.02, max: 8, cost: 2, growth: 1.45, fmt: 'cm' },
  slurpReach:{ group: 'Slurp gun', needs: 'slurp', name: 'Suction reach', base: 1.8, step: 0.1, max: 10, cost: 2, growth: 1.4, fmt: 'm' },
  slurpSpeed:{ group: 'Slurp gun', needs: 'slurp', name: 'Reload', base: 2.0, step: -0.1, max: 10, cost: 2, growth: 1.4, fmt: 'sec' },
  // the tag gun
  tagReach:  { group: 'Tag gun', needs: 'tagger', name: 'Range', base: 2.5, step: 0.5, max: 15, cost: 5, growth: 1.35, fmt: 'm' },
  tagReload: { group: 'Tag gun', needs: 'tagger', name: 'Reload', base: 4, step: -0.2, max: 12, cost: 5, growth: 1.35, fmt: 'sec' },
  tagPay:    { group: 'Tag gun', needs: 'tagger', name: 'Better tags', base: 1, step: 0.08, max: 15, cost: 10, growth: 1.4, fmt: 'x' },
  tagCalm:   { group: 'Tag gun', needs: 'tagger', name: 'Clean shots', base: 0.5, step: -0.03, max: 12, cost: 5, growth: 1.35, fmt: 'provoke' },
  // the camera
  camShots:  { group: 'Camera', needs: 'camera', name: 'Shots a dive', base: 5, step: 1, max: 25, cost: 1, growth: 1.3, fmt: 'n' },
  camRange:  { group: 'Camera', needs: 'camera', name: 'Range', base: 8, step: 0.5, max: 10, cost: 2, growth: 1.35, fmt: 'm' },
  // the submersible
  depth:     { group: 'Submersible', name: 'Depth rating', base: 400, step: 50, max: 52, cost: 2, growth: 1.16, fmt: 'depth' },
  subAir:    { group: 'Submersible', name: 'Cabin air', base: 150, step: 15, max: 34, cost: 1, growth: 1.25, fmt: 's' },
  subSpeed:  { group: 'Submersible', name: 'Engine', base: 1, step: 0.03, max: 15, cost: 3, growth: 1.4, fmt: 'x' },
  subTank:   { group: 'Submersible', name: 'Specimen tank', base: 4, step: 1, max: 10, cost: 3, growth: 1.5, fmt: 'n' },
  // the claw
  armReach:  { group: 'Claw', needs: 'arm', name: 'Reach', base: 3, step: 0.25, max: 12, cost: 10, growth: 1.35, fmt: 'm' },
  armSize:   { group: 'Claw', needs: 'arm', name: 'Jaw size', base: 1.0, step: 0.1, max: 10, cost: 10, growth: 1.35, fmt: 'cm' },
  armSpeed:  { group: 'Claw', needs: 'arm', name: 'Hydraulics', base: 1.1, step: -0.06, max: 10, cost: 8, growth: 1.35, fmt: 'sec' },
  armGrip:   { group: 'Claw', needs: 'arm', name: 'Grip window', base: 0.06, step: 0.008, max: 10, cost: 8, growth: 1.35, fmt: 'win' },
};
// one-off gear: bought once, then its stats are levelled above
export const GEAR = {
  slurp: { name: 'Slurp gun', price: 15, desc: 'A clear tube and a spring plunger. Sucks in small fish, even fast ones. Key 2.' },
  tagger: { name: 'Tag gun', price: 30, desc: 'Puts a research tag in sharks, billfish, whales: anything too big to bring up. Key 3.' },
  camera: { name: 'Camera', price: 10, desc: 'The institute pays for the first photograph of every species and rare form. Key 4.' },
  lowlight: { name: 'Low-light sensor', price: 800, needs: 'camera', desc: 'No flash any more: nothing in the dark sees you take the picture.' },
  arm: { name: 'Claw hydraulics', price: 600, desc: 'Works the old claw under the sub: from inside, Space reaches for an animal; time the grip.' },
};
export const lv = (P, id) => (P.lv && P.lv[id]) || 0;
export const statValue = (P, id) => { const U = UPGRADES[id]; return U.base + U.step * lv(P, id); };
export function upgradeCost(P, id) {
  const U = UPGRADES[id], c = U.cost * Math.pow(U.growth, lv(P, id));
  return c < 10 ? Math.round(c * 100) / 100 : c < 100 ? Math.round(c * 4) / 4 : Math.round(c);
}
export const owns = (P, k) => !!(P.gear && P.gear[k]);
// a stat shown the way people read it
export function fmtStat(id, v) {
  const f = UPGRADES[id].fmt;
  if (f === 's') return `${Math.round(v)} s`;
  if (f === 'x') return `x${v.toFixed(2)}`;
  if (f === 'n') return `${Math.round(v)}`;
  if (f === 'cm') return `${Math.round(v * 100)} cm`;
  if (f === 'm') return `${v.toFixed(v < 10 ? 2 : 1).replace(/0$/, '')} m`;
  if (f === 'sec') return `${v.toFixed(2)} s`;
  if (f === '%') return `${Math.round(v * 100)} %`;
  if (f === 'harm') return `${Math.round(v * 100)} % harm`;
  if (f === 'provoke') return `${Math.round(v * 100)} % provoke`;
  if (f === 'win') return `${Math.round(v * 200)} % window`;
  if (f === 'depth') return `${Math.round(v)} m`;
  return String(v);
}
const sumLv = (P, ids) => ids.reduce((a, id) => a + lv(P, id), 0);
// what each tool does right now, from its levels (look: which drawing to use as it improves)
export function gear(P, kind) {
  const v = (id) => statValue(P, id);
  if (kind === 'net') {
    const n = sumLv(P, ['netSize', 'netReach', 'netSpeed', 'netGrip', 'netSoft']);
    return { name: ['Hand net', 'Fine-mesh net', 'Long-handle net', 'Pro capture net'][Math.min(3, Math.floor(n / 12))], look: Math.min(3, Math.floor(n / 12)),
      range: v('netReach'), time: Math.max(0.4, v('netSpeed')), maxLen: v('netSize'), success: Math.min(0.97, v('netGrip')), harm: Math.max(0.02, v('netSoft')), noise: 0.01 };
  }
  if (kind === 'slurp') {
    const n = sumLv(P, ['slurpSize', 'slurpReach', 'slurpSpeed']);
    return { name: n >= 12 ? 'Pro slurp gun' : 'Slurp gun', look: n >= 12 ? 1 : 0, range: v('slurpReach'), time: Math.max(0.8, v('slurpSpeed')), maxLen: v('slurpSize'), success: 0.9, harm: 0.04, noise: 0.005 };
  }
  if (kind === 'tag') {
    const n = sumLv(P, ['tagReach', 'tagReload', 'tagPay', 'tagCalm']);
    return { name: ['Pole tagger', 'Pneumatic tag gun', 'Satellite tag gun'][n < 10 ? 0 : n < 25 ? 1 : 2], look: n < 10 ? 0 : n < 25 ? 1 : 2,
      range: v('tagReach'), time: Math.max(1.2, v('tagReload')), provoke: Math.max(0.1, v('tagCalm')), pay: v('tagPay') };
  }
  if (kind === 'cam') {
    const n = sumLv(P, ['camShots', 'camRange']);
    return { name: owns(P, 'lowlight') ? 'Low-light camera' : n >= 10 ? 'Housed camera' : 'Waterproof compact', look: owns(P, 'lowlight') ? 2 : n >= 10 ? 1 : 0,
      range: v('camRange'), shots: Math.round(v('camShots')), flash: !owns(P, 'lowlight') };
  }
  if (kind === 'arm') {
    const out = Math.max(0.35, v('armSpeed')), green = v('armGrip');
    return { name: 'Claw', reach: v('armReach'), maxLen: v('armSize'), out, back: out, green, amber: green + 0.12, sweep: Math.max(0.7, 1.4 - lv(P, 'armGrip') * 0.05) };
  }
  return null;
}

// ---------------- the profile ----------------
export function newProfile() {
  return {
    v: 1, cash: 0, lifetime: 0, tank: 0, fins: 0, subTier: 0, subLost: false, hull: 1, addons: {},
    lv: {}, gear: {}, caught: [], tagger: -1, camera: -1, photos: [], traps: { pot: 0, deep: 0 },
    journal: [], notes: '', runs: 0, deaths: 0, deepest: 0, market: {}, created: Date.now(),
  };
}
export function loadProfile() { return null; }
// keeps only the deepest depth ever reached
export function saveProfile(p) {
  if (!p) return false;
  const best = loadBest();
  if ((p.deepest || 0) > best) { try { localStorage.setItem(BEST_KEY, String(Math.round(p.deepest))); } catch (e) { /* storage unavailable */ } }
  return true;
}
export function loadBest() { try { return +(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; } }
export function clearProfile() { /* nothing is stored */ }

// ---------------- the market ----------------
// market[kind] = how flooded it is (0 = fresh). It decays back toward 0 in real time.
export function marketTick(p, now = Date.now()) {
  const dt = Math.max(0, (now - (p.marketT || now)) / 1000);
  p.marketT = now;
  for (const k of Object.keys(p.market)) {
    p.market[k] = Math.max(0, p.market[k] - dt * RECOVER_PER_SEC * (1 + p.market[k]));
    if (p.market[k] < 0.001) delete p.market[k];
  }
}
export function priceOf(p, kind, base) {
  const glut = p.market[kind] || 0;
  return base * Math.pow(1 - SATURATE, glut / SATURATE);
}
// Sell n of something. Returns the line items (each sale a little cheaper than the last).
export function sell(p, kind, n, base, label) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += priceOf(p, kind, base);
    p.market[kind] = (p.market[kind] || 0) + SATURATE;
  }
  total = Math.round(total * 100) / 100;
  p.cash = Math.round((p.cash + total) * 100) / 100;
  p.lifetime = Math.round((p.lifetime + total) * 100) / 100;
  return { label, n, total };
}

export function spend(p, amount) {
  if (p.cash + 1e-6 < amount) return false;
  p.cash = Math.round((p.cash - amount) * 100) / 100;
  return true;
}

export function money(v, cents = v < 100) {
  const neg = v < 0; v = Math.abs(v);
  const s = cents ? v.toFixed(2) : Math.round(v).toString();
  const [i, d] = s.split('.');
  return (neg ? '−$' : '$') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
}
