# M2 runtime API additions

This documents implemented behavior beyond the retained baseline and M1 contract. Owner routes use the same HttpOnly owner cookie, exact Origin, CSRF token and idempotency-key conventions as M1. Every referenced resource is checked against the configured creator. Local-only restrictions remain; this is not a hosted deployment contract.

| Route | Behavior |
|---|---|
| `GET /api/config` | Public `{mode: "DEMO" | "REAL_TWITCH"}` only; no credentials or account configuration. |
| `GET /auth/twitch/start` | Real mode only. Creates a 5-minute, single-use OAuth state bound to an HttpOnly browser cookie. Redirects to Twitch with `user:read:chat`. |
| `GET /auth/twitch/callback` | Consumes browser-bound state, exchanges code server-side, validates client/account/scope, encrypts tokens, rotates owner session and starts intake. Redirects to configured studio origin. |
| `GET /api/owner/me` | Authenticated creator ID, Twitch user ID/login, actual mode and CSRF token. Checks auth generation, session expiry and validated real authorization. |
| `GET /api/owner/twitch/status` | Authenticated `{state, channelId, lastHealthyAtMs, safeMessage}`. No provider tokens, raw errors or subscription URLs. |
| `POST /api/owner/twitch/reconnect` | Authenticated mutation; interrupts any open round and restarts validation/intake. Returns status. |
| `POST /api/owner/twitch/disconnect` | Authenticated mutation; removes local credentials, revokes dependent sessions, interrupts voting and attempts provider revocation. If provider revocation fails, local disconnect remains effective and the error directs the owner to Twitch Connections. |
| `POST /api/owner/sessions/:sessionId/overlay` | Authenticated/idempotent creation, 201 `{url, expiresAtMs}`. Replaces the old session capability with a fresh random token, stored hashed; 12-hour TTL. |
| `GET /api/overlay/:key` | Capability-authorized safe snapshot; unavailable/expired/replaced keys return 404. |
| `GET /api/overlay/:key/events` | Same authorization, SSE `snapshot` events; expiry/replacement emits `unavailable` and closes. Rechecks capability every tick, limits connections and closes slow readers. |

The overlay snapshot contains only `mode`, `connection`, `question`, `optionA`, `optionB`, `code`, `phase`, `deadlineAtMs` and `participantCount`. It contains no per-option counts, creator choice, outcome, asset URLs or admin credentials. Its UI has no mutations and a transparent background outside the panel.

Existing session/moment/media/replay endpoints now preserve the configured identity and provenance. Owner `MomentDto` adds `mode`, `participantCount` and `interruptionReason`. Opening a real moment requires READY; the existing server deadline and atomic lock freeze history. Restart, unexpected disconnect, keepalive timeout, failed handover and revocation interrupt open rounds. A successful provider-directed handover retains the subscription and deduplicates across sockets.

`/auth/demo` and `/api/owner/demo/moments` are not registered in real mode. No REST route accepts simulated Twitch events. Public replay remains choice-gated with the M1 media boundaries; its provenance label now reflects the frozen snapshot's mode.

The only schema addition is versioned migration `002_twitch_oauth.sql` for expiring OAuth-state hashes; existing creator/credential/overlay tables from the baseline are now used. Token blobs use AES-256-GCM with fresh nonces and creator/client-bound additional data. No chat text, display names, token strings or provider error bodies are logged.
