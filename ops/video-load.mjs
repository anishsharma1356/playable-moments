// Private-network HTTPS range-delivery benchmark, synthetic release only.
import assert from "node:assert/strict";
import https from "node:https";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
assert.equal(process.env.PM_LOAD_TEST, "synthetic-only");
const ca = await readFile("/input/root.crt");
const evidence = JSON.parse(await readFile("/input/release.json", "utf8"));
const host = process.env.PM_PROXY_HOST;
assert.match(host ?? "", /^pm-/);
const agent = new https.Agent({ keepAlive: true, maxSockets: 16 });
const timings = [];
const stages = [];
let totalBytes = 0;
function request(route, { cookie = "", body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        port: 443,
        servername: "moments.test",
        ca,
        agent,
        path: route,
        method: body === undefined ? "GET" : "POST",
        headers: {
          Host: "moments.test",
          origin: "https://moments.test",
          cookie,
          ...(body === undefined
            ? {}
            : {
                "content-type": "application/json",
                "idempotency-key": randomUUID(),
              }),
          ...headers,
        },
        timeout: 10000,
      },
      (res) => {
        const parts = [];
        res.on("data", (part) => parts.push(part));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            bytes: Buffer.concat(parts),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("HTTPS request timed out")));
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
const digest = (b) => createHash("sha256").update(b).digest("hex");
const pct = (values, p) =>
  Number(
    [...values]
      .sort((a, b) => a - b)
      [Math.ceil(values.length * p) - 1].toFixed(2),
  );
try {
  const route = `/api/replay/${evidence.release.slug}`;
  const initial = await request(route);
  assert.equal(initial.status, 200);
  const manifest = JSON.parse(initial.bytes);
  assert.equal(manifest.mode, "DEMO");
  const setup = await request(manifest.setup.url);
  assert.equal(setup.status, 200);
  assert.ok(
    setup.bytes.length > 250000,
    "Use a moving-video fixture, not a tiny static file",
  );
  for (const [clients, ticks] of [
    [5, 8],
    [10, 18],
  ]) {
    const viewers = [];
    for (let i = 0; i < clients; i++) {
      const res = await request(route);
      assert.equal(res.status, 200);
      const m = JSON.parse(res.bytes),
        cookie = res.headers["set-cookie"]
          .map((v) => v.split(";")[0])
          .join("; ");
      assert.equal(
        (await request("/api/replay/attempts/unknown/reveal", { cookie }))
          .status,
        403,
      );
      const choice = await request(route + "/attempts", {
        cookie,
        body: { releaseId: m.releaseId, optionId: i % 2 ? "A" : "B" },
        headers: { "x-csrf-token": m.csrfToken },
      });
      assert.equal(choice.status, 201);
      viewers.push({ cookie, attempt: JSON.parse(choice.bytes) });
    }
    const reference = await request(viewers[0].attempt.revealUrl, {
      cookie: viewers[0].cookie,
    });
    assert.equal(reference.status, 200);
    const sizes = [setup.bytes.length, reference.bytes.length],
      latency = [],
      scheduled = [],
      cpuBefore = process.cpuUsage(),
      start = performance.now();
    let bytes = 0;
    await Promise.all(
      viewers.map(async (viewer, index) => {
        for (let tick = 0; tick < ticks; tick++) {
          const intended = start + tick * 1000;
          await delay(Math.max(0, intended - performance.now()));
          const part = tick % 2,
            ref = part ? reference.bytes : setup.bytes,
            url = part ? viewer.attempt.revealUrl : manifest.setup.url;
          const size = Math.min(512 * 1024, ref.length),
            offset = ((tick + index) * 65536) % (ref.length - size + 1);
          const before = performance.now();
          const response = await request(url, {
            cookie: viewer.cookie,
            headers: { range: `bytes=${offset}-${offset + size - 1}` },
          });
          assert.equal(response.status, 206);
          assert.equal(response.bytes.length, size);
          assert.equal(
            response.headers["content-range"],
            `bytes ${offset}-${offset + size - 1}/${ref.length}`,
          );
          assert.equal(
            digest(response.bytes),
            digest(ref.subarray(offset, offset + size)),
          );
          latency.push(performance.now() - before);
          scheduled.push(performance.now() - intended);
          bytes += size;
        }
      }),
    );
    const seconds = (performance.now() - start) / 1000,
      cpu = process.cpuUsage(cpuBefore);
    const stage = {
      clients,
      requests: latency.length,
      seconds: Number(seconds.toFixed(2)),
      bytes,
      aggregateMbps: Number(((bytes * 8) / seconds / 1e6).toFixed(2)),
      latency: {
        p50Ms: pct(latency, 0.5),
        p95Ms: pct(latency, 0.95),
        p99Ms: pct(latency, 0.99),
        maxMs: pct(latency, 1),
      },
      scheduledToCompleteP95Ms: pct(scheduled, 0.95),
      clipBytes: sizes,
      clientCpuMs: (cpu.user + cpu.system) / 1000,
    };
    stages.push(stage);
    timings.push(...latency);
    totalBytes += bytes;
    console.log(JSON.stringify(stage));
    for (const viewer of viewers) {
      const result = await request(
        `/api/replay/attempts/${viewer.attempt.attemptId}/result`,
        { cookie: viewer.cookie },
      );
      assert.equal(result.status, 200);
      const history = JSON.parse(result.bytes).historical;
      assert.deepEqual(
        [history.countA, history.countB, history.total],
        [5, 7, 12],
      );
    }
  }
  const result = {
    date: new Date().toISOString(),
    scope:
      "Synthetic moving 720p video; private Docker-network HTTPS, certificate validated. Five then ten clients, one 512 KiB-or-smaller Range per client/second, alternating setup and authorized reveal. Not browser playback, Internet bandwidth, 1000 video viewers or combined rendering/intake capacity.",
    requestCount: timings.length,
    totalBytes,
    stages,
    serverLimits: {
      appCpu: 2,
      appMemoryGiB: 3,
      proxyCpu: 1,
      proxyMemoryMiB: 512,
    },
    sharedIpLimit:
      "All clients share one IP; production rate limit is 300 requests/minute. Higher request rates may hit429 rather than CPU saturation.",
    correctness:
      "All bytes matched source ranges; pre-choice denied; frozen5/7 history unchanged.",
  };
  await writeFile("/reports/video-load.json", JSON.stringify(result, null, 2));
  console.log(
    "PASS: 5/10 HTTPS clients, exact byte ranges, access checks and unchanged historical counts",
  );
} finally {
  agent.destroy();
}
