export interface Bridge { x: number; y: number; w: number; h: number }

/** Collision-owned bridge spans; rendering must use these exact top surfaces. */
export function buildBridges(grid: Uint8Array, cols: number): Bridge[] {
  const tile = 32, rows = 17;
  const pit = (x: number) => {
    for (let y = 0; y < rows; y++) if (grid[y * cols + x] === 1) return false;
    return true;
  };
  const bridges: Bridge[] = [];
  for (let x = 1; x < cols - 1; x++) {
    if (!pit(x)) continue;
    const from = x;
    while (x < cols - 1 && pit(x)) x++;
    if (pit(from - 1) || pit(x)) continue;
    const bankTop = (col: number) => {
      for (let y = 0; y < rows; y++) if (grid[y * cols + col] === 1) return y * tile;
      return 416;
    };
    // Align the deck with the banks: a safe landing must never become an inescapable pit.
    bridges.push({ x: from * tile, y: Math.min(bankTop(from - 1), bankTop(x)), w: (x - from) * tile, h: 10 });
  }
  return bridges;
}