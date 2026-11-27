import { describe, expect, it } from 'vitest';
import { answer, intentOf } from './answer';
import { gameFacts } from './context';
import { classifyFromEvals } from '../chess/report';
import { parsePgn } from '../chess/pgn';

const pgn = `[White "Tú"]\n[Black "Rival"]\n\n1. e4 { [%eval 0.3] [%best e7e5] } 1... e5 { [%eval 0.3] [%best g1f3] } 2. Nf3 { [%eval 0.3] [%best b8c6] } 2... Qh4 { [%eval 9.0] [%best f3h4] } 3. Nxh4 { [%eval 9.0] [%best b8c6] } *`;

describe('coach', () => {
  it('understands the usual questions', () => {
    expect(intentOf('¿Qué táctica encontraste?')).toBe('tactics');
    expect(intentOf('cuales fueron las mejores jugadas')).toBe('best');
    expect(intentOf('¿Qué errores cometí?')).toBe('mistakes');
    expect(intentOf('como mejorar y evitar esos errores')).toBe('improve');
    expect(intentOf('hola')).toBe('help');
  });

  it('answers from the game report', () => {
    const tree = classifyFromEvals(parsePgn(pgn));
    const facts = gameFacts(tree, 'b');
    const ctx = { game: facts };
    expect(answer('¿Qué errores cometí?', ctx)).toContain('2…Qh4');
    expect(answer('¿Qué táctica encontraste?', { game: gameFacts(tree, 'w') })).toContain('A tu favor');
    expect(answer('¿Qué táctica encontraste?', ctx)).toContain('A favor de tu rival');
    expect(answer('¿Cómo mejoro?', ctx)).toContain('Antes de soltar la pieza');
    expect(answer('mejores jugadas', { game: gameFacts(tree, 'w') })).toContain('3.Nxh4');
  });
});
