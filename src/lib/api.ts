export interface Profile { userId: string; displayName: string }
export interface GameSummary {
  id: string; status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED'; totalRounds: number;
  currentRound: number; score: number; streak: number; maxStreak: number;
}
export interface Round {
  roundId: string; previewUrl: string; duration: number; deadline: string;
  options: { id: string; title: string }[];
}
export interface Answer {
  correct: boolean; points: number; streak: number; score: number; completed: boolean;
  correctAnswer: { title: string; artist: string; cover: string | null; appleMusicUrl: string | null };
}
export interface Result extends GameSummary {
  correctAnswers: number;
  rounds: { position: number; title: string; artistName: string; duration: number; answer: { correct: boolean; points: number } | null }[];
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
      signal: AbortSignal.timeout(25000),
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
  create: () => request<{ gameId: string }>('/games', { rounds: 10 }),
  game: (id: string) => request<GameSummary>(`/games/${id}`),
  round: (id: string) => request<Round>(`/games/${id}/round`),
  answer: (id: string, roundId: string, answerId: string | null) => request<Answer>(`/games/${id}/${answerId === null ? 'skip' : 'answer'}`, { roundId, ...(answerId === null ? {} : { answerId }) }),
  result: (id: string) => request<Result>(`/games/${id}/result`),
  ranking: (period: RankingPeriod) => request<Ranking>(`/rankings/${period}`),
  catalog: () => request<{ songs: number; artists: number; groups: number }>('/catalog/summary'),
};
export function audioPath(source: string): string {
  if (!/^\/games\/[a-f0-9-]+\/rounds\/[a-f0-9-]+\/audio$/.test(source)) throw new Error('Trecho inválido.');
  return `/api${source}`;
}
