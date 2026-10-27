import { useEffect, useRef, type ReactNode } from "react";
import { paintHero, VH, VW } from "@/lib/platformer/engine";

type P = { x: number; y: number; z: number; vy: number; ph: number };

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function TitleScreen({ onPlay, onRanking, children }: { onPlay: () => void; onRanking: () => void; children?: ReactNode }) {
  const sub = children != null;
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const showHeroes = !sub;
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    g.imageSmoothingEnabled = false;
    const C = {
      sky1: css("--title-sky-1"),
      sky2: css("--title-sky-2"),
      sky3: css("--title-sky-3"),
      moon: css("--title-moon"),
      far: css("--title-ruin-far"),
      mid: css("--title-ruin-mid"),
      near: css("--title-ruin-near"),
      cyan: css("--title-cyan"),
      stone: css("--title-stone"),
      stoneCore: css("--title-stone-core"),
      violet: css("--title-violet"),
    };
    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * VW,
      y: Math.random() * VH * 0.6,
      s: Math.random() < 0.15 ? 2 : 1,
      ph: Math.random() * 6.28,
    }));
    const parts: P[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * VW,
      y: Math.random() * VH,
      z: 0.3 + Math.random() * 1.2,
      vy: 0.15 + Math.random() * 0.4,
      ph: Math.random() * 6.28,
    }));
    const shards = Array.from({ length: 7 }, (_, i) => ({
      x: 80 + i * 130 + Math.random() * 40,
      y: 110 + Math.random() * 180,
      r: Math.random() * 6.28,
      s: 5 + Math.random() * 6,
    }));

    // ruínas geradas uma vez por camada
    const ruins = (seed: number, base: number, hMin: number, hMax: number) => {
      const out: { x: number; w: number; h: number; arch: boolean }[] = [];
      let x = -40;
      let s = seed;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      while (x < VW * 2) {
        const w = 30 + rnd() * 70;
        out.push({ x, w, h: hMin + rnd() * (hMax - hMin), arch: rnd() < 0.35 });
        x += w + rnd() * 40;
      }
      return { out, base };
    };
    const far = ruins(7, VH - 150, 60, 170);
    const mid = ruins(21, VH - 90, 40, 120);

    const drawRuins = (layer: ReturnType<typeof ruins>, color: string, off: number, archColor: string) => {
      g.fillStyle = color;
      for (const r of layer.out) {
        const x = ((r.x - off) % (VW * 2) + VW * 2) % (VW * 2) - 40;
        g.fillRect(Math.round(x), layer.base - r.h, Math.round(r.w), r.h + 200);
        // ameias
        for (let k = 0; k < r.w - 6; k += 12) g.fillRect(Math.round(x + k), layer.base - r.h - 6, 6, 6);
        if (layer.base > VH - 120) {
          // copa de árvores sobre as ruínas médias, como na Floresta Antiga
          g.fillRect(Math.round(x - 8), layer.base - r.h - 22, Math.round(r.w + 16), 16);
          g.fillRect(Math.round(x + 4), layer.base - r.h - 34, Math.round(r.w - 8), 12);
        }
        if (r.arch) {
          g.save();
          g.fillStyle = archColor;
          g.fillRect(Math.round(x + r.w * 0.3), layer.base - r.h * 0.55, Math.round(r.w * 0.4), r.h * 0.55);
          g.restore();
        }
      }
    };

    let raf = 0;
    let t = 0;
    const tick = () => {
      t++;
      // céu
      const sky = g.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, C.sky1);
      sky.addColorStop(0.55, C.sky2);
      sky.addColorStop(1, C.sky3);
      g.globalAlpha = 1;
      g.fillStyle = sky;
      g.fillRect(0, 0, VW, VH);

      // estrelas
      for (const s of stars) {
        g.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.03 + s.ph));
        g.fillStyle = C.moon;
        g.fillRect(s.x, s.y, s.s, s.s);
      }

      // lua grande com halo
      const mx = VW * 0.78, my = 120;
      g.globalAlpha = 1;
      const halo = g.createRadialGradient(mx, my, 40, mx, my, 220);
      halo.addColorStop(0, C.moon);
      halo.addColorStop(0.3, C.violet);
      halo.addColorStop(1, "transparent");
      g.globalAlpha = 0.25;
      g.fillStyle = halo;
      g.fillRect(0, 0, VW, VH);
      g.globalAlpha = 0.9;
      g.fillStyle = C.moon;
      g.beginPath();
      g.arc(mx, my, 62, 0, 6.28);
      g.fill();
      g.globalAlpha = 0.18;
      g.fillStyle = C.sky2;
      g.beginPath();
      g.arc(mx - 18, my - 10, 12, 0, 6.28);
      g.arc(mx + 20, my + 18, 8, 0, 6.28);
      g.fill();

      // anel de relógio gigante (símbolo temporal) atrás da pedra
      const cx = VW / 2, cy = 250;
      g.save();
      g.translate(cx, cy);
      g.globalAlpha = 0.22;
      g.strokeStyle = C.cyan;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 150, 0, 6.28);
      g.stroke();
      g.setLineDash([4, 10]);
      g.beginPath();
      g.arc(0, 0, 175, t * 0.002, t * 0.002 + 6.28);
      g.stroke();
      g.setLineDash([]);
      g.rotate(t * 0.003);
      for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6);
        g.fillStyle = C.cyan;
        g.fillRect(-2, -150, 4, i % 3 === 0 ? 14 : 7);
      }
      g.restore();

      // ruínas distantes e médias (parallax lento)
      g.globalAlpha = 1;
      drawRuins(far, C.far, t * 0.08, C.sky2);
      // névoa
      const fog = g.createLinearGradient(0, VH - 220, 0, VH - 60);
      fog.addColorStop(0, "transparent");
      fog.addColorStop(1, C.violet);
      g.globalAlpha = 0.25;
      g.fillStyle = fog;
      g.fillRect(0, VH - 220, VW, 220);
      g.globalAlpha = 1;
      drawRuins(mid, C.mid, t * 0.2, C.far);

      // linhas de energia no chão
      g.globalAlpha = 0.5;
      g.fillStyle = C.cyan;
      for (let i = 0; i < 4; i++) {
        const lx = ((t * (1.2 + i * 0.4) + i * 260) % (VW + 200)) - 100;
        g.fillRect(lx, VH - 58 + i * 6, 60, 1);
      }

      // chão próximo
      g.globalAlpha = 1;
      g.fillStyle = C.near;
      g.fillRect(0, VH - 52, VW, 52);
      g.fillStyle = C.mid;
      for (let x = 0; x < VW; x += 32) g.fillRect(x, VH - 52, 30, 4);
      // grama e flores do caminho
      g.fillStyle = C.stone;
      g.fillRect(0, VH - 54, VW, 6);
      for (let x = 0; x < VW; x += 16) g.fillRect(x + ((x * 7) % 9), VH - 58, 4, 4);
      g.fillStyle = C.violet;
      for (let x = 40; x < VW; x += 110) g.fillRect(x + ((x * 13) % 30), VH - 60, 4, 4);

      // fragmentos flutuantes (girando lentamente)
      for (const sh of shards) {
        sh.r += 0.01;
        const y = sh.y + Math.sin(t * 0.02 + sh.x) * 6;
        g.save();
        g.translate(sh.x, y);
        g.rotate(sh.r);
        g.globalAlpha = 0.55;
        g.fillStyle = C.stone;
        g.beginPath();
        g.moveTo(0, -sh.s);
        g.lineTo(sh.s * 0.6, 0);
        g.lineTo(0, sh.s);
        g.lineTo(-sh.s * 0.6, 0);
        g.fill();
        g.restore();
      }

      // Pedra do Tempo
      const fy = cy + Math.sin(t * 0.025) * 10;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.05);
      const glow = g.createRadialGradient(cx, fy, 8, cx, fy, 120 + pulse * 20);
      glow.addColorStop(0, C.stoneCore);
      glow.addColorStop(0.25, C.stone);
      glow.addColorStop(1, "transparent");
      g.globalAlpha = 0.45;
      g.fillStyle = glow;
      g.fillRect(cx - 160, fy - 160, 320, 320);
      g.globalAlpha = 1;
      const H = 46, W = 30;
      g.fillStyle = C.stone;
      g.beginPath();
      g.moveTo(cx, fy - H);
      g.lineTo(cx + W, fy - 8);
      g.lineTo(cx, fy + H);
      g.lineTo(cx - W, fy - 8);
      g.closePath();
      g.fill();
      g.fillStyle = C.stoneCore;
      g.beginPath();
      g.moveTo(cx, fy - H + 10);
      g.lineTo(cx + 10, fy - 8);
      g.lineTo(cx, fy + 14);
      g.lineTo(cx - 12, fy - 8);
      g.closePath();
      g.fill();
      g.globalAlpha = 0.7;
      g.strokeStyle = C.cyan;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx - W, fy - 8);
      g.lineTo(cx + W, fy - 8);
      g.stroke();
      // fragmentos orbitando
      for (let i = 0; i < 5; i++) {
        const a = t * 0.02 + (i * Math.PI * 2) / 5;
        const ox = cx + Math.cos(a) * 80;
        const oy = fy + Math.sin(a) * 24;
        g.globalAlpha = Math.sin(a) > 0 ? 1 : 0.5;
        g.fillStyle = i % 2 ? C.cyan : C.stoneCore;
        g.fillRect(Math.round(ox) - 3, Math.round(oy) - 3, 6, 6);
      }

      // partículas em diferentes profundidades
      for (const p of parts) {
        p.y -= p.vy * p.z;
        p.x += Math.sin(t * 0.01 + p.ph) * 0.2;
        if (p.y < -5) {
          p.y = VH + 5;
          p.x = Math.random() * VW;
        }
        g.globalAlpha = 0.25 + 0.5 * (p.z / 1.5);
        g.fillStyle = p.z > 1 ? C.stoneCore : C.cyan;
        const sz = p.z > 1.1 ? 3 : p.z > 0.7 ? 2 : 1;
        g.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
      }

      // Léo e Luna em espera
      g.globalAlpha = 1;
      const breathe = (ph: number) => Math.round(Math.sin(t * 0.06 + ph) * 1.5);
      for (const [id, x, face, ph] of showHeroes ? ([["leo", 180, 1, 0], ["luna", VW - 230, -1, 2]] as const) : []) {
        g.save();
        g.globalAlpha = 0.35;
        g.fillStyle = C.sky1;
        g.beginPath();
        g.ellipse(x + 24, VH - 52, 26, 5, 0, 0, 6.28);
        g.fill();
        g.globalAlpha = 1;
        g.translate(x, VH - 52 - 68 + breathe(ph));
        g.scale(2, 2);
        paintHero(g, 0, 0, id, { running: false, anim: t * 0.05, air: false, face, hurt: false, frame: t });
        g.restore();
      }

      // vinheta
      const vig = g.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.7);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, C.sky1);
      g.globalAlpha = 0.8;
      g.fillStyle = vig;
      g.fillRect(0, 0, VW, VH);
      g.globalAlpha = 1;

      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [sub]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-title-sky">
      <canvas
        ref={ref}
        width={VW}
        height={VH}
        className="absolute inset-0 h-full w-full [image-rendering:pixelated]"
      />

      {/* Detalhes de interface nas bordas */}
      <div className="pointer-events-none absolute inset-3 sm:inset-5">
        {(["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "left-0 bottom-0 border-l-2 border-b-2", "right-0 bottom-0 border-r-2 border-b-2"] as const).map((c) => (
          <span key={c} className={`absolute h-6 w-6 border-title-cyan/70 sm:h-10 sm:w-10 ${c}`} />
        ))}
        <span className="absolute left-12 right-12 top-0 h-px bg-gradient-to-r from-transparent via-title-cyan/40 to-transparent" />
        <span className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-title-cyan/40 to-transparent" />
        <span className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="title-led h-1.5 w-1.5 rounded-full bg-title-cyan" style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
        </span>
        <span className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="title-led h-1.5 w-1.5 rounded-full bg-title-stone" style={{ animationDelay: `${i * 0.6 + 0.3}s` }} />
          ))}
        </span>
      </div>

      {sub ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-title-sky/40 px-5 py-6 text-center sm:px-10">
          {children}
        </div>
      ) : (
      <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-[5%] text-center">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <p className="font-pixel text-[8px] uppercase tracking-[0.5em] text-title-cyan/80 sm:text-[10px]">
            ◆ A Lenda da ◆
          </p>
          <h2 className="title-glow font-pixel text-2xl leading-tight sm:text-5xl">
            PEDRA DO TEMPO
          </h2>
          <span className="h-px w-40 bg-gradient-to-r from-transparent via-title-stone to-transparent sm:w-72" />
        </div>

        <nav className="mb-[2%] flex flex-col items-center gap-3 sm:gap-4">
          <button type="button" onClick={onPlay} autoFocus className="title-btn title-btn-primary group">
            <span className="title-btn-arrow">▶</span>
            <span>Jogar</span>
          </button>
          <button type="button" onClick={onRanking} className="title-btn title-btn-secondary group">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden>
              <path d="M3 2h10v2h2v3a3 3 0 0 1-3 3h-.4A4 4 0 0 1 9 12.4V14h3v2H4v-2h3v-1.6A4 4 0 0 1 4.4 10H4a3 3 0 0 1-3-3V4h2V2Zm0 4v1a1 1 0 0 0 1 1V6H3Zm9 0v2a1 1 0 0 0 1-1V6h-1Z" />
            </svg>
            <span>Ranking</span>
          </button>
        </nav>
      </div>
      )}
    </div>
  );
}
