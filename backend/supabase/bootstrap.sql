-- For a new, empty project, when using the dashboard SQL editor instead of Prisma CLI.
-- If applied manually, mark all five migrations as applied with prisma migrate resolve before using migrate deploy.
BEGIN;
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Jogador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "InternalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appleArtistId" TEXT,
    "categoryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "catalogPriority" INTEGER NOT NULL DEFAULT 1,
    "lastSyncedAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" UUID NOT NULL,
    "appleTrackId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "artistId" UUID NOT NULL,
    "album" TEXT,
    "previewUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "appleMusicUrl" TEXT,
    "genre" TEXT,
    "releaseDate" TIMESTAMP(3),
    "originalYear" INTEGER,
    "popularityWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "difficultyWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "versionRank" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalRounds" INTEGER NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "songId" UUID NOT NULL,
    "duration" INTEGER NOT NULL,
    "difficultyWeight" DOUBLE PRECISION NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "coverUrl" TEXT,
    "appleMusicUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundOption" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "RoundOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerAnswer" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "points" INTEGER NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogLease" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogLease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artist_normalizedName_key" ON "Artist"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_appleArtistId_key" ON "Artist"("appleArtistId");

-- CreateIndex
CREATE INDEX "Artist_active_nextSyncAt_idx" ON "Artist"("active", "nextSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "Song_appleTrackId_key" ON "Song"("appleTrackId");

-- CreateIndex
CREATE INDEX "Song_active_artistId_idx" ON "Song"("active", "artistId");

-- CreateIndex
CREATE INDEX "Song_lastVerifiedAt_idx" ON "Song"("lastVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Song_artistId_normalizedTitle_key" ON "Song"("artistId", "normalizedTitle");

-- CreateIndex
CREATE INDEX "Game_userId_createdAt_idx" ON "Game"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Game_status_totalRounds_completedAt_score_idx" ON "Game"("status", "totalRounds", "completedAt", "score");

-- CreateIndex
CREATE INDEX "GameRound_songId_idx" ON "GameRound"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_gameId_position_key" ON "GameRound"("gameId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RoundOption_roundId_position_key" ON "RoundOption"("roundId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "RoundOption_roundId_id_key" ON "RoundOption"("roundId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAnswer_roundId_key" ON "PlayerAnswer"("roundId");

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InternalCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundOption" ADD CONSTRAINT "RoundOption_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_roundId_optionId_fkey" FOREIGN KEY ("roundId", "optionId") REFERENCES "RoundOption"("roundId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional integrity guarantees for trusted server writes and future maintenance tools.
ALTER TABLE "Game" ADD CONSTRAINT "Game_round_bounds" CHECK ("totalRounds" BETWEEN 1 AND 20 AND "currentRound" BETWEEN 0 AND "totalRounds");
ALTER TABLE "Game" ADD CONSTRAINT "Game_score_nonnegative" CHECK (score >= 0 AND streak >= 0 AND "maxStreak" >= streak);
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_duration_allowed" CHECK (duration IN (1, 3, 5, 10, 15));
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_position_nonnegative" CHECK (position >= 0);
ALTER TABLE "PlayerAnswer" ADD CONSTRAINT "PlayerAnswer_points_nonnegative" CHECK (points >= 0 AND "responseMs" >= 0);
CREATE UNIQUE INDEX "RoundOption_one_correct" ON "RoundOption" ("roundId") WHERE "isCorrect" = true;

-- The game engine is the only public entry point. Direct Data API access must
-- never expose correct options or future rounds, even with a publishable key.
DO $protect$
DECLARE
  table_name text;
  role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['User', 'InternalCategory', 'Artist', 'Song', 'Game', 'GameRound', 'RoundOption', 'PlayerAnswer', 'CatalogLease', '_prisma_migrations']
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
      LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
          EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END
$protect$;

ALTER TABLE "PlayerAnswer" ALTER COLUMN "optionId" DROP NOT NULL;

ALTER TABLE "Game" ADD COLUMN "rulesVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Game" ALTER COLUMN "rulesVersion" SET DEFAULT 2;
ALTER TABLE "Song" ADD COLUMN "audioUnavailableUntil" TIMESTAMP(3);
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_duration_allowed";
ALTER TABLE "GameRound" ALTER COLUMN duration TYPE DOUBLE PRECISION;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_duration_allowed" CHECK (duration IN (0.1, 0.5, 1, 2, 3, 5, 8, 10, 15));
ALTER TABLE "GameRound" ADD COLUMN "clueIndex" INTEGER NOT NULL DEFAULT 0, ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_clue_bounds" CHECK ("clueIndex" BETWEEN 0 AND 4 AND revision >= 0);
CREATE TABLE "GuessAttempt" (
  id UUID PRIMARY KEY NOT NULL, "roundId" UUID NOT NULL,
  revision INTEGER NOT NULL, position INTEGER NOT NULL,
  "songId" UUID, title TEXT, artist TEXT, correct BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuessAttempt_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GuessAttempt_position_bounds" CHECK (position BETWEEN 0 AND 4 AND revision >= 0)
);
CREATE UNIQUE INDEX "GuessAttempt_roundId_revision_position_key" ON "GuessAttempt"("roundId", revision, position);
ALTER TABLE "GuessAttempt" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "GuessAttempt" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "GuessAttempt" FROM authenticated; END IF;
END $$;

ALTER TABLE "Game" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "GameRound" ADD COLUMN "releaseYear" INTEGER;

COMMIT;
