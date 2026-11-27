import type { CoachContext, MoveFact } from './context';
import { PHASE_NAME, PHASE_TIPS, TIPS } from './tips';
import type { ErrorTag } from '../training/model';
import type { Phase } from '../chess/stats';

/**
 * The assistant that works everywhere: it understands the usual questions in
 * Spanish and answers only from the data (engine report, autopsy, stats).
 * The optional in-browser LLM rewrites this same material more naturally.
 */
export type Intent = 'tactics' | 'best' | 'mistakes' | 'improve' | 'opening' | 'summary' | 'help';

const CAUSE_NAME: Record<ErrorTag, string> = { 'pieza colgada': 'las piezas colgadas', 'amenaza no vista': 'las amenazas que no ves', 'mate fallado': 'los mates que se escapan', 'cambio mal calculado': 'los cambios mal calculados', 'rey expuesto': 'el rey expuesto', 'apuro de tiempo': 'el apuro de tiempo', otro: 'las pérdidas posicionales' };

const norm = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const has = (text: string, words: string[]) => words.some(word => text.includes(word));

export function intentOf(question: string): Intent {
  const q = norm(question);
  if (has(q, ['como mejor', 'mejorar', 'evitar', 'consejo', 'que hago', 'que puedo hacer', 'que se puede hacer', 'entrenar', 'practicar', 'trabajar', 'que deberia', 'recomiend'])) return 'improve';
  if (has(q, ['tactica', 'tema', 'motivo', 'encontraste', 'combinacion', 'horquilla', 'clavada', 'ataque doble'])) return 'tactics';
  if (has(q, ['mejores jugadas', 'mejor jugada', 'brillante', 'bien jugad', 'buenas jugadas', 'acert', 'que hice bien'])) return 'best';
  if (has(q, ['error', 'fall', 'mal', 'blunder', 'regal', 'perd', 'colgad', 'equivoc'])) return 'mistakes';
  if (has(q, ['apertura', 'abrir', 'repertorio'])) return 'opening';
  if (has(q, ['resumen', 'como jugue', 'que tal', 'estadistic', 'nivel', 'precision', 'analiza', 'partida'])) return 'summary';
  return 'help';
}

const sideName = (side: 'w' | 'b') => side === 'w' ? 'blancas' : 'negras';
const mine = (ctx: CoachContext, list: MoveFact[]) => ctx.game?.you ? list.filter(m => m.side === ctx.game!.you) : list;
const topCauses = (ctx: CoachContext): ErrorTag[] => {
  const counts = new Map<ErrorTag, number>();
  for (const m of mine(ctx, ctx.game?.mistakes ?? [])) if (m.cause) counts.set(m.cause, (counts.get(m.cause) ?? 0) + 2);
  for (const [tag, n] of Object.entries(ctx.training?.errors ?? {}) as [ErrorTag, number][]) if (n) counts.set(tag, (counts.get(tag) ?? 0) + n);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
};
const worstPhase = (ctx: CoachContext): Phase | null => {
  const s = ctx.stats;
  if (!s?.analysed) { const m = mine(ctx, ctx.game?.mistakes ?? []); return m.length ? m[0].phase : null; }
  return (Object.entries(s.errorsByPhase) as [Phase, { blunders: number; mistakes: number; moves: number }][])
    .sort((a, b) => (b[1].blunders + b[1].mistakes) / Math.max(1, b[1].moves) - (a[1].blunders + a[1].mistakes) / Math.max(1, a[1].moves))[0][0];
};

const noGame = 'No hay ninguna partida analizada abierta. Abre una en Análisis (o en Partidas) y pulsa «Analizar partida»; después podré decirte qué pasó jugada a jugada.';

export function answer(question: string, ctx: CoachContext): string {
  const g = ctx.game;
  const intent = intentOf(question);
  switch (intent) {
    case 'tactics': {
      if (!g?.analysed) return noGame;
      if (!g.tactics.length) return 'En esta partida no encontré motivos tácticos claros (ataques dobles, clavadas, piezas colgadas o mates). Las diferencias fueron sobre todo posicionales: compara tus jugadas con la línea del motor en Análisis.';
      const you = g.you;
      const forYou = you ? g.tactics.filter(t => t.side === you) : g.tactics;
      const against = you ? g.tactics.filter(t => t.side !== you) : [];
      const parts: string[] = [];
      if (forYou.length) parts.push(`${you ? 'A tu favor' : 'Motivos tácticos'}:\n${forYou.map(t => `• ${t.text}`).join('\n')}`);
      if (against.length) parts.push(`A favor de tu rival:\n${against.map(t => `• ${t.text}`).join('\n')}`);
      return `${parts.join('\n\n')}\n\nHaz clic en esas jugadas en la notación para ver la posición y la flecha verde con lo que proponía Stockfish.`;
    }
    case 'best': {
      if (!g?.analysed) return noGame;
      const list = mine(ctx, g.best);
      if (!list.length) return `No hubo jugadas destacadas${g.you ? ` tuyas (${sideName(g.you)})` : ''}: ni sacrificios brillantes ni capturas o jaques que coincidieran con la mejor jugada.${g.accuracy && g.you ? ` Tu precisión fue ${g.accuracy[g.you]}.` : ''}`;
      return `Tus mejores jugadas en esta partida:\n${list.slice(0, 6).map(m => `• ${m.label} (${m.kind.toLowerCase()}): ${m.text}`).join('\n')}${g.accuracy && g.you ? `\n\nPrecisión total: ${g.accuracy[g.you]}.` : ''}`;
    }
    case 'mistakes': {
      if (!g?.analysed) return noGame;
      const list = mine(ctx, g.mistakes);
      if (!list.length) return `No cometiste errores ni errores graves${g.you ? ` con ${sideName(g.you)}` : ''} según Stockfish. Las imprecisiones están marcadas con ?! en la notación.`;
      const causes = topCauses(ctx);
      return `Tus errores en esta partida:\n${list.slice(0, 6).map(m => `• ${m.label} — ${m.kind.toLowerCase()} en ${PHASE_NAME[m.phase]}${m.swing ? ` (la evaluación pasó de ${m.swing})` : ''}: ${m.text}`).join('\n')}${causes[0] ? `\n\nEl patrón principal: ${CAUSE_NAME[causes[0]]}. ${TIPS[causes[0]].why} Pregúntame «¿cómo lo evito?» para ver qué hacer.` : ''}`;
    }
    case 'improve': {
      const causes = topCauses(ctx).slice(0, 2);
      const phase = worstPhase(ctx);
      if (!causes.length && !phase) return 'Todavía no tengo datos de tus errores. Juega una partida contra el bot o importa tus partidas y analízalas; después podré darte consejos concretos para tu juego.';
      const parts = causes.map(tag => `Contra ${CAUSE_NAME[tag]} — ${TIPS[tag].why}\n${TIPS[tag].habit.map(h => `• ${h}`).join('\n')}\nEntrénalo en: ${TIPS[tag].drill}`);
      if (phase) parts.push(`Donde más fallas es en ${PHASE_NAME[phase]}. ${PHASE_TIPS[phase]}`);
      return parts.join('\n\n');
    }
    case 'opening': {
      const s = ctx.stats;
      const ob = s?.errorsByPhase.opening;
      return `${ob && ob.moves ? `En la apertura cometes ${ob.blunders} errores graves y ${ob.mistakes} errores en ${ob.moves} jugadas analizadas. ` : ''}${PHASE_TIPS.opening} Para ver qué juegas y cómo puntúa cada línea, mira Repertorio → Mi árbol; para comparar con los maestros, Repertorio → Maestros.`;
    }
    case 'summary': {
      const lines: string[] = [];
      if (g?.analysed) {
        lines.push(`${g.white} contra ${g.black} (${g.result}), ${g.moves} jugadas.${g.accuracy ? ` Precisión: blancas ${g.accuracy.w}, negras ${g.accuracy.b}.` : ''}`);
        const m = mine(ctx, g.mistakes); const b = mine(ctx, g.best);
        lines.push(`${g.you ? 'Tú hiciste' : 'Hubo'} ${m.length} errores importantes y ${b.length} jugadas destacadas.${m[0] ? ` El más caro: ${m[0].label} (${m[0].text})` : ''}`);
      } else if (g) lines.push(noGame);
      const s = ctx.stats;
      if (s?.analysed) {
        const q = s.quality; const total = Object.values(q).reduce((a, b) => a + b, 0) || 1;
        lines.push(`En tus ${s.analysed} partidas analizadas: ${Math.round(((q.best + q.excellent + q.brilliant) / total) * 100)} % de jugadas mejores o excelentes y ${Math.round(((q.mistake + q.blunder) / total) * 100)} % de errores.`);
      }
      return lines.join('\n\n') || 'Abre una partida en Análisis o importa tus partidas para que pueda resumirte cómo juegas.';
    }
    default:
      return 'Puedo responder sobre la partida abierta y tus estadísticas. Prueba con:\n• ¿Qué táctica encontraste?\n• ¿Cuáles fueron mis mejores jugadas?\n• ¿Qué errores cometí?\n• ¿Cómo mejoro y evito esos errores?\n• Resúmeme la partida';
  }
}
