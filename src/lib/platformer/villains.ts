/* Visual-only original creatures. No simulation state is changed here. */
type EnemyView = { x: number; y: number; vx: number; t: number; kind: "walker" | "chaser" | "sentry" };
type BossView = { x: number; y: number; w: number; h: number; hurt: number; active: boolean; phase: string; pt: number; dying: number };
let colors: Record<string, string> | undefined;
function palette() {
  if (colors) return colors;
  const css = getComputedStyle(document.documentElement);
  colors = Object.fromEntries(["enemy-dark", "enemy-red", "enemy-red-light", "enemy-green", "enemy-green-light", "enemy-gold", "enemy-light", "boss-armor", "boss-plate", "boss-cape", "boss-shadow", "opening-cyan", "shroom-cap", "shroom-cap-hi", "shroom-cap-dark", "shroom-spot", "shroom-body", "shroom-body-shade"].map(key => [key, css.getPropertyValue(`--${key}`).trim()]));
  return colors;
}

/** Cogumelos marrons originais: corpinho redondo, chapéu de cogumelo, olhão bravo e perninhas. */
export function paintEnemy(g: CanvasRenderingContext2D, e: EnemyView, cam: number) {
  const c = palette();
  const x = Math.round(e.x - cam), y = Math.round(e.y);
  const rect = (role: string, a: number, b: number, w: number, h: number) => { g.fillStyle = c[role] ?? "transparent"; g.fillRect(x + a, y + b, w, h); };
  g.save();
  const walk = e.kind === "sentry" ? 0 : Math.round(Math.sin(e.t * 2.4) * 2);
  const dir = e.vx > 0 ? 1 : e.vx < 0 ? -1 : 0;
  const cap = e.kind === "chaser" ? "shroom-cap-dark" : e.kind === "sentry" ? "enemy-gold" : "shroom-cap";
  // perninhas alternando no passo
  rect("enemy-dark", 5, 24 + walk, 7, 4);
  rect("enemy-dark", 16, 24 - walk, 7, 4);
  // corpinho arredondado com contorno
  rect("enemy-dark", 6, 12, 16, 13);
  rect("shroom-body", 7, 13, 14, 11);
  rect("shroom-body-shade", 7, 21, 14, 3);
  // olhões bravos, acompanhando a direção da caminhada
  rect("enemy-light", 8, 15, 5, 5);
  rect("enemy-light", 15, 15, 5, 5);
  rect("enemy-dark", 10 + dir, 17, 2, 3);
  rect("enemy-dark", 17 + dir, 17, 2, 3);
  // sobrancelhas em "V" de bravo
  rect("enemy-dark", 8, 13, 5, 2);
  rect("enemy-dark", 15, 13, 5, 2);
  rect("enemy-dark", 12, 14, 2, 1);
  rect("enemy-dark", 14, 14, 2, 1);
  // boquinha emburrada
  rect("enemy-dark", 12, 22, 4, 1);
  // chapéu de cogumelo marrom com aba e pintas claras
  rect("enemy-dark", 5, 1, 18, 4);
  rect("enemy-dark", 3, 4, 22, 6);
  rect("enemy-dark", 1, 9, 26, 4);
  rect(cap, 6, 2, 16, 3);
  rect(cap, 4, 5, 20, 5);
  rect(cap, 2, 10, 24, 3);
  rect("shroom-cap-hi", 7, 3, 7, 2);
  rect("shroom-spot", 8, 6, 3, 3);
  rect("shroom-spot", 17, 5, 4, 3);
  rect("shroom-spot", 13, 9, 3, 2);
  // sinais próprios de cada tipo
  if (e.kind === "chaser") {
    // chifrudinho de bravo e passo mais largo
    rect("enemy-dark", 4, -1, 4, 3);
    rect("enemy-dark", 20, -1, 4, 3);
  } else if (e.kind === "sentry") {
    // sentinela dourado: cristalzinho no topo e base mais firme
    rect("opening-cyan", 12, -3, 4, 4);
    rect("enemy-light", 13, -2, 2, 2);
    rect("enemy-dark", 4, 24, 20, 3);
  }
  g.restore();
}
export function paintBoss(g: CanvasRenderingContext2D, b: BossView, cam: number, frame: number) {
  const c = palette();
  const flash = b.hurt > 0 && Math.floor(frame / 4) % 2 === 0;
  const vuln = b.phase === "vuln";
  g.save();
  const tremble = b.hurt > 30 || b.phase === "dying" ? Math.sin(frame*2)*4 : 0;
  const entrance = b.active && b.phase === "idle" && b.pt > 65 ? Math.max(0, (b.pt - 65)/25) : 0;
  const fall = b.phase === "dying" ? (1-b.dying/90)*20 : 0;
  g.translate(Math.round(b.x-cam+tremble-12), Math.round(b.y-14+fall));
  g.globalAlpha = b.phase === "dying" ? Math.max(.15,b.dying/90) : 1;
  const r = (role: string, x: number, y: number, w: number, h: number) => { g.fillStyle = flash ? (c["enemy-light"] ?? "transparent") : (c[role] ?? "transparent"); g.fillRect(x,y,w,h); };
  const arm = Math.round(Math.sin(frame*.07)*3) + (b.phase === "rain" ? -16 : b.phase === "orbs" ? -7 : 0);
  // Oversized mantle and shoulder armor are decorative, not new hitboxes.
  r("enemy-dark",4,27,92,77); r("boss-cape",7,29,86,72);
  r("boss-shadow",17,65,66,35); r("boss-armor",21,36,58,52);
  r("enemy-dark",0,32,28,20); r("enemy-dark",72,32,28,20);
  r("enemy-gold",3,34,23,14); r("enemy-gold",74,34,23,14);
  r("enemy-light",6,35,16,3); r("enemy-light",77,35,16,3);
  r("boss-plate",25,40,50,8); r("boss-shadow",23,74,54,10);
  r("enemy-dark",21,6,58,32); r("enemy-gold",24,8,52,27);
  r("enemy-red-light",28,11,44,22); r("enemy-light",29,12,11,3);
  // Angular brows, a lopsided sneer, and an hourglass crown.
  r("enemy-dark",29,15,16,4); r("enemy-dark",56,12,16,4);
  r("enemy-light",31,20,12,7); r("enemy-light",57,18,12,7);
  r("enemy-dark",37,20,4,6); r("enemy-dark",58,18,4,6);
  r("enemy-dark",39,29,27,4); r("enemy-light",47,29,16,2);
  r("enemy-dark",33,0,34,9); r("enemy-gold",36,0,28,6);
  r("opening-cyan",46,-7,8,9); r("enemy-light",48,-5,3,4);
  r("enemy-dark",34,51,32,24); r(vuln ? "enemy-gold" : "opening-cyan",39,55,22,16);
  r("enemy-light",47,56,6,12);
  r("enemy-dark",0,54+arm,21,26); r("boss-plate",3,56+arm,15,18); r("enemy-gold",3,71+arm,15,5);
  r("enemy-dark",79,54-arm,21,26); r("boss-plate",82,56-arm,15,18); r("enemy-gold",82,71-arm,15,5);
  const stride = b.phase === "leap" ? Math.round(Math.sin(frame*.12)*4) : 0;
  r("enemy-dark",19,95+stride,29,15-stride); r("enemy-dark",53,95-stride,29,15+stride);
  r("enemy-gold",22,98+stride,23,5); r("enemy-gold",56,98-stride,23,5);
  if (vuln || entrance > 0) {
    g.fillStyle = c["enemy-gold"] ?? "transparent";
    for (let i=0;i<6;i++) { const a=frame*.025+i*Math.PI/3; g.fillRect(Math.round(50+Math.cos(a)*66),Math.round(52+Math.sin(a)*55),4,4); }
  }
  if (vuln) {
    g.font = "9px 'Press Start 2P', monospace"; g.textAlign="center";
    g.fillStyle=c["enemy-dark"] ?? "transparent"; g.fillRect(-40,-33,180,20);
    g.fillStyle=c["enemy-gold"] ?? "transparent"; g.fillText("VULNERÁVEL! APERTE X",50,-19);
  } else if (b.active && b.phase === "idle" && b.pt > 0 && b.pt < 60) {
    g.fillStyle = c["enemy-red"] ?? "transparent"; g.font="24px 'Press Start 2P', monospace"; g.textAlign="center"; g.fillText("!",50,-13);
  }
  g.restore();
}
