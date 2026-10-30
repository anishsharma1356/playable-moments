# Playable Moments — Devpost entry draft

Prepared 28 October 2026. Registration is confirmed in Devpost. Project draft created as **Playable Moments**, with the name and tagline saved. This document supplies the remaining story; it is not a submitted entry. No final video or repository URL exists yet.

## Name and elevator pitch

**Playable Moments**

Missed the stream? Watch the setup, make your choice, then see the real recorded outcome—without changing the original Twitch responses.

## Project story

### Inspiration

A livestream can ask viewers to choose before something happens. Someone arriving later usually sees the recording without that decision step. Playable Moments preserves the original question and real outcome so the later viewer can participate in a personal replay experience.

### What it does

The creator opens an A/B round and receives authorized Twitch chat commands. The first accepted response from each account counts. Locking the round freezes the historical responses. The creator records the actual outcome, uploads an authorized MP4, selects separate setup and reveal segments, and reviews both outputs with their captions and text descriptions before publishing locally.

A later viewer watches the setup, makes a personal choice and then receives access to the recorded reveal. The comparison clearly distinguishes that personal choice, the creator's actual choice and the original audience responses. Replay activity never changes the live history, and the application does not invent alternate endings.

### How it was built with Codex

Codex assisted throughout implementation and verification: the state machine, Twitch OAuth and EventSub adapter, atomic voting/lock behavior, private media processing, session-gated reveal, accessible interface, regression tests, judge setup and deployment preparation. Actual development evidence includes investigating a Twitch keepalive timeout, testing controlled reconnect and late-vote rejection, and reviewing caption access before a replay choice.

The application uses TypeScript, React and Vite, a Fastify API, SQLite with migrations, and bounded FFmpeg processing. Vitest covers domain/API behavior; Playwright exercises desktop and phone-sized browser workflows. Codex is a development tool here, not a runtime AI service.

### Challenges and what was learned

A disconnected chat intake must not leave a round looking complete. Unexpected outages interrupt an open round, and reconnection does not silently reopen it. Preventing spoilers also requires more than pausing a player: setup and reveal are separate files, and reveal media, captions and comparison data require a saved session choice.

Human review matters. The first recording needed an audio adjustment, and a keyboard walkthrough exposed misleading comparison wording when the replay and creator choices matched. The approved local revision now includes reviewed captions and separate text alternatives. Automated checks support these decisions but do not replace a person's hearing, screen-reader or device review.

### Accomplishments and verification

The local prototype completes upload → review → publish → choose → reveal. Genuine Twitch rehearsals cover first-vote behavior, lock, late rejection and reconnect. Two user-operated accounts were used for technical testing; this is not a two-person audience study. The reviewed OBS moment contains one genuine account response and a recorded Blue outcome.

Synthetic local load measurements accepted 1,000 valid votes in 30 seconds with 2.62 ms p95 transaction time. Ten local video clients passed the recorded test. These measurements do not establish public-host capacity. A clean-source local judge walkthrough and Linux container/restart/backup-restore checks are documented alongside their machine/cache limits.

### What's next

The MVP supports one allowlisted creator, two choices and manual recording/review. Remaining product acceptance includes spoken screen-reader feedback, zoom and physical-phone review, a separate-machine setup, and a broadcast with independent consenting viewers. Public hosting is deferred. Residual dependency/platform findings remain documented; the project is not represented as vulnerability-free or fully WCAG-certified.

## Form fields still to finish

- Suggested Built with tags: TypeScript, React, Vite, Node.js, Fastify, SQLite, FFmpeg, Twitch API, OpenAI Codex, Vitest, Playwright, Docker.
- Runnable repository URL: **pending publication/access decision**. GitHub/GitLab/Bitbucket is accepted. The official homepage names `testing@devpost.com` for private GitHub/GitLab judge access; verify before sharing.
- YouTube demonstration: **pending final recording, approval and upload**. Target 2:45 and use public visibility to meet the official rules' stricter wording.
- Actual Codex build session ID: `01a1791d-3b64-7590-ab36-a3b1096b4328`.
- Public app URL: not available. Do not insert a localhost URL as a remotely accessible demo; provide the judge guide in the repository.
- Team/eligibility/rights and any additional attestations: Anish reviews and answers personally.

## Registration and deadline

Devpost displayed “Thanks for registering!” and created draft submission `1269326`. Name/pitch are saved; the project is **DRAFT**, not submitted. Entry details can be revisited from My projects in the registered account.

Deadline displayed: **3 November 2026, 3:30 am IST**. Recheck before submission. Sources: [official competition](https://twitchcon-codex.devpost.com/), [rules](https://twitchcon-codex.devpost.com/rules), [resources](https://twitchcon-codex.devpost.com/resources).

Final action: review the completed entry, verify signed-out video and repository access, then have Anish submit. Do not present registration or a saved draft as a completed submission.
