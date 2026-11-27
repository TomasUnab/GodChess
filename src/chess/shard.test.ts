import { describe, expect, it } from 'vitest';
import { shardOf } from './shard';
describe('masters shards', () => {
  it('matches the build script hash', () => {
    expect(shardOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -')).toBe(28);
    expect(shardOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -')).toBe(3);
  });
});
