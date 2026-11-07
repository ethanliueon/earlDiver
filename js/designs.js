// Item designs (3.0.0). Commons and Uncommons keep the standard look of their kind. Every Rare wears one of a
// set of hand-picked finishes (enamel paint and anodising, the colours real dive gear comes in) with a small
// mark of its own; every piece of a set shares its set's finish; and every Exotic is designed one by one from
// its story: the materials (hemp, cane, brass, copper, teak, painted steel), its colours and its details.
// Legendaries have their own looks in item_data.js (LOOKS). Muted throughout: nothing glows unless it is
// bioluminescent.
//
// designFor(def) returns what to lay over an item's looks: look (nets and side tools), finLook, tankLook,
// bagLook, pal (suits).

// ---------- the Rare finishes: [name, body, dark, accent] ----------
export const FINISHES = [
  ['gunmetal and signal red', '#3a3f44', '#23272a', '#a8402e'],
  ['olive drab and brass', '#4a5236', '#2e331f', '#b8913e'],
  ['navy and safety orange', '#26364a', '#151e2a', '#c8642a'],
  ['slate and mustard', '#4a5258', '#2c3236', '#c8a030'],
  ['oxblood and steel', '#5a2a28', '#341716', '#9aa2a6'],
  ['teal enamel and cream', '#2e5a58', '#1a3634', '#e0d6b8'],
  ['sand and black', '#a08a62', '#5a4c34', '#1c1c1a'],
  ['graphite and moss', '#34383a', '#1e2022', '#7a9a4a'],
  ['rust and bone', '#7a4a2a', '#4a2a16', '#e0d6c0'],
  ['sea green and white', '#3a6a5a', '#22423a', '#eef0ea'],
  ['charcoal and copper', '#2c2c2a', '#161614', '#b06a3a'],
  ['faded blue and grey', '#4a6a86', '#2c4256', '#c0c6ca'],
  ['khaki and oxide red', '#7a7450', '#4a462e', '#9a3a26'],
  ['plum and silver', '#4a3446', '#2a1c28', '#b8bcc0'],
  ['forest and tan', '#2e4a32', '#1a2c1c', '#c0a070'],
  ['steel blue and yellow', '#3a5470', '#22344a', '#d8b42a'],
];
const MARKS = ['stripe', 'band', 'twin', 'none'];
// a set's pieces all wear the same finish
const SET_FINISH = {
  harbour: ['navy and safety orange', '#26364a', '#151e2a', '#c8642a'], kelp: ['forest and tan', '#2e4a32', '#1a2c1c', '#c0a070'],
  reef: ['teal enamel and cream', '#2e5a58', '#1a3634', '#e0d6b8'], night: ['charcoal and copper', '#2c2c2a', '#161614', '#b06a3a'],
  bathysphere: ['brass and black', '#8a6a2a', '#3a2a10', '#1c1c1a'], challenger: ['oak and brass', '#6a4a2a', '#3a2614', '#c8a050'],
  sealab: ['safety orange and black', '#b8642a', '#5a2c10', '#1e1e1c'], trieste: ['naval grey and white', '#5a6670', '#2e363c', '#e8e8e0'],
};

const hashOf = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const hex = (h) => { const x = h.replace('#', ''); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const light = (c, k = 0.35) => mix(c, '#ffffff', k), dark = (c, k = 0.45) => mix(c, '#000000', k);
const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

// ---------- materials for the Exotics ----------
const HOOP = { brass: '#a8873e', bronze: '#8a5a2a', iron: '#3a3a36', cane: '#b89a5a', copper: '#a0603a', steel: '#7a8288', galv: '#9aa0a0' };
const HANDLE = { ash: ['#c8a878', '#9a7a4e', '#5a4428'], teak: ['#8a5a36', '#6a4226', '#3a2414'], bamboo: ['#d0b878', '#a88e50', '#6a5630'],
  pipe: ['#6a6a62', '#4a4a44', '#262624'], brass: ['#d8b868', '#a8873e', '#5a4418'], navy: ['#4a5a6a', '#2a3a4a', '#141e28'] };
const MESH = { hemp: ['rgba(185,160,110,0.85)', 'rgba(160,135,90,0.14)', 2.2], cotton: ['rgba(222,212,184,0.8)', 'rgba(200,190,160,0.12)', 1.5],
  nylon: ['rgba(120,140,120,0.85)', 'rgba(90,110,90,0.14)', 2], wire: ['rgba(150,155,150,0.9)', 'rgba(120,125,120,0.1)', 2.4], green: ['rgba(70,100,70,0.9)', 'rgba(50,80,50,0.2)', 2.8] };
const net = (hoop, handle, mesh, shape, more = {}) => ({ net: { hoop: HOOP[hoop], h: HANDLE[handle], grip: HANDLE[handle][2], mesh: MESH[mesh][0], tint: MESH[mesh][1], step: MESH[mesh][2], shape, ...more } });
const fin = (c, label, fx = 'vintage') => ({ fin: { c, fx, label } });
const tank = (body, band, n = 1, more = {}) => ({ tank: { fx: 'paint', body, band, n, ...more } });
const P = { navyGrey: ['#8a9096', '#5a6066', '#2a2e32'], orange: ['#e0904a', '#b8642a', '#5a2c10'], galv: ['#c8ccc8', '#8a908c', '#3e4240'], yellow: ['#e8c860', '#c8a030', '#5a4410'],
  olive: ['#7a8a5a', '#4a5a36', '#1e2614'], green: ['#4a5a4a', '#2a362a', '#101610'], white: ['#e8e8e0', '#b8b8b0', '#5a5a54'], blueGrey: ['#8aa0b0', '#5a7080', '#22303a'],
  red: ['#b85a4a', '#8a3a2a', '#3a1610'], black: ['#4a4a46', '#2a2a28', '#0e0e0c'], grey: ['#6a7076', '#40464a', '#16181a'], copper: ['#d89a6a', '#a8643a', '#4a2410'], brass: ['#e0c070', '#a08040', '#3a2c10'] };
const bag = (fx, body, accent, more = {}) => ({ bag: { fx, body, accent, ...more } });
const side = (base, body, body2, accent, more = {}) => ({ side: { base, body, body2, accent, ...more } });

// ---------- every Exotic, by name ----------
export const EXOTIC_DESIGNS = {
  // nets
  'Challenger dredge bag': net('iron', 'teak', 'hemp', 'square', { len: 38, r: 10.5, bag: 22 }),
  'Bathysphere sampling net, 1934': net('brass', 'ash', 'cotton', 'teardrop'),
  'Trieste collecting scoop, 1960': net('steel', 'navy', 'nylon', 'square'),
  'Sealab hand seine': net('galv', 'navy', 'nylon', 'seine'),
  'Albatross plankton net': net('brass', 'teak', 'cotton', 'teardrop', { step: 1.1, bag: 24 }),
  'Galathea trawl purse': net('iron', 'teak', 'hemp', 'wide'),
  'Meteor survey hoop net': net('brass', 'ash', 'hemp', null),
  'Discovery ring net': net('bronze', 'ash', 'cotton', 'teardrop'),
  'Valdivia deep-sea net, 1898': net('bronze', 'teak', 'hemp', null, { bag: 22 }),
  'Siboga reef scoop': net('cane', 'bamboo', 'cotton', 'square'),
  'Vitiaz bottom net': net('steel', 'pipe', 'wire', 'square', { bag: 20 }),
  'Hirondelle fishing net': net('brass', 'bamboo', 'hemp', null, { len: 24, r: 7.5, bag: 12 }),
  'Carnegie survey net': net('copper', 'ash', 'hemp', null),
  'Dana eel net': net('galv', 'teak', 'nylon', 'wide', { bag: 24 }),
  'Atlantis line net': net('steel', 'navy', 'wire', null, { len: 24, r: 7.5, bag: 12 }),
  'Trawl-wing net': net('iron', 'pipe', 'green', 'wide', { len: 40, r: 11, bag: 24 }),
  // fins: [root, tip, edge], a stencilled mark
  'Frogman fins, 1944': fin(['#141414', '#2a2a26', 'rgba(90,90,80,0.7)'], 'USN'),
  'Ligurian prototype blades, 1938': fin(['#1a2418', '#34442c', 'rgba(120,140,90,0.6)'], 'Pro. 2'),
  'Sealab aquanaut fins': fin(['#2a2a2a', '#c86a2a', 'rgba(230,150,80,0.7)'], 'S-II'),
  'Conshelf habitat fins': fin(['#1c2a3a', '#3a5a7a', 'rgba(160,190,210,0.7)'], 'C-III'),
  'Tektite habitat fins': fin(['#2a2a24', '#6a6a4a', 'rgba(200,190,140,0.6)'], 'T-1'),
  'Arctic survey fins': fin(['#3a3e40', '#c8ccc8', 'rgba(240,240,236,0.8)'], 'ARC'),
  'Trieste crew fins': fin(['#1a2030', '#2e3a52', 'rgba(200,170,90,0.7)'], 'TR'),
  'Clearance diver fins': fin(['#141618', '#3a4440', 'rgba(110,120,110,0.7)'], 'CD'),
  'Bikini Atoll survey fins, 1946': fin(['#2a2418', '#a89060', 'rgba(220,200,150,0.7)'], '46'),
  'Hydrolab fins': fin(['#1e2a26', '#3a6a5a', 'rgba(170,210,190,0.6)'], 'HL'),
  'Pearl lugger paddles': fin(['#5a3a1e', '#9a7044', 'rgba(210,170,110,0.7)'], '', 'wood'),
  'Galathea deck fins': fin(['#3a1e14', '#7a3a24', 'rgba(200,120,90,0.6)'], 'G'),
  'La Jolla survey fins': fin(['#22303a', '#4a7a8a', 'rgba(200,220,220,0.6)'], 'SIO'),
  // air: a painted cylinder (body light-mid-dark), a band, how many, rivets, a stencil
  'Navy reserve cylinder': tank(P.navyGrey, '#c8a030', 1, { label: 'USN' }),
  'Sealab II mixed-gas pack': tank(P.orange, '#1c1c1a', 1, { label: 'S-II' }),
  'Bathysphere oxygen flask, 1934': tank(P.copper, '#5a3a1a', 2, { rivets: true }),
  'Aqualung prototype, 1943': tank(P.galv, '#3a3a36', 1, { label: 'CG45' }),
  'Conshelf twin set': tank(P.yellow, '#1c1c1a', 2),
  'Tektite rebreather': tank(P.olive, '#e8e8e0', 1, { label: 'T' }),
  'Naval oxygen rebreather, 1940': tank(P.green, '#b8913e', 1, { rivets: true }),
  'Hydrolab bottle': tank(P.white, '#2a5a8a', 2),
  'Trieste reserve sphere': tank(P.blueGrey, '#2e363c', 2, { rivets: true }),
  'Deep Quest gas bank': tank(P.red, '#e8e8e0', 2),
  'Argonaut diving bell tank': tank(P.brass, '#5a4418', 1, { rivets: true }),
  'Lake Zurich mixed-gas rig, 1962': tank(P.black, '#c8a030', 1, { label: 'HM' }),
  'Polar survey cylinders': tank(P.white, '#a83a2a', 2),
  'Navy prototype rebreather': tank(P.grey, '#a83a2a', 1),
  // bags: a style, its body and its trim
  'Challenger specimen satchel': bag('satchel', '#8a7a52', '#c8a050'),
  'Galathea sample jar case': bag('jarcase', '#5a3a22', '#c8a050'),
  'Dana larva pouch': bag('pouch', '#d8ccb0', '#7a6a4a'),
  'Kalymnos sponge sack': bag('sack', '#a08a5a', '#6a5030'),
  'Siboga reef basket': bag('basket', '#b8985a', '#6a5230'),
  'Sealab collection bag': bag('mesh', '#c8642a', '#e0c040'),
  'Bathysphere sample box': bag('box', '#a8873e', '#5a4418'),
  'Albatross core pouch': bag('pouch', '#5a6a4a', '#c8a050'),
  'Valdivia specimen crate': bag('crate', '#8a6a42', '#3a2a1a'),
  'Trieste tool roll': bag('roll', '#4a5a6a', '#8a6a3a'),
  'Meteor survey haversack': bag('satchel', '#7a7450', '#5a4428'),
  'Conshelf garden bag': bag('mesh', '#4a7a4a', '#d8d0b0'),
  'Hirondelle fishing creel': bag('creel', '#a88a52', '#5a4022'),
  'Vitiaz bottom pouch': bag('pouch', '#222420', '#8a8e88'),
  // suits: [suit, highlight, panel, seam, glove]
  'Standard diving dress': { suit: ['#7a6a4a', '#a8966a', '#5a4c32', '#b8913e', '#2a2418'] },
  'Sealab heated suit': { suit: ['#8a4a20', '#c8783a', '#6a3818', '#2a2a26', '#1a1410'] },
  'Conshelf aquanaut suit': { suit: ['#3a4a5a', '#6a8094', '#2a3644', '#c8cccc', '#141a20'] },
  'Tektite habitat suit': { suit: ['#2e3424', '#5a6444', '#3a4230', '#c8b070', '#141810'] },
  'Polar survey drysuit': { suit: ['#7a2a24', '#b84a3a', '#5a1e1a', '#e8e4dc', '#1e1010'] },
  'Trieste crew coveralls': { suit: ['#1e2638', '#3a4a6a', '#2a3450', '#c8a050', '#0e121c'] },
  'Kalymnos skafandro': { suit: ['#5a4630', '#8a6e4a', '#46361e', '#c8a050', '#241a10'] },
  'Hydrolab saturation suit': { suit: ['#2a2a24', '#c8a030', '#3e3a2a', '#1a1a16', '#141410'] },
  'Galathea expedition wetsuit': { suit: ['#28302c', '#4a5a52', '#323c36', '#a8b0a8', '#121614'] },
  'Bathythermal suit': { suit: ['#1e3a3a', '#3a6a68', '#264848', '#c8a050', '#0e1a1a'] },
  'Iron Lung hardsuit': { suit: ['#3a3a36', '#6a6a62', '#4a4a44', '#a07a3a', '#1a1a18'] },
  'Spearfisher\'s blades, 1933': fin(['#1a1a16', '#4a4a3a', 'rgba(170,160,120,0.6)'], 'Corlieu'),
  'Kalymnos sponge diver\'s blades': fin(['#2a3a3a', '#5a7a7a', 'rgba(210,225,220,0.6)'], 'K'),
  'Frogman\'s chest pack': tank(P.green, '#1c1c1a', 1, { label: 'O2' }),
  'Salvage diver\'s bailout': tank(P.yellow, '#a83a2a', 1, { label: 'BAIL' }),
  'Pearl lugger\'s net bag': bag('sack', '#8a7a52', '#5a4428'),
  'Bathysphere observer\'s woollens, 1934': { suit: ['#5a5446', '#8a8270', '#6a6252', '#a8873e', '#2a2620'] },
  'Frogman\'s drysuit, 1944': { suit: ['#1e221e', '#3a4038', '#2a2e28', '#6a6a5a', '#0e100e'] },
  'Clearance diver\'s suit': { suit: ['#14181c', '#2e3a44', '#1e262e', '#c8642a', '#0a0c0e'] },
  'Shark researcher\'s mesh': { suit: ['#4a4e4e', '#8a9090', '#6a7070', '#c8a030', '#2a2c2c'] },
  'Pearl lugger\'s canvas suit': { suit: ['#8a7a5a', '#b8a882', '#6a5c42', '#5a4428', '#3a3020'] },
  'Deep Quest pilot\'s suit': { suit: ['#2a3a5a', '#4a6a9a', '#34486a', '#e8e8e0', '#141c2a'] },
  // side tools: the drawing's base, then body, its dark, an accent
  'Siboga coral slurp': side(0, '#a8873e', '#5a4418', '#2a2016'),
  'Dana larva sipper': side(0, '#d8d6cc', '#8a8a82', '#3a6a8a'),
  'Conshelf collector': side(1, '#c8642a', '#5a2c10', '#1c1c1a'),
  'Sealab specimen pump': side(1, '#d8b42a', '#5a4410', '#1c1c1a'),
  'Albatross pipette': side(0, '#b8913e', '#4a3410', '#e8e0cc'),
  'Discovery whale mark gun': side(0, '#8a5a36', '#3a2414', '#c8a050'),
  'Satellite tag prototype, 1978': side(2, '#e8e8e0', '#8a8a82', '#c8642a'),
  'Tuna tagging pole, 1952': side(0, '#d0b878', '#6a5630', '#a83a2a'),
  'Navy acoustic tagger': side(1, '#6a7076', '#2a2e32', '#d8b42a'),
  'Shark survey lance, 1960': side(1, '#1c1c1a', '#0c0c0b', '#a83a2a'),
  'Biologging rig': side(2, '#e8e8e0', '#6a8a8a', '#2e5a58'),
  'Bathysphere window camera, 1934': side(1, '#a8873e', '#4a3410', '#1c1c1a'),
  'Trieste porthole camera, 1960': side(2, '#2e3a52', '#141e2a', '#e8e8e0'),
  'Sealab strobe rig': side(1, '#c8642a', '#5a2c10', '#1c1c1a'),
  'Galathea plate camera': side(1, '#6a4a2a', '#2a1a0c', '#c8a050'),
  'Abyssal strobe camera, 1954': side(2, '#1c1c1a', '#0c0c0b', '#b8913e'),
  'Lander optic': side(2, '#d8b42a', '#5a4410', '#1c1c1a'),
};

// ---------- a finish worn by a Rare (or a set piece) ----------
function fromFinish(def, F, mark) {
  const [, body, dk, acc] = F, base = typeof def.look === 'number' ? def.look : 0;
  switch (def.kind) {
    case 'net': return { look: { base, hoop: body, h: [light(body, 0.3), body, dk], grip: dk, collar: acc, mesh: rgba(mix(dk, '#9aa8a0', 0.25), 0.85), tint: rgba(body, 0.16) } }; // a mesh dyed to match
    case 'fins': return { finLook: { c: [dk, body, rgba(light(acc, 0.1), 0.75)], fx: 'stripe', stripe: mark === 'none' ? null : acc, twin: mark === 'twin' } };
    case 'tank': return { tankLook: { fx: 'paint', body: [light(body, 0.3), body, dark(body)], band: acc, n: def.arch === 'twin' || def.arch === 'side' ? 2 : 1, twin: mark === 'twin' } };
    case 'bag': return { bagLook: { fx: 'finish', body, accent: acc, mark } };
    case 'suit': return { pal: [dk, light(body, 0.15), body, acc, dark(dk, 0.4)] };
    default: return { look: { base, body, body2: dk, accent: acc, mark } };
  }
}
// ---------- what an item looks like, over its standard look ----------
export function designFor(def) {
  if (def.rarity === 'legendary') return null;
  if (def.set && SET_FINISH[def.set]) return fromFinish(def, SET_FINISH[def.set], 'stripe');
  if (def.rarity === 'exotic') {
    const D = EXOTIC_DESIGNS[def.name]; if (!D) return null;
    const base = typeof def.look === 'number' ? def.look : 0;
    if (D.net) return { look: { base, ...D.net } };
    if (D.fin) return { finLook: D.fin };
    if (D.tank) return { tankLook: { ...D.tank, n: D.tank.n } };
    if (D.bag) return { bagLook: D.bag };
    if (D.suit) return { pal: D.suit };
    if (D.side) return { look: { ...D.side } };
    return null;
  }
  if (def.rarity === 'rare') { const h = hashOf(def.id); return fromFinish(def, FINISHES[h % FINISHES.length], MARKS[(h >> 5) % MARKS.length]); }
  return null;
}
