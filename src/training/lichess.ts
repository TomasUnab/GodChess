import { Chess } from 'chess.js';

export type LichessPuzzleRow = {
  puzzleId: string; fen: string; moves: string[]; rating: number; deviation: number;
  popularity: number; plays: number; themes: string[]; gameUrl: string;
  openingTags: string[]; dailyDate?: number;
};

export type PreparedPuzzle = LichessPuzzleRow & {
  presentedFen: string;
  opponentMoveUci: string;
  solutionUci: string[];
  solutionSan: string[];
};

/** Parse one CSV record from the official Lichess puzzle export. */
export function parseLichessPuzzleRow(line: string): LichessPuzzleRow | null {
  const fields = line.split(',');
  if (fields.length < 10 || fields[0] === 'PuzzleId') return null;
  const [puzzleId, fen, moves, rating, deviation, popularity, plays, themes, gameUrl, openingTags, dailyDate] = fields;
  return { puzzleId, fen, moves: moves.trim().split(/\s+/), rating: Number(rating), deviation: Number(deviation), popularity: Number(popularity), plays: Number(plays), themes: themes.trim().split(/\s+/).filter(Boolean), gameUrl, openingTags: openingTags.trim().split(/\s+/).filter(Boolean), dailyDate: dailyDate ? Number(dailyDate) : undefined };
}

/**
 * Lichess stores the position before the opponent's move. The first UCI move
 * is the opponent setup move; only after applying it is the puzzle position
 * ready for the learner. Remaining moves are the only-move solution.
 */
export function prepareLichessPuzzle(row: LichessPuzzleRow): PreparedPuzzle {
  const game = new Chess(row.fen);
  const opponentMoveUci = row.moves[0];
  const opponentMove = game.move({ from: opponentMoveUci.slice(0, 2), to: opponentMoveUci.slice(2, 4), promotion: opponentMoveUci[4] as 'q'|'r'|'b'|'n'|undefined });
  if (!opponentMove) throw new Error(`Invalid Lichess setup move ${opponentMoveUci} for ${row.puzzleId}`);
  const presentedFen = game.fen();
  const solutionGame = new Chess(presentedFen);
  const solutionUci = row.moves.slice(1);
  const solutionSan: string[] = [];
  for (const uci of solutionUci) {
    const move = solutionGame.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] as 'q'|'r'|'b'|'n'|undefined });
    if (!move) throw new Error(`Invalid Lichess solution move ${uci} for ${row.puzzleId}`);
    solutionSan.push(move.san);
  }
  return { ...row, presentedFen, opponentMoveUci, solutionUci, solutionSan };
}

export function matchesPuzzleMove(uci: string, puzzle: PreparedPuzzle) {
  return puzzle.solutionUci[0] === uci || (puzzle.solutionUci.length === 1 && puzzle.solutionSan.includes(uci));
}
