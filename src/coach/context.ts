import { Chess } from 'chess.js';
import { summarize, CLASS_LABEL, formatScore } from '../chess/report';
import { explainMove } from '../chess/tactics';
import { isWhiteMove, mainline, moveNumber, type GameTree } from '../chess/tree';
import type { PlayerStats, Phase, Quality } from '../chess/stats';
import { moveQuality, phaseOf } from '../chess/stats';
import type { ErrorTag, TrainingState } from '../training/model';

/** What the assistant knows: the open game (with its engine report) and your overall profile. */
export type MoveFact = { label: string; side: 'w' | 'b'; kind: string; text: string; cause?: ErrorTag; phase: Phase; swing?: string };
export type TacticFact = { text: string; side: 'w' | 'b' };
export type GameFacts = {
  white: string; black: string; result: string; you?: 'w' | 'b'; analysed: boolean; moves: number;
  accuracy?: { w: number; b: number };
  mistakes: MoveFact[]; best: MoveFact[]; tactics: TacticFact[];
};
export type CoachContext = { game?: GameFacts; stats?: PlayerStats; training?: TrainingState; name?: string };

const label = (ply: number, san: string) => `${moveNumber({ ply } as never)}${ply % 2 === 1 ? '.' : '…'}${san}`;
export function gameFacts(tree: GameTree, you?: 'w' | 'b'): GameFacts {
  const ids = mainline(tree);
  const analysed = ids.filter(id => tree.nodes[id].eval).length >= ids.length * 0.8 && ids.length > 2;
  const mistakes: MoveFact[] = [], best: MoveFact[] = [];
  const tactics = new Map<string, TacticFact>();
  const add = (text: string, side: 'w' | 'b') => { if (!tactics.has(text)) tactics.set(text, { text, side }); };
  ids.forEach((id, index) => {
    if (index === 0) return;
    const node = tree.nodes[id], parent = tree.nodes[ids[index - 1]];
    const side: 'w' | 'b' = isWhiteMove(node) ? 'w' : 'b';
    const phase = phaseOf(parent.fen, node.ply);
    if (!node.eval || !parent.eval) return;
    const lbl = label(node.ply, node.san);
    if (node.classification === 'blunder' || node.classification === 'mistake') {
      const c = explainMove({ fenBefore: parent.fen, uci: node.uci, before: parent.eval, after: node.eval, classification: node.classification });
      mistakes.push({ label: lbl, side, kind: CLASS_LABEL[node.classification], text: c.lines.join(' '), cause: c.cause, phase, swing: `${formatScore(parent.eval)} a ${formatScore(node.eval)}` });
      for (const line of c.lines) {
        // The tactic belongs to whoever can use it: the opponent of the side that erred.
        const other = side === 'w' ? 'b' : 'w';
        if (/ataque doble/i.test(line)) add(`ataque doble tras ${lbl}`, other);
        if (/clavad/i.test(line)) add(`clavada tras ${lbl}`, other);
        if (/colgad/i.test(line)) add(`pieza colgada en ${lbl}`, other);
        if (/Permite mate/i.test(line)) add(`${line.match(/mate en \d+/i)?.[0] ?? 'mate'} permitido en ${lbl}`, other);
        if (/Había mate/i.test(line)) add(`${line.match(/mate en \d+/i)?.[0] ?? 'mate'} que no se vio en ${lbl}`, side);
      }
    }
    const q: Quality | null = moveQuality(tree, parent.id, node.id, side);
    if (q === 'brilliant' || (q === 'best' && (new Chess(parent.fen).get(node.uci.slice(2, 4) as never) || /[+#]/.test(node.san)))) {
      const c = explainMove({ fenBefore: parent.fen, uci: node.uci, before: parent.eval, after: node.eval, classification: 'best' });
      best.push({ label: lbl, side, kind: q === 'brilliant' ? 'Brillante' : 'Mejor jugada', text: c.lines.join(' ') || (/[+#]/.test(node.san) ? 'Jaque que fuerza la respuesta del rival.' : 'La jugada que elige Stockfish.'), phase });
      if (/Gana/.test(c.lines.join(' '))) add(`${lbl}: ${c.lines[0].replace(/\.$/, '').toLowerCase()}`, side);
    }
  });
  const lastNode = tree.nodes[ids[ids.length - 1]];
  if (lastNode?.san.endsWith('#')) add(`jaque mate final con ${label(lastNode.ply, lastNode.san)}`, isWhiteMove(lastNode) ? 'w' : 'b');
  const report = analysed ? summarize(tree) : null;
  return {
    white: tree.headers.White ?? 'Blancas', black: tree.headers.Black ?? 'Negras', result: tree.headers.Result ?? '*', you, analysed, moves: Math.ceil((ids.length - 1) / 2),
    accuracy: report ? { w: report.white.accuracy, b: report.black.accuracy } : undefined,
    mistakes, best, tactics: [...tactics.values()],
  };
}

/** A compact text dump of the context, for the in-browser LLM. */
export function contextText(ctx: CoachContext): string {
  const out: string[] = [];
  const g = ctx.game;
  if (g) {
    out.push(`Partida abierta: ${g.white} (blancas) contra ${g.black} (negras), resultado ${g.result}, ${g.moves} jugadas.${g.you ? ` El usuario jugaba con ${g.you === 'w' ? 'blancas' : 'negras'}.` : ''}`);
    if (!g.analysed) out.push('La partida aún no está analizada con Stockfish.');
    if (g.accuracy) out.push(`Precisión: blancas ${g.accuracy.w}, negras ${g.accuracy.b}.`);
    for (const m of g.mistakes.slice(0, 8)) out.push(`- ${m.kind} ${m.label} (${m.side === 'w' ? 'blancas' : 'negras'}, ${m.cause ?? 'otro'}): ${m.text}`);
    for (const m of g.best.slice(0, 6)) out.push(`- ${m.kind} ${m.label} (${m.side === 'w' ? 'blancas' : 'negras'}): ${m.text}`);
    if (g.tactics.length) out.push(`Motivos tácticos: ${g.tactics.map(t => `${t.text} (a favor de ${t.side === 'w' ? 'blancas' : 'negras'})`).join('; ')}.`);
  }
  const s = ctx.stats;
  if (s && s.analysed) {
    const q = s.quality; const total = Object.values(q).reduce((a, b) => a + b, 0) || 1;
    out.push(`Estadísticas del usuario en ${s.analysed} partidas analizadas: mejores ${Math.round((q.best / total) * 100)} %, imprecisiones ${Math.round((q.inaccuracy / total) * 100)} %, errores ${Math.round((q.mistake / total) * 100)} %, errores graves ${Math.round((q.blunder / total) * 100)} %.`);
    out.push(`Errores graves por fase: apertura ${s.errorsByPhase.opening.blunders}, medio juego ${s.errorsByPhase.middlegame.blunders}, final ${s.errorsByPhase.endgame.blunders}.`);
  }
  if (ctx.training) {
    const top = Object.entries(ctx.training.errors).sort((a, b) => b[1] - a[1]).filter(e => e[1] > 0).slice(0, 3);
    if (top.length) out.push(`Causas de derrota más repetidas: ${top.map(([t, n]) => `${t} (${n})`).join(', ')}.`);
  }
  return out.join('\n');
}
