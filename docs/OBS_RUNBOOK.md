# OBS and the first recorded Twitch moment

Updated 28 October 2026. The controlled reconnect and a one-account local OBS recording-to-replay rehearsal have passed. The user reviewed revision 2 with clear audio and approved local publication. Two independent viewers and a public recorded broadcast are still pending; do not label the local rehearsal as either.

## Local materials

- `docs/demo/colour-choice.html`: original camera-free red/blue scene. No Twitch votes or results are simulated by this page.
- `data/obs/Playable-Moments.json`: private OBS scene import containing the session overlay capability. Keep it local; it is ignored by Git.
- `data/obs/recordings/`: configured recording folder. OBS saves Hybrid MP4 directly; no remux is needed for this setup.
- `ops/prepare-obs.mjs`: rebuilds the import from the privately saved overlay reference. Run from the project root after updating `data/obs/overlay.json` if the overlay expires. The capability lasts 12 hours; replacing it revokes the old URL. Update the OBS source URL as well.
- Current OBS overlay: **OBS local recording rehearsal**, completed code **J8QL**. Original reserved session **First recorded moment**, draft **Red or blue — recorded choice**, code **GDDU**, remains DRAFT at 180 seconds. Before its independent-viewer broadcast, create/refresh the overlay for that session and update OBS. Always use Studio's current code; an interrupted/cancelled/replaced round needs a fresh code.

## Scene controls

The collection has a colour-choice Browser Source on the left and the live read-only overlay on the right. It captures neither the creator Studio nor the whole desktop. The microphone starts muted; unmute it only when ready to narrate. The scene's brief original tone can check browser-source audio without a microphone.

Select **Colour choice — Interact: A / B / Space**, then **Interact**. Click inside the interaction window to focus it:

- **Space** resets to the question, before a new recording.
- **T** plays a short test tone.
- **A** or **B** reveals that actual selection. Only the first selection is shown until reset.

Use A/B only after Studio says LOCKED. This display is a creator-controlled scene, not an alternate ending generated from audience votes. Record the exact choice made in Studio's outcome form later. Do not treat a setup recording or local tone test as the real viewer session.

## Setup verified on this computer

OBS 33.0.0 is connected to Twitch. The completed wizard selected 1920×1080 at 30 fps, 6000 kbps, Intel QSV H.264, and the Mumbai ingest location. Output is Simple mode with AAC 160 kbps and Hybrid MP4, recording quality Same as stream. Enhanced Broadcasting is off. The microphone is muted; the browser scene supplies its own tone. No desktop capture or webcam is used.

Imported and activated the Playable Moments collection. A 25.533-second local setup test was saved as `data/obs/recordings/2026-10-27 11-08-48.mp4` (18,442,316 bytes). FFprobe confirmed H.264 1920×1080/30 fps and stereo AAC/48 kHz. FFmpeg decoded the audio and measured a peak of -18.1 dB; inspected frames show the question followed by the test B reveal. This was a local equipment test with the overlay still DRAFT/0, not a real audience round. The file has not been uploaded, approved or published.

Tested A/B and corrected the Space reset handler for OBS's embedded browser, then verified reset in OBS. Both recording and streaming are stopped, the scene is back at the question, and Studio remains DRAFT with Twitch READY. Preview evidence: `screenshots/obs-ready-local-test.png`.

The later **revision 3 / release 2** retains the reviewed video and clear audio, with human-approved captions and separate text descriptions. It is the current published local example. See `evidence/j8ql-captioned-revision-2026-10-28.json`. The competition capture plan is `demo/FINAL_DEMO_SCRIPT.md`; it explicitly labels earlier footage and does not require buying hosting.

## Two-viewer walkthrough

The separate local J8QL take is already published at `http://localhost:5173/m/aa098843-76e4-49b1-b77e-7b92af0e5cdb`. Original file: `data/obs/recordings/2026-10-28 12-13-40.mp4`. The user found the initial short tone inaudible. A copy of the normalized recording with the same video and +16 dB on its existing audio was rendered as revision 2; the user confirmed clear audio before approval. Keep that original file and check the sound in a short local take before the next audience recording. See `PROGRESS.md` for exact cuts and evidence.

1. Ask two consenting people, each signed into a separate Twitch account, to open `https://www.twitch.tv/chaitime56`. They do not need the localhost Studio link. Keep the broadcaster account unvoted for the later rejection check.
2. Verify Studio says Twitch READY. Check the OBS preview contains the question and live overlay, with no outcome visible. Reset the scene with Space before recording if necessary.
3. Start the real Twitch broadcast when ready. Verify the public channel actually plays the scene. Start local OBS recording too; the stream alone is not a local recording.
4. In Studio click **Open responses**. The public overlay should show OPEN and both exact commands. For the current draft they are `!pick GDDU A` and `!pick GDDU B`.
5. Viewer 1 sends A, viewer 2 sends B. Expect 2 participating accounts. Viewer 1 then sends B; the total must stay 2 and their first A remains.
6. Click **Lock responses**. From the broadcaster account, which has not voted in this round, send another valid command. The frozen total must stay 2. This tests late rejection independently of duplicate rejection.
7. Choose A or B in the OBS scene's Interact window and say what you chose if narrating. Keep the reveal visible for several seconds, then stop recording and streaming.
8. In Studio enter the actual choice and a truthful outcome, then save and review the recording. If recording was MKV, use OBS **File → Remux Recordings** to create MP4, preserving the source.
9. Upload the MP4. Set setup boundaries before the visual/audio reveal and reveal boundaries around the actual choice. Render and watch both outputs with audio; approve only the footage actually reviewed, then publish locally.
10. Open the replay in a separate browser session, watch setup, make a personal choice, watch reveal and compare. Expect frozen live A=1/B=1 if exactly those two first choices were accepted. Replay choices must not change those numbers.
11. In another disposable test round, deliberately reconnect while OPEN. It must become INTERRUPTED, never reopen or publish. Verify READY returns and a fresh draft/code can be used.

If intake disconnects while voting, keep the interruption evidence and create a fresh round. Never label partial votes as a complete two-viewer test.

## Project work still outstanding

- M0/M1: implemented and locally verified. The user has also completed the local workflow.
- M2: authorization, two-account A=1/B=1, duplicate/deadline/late behavior, controlled interruption/reconnect and actual local OBS recording-to-replay are verified. Still needs independent viewers and OBS on a public broadcast. See `TWITCH_RELIABILITY.md` and `PROGRESS.md`.
- M3: local hardening and actual recorded review/replay/access checks passed. Physical-phone and assistive-technology review remain; see `M3_HARDENING.md`.
- M4: local container HTTPS, backup/restore, restart and labelled load measurements are complete. Separate-device/fresh-machine and public-host acceptance remain. Current app is loopback-only; public hosting is deferred.
- M5: eight-slide deck and timed demo script are prepared; contest registration and a named draft are complete. Final genuine Twitch/Codex video, repository access and reviewed project submission remain. No public deployment or final competition submission has been made.

OBS references: [Quick Start](https://obsproject.com/kb/quick-start-guide), [Browser Source](https://obsproject.com/kb/browser-source), [Recording and remuxing](https://obsproject.com/kb/standard-recording-output-guide). These are setup instructions; observed test results belong in `PROGRESS.md`.
