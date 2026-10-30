import { test, expect, type Locator } from "@playwright/test";
import path from "node:path";
import { audit } from "./accessibility.js";
import { createServer, type ViteDevServer } from "vite";
import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { FakeProvider, FakeSocket, testTwitch } from "../fixtures/twitch.js";
import type { MomentDto } from "../../packages/contracts/src/index.js";

// These browser checks use injected provider fixtures, never live Twitch or user credentials.
let backend: Awaited<ReturnType<typeof createApp>>,
  web: ViteDevServer,
  sockets: FakeSocket[],
  keepalive: ReturnType<typeof setInterval>;
const origin = "http://localhost:5177";
test.beforeAll(async () => {
  sockets = [];
  backend = await createApp(
    config({
      mode: "real",
      twitch: {
        ...testTwitch(),
        redirectUri: "http://localhost:3004/auth/twitch/callback",
      },
      port: 3004,
      origin,
      dataDir: path.resolve(`data/e2e-twitch-${process.pid}-${Date.now()}`),
      minFree: 0,
    }),
    {
      providerFetch: new FakeProvider().fetch,
      socketFactory: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        queueMicrotask(() => socket.welcome());
        return socket;
      },
    },
  );
  await backend.app.listen({ host: "127.0.0.1", port: 3004 });
  web = await createServer({
    configFile: "apps/web/vite.config.ts",
    server: {
      port: 5177,
      host: "localhost",
      strictPort: true,
      proxy: {
        "/api": "http://127.0.0.1:3004",
        "/auth": "http://127.0.0.1:3004",
      },
    },
  });
  await web.listen();
  keepalive = setInterval(() => {
    for (const socket of sockets)
      if (!socket.closed) socket.emit("session_keepalive", {});
  }, 3000);
});
test.afterAll(async () => {
  clearInterval(keepalive);
  await web?.close();
  await backend?.app.close();
});
async function watch(video: Locator) {
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    v.playbackRate = 4;
    await v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.ended))
    .toBe(true);
}
test("fixture Twitch authorization → live controls → OBS overlay → reviewed replay; not a live integration claim", async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/auth/twitch/start", async (route) => {
    const response = await route.fetch({ maxRedirects: 0 });
    const state = new URL(response.headers().location).searchParams.get(
      "state",
    )!;
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        location: `http://localhost:3004/auth/twitch/callback?code=fixture-code&state=${state}`,
      },
    });
  });
  await page.goto(origin + "/studio");
  await page.getByRole("link", { name: "Connect Twitch", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "fixture_broadcaster", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("READY", { exact: true })).toBeVisible();
  await audit(page, testInfo, "twitch-studio-fixture");
  await page
    .getByLabel("Session name")
    .fill("Browser fixture · not live evidence");
  await page
    .getByRole("button", { name: "Create session", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create overlay URL", exact: true })
    .click();
  const overlayUrl = await page
    .getByLabel("Private OBS overlay URL")
    .inputValue();
  const overlayContext = await browser.newContext(),
    overlayPage = await overlayContext.newPage();
  await overlayPage.goto(overlayUrl);
  await expect(
    overlayPage.getByRole("heading", { name: "Waiting for the next moment" }),
  ).toBeVisible();
  await page.getByLabel("Neutral title").fill("Two doors · browser fixture");
  await page
    .getByLabel("Question", { exact: true })
    .fill("Which door leads to the treasure?");
  await page.getByLabel("Option A", { exact: true }).fill("Red door");
  await page.getByLabel("Option B", { exact: true }).fill("Blue door");
  await page.getByLabel("Voting window (seconds)").fill("180");
  await page.getByRole("button", { name: "Create draft", exact: true }).click();
  await page
    .getByRole("button", { name: "Open responses", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lock responses", exact: true }),
  ).toBeVisible();
  const id = page.url().split("/").at(-2)!;
  await audit(page, testInfo, "open-round-fixture");
  const m = (await (
    await page.request.get(origin + `/api/owner/moments/${id}`)
  ).json()) as MomentDto;
  sockets.at(-1)!.vote(m.code, "2001", "A");
  sockets.at(-1)!.vote(m.code, "2002", "B");
  sockets.at(-1)!.vote(m.code, "2001", "B");
  await expect(
    overlayPage.getByText("2 participating accounts", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "2 participating accounts · First accepted choice per account",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await overlayPage.evaluate(
      () => getComputedStyle(document.documentElement).backgroundColor,
    ),
  ).toBe("rgba(0, 0, 0, 0)");
  await expect(overlayPage.locator("body")).not.toContainText(
    "Creator's actual choice",
  );
  expect(await overlayPage.getByRole("button").count()).toBe(0);
  await overlayPage.screenshot({
    path: testInfo.outputPath("twitch-overlay-fixture.png"),
    fullPage: true,
    omitBackground: true,
  });
  await page.screenshot({
    path: testInfo.outputPath("twitch-live-fixture.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Lock responses", exact: true })
    .click();
  await page.getByLabel("Your actual choice").selectOption("B");
  await page
    .getByLabel("Observed outcome")
    .fill("The blue door contained the treasure. Automated test fixture.");
  await page
    .getByRole("button", { name: "Save outcome and review recording" })
    .click();
  await page
    .getByLabel("Select MP4 recording")
    .setInputFiles(path.resolve("data/e2e-fixtures/fixtures/doors-demo.mp4"));
  await page
    .getByRole("button", { name: "Upload recording", exact: true })
    .click();
  await expect(page.getByLabel("Private master recording")).toBeVisible();
  await page
    .getByRole("button", { name: "Render preview", exact: true })
    .click();
  await watch(page.getByLabel("Processed setup preview"));
  await watch(page.getByLabel("Processed reveal preview"));
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Approve reviewed outputs" }).click();
  await page.getByRole("button", { name: "Publish moment" }).click();
  await page.getByRole("button", { name: "Confirm publication" }).click();
  const replayPath = await page
    .getByRole("link", { name: "Open replay" })
    .getAttribute("href");
  const viewer = await browser.newContext({
      viewport: testInfo.project.use.viewport,
    }),
    replay = await viewer.newPage(),
    requests: string[] = [];
  replay.on("request", (r) => requests.push(r.url()));
  await replay.goto(origin + replayPath);
  await expect(
    replay.getByText("RECORDED TWITCH MOMENT · ORIGINAL LIVE RESPONSES"),
  ).toBeVisible();
  await watch(replay.getByLabel("Setup recording"));
  expect(
    requests.some((url) => url.endsWith("/reveal") || url.endsWith("/result")),
  ).toBe(false);
  await replay.getByRole("button", { name: "A Red door" }).click();
  await replay
    .getByRole("button", { name: "Watch the actual outcome" })
    .click();
  await watch(replay.getByLabel("Actual outcome recording"));
  await expect(
    replay.getByText(
      "The blue door contained the treasure. Automated test fixture.",
    ),
  ).toBeVisible();
  await expect(replay.locator("body")).not.toContainText("SYNTHETIC DEMO");
  expect(backend.d.momentDto(backend.d.moment(id)).historical).toMatchObject({
    countA: 1,
    countB: 1,
    total: 2,
    mode: "REAL_TWITCH",
  });
  await page.goto(origin + "/studio");
  await page
    .getByRole("button", { name: "Disconnect Twitch", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Connect Twitch", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await overlayContext.close();
  await viewer.close();
});
