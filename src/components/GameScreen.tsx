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
  fragmentsAll: 0,
  timeSec: 0,
};

const ATTACK_HINT: Record<string, string> = {
  idle: "Atenção! Ele vai atacar…",
  leap: "Salto! Pule as ondas no chão",
  orbs: "Orbes! Pule por cima deles",
  rain: "Chuva do tempo! Saia das marcas",
  vuln: "VULNERÁVEL! Chegue perto e aperte X",
  dying: "",
};

type Screen = "menu" | "name" | "select" | "intro" | "howto" | "ranking" | null;

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<GameState>(initial);
  const [screen, setScreen] = useState<Screen>("menu");
  const [hero, setHero] = useState<Hero | null>(null);
  const [name, setName] = useState("");
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const recorded = useRef(false);
  const lastHero = useRef<Hero>("leo");

  const startGame = (h: Hero) => {
    recorded.current = false;
    lastHero.current = h;
    setScreen(null);
    gameRef.current?.newGame(h);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current, setState);
    gameRef.current = game;
    if (import.meta.env.DEV) (window as unknown as { __game?: Game }).__game = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if ((state.status === "gameover" || state.status === "win") && !recorded.current) {
      recorded.current = true;
      addRanking({
        name: name.trim() || "JOGADOR",
        score: state.score,
        coins: state.coins,
        fragments: state.fragmentsAll,
        hero: lastHero.current,
        date: Date.now(),
      });
    }
  }, [state.status, state.score, state.coins, state.fragmentsAll, name]);

  const replay = () => startGame(lastHero.current);
  const toMenu = () => {
    gameRef.current?.toMenu();
    setScreen("menu");
  };
  const openRanking = () => {
    setRanking(loadRanking());
    setScreen("ranking");
  };


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
          <Banner title="O GUARDIÃO DO TEMPO FOI DERROTADO!" subtitle="Um portal vai se abrir à direita. Caminhe até ele!" />
        )}
        {state.status === "dead" && <Banner title="Ops!" subtitle="Voltando ao último checkpoint…" />}

        {overlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-[color-mix(in_oklab,var(--background)_86%,transparent)] px-6 py-4 text-center backdrop-blur-sm">
            {overlay === "menu" && (
              <>
                <h2 className="font-pixel text-xl leading-relaxed text-foreground sm:text-3xl">
                  A LENDA DA <span className="text-accent">PEDRA DO TEMPO</span>
                </h2>
                <p className="font-pixel text-[9px] uppercase tracking-widest text-muted-foreground">
                  Uma aventura de plataforma em 3 mundos
                </p>
                <div className="flex flex-col gap-3">
                  <PrimaryBtn onClick={() => setScreen("name")}>Jogar</PrimaryBtn>
                  <MenuBtn onClick={openRanking}>Ranking</MenuBtn>
                </div>
              </>
            )}
            {overlay === "name" && (
              <form
                className="flex flex-col items-center gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) {
                    setHero(null);
                    setScreen("select");
                  }
                }}
              >
                <h2 className="font-pixel text-base text-foreground sm:text-xl">DIGITE SEU NOME</h2>
                <input
                  autoFocus
                  value={name}
                  maxLength={14}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Seu nome"
                  className="w-64 rounded-xl border-4 border-border bg-input px-4 py-3 text-center font-pixel text-xs uppercase text-foreground outline-none focus:border-primary"
                />
                <PrimaryBtn type="submit" disabled={!name.trim()}>Continuar</PrimaryBtn>
                <MenuBtn onClick={() => setScreen("menu")}>Voltar</MenuBtn>
              </form>
            )}
            {overlay === "select" && (
              <>
                <h2 className="font-pixel text-base leading-relaxed text-foreground sm:text-xl">
                  ESCOLHA SEU PERSONAGEM
                </h2>
                <div className="flex gap-4 sm:gap-8">
                  <HeroCard id="leo" name="Léo" desc="Menino aventureiro" selected={hero === "leo"} onPick={setHero} />
                  <HeroCard id="luna" name="Luna" desc="Menina aventureira" selected={hero === "luna"} onPick={setHero} />
                </div>
                {hero && <PrimaryBtn onClick={() => setScreen("intro")}>Continuar</PrimaryBtn>}
              </>
            )}
            {overlay === "intro" && (
              <>
                <h2 className="font-pixel text-base text-accent sm:text-lg">A Pedra do Tempo</h2>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                  A Pedra do Tempo, um artefato antigo, foi quebrada e seus fragmentos foram espalhados por
                  diferentes mundos.
                </p>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {hero === "luna" ? "Luna" : "Léo"} deverá atravessar esses mundos, superar obstáculos, enfrentar
                  inimigos e recuperar os fragmentos para reconstruir a Pedra do Tempo.
                </p>
                <div className="rounded-xl border-2 border-border bg-card px-5 py-3">
                  <p className="font-pixel text-[10px] uppercase text-primary">Objetivo</p>
                  <p className="mt-2 text-sm text-foreground">
                    Recupere os fragmentos da Pedra do Tempo e chegue ao Castelo do Tempo.
                  </p>
                </div>
                <p className="font-pixel text-[10px] uppercase text-foreground">Mundo 1 — Floresta Antiga</p>
                <PrimaryBtn onClick={() => setScreen("howto")}>Continuar</PrimaryBtn>
              </>
            )}
            {overlay === "howto" && (
              <>
                <h2 className="font-pixel text-base text-foreground sm:text-xl">COMO JOGAR</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-left font-pixel text-[10px] uppercase">
                  <span className="text-accent">← / →</span><span className="text-foreground">Mover</span>
                  <span className="text-accent">Espaço</span><span className="text-foreground">Pular</span>
                  <span className="text-accent">X</span><span className="text-foreground">Atacar</span>
                  <span className="text-accent">P</span><span className="text-foreground">Pausar</span>
                </div>
                <p className="max-w-md text-sm text-muted-foreground">
                  Colete moedas e fragmentos, enfrente inimigos e avance pelas fases.
                </p>
                <PrimaryBtn onClick={() => startGame(hero ?? "leo")}>Começar</PrimaryBtn>
              </>
            )}
            {overlay === "ranking" && (
              <>
                <h2 className="font-pixel text-xl text-accent">RANKING</h2>
                {ranking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma partida registrada ainda.</p>
                ) : (
                  <ol className="max-h-64 w-full max-w-md overflow-y-auto rounded-xl border-2 border-border bg-card p-3 text-left">
                    {ranking.slice(0, 20).map((r, i) => (
                      <li key={`${r.date}-${i}`} className="flex items-center justify-between gap-3 py-1 font-pixel text-[10px] uppercase">
                        <span className="text-foreground">
                          <span className="text-accent">{i + 1}º</span> — {r.name}
                          <span className="ml-2 text-muted-foreground">({r.hero === "luna" ? "Luna" : "Léo"})</span>
                        </span>
                        <span className="text-chart-4">{r.score} pts</span>
                      </li>
                    ))}
                  </ol>
                )}
                <MenuBtn onClick={() => setScreen("menu")}>Voltar</MenuBtn>
              </>
            )}
            {overlay === "gameover" && (
              <>
                <h2 className="font-pixel text-xl text-destructive">FIM DE JOGO</h2>
                <p className="font-pixel text-sm uppercase text-foreground">{name}</p>
                <p className="font-pixel text-xs uppercase text-muted-foreground">
                  Pontuação: <span className="text-chart-4">{state.score}</span>
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <PrimaryBtn onClick={replay}>Tentar novamente</PrimaryBtn>
                  <MenuBtn onClick={toMenu}>Voltar ao menu</MenuBtn>
                </div>
              </>
            )}
            {overlay === "paused" && (
              <>
                <h2 className="font-pixel text-xl text-foreground">Pausado</h2>
                <p className="text-sm text-muted-foreground">Aperte P para continuar.</p>
                <PrimaryBtn onClick={() => gameRef.current?.togglePause()}>Continuar</PrimaryBtn>
                <MenuBtn onClick={toMenu}>Voltar ao menu</MenuBtn>
              </>
            )}
            {overlay === "win" && (
              <>
                <h2 className="font-pixel text-lg leading-relaxed text-accent sm:text-xl">
                  VOCÊ RECUPEROU A PEDRA DO TEMPO!
                </h2>
                <p className="font-pixel text-sm uppercase text-foreground">{name}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-left font-pixel text-[10px] uppercase text-muted-foreground">
                  <span>Pontuação</span><span className="text-foreground">{state.score}</span>
                  <span>Moedas</span><span className="text-chart-4">{state.coins}</span>
                  <span>Fragmentos</span><span className="text-accent">{state.fragmentsAll}/9</span>
                  <span>Inimigos</span><span className="text-foreground">{state.enemiesDefeated}</span>
                  <span>Tempo</span>
                  <span className="text-foreground">
                    {Math.floor(state.timeSec / 60)}:{String(state.timeSec % 60).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <PrimaryBtn onClick={replay}>Jogar novamente</PrimaryBtn>
                  <MenuBtn onClick={toMenu}>Voltar ao menu</MenuBtn>
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
