import { describe, expect, it } from 'vitest';
import { searchOpenings } from './openings';
describe('opening explorer',()=>{it('searches ECO, name and line',()=>{const rows=[{eco:'C20',name:'Italian Game',pgn:'1. e4 e5'}];expect(searchOpenings(rows,'italian')).toHaveLength(1);expect(searchOpenings(rows,'C20')).toHaveLength(1);expect(searchOpenings(rows,'e4')).toHaveLength(1)});});
import { detectOpening, sanLine } from './openings';
describe('opening detection', () => {
  it('finds the deepest named line', () => {
    const rows = [
      { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5' },
      { eco: 'B50', name: 'Sicilian Defense', pgn: '1. e4 c5 2. Nf3 d6' },
    ];
    expect(sanLine(['e4', 'c5', 'Nf3'])).toBe('1. e4 c5 2. Nf3');
    expect(detectOpening(['e4', 'c5', 'Nf3', 'd6', 'd4'], rows)?.eco).toBe('B50');
    expect(detectOpening(['e4', 'c5', 'Nc3'], rows)?.eco).toBe('B20');
    expect(detectOpening(['d4'], rows)).toBeNull();
  });
});
import { spanishOpening } from './openingNames';
describe('Spanish opening names', () => {
  it('translates families and variations', () => {
    expect(spanishOpening('Sicilian Defense: Najdorf Variation, Lipnitsky Attack')).toBe('Defensa Siciliana: variante Najdorf, ataque Lipnitsky');
    expect(spanishOpening("Queen's Gambit Declined: Exchange Variation")).toBe('Gambito de Dama rehusado: variante del cambio');
    expect(spanishOpening('Italian Game')).toBe('Partida Italiana');
    expect(spanishOpening('Stafford Gambit')).toBe('Gambito Stafford');
  });
});
describe('Spanish opening names fallback', () => {
  it('never mixes languages', () => {
    expect(spanishOpening('Polish Opening: Polish Gambit')).toBe('Polish Opening: Polish Gambit');
    expect(spanishOpening("Barnes Opening: Fool's Mate")).toBe("Barnes Opening: Fool's Mate");
  });
});
