// (5.9.1) Legendary things give off slow sparks of old gold wherever they are shown: their tiles in the locker, the
// slots on Earl, their cards, the shop, a reward. One light canvas over the page draws them at each such element's
// place (anything carrying the class r-legendary that can be seen); found again every half second, drawn each frame.
import { legendMotes } from './scrolls.js';

export function startLegendFx() {
  const c = document.createElement('canvas'); c.id = 'legendfx'; document.body.appendChild(c);
  const x = c.getContext('2d'); let els = [], lastScan = 0;
  const scan = () => { els = [...document.querySelectorAll('.r-legendary')].filter((el) => el.offsetParent !== null && !el.classList.contains('empty') && el.querySelector('img')); /* things with a picture, not words in a rarity's colour */ };
  const frame = (now) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    if (now - lastScan > 500) { lastScan = now; scan(); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    if (els.length) { x.setTransform(dpr, 0, 0, dpr, 0, 0); const t = now / 1000;
      els.forEach((el, i) => { // (6.0.18) the sparks stay inside the item's picture frame, clipped to it, never over the words
        const im = el.querySelector('img'), fr = (im && im.parentElement && im.parentElement !== el ? im.parentElement : im) || el, r = fr.getBoundingClientRect();
        if (r.width < 8 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;
        x.save(); x.beginPath(); x.rect(r.left, r.top, r.width, r.height); x.clip(); legendMotes(x, r.left + r.width / 2, r.top + r.height / 2, r.width, r.height * 0.9, t, i + 1); x.restore(); }); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
