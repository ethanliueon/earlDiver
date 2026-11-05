// Frenzies: short lucky streaks, earned by diving. Every time Earl comes back to the surface from a
// trip that went deeper than half his sub's rating, with enough time spent underwater since the
// last frenzy (his air plus the sub's air, in minutes, x0.6), and at least 5 minutes since the last
// one, there is a 20 % chance of a frenzy. Only one runs at a time; each lasts 3 minutes.

export const FRENZY_TIME = 180;
export const FRENZIES = {
  market: { name: 'Market frenzy', what: 'Everything sells for double' },
  breath: { name: 'Deep breath', what: 'Air lasts twice as long, for you and the sub' },
  rare: { name: 'Rare tide', what: 'Rare forms appear three times as often' },
  net: { name: 'Lucky net', what: '+25 % catch odds' },
  still: { name: 'Still water', what: 'Sharks and the thing in the deep are slow to notice you' },
};
const KEYS = Object.keys(FRENZIES);
const GAP = 300, CHANCE = 0.2;

const fz = (P) => P.fz || (P.fz = { under: 0, last: -1e9, clock: 0 });
// minutes underwater needed between frenzies: (diver air + sub air) in minutes x 0.6
export const frenzyNeed = (g) => ((g.earl.o2Max + g.sub.o2Max) / 60) * 0.6 * 60; // seconds

// every frame: the clocks, the trip, and the roll on surfacing. Returns a new frenzy, or null.
export function updateFrenzy(g, dt) {
  const P = g.profile, F = fz(P), e = g.earl;
  F.clock += dt;
  if (g.frenzy) { g.frenzy.t -= dt; if (g.frenzy.t <= 0) g.frenzy = null; }
  const under = e.y > 3;
  if (under) {
    F.under += dt;
    g.trip = g.trip || { max: 0 };
    g.trip.max = Math.max(g.trip.max, e.y);
    return null;
  }
  // back at the surface: was that a trip that counts?
  if (g.trip && e.y < 1.2) {
    const trip = g.trip; g.trip = null;
    const rated = g.sub.imploded ? 300 : g.sub.rated;
    if (!g.frenzy && trip.max > rated * 0.5 && F.under >= frenzyNeed(g) && F.clock - F.last >= GAP && Math.random() < CHANCE) {
      const id = KEYS[Math.floor(Math.random() * KEYS.length)];
      g.frenzy = { id, t: FRENZY_TIME, dur: FRENZY_TIME };
      F.under = 0; F.last = F.clock;
      return g.frenzy;
    }
  }
  return null;
}
export const frenzyOn = (g, id) => !!(g.frenzy && g.frenzy.id === id);
