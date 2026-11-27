export type Step =
  | { kind: 'text'; body: string }
  | { kind: 'task'; fen: string; prompt: string; solutions: string[]; hint1: string; hint2: string; why: string; rating: number; theme: string }
  | { kind: 'vision'; mode: 'square'|'attackers'|'legal'|'matePiece'; fen: string; answer: string; timeMs: number }
  | { kind: 'spar'; fen: string; goal: string; maxMoves: number; winCondition: 'mate'|'material'|'survive' }
  | { kind: 'model'; pgn: string; keyMove: string; comment: string };
