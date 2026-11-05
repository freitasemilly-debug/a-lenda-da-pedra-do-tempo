import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Game, buildLevel, TILE, VH, QUESTION } from "./engine";

const context = new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D;
const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
type Harness = {
  level: ReturnType<typeof buildLevel>; character: string; status: string; lives: number;
  p: { x: number; y: number; w: number; h: number; vx: number; vy: number; inv: number; onGround: boolean; coyote: number };
  loadWorld(world: number, reset: boolean): void; update(): void;
};

describe("solid wooden bridges and safe obstacle surfaces", () => {
  for (const hero of ["leo", "luna"]) for (const world of [1,2,3]) {
    test(`${hero}, world ${world}: land, jump and walk every bridge without losing lives`, () => {
      const instance = new Game(canvas, () => {});
      const g = instance as unknown as Harness;
      g.loadWorld(world, true); g.character = hero; g.status = "playing";
      assert.ok(g.level.bridges.length > 0);
      // Isolate terrain from enemy encounters, not from gravity or collisions.
      g.level.enemies.forEach(e => { e.dead = true; });
      for (const b of g.level.bridges) {
        for (let dx = 2; dx < b.w; dx += 8) {
          g.p.x = b.x + dx - g.p.w/2; g.p.y = b.y - g.p.h - 1;
          g.p.vy = 2; g.p.vx = 0; g.p.inv = 10000;
          g.update();
          assert.equal(g.p.y + g.p.h, b.y);
          assert.equal(g.p.onGround, true);
          assert.equal(g.lives, 3);
        }
        // Existing suspended tiles may intentionally cap the jump or catch its descent.
        g.p.x = b.x + b.w/2; g.p.y = b.y - g.p.h; g.p.vx = 0; g.p.vy = 0;
        g.p.onGround = true; g.p.coyote = 7;
        instance.setInput("jump", true); g.update();
        for(let i=0;i<60;i++) g.update();
        instance.setInput("jump", false);
        assert.ok(g.p.y + g.p.h <= b.y);
        assert.equal(g.lives, 3);
        g.p.x = b.x + 4; g.p.y = b.y - g.p.h; g.p.vx = 0; g.p.vy = 0;
        instance.setInput("right", true);
        for(let i=0;i<Math.ceil((b.w-g.p.w-4)/4.8)+7;i++) {
          g.update();
          assert.equal(g.lives, 3);
          assert.equal(g.status, "playing");
          assert.ok(g.p.y < VH);
        }
        instance.setInput("right", false);
        assert.ok(g.p.x + g.p.w >= b.x + b.w - 1);
      }
    });
    test(`${hero}, world ${world}: question blocks leave walking clearance`, () => {
      const level = buildLevel(world);
      for(const [i,t] of level.grid.entries()) {
        if(t !== QUESTION) continue;
        assert.equal(level.grid[i+level.cols], 0);
        assert.equal(level.grid[i+2*level.cols], 0);
        assert.ok(2*TILE >= 34);
      }
    });
  }
  test("falling outside a bridge still uses the existing life-loss rule", () => {
    const g = new Game(canvas,()=>{}) as unknown as Harness;
    g.status = "playing"; g.p.x = 0; g.p.y = VH+121;
    g.update(); assert.equal(g.lives,2); assert.equal(g.status,"dead");
    g.update(); assert.equal(g.lives,2);
  });
});