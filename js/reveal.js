// (6.5.0) A panel is never seen half-drawn. When one opens (its `hidden` goes), it is held invisible until every picture
// in it is decoded (the olive plates, the gear, the animals), then fades in over a sixth of a second. It never waits
// more than half a second: a picture that cannot load does not keep a panel shut.
const IDS = ['inventory', 'journal', 'quests', 'workshop', 'settings', 'store', 'events', 'confirm', 'catalog', 'cave', 'gallery', 'tankroom', 'chart', 'pause', 'dave', 'oldcard'];
const CSS_PICS = ['assets/ui/olive/panel.png', 'assets/ui/olive/tile.png', 'assets/ui/olive/btn-olive.png', 'assets/ui/olive/btn-olive-down.png', 'assets/ui/olive/btn-cream.png', 'assets/ui/olive/btn-cream-down.png', 'assets/ui/olive/well.png', 'assets/ui/olive/pegboard.png', 'assets/ui/olive/locker-door.jpg', 'assets/ui/olive/locker-door-m.jpg', 'assets/ui/book/page_left.jpg', 'assets/ui/book/page_right.jpg', 'assets/ui/book/tab.png', 'assets/ui/book/tab_on.png'];
// the plates' own pictures, decoded once at the start (behind the loading screen) and kept, so the first panel opened
// has them ready
export const platesReady = Promise.all(CSS_PICS.map((src) => { const im = new Image(); im.src = src; (window.__keepPics = window.__keepPics || []).push(im); return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); }));
function settle(el) {
  const pics = [...el.querySelectorAll('img')].filter((im) => im.src && !(im.complete && im.naturalWidth));
  const wait = Promise.all(pics.map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve())));
  return Promise.race([Promise.all([wait, platesReady]), new Promise((r) => setTimeout(r, 500))]);
}
function watch(el) {
  if (!el || el.__reveal) return; el.__reveal = true;
  let shown = !el.hidden;
  new MutationObserver(() => {
    const now = !el.hidden; if (now === shown) return; shown = now;
    if (!now) { el.style.removeProperty('opacity'); el.style.removeProperty('transition'); return; }
    el.style.setProperty('transition', 'none'); el.style.setProperty('opacity', '0');
    // two frames: the panel's contents are written in the same turn it is shown, then their pictures are waited on
    requestAnimationFrame(() => requestAnimationFrame(() => settle(el).then(() => {
      if (el.hidden) return;
      el.style.setProperty('transition', 'opacity 0.16s ease-out'); el.style.setProperty('opacity', '1');
      setTimeout(() => { if (!el.hidden) { el.style.removeProperty('transition'); el.style.removeProperty('opacity'); } }, 220);
    })));
  }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
}
export function watchPanels() { for (const id of IDS) watch(document.getElementById(id)); }
