const { chromium } = require('playwright');
const CSS = `
/* sample only: the three shops told apart inside the same layout */
#catalog.th-catalog header h1, #catalog:not(.th-dave):not(.th-station) header h1 { display: flex; align-items: center; gap: 12px; letter-spacing: 0.02em; }
#catalog:not(.th-dave):not(.th-station) header { box-shadow: inset 0 -3px 0 rgba(239,232,210,0.18), inset 0 -6px 0 rgba(0,0,0,0.25); }
#catalog .smark { width: 30px; height: 30px; flex: none; }
#catalog.th-dave header h1 { font: 700 30px "Barlow Semi Condensed", sans-serif !important; letter-spacing: 0.06em; text-transform: uppercase; }
#catalog.th-dave .cat-card .t { flex-wrap: wrap; } #catalog.th-dave .lot { display: block; flex-basis: 100%; font: 600 11px "Barlow Semi Condensed", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: #6a704e; margin-bottom: 1px; }
#catalog.th-station header h1 { font: 600 20px "Barlow Semi Condensed", sans-serif !important; letter-spacing: 0.22em; text-transform: uppercase; }
#catalog.th-station .scode { font: 500 12px "Barlow Semi Condensed", sans-serif; letter-spacing: 0.08em; color: #5e6a68; margin-left: 6px; }
`;
const MARK = `<svg class="smark" viewBox="0 0 30 30"><g fill="none" stroke="#efe8d2" stroke-width="1.8" stroke-linecap="round"><circle cx="15" cy="5" r="2.5"/><path d="M15 7.5v18M9 11h12M5 18c1 5 5 7.5 10 7.5S24 23 25 18"/><path d="M4 18l1.5-2.5L7 18M23 18l1.5-2.5L26 18"/></g><g stroke="#efe8d2" stroke-width="0.8" opacity="0.7"><path d="M9 21l12 0M10 23l10 0M12 25l6 0M11 19l2 6M15 19l0 6M19 19l-2 6"/></g></svg>`;
(async () => {
  const b = await chromium.launch(); const w = 844, h = 390;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8765/?noshell'); await p.waitForFunction(() => window.__earl && window.__earl.g, null, { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.touchscreen.tap(w / 2, h / 2); await p.waitForTimeout(700);
  const slot = await p.evaluate(() => { const r = document.querySelector('#slots .slot').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.touchscreen.tap(slot[0], slot[1]); await p.waitForTimeout(2500);
  for (let i = 0; i < 2; i++) { await p.evaluate(() => { const c = document.querySelector('#confirm .cf-no'); c && !document.getElementById('confirm').hidden && c.click(); }); await p.waitForTimeout(400); await p.evaluate(() => { const c = document.querySelector('#confirm .cf-yes'); c && !document.getElementById('confirm').hidden && c.click(); }); await p.waitForTimeout(400); }
  await p.evaluate(() => { const E = window.__earl; E.profile.tut = 'skip'; E.profile.cash = 12000; });
  await p.addStyleTag({ content: CSS });
  for (const [shop, page, tag] of [['bayside', 'fins', 'bayside'], ['dave', null, 'dave'], ['station', 'cam', 'station']]) {
    await p.evaluate(([shop, page]) => { const u = window.__earl.ui; u.toggleCatalog(true); u.catalog.show(shop); if (page) u.catalog.go(page); }, [shop, page]); await p.waitForTimeout(700);
    await p.evaluate(async ([shop, MARK]) => {
      const root = document.getElementById('catalog'), h1 = root.querySelector('header h1');
      if (shop === 'bayside' && !h1.querySelector('.smark')) h1.insertAdjacentHTML('afterbegin', MARK);
      if (shop === 'station') { h1.textContent = 'Meridian Deep Station · Stores'; }
      const cards = [...root.querySelectorAll('.cat-card')];
      cards.forEach((c, i) => { const t = c.querySelector('.t b'); if (!t) return;
        if (shop === 'dave' && !c.querySelector('.lot')) t.insertAdjacentHTML('beforebegin', `<span class="lot">Lot ${14 + i}</span>`);
        if (shop === 'station' && !c.querySelector('.scode')) t.insertAdjacentHTML('afterend', `<span class="scode">ST-${String(410 + i * 7).padStart(4, '0')}</span>`); });
      // the photographs: a studio sweep (light falling from the upper left, a darker floor, fine grain) instead of the flat gradient
      for (const img of root.querySelectorAll('.cat-card img, .cat-photo img')) {
        await new Promise((r) => (img.complete ? r() : (img.onload = r)));
        const W = img.naturalWidth, H = img.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
        x.drawImage(img, 0, 0); x.globalCompositeOperation = 'multiply';
        const g = x.createRadialGradient(W * 0.35, H * 0.15, 4, W * 0.45, H * 0.4, W * 0.75); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f4f0e6'); g.addColorStop(1, '#cfc8b8'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        const fl = x.createLinearGradient(0, H * 0.65, 0, H); fl.addColorStop(0, 'rgba(255,255,255,1)'); fl.addColorStop(1, 'rgba(224,216,200,1)'); x.fillStyle = fl; x.fillRect(0, H * 0.65, W, H * 0.35);
        x.globalCompositeOperation = 'source-over'; for (let i = 0; i < W * H / 60; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '40,34,24' : '255,250,238'},${Math.random() * 0.05})`; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
        img.src = c.toDataURL(); }
    }, [shop, MARK]);
    await p.waitForTimeout(600); await p.screenshot({ path: `/home/user/earldiver/docs/poc/shops/${tag}.png` });
  }
  console.log(errs.slice(0, 3)); await b.close();
})();
