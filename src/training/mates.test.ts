import { describe, expect, it } from 'vitest';
import { findMateInOne, mateLibrary, mateThemes } from './mates';
describe('mate library',()=>{it('contains six valid positions per required theme',()=>{expect(mateThemes).toHaveLength(8);expect(mateLibrary).toHaveLength(48);for(const item of mateLibrary)expect(()=>findMateInOne(item.fen)).not.toThrow()});});
