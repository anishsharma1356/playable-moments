// Runs inside the built image, mounted read-only at /app/container-smoke.mjs.
// Synthetic DEMO evidence only; never points at the user's Twitch database.
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
const exec = promisify(execFile);
assert.equal(process.platform, "linux");
assert.equal(
  process.getuid(),
  1000,
  "Image must run as the non-root node user",
);
assert.equal(process.env.PM_CONTAINER_TEST, "synthetic-only");
const base = "http://localhost:3000",
  checks = [];
const env = {
  ...process.env,
  NODE_ENV: "development",
  APP_MODE: "demo",
  HOST: "127.0.0.1",
  PORT: "3000",
  APP_ORIGIN: base,
  DATA_DIR: "/data/app",
  MIN_FREE_DISK_BYTES: "0",
};
const record = (name) => {
  checks.push(name);
  console.log("PASS: " + name);
};
for (const path of [
  "/usr/local/lib/node_modules/npm",
  "/usr/local/bin/yarn",
  "/app/node_modules/typescript",
  "/app/node_modules/vite",
  "/app/node_modules/vitest",
  "/app/node_modules/eslint",
  "/app/node_modules/@playwright/test",
])
  assert.equal(existsSync(path), false, `Unused runtime dependency: ${path}`);
for (const entry of await readdir("/app/node_modules/.pnpm"))
  assert.equal(
    /^(typescript|vite|vitest|eslint|esbuild|@playwright\+test|@axe-core\+playwright)@/.test(
      entry,
    ),
    false,
    `Development package retained in pnpm virtual store: ${entry}`,
  );
record("production dependencies only; npm/yarn and development tools absent");
async function command(program, args, extra = {}) {
  return exec(program, args, {
    env,
    timeout: 120000,
    maxBuffer: 1024 * 1024,
    ...extra,
  });
}
const protocols = (
  await command("ffmpeg", ["-hide_banner", "-protocols"])
).stdout
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^[a-z][a-z0-9_]*$/.test(line));
assert.deepEqual([...new Set(protocols)].sort(), ["file", "pipe"]);
const demuxers = (await command("ffmpeg", ["-hide_banner", "-demuxers"])).stdout
  .split(/\r?\n/)
  .filter((line) => /^ D[ E][ d] /.test(line))
  .map((line) => line.slice(4).trim().split(/\s+/)[0]);
assert.deepEqual(demuxers.sort(), ["lavfi", "mov,mp4,m4a,3gp,3g2,mj2"]);
record(
  "FFmpeg has only file/pipe protocols and MP4/lavfi inputs; network formats absent",
);
let server, closed;
async function start(directory = "/data/app") {
  server = spawn(process.execPath, ["dist/server/main.js"], {
    env: { ...env, DATA_DIR: directory },
    stdio: ["ignore", "ignore", "inherit"],
  });
  closed = new Promise((resolve) => server.once("close", resolve));
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw Error("Compiled server exited during startup");
    try {
      if ((await fetch(base + "/health/ready")).ok) return;
    } catch {
      /* startup */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw Error("Server readiness timeout");
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  const deadline = setTimeout(() => server.kill("SIGKILL"), 15000);
  await closed;
  clearTimeout(deadline);
}
class Client {
  cookies = new Map();
  csrf = "";
  async request(route, body, headers = {}) {
    const multipart = body instanceof FormData;
    const response = await fetch(base + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        origin: base,
        cookie: [...this.cookies].map(([k, v]) => k + "=" + v).join("; "),
        ...(body === undefined
          ? {}
          : {
              "x-csrf-token": this.csrf,
              "idempotency-key": randomUUID(),
              ...(multipart ? {} : { "content-type": "application/json" }),
            }),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : multipart
            ? body
            : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, value] = cookie.split(";")[0].split("=");
      this.cookies.set(name, value);
    }
    return response;
  }
  async json(route, body, expected = 200, headers) {
    const response = await this.request(route, body, headers);
    const value = await response.json();
    assert.equal(
      response.status,
      expected,
      `${route}: ${JSON.stringify(value)}`,
    );
    return value;
  }
}
const owner = new Client(),
  viewer = new Client(),
  stranger = new Client();
async function waitJob(id) {
  for (let i = 0; i < 300; i++) {
    const job = await owner.json(`/api/owner/jobs/${id}`);
    if (job.status === "SUCCEEDED") return;
    if (job.status === "FAILED")
      throw Error("Media job failed: " + job.errorCode);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw Error("Media processing timeout");
}
try {
  await assert.rejects(
    writeFile("/app/root-write-check", "must not be writable"),
  );
  record("non-root runtime and read-only application filesystem");
  await command(process.execPath, ["dist/ops/manage.js", "doctor"]);
  record("Linux doctor: SQLite migrations, writable data and H.264/AAC tools");
  await command("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    process.env.PM_VIDEO_LOAD_FIXTURE === "1"
      ? "testsrc2=s=1280x720:r=30:d=12"
      : "color=c=0x181427:s=640x360:r=30:d=12",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=660:sample_rate=48000:duration=12",
    "-vf",
    "drawbox=x=120:y=70:w=120:h=180:color=red:t=fill,drawbox=x=400:y=70:w=120:h=180:color=blue:t=fill,drawbox=x=395:y=65:w=130:h=190:color=yellow:t=5:enable='gte(t,6)'",
    "-af",
    "volume=0:enable='lt(t,6)'",
    "-c:v",
    "libx264",
    "-threads",
    "2",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "/data/fixture.mp4",
  ]);
  await start();
  assert.equal((await fetch(base + "/studio")).status, 200);
  record("compiled server and static Studio startup");
  owner.csrf = (await owner.json("/auth/demo", {})).csrfToken;
  const moment = await owner.json("/api/owner/demo/moments", {}, 201);
  const bytes = await readFile("/data/fixture.mp4"),
    form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: "video/mp4" }),
    "synthetic.mp4",
  );
  const upload = await owner.json(
    `/api/owner/moments/${moment.id}/media`,
    form,
    202,
    {
      "x-moment-version": String(moment.version),
      "x-content-sha256": createHash("sha256").update(bytes).digest("hex"),
    },
  );
  await waitJob(upload.jobId);
  let workspace = await owner.json(`/api/owner/moments/${moment.id}/workspace`);
  const master = workspace.assets.find((a) => a.kind === "MASTER");
  assert.equal((await stranger.request(master.url)).status, 401);
  const render = await owner.json(
    `/api/owner/moments/${moment.id}/edits`,
    {
      expectedVersion: workspace.moment.version,
      masterAssetId: master.id,
      setupStartMs: 0,
      setupEndMs: 5000,
      revealStartMs: 6000,
      revealEndMs: 12000,
    },
    202,
  );
  await waitJob(render.jobId);
  workspace = await owner.json(`/api/owner/moments/${moment.id}/workspace`);
  const edit = workspace.edits[0];
  for (const [name, url] of [
    ["setup", edit.setupPreviewUrl],
    ["reveal", edit.revealPreviewUrl],
  ]) {
    const response = await owner.request(url);
    assert.equal(response.status, 200);
    await writeFile(
      `/data/${name}.mp4`,
      Buffer.from(await response.arrayBuffer()),
    );
    await command("ffmpeg", [
      "-v",
      "error",
      "-i",
      `/data/${name}.mp4`,
      "-f",
      "null",
      "-",
    ]);
  }
  record(
    "synthetic upload, private master, separate setup/reveal encoding and full decode",
  );
  // Test fixture approval is not a claim of human content review.
  await owner.json(`/api/owner/edits/${edit.id}/approve`, {
    editVersion: edit.version,
    reviewHash: edit.reviewHash,
    watchedSetup: true,
    watchedReveal: true,
    audioChecked: true,
    rightsConfirmed: true,
    metadataChecked: true,
  });
  const release = await owner.json(
    `/api/owner/moments/${moment.id}/publish`,
    {
      expectedVersion: workspace.moment.version,
      editId: edit.id,
      reviewHash: edit.reviewHash,
    },
    201,
  );
  const manifest = await viewer.json(`/api/replay/${release.slug}`);
  viewer.csrf = manifest.csrfToken;
  assert.deepEqual(
    Object.keys(manifest).sort(),
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
  assert.equal(
    (await stranger.request("/api/replay/attempts/unknown/reveal")).status,
    403,
  );
  const partial = await viewer.request(manifest.setup.url, undefined, {
    range: "bytes=0-31",
  });
  assert.equal(partial.status, 206);
  assert.equal((await partial.arrayBuffer()).byteLength, 32);
  const attempt = await viewer.json(
    `/api/replay/${release.slug}/attempts`,
    { releaseId: release.releaseId, optionId: "A" },
    201,
  );
  assert.equal((await viewer.request(attempt.revealUrl)).status, 200);
  assert.equal((await stranger.request(attempt.revealUrl)).status, 403);
  const result = await viewer.json(
    `/api/replay/attempts/${attempt.attemptId}/result`,
  );
  assert.equal(result.yourChoice, "A");
  assert.equal(result.creatorChoice, "B");
  assert.deepEqual(
    [
      result.historical.countA,
      result.historical.countB,
      result.historical.total,
    ],
    [5, 7, 12],
  );
  record(
    "publication, spoiler-safe manifest, Range, choice/reveal and cross-session denial",
  );
  await stop();
  await start();
  assert.deepEqual(
    await viewer.json(`/api/replay/attempts/${attempt.attemptId}/result`),
    result,
  );
  record(
    "server restart retains published release, personal choice and frozen history",
  );
  await stop();
  await mkdir("/data/backups", { recursive: true });
  await command(process.execPath, [
    "dist/ops/backup.js",
    "backup",
    "/data/app",
    "/data/backups/check",
    "--app-stopped",
  ]);
  await command(process.execPath, [
    "dist/ops/backup.js",
    "verify",
    "/data/backups/check",
  ]);
  await command(process.execPath, [
    "dist/ops/backup.js",
    "restore",
    "/data/backups/check",
    "/data/restored",
    "--app-stopped",
  ]);
  await start("/data/restored");
  assert.deepEqual(
    await viewer.json(`/api/replay/attempts/${attempt.attemptId}/result`),
    result,
  );
  assert.equal((await viewer.request(attempt.revealUrl)).status, 200);
  assert.equal((await stranger.request(attempt.revealUrl)).status, 403);
  record(
    "stopped backup/verify/restore replays the same release with session gates intact",
  );
  await writeFile(
    "/data/container-smoke.json",
    JSON.stringify(
      {
        date: "2026-10-28",
        scope:
          "Built Linux image; isolated synthetic DEMO, no human-review/live-Twitch claim",
        node: process.version,
        uid: process.getuid(),
        checks,
        release,
      },
      null,
      2,
    ),
  );
} finally {
  await stop();
}
