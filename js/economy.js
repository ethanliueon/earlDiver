// The money side of the game: the save (what survives death), prices, the market, and the
// catalogue of things Earl can buy at the boat.
//
// What persists between runs lives in the *profile*: cash, upgrades, the journal, notes, the
// market. A run (one life, one generated ocean) holds only what Earl is carrying and has not sold.

const SAVE_KEY = 'earlDiver.save.v1';

// ---------------- upgrades ----------------
// Diver tanks: seconds of air at the surface rate.
export const TANKS = [
  { name: 'Aluminium 80', air: 50, price: 0, desc: 'The tank he started with. Dented, honest.' },
  { name: 'Steel 100', air: 90, price: 800, desc: 'Heavier steel cylinder, more gas.' },
  { name: 'Steel 130', air: 140, price: 3500, desc: 'A big high-pressure steel tank.' },
  { name: 'Twin set', air: 200, price: 10000, desc: 'Two cylinders on a manifold.' },
  { name: 'Closed-circuit rebreather', air: 300, price: 30000, desc: 'Recycles every breath. No bubbles: almost nothing to hear.', quiet: true },
];
export const FINS = [
  { name: 'Rubber fins', speed: 1, price: 0, desc: 'Standard blades.' },
  { name: 'Long-blade fins', speed: 1.15, price: 1500, desc: 'Stiffer, longer blades. +15 % speed.' },
  { name: 'Carbon freediving fins', speed: 1.3, price: 6000, desc: 'Carbon fibre. +30 % speed.' },
];
// Submersible hull ratings. Past 1.3x rated depth it implodes.
export const SUB_TIERS = [
  { rated: 400, o2: 150, price: 0 },
  { rated: 700, o2: 200, price: 1500 },
  { rated: 1000, o2: 260, price: 5000 },
  { rated: 1500, o2: 330, price: 12000 },
  { rated: 2000, o2: 420, price: 22000 },
  { rated: 2700, o2: 540, price: 35000 },
  { rated: 3000, o2: 660, price: 50000 },
];
// add-ons for the submersible (bought once)
export const SUB_ADDONS = {
  recall: { name: 'Recall unit', price: 2500, desc: 'An acoustic link to the autopilot. Called with C, the sub comes 1.5× faster.' },
  quiet: { name: 'Quiet engine', price: 4000, desc: 'Rubber-mounted motors and a slower prop. The sub makes half the noise down there.' },
};
// ---------------- catching gear ----------------
// range: reach beyond his hand (m) · time: sweep / reload (s) · maxLen: biggest animal (m)
// success: chance on a calm animal · harm: condition it costs the animal · noise: attention below 200 m
export const NETS = [
  { name: 'Hand net', price: 0, range: 1.2, time: 1.0, maxLen: 0.30, success: 0.55, harm: 0.15, noise: 0.01,
    desc: 'A small green nylon net on a short aluminium handle.' },
  { name: 'Fine-mesh net', price: 250, range: 1.5, time: 0.8, maxLen: 0.40, success: 0.70, harm: 0.08, noise: 0.01,
    desc: 'Soft knotless mesh that does not split fins. Lighter, quicker.' },
  { name: 'Long-handle net', price: 1200, range: 2.4, time: 1.1, maxLen: 0.60, success: 0.75, harm: 0.10, noise: 0.015,
    desc: 'A telescopic pole and a deep bag. Reach animals before they bolt.' },
  { name: 'Pro capture net', price: 5000, range: 2.4, time: 0.6, maxLen: 0.90, success: 0.90, harm: 0.04, noise: 0.008,
    desc: 'D-frame with a padded rim and a clear rubber bag, as public aquaria use.' },
];
export const SLURPS = [
  { name: 'Slurp gun', price: 400, range: 1.8, time: 2.0, maxLen: 0.15, success: 0.85, harm: 0.05, noise: 0.005,
    desc: 'A clear tube and a spring plunger. Sucks in small fish, even fast ones.' },
  { name: 'Pro slurp gun', price: 2000, range: 2.5, time: 1.2, maxLen: 0.20, success: 0.95, harm: 0.03, noise: 0.004,
    desc: 'Longer barrel, stronger spring, a one-way valve and a pistol grip.' },
];
export const BAGS = [
  { name: 'Mesh goody bag', slots: 3, price: 0, desc: 'Clipped to his belt.' },
  { name: 'Large catch bag', slots: 5, price: 600, desc: 'A bigger mesh bag with a spring-loaded mouth.' },
  { name: 'Divided specimen bag', slots: 8, price: 2500, desc: 'Separate pockets, so nothing eats anything else.' },
];
export const SUB_TANKS = [
  { slots: 4, price: 0 },
  { slots: 8, price: 3000 },
  { slots: 12, price: 9000 },
];
export const CANISTERS = { name: 'Pressure canisters', price: 3500, desc: 'Sealed steel canisters that keep a deep animal at the pressure it lives at. No barotrauma on the way up.' };
// what things weigh (kg) - a heavy load slows him and costs air
export const WEIGHT = { iron: 4, rock: 3, clam: 0.8, mussel: 0.3, kelp: 0.5, glass: 1, tentacle: 0.5, ink: 0.2, scale: 0, pearl: 0, sapphire: 0.5, coral: 0.3 };

export const PATCH_PRICE = 200;      // +40 % hull integrity
export const HOSPITAL_SHARE = 0.10;  // a death costs this share of cash
export const replacementPrice = (tier) => Math.max(600, Math.round(SUB_TIERS[tier].price * 0.3 + 400));
export const SUPPLIES = {
  lure: { name: 'Anglerfish lure', price: 1200, max: 3, desc: 'Thrown (Q). The thing in the deep follows its light for a while.' },
  necklace: { name: 'Fangtooth necklace', price: 1600, max: 3, desc: 'Worn (E). Keeps it away for 15 s.' },
};

// ---------------- prices ----------------
// What the buyers on the radio pay for each kind of thing, before the market moves.
export const GOODS = {
  clam: { name: 'Clam', price: 3 },
  mussel: { name: 'Mussels', price: 1.5 },
  rock: { name: 'Rock', price: 0.4 },
  kelp: { name: 'Kelp', price: 0.8 },
  iron: { name: 'Scrap iron', price: 12 },
  scale: { name: 'Fish scales', price: 2 },
  tentacle: { name: 'Squid tentacle', price: 25 },
  ink: { name: 'Ink sac', price: 40 },
  pearl: { name: 'Pearl', price: 350 },
  glass: { name: 'Glass sponge', price: 180 },
  sapphire: { name: 'Deep sapphire', price: 5000 },
  lure: { name: 'Anglerfish lure', price: 600 },
  necklace: { name: 'Fangtooth necklace', price: 900 },
};
export const SATURATE = 0.15;       // each sale knocks this much off the next one
const RECOVER_PER_SEC = 0.004;      // the market forgets: ~4 minutes to recover from a glut

// ---------------- the profile ----------------
export function newProfile() {
  return {
    v: 1, cash: 0, lifetime: 0, tank: 0, fins: 0, subTier: 0, subLost: false, hull: 1, addons: {},
    net: 0, slurp: -1, bag: 0, subTank: 0, caught: [],
    journal: [], notes: '', seasons: 1, deaths: 0, deepest: 0, market: {}, created: Date.now(),
  };
}
export function loadProfile() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && p.v === 1 ? Object.assign(newProfile(), p) : null;
  } catch (e) { return null; }
}
export function saveProfile(p) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); return true; } catch (e) { return false; }
}
export function clearProfile() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage unavailable */ } }

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
