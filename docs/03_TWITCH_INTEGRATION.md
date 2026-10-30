# Twitch integration — one broadcaster, read-only chat

## 1. Verified route and scope
Use a Twitch-registered confidential web application and the authorisation-code flow, with token exchange on our server [S06]. The actor is the actual broadcaster; the app receives that broadcaster's user access token and uses EventSub WebSocket transport [S04–S05]. Request only `user:read:chat` initially. We do not need send-chat, channel points, polls, clip-creation, email, or moderator scopes for the main workflow.

This is a single-authorised-broadcaster application. Do not quietly turn it into an app-token multi-channel bot: that has different authorisation requirements [S04].

## 2. Manual steps for the owner
1. Sign in to Twitch, verify email, enable 2FA, and register the developer application [S09].
2. Register the exact callback used by this app, initially `http://localhost:3000/auth/twitch/callback`; use the separately registered HTTPS callback for deployment.
3. Store Client ID, Client Secret, encryption key, and allowed Twitch broadcaster ID in the server environment. Client ID is not a secret; Client Secret and tokens are.
4. Start the app and click Connect Twitch. Check the requested permission before authorising.
5. Verify the authenticated user ID matches `ALLOWED_BROADCASTER_ID`; reject any other account. Do not automatically accept the first person who logs in to a public deployment.
6. Confirm EventSub status READY, then run a real `!pick <code> A` test with a consenting viewer.

Do not share stream keys or tokens with Codex in chat or put them in the repository. Judging instructions must explain how a reviewer supplies their own test account/configuration; no public bypass.

## 3. OAuth lifecycle
`GET /auth/twitch/start` creates cryptographically random single-use state, short expiry, and browser binding. Callback validates state and exact redirect, exchanges code server-to-server, calls `/validate`, checks user ID and scopes, stores encrypted access/refresh tokens, and creates a short-lived owner session cookie. Do not put access tokens in browser storage or URL fragments.

Use HttpOnly session cookies, SameSite=Lax, Secure in HTTPS, and an independent CSRF token/Origin check for mutations. Rotate the session on login. Bind each owner session to an auth generation so revocation invalidates all associated sessions.

Validate the Twitch token on startup and at least hourly [S07]. Refresh with a single-flight refresh lock on expiry/401, saving rotated material atomically [S08]. If invalid because access was revoked, end dependent owner sessions and interrupt active voting. Never make the user log in again for each chat event.

## 4. EventSub subscription
Open `wss://eventsub.wss.twitch.tv/ws` server-side. After welcome, create the subscription via Helix with the returned session ID, within the welcome timeout. The WebSocket is not where subscription JSON commands are sent [S05].

```json
{
  "type": "channel.chat.message",
  "version": "1",
  "condition": {
    "broadcaster_user_id": "<authorised broadcaster ID>",
    "user_id": "<same authorised broadcaster ID>"
  },
  "transport": {
    "method": "websocket",
    "session_id": "<welcome session ID>"
  }
}
```

Read `payload.event.message.text`, `chatter_user_id`, the channel identity, event chat `message_id`, and envelope `metadata.message_id`. Do not deduplicate by timestamp or display name. For MVP, ignore Shared Chat messages whose non-null `source_broadcaster_user_id` differs from the authorised channel [S10]. Validate schemas without assuming optional fields always exist.

## 5. Connection state
`DISCONNECTED → CONNECTING → SUBSCRIBING → READY` with `REAUTH_REQUIRED`, `RECONNECTING`, and `ERROR` branches.

Track keepalives and websocket ping/pong. The client must not send arbitrary application messages down the EventSub socket. On a Twitch-directed reconnect, connect to the supplied URL and hand over according to the documented sequence. Validate the supplied host/scheme against Twitch expectations; do not follow arbitrary user-provided URLs.

On an unexpected disconnect, establish a new socket and recreate subscriptions with backoff/jitter. Twitch does not replay events missed in that gap. Interrupt an OPEN moment; a completed snapshot remains valid. Repeated messages can be delivered, so event and vote idempotency are required [S05].

## 6. Normalised adapter interface
```ts
type NormalizedVoteInput = {
  provenance: 'REAL_TWITCH' | 'DEMO';
  notificationId: string;
  chatMessageId: string;
  broadcasterId: string;
  chatterId: string;
  text: string;
  receivedAtMs: number;
  providerTimestamp: string;
};
```
The real and simulated adapters call the same domain parser, but every session locks its provenance at creation. Enforce no cross-mode insertion at domain and persistence boundaries. Demo input endpoints must not exist in a real/public deployment.

## 7. Votes and moderation boundaries
No arbitrary user text enters the overlay: only creator-authored questions/options and numerical counts. Valid command parsing does not require storing normal conversation. A later chat-message deletion does not currently remove a previously accepted vote; document this limitation. Support cancel/restart of a compromised round rather than pretending to be a moderation-grade election system. No wagering, prizes for voters, or certified vote integrity.

## 8. Acceptance gate for a real integration
Record, without exposing tokens: correct broadcaster, granted scopes, subscription READY, two real consenting account commands, unique first-vote counts, repeated-command behaviour, late-code rejection, correct frozen result, and real overlay update. One account sending 1,000 messages is not 1,000 participants. An optional synthetic local load test must be separately labelled.
