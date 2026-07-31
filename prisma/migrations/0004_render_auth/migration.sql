-- Adds the columns/tables needed to replace Supabase Auth with a self-hosted
-- Auth.js (NextAuth) credentials-based auth system. Does NOT touch or depend
-- on anything from 0002_auth_rls/0003_fix_new_user_trigger (Supabase-specific
-- auth.users trigger + RLS) — those stay applied on the existing Supabase
-- database for history but are intentionally skipped when this schema is
-- set up fresh on a non-Supabase Postgres (e.g. Render).

-- AuthTokenType enum
CREATE TYPE "AuthTokenType" AS ENUM ('PASSWORD_RESET', 'INVITE');

-- users.passwordHash
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;

-- auth_tokens table
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");
CREATE INDEX "auth_tokens_userId_idx" ON "auth_tokens"("userId");

ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
