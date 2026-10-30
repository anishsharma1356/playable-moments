import { createApp } from "./app.js";
import { existsSync } from "node:fs";
if (process.env.NODE_ENV === "production" && !existsSync("dist/web/index.html"))
  throw new Error("Build the frontend before starting production.");
const { app, c } = await createApp();
await app.listen({ host: c.host, port: c.port });
console.log(
  `Playable Moments: ${c.origin} · ${c.mode === "real" ? "TWITCH MODE" : "LOCAL DEMO ONLY"} · ${c.hosted ? "HTTPS ingress required" : "LOCAL"}`,
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
