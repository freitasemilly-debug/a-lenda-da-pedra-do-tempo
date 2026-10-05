import { createFileRoute } from "@tanstack/react-router";
import { GameScreen } from "@/components/GameScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A Lenda da Pedra do Tempo — jogo de plataforma 2D" },
      {
        name: "description",
        content:
          "Jogo de plataforma 2D em pixel art: corra, pule, colete moedas e fragmentos da Pedra do Tempo em três mundos e enfrente o Guardião do Tempo.",
      },
      { property: "og:title", content: "A Lenda da Pedra do Tempo" },
      {
        property: "og:description",
        content:
          "Aventura de plataforma 2D original em pixel art com três mundos, checkpoints, áreas secretas e chefão final.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <header className="mx-auto mb-5 w-full max-w-[1000px] text-center">
        <h1 className="font-pixel text-base leading-relaxed text-foreground sm:text-xl">
          A Lenda <span className="text-accent">da</span> Pedra do Tempo
        </h1>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
          Jogue como Léo ou Luna · três mundos · fragmentos escondidos · chefão final
        </p>
      </header>

      <GameScreen />

      <section className="mx-auto mt-6 grid w-full max-w-[1000px] gap-3 sm:grid-cols-3">
        <Card title="Controles">
          Setas ← → para correr, espaço para pular, X para atacar e P para pausar. No celular, use os botões abaixo da tela.
        </Card>
        <Card title="Pontuação">
          Moeda +10 · Fragmento da Pedra +100 · Inimigo derrotado +50 · Checkpoint +50 · Fim de fase +500.
        </Card>
        <Card title="Dica">
          Pule na cabeça dos inimigos para derrotá-los, procure plataformas altas com áreas secretas e toque nas
          bandeirinhas de checkpoint.
        </Card>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-4 shadow-[var(--shadow-panel)]">
      <h2 className="font-pixel text-[10px] uppercase tracking-widest text-accent">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
