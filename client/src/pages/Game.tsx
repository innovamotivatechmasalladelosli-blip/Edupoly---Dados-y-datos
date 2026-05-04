import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============= CONFIGURACIÓN GLOBAL =============
(window as any).__gameConfig = {
  musicVol: 0.4, sfxVol: 0.6, voiceVol: 0.8, voiceEnabled: false,
  isMuted: false
};

// ============= MOTOR DE AUDIO =============
let audioCtx: any = null;
const initAudio = () => {
  if (!audioCtx) audioCtx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
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
  correct: () => { playTone(440, 'triangle', 0.1, 0.1); setTimeout(() => playTone(554, 'triangle', 0.1, 0.1), 100); setTimeout(() => playTone(659, 'triangle', 0.3, 0.1), 200); },
  wrong: () => playTone(250, 'sawtooth', 0.4, 0.1, 100),
  magic: () => { playTone(880, 'sine', 0.1, 0.1); setTimeout(() => playTone(1108, 'sine', 0.1, 0.1), 100); },
};

// ============= DATOS DEL JUEGO =============
const QUESTION_BANK = [
  { q: "¿Qué nombre recibe el payaso diabólico en 'It'?", options: ["Pennywise", "Joker", "Bozo", "Pogo"], a: "Pennywise", tipo: "Literatura" },
  { q: "¿En qué hotel se desarrolla 'El Resplandor'?", options: ["Hotel Overlook", "Hotel Stanley", "Motel Bates", "Hotel Cortez"], a: "Hotel Overlook", tipo: "Literatura" },
  { q: "¿Qué escritora secuestra a su autor en 'Misery'?", options: ["Annie Wilkes", "Carrie White", "Rose la Chistera", "Margaret White"], a: "Annie Wilkes", tipo: "Literatura" },
  { q: "¿Cuál es el verdadero nombre de Lord Voldemort?", options: ["Tom Riddle", "Gellert Grindelwald", "Severus Snape", "Lucius Malfoy"], a: "Tom Riddle", tipo: "Literatura" },
  { q: "¿Quién forjó el Anillo Único?", options: ["Sauron", "Gandalf", "Frodo", "Morgoth"], a: "Sauron", tipo: "Literatura" },
  { q: "¿Quién es el autor de '1984'?", options: ["George Orwell", "Aldous Huxley", "Ray Bradbury", "Isaac Asimov"], a: "George Orwell", tipo: "Literatura" },
  { q: "En 'Fahrenheit 451', ¿a qué temperatura arden los libros?", options: ["451 grados", "100 grados", "1000 grados", "500 grados"], a: "451 grados", tipo: "Literatura" },
  { q: "¿Quién escribió 'Cien años de soledad'?", options: ["G. García Márquez", "M. Vargas Llosa", "Julio Cortázar", "J.L. Borges"], a: "G. García Márquez", tipo: "Literatura" },
  { q: "¿Quién es el autor de 'El Cuervo'?", options: ["Edgar Allan Poe", "H.P. Lovecraft", "Mary Shelley", "Bram Stoker"], a: "Edgar Allan Poe", tipo: "Literatura" },
  { q: "¿A qué autor pertenece 'Don Quijote'?", options: ["Miguel de Cervantes", "Lope de Vega", "Garcilaso de la Vega", "Francisco de Quevedo"], a: "Miguel de Cervantes", tipo: "Literatura" },
  { q: "¿Qué tipo de palabra es 'canción'?", options: ["Aguda", "Grave", "Esdrújula", "Sobresdrújula"], a: "Aguda", tipo: "Ortografía" },
  { q: "¿Las palabras esdrújulas siempre llevan tilde?", options: ["Sí, siempre", "No, nunca", "A veces", "Solo en plural"], a: "Sí, siempre", tipo: "Ortografía" },
  { q: "¿Cuál es el antónimo de 'efímero'?", options: ["Eterno o duradero", "Fugaz", "Rápido", "Breve"], a: "Eterno o duradero", tipo: "Habilidad Verbal" },
  { q: "¿Cómo se escribe correctamente 'allá'?", options: ["Allá", "Halla", "Haya", "Aya"], a: "Allá", tipo: "Ortografía" },
  { q: "¿Qué palabra está mal escrita?", options: ["Exibir", "Exhibir", "Egibir", "Todas"], a: "Exibir", tipo: "Ortografía" },
  { q: "¿Cuál es la sílaba tónica en 'teléfono'?", options: ["Lé", "Te", "Fo", "No"], a: "Lé", tipo: "Ortografía" },
  { q: "¿Qué es un diptongo?", options: ["Unión de dos vocales en una sílaba", "Separación de vocales", "Unión de consonantes", "Tres vocales juntas"], a: "Unión de dos vocales en una sílaba", tipo: "Ortografía" },
  { q: "Plural de 'luz':", options: ["Luces", "Luzes", "Luses", "Lúz"], a: "Luces", tipo: "Ortografía" },
  { q: "¿Cuál es la forma correcta?", options: ["Hubo muchos problemas", "Hubieron muchos problemas", "Habían muchos problemas", "Hay muchos problemas"], a: "Hubo muchos problemas", tipo: "Ortografía" },
  { q: "¿Lleva tilde la palabra 'fue'?", options: ["No, es monosílabo", "Sí, siempre", "A veces", "Solo en pasado"], a: "No, es monosílabo", tipo: "Ortografía" },
  { q: "¿Sinónimo de 'abundante'?", options: ["Copioso o profuso", "Escaso", "Poco", "Raro"], a: "Copioso o profuso", tipo: "Habilidad Verbal" },
  { q: "¿Qué tipo de palabra es 'árbol'?", options: ["Grave o llana", "Aguda", "Esdrújula", "Sobresdrújula"], a: "Grave o llana", tipo: "Ortografía" },
  { q: "¿Cuándo se usa la letra 'H'?", options: ["En hie-, hue-", "En todas las vocales", "Al final de agudas", "Nunca"], a: "En hie-, hue-", tipo: "Ortografía" },
  { q: "¿Qué palabra es un palíndromo?", options: ["Reconocer", "Hola", "Mundo", "Computadora"], a: "Reconocer", tipo: "Habilidad Verbal" },
  { q: "¿Acento que diferencia palabras?", options: ["Diacrítico", "Ortográfico", "Prosódico", "Tonal"], a: "Diacrítico", tipo: "Ortografía" },
  { q: "¿Núcleo del sujeto: 'El joven programador terminó el código'?", options: ["Programador", "Joven", "El", "Terminó"], a: "Programador", tipo: "Gramática" },
  { q: "¿Qué es un adjetivo?", options: ["Describe una característica del sustantivo", "La acción de la oración", "Palabra que une oraciones", "Nombre de un lugar"], a: "Describe una característica del sustantivo", tipo: "Gramática" },
  { q: "En 'María corre rápido', ¿cuál es el adverbio?", options: ["Rápido", "María", "Corre", "Ninguno"], a: "Rápido", tipo: "Gramática" },
  { q: "¿Qué es el predicado?", options: ["Lo que se dice del sujeto", "Quién realiza la acción", "La parte más importante", "Un tipo de verbo"], a: "Lo que se dice del sujeto", tipo: "Gramática" },
  { q: "¿Verbo sin conjugar que termina en -ar, -er, -ir?", options: ["Infinitivo", "Gerundio", "Participio", "Imperativo"], a: "Infinitivo", tipo: "Gramática" },
  { q: "Objeto directo en 'Juan compró un libro':", options: ["Un libro", "Juan", "Compró", "A Juan"], a: "Un libro", tipo: "Gramática" },
  { q: "¿Categoría de 'y', 'e', 'ni', 'que'?", options: ["Conjunciones", "Preposiciones", "Adverbios", "Artículos"], a: "Conjunciones", tipo: "Gramática" },
  { q: "Tiempo verbal de 'yo comeré':", options: ["Futuro simple", "Pasado", "Presente", "Copretérito"], a: "Futuro simple", tipo: "Gramática" },
  { q: "Sujeto tácito en 'Comimos pizza':", options: ["Nosotros", "Ellos", "Ustedes", "Yo"], a: "Nosotros", tipo: "Gramática" },
  { q: "¿Qué es una oración simple?", options: ["Un solo verbo conjugado", "Varios verbos", "Sin verbos", "Una pregunta corta"], a: "Un solo verbo conjugado", tipo: "Gramática" },
  { q: "Función de 'de' en 'la casa de madera':", options: ["Pertenencia o material", "Tiempo", "Lugar", "Acción"], a: "Pertenencia o material", tipo: "Gramática" },
  { q: "Participio de 'escribir':", options: ["Escrito", "Escribiendo", "Escribió", "Escribirá"], a: "Escrito", tipo: "Gramática" },
  { q: "¿Qué es un pronombre?", options: ["Sustituye al sustantivo", "Describe al sustantivo", "Es una acción", "Une ideas"], a: "Sustituye al sustantivo", tipo: "Gramática" },
  { q: "Función de un texto informativo:", options: ["Transmitir datos objetivos", "Persuadir", "Contar historia", "Expresar sentimientos"], a: "Transmitir datos objetivos", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una paráfrasis?", options: ["Explicar con tus palabras", "Copiar exactamente", "Resumir en una palabra", "Traducir"], a: "Explicar con tus palabras", tipo: "Comprensión Lectora" },
  { q: "Objetivo de un texto argumentativo:", options: ["Persuadir o convencer", "Dar instrucciones", "Hacer reír", "Informar noticias"], a: "Persuadir o convencer", tipo: "Comprensión Lectora" },
  { q: "¿Qué es una idea principal?", options: ["Información más importante", "Detalle extra", "Introducción", "Conclusión"], a: "Información más importante", tipo: "Comprensión Lectora" },
  { q: "Género de una novela:", options: ["Narrativo", "Lírico", "Dramático", "Periodístico"], a: "Narrativo", tipo: "Comprensión Lectora" },
  { q: "Función de la lengua en un poema:", options: ["Poética o estética", "Apelativa", "Referencial", "Fática"], a: "Poética o estética", tipo: "Comprensión Lectora" },
  { q: "¿Qué es un desenlace?", options: ["Parte final con resolución", "Inicio de la historia", "Mayor tensión", "Diálogo de personajes"], a: "Parte final con resolución", tipo: "Comprensión Lectora" },
  { q: "¿Qué es la denotación?", options: ["Significado literal objetivo", "Significado figurado", "Doble sentido", "Exageración"], a: "Significado literal objetivo", tipo: "Habilidad Verbal" },
  { q: "Analogía: 'Aleta es a pez, como brazo es a...'", options: ["Humano", "Ave", "Gato", "Perro"], a: "Humano", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'altruista':", options: ["Egoísta", "Generoso", "Amable", "Solidario"], a: "Egoísta", tipo: "Habilidad Verbal" },
  { q: "Sinónimo de 'vasto':", options: ["Extenso / Amplio", "Pequeño", "Corto", "Tosco"], a: "Extenso / Amplio", tipo: "Habilidad Verbal" },
  { q: "¿Significado de 'ambiguo'?", options: ["Varias interpretaciones", "Muy claro", "Antiguo", "Grande"], a: "Varias interpretaciones", tipo: "Habilidad Verbal" },
  { q: "Antónimo de 'guerra':", options: ["Paz", "Batalla", "Conflicto", "Armonía"], a: "Paz", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un homófono?", options: ["Suenan igual, se escriben diferente", "Mismo significado", "Se escriben igual", "Palabras opuestas"], a: "Suenan igual, se escriben diferente", tipo: "Habilidad Verbal" },
  { q: "¿Qué es un verso?", options: ["Línea de un poema", "Conjunto de poemas", "Cuento corto", "Título de la obra"], a: "Línea de un poema", tipo: "Literatura" },
  { q: "¿Qué es una hipérbole?", options: ["Exageración", "Comparación", "Sonido", "Mentira"], a: "Exageración", tipo: "Literatura" },
  { q: "Tema principal de una tragedia:", options: ["Destino fatal y sufrimiento", "Amor feliz", "Comedia", "Aventura épica"], a: "Destino fatal y sufrimiento", tipo: "Literatura" },
  { q: "¿Qué es una moraleja?", options: ["Enseñanza de una fábula", "Final de un poema", "Chiste", "Tipo de rima"], a: "Enseñanza de una fábula", tipo: "Literatura" },
  { q: "¿Qué es el 'clímax'?", options: ["Mayor tensión", "Inicio", "Presentación de personajes", "Final feliz"], a: "Mayor tensión", tipo: "Literatura" },
  { q: "¿Quién escribió 'Cien años de soledad'?", options: ["García Márquez", "Vargas Llosa", "Cortázar", "Borges"], a: "García Márquez", tipo: "Literatura" },
  { q: "¿Qué es la metáfora?", options: ["Comparación sin 'como'", "Comparación con 'como'", "Exageración", "Repetición"], a: "Comparación sin 'como'", tipo: "Literatura" },
  { q: "¿Quién escribió 'La Metamorfosis'?", options: ["Franz Kafka", "Albert Camus", "Jean-Paul Sartre", "Rainer Maria Rilke"], a: "Franz Kafka", tipo: "Literatura" },
];

const AVATARS = [
  { id: 1, name: "📖 Lector", icon: "📖", ability: "Sin habilidad especial" },
  { id: 2, name: "🧙 Mago", icon: "🧙", ability: "Inmune a la cárcel" },
  { id: 3, name: "🤡 Payaso", icon: "🤡", ability: "+$50 al pasar INICIO" },
  { id: 4, name: "🧛 Vampiro", icon: "🧛", ability: "Sabotajes roban $350" },
  { id: 5, name: "🕵️ Detective", icon: "🕵️", ability: "Trivias con 1 opción menos" },
  { id: 6, name: "🧠 Cerebrito", icon: "🧠", ability: "Gana $300 en trivias" },
];

// ============= COMPONENTE PRINCIPAL =============
export default function Game() {
  const [gameState, setGameState] = useState<'menu' | 'setup' | 'playing' | 'gameover'>('menu');
  const [theme, setTheme] = useState('dark');
  const [players, setPlayers] = useState<any[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameMode, setGameMode] = useState('classic');

  useEffect(() => {
    initAudio();
  }, []);

  const getRandomQuestion = () => {
    return QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
  };

  const handleStartGame = () => {
    sfx.magic();
    setGameState('setup');
  };

  const handleSelectAvatar = (avatarId: number) => {
    sfx.click();
    if (players.length < 4) {
      const newPlayer = {
        id: players.length,
        avatar: AVATARS.find(a => a.id === avatarId),
        money: 1500,
        position: 0,
        properties: [],
        alive: true
      };
      setPlayers([...players, newPlayer]);
    }
  };

  const handleStartGamePlay = () => {
    if (players.length < 2) {
      setMessage('Necesitas al menos 2 jugadores');
      return;
    }
    sfx.magic();
    setGameState('playing');
    setCurrentQuestion(getRandomQuestion());
  };

  const handleAnswerQuestion = (answer: string) => {
    sfx.click();
    setSelectedAnswer(answer);
    
    if (answer === currentQuestion.a) {
      sfx.correct();
      const updatedPlayers = [...players];
      updatedPlayers[currentPlayerIdx].money += 200;
      setPlayers(updatedPlayers);
      setMessage('✅ ¡Correcto! +$200');
    } else {
      sfx.wrong();
      setMessage('❌ Incorrecto. Respuesta: ' + currentQuestion.a);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
      setCurrentQuestion(getRandomQuestion());
      setMessage('');
    }, 2000);
  };

  const handleThemeToggle = () => {
    sfx.magic();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleResetGame = () => {
    sfx.magic();
    setGameState('menu');
    setPlayers([]);
    setCurrentPlayerIdx(0);
    setCurrentQuestion(null);
    setShowQuestion(false);
    setSelectedAnswer(null);
    setMessage('');
  };

  const bgColor = theme === 'dark' ? '#0f172a' : '#f0fdf4';
  const textColor = theme === 'dark' ? '#f8fafc' : '#1e293b';

  return (
    <div className="w-full h-screen overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        @keyframes pop-in { 0% { transform: scale(0.8) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .glass-panel { background: ${theme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.85)'}; backdrop-filter: blur(20px); border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}; }
      `}</style>

      {gameState === 'menu' && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="text-center max-w-2xl">
            <div className="text-8xl mb-4 float-anim">🎓</div>
            <h1 className="text-5xl sm:text-6xl font-black mb-2" style={{ fontFamily: "'Playfair Display', serif", color: '#10b981' }}>
              EXAMEN-POLY
            </h1>
            <p className="text-lg opacity-70 mb-8">Ultimate Edition - Juega y Aprende</p>
            
            <div className="glass-panel p-8 rounded-3xl mb-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#10b981' }}>Bienvenido</h2>
              <p className="opacity-80 mb-4">Un videojuego educativo para estudiar COMIPEMS/CENEVAL mientras te diviertes con amigos.</p>
              <p className="text-sm opacity-70">100+ preguntas • Múltiples avatares • Sistema de dinero • Competencia épica</p>
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
          </div>
        </div>
      )}

      {gameState === 'setup' && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-black mb-6">Selecciona tu Avatar</h1>
            <p className="opacity-70 mb-6">Jugadores seleccionados: {players.length}/4</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              {AVATARS.map(avatar => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelectAvatar(avatar.id)}
                  className="glass-panel p-4 rounded-xl hover:scale-105 transition-transform"
                  disabled={players.length >= 4}
                >
                  <div className="text-5xl mb-2">{avatar.icon}</div>
                  <p className="font-bold text-sm">{avatar.name}</p>
                  <p className="text-xs opacity-60">{avatar.ability}</p>
                </button>
              ))}
            </div>

            {message && <p className="text-red-500 mb-4">{message}</p>}

            <div className="space-y-3">
              <button 
                onClick={handleStartGamePlay}
                className="w-full px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all"
                disabled={players.length < 2}
              >
                ▶️ Comenzar Juego
              </button>
              <button 
                onClick={handleResetGame}
                className="w-full px-8 py-3 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all font-bold"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="glass-panel p-6 rounded-2xl mb-6">
              <h2 className="text-2xl font-bold mb-4">Turno de: {players[currentPlayerIdx]?.avatar.name}</h2>
              <p className="text-lg opacity-80">Dinero: ${players[currentPlayerIdx]?.money || 0}</p>
            </div>

            {currentQuestion && (
              <div className="glass-panel p-8 rounded-2xl">
                <h3 className="text-xl font-bold mb-6">{currentQuestion.q}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {currentQuestion.options.map((option: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerQuestion(option)}
                      disabled={selectedAnswer !== null}
                      className={`p-4 rounded-xl font-bold transition-all ${
                        selectedAnswer === option
                          ? option === currentQuestion.a
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'glass-panel hover:scale-105'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {message && <p className="text-center text-lg font-bold">{message}</p>}
              </div>
            )}

            <button 
              onClick={handleResetGame}
              className="w-full mt-6 px-8 py-3 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition-all font-bold"
            >
              ← Salir al Menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
