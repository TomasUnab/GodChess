/**
 * Reads a chess position from a screenshot of a digital board, in the spirit of
 * tensorflow_chessbot but without a neural network: the board is found from the
 * periodic edges of its 8×8 grid, each square's piece is separated from the
 * square colour, and its silhouette is matched against reference pieces.
 * Works for flat digital boards (Lichess, Chess.com, PDFs); photos are out of scope.
 */
export type Pixels = { width: number; height: number; data: Uint8ClampedArray | number[] };
export type BoardBox = { x: number; y: number; size: number; score: number };
export type PieceCode = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
export type Cell = { piece: PieceCode | null; confidence: number };
export const MASK = 24;
export type Reference = { type: 'k' | 'q' | 'r' | 'b' | 'n' | 'p'; mask: Float32Array };

const lum = (img: Pixels, x: number, y: number) => { const i = (y * img.width + x) * 4; return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; };
const rgb = (img: Pixels, x: number, y: number) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };

/** Sum of edge strength per column and per row. */
function profiles(img: Pixels) {
  const gx = new Float64Array(img.width); const gy = new Float64Array(img.height);
  for (let y = 0; y < img.height - 1; y++) {
    for (let x = 0; x < img.width - 1; x++) {
      const here = lum(img, x, y);
      gx[x] += Math.abs(lum(img, x + 1, y) - here);
      gy[y] += Math.abs(lum(img, x, y + 1) - here);
    }
  }
  return { gx, gy };
}

/** Best run of 7 equally spaced internal grid lines along one axis, for a given cell size. */
function bestOffset(profile: Float64Array, cell: number) {
  const mean = profile.reduce((a, b) => a + b, 0) / profile.length || 1;
  let best = { offset: 0, score: -Infinity };
  const span = cell * 8;
  for (let offset = 0; offset + span <= profile.length; offset++) {
    let score = 0; let weakest = Infinity;
    for (let k = 1; k < 8; k++) {
      const at = Math.round(offset + k * cell) - 1;
      const value = Math.max(profile[at] ?? 0, profile[at - 1] ?? 0, profile[at + 1] ?? 0);
      score += value; weakest = Math.min(weakest, value);
    }
    // A real grid has all seven lines; reward the weakest one so one strong edge can't win.
    const total = (score / 7 + weakest) / (2 * mean);
    if (total > best.score) best = { offset, score: total };
  }
  return best;
}

/** Finds the board: the square whose 7×7 internal grid lines carry the strongest periodic edges. */
export function detectBoard(img: Pixels): BoardBox | null {
  const { gx, gy } = profiles(img);
  const shortest = Math.min(img.width, img.height);
  let best: BoardBox | null = null;
  for (let cell = Math.max(8, shortest * 0.25 / 8); cell <= shortest / 8; cell += 0.5) {
    const bx = bestOffset(gx, cell); const by = bestOffset(gy, cell);
    const score = bx.score + by.score;
    // Prefer the larger board when scores tie: sub-grids of a real board also score.
    if (!best || score > best.score * 1.02 || (score > best.score * 0.97 && cell * 8 > best.size)) best = { x: bx.offset, y: by.offset, size: cell * 8, score };
  }
  return best && best.score > 2.2 ? best : null;
}

type Palette = number[][];
/**
 * A colour belongs to the board if it is close to a palette colour or to the
 * blend between two of them: antialiased texture edges (hatching) are such blends.
 */
function near(palette: Palette, color: number[], tolerance: number) {
  const dist = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  for (let i = 0; i < palette.length; i++) {
    if (dist(palette[i], color) <= tolerance) return true;
    for (let j = i + 1; j < palette.length; j++) {
      const a = palette[i], b = palette[j];
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const length = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (!length) continue;
      const t = Math.max(0, Math.min(1, ((color[0] - a[0]) * ab[0] + (color[1] - a[1]) * ab[1] + (color[2] - a[2]) * ab[2]) / length));
      if (dist([a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]], color) <= tolerance * 0.6) return true;
    }
  }
  return false;
}

/** Keeps only the largest 8-connected blob: stray texture specks never touch the piece's body. */
function largestComponent(on: Uint8Array, size: number) {
  const label = new Int32Array(on.length);
  let best = 0, bestSize = 0, next = 0;
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || label[start]) continue;
    next++; let count = 0; const stack = [start]; label[start] = next;
    while (stack.length) {
      const index = stack.pop()!; count++;
      const x = index % size, y = (index - x) / size;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const n = ny * size + nx;
        if (on[n] && !label[n]) { label[n] = next; stack.push(n); }
      }
    }
    if (count > bestSize) { bestSize = count; best = next; }
  }
  const kept = new Uint8Array(on.length);
  for (let i = 0; i < on.length; i++) if (label[i] === best && best) kept[i] = 1;
  return kept;
}

/** Colours in the four corners of a square: pieces are centred and almost never reach them. */
function ringColors(img: Pixels, x0: number, y0: number, cell: number) {
  const colors: number[][] = [];
  const inset = Math.max(1, Math.round(cell * 0.03));
  const reach = Math.max(2, Math.round(cell * 0.14));
  for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    for (let dy = 0; dy < reach; dy += 1) for (let dx = 0; dx < reach; dx += 1) {
      const x = cx ? cell - inset - 1 - dx : inset + dx;
      const y = cy ? cell - inset - 1 - dy : inset + dy;
      colors.push(rgb(img, Math.min(img.width - 1, Math.round(x0 + x)), Math.min(img.height - 1, Math.round(y0 + y))));
    }
  }
  return colors;
}

/** Frequent colours of a set of samples, quantised: texture colours survive, stray text does not. */
function dominant(colors: number[][], share: number): Palette {
  const counts = new Map<string, { color: number[]; n: number }>();
  for (const color of colors) {
    const key = color.map(v => v >> 4).join(',');
    const entry = counts.get(key) ?? { color, n: 0 };
    entry.n++; counts.set(key, entry);
  }
  return [...counts.values()].filter(entry => entry.n >= colors.length * share).map(entry => entry.color);
}

export type SquareRead = { occupied: boolean; white: boolean; mask: Float32Array; fill: number; bright?: number; dark?: number };

/**
 * Separates the piece from the square: pixels far from every board colour
 * (the square's own ring plus the light or dark square palette) are piece;
 * enclosed holes are filled so a white piece on a light square keeps its body.
 */
export function readSquare(img: Pixels, box: BoardBox, file: number, rank: number, palette: Palette = []): SquareRead {
  const cell = box.size / 8;
  const x0 = box.x + file * cell; const y0 = box.y + rank * cell;
  const local = [...palette, ...dominant(ringColors(img, x0, y0, cell), 0.2)];
  const pad = Math.max(1, Math.round(cell * 0.04));
  const size = Math.max(4, Math.floor(cell) - 2 * pad);
  const ink = new Uint8Array(size * size);
  const lums = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = Math.min(img.width - 1, Math.round(x0 + pad + x)); const py = Math.min(img.height - 1, Math.round(y0 + pad + y));
    const color = rgb(img, px, py);
    lums[y * size + x] = lum(img, px, py);
    if (!near(local, color, 54)) ink[y * size + x] = 1;
  }
  // Flood the outside from the square's border through non-piece pixels; whatever is left is the piece.
  const outside = new Uint8Array(size * size);
  const queue: number[] = [];
  for (let i = 0; i < size; i++) for (const index of [i, (size - 1) * size + i, i * size, i * size + size - 1]) if (!ink[index] && !outside[index]) { outside[index] = 1; queue.push(index); }
  while (queue.length) {
    const index = queue.pop()!; const x = index % size, y = (index - x) / size;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const next = ny * size + nx;
      if (!outside[next] && !ink[next]) { outside[next] = 1; queue.push(next); }
    }
  }
  const raw = new Uint8Array(size * size);
  for (let i = 0; i < raw.length; i++) if (!outside[i]) raw[i] = 1;
  const on = largestComponent(raw, size);
  let count = 0, bright = 0, dark = 0;
  for (let i = 0; i < on.length; i++) if (on[i]) { count++; if (lums[i] > 200) bright++; else if (lums[i] < 70) dark++; }
  const fill = count / (size * size);
  if (fill < 0.08 || fill > 0.92) return { occupied: false, white: false, mask: new Float32Array(MASK * MASK), fill };
  // White pieces are a light body inside a thin dark outline; black pieces are mostly dark.
  return { occupied: true, white: bright > dark * 0.5, mask: normalizeMask(on, size, size), fill, bright, dark };
}

/**
 * Silhouette scaled to fit MASK×MASK by its longer side and centred, so a tall
 * king stays tall and a squat pawn stays squat whatever the square size.
 */
export function normalizeMask(on: ArrayLike<number>, width: number, height: number): Float32Array {
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (on[y * width + x]) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const mask = new Float32Array(MASK * MASK);
  if (maxX < 0) return mask;
  const w = maxX - minX + 1, h = maxY - minY + 1, scale = Math.max(w, h) / MASK;
  const offX = (MASK - w / scale) / 2, offY = (MASK - h / scale) / 2;
  for (let my = 0; my < MASK; my++) for (let mx = 0; mx < MASK; mx++) {
    const sx = Math.floor(minX + (mx - offX + 0.5) * scale), sy = Math.floor(minY + (my - offY + 0.5) * scale);
    if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) mask[my * MASK + mx] = on[sy * width + sx] ? 1 : 0;
  }
  return mask;
}

/** Reference silhouette from a rendered piece image (alpha channel). */
export function maskFromAlpha(img: Pixels) {
  const on = new Uint8Array(img.width * img.height);
  for (let i = 0; i < on.length; i++) on[i] = img.data[i * 4 + 3] > 96 ? 1 : 0;
  return normalizeMask(on, img.width, img.height);
}

export function similarity(a: Float32Array, b: Float32Array) {
  let both = 0, either = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] > 0.5, y = b[i] > 0.5; if (x && y) both++; if (x || y) either++; }
  return either ? both / either : 0;
}

/**
 * Reads all 64 squares. Returns ranks from the top of the image down; if most
 * white pieces sit in the top half the image is shown from Black's side, so it is flipped.
 */
export function readBoard(img: Pixels, box: BoardBox, references: Reference[]): { cells: Cell[][]; flipped: boolean } {
  const grid: Cell[][] = [];
  let whiteTop = 0, whiteBottom = 0;
  // Board colours per square colour, from all 32 rings: covers textures such as hatched squares.
  const cell = box.size / 8;
  const rings: [number[][], number[][]] = [[], []];
  for (let rank = 0; rank < 8; rank++) for (let file = 0; file < 8; file++) rings[(file + rank) % 2].push(...ringColors(img, box.x + file * cell, box.y + rank * cell, cell));
  const palettes = rings.map(colors => dominant(colors, 0.06));
  for (let rank = 0; rank < 8; rank++) {
    const row: Cell[] = [];
    for (let file = 0; file < 8; file++) {
      const square = readSquare(img, box, file, rank, palettes[(file + rank) % 2]);
      if (!square.occupied) { row.push({ piece: null, confidence: 1 - square.fill }); continue; }
      const ranked = references.map(ref => ({ type: ref.type, score: similarity(square.mask, ref.mask) })).sort((a, b) => b.score - a.score);
      const type = ranked[0]?.type ?? 'p';
      const piece = (square.white ? type.toUpperCase() : type) as PieceCode;
      if (square.white) { if (rank < 4) whiteTop++; else whiteBottom++; }
      row.push({ piece, confidence: ranked.length > 1 ? ranked[0].score - ranked[1].score : ranked[0]?.score ?? 0 });
    }
    grid.push(row);
  }
  const flipped = whiteTop > whiteBottom;
  const cells = flipped ? grid.slice().reverse().map(row => row.slice().reverse()) : grid;
  return { cells, flipped };
}

/** FEN piece placement from rank 8 down, as `readBoard` returns it. */
export function placementFromCells(cells: (PieceCode | null)[][]) {
  return cells.map(row => {
    let out = ''; let empty = 0;
    for (const piece of row) { if (!piece) { empty++; continue; } if (empty) { out += empty; empty = 0; } out += piece; }
    return out + (empty ? empty : '');
  }).join('/');
}

export function cellsFromPlacement(placement: string): (PieceCode | null)[][] {
  return placement.split(' ')[0].split('/').map(row => row.split('').flatMap(ch => /\d/.test(ch) ? Array<null>(Number(ch)).fill(null) : [ch as PieceCode]));
}

/** Castling rights consistent with kings and rooks still on their home squares. */
export function inferCastling(cells: (PieceCode | null)[][]) {
  const at = (file: number, rank: number) => cells[rank][file];
  let rights = '';
  if (at(4, 7) === 'K') { if (at(7, 7) === 'R') rights += 'K'; if (at(0, 7) === 'R') rights += 'Q'; }
  if (at(4, 0) === 'k') { if (at(7, 0) === 'r') rights += 'k'; if (at(0, 0) === 'r') rights += 'q'; }
  return rights || '-';
}
