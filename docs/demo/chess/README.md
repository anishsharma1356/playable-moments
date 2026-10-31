# Independent reconstruction: the Opera decision

**Current status: RF6S revision 1 was reviewed and published locally; the complete 2:51 product video is prepared and awaits final human review/public upload.** The original-game fallback is unchanged. Preparation-only statements below describe the original authoring assets; see “Subsequent actual rehearsal” for the later release evidence.

## The verified example

Paul Morphy played White against the Duke of Brunswick and Count Isouard in a consultation game in Paris in 1858. We use the position before White's move 16 and reconstruct **16.Qb8+ Nxb8 17.Rd8#**. Use **Paris, 1858** in credits; an exact day and the opera being performed are not asserted.

Sources checked on 31 October 2026:

- [Edward Winter, Morphy v the Duke and Count](https://www.chesshistory.com/winter/extra/morphy.html): the complete game score and historical discussion. No prose, illustrations or annotations from the article are reused.
- [Chessgames.com game record](https://www.chessgames.com/perl/chessgame?gid=1233404) and its [plain unannotated score](https://www.chessgames.com/njs/api/game/viewPGN/1233404): matching 33-ply score, players, Paris, year and 1–0 result. Its date field is `1858.??.??`; its cited archival source is The Field, 4 December 1858, p.458. We did not independently inspect that archival issue.

The [local PGN](opera-game.pgn) transcribes the factual move sequence without website annotations or graphics. Both references agree on all moves. The historical game is unrelated to the earlier unverified Hikaru video reference; no connection to that clip is claimed.

## Choice and explanation

- Title: **Would you offer your queen?**
- Question: **You are playing White. Which queen move would you try?**
- A: **Offer the queen: Qb8+**
- B: **Keep the queen: Qb5**

Both options are legal from the selected position. B is a preference option, not a claimed equivalent, best defence, draw or winning continuation. This is not a scored puzzle. `resolvedAnswer` stays null. Anish's actual prediction remains null until recorded in a fresh session; it must never be filled from Morphy's move.

The historical reveal has one ending: Qb8+ checks the king; Nxb8 is the only legal reply in that position. The knight's departure from **d7 clears the d-file**, allowing Rd8#. The bishop on g5 protects d8 through f6/e7 and covers the king's e7 escape. Do not say the knight was guarding d8: it was blocking the rook's path. The independent explanation focuses on coordination rather than material count.

This was checked with the [chess.js move-validation library](https://github.com/jhlywa/chess.js), pinned to **1.4.0** in an ignored preparation folder. All 33 plies are legal, the four rendered board positions match the computed FENs, both offered moves are legal, the black reply after Qb8+ is unique, and the final position is checkmate with zero legal replies. No engine evaluation, best-move ranking or runtime AI is used. The validator is not an application dependency and is not shipped in the scene. Its BSD-2-Clause notice remains with the private package.

## Media and provenance

Original project-authored content: SVG board and piece shapes, layout, arrows, instructional copy and narration script. The preview narration uses the installed **Microsoft Zira Desktop** synthetic voice. It is not Anish's voice or an imitation of a player. No background music, celebrity footage/voice/facecam/reaction, third-party board screenshots, downloaded piece artwork or video is used. Installed Arial is rendered into pixels; no font file is distributed.

The references establish game facts, not permission to reuse their expressive content or databases. We use a single unannotated factual score, with explicit source credit; no third-party broadcast licence is claimed. Keep these citations in the final demonstration description/credits. The exact small disclosure appears throughout this chess footage:

**Independent chess reconstruction · Not original broadcast footage**

It is sample-specific and was not added to the product player. The prepared scene lives outside the app bundle, has no API/Twitch/OBS connection and must not be mounted as an ungated public replay route. Real replay media must still use Studio's separate setup/reveal workflow.

## Prepared files

### Subsequent actual rehearsal: RF6S

On 31 October a separate real Twitch session accepted one operator-controlled B vote and froze A=0/B=1. A fresh OBS take recorded setup, lock, a **coached host demonstration choice B selected with assistant help**, and the historical reconstruction. It was not a public broadcast or an independent-viewer test. The earlier content template and preparation master remain unchanged; their null host choice describes those preparation assets.

The fresh recording's Studio revision 1 uses measured processed-master offsets **6.000–20.100s** for setup and **127.900–154.800s** for historical reveal. The recorded host-choice card is in the omitted gap of the private full master; the host B is retained separately in the comparison and outcome text. Both segments contain embedded captions, with separate text alternatives in Studio. Do not reuse these times for any other recording. Anish confirmed working audio/video in response to the review/local-publication request; **revision 1 is approved and locally published as release 1**. A fresh anonymous replay chose A, played the historical reveal, showed personal A / coached host B / original A0/B1, and preserved the frozen history. See [the rehearsal receipt](../../evidence/chess-rehearsal-2026-10-31.json), [replay checks](../../evidence/chess-replay-2026-10-31.json) and current [progress](../../PROGRESS.md). Final submission-video review and external publication remain separate.

Generated binaries are under ignored `data/chess-reconstruction/`:

- `opera-preparation-master.mp4`: original 1920×1080 preparation master, including lead-in and decision gap; no live history or host prediction.
- `setup.mp4`: separately encoded H.264/AAC 1280×720 setup, with no historical move/result or reveal audio.
- `reveal.mp4`: separately encoded H.264/AAC 1280×720 historical sequence and explanation.
- `review.html`: local two-player review page with descriptions and source links. Open with the adjacent files present.

These clips have readable **open captions baked into the image**, plus synthetic narration. [Setup WebVTT](setup.vtt) and [reveal WebVTT](reveal.vtt) are matching optional sidecars. Avoid displaying the sidecars on top of the already visible captions; use them for a future clean-caption export if needed. The separate [setup](setup-text.txt) and [reveal](reveal-text.txt) alternatives describe the board/action for accessibility. These are preparation assets; new host speech in a future recording needs its own matching captions.

Measured preparation-master offsets and hashes are in [verification.json](verification.json). The setup uses a genuine non-zero start after the generated lead-in. **Never reuse these offsets for a fresh OBS recording.** That later file must be measured and reviewed independently. No approval of a previous door/game revision carries over.

## Review once, then prepare the fresh session

Ask Anish to watch setup followed by reveal with sound and confirm: board/coordinates and captions readable; setup contains no historical answer; narration audible; queen → knight → rook sequence and explanation understandable. This review approves content for the next rehearsal only, not a new Studio release or public upload. If the side-browser audio is silent, open the same files in Windows Media Player, which worked for the earlier sound check.

After review: confirm Twitch READY and the signed-in account, create a fresh A/B moment, show actual accepted chat commands and lock, record Anish's actual prediction before playing the historical sequence, then upload the coherent recording through Studio. Label operator-controlled accounts and offline chat accurately. Do not infer a broadcast, use previous votes or depict the historical players as app users. Review the resulting exact rendered files before any later approval/publication.

## Reproduce and preview

The standalone creator scene is [scene.html](scene.html); its controls sit below the 1920×1080 capture area. It starts in setup, lets the creator preview the fixed historical reveal, supports pause/reset and pauses on hiding the page. It is a silent visual scene; the generated MP4s carry narration. It has no interactive chess engine or alternative outcomes.

The offline renderer is `ops/render-chess-reconstruction.mjs`. It uses existing Playwright/Chrome, the project's FFmpeg/FFprobe and installed Windows speech synthesis. It also requires the temporary chess.js 1.4.0 validation package, obtained with `npm pack chess.js@1.4.0 --ignore-scripts` and unpacked under `data/chess-reconstruction/verification/package/` (not installed in the application). Run with Node 24 from the project root. It regenerates scene-data.js from content.json, validates the score, produces narration/frames, encodes the master and two clips, decodes the outputs and writes durations/hashes/captions. A rerender requires renewed human media review.
