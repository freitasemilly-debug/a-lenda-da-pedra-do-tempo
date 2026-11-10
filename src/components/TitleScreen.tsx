import { useEffect, useRef, type ReactNode } from "react";
import { paintHero } from "@/lib/platformer/engine";
import { Button } from "@/components/ui/button";
import { OpeningLogo } from "./OpeningLogo";
import { OpeningDinosaur } from "./OpeningDinosaur";

function TimeStoneScene() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const style = getComputedStyle(document.documentElement);
    const color = (name: string) => style.getPropertyValue(name).trim();
    const stone = color("--opening-blue"), light = color("--opening-cyan"), ink = color("--opening-ink"), white = color("--opening-paper");
    g.imageSmoothingEnabled = false;
    let raf = 0, frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      frame++;
      g.clearRect(0, 0, 480, 180);
      const y = 72 + (reduced ? 0 : Math.sin(frame * .025) * 4);
      g.save();
      g.globalAlpha = .12;
      g.fillStyle = ink;
      g.beginPath(); g.ellipse(240, 157, 74, 7, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      g.save(); g.translate(240, y);
      g.shadowColor = light; g.shadowBlur = 14;
      g.fillStyle = ink; g.beginPath(); g.moveTo(0,-59); g.lineTo(40,-7); g.lineTo(0,66); g.lineTo(-40,-7); g.closePath(); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = stone; g.beginPath(); g.moveTo(0,-53); g.lineTo(34,-7); g.lineTo(0,59); g.lineTo(-34,-7); g.closePath(); g.fill();
      g.fillStyle = light; g.beginPath(); g.moveTo(0,-53); g.lineTo(-34,-7); g.lineTo(0,8); g.closePath(); g.fill();
      g.fillStyle = white; g.beginPath(); g.moveTo(0,-30); g.lineTo(11,-6); g.lineTo(0,27); g.lineTo(-11,-6); g.closePath(); g.fill();
      for (let i=0;i<6;i++) {
        const a = (reduced ? 0 : frame*.018) + i*Math.PI/3;
        const x=Math.cos(a)*64, sy=Math.sin(a)*40;
        g.fillStyle = i%2 ? stone : light;
        g.fillRect(Math.round(x)-3, Math.round(sy)-3, 6, 6);
      }
      g.restore();
      for (const [id,x,face] of [["leo",119,1],["luna",295,-1]] as const) {
        g.save(); g.translate(x, 55 + (reduced ? 0 : Math.round(Math.sin(frame*.045)*1))); g.scale(3,3);
        paintHero(g,0,0,id,{running:false,anim:frame*.04,air:false,face,hurt:false,frame}); g.restore();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={480} height={180} className="opening-scene" aria-label="Léo e Luna ao lado da Pedra do Tempo" role="img" />;
}

export function TitleScreen({ onPlay, onRanking, children, classic = false }: { onPlay: () => void; onRanking: () => void; children?: ReactNode; classic?: boolean }) {
  return <div className={`opening-screen ${classic ? "opening-ranking" : ""}`}>
    {children != null ? <div className="opening-content">{!classic && <OpeningLogo compact />}{children}{!classic && <OpeningDinosaur className="opening-dinosaur-corner" />}</div> : <div className="opening-menu">
      <OpeningLogo />
     <div className="opening-scene-group"><TimeStoneScene /></div>
      <nav className="opening-actions" aria-label="Menu principal">
        <Button variant="arcade" size="arcade" onClick={onPlay} autoFocus><span aria-hidden>▶</span> Jogar</Button>
        <Button variant="arcadeSecondary" size="arcade" onClick={onRanking}><span aria-hidden>★</span> Ranking</Button>
      </nav>
            <OpeningDinosaur className="opening-dinosaur-corner" />  
    </div>}
  </div>;
}
