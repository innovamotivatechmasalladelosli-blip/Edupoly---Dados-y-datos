import React, { useState, useEffect, useRef, useCallback } from 'react';

//======================================================================
// CONFIGURACIÓN GLOBAL (Volúmenes y Voz)
//======================================================================
(window as any).__gameConfig = {
  musicVol: 0.4,
  sfxVol: 0.6,
  voiceVol: 0.8,
  voiceEnabled: false,
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
    osc.type = type as OscillatorType;
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

const musicEngine = {
  interval: null as any, step: 0, currentMode: null as any, currentBoard: null as any,
  play: function(mode: string, board = 'b_classic') {
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
      let bass: number[], lead: number[], bassType: string, leadType: string, speed: number;
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
  stop: function() { clearInterval(this.interval); this.currentMode = null; }
};

//--- ESTILOS GLOBALES ---
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
    .title-anim { animation: title-wave 4s ease-in-out infinite; }
    .pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .float-anim { animation: float 4s ease-in-out infinite; }
    .float-slow { animation: float-slow 6s ease-in-out infinite; }
    .turn-glow { animation: glow-pulse 2s infinite; }
    .anim-throw { animation: throw 0.4s cubic-bezier(0.25, 1, 0.5, 1); }
    .anime-speed-lines { background: repeating-conic-gradient(from 0deg, rgba(255,255,255,0.1) 0deg 5deg, transparent 5deg 15deg); animation: spin-speed 1.5s linear infinite; }
    @keyframes spin-speed { 100% { transform: rotate(360deg); } }
    .glass-panel { background: var(--panel-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--panel-border); box-shadow: 0 15px 35px var(--panel-shadow); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
    .inner-module { background: var(--accent-color); border: 1px solid var(--panel-border); }
    .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .uno-card { background-size: 200% 200%; box-shadow: -5px 10px 20px rgba(0,0,0,0.3), inset 0 0 0 6px white; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); color: white; }
    .uno-card-inner { background: rgba(255,255,255,0.15); transform: skewY(-10deg); box-shadow: inset 0 0 20px rgba(0,0,0,0.1); }
    .custom-scroll::-webkit-scrollbar { width: 8px; } .custom-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 10px; } .custom-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.5); border-radius: 10px; }
    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.8); }
    input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: #10b981; cursor: pointer; margin-top: -8px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 6px; cursor: pointer; background: rgba(255,255,255,0.2); border-radius: 10px; border: 1px solid rgba(0,0,0,0.1); }
    @keyframes slideInLeft { to { transform: translateX(0); } }
    @keyframes slideInRight { to { transform: translateX(0); } }
  `}</style>
);

const COLOR_MAP: Record<string, string> = {
  'bg-emerald-400': '#34d399', 'bg-emerald-500': '#10b981', 'bg-rose-500': '#f43f5e',
  'bg-blue-400': '#60a5fa', 'bg-blue-500': '#3b82f6', 'bg-teal-400': '#2dd4bf',
  'bg-indigo-400': '#818cf8', 'bg-indigo-500': '#6366f1', 'bg-slate-600': '#475569', 'bg-slate-800': '#1e293b',
  'bg-stone-400': '#a8a29e', 'bg-orange-400': '#fb923c', 'bg-zinc-700': '#3f3f46',
  'bg-amber-400': '#fbbf24', 'bg-amber-500': '#f59e0b', 'bg-amber-600': '#d97706',
  'bg-sky-500': '#0ea5e9', 'bg-yellow-400': '#facc15', 'bg-yellow-500': '#eab308',
  'bg-pink-400': '#f472b6', 'bg-pink-500': '#ec4899', 'bg-purple-500': '#a855f7',
  'bg-lime-500': '#84cc16', 'bg-red-500': '#ef4444', 'bg-cyan-400': '#22d3ee',
  'bg-cyan-500': '#06b6d4', 'bg-white': '#ffffff', 'bg-black': '#000000'
};

const PALETTE = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-pink-500', 'bg-slate-800'];

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

//======================================================================
// DATOS DE LA TIENDA Y EL JUEGO
//======================================================================
const BOARD_SHOP = [
  { id: 'b_classic', name: "Clásico", icon: "🏛️", price: 0, desc: "Elegante y limpio, con un fino tablero de madera.",
    colors: { bg1: '#0f172a', bg2: '#020617', boardTop: '#e2e8f0', wall: ['#64748b','#94a3b8','#64748b','#94a3b8'], boardBorder: '#cbd5e1', fog: 'rgba(2, 6, 23, 0.9)', particle: 'rgba(251, 191, 36, 0.4)', textBase: '#1e293b' } },
  { id: 'b_neon', name: "Cyber Neón", icon: "🌆", price: 800, desc: "Suelo de cuadrícula y luces de neón en la red digital.",
    colors: { bg1: '#09090b', bg2: '#000000', boardTop: '#18181b', wall: ['#db2777','#be185d','#db2777','#be185d'], boardBorder: '#f472b6', fog: 'rgba(0, 0, 0, 0.95)', particle: 'rgba(244, 114, 182, 0.8)', textBase: '#fdf2f8' } },
  { id: 'b_forest', name: "Bosque Mágico", icon: "🌲", price: 1200, desc: "Suelo terroso, pinos espesos y luciérnagas mágicas.",
    colors: { bg1: '#064e3b', bg2: '#022c22', boardTop: '#dcfce7', wall: ['#059669','#10b981','#059669','#10b981'], boardBorder: '#34d399', fog: 'rgba(2, 44, 34, 0.95)', particle: 'rgba(167, 243, 208, 0.6)', textBase: '#064e3b' } },
  { id: 'b_lava', name: "Infierno", icon: "🌋", price: 2000, desc: "Suelo resquebrajado ardiente y magma oscuro.",
    colors: { bg1: '#450a0a', bg2: '#2c0606', boardTop: '#262626', wall: ['#dc2626','#ef4444','#dc2626','#ef4444'], boardBorder: '#f87171', fog: 'rgba(44, 6, 6, 0.98)', particle: 'rgba(251, 146, 60, 0.9)', textBase: '#fef2f2' } }
];

const AVATAR_SHOP = [
  { id: 'av1', name: "Lector", icon: "📚", price: 0, ability: "Sin habilidad especial." },
  { id: 'av2', name: "Mago", icon: "🧙", price: 0, ability: "Inmune a la cárcel de Azkaban." },
  { id: 'av3', name: "Payaso", icon: "🤡", price: 300, ability: "+$50 extra al pasar por INICIO." },
  { id: 'av4', name: "Vampiro", icon: "🧛", price: 500, ability: "Sabotajes roban $350 (en vez de $300)." },
  { id: 'av5', name: "Detective", icon: "🕵️", price: 800, ability: "Trivias tienen 1 opción falsa menos." },
  { id: 'av6', name: "Cerebrito", icon: "🤓", price: 1000, ability: "Gana $300 en trivias (en vez de $200)." },
  { id: 'av7', name: "Ninja", icon: "🥷", price: 1500, ability: "Ignora pagos de multa y biblioteca." },
  { id: 'av8', name: "Rey", icon: "👑", price: 2000, ability: "Empieza la partida con $500 extra." },
  { id: 'av9', name: "Fantasma", icon: "👻", price: 2200, ability: "50% de chance de esquivar sabotajes." },
  { id: 'av10', name: "Alien", icon: "👽", price: 2500, ability: "Paga solo la mitad de la renta enemiga." }
];

const TOKEN_SHOP = [
  { id: 'tk1', name: "Clásico", icon: "♟️", type: "pawn", price: 0 }, { id: 'tk2', name: "Corona", icon: "👑", type: "pawn", price: 0 },
  { id: 'tk3', name: "Poción", icon: "🧪", type: "pawn", price: 200 }, { id: 'tk4', name: "Cristal", icon: "💎", type: "crystal", price: 400 },
  { id: 'tk5', name: "Fuego", icon: "🔥", type: "pawn", price: 800 }, { id: 'tk6', name: "Estrella", icon: "⭐", type: "crystal", price: 1200 },
  { id: 'tk7', name: "Robot", icon: "🤖", type: "cube", price: 1500 }, { id: 'tk8', name: "Cohete", icon: "🚀", type: "cube", price: 1800 },
  { id: 'tk9', name: "Espada", icon: "⚔️", type: "crystal", price: 2000 }, { id: 'tk10', name: "Ancla", icon: "⚓", type: "cube", price: 2200 },
];

const ITEM_SHOP = [
  { id: 'it1', name: "Goma Mágica", icon: "🧹", price: 200, desc: "Elimina 2 opciones incorrectas en las trivias." },
  { id: 'it2', name: "Regla Escudo", icon: "📏", price: 400, desc: "Bloquea automáticamente sabotajes de rivales." },
  { id: 'it3', name: "Dado Trucado", icon: "🎲", price: 600, desc: "Elige exactamente el número de los dados." },
  { id: 'it4', name: "Bolsa de Oro", icon: "💰", price: 500, desc: "Úsala en tu turno para ganar $200 al instante." },
  { id: 'it5', name: "Capa Invisible", icon: "🧥", price: 700, desc: "Se usa sola: evita que pagues renta en una casilla." },
];

const CARD_DECK = [
  { id: 'c_rev', name: "Reversa", type: "reversa", icon: "🔄", color: "bg-gradient-to-br from-blue-400 to-blue-600", desc: "Invierte la dirección del juego." },
  { id: 'c_skip', name: "Saltar", type: "salta", icon: "⏭️", color: "bg-gradient-to-br from-red-400 to-red-600", desc: "Bloquea próximo turno de un rival." },
  { id: 'c_draw2', name: "Toma 2", type: "toma_2", icon: "💸", color: "bg-gradient-to-br from-amber-400 to-amber-600", desc: "Roba $200 a un rival." },
  { id: 'c_wild', name: "Comodín", type: "comodin", icon: "🌈", color: "bg-gradient-to-br from-emerald-400 to-emerald-600", desc: "Recibes $300 mágicos del banco." },
  { id: 'c_shield', name: "Escudo Literario", type: "escudo", icon: "🛡️", color: "bg-gradient-to-br from-cyan-400 to-cyan-600", desc: "Automático: Cancela el pago de renta al caer en propiedad enemiga." },
  { id: 'c_double', name: "Cobro Doble", type: "doble", icon: "💰", color: "bg-gradient-to-br from-purple-400 to-purple-600", desc: "Automático: Si alguien cae en tu propiedad, te paga el doble de renta." },
  { id: 'c_teleport', name: "Portal Abisal", type: "portal", icon: "🌀", color: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600", desc: "Viaja al instante a una casilla aleatoria del mapa." }
];

const BOARD_DATA = [
  { id: 0, name: "INICIO", type: "start", color: "bg-emerald-400", icon: "🏁", desc: "Recibes $200 al pasar." },
  { id: 1, name: "CARRIE", type: "prop", price: 100, rent: 40, color: "bg-rose-500", icon: "🩸" },
  { id: 2, name: "CARTA", type: "uno", color: "bg-blue-500", icon: "🃏", desc: "Roba una carta de acción." },
  { id: 3, name: "RESPLANDOR", type: "prop", price: 120, rent: 50, color: "bg-rose-500", icon: "🪓" },
  { id: 4, name: "SABOTAJE", type: "attack", color: "bg-red-500", icon: "⚔️", desc: "Ataca el conocimiento de un rival." },
  { id: 5, name: "MISERY", type: "prop", price: 140, rent: 60, color: "bg-rose-500", icon: "🔨" },
  { id: 6, name: "CAFÉ", type: "safe", color: "bg-teal-400", icon: "☕", desc: "Zona Segura para descansar." },
  { id: 7, name: "IT (ESO)", type: "prop", price: 160, rent: 70, color: "bg-rose-500", icon: "🤡" },
  { id: 8, name: "TRIVIA", type: "quiz", color: "bg-indigo-400", icon: "❓", desc: "Responde bien y gana $200." },
  { id: 9, name: "CEMENTERIO", type: "prop", price: 180, rent: 80, color: "bg-rose-500", icon: "⚰️" },
  { id: 10, name: "BIBLIOTECA", type: "tax", amount: 150, color: "bg-slate-600", icon: "🏛️", desc: "Silencio. Multa de $150." },
  { id: 11, name: "1984", type: "prop", price: 200, rent: 90, color: "bg-stone-400", icon: "👁️" },
  { id: 12, name: "GRANJA", type: "prop", price: 200, rent: 90, color: "bg-stone-400", icon: "🐷" },
  { id: 13, name: "CARTA", type: "uno", color: "bg-blue-500", icon: "🃏", desc: "El destino del mazo." },
  { id: 14, name: "FAHRENHEIT", type: "prop", price: 220, rent: 100, color: "bg-orange-400", icon: "🔥" },
  { id: 15, name: "MUNDO FELIZ", type: "prop", price: 220, rent: 100, color: "bg-orange-400", icon: "💊" },
  { id: 16, name: "TRIVIA", type: "quiz", color: "bg-indigo-400", icon: "❓", desc: "Prueba tu conocimiento." },
  { id: 17, name: "NARANJA", type: "prop", price: 240, rent: 110, color: "bg-orange-400", icon: "🍊" },
  { id: 18, name: "AZKABAN", type: "jail", amount: 150, color: "bg-zinc-700", icon: "⛓️", desc: "Los dementores te roban $150." },
  { id: 19, name: "POTTER", type: "prop", price: 260, rent: 120, color: "bg-amber-400", icon: "⚡" },
  { id: 20, name: "SABOTAJE", type: "attack", color: "bg-red-500", icon: "⚔️", desc: "Roba dinero si fallan." },
  { id: 21, name: "ANILLOS", type: "prop", price: 280, rent: 130, color: "bg-emerald-500", icon: "💍" },
  { id: 22, name: "HOBBIT", type: "prop", price: 280, rent: 130, color: "bg-emerald-500", icon: "🧙" },
  { id: 23, name: "CARTA", type: "uno", color: "bg-blue-500", icon: "🃏", desc: "¡Roba de la baraja!" },
  { id: 24, name: "TRONOS", type: "prop", price: 300, rent: 140, color: "bg-sky-500", icon: "🗡️" },
  { id: 25, name: "DUNE", type: "prop", price: 300, rent: 140, color: "bg-yellow-500", icon: "🏜️" },
  { id: 26, name: "LIBRERÍA", type: "safe", color: "bg-cyan-400", icon: "📖", desc: "Paz absoluta." },
  { id: 27, name: "QUIJOTE", type: "prop", price: 320, rent: 150, color: "bg-amber-600", icon: "⚔️" },
  { id: 28, name: "TRIVIA", type: "quiz", color: "bg-indigo-400", icon: "❓", desc: "Pregunta dorada." },
  { id: 29, name: "CIEN AÑOS", type: "prop", price: 340, rent: 160, color: "bg-yellow-400", icon: "🦋" },
  { id: 30, name: "CARTA", type: "uno", color: "bg-blue-500", icon: "🃏", desc: "Sorpresa." },
  { id: 31, name: "ORGULLO", type: "prop", price: 350, rent: 170, color: "bg-pink-400", icon: "💌" },
  { id: 32, name: "DRÁCULA", type: "prop", price: 380, rent: 180, color: "bg-purple-500", icon: "🧛" },
  { id: 33, name: "SABOTAJE", type: "attack", color: "bg-red-500", icon: "⚔️", desc: "Última oportunidad." },
  { id: 34, name: "MONSTRUO", type: "prop", price: 380, rent: 180, color: "bg-lime-500", icon: "👾" },
  { id: 35, name: "EL CUERVO", type: "prop", price: 400, rent: 200, color: "bg-slate-800", icon: "🐦‍⬛" },
];

const QUESTION_BANK = [
  { q: "¿Qué tipo de palabra es 'canción' según su acento?", options: ["Aguda", "Grave", "Esdrújula", "Sobreesdrújula"], a: "Aguda", tipo: "Ortografía" },
  { q: "¿Las palabras esdrújulas siempre llevan tilde?", options: ["Sí, siempre", "No, nunca", "Solo en plural", "Depende del contexto"], a: "Sí, siempre", tipo: "Ortografía" },
  { q: "¿Cuál es el antónimo de 'efímero'?", options: ["Eterno", "Rápido", "Breve", "Fugaz"], a: "Eterno", tipo: "Ortografía" },
  { q: "¿Cómo se escribe para referirse al lugar?", options: ["Allá", "Halla", "Haya", "Aya"], a: "Allá", tipo: "Ortografía" },
  { q: "¿Qué palabra está mal escrita?", options: ["Exibir", "Exhibir", "Existir", "Exigir"], a: "Exibir", tipo: "Ortografía" },
  { q: "¿Cuál es la sílaba tónica en la palabra 'teléfono'?", options: ["Lé", "Te", "fo", "no"], a: "Lé", tipo: "Ortografía" },
  { q: "¿Qué es un diptongo?", options: ["La unión de dos vocales en una misma sílaba", "Dos consonantes juntas", "Una vocal sola", "Tres vocales seguidas"], a: "La unión de dos vocales en una misma sílaba", tipo: "Ortografía" },
  { q: "Escribe el plural de la palabra 'luz'.", options: ["Luces", "Luzs", "Luzes", "Luz"], a: "Luces", tipo: "Ortografía" },
  { q: "¿Cuál es la forma correcta?", options: ["Hubo muchos problemas", "Hubieron muchos problemas", "Habían muchos problemas", "Hicieron muchos problemas"], a: "Hubo muchos problemas", tipo: "Ortografía" },
  { q: "¿Lleva tilde la palabra 'fue'?", options: ["No, es monosílabo", "Sí, siempre", "Solo en preguntas", "Depende del contexto"], a: "No, es monosílabo", tipo: "Ortografía" },
  { q: "¿Cuál es el sinónimo de 'abundante'?", options: ["Copioso", "Escaso", "Pequeño", "Raro"], a: "Copioso", tipo: "Ortografía" },
  { q: "¿Qué tipo de palabra es 'árbol'?", options: ["Grave o llana", "Aguda", "Esdrújula", "Sobreesdrújula"], a: "Grave o llana", tipo: "Ortografía" },
  { q: "¿Cómo se llama el signo que indica una pregunta?", options: ["Signo de interrogación", "Signo de admiración", "Punto y coma", "Guion"], a: "Signo de interrogación", tipo: "Ortografía" },
  { q: "¿Cuándo se usa la letra 'H'?", options: ["Palabras que empiezan por hie-, hue-, hui-", "Siempre antes de vocal", "Al final de todas las palabras", "Nunca se usa"], a: "Palabras que empiezan por hie-, hue-, hui-", tipo: "Ortografía" },
  { q: "¿Qué palabra es un palíndromo?", options: ["Reconocer", "Hola", "Adiós", "Juego"], a: "Reconocer", tipo: "Ortografía" },
  { q: "¿Se escribe 'aser' o 'hacer'?", options: ["Hacer", "Aser", "Haser", "Acer"], a: "Hacer", tipo: "Ortografía" },
  { q: "¿Qué acento se usa para diferenciar palabras que se escriben igual?", options: ["Acento diacrítico", "Acento ortográfico", "Acento prosódico", "Acento tónico"], a: "Acento diacrítico", tipo: "Ortografía" },
  { q: "¿La palabra 'examen' lleva tilde?", options: ["No", "Sí", "Solo en plural", "Depende del país"], a: "No", tipo: "Ortografía" },
  { q: "¿Cuál es la diferencia entre 'ay', 'hay' y 'ahí'?", options: ["Exclamación, haber, lugar", "Lugar, haber, exclamación", "Haber, lugar, exclamación", "No hay diferencia"], a: "Exclamación, haber, lugar", tipo: "Ortografía" },
  { q: "¿Qué palabra está bien escrita?", options: ["A través", "Atravez", "A traves", "Através"], a: "A través", tipo: "Ortografía" },
  { q: "¿Cuál es el núcleo del sujeto en: 'El joven programador terminó el código'?", options: ["Programador", "Joven", "Terminó", "Código"], a: "Programador", tipo: "Gramática" },
  { q: "¿Qué es un adjetivo?", options: ["Describe al sustantivo", "Indica una acción", "Sustituye al nombre", "Une oraciones"], a: "Describe al sustantivo", tipo: "Gramática" },
  { q: "En 'María corre rápido', ¿cuál es el adverbio?", options: ["Rápido", "María", "Corre", "Es tácito"], a: "Rápido", tipo: "Gramática" },
  { q: "¿Qué es el predicado?", options: ["Lo que se dice del sujeto", "Quién realiza la acción", "El nombre de la persona", "La unión de palabras"], a: "Lo que se dice del sujeto", tipo: "Gramática" },
  { q: "¿Cómo se llama el verbo que termina en -ar, -er, -ir?", options: ["Infinitivo", "Gerundio", "Participio", "Subjuntivo"], a: "Infinitivo", tipo: "Gramática" },
  { q: "¿Cuál es el objeto directo en 'Juan compró un libro'?", options: ["Un libro", "Juan", "Compró", "No tiene"], a: "Un libro", tipo: "Gramática" },
  { q: "¿Qué categoría gramatical es 'y', 'e', 'ni', 'que'?", options: ["Conjunciones", "Preposiciones", "Adverbios", "Pronombres"], a: "Conjunciones", tipo: "Gramática" },
  { q: "¿Cuál es el tiempo verbal de 'yo comeré'?", options: ["Futuro simple", "Presente", "Pasado", "Copretérito"], a: "Futuro simple", tipo: "Gramática" },
  { q: "¿Qué es un sustantivo propio?", options: ["Nombre específico", "Nombre general", "Una acción", "Una cualidad"], a: "Nombre específico", tipo: "Gramática" },
  { q: "¿Cuál es el sujeto tácito en 'Comimos pizza'?", options: ["Nosotros", "Ellos", "Yo", "Ustedes"], a: "Nosotros", tipo: "Gramática" },
  { q: "¿Qué es una oración simple?", options: ["La que tiene un solo verbo conjugado", "La que no tiene sujeto", "La que tiene dos verbos", "La que es muy corta"], a: "La que tiene un solo verbo conjugado", tipo: "Gramática" },
  { q: "¿Qué función cumple la preposición 'de' en 'la casa de madera'?", options: ["Indica pertenencia o material", "Indica lugar", "Indica tiempo", "Indica modo"], a: "Indica pertenencia o material", tipo: "Gramática" },
  { q: "¿Cuál es el participio del verbo 'escribir'?", options: ["Escrito", "Escribido", "Escribiendo", "Escriba"], a: "Escrito", tipo: "Gramática" },
  { q: "¿Qué es un pronombre?", options: ["Palabra que sustituye al sustantivo", "Palabra que describe", "Palabra que indica acción", "Palabra que une"], a: "Palabra que sustituye al sustantivo", tipo: "Gramática" },
  { q: "¿Cuál es el gerundio del verbo 'leer'?", options: ["Leyendo", "Leído", "Leerá", "Leía"], a: "Leyendo", tipo: "Gramática" },
  { q: "¿Qué es un nexo?", options: ["Palabra que une oraciones o ideas", "Palabra que describe", "El núcleo del sujeto", "Un tipo de acento"], a: "Palabra que une oraciones o ideas", tipo: "Gramática" },
  { q: "Identifica el modo verbal en '¡Cierra la puerta!'", options: ["Imperativo", "Indicativo", "Subjuntivo", "Condicional"], a: "Imperativo", tipo: "Gramática" },
  { q: "¿Qué es una oración coordinada?", options: ["Dos oraciones independientes unidas por un nexo", "Una oración sin sujeto", "Una oración con dos verbos", "Una oración interrogativa"], a: "Dos oraciones independientes unidas por un nexo", tipo: "Gramática" },
  { q: "¿Cuál es la diferencia entre sujeto y predicado?", options: ["Sujeto es quién actúa; predicado es la acción", "Sujeto es la acción; predicado es quién actúa", "Son lo mismo", "El sujeto siempre va al final"], a: "Sujeto es quién actúa; predicado es la acción", tipo: "Gramática" },
  { q: "¿Qué es un artículo definido?", options: ["El, la, los, las", "Un, una, unos, unas", "Yo, tú, él", "Muy, bien, mal"], a: "El, la, los, las", tipo: "Gramática" },
  { q: "¿Cuál es la función principal de un texto informativo?", options: ["Transmitir datos de manera objetiva", "Persuadir al lector", "Entretener con ficción", "Expresar emociones"], a: "Transmitir datos de manera objetiva", tipo: "Comprensión" },
  { q: "¿Qué es una paráfrasis?", options: ["Explicar un texto con tus propias palabras", "Copiar un texto literalmente", "Resumir solo el final", "Traducir a otro idioma"], a: "Explicar un texto con tus propias palabras", tipo: "Comprensión" },
  { q: "¿Qué parte del texto resume el contenido al principio?", options: ["Introducción", "Desarrollo", "Conclusión", "Epílogo"], a: "Introducción", tipo: "Comprensión" },
  { q: "¿Cuál es el objetivo de un texto argumentativo?", options: ["Persuadir o convencer al lector", "Narrar hechos históricos", "Describir lugares", "Entretener con humor"], a: "Persuadir o convencer al lector", tipo: "Comprensión" },
  { q: "¿Qué es una idea principal?", options: ["La información más importante del texto", "Un detalle secundario", "La conclusión del autor", "El título del texto"], a: "La información más importante del texto", tipo: "Comprensión" },
  { q: "¿Qué tipo de texto es una noticia?", options: ["Periodístico / Informativo", "Narrativo", "Lírico", "Dramático"], a: "Periodístico / Informativo", tipo: "Comprensión" },
  { q: "¿A qué género pertenece una novela?", options: ["Género narrativo", "Género lírico", "Género dramático", "Género expositivo"], a: "Género narrativo", tipo: "Comprensión" },
  { q: "¿Qué es una ficha bibliográfica?", options: ["Documento que registra datos de un libro", "Un resumen del libro", "La portada del libro", "El índice del libro"], a: "Documento que registra datos de un libro", tipo: "Comprensión" },
  { q: "¿Qué función de la lengua predomina en un poema?", options: ["Poética o estética", "Referencial", "Apelativa", "Fática"], a: "Poética o estética", tipo: "Comprensión" },
  { q: "¿Qué es un desenlace?", options: ["La parte final donde se resuelve el conflicto", "El inicio de la historia", "El punto de mayor tensión", "La descripción de personajes"], a: "La parte final donde se resuelve el conflicto", tipo: "Comprensión" },
  { q: "¿Qué es el subtexto?", options: ["Lo que el autor sugiere pero no dice explícitamente", "El texto que aparece debajo de una imagen", "El título de un capítulo", "Las notas al pie"], a: "Lo que el autor sugiere pero no dice explícitamente", tipo: "Comprensión" },
  { q: "¿Qué es una analogía?", options: ["Una relación de semejanza entre cosas distintas", "Una contradicción", "Una exageración", "Una comparación directa con 'como'"], a: "Una relación de semejanza entre cosas distintas", tipo: "Comprensión" },
  { q: "¿Cuál es la función apelativa de la lengua?", options: ["Influir en el receptor para que haga algo", "Transmitir información objetiva", "Expresar emociones del emisor", "Mantener el contacto comunicativo"], a: "Influir en el receptor para que haga algo", tipo: "Comprensión" },
  { q: "¿Qué es un modismo?", options: ["Expresión propia de una lengua que no se traduce literalmente", "Una palabra nueva", "Un sinónimo", "Una palabra extranjera"], a: "Expresión propia de una lengua que no se traduce literalmente", tipo: "Comprensión" },
  { q: "¿Qué tipo de texto utiliza diálogos y acotaciones?", options: ["Texto dramático o teatral", "Texto narrativo", "Texto lírico", "Texto expositivo"], a: "Texto dramático o teatral", tipo: "Comprensión" },
  { q: "¿Qué es un neologismo?", options: ["Una palabra nueva en una lengua", "Una palabra antigua", "Una palabra extranjera", "Una palabra técnica"], a: "Una palabra nueva en una lengua", tipo: "Comprensión" },
  { q: "¿Cuál es el orden cronológico en una narración?", options: ["Planteamiento, nudo y desenlace", "Nudo, planteamiento y desenlace", "Desenlace, nudo y planteamiento", "Clímax, inicio y fin"], a: "Planteamiento, nudo y desenlace", tipo: "Comprensión" },
  { q: "¿Qué es un prefijo?", options: ["Partícula al principio de una palabra que cambia su significado", "Partícula al final de una palabra", "Una sílaba tónica", "Un tipo de acento"], a: "Partícula al principio de una palabra que cambia su significado", tipo: "Comprensión" },
  { q: "¿Para qué sirven las comillas en una cita?", options: ["Indicar que el texto es de otro autor", "Indicar énfasis", "Indicar una pregunta", "Separar ideas"], a: "Indicar que el texto es de otro autor", tipo: "Comprensión" },
  { q: "¿Qué es una metáfora?", options: ["Figura retórica que identifica un término real con uno imaginario", "Una comparación con 'como'", "Una exageración", "Una contradicción"], a: "Figura retórica que identifica un término real con uno imaginario", tipo: "Comprensión" },
  { q: "Completa la analogía: 'Aleta es a pez, como brazo es a...'", options: ["Humano", "Pájaro", "Pez", "Reptil"], a: "Humano", tipo: "Habilidad Verbal" },
  { q: "¿Cuál es el antónimo de 'altruista'?", options: ["Egoísta", "Generoso", "Bondadoso", "Caritativo"], a: "Egoísta", tipo: "Habilidad Verbal" },
  { q: "¿Qué significa la palabra 'ambiguo'?", options: ["Que puede entenderse de varias formas", "Que es muy claro", "Que es falso", "Que es antiguo"], a: "Que puede entenderse de varias formas", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'escuchar':", options: ["Oír / Atender", "Ver", "Hablar", "Escribir"], a: "Oír / Atender", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'guerra':", options: ["Paz", "Batalla", "Conflicto", "Lucha"], a: "Paz", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un homófono?", options: ["Palabras que suenan igual pero se escriben diferente", "Palabras con el mismo significado", "Palabras opuestas", "Palabras de otro idioma"], a: "Palabras que suenan igual pero se escriben diferente", tipo: "Habilidad Verbal" },
  { q: "Significado de 'precursor':", options: ["Que precede o va delante", "Que sigue detrás", "Que es el mejor", "Que es el último"], a: "Que precede o va delante", tipo: "Habilidad Verbal" },
  { q: "¿Cuál es el sinónimo de 'relevante'?", options: ["Importante / Destacado", "Pequeño", "Común", "Invisible"], a: "Importante / Destacado", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'ascender':", options: ["Descender", "Subir", "Elevar", "Crecer"], a: "Descender", tipo: "Habilidad Verbal" },
  { q: "¿Qué significa 'pernoctar'?", options: ["Pasar la noche en un lugar", "Caminar de noche", "Dormir de día", "Viajar al amanecer"], a: "Pasar la noche en un lugar", tipo: "Habilidad Verbal" },
  { q: "Analogía: 'Frío es a hielo como calor es a...'", options: ["Fuego", "Agua", "Viento", "Tierra"], a: "Fuego", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'vasto':", options: ["Extenso / Amplio", "Pequeño", "Estrecho", "Corto"], a: "Extenso / Amplio", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un hiperbatón?", options: ["Alterar el orden lógico de las palabras", "Una exageración", "Una comparación", "Una metáfora"], a: "Alterar el orden lógico de las palabras", tipo: "Habilidad Verbal" },
  { q: "Significado de 'efímero':", options: ["Que dura muy poco tiempo", "Que dura mucho", "Que es muy grande", "Que es muy importante"], a: "Que dura muy poco tiempo", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'opaco':", options: ["Brillante / Transparente", "Oscuro", "Mate", "Gris"], a: "Brillante / Transparente", tipo: "Habilidad Verbal" },
  { q: "¿Qué es una onomatopeya?", options: ["Representación escrita de un sonido", "Una figura retórica de comparación", "Un tipo de rima", "Una palabra nueva"], a: "Representación escrita de un sonido", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'enigma':", options: ["Misterio", "Solución", "Respuesta", "Claridad"], a: "Misterio", tipo: "Habilidad Verbal" },
  { q: "¿Qué es la denotación?", options: ["El significado literal y objetivo de una palabra", "El significado figurado", "El significado emocional", "El significado histórico"], a: "El significado literal y objetivo de una palabra", tipo: "Habilidad Verbal" },
  { q: "¿Qué es la connotación?", options: ["El significado subjetivo o figurado de una palabra", "El significado literal", "El significado en el diccionario", "El significado científico"], a: "El significado subjetivo o figurado de una palabra", tipo: "Habilidad Verbal" },
  { q: "Completa: 'Libro es a leer como película es a...'", options: ["Ver", "Escuchar", "Escribir", "Dibujar"], a: "Ver", tipo: "Habilidad Verbal" },
  { q: "¿Quién escribió 'Don Quijote de la Mancha'?", options: ["Miguel de Cervantes", "Lope de Vega", "Garcilaso de la Vega", "Francisco de Quevedo"], a: "Miguel de Cervantes", tipo: "Literatura" },
  { q: "¿Qué es una rima consonante?", options: ["Coinciden todos los sonidos finales", "Solo coinciden las vocales", "No hay rima", "Rima al principio"], a: "Coinciden todos los sonidos finales", tipo: "Literatura" },
  { q: "¿Qué es un verso?", options: ["Cada una de las líneas de un poema", "Un párrafo de prosa", "Un capítulo de novela", "Una estrofa completa"], a: "Cada una de las líneas de un poema", tipo: "Literatura" },
  { q: "¿Cómo se llama la comparación que usa la palabra 'como'?", options: ["Símil", "Metáfora", "Hipérbole", "Paradoja"], a: "Símil", tipo: "Literatura" },
  { q: "¿Qué es una hipérbole?", options: ["Una exageración", "Una comparación", "Una contradicción", "Una pregunta retórica"], a: "Una exageración", tipo: "Literatura" },
  { q: "¿Cuál es el tema principal de una tragedia?", options: ["El destino fatal y el sufrimiento", "El amor feliz", "La comedia de errores", "La aventura heroica"], a: "El destino fatal y el sufrimiento", tipo: "Literatura" },
  { q: "¿Qué es una moraleja?", options: ["Enseñanza que se extrae de una fábula", "El título de un cuento", "El personaje principal", "El final de una novela"], a: "Enseñanza que se extrae de una fábula", tipo: "Literatura" },
  { q: "¿A qué se refiere el 'clímax' en una historia?", options: ["Al punto de mayor tensión", "Al inicio", "Al final feliz", "A la descripción de paisajes"], a: "Al punto de mayor tensión", tipo: "Literatura" },
  { q: "¿Qué es un narrador omnisciente?", options: ["El que sabe todo lo que piensan los personajes", "El que es un personaje", "El que solo ve lo de afuera", "El que miente"], a: "El que sabe todo lo que piensan los personajes", tipo: "Literatura" },
  { q: "¿Cuál es la lengua romance de la que proviene el español?", options: ["El latín", "El griego", "El germánico", "El árabe"], a: "El latín", tipo: "Literatura" },
  { q: "¿Qué es un arcaísmo?", options: ["Palabra que ya no se usa", "Palabra nueva", "Palabra extranjera", "Palabra técnica"], a: "Palabra que ya no se usa", tipo: "Literatura" },
  { q: "¿Qué autor mexicano ganó el Premio Nobel de Literatura?", options: ["Octavio Paz", "Juan Rulfo", "Carlos Fuentes", "Elena Poniatowska"], a: "Octavio Paz", tipo: "Literatura" },
  { q: "¿Qué es una estrofa?", options: ["Un conjunto de versos", "Una línea del poema", "La rima asonante", "El autor del poema"], a: "Un conjunto de versos", tipo: "Literatura" },
  { q: "¿Qué es el género lírico?", options: ["Expresa sentimientos y emociones", "Cuenta hechos históricos", "Se representa en teatro", "Es para enseñar"], a: "Expresa sentimientos y emociones", tipo: "Literatura" },
  { q: "¿Qué es una paradoja?", options: ["Contradicción aparente con verdad", "Una exageración", "Una rima", "Un personaje"], a: "Contradicción aparente con verdad", tipo: "Literatura" },
  { q: "¿Cuál es la obra más famosa de Gabriel García Márquez?", options: ["Cien años de soledad", "Pedro Páramo", "Rayuela", "El Aleph"], a: "Cien años de soledad", tipo: "Literatura" },
  { q: "¿Qué es un pleonasmo?", options: ["Uso de palabras innecesarias", "Una palabra nueva", "Una rima", "Un tipo de verso"], a: "Uso de palabras innecesarias", tipo: "Literatura" },
  { q: "¿Qué es la rima asonante?", options: ["Solo coinciden las vocales", "Coinciden todos los sonidos", "No hay rima", "Rima al principio"], a: "Solo coinciden las vocales", tipo: "Literatura" },
  { q: "¿Qué es un ensayo?", options: ["Texto donde el autor expone su punto de vista", "Un poema largo", "Una obra de teatro", "Una noticia"], a: "Texto donde el autor expone su punto de vista", tipo: "Literatura" },
  { q: "¿Qué signo se usa para introducir un diálogo?", options: ["Raya o guion largo (—)", "Comillas", "Paréntesis", "Puntos suspensivos"], a: "Raya o guion largo (—)", tipo: "Literatura" },
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


//======================================================================
// COMPONENTE PRINCIPAL
//======================================================================
export default function Game() {
  // --- ESTADO GLOBAL ---
  const [started, setStarted] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [globalCoins, setGlobalCoins] = useState(1500);
  const [unlockedAvatars, setUnlockedAvatars] = useState(['av1', 'av2']);
  const [unlockedTokens, setUnlockedTokens] = useState(['tk1', 'tk2']);
  const [unlockedBoards, setUnlockedBoards] = useState(['b_classic']);
  const [inventory, setInventory] = useState<Record<string,number>>({ it1: 1, it2: 0, it3: 0, it4: 0, it5: 0 });
  const [myAvatar, setMyAvatar] = useState('av1');
  const [myToken, setMyToken] = useState('tk1');
  const [myBoard, setMyBoard] = useState('b_classic');
  const [view, setView] = useState('menu');
  const [shopTab, setShopTab] = useState('avatars');
  const [is3D, setIs3D] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [cfgUpdater, setCfgUpdater] = useState(0);
  const [lobbyPlayers, setLobbyPlayers] = useState([
    { id: 0, type: 'humano', avatarId: 'av1', tokenId: 'tk1', name: 'Tú', color: 'bg-emerald-500', difficulty: 'normal', items: { it1:0, it2:0, it3:0, it4:0, it5:0 } },
    { id: 1, type: 'bot', avatarId: 'av6', tokenId: 'tk5', name: 'Bot Rex', color: 'bg-indigo-500', difficulty: 'normal', items: { it1:0, it2:0, it3:0, it4:0, it5:0 } },
    { id: 2, type: 'bot', avatarId: 'av4', tokenId: 'tk3', name: 'Bot Vamp', color: 'bg-rose-500', difficulty: 'normal', items: { it1:0, it2:0, it3:0, it4:0, it5:0 } }
  ]);
  const [winGoal, setWinGoal] = useState('survival');
  const [gameMode, setGameMode] = useState('classic');

  // --- ESTADO DE JUEGO ---
  const [players, setPlayers] = useState<any[]>([]);
  const [turn, setTurn] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dice, setDice] = useState<number | null>(null);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [properties, setProperties] = useState<Record<number,number>>({});
  const [upgrades, setUpgrades] = useState<Record<number,number>>({});
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [animeAction, setAnimeAction] = useState<any>(null);
  const [rollingDice, setRollingDice] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [avatarThrowing, setAvatarThrowing] = useState(false);
  const [shake, setShake] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    if (started) { if (view === 'game') musicEngine.play('game', myBoard); else musicEngine.play('menu'); }
  }, [view, started, myBoard]);

  const btnClick = (fn?: () => void) => { sfx.click(); if (fn) fn(); };
  const toggleTheme = () => { sfx.click(); setTheme(t => t === 'dark' ? 'light' : 'dark'); };

  const updateConfig = (key: string, val: any) => {
    (window as any).__gameConfig[key] = val;
    if (key === 'isMuted') {
      if (val) musicEngine.stop(); else musicEngine.play(view === 'game' ? 'game' : 'menu', myBoard);
    }
    setCfgUpdater(u => u + 1);
  };

  const getAvailableItems = () => {
    const used: Record<string,number> = { it1:0, it2:0, it3:0, it4:0, it5:0 };
    lobbyPlayers.forEach(p => { Object.keys(used).forEach(k => { used[k] += (p.items as any)[k] || 0; }); });
    const avail: Record<string,number> = {};
    Object.keys(used).forEach(k => { avail[k] = Math.max(0, (inventory[k] || 0) - used[k]); });
    return avail;
  };

  const assignItemToPlayer = (pId: number, itId: string, add: boolean) => {
    sfx.click(); const avail = getAvailableItems();
    setLobbyPlayers(prev => prev.map(p => {
      if (p.id === pId) {
        let current = (p.items as any)[itId] || 0;
        if (add && avail[itId] > 0) current++; if (!add && current > 0) current--;
        return { ...p, items: { ...p.items, [itId]: current } };
      }
      return p;
    }));
  };

  const addPlayer = () => {
    btnClick(() => {
      if (lobbyPlayers.length >= 4) return;
      const newId = lobbyPlayers.length;
      setLobbyPlayers([...lobbyPlayers, { id: newId, type: 'bot', avatarId: 'av2', tokenId: 'tk2', difficulty: 'normal', name: `Jugador ${newId + 1}`, color: PALETTE[newId % PALETTE.length], items: { it1:0, it2:0, it3:0, it4:0, it5:0 } }]);
    });
  };

  const updateLobbyPlayer = (id: number, key: string, val: any) => {
    if (['color','type','difficulty'].includes(key)) sfx.click();
    setLobbyPlayers(prev => prev.map(p => p.id === id ? { ...p, [key]: val } : p));
  };

  const removePlayer = (id: number) => { btnClick(() => { if (lobbyPlayers.length > 2) setLobbyPlayers(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, id: i }))); }); };

  const startGame = () => {
    sfx.turn(); narrate("¡Comienza la aventura en Literatópolis! Suerte a todos.", true);
    const gamePlayers = lobbyPlayers.map((lp) => {
      const avatarData = AVATAR_SHOP.find(a => a.id === lp.avatarId) || AVATAR_SHOP[0];
      const tokenData = TOKEN_SHOP.find(t => t.id === lp.tokenId) || TOKEN_SHOP[0];
      let startMoney = lp.avatarId === 'av8' ? 2000 : 1500;
      if (gameMode === 'fast') startMoney += 1000;
      return {
        id: lp.id, name: lp.name, icon: avatarData.icon, token: tokenData.icon, tokenType: tokenData.type, bg: lp.color, avatarId: lp.avatarId,
        pos: 0, money: startMoney, alive: true, skip: 0, isBot: lp.type === 'bot', difficulty: lp.difficulty || 'normal', items: { ...lp.items }, cards: []
      };
    });
    animState.current.tokens = gamePlayers.map(() => ({ visualPos: 0, bounce: 0 }));
    animState.current.camera = { rotX: 1.0, rotZ: 0, camX: 0, camY: 0, zoom: 1, targetRotX: 1.0, targetRotZ: 0, targetCamX: 0, targetCamY: 0, targetZoom: 1 };
    animState.current.scenery = [];
    // Consume items from inventory
    const finalUsed: Record<string,number> = { it1:0, it2:0, it3:0, it4:0, it5:0 };
    lobbyPlayers.forEach(p => { Object.keys(finalUsed).forEach(k => { finalUsed[k] += (p.items as any)[k] || 0; }); });
    setInventory(prev => { const n = {...prev}; Object.keys(finalUsed).forEach(k => { n[k] = Math.max(0, (prev[k]||0) - finalUsed[k]); }); return n; });
    setPlayers(gamePlayers); setProperties({}); setUpgrades({}); setTurn(0); setDirection(1);
    setDice(null); setActiveEvent(null); setAnimeAction(null); setRollingDice(false); setShowCards(false);
    setShake(false); setShowExitConfirm(false); setShowSettingsModal(false); setView('game'); setIs3D(true);
    setTimeout(() => focusOnPlayer(0, true), 50);
  };

  const confirmQuitGame = () => { sfx.click(); setShowExitConfirm(false); setView('menu'); setPlayers([]); narrate("Has abandonado la partida.", true); };
  const getPlayerPropsCount = (pid: number) => Object.values(properties).filter(ownerId => ownerId === pid).length;

  const handleBankruptcy = useCallback((loserIdx: number, winnerIdx: number | null, currentPlayers: any[]) => {
    sfx.bankrupt();
    const newP = currentPlayers.map(p => ({ ...p }));
    const loserId = newP[loserIdx].id; const winnerId = winnerIdx !== null ? newP[winnerIdx].id : null;
    newP[loserIdx].alive = false; newP[loserIdx].money = 0;
    setProperties(prevProps => {
      const newProps = { ...prevProps };
      Object.keys(newProps).forEach(prop => {
        if ((newProps as any)[prop] === loserId) {
          if (winnerId !== null) (newProps as any)[prop] = winnerId;
          else { delete (newProps as any)[prop]; setUpgrades(prevU => { const nu = { ...prevU }; delete (nu as any)[prop]; return nu; }); }
        }
      });
      return newProps;
    });
    const winnerName = winnerIdx !== null ? newP[winnerIdx].name : "el Banco";
    narrate(`¡Oh no! ${newP[loserIdx].name} ha quedado en bancarrota.`, true);
    setActiveEvent({ type: 'info', title: '¡BANCARROTA! 💀', text: `${newP[loserIdx].name} ha sido ELIMINADO. Sus propiedades pasan a ${winnerName}.`, onOk: handleNextTurn });
    return newP;
  }, []);

  const checkWinCondition = (currentPlayers: any[]) => {
    const alive = currentPlayers.filter(p => p.alive);
    if (alive.length === 1) return alive[0];
    if (winGoal !== 'survival') {
      const goal = parseInt(winGoal);
      const wealthy = alive.filter(p => p.money >= goal);
      if (wealthy.length > 0) return wealthy.sort((a: any, b: any) => b.money - a.money)[0];
    }
    return null;
  };

  const triggerWin = (winner: any, currentPlayers: any[]) => {
    const isHumanWinner = !winner.isBot; let reward = 200;
    if (isHumanWinner) { if (winGoal === 'survival') reward = winner.money; else reward = winGoal === '5000' ? 1500 : 1000; }
    setGlobalCoins(c => c + reward); sfx.win();
    narrate(`¡El juego ha terminado! El gran ganador es ${winner.name}.`, true);
    setTimeout(() => setActiveEvent({ type: 'gameover', win: isHumanWinner, winnerName: winner.name, reward }), 500);
    return currentPlayers;
  };

  const drawCard = (playerIndex: number) => {
    sfx.card(); const randomCard = CARD_DECK[Math.floor(Math.random() * CARD_DECK.length)];
    setPlayers(prev => { const np = prev.map(p => ({ ...p, cards: [...p.cards] })); np[playerIndex].cards.push(randomCard); return np; });
    return randomCard;
  };

  const getRandomQuestion = (pAvatarId: string) => {
    let available = QUESTION_BANK.filter(q => !usedQuestions.includes(q.q));
    if (available.length < 3) { setUsedQuestions([]); available = QUESTION_BANK; }
    let selected = { ...available[Math.floor(Math.random() * available.length)] };
    setUsedQuestions(prev => [...prev, selected.q]);
    selected = { ...selected, options: [...selected.options].sort(() => Math.random() - 0.5) };
    let hidden: string[] = [];
    if (pAvatarId === 'av5') { hidden = selected.options.filter((o: string) => o !== selected.a).slice(0, 1); }
    return { ...selected, hiddenOptionsDefault: hidden };
  };

  const useGoldBag = () => {
    sfx.coin();
    setPlayers(prev => { const newP = prev.map(p => ({ ...p, items: { ...p.items } })); newP[turn].items['it4'] -= 1; newP[turn].money += 200; return newP; });
    setActiveEvent({ type: 'info', title: "Bolsa de Oro 💰", text: "¡Has obtenido $200 extras usando tu ítem!", onOk: () => setActiveEvent(null) });
  };

  const handleNextTurn = useCallback(() => {
    setDice(null); setActiveEvent(null); setRollingDice(false); setAnimeAction(null); setShowCards(false);
    setPlayers(currentPlayers => {
      const nextPlayers = currentPlayers.map(p => ({ ...p }));
      const winner = checkWinCondition(nextPlayers);
      if (winner) return triggerWin(winner, nextPlayers);
      setTurn(currentTurn => {
        let next = currentTurn; let found = false; let safetyCount = 0;
        while (!found && safetyCount < 20) {
          next = (next + direction + nextPlayers.length) % nextPlayers.length;
          if (nextPlayers[next].alive) {
            if (nextPlayers[next].skip > 0) nextPlayers[next].skip -= 1; else found = true;
          }
          safetyCount++;
        }
        if (!nextPlayers[next].isBot) sfx.turn();
        narrate(`Es el turno de ${nextPlayers[next].name}.`);
        setTimeout(() => focusOnPlayer(next), 300);
        return found ? next : currentTurn;
      });
      return nextPlayers;
    });
  }, [direction, winGoal]);

  const playCard = (cardIdx: number, playerIdx: number, targetIdx: number | null = null) => {
    sfx.magic();
    const cp = players[playerIdx];
    const cardToPlay = cp.cards[cardIdx];
    setPlayers(prev => { const newP = prev.map(p => ({ ...p, cards: [...p.cards] })); newP[playerIdx].cards.splice(cardIdx, 1); return newP; });
    setShowCards(false);
    if (cardToPlay.type === 'reversa') {
      setDirection(d => d * -1); narrate("¡Sentido invertido!");
      setActiveEvent({ type: 'info', title: "Reversa 🔄", text: "Se ha invertido la dirección del juego.", onOk: handleNextTurn });
    } else if (cardToPlay.type === 'salta') {
      if (targetIdx !== null) {
        setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[targetIdx].skip += 1; return newP; });
        narrate(`Se ha saltado a ${players[targetIdx].name}`);
        setActiveEvent({ type: 'info', title: "Saltar ⏭️", text: `${players[targetIdx].name} perderá su próximo turno.`, onOk: handleNextTurn });
      } else handleNextTurn();
    } else if (cardToPlay.type === 'toma_2') {
      if (targetIdx !== null) {
        let isBankrupt = false;
        setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[targetIdx].money -= 200; newP[playerIdx].money += 200; if (newP[targetIdx].money <= 0) isBankrupt = true; return newP; });
        narrate(`Robaste a ${players[targetIdx].name}`);
        if (isBankrupt) { setTimeout(() => setPlayers(prev => handleBankruptcy(targetIdx, playerIdx, prev)), 100); }
        else { setActiveEvent({ type: 'info', title: "Toma 2 💸", text: `Le has robado $200 a ${players[targetIdx].name}.`, onOk: handleNextTurn }); }
      } else handleNextTurn();
    } else if (cardToPlay.type === 'comodin') {
      setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[playerIdx].money += 300; return newP; });
      narrate("Ganaste $300 mágicos.");
      setActiveEvent({ type: 'info', title: "Comodín 🌈", text: "Has recibido $300 del banco.", onOk: handleNextTurn });
    } else if (cardToPlay.type === 'portal') {
      const randomPos = Math.floor(Math.random() * 36);
      setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[playerIdx].pos = randomPos; return newP; });
      narrate("¡Viaje por portal abisal!");
      setTimeout(() => focusOnPlayer(playerIdx, true), 100);
      setTimeout(() => handleTileAction(randomPos, playerIdx, players), 700);
    } else { handleNextTurn(); }
  };

  const handlePropAction = (pos: number, playerIndex: number, currentPlayersState: any[], p: any, s: any) => {
    const propPrice = gameMode === 'fast' ? Math.floor(s.price * 0.7) : s.price;
    const ownerId = properties[pos];
    const diff = p.difficulty || 'normal';
    if (ownerId === undefined) {
      if (p.isBot) {
        const buyChance = diff === 'facil' ? 0.3 : diff === 'normal' ? 0.6 : 0.9;
        if (p.money >= propPrice && Math.random() < buyChance) {
          sfx.coin(); setProperties(prop => ({ ...prop, [pos]: p.id }));
          setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money -= propPrice; return newP; });
          narrate(`${p.name} compró ${s.name}.`);
          setActiveEvent({ type: 'info', title: "Acción Bot", text: `${p.name} compró: ${s.name}.`, onOk: handleNextTurn });
        } else {
          narrate(`${p.name} no compró la propiedad.`);
          setActiveEvent({ type: 'info', title: "Acción Bot", text: `${p.name} pasó de largo en ${s.name}.`, onOk: handleNextTurn });
        }
      } else {
        if (p.money >= propPrice) { sfx.turn(); setActiveEvent({ type: 'buy', space: { ...s, price: propPrice } }); }
        else { narrate("No tienes suficiente dinero."); setActiveEvent({ type: 'info', title: "Fondos Insuficientes", text: "Estás pobre. No puedes comprar esto.", onOk: handleNextTurn }); }
      }
    } else if (ownerId === p.id) {
      const currentLevel = upgrades[pos] || 0; const upgradeCost = Math.floor(propPrice / 2);
      if (currentLevel < 3) {
        if (p.isBot) {
          const upgChance = diff === 'facil' ? 0.2 : diff === 'normal' ? 0.5 : 0.8;
          if (p.money >= upgradeCost && Math.random() < upgChance) {
            sfx.build(); setUpgrades(prev => ({ ...prev, [pos]: currentLevel + 1 }));
            setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money -= upgradeCost; return newP; });
            narrate(`${p.name} mejoró su propiedad.`);
            setActiveEvent({ type: 'info', title: "Mejora Bot", text: `${p.name} construyó una mejora en ${s.name}.`, onOk: handleNextTurn });
          } else handleNextTurn();
        } else {
          if (p.money >= upgradeCost) { sfx.turn(); setActiveEvent({ type: 'upgrade_prop', space: s, level: currentLevel, cost: upgradeCost }); }
          else setActiveEvent({ type: 'info', title: "Tu Propiedad", text: `Estás en casa, pero no tienes fondos ($${upgradeCost}) para mejorarla.`, onOk: handleNextTurn });
        }
      } else setActiveEvent({ type: 'info', title: "Propiedad Máxima", text: `Has alcanzado el límite de mejoras en ${s.name}.`, onOk: handleNextTurn });
    } else {
      const currentLevel = upgrades[pos] || 0;
      let baseRent = s.rent * (currentLevel + 1);
      let rent = p.avatarId === 'av10' ? Math.ceil(baseRent / 2) : baseRent;
      const payerShieldIdx = p.cards ? p.cards.findIndex((c: any) => c.type === 'escudo') : -1;
      if (payerShieldIdx > -1) {
        sfx.magic(); setPlayers(prev => { const np = prev.map(pl => ({ ...pl, cards: [...pl.cards] })); np[playerIndex].cards.splice(payerShieldIdx, 1); return np; });
        narrate("¡Escudo Literario activado!"); setActiveEvent({ type: 'info', title: "Escudo Activado 🛡️", text: `${p.name} usó su Escudo Literario y evadió la renta.`, onOk: handleNextTurn }); return;
      }
      if (p.items && p.items['it5'] > 0) {
        sfx.click(); setPlayers(prev => { const newP = prev.map(pl => ({ ...pl, items: { ...pl.items } })); newP[playerIndex].items['it5'] -= 1; return newP; });
        narrate("Capa invisible activada."); setActiveEvent({ type: 'info', title: "Capa Invisible 🧥", text: `${p.name} usó su Capa Invisible y no pagará renta esta vez.`, onOk: handleNextTurn }); return;
      }
      const ownerIndex = currentPlayersState.findIndex(pl => pl.id === ownerId);
      if (ownerIndex === -1) return handleNextTurn();
      const ownerPlayer = currentPlayersState[ownerIndex];
      const ownerDoubleIdx = ownerPlayer.cards ? ownerPlayer.cards.findIndex((c: any) => c.type === 'doble') : -1;
      let usedDouble = false;
      if (ownerDoubleIdx > -1) {
        rent *= 2; usedDouble = true; sfx.attack();
        setPlayers(prev => { const np = prev.map(pl => ({ ...pl, cards: [...pl.cards] })); np[ownerIndex].cards.splice(ownerDoubleIdx, 1); return np; });
      }
      let isBankrupt = false;
      setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money -= rent; newP[ownerIndex].money += rent; if (newP[playerIndex].money <= 0) isBankrupt = true; return newP; });
      sfx.coin(); setShake(true); setTimeout(() => setShake(false), 500);
      if (isBankrupt) { setTimeout(() => setPlayers(prev => handleBankruptcy(playerIndex, ownerIndex, prev)), 100); }
      else {
        let msg = usedDouble ? `¡${ownerPlayer.name} usó Cobro Doble! ${p.name} tuvo que pagar $${rent}.` : `${p.name} pagó $${rent} a ${ownerPlayer.name}.`;
        narrate(usedDouble ? `¡Cobro Doble! ${p.name} paga ${rent}.` : `${p.name} paga renta a ${ownerPlayer.name}.`);
        setActiveEvent({ type: 'info', title: "Pago de Asesoría", text: msg, onOk: handleNextTurn });
      }
    }
  };

  const handleQuizAction = (pos: number, playerIndex: number, currentPlayersState: any[], p: any, s: any) => {
    const rewardAmount = p.avatarId === 'av6' ? 300 : 200; const diff = p.difficulty || 'normal';
    narrate("Hora de trivia.");
    if (p.isBot) {
      const quizChance = diff === 'facil' ? 0.2 : diff === 'normal' ? 0.5 : 0.85;
      if (Math.random() < quizChance) { sfx.correct(); setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money += rewardAmount; return newP; }); setActiveEvent({ type: 'info', title: "Trivia Bot", text: `${p.name} demostró intelecto y ganó $${rewardAmount}.`, onOk: handleNextTurn }); }
      else { sfx.wrong(); setActiveEvent({ type: 'info', title: "Trivia Bot", text: `${p.name} falló la trivia.`, onOk: handleNextTurn }); }
    } else { sfx.turn(); setActiveEvent({ type: 'quiz', q: getRandomQuestion(p.avatarId), usedHint: false, hiddenOptions: [] }); }
  };

  const handleAttackAction = (pos: number, playerIndex: number, currentPlayersState: any[], p: any, s: any) => {
    if (gameMode === 'peace') { setActiveEvent({ type: 'info', title: "Zona de Paz ☮️", text: "En modo Pacifista no hay sabotajes.", onOk: handleNextTurn }); return; }
    narrate("¡Casilla de Sabotaje!", true);
    if (p.isBot) {
      const diff = p.difficulty || 'normal';
      const aliveTargets = currentPlayersState.filter((pl: any, i: number) => i !== playerIndex && pl.alive);
      if (aliveTargets.length > 0) {
        let target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
        if (diff === 'dificil') target = aliveTargets.sort((a: any, b: any) => b.money - a.money)[0];
        triggerAnimeBattle(playerIndex, currentPlayersState.findIndex((pl: any) => pl.id === target.id), currentPlayersState);
      } else handleNextTurn();
    } else { sfx.turn(); setActiveEvent({ type: 'select_target' }); }
  };

  const handleTaxJailAction = (pos: number, playerIndex: number, currentPlayersState: any[], p: any, s: any) => {
    if (p.avatarId === 'av7') { sfx.click(); narrate("Evadido como un ninja."); setActiveEvent({ type: 'info', title: "Inmunidad Ninja 🥷", text: `${p.name} evadió el castigo.`, onOk: handleNextTurn }); }
    else if (p.avatarId === 'av2' && s.type === 'jail') { sfx.click(); narrate("Magia de escape activada."); setActiveEvent({ type: 'info', title: "Inmunidad Mágica 🧙", text: `${p.name} se teletransportó fuera de Azkaban.`, onOk: handleNextTurn }); }
    else {
      let isBankrupt = false;
      setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money -= s.amount || 150; if (newP[playerIndex].money <= 0) isBankrupt = true; return newP; });
      sfx.wrong(); setShake(true); setTimeout(() => setShake(false), 500);
      if (isBankrupt) { setTimeout(() => setPlayers(prev => handleBankruptcy(playerIndex, null, prev)), 100); }
      else { narrate(`Castigo. Pierde dinero.`); setActiveEvent({ type: 'info', title: s.name, text: `${p.name} perdió $${s.amount || 150}. ${s.desc}`, onOk: handleNextTurn }); }
    }
  };

  const handleTileAction = (pos: number, playerIndex: number, currentPlayersState: any[]) => {
    const p = currentPlayersState[playerIndex]; const s = BOARD_DATA[pos];
    if (gameMode === 'chaos' && Math.random() < 0.20 && !['quiz', 'attack', 'start'].includes(s.type)) {
      sfx.magic();
      if (Math.random() < 0.5) { setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money += 200; return newP; }); narrate("Caos mágico. Más dinero.", true); setActiveEvent({ type: 'info', title: "Caos Mágico ✨", text: `Una ráfaga de magia le otorgó $200 a ${p.name}.`, onOk: handleNextTurn }); }
      else { setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[playerIndex].money = Math.max(0, newP[playerIndex].money - 150); return newP; }); narrate("Caos oscuro. Dinero perdido.", true); setActiveEvent({ type: 'info', title: "Caos Oscuro 🌑", text: `Un agujero negro absorbió $150 de ${p.name}.`, onOk: handleNextTurn }); }
      return;
    }
    if (s.name) narrate(`Ha caído en ${s.name}.`);
    switch (s.type) {
      case 'prop': return handlePropAction(pos, playerIndex, currentPlayersState, p, s);
      case 'quiz': return handleQuizAction(pos, playerIndex, currentPlayersState, p, s);
      case 'uno': { const card = drawCard(playerIndex); narrate(`Obtiene carta: ${card.name}.`); setActiveEvent({ type: 'info', title: "CARTA OBTENIDA 🃏", text: `${p.name} consiguió: ${card.name} ${card.icon}`, onOk: handleNextTurn }); break; }
      case 'attack': return handleAttackAction(pos, playerIndex, currentPlayersState, p, s);
      case 'tax':
      case 'jail': return handleTaxJailAction(pos, playerIndex, currentPlayersState, p, s);
      default: setActiveEvent({ type: 'info', title: s.name, text: s.desc || "Casilla especial.", onOk: handleNextTurn });
    }
  };

  const triggerAnimeBattle = (attackerIdx: number, defenderIdx: number, currentPlayers: any[]) => {
    sfx.attack(); setActiveEvent(null); setAnimeAction({ a: attackerIdx, d: defenderIdx, phase: 'intro' });
    const def = currentPlayers[defenderIdx]; const att = currentPlayers[attackerIdx];
    narrate(`¡${att.name} ataca a ${def.name}!`, true);
    const defShieldIdx = def.cards ? def.cards.findIndex((c: any) => c.type === 'escudo') : -1;
    if (defShieldIdx > -1) {
      setTimeout(() => { sfx.magic(); setAnimeAction({ a: attackerIdx, d: defenderIdx, phase: 'blocked' }); setTimeout(() => { setPlayers(prev => { const np = prev.map(pl => ({ ...pl, cards: [...pl.cards] })); np[defenderIdx].cards.splice(defShieldIdx, 1); return np; }); setAnimeAction(null); setActiveEvent({ type: 'info', title: "Escudo Literario 🛡️", text: `${def.name} bloqueó el sabotaje con su carta.`, onOk: handleNextTurn }); }, 2000); }, 2000); return;
    }
    if (def.avatarId === 'av9' && Math.random() > 0.5) {
      setTimeout(() => { sfx.click(); setAnimeAction({ a: attackerIdx, d: defenderIdx, phase: 'blocked' }); setTimeout(() => { setAnimeAction(null); setActiveEvent({ type: 'info', title: "Intangible 👻", text: `El sabotaje atravesó a ${def.name} sin hacerle daño.`, onOk: handleNextTurn }); }, 2000); }, 2000); return;
    }
    if (def.items && def.items['it2'] > 0) {
      setTimeout(() => { sfx.click(); setAnimeAction({ a: attackerIdx, d: defenderIdx, phase: 'blocked' }); setTimeout(() => { setPlayers(prev => { const newP = prev.map(pl => ({ ...pl, items: { ...pl.items } })); newP[defenderIdx].items['it2'] -= 1; return newP; }); setAnimeAction(null); setActiveEvent({ type: 'info', title: "Regla Escudo 📏", text: `${def.name} bloqueó el sabotaje con su ítem.`, onOk: handleNextTurn }); }, 2000); }, 2000); return;
    }
    setTimeout(() => {
      setAnimeAction(null);
      if (!def.isBot) {
        narrate("Defiéndete respondiendo la trivia.", true);
        setActiveEvent({ type: 'quiz', q: getRandomQuestion(def.avatarId), isAttack: true, attacker: attackerIdx, hiddenOptions: [] });
      } else {
        const diff = def.difficulty || 'normal'; const defendChance = diff === 'facil' ? 0.3 : diff === 'normal' ? 0.6 : 0.9;
        if (Math.random() < defendChance) { sfx.correct(); narrate(`${def.name} se ha defendido.`, true); setActiveEvent({ type: 'info', title: "Defensa Exitosa", text: `${def.name} bloqueó el ataque.`, onOk: handleNextTurn }); }
        else {
          sfx.wrong(); const damage = att.avatarId === 'av4' ? 350 : 300; let isBankrupt = false;
          setPlayers(prev => { const newP = prev.map(pl => ({ ...pl })); newP[defenderIdx].money -= damage; newP[attackerIdx].money += damage; if (newP[defenderIdx].money <= 0) isBankrupt = true; return newP; });
          setShake(true); setTimeout(() => setShake(false), 500);
          narrate(`¡Ataque exitoso! Roba ${damage} dólares.`, true);
          if (isBankrupt) { setTimeout(() => setPlayers(prev => handleBankruptcy(defenderIdx, attackerIdx, prev)), 100); }
          else { setActiveEvent({ type: 'info', title: "Sabotaje Exitoso ⚔️", text: `${def.name} falló. ¡${currentPlayers[attackerIdx].name} roba $${damage}!`, onOk: handleNextTurn }); }
        }
      }
    }, 2500);
  };

  const executeDiceRoll = (playerIndex: number, val: number) => {
    setRollingDice(false); setAvatarThrowing(false); setDice(val);
    narrate(`Avanza ${val} pasos.`, true);
    setPlayers(prevPlayers => {
      const np = prevPlayers.map(p => ({ ...p })); const p = np[playerIndex]; const oldPos = p.pos;
      p.pos = (((p.pos + (val * direction)) % 36) + 36) % 36;
      if (direction === 1 && p.pos < oldPos && oldPos > 20) { p.money += (p.avatarId === 'av3' ? 250 : 200); sfx.coin(); }
      if (direction === -1 && p.pos > oldPos && oldPos < 15) { p.money += (p.avatarId === 'av3' ? 250 : 200); sfx.coin(); }
      setTimeout(() => focusOnPlayer(playerIndex), 100);
      setTimeout(() => handleTileAction(p.pos, playerIndex, np), 700);
      return np;
    });
  };

  const rollDiceAction = (playerIndex: number, forcedVal: number | null = null) => {
    if (rollingDice) return; sfx.click();
    if (forcedVal) { setPlayers(prev => { const np = prev.map(p => ({ ...p, items: { ...p.items } })); np[playerIndex].items['it3'] -= 1; return np; }); setActiveEvent(null); }
    setRollingDice(true); setAvatarThrowing(true);
    const finalVal = forcedVal || (Math.floor(Math.random() * 6) + 1); let rolls = 0;
    const rollInterval = setInterval(() => { sfx.dice(); setDice(Math.floor(Math.random() * 6) + 1); rolls++; if (rolls > 10) { clearInterval(rollInterval); executeDiceRoll(playerIndex, finalVal); } }, 60);
  };

  useEffect(() => {
    if (view !== 'game' || players.length === 0) return;
    const cp = players[turn];
    if (cp && cp.isBot && cp.alive && !activeEvent && !animeAction && !rollingDice && !dice) {
      const timer = setTimeout(() => {
        if (players.filter(p => p.alive).length <= 1) return;
        const diff = cp.difficulty || 'normal'; const cardChance = diff === 'facil' ? 0.2 : diff === 'normal' ? 0.5 : 0.8;
        if (cp.cards && cp.cards.length > 0 && Math.random() < cardChance) {
          const playableCards = cp.cards.filter((c: any) => c.type !== 'escudo' && c.type !== 'doble');
          if (playableCards.length > 0) {
            const cardToPlay = playableCards[0]; const cardIdx = cp.cards.findIndex((c: any) => c.id === cardToPlay.id);
            const aliveEnemies = players.filter(p => !p.isBot && p.alive);
            const target = aliveEnemies.length > 0 ? aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)].id : null;
            if ((cardToPlay.type === 'salta' || cardToPlay.type === 'toma_2') && target !== null && gameMode !== 'peace') { playCard(cardIdx, turn, target); }
            else if (cardToPlay.type !== 'salta' && cardToPlay.type !== 'toma_2') { playCard(cardIdx, turn); }
            else rollDiceAction(turn);
          } else rollDiceAction(turn);
        } else rollDiceAction(turn);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, view, players, activeEvent, animeAction, rollingDice, dice, gameMode]);

  useEffect(() => {
    if (view === 'game' && activeEvent && activeEvent.onOk && players[turn]?.isBot) {
      const timer = setTimeout(() => { sfx.click(); activeEvent.onOk(); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeEvent, view, turn, players]);

  //======================================================================
  // MOTOR CANVAS 3D
  //======================================================================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({ players, properties, turn, direction, upgrades });
  const is3DRef = useRef(is3D);
  const currentBoardRef = useRef(BOARD_SHOP.find(b => b.id === myBoard) || BOARD_SHOP[0]);
  const animState = useRef<any>({ camera: { rotX: 1.0, rotZ: 0, camX: 0, camY: 0, zoom: 1, targetRotX: 1.0, targetRotZ: 0, targetCamX: 0, targetCamY: 0, targetZoom: 1 }, tokens: [], particles: [], scenery: [], time: 0 });

  useEffect(() => { gameStateRef.current = { players, properties, turn, direction, upgrades }; }, [players, properties, turn, direction, upgrades]);
  useEffect(() => { is3DRef.current = is3D; focusOnPlayer(turn); }, [is3D]);
  useEffect(() => { currentBoardRef.current = BOARD_SHOP.find(b => b.id === myBoard) || BOARD_SHOP[0]; }, [myBoard]);

  const getTileCorners = (idx: number) => {
    const TS = 70; const BSIZE = 10 * TS; const OFF = -BSIZE / 2; let lx: number, ly: number;
    if (idx <= 9) { lx = idx * TS; ly = 0; } else if (idx <= 18) { lx = 9 * TS; ly = (idx - 9) * TS; } else if (idx <= 27) { lx = (27 - idx) * TS; ly = 9 * TS; } else { lx = 0; ly = (36 - idx) * TS; }
    lx += OFF; ly += OFF;
    return [{ x: lx, y: ly, z: 0 }, { x: lx + TS, y: ly, z: 0 }, { x: lx + TS, y: ly + TS, z: 0 }, { x: lx, y: ly + TS, z: 0 }];
  };

  const focusOnPlayer = (playerIndex: number, instant = false) => {
    const p = gameStateRef.current.players[playerIndex]; if (!p) return;
    const anim = animState.current.tokens[playerIndex]; const pos = anim ? anim.visualPos : p.pos;
    const idx1 = Math.floor(((pos % 36) + 36) % 36); const corners = getTileCorners(idx1);
    const tx = (corners[0].x + corners[2].x) / 2; const ty = (corners[0].y + corners[2].y) / 2;
    if (is3DRef.current) { animState.current.camera.targetRotX = 1.0; animState.current.camera.targetCamX = tx; animState.current.camera.targetCamY = ty; animState.current.camera.targetZoom = 1.35; }
    else { animState.current.camera.targetRotX = 0; animState.current.camera.targetRotZ = 0; animState.current.camera.targetCamX = tx; animState.current.camera.targetCamY = ty; animState.current.camera.targetZoom = 1.2; }
    if (instant) { Object.assign(animState.current.camera, { camX: animState.current.camera.targetCamX, camY: animState.current.camera.targetCamY, zoom: animState.current.camera.targetZoom, rotX: animState.current.camera.targetRotX, rotZ: animState.current.camera.targetRotZ }); }
  };

  const rotateCamera = (dir: number) => { sfx.click(); if (!is3D) return; animState.current.camera.targetRotZ += dir * (Math.PI / 4); };

  const project3D = (x: number, y: number, z: number, rotX: number, rotZ: number, camX: number, camY: number, camZ: number, fov: number, cx: number, cy: number, baseScale: number) => {
    const x1 = x - camX; const y1 = y - camY;
    const x2 = x1 * Math.cos(rotZ) - y1 * Math.sin(rotZ);
    const y2 = x1 * Math.sin(rotZ) + y1 * Math.cos(rotZ);
    const y3 = y2 * Math.cos(rotX) - z * Math.sin(rotX);
    const z2 = y2 * Math.sin(rotX) + z * Math.cos(rotX);
    const zFinal = Math.max(1, z2 + camZ);
    const scale = (fov / zFinal) * baseScale;
    return { sx: cx + x2 * scale, sy: cy + y3 * scale, scale, zDepth: zFinal };
  };

  useEffect(() => {
    if (view !== 'game') return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D; let animId: number;

    const resize = () => { const dpr = window.devicePixelRatio || 1; canvas.width = canvas.offsetWidth * dpr; canvas.height = canvas.offsetHeight * dpr; };
    resize(); window.addEventListener('resize', resize);

    if (animState.current.particles.length === 0) {
      animState.current.particles = Array.from({ length: 60 }, () => ({ x: (Math.random() - 0.5) * 1200, y: (Math.random() - 0.5) * 1200, z: -Math.random() * 800, speedZ: Math.random() * 1.5 + 0.5, speedX: (Math.random() - 0.5) * 0.5, speedY: (Math.random() - 0.5) * 0.5, size: Math.random() * 2 + 1, alpha: Math.random() }));
    }

    if (animState.current.scenery.length === 0) {
      const sc: any[] = []; const boardId = currentBoardRef.current.id;
      if (boardId !== 'b_classic') {
        for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2; const r = 450 + Math.random() * 500;
          const x = Math.cos(angle) * r; const y = Math.sin(angle) * r;
          const size = 20 + Math.random() * 30; const height = 50 + Math.random() * 100;
          if (boardId === 'b_forest') sc.push({ type: 'tree', x, y, h: height, size, color: '#16a34a', trunk: '#92400e', offX: (Math.random() - 0.5) * 10, offY: (Math.random() - 0.5) * 10 });
          else if (boardId === 'b_neon') sc.push({ type: 'building', x, y, h: height * 2, size: size * 0.5, color: '#18181b', edge: '#f472b6' });
          else if (boardId === 'b_lava') sc.push({ type: 'rock', x, y, h: height * 0.5, size, color: '#7f1d1d', edge: '#ef4444' });
        }
      }
      animState.current.scenery = sc;
    }

    const drawLoop = (timestamp: number) => {
      animState.current.time = timestamp;
      const { width, height } = canvas; const dpr = window.devicePixelRatio || 1;
      const cx = width / 2, cy = height / 2; const fov = 1000 * dpr;
      const boardTheme = currentBoardRef.current.colors;
      const bID = currentBoardRef.current.id;
      const state = animState.current;
      state.camera.rotX += (state.camera.targetRotX - state.camera.rotX) * 0.1;
      state.camera.rotZ += (state.camera.targetRotZ - state.camera.rotZ) * 0.1;
      state.camera.camX += (state.camera.targetCamX - state.camera.camX) * 0.1;
      state.camera.camY += (state.camera.targetCamY - state.camera.camY) * 0.1;
      state.camera.zoom += (state.camera.targetZoom - state.camera.zoom) * 0.1;
      const { rotX, rotZ, camX, camY, zoom } = state.camera;
      const camZ = 1000; const baseScale = (Math.min(width, height) / (850 * dpr)) * zoom;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width);
      grad.addColorStop(0, boardTheme.bg1); grad.addColorStop(1, boardTheme.bg2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);

      const fgObjects: any[] = [];
      const bSize = 355; const bThick = 40;
      const baseCorners = [{ x: -bSize, y: -bSize, z: 0 }, { x: bSize, y: -bSize, z: 0 }, { x: bSize, y: bSize, z: 0 }, { x: -bSize, y: bSize, z: 0 }];
      const botCorners = baseCorners.map(p => ({ ...p, z: bThick }));
      const pTop = baseCorners.map(p => project3D(p.x, p.y, p.z, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale));
      const pBot = botCorners.map(p => project3D(p.x, p.y, p.z, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale));

      // Draw board shadow
      ctx.beginPath(); ctx.moveTo(pBot[0].sx + 15, pBot[0].sy + 15);
      pBot.forEach(p => ctx.lineTo(p.sx + 15, p.sy + 15));
      ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();

      // Draw board sides
      if (rotX > 0.05) {
        for (let i = 0; i < 4; i++) {
          const n1 = i, n2 = (i + 1) % 4;
          ctx.beginPath(); ctx.moveTo(pTop[n1].sx, pTop[n1].sy); ctx.lineTo(pTop[n2].sx, pTop[n2].sy); ctx.lineTo(pBot[n2].sx, pBot[n2].sy); ctx.lineTo(pBot[n1].sx, pBot[n1].sy); ctx.closePath();
          ctx.fillStyle = boardTheme.wall[i]; ctx.fill(); ctx.strokeStyle = boardTheme.boardBorder; ctx.lineWidth = 1; ctx.stroke();
        }
      }

      // Draw board top
      ctx.beginPath(); ctx.moveTo(pTop[0].sx, pTop[0].sy);
      pTop.forEach(p => ctx.lineTo(p.sx, p.sy));
      ctx.closePath(); ctx.fillStyle = boardTheme.boardTop; ctx.fill();
      ctx.strokeStyle = boardTheme.boardBorder; ctx.lineWidth = 2; ctx.stroke();

      // Draw grid pattern for neon board
      if (bID === 'b_neon') {
        ctx.save(); ctx.clip();
        for (let gx = -bSize; gx <= bSize; gx += 70) {
          const p1 = project3D(gx, -bSize, -0.5, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
          const p2 = project3D(gx, bSize, -0.5, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
          ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
          ctx.strokeStyle = 'rgba(244,114,182,0.15)'; ctx.lineWidth = 1; ctx.stroke();
        }
        for (let gy = -bSize; gy <= bSize; gy += 70) {
          const p1 = project3D(-bSize, gy, -0.5, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
          const p2 = project3D(bSize, gy, -0.5, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
          ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
          ctx.strokeStyle = 'rgba(244,114,182,0.15)'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.restore();
      }

      // Draw center art
      const centerProj = project3D(0, 0, -1, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
      const cSize = 200 * centerProj.scale;
      ctx.save();
      ctx.translate(centerProj.sx, centerProj.sy);
      ctx.rotate(rotZ);
      ctx.fillStyle = bID === 'b_neon' ? 'rgba(244,114,182,0.05)' : bID === 'b_lava' ? 'rgba(220,38,38,0.1)' : bID === 'b_forest' ? 'rgba(5,150,105,0.1)' : 'rgba(100,116,139,0.1)';
      ctx.beginPath(); ctx.arc(0, 0, cSize, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = boardTheme.textBase;
      ctx.font = `bold ${Math.max(8, 14 * centerProj.scale)}px Nunito`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.7;
      ctx.fillText('LITERATÓPOLIS', 0, -10 * centerProj.scale);
      ctx.font = `${Math.max(6, 10 * centerProj.scale)}px Nunito`;
      ctx.fillText('El Juego de las Palabras', 0, 8 * centerProj.scale);
      ctx.globalAlpha = 1;
      ctx.restore();

      // Draw tiles
      BOARD_DATA.forEach((tile, idx) => {
        const corners = getTileCorners(idx);
        const centerLocal = { x: (corners[0].x + corners[2].x) / 2, y: (corners[0].y + corners[2].y) / 2 };
        const cPts = corners.map(p => project3D(p.x, p.y, p.z - 1, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale));
        const cProj = project3D(centerLocal.x, centerLocal.y, -1.5, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
        const ownerId = gameStateRef.current.properties[idx];
        const ownerPlayer = ownerId !== undefined ? gameStateRef.current.players.find(pl => pl.id === ownerId) : null;
        let baseColor = (bID === 'b_classic' || bID === 'b_forest') ? '#ffffff' : boardTheme.bg1;
        let borderColor = boardTheme.boardBorder;
        if (ownerPlayer) { baseColor = hexToRgba(COLOR_MAP[ownerPlayer.bg] || '#ffffff', 0.3); borderColor = COLOR_MAP[ownerPlayer.bg] || '#ffffff'; }

        ctx.beginPath(); ctx.moveTo(cPts[0].sx, cPts[0].sy);
        cPts.forEach(p => ctx.lineTo(p.sx, p.sy));
        ctx.closePath(); ctx.fillStyle = baseColor; ctx.fill();
        ctx.strokeStyle = borderColor; ctx.lineWidth = ownerPlayer ? 2 : 1; ctx.stroke();

        // Header color
        const headerH = 0.25; const hPts = [cPts[0], cPts[1], { sx: cPts[1].sx + (cPts[2].sx - cPts[1].sx) * headerH, sy: cPts[1].sy + (cPts[2].sy - cPts[1].sy) * headerH }, { sx: cPts[0].sx + (cPts[3].sx - cPts[0].sx) * headerH, sy: cPts[0].sy + (cPts[3].sy - cPts[0].sy) * headerH }];
        ctx.beginPath(); ctx.moveTo(hPts[0].sx, hPts[0].sy);
        hPts.forEach(p => ctx.lineTo(p.sx, p.sy));
        ctx.closePath(); ctx.fillStyle = COLOR_MAP[tile.color] || '#6366f1'; ctx.fill();

        // Icon and name
        const iconSize = Math.max(8, 16 * cProj.scale);
        ctx.font = `${iconSize}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(tile.icon, cProj.sx, cProj.sy - 3 * cProj.scale);

        if (cProj.scale > 0.5) {
          ctx.font = `bold ${Math.max(5, 7 * cProj.scale)}px Nunito`;
          ctx.fillStyle = bID === 'b_neon' || bID === 'b_lava' ? '#f8fafc' : '#1e293b';
          ctx.fillText(tile.name.length > 8 ? tile.name.substring(0, 8) : tile.name, cProj.sx, cProj.sy + 10 * cProj.scale);
        }

        // Upgrade blocks
        const upgradeLevel = gameStateRef.current.upgrades[idx] || 0;
        if (upgradeLevel > 0 && is3DRef.current) {
          const offsetBase = (idx > 9 && idx < 27) ? -20 : 20;
          for (let lv = 0; lv < upgradeLevel; lv++) {
            const bx = centerLocal.x; const by = centerLocal.y + offsetBase; const bz = -lv * 10 - 5;
            const bProj = project3D(bx, by, bz, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
            fgObjects.push({ type: 'upgrade_block', zDepth: bProj.zDepth, pCenter: bProj, size: 10 });
          }
        }
      });

      // Draw scenery
      if (is3DRef.current) {
        state.scenery.forEach((sc: any) => {
          const pBase = project3D(sc.x, sc.y, 0, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
          const pTopSc = project3D(sc.x + (sc.offX || 0), sc.y + (sc.offY || 0), -sc.h, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
          if (pBase.zDepth > 0) fgObjects.push({ type: 'scenery', scData: sc, pBase, pTop: pTopSc, zDepth: pBase.zDepth });
        });
      }

      // Draw tokens
      gameStateRef.current.players.forEach((p: any, i: number) => {
        if (!p.alive) return;
        let anim = state.tokens[i]; if (!anim) { anim = { visualPos: p.pos, bounce: 0 }; state.tokens[i] = anim; }
        const targetPos = p.pos;
        const diff2 = targetPos - anim.visualPos;
        const adjTarget = Math.abs(diff2) > 18 ? targetPos + (diff2 < 0 ? 36 : -36) : targetPos;
        if (Math.abs(adjTarget - anim.visualPos) > 0.01) { anim.visualPos += (adjTarget - anim.visualPos) * 0.15; anim.bounce = Math.abs(Math.sin(anim.visualPos * Math.PI)) * 30; }
        else { anim.visualPos = p.pos; anim.bounce = gameStateRef.current.turn === i ? Math.sin(timestamp * 0.005) * 6 + 4 : 0; }
        const normalizedPos = ((anim.visualPos % 36) + 36) % 36;
        const idx1 = Math.floor(normalizedPos); const idx2 = (idx1 + 1) % 36; const frac = normalizedPos - idx1;
        const c1 = getTileCorners(idx1); const c2 = getTileCorners(idx2);
        const cx1 = (c1[0].x + c1[2].x) / 2; const cy1 = (c1[0].y + c1[2].y) / 2;
        const cx2 = (c2[0].x + c2[2].x) / 2; const cy2 = (c2[0].y + c2[2].y) / 2;
        const tx = cx1 + (cx2 - cx1) * frac + (i % 2 === 0 ? -12 : 12);
        const ty = cy1 + (cy2 - cy1) * frac + (i < 2 ? -12 : 12);
        const tz = -anim.bounce - 5;
        const tProj = project3D(tx, ty, tz, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
        fgObjects.push({ type: 'token', zDepth: tProj.zDepth, pCenter: tProj, player: p, isTurn: gameStateRef.current.turn === i });
      });

      // Sort and draw fg objects
      fgObjects.sort((a, b) => b.zDepth - a.zDepth);
      fgObjects.forEach(obj => {
        if (obj.type === 'upgrade_block') {
          const s = obj.size * obj.pCenter.scale;
          ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.rect(obj.pCenter.sx - s, obj.pCenter.sy - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
        } else if (obj.type === 'token') {
          const s = Math.max(12, 22 * obj.pCenter.scale);
          const p = obj.player; const isTurn = obj.isTurn;
          if (isTurn) {
            ctx.beginPath(); ctx.arc(obj.pCenter.sx, obj.pCenter.sy, s + 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(timestamp * 0.005)})`; ctx.fill();
          }
          ctx.font = `${s * 1.5}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(p.icon, obj.pCenter.sx, obj.pCenter.sy);
          if (isTurn) {
            ctx.font = `bold ${Math.max(8, 10 * obj.pCenter.scale)}px Nunito`;
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
            ctx.fillText(p.name, obj.pCenter.sx, obj.pCenter.sy + s + 8);
          }
        } else if (obj.type === 'scenery') {
          const sc = obj.scData;
          if (sc.type === 'tree') {
            ctx.strokeStyle = sc.trunk; ctx.lineWidth = Math.max(2, 4 * obj.pBase.scale);
            ctx.beginPath(); ctx.moveTo(obj.pBase.sx, obj.pBase.sy); ctx.lineTo(obj.pTop.sx, obj.pTop.sy); ctx.stroke();
            const leafSize = sc.size * obj.pTop.scale;
            ctx.beginPath(); ctx.arc(obj.pTop.sx, obj.pTop.sy, leafSize, 0, Math.PI * 2);
            ctx.fillStyle = sc.color; ctx.fill();
          } else if (sc.type === 'building') {
            const bw = sc.size * obj.pBase.scale;
            ctx.fillStyle = sc.color; ctx.strokeStyle = sc.edge; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.rect(obj.pTop.sx - bw, obj.pTop.sy, bw * 2, obj.pBase.sy - obj.pTop.sy); ctx.fill(); ctx.stroke();
          } else if (sc.type === 'rock') {
            const rw = sc.size * obj.pBase.scale;
            ctx.fillStyle = sc.color; ctx.strokeStyle = sc.edge; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(obj.pBase.sx, obj.pBase.sy, rw, rw * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
      });

      // Particles
      state.particles.forEach((pt: any) => {
        pt.z += pt.speedZ; pt.x += pt.speedX; pt.y += pt.speedY;
        if (pt.z > 0) pt.z = -800;
        const pProj = project3D(pt.x, pt.y, pt.z, rotX, rotZ, camX, camY, camZ, fov, cx, cy, baseScale);
        if (pProj.zDepth > 0 && pProj.sx > 0 && pProj.sx < width && pProj.sy > 0 && pProj.sy < height) {
          const ps = Math.max(0.5, pt.size * pProj.scale);
          ctx.beginPath(); ctx.arc(pProj.sx, pProj.sy, ps, 0, Math.PI * 2);
          ctx.fillStyle = boardTheme.particle; ctx.globalAlpha = pt.alpha * 0.6; ctx.fill(); ctx.globalAlpha = 1;
        }
      });

      // Fog overlay
      const fogGrad = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.3, cx, cy, Math.max(width, height) * 0.8);
      fogGrad.addColorStop(0, 'transparent'); fogGrad.addColorStop(1, boardTheme.fog);
      ctx.fillStyle = fogGrad; ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(drawLoop);
    };

    animId = requestAnimationFrame(drawLoop);

    // Touch/mouse controls
    const handleMouseDown = (e: MouseEvent) => { animState.current.dragging = true; animState.current.lastMouse = { x: e.clientX, y: e.clientY }; };
    const handleMouseMove = (e: MouseEvent) => {
      if (!animState.current.dragging) return;
      const dx = e.clientX - animState.current.lastMouse.x; const dy = e.clientY - animState.current.lastMouse.y;
      animState.current.lastMouse = { x: e.clientX, y: e.clientY };
      animState.current.camera.targetRotZ += dx * 0.005;
      animState.current.camera.targetCamX -= dx * 0.5; animState.current.camera.targetCamY -= dy * 0.5;
    };
    const handleMouseUp = () => { animState.current.dragging = false; };
    const handleWheel = (e: WheelEvent) => { animState.current.camera.targetZoom = Math.max(0.5, Math.min(3, animState.current.camera.targetZoom - e.deltaY * 0.001)); };
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) { animState.current.dragging = true; animState.current.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
      else if (e.touches.length === 2) { animState.current.lastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && animState.current.dragging) {
        const dx = e.touches[0].clientX - animState.current.lastMouse.x; const dy = e.touches[0].clientY - animState.current.lastMouse.y;
        animState.current.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        animState.current.camera.targetRotZ += dx * 0.005;
        animState.current.camera.targetCamX -= dx * 0.5; animState.current.camera.targetCamY -= dy * 0.5;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        animState.current.camera.targetZoom = Math.max(0.5, Math.min(3, animState.current.camera.targetZoom * (dist / animState.current.lastDist)));
        animState.current.lastDist = dist;
      }
    };
    const handleTouchEnd = () => { animState.current.dragging = false; };

    canvas.addEventListener('mousedown', handleMouseDown); canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp); canvas.addEventListener('wheel', handleWheel, { passive: true });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true }); canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', handleMouseDown); canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp); canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart); canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [view]);

  //======================================================================
  // PANEL DE AJUSTES
  //======================================================================
  const SettingsPanel = ({ isOverlay = false }: { isOverlay?: boolean }) => (
    <div className={`flex flex-col gap-5 ${!isOverlay ? 'glass-panel rounded-[2rem] p-6' : ''}`}>
      {!isOverlay && <h2 className="text-2xl font-black uppercase">⚙️ Ajustes</h2>}
      <div>
        <label className="text-xs font-black uppercase opacity-70 mb-2 block">Tema Visual</label>
        <button onClick={toggleTheme} className={`w-full py-3 rounded-xl font-black text-sm inner-module border hover:brightness-110 transition-all`}>{theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}</button>
      </div>
      <div>
        <label className="text-xs font-black uppercase opacity-70 mb-2 block">Música: {Math.round((window as any).__gameConfig.musicVol * 100)}%</label>
        <input type="range" min="0" max="1" step="0.05" defaultValue={(window as any).__gameConfig.musicVol} onChange={e => updateConfig('musicVol', parseFloat(e.target.value))} />
      </div>
      <div>
        <label className="text-xs font-black uppercase opacity-70 mb-2 block">Efectos: {Math.round((window as any).__gameConfig.sfxVol * 100)}%</label>
        <input type="range" min="0" max="1" step="0.05" defaultValue={(window as any).__gameConfig.sfxVol} onChange={e => updateConfig('sfxVol', parseFloat(e.target.value))} />
      </div>
      <div>
        <label className="text-xs font-black uppercase opacity-70 mb-2 block">Narrador: {Math.round((window as any).__gameConfig.voiceVol * 100)}%</label>
        <input type="range" min="0" max="1" step="0.05" defaultValue={(window as any).__gameConfig.voiceVol} onChange={e => updateConfig('voiceVol', parseFloat(e.target.value))} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => updateConfig('voiceEnabled', !(window as any).__gameConfig.voiceEnabled)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border ${(window as any).__gameConfig.voiceEnabled ? 'bg-emerald-500 text-white border-emerald-400' : 'inner-module border-white/20'}`}>
          {(window as any).__gameConfig.voiceEnabled ? '🔊 Voz ON' : '🔇 Voz OFF'}
        </button>
        <button onClick={() => updateConfig('isMuted', !(window as any).__gameConfig.isMuted)} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all border ${(window as any).__gameConfig.isMuted ? 'bg-rose-500 text-white border-rose-400' : 'inner-module border-white/20'}`}>
          {(window as any).__gameConfig.isMuted ? '🔇 MUDO' : '🔈 SONIDO'}
        </button>
      </div>
    </div>
  );

  const cp = players[turn];

  //======================================================================
  // RENDER
  //======================================================================
  return (
    <div className="w-full h-screen relative select-none overflow-hidden" style={{ background: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <GlobalStyles theme={theme} />

      {/* ===== MENÚ PRINCIPAL ===== */}
      {view === 'menu' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-sm flex flex-col items-center gap-5">
            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter title-anim inline-block" style={{ fontFamily: "'Playfair Display', serif", background: 'linear-gradient(135deg, #10b981, #6366f1, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Literatópolis
              </h1>
              <p className="text-xs font-black uppercase tracking-widest opacity-50 mt-1">El Juego de las Palabras</p>
            </div>
            <div className="glass-panel rounded-[2rem] p-4 w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🪙</span>
                <div>
                  <p className="text-xs opacity-60 font-bold uppercase">Monedas</p>
                  <p className="text-2xl font-black text-amber-500">{globalCoins}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleTheme} className="inner-module w-10 h-10 rounded-xl flex items-center justify-center border hover:brightness-110 transition-all">{theme === 'dark' ? '☀️' : '🌙'}</button>
                <button onClick={() => { sfx.click(); if (!started) { initAudio(); setStarted(true); musicEngine.play('menu'); } setView('settings'); }} className="inner-module w-10 h-10 rounded-xl flex items-center justify-center border hover:brightness-110 transition-all">⚙️</button>
              </div>
            </div>
            <button onClick={() => { sfx.click(); if (!started) { initAudio(); setStarted(true); musicEngine.play('menu'); } setView('lobby'); }} className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xl rounded-2xl shadow-[0_6px_0_#047857] active:translate-y-[6px] active:shadow-none transition-all uppercase tracking-widest">
              🎲 JUGAR
            </button>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={() => { sfx.click(); if (!started) { initAudio(); setStarted(true); musicEngine.play('menu'); } setView('shop'); }} className="py-4 glass-panel rounded-2xl font-black text-sm flex flex-col items-center gap-1 hover:brightness-110 transition-all border">
                <span className="text-2xl">🛒</span><span>Tienda</span>
              </button>
              <button onClick={() => { sfx.click(); if (!started) { initAudio(); setStarted(true); musicEngine.play('menu'); } setView('howtoplay'); }} className="py-4 glass-panel rounded-2xl font-black text-sm flex flex-col items-center gap-1 hover:brightness-110 transition-all border">
                <span className="text-2xl">📖</span><span>Cómo Jugar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TIENDA ===== */}
      {view === 'shop' && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className="glass-panel rounded-none border-0 border-b px-4 py-3 flex items-center justify-between shrink-0">
            <button onClick={() => btnClick(() => setView('menu'))} className="inner-module px-4 py-2 rounded-xl font-black text-sm border hover:brightness-110 transition-all">← VOLVER</button>
            <h2 className="font-black text-lg uppercase">🛒 Tienda</h2>
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/30">
              <span>🪙</span><span className="font-black text-amber-500">{globalCoins}</span>
            </div>
          </div>
          <div className="flex gap-1 px-4 pt-3 shrink-0 overflow-x-auto no-scrollbar">
            {[['avatars','🧑 Avatares'],['tokens','🎭 Fichas'],['boards','🗺️ Tableros'],['items','🎒 Ítems']].map(([tab, label]) => (
              <button key={tab} onClick={() => { sfx.click(); setShopTab(tab); }} className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap transition-all border ${shopTab === tab ? 'bg-emerald-500 text-white border-emerald-400 shadow-md' : 'inner-module border-white/20 hover:brightness-110'}`}>{label}</button>
            ))}
          </div>
          <div className="flex-grow overflow-y-auto p-4 no-scrollbar">
            {shopTab === 'avatars' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVATAR_SHOP.map(av => {
                  const owned = unlockedAvatars.includes(av.id); const isSelected = myAvatar === av.id;
                  return (
                    <div key={av.id} onClick={() => { if (owned) { sfx.click(); setMyAvatar(av.id); } else if (globalCoins >= av.price) { sfx.coin(); setGlobalCoins(c => c - av.price); setUnlockedAvatars(u => [...u, av.id]); setMyAvatar(av.id); } else sfx.wrong(); }} className={`glass-panel rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all border ${isSelected ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-white/10 hover:border-white/30'} ${!owned && globalCoins < av.price ? 'opacity-50' : ''}`}>
                      <div className="text-4xl">{av.icon}</div>
                      <p className="font-black text-sm">{av.name}</p>
                      <p className="text-xs opacity-60 text-center leading-tight">{av.ability}</p>
                      {owned ? <span className="text-xs font-black text-emerald-500">{isSelected ? '✓ EQUIPADO' : 'EQUIPAR'}</span> : <span className="text-xs font-black text-amber-500">🪙 {av.price}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {shopTab === 'tokens' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOKEN_SHOP.map(tk => {
                  const owned = unlockedTokens.includes(tk.id); const isSelected = myToken === tk.id;
                  return (
                    <div key={tk.id} onClick={() => { if (owned) { sfx.click(); setMyToken(tk.id); } else if (globalCoins >= tk.price) { sfx.coin(); setGlobalCoins(c => c - tk.price); setUnlockedTokens(u => [...u, tk.id]); setMyToken(tk.id); } else sfx.wrong(); }} className={`glass-panel rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all border ${isSelected ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-white/10 hover:border-white/30'} ${!owned && globalCoins < tk.price ? 'opacity-50' : ''}`}>
                      <div className="text-4xl">{tk.icon}</div>
                      <p className="font-black text-sm">{tk.name}</p>
                      <p className="text-xs opacity-60 capitalize">{tk.type}</p>
                      {owned ? <span className="text-xs font-black text-emerald-500">{isSelected ? '✓ EQUIPADO' : 'EQUIPAR'}</span> : <span className="text-xs font-black text-amber-500">🪙 {tk.price}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {shopTab === 'boards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BOARD_SHOP.map(bd => {
                  const owned = unlockedBoards.includes(bd.id); const isSelected = myBoard === bd.id;
                  return (
                    <div key={bd.id} onClick={() => { if (owned) { sfx.click(); setMyBoard(bd.id); } else if (globalCoins >= bd.price) { sfx.coin(); setGlobalCoins(c => c - bd.price); setUnlockedBoards(u => [...u, bd.id]); setMyBoard(bd.id); } else sfx.wrong(); }} className={`glass-panel rounded-2xl p-5 flex flex-col gap-2 cursor-pointer transition-all border ${isSelected ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-white/10 hover:border-white/30'} ${!owned && globalCoins < bd.price ? 'opacity-50' : ''}`} style={{ background: `linear-gradient(135deg, ${bd.colors.bg1}, ${bd.colors.bg2})` }}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{bd.icon}</span>
                        <div>
                          <p className="font-black text-white">{bd.name}</p>
                          <p className="text-xs text-white/70">{bd.desc}</p>
                        </div>
                      </div>
                      {owned ? <span className="text-xs font-black text-emerald-400">{isSelected ? '✓ ACTIVO' : 'ACTIVAR'}</span> : <span className="text-xs font-black text-amber-400">🪙 {bd.price}</span>}
                    </div>
                  );
                })}
              </div>
            )}
            {shopTab === 'items' && (
              <div className="flex flex-col gap-3">
                {ITEM_SHOP.map(it => {
                  const count = inventory[it.id] || 0;
                  return (
                    <div key={it.id} className="glass-panel rounded-2xl p-4 flex items-center gap-4 border border-white/10">
                      <span className="text-3xl shrink-0">{it.icon}</span>
                      <div className="flex-grow">
                        <p className="font-black">{it.name}</p>
                        <p className="text-xs opacity-60">{it.desc}</p>
                        <p className="text-xs font-bold text-amber-500 mt-1">🪙 {it.price} c/u — Tienes: {count}</p>
                      </div>
                      <button onClick={() => { if (globalCoins >= it.price) { sfx.coin(); setGlobalCoins(c => c - it.price); setInventory(inv => ({ ...inv, [it.id]: (inv[it.id] || 0) + 1 })); } else sfx.wrong(); }} className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-4 py-2 rounded-xl text-sm shadow-[0_3px_0_#047857] active:translate-y-[3px] active:shadow-none transition-all shrink-0">
                        COMPRAR
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== AJUSTES ===== */}
      {view === 'settings' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 overflow-y-auto no-scrollbar">
          <div className="w-full max-w-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => btnClick(() => setView('menu'))} className="inner-module px-4 py-2 rounded-xl font-black text-sm border hover:brightness-110 transition-all">← VOLVER</button>
              <h2 className="text-2xl font-black uppercase">⚙️ Ajustes</h2>
            </div>
            <SettingsPanel />
          </div>
        </div>
      )}

      {/* ===== CÓMO JUGAR ===== */}
      {view === 'howtoplay' && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className="glass-panel rounded-none border-0 border-b px-4 py-3 flex items-center gap-3 shrink-0">
            <button onClick={() => btnClick(() => setView('menu'))} className="inner-module px-4 py-2 rounded-xl font-black text-sm border hover:brightness-110 transition-all">← VOLVER</button>
            <h2 className="font-black text-lg uppercase">📖 Cómo Jugar</h2>
          </div>
          <div className="flex-grow overflow-y-auto p-4 no-scrollbar">
            <div className="max-w-lg mx-auto flex flex-col gap-4">
              {[
                { icon: "🎲", title: "Turno", text: "Tira el dado para avanzar. El número determina cuántas casillas te mueves en la dirección actual." },
                { icon: "🏠", title: "Propiedades", text: "Cae en una casilla libre para comprarla. Si ya es tuya, puedes mejorarla hasta 3 veces. Si es de un rival, pagas renta." },
                { icon: "❓", title: "Trivia", text: "Responde correctamente para ganar $200 (o $300 con el avatar Cerebrito). Falla y no ganas nada." },
                { icon: "⚔️", title: "Sabotaje", text: "Elige un rival para retarlo. Si falla la trivia, te paga $300. Si la responde, no pasa nada." },
                { icon: "🃏", title: "Cartas UNO", text: "Al caer en casillas azules, obtienes una carta especial. Úsalas estratégicamente desde el botón 'VER MIS CARTAS'." },
                { icon: "💀", title: "Bancarrota", text: "Si tu dinero llega a $0 o menos, quedas eliminado y tus propiedades pasan al acreedor." },
                { icon: "🏆", title: "Victoria", text: "En modo Supervivencia: sé el último en pie. En modo Meta: llega primero a la cantidad establecida." },
              ].map((item, i) => (
                <div key={i} className="glass-panel rounded-2xl p-4 flex gap-4 items-start border border-white/10">
                  <span className="text-3xl shrink-0">{item.icon}</span>
                  <div><p className="font-black">{item.title}</p><p className="text-sm opacity-70 mt-1">{item.text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== LOBBY ===== */}
      {view === 'lobby' && (
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className="glass-panel rounded-none border-0 border-b px-4 py-3 flex items-center justify-between shrink-0">
            <button onClick={() => btnClick(() => setView('menu'))} className="inner-module px-4 py-2 rounded-xl font-black text-sm border hover:brightness-110 transition-all">← VOLVER</button>
            <h2 className="font-black text-lg uppercase">🎮 Lobby</h2>
            <button onClick={startGame} className="bg-emerald-500 hover:bg-emerald-400 text-white font-black px-5 py-2 rounded-xl text-sm shadow-[0_3px_0_#047857] active:translate-y-[3px] active:shadow-none transition-all">
              ¡JUGAR! 🎲
            </button>
          </div>
          <div className="flex-grow overflow-y-auto p-4 no-scrollbar">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {/* Configuración de partida */}
              <div className="glass-panel rounded-2xl p-4 border border-white/10">
                <h3 className="font-black text-sm uppercase opacity-70 mb-3">Configuración de Partida</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold opacity-60 block mb-1">Meta de Victoria</label>
                    <select value={winGoal} onChange={e => { sfx.click(); setWinGoal(e.target.value); }} className="w-full inner-module rounded-xl px-3 py-2 font-bold text-sm border border-white/20 outline-none" style={{ background: 'var(--accent-color)', color: 'var(--text-color)' }}>
                      <option value="survival">Supervivencia</option>
                      <option value="3000">Meta: $3,000</option>
                      <option value="5000">Meta: $5,000</option>
                      <option value="8000">Meta: $8,000</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60 block mb-1">Modo de Juego</label>
                    <select value={gameMode} onChange={e => { sfx.click(); setGameMode(e.target.value); }} className="w-full inner-module rounded-xl px-3 py-2 font-bold text-sm border border-white/20 outline-none" style={{ background: 'var(--accent-color)', color: 'var(--text-color)' }}>
                      <option value="classic">Clásico</option>
                      <option value="fast">Rápido (+$1000)</option>
                      <option value="peace">Pacifista (sin ataques)</option>
                      <option value="chaos">Caos (eventos aleatorios)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Jugadores */}
              {lobbyPlayers.map((lp, i) => {
                const avatarData = AVATAR_SHOP.find(a => a.id === lp.avatarId) || AVATAR_SHOP[0];
                const avail = getAvailableItems();
                return (
                  <div key={lp.id} className={`glass-panel rounded-2xl p-4 border ${lp.color.replace('bg-', 'border-').replace('-500', '-500/50').replace('-400', '-400/50')}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 ${lp.color} rounded-xl flex items-center justify-center text-2xl shrink-0`}>{avatarData.icon}</div>
                      <div className="flex-grow">
                        {lp.type === 'humano' ? (
                          <input value={lp.name} onChange={e => updateLobbyPlayer(lp.id, 'name', e.target.value)} className="font-black text-base bg-transparent border-b border-white/30 outline-none w-full" maxLength={12} />
                        ) : (
                          <input value={lp.name} onChange={e => updateLobbyPlayer(lp.id, 'name', e.target.value)} className="font-black text-base bg-transparent border-b border-white/30 outline-none w-full" maxLength={12} />
                        )}
                        <p className="text-xs opacity-60 mt-0.5">{lp.type === 'humano' ? '👤 Humano' : `🤖 Bot — ${lp.difficulty}`}</p>
                      </div>
                      {i > 0 && (
                        <div className="flex gap-1">
                          {['humano','bot'].map(t => (
                            <button key={t} onClick={() => updateLobbyPlayer(lp.id, 'type', t)} className={`px-2 py-1 rounded-lg font-bold text-xs transition-all border ${lp.type === t ? 'bg-indigo-500 text-white border-indigo-400' : 'inner-module border-white/20'}`}>{t === 'humano' ? '👤' : '🤖'}</button>
                          ))}
                          <button onClick={() => removePlayer(lp.id)} className="px-2 py-1 rounded-lg font-bold text-xs bg-rose-500/20 border border-rose-500/30 text-rose-500 hover:bg-rose-500/40 transition-all">✕</button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <label className="text-xs font-bold opacity-60 block mb-1">Avatar</label>
                        <select value={lp.avatarId} onChange={e => updateLobbyPlayer(lp.id, 'avatarId', e.target.value)} className="w-full inner-module rounded-lg px-2 py-1.5 font-bold text-xs border border-white/20 outline-none" style={{ background: 'var(--accent-color)', color: 'var(--text-color)' }}>
                          {AVATAR_SHOP.filter(a => lp.type === 'bot' || unlockedAvatars.includes(a.id)).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold opacity-60 block mb-1">Color</label>
                        <div className="flex gap-1 flex-wrap">
                          {PALETTE.slice(0, 4).map(c => <button key={c} onClick={() => updateLobbyPlayer(lp.id, 'color', c)} className={`w-6 h-6 rounded-full ${c} border-2 ${lp.color === c ? 'border-white' : 'border-transparent'} transition-all`} />)}
                        </div>
                      </div>
                      {lp.type === 'bot' && (
                        <div>
                          <label className="text-xs font-bold opacity-60 block mb-1">Dificultad</label>
                          <select value={lp.difficulty} onChange={e => updateLobbyPlayer(lp.id, 'difficulty', e.target.value)} className="w-full inner-module rounded-lg px-2 py-1.5 font-bold text-xs border border-white/20 outline-none" style={{ background: 'var(--accent-color)', color: 'var(--text-color)' }}>
                            <option value="facil">Fácil</option>
                            <option value="normal">Normal</option>
                            <option value="dificil">Difícil</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {/* Ítems */}
                    <div>
                      <label className="text-xs font-bold opacity-60 block mb-2">Ítems para la partida</label>
                      <div className="flex gap-2 flex-wrap">
                        {ITEM_SHOP.map(it => {
                          const assigned = (lp.items as any)[it.id] || 0; const available = (avail as any)[it.id] || 0;
                          return (
                            <div key={it.id} className="flex items-center gap-1 inner-module rounded-lg px-2 py-1 border border-white/10">
                              <span className="text-sm">{it.icon}</span>
                              <span className="text-xs font-bold">{assigned}</span>
                              <div className="flex flex-col gap-0.5">
                                <button onClick={() => assignItemToPlayer(lp.id, it.id, true)} disabled={available <= 0} className="text-xs leading-none opacity-70 hover:opacity-100 disabled:opacity-20">▲</button>
                                <button onClick={() => assignItemToPlayer(lp.id, it.id, false)} disabled={assigned <= 0} className="text-xs leading-none opacity-70 hover:opacity-100 disabled:opacity-20">▼</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {lobbyPlayers.length < 4 && (
                <button onClick={addPlayer} className="w-full py-4 inner-module rounded-2xl font-black text-sm border border-dashed border-white/30 hover:border-white/60 transition-all">
                  + AGREGAR JUGADOR
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== JUEGO ===== */}
      {view === 'game' && (
        <div className={`w-full h-full relative ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
          <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }`}</style>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

          {/* Controles de cámara */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
            <button onClick={() => rotateCamera(-1)} className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center font-black border border-white/20 hover:bg-black/10 active:scale-95 transition-all">◀</button>
            <button onClick={() => { sfx.click(); setIs3D(v => !v); }} className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center font-black border border-white/20 hover:bg-black/10 active:scale-95 transition-all text-xs">{is3D ? '2D' : '3D'}</button>
            <button onClick={() => rotateCamera(1)} className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center font-black border border-white/20 hover:bg-black/10 active:scale-95 transition-all">▶</button>
          </div>

          {/* HUD superior: jugadores */}
          <div className="absolute top-0 left-0 w-full z-30 flex justify-between items-start p-2 sm:p-3 pointer-events-none">
            <div className="flex gap-2 overflow-x-auto no-scrollbar mask-linear-right pointer-events-auto">
              {players.map((p, i) => {
                const isTurn = turn === i; const playerColorStr = p.bg.split('-')[1];
                return (
                  <div key={p.id} className={`flex items-center gap-3 p-2 px-3 rounded-2xl shrink-0 transition-all duration-300 ${isTurn ? `bg-gradient-to-r from-${playerColorStr}-500 to-${playerColorStr}-600 text-white shadow-lg scale-105 border-2 border-white/20 turn-glow` : 'glass-panel opacity-90 border hover:opacity-100'} ${!p.alive ? 'opacity-30 grayscale scale-95' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 ${isTurn ? 'bg-black/20' : p.bg}`}>{p.icon}</div>
                    <div className="flex flex-col pr-1">
                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${isTurn ? 'text-white/80' : 'opacity-70'}`}>{p.name}</span>
                      <span className={`text-sm sm:text-base font-black leading-none mt-0.5 ${isTurn ? 'text-white' : 'text-emerald-500'}`}>${p.money}</span>
                    </div>
                    <div className="flex flex-col gap-1 pl-2 border-l border-current opacity-60">
                      <span className="text-[10px] font-bold leading-none">🏠 {getPlayerPropsCount(p.id)}</span>
                      <span className="text-[10px] font-bold leading-none">🃏 {p.cards ? p.cards.length : 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 pointer-events-auto shrink-0 mt-1 items-end max-w-[40vw]">
              <div className="glass-panel font-black px-3 py-1.5 rounded-xl text-[10px] text-amber-500 border border-amber-500/30 shadow-md flex items-center gap-2">
                {winGoal === 'survival' ? 'SUPERVIVENCIA' : `META: $${winGoal}`}
                <span className="pl-2 border-l border-amber-500/30 uppercase text-blue-400">{gameMode}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { sfx.click(); focusOnPlayer(turn); }} className="glass-panel font-black px-3 py-2 rounded-xl text-[10px] sm:text-xs uppercase shadow-md transition-transform active:scale-95 flex items-center justify-center border border-white/20 hover:bg-black/10">🎯 ENFOCAR</button>
                <button onClick={() => { sfx.click(); setShowSettingsModal(true); }} className="glass-panel font-black px-3 py-2 rounded-xl text-[10px] sm:text-xs uppercase shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 border border-white/20 hover:bg-black/10">⚙️ OPCIONES</button>
              </div>
            </div>
          </div>

          {/* Controles de turno (inferior derecha) */}
          <div className="absolute bottom-6 right-4 sm:right-8 z-30 flex flex-col items-end gap-3 pointer-events-none">
            {cp && !dice && !activeEvent && !animeAction && !rollingDice && !showSettingsModal && (
              <div className="flex flex-col items-end gap-3 pointer-events-auto">
                {!cp.isBot && cp.id === 0 && <div className="bg-amber-400 text-amber-950 font-black text-sm px-4 py-1.5 rounded-lg shadow-lg border border-amber-300 uppercase tracking-widest animate-pulse mb-1">¡ES TU TURNO!</div>}
                {!cp.isBot && (
                  <div className="flex flex-col gap-2 items-end">
                    {cp.cards && cp.cards.length > 0 && !showCards && <button onClick={() => { sfx.click(); setShowCards(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-3 rounded-2xl shadow-[0_4px_0_#4338ca] active:translate-y-[4px] active:shadow-none text-sm flex items-center justify-center gap-2 border border-indigo-400 transition-all">🃏 VER MIS CARTAS <span className="bg-white/20 px-2 py-0.5 rounded-lg">{cp.cards.length}</span></button>}
                    {cp.items && cp.items['it3'] > 0 && <button onClick={() => { sfx.click(); setActiveEvent({ type: 'cheat_dice' }); }} className="bg-purple-600 hover:bg-purple-500 text-white font-black px-4 py-2.5 rounded-xl shadow-[0_4px_0_#7e22ce] active:translate-y-[4px] active:shadow-none text-xs flex items-center justify-center gap-2 border border-purple-400 transition-all">🎲 USAR DADO ({cp.items['it3']})</button>}
                    {cp.items && cp.items['it4'] > 0 && <button onClick={useGoldBag} className="bg-amber-500 hover:bg-amber-400 text-white font-black px-4 py-2.5 rounded-xl shadow-[0_4px_0_#b45309] active:translate-y-[4px] active:shadow-none text-xs flex items-center justify-center gap-2 border border-amber-300 transition-all">💰 +$200 ({cp.items['it4']})</button>}
                  </div>
                )}
                <div className="flex flex-row-reverse items-center gap-4 mt-2">
                  {!cp.isBot ? (
                    <button onClick={() => rollDiceAction(turn)} className="relative group cursor-pointer outline-none">
                      <div className="w-20 h-20 sm:w-28 sm:h-28 bg-emerald-500 hover:bg-emerald-400 rounded-3xl flex flex-col items-center justify-center shadow-[0_8px_0_#047857,0_15px_20px_rgba(0,0,0,0.3)] transform transition-all group-active:translate-y-2 group-active:shadow-[0_0px_0_#047857] border-t border-emerald-300">
                        <span className="text-4xl sm:text-5xl group-hover:rotate-12 transition-transform">🎲</span>
                        <span className="text-white font-black text-xs uppercase mt-1 tracking-widest">Tirar</span>
                      </div>
                    </button>
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-28 glass-panel rounded-3xl flex flex-col items-center justify-center shadow-lg border opacity-90">
                      <span className="text-[10px] font-bold opacity-70 uppercase mb-1">Turno Bot</span>
                      <span className="text-4xl animate-pulse">🤖</span>
                    </div>
                  )}
                  <div className={`text-5xl sm:text-7xl drop-shadow-2xl ${avatarThrowing ? 'anim-throw' : ''} transition-transform p-3 rounded-full backdrop-blur-md border ${cp.bg} ${theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-black/5 border-black/10'}`}>{cp.icon}</div>
                </div>
              </div>
            )}
          </div>

          {/* Dado animado */}
          {(dice || rollingDice) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className={`w-28 h-28 sm:w-40 sm:h-40 bg-white rounded-[2rem] flex items-center justify-center text-7xl sm:text-8xl font-black text-indigo-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[6px] border-indigo-100 ${rollingDice ? 'animate-spin' : 'pop-in'}`}>{dice}</div>
            </div>
          )}

          {/* Modal de ajustes en juego */}
          {showSettingsModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-end p-4 sm:p-6 bg-black/40 backdrop-blur-sm pop-in pointer-events-auto">
              <div className="glass-panel rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl h-full max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase">⚙️ Ajustes</h2>
                  <button onClick={() => { sfx.click(); setShowSettingsModal(false); }} className="w-10 h-10 rounded-full border flex items-center justify-center inner-module hover:brightness-110">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar pb-6">
                  <SettingsPanel isOverlay={true} />
                </div>
                <div className="pt-4 border-t border-white/10">
                  <button onClick={() => { sfx.click(); setShowSettingsModal(false); setShowExitConfirm(true); }} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-[0_4px_0_#9f1239] active:translate-y-[4px] active:shadow-none transition-all">SALIR DE LA PARTIDA</button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmación de salida */}
          {showExitConfirm && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md pop-in pointer-events-auto">
              <div className="glass-panel rounded-[2rem] p-6 sm:p-10 max-w-sm w-full text-center shadow-2xl">
                <div className="text-6xl mb-4 drop-shadow-lg">🚪</div>
                <h2 className="text-3xl font-black mb-2">¿Abandonar?</h2>
                <p className="opacity-70 font-medium mb-8 text-sm">Perderás el progreso de la partida y no habrá recompensa.</p>
                <div className="flex gap-3">
                  <button onClick={() => { sfx.click(); setShowExitConfirm(false); }} className="flex-1 py-4 font-black rounded-xl transition-colors inner-module hover:brightness-110">CANCELAR</button>
                  <button onClick={confirmQuitGame} className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-[0_4px_0_#9f1239] active:translate-y-[4px] active:shadow-none transition-all">SÍ, SALIR</button>
                </div>
              </div>
            </div>
          )}

          {/* Panel de eventos (bottom sheet) */}
          <div className={`fixed bottom-0 left-0 w-full flex justify-center z-40 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${activeEvent && !animeAction && !showCards && !showExitConfirm && !showSettingsModal ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            <div className={`w-full max-w-md rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t p-5 sm:p-8 flex flex-col max-h-[70vh] overflow-y-auto no-scrollbar pointer-events-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="w-14 h-1.5 bg-slate-400/50 rounded-full mx-auto mb-6 shrink-0"></div>

              {activeEvent && activeEvent.type === 'cheat_dice' && (
                <div className="text-center">
                  <h2 className="text-3xl font-black mb-2">DADO TRUCADO 🎲</h2>
                  <p className="opacity-70 mb-6 font-medium">Elige el número exacto que quieres avanzar.</p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1,2,3,4,5,6].map(n => (
                      <button key={n} onClick={() => rollDiceAction(turn, n)} className="py-4 sm:py-5 bg-indigo-500/10 border-2 border-indigo-500/30 hover:bg-indigo-500 hover:text-white rounded-2xl text-2xl font-black text-indigo-500 transition-all shadow-md">{n}</button>
                    ))}
                  </div>
                  <button onClick={() => { sfx.click(); setActiveEvent(null); }} className="opacity-50 font-bold hover:opacity-100 w-full py-2 uppercase tracking-widest transition-opacity">Cancelar</button>
                </div>
              )}

              {activeEvent && activeEvent.type === 'info' && (
                <div className="text-center pb-2">
                  <h2 className="text-2xl sm:text-3xl font-black mb-3 uppercase italic drop-shadow-sm">{activeEvent.title}</h2>
                  <p className="opacity-80 font-medium mb-8 text-base sm:text-lg">{activeEvent.text}</p>
                  <button onClick={() => { sfx.click(); activeEvent.onOk(); }} className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-lg rounded-2xl shadow-[0_5px_0_#3730a3] active:translate-y-[5px] active:shadow-none transition-all">ENTENDIDO</button>
                </div>
              )}

              {activeEvent && activeEvent.type === 'buy' && (
                <div className="text-center pb-2">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <span className={`w-16 h-16 ${activeEvent.space.color} text-white flex items-center justify-center rounded-2xl text-4xl shadow-md border-b-4 border-black/20`}>{activeEvent.space.icon}</span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase leading-tight drop-shadow-sm">{activeEvent.space.name}</h2>
                  </div>
                  <p className="opacity-70 mb-6 text-sm font-medium">¿Comprar los derechos de esta materia para cobrar regalías?</p>
                  <div className="p-4 rounded-2xl mb-6 border flex justify-between items-center shadow-inner inner-module">
                    <span className="font-bold opacity-80">Precio de Edición:</span>
                    <span className="font-black text-indigo-500 text-3xl">${activeEvent.space.price}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => {
                      sfx.coin();
                      setProperties(prop => ({ ...prop, [cp.pos]: cp.id }));
                      setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[turn].money -= activeEvent.space.price; return newP; });
                      narrate("Compra exitosa.");
                      setActiveEvent({ type: 'info', title: "¡Compra Exitosa!", text: `Adquiriste "${activeEvent.space.name}".`, onOk: handleNextTurn });
                    }} className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none text-base transition-all">COMPRAR</button>
                    <button onClick={() => { sfx.click(); handleNextTurn(); }} className="flex-1 py-4 font-black rounded-2xl active:translate-y-[5px] active:shadow-none text-base transition-all inner-module shadow-sm hover:brightness-110">PASAR</button>
                  </div>
                </div>
              )}

              {activeEvent && activeEvent.type === 'upgrade_prop' && (
                <div className="text-center pb-2">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <span className={`w-16 h-16 ${activeEvent.space.color} text-white flex items-center justify-center rounded-2xl text-4xl shadow-md border-b-4 border-black/20`}>⬆️</span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase leading-tight drop-shadow-sm">MEJORAR MATERIA</h2>
                  </div>
                  <p className="opacity-70 mb-4 text-sm font-medium">Mejora la materia para multiplicar el costo de asesoría que pagarán los rivales.</p>
                  <div className="p-4 rounded-2xl mb-6 border flex flex-col shadow-inner inner-module gap-2">
                    <div className="flex justify-between items-center"><span className="font-bold opacity-80">Nivel Actual:</span><span className="font-black text-lg">{activeEvent.level} / 3</span></div>
                    <div className="flex justify-between items-center"><span className="font-bold opacity-80">Costo de Mejora:</span><span className="font-black text-amber-500 text-2xl">${activeEvent.cost}</span></div>
                    <div className="flex justify-between items-center text-xs opacity-70 mt-2 border-t border-white/10 pt-2">
                      <span>Renta Original: ${activeEvent.space.rent * (activeEvent.level + 1)}</span>
                      <span className="
text-emerald-500 font-bold">Renta Nueva: ${activeEvent.space.rent * (activeEvent.level + 2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => {
                      sfx.build();
                      setUpgrades(prev => ({ ...prev, [cp.pos]: activeEvent.level + 1 }));
                      setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[turn].money -= activeEvent.cost; return newP; });
                      narrate("Mejora completada.");
                      setActiveEvent({ type: 'info', title: "¡Mejora Exitosa!", text: `Construiste una mejora en "${activeEvent.space.name}".`, onOk: handleNextTurn });
                    }} className="flex-[2] py-4 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl shadow-[0_5px_0_#b45309] active:translate-y-[5px] active:shadow-none text-base transition-all">CONSTRUIR</button>
                    <button onClick={() => { sfx.click(); handleNextTurn(); }} className="flex-1 py-4 font-black rounded-2xl active:translate-y-[5px] active:shadow-none text-base transition-all inner-module shadow-sm hover:brightness-110">PASAR</button>
                  </div>
                </div>
              )}

              {activeEvent && activeEvent.type === 'quiz' && (
                <div className="w-full pb-2">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-indigo-500 font-black text-xs tracking-widest uppercase bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/30 shadow-sm">📚 {activeEvent.q.tipo}</span>
                    {activeEvent.isAttack && <span className="text-red-500 font-black text-xs animate-pulse bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30 shadow-sm">⚔️ DEFENSA ACTIVA</span>}
                  </div>
                  <p className="font-black text-lg sm:text-xl mb-6 leading-snug">{activeEvent.q.q}</p>
                  {!activeEvent.isAttack && cp && cp.items && cp.items['it1'] > 0 && !activeEvent.usedHint && (
                    <button onClick={() => {
                      sfx.click();
                      const wrongOptions = activeEvent.q.options.filter((o: string) => o !== activeEvent.q.a && (!(activeEvent.q.hiddenOptionsDefault || []).includes(o)));
                      const toRemove = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);
                      setPlayers(prev => { const newP = prev.map(p => ({ ...p, items: { ...p.items } })); newP[turn].items['it1'] -= 1; return newP; });
                      setActiveEvent((m: any) => ({ ...m, usedHint: true, hiddenOptions: [...(m.q.hiddenOptionsDefault || []), ...toRemove] }));
                    }} className="mb-4 w-full bg-amber-500/10 text-amber-600 font-black text-sm py-3 rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-colors active:scale-95 shadow-sm">
                      <span className="text-xl">🧹</span> Usar Goma Borradora ({cp.items['it1']})
                    </button>
                  )}
                  <div className="space-y-3">
                    {activeEvent.q.options.map((opt: string, i: number) => {
                      const isHidden = (activeEvent.hiddenOptions && activeEvent.hiddenOptions.includes(opt)) || (!activeEvent.usedHint && activeEvent.q.hiddenOptionsDefault && activeEvent.q.hiddenOptionsDefault.includes(opt));
                      if (isHidden) return null;
                      return (
                        <button key={i} onClick={() => {
                          const isRight = opt === activeEvent.q.a;
                          if (activeEvent.isAttack) {
                            if (isRight) {
                              sfx.correct(); narrate("Defensa perfecta.", true);
                              setActiveEvent({ type: 'info', title: "Defensa Perfecta", text: "Bloqueaste el daño.", onOk: handleNextTurn });
                            } else {
                              sfx.wrong();
                              const attAvatar = players[activeEvent.attacker].avatarId;
                              const damage = attAvatar === 'av4' ? 350 : 300;
                              let isBankrupt = false;
                              setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[turn].money -= damage; newP[activeEvent.attacker].money += damage; if (newP[turn].money <= 0) isBankrupt = true; return newP; });
                              setShake(true); setTimeout(() => setShake(false), 500);
                              narrate(`Te han robado ${damage} dólares.`, true);
                              if (isBankrupt) { setTimeout(() => setPlayers(prev => handleBankruptcy(turn, activeEvent.attacker, prev)), 100); }
                              else { setActiveEvent({ type: 'info', title: "Sabotaje Recibido", text: `Fallaste. Era: "${activeEvent.q.a}". Pierdes $${damage}.`, onOk: handleNextTurn }); }
                            }
                          } else {
                            if (isRight) {
                              sfx.correct();
                              const reward = cp && cp.avatarId === 'av6' ? 300 : 200;
                              setPlayers(prev => { const newP = prev.map(p => ({ ...p })); newP[turn].money += reward; return newP; });
                              narrate("Respuesta correcta.", true);
                              setActiveEvent({ type: 'info', title: "¡Correcto! ✅", text: `Ganaste $${reward}.`, onOk: handleNextTurn });
                            } else {
                              sfx.wrong(); narrate("Incorrecto.", true);
                              setActiveEvent({ type: 'info', title: "Incorrecto ❌", text: `Era: "${activeEvent.q.a}".`, onOk: handleNextTurn });
                            }
                          }
                        }} className="w-full p-4 border rounded-2xl font-bold text-sm sm:text-base transition-all text-left flex items-center gap-3 shadow-sm active:scale-[0.98] hover:border-indigo-400 inner-module hover:brightness-110">
                          <span className="bg-black/10 w-8 h-8 rounded-full flex items-center justify-center text-xs opacity-80 font-black shrink-0 border border-black/10 shadow-inner">{['A','B','C','D'][i]}</span>
                          <span className="leading-tight">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeEvent && activeEvent.type === 'select_target' && (
                <div className="text-center pb-2">
                  <h2 className="text-3xl font-black text-red-500 mb-2 italic uppercase drop-shadow-sm">SABOTAJE ⚔️</h2>
                  <p className="opacity-70 mb-6 font-medium text-sm">Elige a un rival para robarle ${cp && cp.avatarId === 'av4' ? '350' : '300'}.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {players.map((p, i) => i !== turn && p.alive && (
                      <button key={p.id} onClick={() => triggerAnimeBattle(turn, i, players)} className={`py-4 rounded-2xl font-black text-white ${p.bg} shadow-md flex flex-col items-center justify-center gap-2 active:scale-95 border-b-4 border-black/20 transition-transform`}>
                        <span className="text-4xl mb-1 drop-shadow-md">{p.icon}</span>
                        <span className="text-xs uppercase tracking-widest">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeEvent && activeEvent.type === 'gameover' && (
                <div className="text-center pb-2">
                  <div className="text-7xl mb-4 animate-bounce drop-shadow-[0_5px_15px_rgba(250,204,21,0.6)]">{activeEvent.win ? '🏆' : '💀'}</div>
                  <h2 className={`text-3xl font-black mb-2 uppercase italic ${activeEvent.win ? 'text-emerald-500 drop-shadow-sm' : ''}`}>{activeEvent.win ? `¡${activeEvent.winnerName} GANÓ!` : 'FIN DEL JUEGO'}</h2>
                  {activeEvent.win && winGoal === 'survival' ? (
                    <p className="opacity-80 font-bold mb-8 text-sm">Al sobrevivir te quedas con todo tu imperio.<br/><span className="text-amber-500 text-xl mt-2 block">RECOMPENSA GLOBAL: 🪙{activeEvent.reward}</span></p>
                  ) : (
                    <p className="opacity-70 font-bold mb-8 text-base">Recompensa Global: <span className="text-amber-500">🪙 {activeEvent.reward}</span></p>
                  )}
                  <button onClick={() => { sfx.click(); setView('menu'); }} className="w-full py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-black text-lg rounded-2xl shadow-[0_5px_0_#3730a3] active:translate-y-[5px] active:shadow-none transition-all">VOLVER AL MENÚ</button>
                </div>
              )}
            </div>
          </div>

          {/* Panel de cartas */}
          <div className={`fixed bottom-0 left-0 w-full flex justify-center z-50 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto ${showCards && !showExitConfirm && !showSettingsModal ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            <div className="w-full bg-slate-900/95 backdrop-blur-xl rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.6)] border-t border-slate-700 p-5 sm:p-8 flex flex-col h-[70vh]">
              <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto w-full shrink-0">
                <h3 className="text-white font-black text-2xl sm:text-3xl uppercase tracking-widest">Cartas Mágicas</h3>
                <button onClick={() => { sfx.click(); setShowCards(false); }} className="text-slate-300 font-bold hover:text-white bg-slate-800 px-4 py-2 rounded-xl text-xs transition-colors border border-slate-600 shadow-md">CERRAR ✕</button>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-8 pt-4 px-4 no-scrollbar items-center max-w-6xl mx-auto w-full h-full">
                {cp && cp.cards && cp.cards.length === 0 && <p className="text-slate-500 font-bold w-full text-center italic">No tienes cartas en la mano.</p>}
                {cp && cp.cards && cp.cards.map((c: any, idx: number) => (
                  <div key={idx} className={`uno-card min-w-[220px] w-[220px] h-[340px] rounded-2xl relative group shrink-0 ${c.color} p-2 flex flex-col hover:scale-105 hover:-translate-y-4`} style={{ animation: `pop-in 0.3s ease-out forwards`, animationDelay: `${idx * 0.1}s` }}>
                    <div className="uno-card-inner absolute inset-4 rounded-[100px] pointer-events-none"></div>
                    <div className="absolute top-4 left-4 flex flex-col items-center"><span className="text-xl drop-shadow-md text-white">{c.icon}</span></div>
                    <div className="absolute bottom-4 right-4 flex flex-col items-center rotate-180"><span className="text-xl drop-shadow-md text-white">{c.icon}</span></div>
                    <div className="flex-grow flex flex-col items-center justify-center z-10 px-4">
                      <span className="text-7xl mb-4 drop-shadow-xl bg-white/20 p-4 rounded-full border border-white/30 backdrop-blur-sm">{c.icon}</span>
                      <h4 className="text-white font-black text-2xl uppercase text-center mb-2 leading-tight drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{c.name}</h4>
                      <p className="text-white/90 text-xs font-bold text-center leading-tight bg-black/20 p-2 rounded-xl border border-black/10 backdrop-blur-sm">{c.desc}</p>
                    </div>
                    <div className="absolute inset-0 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 z-20">
                      {(c.type === 'salta' || c.type === 'toma_2') && gameMode !== 'peace' ? (
                        <div className="w-full">
                          <p className="text-xs font-black text-white mb-3 text-center uppercase tracking-widest text-emerald-400">Objetivo:</p>
                          <div className="flex flex-col gap-2 w-full">
                            {players.filter(p => p.id !== turn && p.alive).map(p => (
                              <button key={p.id} onClick={() => playCard(idx, turn, p.id)} className={`bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-3 rounded-xl w-full border border-slate-600 transition-colors shadow-lg flex items-center justify-center gap-3 border-l-4 ${p.bg.replace('bg-', 'border-')}`}>
                                <span className="drop-shadow-sm text-xl">{p.icon}</span> {p.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => playCard(idx, turn)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-xl text-lg uppercase transition-colors shadow-[0_5px_0_#047857] active:translate-y-[5px] active:shadow-none">USAR CARTA</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Animación de batalla */}
          {animeAction && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-slate-900/80 backdrop-blur-md pointer-events-auto">
              <div className="absolute inset-0 anime-speed-lines opacity-50"></div>
              {animeAction.phase === 'intro' && (
                <div className="relative z-10 flex w-full justify-between items-center px-4 sm:px-16 h-full">
                  <div className="flex flex-col items-center transform -translate-x-full animate-[slideInLeft_0.4s_forwards]">
                    <div className={`text-6xl sm:text-[120px] drop-shadow-[0_0_60px_rgba(239,68,68,0.8)] ${players[animeAction.a].bg} rounded-full p-6 sm:p-10 border-8 border-white`}>{players[animeAction.a].icon}</div>
                    <span className="mt-4 bg-red-600 text-white font-black px-6 py-2 rounded-xl text-xl uppercase tracking-widest border-2 border-white shadow-xl">Atacante</span>
                  </div>
                  <div className="text-yellow-400 font-black text-6xl sm:text-8xl italic drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-20 animate-[pop-in_0.4s_0.2s_forwards] opacity-0 scale-0">VS</div>
                  <div className="flex flex-col items-center transform translate-x-full animate-[slideInRight_0.4s_forwards]">
                    <div className={`text-6xl sm:text-[120px] drop-shadow-[0_0_60px_rgba(59,130,246,0.8)] ${players[animeAction.d].bg} rounded-full p-6 sm:p-10 border-8 border-white`}>{players[animeAction.d].icon}</div>
                    <span className="mt-4 bg-blue-600 text-white font-black px-6 py-2 rounded-xl text-xl uppercase tracking-widest border-2 border-white shadow-xl">Defensor</span>
                  </div>
                </div>
              )}
              {animeAction.phase === 'blocked' && (
                <div className="relative z-10 flex flex-col items-center justify-center h-full animate-[pop-in_0.3s_forwards]">
                  <div className="text-[150px] drop-shadow-[0_0_80px_rgba(52,211,153,0.8)]">🛡️</div>
                  <h1 className="text-emerald-500 font-black text-5xl sm:text-7xl mt-6 uppercase italic text-center bg-white px-10 py-5 rounded-[2rem] border-4 border-emerald-300 shadow-2xl">¡REBOTADO!</h1>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
