// FNV-1a over the position key; the app uses the same function (src/chess/shard.ts).
export const SHARDS = 64;
export function shardOf(key) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { hash ^= key.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash % SHARDS;
}
export const positionKey = fen => fen.split(' ').slice(0, 4).join(' ');
