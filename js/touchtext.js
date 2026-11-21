// (5.4) On a touch screen the game's words still named keys ("press F to observe it", "Journal (J)"). Rather than
// fork every sentence, the words shown on the page are rewritten as they appear: "press F" becomes "tap", a key in
// brackets is dropped, and key caps in the HTML are hidden by css/olive.css (html.touch kbd). Only text nodes are
// touched, and only while the page is in touch mode.
const KEY = '(?:[A-Z]|[0-9]|Esc|Space|Shift|Enter|Tab|RMB|LMB)'; // (5.10.10) the number keys too
const RULES = [
  [new RegExp(`\\b[Pp]ress(?:ing)? ${KEY}\\b(?: (?:again|twice))?`, 'g'), (m) => (m[0] === 'P' ? 'Tap' : 'tap')],
  [new RegExp(`\\b([Hh]old) ${KEY}\\b`, 'g'), (m, h) => `${h} the button`],
  [new RegExp(`\\s?\\(${KEY}\\)`, 'g'), ''],
  [new RegExp(`\\s?\\[${KEY}\\]`, 'g'), ''],
  [/\s?\(or the right mouse button\)/g, ''],
  [/\b(?:the )?right mouse button\b/g, 'the button'],
  [new RegExp(`,?\\s*${KEY}(?: or ${KEY})* to (?:cancel|close)`, 'g'), ''],
  [/\b([Cc])lick(s|ing|ed)?\b/g, (m, c, e) => (c === 'C' ? 'Tap' : 'tap') + (e === 'ing' ? 'ping' : e === 'ed' ? 'ped' : e || '')],
  [/,?\s*(?:hold right to sprint|wheel zoom)/g, ''],
];
export function touchWords(s) {
  let out = s;
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out;
}
let on = false, obs = null;
function fix(node) {
  if (node.nodeType === 3) { const t = node.nodeValue, u = touchWords(t); if (u !== t) node.nodeValue = u; return; }
  if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'TEXTAREA' || node.tagName === 'INPUT') return;
  const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const t = n.nodeValue, u = touchWords(t); if (u !== t) n.nodeValue = u; }
}
export function setTouchText(enable) {
  if (enable === on) return;
  on = enable;
  if (!on) { if (obs) obs.disconnect(); return; }
  fix(document.body);
  obs = obs || new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fix(m.target);
      else for (const n of m.addedNodes) fix(n);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
