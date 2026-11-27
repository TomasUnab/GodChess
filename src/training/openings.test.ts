import { describe, expect, it } from 'vitest';
import { searchOpenings } from './openings';
describe('opening explorer',()=>{it('searches ECO, name and line',()=>{const rows=[{eco:'C20',name:'Italian Game',pgn:'1. e4 e5'}];expect(searchOpenings(rows,'italian')).toHaveLength(1);expect(searchOpenings(rows,'C20')).toHaveLength(1);expect(searchOpenings(rows,'e4')).toHaveLength(1)});});
