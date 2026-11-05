// The radio: buyers calling the boat with jobs. Each dive the radio has a few contracts, chosen to
// fit what Earl's gear can actually do. They pay well over the market and fill themselves when he
// sells at the boat with the right thing aboard. A filled contract is replaced by a new one.
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { canTakeLive, liveValue, tagPrice, isTagOnly } from './specimens.js';
import { GOODS, gear, owns, statValue } from './economy.js';
import { photoValue } from './survey.js';

export const RADIO = { name: 'Better radio', price: 150, desc: 'A long-range set and a tall whip antenna. Five contracts at a time instead of three.' };
const PLURAL = { clam: 'clams', mussel: 'mussels', iron: 'pieces of scrap iron', ink: 'ink sacs', tentacle: 'squid tentacles', glass: 'pieces of glass sponge', pearl: 'pearls' };
const an = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name.toLowerCase();
export const contractSlots = (P) => (P.radio ? 5 : 3);

// how deep he can work, and how big an animal he can take
function reach(P) {
  const net = gear(P, 'net').maxLen;
  const arm = owns(P, 'arm') ? gear(P, 'arm').maxLen : 0;
  const deep = P.subLost ? 60 : statValue(P, 'depth');
  return { maxLen: Math.max(net, arm), deep };
}

// one new contract that does not repeat what is already on the board
export function newContract(P, taken, rnd = Math.random) {
  const R = reach(P);
  const kinds = ['live', 'live', 'salvage'];
  if (owns(P, 'tagger')) kinds.push('tag');
  if (owns(P, 'camera')) kinds.push('photo');
  for (let tries = 0; tries < 30; tries++) {
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    if (kind === 'live') {
      const pool = SPECIES.filter((s) => canTakeLive(s) && s.len <= R.maxLen && s.dmin <= R.deep * 0.9 && liveValue(s) >= 0.1);
      const sp = pool[Math.floor(rnd() * pool.length)];
      if (!sp || taken.has('live' + sp.id)) continue;
      const pay = Math.round((liveValue(sp) * (2.5 + rnd()) + 0.2) * 100) / 100;
      return { kind, id: sp.id, key: 'live' + sp.id, pay, who: 'An aquarium', text: `${an('live ' + sp.name)}, in good condition` };
    }
    if (kind === 'tag') {
      const pool = SPECIES.filter((s) => isTagOnly(s) && s.dmin <= R.deep * 0.9 && tagPrice(s.id) > 0);
      const sp = pool[Math.floor(rnd() * pool.length)];
      if (!sp || taken.has('tag' + sp.id)) continue;
      const pay = Math.round(tagPrice(sp.id) * (1.8 + rnd() * 0.8) * gear(P, 'tag').pay * 100) / 100;
      return { kind, id: sp.id, key: 'tag' + sp.id, pay, who: 'The research program', text: `a tag on ${an(sp.name)}` };
    }
    if (kind === 'photo') {
      const have = new Set(P.photos || []);
      const pool = SPECIES.filter((s) => s.dmin <= R.deep * 0.9 && !have.has(String(s.id)));
      const sp = pool[Math.floor(rnd() * pool.length)];
      if (!sp || taken.has('photo' + sp.id)) continue;
      const pay = Math.round((photoValue(sp) * (2.5 + rnd()) + 0.1) * 100) / 100;
      return { kind, id: sp.id, key: 'photo' + sp.id, pay, who: 'The institute', text: `a photograph of ${an(sp.name)}` };
    }
    // salvage: a quantity of something from the bottom
    const opts = [['clam', 6, 0], ['mussel', 10, 0], ['iron', 5, 0], ['ink', 3, 200], ['tentacle', 3, 200], ['glass', 2, 300], ['pearl', 1, 0]].filter(([, , d]) => d <= R.deep);
    const [k, n0] = opts[Math.floor(rnd() * opts.length)];
    const n = Math.max(1, Math.round(n0 * (0.7 + rnd() * 0.6)));
    if (taken.has('salvage' + k)) continue;
    const pay = Math.round((GOODS[k].price * n * (2.5 + rnd()) + 0.1) * 100) / 100;
    return { kind: 'salvage', item: k, n, key: 'salvage' + k, pay, who: 'A buyer', text: `${n} ${n > 1 ? PLURAL[k] : GOODS[k].name.toLowerCase()}` };
  }
  return null;
}
// top the board up to its size
export function fillBoard(P, board) {
  const taken = new Set(board.map((c) => c.key));
  while (board.length < contractSlots(P)) {
    const c = newContract(P, taken);
    if (!c) break;
    board.push(c); taken.add(c.key);
  }
  return board;
}

// Fill whatever contracts the cargo allows. Takes the goods out of the game's stores and returns
// receipt lines. (Called at the boat, before the rest is sold at market.)
export function fulfil(g, P, lists) {
  const lines = [];
  for (let i = g.contracts.length - 1; i >= 0; i--) {
    const c = g.contracts[i];
    let ok = false;
    if (c.kind === 'live') {
      for (const L of lists) {
        const j = L.findIndex((s) => s.id === c.id && s.cond >= 0.5);
        if (j >= 0) { L.splice(j, 1); ok = true; break; }
      }
    } else if (c.kind === 'tag') {
      const j = g.tags.findIndex((t) => t.key === 'tag' + c.id || t.key.startsWith('tag' + c.id + ':'));
      if (j >= 0) { g.tags.splice(j, 1); ok = true; }
    } else if (c.kind === 'photo') {
      const j = g.photos.findIndex((p) => p.id === c.id);
      if (j >= 0) { const p = g.photos.splice(j, 1)[0]; P.photos = [...(P.photos || []), p.key]; ok = true; }
    } else if (c.kind === 'salvage') {
      if ((g.inv[c.item] || 0) >= c.n) { g.inv[c.item] -= c.n; ok = true; }
    }
    if (ok) {
      P.cash = Math.round((P.cash + c.pay) * 100) / 100;
      P.lifetime = Math.round((P.lifetime + c.pay) * 100) / 100;
      lines.push({ label: `Contract: ${c.text}`, n: 1, total: c.pay });
      g.contracts.splice(i, 1);
    }
  }
  if (lines.length) fillBoard(P, g.contracts);
  return lines;
}
// is a contract's goods aboard right now? (for the radio list)
export function ready(g, c, lists) {
  if (c.kind === 'live') return lists.some((L) => L.some((s) => s.id === c.id && s.cond >= 0.5));
  if (c.kind === 'tag') return g.tags.some((t) => t.key === 'tag' + c.id || t.key.startsWith('tag' + c.id + ':'));
  if (c.kind === 'photo') return g.photos.some((p) => p.id === c.id);
  return (g.inv[c.item] || 0) >= c.n;
}
export { SPECIES_BY_ID };
