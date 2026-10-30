import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { Domain } from "../../apps/server/src/domain.js";
import { openStore } from "../../apps/server/src/storage.js";
import { FakeProvider, FakeSocket, testTwitch } from "../fixtures/twitch.js";
import type { MomentDto } from "../../packages/contracts/src/index.js";

let dir: string,
  ctx: Awaited<ReturnType<typeof createApp>>,
  provider: FakeProvider,
  sockets: FakeSocket[],
  cookie: string,
  csrf: string;
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
beforeEach(async () => {
  dir = mkdtempSync(path.join(os.tmpdir(), "pm-twitch-"));
  provider = new FakeProvider();
  sockets = [];
  cookie = "";
  csrf = "";
  ctx = await createApp(
    config({ mode: "real", twitch: testTwitch(), dataDir: dir, minFree: 0 }),
    {
      providerFetch: provider.fetch,
      socketFactory: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
    },
  );
});
afterEach(async () => {
  vi.useRealTimers();
  await ctx.app.close();
  rmSync(dir, { recursive: true, force: true });
});
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
            "x-csrf-token": csrf,
            "idempotency-key": randomUUID(),
            "content-type": "application/json",
          }),
      ...headers,
    },
    payload: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function start() {
  const res = await request("/auth/twitch/start");
  expect(res.statusCode).toBe(302);
  const cookies = res.cookies;
  const browser = cookies.find((c) => c.name === "pm_oauth")!.value;
  const location = new URL(res.headers.location!);
  expect(location.searchParams.get("scope")).toBe("user:read:chat");
  return { state: location.searchParams.get("state")!, browser };
}
async function login() {
  const value = await start();
  cookie = `pm_oauth=${value.browser}`;
  const res = await request(
    `/auth/twitch/callback?state=${value.state}&code=test-code`,
  );
  expect(res.statusCode, res.body).toBe(302);
  cookie = `pm_owner=${res.cookies.find((c) => c.name === "pm_owner")!.value}`;
  const me = await request("/api/owner/me");
  expect(me.statusCode).toBe(200);
  csrf = me.json().csrfToken;
  sockets.at(-1)!.welcome();
  await flush();
  expect(ctx.twitch!.ready).toBe(true);
}
async function make(open = true) {
  const session = await request("/api/owner/sessions", {
    label: "Test fixture, not live evidence",
  });
  const res = await request(
    `/api/owner/sessions/${session.json().id}/moments`,
    {
      title: "Original question",
      question: "Which door?",
      optionA: "Red",
      optionB: "Blue",
      durationSeconds: 45,
    },
  );
  expect(res.statusCode, res.body).toBe(201);
  const m = res.json<MomentDto>();
  return open
    ? (
        await request(`/api/owner/moments/${m.id}/open`, {
          expectedVersion: m.version,
        })
      ).json<MomentDto>()
    : m;
}
it("real mode omits both demo endpoints and rejects unauthenticated owner access", async () => {
  expect((await request("/auth/demo", {})).statusCode).toBe(404);
  expect((await request("/api/owner/demo/moments", {})).statusCode).toBe(404);
  expect((await request("/api/owner/library")).statusCode).toBe(401);
  expect(() => ctx.d.seed()).toThrow("disabled");
});
it("interrupts a round when a synchronous event burst exceeds the pending-handler limit", async () => {
  await login();
  const m = await make();
  await flush();
  const socket = sockets.at(-1)!;
  for (let i = 0; i < 1100; i++) socket.vote(m.code, String(800000 + i), "A");
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(
    ctx.s.get<{ n: number }>(
      "SELECT COUNT(*) n FROM live_vote WHERE moment_id=?",
      m.id,
    )!.n,
  ).toBe(1024);
  expect(
    ctx.s.get("SELECT id FROM live_snapshot WHERE moment_id=?", m.id),
  ).toBeUndefined();
  expect(ctx.twitch!.status().safeMessage).toContain("overloaded");
  expect(ctx.twitch!.status().diagnostics.pendingHandlers).toBeLessThanOrEqual(
    1024,
  );
  await flush();
  expect(ctx.twitch!.status().diagnostics.pendingHandlers).toBe(0);
  expect(() => ctx.d.open(m.id, ctx.d.moment(m.id).version)).toThrow();
});
it("binds single-use OAuth state to the browser and rejects expiry, replay and account mismatch", async () => {
  const first = await start();
  expect(
    (await request(`/auth/twitch/callback?state=${first.state}&code=x`))
      .statusCode,
  ).toBe(403);
  cookie = `pm_oauth=${first.browser}`;
  provider.userId = "9999";
  expect(
    (await request(`/auth/twitch/callback?state=${first.state}&code=x`))
      .statusCode,
  ).toBe(403);
  provider.userId = "1001";
  expect(
    (await request(`/auth/twitch/callback?state=${first.state}&code=x`))
      .statusCode,
  ).toBe(403);
  const second = await start();
  cookie = `pm_oauth=${second.browser}`;
  ctx.s.run("UPDATE oauth_state SET expires_at_ms=0");
  expect(
    (await request(`/auth/twitch/callback?state=${second.state}&code=x`))
      .statusCode,
  ).toBe(403);
  expect(ctx.twitchAuth!.credential()).toBeUndefined();
});
it("rejects missing chat scope and handles declined consent without a session", async () => {
  let state = await start();
  cookie = `pm_oauth=${state.browser}`;
  expect(
    (
      await request(
        `/auth/twitch/callback?state=${state.state}&error=access_denied`,
      )
    ).statusCode,
  ).toBe(400);
  state = await start();
  cookie = `pm_oauth=${state.browser}`;
  provider.scopes = [];
  expect(
    (await request(`/auth/twitch/callback?state=${state.state}&code=x`))
      .statusCode,
  ).toBe(403);
  expect((await request("/api/owner/me")).statusCode).toBe(401);
});
it("encrypts tokens, rotates owner sessions on login and enforces Origin, CSRF and object ownership", async () => {
  await login();
  const oldCookie = cookie;
  const encrypted = ctx
    .twitchAuth!.credential()!
    .encrypted_token_blob.toString("utf8");
  expect(encrypted).not.toContain("fixture-access");
  expect(encrypted).not.toContain("fixture-refresh");
  expect(
    (
      await request(
        "/api/owner/sessions",
        { label: "x" },
        { origin: "https://bad.example" },
      )
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await request(
        "/api/owner/sessions",
        { label: "x" },
        { "x-csrf-token": "wrong" },
      )
    ).statusCode,
  ).toBe(403);
  const demo = new Domain(ctx.s),
    privateDemo = demo.seed();
  expect(
    (await request(`/api/owner/moments/${privateDemo.id}/workspace`))
      .statusCode,
  ).toBe(404);
  expect((await request("/api/owner/library")).json()).toHaveLength(0);
  await login();
  expect(
    (await request("/api/owner/me", undefined, { cookie: oldCookie }))
      .statusCode,
  ).toBe(401);
});
it("requires READY to open and creates exactly the broadcaster-user WebSocket subscription", async () => {
  await login();
  expect(sockets[0].url).toBe(
    "wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30",
  );
  const m = await make(false);
  expect(provider.lastSubscription).toEqual({
    type: "channel.chat.message",
    version: "1",
    condition: { broadcaster_user_id: "1001", user_id: "1001" },
    transport: { method: "websocket", session_id: "fixture-session" },
  });
  sockets[0].close();
  expect(
    (
      await request(`/api/owner/moments/${m.id}/open`, {
        expectedVersion: m.version,
      })
    ).statusCode,
  ).toBe(409);
});
it("persists genuine-shaped envelopes with source deduplication, first votes and frozen lock; ignores shared/wrong channel and stale codes", async () => {
  await login();
  const m = await make();
  const socket = sockets[0],
    nid = randomUUID(),
    cid = randomUUID(),
    stamp = new Date().toISOString();
  socket.vote(m.code, "2001", "A", {
    notificationId: nid,
    chatId: cid,
    timestamp: stamp,
  });
  socket.vote(m.code, "2001", "B");
  socket.vote(m.code, "2002", "B", { notificationId: nid });
  socket.vote(m.code, "2002", "B", { chatId: cid });
  socket.vote(m.code, "2002", "B", { source: "9999" });
  socket.vote(m.code, "2002", "B", { channel: "9999" });
  socket.vote("AAAA", "2002");
  socket.vote(m.code, "2002", "B");
  await flush();
  const locked = await request(`/api/owner/moments/${m.id}/lock`, {
    expectedVersion: m.version,
  });
  expect(locked.json().historical).toMatchObject({
    countA: 1,
    countB: 1,
    total: 2,
    mode: "REAL_TWITCH",
  });
  expect(
    ctx.s.get<{ provider_timestamp: string }>(
      "SELECT provider_timestamp FROM accepted_event WHERE notification_id=?",
      nid,
    )?.provider_timestamp,
  ).toBe(stamp);
  socket.vote(m.code, "2003");
  await flush();
  expect(ctx.s.get<{ n: number }>("SELECT COUNT(*) n FROM live_vote")?.n).toBe(
    2,
  );
  expect(
    ctx.s
      .all<{ account_key: string }>("SELECT account_key FROM live_vote")
      .some((x) => x.account_key === "2001"),
  ).toBe(false);
  expect(
    (
      await request(`/api/owner/moments/${m.id}/open`, {
        expectedVersion: locked.json().version,
      })
    ).statusCode,
  ).toBe(422);
});
it("expires voting using the server deadline and never accepts a late envelope", async () => {
  await login();
  const m = await make();
  ctx.s.run(
    "UPDATE moment SET deadline_at_ms=? WHERE id=?",
    Date.now() - 1,
    m.id,
  );
  sockets[0].vote(m.code, "2001");
  await flush();
  expect(ctx.s.all("SELECT * FROM live_vote")).toHaveLength(0);
  await new Promise((r) => setTimeout(r, 600));
  expect(ctx.d.moment(m.id).capture_state).toBe("LOCKED");
});
it("interrupts open voting on unexpected socket loss and restart", async () => {
  await login();
  const m = await make();
  sockets[0].close();
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(ctx.s.all("SELECT * FROM live_snapshot")).toHaveLength(0);
  await ctx.app.close();
  const crashStore = openStore(dir),
    crashDomain = new Domain(crashStore, ctx.c.twitch);
  const crashed = crashDomain.createMoment(
    crashDomain.createSession("Restart fixture"),
    {
      title: "New round",
      question: "First or second?",
      optionA: "First",
      optionB: "Second",
      durationSeconds: 45,
    },
  );
  crashDomain.open(crashed.id, crashed.version);
  crashStore.db.close();
  ctx = await createApp(
    config({ mode: "real", twitch: ctx.c.twitch, dataDir: dir, minFree: 0 }),
    {
      providerFetch: provider.fetch,
      socketFactory: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
    },
  );
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(ctx.d.moment(crashed.id).capture_state).toBe("INTERRUPTED");
  expect(provider.validationCalls).toBeGreaterThan(1);
});
it("hands over directed reconnects without resubscribing or interrupting, and rejects hostile reconnect URLs", async () => {
  await login();
  const m = await make(),
    old = sockets[0];
  old.emit("session_reconnect", {
    session: {
      reconnect_url: "wss://eventsub.wss.twitch.tv/ws?reconnect=fixture",
    },
  });
  await flush();
  expect(old.closed).toBe(false);
  old.vote(m.code, "2001");
  sockets[1].welcome("handover");
  await flush();
  expect(old.closed).toBe(true);
  expect(provider.subscriptionCalls).toBe(1);
  expect(ctx.d.moment(m.id).capture_state).toBe("OPEN");
  sockets[1].vote(m.code, "2002", "B");
  await flush();
  expect(ctx.s.all("SELECT * FROM live_vote")).toHaveLength(2);
  sockets[1].emit("session_reconnect", {
    session: { reconnect_url: "wss://evil.example/ws" },
  });
  await flush();
  expect(sockets).toHaveLength(2);
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
});
it("keeps a quiet round open across slightly delayed keepalives and notifications", async () => {
  await login();
  const m = await make();
  vi.useFakeTimers();
  const socket = sockets[0];
  socket.emit("session_keepalive", {});
  await flush();
  await vi.advanceTimersByTimeAsync(10500);
  socket.emit("session_keepalive", {});
  await flush();
  expect(socket.closed).toBe(false);
  expect(ctx.d.moment(m.id).capture_state).toBe("OPEN");
  await vi.advanceTimersByTimeAsync(10500);
  socket.vote(m.code, "2001");
  await flush();
  expect(ctx.s.all("SELECT * FROM live_vote")).toHaveLength(1);
  expect(ctx.d.moment(m.id).capture_state).toBe("OPEN");
  await vi.advanceTimersByTimeAsync(11999);
  expect(ctx.d.moment(m.id).capture_state).toBe("OPEN");
  await vi.advanceTimersByTimeAsync(2);
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(socket.closed).toBe(true);
  vi.useRealTimers();
});
it("does not open an orphan socket when an older validation finishes after a newer reconnect", async () => {
  await login();
  let finishOld!: () => void;
  const validation = vi
    .spyOn(ctx.twitchAuth!, "validate")
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishOld = resolve;
        }),
    )
    .mockResolvedValueOnce(undefined);
  const oldAttempt = ctx.twitch!.reconnect();
  try {
    await ctx.twitch!.reconnect();
    sockets.at(-1)!.welcome();
    await flush();
    expect(ctx.twitch!.ready).toBe(true);
  } finally {
    finishOld();
    await oldAttempt;
    validation.mockRestore();
  }
  expect(sockets).toHaveLength(2);
  expect(ctx.twitch!.ready).toBe(true);
});
it("does not shorten a directed handover deadline when the old socket sends a keepalive", async () => {
  await login();
  const m = await make();
  vi.useFakeTimers();
  const old = sockets[0];
  old.emit("session_reconnect", {
    session: {
      reconnect_url: "wss://eventsub.wss.twitch.tv/ws?reconnect=slow-fixture",
    },
  });
  await flush();
  await vi.advanceTimersByTimeAsync(5000);
  old.emit("session_keepalive", {});
  await flush();
  await vi.advanceTimersByTimeAsync(15000);
  expect(ctx.d.moment(m.id).capture_state).toBe("OPEN");
  sockets[1].welcome("slow-handover");
  await flush();
  expect(ctx.twitch!.ready).toBe(true);
  expect(old.closed).toBe(true);
  expect(provider.subscriptionCalls).toBe(1);
  expect(sockets[1].url).toBe(
    "wss://eventsub.wss.twitch.tv/ws?reconnect=slow-fixture",
  );
});
it("honors a negotiated 30-second keepalive and retains safe timeout diagnostics after recovery", async () => {
  await login();
  await ctx.twitch!.reconnect();
  const socket = sockets.at(-1)!;
  socket.emit("session_welcome", {
    session: { id: "thirty-second-fixture", keepalive_timeout_seconds: 30 },
  });
  await flush();
  const m = await make();
  vi.useFakeTimers();
  socket.emit("session_keepalive", {});
  await flush();
  await vi.advanceTimersByTimeAsync(30500);
  expect(ctx.d.moment(m.id).capture_state).toBe("OPEN");
  await vi.advanceTimersByTimeAsync(1501);
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(ctx.twitch!.status().diagnostics.lastTimeout).toMatchObject({
    phase: "keepalive",
    keepaliveMs: 30000,
    waitMs: 32000,
    silenceMs: 32000,
    timerDelayMs: 0,
  });
  await vi.advanceTimersByTimeAsync(1500);
  const replacement = sockets.at(-1)!;
  expect(replacement).not.toBe(socket);
  replacement.welcome();
  await flush();
  expect(ctx.twitch!.ready).toBe(true);
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(ctx.twitch!.status().diagnostics.lastTimeout?.phase).toBe("keepalive");
});
it("exposes only owner-scoped receipt counters without chat text, identity or credential details", async () => {
  await login();
  const m = await make();
  sockets[0].vote(m.code, "2001", "A");
  sockets[0].vote(m.code, "2001", "B");
  await flush();
  const res = await request("/api/owner/twitch/status");
  expect(res.json().diagnostics).toMatchObject({
    activeConnections: 1,
    connectionsOpened: 1,
    keepaliveTimeoutMs: 10000,
    chatNotifications: 2,
    acceptedVotes: 1,
    lastTimeout: null,
  });
  for (const secret of [
    "fixture-access",
    "fixture-refresh",
    "fixture-session",
    "fixture-sub",
    // Match the string identity, not coincidental digits in numeric timestamps.
    JSON.stringify("2001"),
    "!pick",
    "wss:",
  ])
    expect(res.body).not.toContain(secret);
  expect(
    (await request("/api/owner/twitch/status", undefined, { cookie: "" }))
      .statusCode,
  ).toBe(401);
});
it("interrupts on keepalive loss after the bounded delivery grace period", async () => {
  await login();
  const m = await make();
  vi.useFakeTimers();
  sockets[0].emit("session_keepalive", {});
  await flush();
  await vi.advanceTimersByTimeAsync(12001);
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  vi.useRealTimers();
});
it("periodically validates credentials before an hour and fails closed on an outage", async () => {
  await login();
  await ctx.twitch!.stop();
  vi.useFakeTimers();
  await ctx.twitch!.start();
  const socket = sockets.at(-1)!;
  socket.welcome();
  await flush();
  ctx.s.run("UPDATE oauth_credential SET validated_at_ms=0");
  const before = provider.validationCalls;
  for (let i = 0; i < 4; i++) {
    await vi.advanceTimersByTimeAsync(8000);
    socket.emit("session_keepalive", {});
    await flush();
  }
  expect(provider.validationCalls).toBe(before + 1);
  const draft = ctx.d.createMoment(
    ctx.d.createSession("Timed validation fixture"),
    {
      title: "Validation fixture",
      question: "A or B?",
      optionA: "First",
      optionB: "Second",
      durationSeconds: 180,
    },
  );
  const m = ctx.d.open(draft.id, draft.version);
  provider.unavailable = true;
  ctx.s.run("UPDATE oauth_credential SET validated_at_ms=0");
  for (let i = 0; i < 4; i++) {
    await vi.advanceTimersByTimeAsync(8000);
    if (!socket.closed) socket.emit("session_keepalive", {});
    await flush();
  }
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect(ctx.twitchAuth!.authorized).toBe(false);
});
it("refreshes once for concurrent validation and revokes sessions when refresh is rejected", async () => {
  await login();
  provider.expired = true;
  await Promise.all([
    ctx.twitchAuth!.validate(),
    ctx.twitchAuth!.validate(),
    ctx.twitchAuth!.validate(),
  ]);
  expect(provider.refreshCalls).toBe(1);
  expect((await request("/api/owner/me")).statusCode).toBe(200);
  const m = await make();
  provider.expired = true;
  provider.refreshDenied = true;
  await expect(ctx.twitchAuth!.validate()).rejects.toThrow();
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect((await request("/api/owner/me")).statusCode).toBe(401);
  expect(ctx.twitchAuth!.credential()).toBeUndefined();
});
it("fails closed on revocation and on tampering with encrypted credentials", async () => {
  await login();
  const m = await make();
  sockets[0].emit("revocation", {
    subscription: {
      id: "fixture-sub",
      type: "channel.chat.message",
      version: "1",
      condition: { broadcaster_user_id: "1001", user_id: "1001" },
      status: "authorization_revoked",
    },
  });
  await flush();
  expect(ctx.twitch!.state).toBe("REAUTH_REQUIRED");
  expect(ctx.d.moment(m.id).capture_state).toBe("INTERRUPTED");
  expect((await request("/api/owner/me")).statusCode).toBe(401);
  await login();
  ctx.s.run(
    "UPDATE oauth_credential SET encrypted_token_blob=?",
    Buffer.alloc(60),
  );
  await expect(ctx.twitchAuth!.validate()).rejects.toThrow();
  expect(ctx.twitchAuth!.credential()).toBeUndefined();
});
it("serves a revocable overlay capability with no outcome, split, source media or creator permissions", async () => {
  await login();
  const m = await make();
  sockets[0].vote(m.code, "2001");
  await flush();
  const create = () =>
    request(`/api/owner/sessions/${m.sessionId}/overlay`, {});
  const first = (await create()).json();
  const key = first.url.split("/").at(-1),
    overlay = await request(`/api/overlay/${key}`, undefined, { cookie: "" });
  expect(overlay.statusCode).toBe(200);
  expect(overlay.json()).toEqual({
    mode: "REAL_TWITCH",
    connection: "READY",
    question: m.question,
    optionA: m.optionA,
    optionB: m.optionB,
    code: m.code,
    phase: "OPEN",
    deadlineAtMs: m.deadlineAtMs,
    participantCount: 1,
  });
  expect(
    (
      await request("/api/owner/library", undefined, {
        cookie: `pm_owner=${key}`,
      })
    ).statusCode,
  ).toBe(401);
  await create();
  expect((await request(`/api/overlay/${key}`)).statusCode).toBe(404);
  expect(overlay.headers["cache-control"]).toBe("private, no-store");
  const third = (await create()).json().url.split("/").at(-1);
  ctx.s.run("UPDATE overlay_key SET expires_at_ms=0");
  expect((await request(`/api/overlay/${third}`)).statusCode).toBe(404);
});
