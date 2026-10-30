// A credential-free, loopback-only evaluation path with its own data and ports.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const action = process.argv[2];
if (!["prepare", "start"].includes(action)) {
  console.error("Use: node ops/judge.mjs prepare | start");
  process.exit(1);
}
const version = process.versions.node.split(".").map(Number);
if (
  version[0] !== 24 ||
  version[1] < 22 ||
  (version[1] === 22 && version[2] < 1)
) {
  console.error("Use Node 24.22.1 or a newer Node 24 LTS security release.");
  process.exit(1);
}
const cli = path.join(root, "node_modules/tsx/dist/cli.mjs");
if (!existsSync(cli)) {
  console.error("Dependencies are missing. Follow docs/JUDGE_GUIDE.md.");
  process.exit(1);
}
const env = {
  ...process.env,
  DOTENV_CONFIG_PATH: path.join(root, ".env.example"),
  NODE_ENV: "development",
  APP_MODE: "demo",
  HOST: "127.0.0.1",
  PORT: "3010",
  APP_ORIGIN: "http://127.0.0.1:5180",
  DATA_DIR: path.join(root, "data/judge-demo"),
  FFMPEG_PATH: process.env.JUDGE_FFMPEG_PATH || "ffmpeg",
  FFPROBE_PATH: process.env.JUDGE_FFPROBE_PATH || "ffprobe",
  MIN_FREE_DISK_BYTES: "2147483648",
};
for (const name of Object.keys(env))
  if (
    name.toUpperCase().startsWith("TWITCH_") ||
    (name.toUpperCase().startsWith("DOTENV_CONFIG_") &&
      name !== "DOTENV_CONFIG_PATH") ||
    [
      "ALLOWED_BROADCASTER_ID",
      "TOKEN_ENCRYPTION_KEY_BASE64",
      "SESSION_SIGNING_KEY_BASE64",
      "VOTE_HMAC_KEY_BASE64",
    ].includes(name.toUpperCase())
  )
    delete env[name];

let child;
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopping = true;
    child?.kill(signal);
  });
async function run(script, argument) {
  if (stopping) throw new Error("Judge demo stopped.");
  await new Promise((resolve, reject) => {
    child = spawn(
      process.execPath,
      [cli, script, ...(argument ? [argument] : [])],
      {
        cwd: root,
        env,
        stdio: "inherit",
        shell: false,
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      child = undefined;
      if (code === 0 || stopping) resolve();
      else
        reject(
          new Error(
            `${path.basename(script)} failed (${signal || code}). See the error above and docs/JUDGE_GUIDE.md.`,
          ),
        );
    });
  });
}
try {
  await run("ops/manage.ts", "doctor");
  if (action === "prepare") {
    await run("ops/manage.ts", "seed");
    console.log(
      "Ready. Run start-judge.cmd (Windows), or node ops/judge.mjs start.",
    );
    console.log(
      "Upload fixture: data/judge-demo/fixtures/doors-demo.mp4. Nothing is published automatically.",
    );
  } else {
    if (!existsSync(path.join(env.DATA_DIR, "fixtures/doors-demo.mp4")))
      throw new Error(
        "Demo recording missing. Run node ops/judge.mjs prepare first.",
      );
    await run("ops/judge-server.ts");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Judge setup failed.");
  process.exitCode = 1;
}
