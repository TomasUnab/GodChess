import { describe, expect, it } from 'vitest';
import { clockExpired, formatClock, tickClock } from './clocks';
describe('P2P clocks',()=>{it('only decrements the active side',()=>expect(tickClock({w:600000,b:600000},'w',1500)).toEqual({w:598500,b:600000}));it('clamps and formats zero',()=>{const clock=tickClock({w:500,b:600},'w',1000);expect(clockExpired(clock)).toBe(true);expect(formatClock(clock.w)).toBe('0:00')});});
