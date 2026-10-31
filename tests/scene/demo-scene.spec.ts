import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("question stays paused; keyboard-controlled safe route finishes and reset needs confirmation", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(5000);
  await expect(page.locator("#timer")).toHaveText("00.00");
  await page.screenshot({
    path: info.outputPath("question.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "B · Safe route", exact: true })
    .press("Enter");
  await page
    .getByRole("button", { name: "Start run", exact: true })
    .press("Enter");
  await page.clock.runFor(10000);
  await expect(page.locator("#capture")).toHaveAttribute(
    "data-phase",
    "finished",
  );
  await expect(page.locator("#instruction")).toContainText("Safe route");
  await page.getByRole("button", { name: "Reset scene", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Keep this run", exact: true })
    .click();
  await expect(page.locator("#capture")).toHaveAttribute(
    "data-phase",
    "finished",
  );
  await page.getByRole("button", { name: "Reset scene", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset to question", exact: true })
    .click();
  await expect(page.locator("#capture")).toHaveAttribute(
    "data-phase",
    "waiting",
  );
  await expect(page.locator("#route-a")).toBeFocused();
});

test("shortcut outcome follows the real jump input; one landing and one fall", async ({
  page,
}, info) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator("#route-a").click();
  await page.locator("#start").click();
  await page.clock.runFor(1800);
  await page.keyboard.press("Space");
  await page.clock.runFor(4000);
  await expect(page.locator("#capture")).toHaveAttribute(
    "data-phase",
    "finished",
  );
  await page.screenshot({
    path: info.outputPath("shortcut-finish.png"),
    fullPage: true,
  });
  await page.locator("#reset").click();
  await page.locator("#do-reset").click();
  await page.locator("#route-a").click();
  await page.locator("#start").click();
  await page.clock.runFor(4000);
  await expect(page.locator("#capture")).toHaveAttribute("data-phase", "fell");
  await expect(page.locator("#instruction")).toContainText("fell into the gap");
});

test("pause freezes time and a selected route cannot change during a run", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator("#route-b").click();
  await page.locator("#start").click();
  await page.clock.runFor(1000);
  await page.keyboard.press("p");
  const time = await page.locator("#timer").textContent();
  await page.clock.runFor(4000);
  await expect(page.locator("#timer")).toHaveText(time!);
  await expect(page.locator("#route-a")).toBeDisabled();
  await page.getByRole("button", { name: "Resume run", exact: true }).click();
  await page.clock.runFor(10000);
  await expect(page.locator("#capture")).toHaveAttribute(
    "data-phase",
    "finished",
  );
});

test("original scene reflows and has no automated accessibility violations", async ({
  page,
}, info) => {
  await page.goto("/");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    await info.attach(`axe-${width}`, {
      body: JSON.stringify(audit),
      contentType: "application/json",
    });
    expect(audit.violations).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`scene-${width}.png`),
      fullPage: true,
    });
  }
});

test("scene server exposes only its assets and rejects writes and foreign hosts", async ({
  request,
}) => {
  expect((await request.get("/.env")).status()).toBe(404);
  expect((await request.get("/docs/demo/shortcut-game.ts")).status()).toBe(404);
  expect((await request.post("/")).status()).toBe(405);
  expect(
    (await request.get("/", { headers: { Host: "foreign.example" } })).status(),
  ).toBe(403);
  const response = await request.get("/scene.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-security-policy"]).toContain(
    "connect-src 'none'",
  );
});
