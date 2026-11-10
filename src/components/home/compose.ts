// Layout composition for the homepage's curated tile galleries.
//
// The content behind these galleries is dynamic (categories and use-case
// pages come from the CMS), so layouts are GENERATED from the item count
// instead of hard-coding a six-tile design. Every function below returns
// spans that exactly tile the grid rectangle: no holes for any count.
//
// A "Place" is the desktop (lg) footprint of one tile in a grid of
// `cols` columns; rows are in the grid's fixed row-height units.

export type Place = { cols: number; rows: number };

// Splits `rem` leftover tiles into full-width rows, each exactly filling
// `total` columns. `widths[k]` = column widths for a row holding k tiles.
function fillRows(rem: number, rowHeight: number, widths: Record<number, number[]>, maxPerRow: number): Place[] {
  const out: Place[] = [];
  let left = rem;
  while (left > 0) {
    // Leave at least two for the next row rather than orphaning a single
    // tile after a full row, when a more even split is possible.
    let take = Math.min(left, maxPerRow);
    if (left > maxPerRow && left - take === 1) take = maxPerRow - 1;
    widths[take].forEach((w) => out.push({ cols: w, rows: rowHeight }));
    left -= take;
  }
  return out;
}

// 12-column gallery (Shop the Pantry).
//   1: one wide banner        2: halves             3: feature + 2 stacked
//   4: 7/5 + 5/7 offset rows  5: feature + 2x2      6+: the 5-tile block, then
//   full-width rows for the rest (so 6 = block + one wide banner).
export function composePantry(n: number): Place[] {
  if (n <= 0) return [];
  if (n === 1) return [{ cols: 12, rows: 4 }];
  if (n === 2) return [{ cols: 6, rows: 4 }, { cols: 6, rows: 4 }];
  if (n === 3) return [{ cols: 6, rows: 4 }, { cols: 6, rows: 2 }, { cols: 6, rows: 2 }];
  if (n === 4) return [{ cols: 7, rows: 3 }, { cols: 5, rows: 3 }, { cols: 5, rows: 3 }, { cols: 7, rows: 3 }];
  const block: Place[] = [{ cols: 6, rows: 4 }, ...Array.from({ length: 4 }, () => ({ cols: 3, rows: 2 }))];
  return [
    ...block,
    ...fillRows(n - 5, 2, { 1: [12], 2: [6, 6], 3: [4, 4, 4], 4: [3, 3, 3, 3] }, 4)
  ];
}

// 4-column gallery (Shop by Need).
//   1: one banner   2: two wide   3: feature + 2 stacked   4: 2x2
//   5: feature + 2x2 small   6+: that block, then full-width rows.
export function composeNeeds(n: number): Place[] {
  if (n <= 0) return [];
  if (n === 1) return [{ cols: 4, rows: 2 }];
  if (n === 2) return [{ cols: 2, rows: 2 }, { cols: 2, rows: 2 }];
  if (n === 3) return [{ cols: 2, rows: 2 }, { cols: 2, rows: 1 }, { cols: 2, rows: 1 }];
  if (n === 4) return [{ cols: 2, rows: 1 }, { cols: 2, rows: 1 }, { cols: 2, rows: 1 }, { cols: 2, rows: 1 }];
  const block: Place[] = [{ cols: 2, rows: 2 }, ...Array.from({ length: 4 }, () => ({ cols: 1, rows: 1 }))];
  return [...block, ...fillRows(n - 5, 1, { 1: [4], 2: [2, 2], 3: [2, 1, 1] }, 3)];
}

// Self-check used in development: every composition must fill its grid
// with no gaps. Simulates the browser's row-major auto-placement.
export function fillsGrid(places: Place[], totalCols: number): boolean {
  const grid: boolean[][] = [];
  const free = (r: number, c: number) => !(grid[r] && grid[r][c]);
  for (const p of places) {
    let placed = false;
    for (let r = 0; !placed && r < 200; r++) {
      for (let c = 0; c + p.cols <= totalCols && !placed; c++) {
        let ok = true;
        for (let dr = 0; ok && dr < p.rows; dr++) for (let dc = 0; ok && dc < p.cols; dc++) if (!free(r + dr, c + dc)) ok = false;
        if (ok) {
          for (let dr = 0; dr < p.rows; dr++) for (let dc = 0; dc < p.cols; dc++) (grid[r + dr] ||= [])[c + dc] = true;
          placed = true;
        }
      }
    }
  }
  const rows = grid.length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < totalCols; c++) if (!grid[r]?.[c]) return false;
  return true;
}
