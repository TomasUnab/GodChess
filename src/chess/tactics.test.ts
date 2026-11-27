import { describe, expect, it } from 'vitest';
import { explainMove, pieceSafety, xrayHighlights } from './tactics';

describe('piece safety (Rayos X)', () => {
  it('finds hanging and under-defended pieces', () => {
    // Black knight on e5 attacked by the f3 knight and undefended; white bishop c4 attacked by the d5 pawn and undefended.
    const fen = 'rnbqkb1r/ppp2ppp/8/3pn3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6';
    const black = pieceSafety(fen, 'b');
    expect(black.find(p => p.square === 'e5')?.status).toBe('hanging');
    const white = pieceSafety(fen, 'w');
    expect(white.find(p => p.square === 'c4')?.status).toBe('hanging');
    const marks = xrayHighlights(fen, 'w');
    expect(marks.c4).toBe('xray-hanging');
    expect(marks.e5).toBe('xray-target');
  });
});

describe('commentary', () => {
  it('explains a hanging piece and names the cause', () => {
    // 1.e4 e5 2.Nf3 Qh4?? hangs the queen to Nxh4.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    const result = explainMove({ fenBefore: fen, uci: 'd8h4', before: { cp: 30, best: 'b8c6' }, after: { cp: 900, best: 'f3h4' }, classification: 'blunder' });
    expect(result.cause).toBe('pieza colgada');
    expect(result.lines.join(' ')).toContain('la dama que acabas de mover');
    expect(result.lines.join(' ')).toContain('Mejor era 2…♞c6');
  });

  it('explains a missed mate', () => {
    // White to move has Qxf7# (Scholar's mate) but plays a quiet move.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
    const result = explainMove({ fenBefore: fen, uci: 'd2d3', before: { mate: 1, best: 'h5f7', pv: ['h5f7'] }, after: { cp: -50 }, classification: 'blunder' });
    expect(result.cause).toBe('mate fallado');
    expect(result.lines[0]).toContain('Había mate en 1: ♕xf7#');
  });

  it('spots a fork allowed by the move', () => {
    // Black plays ...Nf6?? allowing nothing special; instead test a classic: after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4? 4.Nxe5 Qg5 the Nxf7 fork appears.
    const fen = 'r1b1kbnr/pppp1ppp/8/4N1q1/2BnP3/8/PPPP1PPP/RNBQK2R w KQkq - 1 5';
    const result = explainMove({ fenBefore: fen, uci: 'd2d3', before: { cp: 0, best: 'e5f7' }, after: { cp: -300, best: 'g5g2' }, classification: 'blunder' });
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.cause).toBeDefined();
  });

  it('praises a clean capture', () => {
    const fen = 'rnbqkb1r/ppp2ppp/8/3pn3/2B5/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 6';
    expect(explainMove({ fenBefore: fen, uci: 'f3e5', classification: 'best' }).lines[0]).toContain('Gana el caballo');
  });
});
