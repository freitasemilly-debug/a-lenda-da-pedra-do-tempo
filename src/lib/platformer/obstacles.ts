/** Collision-owned environmental challenges. Coordinates are shared with the painter. */
export interface Obstacle {
  kind: "crate" | "log" | "rock" | "temporary" | "trap" | "water";
  x: number; y: number; w: number; h: number;
  ax: number; ay: number; range: number; phase: number;
  dx: number; dy: number; timer: number; hidden: number;
}

export function buildObstacles(grid: Uint8Array, cols: number, world: number, reserved: readonly number[]): Obstacle[] {
  const result: Obstacle[] = [];
  const ground = (x: number) => {
    for (let y = 0; y < 17; y++) if (grid[y * cols + x] === 1) return y;
    return -1;
  };
  const kinds: Obstacle["kind"][] = world === 1
    ? ["crate", "log", "temporary", "rock", "trap"]
    : world === 2 ? ["rock", "temporary", "trap", "crate", "log"]
      : ["trap", "rock", "log", "temporary", "crate"];
  for (let cx = 7; cx < cols - 38; cx++) {
    const row = ground(cx);
    if (row < 4 || reserved.some(x => x / 32 >= cx - 1 && x / 32 <= cx + 4)) continue;
    if (![0, 1, 2, 3].every(dx => ground(cx + dx) === row)) continue;
    // Do not narrow a corridor or obstruct any existing collectible or enemy.
    if (![0, 1, 2, 3].every(dx => [1, 2, 3].every(dy => !grid[(row - dy) * cols + cx + dx]))) continue;
    const kind = kinds[result.length % kinds.length] ?? "crate";
    const x = (cx + 1) * 32, base = row * 32;
    const h = kind === "crate" ? 32 : kind === "log" ? 24 : kind === "trap" ? 18 : 16;
    const y = base - (kind === "temporary" || kind === "rock" ? 64 : h);
    result.push({ kind, x, y, w: kind === "crate" ? 32 : kind === "log" ? 40 : 64, h,
      ax: x, ay: y, range: kind === "log" || kind === "rock" ? 32 : 0,
      phase: result.length * 37, dx: 0, dy: 0, timer: 0, hidden: 0 });
    cx += 8;
  }
  return result;
}

export function updateObstacles(obstacles: Obstacle[], world: number) {
  for (const o of obstacles) {
    const x = o.x, y = o.y;
    o.phase++;
    if (o.kind === "log" || o.kind === "rock") o.x = o.ax + Math.sin(o.phase * (.018 + world * .003)) * o.range;
    if (o.hidden > 0) o.hidden--;
    if (o.timer > 0 && --o.timer === 0) o.hidden = 180;
    o.dx = o.x - x; o.dy = o.y - y;
  }
}

export const solidObstacle = (o: Obstacle) => !o.hidden && ["crate", "rock", "temporary"].includes(o.kind);
export const dangerousObstacle = (o: Obstacle) => o.kind === "log" || o.kind === "water" || (o.kind === "trap" && o.phase % 240 >= 120 && o.phase % 240 < 180);

export function landOnSurface(body: { x: number; y: number; w: number; h: number; vy: number }, oldFeet: number,
  surface: { x: number; y: number; w: number; h: number }, oldTop = surface.y) {
  if (body.x + body.w <= surface.x || body.x >= surface.x + surface.w || oldFeet > oldTop + .5 || body.y + body.h < surface.y) return false;
  body.y = surface.y - body.h; body.vy = 0;
  return true;
}