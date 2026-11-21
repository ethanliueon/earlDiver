// (5.10.0) The fish pass: each species' real look, laid over its old one (species.js merges these last).
// fam: the body family (creatures_draw.js FAM): its outline, fins, head and eye. marks: the real markings, painted
// inside the body (band, eyeband, spot, ring, face, topface, rear, upper, lower, scalerim, curves, diag, hlines,
// blush, saddle, tear, dots). Fin colours: dfc (dorsal), afc (anal), pecc, pelc, tailc, finedge (a fin's rim).
// Sizes are not set here: they stay as the game has them.
const K = '#151414', W = '#f2eee2', Y = '#e8c43a';

export const LOOKS = {
  // ---------- batch 1: the reef's tall, flat-sided fish ----------
  4: { fam: 'disc', h: 0.95, t: 'lunate', d: null, c: ['#efe9d6', '#f3eddb'], dfc: '#1d1c1a', afc: '#1d1c1a', pelc: K, tailc: K, finedge: '#e8e2d0', snout: 0.9, snoutc: '#ece4d0', p: 'none',
    pennant: { len: 0.95, rise: 0.55, c: '#f4f0e4' }, marks: [{ k: 'blush', x: 0.62, y: -0.3, r: 0.35, c: 'rgba(232,197,58,0.75)' }, { k: 'band', x: 0.24, w: 0.17, c: K, tilt: 0.12 }, { k: 'band', x: 0.73, w: 0.17, c: K, tilt: -0.1 }, { k: 'rear', from: 0.88, c: Y }, { k: 'saddle', x: 0.04, y: 0.12, w: 0.06, h: 0.1, c: '#e0902e' }] }, // Moorish Idol
  7: { fam: 'disc', h: 0.82, t: 'trunc', c: ['#f4f1e8', '#ece7da'], dfc: '#e2d8c2', afc: '#d27a2c', tailc: 'rgba(232,228,214,0.8)', tailband: K, snout: 1.25, snoutc: '#d27a2c', p: 'none',
    dspot: { c: K, ring: W, at: 0.78 }, marks: [{ k: 'eyeband', c: '#d27a2c', edge: '#2a1e14', w: 0.07 }, { k: 'band', x: 0.38, w: 0.08, c: '#d27a2c', edge: '#2a1e14', ew: 0.008 }, { k: 'band', x: 0.58, w: 0.08, c: '#d27a2c', edge: '#2a1e14', ew: 0.008 }, { k: 'band', x: 0.8, w: 0.08, c: '#d27a2c', edge: '#2a1e14', ew: 0.008 }] }, // Copperband Butterflyfish
  8: { fam: 'disc', h: 0.8, t: 'trunc', c: ['#f2efe6', '#f4f1e8'], dfc: Y, afc: Y, tailc: 'rgba(232,196,58,0.85)', snout: 0.45, d: 'filament', p: 'none',
    dspot: { c: K, ring: Y, at: 0.8 }, marks: [{ k: 'diag', c: '#6b6860', a: -0.7, lw: 0.022, sp: 0.06, x: 0.45 }, { k: 'rear', from: 0.82, c: Y, soft: 0.08 }, { k: 'eyeband', c: K, w: 0.06, up: 0.55, down: 0.45 }] }, // Threadfin Butterflyfish
  194: { fam: 'disc', h: 0.8, t: 'trunc', c: ['#e6ae2e', '#f0c24a'], dfc: '#e8b030', afc: '#e8b030', tailc: 'rgba(232,180,50,0.85)', tailband: '#2a2420', snout: 0.4, p: 'none', finedge: '#2a2420',
    marks: [{ k: 'diag', c: 'rgba(200,120,40,0.45)', a: -0.5, lw: 0.02, sp: 0.06 }, { k: 'band', x: 0.32, w: 0.1, c: '#2a2420', tilt: 0.55, top: 0.62, bot: -0.08 }, { k: 'eyeband', c: K, w: 0.1, up: 0.62, down: 0.32, tilt: 0.3 }, { k: 'band', x: 0.21, w: 0.04, c: W, tilt: 0.35, top: 0.62, bot: 0.1 }, { k: 'spot', x: 0.93, y: -0.02, r: 0.06, c: K }] }, // Raccoon Butterflyfish
  195: { fam: 'disc', h: 0.76, t: 'trunc', c: ['#f0c428', '#f2cc3a'], dfc: '#f0c428', afc: '#f0c428', tailc: 'rgba(236,232,220,0.75)', snout: 2.0, snoutc: '#2a2826', p: 'none', finedge: '#5aa0e0',
    marks: [{ k: 'face', c: '#ece8dc', to: 0.22 }, { k: 'topface', c: K, to: 0.32, y0: 0.0 }, { k: 'spot', x: 0.86, y: 0.36, r: 0.06, c: K }] }, // Longnose Butterflyfish
  196: { fam: 'disc', h: 0.8, t: 'trunc', c: ['#f2efe6', '#efebe0'], dfc: '#2a2826', afc: '#2a2826', tailc: 'rgba(220,216,200,0.8)', tailband: K, snout: 0.35, p: 'none', finedge: '#e6e0cc',
    marks: [{ k: 'eyeband', c: K, w: 0.07 }, { k: 'band', x: 0.4, w: 0.08, c: K }, { k: 'band', x: 0.61, w: 0.08, c: K }, { k: 'band', x: 0.84, w: 0.11, c: K }] }, // Banded Butterflyfish
  197: { fam: 'disc', h: 0.8, t: 'trunc', c: ['#ece9e0', '#f2efe6'], dfc: '#ddd2a8', afc: '#ddd2a8', tailc: 'rgba(220,214,190,0.8)', snout: 0.35, p: 'none',
    marks: [{ k: 'diag', c: 'rgba(80,78,72,0.55)', a: -0.55, lw: 0.016, sp: 0.045 }, { k: 'eyeband', c: K, w: 0.06, up: 0.5, down: 0.45 }, { k: 'spot', x: 0.83, y: -0.12, r: 0.11, c: K, ring: W }] }, // Foureye Butterflyfish
  198: { fam: 'disc', h: 0.85, t: 'trunc', c: ['#f2eee4', '#ece8dc'], dfc: Y, afc: K, tailc: Y, snout: 0.4, p: 'none', pennant: { len: 0.72, rise: 0.42 },
    marks: [{ k: 'band', x: 0.3, w: 0.18, c: K, tilt: 0.35 }, { k: 'band', x: 0.68, w: 0.17, c: K, tilt: 0.35 }, { k: 'eyeband', c: '#2a2826', w: 0.04, up: 0.3, down: 0.1 }, { k: 'rear', from: 0.9, c: Y }] }, // Pennant Coralfish
  5: { fam: 'disc', h: 0.84, t: 'round', d: 'trail', c: ['#3c6fa6', '#5d8a72'], dfc: '#3a68b0', afc: '#3a68b0', finedge: Y, tailc: '#e8c43a', pecc: Y, pelc: Y, pelv: 0.34, p: 'none',
    crown: '#121a30', crownring: '#5aa8e8', spine: '#5aa8e8', marks: [{ k: 'scalerim', c: 'rgba(232,200,70,0.55)' }, { k: 'face', c: 'rgba(60,110,170,0.6)', to: 0.18 }] }, // Queen Angelfish
  6: { fam: 'disc', h: 0.78, t: 'round', c: ['#1d3d98', '#26489f'], dfc: '#1d3d98', afc: '#1d3d98', finedge: '#6ab0f0', tailc: '#e8c43a', spine: '#6ab0f0', p: 'none',
    marks: [{ k: 'diag', c: '#e8c43e', a: -0.2, lw: 0.04, sp: 0.06, x: 0.6 }, { k: 'face', c: '#c8d6e6', to: 0.2 }, { k: 'eyeband', c: '#0e1424', edge: '#5a9ae0', w: 0.08, up: 0.32, down: 0.3 }, { k: 'band', x: 0.31, w: 0.07, c: '#0e1424', edge: '#5a9ae0', top: 0.55, bot: 0.25 }] }, // Emperor Angelfish
  189: { fam: 'disc', h: 0.78, t: 'round', c: ['#e8962a', '#f0b040'], dfc: '#3a4a9a', afc: '#e8a030', finedge: '#6a8ae0', tailc: '#f0c440', p: 'none', spine: '#6a8ae0',
    marks: [0.17, 0.3, 0.43, 0.56, 0.69, 0.82].map((x) => ({ k: 'band', x, w: 0.035, c: W, edge: '#2a3a8a', ew: 0.012 })) }, // Regal Angelfish
  190: { fam: 'disc', h: 0.84, t: 'round', d: 'trail', c: ['#1a1a1c', '#232326'], dfc: '#1c1c1e', afc: '#1c1c1e', tailc: '#1c1c1e', finedge: '#5a5a58', pelv: 0.32, pelc: '#1c1c1e', eyering: Y, gillbar: '#d8b030', lipc: '#d8d0b8', p: 'none',
    marks: [{ k: 'scalerim', c: '#d8b030', s: 0.05, lw: 0.013 }] }, // French Angelfish
  191: { fam: 'disc', h: 0.62, t: 'round', c: ['#e8401a', '#f06a28'], dfc: '#e84a1e', afc: '#2a1a3a', finedge: '#4a7ae0', tailc: '#e8501e', spine: '#4a7ae0', p: 'none',
    marks: [0.44, 0.51, 0.58, 0.65].map((x) => ({ k: 'band', x, w: 0.016, c: '#1a1012', top: 0.45, bot: 0.3 })) }, // Flame Angelfish
  192: { fam: 'disc', h: 0.62, t: 'round', c: ['#3a3a9a', '#40389a'], dfc: '#3a3a9a', afc: '#3a3a9a', finedge: '#7aa0f0', tailc: '#3a3a9a', spine: '#7aa0f0', p: 'none',
    marks: [{ k: 'blush', x: 0.45, y: 0.05, r: 0.36, c: '#e0682a' }, { k: 'diag', c: 'rgba(40,40,140,0.55)', a: -0.08, lw: 0.014, sp: 0.04 }] }, // Coral Beauty
  193: { fam: 'disc', h: 0.8, t: 'round', c: ['#9a5a26', '#b8762e'], dfc: '#8a5226', afc: '#8a5226', finedge: '#4a9ae8', tailc: '#ece8dc', p: 'none',
    marks: [{ k: 'diag', c: '#4a9ae8', a: -0.95, lw: 0.024, sp: 0.11, x: 0.55 }, { k: 'ring', x: 0.36, y: -0.22, r: 0.07, c: '#4a9ae8', lw: 0.03 }, { k: 'hlines', c: '#4a9ae8', n: 2, y0: -0.05, y1: 0.08, from: 0.02, to: 0.24, lw: 0.02 }] }, // Blue Ring Angelfish
  3: { fam: 'tang', h: 0.9, t: 'trunc', c: ['#f0c624', '#f4d64a'], dfc: '#f0c624', afc: '#f0c624', tailc: '#f0c624', snout: 0.55, snoutc: '#f0c624', spinec: '#f6f2e4', dh: 0.24, ah: 0.2, p: 'none' }, // Yellow Tang
  2: { fam: 'tang', h: 0.55, t: 'trunc', c: ['#1c4ea6', '#2f6cc4'], dfc: '#1a2a5a', afc: '#1a2a5a', finedge: '#0e1420', tailc: '#e2bb2a', spinec: '#e2bb2a', pecc: '#e2bb2a', p: 'palette', pc: '#0e1420' }, // Blue Tang
  199: { fam: 'tang', h: 0.62, t: 'lunate', c: ['#6aaee0', '#7ab8e6'], dfc: Y, afc: '#f0eee8', finedge: '#3a7ac8', tailc: '#e8e8e2', tailband: K, spinec: Y, pecc: Y, p: 'none',
    marks: [{ k: 'face', c: '#141618', to: 0.27 }, { k: 'band', x: 0.13, w: 0.07, c: W, top: -0.02, bot: 0.6 }] }, // Powder Blue Tang
  200: { fam: 'tang', h: 0.6, t: 'lunate', c: ['#141416', '#1c1c20'], dfc: '#1a1a1e', afc: '#1a1a1e', finedge: '#d8e0f0', tailc: '#1a1a1e', tailband: '#e8601e', spinec: '#e8601e', gillbar: '#f0ece0', p: 'none',
    marks: [{ k: 'tear', x: 0.91, r: 0.17, c: '#e8601e' }, { k: 'band', x: 0.08, w: 0.07, c: '#ece8e0', top: 0.0, bot: 0.6 }] }, // Achilles Tang
  201: { fam: 'tang', h: 0.48, t: 'lyre', c: ['#5a5048', '#8a8070'], dfc: '#e8c040', afc: '#5a5048', tailc: '#4a4038', lipc: '#e8701e', spines2: 1, spinec: '#e8701e', p: 'none',
    marks: [{ k: 'eyeband', c: '#e8801e', w: 0.03, tilt: 1.0, up: 0.02, down: 0.28 }] }, // Orangespine Unicornfish
  202: { fam: 'tang', h: 0.56, t: 'trunc', c: ['#c4cc9c', '#e6eada'], dfc: '#c8c8a0', afc: '#d8d8c0', tailc: 'rgba(210,210,180,0.85)', spinec: '#e8e8d0', p: 'none',
    marks: [{ k: 'eyeband', c: K, w: 0.025 }, ...[0.33, 0.48, 0.63, 0.78].map((x) => ({ k: 'band', x, w: 0.025, c: K, top: 0.6, bot: 0.45 })), { k: 'spot', x: 0.94, y: -0.05, r: 0.05, c: K }] }, // Convict Surgeonfish
  203: { fam: 'tang', h: 0.8, t: 'trunc', c: ['#c8b070', '#e0d0a0'], dfc: '#3a2a1e', afc: '#3a2a1e', tailc: '#d8c890', snout: 0.5, snoutc: '#c8b070', spinec: '#e8e2d0', sail: 1, p: 'none',
    marks: [{ k: 'eyeband', c: '#3a2a1e', w: 0.11 }, { k: 'band', x: 0.42, w: 0.13, c: '#3a2a1e' }, { k: 'band', x: 0.66, w: 0.12, c: '#3a2a1e' }, { k: 'hlines', c: 'rgba(232,200,90,0.5)', n: 5, y0: -0.3, y1: 0.3, from: 0.3, to: 0.95, lw: 0.015 }] }, // Sailfin Tang
  239: { fam: 'disc', h: 1.0, t: 'trunc', c: ['#a89a7a', '#c8bea0'], dfc: '#a89a7a', afc: '#a89a7a', finedge: '#2a2218', pelv: 0.34, pelc: '#2a2218', tailc: '#b8ad90', dh: 0.21, ah: 0.19, p: 'none',
    marks: [{ k: 'eyeband', c: '#2a2218', w: 0.08 }, { k: 'band', x: 0.33, w: 0.09, c: '#3a3024' }] }, // Orbicular Batfish
  59: { fam: 'disc', h: 0.72, t: 'round', c: ['#8a8470', '#c8c2a8'], dfc: '#6a6454', afc: '#6a6454', tailc: 'rgba(110,104,84,0.85)', spinefil: 1, bigmouth: 1, mouthy: 0.06, p: 'none',
    marks: [{ k: 'hlines', c: 'rgba(200,170,90,0.35)', n: 4, y0: -0.25, y1: 0.25, lw: 0.02 }, { k: 'spot', x: 0.5, y: 0.0, r: 0.12, c: '#1a1814', ring: '#d8c890' }] }, // John Dory
  53: { fam: 'disc', h: 0.66, t: 'lunate', d: 'sickle', c: ['#4a5a7a', '#d8a0a8'], dfc: '#d02a24', afc: '#d02a24', pecc: '#d02a24', pelc: '#d02a24', pelv: 0.26, tailc: '#d02a24', lipc: '#d02a24', p: 'none', dh: 0.22, ah: 0.12,
    marks: [{ k: 'dots', c: '#f0ece6', n: 46, r: 0.028, from: 0.15, to: 0.95 }] }, // Opah
  337: { fam: 'disc', h: 0.7, t: 'trunc', c: ['#4a4a46', '#6a6a62'], dfc: '#3a3a36', afc: '#3a3a36', tailc: 'rgba(58,58,54,0.85)', eyek: 1.5, p: 'none',
    marks: [{ k: 'dots', c: 'rgba(30,30,28,0.4)', n: 18, r: 0.05, from: 0.3, to: 0.9 }] }, // Smooth Oreo

  // ---------- batch 2: the rest of the reef ----------
  // damselfish and their kin: an oval with a notched dorsal, a small mouth
  1: { fam: 'damsel', h: 0.48, t: 'round', c: ['#e2601c', '#ee8a40'], f: '#e2601c', finedge: K, tailedge: K, p: 'none',
    marks: [{ k: 'band', x: 0.2, w: 0.09, c: W, edge: K, ew: 0.01, tilt: 0.05 }, { k: 'band', x: 0.52, w: 0.1, c: W, edge: K, ew: 0.01, tilt: -0.2, top: 0.6, bot: 0.6 }, { k: 'band', x: 0.88, w: 0.06, c: W, edge: K, ew: 0.01 }] }, // Ocellaris Clownfish
  207: { fam: 'damsel', h: 0.48, t: 'round', c: ['#e8a07a', '#f0b896'], f: '#e8a07a', p: 'none',
    marks: [{ k: 'upper', y: -0.38, c: W, soft: 0.04 }, { k: 'band', x: 0.21, w: 0.035, c: W }] }, // Pink Skunk Clownfish
  208: { fam: 'damsel', h: 0.5, t: 'round', c: ['#c8341a', '#e8641e'], f: '#e8501e', p: 'none',
    marks: [{ k: 'blush', x: 0.55, y: 0.05, r: 0.5, c: 'rgba(60,14,10,0.55)' }, { k: 'band', x: 0.21, w: 0.09, c: W, edge: K, ew: 0.008 }] }, // Tomato Clownfish
  209: { fam: 'damsel', h: 0.5, t: 'round', c: ['#5e1414', '#7a1c18'], f: '#6a1616', spine: W, p: 'none',
    marks: [{ k: 'band', x: 0.2, w: 0.035, c: '#efe4cc' }, { k: 'band', x: 0.52, w: 0.035, c: '#efe4cc' }, { k: 'band', x: 0.88, w: 0.03, c: '#efe4cc' }] }, // Maroon Clownfish
  27: { fam: 'damsel', h: 0.52, t: 'fork', c: ['#d8c44a', '#e8e8de'], f: '#a8a89a', p: 'none',
    marks: [{ k: 'upper', y: -0.2, c: '#d8c44a', soft: 0.12 }, ...[0.24, 0.4, 0.56, 0.72, 0.88].map((x) => ({ k: 'band', x, w: 0.05, c: '#1a1a1a', top: 0.6, bot: 0.55 }))] }, // Sergeant Major
  28: { fam: 'damsel', h: 0.48, t: 'fork', c: ['#1e5ec8', '#3a86dc'], f: '#2c6fd0', tailedge: '#0e2a5a', p: 'none' }, // Blue Chromis
  204: { fam: 'damsel', h: 0.55, t: 'trunc', c: ['#242422', '#33322e'], f: '#2a2a28', p: 'none',
    marks: [{ k: 'spot', x: 0.5, y: -0.38, r: 0.08, c: W }, { k: 'spot', x: 0.16, y: -0.38, r: 0.05, c: W }] }, // Threespot Damselfish
  205: { fam: 'damsel', h: 0.6, t: 'fork', c: ['#f0ede4', '#f4f1ea'], f: '#f0ede4', dfc: K, pelc: K, tailc: 'rgba(240,237,228,0.85)', p: 'none',
    marks: [{ k: 'band', x: 0.15, w: 0.12, c: K, tilt: 0.25 }, { k: 'band', x: 0.48, w: 0.15, c: K, tilt: 0.2 }, { k: 'band', x: 0.8, w: 0.11, c: K, tilt: 0.1 }] }, // Humbug Damselfish
  206: { fam: 'damsel', h: 0.5, t: 'fork', c: ['#121a3a', '#1a2448'], f: '#121a3a', tailc: '#f0c428', p: 'none',
    marks: [{ k: 'dots', c: '#5aa8f0', n: 26, r: 0.025, from: 0.12, to: 0.85, spread: 0.7 }] }, // Yellowtail Damselfish
  72: { fam: 'damsel', h: 0.55, t: 'lunate', c: ['#e8641a', '#f0802a'], f: '#e06018', p: 'none' }, // Garibaldi
  233: { fam: 'damsel', h: 0.42, t: 'lyre', c: ['#e88a2a', '#f0a840'], f: '#e8902a', dfil: 1, dfilc: '#e85a2a', tailc: '#e88a2a', p: 'none',
    marks: [{ k: 'hlines', c: '#a87ad8', n: 1, y0: 0.05, y1: 0.05, from: 0.0, to: 0.3, lw: 0.035 }] }, // Lyretail Anthias
  17: { fam: 'damsel', h: 0.4, t: 'trunc', c: ['#7a3aa0', '#8a46aa'], f: '#8a46aa', p: 'none', dfc: '#8a46aa',
    marks: [{ k: 'rear', from: 0.5, c: '#e6c02a', soft: 0.1 }, { k: 'eyeband', c: '#1a1020', w: 0.012, tilt: 1.2, up: 0.2, down: 0.2 }] }, // Royal Gramma
  // wrasses: long, a small pointed mouth, one long low dorsal
  16: { fam: 'wrasse', h: 0.22, t: 'trunc', c: ['#e8d8a0', '#ece4c8'], f: '#3d7cc4', p: 'none',
    marks: [{ k: 'rear', from: 0.45, c: '#3d7cc4', soft: 0.2 }, { k: 'hlines', c: '#12161e', n: 1, y0: 0, y1: 0, from: 0.0, to: 1.05, lw: 0.2 }] }, // Bluestreak Cleaner Wrasse
  210: { fam: 'wrasse', h: 0.26, t: 'lunate', c: ['#1e7a5a', '#3a9a7a'], f: '#2a8a6a', snout: 1.4, snoutc: '#2a8a6a', p: 'none',
    marks: [{ k: 'diag', c: 'rgba(20,60,50,0.35)', a: 0, lw: 0.02, sp: 0.06 }] }, // Bird Wrasse
  211: { fam: 'wrasse', h: 0.28, t: 'lunate', c: ['#2a8a6a', '#4a9a7a'], f: '#3a8a8a', tailc: '#e8c43a', finedge: '#d860a0', tailedge: '#d860a0', p: 'none',
    marks: [{ k: 'face', c: 'rgba(120,90,180,0.7)', to: 0.2 }, { k: 'hlines', c: '#d860a0', n: 3, y0: -0.1, y1: 0.12, from: 0.0, to: 0.2, lw: 0.03 }, { k: 'diag', c: 'rgba(216,96,160,0.5)', a: 0.0, lw: 0.018, sp: 0.05, x: 0.6 }] }, // Moon Wrasse
  212: { fam: 'wrasse', h: 0.26, t: 'lunate', c: ['#3a9a5a', '#5aae6a'], f: '#3a9a5a', p: 'none',
    marks: [{ k: 'face', c: '#2a5ad8', to: 0.27 }, { k: 'band', x: 0.3, w: 0.04, c: K }, { k: 'band', x: 0.36, w: 0.07, c: '#e8e8e0' }, { k: 'band', x: 0.42, w: 0.04, c: K }] }, // Bluehead Wrasse
  213: { fam: 'wrasse', h: 0.32, t: 'trunc', c: ['#5a3a9a', '#e8c02a'], f: '#e8c02a', dfc: '#6a3a9a', p: 'none',
    marks: [{ k: 'upper', y: 0.0, c: '#5a3a9a', soft: 0.1 }, { k: 'rear', from: 0.62, c: '#e8c02a', soft: 0.06 }] }, // Spanish Hogfish
  214: { fam: 'wrasse', h: 0.38, t: 'lunate', c: ['#c88a7a', '#ead0c0'], f: '#c88a7a', snout: 0.9, snoutc: '#c88a7a', dfil: 3, dfilh: 1.3, p: 'none',
    marks: [{ k: 'topface', c: 'rgba(90,50,40,0.55)', to: 0.25, y0: -0.05 }, { k: 'spot', x: 0.8, y: -0.4, r: 0.07, c: K }, { k: 'blush', x: 0.5, y: 0, r: 0.4, c: 'rgba(150,90,80,0.3)' }] }, // Hogfish
  15: { fam: 'wrasse', h: 0.42, t: 'round', c: ['#2f6e68', '#5c938a'], f: '#2f6e68', mouth: 'lips', lipc: '#4a8a80', topc: [[0, 0.3], [0.04, 0.75], [0.1, 1.08], [0.18, 1.12], [0.3, 1.02], [0.5, 1], [0.7, 0.86], [0.88, 0.52], [1, 0.4]], p: 'none',
    marks: [{ k: 'diag', c: 'rgba(20,50,46,0.4)', a: 0, lw: 0.016, sp: 0.04 }, { k: 'hlines', c: '#1a3a36', n: 2, y0: -0.2, y1: -0.05, from: 0.02, to: 0.22, lw: 0.02 }] }, // Humphead Wrasse
  // parrotfish: a blunt head, big scales, the beak
  13: { fam: 'parrot', h: 0.38, t: 'lunate', c: ['#2f7c5c', '#6fae86'], f: '#3b8a6a', beakc: '#b8d8c0', tailc: '#3b8a6a', p: 'none',
    marks: [{ k: 'spot', x: 0.27, y: -0.38, r: 0.07, c: '#e8c43a' }, { k: 'band', x: 0.97, w: 0.06, c: '#e8a83a' }, { k: 'hlines', c: '#e88a6a', n: 2, y0: -0.05, y1: 0.08, from: 0.02, to: 0.2, lw: 0.025 }] }, // Stoplight Parrotfish
  14: { fam: 'parrot', h: 0.45, t: 'trunc', c: ['#4a6560', '#6d857c'], f: '#4a6560', beakc: '#e8e4d8', hump: 1, topc: [[0, 0.5], [0.04, 0.9], [0.12, 1.08], [0.25, 1.02], [0.55, 0.97], [0.75, 0.78], [0.9, 0.5], [1, 0.42]], p: 'none',
    marks: [{ k: 'face', c: 'rgba(200,200,150,0.35)', to: 0.15 }] }, // Bumphead Parrotfish
  215: { fam: 'parrot', h: 0.36, t: 'lunate', c: ['#2a8a8a', '#5ab09a'], f: '#2a8a8a', finedge: '#e88a5a', tailedge: '#e88a5a', beakc: '#a8d8d0', p: 'none',
    marks: [{ k: 'hlines', c: '#e8905a', n: 2, y0: -0.1, y1: 0.1, from: 0.0, to: 0.22, lw: 0.03 }, { k: 'lower', y: 0.25, c: 'rgba(232,140,90,0.45)', soft: 0.06 }] }, // Queen Parrotfish
  216: { fam: 'parrot', h: 0.38, t: 'trunc', c: ['#3a7a3a', '#5a9a4a'], f: '#3a7a3a', beakc: '#5ab0a0', p: 'none',
    marks: [{ k: 'face', c: '#c8702a', to: 0.3 }] }, // Rainbow Parrotfish
  // puffers and porcupinefish
  19: { fam: 'puffer', h: 0.55, t: 'round', c: ['#a08a62', '#e8e0cc'], f: '#a89470', spines: 1, eyek: 1.6, p: 'none',
    marks: [{ k: 'dots', c: '#3a3024', n: 28, r: 0.04, from: 0.15, to: 0.9, spread: 0.7 }, { k: 'lower', y: 0.15, c: '#ece6d4', soft: 0.1 }] }, // Porcupinefish
  221: { fam: 'puffer', h: 0.55, t: 'round', c: ['#1a1a1c', '#222226'], f: '#1a1a1c', tailc: '#1a1a1c', p: 'none',
    marks: [{ k: 'dots', c: '#ece8dc', n: 70, r: 0.02, from: 0.05, to: 1 }] }, // Guineafowl Puffer
  222: { fam: 'puffer', h: 0.5, t: 'round', c: ['#cfc6a8', '#e4dcc4'], f: '#a89a7a', p: 'none',
    marks: [{ k: 'maze', c: '#2a2620', n: 34, lw: 0.018, from: 0.08, to: 0.95 }] }, // Map Puffer
  // triggerfish: a diamond body, the eye set far back, a trigger spine
  20: { fam: 'trigger', h: 0.5, t: 'trunc', c: ['#b8ad92', '#ece8dc'], f: '#8a8070', lipc: '#e8c43a', p: 'none',
    marks: [{ k: 'lower', y: 0.1, c: '#f0ece2', soft: 0.06 }, { k: 'hlines', c: '#2b5e9a', n: 3, y0: -0.26, y1: -0.08, from: 0.15, to: 0.42, lw: 0.025 }, { k: 'band', x: 0.62, w: 0.12, c: '#5a4a3a', tilt: -0.6, top: 0.1, bot: 0.6 }, { k: 'hlines', c: '#1a1a1a', n: 3, y0: -0.05, y1: 0.08, from: 0.85, to: 1, lw: 0.03 }] }, // Picasso Triggerfish
  21: { fam: 'trigger', h: 0.52, t: 'trunc', c: ['#5f6a42', '#b8a65a'], f: '#6a5a2a', p: 'none',
    marks: [{ k: 'maze', c: 'rgba(40,46,30,0.6)', n: 30, lw: 0.03, from: 0.2, to: 0.95 }, { k: 'band', x: 0.06, w: 0.08, c: '#2a2a1a', top: 0.2, bot: 0.1 }] }, // Titan Triggerfish
  22: { fam: 'trigger', h: 0.5, t: 'trunc', c: ['#15171a', '#1c1e22'], f: '#18191c', lipc: '#e8c43a', p: 'none',
    marks: [{ k: 'upper', y: -0.28, c: '#c8a83a', soft: 0.04 }, { k: 'maze', c: K, n: 18, lw: 0.025, y0: -0.6, y1: -0.3, from: 0.3, to: 0.7 }, { k: 'dots', c: '#ecebe4', n: 9, r: 0.085, from: 0.25, to: 0.85, spread: 0.35, y: 0.22, seed: 9 }] }, // Clown Triggerfish
  217: { fam: 'trigger', h: 0.48, t: 'lyre', c: ['#3a7a7a', '#a8b088'], f: '#3a6a8a', dk: 1.3, ak: 1.3, finedge: '#5ab0e8', p: 'none',
    marks: [{ k: 'hlines', c: '#5ab0e8', n: 2, y0: -0.05, y1: 0.1, from: 0.02, to: 0.36, lw: 0.035 }] }, // Queen Triggerfish
  218: { fam: 'trigger', h: 0.48, t: 'trunc', c: ['#1e3a2e', '#26443a'], f: '#e8701e', tailc: '#e8701e', p: 'none',
    marks: [{ k: 'diag', c: '#e8801e', a: -0.4, lw: 0.025, sp: 0.06 }] }, // Orange-lined Triggerfish
  // snappers, grunts, sweetlips
  29: { fam: 'snapper', h: 0.38, t: 'fork', c: ['#3e5f9a', '#a8b0b8'], f: '#d8b83a', p: 'none', mouthy: 0.06,
    marks: [{ k: 'hlines', c: '#e8c43a', n: 7, y0: -0.38, y1: 0.36, from: 0.0, to: 1, lw: 0.035 }] }, // French Grunt
  30: { fam: 'snapper', h: 0.38, t: 'fork', c: ['#c44a4a', '#e8a8a0'], f: '#c45050', eyec: '#e85a3a', p: 'none' }, // Red Snapper
  224: { fam: 'snapper', h: 0.36, t: 'fork', c: ['#e8c42a', '#f0d44a'], f: '#e8c42a', p: 'none',
    marks: [{ k: 'hlines', c: '#3a8ad8', n: 4, y0: -0.3, y1: 0.12, from: 0.0, to: 1, lw: 0.035, rise: 0 }, { k: 'lower', y: 0.25, c: '#f0ece0', soft: 0.06 }] }, // Bluestripe Snapper
  225: { fam: 'snapper', h: 0.32, t: 'fork', taill: 1.2, c: ['#5a6a8a', '#d8dce0'], f: '#e8c42a', tailc: '#e8c42a', p: 'none',
    marks: [{ k: 'hlines', c: '#e8c42a', n: 1, y0: 0.02, y1: 0.02, from: 0.0, to: 1.05, lw: 0.08 }, { k: 'dots', c: 'rgba(232,196,42,0.6)', n: 18, r: 0.025, from: 0.3, to: 0.95, spread: 0.4 }] }, // Yellowtail Snapper
  226: { fam: 'snapper', h: 0.38, t: 'fork', c: ['#7a6a4a', '#d89a8a'], f: '#c87060', p: 'none',
    marks: [{ k: 'spot', x: 0.62, y: -0.12, r: 0.05, c: K }, { k: 'hlines', c: '#5aa8e8', n: 2, y0: -0.1, y1: 0.05, from: 0.0, to: 0.18, lw: 0.02 }] }, // Mutton Snapper
  223: { fam: 'snapper', h: 0.4, t: 'trunc', c: ['#ece6d6', '#f0ece0'], f: '#e0d8c4', mouth: 'lips', lipc: '#d8a890', p: 'none',
    marks: [{ k: 'dots', c: '#1a1814', n: 40, r: 0.035, from: 0.05, to: 1 }] }, // Harlequin Sweetlips
  // groupers: a big head and a bigger mouth
  31: { fam: 'grouper', h: 0.38, t: 'round', c: ['#8a6a4a', '#d2c0a4'], f: '#7a5a3c', p: 'none',
    marks: [...[0.3, 0.46, 0.62, 0.78].map((x) => ({ k: 'band', x, w: 0.06, c: 'rgba(74,54,36,0.75)', tilt: 0.1 })), { k: 'saddle', x: 0.95, y: 0.35, w: 0.05, h: 0.12, c: K }, { k: 'eyeband', c: 'rgba(74,54,36,0.7)', w: 0.03, tilt: 0.8 }] }, // Nassau Grouper
  32: { fam: 'grouper', h: 0.4, t: 'round', c: ['#3c3c36', '#7a7462'], f: '#c8b64a', dfc: '#3a3a30', p: 'none', eyek: 0.85,
    marks: [{ k: 'maze', c: 'rgba(200,182,74,0.45)', n: 30, lw: 0.03, from: 0.1, to: 0.95 }] }, // Giant Grouper
  33: { fam: 'grouper', h: 0.42, t: 'round', c: ['#6a5a3e', '#9a8a68'], f: '#5a4a32', p: 'none', eyek: 0.75,
    marks: [{ k: 'dots', c: 'rgba(40,32,20,0.5)', n: 50, r: 0.03, from: 0.08, to: 1 }] }, // Atlantic Goliath Grouper
  34: { fam: 'grouper', h: 0.34, t: 'trunc', c: ['#b83a32', '#d86a5a'], f: '#a8322c', p: 'none',
    marks: [{ k: 'dots', c: '#5ab4e8', n: 70, r: 0.016, from: 0.0, to: 1 }] }, // Leopard Coral Grouper
  227: { fam: 'grouper', h: 0.36, t: 'round', c: ['#3a2a20', '#5a4030'], f: '#3a2a20', tailedge: '#ece8dc', p: 'none',
    marks: [{ k: 'dots', c: '#4a9ae8', n: 80, r: 0.018, from: 0.0, to: 1 }] }, // Peacock Grouper
  228: { fam: 'grouper', h: 0.36, t: 'round', c: ['#b8462a', '#d87a4a'], f: '#b8462a', p: 'none',
    marks: [{ k: 'dots', c: '#5ab4e8', n: 40, r: 0.016, from: 0.0, to: 0.9 }, { k: 'spot', x: 0.96, y: -0.2, r: 0.05, c: K }, { k: 'spot', x: 0.96, y: 0.2, r: 0.05, c: K }] }, // Coney
  // squirrelfish, sweepers, bigeyes, drums
  229: { fam: 'squirrel', h: 0.38, t: 'fork', taill: 1.2, c: ['#c83a2a', '#e8806a'], f: '#e84a3a', dfc: '#e8c43a', eyec: '#c83a2a', p: 'none',
    marks: [{ k: 'hlines', c: 'rgba(240,230,220,0.7)', n: 5, y0: -0.3, y1: 0.3, from: 0.15, to: 1, lw: 0.025 }] }, // Squirrelfish
  230: { fam: 'squirrel', h: 0.45, t: 'fork', c: ['#c88a4a', '#e8b880'], f: '#c88a4a', p: 'none', finop: 0.5, ak: 1.4, eyek: 1.4,
    botc: [[0, 0.2], [0.1, 0.7], [0.3, 1.1], [0.5, 0.9], [0.8, 0.4], [1, 0.25]], anal: [{ a: 0.42, b: 0.92, s: 'even', h: 0.14, r: 0.15, n: 16 }] }, // Glassy Sweeper
  231: { fam: 'squirrel', h: 0.4, t: 'trunc', c: ['#a8241e', '#c8402e'], f: '#a8241e', eyec: '#d84a2a', eyek: 1.9, mouth: 'up', p: 'none' }, // Bigeye
  232: { fam: 'snapper', h: 0.34, t: 'round', c: ['#f2eee4', '#f4f1ea'], f: K, dfil: 2, dfilh: 1.8, dfilc: K, p: 'none',
    marks: [{ k: 'hlines', c: K, n: 4, y0: -0.3, y1: 0.25, from: 0.1, to: 1, lw: 0.06 }, { k: 'eyeband', c: K, w: 0.05 }] }, // Spotted Drum
  // gobies, blennies, jawfish, dragonets
  234: { fam: 'goby', h: 0.2, t: 'round', c: ['#f0ece4', '#f2ede6'], f: '#e8401e', dk: 1.6, p: 'none',
    marks: [{ k: 'rear', from: 0.45, c: '#e8401e', soft: 0.2 }, { k: 'face', c: 'rgba(232,196,58,0.6)', to: 0.12 }] }, // Fire Goby
  235: { fam: 'goby', h: 0.16, t: 'round', c: ['#1a1c20', '#24262a'], f: '#1a1c20', p: 'none',
    marks: [{ k: 'hlines', c: '#4ac0f0', n: 1, y0: -0.12, y1: -0.12, from: 0.0, to: 1.05, lw: 0.15 }] }, // Neon Goby
  236: { fam: 'blenny', h: 0.22, t: 'round', c: ['#2a2a3a', '#33334a'], f: '#e8781e', cirri: '#3a3a4a', p: 'none',
    marks: [{ k: 'rear', from: 0.42, c: '#e8781e', soft: 0.06 }] }, // Bicolor Blenny
  237: { fam: 'blenny', h: 0.22, t: 'round', c: ['#3a2e26', '#4a3a30'], f: '#3a2e26', lipc: '#d8302a', cirri: '#3a2e26', p: 'none',
    marks: [{ k: 'dots', c: 'rgba(20,14,10,0.4)', n: 20, r: 0.05 }] }, // Redlip Blenny
  238: { fam: 'goby', h: 0.2, t: 'round', c: ['#a8c8e0', '#c8dcea'], f: '#a8c8e0', eyek: 1.5, p: 'none', dors: [{ a: 0.24, b: 0.92, s: 'even', h: 0.3, r: 0.12, n: 18 }],
    marks: [{ k: 'face', c: '#f0c832', to: 0.25 }] }, // Yellowhead Jawfish
  9: { fam: 'goby', h: 0.3, t: 'round', c: ['#1f5aa8', '#2565b0'], f: '#e2752a', dk: 1.2, fan: 1, fanc: '#1f3a88', p: 'swirl', pc: '#e2752a',
    marks: [{ k: 'maze', c: 'rgba(80,200,120,0.5)', n: 16, lw: 0.03 }] }, // Mandarinfish
  // scorpionfish
  10: { fam: 'scorp', h: 0.42, t: 'round', c: ['#b8402c', '#e6cfc0'], f: '#d8b0a0', lion: 1, fan: 1, fanc: '#8a2a1e', dfc: 'rgba(216,176,160,0.4)', pecc: '#e8d0c0', p: 'bands', pc: '#f2e6dc', n: 12 }, // Red Lionfish
  246: { fam: 'scorp', h: 0.62, t: 'round', c: ['#c8b080', '#e0cc9a'], f: '#c8b080', dk: 1.6, fan: 0, p: 'none', eyek: 1.1,
    marks: [{ k: 'maze', c: 'rgba(120,90,50,0.45)', n: 18, lw: 0.02 }, { k: 'eyeband', c: 'rgba(90,60,30,0.6)', w: 0.04, tilt: 0.4 }] }, // Leaf Scorpionfish

  // ---------- batch 3: sharks ----------
  76: { fam: 'mackshark', h: 0.24, c: ['#5c666e', '#ecebe6'], belly: '#ecebe6', cs: 'sharp', f: '#525c64', pectip: '#1a1c1e', eyec: '#0c0c0c', teeth: 1 }, // Great White Shark
  82: { fam: 'mackshark', h: 0.2, c: ['#2a4a8a', '#e8ecf0'], belly: '#e8ecf0', cs: 'sharp', f: '#2a4a8a', eyek: 1.5, teeth: 1, sp: { pec: [0.18, 0.08, 0.7] } }, // Shortfin Mako
  277: { fam: 'mackshark', h: 0.2, c: ['#1e2a40', '#cfd4dc'], belly: '#cfd4dc', cs: 'sharp', f: '#1e2a40', eyek: 1.8, sp: { pec: [0.3, 0.1, 0.65] } }, // Longfin Mako
  313: { fam: 'mackshark', h: 0.27, c: ['#3a3e44', '#e8e4dc'], belly: '#e8e4dc', cs: 'sharp', f: '#34383e', marks: [{ k: 'dots', c: 'rgba(40,40,44,0.6)', n: 16, r: 0.05, y: 0.32, spread: 0.2, from: 0.3, to: 0.8 }] }, // Salmon Shark
  314: { fam: 'mackshark', h: 0.26, c: ['#4a5260', '#ecece8'], belly: '#ecece8', cs: 'sharp', f: '#444c58', dtip: null, sp: { d1: { x: 0.35, w: 0.15, h: 0.95, r: 0.7 } }, marks: [{ k: 'spot', x: 0.42, y: -0.42, r: 0.06, c: '#ecece8' }] }, // Porbeagle
  78: { fam: 'reqshark', h: 0.22, c: ['#6a6656', '#ece6d6'], belly: '#e8e2d2', f: '#625e50', sp: { top: [[0, 0.3], [0.04, 0.62], [0.12, 0.85], [0.3, 1], [0.5, 0.92], [0.75, 0.55], [0.92, 0.3], [1, 0.22]], tail: { up: 0.34, low: 0.13, a: -0.6, b: 0.95 } },
    marks: [0.3, 0.38, 0.46, 0.54, 0.62, 0.7, 0.78, 0.86].map((x) => ({ k: 'band', x, w: 0.022, c: 'rgba(40,36,28,0.55)', top: 0.6, bot: 0.05, tilt: -0.15 })) }, // Tiger Shark
  80: { fam: 'reqshark', h: 0.2, c: ['#8a8a82', '#f0ece4'], belly: '#f0ece4', f: '#7e7e76', dtip: '#141414', tailtip: '#141414', pectip: '#141414', marks: [{ k: 'hlines', c: 'rgba(240,236,228,0.5)', n: 1, y0: 0.08, y1: 0.08, from: 0.4, to: 0.8, lw: 0.06 }] }, // Blacktip Reef Shark
  248: { fam: 'reqshark', h: 0.18, c: ['#7a7a74', '#e8e6de'], belly: '#e8e6de', f: '#74746e', tips: '#f2efe6', sp: { top: [[0, 0.32], [0.04, 0.6], [0.12, 0.82], [0.3, 1], [0.5, 0.92], [0.75, 0.55], [0.92, 0.3], [1, 0.22]], d1: { x: 0.4, w: 0.12, h: 0.75, r: 0.7 } }, marks: [{ k: 'dots', c: 'rgba(40,40,36,0.4)', n: 10, r: 0.035, from: 0.25, to: 0.8, spread: 0.4, y: -0.1 }] }, // Whitetip Reef Shark
  249: { fam: 'reqshark', h: 0.21, c: ['#6c7276', '#ecebe6'], belly: '#ecebe6', f: '#62686c', tailedge: '#141414' }, // Grey Reef Shark
  250: { fam: 'reqshark', h: 0.22, c: ['#6a6a5e', '#ece8dc'], belly: '#ece8dc', f: '#626256' }, // Caribbean Reef Shark
  254: { fam: 'reqshark', h: 0.21, c: ['#a89a6a', '#ece2c4'], belly: '#ece2c4', f: '#9c8e60', sp: { d2: { x: 0.73, w: 0.11, h: 0.75 } } }, // Lemon Shark
  256: { fam: 'reqshark', h: 0.25, c: ['#7a7a74', '#ecebe4'], belly: '#ecebe4', f: '#72726c', sp: { top: [[0, 0.38], [0.03, 0.7], [0.12, 0.92], [0.3, 1], [0.5, 0.92], [0.75, 0.55], [0.92, 0.3], [1, 0.22]] } }, // Bull Shark
  83: { fam: 'reqshark', h: 0.15, c: ['#2a4aa0', '#e8ecf2'], belly: '#e8ecf2', cs: 'sharp', f: '#2a4aa0', sp: { top: [[0, 0.08], [0.05, 0.35], [0.14, 0.7], [0.32, 1], [0.5, 0.9], [0.75, 0.55], [0.92, 0.3], [1, 0.22]], d1: { x: 0.42, w: 0.1, h: 0.75, r: 0.72 }, pec: [0.36, 0.08, 0.6] } }, // Blue Shark
  273: { fam: 'reqshark', h: 0.18, c: ['#5a5e6a', '#e8e6e2'], belly: '#e8e6e2', f: '#525662', sp: { d1: { x: 0.4, w: 0.1, h: 0.6, r: 0.72 }, pec: [0.28, 0.08, 0.65] } }, // Silky Shark
  274: { fam: 'reqshark', h: 0.22, c: ['#7a786a', '#e8e4d8'], belly: '#e8e4d8', f: '#706e60', tips: '#f2eee4', tipsAll: 1, sp: { d1: { x: 0.37, w: 0.16, h: 1.05, r: 0.62, s: 'round' }, pec: [0.34, 0.12, 0.6], pecRound: 1 } }, // Oceanic Whitetip Shark
  255: { fam: 'reqshark', h: 0.24, c: ['#8a7a5e', '#e8e0cc'], belly: '#e8e0cc', f: '#827258', teeth: 1, sp: { top: [[0, 0.06], [0.05, 0.4], [0.15, 0.8], [0.35, 1], [0.6, 0.9], [0.8, 0.55], [1, 0.25]], d1: { x: 0.5, w: 0.1, h: 0.55, r: 0.7 }, d2: { x: 0.7, w: 0.1, h: 0.5 }, tail: { up: 0.3, low: 0.1, a: -0.5, b: 0.9 } },
    marks: [{ k: 'dots', c: 'rgba(110,70,40,0.55)', n: 30, r: 0.035, from: 0.3, to: 0.95, spread: 0.6 }] }, // Sand Tiger Shark
  339: { fam: 'reqshark', h: 0.24, c: ['#8a7a68', '#e6dccc'], belly: '#e6dccc', f: '#827260', teeth: 1, sp: { top: [[0, 0.06], [0.05, 0.4], [0.15, 0.8], [0.35, 1], [0.6, 0.9], [0.8, 0.55], [1, 0.25]], d1: { x: 0.48, w: 0.1, h: 0.65, r: 0.7 }, d2: { x: 0.7, w: 0.09, h: 0.45 } },
    marks: [{ k: 'dots', c: 'rgba(160,70,50,0.6)', n: 34, r: 0.04, from: 0.2, to: 0.95, spread: 0.7 }] }, // Smalltooth Sand Tiger
  317: { fam: 'reqshark', h: 0.17, c: ['#8a8a84', '#e8e6de'], belly: '#e8e6de', f: '#828078', sp: { d1: { x: 0.42, w: 0.1, h: 0.6 }, d2: { x: 0.7, w: 0.08, h: 0.45 } },
    marks: [...[0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87].map((x) => ({ k: 'saddle', x, y: 0.4, w: 0.04, h: 0.2, c: '#2a2a28' })), { k: 'dots', c: '#2a2a28', n: 16, r: 0.04, from: 0.15, to: 0.9, spread: 0.4, y: 0.05 }] }, // Leopard Shark
  275: { fam: 'thresher', h: 0.24, c: ['#5a5a7a', '#ecebe6'], belly: '#ecebe6', cs: 'sharp', f: '#525272' }, // Common Thresher Shark
  276: { fam: 'thresher', h: 0.24, c: ['#6a5a6a', '#e6e2de'], belly: '#e6e2de', cs: 'sharp', f: '#625262', eyek: 2.3, sp: { eye: [0.09, -0.18] }, marks: [{ k: 'hlines', c: 'rgba(30,24,30,0.4)', n: 1, y0: -0.3, y1: -0.3, from: 0.02, to: 0.25, lw: 0.04 }] }, // Bigeye Thresher
  79: { fam: 'hammer', h: 0.2, c: ['#7a8078', '#ecece6'], belly: '#ecece6', f: '#727870' }, // Scalloped Hammerhead
  81: { fam: 'carpet', h: 0.2, c: ['#8a6a44', '#c8a878'], belly: '#c8a878', f: '#7e6040', barbels: 1 }, // Nurse Shark
  251: { fam: 'carpet', h: 0.16, c: ['#c8b080', '#e8dcc0'], belly: '#e8dcc0', f: '#bca474', sp: { body: 0.55, tail: { up: 0.45, low: 0.38, a: -0.07, b: 0.16, root: 0.16, fork: 0.9 } },
    marks: [{ k: 'dots', c: '#3a2c1e', n: 60, r: 0.04, from: 0.05, to: 1 }, { k: 'hlines', c: 'rgba(80,60,40,0.4)', n: 3, y0: -0.35, y1: 0.05, from: 0.15, to: 1, lw: 0.03 }] }, // Zebra Shark
  252: { fam: 'carpet', h: 0.16, c: ['#8a7a5a', '#a89a7a'], belly: '#a89a7a', f: '#827252', tassels: 1, sp: { top: [[0, 0.5], [0.06, 0.8], [0.18, 0.95], [0.4, 1], [0.65, 0.8], [0.88, 0.45], [1, 0.3]], bot: [[0, 0.5], [0.08, 0.85], [0.25, 1], [0.45, 1], [0.7, 0.7], [0.9, 0.4], [1, 0.3]], eye: [0.08, -0.25] },
    marks: [{ k: 'maze', c: 'rgba(50,40,26,0.55)', n: 40, lw: 0.04 }, { k: 'dots', c: 'rgba(220,210,180,0.45)', n: 30, r: 0.03 }] }, // Tasselled Wobbegong
  253: { fam: 'carpet', h: 0.14, c: ['#c8b494', '#e4d8c0'], belly: '#e4d8c0', f: '#bca888', sp: { body: 0.62, tail: { up: 0.38, low: 0.3, a: -0.08, b: 0.18, root: 0.14, fork: 0.9 } },
    marks: [{ k: 'dots', c: 'rgba(60,44,30,0.6)', n: 40, r: 0.03 }, { k: 'spot', x: 0.47, y: -0.12, r: 0.2, c: '#141210', ring: '#f2ece0' }] }, // Epaulette Shark
  77: { fam: 'whale', h: 0.17, c: ['#3a4a5a', '#dfe4e6'], belly: '#dfe4e6', f: '#34424e',
    marks: [{ k: 'dots', c: '#e8ece8', n: 120, r: 0.03, from: 0.05, to: 1, spread: 0.9, y: -0.08 }, ...[0.3, 0.42, 0.54, 0.66, 0.78].map((x) => ({ k: 'band', x, w: 0.01, c: 'rgba(232,236,232,0.5)', top: 0.6, bot: 0.1 })), { k: 'hlines', c: 'rgba(232,236,232,0.4)', n: 3, y0: -0.4, y1: -0.05, from: 0.2, to: 1, lw: 0.02 }] }, // Whale Shark
  84: { fam: 'filter', h: 0.2, c: ['#5a564e', '#a8a294'], belly: '#a8a294', f: '#524e46', lipc: '#d8d0c4' }, // Basking Shark
  88: { fam: 'filter', h: 0.2, c: ['#2a2a30', '#5a5660'], belly: '#5a5660', f: '#26262c', lipc: '#e8e2d8', sp: { top: [[0, 0.4], [0.05, 0.7], [0.15, 0.92], [0.32, 1], [0.55, 0.9], [0.8, 0.45], [0.94, 0.2], [1, 0.15]], d1: { x: 0.45, w: 0.1, h: 0.55 } } }, // Megamouth Shark
  89: { fam: 'cowshark', h: 0.2, c: ['#4a4840', '#8a8676'], belly: '#8a8676', f: '#444238', eyec: '#3ad87a', eyek: 1.5 }, // Bluntnose Sixgill Shark
  316: { fam: 'cowshark', h: 0.19, c: ['#7a7468', '#d8d2c4'], belly: '#d8d2c4', f: '#726c60', sp: { gills: 7, gsp: 0.016, top: [[0, 0.08], [0.05, 0.42], [0.15, 0.8], [0.35, 1], [0.6, 0.88], [0.8, 0.55], [1, 0.25]] },
    marks: [{ k: 'dots', c: 'rgba(30,26,22,0.6)', n: 40, r: 0.03, from: 0.1, to: 0.95, spread: 0.8, y: -0.1 }] }, // Broadnose Sevengill Shark
  85: { fam: 'sleeper2', h: 0.2, c: ['#4a4a44', '#6a6860'], belly: '#6a6860', f: '#44443e', eyec: '#8ac8a8', eyek: 0.8, marks: [{ k: 'dots', c: 'rgba(20,20,18,0.3)', n: 30, r: 0.04 }] }, // Greenland Shark
  343: { fam: 'sleeper2', h: 0.24, c: ['#5a4e44', '#7a6e62'], belly: '#7a6e62', f: '#524640', thorns: '#d8ccb8' }, // Prickly Shark
  468: { fam: 'sleeper2', h: 0.24, c: ['#5a5650', '#7a766c'], belly: '#7a766c', f: '#524e48', thorns: '#e8e0cc', sp: { anal: 0 } }, // Bramble Shark
  312: { fam: 'dogfish', h: 0.16, c: ['#6a6e72', '#e8e6e2'], belly: '#e8e6e2', f: '#62666a', marks: [{ k: 'dots', c: '#ece8e0', n: 18, r: 0.04, from: 0.2, to: 0.9, spread: 0.4, y: -0.15 }] }, // Spiny Dogfish
  340: { fam: 'dogfish', h: 0.16, c: ['#2a2a2e', '#121214'], belly: '#121214', f: '#26262a', eyec: '#4ad8a0', glow: 1 }, // Velvet Belly Lanternshark
  464: { fam: 'dogfish', h: 0.15, c: ['#121214', '#0c0c0e'], belly: '#0c0c0e', f: '#141416', eyec: '#3ae890', eyek: 1.8, glow: 1 }, // Ninja Lanternshark
  341: { fam: 'dogfish', h: 0.17, c: ['#3a2e28', '#2a2220'], belly: '#2a2220', f: '#342a24', glow: 1, sp: { dspine: 0 } }, // Kitefin Shark
  342: { fam: 'dogfish', h: 0.17, c: ['#3e302a', '#4e4038'], belly: '#4e4038', f: '#382c26', eyec: '#3ad890', eyek: 1.7 }, // Portuguese Dogfish
  467: { fam: 'dogfish', h: 0.16, c: ['#6a6a66', '#a8a6a0'], belly: '#a8a6a0', f: '#62625e', eyec: '#3ae890', eyek: 2.2 }, // Gulper Shark
  465: { fam: 'dogfish', h: 0.14, c: ['#2a2a30', '#1a1a1e'], belly: '#1a1a1e', f: '#26262c', teeth: 1, eyek: 1.6, eyec: '#3ad8a0', glow: 1 }, // Viper Dogfish
  463: { fam: 'dogfish', h: 0.24, c: ['#3a3a3e', '#2a2a2e'], belly: '#2a2a2e', f: '#363638', glow: 1, sp: { top: [[0, 0.5], [0.05, 0.85], [0.15, 1], [0.35, 1], [0.6, 0.85], [0.82, 0.5], [1, 0.22]], dspine: 0 } }, // Pocket Shark
  466: { fam: 'dogfish', h: 0.18, c: ['#4a4038', '#6a5e54'], belly: '#6a5e54', f: '#443a32', sp: { d1: { x: 0.45, w: 0.32, h: 0.25, s: 'low' }, d2: { x: 0.8, w: 0.08, h: 0.3 }, dspine: 0, anal: 0.84 } }, // False Catshark
  90: { fam: 'dogfish', h: 0.17, c: ['#6a5a48', '#8a7a64'], belly: '#8a7a64', f: '#62523e', glow: 1, eyek: 1.6, sp: { d1: { x: 0.68, w: 0.05, h: 0.2 }, d2: { x: 0.78, w: 0.05, h: 0.2 }, dspine: 0 }, marks: [{ k: 'band', x: 0.24, w: 0.05, c: '#2a2018', top: 0.2, bot: 0.6 }] }, // Cookiecutter Shark

  // ---------- batch 4: open ocean and cold water ----------
  39: { fam: 'tuna', h: 0.3, t: 'lunate', c: ['#14243e', '#c8d2d8'], f: '#1a2a40', finletc: '#d8b830', p: 'none', marks: [{ k: 'lower', y: 0.05, c: '#d0d8de', soft: 0.1 }] }, // Atlantic Bluefin Tuna
  40: { fam: 'tuna', h: 0.27, t: 'lunate', c: ['#1c2c48', '#d0d8de'], f: '#e2b82a', dfc: '#e2b82a', afc: '#e2b82a', dk: 1.9, ak: 1.9, finletc: '#e8c030', p: 'none',
    marks: [{ k: 'lower', y: 0.05, c: '#d0d8de', soft: 0.08 }, { k: 'hlines', c: 'rgba(226,184,42,0.8)', n: 1, y0: -0.02, y1: -0.02, from: 0.12, to: 0.9, lw: 0.05 }] }, // Yellowfin Tuna
  41: { fam: 'tuna', h: 0.3, t: 'lunate', c: ['#2a2848', '#cad2d8'], f: '#1e2c4a', finletc: '#8a8a9a', p: 'none',
    marks: [{ k: 'lower', y: 0.0, c: '#cad2d8', soft: 0.08 }, { k: 'hlines', c: 'rgba(40,46,66,0.75)', n: 4, y0: 0.1, y1: 0.36, from: 0.25, to: 0.95, lw: 0.035 }] }, // Skipjack Tuna
  261: { fam: 'tuna', h: 0.28, t: 'lunate', c: ['#1a2a4a', '#d0d6dc'], f: '#1e2c4a', finletc: '#d8d0b0', peck: 2.8, p: 'none', marks: [{ k: 'lower', y: 0.05, c: '#d0d6dc', soft: 0.1 }] }, // Albacore
  262: { fam: 'tuna', h: 0.32, t: 'lunate', c: ['#1a2440', '#c8d0d6'], f: '#1e2a46', finletc: '#e8c030', eyek: 1.6, p: 'none', marks: [{ k: 'lower', y: 0.05, c: '#c8d0d6', soft: 0.1 }] }, // Bigeye Tuna
  51: { fam: 'tuna', h: 0.22, t: 'fork', c: ['#2a5a5a', '#e2e6e6'], f: '#3a5050', finletc: '#5a6a6a', dk: 0.6, ak: 0.6, p: 'none',
    marks: [{ k: 'lower', y: 0.0, c: '#e2e6e6', soft: 0.05 }, { k: 'diag', c: 'rgba(14,26,26,0.85)', a: 0.15, lw: 0.035, sp: 0.04, x: 0.55 }, { k: 'lower', y: 0.02, c: '#e2e6e6', soft: 0.02 }] }, // Atlantic Mackerel
  52: { fam: 'tuna', h: 0.15, t: 'lunate', c: ['#1e3a5e', '#c8d2da'], f: '#1e3a5e', mouth: 'big', teeth: 1, finletc: '#2a4a6a', p: 'none', dors: [{ a: 0.18, b: 0.5, s: 'even', h: 0.4, r: 0.15, n: 16 }, { a: 0.58, b: 0.66, s: 'tri', h: 0.5, r: 0.35 }],
    marks: [{ k: 'lower', y: 0.05, c: '#c8d2da', soft: 0.05 }, ...[0.25, 0.33, 0.41, 0.49, 0.57, 0.65, 0.73, 0.81].map((x) => ({ k: 'band', x, w: 0.025, c: 'rgba(58,106,160,0.8)', top: 0.6, bot: 0.25 }))] }, // Wahoo
  36: { fam: 'jack', h: 0.38, t: 'lunate', c: ['#3e464c', '#c0c6c8'], f: '#2c3236', scutes: '#22282c', topc: [[0, 0.35], [0.04, 0.72], [0.15, 0.95], [0.35, 1], [0.55, 0.9], [0.75, 0.5], [0.9, 0.18], [1, 0.12]], p: 'none' }, // Giant Trevally
  37: { fam: 'jack', h: 0.36, t: 'lunate', c: ['#4a7a9a', '#d0d8dc'], f: '#3a8ad0', scutes: '#2a4a6a', p: 'none', marks: [{ k: 'dots', c: '#1a2a38', n: 30, r: 0.02, from: 0.15, to: 0.8, spread: 0.6, y: -0.1 }] }, // Bluefin Trevally
  263: { fam: 'jack', h: 0.24, t: 'fork', c: ['#2a4a7a', '#d8dce0'], f: '#c8c060', tailc: '#d8c870', p: 'none',
    marks: [{ k: 'hlines', c: '#5ab0e8', n: 2, y0: -0.12, y1: 0.08, from: 0.0, to: 1, lw: 0.04 }, { k: 'hlines', c: '#e8c840', n: 1, y0: -0.02, y1: -0.02, from: 0.0, to: 1, lw: 0.05 }] }, // Rainbow Runner
  264: { fam: 'jack', h: 0.3, t: 'fork', c: ['#6a6448', '#d8d8d0'], f: '#7a7050', scutes: '#5a5440', p: 'none',
    marks: [{ k: 'eyeband', c: 'rgba(110,80,40,0.8)', w: 0.03, tilt: -0.8, up: 0.5, down: 0.1 }, { k: 'hlines', c: 'rgba(200,160,70,0.6)', n: 1, y0: -0.05, y1: -0.05, from: 0.1, to: 1, lw: 0.04 }] }, // Greater Amberjack
  265: { fam: 'jack', h: 0.28, t: 'fork', c: ['#6a7a8a', '#c8d0d8'], f: '#3a4450', tailtips: 1, p: 'none',
    marks: [0.24, 0.38, 0.52, 0.66, 0.8].map((x) => ({ k: 'band', x, w: 0.07, c: 'rgba(30,36,46,0.8)' })) }, // Pilot Fish
  295: { fam: 'jack', h: 0.26, t: 'fork', c: ['#3a5a5a', '#d8dede'], f: '#4a5a5a', scutes: '#2a3a3a', eyek: 1.4, p: 'none' }, // Atlantic Horse Mackerel
  45: { fam: 'jack', h: 0.3, t: 'fork', c: ['#2f8a6a', '#d8c24a'], f: '#3a7a8a', topc: [[0, 0.75], [0.03, 0.98], [0.1, 1.05], [0.3, 1], [0.55, 0.88], [0.75, 0.5], [0.9, 0.2], [1, 0.12]], p: 'none',
    dors: [{ a: 0.08, b: 0.88, s: 'even', h: 0.22, r: 0.12, n: 30 }], anal: [{ a: 0.5, b: 0.88, s: 'even', h: 0.18, r: 0.15 }], marks: [{ k: 'dots', c: '#2a5a8a', n: 34, r: 0.025, from: 0.1, to: 0.85 }, { k: 'lower', y: 0.15, c: 'rgba(216,194,74,0.8)', soft: 0.1 }] }, // Mahi-mahi
  47: { fam: 'herring', h: 0.2, t: 'fork', c: ['#2a4a7a', '#d8dee4'], f: '#4a6a90', wings: 1, pecc: '#a8c4dc', p: 'none' }, // Tropical Two-wing Flyingfish
  48: { fam: 'herring', h: 0.24, t: 'fork', c: ['#3a5a6e', '#dfe6ea'], f: '#6a7a84', p: 'none', marks: [{ k: 'lower', y: -0.08, c: '#dfe6ea', soft: 0.12 }] }, // Atlantic Herring
  49: { fam: 'herring', h: 0.22, t: 'fork', c: ['#355a70', '#e0e8ec'], f: '#6a7a84', p: 'none', marks: [{ k: 'lower', y: -0.08, c: '#e0e8ec', soft: 0.1 }, { k: 'hlines', c: 'rgba(26,42,52,0.0)', n: 1 }, ...[0.25, 0.33, 0.41, 0.49, 0.57, 0.65].map((x) => ({ k: 'spot', x, y: -0.05, r: 0.05, c: '#1a2a34' }))] }, // Pacific Sardine
  50: { fam: 'herring', h: 0.18, t: 'fork', c: ['#3e6070', '#dce4e8'], f: '#7a8a94', mouth: 'big', mouthy: 0.04, eyek: 1.5, p: 'none', marks: [{ k: 'hlines', c: '#c8d8e0', n: 1, y0: 0, y1: 0, from: 0.1, to: 1, lw: 0.12 }] }, // Northern Anchovy
  294: { fam: 'herring', h: 0.18, t: 'fork', c: ['#5a6a4a', '#d8dccc'], f: '#6a7a5a', p: 'none', marks: [{ k: 'lower', y: -0.05, c: '#d8dccc', soft: 0.1 }] }, // Capelin
  38: { fam: 'herring', h: 0.28, t: 'fork', c: ['#5a6e7a', '#e6eaec'], f: '#5a6a74', bigscale: 1, mouth: 'up', mouthy: 0.0, dfil: 1, dfilh: 0.8, p: 'none' }, // Atlantic Tarpon
  35: { fam: 'pike', h: 0.15, t: 'fork', c: ['#5a6a74', '#dfe6ea'], f: '#4a5a64', teeth: 1, p: 'none',
    marks: [...[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8].map((x) => ({ k: 'band', x, w: 0.03, c: 'rgba(40,52,60,0.6)', top: 0.6, bot: 0.0, tilt: 0.2 })), { k: 'dots', c: '#14181c', n: 10, r: 0.06, from: 0.4, to: 0.95, spread: 0.2, y: 0.3 }] }, // Great Barracuda
  55: { fam: 'salmon', h: 0.25, t: 'trunc', c: ['#4a5e6a', '#e6eaec'], f: '#5a6a74', p: 'none', marks: [{ k: 'lower', y: -0.05, c: '#e6eaec', soft: 0.1 }, { k: 'dots', c: '#1e262c', n: 22, r: 0.025, from: 0.1, to: 0.7, spread: 0.3, y: -0.25 }] }, // Atlantic Salmon
  56: { fam: 'salmon', h: 0.26, t: 'trunc', c: ['#3e5a5a', '#e0e4e4'], f: '#4a5a5a', tailc: '#3a4a4a', p: 'none', marks: [{ k: 'lower', y: -0.05, c: '#e0e4e4', soft: 0.1 }, { k: 'dots', c: '#1a2222', n: 40, r: 0.025, from: 0.15, to: 1, spread: 0.35, y: -0.28 }] }, // Chinook Salmon
  57: { fam: 'salmon', h: 0.27, t: 'trunc', c: ['#3a5a8a', '#e0e6ea'], f: '#4a6a8a', p: 'none', marks: [{ k: 'lower', y: -0.05, c: '#e0e6ea', soft: 0.1 }] }, // Sockeye Salmon
  290: { fam: 'salmon', h: 0.25, t: 'trunc', c: ['#4a5a4a', '#e8804a'], f: '#e86a3a', finedge: '#f0ece0', p: 'none', marks: [{ k: 'dots', c: '#e8d8b0', n: 30, r: 0.03, from: 0.1, to: 0.95, spread: 0.5, y: -0.15 }, { k: 'lower', y: 0.15, c: '#e8703a', soft: 0.08 }] }, // Arctic Char
  291: { fam: 'salmon', h: 0.27, t: 'trunc', c: ['#4a6070', '#e2e8ea'], f: '#5a6a74', tailc: '#4a5a64', topc: [[0, 0.2], [0.06, 0.6], [0.18, 1], [0.32, 1.12], [0.5, 1.05], [0.7, 0.7], [0.88, 0.38], [1, 0.28]], p: 'none',
    marks: [{ k: 'lower', y: -0.05, c: '#e2e8ea', soft: 0.1 }, { k: 'dots', c: '#1a2228', n: 14, r: 0.04, from: 0.5, to: 1, spread: 0.35, y: -0.2 }] }, // Pink Salmon
  292: { fam: 'salmon', h: 0.26, t: 'trunc', c: ['#3a5a7a', '#e2e6ea'], f: '#4a6a8a', p: 'none', marks: [{ k: 'lower', y: -0.05, c: '#e2e6ea', soft: 0.1 }, { k: 'dots', c: '#1a2430', n: 16, r: 0.025, from: 0.2, to: 0.9, spread: 0.25, y: -0.3 }] }, // Coho Salmon
  293: { fam: 'salmon', h: 0.25, t: 'trunc', c: ['#4a5a5a', '#e6eaea'], f: '#5a6a6a', p: 'none', marks: [{ k: 'hlines', c: 'rgba(216,120,140,0.7)', n: 1, y0: 0.0, y1: 0.0, from: 0.15, to: 1, lw: 0.08 }, { k: 'dots', c: '#1e2626', n: 40, r: 0.018, from: 0.1, to: 1, spread: 0.6, y: -0.15 }] }, // Steelhead
  58: { fam: 'snapper', h: 0.3, t: 'trunc', c: ['#5a6a60', '#e4e6e2'], f: '#6a746c', p: 'none', marks: [{ k: 'hlines', c: 'rgba(42,48,44,0.8)', n: 7, y0: -0.36, y1: 0.24, from: 0.15, to: 1, lw: 0.03 }] }, // Atlantic Striped Bass
  296: { fam: 'snapper', h: 0.3, t: 'fork', c: ['#5a6670', '#e2e6e8'], f: '#5a6670', gillspot: '#2a2e32', p: 'none' }, // European Seabass
  297: { fam: 'grouper', h: 0.36, t: 'trunc', c: ['#2a2a30', '#3a3a42'], f: '#2a2a30', finedge: '#e8e4dc', hump: 1, p: 'none', marks: [{ k: 'dots', c: 'rgba(200,200,210,0.25)', n: 40, r: 0.03 }, { k: 'saddle', x: 0.15, y: 0.42, w: 0.08, h: 0.12, c: '#3a5ab0' }] }, // Black Sea Bass
  303: { fam: 'grouper', h: 0.32, t: 'trunc', c: ['#6a5a40', '#a89a7a'], f: '#6a5a40', p: 'none', marks: [{ k: 'dots', c: 'rgba(230,222,200,0.6)', n: 24, r: 0.06, from: 0.15, to: 0.95, spread: 0.6, y: -0.12 }] }, // Kelp Bass
  304: { fam: 'damsel', h: 0.48, t: 'trunc', c: ['#4a5a3a', '#6a7a54'], f: '#4a5a3a', eyec: '#5ab0d8', p: 'none', marks: [{ k: 'spot', x: 0.42, y: -0.32, r: 0.06, c: '#e8e6dc' }, { k: 'spot', x: 0.62, y: -0.3, r: 0.06, c: '#e8e6dc' }] }, // Opaleye
  60: { fam: 'cod', h: 0.25, t: 'trunc', c: ['#6a6a4a', '#e4e0d0'], f: '#6a6a4a', p: 'none', marks: [{ k: 'dots', c: '#3a3a28', n: 50, r: 0.025, from: 0.05, to: 1, spread: 0.7, y: -0.1 }, { k: 'hlines', c: 'rgba(240,236,220,0.6)', n: 1, y0: -0.05, y1: -0.05, from: 0.2, to: 1, lw: 0.025 }] }, // Atlantic Cod
  61: { fam: 'cod', h: 0.25, t: 'fork', c: ['#4e545a', '#dcdcdc'], f: '#4e545a', p: 'none', marks: [{ k: 'hlines', c: '#14161a', n: 1, y0: -0.08, y1: -0.08, from: 0.2, to: 1, lw: 0.025 }, { k: 'spot', x: 0.3, y: -0.12, r: 0.08, c: '#14161a' }] }, // Haddock
  62: { fam: 'cod', h: 0.22, t: 'trunc', c: ['#5a6050', '#dcdccc'], f: '#5a6050', p: 'none', marks: [{ k: 'dots', c: '#3a3e30', n: 40, r: 0.02, from: 0.1, to: 1, spread: 0.6, y: -0.15 }] }, // Alaska Pollock
  285: { fam: 'cod', h: 0.26, t: 'trunc', c: ['#7a6a52', '#e2dccc'], f: '#7a6a52', p: 'none', marks: [{ k: 'dots', c: '#4a3a28', n: 40, r: 0.03, from: 0.05, to: 1, spread: 0.7, y: -0.1 }] }, // Pacific Cod
  286: { fam: 'cod', h: 0.22, t: 'fork', c: ['#3a4a44', '#b8bcb6'], f: '#3a4a44', barbel: 0, p: 'none', marks: [{ k: 'hlines', c: 'rgba(220,226,220,0.7)', n: 1, y0: -0.05, y1: -0.05, from: 0.2, to: 1, lw: 0.025 }] }, // Saithe
  287: { fam: 'wolf', h: 0.15, t: 'round', c: ['#7a6a4a', '#c8b898'], f: '#6a5a3a', barbel: 1, p: 'none', dors: [{ a: 0.24, b: 0.38, s: 'soft', h: 0.35, r: 0.2 }, { a: 0.42, b: 0.96, s: 'even', h: 0.28, r: 0.1, n: 20 }], marks: [{ k: 'dots', c: 'rgba(60,46,30,0.5)', n: 24, r: 0.04 }] }, // Ling
  288: { fam: 'cod', h: 0.2, t: 'trunc', c: ['#6a7078', '#dfe2e6'], f: '#6a7078', barbel: 0, teeth: 1, p: 'none', dors: [{ a: 0.26, b: 0.36, s: 'tri', h: 0.35, r: 0.2 }, { a: 0.42, b: 0.92, s: 'even', h: 0.2, r: 0.12, n: 18 }], anal: [{ a: 0.45, b: 0.9, s: 'even', h: 0.18, r: 0.12, n: 16 }] }, // European Hake
  73: { fam: 'cod', h: 0.22, t: 'fork', c: ['#1e2226', '#4a4e54'], f: '#1e2226', barbel: 0, mouth: 'small', p: 'none', dors: [{ a: 0.3, b: 0.42, s: 'tri', h: 0.3, r: 0.2 }, { a: 0.6, b: 0.75, s: 'tri', h: 0.28, r: 0.25 }], anal: [{ a: 0.62, b: 0.76, s: 'tri', h: 0.26, r: 0.25 }] }, // Sablefish
  68: { fam: 'sculpin', h: 0.24, t: 'trunc', c: ['#5a5a4a', '#a8a490'], f: '#4a4a3a', teeth: 1, fan: 0, p: 'none', marks: [{ k: 'maze', c: 'rgba(40,40,30,0.5)', n: 30, lw: 0.035 }, { k: 'dots', c: 'rgba(200,180,120,0.4)', n: 20, r: 0.04 }] }, // Lingcod
  298: { fam: 'sculpin', h: 0.3, t: 'round', c: ['#6a4a3a', '#a88a6a'], f: '#6a4a3a', cirri: '#6a4a3a', p: 'none', marks: [{ k: 'maze', c: 'rgba(90,110,60,0.5)', n: 30, lw: 0.04 }, { k: 'dots', c: 'rgba(40,26,20,0.5)', n: 24, r: 0.05 }] }, // Cabezon
  299: { fam: 'sculpin', h: 0.22, t: 'trunc', c: ['#6a6a66', '#b8b8b0'], f: '#5a5a56', fan: 0, mouth: 'small', p: 'none', marks: [{ k: 'dots', c: '#4a8ad8', n: 30, r: 0.035, from: 0.05, to: 0.6 }] }, // Kelp Greenling
  69: { fam: 'grouper', h: 0.36, t: 'trunc', c: ['#c8502a', '#e8905a'], f: '#c04a28', eyec: '#e8c82a', eyek: 1.3, dk: 1.6, finedge: '#1a1a1a', p: 'none' }, // Yelloweye Rockfish
  300: { fam: 'grouper', h: 0.34, t: 'trunc', c: ['#1a1a1e', '#2a2a2e'], f: '#1a1a1e', dk: 1.5, p: 'none', marks: [{ k: 'dots', c: '#e8c43a', n: 24, r: 0.03 }, { k: 'hlines', c: '#e8c43a', n: 1, y0: -0.12, y1: -0.12, from: 0.4, to: 1.05, lw: 0.07, rise: -0.25 }] }, // China Rockfish
  301: { fam: 'grouper', h: 0.34, t: 'trunc', c: ['#c42a2a', '#e86a5a'], f: '#c42a2a', dk: 1.5, p: 'none', marks: [{ k: 'maze', c: 'rgba(120,20,20,0.4)', n: 20, lw: 0.035 }] }, // Vermilion Rockfish
  302: { fam: 'grouper', h: 0.34, t: 'trunc', c: ['#3a4a6a', '#7a8aa0'], f: '#3a4a6a', dk: 1.4, p: 'none', marks: [{ k: 'maze', c: 'rgba(20,26,40,0.5)', n: 24, lw: 0.04 }] }, // Blue Rockfish
  70: { fam: 'wolf', h: 0.2, t: 'round', c: ['#5a6068', '#8a9098'], f: '#4a5058', teeth: 1, p: 'none', marks: [...[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((x) => ({ k: 'band', x, w: 0.035, c: 'rgba(30,36,42,0.55)', top: 0.6, bot: 0.1 }))] }, // Atlantic Wolffish
  71: { fam: 'wrasse', h: 0.38, t: 'trunc', c: ['#c43a3a', '#d65a50'], f: '#18181c', mouth: 'big', teeth: 1, topc: [[0, 0.3], [0.04, 0.7], [0.12, 1.02], [0.3, 0.98], [0.5, 1], [0.7, 0.86], [0.88, 0.52], [1, 0.4]], p: 'none',
    marks: [{ k: 'face', c: '#16161a', to: 0.28 }, { k: 'rear', from: 0.78, c: '#16161a', soft: 0.04 }, { k: 'band', x: 0.04, w: 0.06, c: '#ece8e0', top: -0.05, bot: 0.4 }] }, // California Sheephead
  74: { fam: 'squirrel', h: 0.45, t: 'fork', c: ['#d0542a', '#e6804a'], f: '#c84a24', eyek: 1.6, p: 'none', marks: [{ k: 'maze', c: 'rgba(140,40,20,0.35)', n: 14, lw: 0.03, to: 0.3 }] }, // Orange Roughy
  75: { fam: 'grouper', h: 0.26, t: 'trunc', c: ['#3a3a36', '#7a766c'], f: '#2e2e2a', p: 'none', marks: [{ k: 'maze', c: 'rgba(30,30,26,0.45)', n: 26, lw: 0.04 }] }, // Patagonian Toothfish
  266: { fam: 'herring', h: 0.14, t: 'trunc', c: ['#2a2a2e', '#4a4a50'], f: '#2a2a2e', sucker: 1, mouth: 'big', p: 'none', dors: [{ a: 0.55, b: 0.88, s: 'even', h: 0.4, r: 0.15 }], anal: [{ a: 0.55, b: 0.88, s: 'even', h: 0.38, r: 0.15 }],
    marks: [{ k: 'hlines', c: 'rgba(220,220,220,0.35)', n: 2, y0: -0.15, y1: 0.15, from: 0.05, to: 1, lw: 0.05 }] }, // Common Remora
  267: { fam: 'needle', h: 0.12, t: 'fork', c: ['#2a4a6a', '#d8e0e6'], f: '#4a6a80', jaw: 0.06, finlets: 1, finletc: '#4a6a80', p: 'none', marks: [{ k: 'lower', y: -0.05, c: '#d8e0e6', soft: 0.1 }] }, // Pacific Saury
  268: { fam: 'needle', h: 0.08, t: 'fork', c: ['#2a5a6a', '#d0dce0'], f: '#3a6a7a', jaw: 0.2, p: 'none', marks: [{ k: 'lower', y: 0.0, c: '#d0dce0', soft: 0.1 }] }, // Houndfish
  271: { fam: 'pike', h: 0.1, t: 'fork', c: ['#a8b0b8', '#d8dcdf'], f: '#4a4a52', teeth: 1, eyek: 1.5, p: 'none', dors: [{ a: 0.1, b: 0.62, s: 'soft', h: 1.8, r: 0.25, n: 26, op: 0.75 }], anal: [{ a: 0.68, b: 0.78, s: 'tri', h: 0.6, r: 0.3 }], marks: [{ k: 'dots', c: 'rgba(60,60,70,0.4)', n: 20, r: 0.08 }] }, // Longnose Lancetfish
  272: { fam: 'tuna', h: 0.22, t: 'fork', c: ['#2a2420', '#4a4038'], f: '#2a2420', finletc: '#3a3028', eyek: 1.6, p: 'none' }, // Escolar
  289: { fam: 'puffer', h: 0.6, t: 'round', c: ['#5a7a6a', '#a8b898'], f: '#5a7a6a', mouth: 'small', p: 'none', dors: [{ a: 0.3, b: 0.6, s: 'lobe', h: 0.2, r: 0.2, op: 0.95 }, { a: 0.72, b: 0.87, s: 'lobe', h: 0.22, r: 0.3 }],
    marks: [{ k: 'dots', c: 'rgba(40,60,50,0.55)', n: 40, r: 0.04 }, { k: 'lower', y: 0.2, c: 'rgba(220,200,120,0.6)', soft: 0.1 }] }, // Lumpsucker
  305: { fam: 'goby', h: 0.18, t: 'round', c: ['#5a4a5a', '#d8b860'], f: '#5a4a5a', eyek: 1.1, p: 'none', dors: [{ a: 0.2, b: 0.26, s: 'spike', h: 0.25, r: 0.1, n: 4 }, { a: 0.3, b: 0.92, s: 'even', h: 0.25, r: 0.1, n: 22 }],
    marks: [...[0.15, 0.22, 0.29, 0.36, 0.43, 0.5, 0.57, 0.64, 0.71, 0.78].map((x) => ({ k: 'spot', x, y: 0.32, r: 0.03, c: '#e8e0c8' }))] }, // Plainfin Midshipman

  // ---------- batch 5: the deep ----------
  // anglers: one family, each with what makes it itself; the legend with its own body
  100: { c: ['#0a0808', '#1a1310'], glow: '#d8f4ff', fangk: 1.35, fangs2: 1, spikes: 1, scars: 1, flank: '#6ad0ff', eyeglow: '#6ad0ff', eyec: '#9ae0ff', rodk: 1.5, bulbk: 1.5, legendLure: 1, warty: 0 }, // the Anglerfish (legendary)
  67: { fringe: 1 }, // Monkfish
  323: { warts3: 1, glow: '#7ad8ff' }, // Triplewart Seadevil
  324: { warty: 1, branch: 1, glow: '#9affd8' }, // Atlantic Footballfish
  325: { whiskers: 1, glow: '#c8b0ff', c: ['#4a3628', '#5e4836'] }, // Hairy Angler
  326: { whip: 1.35, glow: '#9affd8' }, // Whipnose Angler
  452: { hooks: 1, glow: '#9affd8', fangk: 1.2 }, // Wolftrap Angler
  453: { nolure: 1 }, // Ghostly Seadevil
  // dragonfish: each its own barbel, lights and teeth; the legend a heavier, brighter animal
  103: { barbelk: 1, cheek: 1.2 }, // Black Dragonfish
  320: { barbelk: 0.35, cheek: 2.4, cheekc: '#ff2a1a', nofloor: 1, fangk: 1.4 }, // Stoplight Loosejaw
  321: { hexscale: 1, barbelk: 0.6, c: ['#121a1a', '#26383a'] }, // Scaly Dragonfish
  322: { barbelk: 1.4, fangk: 1.3, h: 0.045 }, // Pacific Blackdragon
  447: { barbelk: 2.2, glow: '#ff7a4a' }, // Threadfin Dragonfish
  487: { pelthreads: 1, barbelk: 0.5 }, // Highfin Dragonfish
  488: { snag: 1, fangk: 1.5, h: 0.12, barbelk: 0.45 }, // Snaggletooth
  2103: { c: ['#080606', '#1a1010'], glow: '#ff5a4a', glow2: '#6ad0ff', rows2: 1, barbels2: 1, fangk: 1.6, cheek: 2, cheekc: '#ff4a3a', hexscale: 1, h: 0.075 }, // the Dragonfish (legendary)
  // the deep fish that were on the plain body
  98: { fam: 'herring', h: 0.24, t: 'fork', c: ['#2e3a46', '#8a96a0'], f: '#2e3a46', eyek: 1.7, photo: 1, mouth: 'big', mouthy: 0.03, p: 'none' }, // Spotted Lanternfish
  450: { fam: 'herring', h: 0.22, t: 'fork', c: ['#3a4a5a', '#a8b4bc'], f: '#3a4a5a', eyek: 1.8, photo: 1, mouth: 'big', mouthy: 0.03, p: 'none' }, // Glacier Lanternfish
  327: { fam: 'herring', h: 0.12, t: 'fork', c: ['#2a2a2a', '#4a4a4a'], f: '#2a2a2a', photo: 1, mouth: 'big', teeth: 1, eyek: 0.8, p: 'none' }, // Bristlemouth
  328: { fam: 'needle', h: 0.05, t: 'fork', c: ['#c8ccd2', '#e6e8ea'], f: '#d0322a', mouth: 'small', tubeeye: 'fwd', p: 'none', dors: [{ a: 0.18, b: 0.32, s: 'tri', h: 3, r: 0.3, op: 0.8 }] }, // Tube-eye
  331: { fam: 'pike', h: 0.15, t: 'trunc', c: ['#4a4a42', '#7a7a6a'], f: '#4a4a42', teeth: 1, eyek: 1.2, topc: [[0, 0.3], [0.05, 0.6], [0.2, 0.85], [0.5, 1], [0.8, 0.7], [1, 0.4]], p: 'none', dors: [{ a: 0.4, b: 0.5, s: 'tri', h: 0.6, r: 0.3 }], marks: [{ k: 'dots', c: 'rgba(30,30,24,0.4)', n: 16, r: 0.08 }] }, // Deep-sea Lizardfish
  492: { fam: 'pike', h: 0.14, t: 'trunc', c: ['#a8a090', '#d0c8b8'], f: '#a8a090', teeth: 1, eyek: 0.7, p: 'none', dors: [{ a: 0.38, b: 0.5, s: 'tri', h: 1.0, r: 0.35 }], anal: [{ a: 0.7, b: 0.8, s: 'tri', h: 0.4, r: 0.3 }] }, // Highfin Lizardfish
  335: { fam: 'wolf', h: 0.07, t: 'fork', c: ['#1a1a1e', '#2a2a30'], f: '#1a1a1e', teeth: 1, eyek: 1.8, mouth: 'big', mouthy: 0.0, topc: [[0, 0.2], [0.04, 0.6], [0.12, 1], [0.5, 0.95], [0.85, 0.6], [1, 0.3]], p: 'none' }, // Black Scabbardfish
  336: { fam: 'herring', h: 0.16, t: 'fork', c: ['#a8b4bc', '#d8e0e4'], f: '#a8b4bc', tubeeye: 'fwd', eyek: 1.6, mouth: 'big', p: 'none' }, // Telescopefish
  338: { fam: 'herring', h: 0.22, t: 'fork', c: ['#5a5e64', '#8a8e94'], f: '#5a5e64', eyek: 1.8, scale0: 0.3, p: 'none' }, // Smallscale Slickhead
  448: { fam: 'herring', h: 0.1, t: 'fork', c: ['#a89a8a', '#d8d0c4'], f: '#c8bcae', tubeeye: 'up', eyek: 1.7, p: 'none', marks: [{ k: 'face', c: '#7a5a40', to: 0.08 }] }, // Brownsnout Spookfish
  456: { fam: 'pike', h: 0.07, t: 'fork', c: ['#9aa4ac', '#d8dee2'], f: '#8a949c', teeth: 1, eyek: 1.3, p: 'none' }, // Daggertooth
  457: { fam: 'herring', h: 0.16, t: 'fork', c: ['#4a4a46', '#8a8a80'], f: '#4a4a46', tubeeye: 'up', eyek: 1.5, teeth: 1, mouth: 'big', p: 'none' }, // Sabertooth Fish
  458: { fam: 'herring', h: 0.15, t: 'fork', c: ['#9aa0a4', '#dce0e2'], f: '#9aa0a4', tubeeye: 'up', eyek: 1.6, eyec: '#e8f0f0', p: 'none' }, // Pearleye
  482: { fam: 'wolf', h: 0.12, t: 'round', c: ['#c0c6ca', '#e4e8ea'], f: '#d03a2a', dfc: '#d03a2a', mouth: 'small', p: 'none', dors: [{ a: 0.02, b: 0.96, s: 'even', h: 0.45, r: 0.1, n: 30 }], topc: [[0, 0.6], [0.04, 1.1], [0.1, 1], [0.5, 0.85], [0.85, 0.5], [1, 0.25]] }, // Crestfish
  485: { fam: 'squirrel', h: 0.3, t: 'fork', c: ['#2a2420', '#4a3e36'], f: '#2a2420', bigscale: 1, eyek: 0.7, topc: [[0, 0.5], [0.05, 0.85], [0.15, 1.05], [0.35, 1], [0.6, 0.88], [0.8, 0.55], [1, 0.28]], p: 'none' }, // Crested Bigscale
  486: { fam: 'herring', h: 0.2, t: 'fork', c: ['#1e1e24', '#3a3a42'], f: '#1e1e24', eyek: 1.7, p: 'none', marks: [{ k: 'spot', x: 0.3, y: -0.15, r: 0.06, c: '#5ac8ff' }] }, // Shining Tubeshoulder

  // ---------- batch 6: the legends' own bodies ----------
  2102: { c: ['#1a1428', '#3a2e52'], glow: '#c8a8ff', lures: 3, streamers: 4, streamc: '#8a7ab8', crestL: [0.12, 0.45, 0.9], crestc: '#2a2240' }, // the Viperfish
  2106: { c: ['#0e0c0c', '#2a1e1a'], lures: 1, glow: '#ff8a5a', streamers: 3, streamc: '#5a4a44', crestL: [0.14, 0.42, 0.75], crestc: '#2a201c' }, // the Swallower
  2109: { c: ['#8a847a', '#bdb6a8'], crestL: [0.04, 0.24, 1.3], glowbarbel: 1, glow: '#9ae8c8', streamers: 1, streamc: '#bdb6a8' }, // the Grenadier
  54: { paddles: 1, streamers: 3, streamc: '#d0322a', crestL: [0.0, 0.08, 2.4], crestc: '#d0322a' }, // the Oarfish

  2162: { legendOver: { spikes: [0.42, 0.2, 14, 0.07, '#d8ccb4'], speckle: [0.35, 0.15, 30, '#efe6d0'] } }, // the Isopod
  2150: { legendOver: { lights: [0.32, 0.26, 8, '#7ad8ff'], speckle: [0.2, 0.2, 20, '#ff7a6a'] } }, // the Vampire Squid
  2146: { legendOver: { speckle: [0.3, 0.25, 40, '#f0e0ff'], lights: [0.38, 0.22, 4, '#c8b0ff'] } }, // the Dumbo
  2110: { legendOver: { threads: [-0.1, -0.05, 5, 0.3, '#c8e8f0'], speckle: [0.3, 0.06, 20, '#bfe8ff'] } }, // the Tripod
  107: { legendOver: { speckle: [0.3, 0.22, 30, '#ffd8e0'], spikes: [0.33, 0.25, 9, 0.035, '#c89a94'] } }, // the Blobfish
};
