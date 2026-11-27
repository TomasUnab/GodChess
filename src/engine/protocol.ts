export type EngineScore = { cp?: number; mate?: number };
export type EngineInfo = { depth: number; score: EngineScore; pv: string[]; multipv?: number; nodes?: number; nps?: number };
export type EngineResult = EngineInfo & { bestMove: string };
export type EngineRequest =
  | { type: 'init' }
  | { type: 'setStrength'; skill: number; uciElo: number; movetime: number }
  | { type: 'fullStrength' }
  | { type: 'analyze'; id: number; fen: string; depth: number }
  | { type: 'bestMove'; id: number; fen: string; movetime: number }
  | { type: 'infinite'; id: number; fen: string; multipv: number }
  | { type: 'stop' | 'quit' };
export type EngineMessage =
  | { type: 'readyok' }
  | { type: 'info'; id: number; info: EngineInfo }
  | { type: 'result'; id: number; result: EngineResult }
  | { type: 'error'; error: string };
