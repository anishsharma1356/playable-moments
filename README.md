# Playable Moments

Make your choice before the reveal. **M0/M1 work locally. Real Twitch voting, reconnect and a locally published OBS recording are verified; the independent-viewer broadcast gate remains pending.** The default launcher remains an explicitly simulated demo. Deployment is prepared but not publicly launched.

React/TypeScript, Fastify, SQLite and a bounded FFmpeg worker. Upload a recording, review separately encoded setup/reveal files, approve a content-bound revision, and publish it. A second browser watches setup, chooses, and then accesses the recorded outcome and frozen comparison. Replay choices never update historical votes.

## Try the local demo

**Evaluating a fresh download? Start with [the judge guide](docs/JUDGE_GUIDE.md).** Its isolated Windows walkthrough installs pinned dependencies without requiring global pnpm, generates original demo media and uses its own loopback ports/data. No Twitch secrets or paid app host are needed for that walkthrough. The instructions below describe the creator's existing development setup.

On Windows x64 with Node 24.22.1 or a newer Node 24 LTS release installed, open PowerShell in this folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-judge.ps1
.\start-judge.cmd
```

Open **http://127.0.0.1:5180**. Follow the judge guide to upload the generated fixture, review it and try the replay. This is a labelled synthetic demo; genuine Twitch capture requires the separate setup below. The source repository includes no credentials, recordings, downloaded tools or prebuilt containers.

## Existing development setup

### Original game for recording

After installing the project dependencies, `npm run demo:scene` opens a separate creator-controlled **Shortcut or Safety?** scene at `http://127.0.0.1:5190/`. Choose the risky jump or the longer safe route, then start and play the actual attempt. It has no Twitch vote intake or connection to replay results; Studio handles those separately. The game is original code/SVG art with optional generated sound effects.

Run `node ops/prepare-game-obs.mjs` to generate a separate OBS scene collection under ignored `data/obs/`; it does not start streaming or recording. The [recording sheet](docs/demo/FINAL_DEMO_SCRIPT.md) explains the controls, OBS import, capture boundaries and required human review. New Twitch/OBS footage using this example is still pending.

### Creator installation

On the maintainer's already-prepared computer, dependencies, a private `.env`, FFmpeg/FFprobe, SQLite and an original fixture are available. These private/generated files are not part of a fresh source download. From that prepared folder:

```powershell
.\start-local.cmd
```

This launcher runs the diagnostic checks and then starts the app using Node and the project's installed dependencies. It does not require pnpm on your terminal PATH, install anything, or change system settings. The initial build used Codex's bundled pnpm, which is not available in a normal PowerShell session on this computer.

You can also run the existing scripts with the installed npm executable:

```powershell
npm.cmd run doctor
npm.cmd run dev
```

Open [localhost:5173](http://localhost:5173). Backend: [localhost:3000](http://localhost:3000/health/live). Keep the terminal running; Ctrl+C stops both servers. This launcher uses the prepared `.env` demo configuration. Non-loopback bind/origin values and `NODE_ENV=production` are rejected. Do not expose this local build through a tunnel.

## Real Twitch setup

Follow [the guided M2 setup](docs/M2_PREPARATION.md), beginning with a verified Twitch account and two-factor authentication. Register a confidential developer application with redirect URL `http://localhost:3000/auth/twitch/callback`. Then, from this project folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-twitch.ps1
.\start-twitch.cmd
```

The setup helper privately prompts for the app credentials and broadcaster username, resolves the allowlisted account ID, and creates `.env.twitch` with independent encryption/signing/vote keys. Stop the demo before starting Twitch mode. Open the studio, Connect Twitch, wait for READY, create a session/OBS overlay, then draft and open a round. See the guide for the live acceptance test.

Real data lives in `data/twitch`; existing demo data is preserved. Automated provider fixtures do not establish that real viewers or an OBS stream have been tested. Genuine authorization and the live test require your account and participants.

## Fresh installation

Use Node 24 LTS and pnpm 11.25.0. Native better-sqlite3 may require Python and C++ build tools; this machine used installed Visual Studio Build Tools. Dependencies are pinned in the lockfile.

The fresh-install commands below require pnpm to be separately available in your terminal. The prepared project on this computer needs no reinstall; use the launcher above.

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pwsh -File ops/setup-media.ps1
pnpm db:migrate
pnpm demo:seed
pnpm run doctor
pnpm dev
```

Copy the environment template only if `.env` does not exist. The Windows helper installs the tested FFmpeg 9.0.2 build inside `.tools` and verifies its pinned SHA-256. Its URL tracks upstream releases; changed checksums fail safely. On another platform, install current FFmpeg/FFprobe with libx264/AAC and set absolute paths in `.env`. Synthetic text rendering needs Arial on Windows or DejaVu Sans on Linux. Downloaded executables and licences remain ignored under `.tools`.

Use **`pnpm run doctor`**: pnpm 11 reserves `pnpm doctor` for its own diagnostics.

## One local moment

1. Open **Creator studio → Enter local studio**. Choose the seeded door moment or **New demo moment**.
2. Select `data/fixtures/doors-demo.mp4`, then **Upload recording**. Wait for the private normalized master.
3. Use offsets **0, 5, 6, 12 seconds**, then **Render preview**. The gap omits one neutral second.
4. Play both processed outputs and check boundaries/audio. The original fixture's setup is silent; the reveal has an outcome tone.
5. Confirm all five review statements, **Approve reviewed outputs**, then **Publish moment → Confirm publication**.
6. Open its replay link in another browser profile/incognito window. Watch setup, choose A/B, then **Watch the actual outcome**. Comparison appears after reveal ends.
7. Refresh to restore the saved choice. **Unpublish & revise** revokes future access to the old release; new publication requires a new revision and approval.

For your own authorised MP4, choose **Use my own recording**, enter its question/options and actual outcome, and review its boundaries. This creates a zero-response DEMO snapshot. Only the clearly marked door example has 5 A / 7 B synthetic responses.

## Checks

The latest complete browser run passed **all six scenarios on 30 October 2026**, including the current published-caption readability fix. Coverage includes desktop/phone-sized layouts, accessibility scans, keyboard navigation, fixture Twitch controls and the upload-to-reveal workflow with pre-choice spoiler checks. This is automated local coverage, not an independent-viewer broadcast, physical-phone test or human screen-reader acceptance. See [the dated evidence](docs/evidence/browser-regression-2026-10-30.json).

Deployment preparation is in [the single-host runbook](docs/DEPLOYMENT_RUNBOOK.md). The minimal Linux app image passed nine workflow/restore checks, five private-network HTTPS checks and runtime/license checks on 28 October. Its scan reports **0 critical / 0 high / 17 medium / 9 low** findings; the unchanged proxy retains **1 high / 1 unknown**. The three media security regressions remain applicable to the unchanged patched media build. [Exact image evidence and residual assessments](docs/DEPENDENCY_SECURITY.md) are recorded. Public deployment is still pending. [Accessibility checks and human-review gaps](docs/ACCESSIBILITY.md) distinguish automated evidence from screen-reader, physical-device and video-content acceptance.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
```

Playwright uses installed Google Chrome and isolated localhost ports 5175/3002 (demo) and 5177/3004 (Twitch provider fixtures). It runs both UI paths at desktop/phone sizes, watches output videos, tests keyboard choice/refresh, inspects pre-choice network traffic and verifies the read-only overlay. Provider fixtures do not authorize a user account or prove live Twitch functionality. Phone coverage is Chrome emulation, not a physical device. Reports/screenshots are in ignored `playwright-report` and `test-results`.

For the compiled build, stop dev, set `$env:APP_ORIGIN='http://localhost:3000'`, then `pnpm start`. Keep demo mode and a loopback host. This is not deployment. Restore port 5173 in that shell before returning to Vite.

See [observed results](docs/PROGRESS.md), [Codex evidence](docs/CODEX_EVIDENCE.md), [decisions](docs/DECISIONS.md), and [M2 preparation](docs/M2_PREPARATION.md).

## Deletion and recovery

Creator review and live control include **Delete moment…**. Confirm the exact title to remove its public link, live responses, replay attempts and media records. Close voting and finish any active upload/encoding first. File deletion runs in the background and survives restart; the Studio reports pending files and retries. Previously downloaded copies and external backups are outside this operation.

**Privacy & data → Clear my replay choices…** removes only the current browser session's choices. It does not change the original live snapshot. Session expiry is enforced on requests; expired stored sessions and associated choices are cleaned on startup and every minute.

The next normal app start applies migration 004 automatically. Use `start-twitch.cmd` for your existing Twitch configuration; do not rerun credential setup. The new **Captions and text alternatives** panel accepts separate setup/reveal WebVTT and text, bound to a new reviewed revision. Existing releases remain unchanged. See [accessibility guidance](docs/ACCESSIBILITY.md) and [the caption API](docs/MEDIA_ALTERNATIVES_API.md).

## Boundaries and remaining work

`DATA_DIR` holds SQLite, private media, job temporaries and the demo HMAC key. Separate HttpOnly owner/viewer cookies, exact Origin, CSRF and idempotency protect mutations. Media authorizes before HEAD/Range/file access. Public DTOs omit creator choice, outcome, historical option counts and reveal/source identifiers before choice.

Server uploads stream to disk; the browser currently hashes a selected file in memory. The 500 MiB cap is not a performance claim. Initial probing precedes 202; normalization/rendering are queued one job at a time, with a ten-minute total deadline. Outputs are decoded, duration-checked and hashed.

Human review remains necessary. No semantic spoiler detector, DRM, unique-person guarantee or proof of watch time is claimed. Results become API-accessible after choice; the ordinary UI waits for reveal to end.

The independent-viewer Twitch/OBS gate remains pending; the user-approved local recording-to-replay workflow, revision-3 captions/audio/text and guided keyboard flow are verified. Local deletion, cleanup/recovery, access checks, media-timing tests and container backup/restore are implemented. [Local load measurements](docs/LOAD_TEST_REPORT.md), an eight-slide presentation and a timed demo script are complete. All six browser scenarios have passed across the initial four passes and the two upload-workflow reruns after approved disk cleanup. Physical-device/spoken screen-reader review, residual security/license acceptance, fresh-machine acceptance, the final demo video and submission remain. Contest registration is complete; the project entry stays a draft until repository/video URLs are ready. Public hosting is deferred. See [the submission handoff](docs/SUBMISSION_CHECKLIST.md) and [dependency notices](docs/THIRD_PARTY_NOTICES.md). M1 needs no secrets; real mode uses the existing private configuration and Twitch authorization.

## License

Original Playable Moments code is [MIT licensed](LICENSE), copyright 2026 Anish. Bundled third-party source and notices retain their own terms, including the FFmpeg-derived patches. See [third-party notices and distribution boundaries](docs/THIRD_PARTY_NOTICES.md). The code license does not grant rights to Twitch branding or third-party recordings/assets.

## Handoff provenance

The supplied ZIP was extracted here. The v2 start note and competition context were added; architecture/schema/storyboard remain available. Original README: `docs/HANDOFF_README.md`. `SHA256SUMS.json` belongs to the original handoff, not this implementation. ZIP SHA-256: `69868493f1f8fe7a5b177731207f0425b3899476599e46b0f041986cde9d7a46`.
