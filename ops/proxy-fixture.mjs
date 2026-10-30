// Run only with the restored synthetic volume produced by container-smoke.mjs.
// The app must be stopped. The resulting capability stays in ignored test data.
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import Database from "better-sqlite3";
assert.equal(process.env.PM_CONTAINER_TEST, "synthetic-only");
assert.equal(process.platform, "linux");
const db = new Database("/data/restored/playable-moments.sqlite", {
  fileMustExist: true,
});
try {
  assert.equal(
    db
      .prepare("SELECT COUNT(*) n FROM stream_session WHERE mode <> 'DEMO'")
      .get().n,
    0,
  );
  const session = db
    .prepare(
      "SELECT id FROM stream_session WHERE mode='DEMO' AND status='ACTIVE' LIMIT 1",
    )
    .get();
  assert.ok(session);
  const overlayToken = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO overlay_key(id,session_id,token_hash,created_at_ms,expires_at_ms) VALUES(?,?,?,?,?)",
  ).run(
    randomUUID(),
    session.id,
    createHash("sha256").update(overlayToken).digest("hex"),
    Date.now(),
    Date.now() + 3600000,
  );
  await writeFile(
    "/data/proxy-fixture.json",
    JSON.stringify({ overlayToken }),
    { mode: 0o600 },
  );
  console.log(
    "Created expiring synthetic overlay capability; token not printed.",
  );
} finally {
  db.close();
}
