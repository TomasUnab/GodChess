import { describe, expect, it } from 'vitest';
import { scheduleReview } from './repetition';
describe('puzzle repetition', () => { it('repeats a missed puzzle quickly', () => expect(scheduleReview(undefined,false,0).dueAt).toBe(60000)); it('expands a solved interval', () => expect(scheduleReview({puzzleId:'x',dueAt:0,intervalDays:1,ease:2.5,lapses:0},true,0).intervalDays).toBe(3)); });
