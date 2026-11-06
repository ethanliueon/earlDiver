// Small display settings, kept in this browser (pause menu): the brackets round what a tool will go
// for (off unless turned on), and the "[Space] Net the …" catch tags (on unless turned off).
const KEYS = { brackets: 'earl.brackets', catchTags: 'earl.catchTags', fast: 'earl.fastGraphics' };
const read = (k, dflt = true) => { try { const v = localStorage.getItem(KEYS[k]); return v === null ? dflt : v !== '0'; } catch (e) { return dflt; } };
// fast: Graphics 'Fast' (off = Auto): the picture may soften further and the costliest extras stay off
export const SETTINGS = { brackets: read('brackets', false), catchTags: read('catchTags'), fast: read('fast', false) };
export function setSetting(k, on) { SETTINGS[k] = !!on; try { localStorage.setItem(KEYS[k], on ? '1' : '0'); } catch (e) { /* not saved */ } }
