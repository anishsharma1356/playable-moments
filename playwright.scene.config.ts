import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/scene",
  timeout: 30000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5191",
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "node ops/demo-scene.mjs",
    url: "http://127.0.0.1:5191/health",
    env: { PM_SCENE_PORT: "5191" },
    reuseExistingServer: false,
  },
});
