# Twitch timeout investigation — 28 October 2026

## What is known

The earlier Q72G round interrupted on the combined keepalive/welcome watchdog about 1.7 seconds after opening. That version did not retain the connection phase or frame timing at failure. Its historical cause cannot be established from the saved message alone.

A two-minute measurement of the original connection received the advertised 10-second keepalives consistently, with observed gaps of 9,999–10,001 ms. No outage was reproduced during that measurement. Measurements used real Twitch and the saved broadcaster authorization, with no chat payloads, credentials, provider session IDs or reconnect URLs logged.

## Reproduced and repaired defects

1. **Overlapping reconnect validation:** an older authorization validation could finish after a newer reconnect and open an extra socket. Its watchdog could later fail the shared intake. An attempt generation now invalidates superseded work on reconnect, failure and stop. A regression test failed with three sockets instead of two before the fix and passes afterward.
2. **Handover deadline replacement:** a heartbeat on the old socket during a Twitch-directed handover replaced its 30-second handover timer with the normal shorter keepalive timer. A valid replacement welcome arriving 20 seconds into the handover could therefore find the voting round already interrupted. The handover deadline now remains fixed. The regression failed with INTERRUPTED before the fix and passes with OPEN afterward.

These are verified implementation defects, not proof that either caused the historical Q72G timeout.

## Heartbeat and diagnosis behavior

- Initial connections request `keepalive_timeout_seconds=30` using Twitch's documented URL parameter. The welcome's advertised value remains authoritative; tests still exercise a provider advertising 10 seconds. Directed reconnect URLs are used unchanged.
- Keep the existing bounded two-second delivery grace. A 30-second session with no notification or keepalive fails after 32 seconds. This is a negotiated interval, not suppression of connection failures. A missing welcome and a stalled handover retain separate bounded deadlines.
- `/api/owner/twitch/status` now includes bounded process-local diagnostics: number of connection attempts/active connections, advertised keepalive interval, chat-notification/accepted-vote counters, last chat time, and the latest timeout's phase, silence duration and timer delay. Timing differences use a monotonic clock. These diagnostics reset when the process restarts; the latest timeout is retained across reconnects within that process.
- The endpoint remains owner-authenticated. It does not return tokens, chat content, account/message/session identifiers, or socket URLs. The public overlay continues to use its explicit safe projection.
- Unexpected loss still interrupts an OPEN round permanently. Reconnection permits a new draft only; it does not restore or publish an interrupted result. Locked snapshots are preserved.

## Verification

- Both new lifecycle regression tests were observed failing before the implementation change.
- Twitch integration suite: 19/19 passed after the change, including 30-second timeout/recovery and diagnostic privacy checks.
- Full unit/integration suite: 55/55 passed across five files (54.46 seconds), using isolated test data.
- Production build (including strict TypeScript), full ESLint and whitespace checks passed.
- Twitch provider browser fixtures: 2/2 passed, desktop and phone sizes, 1.4 minutes. These are isolated provider fixtures, not actual Twitch evidence.
- Updated connection measurement: Twitch advertised 30 seconds and delivered three keepalives with gaps of 29,998–30,000 ms during the two-minute observation. Neither measurement recorded a timeout or an event-loop delay over one second. Sanitized trace: `evidence/twitch-heartbeat-trace.jsonl`.
- The actual late-vote rehearsal is recorded in `PROGRESS.md` separately from those fixture checks.
- Actual controlled reconnect on 28 October: 767U accepted one real vote, then creator-triggered reconnect permanently interrupted it without a snapshot. READY recovered, a fresh T2K3 round rejected the old code and accepted/locked its own B vote. One active socket and no timeout were observed; previous 4QA3 A=1/B=1 remained intact. This verifies creator-triggered interruption/recovery, not a forced physical-network outage or Twitch-directed handover in production. Evidence: `evidence/controlled-reconnect-status.json` and `evidence/controlled-reconnect-result.json`.

No new dependency, OAuth permission, environment secret, database migration or public hosting was added. Start normally with `start-twitch.cmd`; existing configuration is retained.

Primary protocol reference: [Twitch — Handling WebSocket Events](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), checked 28 October 2026. Twitch documents adjustable keepalive timing, unchanged reconnect URLs, keeping the old connection until the replacement welcome, and no replay after an unexpected connection loss.
