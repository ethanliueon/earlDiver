// (5.9.1) Legendary things give off slow sparks of old gold wherever they are shown: their tiles in the locker, the
// slots on Earl, their cards, the shop, a reward. One light canvas over the page draws them at each such element's
// place (anything carrying the class r-legendary that can be seen); found again every half second, drawn each frame.
import { legendMotes, ember } from './scrolls.js';

export function startLegendFx() {
  // (7.5.3, owner) each picture carries its own small canvas, inside its frame: it scrolls with the picture and is clipped
  // by whatever box it scrolls in, by the page itself. (One canvas over the page, moved each frame to where the pictures
  // were, trailed them by a frame while a list scrolled: the sparks jittered.) Found again every half second; only those
  // on screen are drawn.
  const RAR = '.r-common,.r-uncommon,.r-rare,.r-exotic,.r-legendary,.r-mythical';
  const ownImg = (el) => [...el.querySelectorAll('img')].find((im) => im.parentElement && im.parentElement.closest(RAR) === el) || null;
  const live = new Map(); let lastScan = 0, seed = 0;
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => { for (const en of es) { const L = en.target.__lfx; if (L) L.vis = en.isIntersecting; } }) : null;
  const drop = (L) => { if (io) io.unobserve(L.c); L.c.remove(); live.delete(L.el); };
  const scan = () => {
    // (7.3.0) while a pop-up is open, only what is in it; only things with a picture of their own
    const pop = [...document.querySelectorAll('.item-pop')].find((el) => el.getClientRects().length > 0);
    const want = new Set([...(pop || document).querySelectorAll('.r-legendary,.r-mythical')].filter((el) => el.offsetParent !== null && !el.classList.contains('empty') && ownImg(el)));
    for (const L of [...live.values()]) if (!want.has(L.el) || !L.c.isConnected || !L.el.isConnected) drop(L);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const el of want) {
      const im = ownImg(el), fr = (im && im.parentElement && im.parentElement !== el ? im.parentElement : im) || el;
      const host = fr.tagName === 'IMG' ? fr.parentElement : fr; if (!host) continue;
      let L = live.get(el);
      if (!L) { const c = document.createElement('canvas'); c.className = 'lfx'; c.setAttribute('aria-hidden', 'true'); c.__lfx = L = { el, c, x: c.getContext('2d'), seed: ++seed, vis: !io, myth: false }; live.set(el, L); if (io) io.observe(c); }
      if (L.c.parentElement !== host) host.appendChild(L.c);
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      // the frame's box in the host's own units (a scaled panel scales the canvas with it); its pixels from the screen size
      const ox = fr === host ? 0 : fr.offsetLeft, oy = fr === host ? 0 : fr.offsetTop, w = fr.offsetWidth, h = fr.offsetHeight;
      const st = L.c.style; st.left = ox + 'px'; st.top = oy + 'px'; st.width = w + 'px'; st.height = h + 'px';
      const sr = fr.getBoundingClientRect(), pw = Math.max(1, Math.round(sr.width * dpr)), ph = Math.max(1, Math.round(sr.height * dpr));
      if (L.c.width !== pw || L.c.height !== ph) { L.c.width = pw; L.c.height = ph; }
      L.w = w; L.h = h; L.myth = el.classList.contains('r-mythical');
    }
  };
  const frame = (now) => {
    if (now - lastScan > 500) { lastScan = now; scan(); }
    const t = now / 1000;
    for (const L of live.values()) {
      if (!L.c.isConnected || !L.el.isConnected) { lastScan = 0; continue; } // redrawn elsewhere (a list drawn again): found on the next frame
      if (!L.vis || !L.w || !L.h) continue;
      const x = L.x; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, L.c.width, L.c.height); x.setTransform(L.c.width / L.w, 0, 0, L.c.height / L.h, 0, 0);
      const r = { left: 0, top: 0, width: L.w, height: L.h };
      if (L.myth) mythMotes(x, r, t, L.seed); else legendMotes(x, L.w / 2, L.h / 2, L.w, L.h * 0.9, t, L.seed);
    }
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
