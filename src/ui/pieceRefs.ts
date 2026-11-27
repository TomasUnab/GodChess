import { maskFromAlpha, type Pixels, type Reference } from '../chess/vision';

const TYPES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' } as const;
let cached: Promise<Reference[]> | null = null;

/** Silhouettes of the board's own piece set (cburnett), read from Chessground's stylesheet. */
export function pieceReferences(): Promise<Reference[]> {
  cached ??= (async () => {
    const host = document.createElement('div');
    host.className = 'cg-wrap';
    host.style.cssText = 'position:absolute;left:-9999px;width:96px;height:96px';
    document.body.appendChild(host);
    const refs: Reference[] = [];
    for (const [type, name] of Object.entries(TYPES) as [Reference['type'], string][]) {
      const piece = document.createElement('piece');
      piece.className = `white ${name}`;
      host.appendChild(piece);
      const url = getComputedStyle(piece).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
      if (url) refs.push({ type, mask: maskFromAlpha(await rasterize(url, 96)) });
    }
    host.remove();
    return refs;
  })().catch(error => { cached = null; throw error; });
  return cached;
}

function rasterize(url: string, size: number): Promise<Pixels> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0, size, size);
      resolve(context.getImageData(0, 0, size, size));
    };
    image.onerror = () => reject(new Error('No se pudo leer la pieza de referencia'));
    image.src = url;
  });
}

/** Decodes an image file or pasted blob, scaled down so detection stays fast. */
export function imagePixels(blob: Blob, maxSide = 1100): Promise<Pixels> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(context.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Esa imagen no se puede leer')); };
    image.src = url;
  });
}

const urls = new Map<string, string>();
/** Image URL of a piece in the board's set, read once from Chessground's stylesheet. */
export function pieceUrl(white: boolean, name: string): string {
  const key = `${white ? 'white' : 'black'} ${name}`;
  const hit = urls.get(key);
  if (hit !== undefined) return hit;
  const host = document.createElement('div');
  host.className = 'cg-wrap';
  host.style.cssText = 'position:absolute;left:-9999px;width:10px;height:10px';
  const piece = document.createElement('piece');
  piece.className = key;
  host.appendChild(piece); document.body.appendChild(host);
  const url = getComputedStyle(piece).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1] ?? '';
  host.remove();
  urls.set(key, url);
  return url;
}
