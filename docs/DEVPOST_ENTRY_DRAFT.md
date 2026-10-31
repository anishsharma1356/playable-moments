# Playable Moments — final submission text

Updated 31 October 2026 to match the complete 2:51 video. Ready to paste; the Devpost entry remains a draft. The public YouTube URL is still missing.

## Name and elevator pitch

**Name:** Playable Moments

**Pitch:** Missed the stream? Make your choice before the reveal. Turn a creator's recorded decision into a replay people can participate in.

## Project story

### Inspiration

Live viewers get a moment to decide before they know the answer. Later viewers usually lose that opportunity. We wanted to preserve the decision, then help the later viewer understand what happened and why. Creators can use their own or authorised recordings: a game challenge, chess explanation, coding session or educational demonstration.

### What it does

A creator opens an A/B round connected to Twitch chat. One first-accepted response counts per account. Locking freezes the original history. The creator records the actual host choice and outcome, uploads an authorised MP4, selects separate setup and reveal segments, then reviews the encoded video, sound, captions and text alternatives before publication.

A later viewer watches setup, chooses, then accesses the recorded reveal and comparison. That personal choice never rewrites the video or original responses. Reveal media, captions and results are gated by the saved session choice. Editing creates a new revision and resets approval; the full master remains private.

### The demonstration

Our main example independently reconstructs Morphy's Opera Game, Paris 1858. A viewer chooses whether to offer the queen or keep it, then sees the historical continuation and an explanation of piece coordination. Both options are legal; this is reflection, not an AI-graded puzzle.

The host's B is explicitly a coached demonstration selected with assistant help, distinct from Morphy's historical A. The chess rehearsal used one operator-controlled Twitch account in offline chat and froze A=0/B=1. A later personal A choice leaves that history unchanged. The video labels the earlier real chat/lock footage as a separate integration rehearsal. No independent audience, public broadcast, celebrity participation or original broadcast footage is claimed.

Original-game footage and illustrative strategy, geography and programming screenshots show possible uses. These are not adoption evidence or additional live sessions. No third-party creator videos were downloaded.

### How it was built with Codex

Codex helped implement and verify the state machine, Twitch OAuth/EventSub adapter, atomic voting/locking, private media processing, session-gated replay, accessibility, regression tests and judge setup. The video includes actual development footage of a caption-readability issue being identified, corrected and checked.

The application uses TypeScript, React/Vite, Fastify, SQLite and bounded FFmpeg workers. Vitest checks domain/API behavior; Playwright exercises browser workflows. Codex is a development tool, not a required runtime AI service.

### Challenges and accomplishments

Spoiler prevention needs separate encoded files and server authorization, not just a paused player. Unexpected chat outages must interrupt an open round instead of producing a misleading tally. Reconnect, late-vote rejection and exact-file media review required careful testing.

The local upload → review → publish → choose → reveal workflow works. Genuine Twitch rehearsals, including two user-operated accounts, test technical behavior rather than an independent audience. An Android phone completed basic replay, persistence and orientation checks. Clean-source setup passed on the existing machine; a separate computer remains untested.

Recorded synthetic local load checks accepted 1,000 valid votes in 30 seconds at 2.62 ms p95 transaction time, and ten local video clients passed. These are local measurements, not public-host capacity claims. Dated evidence and limits are in the repository.

### What's next

The MVP supports one allowlisted creator, two choices and manual recording/review. Independent viewers, remaining human screen-reader/magnified-flow acceptance, a fresh-computer installation and public-host testing remain. Hosting is deferred. Residual platform/security and binary-distribution work is documented; no vulnerability-free or full-WCAG claim is made.

## Submission fields

- Repository: https://github.com/anishsharma1356/playable-moments
- Judge setup: https://github.com/anishsharma1356/playable-moments/blob/main/docs/JUDGE_GUIDE.md
- Video: paste the real **public YouTube URL** after review/upload. Never use a local path or invented URL.
- Codex session ID: `01a1791d-3b64-7590-ab36-a3b1096b4328` (app-reported build-thread identifier).
- Built with: TypeScript, React, Vite, Node.js, Fastify, SQLite, FFmpeg, Twitch API, OpenAI Codex, Vitest, Playwright, Docker.
- Public app URL: not hosted. Supply repository/judge instructions where appropriate, not localhost.

## Credits and final action

Original project visuals/script; synthetic Microsoft Zira Desktop narration, not a player imitation. Historical sources: [Edward Winter](https://www.chesshistory.com/winter/extra/morphy.html) and [game score](https://www.chessgames.com/perl/chessgame?gid=1233404). No article prose, broadcast media or downloaded artwork reused. MIT project copyright 2026 Anish; third-party notices retained.

Registered draft: `1269326-playable-moments`. Anish reviews team/eligibility/rights statements personally. Verify signed-out repository/video access, then submit the completed entry. Deadline checked 31 October: **2 November 2026, 2:00 pm PST / 3 November, 3:30 am IST**. [Official rules](https://twitchcon-codex.devpost.com/rules).
