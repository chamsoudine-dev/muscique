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

    createSynthVoice() {
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        env.gain.setValueAtTime(0, this.ctx.currentTime);
        
        osc.connect(env);
        env.connect(this.masterGain);
        
        return { osc, env };
    }

    triggerSynth(freq, adsr = { a: 0.01, d: 0.2, s: 0.5, r: 0.5 }) {
        if (!this.ctx) return;
        
        const now = this.ctx.currentTime;
        const { osc, env } = this.createSynthVoice();
        
        osc.frequency.setValueAtTime(freq, now);
        
        // Attack
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.4, now + adsr.a);
        
        // Decay & Sustain
        env.gain.linearRampToValueAtTime(adsr.s * 0.4, now + adsr.a + adsr.d);
        
        osc.start(now);
        
        // Release (simulated for trigger)
        const totalDuration = adsr.a + adsr.d + adsr.r;
        env.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);
        osc.stop(now + totalDuration + 0.1);
    }
}

export const engine = new AudioEngine();
