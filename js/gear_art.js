import { glint } from './scrolls.js';
// (5.12.6) Gear photographed for the shop, as the suits are (suit_art.js): each thing drawn as a solid object lit from
// the top, its real parts and its own shape, a faint shadow round its outline, nothing flat or stencilled. Rarity shows
// as craft: a stripe, then better hardware, then stitching and brass, then a glow and sparks at the top.
// Fins: a pair, one lying across the other. Each kind its own blade: rubber (classic, flared), split (cut down the
// middle), long (a long, narrow blade), free (very long freediving carbon) and jet (short, stiff and square, vented).
const TAU = Math.PI * 2;
const RK = { common: 0, uncommon: 1, rare: 2, exotic: 3, legendary: 4 };
const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c || ''); if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } const r = /rgba?\(([^)]+)\)/.exec(c || ''); if (r) return r[1].split(',').slice(0, 3).map((v) => +v); return [40, 42, 44]; };
const mix = (c, t, k) => { const a = hex(c), b = hex(t); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
const rgba = (c, al) => { const a = hex(c); return `rgba(${a[0]},${a[1]},${a[2]},${al})`; };
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); for (const [k, c] of stops) g.addColorStop(k, c); return g; };

// the scene is drawn in a 1000 x 400 frame, then fitted into the picture with a faint outline shadow under it
function fitted(ctx, w, h, draw, aspect = 2.5) {
  const W = 1000, H = W / aspect, k = Math.min((w * 0.9) / W, (h * 0.86) / H);
  const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); const x = c.getContext('2d');
  x.translate(w / 2, h / 2); x.scale(k, k); x.translate(-W / 2, -H / 2); draw(x, W, H);
  const s = document.createElement('canvas'); s.width = c.width; s.height = c.height; const sx = s.getContext('2d');
  sx.drawImage(c, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(20,24,28,1)'; sx.fillRect(0, 0, w, h);
  ctx.save(); ctx.globalAlpha = 0.24; ctx.filter = `blur(${Math.max(1, h * 0.018).toFixed(1)}px)`; ctx.drawImage(s, Math.max(0.5, h * 0.004), Math.max(1, h * 0.014)); ctx.restore();
  ctx.drawImage(c, 0, 0);
}
function sparks(x, W, H, col, seed) { // (6.0.10) still glints in the picture, each in the item's own glow
  let sd = seed; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647), lt = hex(mix(col, '#fff4dc', 0.55));
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) { const px = 80 + rnd() * (W - 160), py = 40 + rnd() * (H - 80); glint(x, px, py, 5 + rnd() * 7, 0.45 + rnd() * 0.5, (rnd() - 0.5) * 0.5, lt); }
  x.restore();
}

// ---------------------------------------------------------------- exotics: the expeditions ----------------------------------------------------------------
// (5.15.4) An exotic is a piece of a real expedition's kit and looks its age, beyond its colour: Victorian survey gear
// (the 1870s to 1900s) is varnished wood, brass, copper, leather and tarred hemp; interwar gear (the 1920s to 1940s)
// black-painted riveted iron, brass fittings and canvas; post-war gear (the 1950s to 1980s) steel painted in the
// expedition's own colour, stainless fittings, black rubber and nylon. Each carries its expedition's name: a brass plate
// on the old ones, a stencil on the post-war ones, moulded into the rubber on fins.
const ERA_MAT = {
  victorian: { metal: '#a8864e', wood: ['#9a6a3e', '#6a4222', '#2e1a0c'], body: '#9a6040', leather: '#5a3a22', twine: '#7a6440', cloth: '#7a6040', grip: '#4a2e1a' },
  interwar: { metal: '#9a7840', wood: ['#46463f', '#2a2a27', '#0e0e0c'], body: '#3a3a36', leather: '#4a3020', twine: '#4e4432', cloth: '#6e6850', grip: '#8a8068' },
  postwar: { metal: '#b0b4b4', leather: '#1c1c1c', twine: '#7a8a78', grip: '#1a1b1c' },
};
const ERA_KEYS = [
  [/Challenger|Valdivia|Albatross|Hirondelle|Siboga|Pearl lugger|Kalymnos|Standard diving dress/, 'victorian'],
  [/Bathysphere|Meteor|Discovery|Dana|Carnegie|Atlantis|Grand Banks|Argonaut|Ligurian|Spearfisher|Frogman|Naval oxygen|Aqualung/, 'interwar'],
  [/Trieste/, 'postwar', '#5a6a78'], [/Sealab/, 'postwar', '#a8843a'], [/Conshelf/, 'postwar', '#b0943e'], [/Tektite/, 'postwar', '#9a9a8c'], [/Hydrolab/, 'postwar', '#9a5232'],
  [/Navy/, 'postwar', '#5e666a'], [/Deep Quest/, 'postwar', '#a89a6a'], [/Polar|Arctic/, 'postwar', '#8a3a2e'], [/Galathea/, 'postwar', '#3e5a4a'], [/Vitiaz/, 'postwar', '#5a6650'],
  [/Gulf|North Sea|Salvage|Iron Lung/, 'postwar', '#a08a3a'], [/Bikini/, 'postwar', '#5a5a3a'], [/La Jolla/, 'postwar', '#6a7470'], [/Lake Zurich/, 'postwar', '#a8a49a'],
  [/Combat|Clearance/, 'postwar', '#3a4038'], [/Shark/, 'postwar', '#7a7e7e'], [/Deep lander|Abyssal/, 'postwar', '#2a2c2c'], [/Bathythermal/, 'postwar', '#6a5a48'],
];
export function eraOf(def) {
  if (!def || RK[def.rarity] !== 3 || !def.name) return null;
  for (const [re, era, paint] of ERA_KEYS) { const m = re.exec(def.name); if (!m) continue;
    const yr = /\b(18|19)\d\d\b/.exec(def.name), word = m[0].replace('Standard diving dress', 'Standard').replace(/^(Gulf|Polar|Arctic|Combat|Clearance|Shark)$/, (w2) => w2);
    return { era, paint: paint || ERA_MAT[era].body, label: (word + (yr ? ' ' + yr[0] : '')).toUpperCase(), ...ERA_MAT[era] }; }
  return { era: 'postwar', paint: '#5e666a', label: '', ...ERA_MAT.postwar };
}
const shade3 = (c) => [mix(c, '#fff', 0.14), c, mix(c, '#000', 0.5)];
// the expedition's name: engraved on a small brass plate held by two screws (the old eras), or stencilled in worn paint
function eraMark(x, E, cx, cy, size, rot = 0, on = '#444') {
  if (!E || !E.label) return;
  x.save(); x.translate(cx, cy); x.rotate(rot); x.font = `600 ${size}px "Barlow Semi Condensed", "Arial Narrow", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const tw = x.measureText(E.label).width;
  if (E.era === 'postwar') { // stencilled: letters a little spaced, paint worn at the edges (worn on its own layer, so only the paint chips)
    const light = hex(on).reduce((a, v) => a + v, 0) < 360, cw = Math.ceil(tw * 1.4 + size * 2), ch = Math.ceil(size * 2), L2 = document.createElement('canvas'); L2.width = cw; L2.height = ch;
    const l = L2.getContext('2d'); l.font = x.font; l.textAlign = 'center'; l.textBaseline = 'middle'; if (l.letterSpacing !== undefined) l.letterSpacing = `${(size * 0.12).toFixed(1)}px`;
    l.fillStyle = light ? 'rgba(226,220,198,0.72)' : 'rgba(20,20,18,0.7)'; l.fillText(E.label, cw / 2, ch / 2);
    l.globalCompositeOperation = 'destination-out'; let sd = hash(E.label); const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) { l.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.5})`; l.beginPath(); l.arc(cw / 2 + (rnd() - 0.5) * tw * 1.2, ch / 2 + (rnd() - 0.5) * size, 1 + rnd() * size * 0.1, 0, TAU); l.fill(); }
    x.drawImage(L2, -cw / 2, -ch / 2);
  } else { // a brass plate, its engraving dark, a screw at each end, its edge catching the light
    const pw = tw + size * 2.2, ph = size * 1.55;
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.roundRect(-pw / 2 + 2, -ph / 2 + 3, pw, ph, 4); x.fill();
    x.fillStyle = lin(x, 0, -ph / 2, 0, ph / 2, [[0, mix(E.metal, '#fff', 0.35)], [0.45, E.metal], [1, mix(E.metal, '#000', 0.45)]]); x.beginPath(); x.roundRect(-pw / 2, -ph / 2, pw, ph, 4); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = 'rgba(40,26,8,0.85)'; x.fillText(E.label, 0, 1); x.fillStyle = 'rgba(255,240,200,0.25)'; x.fillText(E.label, 0, 2.2);
    for (const sx of [-pw / 2 + size * 0.55, pw / 2 - size * 0.55]) { x.fillStyle = mix(E.metal, '#000', 0.35); x.beginPath(); x.arc(sx, 0, size * 0.22, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(sx - size * 0.15, -size * 0.1); x.lineTo(sx + size * 0.15, size * 0.1); x.stroke(); }
  }
  x.restore();
}
function rivetRow(x, pts, r, col) { for (const [px, py, a = 1] of pts) { x.fillStyle = `rgba(0,0,0,${0.45 * a})`; x.beginPath(); x.arc(px + r * 0.3, py + r * 0.4, r, 0, TAU); x.fill(); x.fillStyle = lin(x, px - r, py - r, px + r, py + r, [[0, mix(col, '#fff', 0.35)], [1, mix(col, '#000', 0.4)]]); x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); } }
let CYL_ERA = null; // (set while a tank is drawn: its cylinders are riveted, seamed, strapped for their era)

// ---------------------------------------------------------------- fins ----------------------------------------------------------------
const FIN_SHAPE = { // L: blade length; r0: half width at the root; r1: half width at the tip; flare: how the edge bows out
  rubber: { L: 560, r0: 62, r1: 112, flare: 0.25 }, split: { L: 600, r0: 62, r1: 104, flare: 0.15, split: true }, long: { L: 700, r0: 56, r1: 78, flare: 0.05 },
  free: { L: 790, r0: 52, r1: 70, flare: 0.02, carbon: true }, jet: { L: 450, r0: 72, r1: 118, flare: 0, vents: true, square: true },
};
function finColours(def) {
  const L = def.finLook, arch = def.arch || 'rubber', E = eraOf(def);
  // (5.15.4) an exotic's rubber is its era's: wooden paddles on the old pearl and sponge boats, red-brown gum rubber
  // between the wars, black rubber after, with the expedition's colour as its stripe
  if (E) return E.era === 'victorian' ? { body: '#6a4a2a', mid: '#9a7448', acc: E.leather, fx: null, glass: false, E } : E.era === 'interwar' ? { body: '#5a2e22', mid: '#8a4a34', acc: '#9a7840', fx: null, glass: false, E } : { body: '#1c1e20', mid: '#3a3e42', acc: mix(E.paint, '#6a675c', 0.2), fx: null, glass: false, E };
  // (5.12.6) plain fins in real moulded-rubber colours, all muted: most commons black, the rest a quiet colour of their own
  const QUIET = [['#1d2023', '#3a3f43'], ['#2a2c2e', '#4a4e52'], ['#2e3324', '#55603e'], ['#3e2a20', '#6e4a34'], ['#1e2633', '#3a4a60'], ['#5a5548', '#8a8470']];
  if (!(L && L.c)) { const hh = hash(def.id || arch), r = RK[def.rarity] || 0; if (r >= 1 || hh % 10 >= 7) { const q = QUIET[r === 0 ? 1 : (hh >>> 3) % QUIET.length]; return { body: q[0], mid: q[1], acc: '#7a6040', fx: null, glass: false }; } }
  const base = L && L.c ? L.c : { rubber: ['#1d2023', '#3a3f43'], split: ['#23262a', '#454b4f'], long: ['#1c1e21', '#3c4146'], free: ['#141516', '#2c2e30'], jet: ['#202122', '#454646'] }[arch] || ['#202224', '#40454a'];
  return { body: base[0], mid: base[1], acc: (L && (L.stripe || L.c && L.c[2])) || '#6a5a3e', fx: L && L.fx, glass: L && L.fx === 'glass' };
}
function oneFin(x, S, C, k, far) {
  const { L, r0, r1, flare } = S, rootX = 250, tipX = rootX + L;
  // the blade's outline, top view a little foreshortened: rails bow out slightly; the tip square, rounded or split
  const edge = (side) => { const sgn = side; x.lineTo(rootX + L * 0.35, sgn * (r0 + (r1 - r0) * (0.35 + flare))); x.quadraticCurveTo(rootX + L * 0.8, sgn * (r1 * (1 + flare * 0.2)), tipX - (S.square ? 6 : 30), sgn * r1); };
  const blade = () => { x.beginPath(); x.moveTo(rootX, -r0); edge(-1);
    if (S.square) { x.lineTo(tipX, -r1 * 0.95); x.lineTo(tipX, r1 * 0.95); }
    else if (S.split) { x.quadraticCurveTo(tipX + 14, -r1 * 0.75, tipX, -r1 * 0.1); x.lineTo(rootX + L * 0.55, -4); x.lineTo(rootX + L * 0.55, 4); x.lineTo(tipX, r1 * 0.1); x.quadraticCurveTo(tipX + 14, r1 * 0.75, tipX - 30, r1); }
    else x.quadraticCurveTo(tipX + 26, 0, tipX - 30, r1);
    x.lineTo(rootX + L * 0.35, r0 + (r1 - r0) * (0.35 + flare)); x.lineTo(rootX, r0); x.closePath(); };
  // the blade: lit from the top, darker to its lower rail; the tip curls up a little into the light
  x.save(); blade(); x.fillStyle = C.glass ? rgba(C.body, 0.45) : C.body; x.fill(); x.clip();
  x.fillStyle = lin(x, 0, -r1, 0, r1, [[0, rgba('#ffffff', C.glass ? 0.25 : 0.14)], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.45)']]); x.fillRect(rootX - 10, -r1 * 1.4, L + 60, r1 * 2.8);
  x.fillStyle = lin(x, rootX, 0, tipX, 0, [[0, 'rgba(0,0,0,0.25)'], [0.6, 'rgba(0,0,0,0)'], [1, rgba(C.mid, 0.55)]]); x.fillRect(rootX - 10, -r1 * 1.4, L + 60, r1 * 2.8);
  if (S.carbon) { x.strokeStyle = 'rgba(255,255,255,0.05)'; x.lineWidth = 3; for (let i = -40; i < 60; i++) { x.beginPath(); x.moveTo(rootX + i * 14, -r1); x.lineTo(rootX + i * 14 + r1 * 2, r1); x.stroke(); } } // the weave
  // ribs along the blade (a raised line with its lit side up); the rails thicker and catching the light
  for (const yy of S.split ? [-r0 * 0.55, r0 * 0.55] : [-r0 * 0.5, 0, r0 * 0.5]) { if (S.carbon) break; x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 7; x.beginPath(); x.moveTo(rootX + 10, yy); x.quadraticCurveTo(rootX + L * 0.5, yy * 1.45, tipX - 60, yy * 1.7); x.stroke(); x.strokeStyle = rgba('#ffffff', 0.1); x.lineWidth = 3; x.beginPath(); x.moveTo(rootX + 10, yy - 4); x.quadraticCurveTo(rootX + L * 0.5, yy * 1.45 - 4, tipX - 60, yy * 1.7 - 4); x.stroke(); }
  if (S.vents) for (let i = 0; i < 3; i++) { const vx = rootX + 50 + i * 54; x.fillStyle = 'rgba(8,9,10,0.9)'; x.beginPath(); x.roundRect(vx, -r0 * 0.62, 30, r0 * 1.24, 12); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(vx + 2, -r0 * 0.62 + 6); x.lineTo(vx + 28, -r0 * 0.62 + 6); x.stroke(); }
  x.restore();
  x.save(); blade(); x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 6; x.stroke(); x.restore();
  x.save(); x.strokeStyle = rgba('#ffffff', 0.18); x.lineWidth = 4; x.beginPath(); x.moveTo(rootX + 8, -r0 + 4); edge(-1); x.stroke(); x.restore(); // the upper rail catches the light
  // rarity's work: a stripe down both rails (Uncommon up), wider and with a fine second line (Rare up)
  if (k >= 1) { x.save(); blade(); x.clip(); x.strokeStyle = C.acc; x.lineWidth = k >= 2 ? 10 : 7; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(rootX + 4, sg * (r0 - 12)); x.lineTo(rootX + L * 0.35, sg * (r0 + (r1 - r0) * (0.35 + flare) - 12)); x.quadraticCurveTo(rootX + L * 0.8, sg * (r1 * (1 + flare * 0.2) - 12), tipX - 40, sg * (r1 - 12)); x.stroke(); } x.restore(); }
  // the foot pocket: a moulded shoe, its opening dark, a spring strap round the heel with its buckle
  const pocket = () => { x.beginPath(); x.moveTo(rootX + 30, -r0 - 6); x.bezierCurveTo(rootX - 60, -r0 - 18, 70, -r0 - 4, 46, -26); x.bezierCurveTo(36, -8, 36, 8, 46, 26); x.bezierCurveTo(70, r0 + 4, rootX - 60, r0 + 18, rootX + 30, r0 + 6); x.closePath(); };
  x.save(); pocket(); x.fillStyle = mix(C.body, '#000', 0.12); x.fill(); x.clip(); x.fillStyle = lin(x, 0, -r0 - 18, 0, r0 + 18, [[0, 'rgba(255,255,255,0.16)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.5)']]); x.fillRect(0, -200, 400, 400); x.restore();
  x.save(); pocket(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 6; x.stroke(); x.restore();
  x.fillStyle = 'rgba(6,6,7,0.92)'; x.beginPath(); x.ellipse(118, -2, 58, r0 * 0.5, 0, 0, TAU); x.fill(); // the foot opening
  x.strokeStyle = rgba('#ffffff', 0.14); x.lineWidth = 3; x.beginPath(); x.ellipse(118, -2, 62, r0 * 0.56, 0, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
  if (k >= 3) { x.save(); pocket(); x.clip(); x.setLineDash([7, 6]); x.strokeStyle = rgba(mix(C.acc, '#e8d8b0', 0.5), 0.8); x.lineWidth = 2.5; x.beginPath(); x.ellipse(150, 0, 130, r0 + 2, 0, 0, TAU); x.stroke(); x.restore(); } // stitched
  const metal = k >= 2 ? (k >= 3 ? ['#b8955a', '#6e5428'] : ['#b8bcbc', '#5a5e60']) : ['#3a3c3e', '#1a1b1c'];
  x.strokeStyle = mix(C.body, '#000', 0.3); x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(70, -r0 + 6); x.bezierCurveTo(-10, -r0 + 10, -10, r0 - 10, 70, r0 - 6); x.stroke(); // the heel strap
  x.strokeStyle = rgba('#ffffff', 0.12); x.lineWidth = 4; x.beginPath(); x.moveTo(66, -r0 + 2); x.bezierCurveTo(-6, -r0 + 6, -6, 0, 0, 10); x.stroke();
  x.fillStyle = lin(x, 64, -r0 - 6, 92, -r0 + 22, [[0, metal[0]], [1, metal[1]]]); x.beginPath(); x.roundRect(62, -r0 - 6, 34, 26, 5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke(); // the buckle
  if (!far && C.E && C.E.label) { x.save(); blade(); x.clip(); x.font = '600 34px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; if (x.letterSpacing !== undefined) x.letterSpacing = '3px';
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillText(C.E.label, rootX + L * 0.5, 2); x.fillStyle = 'rgba(255,255,255,0.13)'; x.fillText(C.E.label, rootX + L * 0.5, 0); x.restore(); } // (5.15.4) the name moulded into the rubber
  if (far) { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(10,12,14,0.32)'; x.fillRect(-100, -300, 1400, 600); x.restore(); }
}
export function drawFins3(ctx, w, h, def) {
  if (drawLegend(ctx, w, h, def)) return true;
  const S = FIN_SHAPE[def.arch] || FIN_SHAPE.rubber, C = finColours(def), k = RK[def.rarity] || 0, glow = k >= 4 ? (def.finLook && def.finLook.c && def.finLook.c[2]) || C.acc : null;
  fitted(ctx, w, h, (x, W, H) => {
    // the far fin first, laid a little higher and to the right, then the near one across it
    const totalL = 250 + S.L + 30, sc = Math.min(1, 880 / totalL);
    const lay = (dx, dy, rot, far) => { const L = document.createElement('canvas'); L.width = W; L.height = H; const lx = L.getContext('2d');
      lx.translate(W / 2 - (totalL * sc) / 2 + dx, H / 2 + dy); lx.rotate(rot); lx.scale(sc, sc); oneFin(lx, S, C, k, far); x.drawImage(L, 0, 0); };
    lay(40, -40, -0.05, true); lay(0, 34, 0.025, false);
    if (glow) { x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba(mix(glow, '#fff4dc', 0.4), 0.16); x.fillRect(0, 0, W, H); x.restore(); sparks(x, W, H, glow, 7 + (hash(def.id) % 97)); } // a living sheen on the fins themselves, and sparks
  });
  return true;
}

// ---------------------------------------------------------------- cameras ----------------------------------------------------------------
// (5.12.7) A camera in its underwater housing, seen from the front and a little above, turned to the left: a box with a
// lit top, a front and a darker side, its lens port, the controls on top. A compact sits in a clear polycarbonate case;
// a macro has a short port and a focus light; a housed camera is a solid metal housing with grip handles (and strobe
// arms from Rare up); a low-light camera a matte housing with a big flat port and no strobes.
function box(x, X, Y, w, h, d, cols) { // front face (X..X+w, Y..Y+h), the side and top drawn back by d at 30 degrees
  const dx = d * 0.85, dy = -d * 0.5;
  x.fillStyle = cols.top; x.beginPath(); x.moveTo(X + 6, Y); x.lineTo(X + w - 6, Y); x.lineTo(X + w + dx - 6, Y + dy); x.lineTo(X + dx + 6, Y + dy); x.closePath(); x.fill();
  x.fillStyle = cols.side; x.beginPath(); x.moveTo(X + w, Y + 6); x.lineTo(X + w + dx, Y + dy + 6); x.lineTo(X + w + dx, Y + h + dy - 6); x.lineTo(X + w, Y + h - 6); x.closePath(); x.fill();
  x.fillStyle = cols.front; x.beginPath(); x.roundRect(X, Y, w, h, 10); x.fill();
  x.fillStyle = lin(x, 0, Y, 0, Y + h, [[0, 'rgba(255,255,255,0.14)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.35)']]); x.beginPath(); x.roundRect(X, Y, w, h, 10); x.fill();
  x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.beginPath(); x.roundRect(X, Y, w, h, 10); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(X + 8, Y + 2); x.lineTo(X + w - 8, Y + 2); x.stroke();
}
function port(x, cx, cy, r, ring, glass, dome, sq = 0.88) { // a round lens port; (6.2.0) sq: how round it looks (0.88 nearly face-on, ~0.3 seen edge-on at a tube's end)
  const k = sq / 0.88;
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(cx + 4, cy + 5, r * sq + 8 * k, r + 8, 0, 0, TAU); x.fill();
  x.fillStyle = lin(x, cx - r, cy - r, cx + r, cy + r, [[0, mix(ring, '#fff', 0.35)], [0.5, ring], [1, mix(ring, '#000', 0.5)]]); x.beginPath(); x.ellipse(cx, cy, r * sq + 7 * k, r + 7, 0, 0, TAU); x.fill();
  x.fillStyle = lin(x, cx - r * sq, cy - r, cx + r * sq, cy + r, [[0, glass[0]], [0.6, glass[1]], [1, '#030405']]); x.beginPath(); x.ellipse(cx, cy, r * sq, r, 0, 0, TAU); x.fill();
  x.fillStyle = 'rgba(8,10,12,0.9)'; x.beginPath(); x.ellipse(cx + 2 * k, cy + 2, r * 0.4 * k, r * 0.46, 0, 0, TAU); x.fill(); // the lens within
  x.fillStyle = `rgba(230,236,232,${dome ? 0.32 : 0.22})`; x.beginPath(); x.ellipse(cx - r * 0.3 * k, cy - r * 0.38, r * 0.3 * k, r * 0.14, -0.6 * k, 0, TAU); x.fill(); // the glint on the glass
}
function strobeArm(x, sx, sy, ex, ey, metal, k) {
  x.lineCap = 'round'; x.strokeStyle = mix(metal, '#000', 0.4); x.lineWidth = 16; x.beginPath(); x.moveTo(sx, sy); x.lineTo((sx + ex) / 2, (sy + ey) / 2 - 30); x.lineTo(ex, ey); x.stroke();
  x.strokeStyle = metal; x.lineWidth = 10; x.stroke(); x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(sx, sy - 3); x.lineTo((sx + ex) / 2, (sy + ey) / 2 - 33); x.lineTo(ex, ey - 3); x.stroke();
  for (const [bx, by] of [[sx, sy], [(sx + ex) / 2, (sy + ey) / 2 - 30]]) { x.fillStyle = lin(x, bx - 10, by - 10, bx + 10, by + 10, [[0, mix(metal, '#fff', 0.4)], [1, mix(metal, '#000', 0.5)]]); x.beginPath(); x.arc(bx, by, 11, 0, TAU); x.fill(); }
  // the strobe head: a short cylinder, its diffuser facing forward
  x.fillStyle = lin(x, 0, ey - 44, 0, ey + 44, [[0, '#4a4c4e'], [0.35, '#2a2c2e'], [1, '#0e0f10']]); x.beginPath(); x.roundRect(ex - 50, ey - 44, 96, 88, 18); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 3; x.stroke();
  for (let i = 1; i < 4; i++) { x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ex - 40 + i * 22, ey - 40); x.lineTo(ex - 40 + i * 22, ey + 40); x.stroke(); } // ribs on its body
  x.fillStyle = lin(x, 0, ey - 40, 0, ey + 40, [[0, '#5a5c5e'], [1, '#1a1b1c']]); x.beginPath(); x.ellipse(ex - 50, ey, 20, 42, 0, 0, TAU); x.fill();
  x.fillStyle = lin(x, ex - 66, ey - 34, ex - 40, ey + 34, [[0, '#efebe0'], [0.6, '#c8c4b6'], [1, '#8e8a7e']]); x.beginPath(); x.ellipse(ex - 52, ey, 15, 34, 0, 0, TAU); x.fill(); // the diffuser
}
function camColours(def) {
  const L = typeof def.look === 'object' && def.look ? def.look : null, arch = def.arch || 'compact';
  const D = { compact: ['#c9d1d4', '#8e989c'], macro: ['#b9c2c4', '#7e888c'], housed: ['#4a5258', '#2c3236'], lowlight: ['#2a2c2e', '#17191a'] }[arch] || ['#4a5258', '#2c3236'];
  const mute = (c) => mix(c, '#6a675c', 0.32); // (one mood: a housing's paint is weathered, never bright)
  return { body: L && L.body ? mute(L.body) : D[0], body2: L && L.body2 ? mute(L.body2) : D[1], acc: (L && L.accent) || '#b8955a' };
}
export function drawCam3(ctx, w, h, def) {
  if (drawLegend(ctx, w, h, def)) return true;
  const arch = def.arch || 'compact', k = RK[def.rarity] || 0, C = camColours(def), E = eraOf(def), clear = !E && (arch === 'compact' || arch === 'macro');
  let metal = k >= 3 ? '#a8864e' : k >= 1 ? '#9aa0a2' : '#5a5e60';
  if (E) { C.body = E.era === 'postwar' ? E.paint : E.era === 'interwar' ? '#4a4a42' : '#7a4e2a'; C.body2 = mix(C.body, '#000', 0.4); C.acc = E.metal; metal = E.metal; } // (5.15.4) its era's housing
  // (5.15.2) each kind its own shape: a compact is a slim clamshell, a macro a small body with a long snout of a port,
  // a low-light camera a long tube housing; a housed camera keeps its square housing with handles and a dome port.
  // Within a kind, each model a little longer or squatter, its port a little bigger (from its id)
  const hv = hash(def.id || arch), var1 = 0.9 + ((hv >>> 3) % 5) * 0.05, var2 = 0.9 + ((hv >>> 7) % 5) * 0.05;
  if (arch !== 'housed') { fitted(ctx, w, h, (x, W, H) => { lsd = 11 + (hv % 97);
    const body = (X, Y, bw, bh, r, fill) => { const p = () => { x.beginPath(); x.roundRect(X, Y, bw, bh, r); }; x.fillStyle = fill; p(); x.fill(); mottle(x, p, ['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.12)'], 160, 1, 4); shade(x, p, Y, Y + bh, 0.4, 0.5, 12); return p; };
    if (arch === 'compact') { // a slim clamshell of clear polycarbonate, the camera dark inside it, clips top and bottom, a lanyard loop
      const bw = 420 * var1, bh = 170 * var2, X = W / 2 - bw / 2, Y = H / 2 - bh / 2;
      body(X, Y, bw, bh, 34, rgba(C.body, 0.9));
      x.fillStyle = 'rgba(20,22,24,0.7)'; x.beginPath(); x.roundRect(X + 26, Y + 24, bw - 52, bh - 48, 18); x.fill(); // the camera within
      x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + 10, Y + bh / 2); x.lineTo(X + bw - 10, Y + bh / 2); x.stroke(); // the clamshell's seam
      for (const cxp of [X + bw * 0.3, X + bw * 0.7]) for (const cyp of [Y - 4, Y + bh - 10]) { x.fillStyle = lin(x, 0, cyp, 0, cyp + 14, [[0, mix(metal, '#fff', 0.3)], [1, mix(metal, '#000', 0.4)]]); x.beginPath(); x.roundRect(cxp - 18, cyp, 36, 14, 4); x.fill(); }
      port(x, X + bw - 96, Y + bh / 2, 46 * var2, metal, ['#2e3a3c', '#0c1214'], false);
      x.fillStyle = '#e8e2c8'; x.beginPath(); x.roundRect(X + 40, Y + 30, 30, 16, 4); x.fill(); // the flash window
      x.strokeStyle = '#2a2a28'; x.lineWidth = 6; x.beginPath(); x.moveTo(X - 6, Y + 40); x.bezierCurveTo(X - 60, Y + 50, X - 60, Y + bh + 30, X + 10, Y + bh - 20); x.stroke(); // the lanyard
      gloss(x, X + bw * 0.3, Y + 20, bw * 0.25, 8, -0.02, 0.5);
    } else if (arch === 'macro') { // a small body and, in front, a long snout of a port, ringed, a focus light on top
      const bw = 230 * var1, bh = 190 * var2, X = W / 2 + 40, Y = H / 2 - bh / 2;
      const sl = 210 * var1, sr = 56 * var2; x.fillStyle = lin(x, 0, H / 2 - sr, 0, H / 2 + sr, [[0, '#6a6e70'], [0.35, '#3a3c3e'], [1, '#121314']]); x.beginPath(); x.roundRect(X - sl, H / 2 - sr, sl + 20, sr * 2, 12); x.fill();
      for (let k2 = 1; k2 < 5; k2++) { x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(X - sl + k2 * sl / 5, H / 2 - sr, 5, sr * 2); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(X - sl + k2 * sl / 5 - 2, H / 2 - sr, 2, sr * 2); }
      port(x, X - sl, H / 2, sr * 0.9, metal, ['#2e3a3c', '#0c1214'], false, 0.34); // (6.2.0) the snout's port seen from the side: an oval
      body(X, Y, bw, bh, 22, clear ? rgba(C.body, 0.9) : C.body); x.fillStyle = 'rgba(20,22,24,0.6)'; x.beginPath(); x.roundRect(X + 24, Y + 26, bw - 48, bh - 52, 12); x.fill();
      x.fillStyle = lin(x, 0, Y - 50, 0, Y, [[0, '#4a4c4e'], [1, '#1a1b1c']]); x.beginPath(); x.roundRect(X + bw * 0.3, Y - 46, 50, 50, 8); x.fill(); halo(x, X + bw * 0.3 + 25, Y - 40, 30, '#f0ead0', 0.5); x.fillStyle = '#f4efd8'; x.beginPath(); x.arc(X + bw * 0.3 + 25, Y - 40, 10, 0, TAU); x.fill();
    } else { // low light: a long matte tube of a housing, its big flat port at the front end, handles on top, an end cap
      const L = 560 * var1, R = 92 * var2, X = W / 2 - L / 2 + 30, cy = H / 2 + 10;
      x.fillStyle = lin(x, 0, cy - R, 0, cy + R, [[0, mix(C.body, '#fff', 0.15)], [0.3, C.body], [0.8, mix(C.body, '#000', 0.5)], [1, mix(C.body, '#000', 0.7)]]); x.beginPath(); x.roundRect(X, cy - R, L, R * 2, 18); x.fill();
      mottle(x, () => { x.beginPath(); x.roundRect(X, cy - R, L, R * 2, 18); }, ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.15)'], 200, 1, 4);
      for (const rx2 of [X + L * 0.3, X + L * 0.62]) { x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(rx2, cy - R, 8, R * 2); x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(rx2 - 2, cy - R, 2, R * 2); }
      for (const hx of [X + L * 0.25, X + L * 0.6]) { x.strokeStyle = '#1a1b1c'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx, cy - R); x.quadraticCurveTo(hx + 50, cy - R - 70, hx + 100, cy - R); x.stroke(); }
      x.fillStyle = lin(x, 0, cy - R, 0, cy + R, [[0, '#3a3c3e'], [1, '#0e0f10']]); x.beginPath(); x.roundRect(X + L - 10, cy - R + 10, 40, R * 2 - 20, 10); x.fill();
      x.fillStyle = mix(C.body, '#000', 0.3); x.beginPath(); x.ellipse(X, cy, R * 0.32, R, 0, 0, TAU); x.fill(); port(x, X - 4, cy, R * 0.86, E ? E.metal : '#2a2c2e', ['#1c2a2a', '#08100f'], false, 0.32); /* (6.2.0) the tube's end port, edge-on */
      if (E) { if (E.era !== 'postwar') { const pts = []; for (let a = 0; a < TAU - 0.01; a += TAU / 12) pts.push([X - 4 + Math.cos(a) * R * 0.33, cy + Math.sin(a) * R * 0.98, 1]); rivetRow(x, pts, 4, E.metal); }
        eraMark(x, E, X + L * 0.46, cy + R * 0.45, 24, 0, C.body); }
    }
    if (E && arch === 'macro') eraMark(x, E, W / 2 + 40 + 115 * var1, H / 2 + 60 * var2, 18, 0, C.body);
    if (k >= 3) { x.strokeStyle = rgba(C.acc, 0.8); x.lineWidth = 3; x.beginPath(); x.moveTo(W * 0.2, H * 0.8); x.lineTo(W * 0.8, H * 0.8); x.stroke(); }
    if (k >= 4 && !def.coin) sparks(x, W, H, C.acc, 11 + (hv % 97));
  }); return true; }
  fitted(ctx, w, h, (x, W, H) => {
    const big = arch === 'housed' || arch === 'lowlight', bw = big ? 360 : 330, bh = big ? 250 : 230, bd = big ? 130 : 110, X = W / 2 - bw / 2 - 50, Y = H / 2 - bh / 2 + 36;
    if (big && k >= 2 && arch === 'housed') { strobeArm(x, X - 14, Y + 60, X - 190, Y - 20, metal, k); strobeArm(x, X + bw + bd * 0.85 + 16, Y + 50, X + bw + bd * 0.85 + 200, Y - 30, metal, k); }
    // grip handles either side of a big housing
    if (big) for (const hx of [X - 26, X + bw + bd * 0.85 + 4]) { x.fillStyle = '#1a1b1c'; x.beginPath(); x.roundRect(hx, Y + 20, 26, bh - 30, 12); x.fill(); x.fillStyle = lin(x, hx, 0, hx + 26, 0, [[0, '#4a4c4e'], [0.4, '#2a2c2e'], [1, '#0e0f10']]); x.beginPath(); x.roundRect(hx + 3, Y + 24, 20, bh - 38, 10); x.fill(); }
    const cols = clear ? { front: rgba(C.body, 0.85), side: rgba(mix(C.body, '#000', 0.25), 0.9), top: rgba(mix(C.body, '#fff', 0.25), 0.9) } : { front: C.body, side: mix(C.body, '#000', 0.35), top: mix(C.body, '#fff', 0.18) };
    box(x, X, Y, bw, bh, bd, cols);
    if (clear) { x.fillStyle = 'rgba(20,22,24,0.55)'; x.beginPath(); x.roundRect(X + 30, Y + 30, bw - 60, bh - 60, 8); x.fill(); } // the camera seen through the clear case
    // controls on top: the shutter lever, knobs; a latch on the side
    x.fillStyle = '#1c1d1e'; x.beginPath(); x.roundRect(X + bw * 0.62, Y - 30, 46, 22, 6); x.fill(); x.fillStyle = metal; x.beginPath(); x.roundRect(X + bw * 0.62 + 4, Y - 26, 38, 8, 4); x.fill();
    for (const kx of [X + bw * 0.2, X + bw * 0.36]) { x.fillStyle = lin(x, kx - 12, 0, kx + 12, 0, [[0, mix(metal, '#fff', 0.3)], [1, mix(metal, '#000', 0.45)]]); x.beginPath(); x.roundRect(kx - 12, Y - 22, 24, 18, 5); x.fill(); }
    x.fillStyle = metal; x.beginPath(); x.roundRect(X + bw + 20, Y + bh * 0.4, 18, 40, 5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke();
    // the port: big and flat for low light, short and forward for macro, domed on a housing
    const pr = arch === 'lowlight' ? bh * 0.4 : arch === 'macro' ? bh * 0.26 : bh * 0.34, pcx = X + bw * 0.42, pcy = Y + bh * 0.55;
    if (arch === 'macro') { x.fillStyle = lin(x, 0, pcy - pr, 0, pcy + pr, [[0, '#5a5e60'], [0.5, '#2a2c2e'], [1, '#121314']]); x.beginPath(); x.roundRect(pcx - pr - 60, pcy - pr * 0.95, 70, pr * 1.9, 10); x.fill(); }
    port(x, arch === 'macro' ? pcx - 60 : pcx, pcy, pr, arch === 'lowlight' ? '#2a2c2e' : metal, arch === 'lowlight' ? ['#1c2a2a', '#08100f'] : ['#2e3a3c', '#0c1214'], arch === 'housed');
    if (arch === 'macro') { x.fillStyle = '#e8e2c8'; x.beginPath(); x.arc(X + bw - 34, Y + 34, 12, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 3; x.stroke(); } // the focus light
    if (k >= 3 && !E) { x.strokeStyle = rgba(C.acc, 0.85); x.lineWidth = 3; x.setLineDash([]); x.beginPath(); x.roundRect(X + 10, Y + 10, bw - 20, bh - 20, 6); x.stroke(); } // a fine brass bead round the front
    if (E) { // (5.15.4) the old eras: a riveted housing, the port bolted on; the post-war one painted, its name stencilled
      if (E.era !== 'postwar') { const pts = []; for (let i = 0; i <= 8; i++) { pts.push([X + 14 + (bw - 28) * i / 8, Y + 12, 1], [X + 14 + (bw - 28) * i / 8, Y + bh - 12, 0.8]); } for (let i = 1; i < 5; i++) pts.push([X + 12, Y + 12 + (bh - 24) * i / 5, 0.9], [X + bw - 12, Y + 12 + (bh - 24) * i / 5, 0.9]); rivetRow(x, pts, 5, E.era === 'victorian' ? E.metal : '#8a8a7e');
        const pcx2 = arch === 'macro' ? pcx - 60 : pcx, pts2 = []; for (let a = 0; a < TAU - 0.01; a += TAU / 10) pts2.push([pcx2 + Math.cos(a) * (pr * 0.88 + 16), pcy + Math.sin(a) * (pr + 16), 1]); rivetRow(x, pts2, 5, E.metal); }
      eraMark(x, E, X + bw * 0.78, Y + bh - 32, 18, 0, C.body); }
    if (k >= 4 && !def.coin) sparks(x, W, H, C.acc, 11 + (hash(def.id) % 97));
  });
  return true;
}

// ---------------------------------------------------------------- tanks ----------------------------------------------------------------
// (5.12.8) Cylinders laid on their side, valve to the right: a round body lit from the top, the domed shoulder, a pillar
// valve with its handwheel, a rubber boot on the base. A twin set rides on a manifold, a sidemount pair is strapped one
// behind the other, a rebreather is its compact unit with two small bottles and its hoses.
function cylinder(x, X, Y, L, R, body, band, valve, k) {
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.ellipse(X + L / 2, Y + R + 6, L / 2, 8, 0, 0, TAU); x.fill();
  const g = lin(x, 0, Y - R, 0, Y + R, [[0, mix(body[1], '#fff', 0.25)], [0.18, body[0]], [0.42, body[1]], [0.8, body[2]], [1, mix(body[2], '#000', 0.4)]]);
  x.fillStyle = g; x.beginPath(); x.moveTo(X + R * 0.4, Y - R); x.lineTo(X + L - R * 0.9, Y - R); x.bezierCurveTo(X + L, Y - R, X + L + R * 0.25, Y - R * 0.45, X + L + R * 0.3, Y);
  x.bezierCurveTo(X + L + R * 0.25, Y + R * 0.45, X + L, Y + R, X + L - R * 0.9, Y + R); x.lineTo(X + R * 0.4, Y + R); x.quadraticCurveTo(X, Y + R, X, Y); x.quadraticCurveTo(X, Y - R, X + R * 0.4, Y - R); x.fill();
  x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.stroke();
  x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + R * 0.5, Y - R * 0.62); x.lineTo(X + L - R, Y - R * 0.62); x.stroke(); // a long highlight
  // the rubber boot on the base, the band (rarity's colour from Uncommon), the valve
  x.fillStyle = lin(x, 0, Y - R, 0, Y + R, [[0, '#3a3a38'], [0.4, '#1c1c1b'], [1, '#0a0a0a']]); x.beginPath(); x.roundRect(X - 4, Y - R - 2, R * 0.55, R * 2 + 4, 10); x.fill();
  if (band) { x.fillStyle = lin(x, 0, Y - R, 0, Y + R, [[0, mix(band, '#fff', 0.2)], [0.5, band], [1, mix(band, '#000', 0.45)]]); x.fillRect(X + L * 0.62, Y - R, L * 0.05, R * 2); }
  const vx = X + L + R * 0.28;
  x.fillStyle = lin(x, 0, Y - R * 0.3, 0, Y + R * 0.3, [[0, mix(valve, '#fff', 0.45)], [0.5, valve], [1, mix(valve, '#000', 0.5)]]); x.beginPath(); x.roundRect(vx, Y - R * 0.26, R * 0.55, R * 0.52, 6); x.fill();
  x.fillStyle = lin(x, 0, Y - R * 0.6, 0, Y + R * 0.6, [[0, '#3a3c3e'], [1, '#101112']]); x.beginPath(); x.roundRect(vx + R * 0.5, Y - R * 0.62, R * 0.28, R * 1.24, 8); x.fill(); // the handwheel, edge-on
  for (let i = -2; i <= 2; i++) { x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2; x.beginPath(); x.moveTo(vx + R * 0.52, Y + i * R * 0.22); x.lineTo(vx + R * 0.76, Y + i * R * 0.22); x.stroke(); }
  // (5.15.4) the old eras: a riveted ring at the base and the shoulder; a copper flask is also seamed along its length
  // and carried in leather straps with brass buckles
  const E = CYL_ERA; if (E && E.era !== 'postwar') {
    const ring = (rx) => { const pts = []; for (let t = -0.8; t <= 0.81; t += 0.2) pts.push([rx + Math.abs(t) * R * 0.08, Y + t * R, 1 - Math.abs(t) * 0.5]); rivetRow(x, pts, Math.max(3.5, R * 0.065), E.era === 'victorian' ? '#b07850' : '#8a8a7e'); };
    ring(X + R * 0.75); ring(X + L - R * 1.05);
    if (E.era === 'victorian') { x.strokeStyle = 'rgba(30,14,6,0.5)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(X + R * 0.8, Y + R * 0.12); x.lineTo(X + L - R * 1.1, Y + R * 0.12); x.stroke();
      const pts = []; for (let px = X + R * 1.1; px < X + L - R * 1.2; px += R * 0.42) pts.push([px, Y + R * 0.12, 0.9]); rivetRow(x, pts, Math.max(2, R * 0.04), '#b07850');
      for (const fx2 of [0.3, 0.62]) { const sx = X + L * fx2; x.fillStyle = lin(x, 0, Y - R, 0, Y + R, [[0, mix(E.leather, '#fff', 0.2)], [0.5, E.leather], [1, mix(E.leather, '#000', 0.5)]]); x.fillRect(sx, Y - R - 1, R * 0.32, R * 2 + 2);
        x.setLineDash([5, 4]); x.strokeStyle = 'rgba(220,200,160,0.4)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(sx + 4, Y - R); x.lineTo(sx + 4, Y + R); x.moveTo(sx + R * 0.32 - 4, Y - R); x.lineTo(sx + R * 0.32 - 4, Y + R); x.stroke(); x.setLineDash([]);
        x.fillStyle = lin(x, sx - 4, 0, sx + R * 0.36, 0, [[0, mix(E.metal, '#fff', 0.3)], [1, mix(E.metal, '#000', 0.4)]]); x.fillRect(sx - 3, Y - R * 0.28, R * 0.38, R * 0.36); x.fillStyle = mix(E.leather, '#000', 0.4); x.fillRect(sx + R * 0.06, Y - R * 0.18, R * 0.2, R * 0.16); } }
  }
}
function tankColours(def) {
  const T = def.tankLook, arch = def.arch || 'al';
  const D = { al: ['#b8bec1', '#8a9296', '#4e5559'], steel: ['#5a6064', '#3e4448', '#1c2022'], big: ['#6e6a4e', '#4e4a34', '#26241a'], twin: ['#5a6064', '#3e4448', '#1c2022'], side: ['#6a7074', '#484e52', '#24282a'], rebreather: ['#3a3c3e', '#24262a', '#0e0f10'] }[arch] || ['#5a6064', '#3e4448', '#1c2022'];
  const mute = (c) => mix(c, '#6a675c', 0.4); // (painted cylinders weathered, never bright)
  return { body: T && T.body ? T.body.map(mute) : D, band: T && T.band ? T.band : null };
}
export function drawTank3(ctx, w, h, def) {
  if (drawLegend(ctx, w, h, def)) return true;
  const arch = def.arch || 'al', k = RK[def.rarity] || 0, C = tankColours(def), E = eraOf(def);
  let valve = k >= 3 ? '#a8864e' : k >= 2 ? '#c8ccce' : '#8e9396', band = k >= 1 ? C.band || '#7a6040' : null;
  if (E) { C.body = shade3(E.era === 'postwar' ? E.paint : E.body); valve = E.metal; band = E.era === 'postwar' ? mix(E.paint, '#e2dcc6', 0.55) : null; } // (5.15.4) its era's metal and paint
  CYL_ERA = E;
  fitted(ctx, w, h, (x, W, H) => {
    const big = (def.air || 20) > 90, L = big ? 640 : 560, R = big ? 70 : 62, X = W / 2 - L / 2 - 40;
    if (arch === 'twin') { cylinder(x, X + 20, H / 2 - R * 0.9, L, R * 0.9, C.body, band, valve, k); cylinder(x, X, H / 2 + R * 0.95, L, R * 0.9, C.body, band, valve, k);
      x.fillStyle = valve; x.fillRect(X + L + R * 0.6, H / 2 - R * 0.9, 18, R * 1.85); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2; x.strokeRect(X + L + R * 0.6, H / 2 - R * 0.9, 18, R * 1.85); // the manifold
      for (const yy of [H / 2 - R * 0.9, H / 2 + R * 0.95]) { x.fillStyle = '#2a2a28'; x.fillRect(X + L * 0.28, yy - R * 0.92, 22, R * 1.84); x.fillRect(X + L * 0.55, yy - R * 0.92, 22, R * 1.84); } } // the bands
    else if (arch === 'side') { cylinder(x, X + 60, H / 2 - R * 0.75, L, R * 0.85, C.body, band, valve, k); cylinder(x, X, H / 2 + R * 0.85, L, R * 0.85, C.body, band, valve, k);
      for (const [xx, yy] of [[X + 60, H / 2 - R * 0.75], [X, H / 2 + R * 0.85]]) { x.fillStyle = '#1a1a19'; x.fillRect(xx + L * 0.2, yy - R * 0.9, 14, R * 1.8); x.fillRect(xx + L * 0.7, yy - R * 0.9, 14, R * 1.8); } } // bungees
    else if (arch === 'rebreather') { // the unit: a moulded case, two small bottles beside it, the loop's hoses
      cylinder(x, X + 360, H / 2 + 70, 300, 40, C.body.map((c) => mix(c, '#8a9296', 0.3)), band, valve, k); cylinder(x, X + 360, H / 2 - 70, 300, 40, C.body.map((c) => mix(c, '#8a9296', 0.3)), band, valve, k);
      x.fillStyle = lin(x, 0, H / 2 - 120, 0, H / 2 + 120, [[0, mix(C.body[0], '#fff', 0.1)], [0.5, C.body[1]], [1, C.body[2]]]); x.beginPath(); x.roundRect(X, H / 2 - 120, 330, 240, 28); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 3; x.beginPath(); x.moveTo(X + 20, H / 2 - 116); x.lineTo(X + 310, H / 2 - 116); x.stroke();
      x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.roundRect(X + 40, H / 2 - 70, 250, 26, 8); x.fill(); x.beginPath(); x.roundRect(X + 40, H / 2 + 40, 250, 26, 8); x.fill(); // the lid's seams
      x.strokeStyle = '#111'; x.lineWidth = 18; x.lineCap = 'round'; x.beginPath(); x.moveTo(X + 80, H / 2 - 120); x.bezierCurveTo(X + 60, H / 2 - 190, X + 260, H / 2 - 200, X + 250, H / 2 - 120); x.stroke(); // the breathing loop
      x.strokeStyle = 'rgba(255,255,255,0.1)'; x.lineWidth = 5; x.stroke(); }
    else cylinder(x, X, H / 2, L, R, C.body, band, valve, k);
    if (E) { const my = arch === 'twin' ? H / 2 - R * 0.9 : arch === 'side' ? H / 2 - R * 0.75 : H / 2, mx = arch === 'rebreather' ? X + 165 : arch === 'side' ? X + 60 + L * 0.46 : X + L * 0.46;
      eraMark(x, E, mx, arch === 'rebreather' ? H / 2 - 6 : my + (E.era === 'victorian' ? -R * 0.45 : 0), E.era === 'postwar' ? 30 : 26, 0, arch === 'rebreather' ? C.body[1] : C.body[1]); }
    if (k >= 4) sparks(x, W, H, C.band || '#c8a868', 13 + (hash(def.id) % 97));
  });
  CYL_ERA = null;
  return true;
}

// ---------------------------------------------------------------- bags ----------------------------------------------------------------
// (5.12.8) A catch bag lying on its side, opening to the left: a mesh sack (its diamond weave shaded round the bulge), a
// drawstring or a hard collar with its spring flap, a handle loop; a divided specimen bag is a hard case, lid and
// compartments; a light bag fine, pale mesh.
function bagColours(def) {
  const B = def.bagLook, arch = def.arch || 'mesh';
  const D = { mesh: ['#3a4a3e', '#6e7a5e'], large: ['#2e3a34', '#5e6e5a'], divided: ['#3a3e40', '#7a8084'], light: ['#5a6252', '#9aa088'] }[arch] || ['#3a4a3e', '#6e7a5e'];
  const mute = (c) => mix(c, '#6a675c', 0.25);
  return { body: B && B.body ? mute(B.body) : D[0], acc: B && B.accent ? B.accent : D[1] };
}
export function drawBag3(ctx, w, h, def) {
  if (drawLegend(ctx, w, h, def)) return true;
  const arch = def.arch || 'mesh', k = RK[def.rarity] || 0, C = bagColours(def), E = eraOf(def); let metal = k >= 3 ? '#a8864e' : k >= 2 ? '#b8bcbc' : '#6a6e70';
  // (5.15.4) an exotic bag in its era's stuff: a varnished wooden case or tarred hemp with leather straps; canvas with
  // leather; rubberised cloth in the expedition's colour with steel clips
  if (E) { C.body = E.era === 'postwar' ? E.paint : arch === 'divided' ? (E.era === 'victorian' ? '#7a4e2a' : '#4a4a42') : E.era === 'victorian' ? '#5a4a30' : E.cloth; C.acc = E.era === 'postwar' ? '#2a2a28' : E.leather; metal = E.metal; }
  const sz = 0.8 + Math.min(1, ((def.slots || 3) - 2) / 12) * 0.35;
  fitted(ctx, w, h, (x, W, H) => {
    x.save(); x.translate(W / 2, H / 2 + 10); x.scale(sz, sz);
    if (arch === 'divided') { // a hard case: lid, a body, compartments showing through a window, latches and a handle
      const bw = 520, bh = 230;
      x.fillStyle = mix(C.body, '#fff', 0.15); x.beginPath(); x.moveTo(-bw / 2 + 20, -bh / 2); x.lineTo(bw / 2 - 20, -bh / 2); x.lineTo(bw / 2 + 50, -bh / 2 - 40); x.lineTo(-bw / 2 + 90, -bh / 2 - 40); x.closePath(); x.fill();
      x.fillStyle = mix(C.body, '#000', 0.35); x.beginPath(); x.moveTo(bw / 2, -bh / 2 + 10); x.lineTo(bw / 2 + 70, -bh / 2 - 30); x.lineTo(bw / 2 + 70, bh / 2 - 40); x.lineTo(bw / 2, bh / 2); x.closePath(); x.fill();
      x.fillStyle = lin(x, 0, -bh / 2, 0, bh / 2, [[0, mix(C.body, '#fff', 0.08)], [1, mix(C.body, '#000', 0.3)]]); x.beginPath(); x.roundRect(-bw / 2, -bh / 2, bw, bh, 16); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke();
      x.fillStyle = 'rgba(14,18,20,0.7)'; x.beginPath(); x.roundRect(-bw / 2 + 40, -bh / 2 + 50, bw - 80, bh - 100, 8); x.fill();
      const n = Math.max(2, Math.min(6, Math.round((def.slots || 4) / 2))); for (let i = 1; i < n; i++) { const xx = -bw / 2 + 40 + (bw - 80) * i / n; x.fillStyle = 'rgba(200,210,200,0.25)'; x.fillRect(xx - 3, -bh / 2 + 50, 6, bh - 100); } // the dividers
      x.fillStyle = 'rgba(230,236,230,0.16)'; x.beginPath(); x.moveTo(-bw / 2 + 50, -bh / 2 + 56); x.lineTo(-bw / 2 + 140, -bh / 2 + 56); x.lineTo(-bw / 2 + 90, bh / 2 - 56); x.lineTo(-bw / 2 + 50, bh / 2 - 56); x.fill(); // glare on the window
      for (const lx of [-bw / 2 + 60, bw / 2 - 100]) { x.fillStyle = metal; x.beginPath(); x.roundRect(lx, -bh / 2 - 8, 40, 26, 5); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke(); }
      x.strokeStyle = '#1a1b1c'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(-70, -bh / 2 - 30); x.quadraticCurveTo(0, -bh / 2 - 90, 70, -bh / 2 - 30); x.stroke();
      if (k >= 1) { x.fillStyle = C.acc; x.fillRect(-bw / 2, bh / 2 - 26, bw, 10); }
    } else { // a mesh sack on its side, the opening to the left
      const L = arch === 'large' ? 560 : 500, R = arch === 'large' ? 120 : 100, light = arch === 'light';
      const sack = () => { x.beginPath(); x.moveTo(-L / 2 + 40, -R * 0.75); x.bezierCurveTo(-L / 2 + 160, -R * 1.15, L / 2 - 120, -R * 1.05, L / 2, -R * 0.15); x.quadraticCurveTo(L / 2 + 14, 0, L / 2, R * 0.15); x.bezierCurveTo(L / 2 - 120, R * 1.05, -L / 2 + 160, R * 1.15, -L / 2 + 40, R * 0.75); x.closePath(); };
      x.save(); sack(); x.fillStyle = rgba(C.body, light ? 0.55 : 0.85); x.fill(); x.clip();
      x.fillStyle = lin(x, 0, -R, 0, R, [[0, 'rgba(255,255,255,0.18)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0.45)']]); x.fillRect(-L, -R * 1.4, L * 2, R * 2.8);
      const step = light ? 14 : 22; x.lineWidth = light ? 1.6 : 2.6; // the diamond weave, darker where the mesh turns away
      for (let i = -40; i < 40; i++) { for (const sg of [1, -1]) { x.strokeStyle = 'rgba(10,12,10,0.55)'; x.beginPath(); x.moveTo(-L / 2 + i * step, -R * 1.2); x.lineTo(-L / 2 + i * step + sg * R * 1.6, R * 1.2); x.stroke(); x.strokeStyle = rgba(C.acc, 0.25); x.beginPath(); x.moveTo(-L / 2 + i * step + 1, -R * 1.2 - 1); x.lineTo(-L / 2 + i * step + sg * R * 1.6 + 1, R * 1.2 - 1); x.stroke(); } }
      x.restore(); x.save(); sack(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 4; x.stroke(); x.restore();
      if (arch === 'large') { // the hard collar with its spring flap
        x.fillStyle = lin(x, -L / 2, 0, -L / 2 + 70, 0, [[0, '#2a2c2e'], [0.5, '#4a4e50'], [1, '#1a1b1c']]); x.beginPath(); x.ellipse(-L / 2 + 40, 0, 34, R * 0.82, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(6,6,6,0.85)'; x.beginPath(); x.ellipse(-L / 2 + 36, 0, 18, R * 0.62, 0, 0, TAU); x.fill();
        x.fillStyle = metal; x.beginPath(); x.roundRect(-L / 2 + 10, -R * 0.9, 50, 16, 5); x.fill(); }
      else { // the drawstring gathered at the opening
        x.fillStyle = rgba(C.body, 0.95); x.beginPath(); x.ellipse(-L / 2 + 40, 0, 16, R * 0.7, 0, 0, TAU); x.fill();
        x.strokeStyle = mix(C.acc, '#d8d0b8', 0.4); x.lineWidth = 6; x.beginPath(); x.moveTo(-L / 2 + 40, -R * 0.6); x.bezierCurveTo(-L / 2 - 40, -R * 0.4, -L / 2 - 50, R * 0.5, -L / 2 - 10, R * 0.9); x.stroke();
        x.fillStyle = metal; x.beginPath(); x.roundRect(-L / 2 - 26, R * 0.78, 30, 22, 6); x.fill(); } // the toggle
      x.strokeStyle = '#1a1b1c'; x.lineWidth = 14; x.lineCap = 'round'; x.beginPath(); x.moveTo(-L / 2 + 120, -R * 0.95); x.quadraticCurveTo(-L / 2 + 190, -R * 1.6, -L / 2 + 270, -R * 1.0); x.stroke(); // the handle loop
      x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 4; x.stroke();
      if (k >= 1) { x.save(); sack(); x.clip(); x.strokeStyle = C.acc; x.lineWidth = k >= 2 ? 12 : 8; x.beginPath(); x.moveTo(-L / 2 + 60, -R * 0.9); x.bezierCurveTo(-L / 2 + 80, -R * 0.3, -L / 2 + 80, R * 0.3, -L / 2 + 60, R * 0.9); x.stroke(); x.restore(); } // a webbing band
      if (k >= 3) { x.setLineDash([7, 6]); x.strokeStyle = rgba('#e8d8b0', 0.7); x.lineWidth = 2.5; x.beginPath(); x.moveTo(-L / 2 + 52, -R * 0.85); x.bezierCurveTo(-L / 2 + 70, -R * 0.3, -L / 2 + 70, R * 0.3, -L / 2 + 52, R * 0.85); x.stroke(); x.setLineDash([]); }
    }
    if (E) eraMark(x, E, arch === 'divided' ? 150 : 60, arch === 'divided' ? 80 : (arch === 'large' ? 40 : 30), 22, 0, C.body);
    x.restore();
    if (k >= 4) sparks(x, W, H, C.acc, 17 + (hash(def.id) % 97));
  });
  return true;
}

// ---------------------------------------------------------------- nets ----------------------------------------------------------------
// (5.12.9) A hand net lying across the frame, handle to the left: a real pole with its grip and end cap, a frame seen at
// an angle at the far end, and the mesh bag hanging behind it in a soft cone, its knots catching the light. Each kind its
// frame: a round hoop (everyday, sure), a square dip frame (gentle), a long pole and a teardrop (reach), a short quick
// net, a big D-frame (big game), a wide seine frame (school).
const NET_SHAPE = { everyday: { pole: 430, r: 90, f: 'round' }, sure: { pole: 440, r: 100, f: 'round', deep: 1.3 }, gentle: { pole: 420, r: 90, f: 'square' }, reach: { pole: 600, r: 78, f: 'tear' },
  quick: { pole: 320, r: 74, f: 'round' }, big: { pole: 500, r: 120, f: 'd' }, school: { pole: 440, r: 100, f: 'wide' } };
// (5.16.3) the legendary nets on the same 3D net as the rest (the bag hung from the rim), each made of its own story:
// Gulper's Throat a jaw of bone with teeth on its rim, a dark skin bag and an eel's spine for a handle; the Choir's Veil
// a fine pale veil on a pearl hoop and a bleached bone handle; Lanternmesh its knots glowing warm on a lure's stalk;
// the Hagfish's Knot cords of slime on twisted cord; Jonah's Seine black on a whale's rib; the Tithe stained, on carved
// wood bound in brass. Each glows its own colour and gives off sparks
const LEG_NET = {
  gulper: { hoop: '#d8ccaa', handle: ['#7a6e58', '#4a4232', '#201c14'], mesh: '#3a1a16', step: 10, poleR: 24, hoopW: 15, glow: '#b85a48', skin: 'rgba(40,14,12,0.82)', teeth: true, spine: true },
  choirveil: { hoop: '#e2dccc', handle: ['#e8e0cc', '#bdb39a', '#6e6450'], mesh: '#d8d2c2', step: 8, poleR: 19, hoopW: 11, glow: '#d8d0c0', veil: true },
  lanternmesh: { hoop: '#c8b88a', handle: ['#6a5a40', '#3e3424', '#1a160e'], mesh: '#6a5e40', step: 13, poleR: 20, hoopW: 11, glow: '#d8b878', lanterns: true, stalk: true },
  hagnet: { hoop: '#8a7a5a', handle: ['#9a8a64', '#6a5a3e', '#2e2618'], mesh: '#b8b08a', step: 12, poleR: 23, hoopW: 14, glow: '#c8bc96', slime: true, cord: true },
  stillwater: { hoop: '#26282a', handle: ['#e2d8c0', '#b0a486', '#5a5040'], mesh: '#1c1e20', step: 11, poleR: 25, hoopW: 13, glow: '#9ab0c4', rib: true },
  oldnet: { hoop: '#7a5a2e', handle: ['#7a5232', '#4e3420', '#22160c'], mesh: '#4a3a24', step: 12, poleR: 23, hoopW: 14, glow: '#d8a868', carved: true },
};
export function drawNet3(ctx, w, h, def) {
  const LS = def.rarity === 'legendary' ? LEG_NET[def.id] : null;
  if (!LS && drawLegend(ctx, w, h, def)) return true;
  const S0 = NET_SHAPE[def.arch] || NET_SHAPE.everyday, k = RK[def.rarity] || 0, L = typeof def.look === 'object' && def.look ? def.look : {};
  // (5.15.2) each net its own build within its kind: the pole's length and thickness, what it is made of (aluminium,
  // varnished wood, fibreglass), the hoop's thickness, the mesh fine or coarse, the bag deep or shallow (from its id)
  const hv = hash(def.id || def.arch), pick = (n, sh) => (hv >>> sh) % n;
  const S = { ...S0, pole: S0.pole * (0.85 + pick(5, 2) * 0.08), r: S0.r * (0.9 + pick(4, 5) * 0.06), deep: (S0.deep || 1) * (0.8 + pick(5, 8) * 0.1) };
  const MAT = [['#7a8288', '#4a5258', '#22272a'], ['#a07a48', '#6e5030', '#3a2a18'], ['#c8b878', '#8a7a48', '#4a4020'], ['#5a6448', '#3a4430', '#1c2216']][pick(4, 11)];
  let poleR = 10 + pick(5, 14) * 1.5, hoopW = 8 + pick(4, 17) * 2.5, meshStep = [12, 16, 22][pick(3, 20)];
  // (5.16.3) the ladder you can see: a common net coarse mesh on a thin hoop; an uncommon one finer, its pole painted and
  // banded; a rare one fine knotless mesh, a rubber-coated hoop with a bumper, a carbon-wrapped pole and a stainless yoke
  if (k === 0) { meshStep = 22; hoopW = Math.min(hoopW, 10); } else if (k === 1) meshStep = 16; else if (k === 2) { meshStep = 12; hoopW += 3; }
  const mute = (c) => mix(c, '#6a675c', 0.25), hoop0 = L.hoop ? mute(L.hoop) : k >= 3 ? '#8a6a34' : '#3e4448', handle0 = L.h ? L.h.map(mute) : k >= 3 ? ['#a07a48', '#6e5030', '#3a2a18'] : MAT;
  let mesh = k >= 3 ? '#5a5a46' : '#3a4a3a', metal = k >= 3 ? '#a8864e' : k >= 2 ? '#b8bcbc' : '#5a5e60';
  // (5.15.4) an exotic net in its era's make: a varnished wood pole, brass hoop and tarred hemp; a black iron pole bound
  // with canvas tape; a painted alloy pole with a stainless hoop, a rubber grip and nylon mesh
  const E = eraOf(def); let hoopE = null, handleE = null;
  if (E) { handleE = E.era === 'postwar' ? shade3(E.paint) : E.wood; hoopE = E.era === 'victorian' ? E.metal : E.era === 'interwar' ? '#34342f' : E.metal; mesh = E.twine; metal = E.metal; }
  if (LS) { handleE = LS.handle; hoopE = LS.hoop; mesh = LS.mesh; meshStep = LS.step; poleR = LS.poleR; hoopW = LS.hoopW; metal = mix(LS.glow, '#6a5a3a', 0.4); }
  // (5.15.3) drawn in 3D, as a real landing net is seen: the hoop a tilted ring, the bag hanging from the whole rim and
  // lashed to it, its diamond mesh following the bag's curve and closing in towards the rounded bottom (lines on the far
  // side darker, seen through the near side), the pole meeting the rim through a collar and a split yoke
  const hoop = hoopE || hoop0, handle = handleE || handle0;
  const V = (a0, a1, a2) => [a0, a1, a2], add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]], mul = (p, s0) => [p[0] * s0, p[1] * s0, p[2] * s0];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2], nrm = (p) => mul(p, 1 / Math.hypot(...p)), cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const n = nrm(V(-0.28, 0.78, 0.56)), out = V(1, 0.1, 0), e1 = nrm(add(out, mul(n, -dot(out, n)))), e2 = cross(n, e1);
  const R = S.r * 1.25, D = R * 1.75 * S.deep, ext = S.f === 'wide' ? [0.8, 1.35] : [1, 1];
  const rimAB = (u) => { const c = Math.cos(u), sn = Math.sin(u);
    if (S.f === 'square') return [R * Math.sign(c) * Math.abs(c) ** 0.45, R * Math.sign(sn) * Math.abs(sn) ** 0.45];
    if (S.f === 'tear') return [R * c, R * sn * (0.25 + 0.75 * Math.sqrt((1 + c) / 2))];
    if (S.f === 'd') return [Math.min(R * c, R * 0.62), R * sn];
    return [R * c * ext[0], R * sn * ext[1]]; };
  const sag = V(0.25, -1, 0); // the bag sags with its own weight, away from the pole
  const at = (u, v) => { const [a0, b0] = rimAB(u), s0 = Math.max(0.035, Math.cos(v * Math.PI / 2) ** 0.6), c = add(mul(n, -D * v), mul(sag, R * 0.45 * v * v));
    return add(c, add(mul(e1, a0 * s0), mul(e2, b0 * s0))); };
  const ctrZ = (v) => add(mul(n, -D * v), mul(sag, R * 0.45 * v * v))[2];
  const P2 = (p) => [p[0], -p[1]]; // to the page (y down)
  const A = at(Math.PI, 0), A2 = P2(A), ang = Math.PI + 0.1, Lp = S.pole * (LS ? 0.46 : 0.62), /* (5.16.3) a legendary's handle short and thick */ PE = [A2[0] + Math.cos(ang) * Lp, A2[1] + Math.sin(ang) * Lp];
  // fit it all into the frame
  let x0 = PE[0], x1 = PE[0], y0 = PE[1], y1 = PE[1]; const grow = (q) => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); };
  for (let i = 0; i <= 48; i++) for (let j = 0; j <= 10; j++) grow(P2(at(i / 48 * TAU, j / 10)));
  const M = Math.max(18, Math.round((TAU * R) / (meshStep * 2.1))), du = TAU / M, ROWS = Math.max(4, Math.round(D / (meshStep * 1.9))), K = du * ROWS;
  fitted(ctx, w, h, (x, W, H) => {
    const sc = Math.min((W - 80) / (x1 - x0), (H - 60) / (y1 - y0)); x.save(); x.translate(W / 2 - ((x0 + x1) / 2) * sc, H / 2 - ((y0 + y1) / 2) * sc); x.scale(sc, sc);
    const lw = 1 / sc, twine = mesh, far = mix(twine, '#000', 0.45), near = mix(twine, '#d8d0b6', 0.18);
    // the bag's body: thin panels, so where the near and far sides overlap the net reads denser, as netting does
    for (let j = 0; j < 12; j++) for (let i = 0; i < 40; i++) { const u0 = i / 40 * TAU, u1 = (i + 1) / 40 * TAU, v0 = j / 12, v1 = (j + 1) / 12, q = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map(P2);
      x.fillStyle = LS && LS.skin ? LS.skin : LS && LS.veil ? 'rgba(226,222,210,0.09)' : LS && LS.slime ? 'rgba(170,176,120,0.12)' : rgba(twine, 0.07); x.beginPath(); x.moveTo(...q[0]); for (let k2 = 1; k2 < 4; k2++) x.lineTo(...q[k2]); x.closePath(); x.fill(); }
    // the mesh, the two families of the diamond, split into far (behind) and near segments
    const segs = [[], []];
    for (const sg of [1, -1]) for (let i = 0; i < M; i++) { let prev = null;
      for (let t = 0; t <= 60; t++) { const v = t / 60, u = i * du + sg * v * K, p = at(u, v), fr = p[2] - ctrZ(v) > 0 ? 1 : 0, q = P2(p);
        if (prev) segs[fr && prev[1] ? 1 : 0].push([prev[0], q]); prev = [q, fr]; } }
    const stroke = (L2, col, wd) => { x.strokeStyle = col; x.lineWidth = wd; x.lineCap = 'round'; x.beginPath(); for (const [p, q] of L2) { x.moveTo(...p); x.lineTo(...q); } x.stroke(); };
    stroke(segs[0], rgba(far, 0.8), (meshStep > 18 ? 2.2 : 1.6) * lw * 1.4);
    // the hoop: the far half first, behind the near mesh
    const rimPts = (from, to) => { const r2 = []; for (let i = 0; i <= 80; i++) { const u = from + (to - from) * i / 80; r2.push([P2(at(u, 0)), at(u, 0)[2] > 0]); } return r2; };
    const ring = rimPts(0, TAU), hoopStroke = (front) => { x.lineCap = 'round';
      for (const [col, wd] of [['rgba(0,0,0,0.55)', hoopW + 5], [front ? hoop : mix(hoop, '#000', 0.35), hoopW]]) { x.strokeStyle = col; x.lineWidth = wd; x.beginPath(); let on = false;
        for (const [q, f] of ring) { if (f === front) { on ? x.lineTo(...q) : x.moveTo(...q); on = true; } else on = false; } x.stroke(); } };
    hoopStroke(false);
    stroke(segs[1], rgba(near, 0.9), (meshStep > 18 ? 2.4 : 1.8) * lw * 1.5);
    // the knots, on the near side
    x.fillStyle = rgba(mix(twine, '#000', 0.2), 0.95);
    for (let m = 1; m < ROWS * 2; m++) { const v = m / (ROWS * 2); for (let i = 0; i < M; i++) { const u = i * du + m * du / 2, p = at(u, v); if (p[2] - ctrZ(v) <= 0) continue; const q = P2(p); x.beginPath(); x.arc(q[0], q[1], (meshStep > 18 ? 2.6 : 2) * lw * 1.3, 0, TAU); x.fill(); } }
    hoopStroke(true);
    if (k === 2 && !LS && !E) { x.lineCap = 'round'; x.strokeStyle = 'rgba(20,22,22,0.85)'; x.lineWidth = hoopW * 0.55; x.beginPath(); let on2 = false; for (const [q, f] of ring) { if (f) { on2 ? x.lineTo(...q) : x.moveTo(...q); on2 = true; } else on2 = false; } x.stroke(); } // (5.16.3) a rare hoop's rubber coat
    if (LS && LS.teeth) for (let i = 0; i < 26; i++) { const u = i / 26 * TAU, p = at(u, 0); if (p[2] <= 0) continue; const q = P2(p), c0 = P2(at(u, 0.12)); const dx0 = c0[0] - q[0], dy0 = c0[1] - q[1], dl = Math.hypot(dx0, dy0) || 1;
      x.fillStyle = '#e8e0c8'; x.strokeStyle = '#2a2418'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(q[0] - dy0 / dl * 4, q[1] + dx0 / dl * 4); x.lineTo(q[0] + dx0 / dl * 16, q[1] + dy0 / dl * 16); x.lineTo(q[0] + dy0 / dl * 4, q[1] - dx0 / dl * 4); x.closePath(); x.fill(); x.stroke(); } // the gulper's teeth, turned inward
    if (LS && LS.lanterns) for (let m = 1; m < ROWS * 2; m++) { const v = m / (ROWS * 2); for (let i = 0; i < M; i += 2) { const p = at(i * du + m * du / 2, v); if (p[2] - ctrZ(v) <= 0) continue; const q = P2(p), gl = x.createRadialGradient(q[0], q[1], 0, q[0], q[1], 9 * lw * 1.4); gl.addColorStop(0, 'rgba(255,236,180,0.95)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); x.fillStyle = gl; x.beginPath(); x.arc(q[0], q[1], 9 * lw * 1.4, 0, TAU); x.fill(); } } // Lanternmesh: its knots lit
    if (LS && LS.slime) { x.strokeStyle = 'rgba(214,220,170,0.35)'; x.lineWidth = 3 * lw * 1.4; for (let i = 0; i < 6; i++) { const p = P2(at(i * 1.1, 0.05)), p2 = P2(at(i * 1.1 + 0.2, 0.55)); x.beginPath(); x.moveTo(...p); x.quadraticCurveTo(p[0] + 6, (p[1] + p2[1]) / 2, p2[0], p2[1]); x.stroke(); } } // strings of slime hanging
    // the rim's highlight and the cord lashing the bag to it
    x.strokeStyle = rgba('#ffffff', 0.28); x.lineWidth = 2.5 * lw * 1.3; x.beginPath(); let on = false; for (const [q, f] of ring) { if (f) { on ? x.lineTo(q[0], q[1] - hoopW * 0.25) : x.moveTo(q[0], q[1] - hoopW * 0.25); on = true; } else on = false; } x.stroke();
    for (let i = 0; i < M; i++) { const u = i * du, p = at(u, 0); if (p[2] <= 0) continue; const q = P2(p); x.strokeStyle = rgba(mix(twine, '#000', 0.3), 0.85); x.lineWidth = 2.2 * lw * 1.3; x.beginPath(); x.moveTo(q[0] - hoopW * 0.3, q[1] - hoopW * 0.55); x.lineTo(q[0] + hoopW * 0.3, q[1] + hoopW * 0.55); x.stroke(); }
    // the pole: along its own line, lit from the top, a grip at its end, an end cap, a collar and the yoke at the rim
    const Lr = Math.hypot(PE[0] - A2[0], PE[1] - A2[1]) - R * 0.32, R0 = poleR;
    x.save(); x.translate(...PE); x.rotate(Math.atan2(A2[1] - PE[1], A2[0] - PE[0]));
    x.fillStyle = lin(x, 0, -R0, 0, R0, [[0, mix(handle[0], '#fff', 0.2)], [0.3, handle[0]], [0.65, handle[1]], [1, handle[2]]]); x.beginPath(); x.roundRect(0, -R0, Lr, R0 * 2, R0); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.stroke();
    const gripC = E ? (E.era === 'victorian' ? E.leather : E.grip) : k >= 1 && L.h ? mix(handle[2], '#000', 0.3) : '#1a1b1c'; x.fillStyle = lin(x, 0, -R0 - 3, 0, R0 + 3, [[0, mix(gripC, '#fff', 0.15)], [1, mix(gripC, '#000', 0.4)]]); x.beginPath(); x.roundRect(10, -R0 - 3, 120, R0 * 2 + 6, R0); x.fill();
    if (E && E.era !== 'postwar') for (let i = 0; i < 10; i++) { x.strokeStyle = E.era === 'interwar' ? 'rgba(40,36,24,0.5)' : 'rgba(230,200,160,0.3)'; x.lineWidth = E.era === 'interwar' ? 3 : 1.5; x.beginPath(); x.moveTo(14 + i * 12, -R0 - 3); x.lineTo(26 + i * 12, R0 + 3); x.stroke(); } // the binding: canvas tape, or stitched leather
    else for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 2; x.beginPath(); x.moveTo(18 + i * 13, -R0); x.lineTo(24 + i * 13, R0); x.stroke(); }
    if (E && E.era === 'victorian') for (const fp of [0.42, 0.7]) { const fx2 = Lr * fp; x.fillStyle = lin(x, 0, -R0 - 2, 0, R0 + 2, [[0, mix(E.metal, '#fff', 0.35)], [0.5, E.metal], [1, mix(E.metal, '#000', 0.45)]]); x.fillRect(fx2, -R0 - 2, 14, R0 * 2 + 4); } // brass ferrules on the wood
    if (E) eraMark(x, E, Lr * 0.56, 0, Math.max(13, R0 * 0.9), 0, handle[1]);
    if (k === 2 && !LS && !E) { x.save(); x.beginPath(); x.roundRect(140, -R0, Lr - 190, R0 * 2, R0); x.clip(); x.strokeStyle = 'rgba(255,255,255,0.07)'; x.lineWidth = 3; for (let i = -10; i < Lr / 8; i++) { x.beginPath(); x.moveTo(140 + i * 8, -R0); x.lineTo(140 + i * 8 + R0 * 2, R0); x.stroke(); x.beginPath(); x.moveTo(140 + i * 8 + R0 * 2, -R0); x.lineTo(140 + i * 8, R0); x.stroke(); } x.restore(); } // (5.16.3) a rare pole's carbon weave
    if (LS && LS.spine) for (let xx = 150; xx < Lr - 50; xx += R0 * 1.5) { x.fillStyle = lin(x, 0, -R0 * 1.3, 0, R0 * 1.3, [[0, '#e8dcc0'], [0.5, '#b0a080'], [1, '#5a5038']]); x.beginPath(); x.roundRect(xx, -R0 * 1.3, R0 * 0.8, R0 * 2.6, R0 * 0.35); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 1.5; x.stroke(); } // an eel's vertebrae
    if (LS && LS.cord) { x.strokeStyle = 'rgba(40,30,16,0.55)'; x.lineWidth = 3; for (let xx = 140; xx < Lr - 40; xx += 11) { x.beginPath(); x.moveTo(xx, -R0); x.quadraticCurveTo(xx + 8, 0, xx + 3, R0); x.stroke(); } } // twisted cords
    if (LS && LS.carved) for (const fp of [0.38, 0.62, 0.86]) { const fx2 = Lr * fp; x.fillStyle = lin(x, 0, -R0 - 2, 0, R0 + 2, [[0, '#c8a060'], [0.5, '#8a6a34'], [1, '#4a3416']]); x.fillRect(fx2, -R0 - 2, 12, R0 * 2 + 4); x.strokeStyle = 'rgba(40,24,10,0.6)'; x.lineWidth = 1.2; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(fx2 + 20 + i * 9, -R0 * 0.6); x.lineTo(fx2 + 25 + i * 9, R0 * 0.6); x.stroke(); } } // brass bands and cut marks
    if (LS && LS.rib) { x.strokeStyle = 'rgba(90,80,60,0.35)'; x.lineWidth = 1.2; for (let xx = 150; xx < Lr - 40; xx += 26) { x.beginPath(); x.ellipse(xx, 0, 3, R0 * 0.6, 0, 0, TAU); x.stroke(); } } // the rib's pores
    if (LS && LS.stalk) { const gl = x.createRadialGradient(Lr * 0.12, -R0 * 2.4, 0, Lr * 0.12, -R0 * 2.4, 26); gl.addColorStop(0, 'rgba(255,236,180,0.9)'); gl.addColorStop(1, 'rgba(255,214,140,0)'); x.strokeStyle = '#3e3424'; x.lineWidth = 4; x.beginPath(); x.moveTo(Lr * 0.16, -R0); x.quadraticCurveTo(Lr * 0.18, -R0 * 2.6, Lr * 0.12, -R0 * 2.4); x.stroke(); x.fillStyle = gl; x.beginPath(); x.arc(Lr * 0.12, -R0 * 2.4, 26, 0, TAU); x.fill(); } // a lure on its stalk at the grip
    if (k >= 1 && !L.h && !E) { x.fillStyle = '#7a6040'; x.fillRect(140, -R0, 16, R0 * 2); }
    x.fillStyle = '#121314'; x.beginPath(); x.roundRect(-8, -R0 - 1, 14, R0 * 2 + 2, 5); x.fill();
    x.fillStyle = lin(x, 0, -R0 - 3, 0, R0 + 3, [[0, mix(metal, '#fff', 0.3)], [0.5, metal], [1, mix(metal, '#000', 0.45)]]); x.beginPath(); x.roundRect(Lr - 40, -R0 - 3, 40, R0 * 2 + 6, 4); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 2; x.stroke();
    x.restore();
    // the yoke: two arms from the collar out to the rim either side of where it meets
    const C2 = [A2[0] + Math.cos(ang) * R * 0.32, A2[1] + Math.sin(ang) * R * 0.32];
    for (const du2 of [-0.42, 0.42]) { const q = P2(at(Math.PI + du2, 0)); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = hoopW * 0.8 + 4; x.beginPath(); x.moveTo(...C2); x.lineTo(...q); x.stroke(); x.strokeStyle = hoop; x.lineWidth = hoopW * 0.8; x.stroke(); }
    if (LS && !def.coin) { const c0 = P2(at(0, 0.3)); /* (5.17.0) a coin's copy has no halo or sparks: the coin brings its own */ const gl = x.createRadialGradient(c0[0], c0[1], 10, c0[0], c0[1], R * 1.6); gl.addColorStop(0, rgba(LS.glow, 0.18)); gl.addColorStop(1, rgba(LS.glow, 0)); x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = gl; x.beginPath(); x.arc(c0[0], c0[1], R * 1.6, 0, TAU); x.fill(); x.restore(); }
    x.restore();
    if (k >= 4 && !def.coin) sparks(x, W, H, LS ? LS.glow : hoop, 19 + (hash(def.id) % 97));
  });
  return true;
}

// ---------------------------------------------------------------- legendaries ----------------------------------------------------------------
// (5.14.4) A legendary is not gear made better: it is a thing from the deep, drawn from its own story, each one of a
// kind. Samples first (the Barreleye Lens, Gulper's Throat, the Black Lung); the rest follow once approved.
// shared hands for the legendaries: organic texture (mottling, pores), a rim of light on the upper edge, a soft inner
// shadow at the lower edge, and a sharp wet highlight. path() draws the shape's outline
let lsd = 1; const lr = () => ((lsd = (lsd * 16807) % 2147483647) / 2147483647);
function mottle(x, path, cols, n, r0, r1) { x.save(); path(); x.clip(); for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.beginPath(); x.arc(lr() * 1000, lr() * 400, r0 + lr() * (r1 - r0), 0, TAU); x.fill(); } x.restore(); }
function shade(x, path, top, bot, rimA = 0.35, aoA = 0.55, w = 18) {
  x.save(); path(); x.clip();
  x.fillStyle = lin(x, 0, top, 0, bot, [[0, `rgba(255,248,230,${rimA * 0.5})`], [0.35, 'rgba(255,248,230,0)'], [0.7, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${aoA})`]]); x.fillRect(0, 0, 1000, 400);
  path(); x.strokeStyle = `rgba(0,0,0,${aoA})`; x.lineWidth = w; x.filter = 'blur(6px)'; x.stroke(); x.filter = 'none';
  x.restore(); x.save(); path(); x.strokeStyle = 'rgba(0,0,0,0.65)'; x.lineWidth = 3; x.stroke(); x.restore();
}
function gloss(x, cx, cy, rx, ry, rot, a = 0.55) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry)); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.5, `rgba(255,255,255,${a * 0.25})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(1, ry / rx); x.translate(-cx, -cy); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rx, 0, TAU); x.fill(); x.restore(); }
function halo(x, cx, cy, r, col, a = 0.8) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); const c = hex(col); g.addColorStop(0, `rgba(${c},${a})`.replace(/rgba\((\d+),(\d+),(\d+),/, 'rgba($1,$2,$3,')); g.addColorStop(0.25, `rgba(${c[0]},${c[1]},${c[2]},${a * 0.45})`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
const LEGEND_ART = {
  // a camera grown from a barreleye's skull: a squat housing of fused bone plates (sutures, pores), a grip of ridged
  // cartilage, a shutter spine on top; its front port is the barreleye's own clear head, a glassy dome with the two
  // green barrel eyes inside it, lit from within, looking up
  barreleye(x, W, H, t) {
    lsd = 31; const X0 = 230, Y0 = 150, BW = 380, BH = 200;
    // the grip, behind on the left
    const grip = () => { x.beginPath(); x.roundRect(X0 - 70, Y0 + 40, 96, BH - 20, 30); };
    x.fillStyle = '#2a2018'; grip(); x.fill(); mottle(x, grip, ['rgba(90,70,48,0.35)', 'rgba(10,8,6,0.35)'], 160, 2, 7);
    for (let k = 0; k < 7; k++) { x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 4; x.beginPath(); x.moveTo(X0 - 64, Y0 + 70 + k * 22); x.quadraticCurveTo(X0 - 22, Y0 + 62 + k * 22, X0 + 20, Y0 + 70 + k * 22); x.stroke(); x.strokeStyle = 'rgba(220,190,150,0.18)'; x.lineWidth = 2; x.beginPath(); x.moveTo(X0 - 64, Y0 + 66 + k * 22); x.quadraticCurveTo(X0 - 22, Y0 + 58 + k * 22, X0 + 20, Y0 + 66 + k * 22); x.stroke(); }
    shade(x, grip, Y0 + 40, Y0 + BH + 20, 0.3, 0.6, 14);
    // the housing: fused bone plates
    const body = () => { x.beginPath(); x.moveTo(X0 + 30, Y0); x.bezierCurveTo(X0 + 140, Y0 - 24, X0 + 300, Y0 - 20, X0 + BW, Y0 + 20); x.bezierCurveTo(X0 + BW + 30, Y0 + 80, X0 + BW + 20, Y0 + BH - 20, X0 + BW - 20, Y0 + BH);
      x.bezierCurveTo(X0 + 260, Y0 + BH + 22, X0 + 100, Y0 + BH + 20, X0 + 10, Y0 + BH - 6); x.bezierCurveTo(X0 - 16, Y0 + 140, X0 - 10, Y0 + 40, X0 + 30, Y0); x.closePath(); };
    x.fillStyle = lin(x, 0, Y0 - 20, 0, Y0 + BH + 20, [[0, '#8a7a5e'], [0.4, '#5e5240'], [1, '#2c2418']]); body(); x.fill();
    mottle(x, body, ['rgba(200,180,140,0.12)', 'rgba(30,22,14,0.22)', 'rgba(120,100,70,0.18)'], 500, 2, 9);
    x.save(); body(); x.clip(); x.strokeStyle = 'rgba(30,22,14,0.55)'; x.lineWidth = 2.5; // the sutures between the plates, jagged
    for (const [sx, sy, ex, ey] of [[X0 + 120, Y0 - 20, X0 + 140, Y0 + BH + 20], [X0 + 260, Y0 - 20, X0 + 250, Y0 + BH + 20], [X0, Y0 + 100, X0 + 400, Y0 + 90]]) { x.beginPath(); x.moveTo(sx, sy); for (let k = 1; k <= 18; k++) { const u = k / 18; x.lineTo(sx + (ex - sx) * u + (k % 2 ? 5 : -5), sy + (ey - sy) * u + (k % 2 ? -4 : 4)); } x.stroke(); }
    for (let k = 0; k < 60; k++) { x.fillStyle = 'rgba(20,14,8,0.4)'; x.beginPath(); x.arc(X0 + lr() * BW, Y0 + lr() * BH, 1 + lr() * 2, 0, TAU); x.fill(); } x.restore(); // pores
    shade(x, body, Y0 - 20, Y0 + BH + 20, 0.45, 0.6);
    // the shutter: a curved spine on top, its tip worn pale
    x.fillStyle = lin(x, X0 + 80, Y0 - 60, X0 + 120, Y0, [[0, '#e8dcc0'], [1, '#7a6a4c']]); x.beginPath(); x.moveTo(X0 + 70, Y0 - 6); x.quadraticCurveTo(X0 + 80, Y0 - 70, X0 + 128, Y0 - 76); x.quadraticCurveTo(X0 + 100, Y0 - 50, X0 + 104, Y0 - 10); x.closePath(); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke();
    // the front port: the barreleye's head, a clear dome set in a ring of bone, its eyes inside
    const pcx = X0 + BW - 10, pcy = Y0 + BH * 0.52, PR = 112;
    x.fillStyle = lin(x, pcx - PR, pcy - PR, pcx + PR, pcy + PR, [[0, '#d8ccb0'], [0.5, '#8a7a5a'], [1, '#3a3020']]); x.beginPath(); x.ellipse(pcx, pcy, PR * 0.62 + 16, PR + 16, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 3; x.stroke();
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; x.fillStyle = 'rgba(40,30,18,0.5)'; x.beginPath(); x.arc(pcx + Math.cos(a) * (PR * 0.62 + 8), pcy + Math.sin(a) * (PR + 8), 3, 0, TAU); x.fill(); }
    const dome = () => { x.beginPath(); x.ellipse(pcx, pcy, PR * 0.62, PR, 0, 0, TAU); };
    x.save(); dome(); x.clip(); x.fillStyle = lin(x, 0, pcy - PR, 0, pcy + PR, [[0, 'rgba(26,48,44,0.95)'], [1, 'rgba(6,14,12,0.98)']]); x.fillRect(pcx - PR, pcy - PR, PR * 2, PR * 2);
    halo(x, pcx, pcy - PR * 0.35, PR * 1.1, '#7ad890', 0.35);
    for (const dx of [-26, 26]) { const ex = pcx + dx, top = pcy - PR * 0.72, bot2 = pcy + PR * 0.25, ew = 34; // a barrel eye, wider at its top, ringed, its lens lit
      x.fillStyle = lin(x, ex - ew, 0, ex + ew, 0, [[0, '#0e2a16'], [0.38, '#3e8a50'], [0.55, '#8ad48c'], [1, '#0e2a16']]); x.beginPath(); x.moveTo(ex - ew * 0.3, bot2); x.bezierCurveTo(ex - ew * 0.36, top + 40, ex - ew * 0.56, top + 14, ex - ew * 0.5, top); x.lineTo(ex + ew * 0.5, top); x.bezierCurveTo(ex + ew * 0.56, top + 14, ex + ew * 0.36, top + 40, ex + ew * 0.3, bot2); x.closePath(); x.fill();
      for (let k = 1; k < 5; k++) { x.strokeStyle = 'rgba(10,30,16,0.45)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(ex - ew * (0.32 + k * 0.03), top + k * 22); x.lineTo(ex + ew * (0.32 + k * 0.03), top + k * 22); x.stroke(); }
      halo(x, ex, top, 44, '#b8ffb0', 0.75 + 0.2 * Math.sin(t * 2 + dx)); x.fillStyle = '#0c2a14'; x.beginPath(); x.ellipse(ex, top, ew * 0.5, ew * 0.2, 0, 0, TAU); x.fill(); x.fillStyle = '#e8ffe0'; x.beginPath(); x.ellipse(ex, top, ew * 0.36, ew * 0.13, 0, 0, TAU); x.fill(); }
    x.fillStyle = 'rgba(180,220,200,0.07)'; x.fillRect(pcx - PR, pcy - PR, PR * 2, PR * 2); x.restore(); // the dome's own faint green
    gloss(x, pcx - PR * 0.22, pcy - PR * 0.55, PR * 0.32, PR * 0.12, -0.5, 0.7); gloss(x, pcx + PR * 0.3, pcy + PR * 0.55, PR * 0.12, PR * 0.05, -0.4, 0.4); // the glass catches the light
    x.save(); dome(); x.strokeStyle = 'rgba(210,240,225,0.55)'; x.lineWidth = 2.5; x.stroke(); x.restore();
    return '#8ae08a';
  },
  // the gulper eel's mouth on a bone pole: a hoop of its vertebrae (each a knuckle with short spines, joined by a band of
  // cartilage), the jaw-skin hung from it as a deep slack bag you can see into, its rim set with fine teeth, and the
  // long whip of the tail trailing off it to the pink light at its tip
  gulper(x, W, H, t) {
    lsd = 47; const fx = 600, fy = 196, rx = 64, ry = 148;
    // the inside of the mouth, seen through the hoop: dark, a little red deep in it
    x.save(); x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.clip(); const ig = x.createRadialGradient(fx + 20, fy + 20, 4, fx, fy, ry); ig.addColorStop(0, '#3a0e14'); ig.addColorStop(1, '#0a0406'); x.fillStyle = ig; x.fillRect(fx - rx, fy - ry, rx * 2, ry * 2); x.restore();
    // the bag: slack skin falling back and down from the rim, folds catching the light, translucent at its thin edge
    const bag = () => { x.beginPath(); x.moveTo(fx + 4, fy - ry); x.bezierCurveTo(fx + 170, fy - ry - 20, fx + 300, fy - 40, fx + 318, fy + 54); x.bezierCurveTo(fx + 326, fy + 120, fx + 220, fy + 170, fx + 110, fy + ry - 2); x.quadraticCurveTo(fx + 40, fy + ry + 8, fx + 4, fy + ry); x.bezierCurveTo(fx + rx * 1.1, fy + 40, fx + rx * 1.1, fy - 40, fx + 4, fy - ry); x.closePath(); };
    x.fillStyle = lin(x, fx, 0, fx + 330, 0, [[0, '#2a1820'], [0.5, '#20121a'], [1, '#3e2a32']]); bag(); x.fill();
    mottle(x, bag, ['rgba(120,70,80,0.12)', 'rgba(0,0,0,0.25)'], 360, 2, 8);
    x.save(); bag(); x.clip();
    for (let k = 0; k < 8; k++) { const y0 = fy - ry + 30 + k * 34; x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 7; x.filter = 'blur(3px)'; x.beginPath(); x.moveTo(fx + 40, y0); x.bezierCurveTo(fx + 130, y0 + 6, fx + 210, y0 + k * 6, fx + 300, fy + 40); x.stroke(); x.filter = 'none';
      x.strokeStyle = 'rgba(220,160,180,0.16)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(fx + 40, y0 - 5); x.bezierCurveTo(fx + 130, y0, fx + 210, y0 + k * 6 - 6, fx + 300, fy + 34); x.stroke(); } // folds
    x.strokeStyle = 'rgba(170,50,70,0.4)'; x.lineWidth = 1.6; for (let k = 0; k < 14; k++) { x.beginPath(); let px = fx + 60 + lr() * 200, py = fy - 100 + lr() * 200; x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += 14 + lr() * 14; py += (lr() - 0.5) * 22; x.lineTo(px, py); } x.stroke(); } // veins
    x.restore(); shade(x, bag, fy - ry, fy + ry, 0.4, 0.5); gloss(x, fx + 150, fy - 96, 90, 18, -0.15, 0.32);
    // the tail
    x.lineCap = 'round'; x.strokeStyle = '#24141c'; x.lineWidth = 10; x.beginPath(); x.moveTo(fx + 316, fy + 70); x.bezierCurveTo(fx + 360, fy + 140, fx + 310, fy + 190, fx + 360, fy + 196); x.bezierCurveTo(fx + 400, fy + 200, fx + 400, fy + 120, fx + 440, fy + 96); x.stroke();
    x.strokeStyle = 'rgba(200,130,150,0.35)'; x.lineWidth = 3; x.stroke();
    halo(x, fx + 440, fy + 96, 52, '#ff9ab8', 0.85 + 0.15 * Math.sin(t * 3)); x.fillStyle = '#ffd8e4'; x.beginPath(); x.ellipse(fx + 440, fy + 96, 9, 6, -0.6, 0, TAU); x.fill();
    // the hoop: a cartilage band, then the vertebrae on it, each with spines out; teeth along the inner rim
    x.strokeStyle = '#6e5e46'; x.lineWidth = 14; x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(255,240,210,0.25)'; x.lineWidth = 3; x.beginPath(); x.ellipse(fx - 2, fy - 3, rx, ry, 0, Math.PI * 0.9, Math.PI * 1.9); x.stroke();
    for (let k = 0; k < 26; k++) { const a = k / 26 * TAU, ca = Math.cos(a), sa = Math.sin(a), vx = fx + ca * rx, vy = fy + sa * ry;
      x.strokeStyle = '#a8987a'; x.lineWidth = 3; x.beginPath(); x.moveTo(vx + ca * 8, vy + sa * 8); x.lineTo(vx + ca * 20, vy + sa * 22); x.stroke(); // a spine
      x.fillStyle = lin(x, vx - 12, vy - 12, vx + 12, vy + 12, [[0, '#f4ead2'], [0.55, '#c6b690'], [1, '#5e523c']]); x.beginPath(); x.ellipse(vx, vy, 13, 10, a + Math.PI / 2, 0, TAU); x.fill(); x.strokeStyle = 'rgba(30,22,12,0.6)'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = 'rgba(30,22,12,0.45)'; x.beginPath(); x.arc(vx, vy, 3.4, 0, TAU); x.fill();
      x.fillStyle = '#e8e0cc'; x.beginPath(); x.moveTo(vx - ca * 9 - sa * 3, vy - sa * 9 + ca * 3); x.lineTo(vx - ca * 20, vy - sa * 20); x.lineTo(vx - ca * 9 + sa * 3, vy - sa * 9 - ca * 3); x.closePath(); x.fill(); } // a tooth inward
    // the pole: bone, knuckled, its grip wound in dark cord
    const pole = () => { x.beginPath(); x.roundRect(70, fy - 13, fx - rx - 76, 26, 13); };
    x.fillStyle = lin(x, 0, fy - 14, 0, fy + 14, [[0, '#f0e6cc'], [0.5, '#c2b28a'], [1, '#5e523c']]); pole(); x.fill(); mottle(x, pole, ['rgba(120,100,70,0.25)', 'rgba(255,250,230,0.2)'], 140, 1, 4);
    for (let k = 0; k < 6; k++) { const kx = 250 + k * 50; x.fillStyle = lin(x, 0, fy - 18, 0, fy + 18, [[0, '#f4ead2'], [1, '#6e624a']]); x.beginPath(); x.ellipse(kx, fy, 9, 17, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1.5; x.stroke(); }
    x.fillStyle = '#2a1a12'; x.beginPath(); x.roundRect(78, fy - 16, 150, 32, 14); x.fill(); for (let k = 0; k < 18; k++) { x.strokeStyle = 'rgba(255,220,180,0.14)'; x.lineWidth = 2; x.beginPath(); x.moveTo(84 + k * 8, fy - 15); x.lineTo(90 + k * 8, fy + 15); x.stroke(); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.moveTo(86 + k * 8, fy - 15); x.lineTo(92 + k * 8, fy + 15); x.stroke(); }
    shade(x, pole, fy - 13, fy + 13, 0.3, 0.45, 8);
    return '#f08aa8';
  },
  // not a tank: a swim bladder as big as a man's back, two lobes of dark membrane, folded and veined, lit faintly red
  // from inside where it breathes; a leather harness wrapping round it (over it, stitched, brass buckles), and a
  // ringed sinew hose to a carved bone mouthpiece
  blacklung(x, W, H, t) {
    lsd = 59; const cx = 470, cy = 206, br = 1 + 0.025 * Math.sin(t * 1.1);
    const lobe = (lx, ly, lw, lh, tilt) => () => { x.beginPath(); x.ellipse(lx, ly, lw * br, lh * br, tilt, 0, TAU); };
    const L1 = lobe(cx - 118, cy - 4, 196, 134, -0.08), L2 = lobe(cx + 122, cy + 8, 184, 126, 0.1);
    for (const [L, lx, ly] of [[L1, cx - 118, cy - 4], [L2, cx + 122, cy + 8]]) {
      const g = x.createRadialGradient(lx - 60, ly - 50, 8, lx, ly, 220); g.addColorStop(0, '#4a3448'); g.addColorStop(0.4, '#1e1220'); g.addColorStop(1, '#060407'); x.fillStyle = g; L(); x.fill();
      x.save(); L(); x.clip(); halo(x, lx + 20, ly + 30, 150, '#9a1830', 0.28 + 0.1 * Math.sin(t * 1.1)); x.restore(); // its own red, deep inside
      mottle(x, L, ['rgba(120,80,120,0.1)', 'rgba(0,0,0,0.25)'], 300, 2, 9);
      x.save(); L(); x.clip(); x.strokeStyle = 'rgba(150,30,50,0.5)'; x.lineWidth = 2; // branching veins
      for (let k = 0; k < 6; k++) { let px = lx - 150 + k * 60, py = ly + 120; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 7; j++) { px += (lr() - 0.4) * 40; py -= 26 + lr() * 10; x.lineTo(px, py); if (j === 3) { x.moveTo(px, py); x.lineTo(px + 30, py - 30); x.moveTo(px, py); } } x.stroke(); }
      for (let k = 0; k < 4; k++) { x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 8; x.filter = 'blur(4px)'; x.beginPath(); x.arc(lx + (k - 1.5) * 50, ly + 150, 160, -2.1, -1.0); x.stroke(); x.filter = 'none'; } // folds of membrane
      x.restore(); shade(x, L, ly - 140, ly + 140, 0.35, 0.65);
      gloss(x, lx - 70, ly - 74, 70, 18, -0.4, 0.6); gloss(x, lx + 80, ly - 40, 24, 7, -0.2, 0.45); }
    x.save(); x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 16; x.filter = 'blur(8px)'; x.beginPath(); x.moveTo(cx + 2, cy - 90); x.quadraticCurveTo(cx - 10, cy, cx + 4, cy + 100); x.stroke(); x.filter = 'none'; x.restore(); // the crease where the lobes meet
    // the harness: two straps wrapping over it, curving with its shape, stitched; brass buckles at the front
    for (const sy of [-62, 66]) { const strap = () => { x.beginPath(); x.moveTo(cx - 330, cy + sy - 14); x.quadraticCurveTo(cx, cy + sy + (sy < 0 ? -34 : 26) - 14, cx + 330, cy + sy - 14); x.lineTo(cx + 330, cy + sy + 14); x.quadraticCurveTo(cx, cy + sy + (sy < 0 ? -34 : 26) + 14, cx - 330, cy + sy + 14); x.closePath(); };
      x.fillStyle = lin(x, 0, cy + sy - 30, 0, cy + sy + 30, [[0, '#7a5434'], [0.5, '#4e3420'], [1, '#2a1a10']]); strap(); x.fill(); mottle(x, strap, ['rgba(255,220,170,0.08)', 'rgba(0,0,0,0.2)'], 120, 1, 4);
      x.save(); strap(); x.clip(); x.setLineDash([6, 5]); x.strokeStyle = 'rgba(240,210,160,0.35)'; x.lineWidth = 1.6; for (const o of [-9, 9]) { x.beginPath(); x.moveTo(cx - 330, cy + sy + o); x.quadraticCurveTo(cx, cy + sy + (sy < 0 ? -34 : 26) + o, cx + 330, cy + sy + o); x.stroke(); } x.setLineDash([]); x.restore();
      shade(x, strap, cy + sy - 30, cy + sy + 30, 0.25, 0.4, 6);
      const bx = cx + 250, by = cy + sy + (sy < 0 ? -12 : 8); x.fillStyle = lin(x, bx - 22, by - 22, bx + 22, by + 22, [[0, '#e0c080'], [0.5, '#a07a3a'], [1, '#4a3414']]); x.beginPath(); x.roundRect(bx - 22, by - 22, 44, 44, 6); x.fill(); x.fillStyle = '#2a1a10'; x.beginPath(); x.roundRect(bx - 12, by - 12, 24, 24, 3); x.fill(); x.strokeStyle = '#c8a868'; x.lineWidth = 4; x.beginPath(); x.moveTo(bx, by - 12); x.lineTo(bx, by + 12); x.stroke(); }
    // the hose: ringed like a windpipe, a highlight along it; the bone mouthpiece, carved
    const hp = (u) => [cx - 10 + u * 300 + Math.sin(u * Math.PI) * -20, cy - 64 - Math.sin(u * Math.PI) * 120 + u * 10];
    for (let k = 0; k <= 40; k++) { const [hx, hy] = hp(k / 40); x.fillStyle = k % 2 ? '#2e1e26' : '#3e2a32'; x.beginPath(); x.arc(hx, hy, 13, 0, TAU); x.fill(); }
    for (let k = 0; k <= 40; k += 2) { const [hx, hy] = hp(k / 40); x.fillStyle = 'rgba(230,170,180,0.22)'; x.beginPath(); x.arc(hx - 3, hy - 5, 4, 0, TAU); x.fill(); }
    const [mx, my] = hp(1); x.fillStyle = lin(x, mx - 30, my - 26, mx + 30, my + 26, [[0, '#f4ead2'], [0.6, '#b8a880'], [1, '#5a4e38']]); x.beginPath(); x.roundRect(mx - 8, my - 24, 62, 48, 16); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.stroke();
    for (let k = 0; k < 3; k++) { x.strokeStyle = 'rgba(60,48,30,0.5)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(mx + 4 + k * 12, my - 22); x.quadraticCurveTo(mx + 10 + k * 12, my, mx + 4 + k * 12, my + 22); x.stroke(); }
    x.fillStyle = '#140c0a'; x.beginPath(); x.ellipse(mx + 48, my, 7, 12, 0, 0, TAU); x.fill();
    return '#c06a8a';
  },
};
// (5.14.5) the rest of the legendaries, each from its own story. Shared shapes keep them consistent (how a net is
// held, how a pair of fins lies); what they are made of and how they light is each one's own.
function legNet(x, t, o) { // o: { hoop(x,fx,fy,rx,ry), bag(x,fx,fy,rx,ry), pole(x,fy,x1), seed }
  lsd = o.seed || 71; const fx = 600, fy = 196, rx = 64, ry = 148;
  o.bag(x, fx, fy, rx, ry, t); o.hoop(x, fx, fy, rx, ry, t); o.pole(x, fy, fx - rx - 6, t);
}
function bonePole(x, fy, x1, cols = ['#f0e6cc', '#c2b28a', '#5e523c'], grip = '#2a1a12') {
  const pole = () => { x.beginPath(); x.roundRect(70, fy - 12, x1 - 70, 24, 12); };
  x.fillStyle = lin(x, 0, fy - 13, 0, fy + 13, [[0, cols[0]], [0.5, cols[1]], [1, cols[2]]]); pole(); x.fill(); mottle(x, pole, ['rgba(120,100,70,0.22)', 'rgba(255,250,230,0.18)'], 120, 1, 4);
  x.fillStyle = grip; x.beginPath(); x.roundRect(78, fy - 15, 150, 30, 13); x.fill(); for (let k = 0; k < 18; k++) { x.strokeStyle = 'rgba(255,220,180,0.13)'; x.lineWidth = 2; x.beginPath(); x.moveTo(84 + k * 8, fy - 14); x.lineTo(90 + k * 8, fy + 14); x.stroke(); }
  shade(x, pole, fy - 12, fy + 12, 0.3, 0.45, 8);
}
function meshBag(x, fx, fy, rx, ry, fill, thread, depth = 300) { // a hanging net bag behind a hoop, its weave
  const bag = () => { x.beginPath(); x.moveTo(fx, fy - ry); x.bezierCurveTo(fx + depth * 0.6, fy - ry - 10, fx + depth, fy - 30, fx + depth * 0.95, fy + 60); x.bezierCurveTo(fx + depth * 0.85, fy + 140, fx + depth * 0.4, fy + ry, fx, fy + ry); x.closePath(); };
  x.fillStyle = fill; bag(); x.fill(); x.save(); bag(); x.clip(); x.strokeStyle = thread; x.lineWidth = 1.6;
  for (let i = -30; i < 40; i++) for (const sg of [1, -1]) { x.beginPath(); x.moveTo(fx + i * 14, fy - ry - 20); x.lineTo(fx + i * 14 + sg * ry * 2.2, fy + ry + 20); x.stroke(); }
  x.restore(); shade(x, bag, fy - ry, fy + ry, 0.25, 0.5, 14); return bag;
}
function finPair(x, blade, o = {}) { // two fins, one across the other, each a foot pocket and a blade painted by blade(x, L, r0, r1)
  const L = o.L || 640, r0 = o.r0 || 56, r1 = o.r1 || 110;
  const one = (dx, dy, rot, far) => { x.save(); x.translate(160 + dx, 200 + dy); x.rotate(rot);
    x.save(); blade(x, L, r0, r1); x.restore();
    const pocket = () => { x.beginPath(); x.moveTo(110, -r0 - 6); x.bezierCurveTo(30, -r0 - 16, -40, -r0 + 2, -54, -20); x.bezierCurveTo(-62, -6, -62, 6, -54, 20); x.bezierCurveTo(-40, r0 - 2, 30, r0 + 16, 110, r0 + 6); x.closePath(); };
    x.fillStyle = o.pocket || '#2a2420'; pocket(); x.fill(); mottle(x, pocket, ['rgba(255,240,220,0.06)', 'rgba(0,0,0,0.2)'], 80, 1, 4); shade(x, pocket, -r0 - 16, r0 + 16, 0.3, 0.55, 10);
    x.fillStyle = 'rgba(6,5,5,0.9)'; x.beginPath(); x.ellipse(10, -2, 44, r0 * 0.46, 0, 0, TAU); x.fill();
    if (far) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(10,12,14,0.3)'; x.fillRect(-100, -300, 1200, 600); }
    x.restore(); };
  one(30, -46, -0.05, true); one(0, 36, 0.025, false);
}
Object.assign(LEGEND_ART, {
  // a living veil of siphonophore on a ring of its own jelly: a soft translucent bell for a bag, its stinging threads
  // trailing, small lights strung along them, faint violet and pale
  choirveil(x, W, H, t) { legNet(x, t, { seed: 73,
    bag: (x, fx, fy, rx, ry) => { const bag = () => { x.beginPath(); x.moveTo(fx, fy - ry); x.bezierCurveTo(fx + 200, fy - ry - 20, fx + 300, fy - 20, fx + 280, fy + 50); x.bezierCurveTo(fx + 260, fy + 120, fx + 120, fy + ry, fx, fy + ry); x.closePath(); };
      x.fillStyle = 'rgba(150,140,190,0.28)'; bag(); x.fill(); x.save(); bag(); x.clip(); halo(x, fx + 120, fy, 200, '#b8a8e8', 0.25); for (let k = 0; k < 9; k++) { x.strokeStyle = 'rgba(230,220,255,0.25)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(fx + 10, fy - ry + k * 34); x.bezierCurveTo(fx + 120, fy - ry + k * 30, fx + 220, fy - 30 + k * 12, fx + 280, fy + 50); x.stroke(); } x.restore();
      x.save(); bag(); x.strokeStyle = 'rgba(230,220,255,0.55)'; x.lineWidth = 2; x.stroke(); x.restore();
      for (let k = 0; k < 7; k++) { const sx = fx + 120 + k * 22, sy = fy + 90 - k * 10; x.strokeStyle = 'rgba(210,200,245,0.45)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(sx, sy); x.bezierCurveTo(sx + 30, sy + 50, sx - 10, sy + 90, sx + 30 + k * 6, sy + 130); x.stroke();
        for (let j = 1; j < 5; j++) halo(x, sx + 10 + j * 5, sy + j * 30, 7, '#d8ccff', 0.8); } },
    hoop: (x, fx, fy, rx, ry) => { x.strokeStyle = 'rgba(200,190,240,0.55)'; x.lineWidth = 16; x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(255,250,255,0.6)'; x.lineWidth = 3; x.beginPath(); x.ellipse(fx - 3, fy - 3, rx, ry, 0, Math.PI * 0.9, Math.PI * 1.9); x.stroke();
      for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; halo(x, fx + Math.cos(a) * rx, fy + Math.sin(a) * ry, 10, '#e0d4ff', 0.7); } },
    pole: (x, fy, x1) => bonePole(x, fy, x1, ['#e8e4f0', '#a8a0b8', '#4a4458'], '#2a2434') }); return '#c8b8f0'; },
  // the lure-threads of a hundred anglerfish knotted into a mesh: a dark hoop of their spines, and at every knot a
  // small bulb of their light, warm and green
  lanternmesh(x, W, H, t) { legNet(x, t, { seed: 79,
    bag: (x, fx, fy, rx, ry) => { const bag = meshBag(x, fx, fy, rx, ry, 'rgba(14,16,12,0.85)', 'rgba(90,100,70,0.55)');
      x.save(); bag(); x.clip(); for (let i = -12; i < 22; i++) for (let j = -12; j < 12; j++) { const kx = fx + i * 14 + j * 14; if ((i + j) % 3) continue; halo(x, kx + (j % 2) * 7, fy + j * 28 + (i % 2) * 14, 9, i % 2 ? '#c8e890' : '#f0d890', 0.85); } x.restore(); },
    hoop: (x, fx, fy, rx, ry) => { x.strokeStyle = '#1c1a14'; x.lineWidth = 15; x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.stroke(); for (let k = 0; k < 30; k++) { const a = k / 30 * TAU, ca = Math.cos(a), sa = Math.sin(a); x.strokeStyle = '#5a5444'; x.lineWidth = 2; x.beginPath(); x.moveTo(fx + ca * rx, fy + sa * ry); x.lineTo(fx + ca * (rx + 14), fy + sa * (ry + 16)); x.stroke(); halo(x, fx + ca * (rx + 16), fy + sa * (ry + 18), 7, '#e8e090', 0.9); } },
    pole: (x, fy, x1) => bonePole(x, fy, x1, ['#4a4638', '#2a2820', '#0e0e0a'], '#16140e') }); return '#d8e890'; },
  // hagfish slime dried hard into an amber mesh on a long whalebone pole; drips of it hang from the bag, and it keeps
  // a breath of air in its bubbles
  hagnet(x, W, H, t) { legNet(x, t, { seed: 83,
    bag: (x, fx, fy, rx, ry) => { const bag = meshBag(x, fx, fy, rx, ry, 'rgba(150,110,50,0.4)', 'rgba(230,180,90,0.55)', 320);
      x.save(); bag(); x.clip(); for (let k = 0; k < 26; k++) { const bx = fx + 30 + lr() * 260, by = fy - 120 + lr() * 240, r = 3 + lr() * 6; x.strokeStyle = 'rgba(255,240,200,0.6)'; x.lineWidth = 1.2; x.beginPath(); x.arc(bx, by, r, 0, TAU); x.stroke(); gloss(x, bx - r * 0.3, by - r * 0.3, r * 0.5, r * 0.3, 0, 0.7); } x.restore();
      for (let k = 0; k < 5; k++) { const dx = fx + 60 + k * 50, dy = fy + 120 - k * 14; x.fillStyle = 'rgba(200,150,70,0.75)'; x.beginPath(); x.moveTo(dx - 4, dy); x.quadraticCurveTo(dx, dy + 30 + k * 6, dx + 4, dy); x.fill(); x.beginPath(); x.arc(dx, dy + 30 + k * 6, 5, 0, TAU); x.fill(); gloss(x, dx - 1.5, dy + 28 + k * 6, 2, 1.5, 0, 0.8); } },
    hoop: (x, fx, fy, rx, ry) => { x.strokeStyle = '#d8ccae'; x.lineWidth = 15; x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(120,100,70,0.6)'; x.lineWidth = 2; for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; x.beginPath(); x.moveTo(fx + Math.cos(a) * (rx - 6), fy + Math.sin(a) * (ry - 6)); x.lineTo(fx + Math.cos(a) * (rx + 6), fy + Math.sin(a) * (ry + 6)); x.stroke(); } },
    pole: (x, fy, x1) => bonePole(x, fy, x1, ['#f2ead4', '#cfc2a0', '#6e6448'], '#6a4a20') }); return '#e8c070'; },
  // black mesh that drinks the light: a net you can barely see, its hoop and pole matte black, only a thin cold edge of
  // light along them, the bag a deeper dark than its own shadow
  stillwater(x, W, H, t) { legNet(x, t, { seed: 89,
    bag: (x, fx, fy, rx, ry) => { const bag = meshBag(x, fx, fy, rx, ry, 'rgba(4,4,6,0.96)', 'rgba(40,40,52,0.55)'); x.save(); bag(); x.strokeStyle = 'rgba(150,150,190,0.25)'; x.lineWidth = 1.5; x.stroke(); x.restore(); },
    hoop: (x, fx, fy, rx, ry) => { x.strokeStyle = '#050507'; x.lineWidth = 14; x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(160,160,210,0.35)'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(fx - 4, fy - 4, rx + 4, ry + 4, 0, Math.PI * 0.95, Math.PI * 1.8); x.stroke(); },
    pole: (x, fy, x1) => { x.fillStyle = '#060608'; x.beginPath(); x.roundRect(70, fy - 12, x1 - 70, 24, 12); x.fill(); x.strokeStyle = 'rgba(160,160,210,0.3)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(84, fy - 11); x.lineTo(x1 - 6, fy - 11); x.stroke(); } }); return '#8a8ab8'; },
  // left in the cave for someone: a hoop of black bone cut with marks, a mesh of dark strands like hair, small shells and
  // a tooth tied into it as offerings; a dull red ember of light deep in the bag
  oldnet(x, W, H, t) { legNet(x, t, { seed: 97,
    bag: (x, fx, fy, rx, ry) => { const bag = meshBag(x, fx, fy, rx, ry, 'rgba(18,10,10,0.9)', 'rgba(70,46,40,0.6)', 310); x.save(); bag(); x.clip(); halo(x, fx + 170, fy + 30, 120, '#a02818', 0.35 + 0.1 * Math.sin(t)); x.restore();
      for (const [ox, oy, k] of [[fx + 120, fy - 70, 0], [fx + 200, fy + 10, 1], [fx + 90, fy + 80, 2]]) { x.strokeStyle = '#3a2a20'; x.lineWidth = 2; x.beginPath(); x.moveTo(ox, oy - 20); x.lineTo(ox, oy); x.stroke();
        if (k === 1) { x.fillStyle = '#e8e0cc'; x.beginPath(); x.moveTo(ox - 5, oy); x.lineTo(ox, oy + 26); x.lineTo(ox + 5, oy); x.closePath(); x.fill(); } else { x.fillStyle = lin(x, ox - 10, oy, ox + 10, oy + 14, [[0, '#e0d4b8'], [1, '#8a7a5a']]); x.beginPath(); x.ellipse(ox, oy + 8, 10, 8, 0, 0, TAU); x.fill(); x.strokeStyle = 'rgba(80,60,40,0.6)'; x.lineWidth = 1; for (let j = -2; j <= 2; j++) { x.beginPath(); x.moveTo(ox, oy + 1); x.lineTo(ox + j * 4, oy + 15); x.stroke(); } } } },
    hoop: (x, fx, fy, rx, ry) => { x.strokeStyle = '#1a1412'; x.lineWidth = 16; x.beginPath(); x.ellipse(fx, fy, rx, ry, 0, 0, TAU); x.stroke(); x.strokeStyle = 'rgba(200,170,140,0.35)'; x.lineWidth = 2; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, px = fx + Math.cos(a) * rx, py = fy + Math.sin(a) * ry; x.beginPath(); x.moveTo(px - 5, py - 4); x.lineTo(px + 5, py + 4); x.moveTo(px + 5, py - 4); x.lineTo(px - 5, py + 4); x.stroke(); } },
    pole: (x, fy, x1) => bonePole(x, fy, x1, ['#3a302a', '#241c18', '#0c0a08'], '#4a2a20') }); return '#c04a30'; },
  // air held in two cylinders of a whale's own bone: porous, ivory, bound with old rope, a stopper of baleen and brass
  whalefall(x, W, H, t) { lsd = 101; for (const [cy, dx] of [[150, 30], [262, 0]]) { const X = 150 + dx, L = 640, R = 56;
      const cyl = () => { x.beginPath(); x.roundRect(X, cy - R, L, R * 2, R); }; x.fillStyle = lin(x, 0, cy - R, 0, cy + R, [[0, '#f6eedc'], [0.35, '#e0d4b4'], [0.8, '#9a8c68'], [1, '#5a5038']]); cyl(); x.fill();
      mottle(x, cyl, ['rgba(120,100,70,0.3)', 'rgba(255,252,240,0.25)', 'rgba(80,64,40,0.25)'], 520, 1, 4); shade(x, cyl, cy - R, cy + R, 0.4, 0.5);
      for (const rx2 of [X + 150, X + 420]) { x.fillStyle = lin(x, 0, cy - R, 0, cy + R, [[0, '#a08a60'], [1, '#4a3c24']]); x.fillRect(rx2, cy - R - 2, 34, R * 2 + 4); for (let k = 0; k < 6; k++) { x.strokeStyle = 'rgba(30,22,12,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(rx2, cy - R + k * 20); x.lineTo(rx2 + 34, cy - R + 10 + k * 20); x.stroke(); } }
      x.fillStyle = lin(x, 0, cy - 26, 0, cy + 26, [[0, '#d8b878'], [1, '#6a4e22']]); x.beginPath(); x.roundRect(X + L - 4, cy - 26, 44, 52, 8); x.fill(); x.fillStyle = '#1e1a14'; x.beginPath(); x.roundRect(X + L + 36, cy - 16, 22, 32, 4); x.fill(); } return '#e8dcc0'; },
  // warm as a black smoker: a vessel of dark vent rock, rough, its cracks glowing ember-orange; a faint heat haze over it
  ventheart(x, W, H, t) { lsd = 103; const cx = 470, cy = 214;
    // a lump of chimney rock: knobbled outline, a spout broken off at the top, ember light living in its cracks
    const pts = []; for (let k = 0; k < 40; k++) { const a = k / 40 * TAU, r = 1 + 0.08 * Math.sin(a * 5 + 1) + 0.05 * Math.sin(a * 11) + (lr() - 0.5) * 0.06; pts.push([cx + Math.cos(a) * 250 * r, cy + Math.sin(a) * 130 * r]); }
    const rock = () => { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); };
    halo(x, cx, cy, 340, '#d0601a', 0.22 + 0.06 * Math.sin(t * 1.3));
    x.fillStyle = lin(x, cx - 60, cy - 120, cx + 30, cy - 160, [[0, '#3a3028'], [1, '#14100c']]); x.beginPath(); x.moveTo(cx - 70, cy - 110); x.lineTo(cx - 50, cy - 186); x.lineTo(cx + 30, cy - 192); x.lineTo(cx + 44, cy - 112); x.closePath(); x.fill(); // the broken spout
    x.fillStyle = '#ffb060'; x.beginPath(); x.ellipse(cx - 10, cy - 188, 36, 8, 0, 0, TAU); x.fill(); halo(x, cx - 10, cy - 190, 60, '#ff9040', 0.6);
    x.fillStyle = lin(x, 0, cy - 150, 0, cy + 150, [[0, '#4a4038'], [0.5, '#221a16'], [1, '#0a0806']]); rock(); x.fill();
    mottle(x, rock, ['rgba(130,110,96,0.22)', 'rgba(0,0,0,0.4)', 'rgba(80,64,52,0.3)'], 900, 2, 11);
    x.save(); rock(); x.clip(); // the cracks: a few long branching seams, each a soft orange glow and a hot thin core
    for (let k = 0; k < 6; k++) { let px = cx - 200 + k * 80, py = cy - 120 + lr() * 40; const path = [[px, py]]; for (let j = 0; j < 8; j++) { px += (lr() - 0.5) * 40; py += 22 + lr() * 14; path.push([px, py]); }
      const go = () => { x.beginPath(); path.forEach(([a, b2], i) => (i ? x.lineTo(a, b2) : x.moveTo(a, b2))); };
      go(); x.strokeStyle = `rgba(255,120,40,${(0.45 + 0.2 * Math.sin(t * 1.4 + k)).toFixed(3)})`; x.lineWidth = 16; x.filter = 'blur(7px)'; x.stroke(); x.filter = 'none';
      go(); x.strokeStyle = 'rgba(255,170,80,0.9)'; x.lineWidth = 4; x.stroke(); go(); x.strokeStyle = '#ffe8b0'; x.lineWidth = 1.4; x.stroke(); }
    x.restore(); shade(x, rock, cy - 150, cy + 150, 0.3, 0.65);
    x.fillStyle = lin(x, 0, cy - 26, 0, cy + 26, [[0, '#e0c080'], [1, '#6a4e22']]); x.beginPath(); x.roundRect(cx + 238, cy - 26, 52, 52, 8); x.fill(); x.fillStyle = '#1e1a14'; x.beginPath(); x.roundRect(cx + 286, cy - 14, 18, 28, 4); x.fill(); return '#ff9040'; },
  // two living light-organs in place of strobes: a housing of dark shell, and on arms of bone, two pale glowing
  // crescents under dark lids, as the flashlight fish carries them under its eyes
  flashlightfish(x, W, H, t) { lsd = 107; const X0 = 360, Y0 = 186, BW = 270, BH = 160;
    for (const [ax, ay, ex, ey] of [[X0 + 10, Y0 + 40, X0 - 160, Y0 - 20], [X0 + BW - 10, Y0 + 40, X0 + BW + 160, Y0 - 20]]) {
      x.strokeStyle = lin(x, ax, ay, ex, ey, [[0, '#d8ccb0'], [1, '#7a6a4c']]); x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo((ax + ex) / 2, ay - 90, ex, ey); x.stroke();
      // the organ: a big pale bean of living light in a cup of dark tissue, a lid half over it
      halo(x, ex, ey, 150, '#eef4dc', 0.5 + 0.2 * Math.sin(t * 2.2));
      x.fillStyle = '#1e1814'; x.beginPath(); x.ellipse(ex, ey, 70, 44, 0, 0, TAU); x.fill();
      x.fillStyle = (() => { const g = x.createRadialGradient(ex - 10, ey - 6, 4, ex, ey, 58); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#eaf2d8'); g.addColorStop(1, '#a8b898'); return g; })(); x.beginPath(); x.ellipse(ex, ey + 4, 56, 32, 0, 0, TAU); x.fill();
      x.fillStyle = '#16120e'; x.beginPath(); x.ellipse(ex, ey - 14, 62, 26, 0, Math.PI, TAU); x.fill(); x.strokeStyle = 'rgba(255,240,220,0.2)'; x.lineWidth = 2; x.beginPath(); x.ellipse(ex, ey - 14, 62, 26, 0, Math.PI * 1.1, Math.PI * 1.6); x.stroke(); }
    const body = () => { x.beginPath(); x.roundRect(X0, Y0, BW, BH, 40); }; x.fillStyle = lin(x, 0, Y0, 0, Y0 + BH, [[0, '#3a3430'], [1, '#0c0a08']]); body(); x.fill(); mottle(x, body, ['rgba(180,160,140,0.12)', 'rgba(0,0,0,0.3)'], 300, 2, 8);
    x.save(); body(); x.clip(); for (let k = 0; k < 6; k++) { x.strokeStyle = 'rgba(200,180,150,0.12)'; x.lineWidth = 3; x.beginPath(); x.arc(X0 + BW / 2, Y0 + BH + 40, 80 + k * 30, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); } x.restore(); shade(x, body, Y0, Y0 + BH, 0.35, 0.6);
    const pcx = X0 + BW / 2, pcy = Y0 + BH / 2; x.fillStyle = lin(x, pcx - 60, pcy - 60, pcx + 60, pcy + 60, [[0, '#e0d4b8'], [1, '#5a4e38']]); x.beginPath(); x.arc(pcx, pcy, 60, 0, TAU); x.fill(); x.fillStyle = lin(x, pcx - 50, pcy - 50, pcx + 50, pcy + 50, [[0, '#24302c'], [1, '#040606']]); x.beginPath(); x.arc(pcx, pcy, 46, 0, TAU); x.fill(); gloss(x, pcx - 16, pcy - 20, 16, 8, -0.6, 0.6);
    return '#eef4dc'; },
  // fins cut from an oarfish's crest: long, a deep muted crimson, the membrane thin between its rays, rippling
  oarcrest(x, W, H, t) { finPair(x, (x, L, r0, r1) => {
      // a long blade of crest membrane, a deep muted crimson going clear at its edge; its rays run out past the edge
      // as fine filaments, and the whole thing ripples
      const edge = (u, sg) => sg * (r0 + (r1 - r0) * Math.min(1, u * 1.4)) * (1 - Math.max(0, u - 0.85) * 2) + Math.sin(u * 10 + t * 2 + (sg > 0 ? 1 : 0)) * 7;
      const fin = () => { x.beginPath(); x.moveTo(100, -r0); for (let k = 0; k <= 24; k++) { const u = k / 24; x.lineTo(100 + u * L, edge(u, -1)); } for (let k = 24; k >= 0; k--) { const u = k / 24; x.lineTo(100 + u * L, edge(u, 1)); } x.closePath(); };
      x.fillStyle = lin(x, 100, 0, 100 + L, 0, [[0, 'rgba(120,30,30,0.95)'], [0.7, 'rgba(160,50,46,0.8)'], [1, 'rgba(200,90,80,0.45)']]); fin(); x.fill();
      x.save(); fin(); x.clip(); x.fillStyle = lin(x, 0, -r1, 0, r1, [[0, 'rgba(255,220,200,0.25)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.35)']]); x.fillRect(100, -r1 - 20, L + 40, r1 * 2 + 40); x.restore();
      for (let k = 0; k < 26; k++) { const u = 0.05 + k / 27, px = 100 + u * L, ey = edge(u, -1); x.strokeStyle = 'rgba(255,190,170,0.55)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px - 30, -ey * -0.1); x.lineTo(px, ey); x.lineTo(px + 6, ey - 22 - (k % 3) * 8); x.stroke(); halo(x, px + 6, ey - 22 - (k % 3) * 8, 4, '#ffb0a0', 0.8); } // rays and their filaments
      x.save(); fin(); x.strokeStyle = 'rgba(255,200,180,0.35)'; x.lineWidth = 1.5; x.stroke(); x.restore(); }, { pocket: '#3a1a18', r1: 90 }); return '#e07060'; },
  // the flipper-bones of something never named: long phalanges in a fan, joined with silver wire, a thin skin between
  pinions(x, W, H, t) { finPair(x, (x, L, r0, r1) => { x.fillStyle = 'rgba(120,110,90,0.35)'; x.beginPath(); x.moveTo(100, -r0); x.lineTo(100 + L, -r1); x.quadraticCurveTo(100 + L + 40, 0, 100 + L, r1); x.lineTo(100, r0); x.closePath(); x.fill();
      for (let k = 0; k < 5; k++) { const ey = -r1 + k * r1 / 2, sy = -r0 * 0.7 + k * r0 * 0.35; let px = 100; for (let j = 0; j < 4; j++) { const nx = 100 + L * (j + 1) / 4, ny = sy + (ey - sy) * (j + 1) / 4, py = sy + (ey - sy) * j / 4; x.strokeStyle = lin(x, px, py - 6, px, py + 6, [[0, '#f4ead2'], [1, '#7a6e50']]); x.lineWidth = 12 - j * 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(px + 6, py); x.lineTo(nx - 6, ny); x.stroke(); x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(nx, ny, 7 - j, 0, TAU); x.fill(); px = nx; } }
      x.strokeStyle = 'rgba(220,226,230,0.85)'; x.lineWidth = 1.5; for (let j = 1; j < 4; j++) { x.beginPath(); x.moveTo(100 + L * j / 4, -r1 * j / 4 - r0 * 0.7); x.lineTo(100 + L * j / 4, r1 * j / 4 + r0 * 0.7); x.stroke(); } }, { pocket: '#4a4234' }); return '#e8e0d0'; },
  // clear as glass, cut from a deep squid's fins: nearly invisible, only their edges and a faint sheen of colour show
  glasswing(x, W, H, t) { finPair(x, (x, L, r0, r1) => { const fin = () => { x.beginPath(); x.moveTo(100, -r0); x.bezierCurveTo(100 + L * 0.5, -r1, 100 + L, -r1, 100 + L + 20, 0); x.bezierCurveTo(100 + L, r1, 100 + L * 0.5, r1, 100, r0); x.closePath(); };
      x.fillStyle = 'rgba(220,235,240,0.18)'; fin(); x.fill(); x.save(); fin(); x.clip(); const g = lin(x, 100, -r1, 100 + L, r1, [[0, 'rgba(200,170,220,0.12)'], [0.5, 'rgba(170,220,200,0.12)'], [1, 'rgba(230,210,170,0.12)']]); x.fillStyle = g; x.fillRect(100, -r1, L + 40, r1 * 2); x.restore();
      x.save(); fin(); x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 2; x.stroke(); x.restore(); gloss(x, 100 + L * 0.4, -r1 * 0.5, L * 0.25, 8, -0.05, 0.5); }, { pocket: '#9aa4a8' }); return '#e0ecf0'; },
  // a seahorse father's pouch the size of a sack: ridged bony rings round it, a pale soft belly, a slit to fill it
  broodpouch(x, W, H, t) { lsd = 109; const cx = 450, cy = 220;
    // a seahorse's brood pouch, sack-sized: a body of bony rings, each ring a row of knobbed plates, a soft pale belly
    // where it swells, a slit to fill it; its tail curls round into a handle
    const pouch = () => { x.beginPath(); x.moveTo(cx - 220, cy - 60); x.bezierCurveTo(cx - 180, cy - 150, cx + 120, cy - 150, cx + 210, cy - 70); x.bezierCurveTo(cx + 270, cy - 10, cx + 220, cy + 120, cx + 30, cy + 130); x.bezierCurveTo(cx - 170, cy + 140, cx - 250, cy + 40, cx - 220, cy - 60); x.closePath(); };
    x.lineCap = 'round'; x.strokeStyle = lin(x, cx + 180, cy - 140, cx + 330, cy + 40, [[0, '#9a7a48'], [1, '#4a3418']]); x.lineWidth = 26; x.beginPath(); x.moveTo(cx + 200, cy - 80); x.bezierCurveTo(cx + 310, cy - 150, cx + 380, cy - 20, cx + 320, cy + 30); x.bezierCurveTo(cx + 280, cy + 60, cx + 250, cy + 10, cx + 290, cy - 10); x.stroke(); // the curled tail
    for (let k = 0; k < 14; k++) { const u = k / 14, px = cx + 200 + u * 130 - Math.sin(u * 4) * 10, py = cy - 80 - Math.sin(u * Math.PI) * 60 + u * 80; x.fillStyle = 'rgba(40,28,12,0.5)'; x.beginPath(); x.arc(px, py, 3, 0, TAU); x.fill(); }
    x.fillStyle = lin(x, 0, cy - 150, 0, cy + 140, [[0, '#7a6038'], [0.45, '#b49460'], [0.75, '#e0caa0'], [1, '#f0e2c4']]); pouch(); x.fill(); mottle(x, pouch, ['rgba(80,60,30,0.2)', 'rgba(255,240,210,0.18)'], 400, 2, 6);
    x.save(); pouch(); x.clip(); for (let k = 0; k < 10; k++) { const rx2 = cx - 200 + k * 44; x.strokeStyle = 'rgba(60,44,20,0.55)'; x.lineWidth = 5; x.beginPath(); x.ellipse(rx2, cy, 20, 160, 0.12, -1.25, 0.6); x.stroke(); // the rings
      for (let j = 0; j < 5; j++) { const a = -1.15 + j * 0.3, kx = rx2 + Math.cos(a) * 20, ky = cy + Math.sin(a) * 160; x.fillStyle = lin(x, kx - 6, ky - 6, kx + 6, ky + 6, [[0, '#e8d4a8'], [1, '#5a4422']]); x.beginPath(); x.arc(kx, ky, 6, 0, TAU); x.fill(); } } // knobs on the plates
    x.restore(); shade(x, pouch, cy - 150, cy + 140, 0.35, 0.5);
    x.fillStyle = '#2a1a10'; x.beginPath(); x.ellipse(cx + 20, cy - 116, 110, 9, -0.06, 0, TAU); x.fill(); x.strokeStyle = 'rgba(255,240,210,0.3)'; x.lineWidth = 2; x.beginPath(); x.ellipse(cx + 20, cy - 119, 110, 9, -0.06, Math.PI, TAU); x.stroke();
    gloss(x, cx - 40, cy + 70, 110, 22, -0.05, 0.3); return '#e8c890'; },
  // what it came out of is better not asked: a fleshy grey-red stomach, folded, wet, its mouth sewn with sinew
  stomach(x, W, H, t) { lsd = 113; const cx = 480, cy = 214;
    // a stomach, wet and grey-red, its muscle wall in deep folds, its mouth gathered and sewn shut with pale sinew, a
    // bone toggle on the cord
    const sack = () => { x.beginPath(); x.moveTo(cx - 200, cy - 50); x.bezierCurveTo(cx - 170, cy - 160, cx + 80, cy - 170, cx + 180, cy - 90); x.bezierCurveTo(cx + 300, cy - 20, cx + 270, cy + 120, cx + 80, cy + 140); x.bezierCurveTo(cx - 120, cy + 160, cx - 210, cy + 80, cx - 200, cy - 50); x.closePath(); };
    x.fillStyle = lin(x, 0, cy - 160, 0, cy + 150, [[0, '#8a5654'], [0.45, '#5a3032'], [1, '#22100e']]); sack(); x.fill(); mottle(x, sack, ['rgba(190,120,120,0.18)', 'rgba(0,0,0,0.3)', 'rgba(120,60,60,0.22)'], 600, 2, 9);
    x.save(); sack(); x.clip(); for (let k = 0; k < 9; k++) { const y0 = cy - 130 + k * 32; x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 12; x.filter = 'blur(5px)'; x.beginPath(); x.moveTo(cx - 200, y0); x.bezierCurveTo(cx - 60, y0 - 30 + (k % 2) * 30, cx + 100, y0 + 20, cx + 280, y0 - 10); x.stroke(); x.filter = 'none';
      x.strokeStyle = 'rgba(240,180,180,0.22)'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 200, y0 - 8); x.bezierCurveTo(cx - 60, y0 - 38 + (k % 2) * 30, cx + 100, y0 + 12, cx + 280, y0 - 18); x.stroke(); } x.restore(); // the folds
    shade(x, sack, cy - 160, cy + 150, 0.4, 0.6); gloss(x, cx - 40, cy - 100, 100, 16, -0.2, 0.55); gloss(x, cx + 150, cy - 30, 30, 8, -0.3, 0.45);
    // the gathered mouth at the left, sewn
    x.fillStyle = lin(x, cx - 260, cy - 60, cx - 190, cy + 60, [[0, '#6a3a3a'], [1, '#2a1212']]); x.beginPath(); x.moveTo(cx - 196, cy - 60); x.quadraticCurveTo(cx - 270, cy - 30, cx - 280, cy); x.quadraticCurveTo(cx - 270, cy + 30, cx - 196, cy + 70); x.closePath(); x.fill();
    for (let k = 0; k < 6; k++) { x.strokeStyle = 'rgba(0,0,0,0.45)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 200, cy - 50 + k * 22); x.lineTo(cx - 270, cy - 6 + k * 3); x.stroke(); }
    x.strokeStyle = '#d8ccb0'; x.lineWidth = 2.5; for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(cx - 212, cy - 48 + k * 18); x.lineTo(cx - 236, cy - 40 + k * 18); x.stroke(); }
    x.strokeStyle = '#c8b890'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx - 280, cy); x.bezierCurveTo(cx - 320, cy + 20, cx - 330, cy + 70, cx - 300, cy + 100); x.stroke();
    x.fillStyle = lin(x, cx - 320, cy + 92, cx - 280, cy + 112, [[0, '#f0e6cc'], [1, '#7a6e50']]); x.beginPath(); x.roundRect(cx - 322, cy + 96, 44, 16, 6); x.fill(); return '#c08080'; },
  // (5.16.5) dark, supple and very old: a soft pouch of eel skin with a fold-over flap. The hide is mottled olive-black with
  // the eel's pale lateral line running its length, sewn with bone thread, shut by a cord round a carved bone toggle
  eelpurse(x, W, H, t) { lsd = 127; const cx = 470, cy = 220;
    const body = () => { x.beginPath(); x.moveTo(cx - 250, cy - 78); x.bezierCurveTo(cx - 120, cy - 92, cx + 120, cy - 92, cx + 250, cy - 78);
      x.bezierCurveTo(cx + 282, cy - 20, cx + 270, cy + 60, cx + 220, cy + 92); x.bezierCurveTo(cx + 100, cy + 118, cx - 100, cy + 118, cx - 220, cy + 92);
      x.bezierCurveTo(cx - 270, cy + 60, cx - 282, cy - 20, cx - 250, cy - 78); x.closePath(); };
    const flap = () => { x.beginPath(); x.moveTo(cx - 262, cy - 80); x.bezierCurveTo(cx - 120, cy - 100, cx + 120, cy - 100, cx + 262, cy - 80);
      x.bezierCurveTo(cx + 250, cy - 36, cx + 120, cy - 4, cx + 22, cy + 18); x.quadraticCurveTo(cx, cy + 26, cx - 22, cy + 18);
      x.bezierCurveTo(cx - 120, cy - 4, cx - 250, cy - 36, cx - 262, cy - 80); x.closePath(); };
    const hide = (path, top, bot, c0, c1, c2) => { x.fillStyle = lin(x, 0, top, 0, bot, [[0, c0], [0.55, c1], [1, c2]]); path(); x.fill();
      x.save(); path(); x.clip(); // the mottling: soft dark blotches and a few paler flecks, as eel skin has
      for (let i = 0; i < 160; i++) { const px = cx - 290 + lr() * 580, py = top + lr() * (bot - top), r = 4 + lr() * 14; x.fillStyle = `rgba(8,7,4,${(0.06 + lr() * 0.12).toFixed(2)})`; x.beginPath(); x.ellipse(px, py, r * 1.6, r, 0.1, 0, TAU); x.fill(); }
      for (let i = 0; i < 70; i++) { const px = cx - 290 + lr() * 580, py = top + lr() * (bot - top); x.fillStyle = `rgba(170,168,120,${(0.06 + lr() * 0.08).toFixed(2)})`; x.beginPath(); x.ellipse(px, py, 2 + lr() * 4, 1.4 + lr() * 2, 0, 0, TAU); x.fill(); }
      x.restore(); };
    hide(body, cy - 92, cy + 118, '#4a4a34', '#2a281c', '#100e08');
    x.save(); body(); x.clip(); // the lateral line, wavering along the hide, and the pouch's soft creases
    x.strokeStyle = 'rgba(170,168,124,0.16)'; x.lineWidth = 7; x.filter = 'blur(2px)'; x.beginPath(); x.moveTo(cx - 280, cy + 52); x.bezierCurveTo(cx - 120, cy + 40, cx + 60, cy + 64, cx + 280, cy + 46); x.stroke(); x.filter = 'none';
    x.fillStyle = 'rgba(14,12,8,0.55)'; for (let k = 1; k < 26; k++) { const u = k / 26, v = 1 - u, bz = (p0, p1, p2, p3) => v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3; x.beginPath(); x.arc(bz(cx - 280, cx - 120, cx + 60, cx + 280), bz(cy + 52, cy + 40, cy + 64, cy + 46), 1.6, 0, TAU); x.fill(); } // its pores
    for (const [x0, x1] of [[-170, -150], [130, 160], [-40, -30]]) { x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx + x0, cy + 104); x.quadraticCurveTo(cx + (x0 + x1) / 2 + 8, cy + 70, cx + x1, cy + 30); x.stroke(); }
    x.restore();
    shade(x, body, cy - 92, cy + 118, 0.3, 0.6);
    x.strokeStyle = 'rgba(214,204,170,0.55)'; x.lineWidth = 2; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(cx - 232, cy - 40); x.bezierCurveTo(cx - 256, cy + 20, cx - 250, cy + 64, cx - 210, cy + 82); x.bezierCurveTo(cx - 100, cy + 104, cx + 100, cy + 104, cx + 210, cy + 82); x.bezierCurveTo(cx + 250, cy + 64, cx + 256, cy + 20, cx + 232, cy - 40); x.stroke(); x.setLineDash([]); // bone thread
    // the flap's shadow on the body, then the flap
    x.save(); body(); x.clip(); x.fillStyle = 'rgba(0,0,0,0.45)'; x.filter = 'blur(6px)'; x.translate(0, 10); flap(); x.fill(); x.filter = 'none'; x.restore();
    hide(flap, cy - 100, cy + 26, '#56543c', '#34321f', '#1a180e');
    shade(x, flap, cy - 100, cy + 26, 0.35, 0.4, 12); gloss(x, cx - 90, cy - 70, 170, 12, -0.04, 0.32);
    x.strokeStyle = 'rgba(214,204,170,0.55)'; x.lineWidth = 2; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(cx - 240, cy - 66); x.bezierCurveTo(cx - 220, cy - 34, cx - 110, cy - 10, cx - 24, cy + 8); x.moveTo(cx + 240, cy - 66); x.bezierCurveTo(cx + 220, cy - 34, cx + 110, cy - 10, cx + 24, cy + 8); x.stroke(); x.setLineDash([]);
    // the cord: from the flap's point, twisted, round the toggle
    x.strokeStyle = '#2a2216'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx, cy + 22); x.bezierCurveTo(cx - 6, cy + 40, cx + 8, cy + 50, cx, cy + 62); x.stroke();
    x.strokeStyle = 'rgba(160,140,100,0.5)'; x.lineWidth = 1.5; for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(cx - 3, cy + 26 + k * 8); x.lineTo(cx + 3, cy + 31 + k * 8); x.stroke(); }
    // the toggle: a short peg of carved bone, crosswise, worn yellow at the ends
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.beginPath(); x.ellipse(cx + 4, cy + 72, 46, 8, 0, 0, TAU); x.fill();
    x.fillStyle = lin(x, 0, cy + 56, 0, cy + 74, [[0, '#ece2c4'], [0.5, '#c8b890'], [1, '#6a5c40']]); x.beginPath(); x.moveTo(cx - 40, cy + 60); x.quadraticCurveTo(cx, cy + 54, cx + 40, cy + 60); x.lineTo(cx + 44, cy + 66); x.quadraticCurveTo(cx, cy + 76, cx - 44, cy + 66); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(90,74,50,0.6)'; x.lineWidth = 1.5; for (const d of [-24, -12, 12, 24]) { x.beginPath(); x.moveTo(cx + d, cy + 58); x.lineTo(cx + d + 2, cy + 70); x.stroke(); }
    return '#b4bc8c'; },
});
function drawLegend(ctx, w, h, def) {
  const f = LEGEND_ART[def.id]; if (!f) return false;
  fitted(ctx, w, h, (x, W, H) => { const glow = f(x, W, H, 0); sparks(x, W, H, glow, 23 + (hash(def.id) % 97)); });
  return true;
}
