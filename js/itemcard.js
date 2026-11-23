// (6.5.3) The parts every item card shares, wherever it is opened (a gain, a chest find, the daily gift, the bag): the
// legendary power right under the description, and the skills as a short list. The spacing between the picture, the
// name, the rarity, the description, the power and the skills is the same on every card (olive.css .icard); only the
// card's height changes with how much there is.
import { SKILLS, LEGEND, skillCol } from './item_data.js';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
// a few words for each skill; the full meaning unfolds under it on a tap
// (6.5.8) a thing's rarity always says what kind of thing it is: "Rare suit", "Exotic camera", "Uncommon trap", "Rare item"
const KIND_WORD = { suit: 'suit', net: 'net', cam: 'camera', tank: 'tank', fins: 'fins', bag: 'bag', slurp: 'slurp gun', tag: 'tag gun', scroll: 'scroll', chest: 'chest', trap: 'trap', trawl: 'trawl net', pet: 'pet' };
export const rarKind = (rarityName, kind) => `${rarityName} ${KIND_WORD[kind] || 'item'}`;
export const SKILL_SHORT = {
  performance: 'More catches land', oversized: 'Bigger fish', overreaching: 'Longer reach', quickdraw: 'Faster swing',
  haste: 'Faster swimming', rebreathing: 'Air lasts longer', ambush: 'Fish startle less', pockets: 'More bag space',
  feather: 'Lighter full bag', warmth: 'Cold costs less air', hardened: 'Bites hurt less', mending: 'Heal faster',
  shutterbug: 'More photos per dive', scholar: 'Photos pay more', prospector: 'Spot pearls from farther', resilience: 'Pressure hurts less',
  biolum: 'You give off light',
};
// a power: one sentence
export const POWER_LINE = {
  eye: 'Legendary animals glow.', magnetic: 'Exotic and legendary fish within 50 m slowly swim toward you.',
  faithless: "Animals can't hurt you, and the thing hunts you more slowly.", secondwind: 'Your air refills once when it runs out.',
  rebirth: 'Sometimes the sea gives you back.', kinship: 'Animals in your bag never suffer.',
};
const every = (cd) => (cd >= 3600 ? `Every ${Math.round(cd / 3600)} h` : `Every ${Math.round(cd / 60)} min`);
export function powerHtml(k, extra = '') {
  const L = LEGEND[k]; if (!L) return '';
  return `<div class="ic-pow"><div class="ic-pow-h"><b style="color:${skillCol(k)}">${L.name}</b><i class="ic-tag">${L.cd ? every(L.cd) : 'Passive'}</i></div><p>${POWER_LINE[k] || L.what}</p>${extra}</div>`;
}
export function skillsHtml(sk) {
  if (!sk || !sk.length) return '';
  return `<ul class="ic-sks">${sk.map(([k, l]) => { const S = SKILLS[k]; if (!S) return ''; const sh = SKILL_SHORT[k] || S.what, more = S.what.length > sh.length * 1.6 + 8; // (6.5.3) it unfolds only when the full meaning adds something
    return `<li class="${more ? 'more' : ''}"><b style="color:${skillCol(k, l)}">${S.name}${S.flat ? '' : ' ' + ROMAN[l]}</b><span>${sh}</span>${more ? `<em>${S.what.charAt(0).toUpperCase() + S.what.slice(1)}.</em>` : ''}</li>`; }).join('')}</ul>`;
}
// a tap on a skill unfolds its full meaning (and folds it again); one listener for every card
if (typeof document !== 'undefined') document.addEventListener('click', (ev) => { const li = ev.target.closest && ev.target.closest('.ic-sks li.more'); if (li) { li.classList.toggle('open'); ev.stopPropagation(); } }, true);
