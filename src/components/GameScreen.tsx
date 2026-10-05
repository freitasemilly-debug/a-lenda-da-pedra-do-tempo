import { useCallback, useEffect, useRef, useState } from "react";
import { Game, VH, VW, paintHero, type GameState, type Hero } from "@/lib/platformer/engine";

const initial: GameState = {
  score: 0,
  lives: 3,
  coins: 0,
  fragments: 0,
  fragmentsTotal: 3,
  world: 1,
  worldName: "Floresta Antiga",
  status: "ready",
  bossHp: 0,
  bossMax: 3,
  checkpoint: false,
  muted: false,
  bossVulnerable: false,
  bossDefeated: false,
  bossAttack: "",
  enemiesDefeated: 0,
  timeSec: 0,
};

const ATTACK_HINT: Record<string, string> = {
  idle: "Prepare-se…",
  leap: "Salto! Pule as ondas de choque",
  orbs: "Orbes rasteiros! Pule por cima",
  rain: "Chuva do tempo! Saia das marcas",
  vuln: "VULNERÁVEL! Chegue perto e aperte X",
  dying: "",
};

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>(initial);
  const [choosing, setChoosing] = useState(false);
  const [hero, setHero] = useState<Hero | null>(null);

  const openSelect = () => {
    setHero(null);
    setChoosing(true);
  };
  const play = () => {
    if (!hero) return;
    setChoosing(false);
    lastHero.current = hero;
    gameRef.current?.newGame(hero);
  };

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

  const lastHero = useRef<Hero>("leo");
  const replay = () => {
    gameRef.current?.newGame(lastHero.current);
  };
  const toMenu = () => {
    setChoosing(false);
    gameRef.current?.toMenu();
  };

  const hold = useCallback((key: "left" | "right" | "jump" | "attack") => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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

  const overlay = choosing
    ? "select"
    : state.status === "ready" || state.status === "gameover" || state.status === "win" || state.status === "paused"
      ? state.status
      : null;

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
            onClick={() => gameRef.current?.togglePause()}
            className="rounded-lg border-2 border-border bg-secondary px-3 py-1 font-pixel text-[9px] uppercase text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {state.status === "paused" ? "Continuar" : "Pausa"}
          </button>
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

        {state.status === "playing" && state.world === 3 && state.bossHp > 0 && state.bossAttack && (
          <div className="pointer-events-none absolute left-1/2 top-3 w-72 -translate-x-1/2">
            <p className="text-center font-pixel text-[9px] uppercase tracking-widest text-primary-foreground drop-shadow">
              Guardião do Tempo
            </p>
            <div className="mt-1 flex gap-1">
              {Array.from({ length: state.bossMax }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 flex-1 rounded-sm ${i < state.bossHp ? (state.bossVulnerable ? "bg-chart-4" : "bg-destructive") : "bg-muted/40"}`}
                />
              ))}
            </div>
            <p
              className={`mt-2 text-center font-pixel text-[8px] uppercase leading-relaxed drop-shadow ${
                state.bossVulnerable ? "animate-pulse text-chart-4" : "text-primary-foreground"
              }`}
            >
              {ATTACK_HINT[state.bossAttack] ?? ""}
            </p>
          </div>
        )}

        {state.status === "levelclear" && (
          <Banner title="Fase Concluída!" subtitle="A Pedra do Tempo pulsa mais forte…" />
        )}
        {state.status === "playing" && state.bossDefeated && (
          <Banner title="O Guardião do Tempo foi derrotado!" subtitle="Um portal se abriu. Entre nele!" />
        )}
        {state.status === "dead" && <Banner title="Ops!" subtitle="Voltando ao último checkpoint…" />}

        {overlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[color-mix(in_oklab,var(--background)_82%,transparent)] px-6 text-center backdrop-blur-sm">
            {overlay === "ready" && (
              <>
                <h2 className="font-pixel text-xl leading-relaxed text-foreground sm:text-2xl">
                  A Lenda da Pedra do Tempo
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Uma antiga Pedra do Tempo foi quebrada e seus fragmentos foram espalhados por diferentes mundos.
                  Léo e Luna partiram para recuperá-los. Escolha com quem você quer viver essa aventura!
                </p>
                <button
                  type="button"
                  onClick={openSelect}
                  className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  Começar
                </button>
                <p className="font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                  ← → mover · espaço pular · X atacar · P pausar
                </p>
              </>
            )}
            {overlay === "select" && (
              <>
                <h2 className="font-pixel text-base leading-relaxed text-foreground sm:text-xl">
                  Escolha seu personagem
                </h2>
                <div className="flex gap-4 sm:gap-8">
                  <HeroCard id="leo" name="Léo" desc="Menino aventureiro" selected={hero === "leo"} onPick={setHero} />
                  <HeroCard id="luna" name="Luna" desc="Menina aventureira" selected={hero === "luna"} onPick={setHero} />
                </div>
                {hero && (
                  <button
                    type="button"
                    onClick={play}
                    className="rounded-xl border-4 border-border bg-primary px-8 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                  >
                    Jogar
                  </button>
                )}
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
                  onClick={openSelect}
                  className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  Tentar de novo
                </button>
              </>
            )}
            {overlay === "paused" && (
              <>
                <h2 className="font-pixel text-xl text-foreground">Pausado</h2>
                <p className="text-sm text-muted-foreground">Aperte P para continuar.</p>
                <button
                  type="button"
                  onClick={() => gameRef.current?.togglePause()}
                  className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  Continuar
                </button>
                <MenuBtn onClick={toMenu}>Menu principal</MenuBtn>
              </>
            )}
            {overlay === "win" && (
              <>
                <h2 className="font-pixel text-lg leading-relaxed text-accent sm:text-xl">
                  VOCÊ RECUPEROU A PEDRA DO TEMPO!
                </h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-left font-pixel text-[10px] uppercase text-muted-foreground">
                  <span>Pontuação</span><span className="text-foreground">{state.score}</span>
                  <span>Moedas</span><span className="text-chart-4">{state.coins}</span>
                  <span>Fragmentos</span><span className="text-accent">{state.fragments}</span>
                  <span>Inimigos</span><span className="text-foreground">{state.enemiesDefeated}</span>
                  <span>Tempo</span>
                  <span className="text-foreground">
                    {Math.floor(state.timeSec / 60)}:{String(state.timeSec % 60).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={replay}
                    className="rounded-xl border-4 border-border bg-primary px-6 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                  >
                    Jogar novamente
                  </button>
                  <MenuBtn onClick={toMenu}>Menu principal</MenuBtn>
                </div>
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
        <div className="flex gap-3">
          <TouchBtn {...hold("attack")}>X</TouchBtn>
          <TouchBtn {...hold("jump")} wide>
            PULAR
          </TouchBtn>
        </div>
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

function HeroCard({
  id,
  name,
  desc,
  selected,
  onPick,
}: {
  id: Hero;
  name: string;
  desc: string;
  selected: boolean;
  onPick: (h: Hero) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    let raf = 0;
    let frame = 0;
    const tick = () => {
      frame++;
      g.clearRect(0, 0, cv.width, cv.height);
      g.save();
      g.scale(3, 3);
      paintHero(g, 8, 6, id, {
        running: selected,
        anim: frame * 0.08,
        air: false,
        face: 1,
        hurt: false,
        frame,
      });
      g.restore();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id, selected]);
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-2 rounded-2xl border-4 bg-card px-4 py-3 transition-transform sm:px-6 ${
        selected ? "scale-105 border-primary shadow-[var(--shadow-panel)]" : "border-border opacity-80 hover:opacity-100"
      }`}
    >
      <canvas ref={ref} width={120} height={126} className="h-[84px] w-[80px] [image-rendering:pixelated] sm:h-[126px] sm:w-[120px]" />
      <span className="font-pixel text-xs uppercase text-foreground">{name}</span>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
    </button>
  );
}

function MenuBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border-4 border-border bg-secondary px-6 py-3 font-pixel text-xs uppercase text-secondary-foreground transition-transform hover:scale-105 active:scale-95"
    >
      {children}
    </button>
  );
}
