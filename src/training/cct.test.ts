import { describe, expect, it } from 'vitest';
import { legalChecksAndCaptures, validateCct } from './cct';
describe('CCT validation',()=>{it('derives legal checks and captures',()=>{const result=legalChecksAndCaptures('6k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1');expect(result.checks.length).toBeGreaterThan(0)});it('requires all three scan categories',()=>{expect(validateCct('6k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1',{checks:[],captures:[],threats:[]}).valid).toBe(false)});});
import { expectedFor, opponentThreats } from './cct';
describe('board scan', () => {
  it('lists the opponent threats by turning the move around', () => {
    // White to move; Black's queen on h4 attacks f2 (undefended after f3?) and the e4 pawn.
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3';
    const threats = opponentThreats(fen)!;
    expect(threats).toContain('h4e1');
    expect(threats).toContain('h4h2');
    expect(expectedFor(fen, 'checks')).toEqual([]);
  });
});
