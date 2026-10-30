# Security, deployment, reliability, and test plan

## 1. Security boundaries
**Owner:** one allowlisted Twitch identity. Owner cookies are HttpOnly, SameSite=Lax, Secure over HTTPS; state changes validate Origin and CSRF. Validate ownership of every referenced object, even if its UUID is difficult to guess. No guest upload or guest admin endpoints.

**Overlay:** random revocable read-only capability, scoped to a single stream session. It exposes only a safe projection. A leaked overlay URL is not an admin token, but should still be rotated. Never include it in public screenshots, referrers, or logs.

**Replay:** separate anonymous session cookie, no owner credentials. A release's outcome and reveal route are accessible only after a committed attempt belonging to that session. Reveal media authorises before every file/Range response. Original recordings are not in a public static directory.

**Tokens and secrets:** use environment-managed 32-byte encryption/signing keys; encrypt refresh/access token blobs with authenticated encryption and a fresh nonce. Separate token encryption, session signing, and vote HMAC keys. Protect logs; no browser token storage. Rotation may require reconnecting the owner; document it.

**Untrusted input:** Zod validation + parameterised SQL; render strings as text, not raw HTML/Markdown. Commands only select A/B. No viewer uploads, code execution, URL fetches, shell expansion, or automatic game actions. Uploaded media is still untrusted: bound size/duration/resolution, decode under resource limits, use patched media tools and random private paths.

**Web delivery:** TLS in deployment; same-origin assets/APIs; restrictive CSP compatible with our own UI/media; no third-party analytics in MVP. Validate Host/Origin, set clickjacking protection on owner routes, avoid wildcard credentialed CORS, and prevent cache leakage across sessions. OBS source content may require its own framing policy; do not weaken owner pages for it.

**Data presentation:** title, poster, metadata, JSON, logs, HTML hydration and API responses must not leak the outcome before choice. Public result endpoints never reveal chatter identities. A majority is not a correct answer. Anonymous replay sessions are not unique humans.

## 2. Failure behaviour
| Failure | Required behaviour |
|---|---|
| OAuth revoked | End owner sessions, close intake, interrupt OPEN moment; published replay remains independent unless explicitly unpublished. |
| Expected EventSub reconnect | Handover and deduplicate; interrupt if handover fails. |
| Unexpected EventSub disconnect | Interrupt active voting. Never silently pretend the gap was captured. |
| Duplicate chat/notification | No extra vote or extra count. |
| Old code / late choice | Reject; do not apply to the next moment. |
| Server restart mid-vote | Recover OPEN as INTERRUPTED, preserve diagnostics, require new round. |
| Two owner tabs | expectedVersion + idempotency protect state. |
| Media upload disconnect | Remove partial temporary file; retry explicitly. |
| Disk full | Fail before further processing; no READY/publication state for missing assets. |
| FFmpeg timeout/crash | Mark failed, retain safe diagnostic, offer bounded retry. |
| Worker restart | Reclaim interrupted jobs safely, no duplicated published outputs. |
| Approval changed | Invalidate approval and re-render/review as needed. |
| Source/reveal inaccessible | Do not substitute another video or count. |
| Choice POST timeout | Same idempotency key retries return the same committed choice. |
| Unpublished while replay open | Deny subsequent protected requests; communicate version change. |
| Autoplay rejected | Visible Continue button; no autoplay requirement for correctness. |
| Viewer clears cookies | New anonymous session; do not claim fraud-proof analytics. |

## 3. Deployment requirements
One Linux host/container running the server and bounded FFmpeg children, with persistent storage, enough disk for originals + masters + outputs + temporary files, and HTTPS. SQLite uses WAL and foreign keys with a finite busy_timeout. Do not run two server replicas against the same DB. Bind the app behind a reverse proxy configured for upload limits, request timeouts, Range responses, and unbuffered SSE.

A practical **starting deployment class to test**, not a guarantee: 2 CPU cores, 4 GiB RAM, and tens of GiB of persistent disk. Restrict encoding threads and concurrency. Replaying video consumes substantial bandwidth; this is not a promise to serve 1,000 concurrent video streams. Add object storage/CDN only after the core works and authorisation is designed for it.

Recommended topology:
`HTTPS reverse proxy → application container → /data/app.sqlite + /data/media + /data/tmp`.
Do not expose SQLite, FFmpeg, the OBS WebSocket port, or internal health details to the public. OBS does not need incoming control from our server for MVP. A tunnel is acceptable for a rehearsal, but a stable persistent deployment is preferable for judging; never assume a temporary URL will survive.

Ops deliverables for Codex: Dockerfile, compose configuration with a persistent volume, `.env.example`, backup/restore instructions, non-root filesystem permissions, log redaction, health endpoints, and a reproducible deployment/runbook. Use an online SQLite backup operation or stop/checkpoint consistently; copying only the live `.sqlite` file while ignoring its WAL is not a safe generic backup process. Confirm restore includes matching media files.

## 4. Readiness checks (`pnpm doctor` to implement)
Check Node/tool versions; writable data/tmp directories; disk reserve; DB migrations; FFmpeg + FFprobe executable and H.264/AAC encoding availability; APP_MODE; origin/callback consistency; necessary secrets non-empty and correctly sized; allowlisted user configured; HTTPS in hosted real mode. Never print secret values. Twitch READY is a separate live-feature health signal.

## 5. Required tests and evidence
### Domain/unit
- DRAFT edits, freeze on open, only one OPEN moment, no reopen after lock.
- Code parser rejects ambiguous/extra input; stale code and wrong option rejected.
- First accepted vote wins; source IDs and account identity deduplication.
- REAL/DEMO isolation; no mixed snapshot.
- Lock race with a batch of vote events yields a deterministic snapshot and no post-lock change.
- Zero votes, tie, and creator choice different from majority.
- UTC versus media offset distinction; invalid/unordered/out-of-duration cuts rejected.
- Review hash changes after any relevant content/cut/output change.
- Published fields immutable; explicit revoke and republish versioning.

### API/security/integration
- Owner allowlist, expired OAuth state, wrong-state callback, CSRF, wrong Origin, owner object access.
- Invalid token interrupts voting and ends dependent sessions.
- Wrong/expired overlay key cannot reveal private fields or call mutations.
- Pre-choice manifest strictly matches spoiler-safe schema (no extra properties).
- No reveal/original/result response before authorised attempt; no URLs in HTML preload data.
- Another viewer session cannot use an attempt ID; forged option/release/asset IDs fail.
- Replay POST idempotency; different choice conflict; no update to live snapshots.
- Post-unpublish media access fails; partial HTTP Range handling works correctly.
- Upload caps, codec checks, hostile filenames, missing audio, truncated file, disk-full simulation.
- Rendering failure never publishes; repeated jobs do not overwrite approved hashes.
- Right metadata and MIME; no private cache cross-session leakage.

### Browser/UX (Playwright)
- Complete local DEMO path from upload to comparison on desktop and phone viewport.
- REAL mode pages never silently switch to demo.
- Keyboard choices, focus on pause card, reduced motion, no colour-only meaning.
- Inspect network before choice: setup fetched, reveal and outcome never fetched.
- End-of-setup stops on choice card; seeking can only explore setup file.
- Slow network, double-click choice, refresh, replay retry, browser back, autoplay rejection.
- Neutral poster/social metadata; outcome hidden until reveal finishes in ordinary UI.
- Review checks apply to rendered output and reset after a changed edit.

### Media fixture checks
Use original synthetic videos with obvious SETUP, NEUTRAL GAP and OUTCOME frames/audio; validate two output files independently. Include no-audio, variable frame rate, nonzero start/offset, and audio/video alignment cases. Verify that no outcome frames/sounds exist in setup and source file is never publicly routed. Finite fixtures do not prove semantic spoiler prevention for all videos.

### Live Twitch acceptance — mandatory manual evidence
Two genuine consenting viewer accounts; one actual broadcaster session; real `!pick <code>` commands; observed counts and lock; OBS overlay in a real stream; recorded outcome; creator-reviewed publication; another browser replays and chooses. Redact secrets. Do not fake people using synthetic accounts. Clearly distinguish a demo fixture from a live check.

### Local load testing — not a Twitch flood
Replay labelled synthetic input at 1,000 unique-account votes over 30 seconds plus duplicate and wrong-code messages. Also test a 1,000-event burst and lock during ingestion. Assert final correctness, bounded memory/queues, no lost committed votes, measured latency, and clearly recorded hardware. A proposed local target is p95 receipt-to-persist under 250ms at 35 events/sec while rendering is idle; record actual observations, never claim the target passed without measurement. An overloaded queue interrupts the round rather than silently losing valid votes.

Separately test video delivery with a modest declared number of clients. API intake throughput is not media streaming capacity. No real Twitch engagement botting for a load test.

## 6. Definition of submission-ready
One honest real-Twitch workflow passes; all critical spoiler/access/counting tests pass; setup and deployment instructions work on a fresh environment; repo has no tokens/private files; ownership/rights documented; known limitations visible; Codex evidence captured; demonstration under three minutes and presentation story prepared. Any missing gate is reported explicitly.
