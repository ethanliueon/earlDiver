// Quests (3.0.0), behind the Quests button on the HUD (the radio in the cabin is only decoration now).
//  - The main line: a short handmade tutorial, one step at a time, ending once the basics are taught. It
//    never points to the research station, Dave or the old one: those are found by exploring.
//  - The board: three quests, mostly Common, sometimes Uncommon or Rare, very rarely Exotic; the rarer, the
//    harder and the better paid. Cash only. New ones free every three hours, or at once for a fee.
// Progress comes from game events (questEvent: a catch, a sale, a photo, a tag, a trap set) and from a
// look at the game once a second (questTick: depth, the aquarium, what he has bought and has on).
import { SPECIES } from './species.js';
import { canTakeLive, liveValue, rarityOf, LEGENDARY } from './specimens.js';
import { kitOf, ITEMS, FREE } from './items.js';
const STARTER = new Set(Object.values(FREE)); // (4.0.6) what he starts with is not bought, nor new to put on
const bought = (id) => ITEMS[id] && !ITEMS[id].free && !STARTER.has(id);
// (4.3.0) a thing he paid for (marked when it is bought; a tutorial gift, like the flick net, is not)
const paidFor = (it) => !!(it && it.paid);

// (4.0.0) refreshing the board by hand: one free refresh, then a three-hour window in which more refreshes cost
// $100, $300, $1,000, $2,500 and then $5,000 each; when the window ends, the next is free again. A new game
// starts with its free refresh ready. (Quests also replace themselves when their own time runs out.)
export const BOARD_MS = 3 * 60 * 60 * 1000;
const LADDER = [100, 300, 1000, 2500, 5000];
const windowOver = (S, now) => now >= (S.freeAt || 0);
export const boardIn = (P, now = Date.now()) => Math.max(0, (Q(P).freeAt || 0) - now);
export const refreshPrice = (P) => { const S = Q(P); return LADDER[Math.min(LADDER.length - 1, windowOver(S, Date.now()) ? 0 : S.paidN || 0)]; };
export const QUEST_RARITY = { common: { name: 'Common', odds: 72 }, uncommon: { name: 'Uncommon', odds: 21 }, rare: { name: 'Rare', odds: 6.5 }, exotic: { name: 'Exotic', odds: 0.5 } };

// the main line: [id, what to do, a line of help, the check, the reward]
// (4.0.6) the Margaret's Log is the tutorial: each step teaches one thing, and the things a step uses are given
// when it is done (kit: ['item', id] into the locker, ['supply', key, n], ['trawl', tier] into the hatch,
// ['trap', type]). Once the net and trawl steps are done their key hints leave the screen (learned()).
export const MAIN = [
  // (4.3.4) the first three steps are one dive now: down to the fish, observe it, catch it, back up (FIRST_FISH)
  { id: 'firstfish', text: 'Your first fish', help: 'Swim down to the orange fish, observe it (F), catch it with your net, then swim back up to the surface.', need: 1, on: 'firstFish', pay: 50, kit: [['item', 'flicknet']] },
  { id: 'sell', text: 'Sell your catch', help: 'Swim up beside the Margaret and press U, then Sell all.', need: 1, on: 'sell', pay: 30 },
  { id: 'buy', text: 'Buy a piece of gear from Bayside Marine Supply', help: "The computer in the Margaret's cabin. Bought gear goes into your inventory (supplies don't count).", need: 1, on: 'bought', pay: 40 },
  { id: 'wear', text: 'Put on the gear you bought', help: 'Press B for your inventory, click it and Put it on (or drag it onto Earl).', need: 1, on: 'wear', pay: 30 },
  { id: 'sub', text: 'Take the sub down to 60 m', help: 'Swim into the sub at her stern (F); W and S to dive and rise.', need: 60, on: 'subDepth', pay: 50 },
  { id: 'air', text: 'Top up the cabin air', help: 'When the cabin air is down, press R in the sub: a backup tank fills it to full.', need: 1, on: 'airTank', pay: 20 },
  { id: 'trawl', text: 'Let out the trawl net', help: 'In the sub, under way below 6 m, press N: the net drops from the hatch. N again closes it. The catch lands on the floor of the sub, out of water: get it into a tank (T) within a minute.', need: 1, on: 'trawl', pay: 30 },
  { id: 'chamber', text: 'Bring an animal up alive in the sub', help: 'Catch something deep, then T for the tank room: put it in a chamber or the open tank.', need: 1, on: 'subAlive', pay: 70 },
  { id: 'surface', text: 'Surface with an animal aboard', help: 'When the sub breaks the surface, every animal aboard is safe (a green ✓) until she dives again.', need: 1, on: 'surfaceSafe', pay: 30 },
  { id: 'aquarium', text: 'Put an animal in the aquarium', help: 'The lit tank in the cabin. Mark one to Keep when you sell, then put it in at the tank.', need: 1, on: 'aquarium', pay: 60 },
  { id: 'trap', text: 'Set a trap', help: 'You own a wire pot: near the surface press 5, then Space to set it at a depth.', need: 1, on: 'trap', pay: 40, kit: [['trap', 'pot']] },
  { id: 'done', text: 'That is the basics', help: 'The rest of the sea is yours to find. Quests on the board pay cash.', need: 0, on: null, pay: 0, gift: 'split' },
];
// the Log before 4.0.6, so an older save keeps its place
const OLD_MAIN = ['net', 'sell', 'buy', 'wear', 'sub', 'chamber', 'aquarium', 'trap', 'done'];
// the Log from 4.0.6 to 4.3.3, so a save from then keeps its place
const V3_IDS = ['swim', 'observe', 'net', 'sell', 'buy', 'wear', 'sub', 'air', 'trawl', 'chamber', 'surface', 'aquarium', 'trap', 'done'];
const MAIN_I = Object.fromEntries(MAIN.map((m, i) => [m.id, i]));
const ALIAS = { swim: 'firstfish', observe: 'firstfish', net: 'firstfish' }; // (4.3.4) learned('net'): the first-fish step
// (4.3.4) the first-fish step, part by part: 0 swim down to the fish, 1 observe it, 2 catch it, 3 back to the surface, 4 done
export const FIRST_FISH = ['Swim down to the fish', 'Observe it', 'Catch it', 'Swim back up to the surface'];
export function firstFishPart(P) { const S = Q(P), sn = S.seen; if (MAIN[S.main] && MAIN[S.main].id !== 'firstfish') return 4; if (S.mainProg >= 1) return 4; return sn.ff_catch ? 3 : sn.ff_obs ? 2 : sn.ff_reach ? 1 : 0; }
// the line on the HUD for the step the Log is on (for the first fish: which part, and how far along)
export function stepLabel(P) {
  const S = Q(P), m = MAIN[S.main]; if (!m || !m.on) return '';
  if (m.id === 'firstfish') { const k = firstFishPart(P); return k >= 4 ? '✓ ' + m.text : `${m.text} (${k + 1}/4): ${FIRST_FISH[k].toLowerCase()}`; }
  return (S.mainProg >= m.need ? '✓ ' : '') + m.text + (m.need > 1 && S.mainProg < m.need ? `  (${S.mainProg}/${m.need})` : '');
}
// (4.0.6) has the Log taught this yet? (the step done, or the Log past it)
export function learned(P, id) { id = ALIAS[id] || id; const S = Q(P), i = MAIN_I[id]; return i === undefined || S.main > i || (S.seen[id] || 0) >= MAIN[i].need; }

// the board's quests, by kind: what to do at each rarity, and the pay
// (4.2.0) a hidden player level, 1-10, from what he has done: lifetime earnings, deepest dive, the sub's hull.
// Board quests ask more and pay more as it rises; an early 'catch 25' pays about $50.
export function playerLevel(P) {
  const earn = Math.log10(1 + (P.lifetime || 0)), deep = Math.log10(1 + (P.deepest || 0)), hull = (P.tlv && P.tlv.depth) || (P.lv && P.lv.depth) || 0;
  return Math.max(1, Math.min(10, Math.round(1 + earn * 1.1 + deep * 0.6 + hull * 0.6 - 1.2)));
}
const payK = (P) => 0.35 + (playerLevel(P) - 1) * 0.13;
const KINDS = {
  catch: (r) => ({ n: [25, 50, 100, 200][r], pay: [135, 420, 1425, 6300][r], text: (q) => `Catch ${q.n} animals` }),
  deep: (r) => ({ d: [100, 200, 600, 1500][r], n: [1, 2, 3, 3][r], pay: [240, 900, 3200, 13000][r], // (4.0.0) the deep pays most
    text: (q) => `Catch ${q.n > 1 ? q.n + ' animals' : 'an animal'} below ${q.d} m` }),
  sell: (r) => ({ n: [450, 2000, 9000, 45000][r], pay: [90, 360, 1350, 6000][r], text: (q) => `Sell $${q.n.toLocaleString()} of catch` }),
  photo: (r) => ({ n: [1, 3, 6, 12][r], pay: [120, 450, 1350, 5700][r], text: (q) => `Photograph ${q.n} new species` }),
  tag: (r) => ({ n: [1, 2, 4, 8][r], pay: [150, 525, 1650, 6750][r], text: (q) => `Tag ${q.n} animal${q.n > 1 ? 's' : ''}` }),
  species: (r, rnd, P) => {
    const deep = [60, 250, 700, 1600][r];
    // (4.0.0) never a legendary (they are met, not ordered) nor an undocumented one
    const pool = SPECIES.filter((s) => canTakeLive(s) && !s.undoc && !s.giant && !LEGENDARY.has(s.id) && rarityOf(s).id !== 'legendary' && s.dmin <= deep && s.dmin >= deep * 0.25 && liveValue(s) > 0.5);
    const sp = pool[Math.floor(rnd() * pool.length)]; if (!sp) return null;
    // (4.0.0) finding one particular animal is hard (you have to know it when you see it): ten times what it
    // fetches for a common, uncommon or rare one, five times for an exotic
    const v = liveValue(sp), mult = rarityOf(sp).id === 'exotic' ? 5 : 10;
    return { id: sp.id, n: 1, pay: Math.round(v * mult + [40, 150, 500, 2000][r]), text: () => `Bring up a live ${sp.name.toLowerCase()}` };
  },
};
const R_INDEX = { common: 0, uncommon: 1, rare: 2, exotic: 3 };
// (3.0.1) how long a quest stays on the board, in real time: the rarer, the longer
export const QUEST_HOURS = { common: 12, uncommon: 21, rare: 36, exotic: 60 };
export const questLeft = (q, now = Date.now()) => Math.max(0, (q.until || now) - now);

export function Q(P) {
  const S = P.quests || (P.quests = { main: 0, mainProg: 0, board: [], freeAt: 0, paidN: 0, done: 0 });
  if (S.freeAt === undefined) { S.freeAt = 0; S.paidN = 0; } // (4.0.0) older saves: the free refresh is ready
  // (3.0.40) the main line remembers what he has already done for steps still ahead of it; an older save
  // starts from what can be told (money earned means a fish has been caught and sold)
  if (!S.seen) { S.seen = {}; if ((P.lifetime || 0) > 0) { S.seen.net = 1; S.seen.sell = 1; } }
  // (4.0.6) a save from before the tutorial: the same step, by name, in the new Log; what it has already done counts
  if (!S.v) { S.v = 2; const id = OLD_MAIN[S.main] || 'done', k = V3_IDS.indexOf(id); if (S.main > 0 || (P.lifetime || 0) > 0) { S.main = Math.max(0, k); S.seen.swim = 10; S.seen.observe = 1; } }
  // (4.3.0) the Log counts only the step it is on: progress noted ahead of it by older versions is dropped (it let
  // one action finish several steps at once). Gear bought before purchases were marked counts as paid for, except
  // the flick net, which the Log itself gives.
  if (S.v < 3) {
    S.v = 3;
    for (let i = S.main + 1; i < V3_IDS.length; i++) delete S.seen[V3_IDS[i]];
    for (const it of kitOf(P).items) if (bought(it.id) && it.id !== 'flicknet' && !it.gift) it.paid = true;
  }
  // (4.3.4) swim, observe and net are one step: a save on one of them goes to it, with the parts it has done
  if (S.v < 4) {
    S.v = 4; const id = V3_IDS[S.main] || 'done';
    if (id === 'swim' || id === 'observe' || id === 'net') {
      S.main = 0; S.mainProg = 0;
      if (id !== 'swim' || (S.seen.swim || 0) >= 10) S.seen.ff_reach = 1;
      if (id === 'net' || (id === 'observe' && S.seen.observe)) S.seen.ff_obs = 1;
      if (id === 'net' && S.seen.netCaught) S.seen.ff_catch = 1;
    } else S.main = Math.max(0, MAIN.findIndex((m) => m.id === id));
  }
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
    if (kind !== 'species') q.pay = Math.max(10, Math.round(q.pay * payK(P) / 5) * 5); // (4.2.0) by the hidden player level
    const key = kind + (q.id || ''); if ([...taken].some((t) => t === key || (kind === 'catch' && t.startsWith('catch')))) continue; // one of each kind on the board
    return { key, kind, rarity, n: q.n, d: q.d, id: q.id, pay: q.pay, text: q.text(q), prog: 0, until: Date.now() + QUEST_HOURS[rarity] * 3600000, fresh: true };
  }
  return null;
}
const ownsKind = (P, kind) => kitOf(P).items.some((it) => ITEMS[it.id] && ITEMS[it.id].kind === kind);
// (4.0.0) keep the board at three: a quest whose time has run out is replaced by a new one (marked NEW), and so is
// a claimed one, but only when its time runs out; until then it stays on the board, dimmed. A finished quest not
// yet claimed never runs out.
export function fillQuests(P, byHand = false) {
  const now = Date.now(), S = Q(P), starting = !S.board.length; // (4.0.1) NEW only on a quest that replaced one by itself
  S.board.forEach((q) => { if (!q.until) q.until = now + QUEST_HOURS[q.rarity || 'common'] * 3600000; });
  S.board = S.board.filter((q) => (q.prog >= q.n && !q.claimed) || q.until > now);
  const taken = new Set(S.board.map((q) => q.key.replace(/(common|uncommon|rare|exotic)$/, '')));
  while (S.board.length < 3) { const q = newQuest(P, Math.random, taken); if (!q) break; q.fresh = !starting && !byHand; S.board.push(q); taken.add(q.key); }
}
// new quests by hand: the free one if it is ready, otherwise the next price on the ladder (the caller charges it).
// Finished quests not yet claimed are kept; everything else is replaced.
export function refreshBoard(P, paid) {
  const S = Q(P), now = Date.now();
  if (windowOver(S, now)) S.paidN = 0;
  if (!paid) { if (!windowOver(S, now)) return false; S.freeAt = now + BOARD_MS; }
  else S.paidN = (S.paidN || 0) + 1;
  S.board = S.board.filter((q) => q.prog >= q.n && !q.claimed);
  fillQuests(P, true);
  return true;
}

// an event from the game: type and what it was about
export function questEvent(P, type, data = {}) {
  const S = Q(P);
  let changed = false;
  // (4.3.0) the main line: only the step it is on. One thing done finishes one step, never the ones after it
  const st = MAIN[S.main];
  if (st && st.on === type && st.on !== 'subDepth') changed = mark(S, st, (S.seen[st.id] || 0) + (data.n || 1)) || changed;
  // (4.3.4) the first fish: observing it, and catching it (which counts as having looked at it too); the surface
  // is read in questTick
  if (st && st.on === 'firstFish' && S.mainProg < 1) {
    if (type === 'observe' && !S.seen.ff_obs) { S.seen.ff_reach = 1; S.seen.ff_obs = 1; changed = true; }
    if (type === 'catch' && !S.seen.ff_catch) { S.seen.ff_reach = 1; S.seen.ff_obs = 1; S.seen.ff_catch = 1; changed = true; }
  }
  changed = follow(S) || changed;
  // the board (it opens once the tutorial is over)
  if (tutorialOn(P)) return changed;
  for (const q of S.board) {
    if (q.prog >= q.n || q.claimed) continue;
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
  // (4.3.0) only the step the Log is on ('bought' comes as an event, from the purchase itself)
  for (let i = S.main; i <= S.main && i < MAIN.length; i++) {
    const st = MAIN[i]; if (!st.on || (S.seen[st.id] || 0) >= st.need) continue;
    if (st.on === 'wear' && Object.values(K.on).some((u) => paidFor(u && K.items.find((q) => q.u === u)))) ch = mark(S, st, 1) || ch;
    if (st.on === 'subDepth' && e.inSub) ch = mark(S, st, Math.floor(g.sub.y)) || ch;
    if (st.on === 'subAlive' && (g.subTank.some((s) => s.cond > 0.3) || g.subTank.length && g.sub.y < 3)) ch = mark(S, st, 1) || ch;
    if (st.on === 'swimDepth' && !e.inSub) ch = mark(S, st, Math.floor(e.y)) || ch;
    if (st.on === 'firstFish' && !e.inSub) {
      if (!S.seen.ff_reach && e.y >= 3.5) { S.seen.ff_reach = 1; ch = true; } // down at the fish
      if (S.seen.ff_catch && e.y < 1.2) ch = mark(S, st, 1) || ch; // (4.3.2) caught, and up at the surface
    }
    if (st.on === 'surfaceSafe' && g.subTank.some((s) => s.safe && s.cond > 0.05)) ch = mark(S, st, 1) || ch;
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
    return { pay: m.pay, gift: m.gift || null, kit: m.kit || null, text: m.text };
  }
  if (tutorialOn(P)) return null; // (4.3.0) the board opens after the tutorial
  const i = S.board.findIndex((q) => q.key === which); if (i < 0) return null;
  const q = S.board[i]; if (q.prog < q.n || q.claimed) return null;
  q.claimed = true; S.done++; // (4.0.0) it stays, dimmed, until its time runs out or the board is refreshed
  return { pay: q.pay, text: q.text };
}
export const readyCount = (P) => { const S = Q(P), m = MAIN[S.main]; return (m && m.on && S.mainProg >= m.need ? 1 : 0) + (m && !m.on ? 1 : 0) + (tutorialOn(P) ? 0 : S.board.filter((q) => q.prog >= q.n && !q.claimed).length); };
// (4.3.0) the guided tutorial is running (the first six steps of the Log, until it hands over)
export const TUT_IDS = new Set(['firstfish', 'sell', 'buy', 'wear']);
export function tutorialOn(P) { if (!P || P.tut !== 'on') return false; const m = MAIN[Q(P).main]; return !!m && TUT_IDS.has(m.id); }
