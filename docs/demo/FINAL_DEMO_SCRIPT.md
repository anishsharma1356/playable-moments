# Final demo recording sheet — updated 31 October 2026

## Selected replacement example: Shortcut or Safety?

Anish selected the original game challenge on 31 October. The game scene is now implemented and verified with six game-logic tests and five browser scenarios. New real Twitch/OBS footage and processed-media approval remain pending. The existing door footage remains a historical rehearsal and fallback, not the final chosen example.

### Run and rehearse the implemented scene

With Node 24 and the project dependencies installed, run `npm run demo:scene` from the project folder, then open `http://127.0.0.1:5190/`. The server binds only to loopback and serves only the original scene assets. It does not access the application database or Twitch. The existing Studio/overlay servers remain separate.

Choose A or B, then **Start run**. The shortcut takes about 4.6 seconds and requires one Space press just before the gap; an early or absent jump falls. The safe route takes about 8.8 seconds. Pause/Resume and reset confirmation work; leaving the tab automatically pauses the run. Sound starts off: click **Sound off** to enable it, then confirm the short check tone is audible at a comfortable level. Human audio and final-recording review remain required.

To prepare OBS, run `node ops/prepare-game-obs.mjs`. Import `data/obs/Playable-Moments-Shortcut-Safety.json` as a separate scene collection. Use a 1920×1080 canvas. The browser source uses a 1280×900 page, crops 180 pixels of operator controls from its bottom, and scales the remaining 1280×720 frame to 1920×1080. Open that source's **Interact** window to choose/start/jump and enable sound; controls are available there but cropped from the recording. The imported microphone is muted initially. Verify routing/levels and make a local rehearsal before starting a real take. Importing does not start recording or streaming, and the existing OBS collection is not edited by the preparation script.

The game is original project code and code-drawn SVG art. It has no external fonts, images, game logos or music. Tests do not stand in for the next real Twitch/OBS capture or human review.

**The scene:** a tiny original platform game shows a character at a fork, with a finish flag in view. A short upper route requires one well-timed jump over a gap. A longer lower route avoids the gap. The streamer is trying to finish quickly without falling. The scene pauses clearly at the decision while chat responds; no hidden countdown keeps running during voting.

**Exact moment text:**

- Title: `Shortcut or Safety?`
- Question: `One run. Which route would you take?`
- A: `Risky shortcut`
- B: `Safe route`
- Streamer line: “Chat, do I risk the jump for a faster finish, or take the safe route? A or B?”
- Later-viewer line: “You missed the stream. You haven't missed the decision.”

Use original code-drawn scenery, a simple character and generated sound effects; no commercial-game branding, borrowed VOD or external music is needed. Keep this an isolated capture scene, not a new game engine or Twitch-to-game-control feature inside Playable Moments. Both paths must actually work. The creator selects a route and plays; a jump succeeds or fails based on the real attempt, not a preselected video ending. Record the observed outcome accurately, including a failed jump if that is what happens. Do not change the game after seeing votes to manufacture a result.

### Implemented scene boundaries

- One screen, one fork, one finish, one jump; legible at 1280×720 capture.
- Large A/B route names with distinct shapes and text as well as color.
- Explicit “Paused for chat” state, then creator-controlled route selection/start.
- Keyboard controls and a visible restart control for rehearsal. Record a continuous actual attempt after the live round locks.
- Clear landing/falling/finish state and a short sound that is also described in reveal captions/text.
- No fake chat panel, audience count, vote simulation or automatic game control attributed to Playable Moments.

### Capture one coherent moment

1. Prepare and rehearse the game without opening a voting round. Frame OBS around the game and approved read-only overlay. Capture only intended windows.
2. In real Twitch mode, confirm Studio READY, create a fresh moment with the text above, and use its actual displayed round code. Start local OBS recording before opening responses. A public broadcast, if used, is a separate deliberate action.
3. Accept real chat commands and lock responses. Keep the actual vote count and provenance. Operator-controlled accounts are a technical rehearsal; they are not independent audience feedback. Stop if intake is interrupted.
4. The creator states the chosen route and plays it. Keep the entire attempt, actual outcome and genuine reaction together in the master recording. Later-viewer choices never control this game or change this footage.
5. Upload that recording. SETUP should be about 8–12 seconds: the question, both routes and their stakes, ending before the chosen route, result, audience split or revealing sound. REVEAL should be about 8–15 seconds: the actual route, attempt and outcome. Exact offsets come from the new recording, not this estimate.
6. Add separate accurate captions and descriptions. Anish reviews the exact processed setup and reveal with sound and approves this revision before local publication. Earlier door approvals do not apply.
7. In a fresh replay session, choose the other option from the creator when useful for comparison. Reveal the one actual recorded ending and show the genuine frozen live history separately from the replay choice.

### Final edit: target 2:45

| Time | Shot and purpose |
|---|---|
| 0:00–0:15 | Show the fork and question. “Would you risk the shortcut? Most replays tell you what happened before you get to decide.” Keep the outcome hidden. |
| 0:15–0:45 | Real Twitch command, accepted participation count, then Studio lock. State honestly whether these are operator-controlled test accounts. |
| 0:45–1:10 | Upload and creator boundaries/caption review, with encoding waits clearly shortened. Avoid showing the reveal before the replay sequence. |
| 1:10–1:55 | Fresh viewer watches setup, chooses, unlocks the real outcome, then sees personal choice, creator choice and frozen live history. This is the main product demonstration. |
| 1:55–2:25 | Actual Codex development footage and a real tested fix. Explain separate setup/reveal files and server-side choice gating in one sentence. |
| 2:25–2:45 | Close: “Keep the decision alive after the stream ends.” Show repository/local judge setup and accurately label the prototype's limits. |

The [official rules](https://twitchcon-codex.devpost.com/rules), rechecked 31 October, request a video under three minutes with functioning Twitch and Codex-development footage, publicly visible on YouTube. Use this brief to plan the edit; final duration, final content approval and public upload remain undone. The scene's automated tests are complete; a genuine Twitch recording using the new example remains pending.

## Historical door recording sheet — 28 October 2026

**Narrated target: 2 minutes 45 seconds. Status: real product/Codex footage captured; private text-led review cut v1 exported at 2:08. Final narration, full-video human review and upload remain.**

Review file: `data/submission-video/playable-moments-review-cut-v1.mp4`. It passed full decoding and a nine-frame visual review. It contains on-screen explanations and the original approved reveal tone, with no voiceover yet. This is an edited review draft, not the approved submission video. See [capture and readability evidence](../evidence/demo-capture-and-readability-2026-10-28.json).

Captured on 28 October: fresh real Twitch round JZ2J (one operator-controlled account, A=1/B=0), approved J8QL creator review/replay (personal A, actual B, unchanged live A=1/B=0), and the actual Codex conversation identifying/fixing faint published caption fields. JZ2J and J8QL are separate moments and must remain labelled. Private raw recordings and the editing manifest are under `data/submission-video/`; no public video approval is implied. Current creator-review controls retain the approved revision and make locked caption fields readable and keyboard-focusable without permitting edits.

Use real application footage, actual Twitch chat and the actual Codex development thread. The approved J8QL local recording is revision 3, release 2, with captions and text alternatives. It has **one genuine participating account, A=1/B=0**. The earlier two-account rehearsal used accounts operated by Anish; neither is evidence of two independent people. The judge fixture's 12 responses are synthetic and must stay labelled if shown.

## Record in this order

1. **Codex evidence first.** Anish starts a window recording in OBS and captures this real development thread, the changed privacy test and its actual passing checks. Show the source diff, not a reenactment or fabricated chat. Avoid the account/sidebar and private paths where practical. Keep the original recording. The assistant can prepare code and tests; Anish handles capturing the Codex application itself.
2. **New Twitch rehearsal.** Confirm Studio says READY and Twitch is signed in on chaitime56's channel. Create a new round and use its displayed code. Start OBS recording before opening responses. Send `!pick <current code> A` from the signed-in test account, observe one account, then lock. Show the actual locked count. Do not reuse an old code or imply two viewers if only one account participates. Stop if Studio says INTERRUPTED. A fresh public broadcast requires a separate deliberate Start Streaming action; local recording and offline channel chat are enough to rehearse the flow.
3. **Creator review.** Record the existing approved J8QL Studio revision and captions/text descriptions, clearly captioned “Previously recorded local rehearsal”. If demonstrating a new upload/revision, review the actual new outputs with audio and obtain fresh approval; do not reuse approval from J8QL. Shorten encoding waits with the on-screen label “Processing time shortened”.
4. **Replay.** Use a fresh browser session on the published local replay. Record setup with captions, choose A (to contrast with the creator's Blue choice), reveal, then the unchanged historical A=1/B=0 comparison. If the session already chose, use a fresh session instead of faking a reset.
5. **Voiceover and edit.** Read the narration below naturally, trim pauses, and add accurate English subtitles. Keep Twitch command, accepted count and lock in a clear sequence. Keep audible playback/tone below narration. Do not use unlicensed music.

## Timed narration and shots

| Time | Picture | Narration |
|---|---|---|
| 0:00–0:15 | Setup question, no outcome | “When you miss a livestream, you can still watch the recording. But you usually miss the moment of making a choice before knowing what happened. Playable Moments preserves that decision for the next viewer.” |
| 0:15–0:45 | Actual Twitch command → Studio accepted count → lock | “The creator opens a two-option round. A viewer responds in real Twitch chat using the round code. The first accepted choice per account counts. When responses lock, the historical total is frozen. This is a technical rehearsal using my test account; it is not an independent audience study.” |
| 0:45–1:05 | Original recorded outcome; label earlier take | “Here is a previously recorded local moment. The live response was Red, and the creator actually chose Blue. We keep that original outcome. The application does not generate a different ending based on what someone chooses later.” |
| 1:05–1:30 | Studio boundaries, two previews, captions and descriptions | “The creator uploads their own recording and separates the setup from the reveal. These are two encoded files. Before publication, the creator reviews the actual video, audio, captions and text alternatives. Changing an edit resets approval, so an older review cannot silently approve new content.” |
| 1:30–2:10 | Fresh replay: setup → A → reveal → history | “Now I am watching later. I can watch the setup or read its description, then make a personal choice. Only after the server accepts that choice does this session receive access to the reveal. The recorded Blue outcome plays. My replay choice and the original live responses are shown separately. Choosing again here cannot rewrite the original Twitch history.” |
| 2:10–2:35 | Actual Codex thread and corrected review UI | “I built this with Codex, using TypeScript, React, Fastify, SQLite and FFmpeg. During this recording, Codex found that published caption fields were too faint. It made the text readable and keyboard-accessible while keeping it read-only. TypeScript checks, lint and the production build passed.” |
| 2:35–2:45 | Product title and concise scope | “The prototype runs locally, with a reproducible judge setup. It supports one creator and two choices. Public deployment and the remaining human accessibility and independent-viewer checks are still future work.” |

The narration is approximately 370 words; rehearse at a comfortable pace and shorten wording if it exceeds 2:45. The final exported duration, not this estimate, is authoritative. Do not speed up required interaction until it becomes unreadable.

## Assets and capture boundaries

- Local approved replay: `http://localhost:5173/m/aa098843-76e4-49b1-b77e-7b92af0e5cdb` (only works on the running local installation).
- Private original OBS take: `data/obs/recordings/2026-10-28 12-13-40.mp4`; approved audio-boost master: `data/obs/recordings/J8QL-audio-boost.mp4`.
- Approved cut points: setup 20–30 seconds, reveal 96.5–106.5 seconds. See [the exact review evidence](../evidence/j8ql-captioned-revision-2026-10-28.json) for hashes and review details.
- Caption source files: `j8ql-setup-draft.vtt`, `j8ql-reveal-draft.vtt`; despite their historical filenames, these exact texts were approved in revision 3. Keep them separate in the application.
- Do not record Twitch developer settings, client secrets, `.env` files, OAuth URLs, session cookies, OBS stream keys or the full overlay capability URL. Crop or remove unrelated chat and personal information before public release.
- Keep editor exports under private `data/submission-video/`; do not put raw recordings into the source repository.

## Final video acceptance

- Actual Twitch functionality and actual Codex development are both visible.
- Captions match the final spoken narration; Blue/tone remain audible and accurately described.
- Local, synthetic and real rehearsal labels match the displayed material.
- Duration is below three minutes; target 2:45 with readable controls.
- Anish watches the entire export with sound and approves the exact file before YouTube publication.
- Official rules request a public YouTube demo. The current entry form also mentions unlisted; use public for the final entry to satisfy the stricter published wording unless the organizer confirms otherwise.
- Check the final YouTube link from a signed-out browser. A local MP4 alone does not complete the competition video requirement.
