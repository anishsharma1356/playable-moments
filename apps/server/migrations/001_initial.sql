-- Playable Moments reference SQLite schema, baseline 1.0.
-- Execute through versioned migrations, not repeatedly on a production DB.
-- Application-level transaction/authorization checks remain mandatory.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE creator (
  id TEXT PRIMARY KEY,
  twitch_user_id TEXT NOT NULL UNIQUE,
  twitch_login TEXT NOT NULL,
  auth_generation INTEGER NOT NULL DEFAULT 1,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE oauth_credential (
  creator_id TEXT PRIMARY KEY REFERENCES creator(id) ON DELETE CASCADE,
  encrypted_token_blob BLOB NOT NULL,
  granted_scopes_json TEXT NOT NULL CHECK(json_valid(granted_scopes_json)),
  expires_at_ms INTEGER NOT NULL,
  validated_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE owner_session (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  creator_id TEXT NOT NULL REFERENCES creator(id) ON DELETE CASCADE,
  csrf_hash TEXT NOT NULL,
  auth_generation INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER
);
CREATE TABLE stream_session (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creator(id),
  channel_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('REAL_TWITCH','DEMO')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','ENDED')),
  label TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  ended_at_ms INTEGER
);
CREATE TABLE moment (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES stream_session(id),
  channel_id TEXT NOT NULL,
  code TEXT NOT NULL CHECK(length(code)=4),
  public_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
  question TEXT NOT NULL CHECK(length(question) BETWEEN 1 AND 180),
  option_a TEXT NOT NULL CHECK(length(option_a) BETWEEN 1 AND 80),
  option_b TEXT NOT NULL CHECK(length(option_b) BETWEEN 1 AND 80),
  duration_seconds INTEGER NOT NULL DEFAULT 45 CHECK(duration_seconds BETWEEN 20 AND 180),
  capture_state TEXT NOT NULL DEFAULT 'DRAFT' CHECK(capture_state IN
    ('DRAFT','OPEN','LOCKED','OUTCOME_RECORDED','INTERRUPTED','CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  opened_at_ms INTEGER,
  deadline_at_ms INTEGER,
  locked_at_ms INTEGER,
  interrupted_at_ms INTEGER,
  interruption_reason TEXT,
  creator_choice TEXT CHECK(creator_choice IN ('A','B')),
  outcome_summary TEXT CHECK(outcome_summary IS NULL OR length(outcome_summary) BETWEEN 1 AND 500),
  resolved_answer TEXT CHECK(resolved_answer IN ('A','B')),
  outcome_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL,
  UNIQUE(channel_id, code),
  CHECK(lower(trim(option_a)) <> lower(trim(option_b)))
);
CREATE UNIQUE INDEX one_open_moment_per_channel ON moment(channel_id) WHERE capture_state='OPEN';
CREATE INDEX moments_in_session ON moment(session_id, created_at_ms);
CREATE TABLE accepted_event (
  notification_id TEXT PRIMARY KEY,
  chat_message_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  moment_id TEXT NOT NULL REFERENCES moment(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('REAL_TWITCH','DEMO')),
  received_at_ms INTEGER NOT NULL,
  provider_timestamp TEXT NOT NULL,
  UNIQUE(channel_id, chat_message_id)
);
CREATE TABLE live_vote (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moment(id) ON DELETE CASCADE,
  account_key TEXT NOT NULL,
  option_id TEXT NOT NULL CHECK(option_id IN ('A','B')),
  notification_id TEXT NOT NULL UNIQUE REFERENCES accepted_event(notification_id),
  received_at_ms INTEGER NOT NULL,
  UNIQUE(moment_id, account_key)
);
CREATE INDEX votes_per_option ON live_vote(moment_id, option_id);
CREATE TABLE live_snapshot (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL UNIQUE REFERENCES moment(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK(mode IN ('REAL_TWITCH','DEMO')),
  count_a INTEGER NOT NULL CHECK(count_a >= 0),
  count_b INTEGER NOT NULL CHECK(count_b >= 0),
  total INTEGER NOT NULL CHECK(total=count_a+count_b),
  locked_at_ms INTEGER NOT NULL,
  integrity_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE media_asset (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creator(id),
  moment_id TEXT NOT NULL REFERENCES moment(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('ORIGINAL','MASTER','SETUP','REVEAL','POSTER')),
  status TEXT NOT NULL CHECK(status IN ('UPLOADING','PROCESSING','READY','FAILED','PURGE_PENDING')),
  storage_key TEXT NOT NULL UNIQUE,
  sha256 TEXT,
  content_type TEXT NOT NULL,
  byte_size INTEGER CHECK(byte_size IS NULL OR byte_size >= 0),
  duration_ms INTEGER CHECK(duration_ms IS NULL OR duration_ms >= 0),
  width INTEGER,
  height INTEGER,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE media_edit (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moment(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK(version >= 1),
  master_asset_id TEXT NOT NULL REFERENCES media_asset(id),
  setup_start_ms INTEGER NOT NULL,
  setup_end_ms INTEGER NOT NULL,
  reveal_start_ms INTEGER NOT NULL,
  reveal_end_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('DRAFT','QUEUED','RENDERING','NEEDS_REVIEW','APPROVED','FAILED')),
  setup_asset_id TEXT REFERENCES media_asset(id),
  reveal_asset_id TEXT REFERENCES media_asset(id),
  proposed_content_version INTEGER NOT NULL,
  review_hash TEXT,
  approved_by TEXT REFERENCES creator(id),
  approved_at_ms INTEGER,
  approval_json TEXT CHECK(approval_json IS NULL OR json_valid(approval_json)),
  created_at_ms INTEGER NOT NULL,
  UNIQUE(moment_id, version),
  CHECK(0 <= setup_start_ms AND setup_start_ms < setup_end_ms
    AND setup_end_ms <= reveal_start_ms AND reveal_start_ms < reveal_end_ms)
);
CREATE TABLE media_job (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moment(id) ON DELETE CASCADE,
  edit_id TEXT REFERENCES media_edit(id),
  input_asset_id TEXT REFERENCES media_asset(id),
  kind TEXT NOT NULL CHECK(kind IN ('NORMALIZE','RENDER_SEGMENTS','PURGE')),
  status TEXT NOT NULL CHECK(status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED')),
  deduplication_key TEXT NOT NULL UNIQUE,
  attempts INTEGER NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK(progress_percent BETWEEN 0 AND 100),
  safe_error_code TEXT,
  started_at_ms INTEGER,
  finished_at_ms INTEGER,
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX pending_jobs ON media_job(status, created_at_ms);
CREATE TABLE release (
  id TEXT PRIMARY KEY,
  moment_id TEXT NOT NULL REFERENCES moment(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  edit_id TEXT NOT NULL REFERENCES media_edit(id),
  snapshot_id TEXT NOT NULL REFERENCES live_snapshot(id),
  setup_asset_id TEXT NOT NULL REFERENCES media_asset(id),
  reveal_asset_id TEXT NOT NULL REFERENCES media_asset(id),
  content_json TEXT NOT NULL CHECK(json_valid(content_json)),
  content_hash TEXT NOT NULL,
  published_at_ms INTEGER NOT NULL,
  revoked_at_ms INTEGER,
  UNIQUE(moment_id, version)
);
CREATE UNIQUE INDEX one_active_release ON release(moment_id) WHERE revoked_at_ms IS NULL;
CREATE TABLE viewer_session (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL
);
CREATE TABLE replay_attempt (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL REFERENCES release(id) ON DELETE CASCADE,
  viewer_session_id TEXT NOT NULL REFERENCES viewer_session(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL CHECK(option_id IN ('A','B')),
  created_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER,
  UNIQUE(release_id, viewer_session_id)
);
CREATE TABLE operation_key (
  id TEXT PRIMARY KEY,
  principal_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  safe_response_json TEXT NOT NULL CHECK(json_valid(safe_response_json)),
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  UNIQUE(principal_key, operation, idempotency_key)
);
CREATE TABLE overlay_key (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES stream_session(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER,
  revoked_at_ms INTEGER
);
CREATE TABLE audit_event (
  id TEXT PRIMARY KEY,
  moment_id TEXT REFERENCES moment(id) ON DELETE SET NULL,
  actor_kind TEXT NOT NULL CHECK(actor_kind IN ('OWNER','SYSTEM','VIEWER')),
  event_type TEXT NOT NULL,
  safe_metadata_json TEXT NOT NULL CHECK(json_valid(safe_metadata_json)),
  created_at_ms INTEGER NOT NULL
);
CREATE INDEX audit_by_moment ON audit_event(moment_id, created_at_ms);

-- Defense in depth: the domain service must also validate and transact correctly.
CREATE TRIGGER moment_channel_consistent BEFORE INSERT ON moment
WHEN NEW.channel_id <> (SELECT channel_id FROM stream_session WHERE id=NEW.session_id)
BEGIN SELECT RAISE(ABORT,'moment channel does not match session'); END;
CREATE TRIGGER freeze_question_after_open BEFORE UPDATE ON moment
WHEN OLD.capture_state <> 'DRAFT' AND
 (NEW.question <> OLD.question OR NEW.option_a <> OLD.option_a OR NEW.option_b <> OLD.option_b OR NEW.code <> OLD.code)
BEGIN SELECT RAISE(ABORT,'question/options/code are frozen'); END;
CREATE TRIGGER no_reopen BEFORE UPDATE ON moment
WHEN NEW.capture_state='OPEN' AND OLD.capture_state NOT IN ('DRAFT','OPEN')
BEGIN SELECT RAISE(ABORT,'closed moment cannot reopen'); END;
CREATE TRIGGER event_mode_consistent BEFORE INSERT ON accepted_event
WHEN NEW.mode <> (SELECT s.mode FROM stream_session s JOIN moment m ON m.session_id=s.id WHERE m.id=NEW.moment_id)
BEGIN SELECT RAISE(ABORT,'mixed vote provenance'); END;
CREATE TRIGGER vote_requires_open BEFORE INSERT ON live_vote
WHEN (SELECT capture_state FROM moment WHERE id=NEW.moment_id) <> 'OPEN'
 OR NEW.received_at_ms >= (SELECT deadline_at_ms FROM moment WHERE id=NEW.moment_id)
 OR NEW.received_at_ms < (SELECT opened_at_ms FROM moment WHERE id=NEW.moment_id)
BEGIN SELECT RAISE(ABORT,'vote outside open window'); END;
CREATE TRIGGER vote_event_consistent BEFORE INSERT ON live_vote
WHEN NEW.moment_id <> (SELECT moment_id FROM accepted_event WHERE notification_id=NEW.notification_id)
BEGIN SELECT RAISE(ABORT,'vote event belongs to another moment'); END;
CREATE TRIGGER immutable_vote BEFORE UPDATE ON live_vote
BEGIN SELECT RAISE(ABORT,'first accepted vote is immutable'); END;
CREATE TRIGGER immutable_snapshot BEFORE UPDATE ON live_snapshot
BEGIN SELECT RAISE(ABORT,'live snapshot is immutable'); END;
CREATE TRIGGER snapshot_requires_lock BEFORE INSERT ON live_snapshot
WHEN (SELECT capture_state FROM moment WHERE id=NEW.moment_id) NOT IN ('LOCKED','OUTCOME_RECORDED')
BEGIN SELECT RAISE(ABORT,'snapshot requires locked moment'); END;
CREATE TRIGGER snapshot_counts_match BEFORE INSERT ON live_snapshot
WHEN NEW.count_a <> (SELECT COUNT(*) FROM live_vote WHERE moment_id=NEW.moment_id AND option_id='A')
 OR NEW.count_b <> (SELECT COUNT(*) FROM live_vote WHERE moment_id=NEW.moment_id AND option_id='B')
 OR NEW.mode <> (SELECT s.mode FROM stream_session s JOIN moment m ON m.session_id=s.id WHERE m.id=NEW.moment_id)
BEGIN SELECT RAISE(ABORT,'snapshot does not match accepted votes'); END;
CREATE TRIGGER edit_within_master BEFORE INSERT ON media_edit
WHEN NOT EXISTS(SELECT 1 FROM media_asset a WHERE a.id=NEW.master_asset_id
 AND a.moment_id=NEW.moment_id AND a.kind='MASTER' AND a.status='READY'
 AND NEW.reveal_end_ms <= a.duration_ms)
BEGIN SELECT RAISE(ABORT,'edit outside ready master'); END;
CREATE TRIGGER immutable_edit_bounds BEFORE UPDATE ON media_edit
WHEN NEW.master_asset_id<>OLD.master_asset_id OR NEW.setup_start_ms<>OLD.setup_start_ms
 OR NEW.setup_end_ms<>OLD.setup_end_ms OR NEW.reveal_start_ms<>OLD.reveal_start_ms
 OR NEW.reveal_end_ms<>OLD.reveal_end_ms OR NEW.version<>OLD.version
BEGIN SELECT RAISE(ABORT,'create a new edit revision'); END;
CREATE TRIGGER immutable_release BEFORE UPDATE ON release
WHEN NEW.id<>OLD.id OR NEW.moment_id<>OLD.moment_id OR NEW.version<>OLD.version
 OR NEW.edit_id<>OLD.edit_id OR NEW.snapshot_id<>OLD.snapshot_id
 OR NEW.setup_asset_id<>OLD.setup_asset_id OR NEW.reveal_asset_id<>OLD.reveal_asset_id
 OR NEW.content_json<>OLD.content_json OR NEW.content_hash<>OLD.content_hash
 OR NEW.published_at_ms<>OLD.published_at_ms
 OR (OLD.revoked_at_ms IS NOT NULL AND NEW.revoked_at_ms IS NOT OLD.revoked_at_ms)
BEGIN SELECT RAISE(ABORT,'release immutable; only first revocation allowed'); END;
CREATE TRIGGER release_requires_approved_assets BEFORE INSERT ON release
WHEN NOT EXISTS(SELECT 1 FROM media_edit e JOIN moment m ON m.id=e.moment_id
 JOIN live_snapshot s ON s.moment_id=m.id
 JOIN media_asset a ON a.id=e.setup_asset_id JOIN media_asset b ON b.id=e.reveal_asset_id
 WHERE e.id=NEW.edit_id AND m.id=NEW.moment_id AND s.id=NEW.snapshot_id
 AND m.capture_state='OUTCOME_RECORDED' AND m.creator_choice IS NOT NULL AND m.outcome_summary IS NOT NULL
 AND e.status='APPROVED' AND e.approved_at_ms IS NOT NULL AND e.review_hash IS NOT NULL
 AND e.proposed_content_version=m.version AND e.approved_by IS NOT NULL
 AND a.id=NEW.setup_asset_id AND a.kind='SETUP' AND a.status='READY'
 AND b.id=NEW.reveal_asset_id AND b.kind='REVEAL' AND b.status='READY')
BEGIN SELECT RAISE(ABORT,'publication gates not satisfied'); END;
CREATE TRIGGER replay_requires_active_release BEFORE INSERT ON replay_attempt
WHEN NOT EXISTS(SELECT 1 FROM release WHERE id=NEW.release_id AND revoked_at_ms IS NULL)
BEGIN SELECT RAISE(ABORT,'release unavailable'); END;
CREATE TRIGGER immutable_replay_choice BEFORE UPDATE ON replay_attempt
WHEN NEW.release_id<>OLD.release_id OR NEW.viewer_session_id<>OLD.viewer_session_id
 OR NEW.option_id<>OLD.option_id OR NEW.created_at_ms<>OLD.created_at_ms
BEGIN SELECT RAISE(ABORT,'replay choice immutable'); END;

CREATE TRIGGER event_channel_consistent BEFORE INSERT ON accepted_event
WHEN NEW.channel_id <> (SELECT channel_id FROM moment WHERE id=NEW.moment_id)
BEGIN SELECT RAISE(ABORT,'event channel does not match moment'); END;
