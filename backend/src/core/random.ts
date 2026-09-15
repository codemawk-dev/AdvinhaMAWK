import { randomInt } from 'node:crypto';
export type Random = () => number;
export const random: Random = () => randomInt(0, 0x100000000) / 0x100000000;
export function shuffle<T>(items: readonly T[], rng: Random = random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
export function weighted<T>(items: readonly T[], weight: (item: T) => number, rng: Random = random): T {
  if (!items.length) throw new Error('Empty weighted selection');
  const weights = items.map(item => Math.max(0.001, weight(item)));
  let target = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    target -= weights[i]!;
    if (target < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
