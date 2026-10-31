# Judge guide: run Playable Moments locally

This is a working local application with two explicitly separate ways to evaluate it. The quick walkthrough below uses generated original video and **12 synthetic responses**. It needs no Twitch account, API key, paid hosting or private project files. Genuine Twitch integration has been tested in local rehearsals; the complete narrated video is prepared, with final review/upload pending. It can also be tested with your own Twitch application using the linked instructions.

The submission video uses our independent **Opera chess decision** reconstruction. The quick-start fixture remains the small original door sample so judges can run the same workflow without private recordings, Twitch credentials or speech tools. Its synthetic history is separate from the real rehearsals in the video. Chess visuals, score, captions and optional authoring instructions are in [the media brief](demo/chess/README.md); open its standalone `scene.html` for a silent preview.

## Verified target and prerequisites

The interactive setup target is **Windows x64**, Node **24.22.1 or a newer Node 24 LTS security release**, and a current browser. Install Node with npm from [the official download page](https://nodejs.org/en/download). Reopen PowerShell after installation. The native SQLite dependency may need Python 3 and Visual Studio 2022 Build Tools with the **Desktop development with C++** workload; the clean-copy verification used tools already installed on this Windows machine. The separate Linux container build is verified, but it is not a substitute for testing this Windows interactive path on another person's machine.

Allow several GiB of free disk for dependencies, tools and media; the app requires a further 2 GiB reserve. The first setup downloads pinned dependencies and a checksum-verified Windows FFmpeg build into the project. No global pnpm install is required. It does not install system build tools, create accounts or change firewall settings.

The Windows media build is FFmpeg 9.0.2 from Gyan, pinned by checksum. It is separate from the patched Linux deployment build; do not assume the Linux security findings/patches describe it. Use the generated original fixture for this evaluation. Do not expose the local demo to the Internet.

## Start from the repository or source archive

Open PowerShell inside the extracted `playable-moments` folder, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-judge.ps1
.\start-judge.cmd
```

Setup uses pnpm 11.25.0 through npx, installs the frozen dependency graph, checks Node/SQLite/media tools and generates `data/judge-demo/fixtures/doors-demo.mp4`. If this project already contains the privately downloaded, checksum-verified portable Node runtime, the launcher uses it; the source archive does not distribute that binary. Otherwise it uses your installed Node. `ExecutionPolicy Bypass` applies only to this script process, not a permanent machine policy change.

Open **http://127.0.0.1:5180** and keep the terminal running. Ctrl+C stops it. Use that exact address: the local demo has an explicit Host/Origin allowlist. Its backend is on loopback port 3010. The separate IP address also keeps demo browser cookies separate from an existing Twitch session at `localhost`.

This launcher fixes DEMO mode, loopback bindings and `data/judge-demo`, reads only the non-secret `.env.example`, and removes Twitch credential variables from its child processes. It does not read `.env.twitch`, connect to Twitch, alter the existing `data/twitch` database, or automatically approve/publish any clip. Re-running preparation preserves existing demo moments.

## Complete the walkthrough

The existing-machine checks were refreshed on 30 October 2026: isolated preparation/startup passed, and all six automated desktop/phone-sized browser scenarios passed on the latest application source. The suite uses generated media and simulated provider events. It does not replace this human review or a first installation on another computer.

1. Select **Open creator studio → Enter local studio**. Open the prepared **Two doors. One decision.** moment, or select **New demo moment** to create another labelled example.
2. Upload `data/judge-demo/fixtures/doors-demo.mp4`. Wait for the private master preview.
3. Keep the four boundaries at **0, 5, 6, 12 seconds**, then select **Render preview**.
4. Play **both** processed clips with sound. Setup asks which door to choose, without the result. Reveal shows the Blue door turning gold with the treasure outcome and a tone. Setup is intentionally silent. This is generated demonstration media, not Twitch footage.
5. Review the five statements, select **Approve reviewed outputs**, then **Publish moment → Confirm publication**. Only approve if the actual outputs satisfy the statements; stop and report a mismatch rather than checking blindly.
6. Copy the replay link into an incognito/private window. Watch the setup, choose **A / Red door**, then select **Watch the actual outcome**.
7. After reveal playback, expect your Red choice, the creator's Blue choice, and **12 synthetic responses: A=5, B=7**. The replay choice must not change that historical split.
8. Refresh: your personal choice should persist in that private session. Open another fresh private session: it must make its own choice before receiving the reveal. Close all windows in the first private session before assuming a new private window has separate cookies.

The original fixture is generated from project source, with no external footage. Its tone starts at source second 6. No personal recording, credentials or seeded private data is needed. This walkthrough demonstrates the local workflow; it is not evidence of real Twitch participation or human accessibility acceptance.

## Test real Twitch integration separately

Stop the judge demo when finished. Follow [M2_PREPARATION.md](M2_PREPARATION.md) using **your own** verified Twitch account, confidential developer application and credentials. The callback is `http://localhost:3000/auth/twitch/callback`. The setup helper writes the private `.env.twitch`; do not commit or send its values to the project author. Real mode uses `start-twitch.cmd`, `http://localhost:5173/studio` and `data/twitch`.

The guide covers connection/READY, creating a round, coded chat responses, first-vote behavior and locking. Real input must be observed; the synthetic demo is never presented as a live test. The original build-thread ID and submission-video plan are in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md).

## Troubleshooting and stopping

| Symptom | Next action |
|---|---|
| Node missing or older than 24.22.1 | Install a current Node 24 LTS x64 build, reopen PowerShell, then run setup again |
| Native SQLite build fails | Install Python 3 and the Visual Studio C++ workload, reopen PowerShell, rerun setup; do not substitute an unfrozen dependency install |
| Download/checksum failure | Stop and inspect the stated upstream version. Do not bypass the checksum or disable TLS verification |
| Ports 5180/3010 busy | Stop the previous judge-demo terminal with Ctrl+C. The launcher fails rather than silently choosing a different port |
| Missing fixture | Run `node ops/judge.mjs prepare` with the supported Node version; existing demo moments are preserved |
| Cannot hear reveal | Check player mute/volume and Windows app output, replay both clips; do not approve until you can verify the intended audio |
| Low disk reserve | Free space or choose another project location; do not lower the reserve merely to hide a failure |

No teardown deletes data automatically. Keep `data/judge-demo` if you want to resume. To exercise another moment, use **New demo moment**. Local replay URLs require the application to be running on the same computer; this is not a publicly hosted replay service.
