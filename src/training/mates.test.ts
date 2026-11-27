import { describe, expect, it } from 'vitest';
import { findMateInOne, mateLibrary, mateThemes } from './mates';
describe('mate library',()=>{it('contains valid positions for every theme',()=>{expect(mateThemes).toHaveLength(14);expect(mateLibrary).toHaveLength(84);for(const item of mateLibrary)expect(()=>findMateInOne(item.fen)).not.toThrow()});});
