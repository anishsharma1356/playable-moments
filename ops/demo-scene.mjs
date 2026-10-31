// Only the three original scene assets are served; no project directory/static mount.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const port = Number(process.env.PM_SCENE_PORT || 5190);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid PM_SCENE_PORT");
const html = await readFile(
  new URL("../docs/demo/shortcut-or-safety.html", import.meta.url),
);
const bundle = await build({
  entryPoints: [
    fileURLToPath(new URL("../docs/demo/shortcut-scene.ts", import.meta.url)),
  ],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
const assets = new Map([
  ["/", ["text/html; charset=utf-8", html]],
  [
    "/scene.js",
    ["text/javascript; charset=utf-8", bundle.outputFiles[0].contents],
  ],
  ["/health", ["text/plain; charset=utf-8", "Original demo scene ready\n"]],
]);
const server = createServer((request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  );
  if (
    ![`127.0.0.1:${port}`, `localhost:${port}`].includes(request.headers.host)
  ) {
    response.writeHead(403);
    response.end("Invalid host");
    return;
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const asset = assets.get(request.url);
  if (!asset) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const [type, body] = asset;
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(request.method === "HEAD" ? undefined : body);
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Original game scene: http://127.0.0.1:${port}/\nCreator-controlled rehearsal. No Twitch votes or broadcasts are started. Ctrl+C stops this scene.`,
  ),
);
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
