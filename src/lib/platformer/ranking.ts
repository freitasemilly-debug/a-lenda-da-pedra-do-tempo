import type { Hero } from "./engine";

export interface RankEntry {
  name: string;
  score: number;
  coins: number;
  fragments: number;
  hero: Hero;
  date: number;
}

const KEY = "pedra-do-tempo-ranking";

export function loadRanking(): RankEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as RankEntry[]) : [];
    return list.sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

export function addRanking(e: RankEntry) {
  const list = [...loadRanking(), e].sort((a, b) => b.score - a.score).slice(0, 100);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}


/** Remove somente os resultados salvos; novas partidas continuam sendo registradas normalmente. */
export function clearRanking() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
