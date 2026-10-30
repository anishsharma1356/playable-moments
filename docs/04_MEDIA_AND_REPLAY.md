# Media, review, and replay — the highest-risk part of the MVP

## 1. Fixed default path
**Manual OBS local recording → owner upload → private normalised master → creator-confirmed boundaries → separate encoded setup/reveal files → review → publish.**

The creator starts/stops OBS recording manually. Remux an OBS MKV to MP4 locally when necessary; the MVP upload accepts one MP4 with H.264 video and AAC audio or no audio. No Twitch media scraping, public URL fetching, HLS downloader, automatic browser recording, or remote OBS-control dependency.

Default limits, configurable after testing: 500 MiB upload, 20-minute source, 1080p maximum input, two output segments each at most 120 seconds, 720p/30fps output, one encoding job at a time, two encoder threads, and a 10-minute job timeout. These are product/resource caps, not benchmarked throughput.

## 2. Ownership and intake
Only an authorised owner uploads. Stream to a random temporary path; never buffer 500 MiB into memory. Enforce bytes while receiving, not only Content-Length. Validate content through FFprobe and decoding, not filename alone. Reject playlists, external-resource references, path traversal and unsupported stream layouts. Use random names under a private data directory. Do not pass user strings into a shell command.

Check disk reserve before accepting and before rendering. Remove incomplete temporary files after failure. Normalise with a current patched FFmpeg under a non-root process with resource limits and minimal network privileges. Token credentials must never be exposed to the child environment.

## 3. Normalised master and clocks
Create one PRIVATE MASTER with stable video dimensions, compatible audio/video, and a documented zero-based playback timeline, preserving audio/video alignment. Probe it and preview it before choosing cuts. The master is the editing reference; the original file is not a public asset.

The app has three different clocks:
- server UTC timestamps for live events;
- optional creator-provided approximate recording-start alignment;
- media offsets in the normalised master.

An optional neutral on-screen sync cue helps locate an application marker in the recording. It does not remove capture latency. If the clip begins late, contains dropped time, or was edited, an automatic offset suggestion may be wrong. Confirm cuts manually in the master. This is an explicit design limit, not a task to hide with an AI guess.

## 4. Four authoritative boundaries
`setup_start_ms < setup_end_ms <= reveal_start_ms < reveal_end_ms` and all lie within the master duration.

The interval before choice is `[setup_start_ms, setup_end_ms)`.
The interval after choice is `[reveal_start_ms, reveal_end_ms)`.
The gap may omit dead time, but must not distort the outcome. Describe an edited gap honestly when meaningful. Store raw app markers separately as hints. `creator_choice` and `outcome_summary` are independently entered facts, not derived from those timestamps.

Never assume the lock time is exactly the last safe video frame. The creator might speak or show an answer before a click. The normalisation/rendering process might quantise cuts to actual frames or audio samples.

## 5. Render two files, not one public full recording
Generate SETUP and REVEAL as separately encoded MP4s, H.264/yuv420p + AAC, faststart. Re-encode rather than stream-copy at arbitrary cuts. FFmpeg trim/atrim and timestamp-reset filters are the relevant building blocks [S11]. Keep captions, metadata, posters, filenames and titles from leaking the outcome. Do not preserve arbitrary input metadata/chapters in public outputs.

Example filter graph for a previously normalised, zero-based source WITH audio:
```text
[0:v:0]trim=start=SETUP_START:end=SETUP_END,setpts=PTS-STARTPTS,fps=30,format=yuv420p[v];
[0:a:0]atrim=start=SETUP_START:end=SETUP_END,asetpts=PTS-STARTPTS,aresample=48000[a]
```
Run separately for reveal offsets. Build argument arrays, not a shell string. Inputs without audio need the video-only branch. Validate resulting durations, first/last frames, audio alignment and decode integrity. The included synthetic boundary check tests a small fixture, not every real recording format.

Write to a job-specific temporary path, verify, compute hash, then atomically move to final storage and mark ready. If a process restarts mid-job, clean that job's temporary artifacts and retry a bounded number of times. Never label an incomplete file READY. Old outputs are not silently reused for a new edit revision.

## 6. Mandatory approval and publish gate
Require all of the following:
- Capture state OUTCOME_RECORDED, non-interrupted round.
- Final live snapshot exists and is REAL_TWITCH for the live submission; demo sessions remain clearly labelled.
- Creator's actual choice and outcome exist.
- Master and both processed output files are READY and hash-verified.
- The edit bounds and current content match the approved review hash.
- Owner approved the actual output video AND audio, neutral metadata, and media rights.
- No source or outcome frame used as an unreviewed public poster.

Publish in a transaction. Release refers to immutable media hashes and snapshot. A later change requires unpublish + new revision + new approval + new release. The public slug is random and spoiler-neutral.

## 7. Public replay access boundary
Before choice, the public manifest contains only neutral title, question, A/B labels, mode, setup duration and setup-media path. No underlying source path, reveal asset ID/URL, outcome, creator choice, resolved answer, or historical vote split.

The setup URL includes the exact releaseId as a query parameter and serves only that release’s setup file. If that version is no longer active, return 410 rather than silently serving the new version. A request for `reveal` without a valid session-bound attempt must return 403. Original/master URLs are owner-only. Do not put a full-release JSON object into page HTML, React hydration data, localStorage, social metadata, or a hidden DOM node.

A replay choice transaction creates at most one attempt per anonymous browser session and release. Repeated same-choice requests return the existing attempt. A different choice for that same release/session returns 409. First write wins. This is a convenience rule, not anti-cheating: a new browser session can make another choice.

After accepted choice, response returns the attempt ID and its reveal route, not the result comparison. The UI starts reveal only after an explicit user gesture or a successful play() call. If autoplay is rejected, show Continue; do not claim the video is broken. At reveal end, request results from a separate route. Results are authorised by the committed attempt, not cryptographic proof of watch completion. A determined user can inspect them after choosing; this is not DRM.

## 8. Media HTTP semantics
Video routes must support HEAD and single HTTP Range requests with valid 200/206/416 responses, Content-Length, Content-Type and Accept-Ranges. Reject malformed/multiple ranges if not supported. Check authorisation BEFORE opening protected files. Use `Cache-Control: private, no-store` for protected reveal/result and creator media; avoid a public cache/CDN in MVP. Use same-origin media routes, opaque storage identifiers, no public directory listing, and safe path resolution.

After unpublish, recheck permission on later range requests and return 410. Already fetched bytes cannot be recalled. Do not promise otherwise.

## 9. Playback states and edge cases
- Setup ends: stop; display A/B choice. No reveal prefetch.
- Participant chooses early: allowed when they understand the question; no fake enforced viewing metric.
- Choice request fails: retain selection pending, retry same idempotency key, do not load reveal prematurely.
- Refresh after choice: resolve existing attempt; resume reveal availability without changing the live tally.
- Video decode/format failure: show readable error and retry; do not substitute another outcome.
- Zero live participants: show “No live responses,” not fabricated percentages.
- Tie: show a tie, never invent majority.
- Creator choice differs from live majority: show both as recorded.
- Outcome is subjective: no automatic right/wrong score.
- User has no cookies: explain that a temporary session is required; do not put a secret owner token in the URL.
- Replaced/revoked release: require reopening the new version.

## 10. What remains human-reviewed
We cannot automatically prove the setup is spoiler-free, all content rights are held, an outcome label is accurate, or the chosen excerpt faithfully represents the original. We can make review fast, prevent straightforward accidental leakage through our API, and maintain a defensible record of which media version was approved.
