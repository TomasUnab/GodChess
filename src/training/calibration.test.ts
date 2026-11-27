import { describe, expect, it } from 'vitest';
import { calibrateRating } from './model';
describe('calibration rating',()=>{it('starts at 800 in the middle',()=>expect(calibrateRating(3)).toBe(800));it('clamps beginner and advanced bounds',()=>{expect(calibrateRating(0)).toBe(440);expect(calibrateRating(6)).toBe(1160)});});
