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
  // Bloque 1: Ortografía y Acentuación
  { q: "¿Qué tipo de palabra es 'canción' según su acento?", options: ["Aguda", "Grave", "Esdrújula", "Sobresdrújula"], a: "Aguda", tipo: "Ortografía" },
  { q: "¿Las palabras esdrújulas siempre llevan tilde?", options: ["Sí, siempre", "No, nunca", "A veces", "Solo en plural"], a: "Sí, siempre", tipo: "Ortografía" },
  { q: "¿Cuál es el antónimo de 'efímero'?", options: ["Eterno o duradero", "Fugaz", "Rápido", "Breve"], a: "Eterno o duradero", tipo: "Habilidad Verbal" },
  { q: "¿Cómo se escribe correctamente para referirse al lugar?", options: ["Allá", "Halla", "Haya", "Aya"], a: "Allá", tipo: "Ortografía" },
  { q: "¿Qué palabra está mal escrita?", options: ["Exibir", "Exhibir", "Egibir", "Todas"], a: "Exibir", tipo: "Ortografía" },
  { q: "¿Cuál es la sílaba tónica en la palabra 'teléfono'?", options: ["Lé", "Te", "Fo", "No"], a: "Lé", tipo: "Ortografía" },
  { q: "¿Qué es un diptongo?", options: ["La unión de dos vocales en una misma sílaba", "La separación de vocales", "La unión de consonantes", "Tres vocales juntas"], a: "La unión de dos vocales en una misma sílaba", tipo: "Ortografía" },
  { q: "Escribe el plural de la palabra 'luz'.", options: ["Luces", "Luzes", "Luses", "Lúz"], a: "Luces", tipo: "Ortografía" },
  { q: "¿Cuál es la forma correcta de expresar que hubo un problema?", options: ["Hubo muchos problemas", "Hubieron muchos problemas", "Habían muchos problemas", "Hay muchos problemas"], a: "Hubo muchos problemas", tipo: "Ortografía" },
  { q: "¿Lleva tilde la palabra 'fue'?", options: ["No, es un monosílabo", "Sí, siempre", "A veces", "Solo en pasado"], a: "No, es un monosílabo", tipo: "Ortografía" },
  
  // Bloque 2: Gramática y Sintaxis
  { q: "¿Cuál es el núcleo del sujeto en: 'El joven programador terminó el código'?", options: ["Programador", "Joven", "El", "Terminó"], a: "Programador", tipo: "Gramática" },
  { q: "¿Qué es un adjetivo?", options: ["Una palabra que describe una característica del sustantivo", "La acción de la oración", "Una palabra que une oraciones", "El nombre de un lugar"], a: "Una palabra que describe una característica del sustantivo", tipo: "Gramática" },
  { q: "En la oración 'María corre rápido', ¿cuál es el adverbio?", options: ["Rápido", "María", "Corre", "Ninguno"], a: "Rápido", tipo: "Gramática" },
  { q: "¿Qué es el predicado?", options: ["Lo que se dice del sujeto", "Quién realiza la acción", "La parte más importante", "Un tipo de verbo"], a: "Lo que se dice del sujeto", tipo: "Gramática" },
  { q: "¿Cómo se llama el verbo que no está conjugado y termina en -ar, -er, -ir?", options: ["Infinitivo", "Gerundio", "Participio", "Imperativo"], a: "Infinitivo", tipo: "Gramática" },
  { q: "¿Cuál es el objeto directo en 'Juan compró un libro'?", options: ["Un libro", "Juan", "Compró", "A Juan"], a: "Un libro", tipo: "Gramática" },
  { q: "¿Qué categoría gramatical es 'y', 'e', 'ni', 'que'?", options: ["Conjunciones", "Preposiciones", "Adverbios", "Artículos"], a: "Conjunciones", tipo: "Gramática" },
  { q: "¿Cuál es el tiempo verbal de 'yo comeré'?", options: ["Futuro simple", "Pasado", "Presente", "Copretérito"], a: "Futuro simple", tipo: "Gramática" },
  { q: "¿Cuál es el sujeto tácito en 'Comimos pizza'?", options: ["Nosotros", "Ellos", "Ustedes", "Yo"], a: "Nosotros", tipo: "Gramática" },
  { q: "¿Qué es una oración simple?", options: ["La que tiene un solo verbo conjugado", "La que tiene varios verbos", "Una sin verbos", "Una pregunta corta"], a: "La que tiene un solo verbo conjugado", tipo: "Gramática" },
  
  // Bloque 3: Comprensión Lectora
  { q: "¿Cuál es la función principal de un texto informativo?", options: ["Transmitir datos o hechos de manera objetiva", "Persuadir al lector", "Contar una historia", "Expresar sentimientos"], a: "Transmitir datos o hechos de manera objetiva", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una paráfrasis?", options: ["Explicar un texto con tus propias palabras", "Copiar un texto exactamente", "Resumir en una sola palabra", "Traducir a otro idioma"], a: "Explicar un texto con tus propias palabras", tipo: "Comprensión Lectora" },
  { q: "¿Cuál es el objetivo de un texto argumentativo?", options: ["Persuadir o convencer al lector", "Dar instrucciones", "Hacer reír", "Informar noticias"], a: "Persuadir o convencer al lector", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una idea principal?", options: ["La información más importante", "Un detalle extra", "La introducción", "La conclusión"], a: "La información más importante", tipo: "Comprensión Lectora" },
  { q: "¿A qué género pertenece una novela?", options: ["Género narrativo", "Género lírico", "Género dramático", "Género periodístico"], a: "Género narrativo", tipo: "Comprensión Lectora" },
  { q: "¿Qué función de la lengua predomina en un poema?", options: ["Poética o estética", "Apelativa", "Referencial", "Fática"], a: "Poética o estética", tipo: "Comprensión Lectora" },
  { q: "¿Qué es un desenlace?", options: ["La parte final donde se resuelve el conflicto", "El inicio de la historia", "El punto de mayor tensión", "El diálogo de los personajes"], a: "La parte final donde se resuelve el conflicto", tipo: "Comprensión Lectora" },
  { q: "¿Qué es la denotación?", options: ["El significado literal y objetivo", "El significado figurado", "Un doble sentido", "Una exageración"], a: "El significado literal y objetivo", tipo: "Habilidad Verbal" },
  { q: "¿Cuál es el sinónimo de 'abundante'?", options: ["Copioso o profuso", "Escaso", "Poco", "Raro"], a: "Copioso o profuso", tipo: "Habilidad Verbal" },
  { q: "¿Qué tipo de palabra es 'árbol'?", options: ["Grave o llana", "Aguda", "Esdrújula", "Sobresdrújula"], a: "Grave o llana", tipo: "Ortografía" },
  
  // Bloque 4: Habilidad Verbal y Vocabulario
  { q: "Completa la analogía: 'Aleta es a pez, como brazo es a...'", options: ["Humano", "Ave", "Gato", "Perro"], a: "Humano", tipo: "Habilidad Verbal" },
  { q: "¿Cuál es el antónimo de 'altruista'?", options: ["Egoísta", "Generoso", "Amable", "Solidario"], a: "Egoísta", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'vasto':", options: ["Extenso / Amplio", "Pequeño", "Corto", "Tosco"], a: "Extenso / Amplio", tipo: "Habilidad Verbal" },
  { q: "¿Qué significa la palabra 'ambiguo'?", options: ["Que puede entenderse de varias formas", "Que es muy claro", "Que es antiguo", "Que es grande"], a: "Que puede entenderse de varias formas", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'guerra':", options: ["Paz", "Batalla", "Conflicto", "Armonía"], a: "Paz", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un homófono?", options: ["Palabras que suenan igual pero se escriben diferente", "Palabras con el mismo significado", "Palabras que se escriben igual", "Palabras opuestas"], a: "Palabras que suenan igual pero se escriben diferente", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un palíndromo?", options: ["Palabra que se lee igual de adelante hacia atrás", "Una palabra antigua", "Un tipo de rima", "Una palabra compuesta"], a: "Palabra que se lee igual de adelante hacia atrás", tipo: "Habilidad Verbal" },
  { q: "¿Cuándo se usa la letra 'H'?", options: ["En palabras que empiezan por hie-, hue-", "En todas las vocales", "Al final de las agudas", "Nunca"], a: "En palabras que empiezan por hie-, hue-", tipo: "Ortografía" },
  { q: "¿Qué acento diferencia palabras que se escriben igual pero significan distinto?", options: ["Acento diacrítico", "Acento ortográfico", "Acento prosódico", "Acento tonal"], a: "Acento diacrítico", tipo: "Ortografía" },
  { q: "¿Qué función cumple la preposición 'de' en 'la casa de madera'?", options: ["Indica pertenencia o material", "Indica tiempo", "Indica lugar", "Es una acción"], a: "Indica pertenencia o material", tipo: "Gramática" },
  
  // Bloque 5: Literatura y Cultura Lingüística
  { q: "¿Quién escribió 'Don Quijote de la Mancha'?", options: ["Miguel de Cervantes", "García Márquez", "Octavio Paz", "William Shakespeare"], a: "Miguel de Cervantes", tipo: "Literatura" },
  { q: "¿Qué es un verso?", options: ["Cada una de las líneas de un poema", "Un conjunto de poemas", "Un cuento corto", "El título de la obra"], a: "Cada una de las líneas de un poema", tipo: "Literatura" },
  { q: "¿Qué es una hipérbole?", options: ["Una exageración", "Una comparación", "Un sonido", "Una mentira"], a: "Una exageración", tipo: "Literatura" },
  { q: "¿Cuál es el tema principal de una tragedia?", options: ["El destino fatal y el sufrimiento", "El amor feliz", "La comedia", "La aventura épica"], a: "El destino fatal y el sufrimiento", tipo: "Literatura" },
  { q: "¿Qué es una moraleja?", options: ["Enseñanza que se extrae de una fábula", "El final de un poema", "Un chiste", "Un tipo de rima"], a: "Enseñanza que se extrae de una fábula", tipo: "Literatura" },
  { q: "¿A qué se refiere el 'clímax' en una historia?", options: ["Al punto de mayor tensión", "Al inicio", "A la presentación de personajes", "Al final feliz"], a: "Al punto de mayor tensión", tipo: "Literatura" },
  { q: "¿Quién es el autor de '1984'?", options: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "Isaac Asimov"], a: "George Orwell", tipo: "Literatura" },
  { q: "En 'Fahrenheit 451', ¿a qué temperatura arden los libros?", options: ["451 grados", "100 grados", "1000 grados", "500 grados"], a: "451 grados", tipo: "Literatura" },
  { q: "¿Quién escribió 'Cien años de soledad'?", options: ["G. García Márquez", "M. Vargas Llosa", "Julio Cortázar", "J.L. Borges"], a: "G. García Márquez", tipo: "Literatura" },
  { q: "¿Quién es el autor de 'El Cuervo'?", options: ["Edgar Allan Poe", "H.P. Lovecraft", "Mary Shelley", "Bram Stoker"], a: "Edgar Allan Poe", tipo: "Literatura" },
];

const AVATAR_SHOP = [
  { id: 'av1', name: "Lector", icon: "📖", price: 0, ability: "Sin habilidad especial." },
  { id: 'av2', name: "Mago", icon: "🧙‍♂️", price: 0, ability: "Inmune a la cárcel de Azkaban." },
];

const TOKEN_SHOP = [
  { id: 'tk1', name: "Peón", icon: "♟️", type: "pawn", price: 0 },
  { id: 'tk2', name: "Corona", icon: "👑", type: "pawn", price: 0 },
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
              onClick={() => { sfx.magic(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
              className="w-full px-8 py-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-bold"
              style={{ color: '#10b981' }}
            >
              🎮 Jugar Ahora
            </button>
            <button 
              onClick={() => { sfx.click(); }}
              className="w-full px-8 py-3 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all font-bold opacity-70 hover:opacity-100"
            >
              📖 Ver Preguntas
            </button>
          </div>

          <p className="text-xs opacity-50 mt-8">
            Proyecto educativo - Versión 1.0
          </p>
        </div>
      </div>
    </div>
  );
}
