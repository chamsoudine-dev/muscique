/**
 * MUSCIQ Audio Engine
 * Core Web Audio API implementation
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.limiter = null;
        this.analyser = null;
        this.bpm = 120;
        this.isPlaying = false;
        this.currentStep = 0;
        this.tracks = [];
        this.schedulerTimer = null;
        this.nextStepTime = 0;
        this.lookahead = 25.0; // How frequently to call scheduler (ms)
        this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (s)
    }

    async init() {
        if (this.ctx) return;
        
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Synth Settings
        this.synthSettings = {
            osc1Wave: 'sawtooth',
            osc2Wave: 'square',
            oscMix: 0.5,
            filterFreq: 2000,
            filterRes: 1,
            lfoRate: 5,
            lfoDepth: 0,
            adsr: { a: 0.1, d: 0.2, s: 0.5, r: 0.8 }
        };

        // Signal Chain: Nodes -> Master Gain -> Limiter -> Destination
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.7;

        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.setValueAtTime(-1, this.ctx.currentTime);
        this.limiter.knee.setValueAtTime(0, this.ctx.currentTime);
        this.limiter.ratio.setValueAtTime(20, this.ctx.currentTime);
        this.limiter.attack.setValueAtTime(0, this.ctx.currentTime);
        this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime);

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;

        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        console.log("Audio Engine Initialized");
    }

    startTransport() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.isPlaying = true;
        this.nextStepTime = this.ctx.currentTime;
        this.scheduler();
    }

    stopTransport() {
        this.isPlaying = false;
        clearTimeout(this.schedulerTimer);
        this.currentStep = 0;
    }

    scheduler() {
        while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.currentStep, this.nextStepTime);
            this.advanceStep();
        }
        this.schedulerTimer = setTimeout(() => this.scheduler(), this.lookahead);
    }

    advanceStep() {
        const secondsPerBeat = 60.0 / this.bpm;
        const secondsPerStep = secondsPerBeat / 4; // 16th notes
        this.nextStepTime += secondsPerStep;
        this.currentStep = (this.currentStep + 1) % 16;
        
        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('step-changed', { detail: { step: this.currentStep } }));
    }

    scheduleStep(step, time) {
        this.tracks.forEach(track => {
            if (track.steps[step]) {
                track.trigger(time);
            }
        });
    }

    createSynthVoice(freq) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const mix1 = this.ctx.createGain();
        const mix2 = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const env = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        
        osc1.type = this.synthSettings.osc1Wave;
        osc2.type = this.synthSettings.osc2Wave;
        osc1.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(freq * 1.01, this.ctx.currentTime); // Slight detune
        
        mix1.gain.value = 1 - this.synthSettings.oscMix;
        mix2.gain.value = this.synthSettings.oscMix;

        filter.type = 'lowpass';
        filter.frequency.value = this.synthSettings.filterFreq;
        filter.Q.value = this.synthSettings.filterRes;

        lfo.frequency.value = this.synthSettings.lfoRate;
        lfoGain.gain.value = this.synthSettings.lfoDepth * 1000;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        env.gain.setValueAtTime(0, this.ctx.currentTime);
        
        osc1.connect(mix1);
        osc2.connect(mix2);
        mix1.connect(filter);
        mix2.connect(filter);
        filter.connect(env);
        env.connect(this.masterGain);
        
        return { osc1, osc2, lfo, env, filter };
    }

    triggerSynth(freq) {
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const adsr = this.synthSettings.adsr;
        const { osc1, osc2, lfo, env } = this.createSynthVoice(freq);
        
        // Attack
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.4, now + adsr.a);
        
        // Decay & Sustain
        env.gain.linearRampToValueAtTime(adsr.s * 0.4, now + adsr.a + adsr.d);
        
        osc1.start(now);
        osc2.start(now);
        lfo.start(now);
        
        // Release (simulated for trigger)
        const totalDuration = adsr.a + adsr.d + adsr.r;
        env.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
        
        const stopTime = now + totalDuration + 0.1;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        lfo.stop(stopTime);
    }
}

export const engine = new AudioEngine();
