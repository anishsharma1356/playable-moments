// Offline metadata/notice inventory. This is not a legal compliance decision.
import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const packages = new Map();
const visited = new Set();
async function directories(folder) {
  try {
    return await readdir(folder, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function inspectPackage(folder) {
  const resolved = await realpath(folder);
  if (visited.has(resolved)) return;
  visited.add(resolved);
  let metadata;
  try {
    metadata = JSON.parse(
      await readFile(path.join(resolved, "package.json"), "utf8"),
    );
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const notices = [];
  for (const entry of await directories(resolved)) {
    if (
      entry.isFile() &&
      /^(licen[cs]e|copying|notice|copyright)([.-]|$)/i.test(entry.name)
    ) {
      const bytes = await readFile(path.join(resolved, entry.name));
      notices.push({
        file: entry.name,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        text: bytes.toString("utf8"),
      });
    }
  }
  packages.set(`${metadata.name}@${metadata.version}`, {
    name: metadata.name,
    version: metadata.version,
    declaredLicense: metadata.license ?? metadata.licenses ?? null,
    notices,
  });
  await inspectModules(path.join(resolved, "node_modules"));
}
async function inspectModules(folder) {
  for (const entry of await directories(folder)) {
    if (entry.name.startsWith(".")) continue;
    const item = path.join(folder, entry.name);
    if (entry.name.startsWith("@")) {
      for (const scoped of await directories(item))
        await inspectPackage(path.join(item, scoped.name));
    } else if (entry.isDirectory() || entry.isSymbolicLink())
      await inspectPackage(item);
  }
}
await inspectModules("/app/node_modules");
for (const entry of await directories("/app/node_modules/.pnpm"))
  if (entry.isDirectory() && entry.name !== "node_modules")
    await inspectModules(
      path.join("/app/node_modules/.pnpm", entry.name, "node_modules"),
    );
const entries = [...packages.values()].sort((a, b) =>
  a.name.localeCompare(b.name),
);
const report = {
  date: new Date().toISOString(),
  scope:
    "Installed runtime JavaScript packages; package metadata and top-level notice files only. Excludes OS, Node, Go/Caddy, FFmpeg and development tools. Not legal approval.",
  packageCount: entries.length,
  missingLicenseMetadata: entries
    .filter((p) => !p.declaredLicense)
    .map((p) => `${p.name}@${p.version}`),
  missingTopLevelNotice: entries
    .filter((p) => !p.notices.length)
    .map((p) => `${p.name}@${p.version}`),
  packages: entries.map(({ notices, ...p }) => ({
    ...p,
    notices: notices.map(({ file, sha256 }) => ({ file, sha256 })),
  })),
};
await writeFile(
  "/reports/runtime-license-inventory.json",
  JSON.stringify(report, null, 2),
);
await writeFile(
  "/reports/runtime-npm-notices.txt",
  entries
    .map(
      (p) =>
        `${p.name}@${p.version}\nDeclared license: ${JSON.stringify(p.declaredLicense)}\n\n${p.notices.map((n) => `${n.file}\n${n.text}`).join("\n\n")}`,
    )
    .join("\n\n========================================\n\n"),
);
console.log(
  JSON.stringify({
    packages: report.packageCount,
    missingLicenseMetadata: report.missingLicenseMetadata,
    missingTopLevelNotice: report.missingTopLevelNotice,
  }),
);
