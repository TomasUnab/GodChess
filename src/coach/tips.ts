import type { ErrorTag } from '../training/model';
import type { Phase } from '../chess/stats';

/** What to do about each kind of mistake: the habit to build and the drill in GodChess that trains it. */
export const TIPS: Record<ErrorTag, { why: string; habit: string[]; drill: string }> = {
  'pieza colgada': {
    why: 'Dejas piezas sin defensa o atacadas más veces de las que están defendidas.',
    habit: [
      'Antes de soltar la pieza, mira la casilla de destino: ¿quién la ataca y quién la defiende?',
      'Después de cada jugada tuya, repasa qué piezas quedaron sin defensa (las que estaban protegidas por la pieza que acabas de mover).',
      'Activa «Rayos X» en las partidas lentas: marca en rojo tus piezas colgadas antes de que muevas.',
    ],
    drill: 'Entrenar → Puzzles CCT (el paso de capturas) y Mis errores.',
  },
  'amenaza no vista': {
    why: 'El rival ya amenazaba algo y jugaste sin responder a esa amenaza.',
    habit: [
      'Antes de pensar tu plan, pregúntate: «¿qué quiere hacer el rival con su última jugada?».',
      'Mira los jaques, capturas y ataques que tendría el rival si fuera su turno (el tercer paso del escaneo CCT).',
      'Si una pieza tuya está atacada, primero resuélvelo (defenderla, moverla o contraatacar más fuerte).',
    ],
    drill: 'Entrenar → Puzzles CCT, paso «Amenazas del rival».',
  },
  'mate fallado': {
    why: 'Había un mate (o lo permitiste) y no lo viste.',
    habit: [
      'Empieza siempre por los jaques: son las jugadas más forzantes y donde se esconden los mates.',
      'Cuando el rey rival tiene pocas casillas, cuenta sus casillas de escape y busca cómo cubrirlas.',
      'Antes de mover, comprueba que tu rey no puede recibir jaque mate en una jugada.',
    ],
    drill: 'Entrenar → Mates (ocho motivos clásicos) y Contrarreloj.',
  },
  'cambio mal calculado': {
    why: 'Cambiaste o capturaste y saliste perdiendo material.',
    habit: [
      'Cuenta atacantes y defensores de la casilla antes de capturar.',
      'Calcula la secuencia completa de capturas, no solo la primera.',
      'Recuerda los valores: peón 1, caballo y alfil 3, torre 5, dama 9.',
    ],
    drill: 'Entrenar → Puzzles CCT (capturas) y Adivina la jugada.',
  },
  'rey expuesto': {
    why: 'Tu rey quedó abierto a ataques (enroque tardío o peones del enroque adelantados).',
    habit: [
      'Enroca pronto, normalmente antes de la jugada 10.',
      'No avances los peones delante de tu rey enrocado sin motivo.',
      'Si el rival acumula piezas cerca de tu rey, refuerza la defensa antes de seguir con tu plan.',
    ],
    drill: 'Entrenar → Camino, fase de Seguridad.',
  },
  'apuro de tiempo': {
    why: 'Perdiste por el reloj o fallaste con poco tiempo.',
    habit: [
      'Juega rápido las jugadas obvias (recapturas, jugadas de apertura conocidas) para guardar tiempo.',
      'Prueba ritmos más lentos (15+10) mientras entrenas el escaneo.',
    ],
    drill: 'Jugar → Contra el motor, y Entrenar → Contrarreloj para ganar velocidad en lo táctico.',
  },
  otro: {
    why: 'Perdiste ventaja por motivos posicionales (mala colocación de piezas, plan equivocado).',
    habit: [
      'Busca la pieza peor colocada y mejórala.',
      'Compara tu jugada con la línea del motor en Análisis para entender la idea.',
    ],
    drill: 'Análisis → informe de la partida y Adivina la jugada con partidas de maestros.',
  },
};

export const PHASE_TIPS: Record<Phase, string> = {
  opening: 'En la apertura: desarrolla caballos y alfiles, controla el centro, enroca pronto y no muevas la misma pieza dos veces sin motivo. Repasa tus líneas en Repertorio → Practicar.',
  middlegame: 'En el medio juego: antes de cada jugada haz el escaneo CCT (jaques, capturas, amenazas). Es donde más piezas se pierden.',
  endgame: 'En el final: activa el rey, empuja los peones pasados y cambia piezas cuando vas ganando. Practica en Entrenar → Camino, fase de Finales.',
};

export const PHASE_NAME: Record<Phase, string> = { opening: 'la apertura', middlegame: 'el medio juego', endgame: 'el final' };
