import { engine } from './audio-engine.js';

class UIController {
    constructor() {
        this.dom = {
            bootScreen: document.getElementById('boot-screen'),
            startBtn: document.getElementById('start-engine'),
            playBtn: document.getElementById('play-btn'),
            navItems: document.querySelectorAll('.nav-item'),
            views: document.querySelectorAll('.view'),
            bpmInput: document.getElementById('bpm-input'),
            sidebar: document.getElementById('tracks-sidebar'),
            arrangement: document.getElementById('arrangement-area'),
            playhead: document.getElementById('playhead'),
            ruler: document.getElementById('time-ruler'),
            canvas: document.getElementById('oscilloscope'),
            learnBtn: document.getElementById('learn-btn'),
            libraryView: document.getElementById('view-library'),
            closeLibrary: document.querySelector('.close-modal'),
            envA: document.getElementById('env-a'),
            envD: document.getElementById('env-d'),
            envS: document.getElementById('env-s'),
            envR: document.getElementById('env-r'),
            piano: document.getElementById('piano-keys')
        };

        this.ctx2d = this.dom.canvas.getContext('2d');
        this.setupListeners();
        this.createGrid();
        this.createPiano();
        this.animateVisualizer();
    }

    setupListeners() {
        this.dom.startBtn.addEventListener('click', async () => {
            await engine.init();
            this.dom.bootScreen.style.opacity = '0';
            setTimeout(() => this.dom.bootScreen.style.display = 'none', 500);
        });

        this.dom.playBtn.addEventListener('click', () => {
            if (engine.isPlaying) {
                engine.stopTransport();
                this.dom.playBtn.classList.remove('playing');
                this.dom.playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            } else {
                engine.startTransport();
                this.dom.playBtn.classList.add('playing');
                this.dom.playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            }
        });

        this.dom.bpmInput.addEventListener('change', (e) => {
            engine.bpm = parseInt(e.target.value);
        });

        this.dom.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const viewId = `view-${item.dataset.view}`;
                this.switchView(viewId);
                this.dom.navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
            });
        });

        this.dom.learnBtn.addEventListener('click', () => {
            this.dom.libraryView.classList.add('active');
        });

        this.dom.closeLibrary.addEventListener('click', () => {
            this.dom.libraryView.classList.remove('active');
        });

        // Sampler Pads
        document.querySelectorAll('.pad').forEach(pad => {
            pad.addEventListener('mousedown', () => {
                pad.classList.add('active');
                engine.triggerSynth(220 + (Math.random() * 440)); // Mock sound
            });
            pad.addEventListener('mouseup', () => pad.classList.remove('active'));
            pad.addEventListener('mouseleave', () => pad.classList.remove('active'));
        });

        // AI Lab Upload
        const songUpload = document.getElementById('song-upload');
        const aiProgress = document.getElementById('ai-progress');
        
        songUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                aiProgress.classList.remove('hidden');
                // Simulate AI processing
                setTimeout(() => {
                    aiProgress.classList.add('hidden');
                    alert("Décomposition terminée ! 4 pistes ont été générées : VOCAL, DRUMS, BASS, INSTRUMENTAL.");
                    this.addStemsToSequencer();
                }, 5000);
            }
        });

        // Expert Knobs Interaction
        this.initKnobs();

        // ADSR Sliders
        const updateADSR = () => {
            engine.synthSettings.adsr = {
                a: this.dom.envA.value / 100,
                d: this.dom.envD.value / 100,
                s: this.dom.envS.value / 100,
                r: this.dom.envR.value / 50
            };
        };
        [this.dom.envA, this.dom.envD, this.dom.envS, this.dom.envR].forEach(s => s.addEventListener('input', updateADSR));

        window.addEventListener('step-changed', (e) => {
            this.updateTimelinePlayhead(e.detail.step);
        });
    }

    switchView(viewId) {
        this.dom.views.forEach(v => {
            if (v.id === viewId) v.classList.add('active');
            else v.classList.remove('active');
        });
    }

    createGrid() {
        const instruments = [
            { name: 'Drums / Batterie', icon: '🥁' },
            { name: 'Grand Piano', icon: '🎹' },
            { name: 'Electric Guitar', icon: '🎸' },
            { name: 'Pan Flute', icon: '🎋' },
            { name: 'Whistle / Sifflet', icon: '🌬️' },
            { name: 'Tam-Tam / Perc.', icon: '🪘' }
        ];
        
        // Setup Ruler
        for(let i=1; i<20; i++) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark';
            mark.style.left = `${(i-1) * 400}px`;
            mark.innerText = i;
            this.dom.ruler.appendChild(mark);
        }

        instruments.forEach((inst, i) => {
            this.addTrackToTimeline(`${inst.icon} ${inst.name}`, i);
        });
    }

    addTrackToTimeline(name, index) {
        const header = document.createElement('div');
        header.className = 'track-lane-header';
        header.innerHTML = `<h4>${name}</h4><div class="track-controls"><button>M</button><button>S</button></div>`;
        this.dom.sidebar.appendChild(header);

        const lane = document.createElement('div');
        lane.className = 'arrangement-lane';
        
        const clip = document.createElement('div');
        clip.className = 'clip';
        clip.style.left = `${Math.random() * 800}px`;
        clip.style.width = '300px';
        clip.innerHTML = `<span>CLIP_${index+1}</span><div class="clip-handle"></div>`;
        
        this.initClipInteraction(clip);
        lane.appendChild(clip);

        this.dom.arrangement.appendChild(lane);
        this.createMixerChannel(name);

        engine.tracks.push({
            steps: new Array(16).fill(false),
            trigger: (time) => { engine.triggerSynth(80 + (index * 40)); }
        });
    }

    initClipInteraction(clip) {
        let isDragging = false;
        let isResizing = false;
        let startX, startLeft, startWidth;

        clip.addEventListener('mousedown', (e) => {
            if (e.target.className === 'clip-handle') {
                isResizing = true;
            } else {
                isDragging = true;
            }
            startX = e.clientX;
            startLeft = parseInt(clip.style.left) || 0;
            startWidth = parseInt(clip.style.width) || 100;
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - startX;
                clip.style.left = `${Math.max(0, startLeft + dx)}px`;
            }
            if (isResizing) {
                const dx = e.clientX - startX;
                clip.style.width = `${Math.max(20, startWidth + dx)}px`;
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            isResizing = false;
        });
    }

    createPiano() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octaves = [2, 3, 4];
        
        octaves.forEach(oct => {
            notes.forEach(note => {
                const key = document.createElement('div');
                const isBlack = note.includes('#');
                key.className = `key ${isBlack ? 'black' : 'white'}`;
                key.dataset.note = `${note}${oct}`;
                
                key.addEventListener('mousedown', () => {
                    key.classList.add('active');
                    const freq = this.noteToFreq(note, oct);
                    engine.triggerSynth(freq);
                });
                key.addEventListener('mouseup', () => key.classList.remove('active'));
                key.addEventListener('mouseleave', () => key.classList.remove('active'));
                
                this.dom.piano.appendChild(key);
            });
        });
    }

    noteToFreq(note, octave) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const n = notes.indexOf(note);
        return 440 * Math.pow(2, (n + (octave - 4) * 12) / 12);
    }

    createMixerChannel(name) {
        const chan = document.createElement('div');
        chan.className = 'mixer-channel';
        chan.innerHTML = `
            <div class="channel-name">${name}</div>
            <div class="fader-box">
                <input type="range" orient="vertical" value="70">
            </div>
            <div class="pan-knob knob" style="width:30px; height:30px;"></div>
        `;
        document.getElementById('mixer-channels').appendChild(chan);
    }

    addStemsToSequencer() {
        const stems = ['VOC_STEM', 'DRUM_STEM', 'BASS_STEM', 'INST_STEM'];
        stems.forEach((name, i) => {
            this.addTrackToTimeline(name, i);
        });
        this.switchView('view-sequencer');
    }

    updateTimelinePlayhead(stepIndex) {
        const beatWidth = 100; // Match CSS grid line frequency
        const stepWidth = beatWidth / 4;
        const x = stepIndex * stepWidth;
        this.dom.playhead.style.left = `${x}px`;
    }

    initKnobs() {
        const knobConfigs = {
            'filter-freq': { param: 'filterFreq', min: 20, max: 10000 },
            'filter-res': { param: 'filterRes', min: 0, max: 20 },
            'lfo-rate': { param: 'lfoRate', min: 0.1, max: 20 },
            'lfo-depth': { param: 'lfoDepth', min: 0, max: 1 },
            'osc-mix': { param: 'oscMix', min: 0, max: 1 }
        };

        Object.keys(knobConfigs).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            
            let isDragging = false;
            let startY = 0;
            let startVal = engine.synthSettings[knobConfigs[id].param];

            el.addEventListener('mousedown', (e) => {
                isDragging = true;
                startY = e.clientY;
                startVal = engine.synthSettings[knobConfigs[id].param];
                document.body.style.cursor = 'ns-resize';
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const delta = (startY - e.clientY) / 100;
                const config = knobConfigs[id];
                let newVal = startVal + delta * (config.max - config.min);
                newVal = Math.max(config.min, Math.min(config.max, newVal));
                
                engine.synthSettings[config.param] = newVal;
                // Visual rotation
                const rotation = ((newVal - config.min) / (config.max - config.min)) * 270 - 135;
                el.style.transform = `rotate(${rotation}deg)`;
            });

            window.addEventListener('mouseup', () => {
                isDragging = false;
                document.body.style.cursor = 'default';
            });
        });

        // Wave Cycling
        const waves = ['sawtooth', 'square', 'sine', 'triangle'];
        ['osc1-wave', 'osc2-wave'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('click', () => {
                const setting = id === 'osc1-wave' ? 'osc1Wave' : 'osc2Wave';
                const currentIndex = waves.indexOf(engine.synthSettings[setting]);
                const nextIndex = (currentIndex + 1) % waves.length;
                engine.synthSettings[setting] = waves[nextIndex];
                el.setAttribute('data-wave', waves[nextIndex]);
                // Visual cue
                el.style.borderColor = nextIndex % 2 === 0 ? 'var(--primary)' : 'var(--secondary)';
            });
        });
    }

    animateVisualizer() {
        if (!engine.analyser) {
            requestAnimationFrame(() => this.animateVisualizer());
            return;
        }

        const bufferLength = engine.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            requestAnimationFrame(draw);
            engine.analyser.getByteTimeDomainData(dataArray);

            this.ctx2d.fillStyle = 'rgba(5, 5, 10, 0.2)';
            this.ctx2d.fillRect(0, 0, this.dom.canvas.width, this.dom.canvas.height);

            this.ctx2d.lineWidth = 2;
            this.ctx2d.strokeStyle = '#00e5ff';
            this.ctx2d.beginPath();

            const sliceWidth = this.dom.canvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * this.dom.canvas.height / 2;

                if (i === 0) this.ctx2d.moveTo(x, y);
                else this.ctx2d.lineTo(x, y);

                x += sliceWidth;
            }

            this.ctx2d.lineTo(this.dom.canvas.width, this.dom.canvas.height / 2);
            this.ctx2d.stroke();
        };

        draw();
    }
}

new UIController();
