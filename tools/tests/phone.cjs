// The phone regression test (7.2.4): title, creator, then the tutorial played by real taps on whatever the
// tutorial lights up (the HUD button it rings, the thing in the world, the DOM element under its spotlight).
// Earl is moved to the next place through window.__earl, as if he had swum there. Usage: node phone.cjs [W H] [outdir]
const { chromium } = require('playwright');
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390), OUT = process.argv[4] || 'ph';
require('fs').mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().replace(/^.*?8765/, '')); });
  const E = (fn, a) => p.evaluate(fn, a), wait = (ms) => p.waitForTimeout(ms);
  let shotN = 0; const shot = async (name) => { await p.screenshot({ path: `${OUT}/${String(shotN++).padStart(2, '0')}-${name}.png` }); };
  const tapAt = async (x, y) => { await p.touchscreen.tap(Math.round(x), Math.round(y)); };
  const tapEl = async (sel) => { const r = await E((s) => { const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent || e.getClientRects().length); if (!el) return null; const q = el.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, sel); if (!r) return false; await tapAt(r[0], r[1]); return true; };
  const tapHud = async (key) => { const r = await E((k) => { const h = (window.__hudHots || []).find((q) => q.key === k); return h ? [h.x + h.w / 2, h.y + h.h / 2] : null; }, key); if (!r) return false; await tapAt(r[0], r[1]); return true; };
  // the visible words on screen that still name keys or a mouse
  const keyWords = () => E(() => { const re = /\b[Pp]ress(?:ing)? (?:[A-Z]|[0-9]|Esc|Space|Shift)\b|\bClick|\bclick|\((?:[A-Z]|Esc|Space|Shift)\)|\bEsc\b|right mouse|\bShift\b|\bkeyboard\b/; const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) { const el = n.parentElement; if (!el || el.closest('script,style,[hidden]') || !el.getClientRects().length) continue; if (re.test(n.nodeValue)) out.push(n.nodeValue.trim().slice(0, 80)); } return out; });
  const bad = new Set();
  const check = async () => { for (const t of await keyWords()) bad.add(t); };
  await p.goto('http://localhost:8765/?noshell'); await p.waitForFunction(() => window.__earl && window.__earl.g, null, { timeout: 60000 }); await wait(3000);
  await shot('title'); await check();
  await tapAt(W / 2, H / 2); await wait(1200); await shot('slots'); await check();
  await wait(1500);
  for (let k = 0; k < 4 && !(await E(() => !!document.querySelector('#creator:not([hidden]), .creator:not([hidden])') || [...document.querySelectorAll('button')].some((x) => /^\s*skip/i.test(x.textContent) && x.offsetParent))); k++) { await tapEl('#slots .slot'); await wait(1800); }
  await shot('creator'); await check();
  const skip = await E(() => { const b = [...document.querySelectorAll('button')].find((x) => /^\s*skip/i.test(x.textContent) && x.offsetParent); if (!b) return null; const q = b.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
  if (skip) await tapAt(skip[0], skip[1]); await wait(3500);
  await shot('welcome'); await check(); await tapEl('#confirm .cf-yes'); await wait(1500);
  await shot('deck'); await check();
  const state = () => E(() => { const g = window.__earl.g, P = window.__earl.profile, l = document.querySelector('#tut-spot .ts-line'); const hole = document.querySelector('#tut-spot .ts-hole'); const hs = hole && getComputedStyle(hole).display !== 'none' ? hole.getBoundingClientRect() : null;
    return { line: l ? l.textContent : '', tutKey: window.__hudTutKey || null, act: g.tutAction ? g.tutAction.id : null, hole: hs && hs.width > 4 ? [hs.x + hs.width / 2, hs.y + hs.height / 2] : null, bag: g.bag.length, cash: P.cash, main: P.quests ? P.quests.main : null, tut: P.tut, aboard: !!g.aboard, cabin: !document.getElementById('cabin').hidden, fish: !!g.tutFish, y: Math.round(g.earl.y), marks: (window.__earl.renderer.tapRects || []).map((r) => r.what + ':' + r.key).join(',') }; });
  const seen = new Set(); let last = '';
  for (let i = 0; i < 160; i++) {
    const s = await state();
    if (s.tut !== 'on') { console.log('tutorial left at step', i, s.tut); break; }
    if (s.line !== last) { last = s.line; console.log(`[${i}] "${s.line}" key=${s.tutKey} act=${s.act} hole=${!!s.hole} bag=${s.bag} cash=${s.cash} marks=${s.marks}`); if (!seen.has(s.line)) { seen.add(s.line); await shot(s.line.replace(/[^a-z]+/gi, '_').slice(0, 30)); await check(); } }
    if (/sub trip|Get in the sub|drive/i.test(s.line)) { console.log('reached the sub trip'); break; }
    // 0. a tutorial card with its own button: tap it
    if (await E(() => { const c = document.querySelector('#tut-spot .ts-card'); return !!(c && getComputedStyle(c).display !== 'none' && c.querySelector('button')); })) { if (!seen.has('card')) { seen.add('card'); await shot('tour-card'); } await tapEl('#tut-spot .ts-card button'); await wait(900); continue; }
    // 1. the spotlight on a page or panel: tap the lit thing
    if (s.hole) { await tapAt(s.hole[0], s.hole[1]); await wait(900); continue; }
    // 2. a HUD button ringed: tap it
    if (s.tutKey && await tapHud(s.tutKey)) { await wait(900); continue; }
    // 3. the tutorial's own action: a thing to tap in the world
    if (s.marks && !s.cabin) { const r = await E(() => { const t = (window.__earl.renderer.tapRects || [])[0]; return t ? [t.x + t.w / 2, t.y + t.h / 2] : null; }); if (r) { await tapAt(r[0], r[1]); await wait(1200); continue; } }
    // 4. otherwise: where the step wants him (as if he had swum there)
    if (/off the end of the deck|jump in/i.test(s.line)) { await E(() => { const g = window.__earl.g; if (g.aboard) { g.aboard = null; } g.earl.y = 3; }); await wait(800); continue; }
    if (/fish|net|Observe|catch/i.test(s.line) && s.fish) { await E(() => { const g = window.__earl.g, f = g.tutFish; g.aboard = null; g.earl.x = f.x + 1.2; g.earl.y = f.y; g.earl.vx = g.earl.vy = 0; g.earl.facing = -1; }); await wait(700); if (!(await tapHud('obs')) && !(await tapHud(' ')) && !(await tapHud('f'))) await tapHud('1'); await wait(900); continue; }
    if (/surface|Swim up|winch|Margaret/i.test(s.line)) { await E(async () => { const Wd = await import('/js/world.js'); const e = window.__earl.g.earl; window.__earl.g.aboard = null; e.x = Wd.BOAT.x + 2; e.y = 0.4; }); await wait(1500); continue; }
    if (/cabin door/i.test(s.line) && s.aboard) { await E(async () => { const g = window.__earl.g; for (let x = -6; x <= 6; x += 0.25) { g.aboard.x = x; await new Promise((r) => setTimeout(r, 60)); if (g.aboard.near === 'door') break; } }); await wait(800); continue; }
    if (/computer|desk|shop/i.test(s.line) && s.cabin) { await E(async () => { const c = window.__earl.ui.cabin; for (let x = 0.05; x <= 0.95; x += 0.02) { c.x = x; c.goal = null; await new Promise((r) => setTimeout(r, 60)); if (c.near() === 'desk') break; } }); await wait(600); const px = await E(() => { const c = window.__earl.ui.cabin; return c.x * innerWidth - (c.camX || 0); }); await tapAt(px, H * 0.6); await wait(1500); continue; }
    if (/cabin|computer|desk|aboard|ladder|deck/i.test(s.line)) { await E(() => { window.__earl.boardDeck && window.__earl.boardDeck(false, true); }); await wait(1200); continue; }
    await wait(700);
  }
  await shot('final'); console.log('final state', JSON.stringify(await state()), await E(() => JSON.stringify({ t: window.__earl.g.tut && window.__earl.g.tut.text, spot: window.__earl.g.tut && window.__earl.g.tut.spot, kit: window.__earl.profile.kit, can: window.__earl.ui.h.canChangeGear && window.__earl.ui.h.canChangeGear() })), await E(() => ({ inv: !document.getElementById('inventory').hidden, card: (document.querySelector('#tut-spot .ts-card') || {}).style?.display })));
  await check();
  console.log('key words on screen:', [...bad]);
  console.log('errors:', errs.slice(0, 8));
  await b.close();
})();
