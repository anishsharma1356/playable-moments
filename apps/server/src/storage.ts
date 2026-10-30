import Database from "better-sqlite3";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Phase, Option } from "../../../packages/core/src/index.js";
export type SqlValue = string | number | null | Buffer;
export function openStore(dataDir: string) {
  mkdirSync(path.join(dataDir, "media"), { recursive: true });
  mkdirSync(path.join(dataDir, "tmp"), { recursive: true });
  const db = new Database(path.join(dataDir, "playable-moments.sqlite"));
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migration (name TEXT PRIMARY KEY, applied_at_ms INTEGER NOT NULL)",
  );
  const dir = path.resolve("apps/server/migrations");
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      !db.prepare("SELECT name FROM schema_migration WHERE name=?").get(name)
    ) {
      const sql = readFileSync(path.join(dir, name), "utf8").replace(
        /^PRAGMA.*;$/gm,
        "",
      );
      db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT INTO schema_migration VALUES (?,?)").run(
          name,
          Date.now(),
        );
      }).immediate();
    }
  }
  const keyPath = path.join(dataDir, "demo-vote.key");
  if (!existsSync(keyPath))
    writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: "wx" });
  return {
    db,
    voteKey: readFileSync(keyPath),
    get<T>(sql: string, ...args: SqlValue[]) {
      return db.prepare(sql).get(...args) as T | undefined;
    },
    all<T>(sql: string, ...args: SqlValue[]) {
      return db.prepare(sql).all(...args) as T[];
    },
    run(sql: string, ...args: SqlValue[]) {
      return db.prepare(sql).run(...args);
    },
    insert(table: string, fields: Record<string, SqlValue>) {
      const names = Object.keys(fields);
      db.prepare(
        `INSERT INTO ${table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`,
      ).run(...Object.values(fields));
    },
  };
}
export type Store = ReturnType<typeof openStore>;
export interface Moment {
  id: string;
  session_id: string;
  channel_id: string;
  code: string;
  public_slug: string;
  title: string;
  question: string;
  option_a: string;
  option_b: string;
  duration_seconds: number;
  capture_state: Phase;
  interruption_reason?: string | null;
  version: number;
  opened_at_ms: number | null;
  deadline_at_ms: number | null;
  locked_at_ms: number | null;
  creator_choice: Option | null;
  outcome_summary: string | null;
  resolved_answer: Option | null;
}
export interface Asset {
  id: string;
  moment_id: string;
  kind: string;
  status: string;
  storage_key: string;
  sha256: string | null;
  byte_size: number;
  duration_ms: number;
  width: number;
  height: number;
}
export interface Edit {
  setup_captions: string;
  reveal_captions: string;
  setup_transcript: string;
  reveal_transcript: string;
  id: string;
  moment_id: string;
  version: number;
  master_asset_id: string;
  setup_start_ms: number;
  setup_end_ms: number;
  reveal_start_ms: number;
  reveal_end_ms: number;
  status: string;
  setup_asset_id: string | null;
  reveal_asset_id: string | null;
  proposed_content_version: number;
  review_hash: string | null;
}
export interface Job {
  id: string;
  moment_id: string;
  edit_id: string | null;
  input_asset_id: string | null;
  kind: string;
  status: string;
  attempts: number;
  progress_percent: number;
  safe_error_code: string | null;
}
export interface Release {
  id: string;
  moment_id: string;
  version: number;
  edit_id: string;
  snapshot_id: string;
  setup_asset_id: string;
  reveal_asset_id: string;
  content_json: string;
  revoked_at_ms: number | null;
}
export interface Snapshot {
  id: string;
  count_a: number;
  count_b: number;
  total: number;
  mode: "DEMO" | "REAL_TWITCH";
  locked_at_ms: number;
  integrity_hash: string;
}
export interface Session {
  id: string;
  token_hash: string;
  csrf_hash: string;
  expires_at_ms: number;
  revoked_at_ms?: number | null;
  creator_id?: string;
  auth_generation?: number;
}
export interface Attempt {
  id: string;
  release_id: string;
  viewer_session_id: string;
  option_id: Option;
}
