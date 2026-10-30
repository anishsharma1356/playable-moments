import { config } from "../apps/server/src/config.js";
import { openStore } from "../apps/server/src/storage.js";
import { Domain } from "../apps/server/src/domain.js";
import { Media, runTool } from "../apps/server/src/media.js";
import { generateFixture } from "../tests/fixtures/generate.js";
const c = config(),
  s = openStore(c.dataDir),
  d = new Domain(s, c.twitch);
try {
  if (process.argv[2] === "migrate")
    console.log("Migrations applied successfully.");
  else if (process.argv[2] === "seed") {
    if (c.mode !== "demo")
      throw new Error("Demo seeding is disabled in real mode.");
    if (!s.get("SELECT id FROM moment LIMIT 1")) {
      const m = d.seed();
      console.log(`Created a SIMULATED DEMO moment: ${m.id}`);
    } else console.log("Existing moments preserved.");
    console.log(`Original fixture: ${await generateFixture(c)}`);
  } else if (process.argv[2] === "doctor") {
    console.log(
      `Node ${process.version} · ${c.mode === "real" ? "real Twitch mode" : "local demo only"} · ${c.hosted ? "hosted configuration" : "local"}`,
    );
    if (Number(process.versions.node.split(".")[0]) !== 24)
      throw new Error("Use Node 24 LTS.");
    for (const tool of [c.ffmpeg, c.ffprobe])
      console.log(
        (await runTool(tool, ["-version"], 10000)).toString().split("\n")[0],
      );
    const encoders = (
      await runTool(c.ffmpeg, ["-hide_banner", "-encoders"], 10000)
    ).toString();
    if (!encoders.includes("libx264") || !encoders.includes(" aac "))
      throw new Error("H.264/AAC encoders required.");
    await new Media(d, c).reserve();
    console.log(
      "PASS: SQLite migrations, writable data directory, disk reserve, H.264/AAC tools and deployment configuration. TLS and provider readiness require separate checks.",
    );
    console.log(
      c.mode === "real"
        ? "Twitch config: present. Provider authorization and live readiness are checked when the app starts; doctor is not a live test."
        : "Twitch: disabled in demo mode. Use start-twitch.cmd after local setup.",
    );
  } else throw new Error("Use migrate, seed or doctor.");
} finally {
  s.db.close();
}
