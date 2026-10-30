// HTTPS test client: trusts only the temporary test CA, never disables TLS checks.
import assert from "node:assert/strict";
import https from "node:https";
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const ca = await readFile("data/container-verification/root.crt");
const fixture = JSON.parse(
  await readFile("data/container-verification/proxy-fixture.json", "utf8"),
);
const evidence = JSON.parse(
  await readFile(
    process.env.PM_RELEASE_EVIDENCE ??
      "docs/evidence/container-smoke-2026-10-28.json",
    "utf8",
  ),
);
const checks = [];
const record = (name) => {
  checks.push(name);
  console.log("PASS: " + name);
};
function request(
  route,
  { cookie = "", body, headers = {}, sse = false, redirect = false } = {},
) {
  return new Promise((resolve, reject) => {
    const transport = redirect ? http : https;
    const req = transport.request(
      {
        hostname: process.env.PM_PROXY_HOST ?? "127.0.0.1",
        port: redirect
          ? Number(process.env.PM_HTTP_PORT ?? 9080)
          : Number(process.env.PM_HTTPS_PORT ?? 9443),
        servername: "moments.test",
        ca,
        path: route,
        method: body === undefined ? "GET" : "POST",
        timeout: 10000,
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
      },
      (res) => {
        const chunks = [];
        res.on("data", (data) => {
          chunks.push(data);
          if (sse && Buffer.concat(chunks).toString().includes("\n\n")) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              bytes: Buffer.concat(chunks),
            });
            req.destroy();
          }
        });
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            bytes: Buffer.concat(chunks),
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(Error("Proxy request timeout")));
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
const route = `/api/replay/${evidence.release.slug}`;
const home = await request("/studio");
assert.equal(home.status, 200);
assert.equal(home.headers["strict-transport-security"], "max-age=31536000");
record(
  "HTTPS certificate and hostname verified with dedicated test CA; compiled Studio served",
);
const redirect = await request("/studio", { redirect: true });
assert.equal(redirect.status, 308);
assert.equal(redirect.headers.location, "https://moments.test/studio");
assert.equal((await request("/health/ready")).status, 404);
assert.equal((await request("/api/owner/library")).status, 401);
record("HTTP redirect, private health endpoints and owner authentication");
const manifestResponse = await request(route);
assert.equal(manifestResponse.status, 200);
const setCookie = manifestResponse.headers["set-cookie"];
assert.ok(setCookie?.length);
assert.match(setCookie[0], /HttpOnly; Secure; SameSite=Lax/);
const cookie = setCookie.map((value) => value.split(";")[0]).join("; ");
const manifest = JSON.parse(manifestResponse.bytes);
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
const partial = await request(manifest.setup.url, {
  headers: { range: "bytes=0-31" },
});
assert.equal(partial.status, 206);
assert.equal(partial.bytes.length, 32);
assert.equal(partial.headers["cache-control"], "private, no-store");
record(
  "secure anonymous session cookie, spoiler-safe manifest and exact media Range through proxy",
);
const body = { releaseId: manifest.releaseId, optionId: "B" };
const wrongOrigin = await request(route + "/attempts", {
  cookie,
  body,
  headers: {
    origin: "https://wrong.example",
    "x-csrf-token": manifest.csrfToken,
  },
});
assert.equal(wrongOrigin.status, 403);
assert.equal(
  (await request("/api/replay/attempts/unknown/reveal")).status,
  403,
);
const chosen = await request(route + "/attempts", {
  cookie,
  body,
  headers: { "x-csrf-token": manifest.csrfToken },
});
assert.equal(chosen.status, 201);
const attempt = JSON.parse(chosen.bytes);
assert.equal((await request(attempt.revealUrl, { cookie })).status, 200);
assert.equal((await request(attempt.revealUrl)).status, 403);
const result = JSON.parse(
  (
    await request(`/api/replay/attempts/${attempt.attemptId}/result`, {
      cookie,
    })
  ).bytes,
);
assert.equal(result.yourChoice, "B");
assert.deepEqual([result.historical.countA, result.historical.countB], [5, 7]);
record(
  "Origin rejection, choice-gated reveal, cross-session denial and unchanged synthetic history",
);
const started = performance.now();
const stream = await request(`/api/overlay/${fixture.overlayToken}/events`, {
  sse: true,
});
assert.equal(stream.status, 200);
assert.match(stream.headers["content-type"], /text\/event-stream/);
assert.match(stream.bytes.toString(), /event: snapshot/);
for (const field of [
  "creatorChoice",
  "outcomeSummary",
  "countA",
  "countB",
  "revealUrl",
])
  assert.ok(!stream.bytes.toString().includes(field));
assert.ok(performance.now() - started < 5000);
record(
  "live SSE snapshot arrives through HTTPS proxy without buffered delay or spoiler fields",
);
await writeFile(
  process.env.PM_EVIDENCE_PATH ?? "docs/evidence/proxy-smoke-2026-10-28.json",
  JSON.stringify(
    {
      date: "2026-10-28",
      scope:
        "Private Docker network HTTPS with temporary CA and restored synthetic release; not public TLS or real Twitch authorization",
      checks,
    },
    null,
    2,
  ),
);
