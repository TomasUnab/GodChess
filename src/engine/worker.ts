import type { EngineRequest, EngineResult } from './protocol';

let engine: Worker | null = null;
let lastBest = '';
let uciReady = false;
let currentInfo = { depth: 0, score: {}, pv: [] as string[] };

// UCI parsing is isolated here so React never waits on engine IO or parsing.
self.onmessage = async (event: MessageEvent<EngineRequest>) => {
  const message = event.data;
  if (message.type === 'init') {
    try {
      // Stockfish is kept in public/engine and loaded as a nested worker.
      engine = new Worker('/engine/stockfish.js');
      engine.onmessage = (e) => forwardUci(String(e.data));
      send('uci');
    } catch (error) { self.postMessage({ type: 'error', error: String(error) }); }
    return;
  }
  if (message.type === 'setStrength') { send(`setoption name Skill Level value ${message.skill}`); send(`setoption name UCI_LimitStrength value true`); send(`setoption name UCI_Elo value ${message.uciElo}`); return; }
  if (message.type === 'stop') { send('stop'); return; }
  if (message.type === 'quit') { send('quit'); engine?.terminate(); engine = null; return; }
  if (message.type === 'analyze') { currentInfo = { depth: 0, score: {}, pv: [] }; send(`position fen ${message.fen}`); send(`go depth ${message.depth}`); return; }
  if (message.type === 'bestMove') { currentInfo = { depth: 0, score: {}, pv: [] }; send(`position fen ${message.fen}`); send(`go movetime ${message.movetime}`); }
};

function send(command: string) { engine?.postMessage(command); }
function forwardUci(line: string) {
  if (line === 'uciok' && !uciReady) { uciReady = true; send('isready'); }
  if (line === 'readyok') self.postMessage({ type: 'readyok' });
  if (line.startsWith('info ')) {
    const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
    const cp = line.match(/\bscore cp (-?\d+)/)?.[1];
    const mate = line.match(/\bscore mate (-?\d+)/)?.[1];
    const pv = line.match(/\bpv (.+)$/)?.[1]?.split(' ') ?? [];
    currentInfo = { depth, score: cp ? { cp: Number(cp) } : mate ? { mate: Number(mate) } : {}, pv };
    self.postMessage({ type: 'info', info: currentInfo });
  }
  if (line.startsWith('bestmove ')) {
    lastBest = line.split(/\s+/)[1];
    self.postMessage({ type: 'result', result: { ...currentInfo, bestMove: lastBest } satisfies EngineResult });
  }
}
