# Playable Moments — competition, product background, and URL guide
**Handoff revision 1.1 · Checked 26 October 2026 · Architecture baseline remains 1.0**

Read this before implementation. This is a context addition to the existing build specification, not a new architecture or a completed application. The selected project is **Playable Moments**. Do not reopen the earlier GridPing/CrowdLab idea comparison.

## 1. The competition and the reason for this project

**Codex x TwitchCon Hackathon** is an online contest for original Twitch-connected experiences developed with Codex. The organiser presents three directions: creator collaboration, audience participation, and enhancement of streamed content. The advertised cash pool is $25,000, distributed as $10,000 / $6,000 / $4,000 / two awards of $2,500. [C01]

Primary pages:
- Overview and registration: https://twitchcon-codex.devpost.com/
- Binding rules: https://twitchcon-codex.devpost.com/rules
- Resources and FAQ: https://twitchcon-codex.devpost.com/resources

Our positioning is **audience participation plus content enhancement**. A recording can preserve the footage without reproducing a live decision for a new viewer. We are building a connected workflow that reuses that live decision in a replay. This is a product hypothesis, not a measured claim that all Twitch interaction disappears or that a mass market is established.

The user is an experienced backend engineer, new to Twitch development, building primarily with Codex, and will also present the product. Prefer one complete understandable interaction over a large platform. The project is a third-party application, not code inside Twitch's own website or mobile app.

## 2. Official requirements — concise source summary

### Rules [C02]
Work must be newly created in the submission window: **23 October 2026, 10:00 Pacific–2 November 2026, 14:00 Pacific**. It must run as demonstrated and use authorised integrations/assets. Individuals and eligible teams can enter; consult all eligibility/conflict exclusions rather than assuming acceptance from residence alone. After a viability screen, innovation, impact, implementation, and design have equal weight; ties consider them in that order. Materials must be English or accompanied by English translations. Supply judging access through the evaluation period; meet the rules' ownership, licensing and submission conditions. This brief is not a complete substitute for the rules.

### Deliverables and resource guidance [C03]
Provide runnable source/assets/setup instructions, a project description explaining Codex's role, the main build session ID, and a YouTube demonstration under three minutes showing Twitch functionality and Codex use. The FAQ points to `/status` for the ID. It permits standard libraries, starters, and additional AI coding tools. Entry is free and online; attendance is unnecessary. Extension review may take 5–14 days. It describes limited free Codex access; actual account access must be checked. Save a draft, then explicitly submit it; do not mistake a saved project for submission.

### Source discrepancies — do not silently resolve them
- **Time:** the rules give 14:00 Pacific on 2 November. Converting with `America/Los_Angeles` gives **22:00 UTC on 2 November / 03:30 IST on 3 November 2026**. The FAQ separately lists 21:00 UTC, which conflicts. Use the rules' Pacific time as our baseline, verify the live countdown or ask the organiser, and do not leave submission to the final hour. This conversion is ours, not a copied FAQ conversion.
- **Video visibility:** the rules call for publicly visible YouTube media; the FAQ explicitly accepts unlisted. Our conservative project choice is a **Public** video, not a Private one. Recheck if using Unlisted.
- **Local recordings:** the pages do not explicitly require replay media to be hosted by Twitch. Our use of creator-authorised uploads is an interpretation, not individual organiser approval. Real Twitch functionality remains required; seek clarification if the organiser raises a concern.

These links were read on the stated date. Future changes must be recorded in `docs/DECISIONS.md`; official requirements take precedence over our local design choices when they conflict.

## 3. Product background in plain language — our selected design

**Tagline:** Make your choice before the reveal.

**Hinglish:** Aap live miss kar gaye, phir bhi asli result dekhne se pehle apni choice kar sakte ho. Replay ki choice recorded result ya purane live votes ko change nahi karti.

Three roles:
- **Creator/broadcaster:** hosts the live activity, starts and closes questions, records the actual choice/outcome, and reviews media before publishing.
- **Live participant:** watches Twitch and submits an A/B response for the current moment.
- **Replay participant:** visits our replay page later, watches the setup, chooses A or B, and then watches the real recorded outcome.

An **OBS overlay** is our read-only webpage displayed in the broadcast. A **moment** is one question, its options, accepted live responses, creator decision, outcome, and reviewed media. A **release** is a published immutable version of that moment.

### Example — original Red Door / Blue Door demonstration
1. The creator shows an original scene and asks which door leads to the treasure. The scene is recorded locally with permission.
2. The application opens a moment with a generated code, for example `K7P2`.
3. Live participants send `!pick K7P2 A` (Red) or `!pick K7P2 B` (Blue). Codes are mandatory; bare `!pick A` is not the final command contract.
4. The creator closes voting. The first accepted response per Twitch account is frozen in the historical snapshot.
5. The creator separately records the actual choice and observed outcome. Audience majority does not force a creator action or imply which option is correct.
6. The creator uploads the authorised recording, selects four cut boundaries, and reviews the actual rendered SETUP and REVEAL segments, including audio.
7. After approval, the application publishes a replay. The replay browser receives the setup but not the reveal or historical results before a choice.
8. A later viewer chooses A or B. The server records that personal choice separately and enables the real reveal. The final screen compares that choice, the creator's actual choice, the observed outcome, and the original participating audience.

Synthetic counts and media used during M0/M1 must be clearly labelled DEMO. They cannot be relabelled as genuine Twitch participation. No alternative ending is created when a replay viewer chooses differently.

### Intended initial use cases
Original puzzle/challenge decisions and coding/educational demonstrations with a short, clear setup and observable outcome. These are target hypotheses, not verified adoption. Do not introduce commercial-game integrations, copyrighted footage without permission, arbitrary code execution, or universal automatic moment detection to support the examples.

### What the innovation argument is
A live question and response record are reused within a reviewed interactive replay rather than manually re-created as a separate quiz. Polls, video editing, and interactive video already exist. Do not claim a world-first, guaranteed repeat usage, native Twitch adoption, or a prize probability.

## 4. What we control and what we do not

**Our control:** the application UI/backend, accepted message parser, database, local media processing, replay access rules, setup instructions and deployment.

**Documented integration:** a registered Twitch app, broadcaster-authorised chat reading, EventSub WebSockets, and an OBS Browser Source. The Twitch authentication and WebSocket guides establish this route; they do not give us unrestricted accounts, game internals or native-client control. [T02–T09, O01]

**Resources not promised by the contest pages:** private Twitch code, paid hosting, GPUs, unlimited Codex access, runtime model credits, a free CDN, staff implementing our integration, a pre-existing audience or a guaranteed second creator. Do not mark those as organiser-provided.

**Human steps:** register the contest and developer app, authorise Twitch, configure OBS, supply lawful media and real testers, approve outputs, record the presentation, and submit. Codex may prepare instructions and code; it must not pretend those actions were completed.

**Our MVP choice:** no runtime AI, Twitch Extension, automatic VOD import, automated OBS control or multi-channel onboarding. These are scope decisions, not blanket contest bans. We use manual MP4 upload and split encoded segments; ordinary replay playback ends at the setup boundary without relying solely on a JavaScript pause timer. Review remains necessary because a setup can already contain spoken/visual spoilers.

## 5. Judging evidence — our build and presentation plan

The criterion labels come from [C02]. The evidence below is our plan, not a promise of scores.

| Criterion | Evidence we want to show | What must not be fabricated |
|---|---|---|
| Innovation / Idea | One question captured live becomes a usable replay interaction without retyping it. | Claims that quizzes or interactive video did not previously exist. |
| Potential Impact | A genuine participant can choose before the real reveal; show creator work and review honestly. | Invented demand, time saved, retention, or viewer counts. |
| Technological implementation | Real EventSub intake, correct counting, immutable historical data, reviewed private media, protected replay, executable tests and visible Codex contribution. | Calling mock events live, or reference checks full application verification. |
| Design | Clear setup → choice → reveal → comparison; readable overlay and mobile replay; manageable creator controls. | A polished concept mockup described as working functionality. |

Presentation is a separate user requirement. The package supplies an eight-slide storyboard and short demo script in `docs/08_PRESENTATION_AND_DEMO.md`; no completed PowerPoint is included. Build in a way that can support that story, but never fake product behaviour to make the presentation easier.

## 6. URL directory — external links to use

### Contest and submission
| ID | URL | Use |
|---|---|---|
| C01 | https://twitchcon-codex.devpost.com/ | Understand the brief; use Join Hackathon and the submission interface. |
| C02 | https://twitchcon-codex.devpost.com/rules | Final authority for entry, new work, judging, access and content obligations. |
| C03 | https://twitchcon-codex.devpost.com/resources | FAQ and public development resources. |
| C04 | https://twitchcon-codex.devpost.com/discussions | Official contest discussion route; use the live page for organiser contact details. |
| C05 | https://github.com/ | One supported repository provider; the user's repository has not been created by this handoff. |
| C06 | https://www.youtube.com/ | Publish the submission demonstration using the user's account. |

### Accounts and tools
| ID | URL | Use |
|---|---|---|
| A01 | https://www.twitch.tv/ | Creator/test-viewer accounts and real stream/chat. |
| T01 | https://dev.twitch.tv/console/apps | Sign-in-gated developer console: register the app and exact callback. |
| T02 | https://dev.twitch.tv/docs/authentication/register-app/ | App-registration instructions, including verified email and 2FA. |
| X01 | https://chatgpt.com/codex | Contest-linked Codex entry point; use the user's available surface/account. |
| X02 | https://developers.openai.com/codex/cli | Official CLI usage and installation guidance; record the actual installed version. |
| X03 | https://developers.openai.com/codex/ide | Official IDE-extension guidance. |
| X04 | https://developers.openai.com/codex/agent-configuration/agents-md | Durable project instructions; currently redirects to the official ChatGPT Learn site. |
| X05 | https://developers.openai.com/codex/learn/best-practices | Official implementation/review workflow guidance; currently redirects to ChatGPT Learn. |
| O00 | https://obsproject.com/download | Install OBS from the official provider for the actual operating system. |
| O01 | https://obsproject.com/kb/browser-source | Add the app's read-only overlay to OBS. |
| O02 | https://obsproject.com/kb/quick-start-guide | Configure sources, audio and a test recording/broadcast. |

### Documentation Codex should read for M2
| ID | URL | Use |
|---|---|---|
| T03 | https://dev.twitch.tv/docs/chat/chatbot-guide/ | Official local EventSub chatbot example; adapt to our read-only scope instead of copying unnecessary write permissions. |
| T04 | https://dev.twitch.tv/docs/chat/authenticating/ | Select the broadcaster-user-token route and minimum permissions. |
| T05 | https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/ | Server-side authorisation-code flow. |
| T06 | https://dev.twitch.tv/docs/authentication/validate-tokens/ | Startup/hourly token validation. |
| T07 | https://dev.twitch.tv/docs/authentication/refresh-tokens/ | Refresh and revoked-token handling. |
| T08 | https://dev.twitch.tv/docs/eventsub/handling-websocket-events/ | Welcome, subscription creation, keepalive and reconnect behaviour. |
| T09 | https://dev.twitch.tv/docs/eventsub/websocket-reference/ | Envelope message IDs, repeated deliveries and message structure. |
| T10 | https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage | `channel.chat.message` subscription requirements. |
| T11 | https://dev.twitch.tv/docs/eventsub/eventsub-reference/ | Event fields including chat identity and Shared Chat source fields. |
| T12 | https://dev.twitch.tv/docs/api/reference/#create-eventsub-subscription | Helix subscription creation; not a message sent down the WebSocket. |

### Media reference and deliberately optional integrations
| ID | URL | Use |
|---|---|---|
| M01 | https://ffmpeg.org/download.html | Obtain FFmpeg/FFprobe through an appropriate trusted installation route. |
| M02 | https://ffmpeg.org/ffmpeg-filters.html | Trim/atrim and timestamp-reset reference; implementation is in our media spec. |
| M03 | https://dev.twitch.tv/docs/embed/video-and-clips/ | Background for future VOD integration; not the chosen MVP media route. |

The contest, primary Twitch guides, Codex guides and OBS guides were inspected during this update. The console requires login, so no account-specific state was inspected. FFmpeg download/filter fetches timed out during this update; those are the official reference URLs already present in the baseline, not freshly verified installation instructions. Recheck at implementation. Some root/account links are navigation destinations, not evidence that an account, project or deployment exists.

Do not browse every optional page before building M0/M1. Read the relevant implementation guide at the milestone that needs it.

## 7. Runtime URLs — programmatic endpoints, not pages to paste secrets into

These addresses are for the server implementation described in `docs/03_TWITCH_INTEGRATION.md`:

| Endpoint | Purpose |
|---|---|
| `https://id.twitch.tv/oauth2/authorize` | Browser consent start; construct parameters server-side with validated state and exact redirect. |
| `https://id.twitch.tv/oauth2/token` | Server-only code exchange and refresh. |
| `https://id.twitch.tv/oauth2/validate` | Server-side token checks. |
| `https://api.twitch.tv/helix/eventsub/subscriptions` | Create/list/delete the authorised subscription as appropriate. |
| `wss://eventsub.wss.twitch.tv/ws` | Server's outbound EventSub connection. |

Do not call mutation endpoints during documentation inspection. No keys, stream keys, refresh tokens or access tokens belong in chat, a screenshot, a public URL or the repository. Endpoint credentials stay server-side. The initial application needs `user:read:chat`, not account-email access, clip creation, Channel Points or chat writing. Recheck the guide before changing the token model or scope. [T04–T10]

## 8. Our local addresses versus the final hosted links

These are the baseline's planned development settings, not a deployed service:

| Address / variable | Meaning |
|---|---|
| `http://localhost:5173` | React/Vite UI during local development. |
| `http://localhost:3000` | Fastify backend; the UI proxies API/auth requests as specified. |
| `http://localhost:3000/auth/twitch/callback` | Exact developer-console OAuth callback for this local configuration. |
| `http://localhost:3000/health/ready` | Planned backend readiness endpoint after implementation. |
| `APP_ORIGIN` | Exact authorised frontend origin; do not use a wildcard. |
| `TWITCH_REDIRECT_URI` | Exact registered callback; it must match the configured environment. |
| Hosted overlay URL | Copy the generated scoped read-only URL from the implemented creator dashboard into OBS. Treat its capability as sensitive; not the admin session. |
| Hosted replay URL | Copy the published replay URL generated by the application. No public domain exists yet. |

On deployment, use the selected real HTTPS origin and register `<YOUR_HTTPS_ORIGIN>/auth/twitch/callback`. Do not put the angle-bracket placeholder into the Twitch console. `localhost` on a helper's phone refers to that phone, not the developer laptop. Do not expose the demo-mode owner bypass to make a remote demonstration work.

Preserve the existing frontend/backend origin and CSRF design in `docs/10_REPOSITORY_MAP.md`. Do not introduce unrelated new routes or change the API contract merely to match an illustrative address in a pitch.

## 9. Delivery and evidence checklist — our implementation plan

- [ ] Owner joins the contest and reviews eligibility and any employer/IP restrictions.
- [ ] Preserve the chosen Codex thread and genuine session ID; redact secrets from evidence.
- [ ] Implement M0/M1 locally with explicitly labelled simulated data and authorised synthetic media.
- [ ] Complete M2 using a real authorised broadcaster and consenting live participant.
- [ ] Demonstrate a genuine vote, neutral overlay, creator media review and later replay choice.
- [ ] Run application tests; do not substitute the pack's contract checks for those tests.
- [ ] Provide complete install steps, external prerequisites, required environment variables and a reviewer-safe way to supply their own account/configuration.
- [ ] Supply original/authorised demo assets and accurate third-party attribution.
- [ ] Keep live, demo and replay counts distinguishable; do not claim 1,000-user capacity without measurement.
- [ ] Prepare the user's presentation from the existing storyboard and record a truthful short submission demo.
- [ ] Fill in actual repository, demonstration and deployed replay links only after they exist.
- [ ] Review official rules again, explicitly submit, verify the submission state, and keep the submitted version accessible as required.

No automatic registration, deployment, account verification, user study or application implementation was performed by adding this document.
