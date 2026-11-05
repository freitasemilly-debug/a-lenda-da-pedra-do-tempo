import { useEffect, useRef } from "react";

/** Original decorative companion; never enters the playable character roster. */
export function OpeningDinosaur({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const ink = color("--opening-ink"), green = color("--opening-green"), light = color("--opening-dino-light"), shade = color("--opening-dino-shade"), yellow = color("--opening-yellow"), white = color("--opening-paper");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, frame = 0;
    const draw = () => {
      frame++;
      g.clearRect(0, 0, 96, 88);
      g.save(); g.scale(2, 2);
      const bob = reduced ? 0 : Math.round(Math.sin(frame * .04));
      g.translate(0, bob);
      const rect = (c: string, x: number, y: number, w: number, h: number) => { g.fillStyle = c; g.fillRect(x,y,w,h); };
      // Upright forest dinosaur: leaf-shaped crest, long tail, tiny arms, no saddle.
      rect(ink, 17, 9, 18, 17); rect(ink, 26, 15, 15, 10);
      rect(ink, 14, 22, 17, 14); rect(ink, 8, 28, 9, 6); rect(ink, 4, 24, 6, 7);
      rect(ink, 14, 34, 8, 7); rect(ink, 26, 33, 8, 8);
      rect(green, 19, 11, 14, 13); rect(green, 28, 17, 11, 6);
      rect(green, 16, 23, 13, 12); rect(green, 9, 29, 10, 3); rect(green, 6, 26, 5, 3);
      rect(shade, 16, 29, 5, 6); rect(light, 23, 25, 6, 9);
      rect(shade, 16, 35, 4, 4); rect(green, 28, 34, 4, 5);
      rect(yellow, 16, 7, 4, 5); rect(yellow, 12, 19, 4, 5); rect(yellow, 10, 25, 4, 4);
      rect(light, 20, 12, 10, 2); rect(white, 27, 13, 5, 6);
      if (reduced || frame % 240 < 225) rect(ink, 30, 15, 2, 3); else rect(ink, 28, 17, 4, 1);
      rect(ink, 36, 18, 1, 1); rect(ink, 30, 22, 6, 1);
      rect(green, 29, 27, 5, 3); rect(ink, 33, 29, 2, 1);
      g.restore();
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} width={96} height={88} role="img" aria-label="Pequeno dinossauro verde, companheiro da Pedra do Tempo" className={`opening-dinosaur ${className}`} />;
}