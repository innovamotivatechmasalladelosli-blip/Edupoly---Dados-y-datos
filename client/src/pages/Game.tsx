import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Dice5, 
  User, 
  Coins, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  GraduationCap
} from "lucide-react";

//======================================================================
//CONFIGURACIÓN GLOBAL (Volúmenes y Voz)
//======================================================================
(window as any).__gameConfig = {
  musicVol: 0.4,
  sfxVol: 0.6,
  voiceVol: 0.8,
  voiceEnabled: false,
  isMuted: false
};

//======================================================================
//MOTOR DE AUDIO Y MÚSICA GENERATIVA
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
    osc.type = type as any;
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
  turn: () => { playTone(500, 'sine', 0.1, 0.1); setTimeout(() => playTone(750, 'sine', 0.2, 0.1), 100); },
  magic: () => { playTone(880, 'sine', 0.1, 0.1); setTimeout(() => playTone(1108, 'sine', 0.1, 0.1), 100); setTimeout(() => playTone(1318, 'sine', 0.4, 0.1), 200); }
};

// MUSIC ENGINE
const musicEngine = {
  interval: null as any, step: 0, currentMode: null as any,
  play: function(mode: string) {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    clearInterval(this.interval); this.step = 0;
    if (mode === 'menu') {
      const scale = [220, 261.63, 329.63, 392.00, 440, 392.00, 329.63, 261.63];
      this.interval = setInterval(() => {
        const v = (window as any).__gameConfig.musicVol;
        if (!(window as any).__gameConfig.isMuted && audioCtx && v > 0) playTone(scale[this.step % scale.length], 'sine', 1.5, 0.05 * v);
        this.step++;
      }, 800);
    } else if (mode === 'game') {
      const bass = [110, 110, 130.81, 110, 146.83, 130.81, 110, 82.41];
      const lead = [0, 440, 0, 523.25, 659.25, 0, 523.25, 0];
      this.interval = setInterval(() => {
        const v = (window as any).__gameConfig.musicVol;
        if (!(window as any).__gameConfig.isMuted && audioCtx && v > 0) {
          if (bass[this.step % bass.length]) playTone(bass[this.step % bass.length], 'triangle', 0.3, 0.08 * v);
          if (lead[this.step % lead.length]) playTone(lead[this.step % lead.length], 'square', 0.2, 0.03 * v);
        }
        this.step++;
      }, 350);
    }
  },
  stop: function() { clearInterval(this.interval); this.currentMode = null; }
};

//--- ESTILOS GLOBALES ---
const GlobalStyles = ({ theme }: { theme: string }) => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');
    :root {
      --bg-color: ${theme === 'dark' ? '#0f172a' : '#f0fdf4'};
      --text-color: ${theme === 'dark' ? '#f8fafc' : '#1e293b'};
      --panel-bg: ${theme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'};
      --panel-border: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
    }
    body { font-family: 'Nunito', sans-serif; background-color: var(--bg-color); color: var(--text-color); overflow: hidden; margin: 0; padding: 0; }
    @keyframes title-wave { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
    .title-anim { animation: title-wave 4s ease-in-out infinite; }
    .glass-panel { background: var(--panel-bg); backdrop-filter: blur(20px); border: 1px solid var(--panel-border); border-radius: 1rem; padding: 1.5rem; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.5); border-radius: 10px; }
  `}</style>
);

//======================================================================
// BANCO DE PREGUNTAS COMPLETO (100 PREGUNTAS)
//======================================================================
const QUESTION_BANK = [
  // BLOQUE 1: ORTOGRAFÍA Y ACENTUACIÓN
  { q: "¿Qué tipo de palabra es 'canción' según su acento?", options: ["Aguda", "Grave", "Esdrújula", "Sobreesdrújula"], a: "Aguda", tipo: "Ortografía" },
  { q: "¿Las palabras esdrújulas siempre llevan tilde?", options: ["Sí, siempre", "No, nunca", "Solo si terminan en vocal", "Solo si terminan en N o S"], a: "Sí, siempre", tipo: "Ortografía" },
  { q: "¿Cuál es el antónimo de 'efímero'?", options: ["Eterno", "Breve", "Pasajero", "Corto"], a: "Eterno", tipo: "Ortografía" },
  { q: "¿Cómo se escribe correctamente para referirse al lugar?", options: ["Allá", "Halla", "Haya", "Aya"], a: "Allá", tipo: "Ortografía" },
  { q: "¿Qué palabra está mal escrita?", options: ["Exibir", "Exhibir", "Éxito", "Extraño"], a: "Exibir", tipo: "Ortografía" },
  { q: "¿Cuál es la sílaba tónica en la palabra 'teléfono'?", options: ["Lé", "Te", "Fó", "No"], a: "Lé", tipo: "Ortografía" },
  { q: "¿Qué es un diptongo?", options: ["Unión de dos vocales en una sílaba", "Separación de dos vocales", "Unión de dos consonantes", "Acento en la última sílaba"], a: "Unión de dos vocales en una sílaba", tipo: "Ortografía" },
  { q: "Escribe el plural de la palabra 'luz'.", options: ["Luces", "Luzes", "Lucs", "Luzs"], a: "Luces", tipo: "Ortografía" },
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

  // BLOQUE 2: GRAMÁTICA Y SINTAXIS
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
  { q: "Identifica el modo verbal en '¡Cierra la puerta!':", options: ["Imperativo", "Indicativo", "Subjuntivo", "Infinitivo"], a: "Imperativo", tipo: "Gramática" },
  { q: "¿Qué es una oración coordinada?", options: ["Dos oraciones independientes unidas por un nexo", "Una oración dentro de otra", "Una oración sin verbo", "Una oración con sujeto tácito"], a: "Dos oraciones independientes unidas por un nexo", tipo: "Gramática" },
  { q: "¿Cuál es la diferencia entre sujeto y predicado?", options: ["Quién realiza la acción vs la acción misma", "El nombre vs el adjetivo", "El principio vs el final", "No hay diferencia"], a: "Quién realiza la acción vs la acción misma", tipo: "Gramática" },
  { q: "¿Qué es un artículo definido?", options: ["El, la, los, las", "Un, una, unos, unas", "Yo, tú, él", "Mío, tuyo, suyo"], a: "El, la, los, las", tipo: "Gramática" },

  // BLOQUE 3: COMPRENSIÓN LECTORA
  { q: "¿Cuál es la función principal de un texto informativo?", options: ["Transmitir datos de manera objetiva", "Contar una historia ficticia", "Expresar sentimientos", "Convencer al lector"], a: "Transmitir datos de manera objetiva", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una paráfrasis?", options: ["Explicar un texto con tus propias palabras", "Copiar el texto tal cual", "Resumir solo el final", "Cambiar el idioma"], a: "Explicar un texto con tus propias palabras", tipo: "Comprensión Lectora" },
  { q: "¿Qué parte del texto resume el contenido al principio?", options: ["Introducción", "Desarrollo", "Conclusión", "Índice"], a: "Introducción", tipo: "Comprensión Lectora" },
  { q: "¿Cuál es el objetivo de un texto argumentativo?", options: ["Persuadir o convencer", "Informar sobre el clima", "Enseñar a cocinar", "Describir un paisaje"], a: "Persuadir o convencer", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una idea principal?", options: ["La información más importante", "El título del libro", "El nombre del autor", "La última frase"], a: "La información más importante", tipo: "Comprensión Lectora" },
  { q: "¿Qué tipo de texto es una noticia?", options: ["Periodístico / Informativo", "Literario / Poético", "Científico / Técnico", "Dramático"], a: "Periodístico / Informativo", tipo: "Comprensión Lectora" },
  { q: "¿A qué género pertenece una novela?", options: ["Género narrativo", "Género lírico", "Género dramático", "Género didáctico"], a: "Género narrativo", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una ficha bibliográfica?", options: ["Documento que registra datos de un libro", "Una marca en la página", "El resumen de la trama", "La biografía del autor"], a: "Documento que registra datos de un libro", tipo: "Comprensión Lectora" },
  { q: "¿Qué función de la lengua predomina en un poema?", options: ["Poética o estética", "Apelativa", "Referencial", "Metalingüística"], a: "Poética o estética", tipo: "Comprensión Lectora" },
  { q: "¿Qué es un desenlace?", options: ["La parte final donde se resuelve el conflicto", "El inicio de la historia", "El momento de mayor tensión", "La presentación de personajes"], a: "La parte final donde se resuelve el conflicto", tipo: "Comprensión Lectora" },
  { q: "¿Qué es el subtexto?", options: ["Lo que el autor sugiere pero no dice", "El título secundario", "Las notas al pie", "El texto traducido"], a: "Lo que el autor sugiere pero no dice", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una analogía?", options: ["Relación de semejanza entre cosas distintas", "Una contradicción", "Un tipo de rima", "Un personaje principal"], a: "Relación de semejanza entre cosas distintas", tipo: "Comprensión Lectora" },
  { q: "¿Cuál es la función apelativa de la lengua?", options: ["Influir en el receptor", "Informar sobre hechos", "Expresar emociones", "Hablar sobre el lenguaje"], a: "Influir en el receptor", tipo: "Comprensión Lectora" },
  { q: "¿Qué es un modismo?", options: ["Expresión propia que no se traduce literal", "Una palabra nueva", "Un error gramatical", "Un tipo de acento"], a: "Expresión propia que no se traduce literal", tipo: "Comprensión Lectora" },
  { q: "¿Qué tipo de texto utiliza diálogos y acotaciones?", options: ["Texto dramático o teatral", "Ensayo", "Poema", "Noticia"], a: "Texto dramático o teatral", tipo: "Comprensión Lectora" },
  { q: "¿Qué es un neologismo?", options: ["Una palabra nueva en una lengua", "Una palabra antigua", "Un insulto", "Un nombre propio"], a: "Una palabra nueva en una lengua", tipo: "Comprensión Lectora" },
  { q: "¿Cuál es el orden cronológico en una narración?", options: ["Planteamiento, nudo y desenlace", "Nudo, desenlace, planteamiento", "Desenlace, nudo, planteamiento", "No tiene orden"], a: "Planteamiento, nudo y desenlace", tipo: "Comprensión Lectora" },
  { q: "¿Qué es un prefijo?", options: ["Partícula al principio de una palabra", "Partícula al final de una palabra", "El acento de la palabra", "La raíz de la palabra"], a: "Partícula al principio de una palabra", tipo: "Comprensión Lectora" },
  { q: "¿Para qué sirven las comillas en una cita?", options: ["Indicar texto de otro autor", "Indicar que es importante", "Indicar que es mentira", "Indicar un grito"], a: "Indicar texto de otro autor", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una metáfora?", options: ["Identifica término real con imaginario", "Una exageración", "Una comparación con 'como'", "Un sonido escrito"], a: "Identifica término real con imaginario", tipo: "Comprensión Lectora" },

  // BLOQUE 4: HABILIDAD VERBAL
  { q: "Analogía: 'Aleta es a pez, como brazo es a...'", options: ["Humano", "Perro", "Pájaro", "Avión"], a: "Humano", tipo: "Habilidad Verbal" },
  { q: "¿Cuál es el antónimo de 'altruista'?", options: ["Egoísta", "Generoso", "Amable", "Rápido"], a: "Egoísta", tipo: "Habilidad Verbal" },
  { q: "¿Qué significa la palabra 'ambiguo'?", options: ["Que puede entenderse de varias formas", "Que es muy claro", "Que es antiguo", "Que es grande"], a: "Que puede entenderse de varias formas", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'escuchar':", options: ["Oír / Atender", "Mirar", "Hablar", "Caminar"], a: "Oír / Atender", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'guerra':", options: ["Paz", "Batalla", "Conflicto", "Odio"], a: "Paz", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un homófono?", options: ["Suenan igual, escritura diferente", "Significan lo mismo", "Significan lo opuesto", "Tienen la misma raíz"], a: "Suenan igual, escritura diferente", tipo: "Habilidad Verbal" },
  { q: "Significado de 'precursor':", options: ["Que precede o va delante", "Que viene después", "Que es muy pequeño", "Que es un experto"], a: "Que precede o va delante", tipo: "Habilidad Verbal" },
  { q: "¿Cuál es el sinónimo de 'relevante'?", options: ["Importante / Destacado", "Inútil", "Pequeño", "Invisible"], a: "Importante / Destacado", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'ascender':", options: ["Descender", "Subir", "Escalar", "Volar"], a: "Descender", tipo: "Habilidad Verbal" },
  { q: "¿Qué significa 'pernoctar'?", options: ["Pasar la noche en un lugar", "Comer mucho", "Viajar de día", "Dormir poco"], a: "Pasar la noche en un lugar", tipo: "Habilidad Verbal" },
  { q: "Analogía: 'Frío es a hielo como calor es a...'", options: ["Fuego", "Agua", "Viento", "Tierra"], a: "Fuego", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'vasto':", options: ["Extenso / Amplio", "Estrecho", "Basto (tosco)", "Vacío"], a: "Extenso / Amplio", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un hiperbatón?", options: ["Alterar el orden lógico de palabras", "Una exageración", "Una repetición", "Un tipo de rima"], a: "Alterar el orden lógico de palabras", tipo: "Habilidad Verbal" },
  { q: "Significado de 'efímero':", options: ["Que dura muy poco tiempo", "Que es eterno", "Que es muy brillante", "Que es pesado"], a: "Que dura muy poco tiempo", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'opaco':", options: ["Brillante / Transparente", "Oscuro", "Triste", "Sólido"], a: "Brillante / Transparente", tipo: "Habilidad Verbal" },
  { q: "¿Qué es una onomatopeya?", options: ["Representación escrita de un sonido", "Una figura de dicción", "Un nombre de lugar", "Un tipo de verso"], a: "Representación escrita de un sonido", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'enigma':", options: ["Misterio", "Solución", "Claridad", "Historia"], a: "Misterio", tipo: "Habilidad Verbal" },
  { q: "¿Qué es la denotación?", options: ["Significado literal y objetivo", "Significado subjetivo", "Un error de escritura", "La rima de un poema"], a: "Significado literal y objetivo", tipo: "Habilidad Verbal" },
  { q: "¿Qué es la connotación?", options: ["Significado subjetivo o figurado", "Significado de diccionario", "La raíz de la palabra", "El plural"], a: "Significado subjetivo o figurado", tipo: "Habilidad Verbal" },
  { q: "Completa: 'Libro es a leer como película es a...'", options: ["Ver", "Escuchar", "Escribir", "Comer"], a: "Ver", tipo: "Habilidad Verbal" },

  // BLOQUE 5: LITERATURA
  { q: "¿Quién escribió 'Don Quijote de la Mancha'?", options: ["Miguel de Cervantes", "Lope de Vega", "Quevedo", "Góngora"], a: "Miguel de Cervantes", tipo: "Literatura" },
  { q: "¿Qué es una rima consonante?", options: ["Coinciden todos los sonidos finales", "Solo coinciden las vocales", "No hay coincidencia", "Solo al principio"], a: "Coinciden todos los sonidos finales", tipo: "Literatura" },
  { q: "¿Qué es un verso?", options: ["Cada una de las líneas de un poema", "Un conjunto de estrofas", "El título del poema", "La rima final"], a: "Cada una de las líneas de un poema", tipo: "Literatura" },
  { q: "¿Cómo se llama la comparación que usa la palabra 'como'?", options: ["Símil", "Metáfora", "Hipérbole", "Personificación"], a: "Símil", tipo: "Literatura" },
  { q: "¿Qué es una hipérbole?", options: ["Una exageración", "Una comparación", "Un sonido", "Una contradicción"], a: "Una exageración", tipo: "Literatura" },
  { q: "¿Cuál es el tema principal de una tragedia?", options: ["Destino fatal y sufrimiento", "Risa y alegría", "Amor romántico", "Hechos históricos"], a: "Destino fatal y sufrimiento", tipo: "Literatura" },
  { q: "¿Qué es una moraleja?", options: ["Enseñanza de una fábula", "El final de un cuento", "El nombre del autor", "Un tipo de rima"], a: "Enseñanza de una fábula", tipo: "Literatura" },
  { q: "¿A qué se refiere el 'clímax' en una historia?", options: ["Punto de mayor tensión", "El inicio", "El final feliz", "La descripción de paisajes"], a: "Punto de mayor tensión", tipo: "Literatura" },
  { q: "¿Qué es un narrador omnisciente?", options: ["El que sabe todo lo que piensan", "El que es un personaje", "El que solo ve lo de afuera", "El que miente"], a: "El que sabe todo lo que piensan", tipo: "Literatura" },
  { q: "¿Cuál es la lengua romance de la que proviene el español?", options: ["El latín", "El griego", "El germánico", "El árabe"], a: "El latín", tipo: "Literatura" },
  { q: "¿Qué es un arcaísmo?", options: ["Palabra que ya no se usa", "Palabra nueva", "Palabra extranjera", "Palabra técnica"], a: "Palabra que ya no se usa", tipo: "Literatura" },
  { q: "¿Qué autor mexicano ganó el Premio Nobel de Literatura?", options: ["Octavio Paz", "Juan Rulfo", "Carlos Fuentes", "Elena Poniatowska"], a: "Octavio Paz", tipo: "Literatura" },
  { q: "¿Qué es una estrofa?", options: ["Un conjunto de versos", "Una línea del poema", "La rima asonante", "El autor del poema"], a: "Un conjunto de versos", tipo: "Literatura" },
  { q: "¿Qué es el género lírico?", options: ["Expresa sentimientos y emociones", "Cuenta hechos históricos", "Se representa en teatro", "Es para enseñar"], a: "Expresa sentimientos y emociones", tipo: "Literatura" },
  { q: "¿Qué es una paradoja?", options: ["Contradicción aparente con verdad", "Una exageración", "Una rima", "Un personaje"], a: "Contradicción aparente con verdad", tipo: "Literatura" },
  { q: "¿Cuál es la obra más famosa de Gabriel García Márquez?", options: ["Cien años de soledad", "Pedro Páramo", "Rayuela", "El Aleph"], a: "Cien años de soledad", tipo: "Literatura" },
  { q: "¿Qué es un pleonasmo?", options: ["Uso de palabras innecesarias", "Una palabra nueva", "Una rima", "Un tipo de verso"], a: "Uso de palabras innecesarias", tipo: "Literatura" },
  { q: "¿Qué es la rima asonante?", options: ["Solo coinciden las vocales", "Coinciden todos los sonidos", "No hay rima", "Rima al principio"], a: "Solo coinciden las vocales", tipo: "Literatura" },
  { q: "¿Qué es un ensayo?", options: ["Texto donde el autor expone su punto", "Un poema largo", "Una obra de teatro", "Una noticia"], a: "Texto donde el autor expone su punto", tipo: "Literatura" },
  { q: "¿Qué signo se usa para introducir un diálogo?", options: ["Raya o guion largo (—)", "Comillas", "Paréntesis", "Puntos suspensivos"], a: "Raya o guion largo (—)", tipo: "Literatura" },

  // PREGUNTAS ESPECIALES ⭐
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

const BOARD_DATA = Array.from({ length: 20 }, (_, i) => {
  if (i === 0) return { id: 0, name: "INICIO", type: "start", color: "bg-emerald-500", icon: "🏁" };
  if (i === 5) return { id: 5, name: "BIBLIOTECA", type: "jail", color: "bg-slate-700", icon: "🏛️" };
  if (i === 10) return { id: 10, name: "EXAMEN", type: "exam", color: "bg-amber-500", icon: "📝" };
  if (i === 15) return { id: 15, name: "SUERTE", type: "chance", color: "bg-purple-500", icon: "🎲" };
  const colors = ["bg-blue-400", "bg-red-400", "bg-green-400", "bg-yellow-400", "bg-pink-400"];
  return { id: i, name: `Casilla ${i}`, type: "property", color: colors[i % colors.length], icon: "📖" };
});

export default function Game() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [theme, setTheme] = useState('dark');
  const [players, setPlayers] = useState([
    { id: 1, name: "Jugador 1", pos: 0, money: 1000, color: "#10b981", icon: "👨‍🎓" },
    { id: 2, name: "Jugador 2", pos: 0, money: 1000, color: "#3b82f6", icon: "👩‍🎓" }
  ]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [diceValue, setDiceValue] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    initAudio();
    musicEngine.play('menu');
  }, []);

  const rollDice = () => {
    if (isRolling || showQuestion) return;
    sfx.dice();
    setIsRolling(true);
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);
      const newPlayers = [...players];
      const p = newPlayers[currentPlayerIdx];
      let newPos = (p.pos + roll) % 20;
      if (newPos < p.pos) p.money += 200;
      p.pos = newPos;
      setPlayers(newPlayers);
      setCurrentQuestion(QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)]);
      setShowQuestion(true);
    }, 600);
  };

  const handleAnswer = (opt: string) => {
    const correct = opt === currentQuestion.a;
    const newPlayers = [...players];
    const p = newPlayers[currentPlayerIdx];
    if (correct) { sfx.correct(); p.money += 100; setHistory([`¡Correcto! ${p.name} +$100`, ...history]); }
    else { sfx.wrong(); p.money -= 50; setHistory([`Incorrecto. ${p.name} -$50`, ...history]); }
    setPlayers(newPlayers);
    setShowQuestion(false);
    setCurrentPlayerIdx((currentPlayerIdx + 1) % 2);
  };

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col">
      <GlobalStyles theme={theme} />
      {gameState === 'menu' ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <h1 className="text-7xl font-black mb-4 title-anim">EXAMEN<span className="text-emerald-500">-POLY</span></h1>
          <button 
            onClick={() => { sfx.magic(); setGameState('playing'); musicEngine.play('game'); }} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-6 text-2xl rounded-2xl font-bold transition-all shadow-xl"
          >
            ¡EMPEZAR!
          </button>
        </div>
      ) : (
        <div className="flex-1 flex">
          <div className="w-80 p-6 border-r border-white/10 flex flex-col gap-4">
            <h2 className="text-2xl font-bold mb-4">ESTADÍSTICAS</h2>
            {players.map((p, i) => (
              <div key={p.id} className={`p-4 rounded-xl border-2 ${currentPlayerIdx === i ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: p.color }}>{p.icon}</div>
                  <div><p className="font-bold">{p.name}</p><p className="text-emerald-500 font-mono">${p.money}</p></div>
                </div>
              </div>
            ))}
            <div className="mt-auto h-48 overflow-y-auto custom-scroll bg-black/20 p-3 rounded-xl">
              {history.map((h, i) => <p key={i} className="text-xs mb-1 opacity-70">{h}</p>)}
            </div>
          </div>
          <div className="flex-1 relative flex items-center justify-center">
            <div className="grid grid-cols-6 grid-rows-6 w-[600px] h-[600px] gap-2">
              {BOARD_DATA.map((tile, i) => {
                let row = 0, col = 0;
                if (i < 6) { row = 0; col = i; } else if (i < 11) { row = i - 5; col = 5; } else if (i < 16) { row = 5; col = 5 - (i - 10); } else { row = 5 - (i - 15); col = 0; }
                return (
                  <div key={tile.id} style={{ gridRow: row + 1, gridColumn: col + 1 }} className={`rounded-xl ${tile.color} flex flex-col items-center justify-center p-1 text-center relative shadow-inner`}>
                    <span className="text-xl">{tile.icon}</span>
                    <span className="text-[8px] font-bold uppercase">{tile.name}</span>
                    <div className="absolute bottom-1 flex gap-1">
                      {players.filter(p => p.pos === tile.id).map(p => <div key={p.id} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[10px]" style={{ backgroundColor: p.color }}>{p.icon}</div>)}
                    </div>
                  </div>
                );
              })}
              <div className="col-start-2 col-end-6 row-start-2 row-end-6 flex flex-col items-center justify-center bg-black/5 rounded-3xl border-2 border-dashed border-white/10">
                {!showQuestion ? (
                  <div className="text-center">
                    <div className="text-sm font-bold opacity-40 mb-4 uppercase">Turno de: {players[currentPlayerIdx].name}</div>
                    <div className="w-20 h-20 bg-white text-slate-900 rounded-2xl shadow-2xl flex items-center justify-center text-4xl font-black mx-auto mb-6 cursor-pointer" onClick={rollDice}>{isRolling ? "?" : (diceValue || "🎲")}</div>
                    <button disabled={isRolling} onClick={rollDice} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-4 rounded-xl transition-all">LANZAR DADOS</button>
                  </div>
                ) : (
                  <div className="w-full h-full p-6 flex flex-col">
                    <div className="mb-2 self-start bg-emerald-500 px-2 py-1 rounded text-xs font-bold">{currentQuestion.tipo}</div>
                    <h3 className="text-lg font-bold mb-4 leading-tight">{currentQuestion.q}</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {currentQuestion.options.map((opt: string, i: number) => (
                        <button key={i} className="text-left py-2 px-4 rounded-lg border border-white/20 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all" onClick={() => handleAnswer(opt)}>{opt}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
