import { describe, expect, it } from 'vitest';
import { cellsFromPlacement, detectBoard, inferCastling, MASK, placementFromCells, readBoard, type Pixels, type Reference } from './vision';

/** Synthetic screenshot: margin, a two-colour 8×8 board, and square or tall-bar "pieces". */
function synthetic(placement: string, cell = 40, margin = 37, flip = false): Pixels {
  const size = cell * 8 + margin * 2;
  const data = new Uint8ClampedArray(size * size * 4);
  const cells = cellsFromPlacement(placement);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    let color = [250, 250, 250];
    const bx = x - margin, by = y - margin;
    if (bx >= 0 && by >= 0 && bx < cell * 8 && by < cell * 8) {
      const file = Math.floor(bx / cell), rank = Math.floor(by / cell);
      color = (file + rank) % 2 ? [181, 136, 99] : [240, 217, 181];
      const [r, f] = flip ? [7 - rank, 7 - file] : [rank, file];
      const piece = cells[r][f];
      if (piece) {
        const lx = bx % cell, ly = by % cell;
        const tall = piece.toLowerCase() === 'k';
        const inside = tall ? lx > 15 && lx < 25 && ly > 4 && ly < 36 : lx > 8 && lx < 32 && ly > 14 && ly < 34;
        const outline = tall ? lx > 13 && lx < 27 && ly > 2 && ly < 38 : lx > 6 && lx < 34 && ly > 12 && ly < 36;
        if (outline) color = piece === piece.toUpperCase() ? (inside ? [255, 255, 255] : [20, 20, 20]) : [25, 25, 25];
      }
    }
    data.set([...color, 255], i);
  }
  return { width: size, height: size, data };
}

function refMask(kind: 'bar' | 'block') {
  const mask = new Float32Array(MASK * MASK);
  for (let y = 0; y < MASK; y++) for (let x = 0; x < MASK; x++) mask[y * MASK + x] = kind === 'block' ? (y > 1 && y < 22 ? 1 : 0) : (x > 7 && x < 17 ? 1 : 0);
  return mask;
}
// Stand-ins for the rendered piece set: kings as tall bars, pawns as blocks.
const refs: Reference[] = [{ type: 'k', mask: refMask('bar') }, { type: 'p', mask: refMask('block') }];

describe('board vision', () => {
  const placement = '4k3/pppp4/8/8/8/8/4PPPP/4K3';

  it('finds the board inside a screenshot', () => {
    const box = detectBoard(synthetic(placement))!;
    expect(box).not.toBeNull();
    expect(Math.abs(box.x - 37)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y - 37)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.size - 320)).toBeLessThanOrEqual(8);
  });

  it('reads occupancy, colour and silhouette', () => {
    const img = synthetic(placement);
    const { cells, flipped } = readBoard(img, detectBoard(img)!, refs);
    expect(flipped).toBe(false);
    expect(placementFromCells(cells.map(row => row.map(cell => cell.piece)))).toBe(placement);
  });

  it('turns a board seen from Black around', () => {
    const img = synthetic(placement, 40, 37, true);
    const { cells, flipped } = readBoard(img, detectBoard(img)!, refs);
    expect(flipped).toBe(true);
    expect(placementFromCells(cells.map(row => row.map(cell => cell.piece)))).toBe(placement);
  });

  it('infers castling rights from home squares', () => {
    expect(inferCastling(cellsFromPlacement('r3k2r/8/8/8/8/8/8/R3K2R'))).toBe('KQkq');
    expect(inferCastling(cellsFromPlacement('4k3/8/8/8/8/8/8/4K2R'))).toBe('K');
  });
});
