import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Cpu, Send, X } from 'lucide-react';
import type { MLCEngine } from '@mlc-ai/web-llm';
import { useStore } from '../app/store';
import { listGames, type StoredGame } from '../storage/games';
import { playerStats } from '../chess/stats';
import { detectSide } from '../training/autopsy';
import { answer } from './answer';
import { contextText, gameFacts, type CoachContext } from './context';
import { askLlm, hasWebGpu, loadLlm, type ChatTurn } from './llm';

const SUGGESTIONS = ['¿Qué táctica encontraste?', '¿Cuáles fueron mis mejores jugadas?', '¿Qué errores cometí?', '¿Cómo mejoro y evito esos errores?', 'Resúmeme la partida'];

/**
 * The assistant. Always answers from your data (engine report, autopsy, stats);
 * if the browser has WebGPU, an optional local LLM rewrites those answers naturally.
 */
export function CoachPanel({ onClose }: { onClose: () => void }) {
  const { tree, prefs, training } = useStore();
  const [games, setGames] = useState<StoredGame[]>([]);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [llm, setLlm] = useState<MLCEngine | null>(null);
  const [loading, setLoading] = useState<{ text: string; ratio: number } | null>(null);
  const [llmError, setLlmError] = useState('');
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { listGames().then(setGames).catch(() => setGames([])); }, []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [turns]);

  const ctx: CoachContext = useMemo(() => {
    const you = detectSide(tree.headers, prefs.playerName) ?? undefined;
    const sideOf = (g: { white: string; black: string }) => detectSide({ White: g.white, Black: g.black }, prefs.playerName);
    const mine = games.filter(g => sideOf(g));
    return { game: gameFacts(tree, you), stats: mine.length ? playerStats(mine, g => sideOf(g)) : undefined, training, name: prefs.playerName };
  }, [tree, games, prefs.playerName, training]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    const draft = answer(q, ctx);
    const history = turns;
    setTurns(t => [...t, { role: 'user', content: q }, { role: 'assistant', content: llm ? '' : draft }]);
    if (!llm) return;
    setBusy(true);
    try {
      let text = '';
      for await (const piece of askLlm(llm, q, contextText(ctx), draft, history)) {
        text += piece;
        setTurns(t => [...t.slice(0, -1), { role: 'assistant', content: text }]);
      }
      if (!text.trim()) setTurns(t => [...t.slice(0, -1), { role: 'assistant', content: draft }]);
    } catch {
      setTurns(t => [...t.slice(0, -1), { role: 'assistant', content: draft }]);
    } finally { setBusy(false); }
  };

  const enableLlm = async () => {
    setLlmError(''); setLoading({ text: 'Preparando…', ratio: 0 });
    try { setLlm(await loadLlm((text, ratio) => setLoading({ text, ratio }))); }
    catch (error) { setLlmError(error instanceof Error ? error.message : 'No se pudo cargar el modelo.'); }
    finally { setLoading(null); }
  };

  const g = ctx.game;
  return (
    <aside className="coach-panel" role="dialog" aria-label="Asistente de GodChess">
      <header className="coach-head">
        <h2 className="section-title"><Bot size={18} /> Asistente</h2>
        <button className="icon" onClick={onClose} aria-label="Cerrar el asistente"><X size={18} /></button>
      </header>
      <p className="coach-context">{g && g.moves ? `Partida abierta: ${g.white} contra ${g.black}${g.analysed ? '' : ' (sin analizar)'}` : 'Sin partida abierta en Análisis'}{ctx.stats?.analysed ? ` · ${ctx.stats.analysed} partidas tuyas analizadas` : ''}</p>
      <div className="coach-messages" ref={list} aria-live="polite">
        {!turns.length && <p className="muted">Pregúntame por la partida abierta en Análisis o por tu juego en general. Respondo con el análisis de Stockfish y tus estadísticas.</p>}
        {turns.map((turn, i) => <div key={i} className={`coach-msg ${turn.role}`}>{turn.content || (busy ? 'Pensando…' : '')}</div>)}
      </div>
      <div className="coach-suggestions">
        {SUGGESTIONS.map(s => <button key={s} className="chip" onClick={() => void ask(s)} disabled={busy}>{s}</button>)}
      </div>
      <form className="coach-input" onSubmit={event => { event.preventDefault(); void ask(input); }}>
        <input value={input} onChange={event => setInput(event.target.value)} placeholder="Escribe tu pregunta…" aria-label="Pregunta" disabled={busy} />
        <button className="primary" type="submit" disabled={busy || !input.trim()} aria-label="Enviar"><Send size={16} /></button>
      </form>
      <footer className="coach-llm">
        {llm ? <span className="good-text"><Cpu size={14} /> IA local activa (Qwen2.5 1.5B en tu GPU)</span>
          : loading ? <><span>Descargando la IA: {Math.round(loading.ratio * 100)} %</span><progress max={1} value={loading.ratio} /></>
          : hasWebGpu() ? <button className="link" onClick={() => void enableLlm()}><Cpu size={14} /> Activar IA en el navegador (descarga única de ~1 GB)</button>
          : <span className="muted">Tu navegador no tiene WebGPU: respondo con el asistente básico. Para la IA, usa Chrome o Edge.</span>}
        {llmError && <span className="bad-text">{llmError}</span>}
      </footer>
    </aside>
  );
}
