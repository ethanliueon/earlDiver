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
};
