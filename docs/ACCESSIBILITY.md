# Accessibility checks and remaining human review

Updated 30 October 2026. Automated checks are regression evidence, not a WCAG certification.

The current source passed all six Playwright scenarios in one run on 30 October, including both desktop and phone-sized public-page, creator/replay and fixture-Twitch scenarios. This closes the earlier gap after the published-caption readability change. Evidence: [browser-regression-2026-10-30.json](evidence/browser-regression-2026-10-30.json).

An additional agent-operated keyboard check in the side browser reached the skip link (visible 3 px focus outline), main content, Studio link and local sign-in using Tab/Enter. It did not establish spoken screen-reader usability. The side browser did not change page zoom after its Ctrl-plus input, and a separate controllable Chrome browser was unavailable. Actual 200% zoom remains unverified; the passing 320 CSS-pixel reflow check is recorded separately.

The browser workflows use pinned @axe-core/playwright 4.14.0 with WCAG 2 A/AA, 2.1 AA and 2.2 AA tags. They scan public pages, rendered review, publish/erase/clear-choice dialogs, setup, choice, comparison and provider-fixture live controls at desktop/mobile sizes. Incomplete rules are retained in report attachments for manual review; they are not counted as passes.

Implemented fixes: low-contrast timeline/time-unit/progress/footer text; skip-to-content link; main navigation landmark; focus following route changes, saved choice, reveal player and comparison; semantic current replay step. A/B text labels accompany color. Existing visible focus outlines, native controls, dialog focus wrapping/Escape and reduced-motion styles remain. Tests cover keyboard choice, retry/refresh, responsive reflow at 320 CSS pixels and reduced-motion preference. This reflow check is not a physical-phone or actual browser-zoom test.

Run `pnpm test:e2e` (or `node node_modules/@playwright/test/cli.js test` with Node on PATH). Reports and detailed axe attachments are generated under playwright-report and test-results. Check PROGRESS.md for the latest actual results.

## Human acceptance still required

1. Use Windows Narrator or NVDA: navigate from home to Studio; confirm heading/label order, errors and live status; open/close review dialogs; play setup, choose with keyboard, reach reveal controls and comparison without losing place. Have a person verify the spoken announcements.
2. Use an actual phone and browser zoom/text resizing: no hidden controls or horizontal scrolling; readable long titles/options; media/choice controls usable without hover. Test slow network and your phone's autoplay/audio behavior.
3. Review each published recording's content: meaningful speech/sounds need accurate captions, and essential visual-only information needs an equivalent description. The creator can now paste separate English WebVTT captions and text alternatives for setup and reveal. Both are bound to a new reviewed revision; reveal alternatives use the same session/choice gate as reveal media. Existing releases do not gain captions automatically. Separate spoken audio-description tracks are not implemented. Human accuracy, timing, completeness and usability review remains required; no blanket media-accessibility claim is made.
4. Confirm paused/playing states and current step are understandable without color, focus remains visible at magnification, and live updates are understandable without disruptive repeated announcements.

No new Twitch accounts are needed for these checks. User-operated accounts can verify identity/vote logic; they do not substitute for independent participants in the live acceptance test.

## Human review results — 28 October 2026

- **Passed, Anish:** J8QL revision 2's exact setup/reveal clips played with the proposed caption files. Anish confirmed captions readable and accurate, setup free of the outcome, and the short reveal tone audible at the matching caption. Evidence and hashes: [human-caption-review-2026-10-28.json](evidence/human-caption-review-2026-10-28.json).
- **Passed with guidance, Anish:** core replay keyboard flow. After initial focus placement, the user opened choices with Enter, followed Tab/Enter guidance to choose Blue and play reveal, and supplied the expected B/B comparison with unchanged synthetic 5/7 counts. This is not an independent test of every page/control. Evidence: [human-keyboard-review-2026-10-28.json](evidence/human-keyboard-review-2026-10-28.json).
- The guided check exposed an always-different comparison heading. It now selects “Same choice” when the choices match. TypeScript/lint and the actual B/B browser result passed; focus still reaches the heading.
- **Passed, Anish:** actual application revision 3 with captions and separate setup/reveal descriptions. Both previews played fully with captions showing and sound unmuted, then replayed at his request. He confirmed “Yes — approve and publish locally” after the combined content/audio/description question. Published as release 2. Both videos are byte-identical to revision 2. See [j8ql-captioned-revision-2026-10-28.json](evidence/j8ql-captioned-revision-2026-10-28.json).
- **Verified after publication:** fresh viewers receive setup text/captions only; their personal choice unlocks reveal text/captions/media. A separate unchosen session is denied the chosen viewer's reveal resources. Old-release captions return 410 and the frozen real tally remains A=1/B=0.
- **Still pending:** spoken screen-reader review, browser zoom and physical phone. Narrator's browser labels were inspected, but speaker confirmation was not received; see [narrator-check-2026-10-28.json](evidence/narrator-check-2026-10-28.json). Accessibility-tree labels alone do not prove spoken output.
- A verified backup preceded the normal unpublish/revise workflow. The old release is revoked and retained in history; local replay is available again as release 2. Current source-review v4 predates these changes and must be refreshed before publication.

## Caption authoring

In **Find the decision boundary → Captions and text alternatives**, paste plain WebVTT starting with `WEBVTT` and a blank line. Times are relative to each processed clip, not the source recording. The supported subset accepts ordered non-overlapping cues, up to 150 cues, 1–4 plain-text lines per cue and no markup/style/positioning. Limits are 20,000 characters per caption file and 6,000 per transcript. This MVP uses English tracks.

Render a new preview and review the visible captions, both text alternatives and audio before approving. Include essential speech, meaningful sounds and visual information; keep setup neutral. Unpublishing revokes the old reveal track as well as its media. Captions/transcripts are optional, so their availability is not evidence that every published recording is accessible. See [W3C's caption guidance](https://www.w3.org/WAI/media/av/captions/).
