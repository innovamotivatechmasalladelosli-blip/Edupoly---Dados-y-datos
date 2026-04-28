import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
// CONFIGURACIÓN GLOBAL (Volúmenes y Voz)
//======================================================================
(window as any).__gameConfig = {
  musicVol: 0.4, sfxVol: 0.6, voiceVol: 0.8, voiceEnabled: true,
  isMuted: false
};

//======================================================================
// MOTOR DE AUDIO
//======================================================================
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
  dice: () => playTone(800, 'square', 0.1, 0.05),
  correct: () => { playTone(440, 'triangle', 0.1, 0.1); setTimeout(() => playTone(659, 'triangle', 0.3, 0.1), 100); },
  wrong: () => playTone(150, 'sawtooth', 0.4, 0.1, 100),
  move: () => playTone(300, 'sine', 0.05, 0.05),
  win: () => { playTone(523, 'sine', 0.2, 0.1); setTimeout(() => playTone(659, 'sine', 0.2, 0.1), 200); setTimeout(() => playTone(783, 'sine', 0.4, 0.1), 400); }
};

//======================================================================
// BANCO DE PREGUNTAS COMPLETO (100 PREGUNTAS DEL DOCUMENTO)
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

  // PREGUNTAS ESPECIALES (Las originales que pidió el usuario)
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
// DATOS DEL TABLERO
//======================================================================
const BOARD_SIZE = 20;
const BOARD_DATA = Array.from({ length: BOARD_SIZE }, (_, i) => {
  if (i === 0) return { id: 0, name: "INICIO", type: "start", color: "bg-emerald-500", icon: "🏁" };
  if (i === 5) return { id: 5, name: "BIBLIOTECA", type: "jail", color: "bg-slate-700", icon: "🏛️" };
  if (i === 10) return { id: 10, name: "EXAMEN", type: "exam", color: "bg-amber-500", icon: "📝" };
  if (i === 15) return { id: 15, name: "SUERTE", type: "chance", color: "bg-purple-500", icon: "🎲" };
  
  const colors = ["bg-blue-400", "bg-red-400", "bg-green-400", "bg-yellow-400", "bg-pink-400"];
  return { 
    id: i, 
    name: `Casilla ${i}`, 
    type: "property", 
    color: colors[i % colors.length], 
    icon: "📖",
    price: 50 + (i * 10)
  };
});

//======================================================================
// COMPONENTE PRINCIPAL
//======================================================================
export default function Game() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [players, setPlayers] = useState([
    { id: 1, name: "Jugador 1", pos: 0, money: 1000, color: "#10b981", icon: "👨‍🎓" },
    { id: 2, name: "Jugador 2", pos: 0, money: 1000, color: "#3b82f6", icon: "👩‍🎓" }
  ]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [diceValue, setDiceValue] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [message, setMessage] = useState("¡Bienvenidos a Examen-Poly!");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    initAudio();
  }, []);

  const addHistory = (msg: string) => {
    setHistory(prev => [msg, ...prev].slice(0, 10));
    setMessage(msg);
  };

  const rollDice = () => {
    if (isRolling || showQuestion) return;
    sfx.dice();
    setIsRolling(true);
    
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);
      movePlayer(roll);
    }, 600);
  };

  const movePlayer = (steps: number) => {
    const newPlayers = [...players];
    const player = newPlayers[currentPlayerIdx];
    let newPos = (player.pos + steps) % BOARD_SIZE;
    
    // Si pasa por el inicio
    if (newPos < player.pos) {
      player.money += 200;
      addHistory(`${player.name} pasó por el inicio y ganó $200`);
    }
    
    player.pos = newPos;
    setPlayers(newPlayers);
    sfx.move();
    
    handleLand(newPos);
  };

  const handleLand = (pos: number) => {
    const tile = BOARD_DATA[pos];
    const question = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)];
    setCurrentQuestion(question);
    
    setTimeout(() => {
      setShowQuestion(true);
    }, 500);
  };

  const handleAnswer = (option: string) => {
    const isCorrect = option === currentQuestion.a;
    const newPlayers = [...players];
    const player = newPlayers[currentPlayerIdx];
    
    if (isCorrect) {
      sfx.correct();
      player.money += 100;
      addHistory(`¡Correcto! ${player.name} ganó $100`);
    } else {
      sfx.wrong();
      player.money -= 50;
      addHistory(`Incorrecto. ${player.name} perdió $50. La respuesta era: ${currentQuestion.a}`);
    }
    
    setPlayers(newPlayers);
    setShowQuestion(false);
    
    // Siguiente turno
    setCurrentPlayerIdx((currentPlayerIdx + 1) % players.length);
  };

  if (gameState === 'menu') {
    return (
      <div className={`w-full h-screen flex flex-col items-center justify-center transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-emerald-50 text-slate-900'}`}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <GraduationCap size={120} className="mx-auto mb-6 text-emerald-500" />
          <h1 className="text-7xl font-black mb-2 tracking-tighter">
            EXAMEN<span className="text-emerald-500">-POLY</span>
          </h1>
          <p className="text-xl opacity-60 mb-12">Estudia para el COMIPEMS/CENEVAL jugando</p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => { sfx.click(); setGameState('playing'); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-8 text-2xl rounded-2xl shadow-xl shadow-emerald-900/20"
            >
              ¡EMPEZAR!
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-16 h-16 rounded-2xl"
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`w-full h-screen flex overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* PANEL IZQUIERDO: ESTADÍSTICAS */}
      <div className="w-80 p-6 border-r border-white/10 flex flex-col gap-6">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="text-emerald-500" />
          <h2 className="text-2xl font-bold">EXAMEN-POLY</h2>
        </div>

        {players.map((p, idx) => (
          <Card key={p.id} className={`p-4 border-2 transition-all ${currentPlayerIdx === idx ? 'border-emerald-500 scale-105 shadow-lg' : 'border-transparent opacity-70'}`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: p.color }}>
                {p.icon}
              </div>
              <div>
                <p className="font-bold">{p.name}</p>
                <div className="flex items-center gap-1 text-emerald-500 font-mono">
                  <Coins size={14} />
                  <span>${p.money}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        <div className="mt-auto">
          <h3 className="text-sm font-bold opacity-50 mb-2 uppercase tracking-widest">Historial</h3>
          <ScrollArea className="h-48 rounded-xl bg-black/20 p-3">
            {history.map((h, i) => (
              <p key={i} className="text-xs mb-2 border-b border-white/5 pb-1 last:border-0">{h}</p>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* CENTRO: TABLERO */}
      <div className="flex-1 relative flex items-center justify-center p-10">
        <div className="grid grid-cols-6 grid-rows-6 w-[600px] h-[600px] gap-2">
          {/* Renderizar casillas en forma de espiral/borde */}
          {BOARD_DATA.map((tile, i) => {
            // Lógica simple para posicionar en el borde de 6x6
            let row = 0, col = 0;
            if (i < 6) { row = 0; col = i; }
            else if (i < 11) { row = i - 5; col = 5; }
            else if (i < 16) { row = 5; col = 5 - (i - 10); }
            else { row = 5 - (i - 15); col = 0; }

            return (
              <div 
                key={tile.id}
                style={{ gridRow: row + 1, gridColumn: col + 1 }}
                className={`rounded-xl ${tile.color} flex flex-col items-center justify-center p-2 text-center relative shadow-inner border-b-4 border-black/20`}
              >
                <span className="text-2xl mb-1">{tile.icon}</span>
                <span className="text-[10px] font-black leading-tight uppercase">{tile.name}</span>
                
                {/* Jugadores en esta casilla */}
                <div className="absolute bottom-1 flex gap-1">
                  {players.filter(p => p.pos === tile.id).map(p => (
                    <motion.div 
                      layoutId={`player-${p.id}`}
                      key={p.id} 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.icon}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Centro del tablero */}
          <div className="grid-start-2 grid-end-6 grid-row-start-2 grid-row-end-6 col-start-2 col-end-6 row-start-2 row-end-6 flex flex-col items-center justify-center bg-black/5 rounded-3xl border-2 border-dashed border-white/10">
            <AnimatePresence mode="wait">
              {!showQuestion ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="text-sm font-bold opacity-40 mb-4">TURNO DE: {players[currentPlayerIdx].name}</div>
                  <motion.div 
                    animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: isRolling ? Infinity : 0, duration: 0.2 }}
                    className="w-24 h-24 bg-white text-slate-900 rounded-3xl shadow-2xl flex items-center justify-center text-5xl font-black mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform"
                    onClick={rollDice}
                  >
                    {isRolling ? "?" : (diceValue || <Dice5 size={48} />)}
                  </motion.div>
                  <Button 
                    disabled={isRolling}
                    onClick={rollDice}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-6 rounded-xl"
                  >
                    LANZAR DADOS
                  </Button>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-full h-full p-6 flex flex-col"
                >
                  <Badge className="mb-2 self-start bg-emerald-500">{currentQuestion.tipo}</Badge>
                  <h3 className="text-xl font-bold mb-6 leading-tight">{currentQuestion.q}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {currentQuestion.options.map((opt: string, i: number) => (
                      <Button 
                        key={i}
                        variant="outline"
                        className="justify-start text-left h-auto py-3 px-4 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all"
                        onClick={() => handleAnswer(opt)}
                      >
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mr-3 text-xs">{String.fromCharCode(65 + i)}</span>
                        {opt}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: INFO */}
      <div className="w-80 p-6 border-l border-white/10 flex flex-col gap-6">
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <AlertCircle size={18} />
            <span className="font-bold text-sm">¿Cómo jugar?</span>
          </div>
          <p className="text-xs opacity-70 leading-relaxed">
            Lanza los dados para moverte. Cada casilla tiene una pregunta. 
            <br/><br/>
            ✅ <b>Correcto:</b> +$100
            <br/>
            ❌ <b>Incorrecto:</b> -$50
            <br/><br/>
            ¡Gana el primero en llegar a $2000 o el que tenga más dinero al final!
          </p>
        </Card>

        <div className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start gap-2" onClick={() => setGameState('menu')}>
            <BookOpen size={18} /> Salir al Menú
          </Button>
          <Button variant="ghost" className="justify-start gap-2" onClick={() => {
            (window as any).__gameConfig.isMuted = !(window as any).__gameConfig.isMuted;
            setTheme(theme); // Forzar re-render
          }}>
            {(window as any).__gameConfig.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            Sonido: {(window as any).__gameConfig.isMuted ? "OFF" : "ON"}
          </Button>
        </div>
      </div>
    </div>
  );
}
