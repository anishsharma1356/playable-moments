# Playable Moments — implementation handoff
> Historical specification, preserved from 26 October 2026. Its statements about code not existing describe the original handoff. The application has since been implemented; use [the current README](../README.md), [judge guide](JUDGE_GUIDE.md) and [observed progress](PROGRESS.md) for runnable instructions and verified status.

**Architecture baseline:** 1.0 • **Prepared:** 26 October 2026

**Build this project, not GridPing, CrowdLab, or another earlier idea.**

Playable Moments captures a real Twitch audience decision, preserves its historical result, and lets a later viewer make a personal choice before watching the actual outcome. A creator reviews the video boundaries before publishing. A replay choice never changes the recorded outcome or the live vote snapshot.

## What this package is
A build specification and contract kit for Codex: architecture, screen behaviour, state machines, database DDL, endpoint contract, security requirements, acceptance tests, milestone prompts, and a presentation/demo story. **It is not the completed application.** Contracts and reference checks do not establish a functioning Twitch integration, production security, performance, or adoption.

## Start here
1. Create a fresh project directory and place this package's contents at its root. Preserve any existing work; do not overwrite a different project blindly.
2. Open that directory in Codex.
3. Paste `CODEX_START_HERE.md` into the first project conversation.
4. Codex should implement **M0 and M1** from `docs/07_BUILD_PLAN.md`, not merely produce another plan.
5. Complete Twitch registration and authentication at M2 using `docs/03_TWITCH_INTEGRATION.md`. Never paste a token or client secret into chat.

No JavaScript application or package scripts exist yet. Commands described in the implementation documents are requirements for Codex to create, **not commands already made operational by this handoff**.

## Files
| File | Purpose |
|---|---|
| `AGENTS.md` | Durable implementation instructions and non-negotiable invariants. |
| `CODEX_START_HERE.md` | First execution prompt. |
| `ARCHITECTURE.md` | The central design, responsibilities, topology, and decisions. |
| `docs/01_PRODUCT_AND_SCREENS.md` | Complete interaction flow and UI requirements. |
| `docs/02_STATE_AND_DATA.md` | Lifecycles, counting policy, concurrency, persistence, and privacy. |
| `docs/03_TWITCH_INTEGRATION.md` | OAuth, EventSub, scopes, reconnects, and manual setup. |
| `docs/04_MEDIA_AND_REPLAY.md` | Recording, review, transcoding, protected reveal, and playback. |
| `docs/05_API_AND_EVENTS.md` | Endpoint semantics, access matrix, request examples, SSE. |
| `docs/06_SECURITY_DEPLOYMENT_TESTS.md` | Security, deployment, failure matrix, and acceptance tests. |
| `docs/07_BUILD_PLAN.md` | Milestones, stop conditions, and follow-on Codex prompts. |
| `docs/08_PRESENTATION_AND_DEMO.md` | Slide story, speaking notes, and a less-than-three-minute demo script. |
| `docs/10_REPOSITORY_MAP.md` | Exact target source tree and dev-origin convention. |
| `assets/ui-wireframes.html` | Static screen layout reference, not an implemented app. |
| `docs/09_SOURCES_AND_ASSUMPTIONS.md` | Official sources and design assumptions. |
| `contracts/schema.sql` | SQLite reference DDL. |
| `contracts/openapi.yaml` | Planned API contract, not implemented endpoints. |
| `contracts/replay-public.schema.json` | Strict spoiler-safe public manifest schema. |
| `contracts/replay-unlock.schema.json` | Strict choice-accepted response schema. |
| `diagrams/*.mmd` | Editable Mermaid architecture/sequence/state maps. |
| `diagrams/architecture.svg`, `.png` | Deterministic rendered system map. |
| `examples/` | Explicitly simulated payloads for development tests. |
| `.env.example` | Required settings, with no credentials. |
| `checks/` | Checks for the handoff's contracts; not full application tests. |

## Scope at a glance
One creator, one channel, two options per moment, one accepting moment at a time, first accepted vote per Twitch account, a frozen live snapshot, creator-owned MP4 upload, reviewed setup/reveal segments, anonymous replay sessions, creator-approved publication.

**Default architecture:** React/TypeScript + Fastify/TypeScript + SQLite + FFmpeg. One deployable application; Twitch sends events to an outbound server-side WebSocket; browsers receive safe projections through Server-Sent Events (SSE). No Kafka, Redis, Kubernetes, runtime LLM, game integration, or Twitch Extension.

**Three promises we deliberately do not make:** guaranteed spoiler prevention without human review; 1,000 simultaneous video viewers on a laptop; winning a prize.

## Contract check
If Python and PyYAML/jsonschema are available: `python checks/check_pack.py`.
If FFmpeg and FFprobe are also available: `python checks/check_media_boundaries.py`.
These commands check this handoff's reference artifacts. Actual application commands, browser tests, Twitch tests, and deployment tests must be implemented and executed by Codex.
