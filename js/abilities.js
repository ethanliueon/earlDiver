// (5.9.0) Abilities: learned from old scrolls, one carried at a time (the Ability slot on Earl), fired from the arc's
// button. Each family has a rare form, a plus (exotic) and a legendary with its own name; a few come only as exotic and
// legendary (Ironhull), or legendary alone (Tidewarden). A scroll is an item like any other: found in chests (rarer
// than gear) and now and then on the Old One's table, kept in the locker, sold if spare. One cooldown runs for
// whatever is carried: swapping does not reset it.
// (5.16.0) every cooldown counts in real time (it keeps running while the game is paused or closed); nothing is once a
// dive. Ironhull is a rare skill only (Bulwark is gone), Tidewarden legendary only
export const ABILITY_DEFS = {
  sprint: {
    rare: { name: 'Sprint', dur: 15, cd: 30, speed: 1.5, line: 'Half as fast again for 15 s, using no air.' },
    exotic: { name: 'Sprint+', dur: 15, cd: 35, speed: 2, line: 'Twice as fast for 15 s, using no air.' },
    legendary: { name: 'Riptide', dur: 12, cd: 180, speed: 3, noAir: true, line: 'Three times as fast for 12 s, using no air.' },
  },
  vigor: {
    rare: { name: 'Vigor', dur: 20, cd: 45, reach: 1.5, line: 'The net reaches half as far again for 20 s.' },
    exotic: { name: 'Vigor+', dur: 20, cd: 50, reach: 2, swing: 0.8, line: 'The net reaches twice as far, and swings quicker, for 20 s.' },
    legendary: { name: 'Apex', dur: 10, cd: 150, reach: 2.5, sure: true, bless: true, line: 'For 10 s the net reaches two and a half times as far and cannot miss. What it catches comes back whole, and Blessed.' },
  },
  dash: {
    rare: { name: 'Dash', dur: 0.3, cd: 10, dash: 1, zoom: 1, line: 'Tap where to go, and you are there in an instant.' },
    exotic: { name: 'Dash+', dur: 0.3, cd: 12, dash: 2, zoom: 1.4, line: 'Tap where to go, with the water opened wider round you.' },
    legendary: { name: 'Undertow', dur: 0.35, cd: 20, dash: 3, zoom: 2, line: 'Tap where to go: the sea opens far round you, and bends as you pass.' },
  },
  flare: {
    rare: { name: 'Flare', dur: 20, cd: 60, light: 1, line: '20 s of light round you. The thing does not see it.' },
    exotic: { name: 'Flare+', dur: 40, cd: 60, light: 1.6, line: '40 s of brighter light. The thing does not see it.' },
    legendary: { name: 'Lighthouse', dur: 30, cd: 120, light: 2.4, ward: true, line: '30 s of light as bright as the shallows. Hunters keep out of it, and the thing does not see it.' },
  },
  echo: {
    rare: { name: 'Echo', dur: 20, cd: 60, echo: 1, line: 'A ping through the water: exotic and legendary animals near you show on the radar for 20 s.' },
    exotic: { name: 'Echo+', dur: 35, cd: 60, echo: 2, line: 'A ping through the water: exotic and legendary animals near you show on the radar for 35 s.' },
    legendary: { name: 'Fathom', dur: 50, cd: 120, echo: 3, line: 'A deep ping: exotic and legendary animals far round you show on the radar for 50 s.' },
  },
  ironhull: {
    rare: { name: 'Ironhull', dur: 0.5, cd: 1200, repair: true, sub: true, line: 'Mends the sub completely, from inside it.' },
  },
  tidewarden: {
    legendary: { name: 'Tidewarden', dur: 4, cd: 28800, ward: true, tide: true, line: 'When the thing is close: the water turns from red to blue, it freezes, fades, and is gone for 5 minutes.' },
  },
};
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
export function cooldownLeft(P) { return Math.max(0, ((P.abilReadyAt || 0) - Date.now()) / 1000); }
// can it be used now? returns null if so, else why not
export function whyNot(g, P, A) {
  if (!A) return 'No ability: put a scroll on in the bag';
  const S = abilityState(g), e = g.earl;
  if (S.activeT > 0 && !A.charges) return 'Already running';
  if (g.aboard && !A.speed) return 'In the water';
  if (A.sub && !e.inSub) return 'From inside the sub';
  if (A.tide && !(g.entity && g.entity.dist < 160 && (g.entity.marked || g.entity.state === 'hunt' || g.entity.state === 'stalk'))) return 'Only when the thing is close';
  const cd = cooldownLeft(P); if (cd > 0 && !(A.charges && S.charges > 0)) return `Ready in ${fmtLeft(cd)}`;
  return null;
}

// (5.16.0) a time left, as the buttons and cards show it: "7h 42m", "12m", "38s"
export function fmtLeft(sec) { sec = Math.ceil(sec); if (sec >= 3600) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`; if (sec >= 60) return `${Math.ceil(sec / 60)}m`; return `${sec}s`; }
