import { describe, expect, it } from 'vitest';
import { legalChecksAndCaptures, validateCct } from './cct';
describe('CCT validation',()=>{it('derives legal checks and captures',()=>{const result=legalChecksAndCaptures('6k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1');expect(result.checks.length).toBeGreaterThan(0)});it('requires all three scan categories',()=>{expect(validateCct('6k1/5ppp/8/8/8/5Q2/5PPP/6K1 w - - 0 1',{checks:[],captures:[],threats:[]}).valid).toBe(false)});});
