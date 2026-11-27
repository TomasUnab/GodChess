
import { describe, expect, it } from 'vitest';
import { resultFromFen } from './gameRecord';
describe('P2P game records',()=>{it('maps checkmate turn to winner',()=>expect(resultFromFen('8/8/8/8/8/8/7k/7K w - - 0 1','w')).toBe('black'));});
