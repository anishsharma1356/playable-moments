# API contract and browser events

Implementation update (28 October 2026): see [MEDIA_ALTERNATIVES_API.md](MEDIA_ALTERNATIVES_API.md) for the implemented revision-bound caption/text fields and choice-gated caption endpoints. This original contract document also contains planned items; consult PROGRESS.md and executable contracts for current status.

`contracts/openapi.yaml` defines the planned wire shapes. It is not an already-running API. JSON uses camelCase; the SQL schema uses snake_case. All state-changing owner calls require an authenticated owner session, CSRF token, allowed Origin, and an `Idempotency-Key`. Moment mutations include `expectedVersion`. Return safe DTOs, not ORM rows.

## Owner endpoints
| Method / route | Purpose |
|---|---|
| GET `/auth/twitch/start` | Begin OAuth; short-lived browser-bound state. |
| GET `/auth/twitch/callback` | Validate state, exchange code, verify allowlisted broadcaster, establish owner session. |
| GET `/api/owner/me` | Owner identity, CSRF token, connection status and mode; no OAuth tokens. |
| POST `/api/owner/logout` | Revoke owner session. Disconnecting Twitch is a separate explicit action. |
| GET `/api/owner/twitch/status` | READY/REAUTH_REQUIRED/etc; never secrets. |
| POST `/api/owner/twitch/disconnect` | Interrupt OPEN moment, revoke local authorisation/session generation, remove token material. |
| GET/POST `/api/owner/sessions` | List or create our own stream session. |
| GET/POST `/api/owner/sessions/{sessionId}/moments` | List or create a DRAFT moment. |
| GET/PATCH `/api/owner/moments/{momentId}` | Read details; edit question/options/title only while DRAFT. |
| POST `/api/owner/moments/{momentId}/open` | Freeze text; verify intake health; store deadline and generated code. |
| POST `/api/owner/moments/{momentId}/lock` | Atomic lock and final snapshot; never reopen. |
| POST `/api/owner/moments/{momentId}/cancel` | Cancel DRAFT/OPEN or acknowledge interrupted round; not silent vote rewriting. |
| POST `/api/owner/moments/{momentId}/outcome` | After lock, save actual creator choice and outcome; invalidate review if changed before publishing. |
| POST `/api/owner/moments/{momentId}/media` | Bounded owner MP4 multipart upload; returns asset/job IDs with 202. |
| GET `/api/owner/assets/{assetId}/content` | Private original/master/derived preview; owner authorization and Range support. |
| GET `/api/owner/jobs/{jobId}` | Status/error; sanitise decoder logs. |
| POST `/api/owner/jobs/{jobId}/retry` | Retry a failed job using the same immutable input revision; bounded attempts. |
| POST `/api/owner/moments/{momentId}/edits` | Create a new immutable cut revision and rendering job. |
| GET `/api/owner/edits/{editId}` | Review state, safe private preview URLs, hashes, bounds. |
| POST `/api/owner/edits/{editId}/approve` | Bind owner confirmation to asset hashes, content version and current bounds. |
| POST `/api/owner/moments/{momentId}/publish` | Validate all gates; create active immutable release. |
| POST `/api/owner/moments/{momentId}/unpublish` | Revoke active release; later media requests return 410. |
| DELETE `/api/owner/moments/{momentId}` | Deliberate deletion: revoke first, purge dependent records/files with documented recovery. |
| POST `/api/owner/sessions/{sessionId}/overlay-key` | Generate/rotate scoped read-only capability; return secret only to owner. |
| GET `/api/owner/sessions/{sessionId}/events` | Owner SSE, safe but more detailed than overlay projection. |

Delete must not report complete until the DB and media cleanup outcome is known. Use a durable cleanup task if files cannot be deleted immediately; show pending status rather than pretending erasure completed.

## Overlay and replay endpoints
| Method / route | Authentication / response boundary |
|---|---|
| GET `/api/overlay/{key}/state` | Hashed read capability; only safe question/status/code/total. |
| GET `/api/overlay/{key}/events` | Same scope; no admin mutations or private fields. |
| GET `/api/replay/{slug}` | Safe public manifest; creates/renews anonymous session and CSRF context. |
| GET/HEAD `/api/replay/{slug}/setup?releaseId=...` | Only the approved setup segment of the active release. |
| POST `/api/replay/{slug}/attempts` | Anonymous session + CSRF + Origin + idempotency; commit A/B for exact releaseId. |
| GET `/api/replay/{slug}/attempt` | Return this browser session's current attempt and safe reveal availability, not another session's. |
| GET/HEAD `/api/replay/attempts/{attemptId}/reveal` | Attempt belongs to browser session; release active; Range supported. |
| GET `/api/replay/attempts/{attemptId}/result` | Same ownership; returns frozen live snapshot, actual creator choice/outcome and own pick. UI waits until reveal ends. |
| POST `/api/replay/attempts/{attemptId}/complete` | Optional idempotent completion marker; not proof someone watched attentively. |
| GET `/health/live` | Process liveness only. |
| GET `/health/ready` | DB/migrations/storage/FFmpeg readiness; Twitch status shown separately since replay can work offline. |

Unrecognised releaseId or a revoked release returns 409/410 as appropriate. No viewer-facing route receives any private upload/storage key. Access to an unapproved draft uses owner routes only, not hidden public parameters.

## Request examples
Create a moment:
```json
{"title":"Which door would you choose?","question":"Which door leads to the treasure?","optionA":"Red door","optionB":"Blue door","durationSeconds":45}
```
Open/lock:
```json
{"expectedVersion":1}
```
Record the actual outcome:
```json
{"expectedVersion":3,"creatorChoice":"B","outcomeSummary":"The treasure was behind the blue door.","resolvedAnswer":"B"}
```
Create edit (milliseconds in normalised master):
```json
{"expectedVersion":4,"masterAssetId":"asset-master-uuid","setupStartMs":1000,"setupEndMs":18000,"revealStartMs":20500,"revealEndMs":36000}
```
Approve exact processed outputs:
```json
{"editVersion":1,"reviewHash":"server-provided-sha256","watchedSetup":true,"watchedReveal":true,"audioChecked":true,"rightsConfirmed":true,"metadataChecked":true}
```
These booleans record the owner's confirmation; they do not prove viewing or rights automatically.

Pre-choice manifest:
```json
{"slug":"example-safe-slug","releaseId":"release-uuid","title":"Which door would you choose?","question":"Which door leads to the treasure?","options":[{"id":"A","label":"Red door"},{"id":"B","label":"Blue door"}],"mode":"DEMO","setup":{"url":"/api/replay/example-safe-slug/setup?releaseId=release-uuid","durationMs":17000},"csrfToken":"session-bound-example"}
```
Choice request:
```json
{"releaseId":"release-uuid","optionId":"A"}
```
Unlock response:
```json
{"attemptId":"attempt-uuid","releaseId":"release-uuid","optionId":"A","revealUrl":"/api/replay/attempts/attempt-uuid/reveal"}
```
No A/B live counts, actual outcome, creatorChoice or full recording URL in either pre-choice response or unlock response. The result endpoint is separate to prevent an accidental early display in the UI.

## SSE contract
Use SSE `id` as the current entity version/monotonic projection revision and `event` as one of:
- `snapshot`: entire *authorised projection* on connect/reconnect.
- `moment.status`: code/question/state/deadline/neutral total only for overlay.
- `twitch.health`: READY, reconnecting, interrupted, auth required.
- `media.job`: owner-only job status.
- `publication.changed`: owner-only approval/publication changes.

Native EventSource can use same-origin cookies. Overlay has its own read capability. Redact its key from logs; set no-referrer, no indexing, and rotate on exposure. Coalesce public neutral count updates (e.g. twice per second) rather than push a large history for every vote. Heartbeat every 15 seconds; disable proxy buffering and use `text/event-stream` with no-cache. On reconnect send a fresh authoritative snapshot; don't pretend Last-Event-ID means every missed UI event is replayed. Slow clients receive the latest state, not unbounded queues.

## Error shape
```json
{"error":{"code":"STALE_VERSION","message":"The moment changed. Reload before retrying.","requestId":"request-uuid","retryable":false}}
```
Use 400 invalid input, 401 absent/expired session, 403 wrong owner/CSRF/reveal denied, 404 unknown resource, 409 conflict/stale version, 410 revoked publication, 413 too large, 415 unsupported media, 422 invalid state/media boundary, 429 rate limited, 503 transient provider/storage problem. Do not return stack traces, tokens, OAuth codes, storage roots, or FFmpeg command lines with private paths.
