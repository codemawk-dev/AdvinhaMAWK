export const CLUES = [0.1, 0.5, 2, 8, 15] as const;
export function progressivePoints(clueIndex: number, streak: number): number {
  const base = [1200, 1000, 750, 450, 200][clueIndex];
  if (base === undefined) throw new Error('Invalid clue');
  return Math.round(base * (streak >= 10 ? 1.3 : streak >= 7 ? 1.2 : streak >= 5 ? 1.1 : streak >= 3 ? 1.05 : 1));
}
