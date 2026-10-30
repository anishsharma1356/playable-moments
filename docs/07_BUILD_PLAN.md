# Build order — do not reopen idea selection

No hour estimates are commitments. Each milestone has an observable gate. Use the simplest implementation that satisfies the gate and preserve working behaviour in version control.

## M0 — Foundation and domain contract
Read the spec, inspect the workspace, scaffold strict TypeScript workspaces, choose compatible pinned dependencies, create SQL migrations and the domain state machine. Create test fixtures with explicit DEMO provenance. Implement configuration validation and `pnpm doctor`. Required scripts: dev/build/lint/typecheck/test/test:e2e/db:migrate/demo:seed/doctor.

**Gate:** migrations execute from an empty DB; domain tests prove first-vote policy, one-open rule, atomic snapshot, immutable release representation, and no live/replay tally mixing. No arbitrary mock API in real mode. Commit and report.

## M1 — Complete local replay vertical slice
Implement small owner-only local demo screens, safe upload, private master, edit revisions, two processed assets, actual-output review, immutable publication, public manifest, choice transaction, protected reveal, and comparison. Include at least one original generated media fixture. DEMO owner bypass only on loopback with explicit mode; never in production.

**Gate:** a second local browser session can watch setup, choose, reveal, and compare; Playwright/network tests prove no pre-choice leakage; protected Range serving and refresh work; a real local file can be processed. Do not call this Twitch integration. If media timing/serving fails, fix it before cosmetic polish.

## M2 — Real Twitch path early
Implement developer-console setup instructions, OAuth, broadcaster allowlist, token storage/validation/refresh, EventSub subscription, explicit moment code parser, first votes and lock, interruption rules, and real read-only overlay. Keep the existing domain API, do not replace it with ad-hoc UI state.

**Gate:** real authorised channel messages reach the persisted tally; duplicate/late messages behave as specified; a real stream displays the overlay. Mock events are not evidence of passing. Credentials and consent require the user; continue other implementation only while clearly reporting that manual blocker.

## M3 — Production review, publication, and error recovery
Replace any local demo-only auth with the real creator session on real mode; complete content/version-bound approvals, job retry/recovery, revocation, deletion, owner-only media, private projections, CSRF and upload hardening. Finish all UI states and mobile replay.

**Gate:** one live-voted moment with an uploaded recording survives review and is replayed by another browser; live numbers do not change; wrong-session or pre-choice reveal requests fail; reconnect/restart cases are documented and tested.

## M4 — Deploy and measure
Containerise one instance with persistent volume and HTTPS. Configure callback/Origin/SSE/Range/proxy settings, test restart/backup restore, execute local labelled load checks, and record actual results. Run a fresh-machine setup from the README. Do not add CDN, Redis, multi-tenancy, or automated recording unless a specific required gate truly cannot pass without it.

**Gate:** the public replay URL works from a separate device; creator controls remain protected; media/data persist after restart; no secret in repository/history; measured results and limitations are honest.

## M5 — Polish the story, not the feature list
Refine the short original question, readable overlay, two-choice replay, final comparison, and review workflow. Prepare the slide story and <3-minute demo in `docs/08_PRESENTATION_AND_DEMO.md`. Preserve genuine Codex evidence and the required session ID through documented current UI/CLI routes; do not invent an ID.

**Gate:** a reviewer can understand the interaction without a long Twitch tutorial, see real input, and distinguish live responses from replay responses. Never use DEMO participants as alleged real users.

## Follow-on prompts
### After M1
“Read PROGRESS and M2. Implement OAuth and the real broadcaster EventSub path with the minimum scope, first-vote domain policy, deduplication, interruption handling and overlay. Keep existing local replay working. Run automated checks and list the manual live test required. Stop after the M2 gate.”

### After M2
“Complete M3 without expanding scope. Audit every public response for spoilers, enforce media and attempt ownership, implement review invalidation, versioned publication, upload/job failures and deletion. Run API and browser tests, report actual results, and stop at M3.”

### After M3
“Implement M4 deployment and run the specified labelled local load tests. Measure rather than claim capacity. Verify separate-device replay and persisted restart behaviour. Produce a deployment/runbook and current known limitations.”

## Scope-cut order if time becomes tight
Cut optional automatic timing suggestions, replay completion analytics, custom thumbnails, style customisation, multiple saved examples, and export/share embellishments. Do **not** cut genuine Twitch evidence, creator media review, separated media, access control, immutable snapshot, or explicit DEMO labels. Do not substitute a fake working video for an unimplemented feature.
