/** Collision-owned environmental challenges. Coordinates are shared with the painter. */
export interface Obstacle {
  kind: "crate" | "log" | "rock" | "temporary" | "trap" | "water";
  x: number; y: number; w: number; h: number;
  ax: number; ay: number; range: number; phase: number;
  dx: number; dy: number; timer: number; hidden: number;
}

export function buildObstacles(
  grid: Uint8Array,
  cols: number,
  world: number,
  reserved: readonly number[]
): Obstacle[] {
  return [];
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
