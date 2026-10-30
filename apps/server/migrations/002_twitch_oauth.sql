CREATE TABLE oauth_state (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  expires_at_ms INTEGER NOT NULL
);
CREATE INDEX oauth_state_expiry ON oauth_state(expires_at_ms);
