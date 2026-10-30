import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dbName = "playable-moments.sqlite";
type FileEntry = { name: string; sha256: string };
type Manifest = { version: 1; createdAt: string; files: FileEntry[] };
const allowed = (name: string) =>
  name === dbName ||
  name === "demo-vote.key" ||
  /^media\/[a-f0-9-]+\.mp4$/.test(name);
async function hash(file: string) {
  if (!(await lstat(file)).isFile())
    throw new Error("Backup requires ordinary files, not links.");
  const h = createHash("sha256");
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest("hex");
}
function inspect(file: string) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    if (
      db.pragma("integrity_check", { simple: true }) !== "ok" ||
      (db.pragma("foreign_key_check") as unknown[]).length
    )
      throw new Error("SQLite integrity check failed.");
    const assets = db
      .prepare(
        "SELECT storage_key, sha256 FROM media_asset WHERE status='READY'",
      )
      .all() as { storage_key: string; sha256: string | null }[];
    for (const asset of assets)
      if (!allowed(`media/${asset.storage_key}`) || !asset.sha256)
        throw new Error("Invalid asset reference in database.");
    return assets;
  } finally {
    db.close();
  }
}
export async function verifyBackup(directory: string) {
  const manifest = JSON.parse(
    await readFile(path.join(directory, "manifest.json"), "utf8"),
  ) as Manifest;
  if (manifest.version !== 1 || !Array.isArray(manifest.files))
    throw new Error("Unsupported backup manifest.");
  const names = new Set<string>();
  for (const entry of manifest.files) {
    if (
      !allowed(entry.name) ||
      names.has(entry.name) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    )
      throw new Error("Invalid backup entry.");
    names.add(entry.name);
    if ((await hash(path.join(directory, entry.name))) !== entry.sha256)
      throw new Error("Backup hash mismatch.");
  }
  if (!names.has(dbName) || !names.has("demo-vote.key"))
    throw new Error("Incomplete backup.");
  for (const asset of inspect(path.join(directory, dbName))) {
    const entry = manifest.files.find(
      (f) => f.name === `media/${asset.storage_key}`,
    );
    if (!entry || entry.sha256 !== asset.sha256)
      throw new Error("Backup does not match the database media references.");
  }
  return manifest;
}
export async function backup(source: string, destination: string) {
  // The runbook stops the app first. SQLite's backup API includes committed WAL
  // state; referenced immutable media is copied and checked before completion.
  await mkdir(destination, { mode: 0o700 }); // Refuse an existing destination.
  await mkdir(path.join(destination, "media"), { mode: 0o700 });
  const db = new Database(path.join(source, dbName), {
    readonly: true,
    fileMustExist: true,
  });
  try {
    await db.backup(path.join(destination, dbName));
  } finally {
    db.close();
  }
  const files: FileEntry[] = [];
  const assets = inspect(path.join(destination, dbName));
  for (const name of [
    "demo-vote.key",
    ...assets.map((a) => `media/${a.storage_key}`),
  ]) {
    await hash(path.join(source, name));
    await copyFile(path.join(source, name), path.join(destination, name));
  }
  for (const name of [
    dbName,
    "demo-vote.key",
    ...assets.map((a) => `media/${a.storage_key}`),
  ])
    files.push({ name, sha256: await hash(path.join(destination, name)) });
  for (const asset of assets)
    if (
      files.find((f) => f.name === `media/${asset.storage_key}`)?.sha256 !==
      asset.sha256
    )
      throw new Error("Media changed or is damaged; backup is incomplete.");
  await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(
      { version: 1, createdAt: new Date().toISOString(), files },
      null,
      2,
    ),
    { flag: "wx", mode: 0o600 },
  );
  await verifyBackup(destination);
}
export async function restore(source: string, destination: string) {
  const manifest = await verifyBackup(source);
  await mkdir(destination, { mode: 0o700 }); // Never overwrite existing data.
  await mkdir(path.join(destination, "media"), { mode: 0o700 });
  await mkdir(path.join(destination, "tmp"), { mode: 0o700 });
  for (const entry of manifest.files) {
    await copyFile(
      path.join(source, entry.name),
      path.join(destination, entry.name),
    );
    if ((await hash(path.join(destination, entry.name))) !== entry.sha256)
      throw new Error("Restored hash mismatch; do not start this copy.");
  }
  inspect(path.join(destination, dbName));
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const [action, source, destination, flag] = process.argv.slice(2);
  if (action === "verify" && source) await verifyBackup(path.resolve(source));
  else if (
    source &&
    destination &&
    flag === "--app-stopped" &&
    ["backup", "restore"].includes(action)
  ) {
    await (action === "backup" ? backup : restore)(
      path.resolve(source),
      path.resolve(destination),
    );
  } else
    throw new Error(
      "Usage: backup.ts backup|restore SOURCE NEW_DEST --app-stopped, or verify BACKUP_DIR. Stop the app before backup/restore.",
    );
  console.log(
    "Backup operation passed. Store the separate encryption/signing/vote keys securely; they are not included.",
  );
}
