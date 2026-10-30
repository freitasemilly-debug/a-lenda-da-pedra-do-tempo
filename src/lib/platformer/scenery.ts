/* Read-only scenery painter. All collision geometry remains owned by engine.ts. */
interface SceneryLevel {
  grid: Uint8Array;
  cols: number;
}
interface SceneryMover { x: number; y: number; w: number; h: number }
const TILE = 32;
const WIDTH = 960;
const HEIGHT = 544;
const ROWS = 17;
const roles = ["sky", "horizon", "distant", "far", "mid", "near", "shade", "soil", "strata", "rock", "edge", "cap", "leaf", "light", "glow", "flower", "mortar", "metal"] as const;
type Palette = Record<(typeof roles)[number], string>;
const palettes = new Map<number, Palette>();

function palette(world: number): Palette {
  const cached = palettes.get(world);
  if (cached) return cached;
  const style = getComputedStyle(document.documentElement);
  const colors = Object.fromEntries(roles.map(role => [role, style.getPropertyValue(`--scene-${world}-${role}`).trim()])) as Palette;
  palettes.set(world, colors);
  return colors;
}

function noise(x: number, y = 0) {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 41, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function block(g: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
function polygon(g: CanvasRenderingContext2D, color: string, points: number[][]) {
  const first = points[0];
  if (!first) return;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(first[0] ?? 0, first[1] ?? 0);
  for (const p of points.slice(1)) g.lineTo(p[0] ?? 0, p[1] ?? 0);
  g.closePath();
  g.fill();
}
function crystal(g: CanvasRenderingContext2D, p: Palette, x: number, y: number, h: number, w: number) {
  polygon(g, p.glow, [[x, y], [x - w / 2, y - h * .72], [x, y - h], [x + w / 2, y - h * .72], [x + w * .4, y]]);
  polygon(g, p.cap, [[x, y], [x, y - h], [x + w / 2, y - h * .72], [x + w * .4, y]]);
  block(g, p.light, x - 2, y - h * .8, 3, Math.round(h * .5));
}
function canopy(g: CanvasRenderingContext2D, p: Palette, x: number, y: number, size: number, color: string) {
  block(g, color, x - size * .45, y, size * .9, size * .25);
  block(g, color, x - size * .6, y + size * .18, size * 1.2, size * .24);
  block(g, color, x - size * .5, y + size * .4, size, size * .25);
  block(g, color, x - size * .3, y + size * .62, size * .65, size * .15);
  g.globalAlpha = .23;
  block(g, p.light, x - size * .4, y + 3, size * .55, 5);
  block(g, p.leaf, x - size * .54, y + size * .2, size * .65, 6);
  g.globalAlpha = 1;
}

export function drawSceneryBackground(g: CanvasRenderingContext2D, world: number, cam: number, frame: number) {
  const p = palette(world);
  g.save();
  const sky = g.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, p.sky);
  sky.addColorStop(1, p.horizon);
  g.fillStyle = sky;
  g.fillRect(0, 0, WIDTH, HEIGHT);
  if (world === 1) forest(g, p, cam, frame);
  else if (world === 2) cavern(g, p, cam, frame);
  else castle(g, p, cam, frame);
  // Fine ambient motes stay behind every playable object.
  for (let i = 0; i < 26; i++) {
    const x = ((noise(i, world) * 1800 - cam * .18 + frame * .055) % 1100 + 1100) % 1100 - 70;
    const y = 46 + noise(i + 30, world) * 340 + Math.sin(frame * .012 + i) * 5;
    g.globalAlpha = .18 + (1 + Math.sin(frame * .025 + i * 2)) * .12;
    block(g, p.light, x, y, 2, 2);
  }
  g.restore();
}

function forest(g: CanvasRenderingContext2D, p: Palette, cam: number, frame: number) {
  // Daylight and clouds, with stepped silhouettes rather than smooth vector blobs.
  g.globalAlpha = .45;
  block(g, p.light, 760 - (cam * .06) % 120, 42, 48, 48);
  g.globalAlpha = .7;
  for (let i = -1; i < 6; i++) {
    const x = i * 250 - (cam * .1) % 250;
    const y = 38 + noise(i, 2) * 78;
    block(g, p.light, x, y + 12, 112, 12);
    block(g, p.light, x + 16, y, 48, 16);
    block(g, p.light, x + 56, y + 5, 36, 12);
  }
  g.globalAlpha = 1;
  for (let layer = 0; layer < 2; layer++) {
    const speed = layer === 0 ? .18 : .3;
    for (let i = -1; i < 7; i++) {
      const id = i + Math.floor(cam * speed / 220);
      const x = i * 220 - (cam * speed) % 220;
      const y = 178 + noise(id, layer) * 85 + layer * 48;
      polygon(g, layer ? p.far : p.distant, [[x, HEIGHT], [x, y + 52], [x + 38, y + 52], [x + 38, y + 22], [x + 85, y + 22], [x + 85, y], [x + 150, y], [x + 150, y + 28], [x + 204, y + 28], [x + 240, y + 98], [x + 240, HEIGHT]]);
      if (layer === 0 && id % 3 === 0) {
        g.globalAlpha = .45;
        block(g, p.glow, x + 111, y + 4, 15, HEIGHT - y);
        block(g, p.light, x + 114, y + 8, 3, HEIGHT - y);
        g.globalAlpha = 1;
      }
    }
  }
  for (let layer = 0; layer < 2; layer++) {
    const speed = layer ? .55 : .38;
    const spacing = layer ? 218 : 150;
    for (let i = -1; i < 9; i++) {
      const id = i + Math.floor(cam * speed / spacing);
      const x = i * spacing - cam * speed % spacing;
      const y = (layer ? 110 : 160) + noise(id, 9) * 92;
      const trunk = layer ? 24 : 14;
      block(g, layer ? p.near : p.mid, x, y + 40, trunk, HEIGHT - y);
      polygon(g, layer ? p.near : p.mid, [[x + 5, y + 140], [x - 34, y + 109], [x - 34, y + 99], [x + 9, y + 124], [x + trunk, y + 82], [x + 54, y + 66], [x + 55, y + 76], [x + trunk, y + 100]]);
      if (layer) {
        block(g, p.mid, x + 5, y + 60, 4, HEIGHT - y - 70);
        for (let k = 0; k < 6; k++) block(g, p.shade, x + 10, y + 100 + k * 47, 9, 3);
      }
      canopy(g, p, x + 10, y - 28, layer ? 134 : 92, layer ? p.leaf : p.mid);
    }
  }
  // Soft, sparse light shafts behind the path.
  g.globalAlpha = .06;
  polygon(g, p.light, [[205, 0], [226, 0], [405, HEIGHT], [301, HEIGHT]]);
  polygon(g, p.light, [[683, 0], [697, 0], [849, HEIGHT], [783, HEIGHT]]);
  g.globalAlpha = 1;
  for (let i = -1; i < 10; i++) {
    const x = i * 128 - cam * .65 % 128;
    canopy(g, p, x, 386 + Math.sin(i * 2 + frame * .002) * 2, 76, p.near);
  }
}

function cavern(g: CanvasRenderingContext2D, p: Palette, cam: number, frame: number) {
  // Amber sandstone chambers, cool quartz seams and a distant subterranean lake.
  for (let layer = 0; layer < 3; layer++) {
    const speed = .12 + layer * .15;
    const spacing = 224 - layer * 24;
    for (let i = -1; i < 8; i++) {
      const id = i + Math.floor(cam * speed / spacing);
      const x = i * spacing - cam * speed % spacing;
      const h = 80 + noise(id, layer) * 160;
      polygon(g, layer === 0 ? p.distant : layer === 1 ? p.far : p.mid, [[x - 10, HEIGHT], [x + 22, HEIGHT - h], [x + 54, HEIGHT - h - 45], [x + 92, HEIGHT - h - 12], [x + 136, HEIGHT - h + 20], [x + spacing + 10, HEIGHT]]);
      if (layer === 1) {
        block(g, p.strata, x + 30, HEIGHT - h + 20, 48, 4);
        block(g, p.strata, x + 43, HEIGHT - h + 54, 72, 3);
        crystal(g, p, x + 48, HEIGHT - h + 3, 64, 20);
        crystal(g, p, x + 25, HEIGHT - h + 15, 35, 16);
        crystal(g, p, x + 72, HEIGHT - h + 16, 44, 18);
      }
    }
  }
  g.globalAlpha = .3;
  block(g, p.glow, 0, 398, WIDTH, 146);
  for (let i = 0; i < 18; i++) {
    const x = (i * 83 + frame * .15 - cam * .2) % WIDTH;
    block(g, p.light, x, 407 + i % 5 * 18, 20 + i % 4 * 10, 2);
  }
  g.globalAlpha = 1;
  for (let i = -1; i < 8; i++) {
    const x = i * 175 - cam * .45 % 175;
    const h = 28 + noise(i + Math.floor(cam * .45 / 175), 5) * 50;
    block(g, p.near, x, 0, 177, 20);
    polygon(g, p.near, [[x, 15], [x + 32, h], [x + 46, 24], [x + 85, h * .7], [x + 104, 22], [x + 145, h + 15], [x + 163, 16]]);
    block(g, p.rock, x + 9, 15, 24, 3);
  }
  for (let i = -1; i < 7; i++) {
    const x = i * 192 - cam * .57 % 192;
    polygon(g, p.near, [[x, HEIGHT], [x + 10, 416], [x + 33, 375], [x + 57, 416], [x + 86, HEIGHT]]);
    crystal(g, p, x + 50, 446, 41, 17);
  }
}

function castle(g: CanvasRenderingContext2D, p: Palette, cam: number, frame: number) {
  // Moonlit original clock citadel with distant roofs and open vaulted halls.
  block(g, p.light, 733 - cam * .04 % 110, 36, 54, 54);
  block(g, p.horizon, 774 - cam * .04 % 110, 36, 13, 16);
  g.globalAlpha = .5;
  for (let i = 0; i < 46; i++) block(g, p.light, (noise(i, 4) * 1400 - cam * .08 + 1400) % 1400, noise(i, 6) * 180, 2, 2);
  g.globalAlpha = 1;
  for (let layer = 0; layer < 2; layer++) {
    const speed = layer ? .28 : .12;
    for (let i = -1; i < 8; i++) {
      const id = i + Math.floor(cam * speed / 172);
      const x = i * 172 - cam * speed % 172;
      const y = 144 + noise(id, layer) * 96;
      const color = layer ? p.far : p.distant;
      block(g, color, x, y, 89, HEIGHT - y);
      polygon(g, color, [[x - 7, y], [x + 44, y - 42], [x + 96, y]]);
      block(g, color, x + 86, y + 62, 92, HEIGHT - y);
      for (let k = 0; k < 4; k++) block(g, color, x + 95 + k * 23, y + 53, 12, 14);
      g.globalAlpha = layer ? .55 : .23;
      for (let row = 0; row < 3; row++) {
        block(g, p.glow, x + 21, y + 32 + row * 43, 8, 16);
        block(g, p.glow, x + 57, y + 32 + row * 43, 8, 16);
      }
      g.globalAlpha = 1;
    }
  }
  for (let i = -1; i < 6; i++) {
    const x = i * 264 - cam * .47 % 264;
    // Arches have open centers; they never masquerade as playable platforms.
    polygon(g, p.mid, [[x, 0], [x + 264, 0], [x + 264, 82], [x + 231, 82], [x + 231, 61], [x + 211, 61], [x + 211, 44], [x + 181, 44], [x + 181, 32], [x + 82, 32], [x + 82, 44], [x + 52, 44], [x + 52, 61], [x + 32, 61], [x + 32, 82], [x, 82]]);
    block(g, p.mid, x, 70, 26, HEIGHT - 70);
    block(g, p.near, x + 20, 70, 6, HEIGHT - 70);
    block(g, p.rock, x + 4, 82, 4, HEIGHT - 82);
    for (let y = 102; y < HEIGHT; y += 44) block(g, p.mortar, x, y, 26, 2);
    block(g, p.rock, x - 4, 74, 34, 9);
    block(g, p.rock, x - 7, 390, 40, 10);
    if (i % 2 === 0) {
      g.globalAlpha = .6;
      g.strokeStyle = p.glow;
      g.lineWidth = 2;
      g.beginPath(); g.arc(x + 138, 145, 42, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        block(g, p.glow, x + 136 + Math.cos(a) * 35, 143 + Math.sin(a) * 35, 3, 3);
      }
      g.beginPath(); g.moveTo(x + 138, 145); g.lineTo(x + 138 + Math.cos(frame * .002) * 25, 145 + Math.sin(frame * .002) * 25); g.stroke();
      g.globalAlpha = 1;
    }
    block(g, p.metal, x + 10, 225, 22, 5);
    block(g, p.flower, x + 24, 215, 4, 10);
    block(g, p.light, x + 24, 209 + Math.sin(frame * .12 + i) * 2, 4, 6);
  }
}

export function drawSceneryTerrain(g: CanvasRenderingContext2D, level: SceneryLevel, world: number, cam: number) {
  const p = palette(world);
  const tile = (x: number, y: number) => x < 0 || x >= level.cols || y < 0 || y >= ROWS ? 0 : level.grid[y * level.cols + x] ?? 0;
  const start = Math.max(0, Math.floor(cam / TILE) - 1);
  const end = Math.min(level.cols, start + WIDTH / TILE + 3);
  g.save();
  for (let cx = start; cx < end; cx++) for (let cy = 0; cy < ROWS; cy++) {
    const t = tile(cx, cy);
    if (!t) continue;
    const x = cx * TILE - cam;
    const y = cy * TILE;
    const n = noise(cx, cy);
    if (t === 1) {
      block(g, p.soil, x, y, TILE, TILE);
      if (world === 1) {
        // Earth strata and embedded stones continue seamlessly across tiles.
        block(g, p.strata, x, y + 23 + Math.floor(n * 4), TILE, 3);
        block(g, p.shade, x + 5, y + 13, 9, 3);
        block(g, p.rock, x + 7, y + 10, 8, 3);
        block(g, p.strata, x + 23, y + 5, 4, 5);
        block(g, p.rock, x + 23, y + 18, 4, 2);
      } else if (world === 2) {
        polygon(g, p.strata, [[x, y + 12], [x + 10, y + 10], [x + 23, y + 13], [x + 32, y + 10], [x + 32, y + 14], [x + 14, y + 16], [x, y + 15]]);
        block(g, p.rock, x + 3, y + 23, 14, 2);
        block(g, p.shade, x + 21, y + 17, 2, 9);
        if (n > .85) {
          block(g, p.glow, x + 22, y + 21, 3, 5);
          block(g, p.cap, x + 25, y + 24, 3, 3);
        }
      } else {
        block(g, p.mortar, x, y + 30, TILE, 2);
        block(g, p.mortar, x + (cy % 2 ? 9 : 24), y + 2, 2, 28);
        block(g, p.rock, x + 3, y + 3, 18, 2);
        block(g, p.strata, x + 4, y + 25, 18, 2);
        if (n > .8) {
          block(g, p.shade, x + 12, y + 8, 2, 8);
          block(g, p.shade, x + 14, y + 14, 5, 2);
        }
      }
      if (!tile(cx, cy - 1)) {
        block(g, p.edge, x, y + 6, TILE, 6);
        block(g, p.cap, x, y, TILE, 5);
        block(g, p.light, x + 2, y, 15, 1);
        if (world === 1) {
          for (let k = 0; k < 4; k++) {
            const h = 2 + Math.floor(noise(cx * 4 + k, cy) * 4);
            block(g, p.leaf, x + k * 8 + 2, y + 4, 3, h + 4);
            block(g, p.cap, x + k * 8 + 3, y - h, 2, h);
          }
          if (n > .78) {
            block(g, p.leaf, x + 23, y - 6, 2, 6);
            block(g, p.flower, x + 21, y - 8, 5, 3);
            block(g, p.light, x + 23, y - 8, 1, 1);
          }
          if (cy + 1 < ROWS && tile(cx, cy + 1)) {
            block(g, p.edge, x + 10, y + 11, 2, 8);
            block(g, p.edge, x + 12, y + 17, 5, 2);
          }
        } else {
          block(g, p.rock, x + 4, y + 7, 10, 2);
          block(g, p.strata, x + 24, y + 8, 3, 5);
        }
      }
      if (!tile(cx - 1, cy)) block(g, p.rock, x, y + 5, 2, 27);
      if (!tile(cx + 1, cy)) block(g, p.shade, x + 29, y + 5, 3, 27);
    } else if (t === 2) {
      block(g, p.edge, x, y, TILE, TILE);
      block(g, p.rock, x + 1, y + 1, TILE - 2, 13);
      block(g, p.soil, x + 1, y + 17, TILE - 2, 13);
      block(g, p.mortar, x, y + 14, TILE, 3);
      block(g, p.mortar, x + 15, y + 1, 2, 13);
      block(g, p.mortar, x + 7, y + 17, 2, 13);
      block(g, p.cap, x + 2, y + 1, 12, 2);
      block(g, p.rock, x + 10, y + 18, 17, 2);
      block(g, p.shade, x + 1, y + 29, TILE - 2, 2);
      if (world === 3 && cx % 3 === 0) {
        block(g, p.glow, x + 23, y + 5, 2, 6);
        block(g, p.glow, x + 21, y + 7, 6, 2);
      }
    } else if (t === 4) {
      // Bloco surpresa: o desenho é apenas visual; a colisão usa o mesmo tile de 32px.
      block(g, "#9a5b22", x, y, TILE, TILE);
      block(g, "#f5b83d", x + 2, y + 2, TILE - 4, TILE - 4);
      block(g, "#ffe28a", x + 4, y + 4, TILE - 8, 4);
      block(g, "#c77b25", x + 4, y + 26, TILE - 8, 3);
      block(g, "#fff2b0", x + 13, y + 7, 6, 4);
      block(g, "#fff2b0", x + 17, y + 11, 5, 7);
      block(g, "#fff2b0", x + 13, y + 18, 6, 4);
      block(g, "#fff2b0", x + 13, y + 24, 5, 3);
    } else {
      // The original floating tile is painted 14px tall; its collider is unchanged.
      block(g, p.edge, x, y, TILE, 14);
      block(g, p.cap, x, y, TILE, 4);
      block(g, p.light, x + 2, y, 18, 1);
      block(g, p.soil, x + 1, y + 5, TILE - 2, 5);
      block(g, p.shade, x, y + 11, TILE, 3);
      block(g, p.rock, x + 8, y + 6, 8, 2);
      if (world === 1) {
        block(g, p.leaf, x + 5, y + 3, 4, 4);
        block(g, p.leaf, x + 24, y + 3, 3, 5);
      } else if (world === 3) block(g, p.glow, x + 23, y + 6, 3, 2);
    }
  }
  g.restore();
}

export function drawSceneryMovers(g: CanvasRenderingContext2D, movers: readonly SceneryMover[], world: number, cam: number) {
  const p = palette(world);
  g.save();
  for (const m of movers) {
    const x = m.x - cam;
    if (x < -140 || x > WIDTH + 140) continue;
    block(g, p.metal, x, m.y, m.w, m.h);
    block(g, p.cap, x, m.y, m.w, 3);
    block(g, p.light, x + 2, m.y, m.w - 4, 1);
    block(g, p.soil, x + 3, m.y + 5, m.w - 6, 6);
    block(g, p.shade, x, m.y + m.h - 3, m.w, 3);
    for (let k = 6; k < m.w - 6; k += 16) block(g, p.rock, x + k, m.y + 6, 2, 3);
    block(g, p.glow, x + m.w / 2 - 3, m.y + 5, 6, 6);
    block(g, p.light, x + m.w / 2 - 1, m.y + 6, 2, 3);
  }
  g.restore();
}
