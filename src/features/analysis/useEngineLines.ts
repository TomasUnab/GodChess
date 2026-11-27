import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { EngineClient, type EngineLines } from '../../engine/client';
import type { EngineInfo } from '../../engine/protocol';
import { toWhiteView } from '../../chess/report';
import type { Score } from '../../chess/tree';

export type EngineStatus = 'loading' | 'ready' | 'running' | 'off' | 'error' | 'over';
export type Line = { rank: number; score: Score; white: Score; depth: number; uci: string[]; san: string[] };

export function pvToSan(fen: string, pv: string[], limit = 12) {
  const game = new Chess(fen);
  const san: string[] = [];
  for (const uci of pv.slice(0, limit)) {
    try { const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); if (!move) break; san.push(move.san); } catch { break; }
  }
  return san;
}

/** One engine per analysis board, streaming MultiPV lines for the current position. */
export function useEngineLines(fen: string, enabled: boolean, multipv: number) {
  const engine = useRef<EngineClient | null>(null);
  const [status, setStatus] = useState<EngineStatus>('loading');
  const [result, setResult] = useState<{ fen: string; depth: number; nps: number; lines: Line[] }>({ fen, depth: 0, nps: 0, lines: [] });
  const frame = useRef(0);
  const latest = useRef<EngineLines | null>(null);

  useEffect(() => {
    const client = new EngineClient();
    engine.current = client;
    client.init().then(() => { client.fullStrength(); setStatus('ready'); }).catch(() => setStatus('error'));
    return () => { cancelAnimationFrame(frame.current); client.quit(); engine.current = null; };
  }, []);

  useEffect(() => {
    const client = engine.current;
    if (!client || status === 'loading' || status === 'error') return;
    setResult({ fen, depth: 0, nps: 0, lines: [] });
    if (!enabled) { client.stop(); setStatus('off'); return; }
    let game: Chess;
    try { game = new Chess(fen); } catch { setStatus('error'); return; }
    if (game.isGameOver()) { client.stop(); setStatus('over'); return; }
    setStatus('running');
    client.startInfinite(fen, multipv, lines => {
      latest.current = lines;
      if (frame.current) return;
      // Engine info arrives dozens of times per second; paint at most once per frame.
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const snapshot = latest.current;
        if (!snapshot) return;
        setResult({ fen, depth: snapshot.depth, nps: snapshot.nps, lines: snapshot.lines.map((info: EngineInfo) => ({ rank: info.multipv ?? 1, score: info.score, white: toWhiteView(info.score, fen), depth: info.depth, uci: info.pv, san: pvToSan(fen, info.pv) })) });
      });
    });
    return () => { cancelAnimationFrame(frame.current); frame.current = 0; };
    // status only matters for the transition out of loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, enabled, multipv, status === 'loading' || status === 'error']);

  return { status, ...result, lines: result.fen === fen ? result.lines : [], engine };
}
