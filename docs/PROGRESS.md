# Progress — updated 28 October 2026

**M0 and M1 are implemented and locally verified.** Their fixture media and counts are DEMO. No live Twitch claim follows from these checks; M2's separately labeled provider fixtures exercise the REAL_TWITCH code path without real participants.

**M2 has verified real chat, two-account voting, late rejection, controlled reconnect and a published local OBS rehearsal. Its complete Twitch/OBS gate is NOT complete.** The `4QA3` rehearsal froze A=1/B=1/total=2 with first-choice retention. The controlled reconnect test permanently interrupted `767U`, then a fresh `T2K3` round accepted its own code and rejected the old code. A local OBS take of `J8QL` recorded one genuine chat vote, locking and the actual Blue reveal. The current user-approved revision 3 / release 2 includes clear audio, captions and text descriptions; replay activity did not change the original A=1/B=0 snapshot. Both test accounts are operated by the user/Codex; independent viewers and a public broadcast remain pending. Earlier milestone entries below are historical evidence.

| Milestone | State | Evidence |
|---|---|---|
| M0 foundation | Complete locally | Strict TypeScript workspaces, migration from empty SQLite, state/persistence tests, configuration, doctor. |
| M1 local workflow | Complete locally | Upload, private master, separate files, actual-output review, approval/publication, independent browser choice/reveal/comparison. |
| M2 real Twitch | Chat, controlled reconnect and local recording-to-replay verified; full gate pending | 4QA3 A=1/B=1; FTCJ late rejection; 767U permanent interruption and T2K3 recovery. J8QL recorded, user-reviewed, published locally and replayed. Independent viewers and a public recorded broadcast remain. |
| M3 hardening | Local implementation, accessibility fixes and recorded-replay checks; human acceptance pending | Erasure, cleanup/recovery, authorization and VFR/audio fixtures implemented. Actual J8QL outputs reviewed/published/replayed; fresh unchosen session denied reveal/results. Independent-viewer broadcast, physical-device and assistive-technology checks remain. |
| M4 deployment | Minimal Linux images and private HTTPS verified; public gates pending | Nine workflow/restore checks, five prior TLS/proxy checks and three media regressions passed. Latest scanned minimal app baseline: 0 critical / 0 high / 17 medium / 9 low; proxy: 1 high / 1 unknown. See DEPENDENCY_SECURITY.md for scan scope and residual review. Public TLS/OAuth/capacity and fresh-host acceptance remain; hosting is deferred. |
| M5 presentation | Deck, source package, registration and private 2:08 video draft prepared | Actual Twitch/Codex/replay footage captured; text-led review cut exported. Narration, final human video review, repository/video publication and reviewed final submission remain. |

## M0/M1 checks executed on 26 October

| Command/check | Observed result |
|---|---|
| `pnpm install` / lockfile synchronization | Installed pinned dependencies across five workspace projects. |
| `pnpm db:migrate` | Passed; also tested from an empty DB and on reopening. |
| `pnpm demo:seed` | Created one private DEMO moment and original `data/fixtures/doors-demo.mp4`; existing moments preserved on rerun. |
| `pnpm run doctor` | Passed: Node 24.11.0, FFmpeg/FFprobe 9.0.2, codecs, writable data, disk reserve, SQLite, loopback. |
| `pnpm typecheck` | Passed; also included in build. |
| `pnpm lint` | Passed. |
| `pnpm test` | **23 passed**: 9 domain and 14 API/media/recovery tests. Final observed run: 15.17 seconds. |
| `pnpm test:e2e` | **2 passed**, desktop 1440×1000 and phone-emulated 390×844, 54.0 seconds. Each completes the full workflow. |
| `pnpm build` | Passed; frontend and compiled backend emitted. |
| Compiled server smoke | Readiness true; `/`, `/studio`, `/m/example` return SPA 200; unknown `/api/` remains 404. |
| Supplied `checks/check_pack.py` | **42 passed**, with installed Anaconda Python/PyYAML/jsonschema. |
| Supplied `checks/check_media_boundaries.py` | **5 passed**, with verified media tools prepended to PATH. |
| Visual review | Desktop creator and phone replay screenshots inspected; browser test asserts no horizontal overflow. |

Default Python 3.11 did not have PyYAML; the reference contract command actually executed was `& 'C:\Users\Anish\anaconda3\python.exe' checks/check_pack.py`. The media checker used `python checks/check_media_boundaries.py` with the local FFmpeg bin directory on PATH.

Coverage includes first votes/source deduplication, mode isolation, stale versions/codes, zero/tie snapshots, cut bounds, immutable history/releases, forbidden Origin/CSRF/Host/remote demo access, corrupt media, byte-hashed upload retries, split-frame/audio samples, no-audio sources, tampered output hashes, HEAD/Range behavior, wrong-session denial, choice conflicts, refresh/restart persistence, unpublish, streaming byte limits, subprocess timeouts, failed-job retry and restart recovery.

## Failures resolved

- Replaced outdated npm-bundled FFmpeg/FFprobe with checksum-verified 9.0.2.
- Fixed HEAD Content-Length being reset by an empty Fastify response.
- Fixed compiled static root returning 403 when index serving was disabled.
- Aligned creation and missing-attempt responses with baseline 201/404, then corrected the stale test expectation.
- Windows sandbox blocked atomic temporary-file renames and pnpm workspace-store links. Installation/tests succeeded with approved normal local filesystem access. Failed attempts are not counted as passing runs.

## Remaining limits after M1 (historical)

No real OAuth/EventSub, Twitch voting, OBS overlay, real participants, hosting, load benchmark, backup/restore test, full deletion UI, arbitrary recording-corpus validation, accessibility audit, physical mobile test, deck or submission video. Variable-frame-rate/nonzero-offset recording coverage and orphan cleanup remain M3. Human review is still required for semantic spoilers, rights and faithful editing.

At the end of the initial M1 build the seeded moment was private for user review. The user subsequently reported successfully completing the walkthrough. Browser tests publish only isolated fixtures. Start the demo with `.\start-local.cmd`. On 27 October the user authorized work on the next steps; the M2 work below follows that request.

## Windows startup correction — 26 October 2026

The original startup instructions depended on Codex's bundled pnpm, which is absent from this computer's ordinary PowerShell PATH. Added `start-local.cmd` to run diagnostics and start the app with the installed Node executable and project dependencies. Updated the README with this launcher and the alternative `npm.cmd run doctor` / `npm.cmd run dev` commands. No global installation or persistent PATH changes were made.

Verified with the process PATH rebuilt from Windows Machine/User PATH values and an explicit check that pnpm was unavailable: `npm.cmd run doctor` passed. Invoked the launcher from the parent directory to check directory handling; its diagnostics passed, the UI returned HTTP 200 on localhost:5173, and localhost:3000/health/ready returned `{"ok":true}`. Stopped the verification servers afterward. Application tests were not rerun for this launcher/documentation change.

## M2 work — 27 October 2026

- Added browser-bound, expiring, single-use OAuth state; allowlisted broadcaster and chat-scope validation; rotated creator sessions; AES-256-GCM token storage; independent signing/vote keys; single-flight refresh; startup and periodic validation; disconnect/revocation handling.
- Added real EventSub subscription/intake using Node's native WebSocket, strict source filtering, existing first-vote/deduplication transactions, safe directed reconnect, keepalive/welcome timeouts and backoff. Outages/revocation/restarts interrupt OPEN rounds; they never generate a complete snapshot.
- Added real creator session/draft/open/lock/outcome controls and the existing media/replay handoff. Added read-only, scoped, expiring, replaceable overlay capabilities and explicit public SSE projections.
- Removed demo login/seeding routes in real mode. Applied creator ownership checks to resources and corrected real/demo provenance labels throughout review/replay.
- Added `ops/setup-twitch.ps1` and `start-twitch.cmd`; real data stays in `data/twitch`, while `.env` and demo data remain untouched. Changed browser-test startup to use installed Node without requiring pnpm on the user's PATH.

### M2 verification actually executed

| Check | Observed result |
|---|---|
| `node node_modules/vitest/vitest.mjs run` | **37 passed** across 3 files; final run 20.95 seconds. 14 Twitch integration checks use injected provider/socket fixtures. |
| `node node_modules/@playwright/test/cli.js test` | **4 passed**, demo + Twitch-fixture workflows on desktop and phone; 1.9 minutes. |
| Targeted Twitch browser rerun after visual fixes | **2 passed**, desktop/phone, 59.4 seconds; verifies transparent overlay background and creator participation updates. These are reruns of the same two cases, not two extra unique tests. |
| `npm.cmd run build` | Passed, including strict TypeScript and frontend/compiled-backend outputs. |
| `node node_modules/eslint/bin/eslint.js .` | Passed. |
| `git diff --check` | Passed (Windows line-ending notices only). |
| PowerShell setup helper | Syntax parsed; mocked prompts/API responses created a valid private configuration with three distinct keys and correct broadcaster/data settings. No real credentials used. |
| Git ignore check | `.env.twitch` and `data/twitch/playable-moments.sqlite` are ignored. |
| Visual inspection | Phone creator controls and desktop overlay inspected; fixed countdown occasionally showing 181 for a 180-second window and transparent-body/opaque-root overlay background. |

Tests cover OAuth browser binding/replay/expiry/denial/wrong-account/missing-scope, encrypted credential tampering, session rotation, Origin/CSRF and cross-owner denial, READY gate, provider IDs, first votes, shared/wrong channel/stale commands, deadlines, immutable lock, outage/restart, directed reconnect and hostile URL rejection, keepalive timeout, periodic validation/network failure, refresh coalescing, revocation, and overlay expiry/replacement/access boundaries. Existing media and replay checks remain passing.

Failures during development were corrected: a test attempted to reopen an interrupted round and correctly hit the database invariant; a stale error-message expectation needed updating; the browser fixture initially failed to intercept an OAuth redirect (Twitch rejected the fictitious client, no user authorization); a fake-clock test stalled on HTTP injection and was corrected. Failed/interrupted runs are not passing evidence.

### Still required before calling M2 complete

Follow `M2_PREPARATION.md`: setup, authorization, READY and a one-account real vote have now been verified. Still collect two consenting real viewer choices, test a new account's late command and controlled interruption/reconnection, and show the OBS overlay on a real stream. Then upload and replay the actual recorded moment. The local OBS setup recording below is verified; a real viewer broadcast is still pending. Production binding remains disabled. M3/M4/M5 have not been completed by this M2 task.

### First genuine chat test and timeout correction — 27 October 2026

- Observed the original `HNR2` round INTERRUPTED with a keepalive timeout. The intake watchdog expired at exactly Twitch's advertised heartbeat interval, leaving no margin for delivery jitter.
- Added a bounded 2-second heartbeat delivery grace period. Welcome and directed-handover timeouts remain explicit; a missing heartbeat still interrupts OPEN and never reopens it. A regression with a heartbeat arriving 500 ms late failed before the fix and passed afterward; it also proves notification reset and interruption after 12 seconds of silence for a 10-second interval.
- Verification: all **15 Twitch integration tests** passed; strict TypeScript and lint for changed code/tests passed. No claim of a new complete-suite run.
- Restarted the verified local server with the fix. It is now a hidden background process; normal future startup remains `start-twitch.cmd`. Local stdout/stderr are in ignored `data/twitch/local-dev.*.log`.
- In session `First Twitch test`, created draft `First real chat vote — retry`, code `MWNK`, 180 seconds. Sent `!pick MWNK A`, saw the Studio count become 1, then sent `!pick MWNK B` from the same signed-in broadcaster. Locked while READY.
- Read-only SQLite verification: capture state LOCKED, one persisted A vote, REAL_TWITCH snapshot A=1/B=0/total=1. Screenshot: `screenshots/twitch-real-first-vote.png`. This is one real account testing the flow, not two viewers or adoption evidence. No actual outcome, media or publication was fabricated. Distinct-account late rejection is still unverified live.

### OBS preparation and local recording — 27 October 2026

- Installed official OBS 33.0.0 through winget with verified installer hash. The user handled the Windows Firewall prompt and Twitch authentication. Completed the auto-configuration wizard: 1080p/30 fps, 6000 kbps, QSV H.264, Mumbai ingest, Enhanced Broadcasting off. The wizard bandwidth test completed; no public broadcast was started.
- Added original camera-free `docs/demo/colour-choice.html`, private scene-import generator `ops/prepare-obs.mjs`, and `docs/OBS_RUNBOOK.md`. Generated the private import under ignored `data/obs/`, imported it through OBS, and selected the Playable Moments collection. Its browser source and scoped live overlay rendered correctly. Microphone muted; no desktop capture or webcam.
- Created session `First recorded moment` and draft `Red or blue — recorded choice`, code GDDU, 180 seconds. The user has no two viewers available yet. Left the draft closed, with Twitch READY and zero votes; no real outcome was entered.
- Set the recording folder to `data/obs/recordings`, format Hybrid MP4, AAC audio. Recorded a local question/tone/B-reveal equipment test, then stopped. File `2026-10-27 11-08-48.mp4`: 25.533333 seconds, 18,442,316 bytes; FFprobe H.264 1920×1080/30 fps and stereo AAC/48 kHz. Audio decoded with measured peak -18.1 dB. Inspected decoded setup/reveal frames. This is not two-viewer evidence, human output approval, or a publication.
- Found that the original Space handler did not reset inside OBS. Added the standard space-key fallback alongside `event.code`, refreshed the source, and verified A then Space restores the question. Streaming and recording are stopped. Screenshot: `screenshots/obs-ready-local-test.png`.
- No application runtime change was made for OBS preparation. The generator/HTML received syntax checks; the actual import, source interaction and local media output were tested. Full application suites were not rerun for these setup materials.

## M3 local reliability/security — 28 October 2026

The user requested independent reliability/security work because two viewers are not ready. Implemented and tested against isolated fixtures; the user's existing Twitch data and OBS recordings were not deleted or used as destructive test fixtures. The real two-viewer and creator-reviewed publication gate remains pending.

- Added migration 003 and durable, path-bounded media cleanup. Creator erasure atomically removes the moment, published releases, attempts, votes/events/snapshot, media/job/edit records and audit content. Confirm title/version/ownership and block active voting/uploads/encoding. Scrub retry responses while retaining expiring 410 markers to stop old create retries from recreating erased content.
- Added viewer-session choice deletion, one-minute session/credential-state expiry cleanup, a visible pending-file cleanup status, and accurate privacy wording about external copies/backups and storage-overwrite limits.
- Recheck upload state/version/authorization at commit and approval/publication authorization after file hashing. Check edit-to-moment ownership before publication. Missing/truncated media fails safely with 410. Interrupted uploads clean their partial file; exhausted worker recovery marks the edit FAILED. Startup collects unregistered generated files and detached segment outputs without removing referenced revisions.
- Added native publication/deletion dialogs with explicit Tab/Shift+Tab wrapping and Escape behavior. Browser checks cover typed deletion confirmation, clearing/reloading a replay session, no horizontal overflow and lost-response choice retry with the same idempotency key.
- Added original VFR/delayed-audio fixtures, including nonzero start timestamps. Verified fixture timing independently, normalized zero-based duration, video/audio alignment, metadata stripping and setup/reveal boundaries. Existing no-audio/corrupt-file checks remain. No change to the encoder timing algorithm was necessary for these fixtures.

### Verification and development corrections

- `node node_modules/vitest/vitest.mjs run`: **51 passed across 5 files**, final observed run 42.87 seconds. This includes 10 new hardening tests, 2 timing cases and 1 published-erasure/privacy workflow test, plus the earlier heartbeat regression and existing coverage.
- Initial sandbox runs could not rename generated temporary MP4s on Windows. Runs with approved normal local filesystem access passed those operations; no production atomicity workaround was introduced.
- Corrected the timing fixture after its first audio filter evaluated shifted timestamps; it now independently proves the intended source timing before testing normalization. Updated migration expectations from two to three migrations and ensured the test's second DB handle closes even on assertion failure.
- An initial four-case browser suite passed. A subsequently added stricter focus-wrap assertion exposed browser focus leaving the first dialog control; explicit Tab/Shift+Tab handling was added. The final full Playwright suite passed **4/4** in **2.0 minutes**, including DEMO and provider-fixture workflows at desktop and phone sizes.
- Final `npm.cmd run build` passed, including strict TypeScript and frontend/backend outputs. Full ESLint and `git diff --check` passed (line-ending notices only). Final desktop and phone deletion-dialog screenshots were visually inspected and saved as `screenshots/m3-delete-desktop-fixture.png` and `screenshots/m3-delete-phone-fixture.png`; these show disposable DEMO content.

Changed-file groups: `apps/server/migrations/003_media_cleanup.sql`, `apps/server/src/{app,media,retention}.ts`, `apps/web/src/{main,live,data-controls}.tsx`, stylesheet, unit/integration/browser tests, README and M3/progress/evidence/decision/OBS documentation. Earlier uncommitted Twitch watchdog and OBS preparation work was preserved.

Start normally with `start-twitch.cmd` (or `start-local.cmd` for DEMO); migration 003 applies automatically on the next start. Credentials do not need to be re-entered. For a manual non-destructive check, open a moment's Delete dialog, confirm that deletion stays disabled until its exact title is typed, then choose Keep moment. Actual erasure verification has already run only against disposable test fixtures.

M3 is not declared fully complete: two real viewers, a recorded broadcast, creator review and independent replay, controlled real-intake interruption, physical-phone and assistive-technology validation still require follow-through. Hosting, backups/restores, fresh-machine and load checks remain M4. See `M3_HARDENING.md` and `OBS_RUNBOOK.md`.

## Two-account rehearsal preparation

- The user reports creating `chaitime23` and opening `chaitime56`'s channel in a separate browser session. This will be an operator-controlled two-account rehearsal; it does not replace independent-viewer acceptance.
- Studio was stopped. Started the existing Twitch launcher; doctor passed, including migrations. Restricted execution blocked socket access, so stopped that process and relaunched with approved normal local networking. Renewed the existing broadcaster login with the same chat-read scope and observed `chaitime56` / Twitch READY.
- Created session `Two-account rehearsal` and draft `Two-account voting rehearsal`, question `Which colour should I choose?`, A Red / B Blue, 180 seconds, code `4QA3`, moment `1c081eb5-8974-46df-b7b6-4eb600b238de`. Observed DRAFT / READY / 0 accounts. Left responses unopened for the user's timed walkthrough. Preserved the earlier recorded-moment draft.
- Opened the broadcaster's offline channel Chat tab and verified its message box. No chat vote, public broadcast, outcome, upload or publication was performed during this preparation. The new account's actual event intake remains unverified. Reference screenshot: `screenshots/m2-two-account-rehearsal-ready.jpg`.
- Planned first round: chaitime23 A, chaitime56 B, chaitime23 B again, then lock; expect frozen A=1/B=1. A separate round with an account that has not voted before lock is needed to isolate late-vote rejection from duplicate rejection. No application code changed; test suites were not rerun for this operational preparation.

## Actual two-account chat rehearsal — 28 October 2026

- The user authorized taking control and handled both sign-ins. The side browser shares a Twitch website session, so used the accounts sequentially while Studio's owner session and server-side intake remained connected. Chrome native control was unavailable in the earlier attempt because the tool could not confidently determine its URL; no native-control bypass was used.
- Verified the Twitch account menu showed `chaitime23`, opened `4QA3`, sent `!pick 4QA3 A`, and observed one participating account. Sent `!pick 4QA3 B` from the same account; both messages appeared in Twitch chat and the total remained one. The user then signed into `chaitime56`; verified that identity and sent `!pick 4QA3 B`. Studio reached two accounts before expiry.
- The 180-second server deadline locked the round. Read-only database verification confirmed REAL_TWITCH, A=1, B=1, total=2, exactly two stored votes, and `locked_at_ms` equal to `deadline_at_ms`. The B vote arrived about 10.4 seconds before the deadline. This verifies two distinct account votes, first-choice retention, and automatic deadline locking. It is one operator's account rehearsal, not two independent viewers or a broadcast.
- Attempted an isolated late-vote check with new draft `Late-vote rejection rehearsal`, code `Q72G`, moment `e6f9c2bc-c397-4589-b960-e393ba39bdb5`. Opened with zero votes, then attempted to lock. Intake timed out about 1.7 seconds after opening; the UI became INTERRUPTED with `Twitch keepalive or welcome timed out. The open round was interrupted.` It showed intake READY again, but the round stayed interrupted. Stopped the check: no late vote was sent, no snapshot exists, and the late-vote acceptance check is still pending. This was an unexpected interruption, not the planned controlled-outage test.
- Preserved both rounds, returned Studio to the successful `4QA3` result, and left Twitch signed in as `chaitime56`. No creator outcome, video upload, approval, publication, recording or broadcast was performed. The original `GDDU` recording draft remains untouched.
- Evidence: `evidence/two-account-rehearsal.json` contains only the targeted read-only state/count/timing checks; screenshots `m2-two-account-chat.jpg`, `m2-two-account-rehearsal-locked.jpg`, and `m2-late-vote-interrupted.jpg`. No application code changed and no automated suites were rerun for this actual service check. Next: investigate the timeout and repeat late rejection in a fresh round before the recorded workflow.

## Twitch timeout repairs and verified late rejection — 28 October 2026

- Investigated Q72G without modifying it. The historical timeout lacks phase/timing details, so its exact cause remains unproven. Two minutes of original-connection measurement delivered 10-second heartbeats with gaps 9,999–10,001 ms and no failure.
- Reproduced two implementation defects with failing tests: superseded reconnect validation could open an orphan socket; an old connection's heartbeat could shorten a directed-handover deadline. Added connection-attempt generation checks and a fixed handover deadline. Both regressions then passed.
- Initial connections now negotiate Twitch's supported 30-second keepalive and still honor the welcome's value. The existing two-second grace and permanent interruption on actual loss remain. Added bounded owner-only timing/receipt diagnostics; no token, chat text, session/message/account identifiers or reconnect URLs are exposed. See `TWITCH_RELIABILITY.md` for the limits and protocol reference.
- Automated verification: **55/55** unit/integration tests across five files (54.46 seconds), including **19** Twitch tests; **2/2** desktop/phone Twitch provider browser checks (1.4 minutes); production build with strict TypeScript, full lint and whitespace checks passed. All automated data was isolated from user recordings.
- Revised real-connection measurement: Twitch advertised 30 seconds and delivered three heartbeats 29,998–30,000 ms apart during two minutes. Neither trace recorded a timeout or an event-loop delay over one second. Preserved sanitized baseline/revised trace in `evidence/twitch-heartbeat-trace.jsonl`. Stopped the temporary diagnostic launcher and restarted the normal `start-twitch.cmd`; doctor passed and the app remains running with the fix. No new sign-in was required.
- Created fresh REAL_TWITCH moment `Late-vote verification after connection fix`, code **FTCJ**, ID `1d6846c8-bf18-4bb4-a6cb-638fae05156e`. It stayed OPEN/READY without chat for **81.068 seconds**, then was manually locked at zero, before its 180-second deadline. Sent `!pick FTCJ A` as **chaitime56**, who had not voted in this round. Actual intake diagnostics advanced from zero to one chat notification, with zero accepted votes; receipt occurred **5.889 seconds after lock**. Read-only SQLite assertions confirmed LOCKED, REAL_TWITCH, A=0/B=0/total=0 and zero persisted votes. This isolates late rejection from duplicate rejection.
- Verified original `4QA3` remains LOCKED with A=1/B=1/total=2, and Q72G remains INTERRUPTED with no snapshot. No outcomes, media, approvals or broadcasts were fabricated. The prepared OBS recording draft was not changed.
- Evidence: `evidence/live-late-vote-status.json`, `evidence/live-late-vote-result.json`, `screenshots/m2-late-vote-verified.jpg`, `screenshots/m2-late-vote-chat.jpg`. The live result screenshot was visually inspected. Source changes for this repair are `apps/server/src/twitch-intake.ts` and `tests/integration/twitch.test.ts`; documentation/evidence updated separately. Earlier uncommitted M3 and OBS work was preserved.

### Remaining work, in order

1. Completed: J8QL audio adjustment, user review of revision 2, local publication, replay and unchanged live-history/access checks. No further sign-in is needed now.
2. Complete a real broadcast with two consenting independent viewers. The private overlay was refreshed for the separate local-recording rehearsal; the original GDDU draft remains reserved for that later test.
3. Review/publish/replay the actual broadcast recording as well. The existing account rehearsals and local OBS take do not satisfy independent-viewer or public-broadcast acceptance.
4. Complete physical-phone and assistive-technology checks. The automated phone viewport checks are not physical-device evidence.
5. M4: one HTTPS deployment with persistent storage, backup/restore, restart/separate-device and fresh-machine checks, plus labelled load measurements. Hosting remains deliberately disabled in production mode until this work is completed.
6. M5: finish the presentation and genuine demo video, summarize measured evidence/limitations, recheck competition requirements/deadlines and prepare the submission.

## Controlled reconnect and local OBS publication — 28 October 2026

- Created separate real round **767U** (`1a2ab056-47c8-4619-88eb-cfb38b66f026`). One genuine chaitime56 A vote was accepted while OPEN. Clicked Reconnect intake; it became permanently INTERRUPTED with `Creator reconnected Twitch during voting.` READY recovered without another login. Read-only checks confirmed the partial vote remains but there is no frozen snapshot and no reopen/publication control.
- Created fresh **T2K3** (`c5ada10f-15bf-41fe-8f89-1a6f897e30b7`). Sent the stale `!pick 767U B`; actual intake notification increased but the new round stayed at zero. Sent `!pick T2K3 B`, observed one account and locked A=0/B=1. Diagnostics showed one active connection and no timeout. Previous 4QA3 remains A=1/B=1, and original OBS draft GDDU remains DRAFT. Evidence: `evidence/controlled-reconnect-{status,result}.json`, screenshots `m2-controlled-reconnect-{interrupted,recovered}.jpg`.
- Opened installed OBS, replaced its expired overlay with a private capability for the separate **OBS local recording rehearsal** session, and recorded **J8QL** (`c1c3fd42-f5cd-406b-87dd-a6ec4056bef1`). The actual channel UI sent A as chaitime56; Studio counted one and was manually locked before the scene was switched to Blue. No public stream, microphone or desktop capture was used.
- Original take: `data/obs/recordings/2026-10-28 12-13-40.mp4`, 113.066667 seconds, 84,209,307 bytes, H.264 1920x1080/30 fps and stereo AAC/48 kHz. Observed the question/open overlay, then LOCKED and the Blue reveal. The original tone starts around 97.139 seconds. A later additional active take was stopped and preserved as `2026-10-28 12-20-53.mp4`; it was not uploaded or used for publication. OBS streaming and recording were stopped at the last verified check.
- Uploaded the actual take and rendered setup **20–30 seconds**, reveal **96.5–106.5 seconds**, each 10 seconds. Full decoding and sampled-frame checks passed. The user could see the video but could not hear the short tone, even through native playback; Windows/Codex were observed unmuted. Approval stayed unset.
- Created `J8QL-audio-boost.mp4` from the actual normalized master: copied its video stream unchanged and increased existing audio by 16 dB. Preserved the original OBS take. Uploaded that copy and rendered **revision 2** at the same boundaries. Both outputs decode fully as 1280x720 H.264/AAC, exactly 10 seconds. Reveal audio peaks at -12.9 dB, below clipping; no substitute sound or changed outcome was added. The user explicitly confirmed: `Yes — audio is clear; approve and publish locally` after both final clips played.
- Approved revision 2 and published release 1 at `http://localhost:5173/m/aa098843-76e4-49b1-b77e-7b92af0e5cdb`. In the IAB replay view, watched setup to completion, chose B, played the reveal to completion and observed the comparison. This UI tab shares the browser; it is not claimed as a separate private-browser test. Independent HTTP checks with no cookie and a newly issued unchosen viewer session each denied the existing reveal/result (403); public setup range returned 206 and manifest fields excluded outcome/reveal/live split. SQLite verified replay B is separate from frozen REAL_TWITCH A=1/B=0/total=1.
- Evidence: `evidence/obs-local-recording-review-revision1.json`, `evidence/obs-local-recording-review.json`, `evidence/obs-replay-ui.json`, `evidence/obs-published-replay.json`; screenshots `obs-local-recording-complete.png`, `obs-revision2-awaiting-review.jpg`, `obs-replay-before-choice.jpg`, `obs-published-replay-result.jpg`. Recordings and private overlay capabilities remain outside Git.
- No application implementation changed this turn, so the previous 55-test/build/lint results were not rerun or represented as new runs. Performed real service/UI, file decoding, audio, read-only database and anonymous access checks instead. Updated progress/evidence/reliability/M2/OBS documentation. Independent-viewer broadcast, physical-phone/accessibility, M4 deployment/backup/restore/load/fresh-machine work and M5 presentation/submission remain.

## Deployment preparation and accessibility — 28 October 2026

Implemented guarded hosted configuration (real mode, HTTPS, exact origin/callback, single private proxy hop, secure OAuth/owner/viewer cookies), non-root Docker/Compose/Caddy templates with persistent storage and restricted build context, and a stopped-app backup/verify/restore CLI. The CLI checks committed SQLite WAL state through the backup API, DB integrity/foreign keys, referenced media hashes, corruption and overwrite rejection. See DEPLOYMENT_RUNBOOK.md; private live data was not migrated, overwritten or publicly exposed.

Accessibility fixes cover contrast, skip navigation, landmarks/roles, current replay step and focus through choice/reveal/comparison. The final screenshot review corrected skip-link clipping. The browser response capture test now awaits pre-choice bodies before navigation, avoiding a discarded-response race without suppressing spoiler assertions.

| Final check | Observed result |
|---|---|
| Application unit/integration suite | 58/58 across 6 files; final run 49.22 seconds. Includes 3 deployment/backup tests. |
| Browser suite | 6/6 desktop and phone-emulated checks; final run 2.4 minutes. Provider paths use fixtures. |
| Accessibility | 26 scans; zero automated violations. Gradient/dialog contrast and video-caption rules still need manual judgment. Earlier unsupported decorative ARIA label was fixed. |
| TypeScript/lint/build | Passed; compiled server, frontend, backup CLI and doctor emitted. |
| Compiled hosted-mode loopback smoke | Studio 200; readiness 200; unauthorized owner 401; wrong Host 403; unchosen reveal 403. Fake configuration, not public TLS. |
| Docker Compose | Syntax/config validation passed using empty example credentials; no secret configuration printed. |
| Docker image/runtime | NOT VERIFIED: Docker Desktop Linux engine pipe unavailable; build could not begin. No image push/public deployment. |
| Visual inspection | Desktop/phone choice screenshots inspected, visible keyboard focus and A/B text labels. |

Evidence: evidence/accessibility-2026-10-28.json, evidence/hosted-compiled-smoke.json, screenshots/accessibility-choice-desktop.png and screenshots/accessibility-choice-phone.png. Detailed transient axe reports, including incomplete rules, remain in test-results/accessibility-run.json.

### Remaining work, in order

1. Container build, dependency hardening and repeated runtime/proxy checks are done (see the latest update below). Review the residual advisory assessments and license obligations before public promotion; maintain fresh scans. Next independent engineering task: controlled local load measurement.
2. Choose a host/domain/budget; configure HTTPS and real OAuth privately; verify fresh-host setup and published-release restore on staging. No hosting purchase or public deployment is authorized by preparation alone.
3. Measure controlled local vote load and modest declared video delivery; record hardware/latency/memory. Never load-test by sending bot traffic to Twitch.
4. Finish screen-reader, physical-phone/zoom and content accessibility. Caption-track/audio-description support is not implemented. See ACCESSIBILITY.md.
5. Run the live recorded OBS workflow with two independent consenting people, publish the reviewed result and replay from a separate browser. The existing chaitime56/chaitime23 accounts have already proven two-account behavior but are user-operated.
6. Finish the presentation/deck, short honest demo video, content rights/license documentation and competition submission checks.

Local startup remains .\start-twitch.cmd (real) or .\start-local.cmd (DEMO). No fresh login or new Twitch account is required for the checks just completed.

## Docker repair and verified container workflow — 28 October 2026

**Functional container gate passed; security promotion gate remains open.** Docker Desktop failed on stale zero-byte Windows Unix-socket entries in its temporary `run` and `docker-secrets-engine` directories. Stopped Desktop, verified the exact temporary paths and preserved them by renaming (three `.stale-...` directories). Restarting then brought up Docker Engine 29.0.1 on Linux/amd64 with WSL2. No factory reset, Docker-volume deletion, security-setting changes or alteration of private Twitch data was used.

Built the app with Node 24.22.1 and Debian FFmpeg 5.1.9. Pinned the tested Node and Caddy base digests. The runtime now installs only the frozen production dependencies (139 development packages removed) and excludes unused npm/yarn/corepack tools. The final image ID is `sha256:56a9e733fdef844d50dbac1c7f317e33d00fc5c2633d40c490601f1bb07776f3`.

| Check executed | Observed result |
|---|---|
| Final Docker build | Passed, including TypeScript, frontend/backend and operator CLI builds. |
| `ops/container-smoke.mjs` in final image | **8 checks passed**: tools absent; UID 1000/read-only root; doctor; compiled Studio; actual upload/transcode/decode; publication/Range/choice/spoiler gates; restart; stopped backup/verify/restore and replay. Fresh synthetic-only volume, no network. |
| `ops/proxy-smoke.mjs` with final image and Caddy | **5 checks passed**: certificate/hostname validation, HTTP redirect and auth, secure cookies/Range, Origin/choice/session gates, prompt safe SSE. Restored DEMO release, private Docker network, temporary CA trusted only by this client. |
| Configuration and scripts | Caddy config and Compose validation passed; three new `.mjs` scripts pass lint. |
| Offline Trivy 0.76.1 scans | Completed against local image archives and separately cached vulnerability DB. No Docker socket/image upload. Removed all 18 npm-related findings; **remaining findings are not waived**. |
| Final app scan | 967 package/advisory occurrences (363 distinct advisory IDs): 7 critical, 264 high. Current Bookworm report offers no fixed package version for those high/critical entries. This is not an exploitability conclusion. |
| Caddy scan | 74 occurrences (44 distinct advisory IDs): 0 critical, 10 high, 9 high entries with fixed versions reported. Upstream 2.11.7 was the latest release checked; a patched/rebuilt alternative still needs assessment and testing. |

Initial attempts to reach the isolated Docker proxy through Windows loopback returned connection refused; the internal network did not publish those ports. The successful TLS client ran inside that same private network. **No Windows-host reachability, public CA/DNS, real hosted OAuth, real-participant broadcast or capacity claim follows.** Test services were stopped afterward, with synthetic volumes/reports retained. No image was pushed.

Evidence: `evidence/container-smoke-2026-10-28.json`, `evidence/proxy-smoke-2026-10-28.json`, `evidence/container-image-2026-10-28.json` and `evidence/container-security-2026-10-28.json`. Full scan archives/reports and test-only credentials remain ignored under `data/container-verification`. License metadata was inventoried; distribution obligations have not been signed off. Automated fixture approval is not human review of a real recording.

Next at that checkpoint: dependency/base-image and proxy hardening (completed in the update below). The two existing Twitch accounts are sufficient for account-logic rehearsals; two independent people are still needed for the audience test.

## Dependency hardening completed locally — 28 October 2026

Replaced the Bookworm/media dependency tree with digest-pinned Node 24/Trixie and a restricted FFmpeg 9.0.2 source build. Two relevant source advisories were fixed with four upstream backports. The build reproduces the old HDR serialization failure and 100,000-record stack overflow, then verifies both fixes and upstream encryption-metadata behavior. Network protocols and non-MP4 demuxers are absent. This is a Linux deployment change; the existing Windows media installation is unchanged.

Rebuilt Caddy 2.11.7 with Go 1.27.3, pinned module updates and a minimal set of official imports. Applied the additional x/net v0.62.0 fixes found during the final scan. Both services are non-root with read-only roots and no capabilities; proxy administration is disabled. No account, real recording, live history or user-approved publication was modified.

| Final verification | Observed result |
|---|---|
| Media security regressions during image build | **3 passed**, including two reproduced unpatched failures. |
| Hardened app workflow/restore | **9 passed** in a fresh synthetic volume; includes actual upload, encoding, decoding, publication, session gates, restart and restored replay. |
| Updated proxy HTTPS/Range/SSE | **5 passed** after the final dependency rebuild, with genuine certificate/hostname verification on a private network. |
| Runtime security assumptions | Passed: UID 1000, zero capabilities, no-new-privileges, affected utility/module absence and actual binary linkage. |
| App offline scan | **163 occurrences / 72 distinct IDs: 0 critical, 43 high, 58 medium, 61 low, 1 unknown**. Baseline was 7 critical/264 high. |
| Proxy offline scan | **2 occurrences: 0 critical, 1 high, 1 unknown**. Baseline was 10 high. |

The 43 app high occurrences represent eight advisory IDs; the proxy high finding is Go JOSE v3. The exact configuration lacks the privileged operations or exposed parser paths identified during review. These are scoped assessments, not patched-package claims or exhaustive security certification. Lower/unknown findings remain visible. Custom FFmpeg is outside OS-package scanning and has its separate source/patch evidence. See [DEPENDENCY_SECURITY.md](DEPENDENCY_SECURITY.md).

Evidence: [image identities and report hashes](evidence/dependency-hardening-2026-10-28.json), [container workflow](evidence/hardened-container-2026-10-28.json), [HTTPS proxy](evidence/hardened-proxy-2026-10-28.json), [media regressions](evidence/media-security-regressions-2026-10-28.txt), and [runtime assumptions](evidence/runtime-boundaries-2026-10-28.json). Tested images are tagged `playable-moments:local` and `playable-moments-proxy:local`. Test app/proxy services are stopped. Nothing was pushed or publicly deployed.

Changed in this task: `Dockerfile`, `.dockerignore`, `.gitattributes`, `compose.yaml`, `ops/Caddyfile`, `ops/media/*`, `ops/proxy/*`, `ops/container-smoke.mjs`, `ops/proxy-smoke.mjs`, `ops/runtime-security-check.mjs`, the current evidence files, README and these operator/progress/decision documents. Existing application/browser changes belong to prior work; their suites were not rerun for this container/dependency-only task.

### Current next steps

1. **Next independent task: controlled local load measurement.** Record hardware, simulated-vote throughput, latency and modest replay-client load; never generate load against Twitch.
2. Review residual dependency assessments, lower/unknown findings and distribution/license requirements before public promotion. Assign dependency maintenance and refresh scans; assess the separate Windows media installation if it will remain in use.
3. Choose hosting/domain/budget, then verify fresh-host installation, real public HTTPS/OAuth, restart behavior and restored published replay. No public hosting has been purchased or launched.
4. Complete manual screen-reader, physical-phone/zoom and video-content accessibility; caption/audio-description support remains.
5. Record a genuine Twitch/OBS session with **two independent consenting people**, review/publish it and replay separately. No additional account creation is needed for technical rehearsal.
6. Finish the presentation deck, honest demo video, content-rights documentation and submission checks.

Local startup remains `.\start-twitch.cmd`; open `http://localhost:5173/studio` for the existing account. Manual deployment verification is in DEPLOYMENT_RUNBOOK.md. No new sign-in was needed for this task.

## Load testing, captions and submission preparation — 28 October 2026

Completed the next independent task and several parts of later tasks. All load was synthetic and isolated from Twitch and the user's database. No public deployment, image push, external message or submission took place.

| Work / verification | Result |
|---|---|
| Paced voting: 1,000 valid votes plus 50 duplicate/wrong-code events over 30 s | All correct; transaction p95 **2.618 ms**, scheduled-to-persist p95 **3.362 ms** |
| Finite 1,000-event burst / mid-ingestion lock | All valid burst votes persisted; burst scheduled p95 **1,062.091 ms**. Lock after 500 preserved A=250/B=250; late account rejected |
| Overload guard | 1,024 pending-handler cap interrupts an open round; 1,100-event integration regression proves no frozen partial snapshot or automatic reopening |
| Private HTTPS video delivery | 5 then 10 simulated clients, **220 exact ranges**; ten-client p95 **85.72 ms**, 44.28 Mbps aggregate in a short local stage |
| Captions and text alternatives | Separate English WebVTT/text per setup/reveal, validated/immutable/review-bound; reveal alternatives remain choice/session-gated and revoked on unpublish |
| TypeScript, lint, production build | Passed |
| Unit/integration | **61 passed**, 7 files |
| Browser desktop/phone emulation | **6 passed**, no retries; **26 axe audits, 0 automatic violations**; incomplete rules preserved for human review |
| Final Linux container / HTTPS / runtime boundaries | **9 / 5 passed**, plus privilege/library checks. Includes encoding, gates, restart and backup/restore |
| Packaging/license inventory | Fresh production dependency install: **85 runtime JS packages**, down from 224 retained packages. All declare licenses; abstract-logging's complete linked notice remains unresolved |
| Final offline app scan | **0 critical, 43 high, 58 medium, 61 low, 1 unknown**; 0 npm findings. Unchanged proxy retains 1 high/1 unknown. Residual review remains open |
| Presentation and submission preparation | Eight editable, visually reviewed slides; actual local rehearsal images, final measurements and limitations; description, storyboard and checklist drafted |

Evidence: [load report](LOAD_TEST_REPORT.md), [application/browser summary](evidence/load-captions-verification-2026-10-28.json), [final container](evidence/final-container-2026-10-28.json), [final HTTPS](evidence/final-proxy-2026-10-28.json), [final image review](evidence/final-image-review-2026-10-28.json), [runtime boundaries](evidence/final-runtime-boundaries-2026-10-28.json), and [runtime licenses](evidence/runtime-license-inventory-2026-10-28.json). Raw scanner/test data remains ignored locally. All temporary serving containers are stopped.

Browser retries during development exposed unstable caption-textarea labels and two incorrect test assumptions about disclosure/focus; explicit accessible names and checks at the correct interaction step fixed them. The final complete run passed. Early harness runs failed due to missing test environment/cache/output paths; they were corrected and are not represented as successful measurements. The overload and captions changes were tested with fake provider fixtures, not another live Twitch run.

Changed implementation: `apps/server/migrations/004_media_alternatives.sql`, server app/domain/storage/intake, contracts/core captions, web UI/styles, Dockerfile, load/license/smoke harnesses and related tests. Migration 004 applies on the next normal start. Existing user-approved release content was not changed; draft J8QL captions/transcripts are prepared under `docs/demo` for human review and a future new revision.

### Current completed/remaining checklist

1. **Local load testing: complete for the declared scenarios.** Public-host capacity, sustained/combined render-load tests are future deployment checks, not implied by these results.
2. **Security/license: partially complete.** Packaging fixed, notices/inventories captured and scans repeated. Residual advisory acceptance, the missing notice, original project license and any required binary corresponding-source package remain.
3. **Hosting: preparation complete; deployment pending.** Need host/domain/budget, then public certificate/Twitch OAuth, external-device/restart/fresh-host restore checks. No paid resources selected.
4. **Accessibility: code and automated checks complete for this iteration; human acceptance pending.** Review captions, screen-reader behavior and actual phone/zoom. Separate spoken audio-description tracks remain unimplemented.
5. **Independent-viewer OBS broadcast: pending.** Existing two user-operated accounts proved account logic; arrange two consenting people. The local J8QL recording/replay remains verified.
6. **Presentation: deck complete.** Final Twitch/Codex demo footage, edited/captioned video, accessible repository and user-reviewed submission remain. The actual app-reported build-thread ID is recorded in the [submission handoff](SUBMISSION_CHECKLIST.md). A 138-file local source review archive, with a hash manifest and no private env/database/recording/binary files, passed integrity and known-secret-value checks. It is not a posted repository or fresh-machine verification; see `evidence/source-review-2026-10-28.json`.

No sign-in was needed. The next user decisions are hosting/budget if launching publicly now, and repository/license choice. The official rules currently allow repository-based testing; public hosting is not explicitly a separate submission requirement. The checklist records the verified deadline and sources.

## Sequential completion: security and license follow-up — 28 October 2026

Selected security/license preparation first because it precedes public deployment. Replaced the final Linux app filesystem with the required Node/media binaries, their shared libraries, production application, CA certificates and complete retained notices. Shells, Perl, package managers, privileged utilities, nscd and unused conversion modules are absent. Seven original OS package/version records and 20 runtime file hashes remain for transparent inventory and scans; no vulnerability suppressions were introduced. The app still includes 85 runtime JavaScript packages.

| Verification on the final minimal image | Observed result |
|---|---|
| Production build, runtime-script ESLint/formatting | Passed |
| Isolated container workflow | All 9 checks passed: actual synthetic upload/encode/decode, publication/access gates, restart, stopped backup/restore |
| Private HTTPS proxy | All 5 checks passed, including exact Range and unbuffered safe SSE |
| Runtime boundary and notices | UID 1000, no capabilities, no-new-privileges; 20 file hashes verified; required license texts present |
| Outbound Twitch DNS/TLS | Official endpoint returned expected credential-free 401 over verified TLS; not an OAuth sign-in test |
| Offline scan, same 28 October DB | App **0 critical / 0 high / 17 medium / 9 low**; 26 occurrences, 24 advisory IDs; zero npm findings |
| Unchanged proxy | **1 high / 1 unknown** remain, with scoped reachability assessments |
| Package notices | Missing abstract-logging MIT notice retrieved; Debian common-license texts, Node/FFmpeg notices retained |

Exact image identity, report/evidence hashes and the full finding list are in [minimal-image-review-2026-10-28.json](evidence/minimal-image-review-2026-10-28.json). The tested image is `playable-moments:local`; the previous one remains `playable-moments:pre-minimal-20261028`. Temporary services are stopped. No public deployment, repository creation, image push, live vote or actual-media approval occurred in this follow-up. The earlier 61 app / 6 browser checks were not rerun for this packaging-only change. Early assembly/check attempts failed on symlink copying and kernel VDSO handling; both were corrected before the passing final checks.

Changed files in this follow-up: `Dockerfile`, `.dockerignore`, new `ops/runtime/assemble.mjs` and `check.mjs`, dependency/license/runbook/submission documentation, exact evidence and full license notices. Original code's MIT license is only a proposal; no root license or package-license declaration has been applied. The existing source archive and slide metrics predate this follow-up and need a final refresh before publication. The separate Windows Node/FFmpeg installation is not covered by this Linux hardening.

### Current ordered checklist and human involvement

1. **Security/license preparation: MIT applied; maintenance remains.** Application high findings were removed by omitting unused packages. Remaining library/proxy findings are tracked, not declared fixed. Anish delegated the license choice and MIT is now active for original code, credited to Anish. Source-only publication is prepared; prebuilt-image distribution would require a separate complete corresponding-source package. Actual-host configuration and the separate Windows runtime still need their own review.
2. **Hosting and public load/recovery: pending.** Anish chooses budget, region and domain/host availability; then provision one host and measure public HTTPS/Twitch login, external playback/capacity and restored release. No purchase yet.
3. **Human accessibility: pending.** Anish or a reviewer uses a physical phone and screen reader and reviews caption/text timing/content. New alternatives require a new revision and explicit review; the already approved local release stays intact.
4. **Independent-viewer OBS broadcast: pending.** Anish arranges two consenting people with separate Twitch accounts and a suitable time. The two user-operated accounts remain useful for rehearsal but do not satisfy independence.
5. **Final demo/video: pending; deck/storyboard prepared.** Capture actual Twitch and Codex footage, edit/caption it, refresh final deck metrics and obtain content approval. Keep live versus local/synthetic evidence explicit.
6. **Repository and submission: pending.** Licensed source bundle refreshed and clean-extraction build verified locally. Choose repository name/visibility on the connected account, complete fresh-host acceptance, publish the approved video and complete the user-reviewed entry.

No terminal command or sign-in is required from Anish for the completed work. Hosting budget is the current question; other decisions will be requested one at a time.

## License applied and hosting choice prepared — 28 October 2026

The user explicitly delegated the license decision and asked to proceed one task at a time. Applied the prepared MIT text, copyright 2026 Anish, in root `LICENSE` and all five workspace package manifests. Preserved the FFmpeg/other third-party terms and marked the proposal as applied. Added the root license to the Docker build context and runtime. No further license confirmation is required.

The refreshed source bundle excludes private env/data/recordings/binaries. Integrity, per-file extracted hashes and exact known-local-secret checks passed. A clean extraction of v2 successfully installed frozen npm dependencies and produced the Linux image; the existing pinned media/base cache was reused. The built image retained the exact MIT text and third-party notices and passed **all nine synthetic upload/render/replay/restart/backup-restore checks**. Package JSON formatting passed. This is clean-source local verification, not a fresh remote host or a new real Twitch/HTTPS test. v3 refreshes only documentation/evidence after those checks; build-input equality is verified in its packaging evidence.

Evidence: `license-applied-2026-10-28.json`, `licensed-source-build-2026-10-28.json`, `licensed-source-container-2026-10-28.json`, `licensed-image-check-2026-10-28.json` and `source-review-v3-2026-10-28.json` under docs/evidence. The additional image is `playable-moments:source-review-licensed`; the previously scanned `playable-moments:local` tag is unchanged. No repository, image, video or app was publicly posted.

Next task is hosting. Prepared a concrete DigitalOcean Basic/Regular 2-vCPU, 4-GiB, 80-GiB Linux x64 plan at the official listed US$24/month before tax/domain/optional backup charges, with Bangalore as the first region and Singapore as fallback. See DEPLOYMENT_RUNBOOK.md for sources, exact-plan caveats and ordered provisioning/acceptance steps. User budget/account input is needed because provisioning incurs ongoing charges. No paid resource or domain was created.

Changed in this step: root LICENSE, five package manifests, Dockerfile/.dockerignore, README, proposal status, third-party/submission/deployment/progress/evidence/decision documentation and private source review bundles. Existing code and approved recordings remain unchanged. Manual check: open LICENSE and confirm the Anish copyright; no start-command change is required.

## Submission priority clarified: no paid app host required by the published deliverable list — 28 October 2026

The user asked whether the competition could be completed without hosting. Rechecked the official rules and FAQ: Section 4 specifies a runnable accessible repository, real Twitch functionality, a project/Codex description, build session ID and demonstration video. A public deployed-app URL is not an explicit listed deliverable. This is our interpretation of the rules, not individual organizer approval. Corrected the earlier sequencing: buying hosting should not block completing the submission.

Recommended next task is the judge-ready local setup and asset check, followed by essential human accessibility review, genuine Twitch/OBS and Codex footage, edited video, repository access and final submission. Record the replay as a working local experience. Hosting/domain/public capacity and recovery remain optional later launch work, still uncompleted. Two independent viewers remain an internal stronger acceptance target rather than an explicit contest account-count requirement; do not relabel two user-operated accounts as independent people.

No purchase, public upload or new runtime change occurred. Updated SUBMISSION_CHECKLIST.md with the no-paid-host path and its access requirements. No hosting-budget answer is needed to proceed with this recommended submission work; spending remains unapproved. The private source archive is a reviewed snapshot and will be refreshed after final judge instructions and documentation.

## Judge-ready local walkthrough completed — 28 October 2026

Completed the next no-cost submission task. Added an isolated Windows judge launcher, setup helper and [JUDGE_GUIDE.md](JUDGE_GUIDE.md). Evaluation uses generated original video, 12 explicitly synthetic responses, no Twitch credentials, a separate `data/judge-demo` directory and loopback addresses `127.0.0.1:5180` / `127.0.0.1:3010`. Existing creator credentials, real history and the approved J8QL release were not changed. MIT remains applied; hosting is deferred rather than completed.

Verified a fresh source copy without installed dependencies, media tools, private env files or data: frozen pnpm installation, checksum-verified FFmpeg download, SQLite migrations/doctor and original fixture generation passed. Used Node 24.22.1, downloaded from the official source and SHA-verified in a private project tool directory. Existing machine Python/Visual Studio and dependency cache were available; this is not a separate fresh-machine acceptance. The Windows FFmpeg build remains distinct from the patched Linux build.

The actual CMD launcher started the two loopback listeners. A browser completed upload → render → review → publish → choose → reveal with the synthetic fixture, confirmed keyboard choice and refresh persistence, and verified a separate session still needed its own choice. Repeat preparation preserved existing moments. Inherited real-mode/production/bind/data/dotenv settings did not escape the isolated demo configuration. TypeScript, entrypoint ESLint and PowerShell execution passed. Automated playback was muted and automated approval applied only to generated test media; human audio/caption acceptance is not inferred. Test services were stopped afterward.

Changed: `ops/judge.mjs`, `ops/judge-server.ts`, `ops/setup-judge.ps1`, `start-judge.cmd`, README, judge/submission/progress/evidence/decision documentation. Evidence: [judge-setup-2026-10-28.json](evidence/judge-setup-2026-10-28.json). The v4 private source bundle adds these files; its integrity, extraction hashes, known-secret checks and unchanged Linux build-input comparison are recorded separately. No repository/video publication occurred.

Manual start: run `powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-judge.ps1`, then `.\start-judge.cmd` from the project directory. Open `http://127.0.0.1:5180`; follow the guide and verify the synthetic A=5/B=7 history remains unchanged after a personal replay choice.

### Current ordered work (supersedes earlier hosting-first checklists)

1. **Complete:** MIT/source notices, local load measurements, container/recovery preparation, automated accessibility checks and judge-ready local walkthrough. Residual security findings stay documented; these results are not public-launch acceptance.
2. **Next — human accessibility/content review:** check actual caption timing/text, audio, keyboard and spoken screen-reader output. Anish or a reviewer must report what they hear and see. A physical-phone check and separate-machine setup remain unverified. New media alternatives require a new reviewed revision; do not silently alter the approved release.
3. **Genuine footage:** capture the actual Twitch/OBS flow and actual Codex development. Seek two independent consenting viewers for the stronger product test; the two accounts already created belong to the same operator and must be labelled as a rehearsal.
4. **Demo/video:** refresh deck metrics, edit and caption a video under three minutes, then obtain final content approval.
5. **Repository/submission:** choose public/private access, review/publish the final source and approved video, check rules/access/deadline and submit the reviewed entry. Keep judge access available through judging.
6. **Deferred public launch:** hosting/domain, public HTTPS/OAuth/load/recovery and any binary distribution review. No spending or public deployment has occurred.

## Human caption review started — 28 October 2026

Completed one human acceptance check. Read the active real release metadata with a read-only database connection and verified both processed clip hashes against the approved revision. Prepared a private loopback-only review page with just those two clips and the proposed captions; no master, credentials or app mutation endpoints were exposed. Anish watched both with sound enabled and answered **“Yes — all three checks passed”** for readable/accurate captions, no setup spoiler and a short reveal tone at the matching caption.

Saved exact clip and caption hashes in [human-caption-review-2026-10-28.json](evidence/human-caption-review-2026-10-28.json). This accepts the draft caption content only: full text-alternative completeness and a new in-app revision/final approval still remain. The existing approved real release is intact. Opened the isolated judge-demo replay for the next physical keyboard check; no Twitch connection or new real vote was made. Screen-reader, phone/zoom, final footage/video/repository/submission remain pending. Source-review v4 is unchanged and predates this documentation; refresh the final archive before publication.

## Guided replay keyboard check passed; comparison wording corrected — 28 October 2026

Anish completed the core replay flow with step-by-step keyboard guidance after assistant placement of initial focus: Enter opened choices, Tab/Enter selected Blue, and the reveal action led to comparison. The user supplied the result showing own B, creator B and unchanged **12 synthetic responses, A=5/B=7**. This is a guided core-flow result, not independent navigation of every page/control or spoken screen-reader acceptance.

The user-visible result exposed a static “Different choices” heading even for matching choices. Updated `apps/web/src/main.tsx` to select “Same choice” when the choices match, retaining the other wording for different choices. Applied the same small patch to the running isolated judge copy after verifying its source matched. TypeScript and targeted ESLint passed; a replay in the actual browser showed the corrected B/B heading and comparison focus with the same historical counts.

Evidence: [human-keyboard-review-2026-10-28.json](evidence/human-keyboard-review-2026-10-28.json). Current source archive v4 and previously built images predate this frontend correction; refresh/build final deliverables before publication. No real media release, Twitch votes or external publication changed. Next: spoken Narrator check, then phone/zoom and final alternatives revision. Final footage/video, repository and submission remain.

## Captioned real-recording revision reviewed and published locally — 28 October 2026

The user asked to proceed. Completed a verified stopped backup, then used the actual Studio Unpublish & revise workflow for J8QL. Created revision 3 with the previously human-reviewed captions and separate text descriptions, preserving setup 20–30 seconds and reveal 96.5–106.5 seconds. The new video hashes exactly match approved revision 2; caption hashes match the reviewed draft files. Frozen REAL_TWITCH history remains A=1/B=0, total=1. The old release is revoked with its files/history retained; the local replay is now available as release 2.

Both actual application previews played to their ten-second ends with captions showing and sound unmuted. Expanded the text descriptions and replayed both clips at Anish's request. He then explicitly answered “Yes — approve and publish locally” to the combined content/audio/description review. Recorded approval through Studio and published release 2. Six focused API checks passed: neutral fresh-viewer projection, exact setup captions, post-choice reveal/description/captions/media Range, separate-session denial, stale-release revocation and unchanged live history. The saved verification choice is a personal replay choice, not a new live Twitch vote. The browser also showed the published setup description and English caption track. Detailed identifiers and hashes are in `evidence/j8ql-captioned-revision-2026-10-28.json`.

Next: finish browser-zoom and spoken screen-reader checks, with physical-phone acceptance separately recorded. Genuine final Twitch/OBS and Codex footage, a captioned demo video, refreshed source/deck, repository access and submission remain. The two-independent-viewer test remains an internal stronger acceptance target. Paid hosting/public-host capacity and recovery are deferred; no purchase or public exposure occurred. Local real-mode app remains running for review at `http://localhost:5173`; no sign-in was needed in this step.

## Submission preparation and registration — 28 October 2026

Contest signup is complete: Devpost showed “Thanks for registering!”. Created the Playable Moments draft and saved its name/pitch (2/5 steps); it remains DRAFT. At Anish's request, defer project details, repository/video URLs and final submission until those artifacts are ready. No final entry or public video/source publication occurred.

Prepared `DEVPOST_ENTRY_DRAFT.md` and `demo/FINAL_DEMO_SCRIPT.md`, refreshed the eight-slide Spaces deck and updated the submission/OBS handoff. The final demo is not yet recorded. Current usable local footage is the human-approved captioned J8QL revision 3 / release 2; no independent-audience claim is made.

Fixed a time-dependent privacy-test false positive (a short viewer ID matched timestamp digits) and excluded installed portable tools from lint. Typecheck, lint, all 61 Vitest tests and production build passed. A clean source extraction built image `playable-moments:source-review-v5`, retained MIT/third-party notices and passed all nine synthetic container workflow/restart/backup-restore checks. Pinned base/media cache was reused; no fresh remote machine or vulnerability scan is claimed.

The desktop/phone-sized browser run passed 4 of 6 scenarios. Both upload workflows correctly displayed insufficient disk space: C: had about 2.08 GiB free, below the default reserve plus maximum-upload staging allowance. The full browser suite is not complete. Keep the guard enabled, free space and repeat those two workflows. Initial sandbox temp/network restrictions were separately resolved without firewall changes. Evidence: `evidence/submission-prep-checks-2026-10-28.json`, `source-v5-build-2026-10-28.json` and `source-v5-container-2026-10-28.json`.

Anish asked to identify disposable project files first. A private cleanup review lists 10 old container exports/download ZIPs totalling about 1.56 GiB; no files were deleted. Docker also reports reclaimable build cache, requiring separate scope review. Preserve approved media, Twitch configuration/history, backups, source, installed tools and evidence.

Next: resolve disk space, finish the two browser checks, record actual Twitch/Codex footage, edit/caption and review the final video, publish approved source/video, then complete the saved Devpost entry before 3 November 2026 at 3:30 am IST. Spoken Narrator, zoom/physical-phone, independent-viewer broadcast and separate-machine acceptance remain; public hosting is deferred.

## Approved archive cleanup and browser completion — 28 October 2026

After contents verification and explicit user approval, removed exactly seven old Docker export TARs and three already-extracted download ZIPs. Validated all ten absolute paths against the workspace, exact reviewed names, regular-file type and unchanged sizes before removal; verified absence afterward. Recovered 1.56 GiB, increasing measured C: free space from 2.10 to 3.66 GiB. Source, installed tools, current Docker images/volumes, real Twitch data, OBS recordings, backups and test reports were preserved. No broad cache cleanup was performed.

Reran only the two formerly disk-blocked upload workflows. Desktop and phone-sized Playwright scenarios both passed (113.7 seconds process time) with the original 2 GiB reserve and 500 MiB upload cap. Combined with the preceding four passing scenarios, all six browser scenarios have passed on unchanged application code. This is split-run evidence, not one new six-scenario run; no human audio/screen-reader/physical-phone claim follows. Evidence: `evidence/post-cleanup-workflows-2026-10-28.json`. The earlier failure report remains historical evidence.

Updated the top-level milestone summary and README to reflect the current captioned release, deck, registration and latest scan baseline. Source review v6 refreshes documentation/evidence only; its 55 build inputs are compared with the tested v5 candidate. No new container build or security scan is claimed.

OBS reopened in safe mode after reporting an unclean prior shutdown. Added a separate “Playable Moments — demo walkthrough” scene and Window Capture source. Studio visibly reports Twitch READY. Capture target selection and the final recording are in progress; no new recording, streaming, public source/video upload or Devpost submission has been performed in this step.


## Recorded demo draft and creator readability — 28 October 2026

Completed the approved OBS window capture setup and recorded a fresh real Twitch round JZ2J. The genuine chat command was accepted from one operator-controlled account; Studio showed one participant and locked. A read-only database check confirmed REAL_TWITCH A=1/B=0/total=1. This is offline channel chat and local recording, not a public broadcast or independent-viewer study. No creator outcome or media was attached to JZ2J.

Separately captured the already approved J8QL revision 3/release 2 creator review and replay. Setup ended, personal A was accepted, the actual B/Blue reveal played with captions, and the comparison retained A=1/B=0 history. Existing media, approval and publication were not changed. All three selected raw captures passed full decoding.

During capture, published caption text appeared faint. Changed the four media-alternative fields from disabled to read-only, added explicit readable colors, and corrected the published-status copy. Visually verified the real Studio and Tab focus between caption fields. Strict TypeScript/production build and focused ESLint passed. No new full browser suite, container build or security scan is claimed; the prior six passing browser scenarios predate this small UI change.

Exported a private 1920x1080 H.264/AAC text-led review cut, 128.021 seconds (2:08), with genuine footage and explicit separate-moment/local-rehearsal labels. The actual Codex conversation about the fix is included; unrelated sidebar and browser chrome are cropped. Full decoding and nine sampled-frame visual checks passed. Original approved tone is retained in the earlier-moment segment; voiceover is pending. No public upload or final human video approval occurred. OBS recording and streaming are stopped. Evidence: `evidence/demo-capture-and-readability-2026-10-28.json`; private edit manifest: `data/submission-video/REVIEW_CUT_V1.json`.

Next: Anish watches the draft, records narration, and reviews the final subtitled export. Then finish repository/video access and the saved Devpost entry. Spoken screen-reader, 200% zoom, physical-phone, fresh-machine and independent-viewer acceptance remain. Residual security/distribution review and optional public-host acceptance remain as documented. Disk cleanup was limited to the ten approved archives; new footage uses some recovered space, and the original disk reserve remains enabled.


## Example-independent source review — 30 October 2026

The final demonstration example remains undecided. Completed a bounded source-distribution follow-up without changing application or dependency code: rechecked the existing source file list, notice collection, pinned FFmpeg source licenses and the residual Go JOSE advisory. Found that the included encryption-info/MOV-derived patches retain LGPL 2.1-or-later source terms while only the combined build's GPL text had been retained. Added the exact upstream LGPL text and corrected the explanation; original patch bytes, their hashes and upstream attribution remain intact.

Prepared the v8 source package with archive/file-hash, complete application-source coverage, private-file/binary exclusions and bounded secret-pattern checks. All application sources must match the tested/local-built v7 baseline for this review to pass. The checks and archive receipt are recorded in `evidence/source-distribution-checks-2026-10-30.json` and `evidence/source-release-review-2026-10-30.json`. No full new build, browser suite, vulnerability scan or historical Git review is claimed for this documentation/notice-only change. No source, image or video was published.

The upstream Go JOSE advisory still lists no patched v3 release. The committed proxy retains admin-off and the reviewed route configuration; the finding stays open. Other vulnerability totals remain the dated 28 October baseline, not a current clean scan. Prebuilt binary/image distribution still needs its own complete corresponding-source/notice package and public-host acceptance remains deferred.

Next available work without choosing an example: browser zoom/keyboard checks, repository/judge handoff preparation, and guided spoken screen-reader/physical-device/fresh-computer testing. New recording, content rights, captions/audio approval, narration and the final video depend on selecting the example. See `SOURCE_RELEASE_REVIEW.md` for the exact boundary and remaining user involvement.

## Local judge startup verified; browser verification interrupted — 30 October 2026

With the final example still undecided, ran the isolated judge preparation on the existing Windows computer using Node 24.22.1 and installed FFmpeg/FFprobe. SQLite, writable data, disk reserve, H.264/AAC and loopback configuration checks passed. Generated the original synthetic fixture and started the demo at http://127.0.0.1:5180, using data/judge-demo with Twitch disabled. Nothing was published automatically. This verifies preparation/startup with installed tools, not a fresh dependency install or separate-machine acceptance.

Started the existing six-scenario browser suite against the current source. It emitted startup warnings but no scenario results before cancellation with Ctrl+C; no new browser pass is claimed. The Computer Use service then stopped UI work because it could not confidently determine Chrome's current URL. No alternate UI route was attempted; actual 200% zoom remains pending. Evidence: evidence/example-independent-checks-2026-10-30.json.

Remaining: resume zoom/keyboard verification, prepare the fresh local publication repository, and obtain spoken screen-reader, physical-phone and separate-computer feedback. Final example/rights, recording/narration/video approval, independent-viewer broadcast, repository/video publication and final submission remain. Residual security findings and deferred public hosting retain their documented status. Source archive v8 is unchanged and predates this new evidence.


## Current browser suite passed; clean repository prepared — 30 October 2026

Resolved the local test-runner access issue and completed all six existing Playwright scenarios in one run (reported 3.0 minutes): public accessibility/reflow, fixture Twitch/overlay and upload-to-reveal at both desktop and phone-sized viewports. All 75 application files match the v8 source and the recorded test hashes. This closes the regression gap after the published-caption readability change. No new actual Twitch or independent-viewer claim follows. Evidence: evidence/browser-regression-2026-10-30.json.

Opened the isolated judge demo in the side browser and verified keyboard skip-to-content, Studio navigation and local sign-in with a visible focus outline. Actual browser zoom remains unverified: the side-browser shortcut did not alter zoom, and a separately controllable Chrome browser was unavailable. Spoken screen-reader output, physical-phone and separate-computer acceptance still require human/device participation.

Clarified the README's fresh-download commands and labelled the original handoff/start prompt as historical. Prepared source package v9 and a fresh local Git repository with branch codex/submission-ready. Its staged file list excludes private environment values, recordings, databases, downloaded binaries, dependencies and original Git history. Required notices and patch hashes were retained; bounded known-secret/pattern and judge-link checks passed. No commit, remote repository, source/video upload or contest submission was made. See evidence/repository-source-checks-2026-10-30.json; the external archive/repository receipt is evidence/repository-ready-2026-10-30.json.

Remaining: choose repository visibility for publication; select and authorize the final example; record/narrate/caption and approve the final demo video; complete the saved submission with both URLs. Human screen-reader/zoom/physical-phone/fresh-computer checks and the two-independent-viewer broadcast remain open. Residual security findings and prebuilt-binary distribution work retain their documented status; public hosting is deferred.
