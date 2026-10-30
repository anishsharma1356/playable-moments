import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

// Run at meaningful states in the existing workflows, including dialogs and
// the spoiler gate. Automated scans supplement human assistive-tech checks.
export async function audit(page: Page, info: TestInfo, state: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await info.attach(`accessibility-${state}`, {
    body: JSON.stringify(
      { state, violations: result.violations, incomplete: result.incomplete },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect
    .soft(
      result.violations.map((v) => ({
        rule: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          issue: n.failureSummary,
        })),
      })),
      `Accessibility: ${state}`,
    )
    .toEqual([]);
}
