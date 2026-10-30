# Sources, verification date, and assumptions
**Official references checked on 26 October 2026.** Recheck the live organiser rules and API requirements when implementing; this is not an organiser endorsement.

## What is externally established
The contest asks for a working Twitch-connected project built with Codex, source/setup material, a session ID and a short demonstration including real Twitch functionality. Its four judging criteria are equally weighted. The stated submission deadline is 2 November 2026 at 14:00 Pacific, which is **3 November 2026 at 03:30 Asia/Kolkata**. The official pages do not mandate hosting every replay asset on Twitch. Our local-recording approach is a reasonable reading, not a private ruling by organisers. Eligibility, content rights and conflict-of-interest rules remain the entrant's responsibility. [S01–S03]

Public chat/OAuth/EventSub interfaces support the selected one-broadcaster design. Standard Twitch clip embeds are not our default controllable player. The rest of this package—stack, schema, split-media workflow, limits, UI, first-vote rule, deployment and tests—is our implementation recommendation, not a contest requirement.

## No assumed resources
No private Twitch source code, control of native Twitch clients, game source/injection privileges, unlimited Codex quota, free hosting, GPU access, runtime API credit, existing streamer audience, or specific cloud provider is assumed. Runtime AI is unnecessary. Human OAuth authorisation, OBS setup, media permission and real participant testing cannot be manufactured by Codex.

## Prior conversation material
Earlier second-model notes proposed application timestamps and a zero-review pause boundary. This package deliberately supersedes those proposals with explicit creator verification and separated video outputs. Other ideas such as GridPing and CrowdLab are not implementation scope. We are not silently adopting historical competitor/novelty claims from those notes as verified requirements.

## Sources
### S01 — Contest overview
https://twitchcon-codex.devpost.com/

Used for: Twitch connection, Codex, product directions; not a promise of native Twitch integration.

### S02 — Contest rules
https://twitchcon-codex.devpost.com/rules

Used for: New work, submission window, eligibility, repository and demonstration, judging criteria.

### S03 — Contest resources/FAQ
https://twitchcon-codex.devpost.com/resources

Used for: Public developer resources, demonstration expectations, Extension review dependency.

### S04 — Twitch chat authentication
https://dev.twitch.tv/docs/chat/authenticating/

Used for: Broadcaster-user-token route, scopes and transport choices.

### S05 — Twitch EventSub WebSockets
https://dev.twitch.tv/docs/eventsub/handling-websocket-events/

Used for: Welcome/subscription sequence, handover versus unexpected loss; no missing-event replay.

### S06 — Twitch OAuth grant flows
https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/

Used for: Server-side authorisation-code flow and token handling.

### S07 — Twitch token validation
https://dev.twitch.tv/docs/authentication/validate-tokens/

Used for: Startup and hourly validation requirement.

### S08 — Twitch refresh tokens
https://dev.twitch.tv/docs/authentication/refresh-tokens/

Used for: Refresh lifecycle and safe coordination.

### S09 — Twitch app registration
https://dev.twitch.tv/docs/authentication/register-app/

Used for: Manual developer registration and account prerequisites.

### S10 — Twitch EventSub reference
https://dev.twitch.tv/docs/eventsub/eventsub-reference/

Used for: Chat IDs, sender identity, message content and Shared Chat source fields.

### S11 — FFmpeg filters
https://ffmpeg.org/ffmpeg-filters.html

Used for: Media trim/atrim and timestamp reset filters. Human review is our design, not an FFmpeg guarantee.

### S12 — Node.js release schedule
https://nodejs.org/en/about/previous-releases

Used for: Node 24 shown as LTS when checked.

### S13 — Twitch video embeds
https://dev.twitch.tv/docs/embed/video-and-clips/

Used for: VOD control versus non-interactive standard clip embeds; MVP avoids dependency on either.

### S14 — Codex AGENTS.md
https://developers.openai.com/codex/agent-configuration/agents-md

Used for: Durable project guidance can be supplied through AGENTS.md.

### S15 — Codex best practices
https://developers.openai.com/codex/learn/best-practices

Used for: Context, scope, completion criteria and verification practices.

### S16 — EventSub WebSocket message reference
https://dev.twitch.tv/docs/eventsub/websocket-reference/

Used for: Notification IDs, repeat delivery and payload schema.

### S17 — Fastify LTS
https://fastify.dev/docs/latest/Reference/LTS/

Used for: Choose a supported Fastify/runtime combination when installing.

## Verification limits
This package is a design artifact. Contract checks and the included synthetic FFmpeg check validate only stated reference files/fixtures. They do not establish that a running app, OAuth setup, real Twitch stream, server deployment, security audit, accessibility review, 1,000-user load test or product adoption test has occurred.
