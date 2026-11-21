// Small display settings, kept in this browser (pause menu): the brackets round what a tool will go
// for (off unless turned on), and the "[Space] Net the …" catch tags (on unless turned off).
const KEYS = { brackets: 'earl.brackets', catchTags: 'earl.catchTags', fast: 'earl.fastGraphics' };
const read = (k, dflt = true) => { try { const v = localStorage.getItem(KEYS[k]); return v === null ? dflt : v !== '0'; } catch (e) { return dflt; } };
// fast: Graphics 'Fast' (off = Auto): the picture may soften further and the costliest extras stay off
export const SETTINGS = { brackets: read('brackets', false), catchTags: read('catchTags'), fast: read('fast', false) };
export function setSetting(k, on) { SETTINGS[k] = !!on; try { localStorage.setItem(KEYS[k], on ? '1' : '0'); } catch (e) { /* not saved */ } }

// (5.15.7) Button size (Small / Normal / Large), as real phone games offer: a factor on the whole HUD and the stick
const SIZES = { small: 0.88, normal: 1, large: 1.12 };
let UI_SIZE = (() => { try { const v = localStorage.getItem('earl.uiSize'); return SIZES[v] ? v : 'normal'; } catch (e) { return 'normal'; } })();
export function uiSizeName() { return UI_SIZE; }
export function setUiSize(name) { if (!SIZES[name]) return; UI_SIZE = name; try { localStorage.setItem('earl.uiSize', name); } catch (e) { /* not saved */ } }
// (5.15.7) one unit for the whole interface, from the screen, so every phone looks the same, only bigger or smaller:
// laid out for a phone 844 x 390 points held sideways; the tighter of the screen's height / 390 and width / 844 (so a
// squarer tablet does not crowd its corners); a tablet's grows no further than 1.4x; times the Button size
export function uiUnit() {
  const k = window.__fingerK || 1, S = window.innerHeight / k, L = window.innerWidth / k;
  return Math.max(0.7, Math.min(1.4, Math.min(S / 390, L / 844))) * SIZES[uiSizeName()];
}
