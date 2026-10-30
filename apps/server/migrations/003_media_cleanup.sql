-- Independent of moment rows so erasure survives a crash between DB and disk work.
CREATE TABLE media_purge (
  storage_key TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  retry_at_ms INTEGER NOT NULL DEFAULT 0,
  safe_error_code TEXT,
  created_at_ms INTEGER NOT NULL
);
