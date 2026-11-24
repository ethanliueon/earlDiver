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
    rare: { name: 'Sprint', dur: 15, cd: 120, speed: 1.5, line: '×1.5 speed for 15 s, using no air.' },
    exotic: { name: 'Sprint+', dur: 15, cd: 300, speed: 2, line: '×2 speed for 15 s, using no air.' },
    legendary: { name: 'Riptide', dur: 12, cd: 1800, speed: 3, noAir: true, line: '×3 speed for 12 s, using no air.' },
    mythical: { name: 'Maelstrom', dur: 15, cd: 1200, speed: 3.5, noAir: true, wake: true, line: '×3.5 speed for 15 s, using no air, and the water lit behind you as you go.' },
  },
  vigor: {
    rare: { name: 'Vigor', dur: 20, cd: 180, reach: 1.5, line: '×1.5 net reach for 20 s.' },
    exotic: { name: 'Vigor+', dur: 20, cd: 480, reach: 2, swing: 0.8, line: '×2 net reach and a quicker swing for 20 s.' },
    legendary: { name: 'Apex', dur: 10, cd: 3600, reach: 2.5, sure: true, bless: true, line: 'For 10 s the net reaches two and a half times as far and cannot miss. What it catches comes back whole, and Blessed.' },
    mythical: { name: "Leviathan's Maw", dur: 12, cd: 2400, reach: 3, sure: true, bless: true, multi: 3, line: 'For 12 s the net reaches three times as far, cannot miss, and takes up to three animals a swing. All come back whole, and Blessed.' },
  },
  dash: {
    rare: { name: 'Dash', dur: 0.3, cd: 45, dash: 1, zoom: 1, line: 'Tap where to go, and you are there in an instant.' },
    exotic: { name: 'Dash+', dur: 0.3, cd: 120, dash: 2, zoom: 1.4, line: 'Tap where to go, with the water opened wider round you.' },
    legendary: { name: 'Undertow', dur: 0.35, cd: 900, dash: 3, zoom: 2, line: 'Tap where to go: the sea opens far round you, and bends as you pass.' },
    mythical: { name: 'Rift', dur: 0.35, cd: 1200, dash: 3, zoom: 2.2, charges: 2, line: 'Two dashes before it rests: tap where to go, and again. The sea opens far round you, and tears as you pass.' },
  },
  flare: {
    rare: { name: 'Flare', dur: 20, cd: 300, light: 1, line: '20 s of light 28 m round you. The thing does not see it.' },
    exotic: { name: 'Flare+', dur: 40, cd: 720, light: 1.6, line: '40 s of brighter light, 45 m round you. The thing does not see it.' },
    legendary: { name: 'Lighthouse', dur: 60, cd: 3600, light: 2.4, ward: true, line: '60 s of light 80 m round you, near as bright as the shallows, pulsing, its beams sweeping round. Hunters keep out of it, and the thing does not see it.' },
    mythical: { name: 'Pharos', dur: 90, cd: 1800, light: 3.2, ward: true, line: '90 s of light 110 m round you, brighter than the Lighthouse, three beams sweeping round. Hunters keep out of it, and the thing does not see it.' },
  },
  echo: {
    rare: { name: 'Echo', dur: 20, cd: 480, echo: 1, line: 'A ping through the water: exotic and legendary animals near you show on the radar for 20 s.' },
    exotic: { name: 'Echo+', dur: 35, cd: 1200, echo: 2, line: 'A ping through the water: exotic and legendary animals near you show on the radar for 35 s.' },
    legendary: { name: 'Fathom', dur: 50, cd: 5400, echo: 3, line: 'A deep ping: exotic and legendary animals far round you show on the radar for 50 s.' },
    mythical: { name: 'Whalesong', dur: 60, cd: 3600, echo: 4, song: true, line: 'A long, deep call that carries through the sea: for 60 s exotic animals show on the radar twice as far round you, and legendary ones brighter, in their own colour.' },
  },
  ironhull: {
    rare: { name: 'Ironhull', dur: 0.5, cd: 3600, repair: true, sub: true, line: 'Mends the sub completely, from inside it.' },
  },
  tidewarden: {
    legendary: { name: 'Tidewarden', dur: 4, cd: 28800, ward: true, tide: true, line: 'When the water round you turns red: a wave of blue, it freezes, fades, and is gone for 5 minutes.' },
    mythical: { name: 'The Last Tide', dur: 4, cd: 10800, ward: true, tide: true, any: true, line: 'Any time. In red water: a wave of blue, it freezes, fades, and is gone for 5 minutes. Marked, the mark is washed off you.' },
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
export function skipCost(sec) { return Math.max(1, Math.ceil(Math.max(0, sec) / 300)); }
export function cooldownLeft(P) { return Math.max(0, ((P.abilReadyAt || 0) - Date.now()) / 1000); }
// can it be used now? returns null if so, else why not
export function whyNot(g, P, A) {
  if (!A) return 'No ability: put a scroll on in the bag';
  const S = abilityState(g), e = g.earl;
  if (S.activeT > 0 && !A.charges) return 'Already running';
  if (g.aboard && !A.speed && A.tier !== 'mythical') return 'In the water';
  if (A.sub && !e.inSub) return 'From inside the sub';
  if (A.tide && g.kill) return 'Too late'; // (6.0.0) never in its jaws
  if (A.tide && !A.any && !((g.fx && (g.fx.redTint || 0) > 0.03) || (g.entity && g.entity.dist < 160 && (g.entity.marked || g.entity.state === 'hunt' || g.entity.state === 'stalk')))) return 'Only when the water turns red'; // (6.0.0) once its red reaches him
  const cd = cooldownLeft(P); if (cd > 0 && !(A.charges && S.charges > 0)) return `Ready in ${fmtLeft(cd)}`;
  return null;
}

// (5.16.0) a time left, as the buttons and cards show it: "7h 42m", "12m", "38s"
export function fmtLeft(sec) { sec = Math.ceil(sec); if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`; if (sec >= 60) return `${Math.ceil(sec / 60)}m`; return `${sec}s`; }
