import type { EngineInfo, EngineMessage, EngineRequest } from './protocol';

let engine: Worker | null = null;
let uciReady = false;
let searching = false;
let searchId = 0;
/** A search requested while another runs waits here until `bestmove` frees the engine. */
let queued: { id: number; commands: string[] } | null = null;
let currentInfo: EngineInfo = { depth: 0, score: {}, pv: [] };

const post = (message: EngineMessage) => self.postMessage(message);
const send = (command: string) => engine?.postMessage(command);

function search(id: number, commands: string[]) {
  if (searching) { queued = { id, commands }; send('stop'); return; }
  start(id, commands);
}
function start(id: number, commands: string[]) {
  searching = true; searchId = id; currentInfo = { depth: 0, score: {}, pv: [] };
  commands.forEach(send);
}

// UCI parsing is isolated here so React never waits on engine IO or parsing.
self.onmessage = (event: MessageEvent<EngineRequest>) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      try {
        // Stockfish is kept in public/engine and loaded as a nested worker.
        engine = new Worker('/engine/stockfish.js');
        engine.onmessage = (e) => forwardUci(String(e.data));
        engine.onerror = (e) => post({ type: 'error', error: e.message || 'No se pudo cargar Stockfish' });
        send('uci');
      } catch (error) { post({ type: 'error', error: String(error) }); }
      return;
    case 'setStrength':
      send(`setoption name Skill Level value ${message.skill}`); send('setoption name UCI_LimitStrength value true'); send(`setoption name UCI_Elo value ${message.uciElo}`);
      return;
    case 'fullStrength':
      send('setoption name UCI_LimitStrength value false'); send('setoption name Skill Level value 20');
      return;
    case 'stop': queued = null; if (searching) send('stop'); return;
    case 'quit': queued = null; send('quit'); engine?.terminate(); engine = null; return;
    case 'analyze': search(message.id, ['setoption name MultiPV value 1', `position fen ${message.fen}`, `go depth ${message.depth}`]); return;
    case 'bestMove': search(message.id, ['setoption name MultiPV value 1', `position fen ${message.fen}`, `go movetime ${message.movetime}`]); return;
    case 'infinite': search(message.id, [`setoption name MultiPV value ${message.multipv}`, `position fen ${message.fen}`, 'go infinite']); return;
  }
};

function forwardUci(line: string) {
  if (line === 'uciok' && !uciReady) { uciReady = true; send('isready'); }
  if (line === 'readyok') post({ type: 'readyok' });
  if (line.startsWith('info ') && line.includes(' pv ') && !line.includes('bound')) {
    const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
    const cp = line.match(/\bscore cp (-?\d+)/)?.[1];
    const mate = line.match(/\bscore mate (-?\d+)/)?.[1];
    const pv = line.match(/\bpv (.+)$/)?.[1]?.split(' ') ?? [];
    const multipv = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
    const nodes = Number(line.match(/\bnodes (\d+)/)?.[1] ?? 0);
    const nps = Number(line.match(/\bnps (\d+)/)?.[1] ?? 0);
    const info: EngineInfo = { depth, score: cp !== undefined ? { cp: Number(cp) } : mate !== undefined ? { mate: Number(mate) } : {}, pv, multipv, nodes, nps };
    if (multipv === 1) currentInfo = info;
    post({ type: 'info', id: searchId, info });
  } else if (line.startsWith('info ') && /\bscore mate 0\b/.test(line)) {
    currentInfo = { depth: 0, score: { mate: 0 }, pv: [] };
    post({ type: 'info', id: searchId, info: { ...currentInfo, multipv: 1 } });
  }
  if (line.startsWith('bestmove ')) {
    const bestMove = line.split(/\s+/)[1];
    post({ type: 'result', id: searchId, result: { ...currentInfo, bestMove: bestMove === '(none)' ? '' : bestMove } });
    searching = false;
    if (queued) { const next = queued; queued = null; start(next.id, next.commands); }
  }
}
