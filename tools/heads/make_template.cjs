// (7.6.37) The ChatGPT template for the painted heads: the game's own code-drawn bare head (face_draw.js), turned upright in
// profile facing right, in a neutral grey-beige skin, on pure key green, with four registration crosses in the corners.
// Run with the game served on localhost:8765:  node tools/heads/make_template.cjs
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1100, height: 1100 } })).newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message)); await p.goto('http://localhost:8765/README.md');
  for (const sex of ['m', 'f']) {
    const url = await p.evaluate(async (sex) => { const F = await import('/js/face_draw.js');
      if (!F.SKINS.some((s) => s[0] === '#c9bfb1')) F.SKINS.push(['#c9bfb1', '#a99e90', '#7c7268']); const skin = F.SKINS.findIndex((s) => s[0] === '#c9bfb1');
      const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
      x.fillStyle = '#00ff00'; x.fillRect(0, 0, 1024, 1024);
      x.save(); x.setTransform(0, -1, 1, 0, 470, 560); // the diver's local axes (+x up, +y toward the face) to upright, facing right
      F.drawFace(x, 0, 0, 44, { sex, face: 0, eyes: 1, hair: 'none', skin, beard: 0, eyeCol: '#3a2e22' }); x.restore();
      x.strokeStyle = '#000000'; x.lineWidth = 4; for (const [cx, cy] of [[48, 48], [976, 48], [48, 976], [976, 976]]) { x.beginPath(); x.moveTo(cx - 20, cy); x.lineTo(cx + 20, cy); x.moveTo(cx, cy - 20); x.lineTo(cx, cy + 20); x.stroke(); }
      return c.toDataURL('image/png'); }, sex);
    fs.writeFileSync(path.join(OUT, `template_${sex}.png`), Buffer.from(url.split(',')[1], 'base64')); }
  await b.close(); console.log('ok'); })();
