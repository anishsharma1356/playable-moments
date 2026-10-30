// Evidence for narrowly scoped base-image advisory dispositions; no suppressions.
import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
assert.equal(process.platform, "linux");
assert.equal(process.getuid(), 1000);
const status = await readFile("/proc/self/status", "utf8");
assert.match(status, /^CapEff:\s+0+$/m);
assert.match(status, /^NoNewPrivs:\s+1$/m);
for (const file of [
  "/usr/lib/systemd/systemd-homed",
  "/lib/systemd/systemd-homed",
  "/usr/bin/setfacl",
])
  assert.equal(existsSync(file), false, `Unexpected affected utility: ${file}`);
const perlRoots = existsSync("/usr/share/perl")
  ? await readdir("/usr/share/perl")
  : [];
for (const root of perlRoots)
  assert.equal(existsSync(`/usr/share/perl/${root}/Archive/Tar.pm`), false);
// Check all default module search paths, including vendor and architecture paths.
execFileSync("perl", ["-e", "exit(eval { require Archive::Tar; 1 } ? 1 : 0)"]);
const Database = require("better-sqlite3");
new Database(":memory:").close();
const sqlite = process.report
  .getReport()
  .sharedObjects.find(
    (file) => file.includes("better-sqlite3") && file.endsWith(".node"),
  );
assert.ok(
  sqlite,
  "Identify the native SQLite library actually loaded by this runtime",
);
const libraries = {};
for (const binary of [
  process.execPath,
  "/usr/local/bin/ffmpeg",
  "/usr/local/bin/ffprobe",
  sqlite,
]) {
  const output = execFileSync("ldd", [binary], { encoding: "utf8" });
  assert.doesNotMatch(
    output,
    /not found|libacl|libncurses|libtinfo|libsystemd|libudev|libmount|libblkid/,
  );
  libraries[path.basename(binary)] = output
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean)
    .sort();
}
const result = {
  date: "2026-10-28",
  scope:
    "Evidence for this exact non-root, capability-free, no-new-privileges deployment; not a general statement about vulnerable packages",
  uid: process.getuid(),
  capabilities: "none",
  noNewPrivileges: true,
  absent: ["systemd-homed", "setfacl", "Perl Archive::Tar"],
  runtimeLinkage: libraries,
};
await writeFile(
  process.env.PM_RUNTIME_EVIDENCE ?? "/tmp/runtime-security.json",
  JSON.stringify(result, null, 2),
);
console.log(
  "PASS: runtime privilege boundaries, affected utility absence and actual binary/library linkage",
);
