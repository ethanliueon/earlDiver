// Visual + behaviour descriptors for each species. Drawing lives in creatures_draw.js.
// Colours are chosen from the reference photos: natural, slightly muted.
import { SPECIES_DATA } from '../data/species_data.js';
import { MORE_SPECIES } from '../data/species_more.js';

// s = shape renderer, h = body height / length, t = tail type, d = dorsal style,
// c = [back, belly], p = pattern, pc = pattern colour, f = fin colour,
// hab = habitat behaviour, sch = typical school size, glow = bioluminescence colour
const V = {
  1: { s: 'fish', h: 0.46, t: 'round', d: 'spiny', c: ['#d9581a', '#ee8a40'], p: 'bands', pc: '#f1ede2', n: 3, edge: '#161210', f: '#d9581a', hab: 'reef', sch: 3 },
  2: { s: 'fish', h: 0.55, t: 'trunc', c: ['#1c4ea6', '#2f6cc4'], p: 'palette', pc: '#0e1420', f: '#1c3f8a', tailc: '#e2bb2a', hab: 'reef', sch: 4 },
  3: { s: 'fish', h: 0.85, t: 'trunc', snout: 0.5, c: ['#f0c624', '#f4d64a'], f: '#e8be20', hab: 'reef', sch: 6 },
  4: { s: 'fish', h: 1.0, t: 'trunc', d: 'filament', snout: 0.6, c: ['#ece6d2', '#f2ecd8'], p: 'bands', pc: '#121212', n: 2, f: '#e6c43a', hab: 'reef', sch: 2 },
  5: { s: 'fish', h: 0.8, t: 'round', d: 'trail', c: ['#3a74b8', '#d7c03a'], p: 'none', f: '#e3c330', hab: 'reef' },
  6: { s: 'fish', h: 0.75, t: 'round', c: ['#1d3d98', '#26489f'], p: 'stripes', pc: '#e6c43e', n: 9, f: '#e6c43e', hab: 'reef' },
  7: { s: 'fish', h: 0.85, t: 'trunc', snout: 1.0, c: ['#ece8dc', '#f3efe5'], p: 'bands', pc: '#c8742a', n: 4, f: '#d7822e', eyespot: 1, hab: 'reef', sch: 2 },
  8: { s: 'fish', h: 0.8, t: 'trunc', d: 'filament', snout: 0.4, c: ['#f2efe6', '#f4f2ea'], p: 'chev', pc: '#6b6a64', f: '#e8c22a', hab: 'reef', sch: 2 },
  9: { s: 'fish', h: 0.35, t: 'round', c: ['#1f5aa8', '#e2752a'], p: 'swirl', pc: '#e2752a', f: '#2565b0', hab: 'floor-swim' },
  10: { s: 'fish', h: 0.4, t: 'round', d: 'lion', c: ['#b8402c', '#e6cfc0'], p: 'bands', pc: '#f2e6dc', n: 12, f: '#b8402c', hab: 'reef' },
  11: { s: 'stone', h: 0.55, c: ['#6b5a48', '#8a7660'], hab: 'floor' },
  12: { s: 'frog', h: 0.8, c: ['#c89a3a', '#d8b45a'], hab: 'floor' },
  13: { s: 'fish', h: 0.4, t: 'trunc', beak: 1, c: ['#2f7c5c', '#6fae86'], p: 'none', f: '#3b8a6a', hab: 'reef' },
  14: { s: 'fish', h: 0.45, t: 'trunc', beak: 1, hump: 1, c: ['#4a6560', '#6d857c'], f: '#4a6560', hab: 'reef', sch: 5 },
  15: { s: 'fish', h: 0.42, t: 'round', hump: 1, lips: 1, c: ['#2f6e68', '#5c938a'], p: 'mottle', pc: '#24524e', f: '#2f6e68', hab: 'reef' },
  16: { s: 'fish', h: 0.22, t: 'trunc', c: ['#3d7cc4', '#a8c8e8'], p: 'stripe1', pc: '#12161e', f: '#3d7cc4', hab: 'reef' },
  17: { s: 'fish', h: 0.35, t: 'trunc', c: ['#7a3aa0', '#e6c02a'], p: 'half', f: '#a24aa0', hab: 'reef', sch: 3 },
  18: { s: 'box', h: 0.6, c: ['#1d2230', '#2a3040'], p: 'spots', pc: '#e8e8e0', hab: 'reef' },
  19: { s: 'fish', h: 0.55, t: 'round', spiny: 1, bigeye: 1, c: ['#a08a62', '#e8e0cc'], p: 'spots', pc: '#3a3024', f: '#a89470', hab: 'reef' },
  20: { s: 'fish', h: 0.5, t: 'trunc', c: ['#b8ad92', '#ece8dc'], p: 'lines', pc: '#2b5e9a', f: '#8a8070', hab: 'reef' },
  21: { s: 'fish', h: 0.5, t: 'trunc', c: ['#5f6a42', '#b8a65a'], p: 'mottle', pc: '#2f3524', f: '#6a5a2a', hab: 'reef' },
  22: { s: 'fish', h: 0.5, t: 'trunc', c: ['#15171a', '#1c1e22'], p: 'bellyspots', pc: '#ecebe4', f: '#18191c', lips: 1, hab: 'reef' },
  23: { s: 'eel', h: 0.07, c: ['#4f6a26', '#6a8434'], hab: 'floor-swim' },
  24: { s: 'eel', h: 0.08, c: ['#6a5838', '#8a7650'], p: 'spots', pc: '#2a2218', hab: 'floor-swim' },
  25: { s: 'eel', h: 0.035, c: ['#1f50b8', '#e8c82a'], f: '#e8c82a', hab: 'floor-swim' },
  26: { s: 'gardeneel', h: 0.04, c: ['#d8d0b8', '#e8e2d0'], p: 'spots', pc: '#3a3428', hab: 'floor' },
  27: { s: 'fish', h: 0.5, t: 'fork', c: ['#d6c24a', '#dcdcd2'], p: 'bands', pc: '#1a1a1a', n: 5, f: '#9a9a90', hab: 'reef', sch: 8 },
  28: { s: 'fish', h: 0.45, t: 'fork', c: ['#2c6fd0', '#4a90e0'], f: '#2c6fd0', hab: 'reef', sch: 14 },
  29: { s: 'fish', h: 0.4, t: 'fork', c: ['#3e5f9a', '#d8c25a'], p: 'stripes', pc: '#e8c43a', n: 6, f: '#d8b83a', hab: 'reef', sch: 10 },
  30: { s: 'fish', h: 0.4, t: 'fork', c: ['#c45a5a', '#e8a8a0'], f: '#c45050', hab: 'demersal', sch: 4 },
  31: { s: 'fish', h: 0.38, t: 'round', lips: 1, c: ['#8a6a4a', '#d2c0a4'], p: 'bands', pc: '#4a3624', n: 5, f: '#7a5a3c', hab: 'demersal' },
  32: { s: 'fish', h: 0.38, t: 'round', lips: 1, c: ['#3c3c36', '#7a7462'], p: 'mottle', pc: '#c8b64a', f: '#2e2e2a', hab: 'demersal' },
  33: { s: 'fish', h: 0.4, t: 'round', lips: 1, c: ['#6a5a3e', '#9a8a68'], p: 'mottle', pc: '#3a3020', f: '#5a4a32', hab: 'demersal' },
  34: { s: 'fish', h: 0.33, t: 'trunc', c: ['#b83a32', '#d86a5a'], p: 'spots', pc: '#5ab4e8', f: '#a8322c', hab: 'reef' },
  35: { s: 'fish', h: 0.16, t: 'fork', jaw: 1, c: ['#6a7a84', '#dfe6ea'], p: 'bars', pc: '#3a4650', f: '#5a6a74', hab: 'pelagic', sch: 1 },
  36: { s: 'fish', h: 0.38, t: 'lunate', c: ['#4a5258', '#c8ced0'], f: '#2c3236', hab: 'pelagic', sch: 3 },
  37: { s: 'fish', h: 0.35, t: 'lunate', c: ['#4a7a9a', '#d0d8dc'], p: 'spots', pc: '#1a2a38', f: '#3a8ad0', hab: 'pelagic', sch: 3 },
  38: { s: 'fish', h: 0.28, t: 'fork', bigscale: 1, c: ['#5a6e7a', '#e6eaec'], f: '#5a6a74', hab: 'pelagic', sch: 2 },
  39: { s: 'fish', h: 0.3, t: 'lunate', finlets: 1, c: ['#14243e', '#c8d2d8'], f: '#1a2a40', hab: 'pelagic', sch: 5 },
  40: { s: 'fish', h: 0.28, t: 'lunate', finlets: 1, longfin: 1, c: ['#1c2c48', '#d0d8de'], f: '#e2b82a', hab: 'pelagic', sch: 6 },
  41: { s: 'fish', h: 0.3, t: 'lunate', finlets: 1, c: ['#1e2c4a', '#cad2d8'], p: 'bellystripes', pc: '#3a4658', f: '#1e2c4a', hab: 'pelagic', sch: 12 },
  42: { s: 'billfish', h: 0.2, bill: 0.45, c: ['#2a2e3a', '#a4aab2'], f: '#22262e', hab: 'pelagic' },
  43: { s: 'billfish', h: 0.18, bill: 0.25, sail: 1, c: ['#1e3050', '#c8ced4'], f: '#1a3a7a', hab: 'pelagic' },
  44: { s: 'billfish', h: 0.22, bill: 0.25, c: ['#16305a', '#c8d0d6'], p: 'bars', pc: '#5a8ad0', f: '#16305a', hab: 'pelagic' },
  45: { s: 'fish', h: 0.3, t: 'fork', blunt: 1, d: 'long', c: ['#2f8a6a', '#d8c24a'], p: 'spots', pc: '#2a5a6a', f: '#3a7a8a', hab: 'pelagic', sch: 3 },
  46: { s: 'mola', h: 1.1, c: ['#6e7884', '#a8b0b6'], hab: 'pelagic' },
  47: { s: 'fish', h: 0.2, t: 'fork', wings: 1, c: ['#2a4a7a', '#d8dee4'], f: '#4a6a90', hab: 'surface', sch: 6 },
  48: { s: 'fish', h: 0.25, t: 'fork', c: ['#3a5a6e', '#dfe6ea'], f: '#6a7a84', hab: 'pelagic', sch: 30 },
  49: { s: 'fish', h: 0.22, t: 'fork', c: ['#355a70', '#e0e8ec'], p: 'dots', pc: '#1a2a34', f: '#6a7a84', hab: 'pelagic', sch: 40 },
  50: { s: 'fish', h: 0.18, t: 'fork', c: ['#3e6070', '#dce4e8'], p: 'stripe1', pc: '#b8c8d0', f: '#7a8a94', hab: 'pelagic', sch: 50 },
  51: { s: 'fish', h: 0.22, t: 'fork', finlets: 1, c: ['#2a5a5a', '#e2e6e6'], p: 'wavy', pc: '#121c1c', f: '#3a5050', hab: 'pelagic', sch: 20 },
  52: { s: 'fish', h: 0.14, t: 'lunate', jaw: 1, c: ['#1e3a5e', '#c8d2da'], p: 'bars', pc: '#3a6aa0', f: '#1e3a5e', hab: 'pelagic' },
  53: { s: 'fish', h: 0.7, t: 'fork', c: ['#a43a4a', '#d0a8b0'], p: 'spots', pc: '#ece6e0', f: '#d8302a', hab: 'pelagic' },
  54: { s: 'oarfish', h: 0.03, c: ['#c8ccd2', '#e6e8ea'], f: '#d0322a', hab: 'pelagic' },
  55: { s: 'fish', h: 0.25, t: 'trunc', adipose: 1, c: ['#4a5e6a', '#e6eaec'], p: 'dots', pc: '#1e262c', f: '#5a6a74', hab: 'pelagic', sch: 4 },
  56: { s: 'fish', h: 0.26, t: 'trunc', adipose: 1, c: ['#3e5a5a', '#e0e4e4'], p: 'dots', pc: '#1a2222', f: '#4a5a5a', hab: 'pelagic', sch: 3 },
  57: { s: 'fish', h: 0.27, t: 'trunc', adipose: 1, c: ['#3a5a8a', '#e0e6ea'], f: '#4a6a8a', hab: 'pelagic', sch: 8 },
  58: { s: 'fish', h: 0.3, t: 'trunc', c: ['#5a6a60', '#e4e6e2'], p: 'stripes', pc: '#2a302c', n: 7, f: '#6a746c', hab: 'demersal', sch: 4 },
  59: { s: 'fish', h: 0.75, t: 'round', d: 'trail', jaw: 1, c: ['#8a8470', '#c4bea8'], p: 'thumb', pc: '#1e1c18', f: '#6a6454', hab: 'demersal' },
  60: { s: 'fish', h: 0.25, t: 'trunc', barbel: 1, c: ['#6a6a4a', '#e4e0d0'], p: 'dots', pc: '#3a3a28', f: '#6a6a4a', hab: 'demersal', sch: 4 },
  61: { s: 'fish', h: 0.25, t: 'fork', c: ['#4e545a', '#dcdcdc'], p: 'thumb', pc: '#14161a', f: '#4e545a', hab: 'demersal', sch: 6 },
  62: { s: 'fish', h: 0.22, t: 'trunc', c: ['#5a6050', '#dcdccc'], p: 'dots', pc: '#3a3e30', f: '#5a6050', hab: 'pelagic', sch: 25 },
  63: { s: 'flat', h: 0.45, c: ['#4a4438', '#5a5446'], p: 'mottle', pc: '#2e2a22', hab: 'floor' },
  64: { s: 'flat', h: 0.42, c: ['#4e4a3c', '#5e5a4a'], p: 'mottle', pc: '#2e2c22', hab: 'floor' },
  65: { s: 'flat', h: 0.5, c: ['#7a6a52', '#8a7a60'], p: 'spots', pc: '#d8742a', hab: 'floor' },
  66: { s: 'flat', h: 0.7, c: ['#6a5e4a', '#7a6e58'], p: 'mottle', pc: '#3a3428', hab: 'floor' },
  67: { s: 'angler', h: 0.5, flatten: 1, c: ['#5a4a3a', '#7a6a58'], p: 'mottle', pc: '#3a2e24', hab: 'floor' },
  68: { s: 'fish', h: 0.25, t: 'trunc', jaw: 1, c: ['#5a5a4a', '#a8a490'], p: 'mottle', pc: '#2e2e24', f: '#4a4a3a', hab: 'demersal' },
  69: { s: 'fish', h: 0.38, t: 'trunc', d: 'spiny', bigeye: 1, eyec: '#e8c82a', c: ['#c8502a', '#e8905a'], f: '#c04a28', hab: 'demersal' },
  70: { s: 'fish', h: 0.2, t: 'round', d: 'long', jaw: 1, c: ['#5a6068', '#8a9098'], p: 'bands', pc: '#2a3036', n: 10, f: '#4a5058', hab: 'floor-swim' },
  71: { s: 'fish', h: 0.38, t: 'trunc', c: ['#c43a3a', '#d65a50'], p: 'sheephead', pc: '#16161a', f: '#18181c', hab: 'demersal' },
  72: { s: 'fish', h: 0.5, t: 'round', c: ['#e8641a', '#f0802a'], f: '#e06018', hab: 'reef' },
  73: { s: 'fish', h: 0.22, t: 'fork', c: ['#1e2226', '#4a4e54'], f: '#1e2226', hab: 'demersal' },
  74: { s: 'fish', h: 0.45, t: 'fork', bigeye: 1, c: ['#d0542a', '#e6804a'], f: '#c84a24', hab: 'demersal', sch: 6 },
  75: { s: 'fish', h: 0.25, t: 'trunc', c: ['#3a3a36', '#7a766c'], p: 'mottle', pc: '#24241f', f: '#2e2e2a', hab: 'demersal' },
  76: { s: 'shark', h: 0.22, c: ['#5a646c', '#ecece8'], f: '#4a545c', hab: 'pelagic' },
  77: { s: 'shark', h: 0.2, wide: 1, c: ['#3a4a5a', '#d8dee2'], p: 'spots', pc: '#e8ece8', f: '#34424e', hab: 'pelagic' },
  78: { s: 'shark', h: 0.2, c: ['#5a5e5a', '#e2e2dc'], p: 'bars', pc: '#3a3e3a', f: '#4a4e4a', hab: 'pelagic' },
  79: { s: 'shark', h: 0.18, hammer: 1, c: ['#6a747a', '#e4e6e6'], f: '#5a646a', hab: 'pelagic', sch: 4 },
  80: { s: 'shark', h: 0.2, c: ['#a09c8c', '#ecebe4'], tips: '#141414', f: '#a09c8c', hab: 'reef' },
  81: { s: 'shark', h: 0.18, nurse: 1, c: ['#7a6a4e', '#b0a088'], f: '#6a5a40', hab: 'floor-swim' },
  82: { s: 'shark', h: 0.2, c: ['#2a4a8a', '#ecf0f2'], f: '#2a4278', hab: 'pelagic' },
  83: { s: 'shark', h: 0.16, longfin: 1, c: ['#2c5aa8', '#eef0f2'], f: '#2c56a0', hab: 'pelagic' },
  84: { s: 'shark', h: 0.2, gape: 1, c: ['#4a4e52', '#7a7e80'], f: '#3a3e42', hab: 'pelagic' },
  85: { s: 'shark', h: 0.2, blunt: 1, c: ['#3a3c3e', '#55585a'], f: '#2e3032', eyec: '#a8c0a0', hab: 'demersal' },
  86: { s: 'shark', h: 0.15, goblin: 1, c: ['#c49a98', '#d8b4b0'], f: '#a87e7c', hab: 'demersal' },
  87: { s: 'eel', h: 0.07, frill: 1, c: ['#4a3e38', '#6a5c54'], hab: 'demersal' },
  88: { s: 'shark', h: 0.22, gape: 1, blunt: 1, c: ['#3a3a40', '#9a9aa0'], f: '#2e2e34', hab: 'pelagic' },
  89: { s: 'shark', h: 0.18, sixgill: 1, c: ['#4a4c48', '#6a6c66'], f: '#3a3c38', eyec: '#5ac87a', hab: 'demersal' },
  90: { s: 'shark', h: 0.18, small: 1, c: ['#5a4a3e', '#6a5a4e'], glow: '#7ad0a0', hab: 'pelagic' },
  91: { s: 'ray', h: 0.12, manta: 1, c: ['#1e2226', '#e6e6e2'], hab: 'pelagic' },
  92: { s: 'ray', h: 0.12, eagle: 1, c: ['#1e2430', '#e2e2de'], p: 'spots', pc: '#e8e8e0', hab: 'pelagic' },
  93: { s: 'ray', h: 0.1, sting: 1, c: ['#5a5446', '#e2e0d8'], hab: 'floor-swim' },
  94: { s: 'ray', h: 0.1, sting: 1, c: ['#6a6040', '#d8d4c4'], p: 'spots', pc: '#3a9ae8', hab: 'floor-swim' },
  95: { s: 'ray', h: 0.12, round: 1, c: ['#3a3a40', '#c8c8c4'], p: 'dots', pc: '#1e1e22', hab: 'floor-swim' },
  96: { s: 'shark', h: 0.12, saw: 1, c: ['#7a6e58', '#e2ded2'], f: '#6a5e4a', hab: 'floor-swim' },
  97: { s: 'ratfish', h: 0.22, c: ['#7a6a6a', '#b8aca8'], p: 'dots', pc: '#e8e4e0', eyec: '#4ac08a', hab: 'demersal' },
  98: { s: 'fish', h: 0.22, t: 'fork', bigeye: 1, c: ['#2e3a46', '#8a96a0'], glow: '#5ac8ff', photo: 1, f: '#2e3a46', hab: 'pelagic', sch: 20 },
  99: { s: 'hatchet', h: 0.9, c: ['#6a7a86', '#d8e2e8'], glow: '#7ab8ff', hab: 'pelagic', sch: 8 },
  100: { s: 'angler', h: 0.8, deep: 1, c: ['#14110f', '#221c18'], glow: '#7ad8ff', hab: 'pelagic' },
  101: { s: 'fangtooth', h: 0.55, c: ['#1c1814', '#2e2620'], hab: 'pelagic' },
  102: { s: 'viper', h: 0.13, c: ['#1e2a2e', '#3a4a4e'], glow: '#6ad0ff', hab: 'pelagic' },
  103: { s: 'dragon', h: 0.06, c: ['#0e0c0c', '#161414'], glow: '#ff6a5a', hab: 'pelagic' },
  104: { s: 'barreleye', h: 0.3, c: ['#3a3430', '#6a5a50'], eyec: '#5ac85a', hab: 'pelagic' },
  105: { s: 'gulper', h: 0.08, c: ['#141212', '#1e1a1a'], glow: '#ff7aa0', hab: 'pelagic' },
  106: { s: 'swallower', h: 0.2, c: ['#121212', '#2a2420'], hab: 'pelagic' },
  107: { s: 'blob', h: 0.55, c: ['#b89a90', '#d0b4aa'], hab: 'floor' },
  108: { s: 'fish', h: 0.3, t: 'coel', lobed: 1, c: ['#26324a', '#3a4a64'], p: 'spots', pc: '#c8ccd2', f: '#26324a', hab: 'demersal' },
  109: { s: 'rattail', h: 0.18, c: ['#5a5650', '#8a8478'], bigeye: 1, hab: 'demersal' },
  110: { s: 'tripod', h: 0.15, c: ['#3a3630', '#5a544a'], hab: 'floor' },
  111: { s: 'eel', h: 0.06, hag: 1, c: ['#9a7a6a', '#b89a8a'], hab: 'floor-swim' },
  112: { s: 'seahorse', h: 1, c: ['#c49a4a', '#d8b46a'], p: 'dots', pc: '#f0e8d8', hab: 'floor' },
  113: { s: 'seahorse', h: 1, belly: 1, c: ['#b8a070', '#d8c498'], p: 'spots', pc: '#3a3024', hab: 'floor' },
  114: { s: 'seahorse', h: 1, pygmy: 1, c: ['#d87a8a', '#e89aa8'], p: 'dots', pc: '#b03a4a', hab: 'floor' },
  115: { s: 'seadragon', leafy: 1, c: ['#b89a4a', '#d0b468'], hab: 'drift-low' },
  116: { s: 'seadragon', c: ['#b8503a', '#d8a04a'], p: 'dots', pc: '#e8e0b0', hab: 'drift-low' },
  117: { s: 'pipefish', h: 0.05, c: ['#c83a2a', '#ece8e0'], p: 'rings', pc: '#ece8e0', hab: 'floor-swim' },
  118: { s: 'kelp', c: ['#5a4a1e', '#7a6428'], hab: 'plant' },
  119: { s: 'bullkelp', c: ['#5e4a22', '#7a6430'], hab: 'plant' },
  120: { s: 'sugarkelp', c: ['#7a6428', '#9a7e34'], hab: 'plant' },
  121: { s: 'oarweed', c: ['#5a4820', '#74602c'], hab: 'plant' },
  122: { s: 'sargassum', c: ['#8a6a24', '#a8823a'], hab: 'surface-plant' },
  123: { s: 'seagrass', c: ['#3a6a3a', '#5a8a48'], hab: 'plant' },
  124: { s: 'seagrass', wide: 1, c: ['#4a7a3a', '#6a9a4a'], hab: 'plant' },
  125: { s: 'sealettuce', c: ['#4aa04a', '#7ac06a'], hab: 'plant' },
  126: { s: 'staghorn', c: ['#c8a47a', '#e2c8a0'], hab: 'plant' },
  127: { s: 'brain', c: ['#a89a5a', '#c4b678'], hab: 'plant' },
  128: { s: 'anemone', c: ['#b83a5a', '#d8c88a'], hab: 'plant' },
  129: { s: 'plumose', c: ['#ece6da', '#f4f0e8'], hab: 'plant' },
  130: { s: 'lophelia', c: ['#e8e0d0', '#f4ece0'], hab: 'plant' },
  131: { s: 'bubblegum', c: ['#c84a5a', '#e07080'], hab: 'plant' },
  132: { s: 'glasssponge', c: ['#d8dcd8', '#eef0ee'], hab: 'plant' },
  133: { s: 'barrelsponge', c: ['#7a4a3a', '#9a6250'], hab: 'plant' },
  134: { s: 'clam', giant: 1, c: ['#a8a090', '#4a8ab8'], hab: 'floor' },
  135: { s: 'mussel', c: ['#1e2430', '#3a4a6a'], hab: 'floor' },
  136: { s: 'oyster', c: ['#7a7468', '#a8a092'], hab: 'floor' },
  137: { s: 'scallop', c: ['#b07a5a', '#d8a880'], hab: 'floor' },
  138: { s: 'conch', c: ['#d8b490', '#e8a0a0'], hab: 'floor' },
  139: { s: 'abalone', c: ['#8a3a2a', '#a8584a'], hab: 'floor' },
  140: { s: 'nudibranch', c: ['#c4282a', '#e8605a'], hab: 'drift-low' },
  141: { s: 'nautilus', c: ['#ece4d4', '#a85a3a'], hab: 'pelagic' },
  142: { s: 'octopus', c: ['#8a5a44', '#b07a60'], hab: 'floor' },
  143: { s: 'octopus', giant: 1, c: ['#9a3e2e', '#b85a44'], hab: 'floor' },
  144: { s: 'octopus', small: 1, c: ['#c8a45a', '#d8b870'], p: 'rings', pc: '#2a7aff', hab: 'floor' },
  145: { s: 'octopus', c: ['#a8906a', '#e2d6c0'], p: 'bands', pc: '#3a2e22', hab: 'floor' },
  146: { s: 'dumbo', c: ['#d8a8a0', '#e8c0b8'], hab: 'demersal' },
  147: { s: 'cuttle', c: ['#8a7a6a', '#c8b8a4'], p: 'zebra', pc: '#3a3028', hab: 'demersal' },
  148: { s: 'squid', c: ['#a83a2a', '#d07060'], hab: 'pelagic', sch: 5 },
  149: { s: 'squid', giant: 1, c: ['#a84a3a', '#c86a58'], hab: 'pelagic' },
  150: { s: 'vampire', c: ['#3a1416', '#5a2024'], glow: '#5ac8ff', eyec: '#c83a2a', hab: 'pelagic' },
  151: { s: 'squid', small: 1, c: ['#3a4a6a', '#5a6a8a'], glow: '#4ab8ff', photo: 1, hab: 'pelagic', sch: 12 },
  152: { s: 'lobster', c: ['#3a4a3a', '#5a6a4a'], hab: 'floor' },
  153: { s: 'lobster', spiny: 1, c: ['#9a6a3a', '#c89a5a'], p: 'spots', pc: '#ece0c0', hab: 'floor' },
  154: { s: 'crab', c: ['#7a4a4a', '#c8a080'], hab: 'floor' },
  155: { s: 'crab', king: 1, c: ['#a83a2a', '#c86040'], hab: 'floor' },
  156: { s: 'crab', snow: 1, c: ['#b07a5a', '#d8b090'], hab: 'floor' },
  157: { s: 'crab', spider: 1, c: ['#c06a3a', '#e0a070'], hab: 'floor' },
  158: { s: 'crab', swim: 1, c: ['#5a6a6a', '#3a7ac0'], hab: 'floor' },
  159: { s: 'shrimp', mantis: 1, c: ['#3a8a5a', '#e0602a'], hab: 'floor' },
  160: { s: 'shrimp', c: ['#c8282a', '#ecece4'], hab: 'floor' },
  161: { s: 'shrimp', krill: 1, c: ['#d8604a', '#ecb8a0'], hab: 'pelagic', sch: 40 },
  162: { s: 'isopod', c: ['#a8a090', '#c8c0b0'], hab: 'floor' },
  163: { s: 'crab', yeti: 1, c: ['#ece8e0', '#f4f2ec'], hab: 'floor' },
  164: { s: 'star', arms: 16, spiny: 1, c: ['#7a3a5a', '#a85a70'], hab: 'floor' },
  165: { s: 'star', arms: 5, c: ['#6a2a7a', '#8a4a9a'], hab: 'floor' },
  166: { s: 'star', arms: 20, c: ['#c86a4a', '#e0905a'], hab: 'floor' },
  167: { s: 'urchin', c: ['#5a2a6a', '#7a3a8a'], hab: 'floor' },
  168: { s: 'basketstar', c: ['#c8a47a', '#e0c49a'], hab: 'floor' },
  169: { s: 'cucumber', c: ['#c8b48a', '#e0d0a8'], p: 'spots', pc: '#3a2e22', hab: 'floor' },
  170: { s: 'seapig', c: ['#d8a8b0', '#ecc4c8'], hab: 'floor' },
  171: { s: 'jelly', moon: 1, c: ['#c8d8e8', '#e8f0f8'], hab: 'drift' },
  172: { s: 'jelly', lionsmane: 1, c: ['#b85a2a', '#e09a4a'], hab: 'drift' },
  173: { s: 'jelly', nettle: 1, c: ['#c8862a', '#7a2a2a'], hab: 'drift' },
  174: { s: 'manowar', c: ['#7a6ad8', '#3a5ad0'], hab: 'surface' },
  175: { s: 'jelly', box: 1, c: ['#d0e0e8', '#eef4f8'], hab: 'drift' },
  176: { s: 'jelly', atolla: 1, c: ['#8a1a1a', '#b02a2a'], glow: '#4a8aff', hab: 'drift' },
  177: { s: 'comb', c: ['#d8e4ec', '#eef4f8'], hab: 'drift' },
  178: { s: 'siphonophore', c: ['#e8b0a0', '#f4d8c8'], glow: '#7ad8ff', hab: 'drift' },
  179: { s: 'xmastree', c: ['#e8742a', '#2a6ae8'], hab: 'plant' },
  180: { s: 'tubeworm', c: ['#ece6dc', '#c81e2a'], hab: 'plant' },
  181: { s: 'bobbit', c: ['#8a6a4a', '#c8a050'], hab: 'floor' },
  182: { s: 'seasquirt', c: ['#6a3a8a', '#e8a02a'], hab: 'plant' },
  183: { s: 'turtle', c: ['#5a5a3a', '#c8b88a'], hab: 'pelagic' },
  184: { s: 'sperm', c: ['#3b3836', '#5a5654'], hab: 'pelagic' },
  185: { s: 'dolphin', c: ['#5d666e', '#d8dcde'], hab: 'pelagic', sch: 5 },
  186: { s: 'dolphin', common: 1, c: ['#2e343c', '#e6e2da'], pc: '#c8a868', hab: 'pelagic', sch: 8 },
  187: { s: 'orca', c: ['#0d0f12', '#eceae4'], hab: 'pelagic', sch: 4 },
  188: { s: 'sleeper', c: ['#45413a', '#7a7264'], hab: 'demersal' },
};

// Convert the reference "max size" text into a typical display length in metres.
function parseSize(txt, vis) {
  const m = /([\d.]+)\s*(cm|m)/.exec(txt);
  if (!m) return vis.hab && vis.hab.includes('plant') ? 2.5 : 3;
  let v = parseFloat(m[1]) * (m[2] === 'cm' ? 0.01 : 1);
  // Typical adults are smaller than record maximums; colonies and sponges are shown young
  if (!/plant/.test(vis.hab)) v *= 0.72;
  else if (!/kelp/.test(vis.s)) v *= 0.5;
  if (vis.s === 'barrelsponge') v *= 0.6;
  return v;
}

// The legendaries grow far past their textbook size here, so that meeting one is unmistakable: each at
// least 1.5 m (length in metres; their price and rarity are in specimens.js, their journal pages give
// the real size). Every other animal keeps a realistic size.
export const GIANT_FORMS = {
  100: 1.8,  // humpback anglerfish (in life about 18 cm)
  101: 1.5,  // common fangtooth (about 16 cm)
  104: 1.5,  // barreleye (about 15 cm)
  105: 2.2,  // pelican gulper eel (about 75 cm)
  107: 1.5,  // blobfish (about 30 cm)
  108: 2.0,  // coelacanth (up to about 2 m: its real size)
};

// the reference list and the species added since (data/species_more.js, which carry their own look)
export const SPECIES = SPECIES_DATA.concat(MORE_SPECIES).map((d) => {
  const v = Object.assign({ s: 'fish', h: 0.3, t: 'fork', c: ['#555', '#999'], f: null, hab: 'pelagic', sch: 1 }, V[d.id] || d.v || {});
  v.f = v.f || v.c[0];
  const len = GIANT_FORMS[d.id] || parseSize(d.size, v);
  return { ...d, v, len, giant: !!GIANT_FORMS[d.id] };
});
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

// Which species can live at a given depth, filtered by habitat class.
export function speciesAt(depth, filter) {
  return SPECIES.filter((s) => depth >= s.dmin && depth <= s.dmax && filter(s.v.hab, s));
}
export const isStaticHab = (h) => h === 'plant' || h === 'floor';
export const isSwimHab = (h) => !isStaticHab(h) && h !== 'surface-plant';
