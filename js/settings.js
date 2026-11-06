// Small display settings, kept in this browser (pause menu): the brackets round what a tool will go
// for, and the "[Space] Net the …" catch tags. Both on unless turned off.
const KEYS = { brackets: 'earl.brackets', catchTags: 'earl.catchTags' };
const read = (k) => { try { return localStorage.getItem(KEYS[k]) !== '0'; } catch (e) { return true; } };
export const SETTINGS = { brackets: read('brackets'), catchTags: read('catchTags') };
export function setSetting(k, on) { SETTINGS[k] = !!on; try { localStorage.setItem(KEYS[k], on ? '1' : '0'); } catch (e) { /* not saved */ } }
