// (5.4) On a phone the panels keep their computer size, so their small buttons (a close ×, a tab, a link in the
// catalog) are small under a thumb. A tap that lands on nothing that can be tapped, but close to a small button or
// link, goes to it. A tap on anything that does something itself (a button, a link, a card with a pointer cursor,
// the game) is left alone.
const TAPPABLE = 'button, a[href], a[role], [role=button], input, select, textarea, label, summary, .slot, canvas';
const SMALL = 34; // points: a target under this, in either direction, gets the help
const REACH = 14; // points around it

function clickable(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches && n.matches(TAPPABLE)) return true;
    if (getComputedStyle(n).cursor === 'pointer') return true;
  }
  return false;
}

export function installFatFinger() {
  document.addEventListener('click', (ev) => {
    if (!document.documentElement.classList.contains('touch') || !ev.isTrusted) return;
    const t = ev.target;
    if (!(t instanceof Element) || t === document.body || t === document.documentElement || clickable(t)) return;
    const k = window.__fingerK || 1, reach = REACH * k, x = ev.clientX, y = ev.clientY;
    let best = null, bestD = Infinity;
    for (const c of document.querySelectorAll('button, a, [role=button]')) {
      if (c.disabled || !c.offsetParent) continue;
      const r = c.getBoundingClientRect();
      if (!r.width || (r.width / k >= SMALL && r.height / k >= SMALL)) continue;
      const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom), d = Math.hypot(dx, dy);
      if (d <= reach && d < bestD) {
        const top = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1));
        if (top && (top === c || c.contains(top))) { best = c; bestD = d; } // not one hidden under something else
      }
    }
    if (!best) return;
    ev.preventDefault(); ev.stopPropagation();
    best.click();
  }, true);
}
