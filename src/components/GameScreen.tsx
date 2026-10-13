import { useCallback, useEffect, useRef, useState } from "react";
import { Game, VH, VW, paintHero, type GameState, type Hero } from "@/lib/platformer/engine";
import { addRanking, loadRanking, type RankEntry } from "@/lib/platformer/ranking";
import { TitleScreen } from "./TitleScreen";
import { audio } from "@/lib/platformer/audio";

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

  const [snd, setSnd] = useState(audio.settings);
  const [sndOpen, setSndOpen] = useState(false);
  useEffect(() => {
    setSnd(audio.settings);
    const un = audio.subscribe(() => setSnd({ ...audio.settings }));
    const first = () => {
      audio.ensure();
      if (gameRef.current && !audio.currentTrack && stateRef.current === "ready") audio.playMusic("menu");
    };
    const click = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.("button")) audio.click();
    };
    window.addEventListener("pointerdown", first);
    window.addEventListener("keydown", first);
    window.addEventListener("click", click, true);
    return () => {
      un();
      window.removeEventListener("pointerdown", first);
      window.removeEventListener("keydown", first);
      window.removeEventListener("click", click, true);
    };
  }, []);
  const stateRef = useRef(state.status);
  stateRef.current = state.status;

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

  const overlay =
    state.status === "gameover" || state.status === "win" || state.status === "paused"
      ? state.status
      : state.status === "ready"
        ? (screen ?? "menu")
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
<div className="relative">
            <button
              type="button"
              onClick={() => setSndOpen((v) => !v)}
              aria-expanded={sndOpen}
              className="rounded-lg border-2 border-border bg-secondary px-3 py-1 font-pixel text-[9px] uppercase text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {snd.enabled ? "♪ Som" : "♪ Mudo"}
            </button>
            {sndOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 flex w-56 flex-col gap-3 rounded-xl border-2 border-border bg-card p-3 shadow-[var(--shadow-panel)]">
                <button
                  type="button"
                  onClick={() => audio.set({ enabled: !snd.enabled })}
                  className="rounded-lg border-2 border-border bg-secondary px-3 py-1 font-pixel text-[9px] uppercase text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  Áudio: {snd.enabled ? "ligado" : "desligado"}
                </button>
                <label className="flex flex-col gap-1 font-pixel text-[8px] uppercase text-muted-foreground">
                  Música {Math.round(snd.music * 100)}%
                  <input type="range" min={0} max={1} step={0.05} value={snd.music}
                    onChange={(e) => audio.set({ music: Number(e.target.value) })} className="accent-accent" />
                </label>
                <label className="flex flex-col gap-1 font-pixel text-[8px] uppercase text-muted-foreground">
                  Efeitos {Math.round(snd.sfx * 100)}%
                  <input type="range" min={0} max={1} step={0.05} value={snd.sfx}
                    onChange={(e) => { audio.set({ sfx: Number(e.target.value) }); audio.coin(); }} className="accent-accent" />
                </label>
              </div>
            )}
          </div>
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

        {overlay === "menu" && (
          <TitleScreen onPlay={() => setScreen("name")} onRanking={openRanking} />
        )}
        {(overlay === "name" || overlay === "select" || overlay === "intro" || overlay === "ranking") && (
          <TitleScreen onPlay={() => {}} onRanking={() => {}}>
            {overlay === "name" && (
              <form
                className="tpanel flex w-full max-w-sm flex-col items-center gap-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) {
                    setHero(null);
                    setScreen("select");
                  }
                }}
              >
                <ScreenTitle kicker="Jogador">DIGITE SEU NOME</ScreenTitle>
                <input
                  autoFocus
                  value={name}
                  maxLength={14}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  placeholder="Seu nome"
                  className="title-input"
                />
                <button type="submit" disabled={!name.trim()} className="title-btn title-btn-primary">
                  <span className="title-btn-arrow">▶</span><span>Continuar</span>
                </button>
                <button type="button" onClick={() => setScreen("menu")} className="title-btn title-btn-secondary">Voltar</button>
              </form>
            )}
            {overlay === "select" && (
              <div className="flex w-full flex-col items-center gap-4 sm:gap-6">
                <ScreenTitle kicker="Herói">ESCOLHA SEU PERSONAGEM</ScreenTitle>
                <div className="flex gap-4 sm:gap-8">
                  <HeroCard id="leo" name="Léo" desc="Menino aventureiro" selected={hero === "leo"} onPick={setHero} />
                  <HeroCard id="luna" name="Luna" desc="Menina aventureira" selected={hero === "luna"} onPick={setHero} />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button type="button" onClick={() => setScreen("name")} className="title-btn title-btn-secondary">Voltar</button>
                  <button type="button" disabled={!hero} onClick={() => setScreen("intro")} className="title-btn title-btn-primary">
                    <span className="title-btn-arrow">▶</span><span>Continuar</span>
                  </button>
                </div>
              </div>
            )}
            {overlay === "intro" && (
              <div className="flex w-full max-w-2xl flex-col items-center gap-3 sm:gap-4">
                <ScreenTitle kicker={hero === "luna" ? "Luna" : "Léo"}>MISSÃO E CONTROLES</ScreenTitle>
                <div className="tpanel w-full text-left">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.3em] text-title-cyan">◆ Missão</p>
                  <p className="mt-2 text-xs leading-relaxed text-foreground sm:text-sm">
                    Recupere os 4 fragmentos da Pedra do Tempo espalhados pelos mundos e enfrente os desafios para
                    restaurar o equilíbrio do tempo.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["←→", "Setas ou A/D: mover"],
                    ["␣", "Espaço ou ↑: pular"],
                    ["X", "X: atacar inimigos"],
                    ["◆", "Colete moedas e fragmentos"],
                    ["!", "Evite obstáculos e inimigos"],
                    ["♛", "Derrote o Guardião final"],
                  ].map(([icon, text]) => (
                    <div key={text} className="tchip">
                      <span className="tchip-icon">{icon}</span>
                      <span className="text-left text-[11px] leading-snug text-foreground sm:text-xs">{text}</span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => startGame(hero ?? "leo")} className="title-btn title-btn-primary mt-1">
                  <span className="title-btn-arrow">▶</span><span>Começar a aventura</span>
                </button>
              </div>
            )}
            {overlay === "ranking" && (
              <div className="flex w-full max-w-md flex-col items-center gap-4">
                <ScreenTitle kicker="Classificação">RANKING</ScreenTitle>
                {ranking.length === 0 ? (
                  <p className="tpanel text-sm text-foreground">Nenhuma partida registrada ainda.</p>
                ) : (
                  <ol className="tpanel max-h-64 w-full overflow-y-auto text-left">
                    {ranking.slice(0, 20).map((r, i) => (
                      <li key={`${r.date}-${i}`} className="flex items-center justify-between gap-3 py-1 font-pixel text-[10px] uppercase">
                        <span className="text-foreground">
                          <span className="text-title-cyan">{i + 1}º</span> — {r.name}
                          <span className="ml-2 text-title-stone">({r.hero === "luna" ? "Luna" : "Léo"})</span>
                        </span>
                        <span className="text-title-cyan">{r.score} pts</span>
                      </li>
                    ))}
                  </ol>
                )}
                <button type="button" onClick={() => setScreen("menu")} className="title-btn title-btn-secondary">Voltar</button>
              </div>
            )}
          </TitleScreen>
        )}
        {overlay && !["menu", "name", "select", "intro", "ranking"].includes(overlay) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-[color-mix(in_oklab,var(--background)_86%,transparent)] px-6 py-4 text-center backdrop-blur-sm">

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
      className={`tcard ${selected ? "tcard-on" : ""}`}
    >
      <canvas ref={ref} width={120} height={126} className="h-[84px] w-[80px] [image-rendering:pixelated] sm:h-[126px] sm:w-[120px]" />
      <span className="font-pixel text-xs uppercase text-foreground">{name}</span>
      <span className="text-[11px] text-title-stone">{desc}</span>
      {selected && <span className="font-pixel text-[8px] uppercase tracking-widest text-title-cyan">◆ Selecionado</span>}
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

function PrimaryBtn({ children, className, ...rest }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-xl border-4 border-border bg-primary px-8 py-3 font-pixel text-xs uppercase text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function ScreenTitle({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-pixel text-[8px] uppercase tracking-[0.5em] text-title-cyan/80 sm:text-[10px]">◆ {kicker} ◆</p>
      <h2 className="title-glow font-pixel text-base leading-relaxed sm:text-2xl">{children}</h2>
      <span className="h-px w-40 bg-gradient-to-r from-transparent via-title-stone to-transparent sm:w-64" />
    </div>
  );
}
