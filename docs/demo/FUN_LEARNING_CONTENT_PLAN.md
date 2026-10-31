# Fun + learning content plan

Updated 31 October 2026. **The independent Opera Game reconstruction has completed real Twitch chat → local OBS recording → Studio review/publication → fresh anonymous replay as RF6S, revision 1 / release 1.** Anish confirmed working audio/video in response to the exact-revision review/local-publication request. One operator-controlled account supplied B; the frozen tally is A0/B1. The host's coached B demonstration is explicitly separate from Morphy's historical move. Fresh replay QA chose A and left the tally unchanged. No public broadcast, independent audience, Git push or external video publication is claimed. See [the media brief](chess/README.md) and [replay receipt](../evidence/chess-replay-2026-10-31.json). Next is final demo editing, not reconstruction or re-recording by default. The preparation table below is retained as historical planning data; current RF6S evidence and measured cuts in the media brief supersede its pending markers.

## Product message and this demonstration

**Turn a live-stream decision into a replay people can participate in.**

Opening screen: **Playable Moments — Missed the stream? Make your choice before the reveal.** Follow it with actual application Twitch connection state, a real chat command and its accepted response from the demonstrated session. A planned caption or illustration is not evidence of a live connection.

Submission narration, to use after content review: “Playable Moments connects real Twitch participation with interactive replays. Creators use their own or authorised recordings. For this demo, we created an independent chess reconstruction rather than reuse a third-party streamer's video. The same workflow applies: capture the question, review the recording, and let the next viewer choose before the reveal.”

On this chess footage only, use the prepared [sample-specific overlay text](chess/RECONSTRUCTION_LABEL.txt): **Independent chess reconstruction · Not original broadcast footage**. Place it unobtrusively below the board, with readable contrast and safe margins; keep every relevant square, coordinate and move visible. Carry the disclosure into both setup and reveal text alternatives. Do not add it to the global player, other uploads or the existing strategy sample card, which is not a chess reconstruction.

Add player names, event/date and required source/licence credit only after verification. Keep detailed provenance in the description/credits; omit result/move spoilers from setup-visible credit text or URLs. The famous player's connection is factual game context, never participation in or endorsement of Playable Moments. Do not copy broadcast footage, voice, facecam, reaction, overlays, commentary or unlicensed artwork/music.

For operator-controlled chat evidence use **Real Twitch chat · Operator-controlled test accounts**. If the channel is offline, also say **Offline channel chat rehearsal**. Use a live-broadcast claim only when an actual broadcast is independently evidenced. The product currently uses authorised MP4 upload and creator review; it does not import arbitrary Twitch/YouTube URLs or automatically detect moments.

## The meaningful change

**Watch the setup → make a prediction → see the actual recorded outcome → understand the reasoning.**

The hook is still Twitch participation after the stream: “You missed the stream. You haven't missed the decision.” Add one useful question after the payoff: **“What clue would you notice next time?”** The creator's explanation gives the decision context. This is a proposed learning benefit, not evidence of improved learning or a new scoring/AI-tutoring feature.

Use one complete example throughout the video. Show real chat and the frozen live response, the creator's review, then a later viewer's independent prediction and the same recorded ending. Finish with a short explanation, rather than treating agreement with the host as a correct answer. A replay choice never changes the recording or live history.

## Content choices and evidence

| Priority | Reference and status | What it could demonstrate |
|---|---|---|
| Prepared demonstration | **Morphy vs Duke of Brunswick / Count Isouard, Paris, 1858.** Independently drawn board/pieces, original explanation and synthetic narration; [score and provenance checked](chess/README.md). Setup is 14.1 seconds; reveal is 26.9 seconds. Human review is pending. | White chooses whether to offer the queen with Qb8+ or keep it with Qb5. Both options are legal. The historical finish demonstrates a cleared rook file and coordinated bishop, with no celebrity endorsement or old audience votes. |
| Optional footage reference only | GMHikaru, **“Would you Sac the QUEEN?!?”**, [YouTube reference](https://www.youtube.com/watch?v=wwn6kZayQHs). The supplied brief reports upload **29 October 2026**, duration **39 seconds**, and title/transcript inspection. Original broadcast date/platform are **UNKNOWN**. The earlier page fetch failed; neither metadata nor footage was independently verified here. | This reference does not identify a verified game or authorise copying its video/analysis. Do not infer the correct move or success from its title/transcript, or assume our reconstruction depicts it. |
| Reserve | Official GeoGuessr, **“GeoGuessr Esports Most Unforgettable Moments”**, [YouTube reference](https://www.youtube.com/watch?v=i1-wCIJWCzs&t=301s). Supplied brief reports upload **28 August 2026**. The **05:01–05:27** chapter is only a review lead in a historical compilation. This turn's page fetch failed. | Predict from visible evidence, then see the recorded location reveal and explain an actually visible clue. Country, player, location and outcome remain **UNKNOWN**. This is not a newly recorded October event. |
| Preserved working fallback | **Shortcut or Safety?**, existing original game code, art and generated sounds. The user heard the louder finish-tone check in Windows Media Player. A fresh coherent Twitch/game recording and review are still pending. | Predict whether to take the risky shortcut or safe route; then reflect on the actual attempt, timing and trade-off. No invented success probability, universal “best” route or educational efficacy claim. |

**Neither third-party reference has supplied reuse permission or an authorised local media file.** A public link, transcript, credit or creator popularity does not clear use. Do not download the referenced videos. Do not substitute unrelated footage, votes or a different session's result. Preserve the game and historical door assets/approvals unchanged.

## Prepared primary content — awaiting human review and a fresh session

The following is editorial preparation, not data to import into Studio.

| Item / Studio field | Draft or verified status |
|---|---|
| `title` (80 characters max) | **Would you offer your queen?** |
| `question` (180 max) | **You are playing White. Which queen move would you try?** |
| `optionA` / `optionB` (80 each) | **Offer the queen: Qb8+** / **Keep the queen: Qb5**. Both verified legal; no best-move comparison or scoring claim. |
| Verified game identity / source | **Paul Morphy vs Duke of Brunswick / Count Isouard, Paris, 1858**, before move 16. [Local unannotated PGN](chess/opera-game.pgn) matches the two references documented in the provenance record. Exact day is not asserted. |
| Source/asset rights and required credit | [Provenance record](chess/README.md): a single factual game score, original board/piece geometry, script and layout; synthetic installed Microsoft Zira narration; no borrowed creator footage, commentary, images, music or font files. Keep source credit in the final description. |
| Independently produced MP4 / file hash | **PREPARED** under ignored `data/chess-reconstruction/`; [durations and hashes](chess/verification.json). This is preparation media, not a fresh Twitch session recording. |
| Anish's recorded `creatorChoice` | **UNKNOWN**. Record Anish's actual A/B prediction in the new session. Do not infer it from the source creator's move. |
| Historical player's recorded move sequence | **16.Qb8+ Nxb8 17.Rd8#**. Full 33-ply score and rendered FENs validated; Nxb8 is the only legal reply after Qb8+. |
| Observed outcome | Historical White win, reconstructed checkmate on move 17. No new game was played by the app. |
| `outcomeSummary` (500 max) | Prepared in [content.json](chess/content.json): the knight leaves d7, clearing the rook file; the bishop protects d8 and covers e7. Includes the distinction between Anish's prediction and Morphy's action. |
| `resolvedAnswer` | Leave unset unless an objective answer is established and its use is separately justified. A host preference is not correctness. |
| `setupStartMs` | **3000**, in the generated preparation master only. Future OBS recording: UNKNOWN. |
| `setupEndMs` | **17100**, in the generated preparation master only; sampled final setup frame remains spoiler-free. Future OBS recording: UNKNOWN. |
| `revealStartMs` | **19100**, in the generated preparation master only. Future OBS recording: UNKNOWN. |
| `revealEndMs` | **46000**, in the generated preparation master only. Future OBS recording: UNKNOWN. |
| `setupCaptions` / `setupTranscript` | **PREPARED; human review pending**. Open captions, optional WebVTT and full board-position text alternative. Avoid duplicate subtitle display. |
| `revealCaptions` / `revealTranscript` | **PREPARED; human review pending**. Original explanation, synthetic speech and matching text describe the verified sequence. New host speech will need matching new captions. |
| Fresh Twitch response snapshot | **NOT CREATED**. Only actual accepted votes from Anish's new session. No historical celebrity audience votes are available. |
| Exact rendered revision and human approval | **PENDING**. Previous game/door approvals do not apply to a new clip. |

If geography is selected instead, all four boundaries, country answer, host choice and explanation are likewise UNKNOWN. Draft a question only after seeing whether the footage gives a fair, readable decision before the actual reveal. The chapter link and transcript references are not safe cuts or an answer key.

## Fit the existing product

No application source, schema, API or security changes are needed for this plan.

- Use the existing title, A/B question and options. Keep them neutral: no outcome in titles, setup text, thumbnails or captions.
- Use **Outcome summary** (`outcomeSummary`) for the brief “what happened and why” copy. The current replay UI displays it in **WHAT HAPPENED** after the reveal finishes. Its existing result API is session-and-choice gated; this is not server proof that a viewer watched the whole video.
- Put the fuller explanation in the **reveal recording** and accurately transcribe it into reveal captions/text alternative. Reveal text is available after an accepted choice, including during playback; it is not reserved until the final frame. If a point must appear only at the end, place it at the end of the recording or in the result summary/presentation.
- Setup and reveal each have separate captions and text alternatives. These are existing Studio fields, not a new lesson editor. Caption times begin at **zero within their derived clip**, not at YouTube or processed-master timestamps. Do not put teaching commentary into captions as if the source speaker said it.
- Preserve the private master, separately rendered setup/reveal files, first-choice voting, atomic locked history, session-authorised reveal and immutable releases. Do not change a database for a presentation screenshot.
- Review the actual source aspect ratio and legibility before editing CSS. Current encoding scales down while retaining aspect ratio; the player uses a 16:9 box. A vertical chess source still needs a real portrait/landscape review to verify the entire board and labels remain readable. No crop or CSS change is justified without that footage.

## Reconstruction review gate — current next task

Game/source verification and reconstruction preparation are complete for the Opera decision. The next dependency is **Anish's combined content review** of the two prepared clips, not a reply to the earlier third-party-video email. No runtime chess engine or new product feature was added.

The original board visuals, synthetic narration, disclosure, captions and text alternatives are prepared. Local decoding, sampled encoded-frame review, audio-level checks and scene controls passed. Human readability/listening approval is still pending. Retain the original-game fallback; its previous approvals do not apply. A later coherent OBS/Twitch capture will require fresh offset measurements and review.

Ask Anish once to review the prepared question, explanation and both clips with sound. Content approval permits the next rehearsal preparation, not publication or submission. No Twitch recording/broadcast or live-data change occurred during this authoring pass.

## Optional third-party footage route — not required for reconstruction

If Anish later chooses the actual streamer video instead, obtain an authorised local MP4 and its written reuse permission. The package should establish:


1. Who supplied the file and can permit its use; source URL/title, required credit and enough lead-in/action to review a fair decision. Keep correspondence and private source details out of the public repository.
2. Permission covering the intended trimming, captions/annotations, local app playback and competition/presentation use; public YouTube/Devpost/judging access; and **Twitch rebroadcast if the fresh lesson includes the excerpt**. Resolve any separate music, other people's footage/likeness or other third-party restrictions. Do not assume the project MIT licence covers media or permission to redistribute the file in the source repository.
3. Any limits on duration, platforms, edits or attribution. If the scope excludes Twitch rebroadcast, do not proceed with that proposed capture path; select a permitted workflow or the original fallback.

No outreach has been sent. An optional request Anish can send is: “May I use a supplied excerpt of [title] in a Playable Moments hackathon demonstration, trim it and add captions/annotations, show it in our local interactive replay, rebroadcast it in a fresh Twitch session, and include it in a public/unlisted YouTube demo linked from Devpost? Please confirm the permitted scope, required credit and any third-party restrictions. We will not imply endorsement or redistribute the source video under our code licence.”

After that input, review the actual board/map and audio, agree a fair A/B question, then measure the **four processed-master offsets**. Source-platform times, uploaded/normalised-master times and segment-relative caption times are different coordinates. A non-zero setup start is useful when genuine lead-in exists, but never invent an offset or filler to demonstrate it.

## One coherent fresh session

Frame the reconstruction session as **“Anish's chess learning session · independent reconstruction.”** Anish is the host whose actual A/B prediction populates creator choice. The historical player's recorded move belongs in the reconstructed action and factual explanation, never in Anish's prediction field. Anish is predicting a historical action; his prediction does not determine the historical move or create an alternate ending. If the optional third-party excerpt is used later, label it as an authorised excerpt and verify the permission covers the intended session.

Prepare the exact question and media first. For a later authorised capture, confirm Twitch readiness, record the host's setup and a real current round code, collect only actual chat commands, lock, then record Anish's prediction and the verified reconstructed sequence/explanation. Upload that continuous recording through Studio → set real boundaries/captions/text → render → review both outputs with sound → obtain approval for that exact revision → publish only when separately authorised. Stop the round on intake interruption as usual. The brief explanation must make the host-prediction versus historical-action distinction clear alongside the existing creator-choice label.

The two accounts operated by Anish can verify integration but are **operator-controlled test accounts**, not two independent viewers. State the actual participation count, including zero if applicable; never borrow the old demo's 5/7 split or a prior real session. Fresh votes belong to this session, not Hikaru's or GeoGuessr's audience.

## Proposed submission-video story — 2 minutes 50 seconds

These times are **editing allocations for the submission video**, not source clip cut points.

| Edit time | What the viewer sees / narration direction |
|---|---|
| 0:00–0:15 | Open on Playable Moments and the streaming hook, then one fair decision with the outcome hidden. Show the small independent-reconstruction label on chess footage. |
| 0:15–0:40 | Show the actual Twitch connection, real command, accepted participation count and lock from the same fresh session. Caption: “Real Twitch chat · Operator-controlled test accounts.” State offline chat rehearsal when applicable. |
| 0:40–1:25 | Actual upload, measured boundaries, captions and processed-file review. Show a real non-zero start only if the master supports it. Label shortened processing waits; avoid revealing the answer in editor close-ups. Full human review still occurs outside the condensed edit. |
| 1:25–2:05 | A fresh replay viewer watches setup, chooses, sees the one actual recording and comparison. Add: “Now notice [verified cue].” The creator's explanation, not an invented score, makes the learning point. |
| 2:05–2:30 | Authentic Codex development footage showing an implemented change and its real checks. Explain separated setup/reveal access briefly. Preserve existing usable Codex evidence. |
| 2:30–2:45 | **Same workflow. Different content.** Gaming challenges · Chess and strategy · Programming · Educational demonstrations. Supporting sample screenshots retain **Illustrative use cases** labels; no adoption or endorsement claims. |
| 2:45–2:50 | “Keep the decision—and the reason behind it—alive after the stream.” Accurate repository/local-run reference and prototype status. |

The [official rules](https://twitchcon-codex.devpost.com/rules) require a video under three minutes demonstrating the functioning project and Codex use, with access to a runnable project, and permission for third-party material. The [organiser's final-weekend guidance](https://twitchcon-codex.devpost.com/updates/47341-final-weekend-make-your-project-come-alive) accepts an unlisted YouTube demo and asks for running-product footage. These planning screenshots cannot replace that footage. Final timing, narration, review, YouTube upload and Devpost submission remain pending.

## Proposed audience slide

See [the local slide proposal and isolated screenshots](AUDIENCE_SLIDE_PROPOSAL.md). It is a proposal; the saved Spaces deck is unchanged. The three screenshots use the existing replay UI with browser-only DEMO fixtures and original sample question cards. They contain no creator footage, real users, votes, observed source outcomes or implied creator endorsement. They are illustration, not new end-to-end/Twitch evidence.

## What is done and what follows

Done: streaming-first message, verified Opera Game, independent reconstruction media and disclosure, explanation/captions/text alternatives, field mapping, proposed video story and audience illustration. Earlier audience screenshots remain sample cards; the new reconstructed clips are separate preparation assets. Original game, live history, application code, publication workflow and existing remote deck stay intact.

Next: human review of the prepared content → capture one coherent fresh Twitch/OBS session with Anish's actual prediction → measure/render/review its exact clips → obtain approval → carry out separately authorised publication and final demo editing. Final demo narration/subtitles/review, video publication and saved Devpost completion remain. Previously deferred independent-viewer, complete screen-reader/zoom, separate-computer and container/distribution checks remain open; public hosting remains deferred.
