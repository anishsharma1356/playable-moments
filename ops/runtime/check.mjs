// Run inside the minimal candidate with read-only root, no capabilities and
// --security-opt no-new-privileges. Network check is separately opt-in.
import assert from "node:assert/strict";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

assert.equal(process.getuid(), 1000);
const status = readFileSync("/proc/self/status", "utf8");
assert.match(status, /^CapEff:\s+0+$/m);
assert.match(status, /^NoNewPrivs:\s+1$/m);
const absent = [
  "/bin/sh",
  "/bin/bash",
  "/usr/bin/perl",
  "/usr/bin/dpkg",
  "/usr/bin/apt",
  "/usr/bin/mount",
  "/usr/bin/nsenter",
  "/usr/bin/infocmp",
  "/usr/bin/setfacl",
  "/usr/lib/systemd",
  "/usr/sbin/nscd",
  "/usr/lib/x86_64-linux-gnu/gconv",
];
for (const file of absent) assert.equal(existsSync(file), false, file);
for (const license of ["GPL-2", "LGPL-2.1", "BSD"])
  assert.ok(existsSync(`/usr/share/common-licenses/${license}`));
const manifest = JSON.parse(
  readFileSync("/usr/share/playable-moments/runtime-manifest.json", "utf8"),
);
for (const record of manifest.files)
  assert.equal(
    createHash("sha256").update(readFileSync(record.path)).digest("hex"),
    record.sha256,
    record.path,
  );
const require = createRequire("/app/package.json");
const Database = require("better-sqlite3");
const db = new Database(":memory:");
assert.equal(db.prepare("SELECT 1 AS n").get().n, 1);
db.close();
const libraryPaths = new Set(manifest.files.map((f) => f.path));
for (const library of process.report.getReport().sharedObjects) {
  // VDSO is supplied by the Linux kernel, not a file in this image.
  if (library === "linux-vdso.so.1") continue;
  if (library.includes("better-sqlite3")) continue;
  assert.ok(
    libraryPaths.has(library),
    `Uninventoried runtime dependency: ${library}`,
  );
}
let twitchTls = "not requested (offline check)";
if (process.env.PM_PUBLIC_NETWORK_CHECK === "1") {
  const response = await fetch("https://id.twitch.tv/oauth2/validate", {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(
    response.status,
    401,
    "No credentials sent; expect provider authentication rejection over valid TLS",
  );
  twitchTls =
    "DNS and verified TLS reached official Twitch endpoint; 401 with no credentials, not an OAuth authorization test";
}
const evidence = {
  date: new Date().toISOString(),
  uid: 1000,
  capabilities: "none",
  noNewPrivileges: true,
  absent,
  filesVerified: manifest.files.length,
  packageProvenance: manifest.packages,
  twitchTls,
  scope:
    "Minimal runtime boundary/inventory check; not proof of absence of vulnerabilities",
};
writeFileSync(
  process.env.PM_RUNTIME_EVIDENCE ?? "/tmp/minimal-runtime.json",
  JSON.stringify(evidence, null, 2),
);
console.log(
  JSON.stringify({
    status: "passed",
    filesVerified: evidence.filesVerified,
    packages: manifest.packages.length,
    twitchTls,
  }),
);
