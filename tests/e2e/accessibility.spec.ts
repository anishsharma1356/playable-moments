import { test, expect } from "@playwright/test";
import { audit } from "./accessibility.js";

test("public pages: accessibility, keyboard skip, narrow reflow and reduced motion", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ["/", "/studio", "/privacy"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await audit(page, info, route.replaceAll("/", "") || "home");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.screenshot({
    path: info.outputPath("accessibility-320px.png"),
    fullPage: true,
  });
});
