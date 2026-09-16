export interface MusicPreferences { genres: string[]; yearFrom: number | null; yearTo: number | null }
export interface Profile { userId: string; displayName: string }
export interface GameSummary {
  preferences: MusicPreferences;
  id: string; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED'; totalRounds: number;
  currentRound: number; score: number; streak: number; maxStreak: number;
}
export interface Round {
  roundId: string; previewUrl: string; duration: number; attempt: number; revision: number;
  clues: number[]; guesses: { title: string | null; artist: string | null; correct: boolean }[]; replaced: boolean;
}
export interface SongSuggestion { id: string; title: string; artist: string }
export interface Answer {
  correct: boolean; points: number; streak: number; score: number; completed: boolean; roundFinished: boolean;
  correctAnswer?: { year: number | null; title: string; artist: string; cover: string | null; appleMusicUrl: string | null };
}
export interface Result extends GameSummary {
  correctAnswers: number;
  rounds: { releaseYear: number | null; position: number; title: string; artistName: string; duration: number; answer: { correct: boolean; points: number } | null }[];
}
export type RankingPeriod = 'daily' | 'weekly' | 'all-time';
export interface Ranking { entries: { position: number; playerId: string; displayName: string; score: number }[] }
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
export async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(60000),
    });
  } catch { throw new ApiError(0, 'NETWORK', 'Não foi possível conectar. Confira sua conexão e tente novamente.'); }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError(response.status, 'INVALID_RESPONSE', 'O servidor não está disponível. Tente novamente.'); }
  if (!response.ok) {
    const error = data as { error?: string; message?: string };
    throw new ApiError(response.status, error.error ?? 'REQUEST_ERROR', error.message ?? 'Não foi possível completar o pedido.');
  }
  return data as T;
}
export const api = {
  profile: () => request<Profile>('/sessions/me'),
  session: (displayName: string) => request<Profile>('/sessions', { displayName }),
  create: (preferences?: MusicPreferences) => request<{ gameId: string }>('/games', { rounds: 10, preferences }),
  game: (id: string) => request<GameSummary>(`/games/${id}`),
  round: (id: string) => request<Round>(`/games/${id}/round`),
  answer: (id: string, round: Round, songId: string | null) => request<Answer>(`/games/${id}/${songId === null ? 'skip' : 'answer'}`, { roundId: round.roundId, attempt: round.attempt, revision: round.revision, ...(songId === null ? {} : { songId }) }),
  search: (query: string) => request<{ songs: SongSuggestion[] }>(`/catalog/search?q=${encodeURIComponent(query)}`),
  result: (id: string) => request<Result>(`/games/${id}/result`),
  ranking: (period: RankingPeriod) => request<Ranking>(`/rankings/${period}`),
  matching: (preferences: MusicPreferences) => request<{ songs: number; titles: number; artists: number }>('/catalog/matching', preferences),
  catalog: () => request<{ songs: number; artists: number; groups: number }>('/catalog/summary'),
};
export function audioPath(source: string): string {
  if (!/^\/games\/[a-f0-9-]+\/rounds\/[a-f0-9-]+\/audio\?attempt=[0-4]&revision=\d+$/.test(source)) throw new Error('Trecho inválido.');
  return `/api${source}`;
}
