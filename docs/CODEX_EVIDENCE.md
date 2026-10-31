# Codex development evidence

## Original game and OBS preparation — 31 October 2026

The selected **Shortcut or Safety?** recording scene is implemented with original SVG art and generated sound effects. A creator chooses the risky shortcut or the longer safe route; actual jump timing determines success or failure. The scene pauses during chat and on tab/background stalls. It runs separately on loopback port 5190 without Twitch credentials, application data or vote simulation.

All **69 unit/integration tests**, including six game-logic tests, passed. **Five dedicated browser scenarios** passed with no retries, including real jump input, pause/reset behavior, keyboard use, responsive layouts, automated axe checks and scene-server access restrictions. Build/TypeScript and full lint passed. The generated OBS import was loaded into OBS 33.0.0 as a separate collection and visually verified; its operator controls are cropped out. This is preparation, not a new Twitch recording or human media approval. See [the scoped evidence](evidence/original-game-scene-2026-10-31.json).

Run `npm run demo:scene` and open `http://127.0.0.1:5190/`; after choosing B and pressing Start run, the safe route should finish. Use `node ops/prepare-game-obs.mjs` for a fresh import file and follow [the recording sheet](demo/FINAL_DEMO_SCRIPT.md). Next: confirm human playback of the OBS rehearsal, capture a fresh Twitch moment, review its exact processed media, then finish narration, editing, publication and submission. Previously deferred checks remain deferred.

A subsequent actual OBS rehearsal captured the safe route finishing in 8.77 seconds. The 46.83-second local master is H.264 1920×1080 at 30 fps with stereo AAC; it passed full decoding and sampled-frame review. Finish tones are present (peak −18.5 dBFS). A 17-second review excerpt was prepared for Anish; human playback confirmation is pending. Recording and streaming are stopped. This game-only rehearsal contains no new Twitch votes and is not the final submission footage.

## Security fixes and browser results — 31 October 2026

The security follow-up fixes two moderate production JavaScript advisories through scoped glob/minimatch overrides. The repeat audit reports zero findings across 86 production packages. All 63 unit/integration checks, build/TypeScript and lint passed. The complete Playwright run passed all six desktop and emulated-phone scenarios in 145.9 seconds, with no failed, skipped or flaky tests: public accessibility/reflow, fixture Twitch/overlay, and upload → review → publish → choose → reveal. These are automated fixture results, not new live Twitch or independent-viewer evidence. Exact cases and report hashes: [browser receipt](evidence/browser-regression-2026-10-31.json), [security receipt](evidence/security-followup-2026-10-31.json).

Separate physical-phone core playback, choice, refresh persistence and portrait/landscape checks passed on the local sample on 31 October. Actual Chrome 200% zoom was reached and initial homepage/Studio sections checked. Narrator spoke headings/links and the user confirmed clear speech. Full magnified review/replay and spoken screen-reader acceptance remain incomplete. The user explicitly deferred blocked manual checks, separate-computer acceptance and Docker rebuild/rescan. No blanket accessibility or container-security pass is claimed.

The repository was initially published on 30 October to anishsharma1356/playable-moments. This follow-up includes only the reviewed source/configuration, tests, notices and sanitized evidence. Raw reports, credentials, databases, recordings, downloaded tools and old private Git history remain excluded. The historical entries below describe their dates, not the current release status.

Next: prepare the selected original game challenge (risky shortcut versus safe route), capture a new genuine Twitch/OBS moment, review the exact processed media/captions/audio, finish narration and the final demo, publish the approved video and complete Devpost. Independent consenting viewers remain unavailable; operator-controlled accounts must be labelled honestly. Residual container/proxy and binary-distribution work stays open; public hosting stays deferred.

Date: 26 October 2026. This records implementation performed in this Codex chat, not claims from the original planning pack.

The Codex app returned chat ID `01a1791d-3b64-7590-ab36-a3b1096b4328` when opening project files. This is the observed chat identifier; confirm the organizer's required evidence format before submitting it as a competition session identifier.

## Work performed

- Safely extracted the provided ZIP into a fresh `playable-moments` directory under the existing workspace, preserving the original archive and root contents.
- Read the starter, architecture, product, state/media/API/security/build requirements and contracts. Added the separately supplied v2 starter and competition context.
- Implemented the strict TypeScript workspaces, SQLite migration, domain transitions, synthetic first-vote fixture, private upload/normalization/render worker, content/hash-bound approval, immutable release and session-bound replay.
- Built responsive React creator/replay screens with actual processed previews, explicit review confirmations, keyboard choices, errors/retry, refresh restoration and distinct DEMO labels.
- Installed/tested pinned dependencies, generated original synthetic media, and replaced obsolete media binaries after measuring their versions.
- Wrote and executed the application tests. Key debugging examples: HEAD content length regression; compiled SPA root returning 403; digest checking on upload retries; interrupted encoding recovery.
- Recorded the implementation/contract clarifications in `DECISIONS.md` and prepared the runnable README and M2 handoff.

## Verified evidence

`pnpm test`: 23 tests passed. `pnpm test:e2e`: desktop and phone-emulated complete workflows passed. Typecheck, lint, build, migration, doctor and compiled-route smoke checks passed. Supplied contract/media checks passed 42/5. Exact scope and observed timings are in `PROGRESS.md`.

The browser tests create separate creator and visitor contexts, upload a local MP4 through the UI, play the encoded previews, record synthetic review confirmations, publish, watch setup, choose by keyboard, refresh, play the actual reveal and inspect comparison. They inspect requests/JSON before choice and check mobile overflow. Automated fixture approval is test coverage, not an assertion that a human reviewed arbitrary footage.

Preserved screenshots:
- `screenshots/landing-desktop.png`
- `screenshots/creator-review-desktop.png`
- `screenshots/replay-before-choice-phone.png`
- `screenshots/replay-comparison-phone.png`

These are screenshots of the working local application using generated DEMO content. They are not evidence of live Twitch activity.

Startup follow-up, 26 October 2026: corrected the initial assumption that Codex's bundled pnpm would be available in the user's PowerShell. Added a Node-based Windows launcher and documented `npm.cmd` alternatives. Using only the ordinary Windows Machine/User PATH, confirmed pnpm was absent, diagnostics passed, and the launcher served the UI (HTTP 200) and backend readiness (`{"ok":true}`). The launcher was invoked from the parent directory; verification servers were then stopped. No global tooling or persistent PATH was changed.

## Deliberately not claimed

At the end of automated implementation, no external account setup, real OAuth/chat or OBS verification was claimed. The later user-led setup and actual chat test are recorded below. Still not claimed: a real OBS stream, public deployment, adoption metric, competition submission, final slide deck or human media-rights verification. No user tokens or stream keys were requested or saved in evidence. Runtime data, environment values, installed tools and full browser traces remain gitignored. No source was pushed to a remote repository.

## M2 implementation evidence — 27 October 2026

The user authorized the next implementation steps and reported that Twitch account setup had not begun. Added OAuth and encrypted authorization lifecycle, real EventSub transport, existing-domain vote intake, creator live controls, safe OBS overlay, local setup helper and mode-specific launcher/data. Preserved the working demo and extended ownership and provenance handling for real mode.

Observed checks: 37 unit/integration tests, 4 desktop/phone browser workflows, build/typecheck and lint passed. Following visual fixes, the two Twitch browser cases passed again. The setup helper passed a mocked local smoke check and syntax validation. Details, known limits and failed-run corrections are recorded in `PROGRESS.md`.

The Twitch tests inject controlled provider/socket fixtures from `tests/fixtures/twitch.ts`. They verify OAuth binding, encrypted persistence, authorization gates, vote rules, connection failure handling, overlay projections and the full media/replay path; they are not evidence that real Twitch integration passed its manual gate. There is no production mock-vote API. Fixture screenshots use REAL_TWITCH provenance to test that branch but are named `twitch-*-fixture` and must never be presented as real viewer participation.

Changed-file groups: `apps/server/src/{app,config,domain,media,storage,twitch-auth,twitch-intake,overlay}.ts`, migration `002_twitch_oauth.sql`, shared DTOs, `apps/web/src/{main,live}.tsx` and styles, launch/setup/manage scripts, Twitch fixtures/integration/browser tests, and setup/progress/API documentation. No user credential file was created at the project root and no original user recording was modified by tests.

## Genuine connection and chat follow-up — 27 October 2026

The user completed registration, local credential setup and OAuth consent. Codex observed the running Studio identify `chaitime56` and show READY, then the created `First Twitch test` session. When the user authorized taking control for the chat test, the original round was already INTERRUPTED by a keepalive timeout and the channel browser needed sign-in. The user handled sign-in and the unrelated Twitch clip-sharing prompt.

Codex reproduced an exact-heartbeat-deadline race with a failing integration test, added a bounded 2-second delivery grace period, and verified all 15 Twitch integration tests, typecheck and changed-file lint. The local server was restarted with the fix; no token contents were exposed.

Through Twitch's actual chat UI, Codex sent `!pick MWNK A` and then `!pick MWNK B` from the authorized broadcaster account. Both messages were visibly sent; the Studio counted one account. After locking, a read-only database check confirmed one A vote and a REAL_TWITCH immutable snapshot with A=1, B=0, total=1. `screenshots/twitch-real-first-vote.png` shows the actual locked round and READY status. This evidence establishes one real account's first-choice behavior, not two consenting viewers, distinct-account late-vote rejection, OBS broadcasting, or a recorded/published moment.

## OBS setup evidence — 27 October 2026

At the user's request, installed official OBS 33.0.0, prepared an original colour-choice HTML scene and a private OBS import generator, and completed the setup wizard after the user handled Firewall and Twitch authentication. Imported the collection through OBS's UI and verified the real read-only overlay. Saved the two-viewer procedure and remaining work in `OBS_RUNBOOK.md`.

Actually recorded and stopped a 25.533-second local equipment test with question, tone and B reveal. FFprobe verified H.264 1080p/30 fps with stereo AAC; FFmpeg decoded audio and sampled frames, which were inspected. Corrected and retested the scene's Space reset behavior inside OBS. The microphone was muted, and no public stream was started. Screenshot `screenshots/obs-ready-local-test.png` shows the reset scene, DRAFT/0 overlay, and stopped recording/stream controls.

The new GDDU draft remains closed with Twitch READY and zero votes. The recording is a local setup test, not a real viewer session, approved release or competition demo. Two viewers, a real recorded broadcast, its review/publication/replay, controlled outage testing, deployment and presentation work are still outstanding. Private overlay URLs, OBS credentials and recording data remain outside Git.

## M3 independent hardening — 28 October 2026

The user asked to proceed with reliability/security while two viewers are unavailable. Implemented creator moment erasure, durable file removal/retry, startup orphan recovery and exhausted-job recovery, current-browser replay-choice erasure, periodic session expiry, commit-time authorization/version checks, missing-media errors and accessible confirmation dialogs. Added operational/API and privacy limits in `M3_HARDENING.md` and README.

Verified 51 unit/integration tests across five files (42.87 seconds). New generated fixtures cover variable frame rate, delayed audio and nonzero start timestamps, independently checking source timing and the actual encoded setup/reveal outputs. New erasure tests verify full published-record cleanup, immediate route denial, foreign-key integrity and deletion resumption after restart. Temporary-path denial and Windows file-removal failure are exercised without touching user recordings.

Browser tests additionally exercise loss of an already-committed choice response, same-key retry, privacy deletion and typed creator confirmation. A stricter focus-wrap test found a native-dialog edge case and motivated explicit Tab/Shift+Tab handling. The final full browser suite passed 4/4 in 2.0 minutes; final build/typecheck, full lint and whitespace checks passed. Screenshots `screenshots/m3-delete-desktop-fixture.png` and `screenshots/m3-delete-phone-fixture.png` were visually inspected. They are isolated DEMO fixtures, not real viewer evidence. No runtime AI, external account changes or deployment was added.

## Two-account rehearsal ready, votes pending

The user reported creating `chaitime23` for a rehearsal alongside broadcaster `chaitime56`. Restarted the existing local Twitch app with approved normal network access after restricted sockets prevented access; doctor passed and the existing broadcaster chat-read authorization was renewed. Observed Studio READY. Created a separate 180-second draft with code `4QA3` and zero accounts, leaving it unopened so the user can follow the timed instructions. Verified the broadcaster channel's chat input while offline. Screenshot `screenshots/m2-two-account-rehearsal-ready.jpg` records this preparation only: no new chat votes, two-account result, broadcast or reviewed recording has yet been verified. The two accounts are user-operated; independent viewers remain pending.

## Actual two-account chat result and interrupted follow-up

With explicit user authorization, used the Twitch UI to send `4QA3` A then B as `chaitime23`, and B as `chaitime56` after the user switched the shared browser login. Verified both account-menu identities and visible chat messages. Studio progressed from zero to one to two accounts, keeping the total at one after the first account's second choice. The server deadline locked the result. A read-only SQLite query confirmed REAL_TWITCH A=1/B=1/total=2, two stored votes and exact deadline locking. Evidence is in `evidence/two-account-rehearsal.json` and the `m2-two-account-chat.jpg` / `m2-two-account-rehearsal-locked.jpg` screenshots.

The separate `Q72G` late-vote rehearsal interrupted on a Twitch keepalive/welcome timeout about 1.7 seconds after opening, before a lock or any chat vote. Recorded the INTERRUPTED state, zero votes and absence of a snapshot; stopped this check. The late-vote test did not pass or complete. Intake displayed READY again while the interrupted round remained closed. Screenshot: `screenshots/m2-late-vote-interrupted.jpg`. No synthetic votes, database mutations, manual outcome, public broadcast or human-reviewed publication were used. Independent viewers, a successful late-vote check, controlled interruption and the recorded workflow remain outstanding.

## Timeout fixes and successful late-vote retest — 28 October 2026

At the user's request, measured real heartbeat timing, reproduced and repaired two connection lifecycle defects (stale validation opening a second socket; old heartbeats shortening handover deadlines), negotiated the documented 30-second interval, and added bounded owner-only timing/counter diagnostics. The original Q72G incident lacked enough timing evidence to prove its specific cause; do not equate the reproduced bugs with a confirmed historical root cause. See `TWITCH_RELIABILITY.md` and the sanitized two-minute baseline/revised traces in `evidence/twitch-heartbeat-trace.jsonl`.

Verified 55 unit/integration tests (including 19 Twitch checks), two desktop/phone provider-fixture browser workflows, build/typecheck, lint and whitespace checks. Both lifecycle regressions were observed failing before the repair. Restarted the normal app with saved credentials; no fresh login was necessary.

Actual Twitch retest FTCJ: remained OPEN/READY for 81.068 quiet seconds, manually locked with no votes, then sent `!pick FTCJ A` through Twitch UI as chaitime56. Owner diagnostics confirmed one actual chat notification arrived 5.889 seconds after lock and no vote was accepted. Read-only database checks confirmed zero votes and a frozen REAL_TWITCH zero snapshot; previous 4QA3 A=1/B=1 stayed intact. Screenshot `screenshots/m2-late-vote-verified.jpg` and JSON files `evidence/live-late-vote-status.json` / `evidence/live-late-vote-result.json` provide the evidence. This is the completed isolated late-vote check; it is not independent-viewer, broadcast, recording-review or deployment evidence.

## Controlled reconnect and reviewed local OBS replay — 28 October 2026

Real Twitch controlled check passed: 767U accepted one A vote, was deliberately reconnected while OPEN, stayed INTERRUPTED after READY recovered and had no snapshot. Fresh T2K3 rejected the old code, accepted B under its own code and locked A=0/B=1. Original 4QA3 A=1/B=1 and GDDU draft were preserved. Evidence is in `evidence/controlled-reconnect-status.json`, `evidence/controlled-reconnect-result.json` and the matching screenshots.

Recorded the original red/blue scene locally in OBS while real J8QL received one A vote. Locked before Blue was displayed. No public broadcast or independent viewers are claimed. The actual 113-second take was uploaded and cut to separate 10-second setup/reveal files. The user reported inaudible sound; kept approval unset, measured the quiet existing tone, preserved the original and created a +16 dB audio copy with unchanged video. Revision 2 outputs decoded successfully and the reveal peaked at -12.9 dB. The user reviewed both final clips, confirmed the audio was clear and explicitly approved local publication.

Published release 1 using edit revision 2, then completed setup → replay B → actual reveal → comparison in the UI. The original snapshot stayed A=1/B=0/total=1. Separate no-cookie/new-unchosen-session HTTP checks rejected reveal/result with 403, while public setup range returned 206 and the manifest contained only the pre-choice projection. These HTTP checks supplement the shared IAB replay tab; no isolated private-browser or physical-device claim is made.

Replay: `http://localhost:5173/m/aa098843-76e4-49b1-b77e-7b92af0e5cdb`. Evidence: `evidence/obs-local-recording-review.json`, `evidence/obs-published-replay.json`, `evidence/obs-replay-ui.json`, `screenshots/obs-published-replay-result.jpg`. Previous full automated tests were not rerun for this operational work. Independent-viewer broadcast, physical-phone/assistive-technology, deployment and presentation work remain.

## 28 October — deployment preparation and accessibility

Added guarded HTTPS hosted configuration, non-root container/proxy templates, backup/verify/restore tooling and operator runbooks. Fixed low-contrast labels, skip navigation, replay focus transitions and decorative ARIA semantics. Added pinned axe scans within real application workflows and fixed response-body capture before navigation. Final observed results: 58 application tests, 6 desktop/mobile browser tests and 26 scans with zero automated violations; typecheck/lint/build and a compiled loopback hosted smoke passed. Backups restore verified SQLite/media and reject corruption/overwrites.

Docker build/runtime is unverified because its Linux engine was unavailable. No hosting was purchased or launched. Human screen-reader/physical-device/video-alternative acceptance, independent-viewer broadcast, load measurements and presentation remain. See PROGRESS.md, DEPLOYMENT_RUNBOOK.md, ACCESSIBILITY.md and evidence/accessibility-2026-10-28.json for scope and limitations. The original private Twitch data and published OBS rehearsal were preserved.

## 28 October — Docker recovery, runtime verification and scan findings

Recovered Docker Desktop by stopping it and renaming verified stale temporary socket directories, preserving their contents. No reset or deletion of Docker data. Engine 29.0.1/WSL2 then ran successfully. Built and digest-recorded the Linux image, pinned Node/Caddy bases, removed 139 development packages and unused runtime package managers, and rebuilt successfully.

The final image passed eight fresh-volume, no-network synthetic checks covering non-root/read-only operation, actual FFmpeg upload/split/decode, publication and session-gated replay, restart and stopped backup/verify/restore. It then passed five private-network HTTPS checks against Caddy, using genuine certificate/hostname validation with a test CA, secure cookies, Range, safe SSE and cross-session/Origin rejection. No OS trust-store change. Scripts: `ops/container-smoke.mjs`, `ops/proxy-fixture.mjs`, `ops/proxy-smoke.mjs`; recorded results and digests are in the four `evidence/container-*` / `evidence/proxy-smoke-*` JSON files dated 2026-10-28. Lint, Caddy and Compose validation passed. Existing full application/browser suites were not rerun for these Docker/operator-only changes; their previous results remain separately dated.

Offline Trivy scans removed 18 npm findings after runtime cleanup, but still report 7 critical/264 high package-advisory occurrences in Debian/media libraries and 10 high in Caddy's image/dependencies. These are scanner classifications, not confirmed exploits; one reviewed zlib alert concerns code Debian says is not built into its Bookworm binary. No blanket exceptions or clean-security claim were added. Package/license inventory and report hashes are saved; further triage/remediation and license review block public promotion.

The Windows-loopback proxy attempt failed; successful HTTPS evidence is explicitly limited to an isolated Docker network. Stopped temporary services after verification. Preserved real Twitch data, the user-approved OBS release and normal Windows launchers. Public hosting, external TLS/OAuth, independent viewers, human accessibility, load and presentation remain.

## 28 October — tested dependency hardening

The next task replaced the Linux Bookworm/media tree with Node 24/Trixie and checksum-locked FFmpeg 9.0.2 source plus four upstream patches. Queried the source commit against OSV: two relevant advisories received backports, three involve absent network formats. Reproduced the original HDR serialization assertion failure and encryption-list stack crash before patching; both pass afterward, as do upstream encryption-metadata tests. The custom source binary is not covered by OS-package scanning, so source evidence is recorded separately.

Built a non-root static Caddy proxy from official modules, Go 1.27.3 and locked dependencies, disabled its admin endpoint and removed unused modules. A final scan identified two additional x/net fixes; updated to v0.62.0, rebuilt and repeated all five HTTPS checks successfully. No suppressions or blanket advisory waivers were used.

Final observed checks: three media security regressions, nine complete container workflow/restore checks, five private-network HTTPS/Range/SSE checks and runtime privilege/linkage checks passed. Final offline scans: app 163 occurrences (zero critical, 43 high); proxy two (one high, one unknown). The earlier baseline was seven critical and 274 high across both images. Remaining findings have explicit scope and limitations in DEPENDENCY_SECURITY.md; public security/license acceptance remains pending. Source/license notices and patch hashes are retained. The separate Windows FFmpeg installation was not patched by this Linux task.

Development failures were corrected rather than counted as passes: missing C build headers, a changed FFmpeg format-output parser, the verification script's outdated SQLite binary path, and a mismatched scanner cache mount. Runtime linkage now checks the binary actually loaded. The final scan used the existing cached database offline. The unchanged app/browser suites were not rerun; their earlier 58-test/six-browser results remain separately scoped.

Evidence and exact final image identities: `evidence/dependency-hardening-2026-10-28.json`, `hardened-container-2026-10-28.json`, `hardened-proxy-2026-10-28.json`, `runtime-boundaries-2026-10-28.json`, `media-security-regressions-2026-10-28.txt`, `ffmpeg-source-2026-10-28.json`. Local Compose tags select the tested images; all temporary app/proxy services were stopped. No secrets, images or private recordings were uploaded. Next independent task is local capacity measurement; public hosting, human accessibility, independent-viewer broadcast and presentation remain.

## 28 October — measured load and accessible media alternatives

Built offline synthetic vote/video harnesses and measured the real validation/SQLite path: 1,000 accepted votes over 30 seconds, 2.618 ms transaction p95, 3.362 ms scheduled p95. A finite burst exposed 1.062 s scheduled p95 backlog, which is retained rather than concealed behind transaction timings. A 1,024-pending-handler cap now interrupts overloaded rounds, verified by a 1,100-message regression. Ten private HTTPS clients delivered exact media ranges at 85.72 ms p95; no live Twitch load or public-capacity claim.

Added separate, revision-bound English WebVTT captions and text alternatives. Server validation, immutable storage, approval hashes, public setup-only projection, session-gated reveal tracks and revocation are tested. Browser debugging fixed caption fields whose implicit labels became unstable after saving text; native caption tracks load on desktop/phone emulation, and text appears at the correct spoiler boundary. Existing approved media was preserved; prepared human-review drafts instead of changing a published release.

License inventory found unused development packages inside pnpm's virtual store despite earlier top-level absence checks. Rebuilding a fresh offline production tree reduced 224 stored packages to 85; a deeper smoke assertion prevents regression. Collected original notice files and retained the unresolved notice/source/license gates. The final scan still shows 43 app high occurrences and the unchanged proxy one high; no false clean-security claim.

Final verification: 61 application tests, 6 browser workflows, 26 axe audits with zero automatic violations, typecheck/lint/build, 9 container checks, 5 HTTPS checks and runtime-boundary checks passed. Sources and numbers are linked from the latest PROGRESS entry. Saved an eight-slide editable deck using actual local rehearsal screenshots and honest limitations, plus a submission description/storyboard/checklist. No final video or public submission has been fabricated or posted.
# Minimal runtime and source-release preparation — 28 October 2026

The user's request was to finish remaining areas one at a time and identify their own actions. Began with deployment security/license preparation. Built a scratch-based Linux x64 runtime from only required binaries/libraries, retained CA certificates, package provenance and full license texts. Retrieved the missing abstract-logging notice from its bundled README's upstream link. Prepared a full MIT proposal for original code but left it unapplied pending the user's explicit choice.

Final observed evidence: production build and runtime-script lint/formatting passed; 9 isolated workflow/recovery checks, 5 private HTTPS checks and runtime hashes/privilege/license checks passed on the final image. A credential-free Twitch request verified DNS/TLS and returned 401; it is not a sign-in or live voting test. Offline app scan now has 0 critical / 0 high / 17 medium / 9 low findings, versus the previous 43 high occurrences. Proxy retains 1 high / 1 unknown. Every remaining application finding and exact image/report hash is in `evidence/minimal-image-review-2026-10-28.json`; package metadata was retained and no exclusions added. Early symlink-copy and VDSO inventory failures were fixed before passing checks.

Promoted only the local image tag and retained the earlier image for rollback. No public deployment, external messages, binary publication, original-content approval or live Twitch change occurred. Source-only submission is prepared; binary corresponding-source provision remains a separate gate if images are distributed. Human accessibility, independent-viewer broadcast, public-host acceptance, final video/repository/submission and user decisions remain visible in PROGRESS.md. The separate Windows runtime is outside this Linux assessment.

## Delegated license decision and next hosting step — 28 October 2026

The user explicitly asked Codex to make the license decision and proceed. Applied MIT, copyright 2026 Anish, to original code and five workspace manifests while retaining upstream terms. Docker now includes the root license. Refreshed the private source package and verified integrity, exact known-secret absence and all extracted file hashes. A clean extraction built successfully with frozen dependencies and passed nine isolated container workflow/recovery checks plus exact license retention. Media/base build cache was reused; this is not a fresh-host or public-live test. Final documentation/evidence refresh has identical build inputs. Exact image/archive identities and limits are saved under docs/evidence.

Researched official provider prices and prepared a 2-vCPU/4-GiB DigitalOcean Basic/Regular plan at US$24/month before tax and separately quoted extras. Asked only for the spending route because the user had not supplied a hosting budget. No paid resource, new account, DNS change, public upload or deployment occurred. License is complete; public host/load/recovery, human accessibility, consenting independent viewers, final footage/repository/submission remain.

## Judge-ready local evaluation — 28 October 2026

After the user chose to continue the no-paid-host submission path, implemented a credential-free Windows setup and fixed loopback demo launcher with an original generated fixture. The setup uses pinned pnpm through npx, Node 24.22.1 or newer Node 24, checksum-verified Windows FFmpeg and isolated data/cookies. Strip inherited Twitch credentials and dotenv overrides from child processes and force the demo configuration. These conveniences do not loosen the application's production or media-access rules.

A fresh source copy installed and ran successfully using the existing machine's build tools/dependency cache. Browser automation exercised the actual upload/render/review/publication/choice/reveal path and separate-session gate; repeat preparation preserved data. TypeScript, lint, PowerShell and actual CMD launch passed. Early sandbox browser/network attempts failed; final verification used both test server and browser in the normal local context, without changing firewall settings. Automation used muted generated media and cannot establish human accessibility acceptance. No real release was modified or approved by automation.

Recorded the setup scope and results in `evidence/judge-setup-2026-10-28.json`, wrote `JUDGE_GUIDE.md` and refreshed the private source bundle. Linux/proxy build inputs are unchanged from the previously tested licensed extraction. No paid hosting, external publication or new Twitch session was performed. Next human input is review of actual captions/audio, keyboard and screen-reader behavior; public launch remains deferred.

## Human caption content accepted — 28 October 2026

Used a read-only query to locate the active J8QL release's exact revision-2 setup/reveal assets, verified both hashes, and played them with the proposed WebVTT files in a private loopback review page. Anish explicitly confirmed all three requested content checks: readable/accurate captions, no outcome in setup, and audible reveal tone matching the caption. Recorded exact hashes and user response in `evidence/human-caption-review-2026-10-28.json`.

The review page is separate from the app, and the published release remains unchanged. Do not treat this as final in-app revision approval, complete descriptive-text review, physical keyboard/screen-reader acceptance or WCAG certification. Prepared the actual isolated demo replay for the next user keyboard check. No live provider connection, public exposure, source publication or submission occurred.

## Guided keyboard feedback and comparison-heading fix — 28 October 2026

Anish followed the keyboard replay instructions and supplied the final B/B comparison with synthetic A=5/B=7 and total=12. Initial focus was positioned by the assistant; the result is recorded as a guided core workflow, not an independent full-site audit. Browser observations confirmed automatic focus on choice/reveal/comparison controls.

Human testing found the static “Different choices” heading was misleading for identical choices. Added a direct choice comparison to the heading in the project source and the matching running judge copy. TypeScript and targeted ESLint passed; actual reveal playback showed “Same choice. One real outcome.” with B/B and unchanged counts. No domain/media/live-vote behavior changed. Final archive/images must be refreshed because their earlier verification predates this frontend correction. Spoken screen-reader and physical-phone review remain outstanding.

## Actual captioned revision reviewed and published locally — 28 October 2026

Created and verified a stopped private backup, started the local real-mode app and used its authenticated Studio controls to unpublish/revise J8QL. Revision 3 retains the approved cut points and byte-identical video outputs, adding the exact earlier human-reviewed caption files and separate descriptions. A read-only verification found unchanged REAL_TWITCH A=1/B=0 history, no active release, and NEEDS_REVIEW status. No SQL state mutation or fabricated approval was used.

Played both ten-second application previews with sound unmuted and captions showing; displayed the text alternatives and saved a private review screenshot. Replayed both at Anish's request, then received explicit “Yes — approve and publish locally” confirmation. Applied approval and publication through Studio. Release 2 is active; revision 3 is APPROVED with the expected review hash. Six focused API checks passed for neutral setup projection, caption hashes, successful own-session reveal and description, other-session rejection, stale-release revocation and unchanged REAL_TWITCH A=1/B=0 history. One personal replay choice was saved by this verification; no Twitch vote was sent. The browser showed the published setup text and English track.

Evidence is in `evidence/j8ql-captioned-revision-2026-10-28.json`. An initial sandbox-localhost request was denied; the same check ran successfully with approved loopback access, without a firewall change. Narrator speaker confirmation remains unresolved; UI labels are not proof of spoken output. No public release, hosting purchase or submission was made. Source archive v4 and prior images remain stale relative to the frontend correction and latest documentation.

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
