// Synthetic-only benchmark. Never connects to Twitch; run with Docker --network none.
import assert from "node:assert/strict";
import os from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { createApp } from "../apps/server/src/app.js";
import { config } from "../apps/server/src/config.js";
import {
  FakeProvider,
  FakeSocket,
  testTwitch,
} from "../tests/fixtures/twitch.js";

assert.equal(process.env.PM_LOAD_TEST, "synthetic-only");
assert.equal(process.platform, "linux");
assert.equal(process.getuid?.(), 1000);
const directory = "/data/load-votes";
assert.equal(existsSync(directory), false, "Use a fresh volume for every run");
mkdirSync(directory);
const provider = new FakeProvider();
const sockets: FakeSocket[] = [];
const ctx = await createApp(
  config({
    mode: "real",
    twitch: testTwitch(),
    dataDir: directory,
    minFree: 0,
  }),
  {
    providerFetch: provider.fetch,
    socketFactory: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
  },
);
const readLimit = (file: string) =>
  existsSync(file) ? readFileSync(file, "utf8").trim() : "unavailable";
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Number(
    (sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0).toFixed(3),
  );
};
const stats = (values: number[]) => ({
  count: values.length,
  p50Ms: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  p99Ms: percentile(values, 0.99),
  maxMs: percentile(values, 1),
});
const cases: object[] = [];
let heartbeat: ReturnType<typeof setInterval> | undefined;
try {
  const started = await ctx.app.inject({
    method: "GET",
    url: "/auth/twitch/start",
    headers: { host: "localhost:3000" },
  });
  assert.equal(started.statusCode, 302);
  const state = new URL(started.headers.location!).searchParams.get("state");
  const browser = started.cookies.find((c) => c.name === "pm_oauth")!.value;
  const callback = await ctx.app.inject({
    method: "GET",
    url: `/auth/twitch/callback?state=${state}&code=fixture`,
    headers: { host: "localhost:3000", cookie: `pm_oauth=${browser}` },
  });
  assert.equal(callback.statusCode, 302);
  const socket = sockets.at(-1)!;
  socket.welcome();
  for (let i = 0; i < 30 && !ctx.twitch!.ready; i++) await delay(10);
  assert.ok(ctx.twitch!.ready);
  heartbeat = setInterval(() => socket.emit("session_keepalive", {}), 5000);
  const session = ctx.d.createSession(
    "SYNTHETIC LOAD BENCHMARK — not real participants",
  );
  for (const kind of [
    "paced-35-per-second",
    "burst-1000",
    "lock-mid-burst",
  ] as const) {
    let moment = ctx.d.createMoment(session, {
      title: `Synthetic ${kind}`,
      question: "Which option?",
      optionA: "A",
      optionB: "B",
      durationSeconds: 180,
    });
    moment = ctx.d.open(moment.id, moment.version);
    const original = ctx.d.vote.bind(ctx.d);
    const persist: number[] = [],
      scheduledLatency: number[] = [],
      intake: number[] = [];
    let accepted = 0,
      rejected = 0,
      peakRss = process.memoryUsage().rss,
      maxOutstandingTasks = 0;
    // Measures actual transaction return, not a simulated database or an HTTP proxy for votes.
    ctx.d.vote = (input) => {
      const before = performance.now();
      const ok = original(input);
      intake.push(performance.now() - before);
      if (ok) {
        accepted++;
        persist.push(performance.now() - before);
      } else rejected++;
      return ok;
    };
    const events: { account: string; option: string; wrong?: boolean }[] = [];
    for (let i = 0; i < 1000; i++) {
      events.push({
        account: String(200000 + i),
        option: i % 2 === 0 ? "A" : "B",
      });
      if (kind === "paced-35-per-second" && i % 40 === 39) {
        events.push({
          account: String(200000 + i),
          option: i % 2 === 0 ? "B" : "A",
        });
        events.push({ account: String(900000 + i), option: "A", wrong: true });
      }
    }
    const loop = monitorEventLoopDelay({ resolution: 10 });
    loop.enable();
    const rssBefore = process.memoryUsage().rss,
      cpuBefore = process.cpuUsage();
    const begin = performance.now();
    const queued: Promise<void>[] = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i],
        intended =
          begin + (kind === "paced-35-per-second" ? (i * 1000) / 35 : 0);
      if (kind === "paced-35-per-second")
        await delay(Math.max(0, intended - performance.now()));
      if (kind === "lock-mid-burst" && i === 500)
        moment = ctx.d.lock(moment.id, moment.version);
      const before = accepted;
      socket.vote(
        event.wrong ? (moment.code === "ZZZZ" ? "YYYY" : "ZZZZ") : moment.code,
        event.account,
        event.option,
      );
      if (accepted > before)
        scheduledLatency.push(performance.now() - intended);
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
      // Exposed only in this offline harness; no production diagnostics endpoint added.
      maxOutstandingTasks = Math.max(
        maxOutstandingTasks,
        (ctx.twitch as unknown as { tasks: Set<Promise<unknown>> }).tasks.size,
      );
      if (kind !== "paced-35-per-second" && i % 100 === 99)
        queued.push(Promise.resolve());
    }
    await Promise.all(queued);
    await delay(20);
    loop.disable();
    const elapsedMs = performance.now() - begin;
    if (kind !== "lock-mid-burst")
      moment = ctx.d.lock(moment.id, moment.version);
    const expected = kind === "lock-mid-burst" ? 500 : 1000;
    assert.equal(accepted, expected);
    assert.equal(rejected, events.length - expected);
    assert.deepEqual(
      [
        moment.historical!.countA,
        moment.historical!.countB,
        moment.historical!.total,
      ],
      [expected / 2, expected / 2, expected],
    );
    assert.equal(
      ctx.s.get<{ n: number }>(
        "SELECT COUNT(*) n FROM live_vote WHERE moment_id=?",
        moment.id,
      )!.n,
      expected,
    );
    // Reject a never-seen account after lock and retain the exact frozen snapshot.
    socket.vote(moment.code, "99999999", "A");
    assert.equal(
      ctx.d.momentDto(ctx.d.moment(moment.id)).historical!.total,
      expected,
    );
    assert.ok(ctx.twitch!.ready);
    const cpu = process.cpuUsage(cpuBefore);
    const result = {
      kind,
      inputEvents: events.length,
      accepted,
      rejectedBeforeLateProbe: rejected - 1,
      lateProbeRejected: true,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      eventsPerSecond: Number(((events.length * 1000) / elapsedMs).toFixed(2)),
      receiptToPersist: stats(persist),
      scheduledToPersist: stats(scheduledLatency),
      allTransactionCalls: stats(intake),
      rssBeforeBytes: rssBefore,
      peakRssBytes: peakRss,
      peakOutstandingHandlerPromises: maxOutstandingTasks,
      eventLoopP95Ms:
        kind === "paced-35-per-second"
          ? Number((loop.percentile(95) / 1e6).toFixed(3))
          : null,
      cpuMs: (cpu.user + cpu.system) / 1000,
      snapshot: moment.historical,
    };
    cases.push(result);
    console.log(JSON.stringify(result));
    if (kind === "paced-35-per-second")
      assert.ok(
        percentile(persist, 0.95) < 250,
        "35/sec idle-render receipt-to-persist p95 target",
      );
    assert.ok(
      peakRss < 512 * 1024 * 1024,
      "Observed harness RSS stays under 512 MiB",
    );
    assert.ok(
      maxOutstandingTasks <= 1024,
      "Observed pending handlers stay within the production guard",
    );
    ctx.d.vote = original;
  }
  assert.equal(ctx.s.db.pragma("integrity_check", { simple: true }), "ok");
  const evidence = {
    date: new Date().toISOString(),
    scope:
      "Synthetic provider/socket fixtures through real EventSub validation and SQLite transactions. No Twitch network, engagement or unique-person claim. Render idle. Finite bursts; not proof of overload protection at unbounded input rates.",
    hardware: {
      platform: os.platform(),
      arch: os.arch(),
      cpu: os.cpus()[0]?.model,
      visibleCpuCount: os.cpus().length,
      node: process.version,
      cpuMax: readLimit("/sys/fs/cgroup/cpu.max"),
      memoryMax: readLimit("/sys/fs/cgroup/memory.max"),
      hostMemoryBytes: os.totalmem(),
    },
    method: {
      scheduledLatency:
        "Includes intended dispatch delay to avoid hiding burst backlog",
      receiptLatency:
        "Synchronous actual vote transaction return; filesystem durability uses SQLite configuration, not power-loss testing",
      burst:
        "1000 already-available events in one finite batch; lock inserted after event500",
      limits:
        "Production guard interrupts at 1024 pending handlers; separately regression-tested. This finite benchmark is not sustained-overload acceptance. Event-loop histogram is omitted for synchronous bursts because it cannot observe that blocking batch; scheduled latency exposes the backlog.",
    },
    cases,
  };
  writeFileSync("/data/vote-load.json", JSON.stringify(evidence, null, 2));
  console.log(
    "PASS: paced votes, finite burst, mid-ingestion lock, duplicate/stale/late rejection and SQLite integrity",
  );
} finally {
  clearInterval(heartbeat);
  await ctx.app.close();
}
