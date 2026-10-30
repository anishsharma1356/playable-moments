# Submission handoff — 28 October 2026

**Source follow-up, 30 October:** source package v8 adds the missing upstream LGPL notice, clarifies the included FFmpeg patch terms and records a file/notice/known-secret review. Application sources are unchanged from v7. See [SOURCE_RELEASE_REVIEW.md](SOURCE_RELEASE_REVIEW.md). The final example is undecided; video, narration and example-specific description changes wait for that choice. Repository preparation, browser zoom/keyboard checks and human device/fresh-computer testing can proceed independently. The v7 paragraph below remains the preceding build baseline.

The [official rules](https://twitchcon-codex.devpost.com/rules), checked today, list the deadline as **2 November 2026, 2:00 pm PST**: **3 November, 3:30 am IST**. Recheck before submitting. They require a runnable repository, feature/Codex-use description, Codex session ID and a public YouTube demonstration under three minutes showing Twitch functionality and Codex development. English or an English translation is required. Confirm entrant eligibility, rights and access conditions in the rules yourself. A public hosted app is not explicitly listed as a separate submission requirement; judging access is described through the repository. Hosting remains a product launch task.

| Item | Current status / next action |
|---|---|
| Contest registration | **Complete.** Devpost showed “Thanks for registering!” on 28 October. Playable Moments name and pitch saved in draft `1269326`; 2/5 form steps complete. User requested finishing project details only after repo/video are ready |
| Working local product | Verified; see PROGRESS.md, including limits |
| Presentation | Eight editable slides, visually reviewed; Spaces Page `page_fbdd524e8ce08191a9670b32a2fe61be` |
| Genuine integration evidence | Existing two-account chat/reconnect/late-vote rehearsal; user-approved local OBS take. Both accounts are user-operated, not independent participants |
| Source repository | No Git remote configured at this check. Choose repository owner/name/visibility, review contents and provide access before submission |
| Reproducible setup | [Judge guide](JUDGE_GUIDE.md) and isolated Windows setup passed from a clean source copy, including full browser workflow. Linux container smoke/restore also verified locally. A separate fresh-machine run remains |
| Codex session ID | App-reported current build-thread ID: `01a1791d-3b64-7590-ab36-a3b1096b4328`, returned by the Codex app when opening the presentation on 28 October. Use this actual identifier, not a fabricated ID |
| Text description | Full field-ready story in [DEVPOST_ENTRY_DRAFT.md](DEVPOST_ENTRY_DRAFT.md); revise to match the final captured demonstration |
| Video | Fresh real Twitch voting, approved creator review/replay and actual Codex footage captured; private 2:08 text-led review cut exported and checked. Final narration, human review and public YouTube link pending |
| Original license/asset permissions | MIT applied, copyright 2026 Anish, after the user delegated the choice. Third-party terms retained. Recording/asset consent and final publication review remain |
| Submission | Draft only. Registration is complete; final project submission is pending repo/video and user review |

## Submission path without a paid application host

Rechecked the [official rules](https://twitchcon-codex.devpost.com/rules) and [FAQ](https://twitchcon-codex.devpost.com/resources) on 28 October after the user asked whether hosting was necessary. Section 4 specifies judging/testing access through a runnable repository containing source, required assets and setup instructions. It does not explicitly require a public deployed-app URL or a paid server. Our interpretation is to submit the local application with reproducible setup and real Twitch demonstration footage; this is a reading of the published rules, not individual organizer approval.

Recommended submission priority:

1. **Completed locally:** verify the judge's setup from a clean source copy. [JUDGE_GUIDE.md](JUDGE_GUIDE.md) supplies clearly labelled DEMO mode, generated original media and separate instructions for a judge's own Twitch credentials. The browser workflow and isolation passed; a different fresh computer remains untested. No creator secrets or private recordings are required.
2. Caption/audio/text and guided keyboard review have passed. Complete spoken screen-reader/device checks as available, and capture real Twitch chat, the OBS overlay and the local upload → review → publish → choose → reveal workflow. A local replay is labelled local; do not imply an available public replay service.
3. Capture actual Codex development footage, edit/caption a demonstration under three minutes, and publish the approved YouTube video. A slide deck alone is insufficient.
4. Publish the reviewed repository or provide the required private-repository judge access; include the project/Codex description and actual build session ID, then submit the reviewed entry. Maintain judge access through the end of judging.

The project specification's two-independent-viewer broadcast is a stronger product acceptance test, not an explicit participant-count requirement in the contest rules reviewed today. Seek those viewers, but do not confuse that internal test with an entry condition. Real Twitch functionality remains necessary, and existing two-account rehearsals must not be described as two independent people.

Paid hosting, a domain, public-host capacity/HTTPS/OAuth/recovery acceptance and an always-available public replay URL remain **uncompleted public-launch work**, not prerequisites we should impose on the local submission. No server/domain purchase is required for this recommended path. Source repository and video still need the access/visibility required by the rules. Update the final source bundle after judging instructions and footage are finalized.

The source package is refreshed as **v7**, adding the published-caption readability fix and corrected publication-status text to the prior comparison fix, caption evidence, demo/submission drafts and successful post-cleanup browser results. The sidecar `docs/evidence/source-review-v7-2026-10-28.json` records its exact hash. Two web build inputs differ from the tested v5 container candidate; the local TypeScript/lint/production build passed after this UI change, but no new container or six-scenario browser run is claimed. Earlier packages remain as history. Packages exclude private env files, databases, recordings, installed binaries, Git history and historical screenshots/raw reports. Exact known-local-secret checks are not comprehensive secret-scanner certification. A separate fresh-host acceptance remains. The connected GitHub account is `aggankush25-hash`; repository name/visibility and publication remain to be decided after final package review.

## Draft description

Playable Moments preserves a live Twitch decision for someone watching later. The creator opens an A/B round, receives authorized chat responses, locks one first-accepted choice per account and records what actually happens. The creator uploads their recording, separates setup from reveal, reviews both outputs and publishes a replay. A later viewer watches setup, makes a personal choice, then sees the original recorded outcome and a clearly separate historical comparison.

Codex helped implement the state machine, Twitch adapter, private media workflow, session-gated replay, reliability tests and deployment preparation. Development evidence includes a controlled-reconnect rehearsal, late-vote rejection, media security regressions, backup/restore checks and labelled synthetic load measurements. The latest iteration adds revision-bound captions/text alternatives and a bounded intake handler guard.

The working prototype supports one allowlisted creator, two options and manual recording/review. It does not change the recording, invent alternate endings, count replay choices as live votes, or claim tested public capacity. Caption/audio/text review and a guided keyboard flow passed. Spoken screen-reader, zoom/physical-phone review, public deployment and independent-viewer broadcast acceptance remain pending.

## Capture plan: 2 minutes 45 seconds

| Time | Capture / narration |
|---|---|
| 0:00–0:15 | Hook: “Missed the live moment? Make your choice before seeing what happened.” Show the original question. |
| 0:15–0:45 | Real channel chat command and matching Studio account count/lock. Identify the test as a rehearsal unless the independent broadcast has happened. Do not expose account settings, keys or overlay capability URLs. |
| 0:45–1:05 | Actual recorded Blue outcome. Existing approved J8QL revision 3 / release 2 is usable as a labelled local example with captions and descriptions; one genuine account, A=1/B=0. |
| 1:05–1:30 | Upload, boundaries, rendered clips and human review. Label any shortened processing wait. Do not represent automated fixture approval as human review. |
| 1:30–2:10 | Separate replay browser: setup, personal choice B, actual reveal, comparison with unchanged A=1/B=0. Show caption/text controls after human review. |
| 2:10–2:35 | Actual Codex conversation/code/test footage: overloaded intake interruption or spoiler-gated captions, plus passing checks. Screenshots/deck alone do not supply this footage. |
| 2:35–2:45 | State the one-creator/two-option scope and remaining launch checks. |

Existing source: `data/obs/recordings/2026-10-28 12-13-40.mp4`; approved audio-boost revision uses setup 20–30 s and reveal 96.5–106.5 s. Keep the original. Never claim a new live broadcast from these old local clips. Do not upload private recordings, chat identities or the submission until the final content and permissions are reviewed.

## Next involvement from Anish

1. **Next:** watch `data/submission-video/playable-moments-review-cut-v1.mp4`, then record the narration using [the timed recording sheet](demo/FINAL_DEMO_SCRIPT.md). Actual Codex, fresh Twitch and approved local replay footage are captured. Watch the final narrated export with sound before approving publication.
2. Complete spoken Narrator, 200% zoom and physical-phone feedback when ready. Caption/audio/descriptive-text and guided keyboard checks already passed; no need to repeat them unless the content changes.
3. Arrange two independent consenting viewers if available for the stronger broadcast test; chaitime56/chaitime23 remain useful for honestly labelled technical rehearsals.
4. Choose source repository visibility and approve source/video publication. Then return to the saved Devpost draft, supply both URLs and the actual session ID, review eligibility/rights and submit before the deadline. Original-project license is already MIT, credited to Anish.
5. Registration is complete; no further signup is needed. Hosting budget/domain is only needed if choosing a later public deployment.


## Repository-ready follow-up — 30 October 2026

Source package v9 supersedes v8 for publication preparation. Application files are byte-identical; all six current browser scenarios passed together. A fresh local repository on codex/submission-ready has the reviewed source staged, with no commit or remote. Original workspace history and private/generated files are excluded. The README now leads with runnable judge commands and labels the original design/handoff documents as historical.

Review evidence: [browser regression](evidence/browser-regression-2026-10-30.json) and [repository source checks](evidence/repository-source-checks-2026-10-30.json). This does not complete spoken screen-reader, actual zoom, physical-phone, fresh-computer or independent-viewer acceptance. Repository visibility/publication, final example/video and submission remain the next decisions/actions. No new vulnerability scan or binary-distribution approval is claimed.
