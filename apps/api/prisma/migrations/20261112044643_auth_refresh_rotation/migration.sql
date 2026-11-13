-- Old sessions stored bcrypt hashes of JWTs (bcrypt truncates at 72 bytes, so
-- every token of a user matched every session). They cannot be converted to
-- SHA-256 hashes, so all existing sessions are dropped: users log in again once.
DELETE FROM "sessions";

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "refresh_token_hash",
ADD COLUMN     "family_id" TEXT NOT NULL,
ADD COLUMN     "revoked_at" TIMESTAMP(3),
ADD COLUMN     "rotated_at" TIMESTAMP(3),
ADD COLUMN     "token_hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

