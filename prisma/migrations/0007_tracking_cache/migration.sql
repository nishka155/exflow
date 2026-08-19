CREATE TABLE IF NOT EXISTS "tracking_caches" (
  "id"             TEXT NOT NULL,
  "bookingId"      TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider"       TEXT NOT NULL,
  "events"         JSONB NOT NULL DEFAULT '[]',
  "rawResponse"    JSONB,
  "errorMessage"   TEXT,
  "summary"        TEXT,
  "latestETA"      TEXT,
  "fetchedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tracking_caches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tracking_caches_bookingId_key"
  ON "tracking_caches"("bookingId");

CREATE INDEX IF NOT EXISTS "tracking_caches_fetchedAt_idx"
  ON "tracking_caches"("fetchedAt");

ALTER TABLE "tracking_caches"
  ADD CONSTRAINT "tracking_caches_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_caches"
  ADD CONSTRAINT "tracking_caches_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
