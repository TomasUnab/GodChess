import { Chess } from 'chess.js';
export type CctAnswers = { checks:string[]; captures:string[]; threats:string[] };
export function legalChecksAndCaptures(fen:string){const game=new Chess(fen);const checks:string[]=[];const captures:string[]=[];for(const move of game.moves({verbose:true})){const test=new Chess(fen);test.move(move);if(move.captured)captures.push(move.from+move.to);if(test.isCheck())checks.push(move.from+move.to)}return {checks,captures};}
export function validateCct(fen:string,answers:CctAnswers){const expected=legalChecksAndCaptures(fen);const has=(values:string[],wanted:string[])=>wanted.every(item=>values.includes(item));return {checks:has(answers.checks,expected.checks),captures:has(answers.captures,expected.captures),threats:answers.threats.length>0,valid:has(answers.checks,expected.checks)&&has(answers.captures,expected.captures)&&answers.threats.length>0};}

/**
 * What the opponent threatens: their checks and captures if it were their move.
 * Returns null when the position cannot be turned around (e.g. the side to move is in check;
 * then the threat is the check itself and the scan's threat step is skipped).
 */
export function opponentThreats(fen: string): string[] | null {
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-';
  let flipped: Chess;
  try { flipped = new Chess(parts.join(' ')); } catch { return null; }
  const { checks, captures } = legalChecksAndCaptures(flipped.fen());
  return [...new Set([...checks, ...captures])];
}

export type ScanStep = 'checks' | 'captures' | 'threats';
/** The moves a scan step asks for, as from+to squares. */
export function expectedFor(fen: string, step: ScanStep): string[] {
  if (step === 'threats') return opponentThreats(fen) ?? [];
  return legalChecksAndCaptures(fen)[step];
}
