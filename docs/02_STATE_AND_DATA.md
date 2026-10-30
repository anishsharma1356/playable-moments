# State, counting, persistence, and concurrency

## 1. Separate state dimensions
Do not overload one status with every concern.
- **Capture state:** DRAFT → OPEN → LOCKED → OUTCOME_RECORDED. DRAFT/OPEN can become CANCELLED. An unexpected connection loss/process restart while OPEN becomes INTERRUPTED and cannot resume. A new round needs a new code.
- **Media/edit state:** DRAFT → QUEUED → RENDERING → NEEDS_REVIEW → APPROVED, or FAILED. A changed edit creates a new version rather than overwriting an approved one.
- **Publication:** absent → active immutable release → revoked. A new publish after revision has a new release ID/version; old release access is revoked.
- **Replay:** no attempt → committed personal choice → optional completion event. Choice is immutable for that anonymous session/release.

One stream session can contain sequential moments. Only one OPEN moment per channel is permitted through a partial unique DB index. A session is not necessarily a Twitch VOD or a Twitch stream ID; it is our recording/organising container.

## 2. Vote eligibility and ordering
Default grammar, case insensitive after trim:
`^!pick\s+([A-Z2-9]{4})\s+([AB])$`
Generate codes without visually confusing characters; persist uniqueness per channel. Do not reuse an old code. Four characters provide sufficient MVP space; expand length if exhausted. Do not accept `!pick A` as an ambiguous fallback.

On a Twitch notification:
1. Confirm expected notification type/version and subscribed channel; reject messages from other Shared Chat source channels for MVP.
2. Parse the command. Discard unrelated chat without storing its body.
3. Stamp server receipt time and append the event to the channel's ordered mutation queue. Owner Open/Lock and deadline closure use this same ordering boundary.
4. Inside one short transaction, reject duplicate notification ID or duplicate underlying chat message ID.
5. Require the referenced moment to be OPEN and the event's server receipt to be before the configured deadline. First server-accepted choice wins; Twitch display name is irrelevant.
6. Derive a pseudonymous account key using HMAC(moment ID + Twitch chatter ID), store the accepted vote with its source IDs, and increment/read counters through persisted state.
7. Commit, then publish an allowed projection to connected clients. Never emit an accepted result before persistence succeeds.

User-facing wording: votes count if accepted by the application while the window is open. We cannot infer the frame the viewer saw or compensate perfectly for broadcast latency. We do not reopen a round for late messages after the answer could be known.

Duplicate transport events, a repeated command, and a replay choice are three different things. Handle each separately. First-vote policy prevents one account from switching A/B repeatedly. One account is not one human; no anti-Sybil guarantee.

Owner `moment.version` increments only on phase/content changes, not on every vote. Otherwise the creator’s control requests would conflict continuously. Live count/SSE projection revisions are separate.

## 3. Atomic lock
`BEGIN IMMEDIATE`:
- Resolve idempotency key before applying a second mutation.
- Verify expected moment version and OPEN state.
- Set `locked_at_ms`, change state to LOCKED, and increment the optimistic version.
- Count committed valid votes by A/B and create one `live_snapshot` with mode, cutoff, counts, and an integrity hash.
- Commit.

The hash is a consistency aid, not proof that Twitch or a judge authenticated the counts. Read data only from the snapshot for publication. There is no endpoint for editing live counts. A zero-vote snapshot remains zero; never fabricate a crowd.

Retries with the same mutation idempotency key and body return the original response; the same key with a different payload returns 409. Other stale `expected_version` writes return 409 and require reloading.

## 4. Interruption rules
Unexpected EventSub loss, revoked permission, startup recovery of an OPEN row, or a local intake-overflow condition interrupts the round. Freeze its accepted partial results for diagnostics, label it INTERRUPTED, and block publication as a completed live moment. Do not silently replace missed traffic with DEMO traffic.

A server-directed EventSub reconnect is different: follow Twitch's handover procedure and deduplicate overlap. If that handover fails or a gap cannot be ruled out, interrupt conservatively. Already locked snapshots survive a later disconnect unchanged. Replaying a published release does not require a live Twitch connection.

## 5. Reference entity model
The SQL file is a baseline. Add migrations, not ad-hoc schema edits.

| Entity | Responsibility / uniqueness |
|---|---|
| creator | Single allowed owner and broadcaster identity. |
| oauth_credential | Encrypted access/refresh token material; no public serialization. |
| owner_session | Hashed session identifier, expiry, CSRF binding, revocation. |
| stream_session | Creator session, REAL_TWITCH/DEMO provenance, active/ended status. |
| moment | Question, immutable options after opening, phase, code, deadline, actual choice/outcome, safe public slug. |
| accepted_event | Unique envelope and underlying chat IDs for accepted vote ingestion. No unrelated chat. |
| live_vote | Unique `(moment_id, account_key)`; A/B; source IDs; first accepted time. |
| live_snapshot | One immutable final snapshot per moment; counts sum to total. |
| media_asset | ORIGINAL/MASTER/SETUP/REVEAL/POSTER file metadata, hash, private storage key, duration, state. |
| media_edit | Versioned confirmed boundaries against one MASTER asset; approval binds outputs and content hash. |
| media_job | Durable queued/running/succeeded/failed jobs with retry bookkeeping and deduplication key. |
| release | Immutable public version binding moment content, snapshot, approved edit and assets. Only one active release per moment. |
| viewer_session | Random anonymous browser session, hashed token, expiry. No Twitch login. |
| replay_attempt | Unique `(release_id, viewer_session_id)`; personal A/B choice, optional completion. |
| operation_key | Idempotency key, canonical request hash, operation, and stored safe response. |
| overlay_key | Hashed read-only capability scoped to session; rotation/revocation. |
| audit_event | Minimal transitions and errors; no secrets, full message dumps, or raw video. |

Use UUIDs or secure random identifiers; never derive public asset paths from titles or outcomes. All time instants are UTC epoch milliseconds; also preserve exact received Twitch timestamp strings when needed for diagnostics. Media offsets are separate integer milliseconds relative to the normalised master. Do not compare a UTC epoch directly with `video.currentTime`.

## 6. Release immutability
A release stores a copy of title/question/options/creator choice/outcome and references the frozen snapshot and approved assets. Editing the moment later cannot mutate the published representation. Publishing again requires revoking the old release and a fresh review of a new version. Every attempt refers to an exact release ID.

On revocation, public manifest/setup/reveal/result endpoints deny further access (410). Media requests recheck release status; private-cache headers minimise stale delivery. Already downloaded bytes cannot be recalled. A viewer on an old version sees “This moment changed; open the current version,” not silently different results.

## 7. Data minimisation
Persist only parsed voting facts and pseudonymous per-moment account keys. No public list of chatters. Use server-held HMAC keys, not plain unsalted hashes of Twitch IDs. Tokens encrypted separately; sessions are random capabilities whose hashes are stored.

Defaults to implement and document: unused originals/private masters removable after successful publication by owner action; operational event/audit retention 7 days; anonymous replay sessions expire after 7 days; publication stays until owner deletes it. Keep only what is needed to explain results. This is a proposed privacy policy, not legal compliance certification.

An authorised delete path can revoke and purge a moment, media, and replay records, and must be tested. Database immutability protects ordinary updates, not legitimate deliberate erasure. Never pretend a pseudonymous account key is legally anonymous under every jurisdiction.
