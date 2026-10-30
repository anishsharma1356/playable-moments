import { createApp } from "../apps/server/src/app.js";
import { createServer } from "vite";
const backend = await createApp();
await backend.app.listen({ host: backend.c.host, port: backend.c.port });
const web = await createServer({ configFile: "apps/web/vite.config.ts" });
await web.listen();
console.log(
  `Playable Moments · ${backend.c.mode === "real" ? "TWITCH MODE · LOCAL" : "LOCAL DEMO ONLY"}\nUI: http://localhost:5173\nAPI: http://localhost:3000`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await web.close();
  await backend.app.close();
  process.exit(0);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
