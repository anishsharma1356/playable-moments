import { beforeAll, afterAll, it, expect } from "vitest";
import {
  mkdtemp,
  rm,
  readFile,
  appendFile,
  writeFile,
  access,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { createApp } from "../../apps/server/src/app.js";
import { config, type Config } from "../../apps/server/src/config.js";
import { digest } from "../../packages/core/src/index.js";
import {
  publicSchema,
  type MomentDto,
  type WorkspaceDto,
  type Unlock,
  type Result,
} from "../../packages/contracts/src/index.js";
import type { Job, Asset, Snapshot } from "../../apps/server/src/storage.js";
import { generateFixture } from "../fixtures/generate.js";
import { runTool, probe } from "../../apps/server/src/media.js";
import { DomainError } from "../../packages/core/src/index.js";
let dir: string,
  c: Config,
  ctx: Awaited<ReturnType<typeof createApp>>,
  fixture: Buffer,
  m: MomentDto,
  ws: WorkspaceDto,
  slug: string,
  releaseId: string,
  unlock: Unlock;
class Client {
  cookie = "";
  csrf = "";
  async request(
    url: string,
    body?: unknown,
    extra: Record<string, string> = {},
    method?: "POST" | "GET" | "HEAD" | "PATCH",
  ) {
    const response = await ctx.app.inject({
      method: method ?? (body === undefined ? "GET" : "POST"),
      url,
      headers: {
        host: "localhost:3000",
        origin: c.origin,
        cookie: this.cookie,
        ...(body === undefined
          ? {}
          : {
              "content-type": "application/json",
              "x-csrf-token": this.csrf,
              "idempotency-key": randomUUID(),
            }),
        ...extra,
      },
      payload:
        body === undefined
          ? undefined
          : typeof body === "string" || Buffer.isBuffer(body)
            ? body
            : JSON.stringify(body),
    });
    const set = response.headers["set-cookie"];
    if (set)
      this.cookie = (Array.isArray(set) ? set : [set])
        .map((x) => x.split(";")[0])
        .join("; ");
    return response;
  }
  async login() {
    const res = await this.request("/auth/demo", {});
    expect(res.statusCode).toBe(200);
    this.csrf = res.json().csrfToken;
  }
  async manifest() {
    const res = await this.request(`/api/replay/${slug}`);
    expect(res.statusCode).toBe(200);
    const value = publicSchema.parse(res.json());
    this.csrf = value.csrfToken;
    return value;
  }
}
const owner = new Client(),
  viewer = new Client(),
  other = new Client();
async function failedJob(jobId: string) {
  for (let i = 0; i < 200; i++) {
    const j = ctx.s.get<Job>("SELECT * FROM media_job WHERE id=?", jobId)!;
    if (j.status === "FAILED") return j;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Expected the media job to fail");
}
async function waitJob(jobId: string) {
  for (let i = 0; i < 600; i++) {
    const j = ctx.s.get<Job>("SELECT * FROM media_job WHERE id=?", jobId)!;
    if (j.status === "FAILED")
      throw new Error(`Media job failed: ${j.safe_error_code}`);
    if (j.status === "SUCCEEDED") return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Job did not finish");
}
async function uploadApi(
  client: Client,
  body: Buffer,
  version: number,
  key = randomUUID(),
  hash = digest(body),
) {
  const boundary = "pm-test-boundary";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="..\\spoiler.mp4"\r\nContent-Type: video/mp4\r\n\r\n`,
    ),
    body,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return client.request(`/api/owner/moments/${m.id}/media`, payload, {
    "content-type": `multipart/form-data; boundary=${boundary}`,
    "x-moment-version": String(version),
    "x-content-sha256": hash,
    "idempotency-key": key,
  });
}
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "pm-integration-"));
  c = config({ dataDir: dir, minFree: 0 });
  ctx = await createApp(c);
  fixture = await readFile(await generateFixture(c));
  await owner.login();
  m = (await owner.request("/api/owner/demo/moments", {})).json() as MomentDto;
});
afterAll(async () => {
  await ctx.app.close();
  await rm(dir, { recursive: true, force: true });
});
it("blocks guest uploads, wrong Origin/CSRF/Host and remote demo login", async () => {
  expect((await new Client().request("/api/owner/library")).statusCode).toBe(
    401,
  );
  expect((await uploadApi(new Client(), fixture, m.version)).statusCode).toBe(
    401,
  );
  expect(
    (
      await owner.request(
        "/api/owner/demo/moments",
        {},
        { origin: "https://evil.example" },
      )
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await owner.request(
        "/api/owner/demo/moments",
        {},
        { "x-csrf-token": "bad" },
      )
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await owner.request("/api/owner/library", undefined, {
        host: "evil.example",
      })
    ).statusCode,
  ).toBe(403);
  const remote = await ctx.app.inject({
    method: "POST",
    url: "/auth/demo",
    remoteAddress: "192.0.2.1",
    headers: { host: "localhost:3000", origin: c.origin },
    payload: {},
  });
  expect(remote.statusCode).toBe(403);
});
it("rejects corrupt media and digest mismatches without creating assets", async () => {
  expect(
    (await uploadApi(owner, Buffer.from("not an MP4"), m.version)).statusCode,
  ).toBe(415);
  expect(
    (await uploadApi(owner, fixture, m.version, randomUUID(), "0".repeat(64)))
      .statusCode,
  ).toBe(409);
  expect(ctx.s.all("SELECT * FROM media_asset")).toHaveLength(0);
});
it("streams a real multipart file, normalizes it privately, and deduplicates retries", async () => {
  const key = randomUUID(),
    res = await uploadApi(owner, fixture, m.version, key);
  expect(res.statusCode, res.body).toBe(202);
  await waitJob(res.json().jobId);
  const retry = await uploadApi(owner, fixture, m.version, key);
  expect(retry.json()).toEqual(res.json());
  expect(
    (
      await uploadApi(
        owner,
        Buffer.from("changed bytes"),
        m.version,
        key,
        digest(fixture),
      )
    ).statusCode,
  ).toBe(409);
  expect(
    (await uploadApi(owner, fixture, m.version, key, "0".repeat(64)))
      .statusCode,
  ).toBe(409);
  ws = (await owner.request(`/api/owner/moments/${m.id}/workspace`)).json();
  m = ws.moment;
  expect(ws.assets.filter((a) => a.kind === "MASTER")).toHaveLength(1);
  const master = ws.assets.find((a) => a.kind === "MASTER")!;
  expect(master.status).toBe("READY");
  expect((await other.request(master.url)).statusCode).toBe(401);
  expect(JSON.stringify(ws.assets)).not.toContain("storage_key");
});
it("renders two independent files and binds review to the latest edit", async () => {
  const master = ws.assets.find((a) => a.kind === "MASTER")!;
  const body = {
    expectedVersion: m.version,
    masterAssetId: master.id,
    setupStartMs: 0,
    setupEndMs: 5000,
    revealStartMs: 6000,
    revealEndMs: 12000,
    setupCaptions:
      "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\n[Silence] Choose a door.\n",
    revealCaptions:
      "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\n[Short tone] CAPTION_OUTCOME_BLUE\n",
    setupTranscript: "Two doors, labelled Red and Blue, await a choice.",
    revealTranscript:
      "TEXT_OUTCOME_BLUE. A short tone sounds and Blue is highlighted.",
  };
  expect(
    (
      await owner.request(`/api/owner/moments/${m.id}/edits`, {
        ...body,
        setupEndMs: 7000,
      })
    ).statusCode,
  ).toBe(422);
  const res = await owner.request(`/api/owner/moments/${m.id}/edits`, body);
  expect(res.statusCode, res.body).toBe(202);
  await waitJob(res.json().jobId);
  ws = (await owner.request(`/api/owner/moments/${m.id}/workspace`)).json();
  expect(ws.edits[0].status).toBe("NEEDS_REVIEW");
  const e = ws.edits[0];
  const captions = await owner.request(
    `/api/owner/edits/${e.id}/setup/captions`,
  );
  expect(captions.headers["content-type"]).toContain("text/vtt");
  expect(captions.body).toBe(body.setupCaptions);
  expect(
    (await other.request(`/api/owner/edits/${e.id}/reveal/captions`))
      .statusCode,
  ).toBe(401);
  const saved = ctx.d.edit(e.id);
  expect(
    ctx.d.hash({ ...saved, reveal_transcript: "Changed alternative" }),
  ).not.toBe(ctx.d.hash(saved));
  expect(() =>
    ctx.s.run(
      "UPDATE media_edit SET setup_captions='changed' WHERE id=?",
      e.id,
    ),
  ).toThrow("new edit revision");
  expect(
    (
      await owner.request(`/api/owner/moments/${m.id}/publish`, {
        expectedVersion: m.version,
        editId: e.id,
        reviewHash: e.reviewHash,
      })
    ).statusCode,
  ).toBe(409);
  expect(
    (
      await owner.request(`/api/owner/edits/${e.id}/approve`, {
        editVersion: e.version,
        reviewHash: e.reviewHash,
        watchedSetup: false,
        watchedReveal: true,
        audioChecked: true,
        rightsConfirmed: true,
        metadataChecked: true,
      })
    ).statusCode,
  ).toBe(400);
});
it("verifies output durations, silent setup and reveal tone at the actual pipeline boundary", async () => {
  const e = ctx.d.edit(ws.edits[0].id),
    setup = ctx.d.asset(e.setup_asset_id!),
    reveal = ctx.d.asset(e.reveal_asset_id!);
  expect(Math.abs(setup.duration_ms - 5000)).toBeLessThan(100);
  expect(Math.abs(reveal.duration_ms - 6000)).toBeLessThan(100);
  const rms = async (a: Asset) => {
    const bytes = await runTool(c.ffmpeg, [
      "-v",
      "error",
      "-i",
      ctx.media.file(a),
      "-vn",
      "-f",
      "s16le",
      "-ac",
      "1",
      "-ar",
      "8000",
      "pipe:1",
    ]);
    let sum = 0;
    for (let i = 0; i < bytes.length; i += 2) sum += bytes.readInt16LE(i) ** 2;
    return Math.sqrt(sum / (bytes.length / 2));
  };
  expect(await rms(setup)).toBeLessThan(10);
  expect(await rms(reveal)).toBeGreaterThan(100);
  const sample = async (a: Asset, time: string) => {
    const b = await runTool(c.ffmpeg, [
      "-v",
      "error",
      "-ss",
      time,
      "-i",
      ctx.media.file(a),
      "-frames:v",
      "1",
      "-vf",
      "crop=100:100:580:200,scale=1:1",
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "pipe:1",
    ]);
    return [...b];
  };
  for (const t of ["0", "2", "4.9"]) {
    const [r, g, b] = await sample(setup, t);
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  }
  for (const t of ["0", "3", "5.9"]) {
    const [r, g, b] = await sample(reveal, t);
    expect(r).toBeGreaterThan(b + 60);
    expect(g).toBeGreaterThan(b + 40);
  }
});
it("approval detects file tampering, then publication creates an immutable release", async () => {
  const e = ws.edits[0],
    input = {
      editVersion: e.version,
      reviewHash: e.reviewHash,
      watchedSetup: true,
      watchedReveal: true,
      audioChecked: true,
      rightsConfirmed: true,
      metadataChecked: true,
    };
  const file = ctx.media.file(ctx.d.asset(ctx.d.edit(e.id).setup_asset_id!)),
    original = await readFile(file);
  await appendFile(file, "changed");
  expect(
    (await owner.request(`/api/owner/edits/${e.id}/approve`, input)).statusCode,
  ).toBe(409);
  await writeFile(file, original);
  expect(
    (await owner.request(`/api/owner/edits/${e.id}/approve`, input)).statusCode,
  ).toBe(200);
  const res = await owner.request(`/api/owner/moments/${m.id}/publish`, {
    expectedVersion: m.version,
    editId: e.id,
    reviewHash: e.reviewHash,
  });
  expect(res.statusCode, res.body).toBe(201);
  slug = res.json().slug;
  releaseId = res.json().releaseId;
  expect(() =>
    ctx.s.run("UPDATE release SET content_json='{}' WHERE id=?", releaseId),
  ).toThrow("immutable");
});
it("exposes only the spoiler-safe manifest, protects master/reveal/result, and implements HEAD/Range", async () => {
  const manifest = await viewer.manifest();
  expect(manifest.setup.transcript).toContain("Two doors");
  expect(JSON.stringify(manifest)).not.toContain("OUTCOME_BLUE");
  const captions = await viewer.request(manifest.setup.captionsUrl!);
  expect(captions.statusCode).toBe(200);
  expect(captions.body).toContain("Choose a door");
  expect(captions.body).not.toContain("OUTCOME_BLUE");
  expect(captions.headers["cache-control"]).toBe("private, no-store");
  expect(
    (
      await viewer.request(
        "/api/replay/attempts/guessed/captions",
        undefined,
        {},
        "HEAD",
      )
    ).statusCode,
  ).toBe(403);
  expect(Object.keys(manifest).sort()).toEqual(
    [
      "csrfToken",
      "mode",
      "options",
      "question",
      "releaseId",
      "setup",
      "slug",
      "title",
    ].sort(),
  );
  for (const field of [
    "creatorChoice",
    "outcomeSummary",
    "revealUrl",
    "countA",
    "countB",
    "storage_key",
  ])
    expect(JSON.stringify(manifest)).not.toContain(field);
  expect(
    (await viewer.request("/api/replay/attempts/guessed/reveal")).statusCode,
  ).toBe(403);
  expect(
    (await viewer.request("/api/replay/attempts/guessed/result")).statusCode,
  ).toBe(403);
  expect((await viewer.request(`/api/replay/${slug}/attempt`)).statusCode).toBe(
    404,
  );
  const head = await viewer.request(manifest.setup.url, undefined, {}, "HEAD");
  expect(head.statusCode).toBe(200);
  expect(head.body).toBe("");
  expect(Number(head.headers["content-length"])).toBeGreaterThan(1000);
  const partial = await viewer.request(manifest.setup.url, undefined, {
    range: "bytes=0-31",
  });
  expect(partial.statusCode).toBe(206);
  expect(partial.rawPayload.length).toBe(32);
  expect(partial.headers["cache-control"]).toBe("private, no-store");
  expect(
    (
      await viewer.request(manifest.setup.url, undefined, {
        range: "bytes=999999999-",
      })
    ).statusCode,
  ).toBe(416);
  expect(
    (
      await viewer.request(manifest.setup.url, undefined, {
        range: "bytes=0-5,10-20",
      })
    ).statusCode,
  ).toBe(416);
  expect(
    (
      await viewer.request(manifest.setup.url, undefined, {
        range: "bytes=-20",
      })
    ).rawPayload.length,
  ).toBe(20);
});
it("commits a personal choice once, retries idempotently, and keeps results separate", async () => {
  const before = ctx.s.get<Snapshot>(
    "SELECT * FROM live_snapshot WHERE moment_id=?",
    m.id,
  );
  const key = randomUUID(),
    body = { releaseId, optionId: "A" },
    res = await viewer.request(`/api/replay/${slug}/attempts`, body, {
      "idempotency-key": key,
    });
  expect(res.statusCode, res.body).toBe(201);
  unlock = res.json();
  expect(Object.keys(unlock).sort()).toEqual([
    "attemptId",
    "optionId",
    "releaseId",
    "revealCaptionsUrl",
    "revealTranscript",
    "revealUrl",
  ]);
  expect(
    (
      await viewer.request(`/api/replay/${slug}/attempts`, body, {
        "idempotency-key": key,
      })
    ).json(),
  ).toEqual(unlock);
  expect(
    (
      await viewer.request(
        `/api/replay/${slug}/attempts`,
        { ...body, optionId: "B" },
        { "idempotency-key": key },
      )
    ).statusCode,
  ).toBe(409);
  expect(
    (
      await viewer.request(`/api/replay/${slug}/attempts`, {
        ...body,
        optionId: "B",
      })
    ).statusCode,
  ).toBe(409);
  expect((await viewer.request(`/api/replay/${slug}/attempt`)).json()).toEqual(
    unlock,
  );
  expect(
    (await viewer.request(unlock.revealUrl, undefined, { range: "bytes=0-99" }))
      .statusCode,
  ).toBe(206);
  const result = (
    await viewer.request(`/api/replay/attempts/${unlock.attemptId}/result`)
  ).json() as Result;
  expect(result).toMatchObject({
    yourChoice: "A",
    creatorChoice: "B",
    historical: { countA: 5, countB: 7, total: 12, mode: "DEMO" },
  });
  expect(
    ctx.s.get<Snapshot>("SELECT * FROM live_snapshot WHERE moment_id=?", m.id),
  ).toEqual(before);
  await other.manifest();
  expect(unlock.revealTranscript).toContain("TEXT_OUTCOME_BLUE");
  expect((await viewer.request(unlock.revealCaptionsUrl!)).body).toContain(
    "CAPTION_OUTCOME_BLUE",
  );
  expect((await other.request(unlock.revealCaptionsUrl!)).statusCode).toBe(403);
  expect((await other.request(unlock.revealUrl)).statusCode).toBe(403);
  expect(
    (await other.request(`/api/replay/attempts/${unlock.attemptId}/result`))
      .statusCode,
  ).toBe(403);
});
it("persists the release and session-bound choice through a server restart", async () => {
  await ctx.app.close();
  ctx = await createApp(c);
  await viewer.manifest();
  expect((await viewer.request(`/api/replay/${slug}/attempt`)).json()).toEqual(
    unlock,
  );
  expect(
    (await viewer.request(unlock.revealUrl, undefined, { range: "bytes=0-63" }))
      .statusCode,
  ).toBe(206);
});
it("unpublish revokes old ranges/results and requires a new review revision", async () => {
  expect(
    (
      await owner.request(`/api/owner/moments/${m.id}/unpublish`, {
        expectedVersion: m.version,
      })
    ).statusCode,
  ).toBe(200);
  expect((await viewer.request(`/api/replay/${slug}`)).statusCode).toBe(410);
  expect((await viewer.request(unlock.revealCaptionsUrl!)).statusCode).toBe(
    410,
  );
  expect(
    (
      await viewer.request(
        `/api/replay/${slug}/setup/captions?releaseId=${releaseId}`,
      )
    ).statusCode,
  ).toBe(410);
  expect(
    (await viewer.request(`/api/replay/${slug}/setup?releaseId=${releaseId}`))
      .statusCode,
  ).toBe(410);
  expect(
    (await viewer.request(unlock.revealUrl, undefined, { range: "bytes=0-31" }))
      .statusCode,
  ).toBe(410);
  expect(
    (await viewer.request(`/api/replay/attempts/${unlock.attemptId}/result`))
      .statusCode,
  ).toBe(410);
  ws = (await owner.request(`/api/owner/moments/${m.id}/workspace`)).json();
  m = ws.moment;
  expect(ws.edits[0].status).toBe("NEEDS_REVIEW");
  expect(
    (
      await owner.request(`/api/owner/moments/${m.id}/publish`, {
        expectedVersion: m.version,
        editId: ws.edits[0].id,
        reviewHash: ws.edits[0].reviewHash ?? "old",
      })
    ).statusCode,
  ).toBe(409);
});
it("supports recordings without audio and fails closed when disk reserve is insufficient", async () => {
  const n = ctx.d.seed();
  const silent = await generateFixture(c, false);
  const result = await ctx.media.upload(
    n.id,
    Readable.from(await readFile(silent)),
    n.version,
  );
  await waitJob(result.jobId);
  const master = ctx.s.get<Asset>(
    "SELECT * FROM media_asset WHERE moment_id=? AND kind='MASTER'",
    n.id,
  )!;
  const current = ctx.d.moment(n.id);
  const queued = ctx.d.createEdit(n.id, {
    expectedVersion: current.version,
    masterAssetId: master.id,
    setupStartMs: 0,
    setupEndMs: 1000,
    revealStartMs: 7000,
    revealEndMs: 8000,
  });
  ctx.media.kick();
  await waitJob(queued.jobId);
  const e = ctx.d.edit(queued.editId);
  const p = await probe(c, ctx.media.file(ctx.d.asset(e.setup_asset_id!)));
  expect(p.streams.every((v) => v.codec_type !== "audio")).toBe(true);
  const reserve = c.minFree;
  c.minFree = Number.MAX_SAFE_INTEGER;
  await expect(ctx.media.reserve()).rejects.toThrow("disk space");
  c.minFree = reserve;
});
it("bounds streaming bytes and subprocess runtime", async () => {
  const n = ctx.d.seed(),
    limit = c.maxUpload;
  c.maxUpload = 128;
  try {
    await expect(
      ctx.media.upload(n.id, Readable.from(fixture), n.version),
    ).rejects.toMatchObject({ status: 413 });
  } finally {
    c.maxUpload = limit;
  }
  expect(
    ctx.s.all("SELECT * FROM media_asset WHERE moment_id=?", n.id),
  ).toHaveLength(0);
  await expect(
    runTool(process.execPath, ["-e", "setTimeout(()=>{},10000)"], 50),
  ).rejects.toMatchObject({ code: "MEDIA_TIMEOUT" });
});
it("failed encoding remains private and an explicit bounded retry succeeds", async () => {
  const master = ctx.s.get<Asset>(
    "SELECT * FROM media_asset WHERE kind='MASTER' ORDER BY created_at_ms DESC LIMIT 1",
  )!;
  const n = ctx.d.moment(master.moment_id),
    queued = ctx.d.createEdit(n.id, {
      expectedVersion: n.version,
      masterAssetId: master.id,
      setupStartMs: 0,
      setupEndMs: 1000,
      revealStartMs: 7000,
      revealEndMs: 8000,
    });
  const tool = c.ffmpeg;
  c.ffmpeg = path.join(dir, "missing-ffmpeg.exe");
  ctx.media.kick();
  try {
    expect((await failedJob(queued.jobId)).safe_error_code).toBe(
      "TOOL_UNAVAILABLE",
    );
  } finally {
    c.ffmpeg = tool;
  }
  expect(ctx.d.edit(queued.editId).status).toBe("FAILED");
  expect(ctx.d.active(n.id)).toBeUndefined();
  expect(
    (await owner.request(`/api/owner/jobs/${queued.jobId}/retry`, {}))
      .statusCode,
  ).toBe(202);
  await waitJob(queued.jobId);
  expect(ctx.d.edit(queued.editId).status).toBe("NEEDS_REVIEW");
});
it("restart interrupts open voting and reclaims a persisted running job", async () => {
  const active = ctx.d.createMoment(ctx.d.createSession("Restart test"), {
    title: "Restart",
    question: "Which?",
    optionA: "A side",
    optionB: "B side",
    durationSeconds: 45,
  });
  ctx.d.open(active.id, 1);
  const job = ctx.s.get<Job>(
    "SELECT * FROM media_job WHERE kind='RENDER_SEGMENTS' AND status='SUCCEEDED' ORDER BY created_at_ms DESC LIMIT 1",
  )!;
  const oldOutput = ctx.d.edit(job.edit_id!).setup_asset_id;
  ctx.s.run(
    "UPDATE media_job SET status='RUNNING',attempts=1 WHERE id=?",
    job.id,
  );
  ctx.s.run("UPDATE media_edit SET status='RENDERING' WHERE id=?", job.edit_id);
  await ctx.app.close();
  ctx = await createApp(c);
  expect(ctx.d.moment(active.id).capture_state).toBe("INTERRUPTED");
  expect(() => ctx.d.open(active.id, 3)).toThrow(DomainError);
  await waitJob(job.id);
  expect(ctx.d.edit(job.edit_id!).setup_asset_id).not.toBe(oldOutput);
  expect(ctx.d.edit(job.edit_id!).status).toBe("NEEDS_REVIEW");
});

it("clears one viewer's choices, then durably erases a published moment and its files", async () => {
  const master = ctx.s.get<Asset>(
    "SELECT * FROM media_asset WHERE moment_id=? AND kind='MASTER' AND status='READY' LIMIT 1",
    m.id,
  )!;
  const current = ctx.d.moment(m.id);
  const queued = ctx.d.createEdit(m.id, {
    expectedVersion: current.version,
    masterAssetId: master.id,
    setupStartMs: 0,
    setupEndMs: 1000,
    revealStartMs: 7000,
    revealEndMs: 8000,
  });
  ctx.media.kick();
  await waitJob(queued.jobId);
  const edit = ctx.d.edit(queued.editId);
  expect(
    (
      await owner.request(`/api/owner/edits/${edit.id}/approve`, {
        editVersion: edit.version,
        reviewHash: edit.review_hash,
        watchedSetup: true,
        watchedReveal: true,
        audioChecked: true,
        rightsConfirmed: true,
        metadataChecked: true,
      })
    ).statusCode,
  ).toBe(200);
  const published = await owner.request(`/api/owner/moments/${m.id}/publish`, {
    expectedVersion: current.version,
    editId: edit.id,
    reviewHash: edit.review_hash,
  });
  expect(published.statusCode, published.body).toBe(201);
  releaseId = published.json().releaseId;
  slug = published.json().slug;
  const manifest = await viewer.manifest();
  await other.manifest();
  const first = (
    await viewer.request(`/api/replay/${slug}/attempts`, {
      releaseId,
      optionId: "A",
    })
  ).json() as Unlock;
  const second = (
    await other.request(`/api/replay/${slug}/attempts`, {
      releaseId,
      optionId: "B",
    })
  ).json() as Unlock;
  const frozen = ctx.s.get<Snapshot>(
    "SELECT * FROM live_snapshot WHERE moment_id=?",
    m.id,
  );
  const oldCookie = viewer.cookie;
  expect(
    (
      await viewer.request(
        "/api/privacy/clear-choices",
        {},
        { origin: "https://wrong.example" },
      )
    ).statusCode,
  ).toBe(403);
  const cleared = await viewer.request("/api/privacy/clear-choices", {});
  expect(cleared.statusCode, cleared.body).toBe(200);
  expect(
    (await viewer.request(first.revealUrl, undefined, { cookie: oldCookie }))
      .statusCode,
  ).toBe(403);
  expect(
    ctx.s.get("SELECT id FROM replay_attempt WHERE id=?", first.attemptId),
  ).toBeUndefined();
  expect(
    ctx.s.get(
      "SELECT id FROM operation_key WHERE instr(safe_response_json,?)>0",
      first.attemptId,
    ),
  ).toBeUndefined();
  expect(
    (await other.request(second.revealUrl, undefined, { range: "bytes=0-31" }))
      .statusCode,
  ).toBe(206);
  expect(
    ctx.s.get<Snapshot>("SELECT * FROM live_snapshot WHERE moment_id=?", m.id),
  ).toEqual(frozen);
  const files = ctx.s
    .all<Asset>("SELECT * FROM media_asset WHERE moment_id=?", m.id)
    .map((a) => ctx.media.file(a));
  await ctx.media.close(); // Simulate process exit after DB erasure but before disk cleanup.
  const erase = await owner.request("/api/owner/erase-moment", {
    momentId: m.id,
    expectedVersion: current.version,
    confirmation: current.title,
  });
  expect(erase.statusCode, erase.body).toBe(200);
  expect((await other.request(manifest.setup.url)).statusCode).toBe(404);
  expect((await other.request(second.revealUrl)).statusCode).toBe(403);
  expect(
    (await other.request(`/api/replay/attempts/${second.attemptId}/result`))
      .statusCode,
  ).toBe(403);
  expect(ctx.s.all("PRAGMA foreign_key_check")).toEqual([]);
  expect(
    ctx.s.all("SELECT id FROM media_asset WHERE moment_id=?", m.id),
  ).toEqual([]);
  expect(
    ctx.s.get(
      "SELECT id FROM operation_key WHERE instr(safe_response_json,?)>0",
      m.id,
    ),
  ).toBeUndefined();
  expect(
    ctx.s.all("SELECT storage_key FROM media_purge").length,
  ).toBeGreaterThan(0);
  await ctx.app.close();
  ctx = await createApp(c);
  await expect
    .poll(async () =>
      Promise.all(
        files.map((f) =>
          access(f).then(
            () => true,
            () => false,
          ),
        ),
      ),
    )
    .toEqual(files.map(() => false));
  expect(ctx.s.all("SELECT storage_key FROM media_purge")).toEqual([]);
});
