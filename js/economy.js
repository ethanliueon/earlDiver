import { VERSION as GAME_VERSION } from './version.js';
import { ITEMS, kitOf, worn as wornItem, skillLv, hasLegend, setOn } from './items.js';
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
  { name: 'Steel 100', air: 90, price: 280, desc: 'Heavier steel cylinder, more gas.' },
  { name: 'Steel 130', air: 140, price: 5000, desc: 'A big high-pressure steel tank.' },
  { name: 'Twin set', air: 200, price: 59000, desc: 'Two cylinders on a manifold.' },
  { name: 'Closed-circuit rebreather', air: 300, price: 450000, desc: 'Recycles every breath. No bubbles: almost nothing to hear.', quiet: true },
];
export const FINS = [
  { name: 'Rubber fins', speed: 1, price: 0, desc: 'Standard blades.' },
  { name: 'Long-blade fins', speed: 1.15, price: 800, desc: 'Stiffer, longer blades. +15 % speed.' },
  { name: 'Carbon freediving fins', speed: 1.3, price: 19000, desc: 'Carbon fibre. +30 % speed.' },
];
// The eight submersibles the yard sells (one per level of the 'depth' upgrade): rating, the mean depth
// she gives way at as a multiple of it (hidden, drawn fresh each dive; the window narrows on deeper,
// better-built hulls), and the cabin air she carries. Relics add 100 m each to the rating.
export const SUBS = [
  // (4.14.0) each sub comes with everything built in: speed, sink and rise (+10 % a step, compounding), the
  // chambers' rating and the open tank; there are no separate upgrades for them
  { name: 'Б-7 bathyscaphe', rated: 300, crush: 1.6, o2: 180, speed: 1, ballast: 0, rating: 300, tank: 3, price: 0 },
  { name: 'Б-7М refit', rated: 500, crush: 1.55, o2: 210, speed: 1.3, ballast: 0.1, rating: 500, tank: 5, price: 500 },
  { name: 'Work submersible', rated: 900, crush: 1.5, o2: 260, speed: 1.5, ballast: 0.21, rating: 900, tank: 7, price: 3000 },
  { name: 'Heavy work submersible', rated: 1300, crush: 1.45, o2: 300, speed: 1.75, ballast: 0.331, rating: 1300, tank: 9, price: 12000 },
  { name: 'Research submersible', rated: 1900, crush: 1.38, o2: 340, speed: 2, ballast: 0.4641, rating: 1900, tank: 12, price: 30000 }, // (4.18.0: was $40,000; the mid-depths pay less now exotics are met as rarely as they should be)
  { name: 'Deep research submersible', rated: 2500, crush: 1.32, o2: 360, speed: 2.4, ballast: 0.6105, rating: 2500, tank: 15, price: 100000 },
  { name: 'Titanium research submersible', rated: 3300, crush: 1.28, o2: 390, speed: 2.7, ballast: 0.7716, rating: 3300, tank: 19, price: 170000 }, // (4.19.1: was $220,000)
  { name: 'Full-ocean-depth submersible', rated: 4500, crush: 1.25, o2: 420, speed: 3, ballast: 0.9487, rating: 4500, tank: 24, price: 320000 }, // (4.19.1: was $450,000: a trip below 2,500 m pays little more than one at 1,700 m, so the last hulls took sixteen trips)
];
export const SUB_TIERS = SUBS; // (old name)
// No hull survives the bottom of the pit (5,100 m): she always goes before 5,080 m.
export const CRUSH_CEILING = 5080;
// the mean crush multiple for a rating (relics take her past the last sub: ~x1.2 at 4,400 m)
export function crushMean(rated) {
  const T = [...SUBS.map((x) => [x.rated, x.crush]), [4400, 1.2]];
  if (rated <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (rated <= T[i][0]) { const [a, ca] = T[i - 1], [b, cb] = T[i]; return ca + (cb - ca) * (rated - a) / (b - a); }
  return 1.2;
}
// one dive's hidden crush multiple: a bell around the mean whose width shrinks with the margin
export function rollCrush(rated, rnd = Math.random) {
  const m = crushMean(rated), w = m - 1;
  let n = 0; for (let i = 0; i < 6; i++) n += rnd();
  const c = Math.min(Math.max(m + (n - 3) * w * 0.24, 1 + w * 0.5), 1 + w * 1.5);
  return Math.min(c, CRUSH_CEILING / rated);
}
// add-ons for the submersible (bought once)
export const SUB_ADDONS = {
  quiet: { name: 'Quiet engine', price: 1600, desc: 'Rubber-mounted motors and a slower prop. The sub makes half the noise down there.' },
  bigTank: { inRoom: true, name: 'Large pressure tank', price: 4500, desc: 'A long steel pressure cylinder in the tank room: three animals, or one big one, held at their own pressure.' },
  sonar: { name: 'Seafloor sonar', price: 2400, desc: 'A sonar head under the sphere. In the cabin, a strip under the radar draws the seafloor below and around the sub, and how far down it is.' },
};
// ---------------- catching gear ----------------
// range: reach beyond his hand (m) · time: sweep / reload (s) · maxLen: biggest animal (m)
// success: chance on a calm animal · harm: condition it costs the animal · noise: attention below 200 m
export const NETS = [
  { name: 'Hand net', price: 0, range: 1.2, time: 1.0, maxLen: 0.45, success: 0.65, harm: 0.15, noise: 0.01,
    desc: 'A small green nylon net on a short aluminium handle.' },
  { name: 'Fine-mesh net', price: 130, range: 1.5, time: 0.8, maxLen: 0.60, success: 0.78, harm: 0.08, noise: 0.01,
    desc: 'Soft knotless mesh that does not split fins. Lighter, quicker.' },
  { name: 'Long-handle net', price: 2400, range: 2.4, time: 1.1, maxLen: 0.85, success: 0.82, harm: 0.10, noise: 0.015,
    desc: 'A telescopic pole and a deep bag. Reach animals before they bolt.' },
  { name: 'Pro capture net', price: 43500, range: 2.4, time: 0.6, maxLen: 1.10, success: 0.93, harm: 0.04, noise: 0.008,
    desc: 'D-frame with a padded rim and a clear rubber bag, as public aquaria use.' },
];
export const SLURPS = [
  { name: 'Slurp gun', price: 530, range: 1.8, time: 2.0, maxLen: 0.20, success: 0.85, harm: 0.05, noise: 0.005,
    desc: 'A clear tube and a spring plunger. Sucks in small fish, even fast ones.' },
  { name: 'Pro slurp gun', price: 14000, range: 2.5, time: 1.2, maxLen: 0.28, success: 0.95, harm: 0.03, noise: 0.004,
    desc: 'Longer barrel, stronger spring, a one-way valve and a pistol grip.' },
];
// Tag guns: put a research tag on an animal too big to bring up. provoke: chance a miss (or a
// clumsy hit) turns an aggressive animal on him. pay: multiplier on what the program pays.
export const TAGGERS = [
  { name: 'Pole tagger', price: 1600, range: 2.5, time: 4, provoke: 0.5, pay: 1, desc: 'A tag dart on the end of a pole, driven by a rubber sling. You have to get close.' },
  { name: 'Pneumatic tag gun', price: 35500, range: 6, time: 3, provoke: 0.25, pay: 1, desc: 'Air-powered, accurate to six metres. Big animals barely notice.' },
  { name: 'Satellite tag gun', price: 225000, range: 10, time: 3, provoke: 0.15, pay: 2, desc: 'Fires pop-up satellite tags that report for months. The program pays double.' },
];
// Cameras: the institute pays for the first photograph of each species (and each rare form).
export const CAMERAS = [
  { name: 'Waterproof compact', price: 280, range: 8, shots: 5, flash: true, desc: 'A yellow plastic compact. Five pictures a dive, and a flash.' },
  { name: 'Housed camera', price: 11000, range: 12, shots: 24, flash: true, desc: 'A real camera in an aluminium housing, with two strobes on arms.' },
  { name: 'Low-light camera', price: 120000, range: 12, shots: 24, flash: false, desc: 'A huge sensor that needs no flash. Nothing in the dark sees you take the picture.' },
];
// Box traps on a line from a buoy, set from the surface at a chosen depth (or let down to rest on the
// bottom). The bait works for five minutes: count is how many fish come in over that time. size is the
// box [width, height] in metres; line: how it hangs (a string, a line, a rope); winch: hauled with
// the boat's winch, not by hand; lure: a light that draws deep animals, and other things.
export const TRAP_ORDER = ['pot', 'fish', 'steel', 'cage'];
export const TRAPS = {
  pot: { name: 'Wire pot', price: 40, max: 3, maxDepth: 40, count: [4, 8], holds: 8, maxLen: 0.5, size: [0.6, 0.45], line: 'string', funnels: 1,
    desc: 'A small galvanised wire box with one funnel and a bait bag, on a thin line from an orange float..' },
  fish: { name: 'Fish trap', price: 450, max: 3, maxDepth: 150, count: [5, 9], holds: 9, maxLen: 0.9, size: [1.0, 0.7], line: 'line', funnels: 2,
    desc: 'A larger mesh box with a funnel at each end, on a stout line..' },
  steel: { name: 'Steel pot', price: 6000, max: 2, maxDepth: 500, count: [3, 6], holds: 10, maxLen: 1.4, size: [1.5, 1.0], line: 'rope', funnels: 2, winch: true,
    desc: 'A heavy steel-framed pot with two chambers, on a thick rope.. Too heavy to lift by hand.' },
  cage: { name: 'Deep cage', price: 90000, max: 2, maxDepth: 1500, count: [3, 7], holds: 12, maxLen: 2.0, size: [1.4, 2.0], line: 'rope', funnels: 2, winch: true, lure: true,
    desc: 'A tall weighted cage with a lit lure, on a heavy rope.. The light draws deep animals, and other things.' },
};
export const BAGS = [
  { name: 'Mesh goody bag', slots: 3, price: 0, desc: 'Clipped to his belt.' },
  { name: 'Large catch bag', slots: 5, price: 220, desc: 'A bigger mesh bag with a spring-loaded mouth.' },
  { name: 'Divided specimen bag', slots: 8, price: 5000, desc: 'Separate pockets, so nothing eats anything else.' },
];
export const SUB_TANKS = [
  { slots: 4, price: 0 },
  { slots: 8, price: 2400 },
  { slots: 12, price: 43500 },
];
export const CANISTERS = { name: 'Pressure canisters', price: 1200, desc: 'Sealed steel canisters that keep a deep animal at the pressure it lives at. No barotrauma on the way up.' };
// what things weigh (kg) - a heavy load slows him and costs air
export const WEIGHT = { iron: 4, rock: 3, clam: 0.8, mussel: 0.3, kelp: 0.5, glass: 1, tentacle: 0.5, ink: 0.2, scale: 0, pearl: 0, sapphire: 0.5, coral: 0.3, nodule: 1.5, bone: 2 };

// The sub's claw, in three steps. reach: how far from the claw (m) · maxLen: biggest animal (m) ·
// out/back: seconds to reach and to fold back · green/amber: half-widths of the grip zones ·
// sweep: how fast the gauge marker moves (slower is easier)
export const ARMS = [
  { name: 'Claw arm', price: 90000, reach: 3, maxLen: 1.0, out: 1.1, back: 1.1, green: 0.06, amber: 0.18, sweep: 1.4,
    desc: 'Hydraulics for the old claw under the sphere. Slow, short, and the grip needs care.' },
  { name: 'Hydraulic arm', price: 225000, reach: 4.5, maxLen: 1.4, out: 0.7, back: 0.8, green: 0.09, amber: 0.22, sweep: 1.1,
    desc: 'New rams and a telescoping forearm: further, quicker, and a surer grip.' },
  { name: 'Heavy-lift arm', price: 750000, reach: 6, maxLen: 2.0, out: 0.45, back: 0.6, green: 0.12, amber: 0.26, sweep: 0.85,
    desc: 'A three-jointed work-class arm with padded jaws. Takes animals up to two metres.' },
];
export const PATCH_PRICE = 25;      // +40 % hull integrity
export const HOSPITAL_SHARE = 0.10;  // a death costs this share of cash...
export const HOSPITAL_CAP = 10000;    // ...but never more than this
// a replacement sub after an implosion: built to the same rating, a share of what it cost
export function replacementPrice(P) {
  // a share of what the subs up to this one cost (the first is cheap to replace)
  let c = 0; for (let i = 0; i < lv(P, 'depth'); i++) c += UPGRADES.depth.costs[i];
  return Math.max(40, Math.round(c * 0.3 + 40));
}
export const SUPPLIES = {
  lure: { name: 'Anglerfish lure', price: 5000, max: 1, // (4.0.0) sold only at the station and Dave's
    desc: 'Thrown (Q). The thing in the deep follows its light for a while. You carry one.' },
  necklace: { name: 'Glow stick', price: 370, max: 1, desc: 'A chemical glow stick on a lanyard, snapped to light (E): 90 s of warm amber light around Earl, and in the sub it lights her and the water round her. It does not keep anything away, and a light can be seen. Used up once snapped.' },
  tag: { name: 'Basic tags', price: 5, max: 3, needs: 'tagger', desc: 'Research darts for the tag gun: for common, uncommon and rare animals, and big tag-only animals under two metres.' },
  tagAdv: { name: 'Advanced tags', price: 200, max: 3, needs: 'tagger', desc: 'Satellite tags with a wider spread and a faint glow: needed for exotic, legendary and undocumented animals, and anything tag-only two metres long or more.' },
  bait: { name: 'Bait canister', price: 150, max: 3, desc: "A perforated steel canister of minced fish, clipped into the trawl net's mouth. While the net tows, the animals around it follow the scent in instead of scattering from the sub. One goes out with each net." }, // (4.20.0)
  airTank: { name: 'Backup air tank', price: 300, max: 3, slots: 'airTanks', desc: 'Kept in the sub (R): three seconds to connect, then it refills the cabin air to full. The sub carries two.' },
};
// how many of a supply can be carried (some depend on an upgrade)
export const supplyMax = (P, k) => k === 'airTank' ? 2 : Math.min(99, SUPPLIES[k].slots ? statValue(P, SUPPLIES[k].slots) : SUPPLIES[k].max); // (4.12.0) two backup tanks, always // (4.5.0) two backup tanks at most

// ---------------- prices ----------------
// What the buyers on the radio pay for each kind of thing, before the market moves.
export const GOODS = {
  clam: { name: 'Clam', price: 2.4 },
  mussel: { name: 'Mussels', price: 1.2 },
  rock: { name: 'Rock', price: 0.48 },
  kelp: { name: 'Kelp', price: 0.72 },
  iron: { name: 'Scrap iron', price: 12 },
  scale: { name: 'Fish scales', price: 1.2 },
  tentacle: { name: 'Squid tentacle', price: 24 },
  ink: { name: 'Ink sac', price: 36 },
  pearl: { name: 'Pearl', price: 370 },
  glass: { name: 'Glass sponge', price: 160 },
  sapphire: { name: 'Deep sapphire', price: 2400 },
  nodule: { name: 'Manganese nodule', price: 75 },
  bone: { name: 'Whalebone', price: 130 },
  lure: { name: 'Anglerfish lure', price: 130 },
  necklace: { name: 'Fangtooth necklace', price: 220 },
};
export const SATURATE = 0.15;       // each sale knocks this much off the next one
const RECOVER_PER_SEC = 0.004;      // the market forgets: ~4 minutes to recover from a glut

// ---------------- upgrades: small steps, always another one ----------------
// Every stat is levelled one step at a time; each step costs a little more than the last
// (cost x growth^level). value = base + step x level. needs: the gear it belongs to.
// fmt: how to show the value.
// Each upgrade climbs from base to top in a few levels. Like the rods of a fishing game, every level
// costs a good deal more than the last and gives a bigger jump: the gains grow about 1.5x a level (tiny
// at first, large at the end; see statValue), the price `cost x growth^level`. Upgrades that add a
// whole thing (bag space, tanks, chambers) go +1 a level (lin); camera shots go in steps (vals). The
// depth rating is a whole new submersible each level (vals: its rating; SUBS below: the rest).
export const UPGRADES = {
  // trade: better buyers for what he brings up
  payFish:   { group: 'Diver', name: 'Fish prices', base: 1, top: 3, max: 10, cost: 15, growth: 1.8, fmt: 'pay' },
  paySalvage:{ group: 'Diver', name: 'Salvage prices', base: 1, top: 2, max: 8, cost: 10, growth: 1.7, fmt: 'pay' },
  // the diver
  air:       { group: 'Diver', name: 'Air', base: 50, top: 200, max: 9, cost: 8, growth: 1.75, fmt: 's' },
  sprint:    { group: 'Diver', name: 'Sprint', base: 1.5, top: 1.95, max: 10, cost: 10, growth: 1.7, fmt: 'x' },
  swim:      { group: 'Diver', name: 'Swim speed', base: 1, top: 2.5, max: 10, cost: 15, growth: 1.75, fmt: 'x' },
  bag:       { group: 'Diver', name: 'Bag space', base: 5, lin: 1, max: 6, cost: 20, growth: 2, fmt: 'n' },
  // the net
  netSize:   { group: 'Net', name: 'Net size', base: 0.45, top: 1.2, max: 10, cost: 10, growth: 1.7, fmt: 'cm' },
  netReach:  { group: 'Net', name: 'Net reach', base: 1.2, top: 2.6, max: 10, cost: 10, growth: 1.7, fmt: 'm' },
  netSpeed:  { group: 'Net', name: 'Swing speed', base: 1.0, top: 0.52, max: 10, cost: 10, growth: 1.7, fmt: 'sec' },
  netGrip:   { group: 'Net', name: 'Catch odds', base: 0.65, top: 0.95, max: 10, cost: 12, growth: 1.7, fmt: '%' },
  netSoft:   { group: 'Net', name: 'Gentle mesh', base: 0.15, top: 0.03, max: 10, cost: 12, growth: 1.7, fmt: 'harm' },
  // the slurp gun
  slurpSize: { group: 'Slurp gun', needs: 'slurp', name: 'Barrel size', base: 0.2, top: 0.36, max: 8, cost: 15, growth: 1.7, fmt: 'cm' },
  slurpReach:{ group: 'Slurp gun', needs: 'slurp', name: 'Suction reach', base: 1.8, top: 2.8, max: 8, cost: 15, growth: 1.7, fmt: 'm' },
  slurpSpeed:{ group: 'Slurp gun', needs: 'slurp', name: 'Reload', base: 2.0, top: 1.0, max: 8, cost: 15, growth: 1.7, fmt: 'sec' },
  // the tag gun
  tagReach:  { group: 'Tag gun', needs: 'tagger', name: 'Range', base: 2.5, top: 10, max: 10, cost: 25, growth: 1.7, fmt: 'm' },
  tagReload: { group: 'Tag gun', needs: 'tagger', name: 'Reload', base: 4, top: 1.6, max: 10, cost: 25, growth: 1.7, fmt: 'sec' },
  tagPay:    { group: 'Tag gun', needs: 'tagger', name: 'Better tags', base: 1, top: 2.2, max: 10, cost: 30, growth: 1.75, fmt: 'x' },
  tagCalm:   { group: 'Tag gun', needs: 'tagger', name: 'Clean shots', base: 0.5, top: 0.14, max: 10, cost: 25, growth: 1.7, fmt: 'provoke' },
  // the camera
  camShots:  { group: 'Camera', needs: 'camera', name: 'Shots a dive', base: 5, vals: [5, 6, 7, 9, 11, 14, 17, 21, 25, 30], max: 9, cost: 10, growth: 1.6, fmt: 'n' },
  camRange:  { group: 'Camera', needs: 'camera', name: 'Range', base: 8, top: 13, max: 10, cost: 12, growth: 1.7, fmt: 'm' },
  // the submersible
  ballast:   { group: 'Submersible', name: 'Ballast', base: 0, top: 1.44, max: 10, cost: 25, growth: 1.7, fmt: 'bonus' },
  depth:     { group: 'Submersible', name: 'A deeper submersible', base: 300, vals: [300, 500, 900, 1300, 1900, 2500, 3300, 4500], costs: [500, 3000, 12000, 30000, 100000, 170000, 320000], max: 7, fmt: 'depth' }, // (4.14.0)
  subSpeed:  { group: 'Submersible', name: 'Engine', base: 1, lin: 0.04, max: 50, cost: 236, growth: 1.1, fmt: 'x' }, // (4.13.0) fifty small steps to 3x, about $275,000 in all
  airTanks:  { group: 'Submersible', name: 'Tank rack', base: 1, lin: 1, max: 2, cost: 60, growth: 3, fmt: 'n' },
  pressTanks: { group: 'Submersible', name: 'Pressure chambers', base: 1, lin: 1, max: 5, costs: [100, 1000, 5000, 20000, 60000], fmt: 'n' }, // (4.13.0) bought one at a time in the chamber room
  pressRating: { group: 'Submersible', name: 'Chamber rating', base: 400, top: 4000, max: 10, cost: 60, growth: 1.75, fmt: 'depth' },
  subTank:   { group: 'Submersible', name: 'Open tank', base: 3, vals: [3, 6, 9, 12, 16, 20, 24], max: 6, cost: 60, growth: 2, fmt: 'n' }, // (3.2.1) up to 24 places, in bigger steps
  // the claw
  armReach:  { group: 'Claw', needs: 'arm', name: 'Reach', base: 3, top: 6, max: 10, cost: 40, growth: 1.7, fmt: 'm' },
  armSize:   { group: 'Claw', needs: 'arm', name: 'Jaw size', base: 1.0, top: 2.0, max: 10, cost: 40, growth: 1.7, fmt: 'cm' },
  armSpeed:  { group: 'Claw', needs: 'arm', name: 'Hydraulics', base: 1.1, top: 0.5, max: 10, cost: 40, growth: 1.7, fmt: 'sec' },
  armGrip:   { group: 'Claw', needs: 'arm', name: 'Grip window', base: 0.06, top: 0.14, max: 10, cost: 40, growth: 1.7, fmt: 'win' },
};
// The eight submersibles the depth upgrade buys: the cabin air comes with the boat, not an upgrade
// (the best holds five minutes).
// (4.18.0) enough for each hull to reach her rating and come straight back up on the cabin air alone (measured
// from her speed and ballast); time down there comes from the backup tanks
export const SUB_AIR = SUBS.map((s) => s.o2);
// Suits: bought once at the boat, one worn at a time (changed at the boat).
// press: depth at which the pressure starts to eat his air · air: air use · speed: swimming speed ·
// bite: injury taken off a shark or billfish bite · quiet: no bubbles (the entity hears less) ·
// warm: keeps out the cold (deep and upwelling water) · col: how it is drawn
export const SUITS = {
  wet: { line: "Black neoprene, salt-stiff at the seams.", name: 'Wetsuit', price: 0, press: 100, air: 1, speed: 1, desc: 'Black neoprene. What he started with.' },
  skin: { line: "Thin as a seal's hide: quick, and hungry for breath.", name: 'Freediving skin', price: 160, press: 100, air: 1.1, speed: 1.15, desc: 'A thin, slick suit: much faster through the water, but it works him harder.' },
  dry: { line: "Sealed against the cold that lives below the light.", name: 'Drysuit', price: 1200, press: 130, air: 1, speed: 1.06, warm: true, desc: 'Sealed and dry inside, with a little air in it. Pressure starts to bite 100 m deeper, and it keeps out the cold.' },
  chain: { line: "Steel rings, borrowed from the men who feed sharks.", name: 'Chain-mail shark suit', price: 2400, press: 100, air: 1, speed: 1.04, bite: 1, desc: 'Steel mesh over neoprene, as shark feeders wear. A bite does one less injury, and the weight gives each kick a little more drive.' },
  rebreather: { line: "He breathes his air twice, and leaves no bubbles to follow.", name: 'Rebreather suit', price: 19000, press: 100, air: 0.75, speed: 1.1, quiet: true, desc: 'A closed-circuit rig built into the suit: a quarter less air used, and no bubbles: the deep hears him less.' },
  hard: { line: "A small iron room in the shape of a man.", name: 'Atmospheric hardsuit', price: 59000, press: 230, air: 0.9, speed: 1.02, bite: 1, warm: true, desc: 'A walking pressure vessel with jointed limbs. No pressure on him to 700 m, and small thrusters on its back push him along.' },
};
// (2.8.0) the suit he has on, as an item: press (m), air (×), speed (×), bite, warm, quiet, look
export const suitOf = (P) => { const S = (P && worn(P, 'suit')) || ITEMS.wet; return setOn(P, 'bathysphere') ? { ...S, press: S.press + 130 } : S; }; // (3.0.12: +130 m, scaled with the suits)

// what each upgrade is, in a sentence (the shop shows it when you hover the row)
export const UPGRADE_DESC = {
  payFish: 'Better buyers. Every live animal, tag and photograph sells for 5 % more per level.',
  paySalvage: 'Contacts in the scrap trade. Clams, iron, ink, pearls and sapphires sell for 5 % more per level.',
  air: 'A bigger cylinder: 5 more seconds of air per level.',
  sprint: 'Stronger kicks when you sprint (Shift). Sprinting still uses air twice as fast.',
  swim: 'Better fins and technique: +15 % everyday swimming speed per level, at no extra air. 2.5x at level 10.',
  bag: 'One more pocket in the catch bag for a live animal.',
  netSize: 'A wider hoop and a deeper bag: the net takes bigger fish.',
  netReach: 'A longer handle: sweep from further away, before a fish notices you.',
  netSpeed: 'A lighter frame: the swing is quicker, so less time for the fish to slip away.',
  netGrip: 'Practice. A better chance that a sweep actually lands the fish.',
  netSoft: 'Softer, knotless mesh: netted fish are less harmed, so they sell for more.',
  slurpSize: 'A wider barrel: the slurp gun takes slightly bigger fish.',
  slurpReach: 'A stronger spring: it pulls fish in from further away.',
  slurpSpeed: 'A smoother plunger: reloads faster between shots.',
  tagReach: 'More pressure behind the dart: tag from further off.',
  tagReload: 'Reloads faster after a shot.',
  tagPay: 'Better tags that send more data. The research program pays 8 % more per level.',
  tagCalm: 'A cleaner shot. A miss is less likely to turn a shark on you.',
  camShots: 'A bigger memory card: one more picture per dive.',
  camRange: 'A better lens: photograph animals from further away.',
  ballast: 'Bigger ballast tanks and faster pumps: the sub dives and rises 12 % faster per level.',
  depth: 'The yard builds you the next submersible: a deeper rating and more cabin air. Past its rating, the cabin leaks air faster and faster, and the hull is gambling.',
  subSpeed: 'A stronger motor: faster everywhere.',
  subTank: 'A bigger open tank in the back of the sub: three or four more places each time (you start with three, the biggest holds 24).',
  airTanks: 'Room in the sub for one more backup air tank (you start with room for one, up to three).',
  pressTanks: 'One more pressure chamber in the tank room (you start with one). An animal sealed in one is pumped back up to the pressure it was caught at, takes no harm on the way up, and slowly recovers. T in the sub.',
  pressRating: 'Thicker acrylic and stronger seals: every chamber holds 150 m more over the water outside. A chamber keeps an animal at its own pressure until the sub climbs above its home depth less the rating.',
  armReach: 'A longer arm: grab from further off.',
  armSize: 'Bigger jaws: the claw takes bigger animals.',
  armSpeed: 'Better hydraulics: the arm reaches out and back faster.',
  armGrip: 'Finer control: a wider green window on the grip gauge.',
};

// the shop's one line for each upgrade: what it feels like, not what it does
export const UPGRADE_LINE = {
  payFish: 'A better buyer waiting on the quay.',
  paySalvage: 'Friends in the scrapyard.',
  air: 'A deeper breath, carried on his back.',
  sprint: 'Harder kicks, for when something is behind him.',
  swim: 'Longer fins, easier water.',
  bag: 'One more pocket for a living thing.',
  netSize: 'A wider mouth for bigger fish.',
  netReach: 'A longer handle, a quieter approach.',
  netSpeed: 'A lighter frame that swings before the fish can think.',
  netGrip: 'Hands that have done this a thousand times.',
  netSoft: 'Knotless mesh that leaves no marks.',
  slurpSize: 'A wider throat.',
  slurpReach: 'A spring wound tighter.',
  slurpSpeed: 'A plunger that sighs back faster.',
  tagReach: 'More breath behind the dart.',
  tagReload: 'Quicker hands between shots.',
  tagPay: 'Tags that speak longer from the deep.',
  tagCalm: 'A clean shot leaves no grudge.',
  camShots: 'Room for one more face from the dark.',
  camRange: 'Glass that sees farther into the blue.',
  ballast: 'Iron lungs: the sub sinks and climbs like a stone, then a cork.',
  depth: 'Thicker steel between him and the weight of the sea.',
  subSpeed: 'A stronger heart in the engine room.',
  subTank: 'A longer tank, and room for three or four more.',
  airTanks: 'Another steel bottle strapped behind the seat.',
  pressTanks: "Clear blue cylinders that keep the deep's own weight on what you bring up.",
  pressRating: 'Walls that hold back a little more of the sea.',
  armReach: 'A longer reach into the dark.',
  armSize: 'Bigger jaws on the old claw.',
  armSpeed: 'Hydraulics that answer quicker.',
  armGrip: 'A gentler, surer hand.',
};

// one-off gear: bought once, then its stats are levelled above
export const GEAR = {
  slurp: { name: 'Slurp gun', price: 75, desc: 'A clear tube and a spring plunger. Sucks in small fish, even fast ones. Key 2.' },
  tagger: { name: 'Tag gun', price: 160, desc: 'Puts a research tag in sharks, billfish, whales: anything too big to bring up. Key 3.' },
  camera: { name: 'Camera', price: 50, desc: 'The institute pays for the first photograph of every species and rare form. Key 4.' },
  lowlight: { line: 'See in the dark without being seen.', name: 'Low-light sensor', price: 2400, needs: 'camera', desc: 'No flash any more: nothing in the dark sees you take the picture.' },
  arm: { name: 'Claw hydraulics', price: 2400, desc: 'Works the old claw under the sub: from inside, Space reaches for an animal; time the grip.' },
};
// ---------------- old gold coins ----------------
// A second currency, only from the deep: animals caught below 500 m when they are sold (1 a head,
// 2 below 1,500 m, 3 below 2,500 m, one more for a rare form), the old one's trades, and sapphires.
// They are never turned into cash: they buy her wares, the deepest refits and the abyss tank.
export function coinsFor(spec) { return 0; // (3.0.0) old gold coins are gone
}
function coinsForOld(spec) {
  if (!spec || spec.cond <= 0.05) return 0;
  const f = spec.from || 0;
  const base = f >= 2500 ? 3 : f >= 1500 ? 2 : f >= 500 ? 1 : 0;
  return base ? base + (spec.variant ? 1 : 0) : 0;
}
// the deepest refits also cost coins: 1 each to 2,600 m, 2 to 3,200 m, 3 to 3,800 m, then 4
export function upgradeCoins(P, id) { return 0; // (3.0.0) no coins
}
function upgradeCoinsOld(P, id) {
  if (id !== 'depth' && id !== 'tHull') return 0;
  const next = statAt('depth', lv(P, 'depth') + 1);
  return next > 2000 ? Math.ceil((next - 2000) / 600) : 0;
}
// what the old one keeps in her cave, for coins
export const WARES = {
  oldlure: { name: 'An old lure', coins: 2, max: 3, line: 'A lure that has hung in the dark longer than the boat has floated.', desc: 'Burns two and a half times as long as a common lure (25 s), and the deep follows it farther. Thrown first with Q.' },
  blessing: { name: 'The old one\'s blessing', coins: 2, line: 'The old one breathes on you. The deep looks away, for a while.', desc: 'For the rest of this dive, the entity notices you half as fast.' },
  eye: { name: 'A sapphire eye', coins: 8, once: true, line: 'A blue stone that turns toward its own kind.', desc: 'Deep sapphires within 150 m show on the sonar as blue points. Kept for good.' },
};
// (never past the top level: an old save may hold more levels than an upgrade now has)
// ---------------- upgrade tracks (v2.0.15) ----------------
// The shop sells 14 tracks instead of 39 separate stats: one ladder per tool or part, and each step
// on a ladder improves every stat it covers together. A stat's level follows from its track's
// (stat level = track level / track max × stat max, rounded); a step costs what the stat steps it
// covers used to cost, so the whole ladder costs what the separate stats did. Since 2.2.0 the ladders
// are short (4-6 steps): each step moves its stats about two levels, so every purchase is felt.
export const TRACKS = {
  tTank:     { group: 'Diver', name: 'Air tank', stats: ['air'], max: 5, line: 'More air for every dive' },
  tFins:     { group: 'Diver', name: 'Fins', stats: ['swim', 'sprint'], max: 5, line: 'He swims and sprints faster' },
  tBag:      { group: 'Diver', name: 'Catch bag', stats: ['bag'], max: 6, line: 'Room for more animals' },
  tBuyers:   { group: 'Buyers', name: 'Buyers', stats: ['payFish', 'paySalvage'], max: 5, line: 'Better prices for everything he sells' },
  tNet:      { group: 'Net', name: 'Hand net', stats: ['netSize', 'netReach', 'netSpeed', 'netGrip', 'netSoft'], max: 5, line: 'Bigger, longer, quicker, surer, gentler' },
  tSlurp:    { group: 'Slurp gun', needs: 'slurp', name: 'Slurp gun', stats: ['slurpSize', 'slurpReach', 'slurpSpeed'], max: 4, line: 'Bigger catches, longer reach, faster reload' },
  tTag:      { group: 'Tag gun', needs: 'tagger', name: 'Tag gun', stats: ['tagReach', 'tagReload', 'tagPay', 'tagCalm'], max: 5, line: 'Range, reload, better-paying tags, cleaner shots' },
  tCam:      { group: 'Camera', needs: 'camera', name: 'Camera', stats: ['camShots', 'camRange'], max: 5, line: 'More shots a dive, longer range' },
  tHull:     { group: 'Submersible', name: 'Submersible', stats: ['depth'], max: 7, line: 'The next hull: deeper, more cabin air' },
  tEngine:   { retired: true, group: 'Submersible', name: 'Engine', stats: ['subSpeed', 'ballast'], max: 50, line: 'Faster, and quicker to sink and rise: fifty small steps' },
  tChambers: { retired: true, group: 'Submersible', name: 'Chamber rating', stats: ['pressRating'], max: 4, line: 'Chamber walls that hold more pressure' },
  tPress:    { inRoom: true, group: 'Submersible', name: 'Pressure chamber', stats: ['pressTanks'], max: 5, line: 'One more chamber (bought in the chamber room)' }, // (4.13.0)
  tOpen:     { retired: true, group: 'Submersible', name: 'Open tank', stats: ['subTank'], max: 6, line: 'Room for more animals in the sub' },
  tRack:     { retired: true, group: 'Submersible', name: 'Backup air rack', stats: ['airTanks'], max: 2, line: 'Racks for more backup air tanks' },
  tClaw:     { retired: true, group: 'Claw', needs: 'arm', name: 'Claw', stats: ['armReach', 'armSize', 'armSpeed', 'armGrip'], max: 5, line: 'Reach, jaw size, hydraulics, grip' },
};
export const TRACK_OF = Object.fromEntries(Object.entries(TRACKS).flatMap(([t, T]) => T.stats.map((sid) => [sid, t])));
const mapLevel = (sid, t, l) => Math.round(l / TRACKS[t].max * UPGRADES[sid].max);
// an old save's separate stat levels become track levels: the average progress of the stats on it
function migrateTracks(P) {
  P.tlv = {};
  for (const [t, T] of Object.entries(TRACKS)) {
    const f = T.stats.reduce((a, sid) => a + Math.min(1, ((P.lv && P.lv[sid]) || 0) / UPGRADES[sid].max), 0) / T.stats.length;
    P.tlv[t] = Math.round(f * T.max);
  }
}
// 2.2.0 halved most ladders (each step now covers about two of the old ones, at their summed price):
// a save from before keeps its progress along each ladder
const OLD_TRACK_MAX = { tTank: 9, tFins: 10, tBag: 6, tBuyers: 10, tNet: 8, tSlurp: 8, tTag: 8, tCam: 8, tHull: 7, tEngine: 10, tChambers: 8, tOpen: 6, tRack: 2, tClaw: 8 };
function rescaleTracks(P) {
  for (const [t, m] of Object.entries(OLD_TRACK_MAX)) if (P.tlv[t]) P.tlv[t] = Math.min(TRACKS[t].max, Math.round(P.tlv[t] / m * TRACKS[t].max));
  P.tlvV = 2;
}
export const tlv = (P, t) => {
  if (!P.tlv) { migrateTracks(P); P.tlvV = 2; } else if (P.tlvV !== 2) rescaleTracks(P);
  // (4.13.0) chambers split off the rating (bought in the chamber room), and the engine in fifty steps: an old save keeps what it had
  if (P.tlvCh !== 1) { P.tlvCh = 1; if (P.tlv.tPress == null) P.tlv.tPress = P.tlv.tChambers || 0; P.tlv.tEngine = Math.min(50, (P.tlv.tEngine || 0) * 10); }
  return Math.min(P.tlv[t] || 0, TRACKS[t].max);
};
// (3.0.0) the diver's, the tools' and the buyers' upgrades are scrapped (the gear is the upgrade): their levels
// count as nothing, even on an old save. The sub's yard (hull, engine, chambers, tanks, rack) and the claw stay.
const SCRAPPED = new Set(['Diver', 'Buyers', 'Net', 'Slurp gun', 'Tag gun', 'Camera']);
// (3.0.0) how deep a hull the yard can build: 500 m at first; finding the research station brings the plans
// for hulls to 1,300 m; meeting Dave, his deep hulls beyond (levels of the depth track: 300, 500, 900, 1300, ...)
export const hullCap = (P) => ((P && P.daveVisits) ? 99 : (P && P.stationFound) ? 3 : 1);
// (4.14.0) what each sub has built in, by its hull: these stats are the sub's own, not upgrades
const BAKED = { subSpeed: 'speed', ballast: 'ballast', pressRating: 'rating', subTank: 'tank' };
const hullOf = (P) => Math.min(SUBS.length - 1, tlv(P, 'tHull'));
export const lv = (P, id) => {
  if (BAKED[id]) return Math.round(hullOf(P) / (SUBS.length - 1) * UPGRADES[id].max); // (for the sub's drawing)
  if (id === 'tClaw') return owns(P, 'arm') ? TRACKS.tClaw.max : 0; // the claw: fixed at its best once the hydraulics are fitted
  if (TRACK_OF[id] === 'tClaw') return owns(P, 'arm') ? UPGRADES[id].max : 0;
  if (TRACKS[id]) return SCRAPPED.has(TRACKS[id].group) ? 0 : tlv(P, id);
  const t = TRACK_OF[id];
  if (t && SCRAPPED.has(TRACKS[t].group)) return 0;
  if (t) return Math.min(mapLevel(id, t, tlv(P, t)), UPGRADES[id].max);
  return Math.min((P.lv && P.lv[id]) || 0, UPGRADES[id] ? UPGRADES[id].max : Infinity);
};
// a stat at a level: from vals, +1 a level (lin), or base to top with gains growing 1.12x a level
const GAIN = 1.12; // (2.2.0: was 1.5, whose first steps were too small to feel)
export function statAt(id, l) {
  const U = UPGRADES[id];
  if (U.vals) return U.vals[Math.min(l, U.vals.length - 1)];
  if (U.lin) return U.base + U.lin * l;
  return U.base + (U.top - U.base) * (Math.pow(GAIN, l) - 1) / (Math.pow(GAIN, U.max) - 1);
}
// (2.6.0) air, swimming, sprint and the bag come from what he has on, not a ladder
export const statValue = (P, id) => { if (BAKED[id]) return SUBS[hullOf(P)][BAKED[id]]; const o = itemStat(P, id); return o != null ? o : statAt(id, lv(P, id)); };
// ---------------- the kit (2.8.0): what he has on, and its skills ----------------
// air, swimming, sprint and the bag come from the items on him; skills stack across everything worn
export const kit = (P) => kitOf(P);
export const worn = (P, kind) => wornItem(P, kind);
function itemStat(P, id) {
  if (!P || (id !== 'air' && id !== 'swim' && id !== 'sprint' && id !== 'bag')) return null;
  if (id === 'air') return Math.min(300, worn(P, 'tank').air * (1 + 0.1 * skillLv(P, 'rebreathing')) * (setOn(P, 'sealab') ? 1.5 : 1));
  if (id === 'swim') return worn(P, 'fins').swim * (worn(P, 'tank').speed || 1) * (1 + 0.06 * skillLv(P, 'haste'));
  if (id === 'sprint') return worn(P, 'fins').sprint;
  return worn(P, 'bag').slots + skillLv(P, 'pockets');
}
const roundCost = (c) => (c < 10 ? Math.round(c * 100) / 100 : c < 100 ? Math.round(c * 4) / 4 : Math.round(c));
const statStepCost = (id, l) => { const U = UPGRADES[id]; return U.costs ? U.costs[Math.min(l, U.costs.length - 1)] : U.cost * Math.pow(U.growth, l); };
// the next step's price: of a track (every stat step it covers), or of a single stat
export function upgradeCost(P, id) {
  if (TRACKS[id]) {
    const T = TRACKS[id], l = tlv(P, id);
    let c = 0;
    for (const sid of T.stats) for (let k = mapLevel(sid, id, l); k < mapLevel(sid, id, l + 1); k++) c += statStepCost(sid, k);
    return roundCost(Math.max(c, 1));
  }
  return roundCost(statStepCost(id, lv(P, id)));
}
export const owns = (P, k) => {
  if (k === 'slurp') return !!worn(P, 'slurp');
  if (k === 'tagger') return !!worn(P, 'tag');
  if (k === 'camera') return !!worn(P, 'cam');
  if (k === 'lowlight') { const c = worn(P, 'cam'); return !!c && c.flash === false; }
  return !!(P.gear && P.gear[k]);
};
const trim = (t) => t.replace(/\.?0+$/, '');
// a stat shown the way people read it
export function fmtStat(id, v) {
  const f = UPGRADES[id].fmt;
  if (f === 's') return `${Math.round(v)} s`;
  if (f === 'x') return `x${trim(v.toFixed(3))}`; // (three places: the first levels add very little, and should show it)
  if (f === 'n') return `${Math.round(v)}`;
  if (f === 'cm') return `${Math.round(v * 100)} cm`;
  if (f === 'm') return `${v.toFixed(v < 10 ? 2 : 1).replace(/0$/, '')} m`;
  if (f === 'sec') return `${v.toFixed(2)} s`;
  if (f === '%') return `${Math.round(v * 100)} %`;
  if (f === 'harm') return `${Math.round(v * 100)} % harm`;
  if (f === 'provoke') return `${Math.round(v * 100)} % provoke`;
  if (f === 'win') return `${Math.round(v * 200)} % window`;
  if (f === 'depth') return `${Math.round(v)} m`;
  if (f === 'pay') return `+${trim(((v - 1) * 100).toFixed(1))} %`;
  if (f === 'bonus') return `+${trim((v * 100).toFixed(1))} %`;
  return String(v);
}
const sumLv = (P, ids) => ids.reduce((a, id) => a + lv(P, id), 0);
// what each tool does right now, from its levels (look: which drawing to use as it improves)
export function gear(P, kind) {
  const v = (id) => statValue(P, id);
  if (kind === 'net' || kind === 'slurp' || kind === 'tag' || kind === 'cam') {
    // the tool he has on, with every skill he wears added in (2.8.0)
    const it = worn(P, kind) || ITEMS[{ net: 'hand', slurp: 'slurp', tag: 'pole', cam: 'compact' }[kind]];
    const d = Object.assign({ noise: 0.01, success: 0.9, harm: 0.04 }, it), L = (k) => skillLv(P, k);
    if (d.success != null) d.success = Math.min(0.98, d.success + 0.04 * L('performance'));
    if (d.provoke != null) d.provoke = Math.max(0.05, d.provoke * (1 - 0.1 * L('performance')));
    if (d.maxLen != null) d.maxLen = +(d.maxLen * (1 + 0.1 * L('oversized'))).toFixed(2);
    if (d.range != null) d.range = +(d.range * (1 + 0.1 * L('overreaching'))).toFixed(2);
    if (d.time != null) d.time = Math.max(0.3, d.time * (1 - 0.08 * L('quickdraw')));
    if (d.shots != null) d.shots += 2 * L('shutterbug');
    if (d.pay != null) d.pay *= 1 + 0.1 * L('scholar');
    if (d.harm != null && setOn(P, 'reef')) d.harm = 0; // the Reef Keeper set: nothing he catches is harmed
    return d;
  }
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
    v: 1, tlvCh: 1, cash: 0, lifetime: 0, tank: 0, fins: 0, subTier: 0, subLost: false, hull: 1, addons: {},
    lv: {}, gear: {}, caught: [], tagger: -1, camera: -1, photos: [], traps: { pot: 1, fish: 0, steel: 0, cage: 0 }, // one beginner's wire pot
    journal: [], notes: '', runs: 0, deaths: 0, deepest: 0, market: {}, created: Date.now(), coins: 0,
  };
}
// ---------------- saves ----------------
// Three save slots in the browser's localStorage, each { format, game, saved, profile }. The format
// number lets later versions convert an older save (migrate); a save that can't be read is reported
// as damaged, never crashes the game. Saving is automatic: saveProfile marks the profile dirty and it
// is written within a second (flushSave writes at once: on leaving the page, dying, quitting).
export const SAVE_FORMAT = 2, SLOTS = 3;
const SLOT_KEY = (n) => `earl.save.slot${n}`, LAST_KEY = 'earl.save.last';
let curSlot = null, pending = null, pendingT = null;
export const getSlot = () => curSlot;
export function setSlot(n) { curSlot = n; try { localStorage.setItem(LAST_KEY, String(n)); } catch (e) { /* storage unavailable */ } }
export function lastSlot() { try { const n = +localStorage.getItem(LAST_KEY); return n >= 1 && n <= SLOTS ? n : null; } catch (e) { return null; } }
// bring any readable save up to the current format: fill in whatever it lacks from a new profile
export function migrate(data) {
  if (!data || typeof data !== 'object' || !data.profile || typeof data.profile !== 'object') return null;
  const fresh = newProfile(), P = Object.assign({}, fresh, data.profile);
  for (const k of ['lv', 'gear', 'addons', 'market', 'traps']) if (!P[k] || typeof P[k] !== 'object' || Array.isArray(P[k])) P[k] = fresh[k] || {};
  for (const k of ['caught', 'journal', 'photos']) if (!Array.isArray(P[k])) P[k] = [];
  for (const k of ['cash', 'coins', 'lifetime', 'runs', 'deaths', 'deepest']) if (typeof P[k] !== 'number' || !isFinite(P[k])) P[k] = fresh[k] || 0;
  P.format = SAVE_FORMAT;
  return P;
}
// what is in a slot: { state: 'empty' | 'ok' | 'damaged', profile, saved }
export function readSlot(n) {
  let raw = null;
  try { raw = localStorage.getItem(SLOT_KEY(n)); } catch (e) { return { state: 'empty' }; }
  if (!raw) return { state: 'empty' };
  try { const data = JSON.parse(raw), P = migrate(data); return P ? { state: 'ok', profile: P, saved: data.saved || 0 } : { state: 'damaged' }; }
  catch (e) { return { state: 'damaged' }; }
}
export function deleteSlot(n) { try { localStorage.removeItem(SLOT_KEY(n)); } catch (e) { /* storage unavailable */ } if (curSlot === n) pending = null; }
function write(p) {
  if (!curSlot || !p) return;
  try { localStorage.setItem(SLOT_KEY(curSlot), JSON.stringify({ format: SAVE_FORMAT, game: GAME_VERSION, saved: Date.now(), profile: p })); }
  catch (e) { /* storage full or unavailable: the game goes on */ }
}
export function flushSave() { if (pendingT) { clearTimeout(pendingT); pendingT = null; } if (pending) { write(pending); pending = null; } }
export function loadProfile() { return null; } // a profile comes from the title screen's slot (readSlot)
export function saveProfile(p) {
  if (!p) return false;
  const best = loadBest();
  if ((p.deepest || 0) > best) { try { localStorage.setItem(BEST_KEY, String(Math.round(p.deepest))); } catch (e) { /* storage unavailable */ } }
  pending = p;
  if (!pendingT) pendingT = setTimeout(() => { pendingT = null; if (pending) { write(pending); pending = null; } }, 800);
  return true;
}
export function loadBest() { try { return +(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; } }
export function clearProfile() { if (curSlot) deleteSlot(curSlot); }

// ---------------- the market ----------------
// (v2: no more market softening: every fish sells for its price however many you bring. The market
// record of older saves is simply cleared.)
export function marketTick(p) { if (p.market && Object.keys(p.market).length) p.market = {}; }
export function priceOf(p, kind, base) { return base; }
// Sell n of something; each sale goes on the Margaret's price board (the last 14 kinds sold)
export function sell(p, kind, n, base, label) {
  let total = base * n;
  total = Math.round(total * 100) / 100;
  if (n > 0) { const b = (p.board || []).filter((r) => r.k !== kind); b.unshift({ k: kind, label, each: Math.round(base * 100) / 100, t: Date.now() }); p.board = b.slice(0, 14); }
  // (4.19.4) a sub bought on credit: half of every sale goes to the yard until it is paid
  let owed = 0; if (p.debt > 0 && total > 0) { owed = Math.min(p.debt, Math.round(total * 50) / 100); p.debt = Math.round((p.debt - owed) * 100) / 100; }
  p.cash = Math.round((p.cash + total - owed) * 100) / 100;
  p.lifetime = Math.round((p.lifetime + total) * 100) / 100;
  return { label, n, total, owed };
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
