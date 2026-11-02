import type { ReactNode } from "react";

export function ArcadeTitle({ children, className = "" }: { children: string; className?: string }) {
  let letter = 0;
  return <h2 aria-label={children} className={`arcade-title ${className}`}>
    {children.split(" ").map((word, index) => <span className="arcade-word" aria-hidden key={`${word}-${index}`}>
      {[...word].map((char, i) => <span key={i} className={`arcade-letter arcade-color-${letter++ % 5}`}>{char}</span>)}
    </span>)}
  </h2>;
}

export function VictoryStars(): ReactNode {
  return <div className="victory-stars" aria-hidden>{Array.from({ length: 12 }, (_, i) => <span key={i} className={`arcade-color-${i % 5}`}>✦</span>)}</div>;
}