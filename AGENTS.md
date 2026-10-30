# Playable Moments — project instructions

## Authority and scope
Build Playable Moments only. Read `ARCHITECTURE.md`, then the document for the current milestone. This package supersedes earlier brainstorming about GridPing, CrowdLab, or other projects. Keep the MVP small; record necessary deviations in `docs/DECISIONS.md`, with reasons. Do not silently change the product.

## Stack
Node.js 24 LTS; TypeScript strict; React + Vite; Fastify; Zod; SQLite via better-sqlite3 with versioned SQL migrations; FFmpeg/FFprobe as child processes; Vitest and Playwright. Use supported stable dependency versions and pin the actual installed versions in a lockfile. One application process plus bounded FFmpeg subprocesses. HTTP for mutations, SSE for browser updates, EventSub WebSocket for Twitch intake. No runtime AI.

## Critical invariants
1. Only ONE moment per channel accepts votes; its two options freeze on opening.
2. `!pick K7P2 A` / `!pick K7P2 B`: the code identifies the moment. A stale code cannot vote in a new moment.
3. One first-accepted vote per Twitch account per moment; deduplicate both notification ID and chat message ID. Never trust display names as identity.
4. Lock and final vote snapshot are atomic. Never reopen a locked round. A new round uses a new code.
5. Preserve REAL_TWITCH versus DEMO provenance. Never substitute mock events on a disconnected real stream.
6. An unexpected intake outage during OPEN interrupts that moment; no automatic reopening or silently complete-looking tally.
7. Live votes and anonymous replay choices are separate tables. Replay activity never changes the live snapshot.
8. Do not send creator choice, actual outcome, live option counts/percentages, reveal URLs, or original recording URLs to an unchosen replay viewer.
9. Use TWO separately encoded outputs: setup and reveal. Ordinary setup playback ends before any reveal bytes. Do not rely solely on a browser pause timer.
10. The creator reviews the actual processed files (including audio and thumbnails). Any edit creates a new revision and invalidates prior approval.
11. The full master recording is private. All state-changing requests are authorised and validated server-side. The overlay is read-only and never receives private results.
12. Published releases are immutable; unpublish/revise/republish creates a new version. Explicit erasure is allowed; silent historical rewriting is not.
13. Use original or authorised content. No game-memory injection, arbitrary viewer code, scraping/downloading Twitch media, payments, or prize guarantees.

## Work style
Implement incrementally with executable code. Inspect before editing; do not discard user changes. No claims of test success unless actually run. Distinguish unit/integration/browser checks from a live Twitch check. Never ask the user to paste secrets into chat or commit them. Do not pretend to have created external accounts or deployed anything without doing so.

## Repo target
`apps/web`, `apps/server`, `packages/contracts`, `packages/core`, `tests`, `docs`, `ops`.
Required scripts after scaffolding: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm db:migrate`, `pnpm demo:seed`, `pnpm doctor`.
Do not claim these scripts exist before creating them.

## Definition of done per milestone
List changed files; run relevant checks; report observed results; show start commands and one manual verification. Update `docs/PROGRESS.md` and `docs/CODEX_EVIDENCE.md`. Preserve useful Codex development evidence without secrets. Stop at the requested milestone, not halfway through unexplained work. Ask only for truly blocking credentials or decisions; otherwise use this specification's defaults.
