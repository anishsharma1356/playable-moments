# Local load measurements — 28 October 2026

These are labelled synthetic measurements on this laptop's Docker/WSL2 environment. No load was sent to Twitch and no audience/unique-person claim is made. Rendering was idle. Hardware: Intel Core i7-8750H, Linux x64, Node 24.22.1; application limited to 2 CPU and 3 GiB. Evidence includes cgroup limits and exact counts.

## Vote intake

`ops/load-test.ts` uses the real EventSub validation, deduplication, first-vote and SQLite transaction path with a fake provider/socket. Each run uses a fresh volume with networking disabled. The final run includes the new 1,024-pending-handler overload guard.

| Case | Accepted / rejected | Measured result |
|---|---|---|
| 1,050 events over 30 seconds: 1,000 unique plus duplicates/wrong codes | 1,000 / 50 | 35.01 events/s; transaction p95 **2.618 ms**, dispatch-scheduled-to-persist p95 **3.362 ms**; peak RSS 130.4 MiB |
| 1,000-event finite burst | 1,000 / 0 | 1.129 s total; transaction p95 1.541 ms, **scheduled-to-persist p95 1,062.091 ms** |
| Lock after event 500 in a 1,000-event burst | 500 / 500 | Frozen A=250/B=250; no post-lock change |

All cases reject a later previously unseen account and retain the exact snapshot. SQLite integrity passed. Peak RSS across cases was 176.6 MiB. The proposed paced p95 <250 ms target passed. Reporting only transaction latency would conceal burst backlog, so scheduled latency is retained. The event-loop histogram is deliberately omitted for synchronous bursts where it cannot measure the blocking batch.

A separate integration regression injects 1,100 synchronous messages: at 1,024 pending handlers the app interrupts the round, closes intake and creates no complete-looking snapshot. This bounds tracked application handlers; it does not establish bounded OS socket buffers or sustained-overload capacity at arbitrary rates.

Evidence: [final vote run](evidence/vote-load-final-2026-10-28.json). The earlier `vote-load-2026-10-28.json` is retained as an initial pre-guard measurement.

## HTTPS video delivery

`ops/video-load.mjs` used moving synthetic 720p setup/reveal clips, separate viewer cookies, certificate-verified HTTPS through the private Caddy proxy, and one 512 KiB range per client per second. Every response's bytes/hash and Content-Range matched the reference; pre-choice reveal failed and history stayed 5/7. The fixture app was the preceding hardened image; caption/UI changes are covered separately by functional tests, not this timing result.

| Clients / measured ranges | p95 range response | Aggregate delivery |
|---|---|---|
| 5 / 40 | 46.33 ms | 23.87 Mbps |
| 10 / 180 | 85.72 ms | 44.28 Mbps |

Ten-client scheduled-to-complete p95 was 88.10 ms; maximum response 209.21 ms. App limits: 2 CPU/3 GiB; proxy: 1 CPU/512 MiB. All clients share one IP and the normal 300 requests/minute limiter remained active. The measured stages lasted about 7 and 17 seconds. This is a short local range-delivery check, **not browser decoding, a soak test, Internet bandwidth, simultaneous encoding/intake capacity, or 1,000 video viewers**. No production capacity promise follows.

Evidence: [video run](evidence/video-load-2026-10-28.json), [generated fixture checks](evidence/video-fixture-2026-10-28.json). Temporary serving containers were stopped.

## Reproduction and next deployment measurement

Bundle the vote harness with the repository's esbuild (`--bundle --platform=node --format=esm --packages=external`), mount it at `/app/vote-load.mjs` in the built image, use a **new** `/data` volume and `--network none --cpus 2 --memory 3g --read-only --cap-drop ALL --security-opt no-new-privileges`. Set `PM_LOAD_TEST=synthetic-only`, `APP_MODE=demo`, `NODE_ENV=test`, `HOST=127.0.0.1`. The harness supplies its own fake real-mode provider; no credentials are used.

The video harness requires the private-network HTTPS fixture, its own CA and synthetic release manifest; it asserts its test-only flag. Do not point either harness at a public Twitch channel. On the selected host, repeat modest delivery/slow-network and longer-duration checks with documented limits before setting a public capacity target. Combined encoding plus voting remains a separate stress scenario.
