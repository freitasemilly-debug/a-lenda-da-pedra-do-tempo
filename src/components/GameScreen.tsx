import { useCallback, useEffect, useRef, useState } from "react";
import { Game, VH, VW, type GameState } from "@/lib/platformer/engine";

const initial: GameState = {
  score: 0,
  lives: 3,
  coins: 0,
  fragments: 0,
  fragmentsTotal: 3,
  world: 1,
  worldName: "Bosque das Horas",
  status: "ready",
  bossHp: 0,
  bossMax: 3,
  checkpoint: false,
  muted: false,
};

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>(initial);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current, setState);
    gameRef.current = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const hold = useCallback((key: "left" | "right" | "jump") => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        gameRef.current?.beginPlay();
        gameRef.current?.setInput(key, true);
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        gameRef.current?.setInput(key, false);
      },
      onPointerCancel: () => gameRef.current?.setInput(key, false),
      onPointerLeave: () => gameRef.current?.setInput(key, false),
    };
  }, []);

  const overlay =
    state.status === "ready" || state.status === "gameover" || state.status === "win" ? state.status : null;

  return (
    <div className="mx-auto w-full max-w-[1000px]">
      {/* HUD */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-center gap-4">
          <Stat label="Pontos" value={state.score.toString().padStart(6, "0")} />
          <Stat label="Moedas" value={`x${state.coins}`} accent="coin" />
          <Stat label="Fragmentos" value={`${state.fragments}/${state.fragmentsTotal}`} accent="shard" />
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">Vidas</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-4 w-4 rounded-[3px] ${i < state.lives ? "bg-destructive" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[9px] uppercase tracking-widest text-accent">
            Mundo {state.world} · {state.worldName}
          </span>
          <button
            type="button"
            onClick={() => gameRef.current?.toggleMute()}
            className="rounded-lg border-2 border-border bg-secondary px-3 py-1 font-pixel text-[9px] uppercase text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {state.muted ? "Som off" : "Som on"}
          </button>
        </div>
      </div>

      {/* Tela */}
      <div className="relative overflow-hidden rounded-2xl border-4 border-border bg-card shadow-[var(--shadow-screen)]">
        <canvas
          ref={canvasRef}
          width={VW}
          height={VH}
          className="block w-full [image-rendering:pixelated]"
          style={{ aspectRatio: `${VW} / ${VH}` }}
        />

        {state.status === "playing" && state.world === 3 && state.bossHp > 0 && (
          <div className="pointer-events-none absolute left-1/2 top-3 w-64 -translate-x-1/2">
            <p className="text-center font-pixel text-[9px] uppercase tracking-widest text-primary-foreground drop-shadow">
              Guardião do Tempo
            </p>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: state.bossMax }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 flex-1 rounded-sm ${i < state.bossHp ? "bg-destructive" : "bg-muted/40"}`}
                />
              ))}
            </div>
          </div>
        )}

        {state.status === "levelclear" && (
          <Banner title="Fase Concluída!" subtitle="A Pedra do Tempo pulsa mais forte…" />
        )}
        {state.status === "dead" && <Banner title="Ops!" subtitle="Voltando ao último checkpoint…" />}

        {overlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[color-mix(in_oklab,var(--background)_82%,transparent)] px-6 text-center backdrop-blur-sm">
            {overlay === "ready" && (
              <>
                <h2 className="font-pixel text-xl leading-relaxed text-foreground sm:text-2xl">
                  Léo e a Pedra do Tempo
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Corra, pule sobre os inimigos, junte moedas e recupere os fragmentos da Pedra do Tempo em três
                  mundos. No final, enfrente o Guardião do Tempo.
                </p>
                <button
                  type="button"
                  onClick={() => gameRef.current?.beginPlay()}
                  className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  Começar
                </button>
                <p className="font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                  ← → mover · espaço pular
                </p>
              </>
            )}
            {overlay === "gameover" && (
              <>
                <h2 className="font-pixel text-xl text-destructive">Fim de jogo</h2>
                <p className="text-sm text-muted-foreground">
                  Pontuação final: <strong className="text-foreground">{state.score}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => gameRef.current?.restart()}
                  className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  Tentar de novo
                </button>
              </>
            )}
            {overlay === "win" && (
              <>
                <h2 className="font-pixel text-lg leading-relaxed text-accent sm:text-xl">
                  A Pedra do Tempo foi restaurada!
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Léo derrotou o Guardião do Tempo e devolveu o fluxo das horas aos três mundos.
                </p>
                <p className="font-pixel text-xs text-foreground">Pontuação: {state.score}</p>
                <button
                  type="button"
                  onClick={() => gameRef.current?.restart()}
                  className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  Jogar novamente
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controles de toque */}
      <div className="mt-4 flex items-center justify-between gap-4 md:hidden">
        <div className="flex gap-3">
          <TouchBtn {...hold("left")}>◀</TouchBtn>
          <TouchBtn {...hold("right")}>▶</TouchBtn>
        </div>
        <TouchBtn {...hold("jump")} wide>
          PULAR
        </TouchBtn>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "coin" | "shard" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span
        className={`font-pixel text-[11px] ${
          accent === "coin" ? "text-chart-4" : accent === "shard" ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Banner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-2 text-center">
      <p className="rounded-lg bg-[color-mix(in_oklab,var(--background)_78%,transparent)] px-5 py-3 font-pixel text-sm text-foreground">
        {title}
      </p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function TouchBtn({
  children,
  wide,
  ...rest
}: React.ComponentProps<"button"> & { wide?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`select-none rounded-2xl border-4 border-border bg-secondary font-pixel text-sm text-secondary-foreground active:bg-accent active:text-accent-foreground ${
        wide ? "px-8 py-5 text-xs" : "px-6 py-5"
      }`}
      style={{ touchAction: "none" }}
    >
      {children}
    </button>
  );
}
