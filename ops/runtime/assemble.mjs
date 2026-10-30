// Build-stage-only allowlist. Preserve package provenance; do not hide libraries
// from vulnerability scanners merely by omitting the package database.
import {
  cpSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  realpathSync,
  readdirSync,
  chownSync,
  chmodSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import assert from "node:assert/strict";

assert.equal(process.platform, "linux");
assert.equal(process.getuid(), 0);
const destination = "/minimal-root";
assert.equal(existsSync(destination), false);
mkdirSync(destination);
const require = createRequire("/app/package.json");
const Database = require("better-sqlite3");
new Database(":memory:").close();
const addon = process.report
  .getReport()
  .sharedObjects.find(
    (p) => p.includes("better-sqlite3") && p.endsWith(".node"),
  );
assert.ok(addon);
const executables = [
  "/usr/local/bin/node",
  "/usr/local/bin/ffmpeg",
  "/usr/local/bin/ffprobe",
  addon,
];
const libraries = new Set();
const owners = new Set(["base-files", "ca-certificates"]);
const records = [];
function copyFile(file, target = file) {
  assert.ok(path.isAbsolute(target));
  const dest = path.join(destination, target);
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(realpathSync(file), dest);
  const bytes = readFileSync(dest);
  records.push({
    path: target,
    original: realpathSync(file),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
for (const executable of executables) {
  const output = execFileSync("ldd", [executable], { encoding: "utf8" });
  assert.doesNotMatch(output, /not found/);
  for (const item of output.matchAll(/\/[^\s()]+/g)) libraries.add(item[0]);
}
// These glibc NSS compatibility libraries can be loaded dynamically. The
// resolver uses only local files and DNS; no external identity providers.
for (const name of ["libnss_files.so.2", "libnss_dns.so.2", "libresolv.so.2"])
  if (existsSync(`/usr/lib/x86_64-linux-gnu/${name}`))
    libraries.add(`/usr/lib/x86_64-linux-gnu/${name}`);
for (const library of [...libraries].sort()) {
  copyFile(library);
  const ownerLine = execFileSync("dpkg-query", ["-S", realpathSync(library)], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")[0];
  const owner = ownerLine.split(": ")[0].split(":")[0];
  assert.match(owner, /^[a-z0-9][a-z0-9+.-]+$/);
  owners.add(owner);
}
for (const executable of executables.slice(0, 3)) copyFile(executable);
for (const item of [
  "/etc/os-release",
  "/etc/debian_version",
  "/etc/ssl/certs/ca-certificates.crt",
])
  copyFile(item);
copyFile("/usr/local/LICENSE", "/usr/share/licenses/node/LICENSE");
mkdirSync(`${destination}/app`, { recursive: true });
cpSync("/app", `${destination}/app`, {
  recursive: true,
  verbatimSymlinks: true,
});
cpSync(
  "/usr/share/playable-moments",
  `${destination}/usr/share/playable-moments`,
  { recursive: true, dereference: true },
);
for (const name of readdirSync("/extra-notices"))
  copyFile(`/extra-notices/${name}`, `/usr/share/licenses/extra/${name}`);

const status = readFileSync("/var/lib/dpkg/status", "utf8")
  .trim()
  .split(/\n\n+/);
const selected = status.filter((p) =>
  owners.has(/^Package: (.+)$/m.exec(p)?.[1]),
);
assert.equal(selected.length, owners.size);
mkdirSync(`${destination}/var/lib/dpkg`, { recursive: true });
writeFileSync(
  `${destination}/var/lib/dpkg/status`,
  selected.join("\n\n") + "\n",
);
for (const name of owners) {
  const doc = `/usr/share/doc/${name}`;
  assert.ok(existsSync(`${doc}/copyright`), `Retain notice for ${name}`);
  cpSync(doc, `${destination}${doc}`, { recursive: true, dereference: true });
}
// Debian copyright files refer here for complete GPL/LGPL/BSD license texts.
// Keep those targets as well as each component's specific copyright notice.
cpSync(
  "/usr/share/common-licenses",
  `${destination}/usr/share/common-licenses`,
  { recursive: true, dereference: true },
);
const packages = [...owners].sort().map((name) => {
  const out = execFileSync(
    "dpkg-query",
    [
      "-W",
      "-f=${Package}\t${Version}\t${source:Package}\t${source:Version}\n",
      name,
    ],
    { encoding: "utf8" },
  )
    .trim()
    .split("\t");
  return {
    name: out[0],
    version: out[1],
    source: out[2],
    sourceVersion: out[3],
  };
});
writeFileSync(
  `${destination}/etc/passwd`,
  "node:x:1000:1000:Playable Moments:/data:/nonexistent\n",
);
writeFileSync(`${destination}/etc/group`, "node:x:1000:\n");
writeFileSync(
  `${destination}/etc/nsswitch.conf`,
  "passwd: files\ngroup: files\nhosts: files dns\n",
);
for (const dir of ["data", "tmp"]) {
  mkdirSync(`${destination}/${dir}`);
  chownSync(`${destination}/${dir}`, 1000, 1000);
}
chmodSync(`${destination}/tmp`, 0o1777);
const manifest = {
  scope:
    "Minimal runtime selected from the pinned tested Debian/Node build. Only listed shared libraries, runtime binaries, app, certificates and notices. dpkg status retains every library's original owning package and version for scanners; it is provenance, not a complete apt-managed installation.",
  architecture: process.arch,
  packages,
  files: records,
};
writeFileSync(
  `${destination}/usr/share/playable-moments/runtime-manifest.json`,
  JSON.stringify(manifest, null, 2),
);
console.log(JSON.stringify({ packages, copiedLibraries: libraries.size }));
