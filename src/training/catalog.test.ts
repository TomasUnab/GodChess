import { describe, expect, it } from 'vitest';
import { chooseDuePuzzle } from './catalog';
describe('puzzle catalog selection',()=>{it('prioritizes a due review over a rating-only choice',()=>{const rows=[{puzzleId:'a',rating:800,themes:['pieza'],solutionUci:['e2e4']} as never,{puzzleId:'b',rating:800,themes:['pieza'],solutionUci:['d2d4']} as never];expect(chooseDuePuzzle(rows,['b'],'pieza',800)?.puzzleId).toBe('b')});});
