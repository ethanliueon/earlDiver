// (7.2.4) The game is played by touch only; no keyboard reaches it. The touch controls (the HUD's buttons, the things
// tapped in the world, the stick's sprint) still speak in the short action names the game has always used ('f' the
// hand, 'b' the bag, ' ' the net...), sent on window as 'actdown' / 'actup' events with that name in
// `key`. A button held is an actdown and, on release, an actup; a quick one counts as a tap where that matters.
export class ActEvent extends Event {
  constructor(type, key) { super(type, { cancelable: true }); this.key = key; }
}
export function act(key, down) { window.dispatchEvent(new ActEvent(down ? 'actdown' : 'actup', key)); }
// a press and release in one (a tap on a thing in the world)
export function tap(key) { act(key, true); setTimeout(() => act(key, false), 60); }
