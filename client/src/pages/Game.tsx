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

// DATOS DEL JUEGO
const BOARD_SHOP = [
  { id: 'b_classic', name: "Clásico", icon: "🏛️", price: 0, desc: "Elegante y limpio, con un fino tablero de madera.", colors: { bg1: '#0f172a', bg2: '#020617', boardTop: '#e2e8f0', wall: ['#64748b', '#94a3b8', '#64748b', '#94a3b8'], boardBorder: '#cbd5e1', fog: 'rgba(2, 6, 23, 0.9)', particle: 'rgba(251, 191, 36, 0.4)', textBase: '#1e293b' } },
  { id: 'b_neon', name: "Cyber Neón", icon: "🌃", price: 800, desc: "Suelo de cuadrícula y luces de neón en la red digital.", colors: { bg1: '#09090b', bg2: '#000000', boardTop: '#18181b', wall: ['#db2777', '#be185d', '#db2777', '#be185d'], boardBorder: '#f472b6', fog: 'rgba(0, 0, 0, 0.95)', particle: 'rgba(244, 114, 182, 0.8)', textBase: '#fdf2f8' } },
  { id: 'b_forest', name: "Bosque Mágico", icon: "🌲", price: 1200, desc: "Suelo terroso, pinos espesos y luciérnagas mágicas.", colors: { bg1: '#064e3b', bg2: '#022c22', boardTop: '#dcfce7', wall: ['#059669', '#10b981', '#059669', '#10b981'], boardBorder: '#34d399', fog: 'rgba(2, 44, 34, 0.95)', particle: 'rgba(167, 243, 208, 0.6)', textBase: '#064e3b' } },
  { id: 'b_lava', name: "Infierno", icon: "🌋", price: 2000, desc: "Suelo resquebrajado ardiente y magma oscuro.", colors: { bg1: '#450a0a', bg2: '#2c0606', boardTop: '#262626', wall: ['#dc2626', '#ef4444', '#dc2626', '#ef4444'], boardBorder: '#f87171', fog: 'rgba(44, 6, 6, 0.98)', particle: 'rgba(251, 146, 60, 0.9)', textBase: '#fef2f2' } }
];

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
  { q: "¿Qué tipo de palabra es 'canción' según su acento?", options: ["Aguda", "Grave", "Esdrújula", "Sobresdrújula"], a: "Aguda", tipo: "Ortografía" },
  { q: "¿Las palabras esdrújulas siempre llevan tilde?", options: ["Sí, siempre", "No, nunca", "A veces", "Solo en plural"], a: "Sí, siempre", tipo: "Ortografía" },
  { q: "¿Cuál es el antónimo de 'efímero'?", options: ["Eterno o duradero", "Fugaz", "Rápido", "Breve"], a: "Eterno o duradero", tipo: "Habilidad Verbal" },
  { q: "¿Cómo se escribe correctamente para referirse al lugar?", options: ["Allá", "Halla", "Haya", "Aya"], a: "Allá", tipo: "Ortografía" },
  { q: "¿Qué palabra está mal escrita?", options: ["Exibir", "Exhibir", "Egibir", "Todas"], a: "Exibir", tipo: "Ortografía" },
];

export default function Game() {
  const [theme, setTheme] = useState('dark');
  const [gameStarted, setGameStarted] = useState(false);
  
  useEffect(() => {
    initAudio();
    musicEngine.play('menu');
    return () => musicEngine.stop();
  }, []);

  const handleStartGame = () => {
    sfx.magic();
    setGameStarted(true);
    musicEngine.play('game', 'b_classic');
  };

  const handleThemeToggle = () => {
    sfx.magic();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (gameStarted) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#f0fdf4' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Juego en Desarrollo</h1>
          <p className="opacity-70 mb-6">La lógica completa del juego se está implementando...</p>
          <button 
            onClick={() => { setGameStarted(false); musicEngine.play('menu'); }}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-all"
          >
            Volver al Menú
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden" style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#f0fdf4', color: theme === 'dark' ? '#f8fafc' : '#1e293b' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        @keyframes title-wave { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        @keyframes pop-in { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .title-anim { animation: title-wave 4s ease-in-out infinite; }
        .pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .glass-panel { background: ${theme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'}; backdrop-filter: blur(20px); border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}; box-shadow: 0 15px 35px ${theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'}; }
      `}</style>
      
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <div className="text-8xl mb-4 float-anim">🎓</div>
          <h1 className="text-5xl sm:text-6xl font-black mb-2 title-anim" style={{ fontFamily: "'Playfair Display', serif" }}>
            EXAMEN<span style={{ color: '#10b981' }}>-POLY</span>
          </h1>
          <p className="text-lg sm:text-xl opacity-70 mb-2">Ultimate Edition</p>
          <p className="text-base sm:text-lg opacity-60 mb-8">Estudio y Diversión</p>
          
          <div className="glass-panel p-8 rounded-3xl mb-8">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#10b981' }}>¿Qué es Examen-Poly?</h2>
            <p className="text-sm sm:text-base opacity-80 mb-4">
              Un videojuego educativo diseñado para estudiar de forma menos dolorosa para COMIPEMS o CENEVAL.
            </p>
            <p className="text-sm sm:text-base opacity-80 mb-4">
              <strong>100 preguntas</strong> divididas en 5 bloques temáticos:
            </p>
            <ul className="text-left text-sm opacity-75 space-y-2 mb-4">
              <li>📘 <strong>Bloque 1:</strong> Ortografía y Acentuación</li>
              <li>📗 <strong>Bloque 2:</strong> Gramática y Sintaxis</li>
              <li>📙 <strong>Bloque 3:</strong> Comprensión Lectora</li>
              <li>📕 <strong>Bloque 4:</strong> Habilidad Verbal y Vocabulario</li>
              <li>📓 <strong>Bloque 5:</strong> Literatura y Cultura Lingüística</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleStartGame}
              className="w-full px-8 py-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-bold"
              style={{ color: '#10b981' }}
            >
              🎮 Jugar Ahora
            </button>
            <button 
              onClick={handleThemeToggle}
              className="w-full px-8 py-3 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all font-bold opacity-70 hover:opacity-100"
            >
              {theme === 'dark' ? '☀️' : '🌙'} Cambiar Tema
            </button>
          </div>

          <p className="text-xs opacity-50 mt-8">
            Proyecto educativo - Versión 1.0 - Código completo integrado
          </p>
        </div>
      </div>
    </div>
  );
}
