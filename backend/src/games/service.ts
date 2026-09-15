import type { Game, GameRound } from '@prisma/client';
import type { SongRepository } from '../catalog/repositories.js';
import { AppError } from '../core/errors.js';
import { DistractorService, GameSelectionService, ScoringService } from './engine.js';
import { GameRepository } from './repository.js';
export interface RoundResponse {
  roundId: string; previewUrl: string; duration: number; deadline: string;
  options: { id: string; title: string }[];
}
export interface AnswerResponse {
  correct: boolean; points: number; streak: number; score: number; completed: boolean;
  correctAnswer: { title: string; artist: string; cover: string | null; appleMusicUrl: string | null };
}
export class GameService {
  constructor(private games: GameRepository, private songs: SongRepository,
    private selection = new GameSelectionService(), private distractors = new DistractorService(), private scoring = new ScoringService()) {}
  async create(userId: string, rounds: number) {
    const [pool, recent] = await Promise.all([this.songs.playable(), this.games.recent(userId)]);
    const selected = this.selection.select(pool, rounds, recent);
    const durations = this.selection.durations(rounds);
    const game = await this.games.create({ user: { connect: { id: userId } }, totalRounds: rounds,
      expiresAt: new Date(Date.now() + 3600000), rounds: { create: selected.map((song, position) => ({
        position, songId: song.id, duration: durations[position]!, difficultyWeight: song.difficultyWeight,
        audioUrl: song.previewUrl, title: song.title, artistName: song.artist.name, coverUrl: song.coverUrl, appleMusicUrl: song.appleMusicUrl,
        options: { create: this.distractors.options(song, pool).map((option, order) => ({ ...option, position: order })) },
      })) },
    });
    return { gameId: game.id, rounds: game.totalRounds, status: game.status };
  }
  summary(gameId: string, userId: string) { return this.games.summary(gameId, userId); }
  private assertActive(game: Game) {
    if (game.status !== 'ACTIVE') throw new AppError(409, 'GAME_FINISHED', 'A partida já terminou.');
    if (game.expiresAt <= new Date()) throw new AppError(410, 'GAME_EXPIRED', 'A partida expirou.');
  }
  async round(gameId: string, userId: string): Promise<RoundResponse> {
    return this.games.transaction(gameId, userId, async tx => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      this.assertActive(game);
      let round = await tx.gameRound.findUniqueOrThrow({ where: { gameId_position: { gameId, position: game.currentRound } }, include: { options: { orderBy: { position: 'asc' } } } });
      if (!round.startedAt) round = await tx.gameRound.update({ where: { id: round.id }, data: { startedAt: new Date() }, include: { options: { orderBy: { position: 'asc' } } } });
      return { roundId: round.id, previewUrl: `/games/${gameId}/rounds/${round.id}/audio`, duration: round.duration,
        deadline: new Date(round.startedAt!.getTime() + 60000).toISOString(), options: round.options.map(o => ({ id: o.id, title: o.title })) };
    });
  }
  async answer(gameId: string, userId: string, roundId: string, answerId: string | null): Promise<AnswerResponse> {
    return this.games.transaction(gameId, userId, async tx => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } });
      this.assertActive(game);
      const round = await tx.gameRound.findFirst({ where: { id: roundId, gameId }, include: { options: true } });
      if (!round || round.position !== game.currentRound || round.answeredAt) throw new AppError(409, 'INVALID_ROUND', 'Rodada inválida ou já respondida.');
      if (!round.startedAt) throw new AppError(409, 'ROUND_NOT_STARTED', 'Consulte a rodada antes de responder.');
      const option = round.options.find(o => o.id === answerId);
      if (answerId !== null && !option) throw new AppError(400, 'INVALID_OPTION', 'Alternativa não pertence a esta rodada.');
      const responseMs = Math.max(0, Date.now() - round.startedAt.getTime());
      const correct = option?.isCorrect === true && responseMs <= 60000;
      const streak = correct ? game.streak + 1 : 0;
      const points = this.scoring.calculate({ correct, duration: round.duration, responseMs, streak, difficultyWeight: round.difficultyWeight });
      const completed = game.currentRound + 1 === game.totalRounds;
      await tx.playerAnswer.create({ data: { roundId, optionId: answerId, correct, points, responseMs } });
      await tx.gameRound.update({ where: { id: roundId }, data: { answeredAt: new Date() } });
      await tx.game.update({ where: { id: gameId }, data: { currentRound: { increment: 1 }, score: { increment: points }, streak,
        maxStreak: Math.max(game.maxStreak, streak), status: completed ? 'COMPLETED' : 'ACTIVE', completedAt: completed ? new Date() : null } });
      return { correct, points, streak, score: game.score + points, completed,
        correctAnswer: { title: round.title, artist: round.artistName, cover: round.coverUrl, appleMusicUrl: round.appleMusicUrl } };
    });
  }
  async audio(gameId: string, userId: string, roundId: string): Promise<Pick<GameRound, 'audioUrl' | 'duration'>> {
    return this.games.transaction(gameId, userId, async tx => {
      const game = await tx.game.findUniqueOrThrow({ where: { id: gameId } }); this.assertActive(game);
      const round = await tx.gameRound.findFirst({ where: { id: roundId, gameId, position: game.currentRound, answeredAt: null } });
      if (!round?.startedAt || Date.now() - round.startedAt.getTime() > 60000) throw new AppError(404, 'AUDIO_NOT_AVAILABLE', 'Áudio indisponível para esta rodada.');
      return { audioUrl: round.audioUrl, duration: round.duration };
    });
  }
  async result(gameId: string, userId: string) {
    const game = await this.games.summary(gameId, userId);
    if (game.status !== 'COMPLETED') throw new AppError(409, 'GAME_NOT_FINISHED', 'Finalize a partida para consultar o resultado.');
    const rounds = await this.games.results(gameId);
    return { ...game, correctAnswers: rounds.filter(round => round.answer?.correct).length, rounds };
  }
}
