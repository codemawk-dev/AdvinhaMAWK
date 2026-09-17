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
