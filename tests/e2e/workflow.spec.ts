import { test, expect, type Locator, type Response } from "@playwright/test";
import path from "node:path";
import { audit } from "./accessibility.js";
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
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.ended), {
      timeout: 15000,
    })
    .toBe(true);
}
test("upload → render → actual-output review → publish → independent browser choose → reveal → comparison", async ({
  page,
  browser,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /You missed the live/ }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open creator studio" }).click();
  await page
    .getByRole("button", { name: "Enter local studio", exact: true })
    .click();
  await page.getByRole("button", { name: "New demo moment" }).click();
  await expect(
    page.getByRole("heading", { name: "Your source recording" }),
  ).toBeVisible();
  await page
    .getByLabel("Select MP4 recording")
    .setInputFiles(path.resolve("data/e2e-fixtures/fixtures/doors-demo.mp4"));
  await page
    .getByRole("button", { name: "Upload recording", exact: true })
    .click();
  await expect(page.getByLabel("Private master recording")).toBeVisible();
  await page
    .getByText("Captions and text alternatives", { exact: true })
    .click();
  await page
    .getByLabel("Setup captions (WebVTT)", { exact: true })
    .fill("WEBVTT\n\n00:00:00.000 --> 00:00:04.000\n[Silence] Which door?\n");
  await page
    .getByLabel("Reveal captions (WebVTT)", { exact: true })
    .fill(
      "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\n[Short tone] The blue door is highlighted.\n",
    );
  await page
    .getByLabel("Setup text alternative", { exact: true })
    .fill("Two doors are labelled Red and Blue. Choose before the outcome.");
  await page
    .getByLabel("Reveal text alternative", { exact: true })
    .fill("The blue door is highlighted as a short tone sounds.");
  await page
    .getByRole("button", { name: "Render preview", exact: true })
    .click();
  await expect(page.getByLabel("Processed setup preview")).toBeVisible();
  await audit(page, testInfo, "rendered-review");
  await watch(page.getByLabel("Processed setup preview"));
  await watch(page.getByLabel("Processed reveal preview"));
  await expect
    .poll(() =>
      page
        .getByLabel("Processed setup preview")
        .locator("track")
        .evaluate((t: HTMLTrackElement) => t.readyState),
    )
    .toBe(2);
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.check();
  await page.getByRole("button", { name: "Approve reviewed outputs" }).click();
  await expect(
    page.getByRole("button", { name: "Outputs approved" }),
  ).toBeVisible();
  // Changing even an unsaved boundary disables publication and approval in the UI.
  await page
    .getByRole("spinbutton", { name: "Setup end", exact: true })
    .fill("4.9");
  await expect(
    page.getByRole("button", { name: "Publish moment" }),
  ).toBeDisabled();
  await page
    .getByRole("spinbutton", { name: "Setup end", exact: true })
    .fill("5");
  // Open the editor if the native disclosure is collapsed.
  if (
    !(await page
      .getByLabel("Setup text alternative", { exact: true })
      .isVisible())
  )
    await page
      .getByText("Captions and text alternatives", { exact: true })
      .click();
  await page
    .getByLabel("Setup text alternative", { exact: true })
    .fill("Changed text");
  await expect(
    page.getByRole("button", { name: "Publish moment" }),
  ).toBeDisabled();
  await page
    .getByLabel("Setup text alternative", { exact: true })
    .fill("Two doors are labelled Red and Blue. Choose before the outcome.");
  await page.getByRole("button", { name: "Publish moment" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, testInfo, "publish-dialog");
  await expect(
    page.getByRole("button", { name: "Keep reviewing" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Keep reviewing" }).press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Publish moment" }).click();
  await page.getByRole("button", { name: "Confirm publication" }).click();
  await expect(page.getByText("Your playable moment is ready.")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("creator-review.png"),
    fullPage: true,
  });
  const replayPath = await page
    .getByRole("link", { name: "Open replay" })
    .getAttribute("href");
  expect(replayPath).toMatch(/^\/m\//);
  const visitor = await browser.newContext({
    viewport: testInfo.project.use.viewport,
    isMobile: testInfo.project.use.isMobile,
    hasTouch: testInfo.project.use.hasTouch,
  });
  const replay = await visitor.newPage();
  const requests: string[] = [];
  const payloads: string[] = [];
  const bodyReads: Promise<void>[] = [];
  const bodyErrors: string[] = [];
  replay.on("request", (r) => requests.push(r.url()));
  const capturePreChoice = (r: Response) => {
    if (
      r.url().includes("/api/replay/") &&
      r.headers()["content-type"]?.includes("application/json")
    )
      bodyReads.push(
        r.text().then(
          (body) => {
            payloads.push(body);
          },
          (error) => {
            bodyErrors.push(String(error));
          },
        ),
      );
  };
  replay.on("response", capturePreChoice);
  await replay.goto("http://localhost:5175" + replayPath);
  await expect(replay.getByLabel("Setup recording")).toBeVisible();
  await replay
    .getByText("Read setup text alternative", { exact: true })
    .click();
  await expect(
    replay.getByText(
      "Two doors are labelled Red and Blue. Choose before the outcome.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    replay.getByText("Read reveal text alternative", { exact: true }),
  ).toHaveCount(0);
  await audit(replay, testInfo, "replay-setup");
  await watch(replay.getByLabel("Setup recording"));
  await expect(
    replay.getByRole("button", { name: "A Red door" }),
  ).toBeVisible();
  expect(
    requests.some(
      (url) =>
        url.endsWith("/reveal") ||
        url.endsWith("/result") ||
        (url.includes("/api/replay/attempts/") && url.endsWith("/captions")) ||
        url.includes("/api/owner/"),
    ),
  ).toBe(false);
  await audit(replay, testInfo, "replay-choice");
  // Finish inspecting pre-choice bodies before reload/navigation can discard
  // them. Later responses are not part of this spoiler-boundary assertion.
  replay.off("response", capturePreChoice);
  await Promise.all(bodyReads);
  expect(bodyErrors).toEqual([]);
  expect(payloads.length).toBeGreaterThan(0);
  for (const body of payloads)
    for (const field of [
      "creatorChoice",
      "outcomeSummary",
      "revealUrl",
      "countA",
      "countB",
      "storage_key",
      "The blue door is highlighted",
    ])
      expect(body).not.toContain(field);
  await expect(replay.locator("body")).not.toContainText(
    "The creator opened the blue door.",
  );
  await replay.screenshot({
    path: testInfo.outputPath("before-choice.png"),
    fullPage: true,
  });
  await expect(
    replay.getByRole("button", { name: "A Red door" }),
  ).toBeFocused();
  // Simulate a lost response after the server committed the choice.
  const keys: string[] = [];
  await replay.route("**/api/replay/*/attempts", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (keys.length === 1) {
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await replay.getByRole("button", { name: "A Red door" }).press("Enter");
  await expect(replay.getByRole("alert")).toBeVisible();
  expect(requests.some((url) => url.endsWith("/reveal"))).toBe(false);
  await replay.getByRole("button", { name: "A Red door" }).click();
  expect(keys[1]).toBe(keys[0]);
  await expect(
    replay.getByRole("button", { name: "Watch the actual outcome" }),
  ).toBeFocused();
  expect(requests.some((url) => url.endsWith("/result"))).toBe(false);
  await replay.reload();
  await expect(
    replay.getByRole("heading", { name: "You chose Red door." }),
  ).toBeVisible();
  await expect(
    replay.getByRole("button", { name: "Watch the actual outcome" }),
  ).toBeVisible();
  await replay
    .getByRole("button", { name: "Watch the actual outcome" })
    .click();
  await watch(replay.getByLabel("Actual outcome recording"));
  await expect(
    replay.getByRole("heading", {
      name: "Different choices. One real outcome.",
    }),
  ).toBeFocused();
  await expect
    .poll(() =>
      replay
        .getByLabel("Actual outcome recording")
        .locator("track")
        .evaluate((t: HTMLTrackElement) => t.readyState),
    )
    .toBe(2);
  await replay
    .getByText("Read reveal text alternative", { exact: true })
    .click();
  await expect(
    replay.getByText("The blue door is highlighted as a short tone sounds.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    replay.getByText(
      "The creator opened the blue door. The treasure was inside.",
    ),
  ).toBeVisible();
  await expect(
    replay.getByText("12 synthetic responses · frozen before the outcome"),
  ).toBeVisible();
  await expect(
    replay.getByText(
      "Your personal choice did not change the recording or the original responses.",
    ),
  ).toBeVisible();
  expect(
    await replay.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await replay.screenshot({
    path: testInfo.outputPath("comparison.png"),
    fullPage: true,
  });
  await audit(replay, testInfo, "replay-comparison");
  expect(errors).toEqual([]);
  await replay.goto("http://localhost:5175/privacy");
  await audit(replay, testInfo, "privacy");
  await replay
    .getByRole("button", { name: "Clear my replay choices…" })
    .click();
  await expect(
    replay.getByRole("button", { name: "Keep choices" }),
  ).toBeFocused();
  await audit(replay, testInfo, "clear-choices-dialog");
  await replay.getByRole("button", { name: "Confirm clear choices" }).click();
  await expect(
    replay.getByText("Your replay choices have been cleared."),
  ).toBeVisible();
  await replay.goto("http://localhost:5175" + replayPath);
  await expect(replay.getByLabel("Setup recording")).toBeVisible();
  await expect(replay.getByText("You chose Red door.")).not.toBeVisible();

  // Delete only the isolated DEMO fixture created by this browser test.
  const momentTitle = await page.locator("h1.review-title").innerText();
  await page.getByRole("button", { name: "Delete moment…" }).click();
  await expect(
    page.getByRole("button", { name: "Permanently delete", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Confirm moment title").fill(momentTitle);
  await audit(page, testInfo, "erase-dialog");
  await expect(page.getByLabel("Confirm moment title")).toBeFocused();
  await page.getByLabel("Confirm moment title").press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Permanently delete", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Permanently delete", exact: true })
    .press("Tab");
  await expect(page.getByLabel("Confirm moment title")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("delete-confirmation.png"),
    fullPage: false,
  });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Permanently delete", exact: true })
    .click();
  await expect(
    page.getByText(
      "Moment deleted. Recording files are removed in the background.",
    ),
  ).toBeVisible();
  await replay.reload();
  await expect(replay.getByRole("alert")).toContainText("Moment not found");
  await visitor.close();
});
