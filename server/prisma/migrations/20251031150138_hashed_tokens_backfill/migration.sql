-- Enable crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0) Drop legacy unique indexes on token (ok)
DROP INDEX IF EXISTS "public"."email_verifications_token_key";
DROP INDEX IF EXISTS "public"."invitations_token_key";
DROP INDEX IF EXISTS "public"."password_resets_token_key";

-- 1) Add nullable columns first; do NOT set NOT NULL yet
ALTER TABLE "email_verifications" ADD COLUMN IF NOT EXISTS "hashedToken" TEXT;
ALTER TABLE "invitations"         ADD COLUMN IF NOT EXISTS "hashedToken" TEXT;
ALTER TABLE "password_resets"     ADD COLUMN IF NOT EXISTS "hashedToken" TEXT;

-- Also allow legacy token to be NULL
ALTER TABLE "email_verifications" ALTER COLUMN "token" DROP NOT NULL;
ALTER TABLE "invitations"         ALTER COLUMN "token" DROP NOT NULL;
ALTER TABLE "password_resets"     ALTER COLUMN "token" DROP NOT NULL;

-- 2) Backfill hashedToken from legacy token
UPDATE "email_verifications"
SET "hashedToken" = encode(digest("token", 'sha256'), 'hex')
WHERE "hashedToken" IS NULL AND "token" IS NOT NULL;

UPDATE "invitations"
SET "hashedToken" = encode(digest("token", 'sha256'), 'hex')
WHERE "hashedToken" IS NULL AND "token" IS NOT NULL;

UPDATE "password_resets"
SET "hashedToken" = encode(digest("token", 'sha256'), 'hex')
WHERE "hashedToken" IS NULL AND "token" IS NOT NULL;

-- 3) Ensure no NULLs remain (for rows without legacy tokens)
UPDATE "email_verifications"
SET "hashedToken" = encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
WHERE "hashedToken" IS NULL;

UPDATE "invitations"
SET "hashedToken" = encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
WHERE "hashedToken" IS NULL;

UPDATE "password_resets"
SET "hashedToken" = encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
WHERE "hashedToken" IS NULL;

-- 4) Add unique indexes on hashedToken
CREATE UNIQUE INDEX IF NOT EXISTS "email_verifications_hashedToken_key" ON "email_verifications"("hashedToken");
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_hashedToken_key"       ON "invitations"("hashedToken");
CREATE UNIQUE INDEX IF NOT EXISTS "password_resets_hashedToken_key"   ON "password_resets"("hashedToken");

-- 5) Enforce NOT NULL after backfill
ALTER TABLE "email_verifications" ALTER COLUMN "hashedToken" SET NOT NULL;
ALTER TABLE "invitations"         ALTER COLUMN "hashedToken" SET NOT NULL;
ALTER TABLE "password_resets"     ALTER COLUMN "hashedToken" SET NOT NULL;

-- 6) Users: tokenVersion (ok)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- 7) Refresh tokens table (unchanged)
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" SERIAL PRIMARY KEY,
  "tenantId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "hashedToken" TEXT NOT NULL,
  "userAgent" TEXT,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3)
);

-- 8) Indexes for refresh tokens
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_hashedToken_key" ON "refresh_tokens"("hashedToken");
CREATE INDEX IF NOT EXISTS "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX IF NOT EXISTS "refresh_tokens_tenantId_idx" ON "refresh_tokens"("tenantId");

-- 9) FKs for refresh tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='refresh_tokens' AND constraint_name='refresh_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='refresh_tokens' AND constraint_name='refresh_tokens_tenantId_fkey'
  ) THEN
    ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
