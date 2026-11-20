// (5.9.0) Abilities: learned from old scrolls, one carried at a time (the Ability slot on Earl), fired from the arc's
// button. Each family has a rare form, a plus (exotic) and a legendary with its own name; a few come only as exotic and
// legendary (Ironhull), or legendary alone (Tidewarden). A scroll is an item like any other: found in chests (rarer
// than gear) and now and then on the Old One's table, kept in the locker, sold if spare. One cooldown runs for
// whatever is carried: swapping does not reset it.
export const ABILITY_DEFS = {
  sprint: {
    rare: { name: 'Sprint', dur: 15, cd: 30, speed: 1.5, line: 'Half as fast again for 15 s, at no cost in air.' },
    exotic: { name: 'Sprint+', dur: 15, cd: 35, speed: 2, line: 'Twice as fast for 15 s, at no cost in air.' },
    legendary: { name: 'Riptide', dur: 12, cd: 180, speed: 3, noAir: true, line: 'Three times as fast for 12 s, and no air used while it runs.' },
  },
  vigor: {
    rare: { name: 'Vigor', dur: 20, cd: 45, reach: 1.5, line: "The net reaches half as far again for 20 s." },
    exotic: { name: 'Vigor+', dur: 20, cd: 50, reach: 2, swing: 0.8, line: 'The net reaches twice as far, and swings quicker, for 20 s.' },
    legendary: { name: 'Apex', dur: 10, cd: 150, reach: 2.5, sure: true, line: 'For 10 s the net reaches two and a half times as far, and a swing at a fish in reach cannot miss.' },
  },
  dash: {
    rare: { name: 'Dash', dur: 0.45, cd: 10, dash: 11, line: 'A hard lunge the way he is swimming.' },
    exotic: { name: 'Dash+', dur: 0.6, cd: 12, dash: 14, charges: 2, line: 'A longer lunge, twice before it needs to recover.' },
    legendary: { name: 'Undertow', dur: 0.8, cd: 20, dash: 16, pull: true, line: 'A lunge that drags the small fish round him along in its wake.' },
  },
  flare: {
    rare: { name: 'Flare', dur: 20, cd: 60, light: 1, line: '20 s of light round him. The deep can see it.' },
    exotic: { name: 'Flare+', dur: 40, cd: 60, light: 1.6, line: '40 s of brighter light. The deep can see it.' },
    legendary: { name: 'Lighthouse', dur: 30, cd: 120, light: 2.4, ward: true, line: 'A blaze of light for 30 s that hunters will not come into.' },
  },
  echo: {
    rare: { name: 'Echo', dur: 10, cd: 45, echo: 1, line: 'A ping: every animal near him shows on the radar for 10 s.' },
    exotic: { name: 'Echo+', dur: 12, cd: 45, echo: 2, line: 'A ping that marks the rare animals on the radar in their colours.' },
    legendary: { name: 'Fathom', dur: 15, cd: 120, echo: 3, line: 'A deep ping: rare animals within a kilometre are marked on the chart.' },
  },
  ironhull: {
    exotic: { name: 'Ironhull', dur: 0.5, cd: 0, repair: true, perDive: 1, sub: true, line: 'Mends the sub completely. Once a dive.' },
    legendary: { name: 'Bulwark', dur: 30, cd: 0, repair: true, guard: true, perDive: 1, sub: true, line: 'Mends the sub completely, and nothing can hurt her for 30 s. Once a dive.' },
  },
  tidewarden: {
    legendary: { name: 'Tidewarden', dur: 4, cd: 3600, ward: true, tide: true, perDive: 1, line: 'When the thing is close: the water turns from red to blue, it freezes, fades, and is gone for 5 minutes. Once a dive; an hour to recover.' },
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
// P.abilReady: the play time (P.playT) at which it can be used again; P.abilDive: uses this dive (per-dive ones)
export function abilityState(g) { return g.abil || (g.abil = { activeT: 0, maxT: 0, def: null, charges: null, fx: 0 }); }
export function cooldownLeft(P) { return Math.max(0, (P.abilReady || 0) - (P.playT || 0)); }
// can it be used now? returns null if so, else why not
export function whyNot(g, P, A) {
  if (!A) return 'No ability: put a scroll on in the bag';
  const S = abilityState(g), e = g.earl;
  if (S.activeT > 0 && !A.charges) return 'Already running';
  if (g.aboard && !A.speed) return 'In the water';
  if (A.sub && !e.inSub) return 'From inside the sub';
  if (A.perDive && (g.abilUsed || 0) >= A.perDive) return 'Used this dive';
  if (A.tide && !(g.entity && g.entity.dist < 160 && (g.entity.marked || g.entity.state === 'hunt' || g.entity.state === 'stalk'))) return 'Only when the thing is close';
  const cd = cooldownLeft(P); if (cd > 0 && !(A.charges && S.charges > 0)) return `Ready in ${cd >= 90 ? Math.ceil(cd / 60) + ' min' : Math.ceil(cd) + ' s'}`;
  return null;
}
