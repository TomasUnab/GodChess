/** Same FNV-1a as scripts/masters/shard.mjs: which masters file holds a position. */
export const SHARDS = 64;
export function shardOf(key: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash % SHARDS;
}
