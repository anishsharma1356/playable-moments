# M2 — Twitch setup and live verification

Updated 28 October 2026. **The complete Twitch/OBS acceptance gate is pending.** Genuine authorization/READY, two-account first-choice voting and deadline locking, isolated late-vote rejection, controlled reconnect with fresh-code recovery, and the actual local OBS recording-to-replay workflow are verified. J8QL revision 2 was reviewed by the user with audible sound, approved, published locally and replayed without changing its live snapshot. Two independent viewers and a public OBS broadcast remain; the existing accounts are operated by the user/Codex. See the current entries in `PROGRESS.md` for measured evidence. The walkthrough below remains the independent-viewer acceptance procedure.

## 1. Prepare your Twitch account

Sign in or create an account at [Twitch](https://www.twitch.tv/). Verify your email, then open Settings → Security and Privacy and enable two-factor authentication. Keep passwords, verification codes and stream keys in Twitch/OBS, not in chat.

## 2. Register your developer application

Open the [Twitch developer console](https://dev.twitch.tv/console/apps), then Applications → Register Your Application.

- Use a unique name, for example `Playable Moments Anish` (add a suffix if taken).
- Add this exact OAuth Redirect URL: `http://localhost:3000/auth/twitch/callback`.
- Select the category that fits your app. Use the **Confidential** client type if prompted; our server uses the authorization-code flow and a Client Secret.
- Complete verification, create the app, then open Manage.
- Keep the Client ID and newly generated Client Secret available privately for the next step. Creating another secret invalidates the previous one.

See Twitch's [registration guide](https://dev.twitch.tv/docs/authentication/register-app/) and [authorization-code guide](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).

## 3. Save credentials locally

In PowerShell, from the project directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-twitch.ps1
```

This execution-policy option applies only to this PowerShell process. The helper prompts for the Client ID, hides your Client Secret input, and asks for your broadcaster username. It uses Twitch's API to resolve that username to the numeric allowlisted account ID. It creates three independent random keys and writes the gitignored `.env.twitch` file without displaying secrets. It preserves `.env` and your demo data. The temporary app access token used for account lookup is not saved; the helper attempts to revoke it immediately afterward.

If `.env.twitch` already exists, the helper stops. Edit that file locally to correct values, preserving the three keys. Keep `.env.twitch` private. Changing the encryption key makes existing saved tokens unreadable and requires reconnecting Twitch.

## 4. Start real mode and authorize

Stop your current demo terminal with **Ctrl+C**, then run:

```powershell
.\start-twitch.cmd
```

Open [the creator studio](http://localhost:5173/studio), click **Connect Twitch**, and authorize the configured broadcaster. The only requested permission is `user:read:chat`. The account must match the username you configured. Wait for **READY** before opening a round.

Real mode uses `data/twitch`; demo mode uses the existing `data` directory. Both use ports 5173/3000, so run one at a time. Return to the demo with `start-local.cmd`. Old demo replay links are available when demo mode is running; real mode does not convert synthetic history into live history.

If the page cannot reach the app after an update, restart the terminal server and reload. If either port is busy, stop the other project launcher first. Retry a failed callback through Connect Twitch instead of reusing its URL.

## 5. Prepare OBS and an original scene

Create a stream session in the studio. Click **Create overlay URL** and copy that URL privately into an OBS Browser Source, with width 1920 and height 1080. The page has a transparent background outside its panel. See the [OBS Browser Source guide](https://obsproject.com/kb/browser-source).

The capability is read-only and lasts 12 hours. **Replace overlay URL** revokes the previous one. Do not share it as the public replay link. The overlay shows the question, choices, code, response status and total participating accounts; it never receives the A/B split, creator choice, outcome or recording URLs.

Prepare an original or authorized scene and record it manually in OBS. Keep the creator studio out of the broadcast/recording. Automatic OBS control and Twitch video downloading are outside this MVP.

## 6. Perform the actual M2 acceptance test

Arrange two consenting viewers and a real Twitch stream with the OBS overlay visible. This is the remaining manual gate; automated fixtures cannot satisfy it.

1. Create a draft with a neutral title, question, A/B labels and a 20–180 second voting window.
2. Start local OBS recording. When Twitch shows READY, click **Open responses**.
3. Have the viewers send the exact commands shown by the app, using the generated moment code. One chooses A; the other chooses B.
4. Have the first viewer send another choice. The total must remain two. Ordinary conversation, a wrong code and commands from another Shared Chat source must not count.
5. Click **Lock responses**, or let the server deadline lock. Send another command afterward: the frozen totals must not change.
6. Perform the actual choice/outcome in the original scene. Enter that actual choice and outcome in the creator controls.
7. Stop/remux the recording to MP4. Upload it, choose authoritative media boundaries, watch both rendered outputs with audio, approve, and publish.
8. Use a separate browser session to watch setup, choose, reveal and compare. Confirm the frozen counts still match the two original accounts.
9. In a separate new round, disconnect intake or the network while OPEN. The round must become INTERRUPTED and must not reopen or publish. Reconnect and create a new draft/code.

Record broadcaster identity, READY state, two real participating accounts, duplicate/late behavior, frozen result and a real stream displaying the overlay. Redact overlay capability URLs and credentials. Test-fixture screenshots and generated counts are not real participants.

## Operational boundaries

- Local mode remains loopback-only. Production startup and public binding remain disabled pending M4.
- Startup and periodic token validation (before an hour) verify the configured account and permission; refreshes are single-flight and rotated tokens are encrypted atomically.
- Revocation ends dependent creator sessions and interrupts open voting. Published replay is independent unless explicitly unpublished.
- Twitch-directed reconnects hand over to the new connection; unexpected loss interrupts the round because missed events are not replayed.
- Connection attempts now discard superseded validations, preserve the directed-handover deadline, and negotiate a 30-second keepalive while honoring the welcome value. Bounded owner-only timing/counter diagnostics help distinguish timeout phases. See `TWITCH_RELIABILITY.md` for actual measurements, regression tests and the verified FTCJ late-vote test; the original historical timeout's exact cause remains unproven.
- A later deleted chat message does not erase an already accepted vote. Counts represent accounts, not distinct humans.
- No runtime mock-vote endpoint exists in real mode. Test providers live only under `tests/` and are injected by automated tests.

Primary references checked 27 October 2026: [chat authentication](https://dev.twitch.tv/docs/chat/authenticating/), [EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/), [token refresh](https://dev.twitch.tv/docs/authentication/refresh-tokens/). Competition rules and deadlines were not rechecked as part of M2 implementation.
