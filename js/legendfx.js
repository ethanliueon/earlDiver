// (5.9.1) Legendary things give off slow sparks of old gold wherever they are shown: their tiles in the locker, the
// slots on Earl, their cards, the shop, a reward. One light canvas over the page draws them at each such element's
// place (anything carrying the class r-legendary that can be seen); found again every half second, drawn each frame.
import { legendMotes, ember } from './scrolls.js';

export function startLegendFx() {
  const c = document.createElement('canvas'); c.id = 'legendfx'; document.body.appendChild(c);
  const x = c.getContext('2d'); let els = [], lastScan = 0;
  // (7.3.0) only over a picture that is its own: a box marked Legendary that holds another thing's card (the inventory's
  // side-by-side pop-up, the hand net beside Gulper's Throat) had its sparks drawn over that other thing's picture
  const RAR = '.r-common,.r-uncommon,.r-rare,.r-exotic,.r-legendary,.r-mythical';
  const ownImg = (el) => [...el.querySelectorAll('img')].find((im) => im.parentElement && im.parentElement.closest(RAR) === el) || null;
  // (7.3.0) while a pop-up is open, only what is in it: a locker tile behind it had its sparks drawn through the pop-up
  const scan = () => { const pop = [...document.querySelectorAll('.item-pop')].find((el) => el.getClientRects().length > 0); els = [...(pop || document).querySelectorAll('.r-legendary,.r-mythical')].filter((el) => el.offsetParent !== null && !el.classList.contains('empty') && ownImg(el)); /* things with a picture, not words in a rarity's colour */ };
  const frame = (now) => {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    if (now - lastScan > 500) { lastScan = now; scan(); }
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    if (els.length) { x.setTransform(dpr, 0, 0, dpr, 0, 0); const t = now / 1000;
      els.forEach((el, i) => { // (6.0.18) the sparks stay inside the item's picture frame, clipped to it, never over the words
        const im = ownImg(el), fr = (im && im.parentElement && im.parentElement !== el ? im.parentElement : im) || el, r = fr.getBoundingClientRect();
        if (r.width < 8 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;
        // (7.3.0) and inside every box it scrolls in (a card scrolled down had its picture's sparks above the card)
        let L = r.left, T = r.top, R = r.right, B = r.bottom;
        for (let a = fr.parentElement; a && a !== document.body; a = a.parentElement) { const st = getComputedStyle(a); if (st.overflowY === 'visible' && st.overflowX === 'visible') continue; const q = a.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom); }
        if (R - L < 2 || B - T < 2) return;
        x.save(); x.beginPath(); x.rect(L, T, R - L, B - T); x.clip(); if (el.classList.contains('r-mythical')) mythMotes(x, r, t, i + 1); else legendMotes(x, r.left + r.width / 2, r.top + r.height / 2, r.width, r.height * 0.9, t, i + 1); x.restore(); }); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// (7.4.15, owner) a mythical's motes: more of them than a legendary's, embers rising, red cooling to orange (no sweep of
// shine: clipped to the picture's frame it showed as a pale box)
function mythMotes(x, r, t, seed) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) { const h = Math.sin(seed * 91.7 + i * 12.9898) * 43758.5453, u = h - Math.floor(h), ph = (t * (0.16 + (i % 5) * 0.035) + u) % 1;
    const px = r.left + r.width * (0.08 + 0.84 * ((u * 7.13) % 1)) + Math.sin(t * 1.1 + i) * r.width * 0.03, py = r.top + r.height * (0.95 - ph * 1.0);
    const a = Math.sin(Math.PI * ph) * (0.55 + 0.45 * Math.sin(t * 7 + i * 2)), rr = Math.max(1, Math.min(r.width, r.height) * (0.012 + (i % 3) * 0.006));
    ember(x, px, py, rr * 6, rr * 1.6, -Math.PI / 2 + Math.sin(t * 2 + i) * 0.25, a * 0.85); } // (7.4.24) slivers of ash, not dots
  x.restore();
}
