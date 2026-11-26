// (7.6.62, owner) bake the game's drawn-once art into fixed PNGs, so nothing static is regenerated in play:
//   the Margaret's weathering (assets/textures/boat_wear.png) and the shipyard barge by day and night
//   (assets/textures/barge_day.png, barge_night.png). Needs the game served on :8765 (python3 -m http.server 8765).
//   node tools/bake_pngs.cjs
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/?noshell'); await p.waitForFunction(() => window.__earl && window.__earl.renderer, null, { timeout: 90000 });
  const out = await p.evaluate(async () => { const B = await import('./js/barge_draw.js'); const R = window.__earl.renderer, REF = 64;
    const w = Math.ceil(14 * REF * 1.3), h = Math.ceil(14 * REF * 0.75);
    return { wear: R.boatWearProc(w, h, false).toDataURL('image/png'), day: B.bargePictureProc(false, 128).toDataURL('image/png'), night: B.bargePictureProc(true, 128).toDataURL('image/png') }; });
  const dir = path.join(__dirname, '..', 'assets', 'textures');
  for (const [k, f] of [['wear', 'boat_wear.png'], ['day', 'barge_day.png'], ['night', 'barge_night.png']]) { fs.writeFileSync(path.join(dir, f), Buffer.from(out[k].split(',')[1], 'base64')); console.log(f); }
  await b.close(); })();
// afterwards: python3 -c "from PIL import Image; Image.open('assets/textures/boat_wear.png').convert('RGBA').quantize(colors=64, method=Image.Quantize.FASTOCTREE).save('assets/textures/boat_wear.png', optimize=True)"  (its per-pixel grain is 2.3 MB raw, 0.35 MB in 64 colours)
