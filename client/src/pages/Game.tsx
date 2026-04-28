import React, { useState, useEffect, useRef, useCallback } from 'react';

//======================================================================
// CONFIGURACIÓN GLOBAL (Volúmenes y Voz)
//======================================================================
(window as any).__gameConfig = {
  musicVol: 0.4, sfxVol: 0.6, voiceVol: 0.8, voiceEnabled: false,
  isMuted: false
};

//======================================================================
// MOTOR DE AUDIO Y MÚSICA GENERATIVA
//======================================================================
let audioCtx: any = null;
const initAudio = () => {
  if (!audioCtx) audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const synth = (window as any).speechSynthesis;
  if (synth) { const u = new SpeechSynthesisUtterance(""); u.volume = 0; synth.speak(u); }
};

const playTone = (freq: number, type: string, duration: number, volBase: number, slideFreq: number | null = null) => {
  if ((window as any).__gameConfig.isMuted || !audioCtx) return;
  try {
    const vol = volBase * (window as any).__gameConfig.sfxVol;
    if (vol <= 0) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
  } catch (e) { console.error("Audio error", e); }
};

const sfx = {
  click: () => playTone(600, 'sine', 0.05, 0.1),
  hover: () => playTone(400, 'sine', 0.03, 0.02),
  coin: () => { playTone(1200, 'sine', 0.1, 0.1); setTimeout(() => playTone(1600, 'sine', 0.15, 0.1), 60); },
  dice: () => playTone(800, 'square', 0.02, 0.03),
  correct: () => { playTone(440, 'triangle', 0.1, 0.1); setTimeout(() => playTone(554, 'triangle', 0.1, 0.1), 100); setTimeout(() => playTone(659, 'triangle', 0.3, 0.1), 200); },
  wrong: () => playTone(250, 'sawtooth', 0.4, 0.1, 100),
  attack: () => { playTone(150, 'square', 0.4, 0.15, 50); playTone(200, 'sawtooth', 0.4, 0.1, 80); },
  turn: () => { playTone(500, 'sine', 0.1, 0.1); setTimeout(() => playTone(750, 'sine', 0.2, 0.1), 100); },
  card: () => playTone(150, 'sawtooth', 0.15, 0.05, 400),
  win: () => { playTone(440, 'sine', 0.2, 0.1); setTimeout(() => playTone(554, 'sine', 0.2, 0.1), 200); setTimeout(() => playTone(659, 'sine', 0.6, 0.1), 400); },
  bankrupt: () => { playTone(100, 'sawtooth', 0.8, 0.2, 30); setTimeout(() => playTone(80, 'square', 1.0, 0.2, 20), 400); },
  magic: () => { playTone(880, 'sine', 0.1, 0.1); setTimeout(() => playTone(1108, 'sine', 0.1, 0.1), 100); setTimeout(() => playTone(1318, 'sine', 0.4, 0.1), 200); },
  build: () => { playTone(300, 'square', 0.1, 0.1); setTimeout(() => playTone(400, 'square', 0.1, 0.1), 100); setTimeout(() => playTone(500, 'triangle', 0.2, 0.1), 200); }
};

// NARRADOR
const narrate = (text: string, priority = false) => {
  if (!(window as any).__gameConfig.voiceEnabled || (window as any).__gameConfig.isMuted || (window as any).__gameConfig.voiceVol <= 0) return;
  const synth = (window as any).speechSynthesis;
  if (!synth) return;
  if (synth.paused) synth.resume();
  if (priority) synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.volume = (window as any).__gameConfig.voiceVol;
  const voices = synth.getVoices();
  const spanishVoice = voices.find((v: any) => v.lang.startsWith('es')) || voices[0];
  if (spanishVoice) utterance.voice = spanishVoice;
  utterance.lang = 'es-MX';
  utterance.rate = 1.1;
  utterance.pitch = 1.0;
  if (!priority && synth.speaking) return;
  synth.speak(utterance);
};

// MUSIC ENGINE
const musicEngine = {
  interval: null as any, step: 0, currentMode: null as any, currentBoard: null as any,
  play: function (mode: string, board = 'b_classic') {
    if (this.currentMode === mode && this.currentBoard === board) return;
    this.currentMode = mode; this.currentBoard = board;
    clearInterval(this.interval); this.step = 0;
    if (mode === 'menu') {
      const scale = [220, 261.63, 329.63, 392.00, 440, 392.00, 329.63, 261.63];
      this.interval = setInterval(() => {
        const v = (window as any).__gameConfig.musicVol;
        if (!(window as any).__gameConfig.isMuted && audioCtx && v > 0) playTone(scale[this.step % scale.length], 'sine', 1.5, 0.05 * v);
        this.step++;
      }, 800);
    } else if (mode === 'game') {
      let bass, lead, bassType, leadType, speed;
      if (board === 'b_neon') { bass = [65.41, 0, 65.41, 77.78, 65.41, 0, 58.27, 73.42]; lead = [0, 523.25, 0, 659.25, 783.99, 0, 659.25, 0]; bassType = 'sawtooth'; leadType = 'square'; speed = 250; }
      else if (board === 'b_forest') { bass = [130.81, 146.83, 164.81, 146.83]; lead = [523.25, 0, 659.25, 0]; bassType = 'triangle'; leadType = 'sine'; speed = 500; }
      else if (board === 'b_lava') { bass = [41.20, 43.65, 41.20, 49.00, 36.71, 0, 41.20, 0]; lead = [0, 0, 329.63, 0, 0, 0, 311.13, 0]; bassType = 'sawtooth'; leadType = 'triangle'; speed = 450; }
      else { bass = [110, 110, 130.81, 110, 146.83, 130.81, 110, 82.41]; lead = [0, 440, 0, 523.25, 659.25, 0, 523.25, 0]; bassType = 'triangle'; leadType = 'square'; speed = 350; }
      this.interval = setInterval(() => {
        const v = (window as any).__gameConfig.musicVol;
        if (!(window as any).__gameConfig.isMuted && audioCtx && v > 0) {
          if (bass[this.step % bass.length]) playTone(bass[this.step % bass.length], bassType, 0.3, 0.08 * v);
          if (lead[this.step % lead.length]) playTone(lead[this.step % lead.length], leadType, 0.2, 0.03 * v);
        }
        this.step++;
      }, speed);
    }
  },
  stop: function () { clearInterval(this.interval); this.currentMode = null; }
};

// --- ESTILOS GLOBALES ---
const GlobalStyles = ({ theme }: { theme: string }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
    :root {
      --bg-color: ${theme === 'dark' ? '#0f172a' : '#f0fdf4'};
      --text-color: ${theme === 'dark' ? '#f8fafc' : '#1e293b'};
      --panel-bg: ${theme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'};
      --panel-border: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
      --panel-shadow: ${theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'};
      --accent-color: ${theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.05)'};
    }
    body { font-family: 'Nunito', sans-serif; background-color: var(--bg-color); color: var(--text-color); overflow: hidden; margin: 0; padding: 0; touch-action: none; transition: background-color 0.5s ease, color 0.5s ease; }
    @keyframes title-wave { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
    @keyframes pop-in { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    @keyframes float-slow { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
    @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.3), inset 0 0 10px rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); } 50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.7), inset 0 0 20px rgba(16, 185, 129, 0.4); border-color: rgba(16, 185, 129, 1); } }
    @keyframes throw { 0% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.1) rotate(15deg); } 100% { transform: translateY(0) scale(1) rotate(0deg); } }
    .title-anim { animation: title-wave 4s ease-in-out infinite; } .pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .float-anim { animation: float 4s ease-in-out infinite; } .float-slow { animation: float-slow 6s ease-in-out infinite; }
    .turn-glow { animation: glow-pulse 2s infinite; } .anim-throw { animation: throw 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
    .anime-speed-lines { background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.1) 0deg 5deg, transparent 5deg 15deg); animation: spin-speed 1.5s linear infinite; }
    @keyframes spin-speed { 100% { transform: rotate(360deg); } }
    .glass-panel { background: var(--panel-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--panel-border); box-shadow: 0 15px 35px var(--panel-shadow); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .inner-module { background: var(--accent-color); border: 1px solid var(--panel-border); }
    .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .mask-linear-right { -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); mask-image: linear-gradient(to right, black 85%, transparent 100%); }
    .uno-card { background-size: 200% 200%; box-shadow: -5px 10px 20px rgba(0,0,0,0.3), inset 0 0 0 6px white; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); color: white; }
    .uno-card-inner { background: rgba(255,255,255,0.15); transform: skewY(-10deg); box-shadow: inset 0 0 20px rgba(0,0,0,0.1); }
    .custom-scroll::-webkit-scrollbar { width: 8px; } .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; } .custom-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.5); border-radius: 10px; } .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.8); }
    input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #10b981; cursor: pointer; margin-top: -8px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 6px; cursor: pointer; background: rgba(255,255,255,0.2); border-radius: 10px; border: 1px solid rgba(0,0,0,0.1); }
    .light-theme input[type=range]::-webkit-slider-runnable-track { background: rgba(0,0,0,0.1); }
  `}</style>
);

const QUESTION_BANK = [
  { q: "¿Qué nombre recibe el payaso diabólico en 'It'?", options: ["Pennywise", "Joker", "Bozo", "Pogo"], a: "Pennywise", tipo: "Pregunta Especial ⭐" },
  { q: "¿En qué hotel se desarrolla 'El Resplandor'?", options: ["Hotel Overlook", "Hotel Stanley", "Motel Bates", "Hotel Cortez"], a: "Hotel Overlook", tipo: "Pregunta Especial ⭐" },
  { q: "¿Qué escritora secuestra a su autor en 'Misery'?", options: ["Annie Wilkes", "Carrie White", "Rose la Chistera", "Margaret White"], a: "Annie Wilkes", tipo: "Pregunta Especial ⭐" },
  { q: "¿Cuál es el verdadero nombre de Lord Voldemort?", options: ["Tom Riddle", "Gellert Grindelwald", "Severus Snape", "Lucius Malfoy"], a: "Tom Riddle", tipo: "Pregunta Especial ⭐" },
  { q: "¿Quién forjó el Anillo Único en 'El Señor de los Anillos'?", options: ["Sauron", "Gandalf", "Frodo", "Morgoth"], a: "Sauron", tipo: "Pregunta Especial ⭐" },
  { q: "¿Quién es el autor de '1984'?", options: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "Isaac Asimov"], a: "George Orwell", tipo: "Pregunta Especial ⭐" },
  { q: "En 'Fahrenheit 451', ¿a qué temperatura arden los libros?", options: ["451 grados", "100 grados", "1000 grados", "500 grados"], a: "451 grados", tipo: "Pregunta Especial ⭐" },
  { q: "¿Quién escribió 'Cien años de soledad'?", options: ["G. García Márquez", "M. Vargas Llosa", "Julio Cortázar", "J.L. Borges"], a: "G. García Márquez", tipo: "Pregunta Especial ⭐" },
  { q: "¿Quién es el autor de 'El Cuervo'?", options: ["Edgar Allan Poe", "H.P. Lovecraft", "Mary Shelley", "Bram Stoker"], a: "Edgar Allan Poe", tipo: "Pregunta Especial ⭐" },
  { q: "¿A qué autor pertenece la obra 'Don Quijote de la Mancha'?", options: ["Miguel de Cervantes", "Lope de Vega", "Garcilaso de la Vega", "Francisco de Quevedo"], a: "Miguel de Cervantes", tipo: "Pregunta Especial ⭐" },
];

const AVATAR_SHOP = [
  { id: 'av1', name: "Lector", icon: "📖", price: 0, ability: "Sin habilidad especial." },
  { id: 'av2', name: "Mago", icon: "🧙‍♂️", price: 0, ability: "Inmune a la cárcel de Azkaban." },
];

const TOKEN_SHOP = [
  { id: 'tk1', name: "Peón", icon: "♟️", type: "pawn", price: 0 },
  { id: 'tk2', name: "Corona", icon: "👑", type: "pawn", price: 0 },
];

const BOARD_DATA = [
  { id: 0, name: "INICIO", type: "start", color: "bg-emerald-400", icon: "🏁", desc: "Recibes $200 al pasar." },
  { id: 1, name: "CARRIE", type: "prop", price: 100, rent: 40, color: "bg-rose-500", icon: "📚" },
];

export default function Game() {
  const [theme, setTheme] = useState('dark');
  
  useEffect(() => {
    initAudio();
    musicEngine.play('menu');
  }, []);

  return (
    <div className="w-full h-screen" style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#f0fdf4', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}>
      <GlobalStyles theme={theme} />
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 float-anim">🎓</div>
          <h1 className="text-5xl font-black mb-4 title-anim" style={{ fontFamily: "'Playfair Display', serif" }}>
            EXAMEN<span style={{ color: '#10b981' }}>-POLY</span>
          </h1>
          <p className="text-xl opacity-70 mb-8">Ultimate Edition - Estudio y Diversión</p>
          <button 
            onClick={() => { sfx.magic(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
            className="px-8 py-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
            style={{ color: '#10b981' }}
          >
            🎮 Cargar Juego
          </button>
        </div>
      </div>
    </div>
  );
}
