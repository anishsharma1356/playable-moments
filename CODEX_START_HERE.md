# Codex starting prompt — Playable Moments

> Historical starting prompt from the original handoff. The application is now implemented. For current setup and verified remaining work, read [README.md](README.md) and [docs/PROGRESS.md](docs/PROGRESS.md); do not restart implementation from this archived prompt.

We are now building **Playable Moments**. Do not reopen brainstorming or implement GridPing, CrowdLab, BlindBuild or another earlier concept.

## Background and objective

I am an experienced backend engineer in India and new to Twitch development. I will use Codex to develop the application, configure my accounts myself, test the real integration, and present the product. I need both a functioning first version and a clear presentation/demo story.

**Product promise:** A person who missed a live Twitch decision can make their own choice before seeing its real recorded outcome.

Example: during an original Red Door / Blue Door scene, live viewers choose A or B. The creator locks responses, makes a real choice, and records what happened. After reviewing an authorised recording, the creator publishes a replay. A later viewer watches the setup, chooses, and only then accesses the actual reveal and the original live comparison. A replay choice never changes what happened or the historical live counts. The workflow, not a new door game, is the product.

## Competition context and links

Event: **Codex x TwitchCon Hackathon**. The brief is to use Codex for a useful or entertaining Twitch-connected interaction. Our entry targets audience participation and streamed-content enhancement. [Official overview]

- Overview / registration: https://twitchcon-codex.devpost.com/
- Rules: https://twitchcon-codex.devpost.com/rules
- Resources / FAQ: https://twitchcon-codex.devpost.com/resources

Official deadline baseline: **2 November 2026, 14:00 Pacific**. The full context note flags the FAQ time-conversion discrepancy; verify before submitting.

The four equal criteria are innovation, impact, implementation and design. Maintain real Twitch/Codex evidence and a runnable submission. Read `docs/00_COMPETITION_CONTEXT_AND_LINKS.md` for the dated requirement summary, complete URL directory, submission checklist and source conflicts. Do not represent project choices as organiser mandates.

## How we intend to address the judging criteria

- Demonstrate one connected live-to-replay interaction rather than a generic quiz website.
- Show a genuine replay participant choosing before the reveal; never invent adoption or retention statistics.
- Build correct vote capture, historical snapshots, reviewed split media and session-bound replay access; record Codex's actual contribution.
- Make the creator workflow and viewer setup → choice → reveal → comparison easy to follow.

No guarantees of novelty, demand, prize money or native Twitch adoption. The user also needs a presentation; retain the storyboard in `docs/08_PRESENTATION_AND_DEMO.md` and keep it consistent with working features. That storyboard is not an already-built slide deck.

## Read this package in order

1. `AGENTS.md`
2. `docs/00_COMPETITION_CONTEXT_AND_LINKS.md`
3. `ARCHITECTURE.md`
4. `docs/01_PRODUCT_AND_SCREENS.md`
5. `docs/02_STATE_AND_DATA.md`
6. `docs/04_MEDIA_AND_REPLAY.md`
7. `docs/05_API_AND_EVENTS.md` and `docs/06_SECURITY_DEPLOYMENT_TESTS.md`
8. `docs/07_BUILD_PLAN.md` and `docs/10_REPOSITORY_MAP.md`
9. `contracts/schema.sql`, `contracts/openapi.yaml`, and the relevant acceptance tests.

Read `docs/03_TWITCH_INTEGRATION.md` before M2. The contracts and architecture remain baseline 1.0; this context revision does not authorise changing them silently.

## Fixed first-version design

One allowlisted broadcaster; exactly two options; one open moment per channel; first accepted vote per account. Commands are `!pick <moment-code> A` and `!pick <moment-code> B`; the generated code prevents delayed votes from entering a later round.

Use React/TypeScript, Fastify/TypeScript, SQLite, server-side EventSub WebSocket intake and browser SSE. FFmpeg/FFprobe run as bounded subprocesses. This is one application, not microservices, and has no runtime AI dependency.

The creator manually uploads a short authorised MP4, chooses four source cut offsets, and reviews the actual processed SETUP and REVEAL outputs. Keep the master private. Publish a version only after approval. Before the replay visitor chooses, do not disclose reveal media, creator choice, actual outcome or historical option results. Store personal replay choices separately from live responses.

No automatic OBS recording, VOD import, alternate endings, game integration, Twitch Extension, multi-channel SaaS, leaderboard, payment system or public viewer uploads. Do not assume private Twitch code, an existing audience, unlimited Codex quota, cloud credits, or a paid runtime API budget.

## Key setup URLs and addresses

Developer console (I perform account setup): https://dev.twitch.tv/console/apps
App registration guide: https://dev.twitch.tv/docs/authentication/register-app/
Chat example: https://dev.twitch.tv/docs/chat/chatbot-guide/
Chat authentication: https://dev.twitch.tv/docs/chat/authenticating/
OAuth: https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
EventSub connection: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
Chat event subscription: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage
OBS overlay guide: https://obsproject.com/kb/browser-source
Codex guidance: https://developers.openai.com/codex/learn/best-practices

For local development preserve:
- UI: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Registered OAuth callback: `http://localhost:3000/auth/twitch/callback`

These addresses are planned; do not claim that services are running before starting and checking them. The full context file separates documentation links, runtime endpoints, local addresses and future hosted URLs. Never ask me to paste tokens, app secrets or stream keys into the conversation. Explain how I set them locally.

## Execute M0 and M1 only

Inspect the workspace and preserve any user changes. Scaffold the specified app with compatible pinned dependencies, implement the domain/state machine and migrations, then complete:

**upload → edit boundaries → render → review processed outputs → approve → publish → watch setup → choose → watch actual reveal → comparison.**

Use clearly marked DEMO data and original synthetic media initially. Do not call this live Twitch verification. Demo owner access must be loopback-only, never a hosted admin bypass. Protect media routes and handle refresh, retries, bad uploads and wrong-session access as specified.

Run the relevant tests. Never claim a test passed if not executed. Update `docs/PROGRESS.md`, `docs/CODEX_EVIDENCE.md` and necessary decisions. If a reference contract contains a genuine inconsistency, explain and fix it alongside implementation without inventing unrelated features. Official rules take precedence where genuinely applicable; inaccessible sources must be labelled unverified, not guessed.

At the end provide:
1. Working capabilities and remaining gaps.
2. Exact startup and test commands, with observed results.
3. A manual walkthrough for one local playable moment.
4. Files changed and any justified contract changes.
5. The manual account/OAuth/OBS steps needed for M2, without requesting secrets.

Stop after the M1 gate. M2 is the next separately authorised task: genuine Twitch authorisation, EventSub intake, live voting and the read-only OBS overlay. Do not return only another plan; implement this requested local milestone.
