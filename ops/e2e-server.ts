import path from "node:path";
import { createServer } from "vite";
import { config } from "../apps/server/src/config.js";
import { createApp } from "../apps/server/src/app.js";
import { generateFixture } from "../tests/fixtures/generate.js";
const c = config({
  dataDir: path.resolve(`data/e2e-${process.pid}-${Date.now()}`),
  port: 3002,
  origin: "http://localhost:5175",
});
await generateFixture({ ...c, dataDir: path.resolve("data/e2e-fixtures") });
const { app } = await createApp(c);
await app.listen({ host: "127.0.0.1", port: 3002 });
const web = await createServer({
  configFile: "apps/web/vite.config.ts",
  server: {
    port: 5175,
    host: "localhost",
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3002",
      "/auth": "http://127.0.0.1:3002",
      "/health": "http://127.0.0.1:3002",
    },
  },
});
await web.listen();
console.log("Isolated browser test server: http://localhost:5175");
async function stop() {
  await web.close();
  await app.close();
  process.exit(0);
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
