import { afterEach, it, expect, vi } from "vitest";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdtemp, rm, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { config } from "../../apps/server/src/config.js";
import { createApp } from "../../apps/server/src/app.js";
import { openStore } from "../../apps/server/src/storage.js";
import { Domain } from "../../apps/server/src/domain.js";
import { backup, restore, verifyBackup } from "../../ops/backup.js";
import { FakeProvider, FakeSocket, testTwitch } from "../fixtures/twitch.js";
const dirs: string[] = [];
async function temp() {
  const p = await mkdtemp(path.join(os.tmpdir(), "pm-deploy-"));
  dirs.push(p);
  return p;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  for (const p of dirs.splice(0)) await rm(p, { recursive: true, force: true });
});
function production() {
  for (const [key, value] of Object.entries({
    NODE_ENV: "production",
    APP_MODE: "real",
    HOST: "0.0.0.0",
    APP_ORIGIN: "https://moments.example.com",
    TWITCH_REDIRECT_URI: "https://moments.example.com/auth/twitch/callback",
    TWITCH_CLIENT_ID: "fixtureclientid123",
    TWITCH_CLIENT_SECRET: "fixtureclientsecret123",
    ALLOWED_BROADCASTER_ID: "1001",
    TOKEN_ENCRYPTION_KEY_BASE64: randomBytes(32).toString("base64"),
    SESSION_SIGNING_KEY_BASE64: randomBytes(32).toString("base64"),
    VOTE_HMAC_KEY_BASE64: randomBytes(32).toString("base64"),
  }))
    vi.stubEnv(key, value);
}
it("requires HTTPS real mode and exact callback/origin; local demo cannot bind publicly", () => {
  production();
  expect(config().hosted).toBe(true);
  for (const [name, value] of [
    ["APP_MODE", "demo"],
    ["APP_ORIGIN", "http://moments.example.com"],
    ["APP_ORIGIN", "https://moments.example.com/"],
    ["TWITCH_REDIRECT_URI", "https://evil.example/auth/twitch/callback"],
  ]) {
    const before = process.env[name]!;
    vi.stubEnv(name, value);
    expect(() => config()).toThrow();
    vi.stubEnv(name, before);
  }
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("APP_MODE", "demo");
  vi.stubEnv("APP_ORIGIN", "http://localhost:5173");
  expect(() => config()).toThrow(/loopback/);
});
it("hosted requests enforce Host, secure session cookies, CSRF and spoiler gates behind one proxy hop", async () => {
  const ctx = await createApp(
    config({
      hosted: true,
      mode: "real",
      twitch: testTwitch(),
      origin: "https://moments.example.com",
      dataDir: await temp(),
      minFree: 0,
    }),
    {
      providerFetch: new FakeProvider().fetch,
      socketFactory: (url) => new FakeSocket(url),
    },
  );
  try {
    const headers = { host: "moments.example.com" };
    const viewer = await ctx.app.inject({
      url: "/api/privacy/session",
      headers,
    });
    expect(viewer.statusCode).toBe(200);
    expect(viewer.headers["set-cookie"]).toMatch(
      /HttpOnly; Secure; SameSite=Lax/,
    );
    expect(viewer.headers["strict-transport-security"]).toBe(
      "max-age=31536000",
    );
    expect(
      (
        await ctx.app.inject({
          url: "/api/config",
          headers: {
            host: "localhost:3000",
            "x-forwarded-host": "moments.example.com",
          },
        })
      ).statusCode,
    ).toBe(403);
    const remote = {
      ...headers,
      "x-forwarded-for": "198.51.100.20",
      "x-forwarded-proto": "https",
    };
    const start = await ctx.app.inject({
      url: "/auth/twitch/start",
      headers: remote,
      remoteAddress: "172.18.0.2",
    });
    expect(start.statusCode).toBe(302);
    expect(start.headers["set-cookie"]).toMatch(
      /HttpOnly; Secure; SameSite=Lax/,
    );
    const state = new URL(start.headers.location!).searchParams.get("state")!;
    const callback = await ctx.app.inject({
      url: `/auth/twitch/callback?state=${state}&code=fixture`,
      remoteAddress: "172.18.0.2",
      headers: {
        ...remote,
        cookie: `pm_oauth=${start.cookies.find((c) => c.name === "pm_oauth")!.value}`,
      },
    });
    expect(callback.statusCode).toBe(302);
    const owner = {
      ...remote,
      cookie: `pm_owner=${callback.cookies.find((c) => c.name === "pm_owner")!.value}`,
    };
    const me = await ctx.app.inject({
      url: "/api/owner/me",
      remoteAddress: "172.18.0.2",
      headers: owner,
    });
    expect(me.statusCode).toBe(200);
    const mutation = {
      ...owner,
      origin: "https://evil.example",
      "x-csrf-token": me.json().csrfToken,
      "idempotency-key": randomUUID(),
    };
    expect(
      (
        await ctx.app.inject({
          method: "POST",
          url: "/api/owner/sessions",
          remoteAddress: "172.18.0.2",
          headers: mutation,
          payload: { label: "Fixture" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await ctx.app.inject({
          method: "POST",
          url: "/api/owner/sessions",
          remoteAddress: "172.18.0.2",
          headers: { ...mutation, origin: ctx.c.origin },
          payload: { label: "Fixture" },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (await ctx.app.inject({ url: "/api/owner/library", headers })).statusCode,
    ).toBe(401);
    expect(
      (
        await ctx.app.inject({
          method: "POST",
          url: "/auth/demo",
          headers,
          payload: {},
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await ctx.app.inject({
          url: "/api/replay/attempts/unknown/reveal",
          headers,
        })
      ).statusCode,
    ).toBe(403);
  } finally {
    await ctx.app.close();
  }
});
it("backs up committed WAL plus matching media, restores to a new directory and rejects damage/overwrites", async () => {
  const base = await temp(),
    source = path.join(base, "source"),
    saved = path.join(base, "saved"),
    restored = path.join(base, "restored");
  const s = openStore(source),
    d = new Domain(s),
    moment = d.seed();
  const bytes = Buffer.from("original isolated backup fixture"),
    key = `${randomUUID()}.mp4`;
  await writeFile(path.join(source, "media", key), bytes);
  s.insert("media_asset", {
    id: randomUUID(),
    creator_id: d.ownerId,
    moment_id: moment.id,
    kind: "ORIGINAL",
    status: "READY",
    storage_key: key,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byte_size: bytes.length,
    content_type: "video/mp4",
    created_at_ms: Date.now(),
  });
  // Deliberately leave WAL open: the backup API must include these commits.
  try {
    await backup(source, saved);
  } finally {
    s.db.close();
  }
  await restore(saved, restored);
  const copy = openStore(restored);
  try {
    expect(copy.get("SELECT id FROM moment WHERE id=?", moment.id)).toEqual({
      id: moment.id,
    });
  } finally {
    copy.db.close();
  }
  expect(await readFile(path.join(restored, "media", key))).toEqual(bytes);
  await expect(restore(saved, restored)).rejects.toThrow();
  await writeFile(path.join(saved, "media", key), "damaged");
  await expect(verifyBackup(saved)).rejects.toThrow(/hash mismatch/);
  await expect(restore(saved, path.join(base, "bad-copy"))).rejects.toThrow();
  await expect(stat(path.join(base, "bad-copy"))).rejects.toThrow();
});
