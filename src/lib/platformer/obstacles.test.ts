import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Game, buildLevel, TILE } from "./engine";
import { updateObstacles, solidObstacle, dangerousObstacle, landOnSurface } from "./obstacles";

const context = new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D;
const canvas = { getContext: () => context } as unknown as HTMLCanvasElement;
type Harness = { level: ReturnType<typeof buildLevel>; p: { x:number;y:number;w:number;h:number;vx:number;vy:number;onGround:boolean;coyote:number;inv:number }; status:string;lives:number; loadWorld(w:number,r:boolean):void;update():void; };

describe("Functional environmental challenges", () => {
  for (const world of [1,2,3]) {
    test(`world ${world}: all six environmental kinds and both mover directions exist`, () => {
      const l = buildLevel(world);
      for (const kind of ["crate","log","rock","temporary","trap","water"]) assert.ok(l.obstacles.some(o=>o.kind===kind), kind);
      assert.ok(l.movers.some(m=>m.vert===true)); assert.ok(l.movers.some(m=>m.vert===false));
      assert.ok(l.obstacles.at(-1));
      const xs = l.obstacles.filter(o=>o.kind!=="water").map(o=>o.x);
      assert.ok(Math.max(...xs)-Math.min(...xs)>l.cols*TILE*.5);
    });
    test(`world ${world}: bridges have recoverable exits and solid full spans`, () => {
      const g = new Game(canvas,()=>{}) as unknown as Harness;
      g.loadWorld(world,true);g.status="playing";
      g.level.enemies.forEach(e=>e.dead=true);
      for (const b of g.level.bridges) {
        for (const col of [b.x/TILE-1,(b.x+b.w)/TILE]) {
          const row = Array.from({length:17},(_,y)=>y).find(y=>g.level.grid[y*g.level.cols+col]===1);
          assert.ok(row!==undefined); if(row===undefined)continue;
          assert.ok(b.y-row*TILE<=64);
        }
        for(let dx=1;dx<b.w;dx+=8) {
          g.p.x=b.x+dx-g.p.w/2;g.p.y=b.y-g.p.h-12;g.p.vy=12;g.p.vx=0;g.p.inv=9999;
          for(let n=0;n<4;n++)g.update();
          assert.equal(g.p.y+g.p.h,b.y);assert.equal(g.lives,3);
        }
      }
    });
    for (const hero of ["leo","luna"]) test(`${hero}, world ${world}: ride a full horizontal and vertical mover cycle`, () => {
      for(const vertical of [false,true]) {
        const g = new Game(canvas,()=>{}) as unknown as Harness;
        g.loadWorld(world,true);g.status="playing";g.level.enemies=[];g.level.obstacles=[];g.level.bridges=[];g.level.grid.fill(0);
        const m = g.level.movers.find(m=>m.vert===vertical);assert.ok(m);if(!m)continue;
        g.level.movers=[m];g.p.x=m.x+20;g.p.y=m.y-g.p.h;g.p.vy=0;g.p.vx=0;g.p.onGround=true;g.p.inv=9999;
        const relative=g.p.x-m.x;
        for(let n=0;n<260;n++){g.update();assert.equal(g.p.y+g.p.h,m.y);assert.ok(Math.abs(g.p.x-m.x-relative)<.001);assert.equal(g.lives,3);}
      }
    });
  }
  test("temporary platforms disappear after 2.5 seconds of contact and return after 3 seconds",()=>{
    const o=buildLevel(1).obstacles.find(o=>o.kind==="temporary");assert.ok(o);if(!o)return;
    o.timer=150;for(let n=0;n<149;n++)updateObstacles([o],1);assert.equal(solidObstacle(o),true);
    updateObstacles([o],1);assert.equal(o.hidden,180);assert.equal(solidObstacle(o),false);
    for(let n=0;n<180;n++)updateObstacles([o],1);assert.equal(solidObstacle(o),true);
  });
  test("logs and stones move, traps have warning and safe intervals",()=>{
    const os=buildLevel(1).obstacles;const log=os.find(o=>o.kind==="log"),rock=os.find(o=>o.kind==="rock"),trap=os.find(o=>o.kind==="trap");
    assert.ok(log&&rock&&trap);if(!log||!rock||!trap)return;
    const x=log.x,rx=rock.x;updateObstacles(os,1);assert.notEqual(log.x,x);assert.notEqual(rock.x,rx);
    trap.phase=100;assert.equal(dangerousObstacle(trap),false);trap.phase=130;assert.equal(dangerousObstacle(trap),true);trap.phase=190;assert.equal(dangerousObstacle(trap),false);
  });
  test("one-way surfaces never snap a hero arriving from underneath",()=>{
    const b={x:10,y:115,w:24,h:34,vy:2};assert.equal(landOnSurface(b,147,{x:0,y:100,w:100,h:16}),false);assert.equal(b.y,115);
  });
});