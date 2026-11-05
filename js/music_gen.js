// Music made by the game itself, in the mood of a slowed, reverb-soaked track: warm detuned pads
// drifting through A major and F# minor at about 60 beats a minute, a soft bass, sparse bell notes
// in a long echo, a slight tape wobble, and everything muffled as if heard through water.
// It is generated live, so it never repeats exactly and it belongs entirely to this game.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
// chords: [bass, pad notes...] as MIDI numbers. Two cycles, chosen in turn, each chord 8 beats.
const CYCLES = [
  [[38, 54, 57, 61, 64], [37, 52, 57, 61, 64], [42, 57, 61, 64, 71], [40, 59, 61, 64, 66]], // Dmaj9 . A/C# . F#m11 . E6sus
  [[35, 50, 54, 57, 61], [38, 54, 57, 61, 66], [45, 52, 57, 61, 64], [40, 56, 59, 64, 66]], // Bm9 . D6/9 . A . E
];
const BELLS = [69, 71, 73, 76, 78, 81, 83, 85, 88];     // A major pentatonic, two octaves up
const BEAT = 1.0;                                       // seconds per beat (about 60 bpm)

export class GenMusic {
  constructor(ac, dest) {
    this.ac = ac; this.on = false; this.next = 0; this.beat = 0; this.cycle = 0;
    // the whole piece runs through a low-pass so it sits low and muffled, like the track
    this.out = ac.createGain(); this.out.gain.value = 0.78;
    this.tone = ac.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 2400; this.tone.Q.value = 0.4;
    // a gentle compressor keeps the swells from clipping without making it louder
    this.comp = ac.createDynamicsCompressor(); this.comp.threshold.value = -20; this.comp.knee.value = 14; this.comp.ratio.value = 4; this.comp.attack.value = 0.05; this.comp.release.value = 0.6;
    this.pre = ac.createGain(); this.pre.gain.value = 2.6;
    this.tone.connect(this.pre).connect(this.comp).connect(this.out).connect(dest);
    // a large, dark hall reverb (made from decaying noise)
    this.verb = ac.createConvolver(); this.verb.buffer = this.impulse(7, 2.2);
    this.wet = ac.createGain(); this.wet.gain.value = 0.85;
    this.verb.connect(this.wet).connect(this.tone);
    this.dry = ac.createGain(); this.dry.gain.value = 0.45; this.dry.connect(this.tone);
    // pads and bass go to both; bells go mostly to an echo, then the reverb
    this.padBus = ac.createGain(); this.padBus.gain.value = 0.32; this.padBus.connect(this.dry); this.padBus.connect(this.verb);
    this.bellBus = ac.createGain(); this.bellBus.gain.value = 0.15;
    this.echo = ac.createDelay(3); this.echo.delayTime.value = BEAT * 0.75;
    this.fb = ac.createGain(); this.fb.gain.value = 0.38;
    this.echoLP = ac.createBiquadFilter(); this.echoLP.type = 'lowpass'; this.echoLP.frequency.value = 1800;
    this.bellBus.connect(this.echo); this.echo.connect(this.echoLP).connect(this.fb).connect(this.echo);
    this.echoLP.connect(this.verb); this.bellBus.connect(this.verb); this.bellBus.connect(this.dry);
    // tape wobble: one slow wave bends every note a few cents up and down
    this.wow = ac.createOscillator(); this.wow.frequency.value = 0.17;
    this.wowAmt = ac.createGain(); this.wowAmt.gain.value = 7; // cents
    this.wow.connect(this.wowAmt); this.wow.start();
  }
  impulse(seconds, decay) {
    const ac = this.ac, len = Math.floor(ac.sampleRate * seconds), buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch); let lp = 0;
      for (let i = 0; i < len; i++) { lp += 0.25 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - i / len, decay); } // darkened noise, fading out
    }
    return buf;
  }
  start() { if (this.on) return; this.on = true; this.next = this.ac.currentTime + 0.1; this.beat = 0; this.timer = setInterval(() => this.schedule(), 250); }
  stop() { this.on = false; clearInterval(this.timer); }
  // look ahead a little and lay down whatever falls in that window
  schedule(until = this.ac.currentTime + 1.5) {
    while (this.next < until) {
      const t = this.next, b = this.beat % 32, cyc = CYCLES[this.cycle % CYCLES.length];
      if (b % 8 === 0) {
        const ch = cyc[b / 8];
        this.bass(NOTE(ch[0]), t, BEAT * 8);
        for (let i = 1; i < ch.length; i++) this.pad(NOTE(ch[i]), t + i * 0.12, BEAT * 8, i);
      }
      // the pulse: a soft, muted pluck of a chord tone on every beat, like a slowed-down arpeggio
      { const ch = cyc[Math.floor(b / 8)]; const order = [1, 2, 3, 2, 4, 2, 3, 1]; this.pluck(NOTE(ch[order[b % 8]] + 12), t); }
      // bells: sparse, more likely on the chord's first beats, sometimes a pair, often silence
      const p = b % 8 === 0 ? 0.6 : b % 2 === 0 ? 0.28 : 0.12;
      if (Math.random() < p) {
        const n = BELLS[Math.floor(Math.random() * BELLS.length)];
        this.bell(NOTE(n), t + (Math.random() < 0.3 ? BEAT * 0.5 : 0));
        if (Math.random() < 0.2) this.bell(NOTE(n - (Math.random() < 0.5 ? 3 : 5)), t + BEAT * 0.75);
      }
      this.beat++; this.next += BEAT;
      if (this.beat % 32 === 0) this.cycle++;
    }
  }
  pad(f, t, dur, i) {
    const ac = this.ac, g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700 + i * 120; lp.Q.value = 0.6;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 2.6); g.gain.setValueAtTime(0.16, t + dur - 0.5); g.gain.linearRampToValueAtTime(0, t + dur + 4);
    lp.connect(g).connect(this.padBus);
    for (const [type, det, lvl] of [['triangle', -7, 1], ['sawtooth', 6, 0.35], ['sine', 0, 0.6]]) {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det; this.wowAmt.connect(o.detune);
      og.gain.value = lvl; o.connect(og).connect(lp);
      o.start(t); o.stop(t + dur + 4.2);
      o.onended = () => { try { this.wowAmt.disconnect(o.detune); } catch (e) { /* gone */ } };
    }
  }
  bass(f, t, dur) {
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = f; this.wowAmt.connect(o.detune);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42, t + 1.5); g.gain.setValueAtTime(0.42, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 2);
    o.connect(g).connect(this.padBus); o.start(t); o.stop(t + dur + 2.2);
    o.onended = () => { try { this.wowAmt.disconnect(o.detune); } catch (e) { /* gone */ } };
  }
  pluck(f, t) {
    const ac = this.ac, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.value = f; this.wowAmt.connect(o.detune);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.8);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.13, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    o.connect(lp).connect(g); g.connect(this.dry); g.connect(this.verb);
    o.start(t); o.stop(t + 1.7);
    o.onended = () => { try { this.wowAmt.disconnect(o.detune); } catch (e) { /* gone */ } };
  }
  bell(f, t) {
    const ac = this.ac, g = ac.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 4);
    g.connect(this.bellBus);
    for (const [mul, lvl] of [[1, 1], [2.01, 0.18], [3.0, 0.06]]) {
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * mul; og.gain.value = lvl;
      o.connect(og).connect(g); o.start(t); o.stop(t + 4.1);
    }
  }
}
