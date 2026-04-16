import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Cpu, Music, Drum, Settings, BookOpen, Layers } from 'lucide-react';
import { engine } from './audio/engine';
import { Visualizer3D } from './components/Visualizer3D';

const App = () => {
  const [init, setInit] = useState(false);
  const [view, setView] = useState('sequencer');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Initialization logic
  }, []);

  const handleInit = async () => {
    await engine.init();
    setInit(true);
  };

  const instruments = [
    { name: 'Batterie Pro', icon: <Drum />, color: 'bg-gold-500' },
    { name: 'Tam-Tam / Perc', icon: <Cpu />, color: 'bg-accent' },
    { name: 'Flute / Sifflet', icon: <Music />, color: 'bg-blue-500' },
    { name: 'Guitare / Bass', icon: <Layers />, color: 'bg-green-500' },
  ];

  if (!init) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h1 className="text-7xl font-black mb-4 tracking-tighter bg-clip-text text-transparent premium-gradient">
            MED-KING PRO
          </h1>
          <p className="text-primary tracking-[0.5em] font-bold mb-12">PRODUCTION SUITE V7.0</p>
          <button 
            onClick={handleInit}
            className="px-12 py-5 bg-primary text-black font-black rounded-full hover:scale-110 transition-transform shadow-[0_0_30px_rgba(255,215,0,0.4)]"
          >
            INITIALISER L'EXPÉRIENCE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col relative overflow-hidden">
      <Visualizer3D analyser={engine.analyser} />

      {/* Header */}
      <header className="h-20 glass flex items-center justify-between px-8 z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 premium-gradient rounded-lg flex items-center justify-center font-black">MK</div>
          <h1 className="text-2xl font-black">MED-KING <span className="font-thin text-primary">STUDIO</span></h1>
        </div>

        <div className="flex items-center gap-6 bg-black/40 px-6 py-2 rounded-full border border-white/10">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${isPlaying ? 'bg-red-500 shadow-[0_0_20px_red]' : 'bg-primary text-black'}`}
          >
            {isPlaying ? <Square size={24} /> : <Play size={24} fill="currentColor" />}
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Tempo</span>
            <span className="font-mono text-xl font-bold">128.00</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 glass rounded-xl hover:bg-white/10 transition-colors">
            <BookOpen size={18} />
            <span className="text-sm font-bold">Bibliothèque</span>
          </button>
          <button className="px-6 py-3 premium-gradient text-black font-black rounded-xl">SAVE</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav className="w-24 bg-black/40 border-r border-white/10 flex flex-col py-8 gap-8 items-center z-10">
          {[
            { id: 'sequencer', icon: <Layers /> },
            { id: 'synth', icon: <Settings /> },
            { id: 'pads', icon: <Drum /> },
            { id: 'ai', icon: <Cpu /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${view === item.id ? 'bg-primary text-black scale-110 shadow-lg' : 'text-gray-500 hover:text-white'}`}
            >
              {item.icon}
            </button>
          ))}
        </nav>

        {/* Workspace */}
        <section className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {view === 'sequencer' && (
              <motion.div 
                key="seq" 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col gap-4"
              >
                <h2 className="text-3xl font-black mb-4">Timeline de Composition</h2>
                {instruments.map((inst, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="w-48 h-20 glass rounded-xl flex flex-col justify-center px-4 border-l-4 border-primary">
                      <span className="text-xs text-gray-400">Track {i + 1}</span>
                      <span className="font-bold flex items-center gap-2">{inst.icon} {inst.name}</span>
                    </div>
                    <div className="flex-1 glass rounded-xl relative overflow-hidden bg-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isPlaying ? '100%' : '0%' }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-0 left-0 w-1 h-full bg-primary/40"
                      />
                      <div className="w-40 h-16 absolute top-2 left-10 bg-primary/20 border border-primary/40 rounded-lg flex items-center px-4 font-black text-xs text-primary backdrop-blur-md">
                        CLIP_REGION_{i+1}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {view === 'pads' && (
              <motion.div 
                key="pads" 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-4 gap-6 w-full max-w-4xl mx-auto pt-10"
              >
                {[...Array(12)].map((_, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.9, backgroundColor: '#ffd700', color: '#000' }}
                    onClick={() => engine.trigger(100 + (i * 20))}
                    className="aspect-square glass rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary transition-all group"
                  >
                    <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-primary transition-colors" />
                    <span className="text-[10px] font-black text-gray-500 group-hover:text-primary">PAD_{i + 1}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer Status */}
      <footer className="h-10 bg-black/60 border-t border-white/5 flex items-center px-8 text-[10px] text-gray-500 uppercase tracking-tighter gap-8 z-10">
        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full" /> Engine Status: Active</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-primary rounded-full" /> Premium Session: MED-KING Expert</div>
        <div className="ml-auto">Powered by React + WebAudio + Three.js</div>
      </footer>
    </div>
  );
};

export default App;
