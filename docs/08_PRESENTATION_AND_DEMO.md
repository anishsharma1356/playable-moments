# Presentation and demonstration plan
**Current status (28 October 2026):** Real Twitch chat, reconnect/late-vote rehearsals and a user-reviewed local OBS recording-to-replay workflow are verified. An eight-slide editable Spaces deck has been created: Page `page_fbdd524e8ce08191a9670b32a2fe61be`, “Playable Moments — Working Demo and Evidence”. It uses actual local rehearsal screenshots and labels the one-account recording and synthetic benchmark honestly. A final submission video and independent-viewer broadcast remain pending. See SUBMISSION_CHECKLIST.md for the concrete handoff.

The storyboard below remains the capture plan. The editable deck is saved in Spaces; a PowerPoint file was not requested. On 28 October the deck was updated to include reviewed captions/text alternatives, the guided keyboard flow and current remaining checks; changed slides were rendered and visually reviewed. The exact narration and shot instructions are in [demo/FINAL_DEMO_SCRIPT.md](demo/FINAL_DEMO_SCRIPT.md). Keep the deck and demo consistent with what actually works. Do not claim universal demand, unique invention of interactive video, or proven winning probability.

## Positioning
“Playable Moments preserves a Twitch decision so someone arriving later can choose before seeing the real outcome.”
Hinglish: “Aap live miss kar gaye, phir bhi result dekhne se pehle apni choice kar sakte ho. Hum original sawaal aur live response ko dobara use karte hain; recorded outcome change nahi karte.”

Avoid the absolute claim “all Twitch interaction dies after a stream.” Say instead: “A normal recording does not reproduce this decision interaction for a new viewer.”

## Suggested 8-slide deck
1. **Title and hook** — Missed the stream? Choose before the reveal. A/B visual, not an architecture screenshot.
2. **One concrete problem** — live participants make a choice; a later viewer sees the outcome without that step. Present as the chosen use case, not quantified adoption evidence.
3. **The product** — capture once → review → publish → viewer chooses → real reveal.
4. **Live creator experience** — real chat input and neutral overlay; one frozen historical snapshot.
5. **Replay experience** — setup-only media, accessible A/B card, actual outcome, separate comparison labels.
6. **How it works** — one application, Twitch adapter, SQLite, private media worker, split files. Explain separation as a reliability design decision.
7. **Why different / limits** — connected live-to-replay workflow rather than simply a poll or manually recreated quiz; two options, one channel, creator review; not a world-first claim or alternate video ending.
8. **Evidence and next steps** — real end-to-end test, measured results, Codex role, known limitations. No invented usage or revenue charts.

## Demonstration storyboard (target 2m45s; official requirement is less than 3 minutes)
- 0:00–0:15: problem and one original A/B situation.
- 0:15–0:45: show a genuine Twitch viewer command and the creator locking responses. Explain what is being counted.
- 0:45–1:05: creator makes the actual choice and outcome occurs. Use original media and genuine integration.
- 1:05–1:30: attach recording, show proposed boundaries and human output review, publish. An edit may shorten processing wait; clearly label elapsed time rather than imply instant rendering.
- 1:30–2:10: a separate replay browser watches setup, chooses, sees real outcome, and compares with immutable live responses. Show that its personal choice did not alter the original live split.
- 2:10–2:35: show real Codex development evidence: one useful implementation, one test/fix, and repo. Redact secrets and unrelated personal data.
- 2:35–2:45: summarise the experience and honestly state current limits.

The contest requires real Twitch functionality, Codex use and a runnable repository [S01–S03]. A polished deck does not replace the required demonstration video.

## Speaking script
“During a livestream, a creator can ask the audience to choose before something happens. Someone watching later normally only sees the recording. We preserve the question, options and original responses while the stream happens. The creator checks the recording boundaries and publishes the moment. A later viewer watches the setup, makes their own choice, and then sees the actual recorded outcome. Their choice is separate from the historical audience. The implementation uses real Twitch chat, a frozen vote snapshot and two reviewed video segments so ordinary playback cannot accidentally pass the decision boundary. The creator still checks audio and visual spoilers; we do not generate alternate endings.”

## Judge-criterion evidence, not guaranteed scores
- Innovation: demonstrate less reconstruction of the interaction after the stream, not merely another quiz player.
- Impact: show one real participant understanding and using the interaction; no claimed mass adoption.
- Implementation: authenticated input, exactly one account vote, race-safe lock, reviewed media, protected reveal and reproducible setup.
- Design: readable prompt, simple commands, clear creator steps, mobile choices and honest comparison.

## Repository/submission checklist
Source and assets; licence/attribution; start/test/deploy instructions; env template without secrets; clear demo-mode labels; original or authorised media; known limitations; actual verification report; Codex project/thread evidence and required session identifier obtained through the real interface. The rules do not require a runtime LLM. Do not claim an edited demo is uncut or that an upload/render delay is instantaneous.
