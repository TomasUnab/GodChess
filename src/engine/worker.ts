import type { EngineInfo, EngineMessage, EngineRequest } from './protocol';

let engine: Worker | null = null;
let uciReady = false;
let searching = false;
let searchId = 0;
/** A search requested while another runs waits here until `bestmove` frees the engine. */
let queued: { id: number; commands: string[] } | null = null;
let currentInfo: EngineInfo = { depth: 0, score: {}, pv: [] };
/** Latest line per MultiPV rank in the running search. */
let currentLines = new Map<number, EngineInfo>();

const post = (message: EngineMessage) => self.postMessage(message);
let threads = 1;
let triedMulti = false;
let base = '/';
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Multi-threaded Stockfish needs SharedArrayBuffer, which only exists on
 * cross-origin-isolated pages. Anything else, or a failed load, uses one thread.
 */
function start_engine() {
  const isolated = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true && typeof SharedArrayBuffer !== 'undefined';
  const multi = isolated && !triedMulti;
  triedMulti = triedMulti || multi;
  try {
    engine?.terminate();
    uciReady = false;
    engine = new Worker(new URL(multi ? 'engine/mt/stockfish.js' : 'engine/stockfish.js', base).href);
    threads = multi ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;
    engine.onmessage = (e) => forwardUci(String(e.data));
    // A threaded build that loads but never answers (memory, old browser) falls back too.
    if (multi) fallbackTimer = setTimeout(() => { if (!uciReady) start_engine(); }, 10_000);
    engine.onerror = (e) => {
      e.preventDefault?.();
      if (multi) { start_engine(); return; }
      post({ type: 'error', error: e.message || 'No se pudo cargar Stockfish' });
    };
    send('uci');
  } catch (error) {
    if (multi) { start_engine(); return; }
    post({ type: 'error', error: String(error) });
  }
}
const send = (command: string) => engine?.postMessage(command);

function search(id: number, commands: string[]) {
  if (searching) { queued = { id, commands }; send('stop'); return; }
  start(id, commands);
}
function start(id: number, commands: string[]) {
  searching = true; searchId = id; currentInfo = { depth: 0, score: {}, pv: [] }; currentLines = new Map();
  commands.forEach(send);
}

// UCI parsing is isolated here so React never waits on engine IO or parsing.
self.onmessage = (event: MessageEvent<EngineRequest>) => {
  const message = event.data;
  switch (message.type) {
    case 'init': base = message.base; start_engine(); return;
    case 'setStrength':
      send(`setoption name Skill Level value ${message.skill}`); send('setoption name UCI_LimitStrength value true'); send(`setoption name UCI_Elo value ${message.uciElo}`);
      return;
    case 'fullStrength':
      send('setoption name UCI_LimitStrength value false'); send('setoption name Skill Level value 20');
      return;
case 'setThreads':
threads = Math.max(1, Math.min(4, Math.round(message.threads)));
send(`setoption name Threads value ${threads}`);
return;
    case 'stop': queued = null; if (searching) send('stop'); return;
    case 'quit': queued = null; send('quit'); engine?.terminate(); engine = null; return;
case 'analyze': search(message.id, ['setoption name MultiPV value 1', `position fen ${message.fen}`, message.movetime ? `go movetime ${message.movetime}` : `go depth ${message.depth}`]); return;
    case 'bestMove': search(message.id, ['setoption name MultiPV value 1', `position fen ${message.fen}`, `go movetime ${message.movetime}`]); return;
    case 'infinite': search(message.id, [`setoption name MultiPV value ${message.multipv}`, `position fen ${message.fen}`, 'go infinite']); return;
    case 'multi': search(message.id, [`setoption name MultiPV value ${message.multipv}`, `position fen ${message.fen}`, `go depth ${message.depth}`]); return;
  }
};

function forwardUci(line: string) {
  if (line === 'uciok' && !uciReady) {
    uciReady = true;
    if (threads > 1) { send(`setoption name Threads value ${threads}`); send('setoption name Hash value 64'); }
    send('setoption name UCI_ShowWDL value true');
    send('isready');
  }
  if (line === 'readyok') { clearTimeout(fallbackTimer); post({ type: 'readyok', threads }); }
  if (line.startsWith('info ') && line.includes(' pv ') && !line.includes('bound')) {
    const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
    const cp = line.match(/\bscore cp (-?\d+)/)?.[1];
    const mate = line.match(/\bscore mate (-?\d+)/)?.[1];
    const pv = line.match(/\bpv (.+)$/)?.[1]?.split(' ') ?? [];
    const multipv = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
    const nodes = Number(line.match(/\bnodes (\d+)/)?.[1] ?? 0);
    const nps = Number(line.match(/\bnps (\d+)/)?.[1] ?? 0);
    const wdlMatch = line.match(/\bwdl (\d+) (\d+) (\d+)/);
    const wdl = wdlMatch ? [Number(wdlMatch[1]), Number(wdlMatch[2]), Number(wdlMatch[3])] as [number, number, number] : undefined;
    const info: EngineInfo = { depth, score: cp !== undefined ? { cp: Number(cp) } : mate !== undefined ? { mate: Number(mate) } : {}, pv, multipv, nodes, nps, wdl };
    if (multipv === 1) currentInfo = info;
    currentLines.set(multipv, info);
    post({ type: 'info', id: searchId, info });
  } else if (line.startsWith('info ') && /\bscore mate 0\b/.test(line)) {
    currentInfo = { depth: 0, score: { mate: 0 }, pv: [] };
    post({ type: 'info', id: searchId, info: { ...currentInfo, multipv: 1 } });
  }
  if (line.startsWith('bestmove ')) {
    const bestMove = line.split(/\s+/)[1];
    post({ type: 'result', id: searchId, result: { ...currentInfo, bestMove: bestMove === '(none)' ? '' : bestMove, lines: [...currentLines.values()].sort((a, b) => (a.multipv ?? 1) - (b.multipv ?? 1)) } });
    searching = false;
    if (queued) { const next = queued; queued = null; start(next.id, next.commands); }
  }
}
