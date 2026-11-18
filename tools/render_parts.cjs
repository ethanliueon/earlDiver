#!/usr/bin/env node
// Renders the console parts (assets/src/parts/*.svg) to transparent PNGs in assets/ui/parts/ at 3x, so they stay
// sharp at every HUD size. The SVGs are the source: edit them, then run
//     node tools/render_parts.cjs
// (needs Playwright's Chromium; the fonts the drawings use are loaded from Google Fonts first).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SRC = path.join(__dirname, '..', 'assets', 'src', 'parts'), OUT = path.join(__dirname, '..', 'assets', 'ui', 'parts');
const SCALE = 3;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.svg')).sort();
  for (const f of files) {
    const svg = fs.readFileSync(path.join(SRC, f), 'utf8');
    const w = +svg.match(/width="([\d.]+)"/)[1], h = +svg.match(/height="([\d.]+)"/)[1];
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: SCALE });
    const p = await ctx.newPage();
    await p.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&display=block" rel="stylesheet">
      <style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    const out = path.join(OUT, f.replace(/\.svg$/, '.png'));
    await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`  ${f.padEnd(18)} ${w}x${h} -> ${w * SCALE}x${h * SCALE}`);
    await ctx.close();
  }
  await b.close();
})();
