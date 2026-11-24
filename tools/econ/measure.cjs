// (7.3.6) The economy's measuring tool: what is met at each submersible's working depth (85 % of its rating), from the
// game's own spawn picker (fauna.js trySpawn) at five places across the sea, and what it pays. Only what can be put in
// the tank counts (under 4 m and not camera-only; a healthy usual-size animal at condition 0.8, as in 7.3.0); camera-only
// animals are listed but never counted as income. Income per hour = the average animal x animals an hour for that sub
// (7.3.0's measured rates, kept). Usage: node tools/econ/measure.cjs [samples per depth]   (server on :8765)
const { chromium } = require('playwright');
const N = +(process.argv[2] || 6000);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8765/index.html?noshell', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.__earl && window.__earl.g && window.__earl.g.fauna, null, { timeout: 90000 }); await p.waitForTimeout(1500);
  const out = await p.evaluate(async (N) => {
    const S = await import('/js/specimens.js'), E = await import('/js/economy.js'), Sv = await import('/js/survey.js');
    const g = window.__earl.g, F = g.fauna, RATE = [14.6, 22, 24.4, 27.4, 26.2, 36.7, 41.7, 44.7]; // animals an hour (7.3.0)
    const res = [];
    for (let si = 0; si < E.SUBS.length; si++) {
      const y0 = Math.round(E.SUBS[si].rated * 0.85), counts = new Map(); let n = 0;
      for (const x0 of [300, 900, 1500, 2100, 4200]) {
        const floor = F.W.floorAt(x0); if (floor < y0 + 20) continue;
        for (let k = 0; k < N / 5; k++) {
          F.list.splice(0); const cam = { x: x0, y: y0, w: 40, h: 22 }; F.trySpawn(cam, 0);
          for (const c of F.list) { counts.set(c.sp.id, (counts.get(c.sp.id) || 0) + 1); n++; }
        }
      }
      let tot = 0, cnt = 0, photoOnly = 0; const top = [];
      for (const [id, k] of counts) {
        const sp = window.__earl.SPECIES_BY_ID[id], R = S.rarityOf(sp), net = sp.len < 4 && !S.isTagOnly(sp);
        const v = net ? S.rarityPrice(sp) * 0.8 : 0; if (net) { tot += v * k; cnt += k; } else photoOnly += k;
        top.push([sp.name, R.id, k / n, Math.round(v), net ? '' : 'photo $' + Math.round(Sv.photoValue(sp))]);
      }
      top.sort((a, c) => c[2] * (c[3] || 0) - a[2] * (a[3] || 0));
      const avg = cnt ? tot / cnt : 0;
      res.push({ sub: E.SUBS[si].name, rated: E.SUBS[si].rated, depth: y0, met: n, avg: Math.round(avg), perHour: Math.round(avg * RATE[si]), photoOnly: photoOnly / Math.max(1, n),
        top: top.slice(0, 6).map((t) => `${t[0]} (${t[1]}, ${(t[2] * 100).toFixed(2)} %, $${t[3]}${t[4] ? ', ' + t[4] : ''})`) });
    }
    return res;
  }, N);
  for (const r of out) { console.log(`${r.sub} (${r.rated} m, works at ${r.depth} m): met ${r.met}, average animal $${r.avg}, about $${r.perHour}/h, camera-only ${(r.photoOnly * 100).toFixed(2)} %`); for (const t of r.top) console.log('    ' + t); }
  console.log(JSON.stringify(out.map((r) => r.perHour)));
  await b.close();
})();
