import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildLevel, Game, TILE, ROWS } from "./engine";
import baseline from "./simulation-baseline.json";
import { drawSceneryBackground, drawSceneryTerrain, drawSceneryMovers } from "./scenery";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const fixtures = [
  "1fabef81c8e6c7cdfbc2de52b99167eb0f9c8de6e7b42f55a126654044db7386",
  "f64c76dc073e5d7b0d48ae0d367077b080787d82b0c200aac088e7aed1a06978",
  "8c332bc9312f6336d68c0f93a5b4169252f9ca789ce8454a484570c7f62c6f12",
];
// Canvas spy: drawing calls are inert, so the test isolates data mutation.
const context = new Proxy({}, { get: (_, key) => key === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => {} }) as CanvasRenderingContext2D;
const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
interface Harness {
  level: ReturnType<typeof buildLevel>;
  p: { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean; coyote: number; inv: number };
  status: string;
  character: string;
  loadWorld(w: number, reset: boolean): void;
  update(): void;
  collideY(o: { x: number; y: number; w: number; h: number; vy: number }): boolean;
  collideX(o: { x: number; y: number; w: number; h: number; vx: number }): boolean;
}

describe("Scenery preserves the existing game", () => {
  for (const world of [1, 2, 3]) {
    test(`world ${world}: all geometry, items, enemies, movers and exits match the original`, () => {
      assert.equal(hash(JSON.stringify(buildLevel(world))), fixtures[world - 1]);
    });
    test(`world ${world}: every exposed surface retains its exact landing height`, () => {
      const game = new Game(canvas, () => {}) as unknown as Harness;
      game.loadWorld(world, true);
      const level = game.level;
      let landings = 0;
      for (let x = 0; x < level.cols; x++) for (let y = 0; y < ROWS; y++) {
        if (!level.grid[y * level.cols + x] || (y > 0 && level.grid[(y - 1) * level.cols + x])) continue;
        const body = { x: x * TILE + 4, y: y * TILE - 34 + 1, w: 24, h: 34, vy: 1 };
        assert.equal(game.collideY(body), true);
        assert.equal(body.y + body.h, y * TILE);
        assert.equal(body.vy, 0);
        landings++;
      }
      assert.ok(landings > 100);
    });
    test(`world ${world}: scenery never changes gameplay data`, () => {
      const level = buildLevel(world);
      const before = JSON.stringify(level);
      const previousDocument = globalThis.document;
      const previousStyle = globalThis.getComputedStyle;
      Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: {} } });
      globalThis.getComputedStyle = (() => ({ getPropertyValue: () => "oklch(0.5 0.1 140)" })) as unknown as typeof getComputedStyle;
      try {
        for (const cam of [0, 1700, 4100, level.cols * TILE - 960]) {
          drawSceneryBackground(context, world, cam, 180);
          drawSceneryTerrain(context, level, world, cam);
          drawSceneryMovers(context, level.movers, world, cam);
        }
        assert.equal(JSON.stringify(level), before);
      } finally {
        Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
        globalThis.getComputedStyle = previousStyle;
      }
    });
  }
  test("every existing simulation, input and collision method is unchanged", () => {
    for (const [name, original] of Object.entries(baseline)) {
      const method = Reflect.get(Game.prototype, name) as () => unknown;
      assert.equal(hash(method.toString()), original);
    }
  });
  for (const hero of ["leo", "luna"]) test(`${hero}: normal input still runs and jumps with the original physics`, () => {
    const instance = new Game(canvas, () => {});
    const game = instance as unknown as Harness;
    game.status = "playing";
    game.character = hero;
    for (let i = 0; i < 20; i++) game.update();
    assert.equal(game.p.onGround, true);
    assert.equal(game.p.y + game.p.h, 416);
    instance.setInput("right", true);
    for (let i = 0; i < 10; i++) game.update();
    assert.equal(game.p.vx, 4.8);
    instance.setInput("right", false);
    instance.setInput("jump", true);
    const start = game.p.y;
    game.update();
    assert.equal(game.p.vy, -12.42);
    let apex = game.p.y;
    for (let i = 0; i < 40; i++) { game.update(); apex = Math.min(apex, game.p.y); }
    assert.ok(start - apex > 100);
    assert.equal(game.p.y + game.p.h, 416);
    assert.equal(game.p.onGround, true);
  });
});