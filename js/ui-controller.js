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
        const instruments = ['Kick Drum', 'Snare 1', 'Main Synth', 'Bassline', 'Vocals (AI)'];
        
        // Setup Ruler
        for(let i=1; i<20; i++) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark';
            mark.style.left = `${(i-1) * 400}px`;
            mark.innerText = i;
            this.dom.ruler.appendChild(mark);
        }

        instruments.forEach((name, i) => {
            this.addTrackToTimeline(name, i);
        });
    }

    addTrackToTimeline(name, index) {
        // Sidebar header
        const header = document.createElement('div');
        header.className = 'track-lane-header';
        header.innerHTML = `<h4>${name}</h4><div class="track-controls"><button>M</button><button>S</button></div>`;
        this.dom.sidebar.appendChild(header);

        // Arrangement Lane
        const lane = document.createElement('div');
        lane.className = 'arrangement-lane';
        
        // Add a mock clip
        const clip = document.createElement('div');
        clip.className = 'clip';
        clip.style.left = `${Math.random() * 800}px`;
        clip.style.width = '300px';
        clip.innerText = `CLIP ${index+1}`;
        lane.appendChild(clip);

        this.dom.arrangement.appendChild(lane);
        this.createMixerChannel(name);

        // Register track in engine
        engine.tracks.push({
            steps: new Array(16).fill(false),
            trigger: (time) => { engine.triggerSynth(80 + (index * 40)); }
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
