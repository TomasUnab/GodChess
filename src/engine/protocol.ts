export type EngineScore = { cp?: number; mate?: number };
export type EngineInfo = { depth: number; score: EngineScore; pv: string[] };
export type EngineResult = EngineInfo & { bestMove: string };
export type EngineRequest =
  | { type: 'init' }
  | { type: 'setStrength'; skill: number; uciElo: number; movetime: number }
  | { type: 'analyze'; fen: string; depth: number }
  | { type: 'bestMove'; fen: string; movetime: number }
  | { type: 'stop' | 'quit' };
