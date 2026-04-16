/**
 * MED-KING PRO Audio Engine
 * High-performance Web Audio API with Subtractive Synthesis
 */

class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  settings = {
    osc1: 'sawtooth',
    osc2: 'square',
    filter: 2000,
    res: 1,
    lfoRate: 5,
    lfoDepth: 0,
    adsr: { a: 0.1, d: 0.2, s: 0.5, r: 0.8 }
  };

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  trigger(freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();

    o1.type = this.settings.osc1 as OscillatorType;
    o2.type = this.settings.osc2 as OscillatorType;
    o1.frequency.setValueAtTime(freq, now);
    o2.frequency.setValueAtTime(freq * 1.01, now);

    f.type = 'lowpass';
    f.frequency.value = this.settings.filter;
    f.Q.value = this.settings.res;

    lfo.frequency.value = this.settings.lfoRate;
    lfoG.gain.value = this.settings.lfoDepth * 1000;
    lfo.connect(lfoG);
    lfoG.connect(f.frequency);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + this.settings.adsr.a);
    env.gain.linearRampToValueAtTime(this.settings.adsr.s, now + this.settings.adsr.a + this.settings.adsr.d);

    o1.connect(f);
    o2.connect(f);
    f.connect(env);
    env.connect(this.masterGain);

    o1.start(now);
    o2.start(now);
    lfo.start(now);

    const dur = this.settings.adsr.a + this.settings.adsr.d + this.settings.adsr.r;
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o1.stop(now + dur + 0.1);
    o2.stop(now + dur + 0.1);
    lfo.stop(now + dur + 0.1);
  }
}

export const engine = new AudioEngine();
