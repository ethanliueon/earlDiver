// The radio: buyers calling the boat with jobs. Each dive the radio has a few contracts, chosen to
// fit what Earl's gear can actually do. They pay well over the market and fill themselves when he
// sells at the boat with the right thing aboard. A filled contract is replaced by a new one.
import { SPECIES, SPECIES_BY_ID } from './species.js';
import { canTakeLive, liveValue, tagPrice, isTagOnly, isDead } from './specimens.js';
import { GOODS, gear, owns, statValue, upgradeCost, lv, UPGRADES } from './economy.js';
import { photoValue } from './survey.js';

export const RADIO = { name: 'Better radio', price: 530, desc: 'A long-range set and a tall whip antenna. Five contracts at a time instead of three.' };
const PLURAL = { clam: 'clams', mussel: 'mussels', glass: 'pieces of glass sponge', pearl: 'pearls', nodule: 'manganese nodules', bone: 'whale ribs', sapphire: 'deep sapphires' };
const an = (name) => (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name.toLowerCase();
export const contractSlots = (P) => (P.radio ? 5 : 3);

// how deep he can work, and how big an animal he can take
function reach(P) {
  const net = gear(P, 'net').maxLen;
  const arm = owns(P, 'arm') ? gear(P, 'arm').maxLen : 0;
  const deep = P.subLost ? 60 : statValue(P, 'depth');
  return { maxLen: Math.max(net, arm), deep };
}

// What a job pays: the market price, plus a premium for the trip — 30-100 % of the market value and
// about 15 cents for every metre of depth the job takes him to — the premium never more than his next
// submersible costs, so no single job can skip him a tier of gear. (It was 5-6.5x the market, which made
// a reef pearl worth $2,000.)
function payFor(P, market, depth, rnd) {
  const nextSub = lv(P, 'depth') < UPGRADES.depth.max ? upgradeCost(P, 'depth') : 100000;
  const premium = Math.min(market * (0.3 + rnd() * 0.7) + Math.max(0, depth) * 0.15, Math.max(60, nextSub));
  return Math.round((market + premium) * 100) / 100;
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
      const all = SPECIES.filter((s) => canTakeLive(s) && s.len <= R.maxLen && s.dmin <= R.deep * 0.9 && liveValue(s) >= 0.1);
      // most jobs reach for the edge of what his gear can do: the deeper half of his range
      const edge = all.filter((s) => s.dmin >= R.deep * 0.35);
      const pool = edge.length && rnd() < 0.65 ? edge : all;
      const sp = pool[Math.floor(rnd() * pool.length)];
      if (!sp || taken.has('live' + sp.id)) continue;
      const pay = payFor(P, liveValue(sp), sp.dmin, rnd);
      // a museum will take a specimen in any state (a dead one only fetches the dead price);
      // an aquarium wants it alive and well
      if (rnd() < 0.3) return { kind, id: sp.id, key: 'live' + sp.id, pay: Math.round(pay * 0.8 * 100) / 100, who: 'The museum', anyState: true, text: `${an(sp.name)} for the collection, alive or dead` };
      return { kind, id: sp.id, key: 'live' + sp.id, pay, who: 'An aquarium', text: `${an('live ' + sp.name)}, in good condition` };
    }
    if (kind === 'tag') {
      const pool = SPECIES.filter((s) => isTagOnly(s) && s.dmin <= R.deep * 0.9 && tagPrice(s.id) > 0);
      const sp = pool[Math.floor(rnd() * pool.length)];
      if (!sp || taken.has('tag' + sp.id)) continue;
      const pay = payFor(P, tagPrice(sp.id) * gear(P, 'tag').pay, sp.dmin, rnd);
      return { kind, id: sp.id, key: 'tag' + sp.id, pay, who: 'The research program', text: `a tag on ${an(sp.name)}` };
    }
    if (kind === 'photo') {
      const have = new Set(P.photos || []);
      const pool = SPECIES.filter((s) => s.dmin <= R.deep * 0.9 && !have.has(String(s.id)));
      const sp = pool[Math.floor(rnd() * pool.length)];
      if (!sp || taken.has('photo' + sp.id)) continue;
      const pay = payFor(P, photoValue(sp), sp.dmin, rnd);
      return { kind, id: sp.id, key: 'photo' + sp.id, pay, who: 'The institute', text: `a photograph of ${an(sp.name)}` };
    }
    // salvage: a quantity of something from the bottom
    // [what, how many, how deep it is found]
    const opts = [['clam', 6, 5], ['mussel', 10, 5], ['pearl', 1, 5], ['glass', 2, 300], ['sapphire', 1, 520], ['bone', 2, 3300], ['nodule', 3, 3000]].filter(([, , d]) => d <= R.deep);
    const [k, n0, dk] = opts[Math.floor(rnd() * opts.length)];
    const n = Math.max(1, Math.round(n0 * (0.7 + rnd() * 0.6)));
    if (taken.has('salvage' + k)) continue;
    const pay = payFor(P, GOODS[k].price * n, dk, rnd);
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
    if (!c.taken) continue; // only the jobs he took at the radio
    let ok = false;
    let bonus = 1, rareName = '', deadPay = null;
    if (c.kind === 'live') {
      for (const L of lists) {
        // the best one aboard: a rare form, if there is one, pays its multiplier on top
        let j = -1;
        L.forEach((s, k) => { if (s.id === c.id && s.cond >= 0.5 && (j < 0 || (s.mult || 1) > (L[j].mult || 1))) j = k; });
        if (j >= 0) { const sp = L.splice(j, 1)[0]; bonus = sp.mult || 1; rareName = sp.variant ? sp.variant : ''; ok = true; break; }
      }
      // the museum takes a dead one if that is all there is, at the dead price and no more
      if (!ok && c.anyState) for (const L of lists) {
        const j = L.findIndex((s) => s.id === c.id && isDead(s));
        if (j >= 0) { const sp = L.splice(j, 1)[0]; deadPay = Math.round(liveValue(SPECIES_BY_ID[sp.id], sp.len) * 0.5 * statValue(P, 'payFish') * 100) / 100; ok = true; break; }
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
      const pay = deadPay !== null ? deadPay : Math.round(c.pay * bonus * 100) / 100;
      P.cash = Math.round((P.cash + pay) * 100) / 100;
      P.lifetime = Math.round((P.lifetime + pay) * 100) / 100;
      lines.push({ label: `Contract: ${c.text}${deadPay !== null ? ' (dead: half the market price)' : rareName ? ` (${rareName}, x${bonus})` : ''}`, n: 1, total: pay });
      g.contracts.splice(i, 1);
    }
  }
  if (lines.length) { P.taken = g.contracts.filter((q) => q.taken); fillBoard(P, g.contracts); }
  return lines;
}
// is a contract's goods aboard right now? (for the radio list)
export function ready(g, c, lists) {
  if (c.kind === 'live') return lists.some((L) => L.some((s) => s.id === c.id && (s.cond >= 0.5 || (c.anyState && isDead(s)))));
  if (c.kind === 'tag') return g.tags.some((t) => t.key === 'tag' + c.id || t.key.startsWith('tag' + c.id + ':'));
  if (c.kind === 'photo') return g.photos.some((p) => p.id === c.id);
  return (g.inv[c.item] || 0) >= c.n;
}
export { SPECIES_BY_ID };
