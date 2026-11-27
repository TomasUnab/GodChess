export type EngineScore = { cp?: number; mate?: number };
/** wdl: win/draw/loss per mille from the side to move, when UCI_ShowWDL is on. */
export type EngineInfo = { depth: number; score: EngineScore; pv: string[]; multipv?: number; nodes?: number; nps?: number; wdl?: [number, number, number] };
export type EngineResult = EngineInfo & { bestMove: string; lines?: EngineInfo[] };
export type EngineRequest =
  | { type: 'init'; base: string }
  | { type: 'setStrength'; skill: number; uciElo: number; movetime: number }
  | { type: 'fullStrength' }
| { type: 'setThreads'; threads: number }
| { type: 'analyze'; id: number; fen: string; depth: number; movetime?: number }
  | { type: 'bestMove'; id: number; fen: string; movetime: number }
  | { type: 'infinite'; id: number; fen: string; multipv: number }
  | { type: 'multi'; id: number; fen: string; depth: number; multipv: number }
  | { type: 'stop' | 'quit' };
export type EngineMessage =
  | { type: 'readyok'; threads: number }
  | { type: 'info'; id: number; info: EngineInfo }
  | { type: 'result'; id: number; result: EngineResult }
  | { type: 'error'; error: string };
