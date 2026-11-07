// Quests (3.0.0), behind the Quests button on the HUD (the radio in the cabin is only decoration now).
//  - The main line: a short handmade tutorial, one step at a time, ending once the basics are taught. It
//    never points to the research station, Dave or the old one: those are found by exploring.
//  - The board: three quests, mostly Common, sometimes Uncommon or Rare, very rarely Exotic; the rarer, the
//    harder and the better paid. Cash only. New ones free every three hours, or at once for a fee.
// Progress comes from game events (questEvent: a catch, a sale, a photo, a tag, a trap set) and from a
// look at the game once a second (questTick: depth, the aquarium, what he has bought and has on).
import { SPECIES } from './species.js';
import { canTakeLive, liveValue } from './specimens.js';
import { kitOf, ITEMS } from './items.js';

export const BOARD_MS = 3 * 60 * 60 * 1000;
export const boardIn = (P, now = Date.now()) => Math.max(0, (Q(P).boardAt || 0) + BOARD_MS - now);
export const refreshPrice = (P) => Math.round(100 + 0.02 * Math.min(200000, P.lifetime || 0)); // a little dearer as he earns
export const QUEST_RARITY = { common: { name: 'Common', odds: 72 }, uncommon: { name: 'Uncommon', odds: 21 }, rare: { name: 'Rare', odds: 6.5 }, exotic: { name: 'Exotic', odds: 0.5 } };

// the main line: [id, what to do, a line of help, the check, the reward]
export const MAIN = [
  { id: 'net', text: 'Net a fish', help: 'Swim up to a fish and press Space (key 1 is the net).', need: 1, on: 'catch', pay: 20 },
  { id: 'sell', text: 'Sell your catch', help: 'Climb aboard the Margaret and sell at the stern, or press U at her side.', need: 1, on: 'sell', pay: 30 },
  { id: 'buy', text: 'Buy something from Bayside Marine Supply', help: "The Shop in the Margaret's cabin. Bought things go into your inventory.", need: 1, on: 'bought', pay: 40 },
  { id: 'wear', text: 'Put on something new', help: 'Press B for your inventory and drag it onto Earl, or click it and Put on.', need: 1, on: 'wear', pay: 30 },
  { id: 'sub', text: 'Take the sub down to 60 m', help: 'Climb into the sub at her stern; W and S to dive and rise.', need: 60, on: 'subDepth', pay: 80 },
  { id: 'chamber', text: 'Bring an animal up alive in the sub', help: 'Catch something deep, then T for the tank room: put it in a chamber or the open tank.', need: 1, on: 'subAlive', pay: 100 },
  { id: 'aquarium', text: 'Put an animal in the aquarium', help: "The lit tank in the cabin. Mark one to Keep when you sell, then put it in at the tank.", need: 1, on: 'aquarium', pay: 120 },
  { id: 'trap', text: 'Set a trap', help: 'Buy one from Bayside, then key 5 near the surface to set it at a depth.', need: 1, on: 'trap', pay: 80 },
  { id: 'done', text: 'That is the basics', help: 'The rest of the sea is yours to find. Quests on the board pay cash.', need: 0, on: null, pay: 0, gift: 'split' },
];

// the board's quests, by kind: what to do at each rarity, and the pay
const KINDS = {
  catch: (r) => ({ n: [5, 12, 25, 50][r], pay: [90, 280, 950, 4200][r], text: (q) => `Catch ${q.n} animals` }),
  deep: (r) => ({ d: [40, 200, 600, 1500][r], n: [1, 2, 3, 3][r], pay: [120, 450, 1600, 6500][r], text: (q) => `Catch ${q.n > 1 ? q.n + ' animals' : 'an animal'} below ${q.d} m` }),
  sell: (r) => ({ n: [150, 700, 3000, 15000][r], pay: [60, 240, 900, 4000][r], text: (q) => `Sell $${q.n.toLocaleString()} of catch` }),
  photo: (r) => ({ n: [1, 3, 6, 12][r], pay: [80, 300, 900, 3800][r], text: (q) => `Photograph ${q.n} new species` }),
  tag: (r) => ({ n: [1, 2, 4, 8][r], pay: [100, 350, 1100, 4500][r], text: (q) => `Tag ${q.n} animal${q.n > 1 ? 's' : ''}` }),
  species: (r, rnd, P) => {
    const deep = [60, 250, 700, 1600][r];
    const pool = SPECIES.filter((s) => canTakeLive(s) && s.dmin <= deep && s.dmin >= deep * 0.25 && liveValue(s) > 0.5);
    const sp = pool[Math.floor(rnd() * pool.length)]; if (!sp) return null;
    return { id: sp.id, n: 1, pay: Math.round(liveValue(sp) * [2.5, 3, 3.5, 4][r] + [40, 150, 500, 2000][r]), text: () => `Bring up a live ${sp.name.toLowerCase()}` };
  },
};
const R_INDEX = { common: 0, uncommon: 1, rare: 2, exotic: 3 };
// (3.0.1) how long a quest stays on the board, in real time: the rarer, the longer
export const QUEST_HOURS = { common: 12, uncommon: 21, rare: 36, exotic: 60 };
export const questLeft = (q, now = Date.now()) => Math.max(0, (q.until || now) - now);

export function Q(P) {
  const S = P.quests || (P.quests = { main: 0, mainProg: 0, board: [], boardAt: 0, done: 0 });
  // (3.0.40) the main line remembers what he has already done for steps still ahead of it; an older save
  // starts from what can be told (money earned means a fish has been caught and sold)
  if (!S.seen) { S.seen = {}; if ((P.lifetime || 0) > 0) { S.seen.net = 1; S.seen.sell = 1; } }
  return S;
}
// (3.0.40) note progress on any step of the main line not yet claimed; the active step's counter follows it
function mark(S, st, v) { const nv = Math.min(st.need, v); if (nv > (S.seen[st.id] || 0)) { S.seen[st.id] = nv; return true; } return false; }
function follow(S) { const m = MAIN[S.main]; if (m && m.on && (S.seen[m.id] || 0) > S.mainProg) { S.mainProg = Math.min(m.need, S.seen[m.id]); return true; } return false; }

function rollRarity(rnd) { let x = rnd() * 100; for (const [k, R] of Object.entries(QUEST_RARITY)) { if ((x -= R.odds) < 0) return k; } return 'common'; }
export function newQuest(P, rnd = Math.random, taken = new Set()) {
  for (let tries = 0; tries < 30; tries++) {
    const rarity = rollRarity(rnd), r = R_INDEX[rarity];
    const kinds = ['catch', 'catch', 'deep', 'sell', 'species', 'species'].concat(ownsKind(P, 'cam') ? ['photo'] : []).concat(ownsKind(P, 'tag') ? ['tag'] : []);
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const q = KINDS[kind](r, rnd, P); if (!q) continue;
    const key = kind + (q.id || ''); if ([...taken].some((t) => t === key || (kind === 'catch' && t.startsWith('catch')))) continue; // one of each kind on the board
    return { key, kind, rarity, n: q.n, d: q.d, id: q.id, pay: q.pay, text: q.text(q), prog: 0, until: Date.now() + QUEST_HOURS[rarity] * 3600000 };
  }
  return null;
}
const ownsKind = (P, kind) => kitOf(P).items.some((it) => ITEMS[it.id] && ITEMS[it.id].kind === kind);
// top the board up to three (a new one replaces a claimed one at once)
export function fillQuests(P) {
  const now = Date.now(); Q(P).board.forEach((q) => { if (!q.until) q.until = now + QUEST_HOURS[q.rarity || 'common'] * 3600000; });
  Q(P).board = Q(P).board.filter((q) => q.prog >= q.n || q.until > now); // run out (unless done and waiting to be claimed)
  const S = Q(P), taken = new Set(S.board.map((q) => q.key.replace(/(common|uncommon|rare|exotic)$/, '')));
  while (S.board.length < 3) { const q = newQuest(P, Math.random, taken); if (!q) break; S.board.push(q); taken.add(q.key); }
  if (!S.boardAt) S.boardAt = Date.now();
}
// new quests: free when the three hours are up, otherwise for the fee (unclaimed finished ones are kept)
export function refreshBoard(P, paid) {
  const S = Q(P);
  if (!paid && boardIn(P) > 0) return false;
  S.board = S.board.filter((q) => q.prog >= q.n);
  S.boardAt = Date.now(); fillQuests(P);
  return true;
}

// an event from the game: type and what it was about
export function questEvent(P, type, data = {}) {
  const S = Q(P);
  let changed = false;
  // the main line: this step and every one still ahead of it
  for (let i = S.main; i < MAIN.length; i++) { const st = MAIN[i]; if (st.on === type && st.on !== 'subDepth') changed = mark(S, st, (S.seen[st.id] || 0) + (data.n || 1)) || changed; }
  changed = follow(S) || changed;
  // the board
  for (const q of S.board) {
    if (q.prog >= q.n) continue;
    let add = 0;
    if (type === 'catch' && q.kind === 'catch') add = 1;
    if (type === 'catch' && q.kind === 'deep' && (data.depth || 0) >= q.d) add = 1;
    if (type === 'catch' && q.kind === 'species' && data.id === q.id && data.alive) add = 1;
    if (type === 'sell' && q.kind === 'sell') add = Math.round(data.total || 0);
    if (type === 'photo' && q.kind === 'photo') add = 1;
    if (type === 'tag' && q.kind === 'tag') add = 1;
    if (add) { q.prog = Math.min(q.n, q.prog + add); changed = true; }
  }
  return changed;
}
// once a second: what can be read straight off the game
export function questTick(g, P) {
  const S = Q(P), e = g.earl, K = kitOf(P);
  let ch = false;
  // every step not yet claimed, so what he does early still counts when its turn comes
  for (let i = S.main; i < MAIN.length; i++) {
    const st = MAIN[i]; if (!st.on || (S.seen[st.id] || 0) >= st.need) continue;
    if (st.on === 'bought' && K.items.some((it) => ITEMS[it.id] && !ITEMS[it.id].free)) ch = mark(S, st, 1) || ch;
    if (st.on === 'wear' && Object.values(K.on).some((u) => { const it = u && K.items.find((q) => q.u === u); return it && ITEMS[it.id] && !ITEMS[it.id].free; })) ch = mark(S, st, 1) || ch;
    if (st.on === 'subDepth' && e.inSub) ch = mark(S, st, Math.floor(g.sub.y)) || ch;
    if (st.on === 'subAlive' && (g.subTank.some((s) => s.cond > 0.3) || g.subTank.length && g.sub.y < 3)) ch = mark(S, st, 1) || ch;
    if (st.on === 'aquarium' && P.aquarium && Object.keys(P.aquarium.display || {}).length) ch = mark(S, st, 1) || ch;
  }
  return follow(S) || ch;
}
// claim: the main step (moves the line on) or a board quest (replaced at once by a new one)
export function claim(P, which) {
  const S = Q(P);
  if (which === 'main') {
    const m = MAIN[S.main]; if (!m || S.mainProg < m.need) return null;
    S.main++; S.mainProg = 0; S.done++; follow(S); // the next step: already done, if he has done it
    return { pay: m.pay, gift: m.gift || null, text: m.text };
  }
  const i = S.board.findIndex((q) => q.key === which); if (i < 0) return null;
  const q = S.board[i]; if (q.prog < q.n) return null;
  S.board.splice(i, 1); S.done++; fillQuests(P);
  return { pay: q.pay, text: q.text };
}
export const readyCount = (P) => { const S = Q(P), m = MAIN[S.main]; return (m && m.on && S.mainProg >= m.need ? 1 : 0) + (m && !m.on ? 1 : 0) + S.board.filter((q) => q.prog >= q.n).length; };
