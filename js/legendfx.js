// (5.9.1) Legendary things give off slow sparks of old gold wherever they are shown: their tiles in the locker, the
// slots on Earl, their cards, the shop, a reward. One light canvas over the page draws them at each such element's
// place (anything carrying the class r-legendary that can be seen); found again every half second, drawn each frame.
import { legendMotes } from './scrolls.js';

export function startLegendFx() {
  const c = document.createElement('canvas'); c.id = 'legendfx'; document.body.appendChild(c);
  const x = c.getContext('2d'); let els = [], lastScan = 0;
  // (7.3.0) only over a picture that is its own: a box marked Legendary that holds another thing's card (the inventory's
  // side-by-side pop-up, the hand net beside Gulper's Throat) had its sparks drawn over that other thing's picture
  const RAR = '.r-common,.r-uncommon,.r-rare,.r-exotic,.r-legendary';
  const ownImg = (el) => [...el.querySelectorAll('img')].find((im) => im.parentElement && im.parentElement.closest(RAR) === el) || null;
  // (7.3.0) while a pop-up is open, only what is in it: a locker tile behind it had its sparks drawn through the pop-up
  const scan = () => { const pop = [...document.querySelectorAll('.item-pop')].find((el) => el.getClientRects().length > 0); els = [...(pop || document).querySelectorAll('.r-legendary')].filter((el) => el.offsetParent !== null && !el.classList.contains('empty') && ownImg(el)); /* things with a picture, not words in a rarity's colour */ };
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
        x.save(); x.beginPath(); x.rect(L, T, R - L, B - T); x.clip(); legendMotes(x, r.left + r.width / 2, r.top + r.height / 2, r.width, r.height * 0.9, t, i + 1); x.restore(); }); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
