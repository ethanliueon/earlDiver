// (5.9.0) Abilities: learned from old scrolls, one carried at a time (the Ability slot on Earl), fired from the arc's
// button. Each family has a rare form, a plus (exotic) and a legendary with its own name; a few come only as exotic and
// legendary (Ironhull), or legendary alone (Tidewarden). A scroll is an item like any other: found in chests (rarer
// than gear) and now and then on the Old One's table, kept in the locker, sold if spare. One cooldown runs for
// whatever is carried: swapping does not reset it.
// (5.16.0) every cooldown counts in real time (it keeps running while the game is paused or closed); nothing is once a
// dive. Ironhull is a rare skill only (Bulwark is gone), Tidewarden legendary only
// (6.1.6) cooldowns set by tier, agreed with the owner: a rare comes back a few times a dive, an exotic about once a dive,
// a legendary about once a session (they count in real time, closed or not)
export const ABILITY_DEFS = {
  sprint: {
    rare: { name: 'Sprint', dur: 20, cd: 120, speed: 1.5, line: '×1.5 speed for 20 s, using no air.' },
    exotic: { name: 'Sprint+', dur: 25, cd: 300, speed: 2, line: '×2 speed for 25 s, using no air.' },
    legendary: { name: 'Riptide', dur: 40, cd: 1800, speed: 3, noAir: true, line: '×3 speed for 40 s, using no air.' }, // (7.4.17, owner) 20 s
    mythical: { name: 'Maelstrom Heart', dur: 60, cd: 1200, speed: 3.5, noAir: true, wake: true, line: '×3.5 speed for 60 s, using no air, and the water lit behind you as you go.' },
  },
  vigor: {
    rare: { name: 'Vigor', dur: 30, cd: 180, reach: 2, line: '×2 net reach for 30 s.' },
    exotic: { name: 'Vigor+', dur: 30, cd: 480, reach: 3, swing: 0.8, line: '×3 net reach and a quicker swing for 30 s.' },
    legendary: { name: 'Apex', dur: 60, cd: 3600, reach: 5, sure: true, bless: true, line: 'For 60 s the net reaches five times as far and cannot miss. What it catches comes back whole, and Blessed.' },
    mythical: { name: 'Leviathan Heart', dur: 90, cd: 2400, reach: 8, sure: true, bless: true, multi: 3, line: 'For 90 s the net reaches eight times as far, cannot miss, and takes up to three animals a swing. All come back whole, and Blessed.' },
  },
  dash: { // (7.5.6, owner) charges: rare 2, exotic 2, legendary 3, mythical 5 dashes, then the rest
    rare: { name: 'Dash', dur: 0.3, cd: 45, dash: 1, zoom: 1, charges: 2, line: 'Two dashes before it rests: tap where to go, and you are there in an instant.' },
    exotic: { name: 'Dash+', dur: 0.3, cd: 120, dash: 2, zoom: 1.4, charges: 3, line: 'Three dashes before it rests: tap where to go, with the water opened wider round you.' },
    legendary: { name: 'Undertow', dur: 0.35, cd: 900, dash: 3, zoom: 2.6, charges: 4, line: 'Four dashes before it rests: tap where to go, the sea opening far round you and bending as you pass.' },
    mythical: { name: 'Riven Heart', dur: 0.35, cd: 1200, dash: 3, zoom: 2.8, charges: 5, line: 'Five dashes before it rests: tap where to go, and again. The sea opens far round you, and tears as you pass.' },
  },
  flare: {
    rare: { name: 'Flare', dur: 30, cd: 300, light: 1, line: '30 s of light 28 m round you. The thing does not see it.' },
    exotic: { name: 'Flare+', dur: 50, cd: 720, light: 1.6, line: '50 s of brighter light, 45 m round you. The thing does not see it.' },
    legendary: { name: 'Lighthouse', dur: 90, cd: 3600, light: 2.4, ward: true, line: '90 s of light 80 m round you, near as bright as the shallows, pulsing, its beams sweeping round. Hunters keep out of it, and the thing does not see it.' },
    mythical: { name: 'Pharos Heart', dur: 120, cd: 1800, light: 3.2, ward: true, line: '120 s of light 110 m round you, brighter than the Lighthouse, three beams sweeping round. Hunters keep out of it, and the thing does not see it.' },
  },
  echo: {
    rare: { name: 'Echo', dur: 30, cd: 480, echo: 1, line: 'A ping through the water: for 30 s some of the exotic animals within 200 m show on the radar.' },
    exotic: { name: 'Echo+', dur: 45, cd: 1200, echo: 2, line: 'A ping through the water: for 45 s some of the exotic and legendary animals within 500 m show on the radar.' },
    legendary: { name: 'Fathom', dur: 90, cd: 5400, echo: 3, line: 'A deep ping: for 90 s most of the exotic and legendary animals within 750 m show on the radar.' },
    mythical: { name: 'Whalesong Heart', dur: 120, cd: 3600, echo: 4, song: true, line: 'A long, deep call that carries through the sea: for 120 s exotic animals show on the radar twice as far round you, and legendary ones brighter, in their own colour.' },
  },
  ironhull: {
    rare: { name: 'Ironhull', dur: 0.5, cd: 3600, repair: true, sub: true, line: 'Mends the sub completely, from inside it.' },
  },
  // (7.4.19, owner) Dauntless: for its time the suit (or the hull) is rated deeper by its multiple, and what pressure
  // does past the old rating is that many times less. A force field round him shows how much of it he is using
  dauntless: {
    rare: { name: 'Dauntless', dur: 25, cd: 1800, press: 1.5, airBack: [0.02, 10], line: 'For 25 s your suit holds to 1.5 times its rated depth, and below that pressure costs you a third less air. Air comes back, 2 % a second for its first 10 s.' },
    exotic: { name: 'Dauntless+', dur: 30, cd: 3600, press: 2, light: 1.6, airBack: [0.03, 15], line: 'For 30 s your suit holds to twice its rated depth, below that pressure costs you half the air, and you have light 45 m round you. Air comes back, 3 % a second for its first 15 s.' },
    legendary: { name: 'Bathysphere', dur: 60, cd: 3600, press: 2.5, beyond: 5, light: 1.6, airBack: [0.05, 20], line: 'For 60 s your suit holds to 2.5 times its rated depth, with light 45 m round you. Deeper still, pressure takes your air 5 times slower. Air comes back, 5 % a second for its first 20 s.' },
    mythical: { name: 'Hadal Heart', dur: 90, cd: 3600, press: 3, beyond: 10, light: 1.6, airBack: [0.1, 30], line: 'For 90 s your suit holds to 3 times its rated depth. Deeper still, pressure takes your air 10 times slower. Air comes back, 10 % a second for its first 30 s.' },
  },
  // (7.6.5, owner) the pure families (docs/PLAN_SKILLS.md): one number each, pushed further than any Heart in that lane;
  // rarer (a third as likely anywhere) and stopping at legendary. pure: true marks them
  breath: {
    rare: { name: 'Breath', pure: true, dur: 20, cd: 600, airNow: 0.25, airSteps: [[0.01, 20]], line: 'A quarter of your air back at once, then a little more each second for 20 s.' },
    exotic: { name: 'Breath+', pure: true, dur: 30, cd: 1200, airNow: 0.5, airSteps: [[0.02, 30]], line: 'Half your air back at once, then 2 % a second for 30 s.' },
    legendary: { name: 'Bellows', pure: true, dur: 90, cd: 3600, airNow: 1, airSteps: [[0.05, 60], [0.02, 90]], line: 'Your air full at once, then 5 % a second for a minute and 2 % a second for half a minute more.' },
  },
  gust: {
    rare: { name: 'Gust', pure: true, dur: 15, cd: 300, speed: 1.6, line: '×1.6 speed for 15 s.' },
    exotic: { name: 'Gust+', pure: true, dur: 20, cd: 900, speed: 2.3, line: '×2.3 speed for 20 s.' },
    legendary: { name: 'Splintering Gale', pure: true, dur: 30, cd: 3600, speed: 4.2, line: '×4.2 speed for 30 s: faster than anything else in the sea.' },
  },
  temper: {
    rare: { name: 'Temper', pure: true, dur: 30, cd: 900, heat: true, press: 1.5, line: 'For 30 s your suit holds to 1.5 times its rated depth.' },
    exotic: { name: 'Temper+', pure: true, dur: 45, cd: 1800, heat: true, press: 2, line: 'For 45 s your suit holds to twice its rated depth.' },
    legendary: { name: 'Adamant', pure: true, dur: 90, cd: 3600, heat: true, press: 3.5, line: 'For 90 s your suit holds to 3.5 times its rated depth: deeper than any Heart.' },
  },
  plunge: {
    rare: { name: 'Plunge', pure: true, dur: 10, cd: 300, sink: 3.2, line: 'An anchor drops and pulls you down for 10 s. Stick up to hold against it.' },
    exotic: { name: 'Plunge+', pure: true, dur: 20, cd: 900, sink: 3.8, line: 'An anchor drops and pulls you down for 20 s, faster. Stick up to hold against it.' },
    legendary: { name: 'Drowned Anchor', pure: true, dur: 30, cd: 2400, sink: 4.6, line: 'A drowned ship\'s anchor drags you down for 30 s, faster than any sprint. Stick up to hold against it.' },
  },
  // (7.6.5, owner) a hybrid: the view drawn out wide, and light round him
  lookout: {
    rare: { name: 'Lookout', dur: 30, cd: 300, zoom: 1.6, light: 1, line: 'For 30 s you see further round you, with light 28 m round you.' },
    exotic: { name: 'Lookout+', dur: 45, cd: 900, zoom: 2.1, light: 1.3, line: 'For 45 s you see much further round you, with brighter light.' },
    legendary: { name: 'Eagle Eye', dur: 90, cd: 3600, zoom: 3, light: 1.6, /* (7.6.26, owner) the view drawn out three times; no lids */ line: 'For 90 s the sea opens far round you, seen through a sharper eye, with bright light.' },
  },
  // (7.6.6, owner) the second batch (docs/PLAN_SKILLS.md): a net thrown at what you tap; taps that catch; the specials
  // (one rarity, few charges); Bloodmoon (an event Heart, only from the Test tab for now); and three for the eye alone
  cast: {
    rare: { name: 'Cast', dur: 4, cd: 300, cast: { range: 8, r: 1.1 }, line: 'Tap where to throw: a net flies there and takes what is in its mouth.' },
    exotic: { name: 'Cast+', dur: 4, cd: 600, cast: { range: 11, r: 1.5 }, line: 'Tap where to throw: a wider net flies further and takes what is in its mouth.' },
    legendary: { name: 'Dragnet', dur: 4, cd: 1800, cast: { range: 15, r: 2.2 }, line: 'Tap where to throw: a great net flies far and fast, and draws shut round a whole group.' },
  },
  snatch: {
    rare: { name: 'Snatch', dur: 30, cd: 300, snatch: 3, snBonus: 0, line: 'For 30 s, tap three fish on screen: each one is caught, every time.' },
    exotic: { name: 'Snatch+', dur: 30, cd: 900, snatch: 5, snBonus: 0.2, line: 'For 30 s, tap five fish on screen: each one is caught, every time.' },
    legendary: { name: 'Talon', dur: 45, cd: 2400, snatch: 8, snBonus: 0.35, zoom: 1.15, light: 1, line: 'For 45 s, tap eight fish on screen: each one is caught, every time. The view is a little wider, and lit.' },
  },
  ironskin: { legendary: { name: 'Ironskin', special: true, maxLoad: 3, dur: 30, cd: 3600, iron: true, line: 'Every injury healed at once; for 30 s no animal can hurt you. Not the thing\'s jaws.' } },
  calm: { legendary: { name: 'Calm', special: true, maxLoad: 3, dur: 30, cd: 7200, calm: true, line: 'While it is not hunting you: the mark is gone, and for 30 s the thing cannot notice you.' } },
  // (7.6.7, owner) the Lure family: fish of the kinds that live at his depth come in from just past the screen's edges on
  // every side and mill round him; more of them, and more exotics, by tier. Hunters notice the commotion
  tidecall: {
    rare: { name: 'Lure', dur: 20, cd: 1800, call: { n: 15, exo: 0.05, leg: 0 }, line: 'Fifteen fish of the kinds that live here come in round you. One in twenty is exotic.' },
    exotic: { name: 'Lure+', dur: 20, cd: 3600, call: { n: 25, exo: 0.07, leg: 0 }, line: 'Twenty-five fish of the kinds that live here come in round you. One in fourteen is exotic.' },
    legendary: { name: 'Tidecall', maxLoad: 2, dur: 20, cd: 5400, call: { n: 40, exo: 0.1, leg: 0 }, line: 'Forty fish of the kinds that live here come in round you, one in ten exotic. Hunters come for them too.' },
  },
  nacre: { exotic: { name: 'Nacre', special: true, maxLoad: 3, dur: 60, cd: 3600, nacre: 0.25, line: 'For 60 s, a chance at a pearl with every catch.' } },
  bloodmoon: { mythical: { name: 'Bloodmoon', special: true, event: true, maxLoad: 1, dur: 60, cd: 21600, blood: true, call: { n: 40, exo: 0.15, leg: 0.02 }, /* (7.6.7, owner) the Lure family's top in all but name */ line: 'For 60 s the water turns to blood and the thing comes for you. Forty fish rush in, one in seven exotic, one in fifty legendary. Everything caught is Cursed: worth five times as much, and it never dies.' } },
  // (7.6.15, owner) Shoal protects: a school swims with him (or round the sub) and throws itself in the way of a hunter's
  // strike (never the thing's): the hunter takes a mouthful of fish instead and breaks off, and the school thins. Sardines,
  // then mackerel, then a court of small lure-lit seadevils whose bite drives the hunter off for longer
  shoal: {
    rare: { name: 'Shoal', dur: 30, cd: 600, shoal: 1, guard: 1, fish: 49, light: 0.6, line: 'For 30 s a school of sardines swims with you and takes one hunter\'s strike for you.' },
    exotic: { name: 'Shoal+', dur: 45, cd: 1200, shoal: 2, guard: 2, fish: 51, light: 0.8, line: 'For 45 s a school of mackerel swims with you and takes two hunters\' strikes for you.' },
    legendary: { name: 'Silverstorm', dur: 60, cd: 2400, shoal: 3, guard: 4, fish: 326, light: 1, line: 'For 60 s a court of lure-lit anglers swims with you, takes four hunters\' strikes and bites back, driving them off.' },
  },
  revel: { // (7.6.7, owner) lantern light as strong as a Flare+, in vivid colours; hunters that can bite keep away from it (never the thing)
    rare: { name: 'Revel', dur: 30, cd: 600, revel: 1, light: 1.6, repel: 15, line: 'For 30 s coloured lantern light 45 m round you. Hunters keep 15 m off.' },
    exotic: { name: 'Revel+', dur: 45, cd: 1200, revel: 2, light: 1.6, repel: 25, line: 'For 45 s brighter lantern colours round you, pulsing in time. Hunters keep 25 m off.' },
    legendary: { name: 'Carnival', dur: 60, cd: 2400, revel: 3, light: 1.6, repel: 40, /* (7.6.11) a Flare+'s light: 2 and over draws the Lighthouse's beams */ line: 'For 60 s the sea becomes a carnival of coloured light, pulsing in time. Hunters keep 40 m off.' },
  },
  // (7.6.8, owner) the pure dash: the diver (or the sub) fades into a squid of the tier's size, jets mantle first along the
  // way he taps, ink spilling behind and the water ahead lit, and fades back; nothing can bite him meanwhile, and a hunter
  // on his trail loses him in the ink
  // (7.6.13, owner) 30 / 45 / 100 m at 80 m/s (the times are the distances at that speed, with a brief kick and stop)
  siphon: {
    rare: { name: 'Siphon', pure: true, dur: 0.42, cd: 600, siphon: { dist: 30, sp: 148, len: 2.2, light: 1 }, line: 'Tap a way: you become a squid and jet 30 m, ink behind you. A hunter on your trail loses you in it.' },
    exotic: { name: 'Siphon+', pure: true, dur: 0.63, cd: 900, siphon: { dist: 45, sp: 149, len: 3.6, light: 1.3 }, line: 'Tap a way: you become a giant squid and jet 45 m, ink behind you, the water round you lit.' },
    legendary: { name: 'Kraken', pure: true, dur: 1.4, cd: 1800, siphon: { dist: 100, sp: 'colossal', len: 5.5, light: 1.6, eyes: true }, line: 'Tap a way: you become the colossal squid, eyes burning, and jet 100 m through a cloud of ink, the water round you lit.' },
  },
  tidewarden: {
    legendary: { name: 'Tidewarden', maxLoad: 1, dur: 4, cd: 28800, ward: true, tide: true, line: 'When the water round you turns red: a wave of blue drives the thing off, and it stays away 5 minutes.' },
    mythical: { name: 'Warden Heart', maxLoad: 1, dur: 4, cd: 10800, ward: true, tide: true, any: true, line: 'Works any time. In red water, a wave of blue drives the thing off for 5 minutes; if you are marked, the mark washes off.' },
  },
};
// (7.4.15, owner) mythical: above legendary, only from three legendaries of the same scroll combined. Each has its own
// power, and every one of them, for the 10 s after it is fired, also gives at least Flare+ light, at least Sprint+ speed
// (the sub too), and air: +5 % of the full a second, up to +50 %, with none lost meanwhile. Usable any time
// (7.7.2, owner) the Echo family by reach and by how much it picks up: a wider ping catches fewer of what is out there,
// so the radar shows a handful of marks, never every rare animal in the sea. [reach m, share of exotics, of legendaries]
export const ECHO = [null, { r: 200, ex: 0.4, leg: 0 }, { r: 500, ex: 0.4, leg: 0.3 }, { r: 750, ex: 0.7, leg: 0.6 }, { r: 1000, ex: 0.85, leg: 0.85 }];
// the same animal is either heard or not for the whole ping (no marks blinking in and out): a hash of the animal
export const echoHears = (lv, rk, key) => { const E = ECHO[Math.max(1, Math.min(4, lv || 1))]; const p = rk === 'legendary' ? E.leg : rk === 'exotic' ? E.ex : 0; if (p <= 0) return false; let h = 2166136261; const s2 = String(key); for (let i = 0; i < s2.length; i++) { h ^= s2.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000 < p; };
export const MYTH = { t: 10, light: 1.6, speed: 2, air: 0.05 };
export const NEXT_TIER = { rare: 'exotic', exotic: 'legendary', legendary: 'mythical' };
export const abilityId = (fam, tier) => `ab_${fam}_${tier}`;
// the definition behind an item id, with its family and tier
export function abilityOf(id) {
  const m = /^ab_([a-z]+)_([a-z]+)$/.exec(id || ''); if (!m) return null;
  const d = ABILITY_DEFS[m[1]] && ABILITY_DEFS[m[1]][m[2]]; return d ? { ...d, fam: m[1], tier: m[2], id } : null;
}
export const ALL_ABILITIES = Object.entries(ABILITY_DEFS).flatMap(([fam, T]) => Object.keys(T).map((tier) => abilityId(fam, tier)));

// ---------- the running state (on g.abil) ----------
// (5.16.0) P.abilReadyAt: the real time (ms) at which it can be used again
export function abilityState(g) { return g.abil || (g.abil = { activeT: 0, maxT: 0, def: null, charges: null, fx: 0 }); }
// (7.4.12, owner) skipping a cooldown with pearls: a flat 1 pearl for every 5 minutes left, rounded up, never less than 1
// (5 min: 1; 30 min: 6; 1 h: 12; 3 h: 36). The same rate however long the wait (7.4.9's cheaper long waits made escaping
// the thing something bought)
// (7.6.3, owner) three times a loaded charge: 3 pearls for every 5 minutes left; loading ahead is the cheap way
export function skipCost(sec) { return 3 * Math.max(1, Math.ceil(Math.max(0, sec) / 300)); }
// (7.6.3, owner) charges, loaded onto a scroll at the surface: 1 pearl for every 5 minutes of its cooldown each; up to 5 on
// a rare or exotic scroll, 10 on a legendary or mythical one, or the scroll's own maxLoad (Tidewarden 1)
export const chargePrice = (A) => Math.max(1, Math.ceil(((A && A.cd) || 300) / 300));
// (7.6.30, owner) charges grow by themselves on the scrolls he wears (7.6.48: no longer in the locker), in real time, the game open or
// closed: the next charge takes the scroll's cooldown times one more than it holds (1x at none, 2x at one ... at most 5x),
// until it is full. Returns how many grew. nextCharge says how long the next one has left (ms), or 0 when full
export function chargeWait(A, n) { return (A.cd || 600) * Math.min(5, n + 1) * 1000; }
// (7.6.48, owner) only a scroll in one of the two skill slots recharges: one in the locker holds where it was (its clock
// is moved on by the time it spends there). worn: the set of uids on
export function growCharges(items, now = Date.now(), worn = null) { let grew = 0;
  for (const q of items || []) { const A = abilityOf(q.id); if (!A) continue; const mx = maxLoad(A); let n = q.load || 0;
    if (worn && !worn.has(q.u)) { if (q.loadAt && q.tickAt && n < mx) q.loadAt += Math.max(0, now - q.tickAt); q.tickAt = now; continue; }
    q.tickAt = now;
    if (n >= mx || !q.loadAt) { q.loadAt = now; continue; }
    while (n < mx && now - q.loadAt >= chargeWait(A, n)) { q.loadAt += chargeWait(A, n); n++; grew++; }
    if (n >= mx) q.loadAt = now; q.load = n; }
  return grew; }
export function nextCharge(q, now = Date.now()) { const A = abilityOf(q.id); if (!A) return 0; const n = q.load || 0; if (n >= maxLoad(A)) return 0; return Math.max(0, (q.loadAt || now) + chargeWait(A, n) - now); }
export const maxLoad = (A) => (A && A.maxLoad) || (A && (A.tier === 'legendary' || A.tier === 'mythical') ? 10 : 5);
// (7.6.47, owner) every skill waits at least 15 s between uses, a loaded charge too (the scroll's own cooldown, when longer,
// still runs as before; a run's own taps, as a dash's charges, are one use)
export const MIN_CD = 15;
export function minLeft(P) { return Math.max(0, ((P.abilMinAt || 0) - Date.now()) / 1000); }
export function cooldownLeft(P) { return Math.max(0, ((P.abilReadyAt || 0) - Date.now()) / 1000); }
// can it be used now? returns null if so, else why not
export function whyNot(g, P, A) {
  if (!A) return 'No ability: put a scroll on in the bag';
  const S = abilityState(g), e = g.earl;
  if (S.activeT > 0 && !A.charges && !(A.loaded > 0)) return 'Already running'; // (7.6.3) a loaded charge restarts it
  if (g.aboard && !A.speed && A.tier !== 'mythical') return 'In the water';
  if (A.sub && !e.inSub) return 'From inside the sub';
  if (A.press && e.inSub) return 'Only in the water'; // (7.4.22, owner) Dauntless is the diver's alone
  if (A.tide && g.kill) return 'Too late'; // (6.0.0) never in its jaws
  if (A.calm && g.entity && (g.entity.state === 'hunt' || g.entity.state === 'stalk' || g.kill || (g.entity.marked && g.entity.dist < 200))) return 'Not while it hunts you'; // (7.6.6, owner)
  if (A.tide && !A.any && !((g.fx && (g.fx.redTint || 0) > 0.03) || (g.entity && g.entity.dist < 160 && (g.entity.marked || g.entity.state === 'hunt' || g.entity.state === 'stalk')))) return 'Only when the water turns red'; // (6.0.0) once its red reaches him
  { const mn = minLeft(P); if (mn > 0 && !(A.charges && S.charges > 0)) return `Ready in ${fmtLeft(mn)}`; }
  const cd = cooldownLeft(P); if (cd > 0 && !(A.charges && S.charges > 0) && !(A.loaded > 0)) return `Ready in ${fmtLeft(cd)}`;
  return null;
}

// (5.16.0) a time left, as the buttons and cards show it: "7h 42m", "12m", "38s"
export function fmtLeft(sec) { sec = Math.ceil(sec); if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`; if (sec >= 60) return `${Math.ceil(sec / 60)}m`; return `${sec}s`; }

// (7.6.71, owner) three skill slots, a button each: slot 1 (the mythic slot) keeps its state in the first places (P.abilReadyAt,
// P.abilMinAt, g.abil, the kit's 'ability'); slots 2 and 3 in their own (…2, …3). What a button does is done with its slot's
// state swapped onto the first's places and swapped back after, so every rule written for one button holds for all three.
// An aim waiting for a tap remembers which button set it (slotNow)
let SLOT = 1;
export const slotNow = () => SLOT;
const blank = () => ({ activeT: 0, maxT: 0, def: null, charges: null, fx: 0 });
function swapSlot(g, P, K, n) { const r = 'abilReadyAt' + n, m = 'abilMinAt' + n, gk = 'abil' + n, kk = 'ability' + n;
  [P.abilReadyAt, P[r]] = [P[r] || 0, P.abilReadyAt || 0]; [P.abilMinAt, P[m]] = [P[m] || 0, P.abilMinAt || 0];
  if (g) { const S1 = abilityState(g); g.abil = g[gk] || blank(); g[gk] = S1; }
  if (K && K.on) [K.on.ability, K.on[kk]] = [K.on[kk] || null, K.on.ability || null];
}
export function withSlot(g, P, K, n, fn) { if (n === 1 || SLOT === n) return fn(); if (SLOT !== 1) throw new Error('nested slot'); swapSlot(g, P, K, n); SLOT = n; try { return fn(); } finally { SLOT = 1; swapSlot(g, P, K, n); } }
export const withSlot2 = (g, P, K, fn) => withSlot(g, P, K, 2, fn);
