import path from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { createApp } from "../apps/server/src/app.js";
import { config } from "../apps/server/src/config.js";

const c = config();
if (
  c.mode !== "demo" ||
  c.hosted ||
  c.host !== "127.0.0.1" ||
  c.port !== 3010 ||
  c.origin !== "http://127.0.0.1:5180" ||
  c.dataDir !== path.resolve("data/judge-demo")
)
  throw new Error("Start the isolated demo with node ops/judge.mjs start.");

const { app } = await createApp(c);
let web: ViteDevServer | undefined;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await web?.close();
  await app.close();
}
try {
  await app.listen({ host: c.host, port: c.port });
  web = await createServer({
    configFile: "apps/web/vite.config.ts",
    server: {
      host: "127.0.0.1",
      port: 5180,
      strictPort: true,
      proxy: {
        "/api": "http://127.0.0.1:3010",
        "/auth": "http://127.0.0.1:3010",
        "/health": "http://127.0.0.1:3010",
      },
    },
  });
  await web.listen();
  console.log(
    "JUDGE DEMO — simulated votes, no Twitch connection. http://127.0.0.1:5180",
  );
  console.log(
    "Data: data/judge-demo. Keep this terminal open; Ctrl+C stops the demo.",
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => void stop().then(() => process.exit(0)));
} catch (error) {
  await stop();
  throw error;
}
