import { expect, it } from "vitest";
import Fastify from "fastify";
import staticFiles from "@fastify/static";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Exercise both normal serving and the plugin's glob-based route enumeration.
// This guards the security override across glob's major-version boundary.
it.each([true, false])(
  "serves static assets, HEAD and ranges without escaping the root (wildcard=%s)",
  async (wildcard) => {
    const temporary = await mkdtemp(path.join(os.tmpdir(), "pm-static-"));
    const root = path.join(temporary, "public");
    const app = Fastify();
    try {
      await mkdir(path.join(root, "assets"), { recursive: true });
      await writeFile(
        path.join(root, "index.html"),
        "<main>Playable Moments</main>",
      );
      await writeFile(path.join(root, "assets", "app.css"), "body{color:red}");
      await writeFile(
        path.join(temporary, "private.txt"),
        "PRIVATE_TEST_SENTINEL",
      );
      await app.register(staticFiles, { root, wildcard });

      const page = await app.inject("/");
      expect(page.statusCode).toBe(200);
      expect(page.headers["content-type"]).toMatch(/text\/html/);
      expect(page.body).toContain("Playable Moments");

      const asset = await app.inject("/assets/app.css");
      expect(asset.statusCode).toBe(200);
      expect(asset.headers["content-type"]).toMatch(/text\/css/);
      expect(asset.body).toBe("body{color:red}");
      const head = await app.inject({ method: "HEAD", url: "/assets/app.css" });
      expect(head.statusCode).toBe(200);
      expect(head.body).toBe("");
      expect(head.headers["content-length"]).toBe(
        asset.headers["content-length"],
      );
      const range = await app.inject({
        method: "GET",
        url: "/assets/app.css",
        headers: { range: "bytes=0-3" },
      });
      expect(range.statusCode).toBe(206);
      expect(range.body).toBe("body");
      expect(range.headers["content-range"]).toBe("bytes 0-3/15");
      expect((await app.inject("/missing.css")).statusCode).toBe(404);
      const escape = await app.inject("/%2e%2e/private.txt");
      expect([400, 403, 404]).toContain(escape.statusCode);
      expect(escape.body).not.toContain("PRIVATE_TEST_SENTINEL");
    } finally {
      await app.close();
      await rm(temporary, { recursive: true, force: true });
    }
  },
);
