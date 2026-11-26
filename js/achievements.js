// (7.6.38, owner) achievements, in the Quests page's Achievements tab. Each has five stars; a star becomes claimable once
// the player's record passes its mark, and is paid (in pearls) only when claimed there. They replace the pearls that were
// handed out on their own at each new depth record.
export const ACH = [
  { id: 'deep', name: 'Into the deep', goal: (n) => `Dive to ${n.toLocaleString('en-US')} m`, unit: 'm',
    tiers: [[100, 10], [500, 50], [1000, 100], [3000, 300], [5000, 1000]] }, // [mark, pearls]
];
export const STARS = 5;
// the record each one reads: the deepest he has ever been (metres, the diver or the sub)
export const achValue = (P, a) => (a.id === 'deep' ? Math.floor(P.deepest || 0) : 0);
export const achStars = (P, a) => ((P.ach || {})[a.id] || 0); // stars claimed
export const achReady = (P, a) => { const s = achStars(P, a); return s < a.tiers.length && achValue(P, a) >= a.tiers[s][0]; };
export const achReadyCount = (P) => (P ? ACH.filter((a) => achReady(P, a)).length : 0);
// claim the next star: returns the pearls paid, or 0
export function achClaim(P, id) {
  const a = ACH.find((q) => q.id === id); if (!a || !achReady(P, a)) return 0;
  const s = achStars(P, a), n = a.tiers[s][1]; P.ach = P.ach || {}; P.ach[a.id] = s + 1; P.pearls = (P.pearls || 0) + n; return n;
}
