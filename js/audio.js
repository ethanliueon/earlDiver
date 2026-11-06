// Sound: the background music (muffled underwater), generated ambience,
// breathing, heartbeat, the entity's presence, sonar, hull creaks.
import { clamp, lerp } from './util.js';
const MUSIC_LOOP = 128 * 60 / 88 / 0.94; // seconds: Polaroid II's loop

export class Audio {
  constructor() {
    this.ready = false; this.muted = false;
    this.breathT = 0; this.beatT = 0; this.groanT = 8; this.creakT = 0; this.bubbleT = 0;
  }
  init() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = (this.ac = new AC());
    this.master = ac.createGain(); this.master.gain.value = 0.9; this.master.connect(ac.destination);
    // music
    // decoded whole and looped by the audio clock, sample for sample (an <audio> element's loop
    // leaves a gap at the seam). The loop is exactly 128 beats at 88 bpm, slowed to 0.94.
    this.musicLP = ac.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000;
    this.musicGain = ac.createGain(); this.musicGain.gain.value = 0;
    this.musicLP.connect(this.musicGain).connect(this.master);
    fetch('assets/audio/polaroid_ii.mp3').then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)))
      .then((buf) => { this.musicBuf = buf; if (this.musicWanted) this.musicFrom(0); }).catch(() => {});
    // noise buffer
    const len = ac.sampleRate * 4;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    this.brown = buf;
    const wb = ac.createBuffer(1, len, ac.sampleRate), wd = wb.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    this.white = wb;
    // ambience bed: deep water rumble
    this.amb = this.loopNoise(this.brown, 'lowpass', 260, 0);
    // surface wash
    // surface wash: a soft low hiss of water lapping, not a roar
    this.surf = this.loopNoise(this.white, 'lowpass', 520, 0);
    // entity drone: detuned low oscillators
    this.drone = ac.createGain(); this.drone.gain.value = 0;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 140;
    for (const f of [36.7, 38.9, 55.1]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(dlp); o.start(); }
    dlp.connect(this.drone).connect(this.master);
    // tinnitus
    this.tin = ac.createOscillator(); this.tin.frequency.value = 6900; this.tinG = ac.createGain(); this.tinG.gain.value = 0;
    this.tin.connect(this.tinG).connect(this.master); this.tin.start();
    // sub motor
    this.motor = ac.createOscillator(); this.motor.type = 'sawtooth'; this.motor.frequency.value = 52;
    const mlp = ac.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 220;
    this.motorG = ac.createGain(); this.motorG.gain.value = 0;
    this.motor.connect(mlp).connect(this.motorG).connect(this.master); this.motor.start();
    this.ready = true;
    this.loadSfx();
  }
  // ---------------- recorded sound effects (CC0, see README) ----------------
  // loaded in the background; until one has arrived, the old generated sound stands in for it
  loadSfx() {
    this.sfxBuf = {};
    const names = ['chamber_plop', 'tank_plop', 'seagull', 'hull_creak_1', 'hull_creak_2', 'hull_creak_3', 'sub_implosion',
      'ui_click', 'ui_click_soft', 'ui_rollover', 'ui_sale_coins', 'journal_page'];
    const get = (name, file) => fetch(file).then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => this.ac.decodeAudioData(b, res, rej)))
      .then((buf) => { this.sfxBuf[name] = buf; if (name === 'surface_lapping') this.startLapping(); }).catch(() => {});
    for (const n of names) get(n, `assets/audio/sfx/${n}.mp3`);
    get('surface_lapping', 'assets/audio/sfx/surface_lapping.wav');
  }
  // play one; returns false if it has not loaded yet
  sfx(name, vol = 1, rate = 1) {
    const buf = this.sfxBuf && this.sfxBuf[name];
    if (!this.ready || !buf) return false;
    const s = this.ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = this.ac.createGain(); g.gain.value = vol;
    s.connect(g).connect(this.master); s.start();
    return true;
  }
  // water lapping against the hull and the diver at the surface: a loop, faded in and out
  startLapping() {
    if (this.lapping) return;
    const s = this.ac.createBufferSource(); s.buffer = this.sfxBuf.surface_lapping; s.loop = true;
    const g = this.ac.createGain(); g.gain.value = 0;
    s.connect(g).connect(this.master); s.start();
    this.lapping = { s, g };
  }
  journalPage() { this.sfx('journal_page', 0.7, 0.96 + Math.random() * 0.08); }
  uiSoft() { this.sfx('ui_click_soft', 0.6); }
  uiHover() { const now = performance.now(); if (now - (this.hoverAt || 0) < 70) return; this.hoverAt = now; this.sfx('ui_rollover', 0.35); }
  sale() { this.sfx('ui_sale_coins', 0.7); }
  chamberPlop() { this.sfx('chamber_plop', 0.8, 0.95 + Math.random() * 0.1) || this.bubbles(5, 0.05); }
  tankPlop() { this.sfx('tank_plop', 0.8, 0.95 + Math.random() * 0.1) || this.bubbles(5, 0.05); }
  loopNoise(buf, type, freq, gain) {
    const ac = this.ac;
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.value = gain;
    s.connect(f).connect(g).connect(this.master); s.start();
    return { s, f, g };
  }
  resume() { if (this.ac && this.ac.state === 'suspended') this.ac.resume(); }
  // ---------------- music: short pieces, when things are calm ----------------
  // A piece plays 30-60 s, then fades out very slowly. It always starts at the start of a dive and
  // on getting back to the boat, and on good moments (cue), but never restarts one already playing.
  // Stress (the thing near, marked, an attack, no air, hurt, deep outside the sub) stops it, and
  // nothing starts it until 15 s after the stress has passed. In the quiet that follows a piece,
  // after a minute it rolls every 30 s: 10 %, 20 %, 35 %, 45 %, then 50 %; a hidden calm meter
  // (peaceful catches, sales, photos, quiet swimming) raises those odds.
  playMusic() {
    if (!this.ready) return;
    this.musicWanted = true;
    if (this.musicBuf && !this.musicSrc) this.musicFrom(0);
    this.startPiece(true);
  }
  // (re)start the music loop from a point in it
  musicFrom(offset) {
    if (!this.musicBuf) return;
    if (this.musicSrc) { try { this.musicSrc.stop(); } catch (e) { /* already stopped */ } }
    const s = this.ac.createBufferSource(); s.buffer = this.musicBuf; s.loop = true;
    s.loopStart = 0; s.loopEnd = Math.min(this.musicBuf.duration, MUSIC_LOOP);
    s.connect(this.musicLP); s.start(0, offset); this.musicSrc = s;
  }
  // a good moment (or the boat, or a new dive): start a piece if none is playing
  cue(kind) {
    const m = this.musState();
    if (kind === 'home' || kind === 'start') return this.startPiece(true);
    if (m.on || m.sinceStress < 15 || !this.calm) { m.meter = Math.min(1, m.meter + 0.15); return; }
    this.startPiece(false);
  }
  calmBoost(x) { const m = this.musState(); m.meter = Math.min(1, m.meter + x); }
  musState() { return this.mus || (this.mus = { on: false, t: 0, len: 0, level: 0, quiet: 0, rolls: 0, sinceStress: 99, meter: 0 }); }
  startPiece(always) {
    const m = this.musState();
    if (m.on) return;                                      // already playing: carry on
    if (!always && (!this.calm || m.sinceStress < 15)) return;
    if (m.level < 0.02) this.musicFrom(0); // fresh, unless still fading
    m.on = true; m.t = 0; m.len = 30 + Math.random() * 30; m.meter = 0;
  }
  // returns the music level 0..1 for this frame
  musicSession(g, dt) {
    const m = this.musState();
    const ent = g.entity, e = g.earl;
    const stress = g.fx.dread > 0.02 || (ent && ent.marked) || !!g.threat || !!g.noAir || (g.injury || 0) > 0 || !!g.reveal || (!e.inSub && e.y > 300);
    this.calm = !stress;
    if (stress) { m.sinceStress = 0; m.quiet = 0; m.rolls = 0; } else m.sinceStress += dt;
    let fade = 0.15; // fading in: about 7 s
    if (g.legend) { m.on = false; m.quiet = 0; }                          // a legend: the music falls away
    if (m.on) {
      m.t += dt;
      if (stress) { m.on = false; }                                   // stress: it stops
      else if (m.t > m.len) { m.on = false; m.quiet = 0; m.rolls = 0; } // the piece ends
    } else if (!stress) {
      m.quiet += dt;
      m.meter = Math.min(1, m.meter + dt * 0.0015);                   // quiet, calm swimming
      // after a minute of quiet, a roll every 30 s
      if (m.quiet >= 60 + m.rolls * 30) {
        const base = [0.10, 0.20, 0.35, 0.45, 0.50][Math.min(4, m.rolls)];
        m.rolls++;
        if (Math.random() < Math.min(0.9, base + m.meter * 0.4)) this.startPiece(false);
      }
    }
    if (!m.on) fade = stress ? 0.35 : 0.033;                          // stress: a few seconds; a piece ending: ~30 s
    const target = m.on ? 1 : 0;
    m.level += clamp(target - m.level, -fade * dt, fade * dt);
    return m.level;
  }
  // ---------------- the kill: the sound drops out, then the hit ----------------
  // drop: everything (ambience, music, the motor, the drone) falls silent in a twentieth of a second
  drop() {
    if (!this.ready) return;
    const t = this.ac.currentTime, gn = this.master.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.linearRampToValueAtTime(0, t + 0.05);
    this.dropped = true;
  }
  // restore: the world's sound comes back up
  restore(sec = 0.8) {
    if (!this.ready || !this.dropped) return;
    const t = this.ac.currentTime, gn = this.master.gain;
    gn.cancelScheduledValues(t); gn.setValueAtTime(gn.value, t); gn.linearRampToValueAtTime(this.muted ? 0 : 0.9, t + sec);
    this.dropped = false;
  }
  // the hit, on its own bus (the world stays silent around it): a sub-bass slam, a wet tearing
  // crunch, a shriek that falls away, and a long low tail
  scare() {
    if (!this.ready || this.muted) return;
    const ac = this.ac, t0 = ac.currentTime;
    const bus = ac.createGain(); bus.gain.value = 1;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4;
    bus.connect(comp).connect(ac.destination);
    const env = (node, a, peak, dur) => { const gn = ac.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(peak, t0 + a); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); node.connect(gn).connect(bus); return gn; };
    // the slam: a sine falling from 70 Hz to 24 Hz
    const o = ac.createOscillator(); o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(24, t0 + 1.4);
    env(o, 0.008, 1.0, 1.8); o.start(t0); o.stop(t0 + 1.9);
    // the crunch and the wet roar: noise through a lowpass and a bandpass
    for (const [buf, type, f, q, peak, dur] of [[this.brown, 'lowpass', 600, 0.7, 1.0, 1.4], [this.white, 'bandpass', 900, 1.2, 0.55, 0.6], [this.white, 'highpass', 2500, 0.7, 0.4, 0.22]]) {
      const src = ac.createBufferSource(); src.buffer = buf;
      const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      src.connect(fl); env(fl, 0.01, peak, dur); src.start(t0, Math.random() * 2); src.stop(t0 + dur + 0.05);
    }
    // the shriek: two detuned saws falling, through a distortion and a bandpass
    const ws = ac.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
    ws.curve = curve;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, t0); bp.frequency.exponentialRampToValueAtTime(500, t0 + 0.9); bp.Q.value = 1.5;
    for (const f of [1300, 1385]) { const sw = ac.createOscillator(); sw.type = 'sawtooth'; sw.frequency.setValueAtTime(f, t0); sw.frequency.exponentialRampToValueAtTime(f * 0.22, t0 + 0.9); sw.connect(ws); sw.start(t0); sw.stop(t0 + 1); }
    ws.connect(bp); env(bp, 0.02, 0.28, 0.95);
  }
  // it draws back to strike: a low swell rising under everything
  swell() {
    if (!this.ready) return;
    this.tone(28, 1.3, 0.55, 'sine', 0, 58);
    this.burst('lowpass', 200, 0.8, 1.2, 0.35, this.brown);
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ac.currentTime, 0.1); }

  burst(type, freq, q, dur, vol, buf = this.white, when = 0) {
    const ac = this.ac, t0 = ac.currentTime + when;
    const s = ac.createBufferSource(); s.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t0, Math.random() * 3); s.stop(t0 + dur + 0.05);
    return f;
  }
  tone(freq, dur, vol, type = 'sine', when = 0, slideTo = null) {
    const ac = this.ac, t0 = ac.currentTime + when;
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  bubbles(n, vol = 0.05) {
    for (let i = 0; i < n; i++) {
      const f = 500 + Math.random() * 900;
      this.tone(f, 0.06 + Math.random() * 0.05, vol * (0.5 + Math.random() * 0.5), 'sine', i * 0.04 + Math.random() * 0.05, f * 1.8);
    }
  }
  heartbeat(vol) {
    this.tone(62, 0.16, vol, 'sine', 0, 40);
    this.tone(55, 0.2, vol * 0.75, 'sine', 0.24, 36);
  }
  groan(vol) {
    const ac = this.ac, t0 = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const f0 = 70 + Math.random() * 30;
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t0 + 4.5);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(320, t0); bp.frequency.exponentialRampToValueAtTime(140, t0 + 4.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5);
    o.connect(bp).connect(g).connect(this.master); o.start(t0); o.stop(t0 + 5.1);
  }
  whale(vol) {
    // a long, distant, low call, heavily filtered
    const ac = this.ac, t0 = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(48, t0); o.frequency.linearRampToValueAtTime(70, t0 + 3); o.frequency.linearRampToValueAtTime(40, t0 + 8);
    const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(96, t0); o2.frequency.linearRampToValueAtTime(141, t0 + 3); o2.frequency.linearRampToValueAtTime(79, t0 + 8);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 2.5); g.gain.linearRampToValueAtTime(vol * 0.6, t0 + 6); g.gain.linearRampToValueAtTime(0, t0 + 9);
    o.connect(f); o2.connect(f); f.connect(g).connect(this.master);
    o.start(t0); o2.start(t0); o.stop(t0 + 9.2); o2.stop(t0 + 9.2);
  }
  hit(dmg) {
    // a dull blow, a burst of exhaled bubbles, a sharp sting
    this.burst('lowpass', 260, 0.8, 0.5, 0.55 + dmg * 0.08, this.brown);
    this.tone(70, 0.4, 0.45, 'sine', 0, 38);
    this.bubbles(14, 0.06);
    this.burst('bandpass', 2600, 6, 0.25, 0.08);
  }
  gasp() { // (quieter bubbles than before: they were too loud on surfacing)
    // a ragged first breath: a sharp inhale, then two shaky ones
    this.burst('bandpass', 1300, 1.4, 0.7, 0.16);
    this.burst('bandpass', 1100, 1.4, 0.5, 0.1, this.white, 0.85);
    this.burst('bandpass', 1000, 1.4, 0.5, 0.08, this.white, 1.5);
    this.bubbles(10, 0.02);
  }
  thud(vol) { this.tone(55, 0.35, vol, 'sine', 0, 32); this.burst('lowpass', 180, 0.7, 0.4, vol * 0.8, this.brown); }
  whoosh() { const f = this.burst('bandpass', 400, 1.5, 1.2, 0.18, this.white); f.frequency.exponentialRampToValueAtTime(1600, this.ac.currentTime + 1); }
  clicks(sec) {
    // a sperm whale's echolocation: a click train that speeds up as it closes in
    let t = 0, gap = 0.6;
    while (t < sec) { this.burst('highpass', 1800, 2, 0.03, 0.22, this.white, t); this.tone(900, 0.03, 0.05, 'square', t); t += gap; gap = Math.max(0.06, gap * 0.86); }
  }
  orcaCall() {
    const ac = this.ac, t0 = ac.currentTime;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, t0); o.frequency.exponentialRampToValueAtTime(1700, t0 + 0.5); o.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 3;
    const gn = ac.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(0.05, t0 + 0.2); gn.gain.linearRampToValueAtTime(0, t0 + 1.3);
    o.connect(bp).connect(gn).connect(this.master); o.start(t0); o.stop(t0 + 1.4);
  }
  ram() { this.implosionSmall(); this.creak(0.6); }
  implosionSmall() { this.burst('lowpass', 500, 0.6, 1.2, 0.8, this.brown); this.tone(45, 1.4, 0.7, 'sine', 0, 28); this.burst('bandpass', 1200, 4, 0.3, 0.2); }
  sonar(vol = 0.05) { this.tone(1180, 0.9, vol, 'sine'); this.tone(2360, 0.4, vol * 0.2, 'sine'); }
  click() { if (!this.sfx('ui_click', 0.55)) this.burst('bandpass', 2400, 3, 0.08, 0.12); }
  pickup() { this.tone(660, 0.18, 0.05, 'triangle'); this.tone(990, 0.25, 0.03, 'triangle', 0.06); }
  note() { this.tone(523, 0.5, 0.04, 'sine'); this.tone(784, 0.7, 0.03, 'sine', 0.12); }
  creak(vol) {
    if (this.sfx('hull_creak_' + (1 + Math.floor(Math.random() * 3)), Math.min(1, vol * 1.3), 0.85 + Math.random() * 0.3)) return;
    const f = this.burst('bandpass', 180 + Math.random() * 300, 12, 0.6 + Math.random() * 0.8, vol, this.brown); f.frequency.exponentialRampToValueAtTime(90, this.ac.currentTime + 1); }
  implosion() {
    if (this.sfx('sub_implosion', 1)) return;
    this.burst('lowpass', 900, 0.5, 2.8, 1.0);
    this.tone(48, 3.5, 0.9, 'sine', 0, 22);
    this.burst('highpass', 3000, 0.5, 0.4, 0.5);
  }
  // a legend: a low, slow chord, like a held breath
  legend() { if (this.muted) return; const f = [110, 164.8, 220, 277.2]; f.forEach((x, i) => this.tone(x, 4.5, 0.025, 'sine', i * 0.35)); this.tone(55, 5, 0.04, 'sine', 0.2); }
  sapphire() { for (let i = 0; i < 4; i++) this.tone(880 * Math.pow(1.26, i), 1.2, 0.03, 'sine', i * 0.09); }
  lanternHum(vol) { this.tone(220, 1.5, vol, 'sine'); this.tone(330, 1.5, vol * 0.6, 'sine'); }

  // per-frame update
  update(g, dt) {
    if (!this.ready) return;
    const ac = this.ac, now = ac.currentTime, e = g.earl, fx = g.fx;
    const depth = g.mode === 'menu' ? 0 : e.y;
    const under = g.mode === 'menu' ? 0 : depth > 0.9 ? 1 : 0;
    // music: not always playing. In a dive it comes now and then when things are calm (and on some
    // good moments), plays a while, and fades; anything frightening stops it at once.
    let mv = g.mode === 'menu' ? 0.55 : 0.42;
    if (g.mode === 'play') mv *= this.musicSession(g, dt);
    mv *= 1 - fx.dread * 0.7;
    if (g.mode === 'dying') mv *= clamp(1 - g.deathT / 3.5, 0, 1);
    if (g.paused) mv *= 0.4;
    const hush = 1 - 0.85 * ((g.fx && g.fx.hush) || 0); // it is near: the sea goes quiet
    this.musicGain.gain.setTargetAtTime(mv * hush, now, 0.4);
    const hurtMuffle = (g.injury >= 3 ? 0.5 : 1) * (g.noAir ? 1 - Math.min(1, g.noAir / 15) * 0.8 : 1);
    const lp = (under ? clamp(1400 * Math.exp(-depth / 500), 280, 1400) * (1 - fx.dread * 0.5) : 16000) * hurtMuffle;
    this.musicLP.frequency.setTargetAtTime(lp, now, 0.25);
    // beds
    this.amb.g.gain.setTargetAtTime((under ? 0.14 + clamp(depth / 1500, 0, 0.12) : 0.03) * hush, now, 0.5);
    this.amb.f.frequency.setTargetAtTime(under ? lerp(260, 120, clamp(depth / 1000, 0, 1)) : 400, now, 0.5);
    const atSurface = g.mode === 'play' && (e.inSub ? g.sub.y < 2.2 && !g.sub.imploded : e.y < 1.0);
    // the lapping plays only while air is going in (his tank, or the sub's cabin), and stops as it fills
    const sub = g.sub, refilling = atSurface && (e.inSub ? sub.o2 < sub.o2Max - 0.05 || e.o2 < e.o2Max - 0.05 : e.o2 < e.o2Max - 0.05);
    this.surf.g.gain.setTargetAtTime(under || (this.lapping && refilling) ? 0 : 0.016 + g.waveBoost * 0.05, now, 0.3);
    if (this.lapping) this.lapping.g.gain.setTargetAtTime(refilling ? 0.22 : 0, now, refilling ? 0.25 : 0.2);
    if (atSurface && (g.dayEff || 0) > 0.3) {
      this.gullT = (this.gullT ?? 6 + Math.random() * 10) - dt;
      if (this.gullT <= 0) { this.gullT = 14 + Math.random() * 26; this.sfx('seagull', 0.35 + Math.random() * 0.15, 0.92 + Math.random() * 0.16); }
    }
    this.drone.gain.setTargetAtTime(fx.dread * 0.11 + (g.mode === 'dying' ? 0.12 : 0), now, 0.8);
    this.tinG.gain.setTargetAtTime((fx.dread > 0.55 ? (fx.dread - 0.55) * 0.012 : 0) + (g.injury >= 4 ? 0.006 : 0), now, 0.5);
    const subMove = e.inSub ? clamp(e.speedNow / 5, 0.15, 1) : 0;
    this.motorG.gain.setTargetAtTime(subMove * 0.06, now, 0.3);
    this.motor.frequency.setTargetAtTime(44 + subMove * 26, now, 0.3);
    // bleeding out: the heartbeat slows and stops
    if (g.mode === 'dying' && g.deathKind === 'injury') {
      this.beatT -= dt;
      const rate = Math.max(0, 1 - g.deathT / 3.6);
      if (rate > 0.05 && this.beatT <= 0) { this.beatT = 0.6 / rate; this.heartbeat(0.35 * rate + 0.05); }
      return;
    }
    if (g.mode !== 'play') return;
    // breathing (diver only)
    if (!e.inSub && under && !g.noAir) {
      this.breathT -= dt;
      const rate = clamp(e.hr / 70, 0.8, 2.6);
      if (this.breathT <= 0) {
        this.breathT = 4.2 / rate;
        this.burst('bandpass', 1500, 1.2, 1.1 / Math.sqrt(rate), 0.035 + fx.dread * 0.02); // inhale through regulator
        setTimeout(() => { if (this.ready) { this.burst('lowpass', 500, 0.7, 1.0 / Math.sqrt(rate), 0.05); this.bubbles(6, 0.03); } }, (1500 / rate));
        g.breath = true;
      }
    }
    // heartbeat
    if (fx.dread > 0.15 || g.injury >= 2 || g.threat || g.noAir || (!e.inSub && e.o2 / e.o2Max < 0.15)) {
      this.beatT -= dt;
      if (this.beatT <= 0) { this.beatT = 60 / e.hr; this.heartbeat(0.12 + fx.dread * 0.35); }
    }
    // distant groans when it is within range
    if (g.entity && g.entity.dist < 320) {
      this.groanT -= dt;
      if (this.groanT <= 0) { this.groanT = 9 + Math.random() * 12; this.groan(0.05 + fx.dread * 0.12); }
    }
    // hull
    // only at the moments that matter: going past its rating, nearing its hidden crush depth, and
    // while the hull is failing; nothing in between (hits creak it too, see ram)
    const rr = g.sub.y / g.sub.rated, cz = (g.sub.crushR || 1.62) - ((g.sub.crushR || 1.62) - 1) * 0.2, zone = !e.inSub || g.sub.imploded ? 0 : rr > cz ? 2 : rr > 1 ? 1 : 0; // (2: nearing its crush depth)
    if (zone > (this.hullZone || 0)) this.creak(zone === 2 ? 0.9 : 0.6);
    // back up out of a zone (with a little room, so hovering at the line does not repeat it)
    if (zone < (this.hullZone || 0) && rr < (this.hullZone === 2 ? cz - 0.05 : 0.97)) this.hullZone = zone;
    else if (zone > (this.hullZone || 0)) this.hullZone = zone;
    if (!e.inSub) this.hullZone = 0;
    if (e.inSub && g.sub.failing != null && !g.sub.imploded) {
      this.creakT = (this.creakT ?? 0) - dt;
      if (this.creakT <= 0) { this.creakT = 0.9 + Math.random() * 0.6; this.creak(0.9 + Math.random() * 0.3); }
    } else this.creakT = 0.3;
  }
}
