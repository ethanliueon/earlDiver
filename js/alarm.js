// (3.3.0) The sub's alarm: a rotating red beacon at the top of the screen, and a klaxon, while something is
// wrong aboard: the hull is under 40 % (the cabin is leaking air), she is past her rated depth (and at crush
// depth further down), or the thing in the deep is on the sonar. It shows from the helm and in the back of the sub.
import { clamp, TAU } from './util.js';

// what is wrong right now, most urgent first: [{ id, text }]
export function alarmsOf(g) {
  if (!g || g.mode !== 'play' || !g.earl || !g.earl.inSub || !g.sub || g.sub.imploded) return [];
  const sub = g.sub, out = [], ent = g.entity;
  if (sub.y > sub.rated * 1.33) out.push({ id: 'crush', text: `Crush depth · ${Math.round(sub.y)} m of ${sub.rated} m: ascend` });
  else if (sub.y > sub.rated) out.push({ id: 'depth', text: `Past rated depth · ${Math.round(sub.y)} m of ${sub.rated} m` });
  if (sub.hull < 0.4) out.push({ id: 'hull', text: `Hull ${Math.round(sub.hull * 100)} % · leaking air` });
  if (ent && (ent.dist ?? Infinity) < 200 && ent.state !== 'away') out.push({ id: 'contact', text: 'Contact on sonar' });
  return out;
}

export class Beacon {
  constructor(audio) {
    this.audio = audio; this.rot = 0; this.on = 0; this.hornT = 0; this.ids = '';
    const el = document.createElement('div'); el.id = 'beacon'; el.hidden = true;
    el.innerHTML = '<canvas width="96" height="104"></canvas><ul class="bc-list"></ul>';
    document.body.appendChild(el);
    this.el = el; this.cv = el.querySelector('canvas'); this.list = el.querySelector('.bc-list');
  }
  update(g, dt) {
    const A = g && !g.paused ? alarmsOf(g) : [], live = A.length > 0;
    if (g) g.alarm = live ? { rot: this.rot, list: A } : null;
    this.on = clamp(this.on + (live ? dt * 4 : -dt * 3), 0, 1);
    this.el.hidden = this.on <= 0;
    if (this.el.hidden) { this.ids = ''; return; }
    this.rot = (this.rot + dt * 5.2) % TAU;
    // the list under it, rebuilt when it changes
    const ids = A.map((a) => a.id + a.text).join('|');
    if (ids !== this.ids) {
      const fresh = A.some((a) => !this.ids.includes(a.id));
      this.ids = ids; this.list.innerHTML = A.map((a) => `<li class="bc-${a.id}">${a.text}</li>`).join('');
      if (fresh) this.hornT = 0; // a new alarm sounds at once
    }
    // the klaxon: a rising two-tone whoop, every 1.6 s while it lasts
    this.hornT -= dt;
    if (live && this.hornT <= 0) { this.hornT = 1.6; if (this.audio && this.audio.ready && this.audio.alarm) this.audio.alarm(); }
    this.draw(live);
  }
  // after a red rotating beacon (hung from the ceiling): a black base, a ribbed red dome, a mirror turning inside
  // it; facing you, a flare
  draw(live) {
    const c = this.cv, x = c.getContext('2d'), W = c.width, H = c.height, cx = W / 2, r = this.rot;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    // (3.3.1) it hangs from the ceiling: drawn upside down, its base against the top edge
    x.setTransform(1, 0, 0, -1, 0, H - 4);
    // the bracket up into the ceiling
    x.fillStyle = '#1a1b1c'; x.fillRect(cx - 5, 92, 10, 12); x.fillStyle = '#2c2e30'; x.fillRect(cx - 18, 100, 36, 4);
    const face = Math.cos(r), lit = live ? 1 : 0.3;
    // the glow around it, strongest when the mirror faces out
    const gl = x.createRadialGradient(cx, 46, 4, cx, 46, 48);
    gl.addColorStop(0, `rgba(255,60,40,${(0.55 * lit * (0.45 + 0.55 * Math.max(0, face))).toFixed(3)})`); gl.addColorStop(1, 'rgba(255,40,20,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, H);
    // the dome
    const dome = new Path2D(); dome.moveTo(cx - 26, 78); dome.lineTo(cx - 21, 30); dome.quadraticCurveTo(cx, 16, cx + 21, 30); dome.lineTo(cx + 26, 78); dome.closePath();
    const dg = x.createLinearGradient(cx - 26, 0, cx + 26, 0);
    dg.addColorStop(0, '#6a0806'); dg.addColorStop(0.3, '#d61e14'); dg.addColorStop(0.55, '#ff4a32'); dg.addColorStop(1, '#5a0604');
    x.fillStyle = dg; x.fill(dome);
    x.save(); x.clip(dome);
    // the turning mirror: a bright band that slides across and narrows as it turns away
    const bx = cx + Math.sin(r) * 15, bw = 5 + 11 * Math.max(0, face);
    const mg = x.createLinearGradient(bx - bw, 0, bx + bw, 0);
    mg.addColorStop(0, 'rgba(255,200,170,0)'); mg.addColorStop(0.5, `rgba(255,236,210,${(0.9 * lit).toFixed(3)})`); mg.addColorStop(1, 'rgba(255,200,170,0)');
    x.fillStyle = mg; x.fillRect(bx - bw, 26, bw * 2, 52);
    // ribs in the plastic, and a sheen
    x.strokeStyle = 'rgba(80,0,0,0.35)'; x.lineWidth = 1;
    for (let k = -3; k <= 3; k++) { x.beginPath(); x.moveTo(cx + k * 7.5, 78); x.lineTo(cx + k * 6, 24); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(cx - 17, 30, 4, 44);
    x.restore();
    x.strokeStyle = 'rgba(40,0,0,0.6)'; x.lineWidth = 1; x.stroke(dome);
    // the base
    const bg = x.createLinearGradient(0, 76, 0, 96); bg.addColorStop(0, '#3a3c3e'); bg.addColorStop(0.4, '#151617'); bg.addColorStop(1, '#050505');
    x.fillStyle = bg; x.beginPath(); x.roundRect(cx - 31, 76, 62, 18, 4); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.14)'; x.fillRect(cx - 29, 78, 58, 2);
    // the flare, when it faces you
    if (live && face > 0.55) {
      const k = (face - 0.55) / 0.45, fx = bx, fy = 50;
      x.save(); x.globalCompositeOperation = 'lighter';
      const fg = x.createRadialGradient(fx, fy, 0, fx, fy, 30 * k + 6);
      fg.addColorStop(0, `rgba(255,240,220,${(0.95 * k).toFixed(3)})`); fg.addColorStop(0.3, `rgba(255,120,60,${(0.5 * k).toFixed(3)})`); fg.addColorStop(1, 'rgba(255,60,20,0)');
      x.fillStyle = fg; x.fillRect(0, 0, W, H);
      x.strokeStyle = `rgba(255,220,190,${(0.7 * k).toFixed(3)})`; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(fx - 34 * k, fy); x.lineTo(fx + 34 * k, fy); x.moveTo(fx, fy - 20 * k); x.lineTo(fx, fy + 20 * k); x.stroke();
      x.restore();
    }
  }
}
