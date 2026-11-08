import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRanking, clearRanking } from "./ranking";

test("reading ranking preserves saved scores and clearing remains explicit",()=>{
  const saved=JSON.stringify([{name:"Ana",score:120,hero:"luna",date:1},{name:"Beto",score:900,hero:"leo",date:2}]);
  let raw:string|null=saved;
  const prior=globalThis.window;
  Object.defineProperty(globalThis,"window",{configurable:true,value:{localStorage:{getItem:()=>raw,removeItem:()=>{raw=null;}}}});
  try {assert.deepEqual(loadRanking().map(r=>r.score),[900,120]);assert.equal(raw,saved);clearRanking();assert.equal(raw,null);assert.deepEqual(loadRanking(),[]);}
  finally {Object.defineProperty(globalThis,"window",{configurable:true,value:prior});}
});