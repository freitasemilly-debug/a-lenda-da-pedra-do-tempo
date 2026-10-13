import { audio } from "./audio";
/* A Lenda da Pedra do Tempo — motor de plataforma 2D original (canvas, pixel art procedural) */

export const TILE = 32;
export const VW = 960;
export const VH = 544;
export const ROWS = VH / TILE; // 17

export const EMPTY = 0;
export const GROUND = 1;
export const BRICK = 2;
export const PLATFORM = 3;

export type Status = "ready" | "playing" | "dead" | "levelclear" | "gameover" | "win" | "paused";

export interface GameState {
  score: number;
  lives: number;
  coins: number;
  fragments: number;
  fragmentsTotal: number;
  world: number;
  worldName: string;
  status: Status;
  bossHp: number;
  bossMax: number;
  checkpoint: boolean;
  muted: boolean;
  bossVulnerable: boolean;
  bossDefeated: boolean;
  bossAttack: string;
  enemiesDefeated: number;
  fragmentsAll: number;
  timeSec: number;
}

interface Vec {
  x: number;
  y: number;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  kind: "walker" | "chaser" | "sentry";
  dead: boolean;
  t: number;
  startY: number;
}

interface Mover {
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  range: number;
  speed: number;
  t: number;
  px: number;
  py: number;
  vert?: boolean;
}

interface Pickup {
  x: number;
  y: number;
  taken: boolean;
  t: number;
}

interface Spike {
  x: number;
  y: number;
  w: number;
}

interface Checkpoint {
  x: number;
  y: number;
  on: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: string;
  s: number;
}

interface Boss {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  hurt: number;
  t: number;
  ground: number;
  active: boolean;
  defeated: boolean;
  phase: "idle" | "leap" | "orbs" | "rain" | "vuln" | "dying";
  pt: number;
  atk: number;
  dying: number;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  warn: number;
}

interface Level {
  grid: Uint8Array;
  cols: number;
  coins: Pickup[];
  fragments: Pickup[];
  enemies: Enemy[];
  movers: Mover[];
  spikes: Spike[];
  checkpoints: Checkpoint[];
  goalX: number;
  goalY: number;
  spawn: Vec;
  boss: Boss | null;
}

export const WORLDS = [
  {
    name: "Floresta Antiga",
    sky: ["#7fd7f0", "#c9f2d6"],
    far: "#5f9e8f",
    near: "#3d7a63",
    ground: "#7a4a24",
    grass: "#4fb04a",
    grassDark: "#2f7f36",
    brick: "#c2743c",
    brickDark: "#8c4d23",
    tree: "#2c6e4a",
  },
  {
    name: "Caverna de Cristal",
    sky: ["#f5a45c", "#f7dba0"],
    far: "#b9724f",
    near: "#8a4a3a",
    ground: "#c79155",
    grass: "#e8c37a",
    grassDark: "#b98f45",
    brick: "#a86a45",
    brickDark: "#78472c",
    tree: "#7a5233",
  },
  {
    name: "Castelo do Tempo",
    sky: ["#2b2350", "#5a3d87"],
    far: "#3c3068",
    near: "#241d44",
    ground: "#4a4470",
    grass: "#7f78c4",
    grassDark: "#565095",
    brick: "#6b5ea8",
    brickDark: "#453b75",
    tree: "#3a3168",
  },
];

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Level building ---------------- */

export function buildLevel(world: number): Level {
  const rng = mulberry32(1337 + world * 977);
  const cols = 230 + world * 35;
  const grid = new Uint8Array(cols * ROWS);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && x < cols && y >= 0 && y < ROWS) grid[y * cols + x] = v;
  };

  const coins: Pickup[] = [];
  const fragments: Pickup[] = [];
  const enemies: Enemy[] = [];
  const movers: Mover[] = [];
  const spikes: Spike[] = [];
  const checkpoints: Checkpoint[] = [];

  const addCoin = (cx: number, cy: number) =>
    coins.push({ x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2, taken: false, t: rng() * 6 });
  const addFrag = (cx: number, cy: number) =>
    fragments.push({ x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2, taken: false, t: rng() * 6 });
  const addEnemy = (cx: number, cy: number, kind: Enemy["kind"]) =>
    enemies.push({
      x: cx * TILE,
      y: cy * TILE - 28,
      w: 28,
      h: 28,
      vx: kind === "sentry" ? 0 : rng() < 0.5 ? -1.1 : 1.1,
      vy: 0,
      kind,
      dead: false,
      t: rng() * 10,
      startY: cy * TILE - 28,
    });

  const fillGround = (from: number, to: number, top: number) => {
    for (let x = from; x < to; x++) for (let y = top; y < ROWS; y++) set(x, y, GROUND);
  };
  const plat = (from: number, len: number, y: number) => {
    for (let x = from; x < from + len; x++) set(x, y, PLATFORM);
  };
  const bricks = (from: number, len: number, y: number) => {
    for (let x = from; x < from + len; x++) set(x, y, BRICK);
  };

  let x = 0;
  let top = 13;
  fillGround(0, 18, top);
  const spawn = { x: 3 * TILE, y: (top - 2) * TILE };
  x = 18;

  const bossLevel = world === 3;
  const endReserve = bossLevel ? 34 : 22;
  const cpMarks = [Math.floor(cols * 0.35), Math.floor(cols * 0.68)];
  let cpIndex = 0;

  while (x < cols - endReserve) {
    const roll = rng();
    if (cpIndex < cpMarks.length && x > cpMarks[cpIndex]!) {
      fillGround(x, x + 8, top);
      checkpoints.push({ x: (x + 3) * TILE, y: (top - 2) * TILE, on: false });
      x += 8;
      cpIndex++;
      continue;
    }

    if (roll < 0.16) {
      // vão com plataforma flutuante
      const gap = 3 + Math.floor(rng() * (2 + world));
      plat(x + 1, gap - 1, top - 2);
      for (let i = 1; i < gap - 1; i++) addCoin(x + i, top - 4);
      x += gap;
      fillGround(x, x + 6, top);
      x += 6;
    } else if (roll < 0.3) {
      // escada
      const steps = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < steps; i++) {
        const nt = Math.max(6, top - 1 - i);
        fillGround(x + i * 2, x + i * 2 + 2, nt);
        if (rng() < 0.6) addCoin(x + i * 2, nt - 2);
      }
      top = Math.max(6, top - steps + 1);
      x += steps * 2;
      fillGround(x, x + 6, top);
      if (rng() < 0.7) addEnemy(x + 3, top, "walker");
      x += 6;
    } else if (roll < 0.42) {
      // plataformas flutuantes em alturas variadas
      let px = x;
      let prevH = 0;
      for (let i = 0; i < 3; i++) {
        // altura relativa ao chão: 1..3 blocos, subindo no máximo 2 por salto
        const maxH = Math.min(3, prevH + 2);
        const h = 1 + Math.floor(rng() * maxH);
        prevH = h;
        const py = top - h;
        plat(px, 3, py);
        addCoin(px + 1, py - 2);
        if (rng() < 0.35) addEnemy(px + 1, py, "walker");
        px += 4 + (world >= 3 && rng() < 0.5 ? 1 : 0);
      }
      x = px;
      fillGround(x, x + 7, top);
      x += 7;
    } else if (roll < 0.53) {
      // plataforma móvel sobre o vazio
      const gap = 6 + Math.floor(rng() * 3);
      const vertical = rng() < 0.4;
      movers.push({
        x: (x + 1) * TILE,
        y: (top - 2) * TILE,
        w: TILE * 3,
        h: 16,
        ax: vertical ? (x + Math.floor((gap - 3) / 2)) * TILE : (x + 1) * TILE,
        ay: (top - 2) * TILE,
        range: vertical ? TILE * 1.2 : Math.max(1, (gap - 4) / 2) * TILE,
        vert: vertical,
        speed: 0.9 + world * 0.15,
        t: rng() * 6,
        px: 0,
        py: 0,
      });
      if (!vertical) movers[movers.length - 1]!.ax = (x + 1) * TILE + Math.max(1, (gap - 4) / 2) * TILE;
      for (let i = 1; i < gap; i += 2) addCoin(x + i, top - 5);
      x += gap;
      fillGround(x, x + 6, top);
      x += 6;
    } else if (roll < 0.63) {
      // espinhos (obstáculo)
      fillGround(x, x + 10, top);
      const sx = x + 3;
      spikes.push({ x: sx * TILE, y: (top - 1) * TILE + 16, w: TILE * 2 });
      bricks(sx - 1, 4, top - 3);
      for (let i = 0; i < 4; i++) addCoin(sx - 1 + i, top - 5);
      x += 10;
    } else if (roll < 0.74) {
      // área secreta alta com fragmento
      fillGround(x, x + 12, top);
      plat(x + 2, 4, top - 2);
      plat(x + 6, 3, top - 4);
      addFrag(x + 7, top - 6);
      addCoin(x + 3, top - 4);
      addCoin(x + 4, top - 4);
      if (rng() < 0.6) addEnemy(x + 9, top, "chaser");
      x += 12;
    } else if (roll < 0.85) {
      // corredor com inimigos
      fillGround(x, x + 14, top);
      addEnemy(x + 4, top, rng() < 0.5 ? "walker" : "chaser");
      addEnemy(x + 9, top, "walker");
      if (rng() < 0.5) addEnemy(x + 12, top, "sentry");
      for (let i = 0; i < 5; i++) addCoin(x + 3 + i, top - 3);
      x += 14;
    } else {
      // descida
      const drop = 1 + Math.floor(rng() * 3);
      top = Math.min(13, top + drop);
      fillGround(x, x + 10, top);
      bricks(x + 4, 3, top - 3);
      addCoin(x + 5, top - 5);
      if (rng() < 0.5) addEnemy(x + 7, top, "walker");
      x += 10;
    }

    // moedas soltas
    if (rng() < 0.5) addCoin(x - 2, top - 2);
  }

  // Fragmento garantido por fase (3 no total por fase)
  while (fragments.length < 3) {
    const fx = 30 + Math.floor(rng() * (cols - 70));
    let gy = -1;
    for (let y = 0; y < ROWS; y++) if (grid[y * cols + fx]) { gy = y; break; }
    if (gy < 4 || grid[(gy - 1) * cols + fx] || grid[(gy - 2) * cols + fx]) continue;
    addFrag(fx, gy - 2);
  }

  let boss: Boss | null = null;
  let goalX: number;
  let goalY: number;
  top = 13;
  if (bossLevel) {
    fillGround(x, cols, top);
    for (let y = 0; y < top; y++) set(cols - 1, y, BRICK);
    boss = {
      x: (cols - 14) * TILE,
      y: (top - 4) * TILE,
      w: 76,
      h: 96,
      vx: 0,
      vy: 0,
      hp: 5,
      hurt: 0,
      t: 0,
      ground: top * TILE,
      active: false,
      defeated: false,
      phase: "idle",
      pt: 0,
      atk: 0,
      dying: 0,
    };
    goalX = (cols - 4) * TILE;
    goalY = (top - 5) * TILE;
  } else {
    fillGround(x, cols, top);
    goalX = (cols - 10) * TILE;
    goalY = (top - 5) * TILE;
  }

  return {
    grid,
    cols,
    coins,
    fragments,
    enemies,
    movers,
    spikes,
    checkpoints,
    goalX,
    goalY,
    spawn,
    boss,
  };
}

/* ---------------- Audio ---------------- */

/* ---------------- Game ---------------- */

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onState: (s: GameState) => void;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private keys: { left: boolean; right: boolean; jump: boolean; attack: boolean } = {
    left: false,
    right: false,
    jump: false,
    attack: false,
  };
  private shots: Shot[] = [];
  private attackT = 0;
  private attackCd = 0;
  private enemiesKilled = 0;
  private fragsAll = 0;
  private playFrames = 0;
  private defeatMsg = 0;
  private attackHit = false;
  private shake = 0;
  private rings: { x: number; y: number; r: number; vr: number; life: number; max: number; c: string; w: number }[] = [];
  private sfx = audio;

  private level!: Level;
  private world = 1;
  private cam = 0;
  private frame = 0;
  private particles: Particle[] = [];
  private status: Status = "ready";
  private statusTimer = 0;

  private score = 0;
  private lives = 3;
  private coinsGot = 0;
  private fragsGot = 0;

  private p = {
    x: 0,
    y: 0,
    w: 24,
    h: 34,
    vx: 0,
    vy: 0,
    onGround: false,
    face: 1,
    coyote: 0,
    buffer: 0,
    inv: 0,
    anim: 0,
    stomp: 0,
    hurt: 0,
  };
  private respawn: Vec = { x: 0, y: 0 };
  private character: Hero = "leo";

  constructor(canvas: HTMLCanvasElement, onState: (s: GameState) => void) {
    this.canvas = canvas;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("canvas 2d indisponível");
    this.ctx = c;
    this.ctx.imageSmoothingEnabled = false;
    this.onState = onState;
    this.loadWorld(1, true);
  }

  /* ---- public API ---- */

  start() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emit();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.sfx.stopMusic();
  }

  setInput(name: "left" | "right" | "jump" | "attack", down: boolean) {
    this.keys[name] = down;
    if (name === "jump" && down) this.p.buffer = 8;
    if (name === "attack" && down) this.tryAttack();
  }

  togglePause() {
    if (this.status === "playing") {
      this.status = "paused";
      this.keys.left = this.keys.right = this.keys.jump = false;
    } else if (this.status === "paused") this.status = "playing";
    this.emit();
  }

  /** Volta para a tela inicial. */
  toMenu() {
    this.sfx.stopMusic();
    this.score = 0;
    this.lives = 3;
    this.coinsGot = 0;
    this.loadWorld(1, true);
    this.status = "ready";
    this.sfx.playMusic("menu");
    this.emit();
  }

  private tryAttack() {
    if (this.status !== "playing" || this.attackCd > 0) return;
    this.attackT = 18;
    this.attackCd = 24;
    this.attackHit = false;
    this.sfx.attack();
    const p = this.p;
    this.ring(p.x + p.w / 2, p.y + p.h / 2, "#8ef2ff", 2.2, 16, 3);
  }

  toggleMute() {
    this.sfx.muted = !this.sfx.muted;
    this.emit();
  }

  beginPlay() {
    if (this.status === "ready") {
      this.status = "playing";
      this.sfx.ensure();
      this.sfx.startMusic(this.world);
      this.emit();
    }
  }

  /** Nova partida com o personagem escolhido (mesma física para ambos). */
  newGame(hero: Hero) {
    this.character = hero;
    this.sfx.ensure();
    this.restart();
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.coinsGot = 0;
    this.fragsGot = 0;
    this.enemiesKilled = 0;
    this.fragsAll = 0;
    this.playFrames = 0;
    this.loadWorld(1, true);
    this.status = "playing";
    this.sfx.startMusic(1);
    this.emit();
  }

  /* ---- internals ---- */

  private emit() {
    this.onState({
      score: this.score,
      lives: this.lives,
      coins: this.coinsGot,
      fragments: this.fragsGot,
      fragmentsTotal: this.level.fragments.length,
      world: this.world,
      worldName: WORLDS[this.world - 1]!.name,
      status: this.status,
      bossHp: this.level.boss ? this.level.boss.hp : 0,
      bossMax: 5,
      checkpoint: this.level.checkpoints.some((c) => c.on),
      muted: this.sfx.muted,
      bossVulnerable: this.level.boss?.phase === "vuln",
      bossDefeated: this.defeatMsg > 0,
      bossAttack: this.level.boss?.active ? this.level.boss.phase : "",
      enemiesDefeated: this.enemiesKilled,
      fragmentsAll: this.fragsAll,
      timeSec: Math.floor(this.playFrames / 60),
    });
  }

  private loadWorld(w: number, reset: boolean) {
    this.world = w;
    this.level = buildLevel(w);
    this.respawn = { ...this.level.spawn };
    this.placePlayer(this.level.spawn);
    this.cam = 0;
    this.particles = [];
    this.shots = [];
    this.rings = [];
    this.shake = 0;
    this.defeatMsg = 0;
    if (reset) this.fragsGot = 0;
  }

  private placePlayer(v: Vec) {
    this.p.x = v.x;
    this.p.y = v.y;
    this.p.vx = 0;
    this.p.vy = 0;
    this.p.inv = 60;
    this.p.hurt = 0;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === "x" && !e.repeat) this.tryAttack();
    if (k === "p" && !e.repeat) this.togglePause();
    if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) e.preventDefault();
    if (["arrowleft", "a"].includes(k)) this.keys.left = true;
    if (["arrowright", "d"].includes(k)) this.keys.right = true;
    if ([" ", "arrowup", "w", "z"].includes(k)) {
      this.keys.jump = true;
      this.p.buffer = 8;
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (["arrowleft", "a"].includes(k)) this.keys.left = false;
    if (["arrowright", "d"].includes(k)) this.keys.right = false;
    if ([" ", "arrowup", "w", "z"].includes(k)) this.keys.jump = false;
  };

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    let dt = now - this.last;
    this.last = now;
    if (dt > 100) dt = 100;
    this.acc += dt;
    while (this.acc >= 1000 / 60) {
      this.update();
      this.acc -= 1000 / 60;
    }
    this.render();
  };

  private tileAt(cx: number, cy: number) {
    if (cx < 0 || cx >= this.level.cols || cy < 0 || cy >= ROWS) return EMPTY;
    return this.level.grid[cy * this.level.cols + cx];
  }

  private solidAt(px: number, py: number) {
    const t = this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
    return t === GROUND || t === BRICK || t === PLATFORM;
  }

  private collideX(o: { x: number; y: number; w: number; h: number; vx: number }) {
    const dir = Math.sign(o.vx);
    if (!dir) return false;
    const edge = dir > 0 ? o.x + o.w : o.x;
    for (let y = o.y + 2; y < o.y + o.h - 1; y += 8) {
      if (this.solidAt(edge, y)) {
        const cx = Math.floor(edge / TILE);
        o.x = dir > 0 ? cx * TILE - o.w - 0.01 : (cx + 1) * TILE + 0.01;
        o.vx = 0;
        return true;
      }
    }
    return false;
  }

  private collideY(o: { x: number; y: number; w: number; h: number; vy: number }) {
    let landed = false;
    if (o.vy >= 0) {
      const foot = o.y + o.h;
      for (let x = o.x + 2; x <= o.x + o.w - 2; x += 8) {
        if (this.solidAt(x, foot)) {
          o.y = Math.floor(foot / TILE) * TILE - o.h;
          o.vy = 0;
          landed = true;
          break;
        }
      }
    } else {
      const head = o.y;
      for (let x = o.x + 2; x <= o.x + o.w - 2; x += 8) {
        if (this.solidAt(x, head)) {
          o.y = (Math.floor(head / TILE) + 1) * TILE + 0.01;
          o.vy = 0;
          break;
        }
      }
    }
    return landed;
  }

  private burst(x: number, y: number, c: string, n = 10, spread = 3) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * spread * 2,
        vy: -Math.random() * spread - 0.5,
        life: 26 + Math.random() * 16,
        max: 42,
        c,
        s: 2 + Math.random() * 3,
      });
    }
  }

  private hitPlayer() {
    if (this.p.inv > 0) return;
    this.lives--;
    this.p.inv = 110;
    this.p.hurt = 30;
    this.p.vy = -7;
    this.p.vx = -this.p.face * 4;
    if (this.lives > 0) this.sfx.damage();
    this.burst(this.p.x + 12, this.p.y + 16, "#ff6b6b", 14);
    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "gameover";
      this.sfx.gameOver();
    }
    this.emit();
  }

  private killPlayer() {
    if (this.status !== "playing") return;
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.status = "gameover";
      this.sfx.gameOver();
    } else {
      this.sfx.lifeLost();
      this.status = "dead";
      this.statusTimer = 50;
    }
    this.emit();
  }

  private update() {
    this.frame++;
    const L = this.level;

    if (this.status === "dead") {
      if (--this.statusTimer <= 0) {
        this.placePlayer(this.respawn);
        this.shots = [];
        this.status = "playing";
        this.sfx.startMusic(this.world);
        this.emit();
      }
      return;
    }
    if (this.status === "levelclear") {
      if (--this.statusTimer <= 0) {
        if (this.world >= 3) {
          this.status = "win";
          this.sfx.victory();
        } else {
          this.loadWorld(this.world + 1, false);
          this.status = "playing";
          this.sfx.startMusic(this.world);
        }
        this.emit();
      }
      return;
    }
    if (this.status !== "playing") return;
    this.playFrames++;
    if (this.attackT > 0) {
      this.attackT--;
      if (this.attackT % 3 === 0) {
        const p0 = this.p;
        this.particles.push({
          x: p0.x + p0.w / 2 + p0.face * (20 + Math.random() * 50),
          y: p0.y + 6 + Math.random() * (p0.h - 6),
          vx: p0.face * (1 + Math.random() * 2),
          vy: -Math.random() * 2,
          life: 20,
          max: 20,
          c: Math.random() < 0.5 ? "#8ef2ff" : "#ffd75e",
          s: 3,
        });
      }
      if (this.attackT === 0 && !this.attackHit) {
        // errou: pequena faísca acinzentada
        const p0 = this.p;
        this.burst(p0.x + p0.w / 2 + p0.face * 60, p0.y + p0.h / 2, "#9aa3c7", 5, 1.5);
      }
    }
    if (this.attackCd > 0) this.attackCd--;
    if (this.shake > 0) this.shake--;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]!;
      r.r += r.vr;
      if (--r.life <= 0) this.rings.splice(i, 1);
    }
    if (this.defeatMsg > 0 && --this.defeatMsg === 0) this.emit();
    if (this.defeatMsg === 150) {
      const L0 = this.level;
      this.burst(L0.goalX, L0.goalY + 60, "#8ef2ff", 40, 5);
      this.ring(L0.goalX, L0.goalY + 60, "#c9f9ff", 4, 40, 5);
      this.sfx.blip(660, 0.2, "triangle", 0.07);
      this.emit();
    }
    if (this.playFrames % 60 === 0) this.emit();

    const p = this.p;
    // input
    const accel = 0.62;
    if (this.keys.left) {
      p.vx -= accel;
      p.face = -1;
    }
    if (this.keys.right) {
      p.vx += accel;
      p.face = 1;
    }
    if (!this.keys.left && !this.keys.right) p.vx *= 0.8;
    p.vx = Math.max(-4.8, Math.min(4.8, p.vx));

    if (p.buffer > 0) p.buffer--;
    if (p.coyote > 0) p.coyote--;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -13.2;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      this.sfx.jump();
      this.burst(p.x + 12, p.y + p.h, "#ffffff", 5, 1.4);
    }
    if (!this.keys.jump && p.vy < -4) p.vy *= 0.86;

    p.vy = Math.min(p.vy + 0.78, 17);

    // movers
    for (const m of L.movers) {
      m.t += 0.016 * m.speed * 60;
      const prevX = m.x;
      const prevY = m.y;
      const osc = Math.sin(m.t * 0.03);
      if (m.range > 0) {
        if (m.h === 16 && m.ax !== undefined) {
          // horizontal se range grande, vertical se pequeno
        }
      }
      const vertical = m.vert ?? m.range <= TILE * 3;
      if (vertical) m.y = m.ay + osc * m.range;
      else m.x = m.ax + osc * m.range;
      m.px = m.x - prevX;
      m.py = m.y - prevY;
    }

    // movimento X
    p.x += p.vx;
    this.collideX(p);
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }

    // movimento Y
    p.y += p.vy;
    const landed = this.collideY(p);
    p.onGround = landed;

    // plataformas móveis (colisão tipo topo)
    for (const m of L.movers) {
      const overlapX = p.x + p.w > m.x && p.x < m.x + m.w;
      const feet = p.y + p.h;
      if (overlapX && p.vy >= 0 && feet >= m.y && feet <= m.y + m.h + Math.abs(m.py) + 8) {
        p.y = m.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.x += m.px;
      }
    }
    if (p.onGround) p.coyote = 7;

    if (p.inv > 0) p.inv--;
    if (p.hurt > 0) p.hurt--;
    if (p.stomp > 0) p.stomp--;
    p.anim += Math.abs(p.vx) * 0.08 + 0.02;

    // queda em buraco
    if (p.y > VH + 120) {
      this.killPlayer();
      return;
    }

    // moedas
    for (const c of L.coins) {
      if (c.taken) continue;
      c.t += 0.08;
      if (Math.abs(c.x - (p.x + p.w / 2)) < 22 && Math.abs(c.y - (p.y + p.h / 2)) < 26) {
        c.taken = true;
        this.coinsGot++;
        this.score += 10;
        this.sfx.coin();
        this.burst(c.x, c.y, "#ffd75e", 7, 2);
        this.emit();
      }
    }
    // fragmentos
    for (const f of L.fragments) {
      if (f.taken) continue;
      f.t += 0.05;
      if (Math.abs(f.x - (p.x + p.w / 2)) < 26 && Math.abs(f.y - (p.y + p.h / 2)) < 30) {
        f.taken = true;
        this.fragsGot++;
        this.fragsAll++;
        this.score += 100;
        this.sfx.fragment();
        this.burst(f.x, f.y, "#8ef2ff", 18, 3.4);
        this.emit();
      }
    }
    // checkpoints
    for (const c of L.checkpoints) {
      if (c.on) continue;
      if (Math.abs(c.x - p.x) < 34 && Math.abs(c.y - p.y) < 90) {
        c.on = true;
        this.respawn = { x: c.x, y: c.y - 10 };
        this.score += 50;
        this.sfx.blip(700, 0.12, "triangle", 0.06);
        this.burst(c.x + 8, c.y, "#9dff8e", 14, 3);
        this.emit();
      }
    }
    // espinhos
    for (const s of L.spikes) {
      if (p.x + p.w > s.x && p.x < s.x + s.w && p.y + p.h > s.y + 6 && p.y < s.y + 24) this.hitPlayer();
    }

    // inimigos
    for (const e of L.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - p.x) > VW) continue;
      e.t += 0.1;
      if (e.kind === "chaser" && Math.abs(e.x - p.x) < 220) {
        e.vx = Math.sign(p.x - e.x) * 1.9;
      } else if (e.kind === "sentry") {
        e.vx = 0;
        e.y = e.startY + Math.sin(e.t * 0.6) * 4;
      }
      e.vy = Math.min(e.vy + 0.78, 16);
      e.x += e.vx;
      if (this.collideX(e)) e.vx *= -1;
      // virar na borda
      if (e.kind !== "sentry") {
        const aheadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
        if (!this.solidAt(aheadX, e.y + e.h + 4) && e.vy === 0) e.vx *= -1;
      }
      e.y += e.vy;
      this.collideY(e);

      if (this.attackT > 0) {
        const ax = p.face > 0 ? p.x + p.w : p.x - 56;
        if (ax + 56 > e.x && ax < e.x + e.w && p.y + p.h + 8 > e.y && p.y - 8 < e.y + e.h) {
          e.dead = true;
          this.enemiesKilled++;
          this.score += 50;
          this.attackHit = true;
          this.shake = 5;
          this.sfx.enemyHit();
          this.burst(e.x + 14, e.y + 14, "#ffb3d1", 14, 3);
          this.burst(e.x + 14, e.y + 14, "#8ef2ff", 10, 4);
          this.ring(e.x + 14, e.y + 14, "#ffffff", 3, 18, 4);
          this.emit();
          continue;
        }
      }
      const hit = p.x + p.w > e.x + 3 && p.x < e.x + e.w - 3 && p.y + p.h > e.y + 3 && p.y < e.y + e.h;
      if (hit) {
        if (p.vy > 1.5 && p.y + p.h - p.vy <= e.y + 12) {
          e.dead = true;
          this.enemiesKilled++;
          p.vy = -10.5;
          p.stomp = 12;
          this.score += 50;
          this.sfx.enemyHit();
          this.burst(e.x + 14, e.y + 14, "#ffb3d1", 12, 3);
          this.emit();
        } else {
          this.hitPlayer();
        }
      }
    }

    // chefão
    const b = L.boss;
    if (b && !b.defeated) this.updateBoss(b);
    this.updateShots();

    // chegada
    const goalReady = !L.boss || (L.boss.defeated && this.defeatMsg <= 150);
    if (goalReady && L.boss && Math.abs(p.x + p.w / 2 - L.goalX) < 34 && p.y + p.h > L.goalY - 20) {
      // porta final: termina o jogo na hora
      this.score += 500 + this.lives * 100;
      this.status = "win";
      this.sfx.victory();
      this.emit();
      return;
    }
    if (goalReady && !L.boss && Math.abs(p.x - L.goalX) < 30 && p.y + p.h > L.goalY - 20) {
      this.status = "levelclear";
      this.statusTimer = 110;
      this.score += 500 + this.lives * 100;
      this.sfx.levelClear();
      this.burst(L.goalX, L.goalY + 40, "#ffd75e", 30, 5);
      this.emit();
    }

    // partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i]!;
      q.x += q.vx;
      q.y += q.vy;
      q.vy += 0.18;
      q.life--;
      if (q.life <= 0) this.particles.splice(i, 1);
    }

    // câmera
    const target = Math.max(0, Math.min(p.x - VW * 0.38, this.level.cols * TILE - VW));
    this.cam += (target - this.cam) * 0.12;
  }

  private updateBoss(b: Boss) {
    const p = this.p;
    if (!b.active && p.x > b.x - VW * 0.6) {
      b.active = true;
      b.phase = "idle";
      b.pt = 70;
      this.sfx.slide(120, 300, 0.6, 0.08);
      this.sfx.playMusic("boss");
      this.emit();
    }
    if (!b.active) return;
    b.t++;
    if (b.hurt > 0) b.hurt--;
    const setPhase = (ph: Boss["phase"], t: number) => {
      b.phase = ph;
      b.pt = t;
      this.emit();
    };
    // gravidade
    b.vy = Math.min(b.vy + 0.7, 16);
    b.y += b.vy;
    const grounded = b.y + b.h >= b.ground;
    if (grounded) {
      b.y = b.ground - b.h;
      b.vy = 0;
    }
    const arenaL = (this.level.cols - 36) * TILE;
    const arenaR = (this.level.cols - 7) * TILE - b.w;

    if (b.phase === "dying") {
      b.vx = 0;
      if (b.dying % 8 === 0) this.burst(b.x + Math.random() * b.w, b.y + Math.random() * b.h, "#ffd75e", 10, 4);
      if (--b.dying <= 0) {
        b.defeated = true;
        this.defeatMsg = 240;
        this.burst(b.x + b.w / 2, b.y + 40, "#8ef2ff", 50, 7);
        this.sfx.blip(880, 0.3, "triangle", 0.07);
        this.sfx.stopMusic();
        this.emit();
      }
      return;
    }

    b.pt--;
    if (b.phase === "idle") {
      b.vx *= 0.85;
      if (b.pt <= 0) {
        const order: Boss["phase"][] = ["orbs", "leap", "rain"];
        const ph = order[b.atk % 3]!;
        b.atk++;
        if (ph === "leap") {
          b.vy = -11;
          b.vx = Math.max(-2.5, Math.min(2.5, (p.x - b.x) / 80));
          setPhase("leap", 200);
        } else if (ph === "orbs") setPhase("orbs", 130);
        else {
          for (let i = 0; i < 3; i++) {
            const sx = p.x + 12 + (i - 1) * 160;
            this.shots.push({ x: sx, y: -20, vx: 0, vy: 0, r: 10, warn: 90 + i * 25 });
          }
          setPhase("rain", 210);
        }
      }
    } else if (b.phase === "leap") {
      if (grounded && b.pt < 195) {
        // ondas baixas e lentas nos dois lados (pule para desviar)
        this.burst(b.x + b.w / 2, b.ground, "#c9b0ff", 18, 3);
        this.shots.push({ x: b.x, y: b.ground - 10, vx: -2.6, vy: 0, r: 8, warn: 0 });
        this.shots.push({ x: b.x + b.w, y: b.ground - 10, vx: 2.6, vy: 0, r: 8, warn: 0 });
        b.vx = 0;
        this.shake = 6;
        setPhase("vuln", 300);
      }
    } else if (b.phase === "orbs") {
      b.vx = 0;
      if (b.pt === 100 || b.pt === 40) {
        const dir = Math.sign(p.x - b.x) || -1;
        this.shots.push({ x: b.x + b.w / 2, y: b.ground - 14, vx: dir * 2.8, vy: 0, r: 9, warn: 0 });
        this.sfx.blip(220, 0.08, "square", 0.05);
      }
      if (b.pt <= 0) setPhase("vuln", 300);
    } else if (b.phase === "rain") {
      b.vx = 0;
      if (b.pt <= 0) setPhase("vuln", 300);
    } else if (b.phase === "vuln") {
      b.vx = 0;
      if (b.pt <= 0) setPhase("idle", 120);
    }
    b.x = Math.max(arenaL, Math.min(arenaR, b.x + b.vx));

    const hit = p.x + p.w > b.x + 6 && p.x < b.x + b.w - 6 && p.y + p.h > b.y + 6 && p.y < b.y + b.h;
    // ataque X (alcance generoso)
    if (this.attackT > 0 && b.phase === "vuln" && b.hurt === 0) {
      const ax = p.face > 0 ? p.x + p.w : p.x - 64;
      const near = ax + 64 > b.x - 10 && ax < b.x + b.w + 10 && p.y + p.h > b.y - 20 && p.y < b.y + b.h + 20;
      if (near || hit) {
        b.hp--;
        b.hurt = 40;
        this.attackHit = true;
        this.score += 300;
        this.shake = 14;
        this.sfx.slide(420, 140, 0.35, 0.08);
        this.sfx.blip(1200, 0.12, "triangle", 0.07);
        const cx = b.x + b.w / 2;
        this.burst(cx, b.y + 40, "#8ef2ff", 34, 5);
        this.burst(cx, b.y + 40, "#ffd75e", 18, 4);
        this.ring(cx, b.y + 50, "#ffffff", 5, 26, 6);
        this.ring(cx, b.y + 50, "#8ef2ff", 3.5, 34, 4);
        b.vx = p.face * 7; // recua
        this.shots = [];
        if (b.hp <= 0) {
          b.hp = 0;
          b.dying = 110;
          this.score += 1000;
          setPhase("dying", 0);
        } else setPhase("idle", 140);
        return;
      }
    }
    if (hit && b.phase === "leap") this.hitPlayer();
    else if (hit && b.phase !== "vuln") {
      // empurra sem causar dano
      p.x = p.x + p.w / 2 < b.x + b.w / 2 ? b.x + 6 - p.w : b.x + b.w - 6;
    }
  }

  private updateShots() {
    const p = this.p;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!;
      if (s.warn > 0) {
        s.warn--;
        if (s.warn === 0) s.vy = 5;
        continue;
      }
      s.x += s.vx;
      s.y += s.vy;
      const L = this.level;
      if (s.y > (L.boss?.ground ?? VH) - s.r && s.vy > 0) {
        this.burst(s.x, s.y, "#c9b0ff", 6, 2);
        this.shots.splice(i, 1);
        continue;
      }
      if (Math.abs(s.x - this.cam - VW / 2) > VW) {
        this.shots.splice(i, 1);
        continue;
      }
      if (s.x + s.r > p.x + 3 && s.x - s.r < p.x + p.w - 3 && s.y + s.r > p.y + 4 && s.y - s.r < p.y + p.h) {
        this.hitPlayer();
        this.shots.splice(i, 1);
      }
    }
  }

  private drawShots(cam: number) {
    const g = this.ctx;
    const ground = this.level.boss?.ground ?? VH;
    for (const s of this.shots) {
      const x = s.x - cam;
      if (s.warn > 0) {
        // marcador de aviso no chão
        g.fillStyle = Math.floor(this.frame / 6) % 2 ? "rgba(255,95,141,0.85)" : "rgba(255,215,94,0.85)";
        g.fillRect(x - 16, ground - 6, 32, 6);
        g.fillRect(x - 3, ground - 26, 6, 14);
        continue;
      }
      g.fillStyle = "rgba(255,95,141,0.35)";
      g.fillRect(x - s.r - 4, s.y - s.r - 4, s.r * 2 + 8, s.r * 2 + 8);
      g.fillStyle = "#ff5f8d";
      g.fillRect(x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      g.fillStyle = "#ffe0ea";
      g.fillRect(x - 3, s.y - 3, 6, 6);
    }
  }

  private drawAttack(cam: number) {
    const g = this.ctx;
    // anéis de impacto / ondas
    for (const r of this.rings) {
      g.globalAlpha = Math.max(0, r.life / r.max);
      g.strokeStyle = r.c;
      g.lineWidth = r.w;
      g.beginPath();
      g.arc(r.x - cam, r.y, r.r, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (this.attackT <= 0) return;
    const p = this.p;
    const t = 1 - this.attackT / 18; // 0 → 1
    const cx = p.x + p.w / 2 - cam;
    const cy = p.y + p.h / 2;
    const f = p.face;
    // brilho no personagem
    g.globalAlpha = 0.35 * (1 - t);
    g.fillStyle = "#8ef2ff";
    g.fillRect(p.x - cam - 6, p.y - 6, p.w + 12, p.h + 12);
    // arco do golpe (meia-lua de energia do tempo)
    g.globalAlpha = Math.min(1, (1 - t) * 1.6);
    const reach = 30 + t * 44;
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = k === 0 ? "#ffffff" : k === 1 ? "#8ef2ff" : "#b48cff";
      g.lineWidth = 7 - k * 2;
      g.beginPath();
      const start = f > 0 ? -Math.PI / 2.2 : Math.PI - Math.PI / 2.2 + Math.PI / 1.1 * 0;
      if (f > 0) g.arc(cx, cy, reach - k * 7, -Math.PI / 2.2, Math.PI / 2.2);
      else g.arc(cx, cy, reach - k * 7, Math.PI - Math.PI / 2.2, Math.PI + Math.PI / 2.2);
      void start;
      g.stroke();
    }
    // onda temporal que avança
    const wx = cx + f * (24 + t * 70);
    g.globalAlpha = 0.8 * (1 - t);
    g.fillStyle = "#c9f9ff";
    g.fillRect(wx - 4, cy - 22 + t * 6, 8, 44 - t * 12);
    g.fillStyle = "#37d7f5";
    g.fillRect(wx - f * 10 - 3, cy - 16, 6, 32);
    // ponteiro de relógio
    g.strokeStyle = "#ffd75e";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx, cy);
    const ang = (f > 0 ? -Math.PI / 2 : -Math.PI / 2) + f * t * Math.PI;
    g.lineTo(cx + Math.cos(ang) * reach * 0.8, cy + Math.sin(ang) * reach * 0.8);
    g.stroke();
    g.globalAlpha = 1;
  }

  private ring(x: number, y: number, c: string, vr: number, life: number, w = 4) {
    this.rings.push({ x, y, r: 6, vr, life, max: life, c, w });
  }

  /* ---------------- render ---------------- */

  private render() {
    const g = this.ctx;
    const W = WORLDS[this.world - 1]!;
    const cam = Math.round(this.cam);

    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, W.sky[0]!);
    sky.addColorStop(1, W.sky[1]!);
    g.fillStyle = sky;
    g.fillRect(0, 0, VW, VH);

    g.save();
    if (this.shake > 0) g.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake * 0.6);
    this.drawParallax(cam, W);
    this.drawTiles(cam, W);
    this.drawPickups(cam);
    this.drawCheckpoints(cam);
    this.drawSpikes(cam);
    this.drawMovers(cam, W);
    this.drawEnemies(cam);
    this.drawBoss(cam);
    this.drawGoal(cam);
    this.drawPlayer(cam);
    this.drawAttack(cam);
    this.drawShots(cam);
    this.drawParticles(cam);
    g.restore();
  }

  private drawParallax(cam: number, W: (typeof WORLDS)[number]) {
    const g = this.ctx;
    // nuvens / lua
    const rng = mulberry32(this.world * 31 + 7);
    for (let i = 0; i < 9; i++) {
      const bx = rng() * 3000;
      const by = 30 + rng() * 140;
      const x = ((bx - cam * 0.15) % 1400) - 100;
      g.fillStyle = this.world === 3 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.75)";
      g.fillRect(x, by, 56, 12);
      g.fillRect(x + 12, by - 10, 34, 12);
    }
    // montanhas distantes
    g.fillStyle = W.far;
    for (let i = -1; i < 14; i++) {
      const bx = i * 240 - ((cam * 0.3) % 240);
      const h = 150 + ((i * 53) % 90);
      g.beginPath();
      g.moveTo(bx, VH - 120);
      g.lineTo(bx + 120, VH - 120 - h);
      g.lineTo(bx + 240, VH - 120);
      g.closePath();
      g.fill();
    }
    // colinas / árvores próximas
    g.fillStyle = W.near;
    for (let i = -1; i < 20; i++) {
      const bx = i * 170 - ((cam * 0.55) % 170);
      g.fillRect(bx, VH - 150, 120, 150);
      if (this.world !== 2) {
        g.fillStyle = W.tree;
        g.fillRect(bx + 40, VH - 210, 14, 70);
        g.fillRect(bx + 20, VH - 240, 54, 40);
        g.fillRect(bx + 30, VH - 262, 34, 26);
        g.fillStyle = W.near;
      } else {
        g.fillStyle = W.tree;
        g.fillRect(bx + 46, VH - 200, 10, 60);
        g.fillRect(bx + 26, VH - 206, 50, 8);
        g.fillStyle = W.near;
      }
    }
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(0, VH - 150, VW, 150);
  }

  private drawTiles(cam: number, W: (typeof WORLDS)[number]) {
    const g = this.ctx;
    const startC = Math.max(0, Math.floor(cam / TILE) - 1);
    const endC = Math.min(this.level.cols, startC + VW / TILE + 3);
    for (let cx = startC; cx < endC; cx++) {
      for (let cy = 0; cy < ROWS; cy++) {
        const t = this.tileAt(cx, cy);
        if (!t) continue;
        const x = cx * TILE - cam;
        const y = cy * TILE;
        if (t === GROUND) {
          const topFree = this.tileAt(cx, cy - 1) === EMPTY;
          g.fillStyle = W.ground;
          g.fillRect(x, y, TILE, TILE);
          g.fillStyle = "rgba(0,0,0,0.12)";
          g.fillRect(x, y + TILE - 6, TILE, 6);
          g.fillStyle = "rgba(255,255,255,0.07)";
          g.fillRect(x + 4, y + 8, 6, 6);
          g.fillRect(x + 20, y + 18, 5, 5);
          if (topFree) {
            g.fillStyle = W.grass;
            g.fillRect(x, y, TILE, 10);
            g.fillStyle = W.grassDark;
            g.fillRect(x, y + 8, TILE, 4);
            g.fillStyle = W.grass;
            g.fillRect(x + 4, y - 4, 5, 5);
            g.fillRect(x + 20, y - 3, 4, 4);
          }
        } else if (t === BRICK) {
          g.fillStyle = W.brick;
          g.fillRect(x, y, TILE, TILE);
          g.fillStyle = W.brickDark;
          g.fillRect(x, y + 14, TILE, 3);
          g.fillRect(x + 14, y, 3, 14);
          g.fillRect(x + 6, y + 17, 3, 15);
          g.fillStyle = "rgba(255,255,255,0.14)";
          g.fillRect(x, y, TILE, 3);
        } else {
          g.fillStyle = W.brickDark;
          g.fillRect(x, y, TILE, 14);
          g.fillStyle = W.grass;
          g.fillRect(x, y, TILE, 5);
          g.fillStyle = "rgba(0,0,0,0.2)";
          g.fillRect(x, y + 11, TILE, 3);
        }
      }
    }
  }

  private drawPickups(cam: number) {
    const g = this.ctx;
    for (const c of this.level.coins) {
      if (c.taken) continue;
      const x = c.x - cam;
      if (x < -30 || x > VW + 30) continue;
      const bob = Math.sin(c.t) * 3;
      const wobble = Math.abs(Math.cos(c.t * 0.9));
      const w = 6 + wobble * 10;
      g.fillStyle = "#ffcf3d";
      g.fillRect(x - w / 2, c.y - 10 + bob, w, 20);
      g.fillStyle = "#fff0a8";
      g.fillRect(x - w / 2 + 2, c.y - 7 + bob, Math.max(2, w - 8), 14);
      g.fillStyle = "#e09b1c";
      g.fillRect(x - w / 2, c.y + 7 + bob, w, 3);
    }
    for (const f of this.level.fragments) {
      if (f.taken) continue;
      const x = f.x - cam;
      if (x < -40 || x > VW + 40) continue;
      const bob = Math.sin(f.t) * 4;
      const y = f.y + bob;
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(f.t * 0.6) * 0.25);
      g.fillStyle = "rgba(140,240,255,0.25)";
      g.fillRect(-18, -18, 36, 36);
      g.fillStyle = "#37d7f5";
      g.beginPath();
      g.moveTo(0, -16);
      g.lineTo(11, 0);
      g.lineTo(0, 16);
      g.lineTo(-11, 0);
      g.closePath();
      g.fill();
      g.fillStyle = "#c9f9ff";
      g.beginPath();
      g.moveTo(0, -12);
      g.lineTo(5, -1);
      g.lineTo(0, 9);
      g.lineTo(-5, -1);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  private drawCheckpoints(cam: number) {
    const g = this.ctx;
    for (const c of this.level.checkpoints) {
      const x = c.x - cam;
      if (x < -40 || x > VW + 40) continue;
      g.fillStyle = "#4a4a5a";
      g.fillRect(x, c.y - 30, 6, 96);
      g.fillStyle = c.on ? "#6bdc5a" : "#b9b9c4";
      const wave = c.on ? Math.sin(this.frame * 0.15) * 3 : 0;
      g.beginPath();
      g.moveTo(x + 6, c.y - 28);
      g.lineTo(x + 40 + wave, c.y - 18);
      g.lineTo(x + 6, c.y - 6);
      g.closePath();
      g.fill();
    }
  }

  private drawSpikes(cam: number) {
    const g = this.ctx;
    for (const s of this.level.spikes) {
      const x = s.x - cam;
      if (x < -60 || x > VW + 60) continue;
      for (let i = 0; i < s.w / 16; i++) {
        const sx = x + i * 16;
        g.fillStyle = "#d8dbe6";
        g.beginPath();
        g.moveTo(sx, s.y + 16);
        g.lineTo(sx + 8, s.y - 6);
        g.lineTo(sx + 16, s.y + 16);
        g.closePath();
        g.fill();
        g.fillStyle = "#8d93a8";
        g.fillRect(sx, s.y + 12, 16, 4);
      }
    }
  }

  private drawMovers(cam: number, W: (typeof WORLDS)[number]) {
    const g = this.ctx;
    for (const m of this.level.movers) {
      const x = m.x - cam;
      if (x < -140 || x > VW + 140) continue;
      g.fillStyle = W.brick;
      g.fillRect(x, m.y, m.w, m.h);
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(x, m.y, m.w, 4);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(x, m.y + m.h - 4, m.w, 4);
      g.fillStyle = "#ffd75e";
      g.fillRect(x + m.w / 2 - 3, m.y + 5, 6, 6);
    }
  }

  private drawEnemies(cam: number) {
    const g = this.ctx;
    for (const e of this.level.enemies) {
      if (e.dead) continue;
      const x = e.x - cam;
      if (x < -60 || x > VW + 60) continue;
      const y = e.y;
      const wob = Math.sin(e.t * 2) * 2;
      if (e.kind === "walker") {
        g.fillStyle = "#b05be0";
        g.fillRect(x + 2, y + 6 + wob, 24, 20);
        g.fillStyle = "#7b32a8";
        g.fillRect(x + 2, y + 22 + wob, 24, 4);
        g.fillStyle = "#ffe9a8";
        g.fillRect(x + 6, y + 11 + wob, 6, 6);
        g.fillRect(x + 16, y + 11 + wob, 6, 6);
        g.fillStyle = "#2a1033";
        g.fillRect(x + 8 + (e.vx > 0 ? 2 : 0), y + 13 + wob, 3, 3);
        g.fillRect(x + 18 + (e.vx > 0 ? 2 : 0), y + 13 + wob, 3, 3);
        g.fillStyle = "#7b32a8";
        g.fillRect(x, y + 26, 8, 4);
        g.fillRect(x + 20, y + 26, 8, 4);
      } else if (e.kind === "chaser") {
        g.fillStyle = "#e0573f";
        g.fillRect(x + 1, y + 4, 26, 22);
        g.fillStyle = "#ffd36b";
        g.fillRect(x + 5, y + 9, 7, 7);
        g.fillRect(x + 16, y + 9, 7, 7);
        g.fillStyle = "#3a0f0a";
        g.fillRect(x + 7, y + 11, 3, 4);
        g.fillRect(x + 18, y + 11, 3, 4);
        g.fillStyle = "#ffffff";
        for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 6, y + 21, 4, 4);
        g.fillStyle = "#a63320";
        g.fillRect(x + 2, y, 6, 6);
        g.fillRect(x + 20, y, 6, 6);
      } else {
        g.fillStyle = "#2fae8f";
        g.fillRect(x + 3, y + 3 + wob, 22, 22);
        g.fillStyle = "#1c7c66";
        g.fillRect(x + 3, y + 3 + wob, 22, 5);
        g.fillStyle = "#e8fff7";
        g.fillRect(x + 8, y + 12 + wob, 5, 5);
        g.fillRect(x + 16, y + 12 + wob, 5, 5);
        g.fillStyle = "#08322a";
        g.fillRect(x + 9, y + 14 + wob, 3, 3);
        g.fillRect(x + 17, y + 14 + wob, 3, 3);
      }
    }
  }

  private drawBoss(cam: number) {
    const b = this.level.boss;
    if (!b || b.defeated) return;
    const g = this.ctx;
    const x = b.x - cam;
    if (x < -200 || x > VW + 200) return;
    if (b.phase === "dying") {
      g.globalAlpha = Math.max(0.15, b.dying / 90);
    }
    const vuln = b.phase === "vuln";
    const shake = b.phase === "dying" ? (Math.random() - 0.5) * 6 : b.hurt > 30 ? (Math.random() - 0.5) * 8 : 0;
    const flash = b.hurt > 0 && Math.floor(this.frame / 4) % 2 === 0;
    g.font = "10px 'Press Start 2P', monospace";
    g.textAlign = "center";
    if (vuln) {
      g.fillStyle = Math.floor(this.frame / 8) % 2 ? "rgba(255,215,94,0.5)" : "rgba(255,215,94,0.22)";
      g.fillRect(x - 18, b.y - 18, b.w + 36, b.h + 36);
      g.fillStyle = "#ffd75e";
      g.fillText("VULNERÁVEL! APERTE X", x + b.w / 2, b.y - 26);
    } else if (b.phase === "idle" && b.active && b.pt < 60 && b.pt > 0) {
      // aviso antes do ataque
      g.fillStyle = Math.floor(this.frame / 5) % 2 ? "#ff5f8d" : "#ffffff";
      g.font = "20px 'Press Start 2P', monospace";
      g.fillText("!", x + b.w / 2, b.y - 22);
      g.fillStyle = "rgba(255,95,141,0.25)";
      g.fillRect(x - 10, b.y - 10, b.w + 20, b.h + 20);
    }
    g.textAlign = "left";
    g.save();
    g.translate(shake, 0);
    const glow = Math.sin(this.frame * 0.08) * 4;
    g.fillStyle = "rgba(140,110,255,0.22)";
    g.fillRect(x - 12, b.y - 12, b.w + 24, b.h + 24);
    g.fillStyle = flash ? "#ffffff" : "#5b4aa8";
    g.fillRect(x, b.y + 16, b.w, b.h - 16);
    g.fillStyle = flash ? "#ffffff" : "#7a66d6";
    g.fillRect(x + 8, b.y, b.w - 16, 34);
    // olhos
    g.fillStyle = "#ffd75e";
    g.fillRect(x + 18, b.y + 10, 12, 10);
    g.fillRect(x + 46, b.y + 10, 12, 10);
    g.fillStyle = "#2b1a4a";
    g.fillRect(x + 22, b.y + 13, 5, 6);
    g.fillRect(x + 50, b.y + 13, 5, 6);
    // núcleo de tempo
    g.fillStyle = "#37d7f5";
    g.fillRect(x + b.w / 2 - 10, b.y + 44 + glow * 0.2, 20, 20);
    g.fillStyle = "#c9f9ff";
    g.fillRect(x + b.w / 2 - 4, b.y + 50 + glow * 0.2, 8, 8);
    // braços
    g.fillStyle = flash ? "#ffffff" : "#463a86";
    g.fillRect(x - 10, b.y + 30 + glow, 12, 34);
    g.fillRect(x + b.w - 2, b.y + 30 - glow, 12, 34);
    // pés
    g.fillRect(x + 6, b.y + b.h - 8, 22, 8);
    g.fillRect(x + b.w - 28, b.y + b.h - 8, 22, 8);
    if (vuln) {
      // olhos fechados/tontos
      g.fillStyle = "#2b1a4a";
      g.fillRect(x + 18, b.y + 10, 12, 10);
      g.fillRect(x + 46, b.y + 10, 12, 10);
      g.fillStyle = "#ffd75e";
      g.fillRect(x + 18, b.y + 14, 12, 3);
      g.fillRect(x + 46, b.y + 14, 12, 3);
    }
    g.restore();
    g.globalAlpha = 1;
  }

  private drawGoal(cam: number) {
    const g = this.ctx;
    const L = this.level;
    const x = L.goalX - cam;
    if (x < -120 || x > VW + 120) return;
    const open = !L.boss || (L.boss.defeated && this.defeatMsg <= 150);
    if (L.boss && open) {
      // brilho convidativo + seta
      const bob = Math.sin(this.frame * 0.15) * 6;
      g.fillStyle = "#ffd75e";
      g.font = "10px 'Press Start 2P', monospace";
      g.textAlign = "center";
      g.fillText("ENTRE!", x, L.goalY - 44 + bob);
      g.fillText("▼", x, L.goalY - 28 + bob);
      g.textAlign = "left";
    }
    if (L.boss) {
      // portal do tempo
      const pulse = Math.sin(this.frame * 0.08) * 6;
      g.fillStyle = open ? "rgba(55,215,245,0.3)" : "rgba(90,90,120,0.25)";
      g.fillRect(x - 34 - pulse * 0.3, L.goalY - 20, 68 + pulse * 0.6, 150);
      g.fillStyle = open ? "#37d7f5" : "#595a78";
      g.fillRect(x - 26, L.goalY, 52, 126);
      g.fillStyle = open ? "#c9f9ff" : "#7a7b98";
      g.fillRect(x - 16, L.goalY + 12, 32, 102);
      g.fillStyle = open ? "#ffffff" : "#9a9ab8";
      g.fillRect(x - 6 + pulse * 0.3, L.goalY + 30, 12, 60);
    } else {
      g.fillStyle = "#e8e8f0";
      g.fillRect(x - 3, L.goalY - 30, 7, 160);
      g.fillStyle = "#ffd75e";
      g.fillRect(x - 8, L.goalY - 40, 17, 12);
      const wave = Math.sin(this.frame * 0.12) * 5;
      g.fillStyle = "#ff5f8d";
      g.beginPath();
      g.moveTo(x + 4, L.goalY - 24);
      g.lineTo(x + 58 + wave, L.goalY - 8);
      g.lineTo(x + 4, L.goalY + 8);
      g.closePath();
      g.fill();
      g.fillStyle = "#ffe08a";
      g.fillRect(x + 12, L.goalY - 14, 8, 8);
    }
  }

  private drawPlayer(cam: number) {
    const p = this.p;
    const blink = p.inv > 0 && Math.floor(this.frame / 3) % 2 === 0;
    this.ctx.globalAlpha = blink ? 0.45 : 1;
    paintHero(this.ctx, Math.round(p.x - cam), Math.round(p.y), this.character, {
      running: Math.abs(p.vx) > 0.4 && p.onGround,
      anim: p.anim,
      air: !p.onGround,
      face: p.face,
      hurt: p.hurt > 0,
      frame: this.frame,
    });
    if (p.stomp > 0) {
      this.ctx.fillStyle = "rgba(255,255,255,0.5)";
      this.ctx.fillRect(Math.round(p.x - cam) - 8, Math.round(p.y) + p.h - 4, 40, 3);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawParticles(cam: number) {
    const g = this.ctx;
    for (const q of this.particles) {
      g.globalAlpha = Math.max(0, q.life / q.max);
      g.fillStyle = q.c;
      g.fillRect(q.x - cam, q.y, q.s, q.s);
    }
    g.globalAlpha = 1;
  }
}

export type Hero = "leo" | "luna";

const HERO_PAL = {
  leo: { tunic: "#38c46f", tunicDark: "#26a057", legs: "#2f4f9e", boots: "#c4522c", hair: "#3a2a18", scarf: "#ff5f8d", skin: "#f6cf9c", hand: "#f0c08a" },
  luna: { tunic: "#9b6bff", tunicDark: "#7445e0", legs: "#3a3470", boots: "#e0a23a", hair: "#c2462f", scarf: "#37d7f5", skin: "#f3c79a", hand: "#e8b686" },
};

export interface HeroPose {
  running: boolean;
  anim: number;
  air: boolean;
  face: number;
  hurt: boolean;
  frame: number;
}

/** Desenha Léo ou Luna (24x34). Só a aparência muda entre os dois. */
export function paintHero(g: CanvasRenderingContext2D, x: number, y: number, hero: Hero, o: HeroPose) {
  const c = HERO_PAL[hero];
  const step = o.running ? Math.floor(o.anim * 3) % 4 : 0;
  const legA = o.running ? [0, 3, 0, -3][step]! : 0;
  const f = o.face;
  g.fillStyle = "rgba(0,0,0,0.18)";
  g.fillRect(x + 2, y + 32, 20, 4);
  // cabelo longo da Luna (atrás)
  if (hero === "luna") {
    g.fillStyle = c.hair;
    const sway = Math.sin(o.frame * 0.2) * 2;
    g.fillRect(f > 0 ? x - 4 : x + 20, y + 3 + sway, 8, 16);
  }
  g.fillStyle = c.legs;
  if (o.air) {
    g.fillRect(x + 3, y + 26, 8, 8);
    g.fillRect(x + 13, y + 24, 8, 8);
  } else {
    g.fillRect(x + 3 + legA, y + 26, 8, 8);
    g.fillRect(x + 13 - legA, y + 26, 8, 8);
  }
  g.fillStyle = c.boots;
  g.fillRect(x + 2 + legA, y + 32, 10, 3);
  g.fillRect(x + 12 - legA, y + 32, 10, 3);
  g.fillStyle = o.hurt ? "#ff9b9b" : c.tunic;
  g.fillRect(x + 2, y + 14, 20, 13);
  g.fillStyle = c.tunicDark;
  if (hero === "luna") g.fillRect(x, y + 23, 24, 5);
  else g.fillRect(x + 2, y + 23, 20, 4);
  g.fillStyle = "#6b4426";
  g.fillRect(x + 2, y + 21, 20, 3);
  g.fillStyle = "#37d7f5";
  g.fillRect(x + 10, y + 20, 5, 5);
  g.fillStyle = c.tunic;
  const armY = o.air ? y + 12 : y + 16 + (o.running ? [0, -2, 0, 2][step]! : 0);
  g.fillRect(f > 0 ? x + 20 : x - 2, armY, 5, 10);
  g.fillStyle = c.hand;
  g.fillRect(f > 0 ? x + 20 : x - 2, armY + 9, 5, 4);
  g.fillStyle = c.skin;
  g.fillRect(x + 3, y + 2, 18, 13);
  g.fillStyle = c.hair;
  g.fillRect(x + 2, y, 20, 5);
  g.fillRect(f > 0 ? x + 2 : x + 17, y + 2, 5, 6);
  if (hero === "luna") {
    g.fillStyle = "#ffd84a";
    g.fillRect(f > 0 ? x + 4 : x + 15, y - 2, 5, 3);
  }
  g.fillStyle = "#1f1a14";
  if (o.hurt) {
    g.fillRect(x + (f > 0 ? 12 : 6), y + 7, 5, 2);
    g.fillRect(x + (f > 0 ? 6 : 12), y + 7, 3, 2);
  } else {
    g.fillRect(x + (f > 0 ? 13 : 5), y + 6, 3, 4);
    g.fillRect(x + (f > 0 ? 8 : 10), y + 6, 2, 4);
  }
  g.fillStyle = c.scarf;
  g.fillRect(x + 2, y + 13, 20, 4);
  if (hero === "leo") {
    const scarf = Math.sin(o.frame * 0.25) * 2;
    g.fillRect(f > 0 ? x - 6 : x + 20, y + 13 + scarf, 8, 4);
  }
}
