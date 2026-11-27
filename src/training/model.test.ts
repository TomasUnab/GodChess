import { describe, expect, it } from 'vitest';
import { applyGameError, defaultTraining, dominantError, openingsUnlocked, penalizeCct, weeklyFocus } from './model';
describe('training profile', () => {
  it('selects the most frequent error as weekly focus', () => {
    const state = applyGameError(applyGameError(defaultTraining, 'pieza colgada', 1), 'amenaza no vista', 2);
    expect(dominantError(state.errors)).toBe('amenaza no vista');
    expect(weeklyFocus(state).drill).toBe('Escaneo de amenazas');
  });
  it('penalizes severe errors twice', () => expect(applyGameError(defaultTraining, 'mate fallado', 2).xp).toBe(0));
  it('keeps openings locked until both gates are met', () => { expect(openingsUnlocked({...defaultTraining, slowGames:20, mateInOne:89})).toBe(false); expect(openingsUnlocked({...defaultTraining, slowGames:20, mateInOne:90})).toBe(true); });
  it('applies double CCT penalty', () => expect(penalizeCct({...defaultTraining,xp:30}).xp).toBe(10));
});
