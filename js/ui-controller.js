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
            grid: document.getElementById('sequencer-grid'),
            canvas: document.getElementById('oscilloscope'),
            learnBtn: document.getElementById('learn-btn'),
            libraryView: document.getElementById('view-library'),
            closeLibrary: document.querySelector('.close-modal')
        };

        this.ctx2d = this.dom.canvas.getContext('2d');
        this.setupListeners();
        this.createGrid();
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

        window.addEventListener('step-changed', (e) => {
            this.updateGridActiveStep(e.detail.step);
        });
    }

    switchView(viewId) {
        this.dom.views.forEach(v => {
            if (v.id === viewId) v.classList.add('active');
            else v.classList.remove('active');
        });
    }

    createGrid() {
        const instruments = ['Kick', 'Snare', 'Hi-Hat', 'Synth Loop'];
        
        instruments.forEach((name, i) => {
            const lane = document.createElement('div');
            lane.className = 'track-lane';
            
            const info = document.createElement('div');
            info.className = 'track-info';
            info.innerText = name;
            
            const stepsContainer = document.createElement('div');
            stepsContainer.className = 'steps';
            
            const trackState = { name, steps: new Array(16).fill(false) };
            
            for (let s = 0; s < 16; s++) {
                const step = document.createElement('div');
                step.className = 'step';
                step.addEventListener('click', () => {
                    trackState.steps[s] = !trackState.steps[s];
                    step.classList.toggle('active');
                    // Mock sound trigger on click
                    if (trackState.steps[s]) engine.triggerSynth(200 + (i * 100));
                });
                stepsContainer.appendChild(step);
            }
            
             lane.appendChild(info);
            lane.appendChild(stepsContainer);
            this.dom.grid.appendChild(lane);
            
            this.createMixerChannel(name);

            // Register track in engine
            engine.tracks.push({
                steps: trackState.steps,
                trigger: (time) => {
                    // Very basic sound for now
                    engine.triggerSynth(100 + (i * 50));
                }
            });
        });
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
        stems.forEach(name => {
            // Logic to add rows to grid dynamically
            const lane = document.createElement('div');
            lane.className = 'track-lane ai-stem';
            lane.innerHTML = `<div class="track-info" style="color:var(--primary)">${name}</div><div class="steps"></div>`;
            const stepsDiv = lane.querySelector('.steps');
            for(let i=0; i<16; i++) {
                const s = document.createElement('div');
                s.className = 'step';
                stepsDiv.appendChild(s);
            }
            this.dom.grid.prepend(lane);
            this.createMixerChannel(name);
        });
        this.switchView('view-sequencer');
    }

    updateGridActiveStep(stepIndex) {
        const lanes = this.dom.grid.querySelectorAll('.track-lane');
        lanes.forEach(lane => {
            const steps = lane.querySelectorAll('.step');
            steps.forEach((s, i) => {
                if (i === stepIndex) s.style.border = '1px solid white';
                else s.style.border = 'none';
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
