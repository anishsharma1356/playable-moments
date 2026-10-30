# Product flow and screen specification

## The canonical demonstration
Use an original short Red Door / Blue Door scene or original coding example. The question, options, and outcome must be genuinely present in the source recording. No commercial-game footage without permission. Example DEMO data: A=5, B=7, creator chose B, actual outcome “The treasure was behind the blue door.” These numbers are synthetic and must be marked DEMO; do not pass them off as real participation.

## Screen 1: Setup and library
Header: Playable Moments; concise promise “Make your choice before the reveal.”
Connection card: Twitch account, verified channel, mode REAL/DEMO, connection health, permission status. Recording checklist: OBS configured; no private information on screen; local recording manually started; authorised content. Moment cards show status, date, mode, review/publish condition, and clear resume action. No invented engagement metrics.

Create moment form:
- Safe title (1–80 chars; must not give away the result).
- Question (1–180 chars).
- A label and B label (1–80 chars each; trim; not identical ignoring case).
- Voting duration 20–180 seconds, default 45.
- Neutral cover or no cover; never auto-pick an outcome frame.
No correct answer is required; preference questions need not have one.

## Screen 2: Creator live control
Show question/options, generated unique code, clock, health, and a single primary action according to phase.
- DRAFT: edit then Open Voting; disabled without healthy real chat unless DEMO is explicit.
- OPEN: show unique accepted-account count; optional private counts; Lock early requires confirmation. For clean recordings, this screen must not be the captured OBS source.
- LOCKED: show “Responses frozen”; choose the actual option A/B. Do not preselect the majority.
- OUTCOME_RECORDED: short outcome summary; optional explicit resolved answer A/B only if the creator can substantiate it. Link to media review.
- INTERRUPTED: explain why, preserve the partial tally privately, and offer “Create a fresh round” rather than Resume.
- CANCELLED: historical audit only.
Source label visible at all times: REAL TWITCH or SIMULATED DEMO.

No per-viewer chat replies. Overlay explains the syntax. The creator can manually state instructions. Native channel settings (slow mode, follower restrictions) remain in force; our app does not bypass them.

## Screen 3: OBS overlay
Transparent 1920×1080 layout with content concentrated in a readable lower-third safe area, leaving a 5% margin. An OBS setting can choose opaque background for rehearsal screenshots. Essential text:
- “Which door would you choose?”
- “A · Red door   B · Blue door”
- “Type !pick K7P2 A or !pick K7P2 B”
- “Responses open / Responses closed / Connection interrupted”
- Optional total “12 participating accounts”; never percentages or A/B counts.

No reveal of the creator's choice or outcome through this source in MVP, even after lock. This makes recording review easier. On stale SSE, show a disconnected label and stop implying votes are open. Reconnect fetches a fresh projection. Overlay key can only read this projection; it cannot mutate state or access media.

## Screen 4: Creator media review
Step A — Upload one short MP4. Display progress and explicit max size/duration. Error messages distinguish an unsupported codec, missing video stream, decode failure, and insufficient storage.
Step B — Preview the private normalised master with accessible controls. Four explicit boundaries:
1. `setup_start_ms`: enough context to understand the question.
2. `setup_end_ms`: before a visual/audio spoiler, at a natural pause.
3. `reveal_start_ms`: where the genuine decision/result sequence resumes.
4. `reveal_end_ms`: after the result is understandable.

Enforce `0 <= start < setup_end <= reveal_start < reveal_end <= master_duration`. It is acceptable to omit dead time between the two segments; label an edited pause honestly, never manufacture a different outcome. Per-segment limit 120 seconds initially.

Offer ±100 ms and ±1 second nudges, direct timestamp fields, and preview buttons. These are convenience controls, not a guarantee of sample-perfect accuracy. Live capture timestamps appear separately as suggestions and never overwrite confirmed offsets.

Step C — Render. Show job progress and retryable failure. Do not block the request until encoding finishes.
Step D — Review the actual generated SETUP and REVEAL assets, including the last/first frames and their audio. The owner checks:
- The setup contains no result, announced creator choice, historical split, subtitle/overlay spoiler, or revealing title/thumbnail.
- The reveal covers the real outcome; the selected creator choice and summary are accurate.
- The edit has not changed the meaning.
- Content is original or authorised, with no credentials/private material.
- Any relevant captions remain aligned; manually authored captions are safe, automatic transcription is out of scope.

Approval applies to the current edit/asset hashes. Any changed offset, replaced source, re-rendered output, title, creator choice, or outcome requires renewed approval before a new release.

Step E — Publish. A dialog shows exactly what becomes public. After publication, editing requires Unpublish and Create New Revision. Never modify an existing release's historical tally or media in place.

## Screen 5: Replay participant
States:
`LOADING → SETUP_READY → WATCHING_SETUP → AWAITING_CHOICE → SAVING_CHOICE → REVEAL_READY → WATCHING_REVEAL → COMPARISON`.

On load, show neutral title, question, options and SETUP video. Standard controls can seek only within SETUP. A simple “I understand—choose now” action is allowed; there is no false promise that viewing time is enforced. At setup end, display two large keyboard-accessible buttons with text labels, not colour alone.

On selection, disable duplicate submissions while POST is pending. Do not start the reveal optimistically. After a successful response, show Continue / Watch the outcome and request the reveal asset. Autoplay might be rejected, so the explicit button must always work. Use `playsInline` for mobile. If the network fails, retain the local selection and retry with the same idempotency key; do not register another vote.

After reveal `ended`, request the comparison and display:
- “You chose: A — Red door.”
- “Creator chose: B — Blue door.”
- “Actual outcome: …”
- “Original live participants: A 5 / B 7, total 12.”
Percentages, if shown, are computed from the stored total; zero participants means “No live responses”, not 0%/0% implying an electorate. Do not show “correct/wrong” unless `resolved_answer` is explicitly provided. A crowd majority is not truth.

On refresh, resume from the stored server-side attempt for the same browser session/release. A different browser or cleared cookie is a new anonymous session; do not advertise a unique-person count. Public share/social metadata stays spoiler-safe. No global anonymous-vote leaderboard.

## Accessibility and visual design
Use high-contrast text, readable type, visible focus, A/B text labels, reduced-motion support, and screen-reader announcements for state changes. Target 44px or larger touch controls. Keep creator controls distinct from viewer screens. Mobile portrait must support video + question + choices without clipping. Do not make functionality depend on hover, audio alone, or a purple/red colour distinction.

A suggested visual identity is dark slate + violet accent + restrained neutral cards. This is a style suggestion; correctness and readability take priority. Never put “guaranteed winner”, “100% spoiler-safe”, or fabricated user counts on a screen.
