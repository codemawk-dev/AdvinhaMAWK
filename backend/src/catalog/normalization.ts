export function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/&/g, ' e ').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}
const version = /^(ao vivo|live|remix|acoustic|acustico|radio edit|remaster(?:ed|izado)?)(?:\b|\s)/;
export function normalizeTitle(value: string): string {
  const cleaned = value.replace(/[([]([^()[\]]+)[)\]]/g, (full: string, inner: string) => {
    const text = normalizeName(inner);
    return version.test(text) || /^(feat|ft)\b/.test(text) ? '' : full;
  }).replace(/\s+[-–—]\s+(.+)$/, (full: string, tail: string) => version.test(normalizeName(tail)) ? '' : full)
    .replace(/\s+(?:feat\.|ft\.)\s+.+$/i, '');
  return normalizeName(cleaned) || normalizeName(value);
}
export function versionRank(title: string, album = ''): number {
  const text = normalizeName(`${title} ${album}`);
  if (/\b(karaoke|tribute|tributo|cover|remix|sped up|slowed|instrumental)\b/.test(text)) return 99;
  if (/\b(ao vivo|live)\b/.test(text)) return 2;
  if (/\b(acoustic|acustico|radio edit)\b/.test(text)) return 1;
  return 0;
}
