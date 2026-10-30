import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  mkdtemp,
  rm,
  writeFile,
  readFile,
  readdir,
  mkdir,
  rmdir,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { PassThrough } from "node:stream";
import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { Domain } from "../../apps/server/src/domain.js";
import { pruneExpired } from "../../apps/server/src/retention.js";
import type { MomentDto } from "../../packages/contracts/src/index.js";

let dir: string,
  ctx: Awaited<ReturnType<typeof createApp>>,
  cookie: string,
  csrf: string;
async function request(
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return ctx.app.inject({
    method: body === undefined ? "GET" : "POST",
    url,
    headers: {
      host: "localhost:3000",
      origin: ctx.c.origin,
      cookie,
      ...(body === undefined
        ? {}
        : {
            "content-type": "application/json",
            "x-csrf-token": csrf,
            "idempotency-key": randomUUID(),
          }),
      ...headers,
    },
    payload: body === undefined ? undefined : JSON.stringify(body),
  });
}
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "pm-hardening-"));
  ctx = await createApp(config({ mode: "demo", dataDir: dir, minFree: 0 }));
  cookie = "";
  csrf = "";
  const login = await request("/auth/demo", {});
  cookie = String(login.headers["set-cookie"]).split(";")[0];
  csrf = login.json().csrfToken;
});
afterEach(async () => {
  vi.restoreAllMocks();
  await ctx.app.close();
  await rm(dir, { recursive: true, force: true });
});
const eraseBody = (m: MomentDto) => ({
  momentId: m.id,
  expectedVersion: m.version,
  confirmation: m.title,
});

it("requires authenticated owner, Origin, CSRF, exact title and current version for erasure", async () => {
  const m = ctx.d.seed(),
    body = eraseBody(m);
  const deniedHeaders: Record<string, string>[] = [
    { cookie: "" },
    { origin: "https://wrong.example" },
    { "x-csrf-token": "wrong" },
  ];
  for (const headers of deniedHeaders) {
    expect(
      (await request("/api/owner/erase-moment", body, headers)).statusCode,
    ).toBe(headers.cookie === "" ? 401 : 403);
  }
  expect(
    (
      await request("/api/owner/erase-moment", {
        ...body,
        confirmation: "wrong",
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (await request("/api/owner/erase-moment", { ...body, expectedVersion: 1 }))
      .statusCode,
  ).toBe(409);
  const other = new Domain(ctx.s, {
    broadcasterId: "12345",
    voteKey: Buffer.alloc(32, 7),
  });
  const foreign = other.createMoment(other.createSession("Other fixture"), {
    title: "Other",
    question: "Choose?",
    optionA: "Left",
    optionB: "Right",
    durationSeconds: 45,
  });
  expect(
    (await request("/api/owner/erase-moment", eraseBody(foreign))).statusCode,
  ).toBe(404);
  expect(ctx.d.moment(m.id).id).toBe(m.id);
});

it("erases accepted votes and cached responses atomically and retries the same request safely", async () => {
  const createKey = randomUUID();
  const made = await request(
      "/api/owner/demo/moments",
      {},
      { "idempotency-key": createKey },
    ),
    m = made.json() as MomentDto;
  const key = randomUUID(),
    body = eraseBody(m);
  expect(
    ctx.s.get("SELECT id FROM live_vote WHERE moment_id=?", m.id),
  ).toBeTruthy();
  const deleted = await request("/api/owner/erase-moment", body, {
    "idempotency-key": key,
  });
  expect(deleted.statusCode, deleted.body).toBe(200);
  expect(
    (
      await request("/api/owner/erase-moment", body, { "idempotency-key": key })
    ).json(),
  ).toEqual({ deleted: true });
  for (const table of [
    "moment",
    "live_vote",
    "accepted_event",
    "live_snapshot",
    "audit_event",
  ]) {
    expect(
      ctx.s.get(
        `SELECT * FROM ${table} WHERE ${table === "moment" ? "id" : "moment_id"}=?`,
        m.id,
      ),
    ).toBeUndefined();
  }
  expect(
    ctx.s.get(
      "SELECT id FROM operation_key WHERE instr(safe_response_json,?)>0",
      m.id,
    ),
  ).toBeUndefined();
  expect(ctx.s.all("PRAGMA foreign_key_check")).toEqual([]);
  expect(
    (
      await request(
        "/api/owner/demo/moments",
        {},
        { "idempotency-key": createKey },
      )
    ).statusCode,
  ).toBe(410);
  expect(ctx.s.all("SELECT id FROM moment")).toEqual([]);
});

it("blocks erasure during open voting and an active upload; abort removes the partial file", async () => {
  let m = ctx.d.createMoment(ctx.d.createSession("Open fixture"), {
    title: "Open",
    question: "Which?",
    optionA: "Red",
    optionB: "Blue",
    durationSeconds: 45,
  });
  m = ctx.d.open(m.id, m.version);
  expect(
    (await request("/api/owner/erase-moment", eraseBody(m))).statusCode,
  ).toBe(409);
  ctx.d.cancel(m.id, m.version);
  const n = ctx.d.seed(),
    stream = new PassThrough();
  const upload = ctx.media.upload(n.id, stream, n.version);
  const failed = expect(upload).rejects.toThrow("disconnected");
  stream.write(Buffer.alloc(64));
  expect(
    (await request("/api/owner/erase-moment", eraseBody(n))).json().error.code,
  ).toBe("MEDIA_BUSY");
  stream.destroy(new Error("disconnected"));
  await failed;
  expect(await readdir(path.join(dir, "tmp"))).toEqual([]);
  expect(
    ctx.s.all("SELECT id FROM media_asset WHERE moment_id=?", n.id),
  ).toEqual([]);
});

it("retries failed file deletion after restart without touching unrelated files", async () => {
  await ctx.media.close();
  const name = randomUUID() + ".mp4",
    file = path.join(dir, "media", name);
  await mkdir(file); // A locked/unremovable path simulation, never recursive deletion.
  await writeFile(path.join(dir, "media", "keep.txt"), "unrelated");
  ctx.s.run(
    "INSERT INTO media_purge(storage_key,creator_id,created_at_ms) VALUES(?,?,?)",
    name,
    ctx.d.ownerId,
    Date.now(),
  );
  await ctx.media.purgeFiles();
  expect((await request("/api/owner/storage-status")).json()).toEqual({
    pendingFiles: 1,
    retryingFiles: 1,
  });
  await rmdir(file);
  await writeFile(file, "fixture");
  ctx.s.run("UPDATE media_purge SET retry_at_ms=0");
  const c = ctx.c;
  await ctx.app.close();
  ctx = await createApp(c);
  await expect
    .poll(async () => (await readdir(path.join(dir, "media"))).includes(name))
    .toBe(false);
  expect(await readFile(path.join(dir, "media", "keep.txt"), "utf8")).toBe(
    "unrelated",
  );
});

it("recovers only unreferenced generated files, retaining referenced originals and unrelated files", async () => {
  await ctx.media.close();
  const m = ctx.d.seed(),
    keep = randomUUID() + ".mp4",
    orphan = randomUUID() + ".mp4";
  for (const name of [keep, orphan, "user-recording.mp4"])
    await writeFile(path.join(dir, "media", name), "fixture");
  ctx.s.insert("media_asset", {
    id: randomUUID(),
    creator_id: ctx.d.ownerId,
    moment_id: m.id,
    kind: "ORIGINAL",
    status: "READY",
    storage_key: keep,
    content_type: "video/mp4",
    byte_size: 7,
    created_at_ms: Date.now(),
  });
  const c = ctx.c;
  await ctx.app.close();
  ctx = await createApp(c);
  await expect
    .poll(async () => (await readdir(path.join(dir, "media"))).includes(orphan))
    .toBe(false);
  expect((await readdir(path.join(dir, "media"))).sort()).toEqual(
    [keep, "user-recording.mp4"].sort(),
  );
});

it("refuses cleanup paths outside the managed media directory", async () => {
  await ctx.media.close();
  await writeFile(path.join(dir, "sentinel.mp4"), "keep");
  ctx.s.run(
    "INSERT INTO media_purge(storage_key,creator_id,created_at_ms) VALUES(?,?,?)",
    "../sentinel.mp4",
    ctx.d.ownerId,
    Date.now(),
  );
  await ctx.media.purgeFiles();
  expect(await readFile(path.join(dir, "sentinel.mp4"), "utf8")).toBe("keep");
  expect(
    ctx.s.get<{ attempts: number }>("SELECT attempts FROM media_purge")!
      .attempts,
  ).toBe(1);
});

it("cleans detached rendered outputs and marks exhausted jobs failed on restart", async () => {
  await ctx.media.close();
  const m = ctx.d.seed(),
    key = randomUUID() + ".mp4",
    masterId = randomUUID(),
    orphanId = randomUUID();
  ctx.s.insert("media_asset", {
    id: masterId,
    creator_id: ctx.d.ownerId,
    moment_id: m.id,
    kind: "MASTER",
    status: "READY",
    storage_key: randomUUID() + ".mp4",
    content_type: "video/mp4",
    duration_ms: 3000,
    created_at_ms: Date.now(),
  });
  ctx.s.insert("media_asset", {
    id: orphanId,
    creator_id: ctx.d.ownerId,
    moment_id: m.id,
    kind: "SETUP",
    status: "READY",
    storage_key: key,
    content_type: "video/mp4",
    duration_ms: 1000,
    created_at_ms: Date.now(),
  });
  await writeFile(path.join(dir, "media", key), "orphan");
  const queued = ctx.d.createEdit(m.id, {
    expectedVersion: m.version,
    masterAssetId: masterId,
    setupStartMs: 0,
    setupEndMs: 1000,
    revealStartMs: 1000,
    revealEndMs: 2000,
  });
  ctx.s.run(
    "UPDATE media_job SET status='RUNNING',attempts=3 WHERE id=?",
    queued.jobId,
  );
  ctx.s.run(
    "UPDATE media_edit SET status='RENDERING' WHERE id=?",
    queued.editId,
  );
  const c = ctx.c;
  await ctx.app.close();
  ctx = await createApp(c);
  expect(ctx.d.edit(queued.editId).status).toBe("FAILED");
  expect(
    ctx.s.get("SELECT id FROM media_asset WHERE id=?", orphanId),
  ).toBeUndefined();
  await expect
    .poll(async () => (await readdir(path.join(dir, "media"))).includes(key))
    .toBe(false);
});

it("prunes expired sessions and their retry caches without a restart", async () => {
  ctx.s.insert("viewer_session", {
    id: "expired",
    token_hash: "expired",
    csrf_hash: "unused",
    created_at_ms: 0,
    expires_at_ms: 1,
  });
  ctx.s.insert("operation_key", {
    id: randomUUID(),
    principal_key: "expired",
    operation: "test",
    idempotency_key: "test",
    request_hash: "unused",
    response_status: 200,
    safe_response_json: '{"optionId":"A"}',
    created_at_ms: 0,
    expires_at_ms: Date.now() + 100000,
  });
  pruneExpired(ctx.s);
  expect(
    ctx.s.get("SELECT id FROM viewer_session WHERE id='expired'"),
  ).toBeUndefined();
  expect(
    ctx.s.get("SELECT id FROM operation_key WHERE principal_key='expired'"),
  ).toBeUndefined();
  expect((await request("/api/owner/me")).statusCode).toBe(200);
});

it("returns a safe unavailable response for missing or truncated media", async () => {
  const m = ctx.d.seed(),
    id = randomUUID(),
    key = randomUUID() + ".mp4";
  ctx.s.insert("media_asset", {
    id,
    creator_id: ctx.d.ownerId,
    moment_id: m.id,
    kind: "ORIGINAL",
    status: "READY",
    storage_key: key,
    byte_size: 100,
    content_type: "video/mp4",
    created_at_ms: Date.now(),
  });
  for (const contents of [null, "truncated"]) {
    if (contents) await writeFile(path.join(dir, "media", key), contents);
    const response = await request(`/api/owner/assets/${id}/content`);
    expect(response.statusCode, response.body).toBe(410);
    expect(response.json().error.code).toBe("MEDIA_UNAVAILABLE");
    expect(response.body).not.toContain(dir);
    expect(response.headers["cache-control"]).toBe("private, no-store");
  }
});

it("rechecks creator authorization after asynchronous output verification", async () => {
  // HTTP route must not commit approval if logout/revocation happens during hashing.
  const m = ctx.d.seed(),
    asset = randomUUID();
  ctx.s.insert("media_asset", {
    id: asset,
    creator_id: ctx.d.ownerId,
    moment_id: m.id,
    kind: "MASTER",
    status: "READY",
    storage_key: randomUUID() + ".mp4",
    content_type: "video/mp4",
    duration_ms: 3000,
    created_at_ms: Date.now(),
  });
  const edit = ctx.d.createEdit(m.id, {
    expectedVersion: m.version,
    masterAssetId: asset,
    setupStartMs: 0,
    setupEndMs: 1000,
    revealStartMs: 1000,
    revealEndMs: 2000,
  });
  await ctx.media.close();
  ctx.s.run(
    "UPDATE media_edit SET setup_asset_id=?,reveal_asset_id=? WHERE id=?",
    asset,
    asset,
    edit.editId,
  );
  vi.spyOn(ctx.media, "verify").mockImplementation(async () => {
    ctx.s.run("UPDATE owner_session SET revoked_at_ms=?", Date.now());
  });
  const res = await request(`/api/owner/edits/${edit.editId}/approve`, {
    editVersion: 1,
    reviewHash: "a".repeat(64),
    watchedSetup: true,
    watchedReveal: true,
    audioChecked: true,
    rightsConfirmed: true,
    metadataChecked: true,
  });
  expect(res.statusCode, res.body).toBe(401);
});
