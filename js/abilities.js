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
    rare: { name: 'Vigor', dur: 30, cd: 180, reach: 1.5, line: '×1.5 net reach for 30 s.' },
    exotic: { name: 'Vigor+', dur: 30, cd: 480, reach: 2, swing: 0.8, line: '×2 net reach and a quicker swing for 30 s.' },
    legendary: { name: 'Apex', dur: 60, cd: 3600, reach: 2.5, sure: true, bless: true, line: 'For 60 s the net reaches two and a half times as far and cannot miss. What it catches comes back whole, and Blessed.' },
    mythical: { name: 'Leviathan Heart', dur: 90, cd: 2400, reach: 3, sure: true, bless: true, multi: 3, line: 'For 90 s the net reaches three times as far, cannot miss, and takes up to three animals a swing. All come back whole, and Blessed.' },
  },
  dash: { // (7.5.6, owner) charges: rare 2, exotic 2, legendary 3, mythical 5 dashes, then the rest
    rare: { name: 'Dash', dur: 0.3, cd: 45, dash: 1, zoom: 1, charges: 2, line: 'Two dashes before it rests: tap where to go, and you are there in an instant.' },
    exotic: { name: 'Dash+', dur: 0.3, cd: 120, dash: 2, zoom: 1.4, charges: 2, line: 'Two dashes before it rests: tap where to go, with the water opened wider round you.' },
    legendary: { name: 'Undertow', dur: 0.35, cd: 900, dash: 3, zoom: 2, charges: 3, line: 'Three dashes before it rests: tap where to go, the sea opening far round you and bending as you pass.' },
    mythical: { name: 'Riven Heart', dur: 0.35, cd: 1200, dash: 3, zoom: 2.2, charges: 5, line: 'Five dashes before it rests: tap where to go, and again. The sea opens far round you, and tears as you pass.' },
  },
  flare: {
    rare: { name: 'Flare', dur: 30, cd: 300, light: 1, line: '30 s of light 28 m round you. The thing does not see it.' },
    exotic: { name: 'Flare+', dur: 50, cd: 720, light: 1.6, line: '50 s of brighter light, 45 m round you. The thing does not see it.' },
    legendary: { name: 'Lighthouse', dur: 90, cd: 3600, light: 2.4, ward: true, line: '90 s of light 80 m round you, near as bright as the shallows, pulsing, its beams sweeping round. Hunters keep out of it, and the thing does not see it.' },
    mythical: { name: 'Pharos Heart', dur: 120, cd: 1800, light: 3.2, ward: true, line: '120 s of light 110 m round you, brighter than the Lighthouse, three beams sweeping round. Hunters keep out of it, and the thing does not see it.' },
  },
  echo: {
    rare: { name: 'Echo', dur: 30, cd: 480, echo: 1, line: 'A ping through the water: exotic and legendary animals near you show on the radar for 30 s.' },
    exotic: { name: 'Echo+', dur: 45, cd: 1200, echo: 2, line: 'A ping through the water: exotic and legendary animals near you show on the radar for 45 s.' },
    legendary: { name: 'Fathom', dur: 90, cd: 5400, echo: 3, line: 'A deep ping: exotic and legendary animals far round you show on the radar for 90 s.' },
    mythical: { name: 'Whalesong Heart', dur: 120, cd: 3600, echo: 4, song: true, line: 'A long, deep call that carries through the sea: for 120 s exotic animals show on the radar twice as far round you, and legendary ones brighter, in their own colour.' },
  },
  ironhull: {
    rare: { name: 'Ironhull', dur: 0.5, cd: 3600, repair: true, sub: true, line: 'Mends the sub completely, from inside it.' },
  },
  // (7.4.19, owner) Dauntless: for its time the suit (or the hull) is rated deeper by its multiple, and what pressure
  // does past the old rating is that many times less. A force field round him shows how much of it he is using
  dauntless: {
    rare: { name: 'Dauntless', dur: 25, cd: 1800, press: 1.5, airBack: [0.02, 10], line: 'For 25 s your suit takes half again its rated depth, and pressure costs you a third less below it. Air comes back, 2 % a second for its first 10 s.' },
    exotic: { name: 'Dauntless+', dur: 30, cd: 3600, press: 2, light: 1.6, airBack: [0.03, 15], line: 'For 30 s your suit takes twice its rated depth, pressure costs you half as much below it, and light 45 m round you. Air comes back, 3 % a second for its first 15 s.' },
    legendary: { name: 'Bathysphere', dur: 60, cd: 3600, press: 2.5, beyond: 5, light: 1.6, airBack: [0.05, 20], line: 'For 60 s your suit takes two and a half times its rated depth, with light 45 m round you. Deeper even than that, your air goes 5 times slower than the pressure would take it. Air comes back, 5 % a second for its first 20 s.' },
    mythical: { name: 'Hadal Heart', dur: 90, cd: 3600, press: 3, beyond: 10, light: 1.6, airBack: [0.1, 30], line: 'For 90 s your suit takes three times its rated depth. Deeper even than that, your air goes 10 times slower than the pressure would take it. Air comes back, 10 % a second for its first 30 s.' },
  },
  // (7.6.5, owner) the pure families (docs/PLAN_SKILLS.md): one number each, pushed further than any Heart in that lane;
  // rarer (a third as likely anywhere) and stopping at legendary. pure: true marks them
  breath: {
    rare: { name: 'Breath', pure: true, dur: 20, cd: 600, airNow: 0.25, airSteps: [[0.01, 20]], line: 'A quarter of your air back at once, then a little more each second for 20 s.' },
    exotic: { name: 'Breath+', pure: true, dur: 30, cd: 1200, airNow: 0.5, airSteps: [[0.02, 30]], line: 'Half your air back at once, then 2 % a second for 30 s.' },
    legendary: { name: 'Bellows', pure: true, dur: 90, cd: 3600, airNow: 1, airSteps: [[0.05, 60], [0.02, 90]], line: 'Your air full at once, then 5 % a second for a minute and 2 % a second for half a minute more.' },
  },
  gust: {
    rare: { name: 'Gust', pure: true, dur: 30, cd: 300, speed: 1.6, line: '×1.6 speed for 30 s.' },
    exotic: { name: 'Gust+', pure: true, dur: 45, cd: 900, speed: 2.3, line: '×2.3 speed for 45 s.' },
    legendary: { name: 'Splintering Gale', pure: true, dur: 90, cd: 3600, speed: 4.2, line: '×4.2 speed for 90 s: faster than anything else in the sea.' },
  },
  temper: {
    rare: { name: 'Temper', pure: true, dur: 30, cd: 900, heat: true, press: 1.5, line: 'For 30 s your suit takes half again its rated depth.' },
    exotic: { name: 'Temper+', pure: true, dur: 45, cd: 1800, heat: true, press: 2, line: 'For 45 s your suit takes twice its rated depth.' },
    legendary: { name: 'Adamant', pure: true, dur: 90, cd: 3600, heat: true, press: 3.5, line: 'For 90 s your suit takes three and a half times its rated depth: deeper than any Heart.' },
  },
  plunge: {
    rare: { name: 'Plunge', pure: true, dur: 10, cd: 300, sink: 3.2, line: 'An anchor drops and pulls you down for 10 s. Stick up to hold against it.' },
    exotic: { name: 'Plunge+', pure: true, dur: 20, cd: 900, sink: 3.8, line: 'An anchor drops and pulls you down for 20 s, faster. Stick up to hold against it.' },
    legendary: { name: 'Drowned Anchor', pure: true, dur: 30, cd: 2400, sink: 4.6, line: 'A drowned ship\'s anchor drags you down for 30 s, faster than any sprint. Stick up to hold against it.' },
  },
  // (7.6.5, owner) a hybrid: the view drawn out wide, and light round him
  lookout: {
    rare: { name: 'Lookout', dur: 30, cd: 300, zoom: 1.2, light: 1, line: 'For 30 s you see further round you, with light 28 m round you.' },
    exotic: { name: 'Lookout+', dur: 45, cd: 900, zoom: 1.35, light: 1.3, line: 'For 45 s you see much further round you, with brighter light.' },
    legendary: { name: 'Eagle Eye', dur: 90, cd: 3600, zoom: 1.6, light: 1.6, eagle: true, line: 'For 90 s the sea opens far round you, seen through a sharper eye, with bright light.' },
  },
  // (7.6.6, owner) the second batch (docs/PLAN_SKILLS.md): a net thrown at what you tap; taps that catch; the specials
  // (one rarity, few charges); Bloodmoon (an event Heart, only from the Test tab for now); and three for the eye alone
  cast: {
    rare: { name: 'Cast', dur: 4, cd: 300, cast: { range: 8, r: 1.1 }, line: 'Tap where to throw: a net flies there and takes what is in its mouth.' },
    exotic: { name: 'Cast+', dur: 4, cd: 600, cast: { range: 11, r: 1.5 }, line: 'Tap where to throw: a wider net flies further and takes what is in its mouth.' },
    legendary: { name: 'Dragnet', dur: 4, cd: 1800, cast: { range: 15, r: 2.2 }, line: 'Tap where to throw: a great net flies far and fast, and draws shut round a whole group.' },
  },
  snatch: {
    rare: { name: 'Snatch', dur: 30, cd: 300, snatch: 3, snBonus: 0, line: 'For 30 s, tap three fish on screen: each is caught by your net\'s own chance.' },
    exotic: { name: 'Snatch+', dur: 30, cd: 900, snatch: 5, snBonus: 0.2, line: 'For 30 s, tap five fish on screen, with fewer misses.' },
    legendary: { name: 'Talon', dur: 45, cd: 2400, snatch: 8, snBonus: 0.35, zoom: 1.15, light: 1, line: 'For 45 s, tap eight fish on screen, rarely missing, the view a little wider and lit.' },
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
  shoal: {
    rare: { name: 'Shoal', dur: 30, cd: 300, shoal: 1, light: 0.6, line: 'A school of small silver fish circles you for 30 s.' },
    exotic: { name: 'Shoal+', dur: 45, cd: 600, shoal: 2, light: 0.8, line: 'A larger school circles you for 45 s, its flashing lighting the water.' },
    legendary: { name: 'Silverstorm', dur: 60, cd: 1800, shoal: 3, light: 1, line: 'A storm of silver fish turns round you for 60 s.' },
  },
  revel: { // (7.6.7, owner) lantern light as strong as a Flare+, in vivid colours; hunters that can bite keep away from it (never the thing)
    rare: { name: 'Revel', dur: 30, cd: 600, revel: 1, light: 1.6, repel: 15, line: 'For 30 s coloured lantern light 45 m round you. Hunters keep 15 m off.' },
    exotic: { name: 'Revel+', dur: 45, cd: 1200, revel: 2, light: 1.6, repel: 25, line: 'For 45 s brighter lantern colours round you, pulsing in time. Hunters keep 25 m off.' },
    legendary: { name: 'Carnival', dur: 60, cd: 2400, revel: 3, light: 2, repel: 40, line: 'For 60 s the sea becomes a carnival of coloured light, pulsing in time. Hunters keep 40 m off.' },
  },
  ink: {
    rare: { name: 'Ink', dur: 30, cd: 300, ink: 1, line: 'The water round you tinted a colour for 30 s.' },
    exotic: { name: 'Ink+', dur: 45, cd: 600, ink: 2, line: 'The water round you deeply tinted a colour for 45 s.' },
    legendary: { name: 'Inkstorm', dur: 60, cd: 1800, ink: 3, line: 'For 60 s you colour the sea, and leave a slow-fading trail of it behind you.' },
  },
  tidewarden: {
    legendary: { name: 'Tidewarden', maxLoad: 1, dur: 4, cd: 28800, ward: true, tide: true, line: 'When the water round you turns red: a wave of blue, it freezes, fades, and is gone for 5 minutes.' },
    mythical: { name: 'Warden Heart', maxLoad: 1, dur: 4, cd: 10800, ward: true, tide: true, any: true, line: 'Any time. In red water: a wave of blue, it freezes, fades, and is gone for 5 minutes. Marked, the mark is washed off you.' },
  },
};
// (7.4.15, owner) mythical: above legendary, only from three legendaries of the same scroll combined. Each has its own
// power, and every one of them, for the 10 s after it is fired, also gives at least Flare+ light, at least Sprint+ speed
// (the sub too), and air: +5 % of the full a second, up to +50 %, with none lost meanwhile. Usable any time
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
export const maxLoad = (A) => (A && A.maxLoad) || (A && (A.tier === 'legendary' || A.tier === 'mythical') ? 10 : 5);
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
  const cd = cooldownLeft(P); if (cd > 0 && !(A.charges && S.charges > 0) && !(A.loaded > 0)) return `Ready in ${fmtLeft(cd)}`;
  return null;
}

// (5.16.0) a time left, as the buttons and cards show it: "7h 42m", "12m", "38s"
export function fmtLeft(sec) { sec = Math.ceil(sec); if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`; if (sec >= 60) return `${Math.ceil(sec / 60)}m`; return `${sec}s`; }
