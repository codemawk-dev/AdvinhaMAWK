import { filterSongs, preferencesSchema, type MusicPreferences } from './preferences.js';
import type { Game, GameRound } from '@prisma/client';
import type { SongRepository } from '../catalog/repositories.js';
import { AppError } from '../core/errors.js';
import { AudioSourceError, type AudioProvider } from '../audio/provider.js';
import { GameSelectionService } from './engine.js';
import { CLUES, progressivePoints } from './rules.js';
import { GameRepository } from './repository.js';
export interface RoundResponse {
  roundId: string; previewUrl: string; duration: number; attempt: number; revision: number;
  clues: readonly number[]; guesses: { title: string | null; artist: string | null; correct: boolean }[];
  replaced: boolean;
}
export interface AnswerResponse {
  correct: boolean; points: number; streak: number; score: number; completed: boolean; roundFinished: boolean;
  correctAnswer?: { year: number | null; title: string; artist: string; cover: string | null; appleMusicUrl: string | null };
}
export class GameService {
  constructor(private games: GameRepository, private songs: SongRepository, private audioProvider: AudioProvider,
    private selection = new GameSelectionService()) {}
  async create(userId: string, rounds: number, preferences: MusicPreferences = preferencesSchema.parse({})) {
    const [pool, recent] = await Promise.all([this.songs.playable(), this.games.recent(userId)]);
    const selected = this.selection.select(filterSongs(pool, preferences), rounds, recent);
    const game = await this.games.create({ user: { connect: { id: userId } }, totalRounds: rounds, rulesVersion: 2, preferences,
      expiresAt: new Date(Date.now() + 24 * 3600000), rounds: { create: selected.map((song, position) => ({
        position, releaseYear: song.originalYear ?? song.releaseDate?.getUTCFullYear() ?? null, songId: song.id, duration: CLUES[0], difficultyWeight: song.difficultyWeight,
        audioUrl: song.previewUrl, title: song.title, artistName: song.artist.name, coverUrl: song.coverUrl, appleMusicUrl: song.appleMusicUrl,
      })) },
    });
    return { gameId: game.id, rounds: game.totalRounds, status: game.status };
  }
  summary(gameId: string, userId: string) { return this.games.summary(gameId, userId); }
  private assertActive(game: Game) {
    if (game.rulesVersion !== 2) throw new AppError(410, 'GAME_UPDATED', 'O jogo foi atualizado. Comece uma nova partida com as novas pistas.');
    if (game.status !== 'ACTIVE') throw new AppError(409, 'GAME_FINISHED', 'A partida já terminou.');
    if (game.expiresAt <= new Date()) throw new AppError(410, 'GAME_EXPIRED', 'A partida expirou.');
  }
  private current(gameId: string, userId: string) {
    return this.games.transaction(gameId, userId, async tx => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } }); this.assertActive(game);
      return tx.gameRound.findUniqueOrThrow({ where: { gameId_position: { gameId, position: game.currentRound } },
        include: { guesses: { orderBy: { position: 'asc' } } } });
    });
  }
  private async replace(gameId: string, userId: string, failed: GameRound) {
    const pool = await this.songs.playable();
    const available = await this.games.transaction(gameId, userId, async tx => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } }); this.assertActive(game);
      const current = await tx.gameRound.findUniqueOrThrow({ where: { id: failed.id } });
      if (current.answeredAt || current.revision !== failed.revision || current.clueIndex !== failed.clueIndex) return;
      const used = await tx.gameRound.findMany({ where: { gameId }, select: { songId: true, song: { select: { normalizedTitle: true } } } });
      const ids = new Set(used.map(round => round.songId));
      const titles = new Set(used.map(round => round.song.normalizedTitle));
      const candidates = filterSongs(pool, preferencesSchema.parse(game.preferences)).filter(song => !ids.has(song.id) && !titles.has(song.normalizedTitle));
      const replacement = candidates.length ? this.selection.select(candidates, 1, ids)[0] : undefined;
      await tx.song.updateMany({ where: { id: failed.songId, previewUrl: failed.audioUrl }, data: { audioUnavailableUntil: new Date(Date.now() + 24 * 3600000) } });
      if (!replacement) return false;
      await tx.gameRound.update({ where: { id: current.id }, data: {
        releaseYear: replacement.originalYear ?? replacement.releaseDate?.getUTCFullYear() ?? null, songId: replacement.id, title: replacement.title, artistName: replacement.artist.name,
        audioUrl: replacement.previewUrl, coverUrl: replacement.coverUrl, appleMusicUrl: replacement.appleMusicUrl,
        difficultyWeight: replacement.difficultyWeight, duration: CLUES[0], clueIndex: 0, revision: { increment: 1 }, startedAt: null,
      } });
    });
    if (available === false) throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Nenhum trecho alternativo disponível agora. Tente novamente; sua pontuação está preservada.');
  }
  async round(gameId: string, userId: string): Promise<RoundResponse> {
    for (let tries = 0; tries < 4; tries++) {
      const round = await this.current(gameId, userId);
      try { await this.audioProvider.clip(round.audioUrl, round.duration); }
      catch (error) {
        if (error instanceof AudioSourceError && error.permanent) { await this.replace(gameId, userId, round); continue; }
        throw error;
      }
      const ready = await this.games.transaction(gameId, userId, async tx => {
        const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } }); this.assertActive(game);
        const current = await tx.gameRound.findUniqueOrThrow({ where: { id: round.id } });
        if (current.answeredAt || current.revision !== round.revision || current.clueIndex !== round.clueIndex) return false;
        if (!current.startedAt) await tx.gameRound.update({ where: { id: current.id }, data: { startedAt: new Date() } });
        return true;
      });
      if (!ready) continue;
      return { roundId: round.id, duration: round.duration, attempt: round.clueIndex, revision: round.revision, clues: CLUES,
        previewUrl: `/games/${gameId}/rounds/${round.id}/audio?attempt=${round.clueIndex}&revision=${round.revision}`,
        guesses: round.guesses.filter(guess => guess.revision === round.revision).map(({ title, artist, correct }) => ({ title, artist, correct })),
        replaced: round.revision > 0 };
    }
    throw new AppError(503, 'AUDIO_UNAVAILABLE', 'Estamos buscando um trecho disponível. Tente novamente; nenhuma tentativa foi descontada.');
  }
  async answer(gameId: string, userId: string, roundId: string, songId: string | null, attempt: number, revision: number): Promise<AnswerResponse> {
    return this.games.transaction(gameId, userId, async tx => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } }); this.assertActive(game);
      const round = await tx.gameRound.findFirst({ where: { id: roundId, gameId } });
      if (!round || round.position !== game.currentRound || round.answeredAt || round.clueIndex !== attempt || round.revision !== revision)
        throw new AppError(409, 'INVALID_ROUND', 'A rodada mudou. Sua partida será sincronizada.');
      if (!round.startedAt) throw new AppError(409, 'ROUND_NOT_STARTED', 'Aguarde a preparação do trecho.');
      const guess = songId ? await tx.song.findUnique({ where: { id: songId }, include: { artist: true } }) : null;
      if (songId && !guess) throw new AppError(400, 'INVALID_SONG', 'Selecione uma música do catálogo.');
      const previous = songId ? await tx.guessAttempt.findFirst({ where: { roundId, revision, songId } }) : null;
      if (previous) throw new AppError(400, 'REPEATED_GUESS', 'Você já tentou essa música. Escolha outro título.');
      const correct = songId === round.songId;
      await tx.guessAttempt.create({ data: { roundId, revision, position: attempt, songId, title: guess?.title, artist: guess?.artist.name, correct } });
      if (!correct && attempt < CLUES.length - 1) {
        await tx.gameRound.update({ where: { id: roundId }, data: { clueIndex: { increment: 1 }, duration: CLUES[attempt + 1]! } });
        return { correct: false, points: 0, streak: game.streak, score: game.score, completed: false, roundFinished: false };
      }
      const streak = correct ? game.streak + 1 : 0;
      const points = correct ? progressivePoints(attempt, streak) : 0;
      const completed = game.currentRound + 1 === game.totalRounds;
      await tx.playerAnswer.create({ data: { roundId, optionId: null, correct, points, responseMs: Math.min(2147483647, Math.max(0, Date.now() - round.startedAt.getTime())) } });
      await tx.gameRound.update({ where: { id: roundId }, data: { answeredAt: new Date() } });
      await tx.game.update({ where: { id: gameId }, data: { currentRound: { increment: 1 }, score: { increment: points }, streak,
        maxStreak: Math.max(game.maxStreak, streak), status: completed ? 'COMPLETED' : 'ACTIVE', completedAt: completed ? new Date() : null } });
      return { correct, points, streak, score: game.score + points, completed, roundFinished: true,
        correctAnswer: { year: round.releaseYear, title: round.title, artist: round.artistName, cover: round.coverUrl, appleMusicUrl: round.appleMusicUrl } };
    });
  }
  async audio(gameId: string, userId: string, roundId: string, attempt: number, revision: number, signal?: AbortSignal) {
    const round = await this.current(gameId, userId);
    if (round.id !== roundId || !round.startedAt || round.clueIndex !== attempt || round.revision !== revision)
      throw new AppError(409, 'AUDIO_CHANGED', 'O trecho mudou. Atualize a rodada.');
    const clip = await this.audioProvider.clip(round.audioUrl, round.duration, signal);
    const latest = await this.current(gameId, userId);
    if (latest.id !== roundId || latest.clueIndex !== attempt || latest.revision !== revision)
      throw new AppError(409, 'AUDIO_CHANGED', 'O trecho mudou. Atualize a rodada.');
    return clip;
  }
  async result(gameId: string, userId: string) {
    const game = await this.games.summary(gameId, userId);
    if (game.status !== 'COMPLETED') throw new AppError(409, 'GAME_NOT_FINISHED', 'Finalize a partida para consultar o resultado.');
    const rounds = await this.games.results(gameId);
    return { ...game, correctAnswers: rounds.filter(round => round.answer?.correct).length, rounds };
  }
}
