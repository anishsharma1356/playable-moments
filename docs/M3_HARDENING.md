# M3 reliability and security — local work, 28 October 2026

The user authorized this work while two real viewers are unavailable. All destructive verification uses isolated generated fixtures and temporary databases. No existing creator moment or OBS recording was deleted. No real broadcast, hosted deployment or human output approval is claimed.

## Implemented behavior

- Creator deletion checks authentication, ownership, Origin, CSRF, idempotency, expected version and exact title confirmation. OPEN voting and active upload/encoding block deletion; queued jobs are removed with the moment. Native confirmation dialogs support focus containment and Escape.
- A single SQLite transaction removes releases/attempts, jobs, edits, media records, votes, accepted events, snapshots and per-moment audit entries. Public and owner media routes immediately lose access to the erased records. Cached mutation response bodies are scrubbed. Opaque retry metadata is retained for its existing seven-day TTL with a 410 marker so a delayed create retry cannot recreate an erased moment.
- Migration `003_media_cleanup.sql` adds an independent durable file-removal queue. Files are removed only under the managed media directory with generated storage names, without recursive deletion. Failed removal is retried after 30 seconds and on later worker runs; pending/error counts appear in Studio. A restart after database erasure resumes outstanding disk cleanup.
- Startup reclaims unregistered generated MP4s and detached SETUP/REVEAL outputs, preserving referenced assets, originals, masters and review/release history. Existing master revisions are retained deliberately until the moment is erased. Exhausted interrupted jobs mark their edit FAILED instead of leaving it indefinitely RENDERING.
- Interrupted uploads remove temporary bytes. Concurrent uploads to one moment are rejected. Upload commit rechecks version, publication state and current creator authorization after asynchronous work. Approval/publication recheck authentication after hashing; publication checks the requested edit belongs to the target moment before inspecting its files.
- Missing or truncated media returns a safe 410 `MEDIA_UNAVAILABLE` response without exposing disk paths. Existing protected Range/HEAD and pre-choice access gates remain.
- Viewers can erase their current browser session and all its choices/cache entries from Privacy & data. Other viewer sessions and live snapshots remain unchanged. Expired sessions and dependent data are pruned at startup and every minute. Creator cookie expiry now matches the real-mode 12-hour server session.
- Publication, creator deletion and viewer deletion use native modal dialogs. Desktop/phone browser tests verify keyboard focus, Escape, confirmation gating, retry after a committed-but-lost choice response, and restored setup after clearing choices.

## API additions

All owner mutations require the existing owner cookie, exact Origin, CSRF header and Idempotency-Key. These endpoints remain local-only.

| Endpoint | Request / response |
|---|---|
| `POST /api/owner/erase-moment` | `{momentId, expectedVersion, confirmation}` → `{deleted:true}`. `confirmation` is the exact title. Database removal is immediate; file cleanup is asynchronous. Same-key retries return the original successful response. |
| `GET /api/owner/storage-status` | `{pendingFiles, retryingFiles}` for the authenticated creator. No filenames or paths. |
| `GET /api/privacy/session` | Establish/restore the anonymous browser session and return its CSRF token. No creator access. |
| `POST /api/privacy/clear-choices` | Viewer cookie, Origin, CSRF and Idempotency-Key; clears this session's choices and cookie. A lost response can be retried after obtaining a fresh privacy-session token. |

Deletion is application-level removal, not secure physical overwriting of SQLite/WAL pages or storage hardware. It cannot remove backups, downloaded files, the original OBS recording outside the managed store, or copies held by other people. Full installation/account retirement and backup retention are operational procedures to finalize with M4.

## Verification scope

See `PROGRESS.md` for actual commands and results. New integration coverage includes owner/CSRF/version/title denial, wrong-owner deletion, idempotent erasure and stale-create retry, full published-moment erasure with foreign-key checks, file-removal failure/restart, orphan recovery, cleanup path containment, exhausted worker recovery, interrupted upload, expiring sessions, authorization revocation during media verification, and missing/truncated media.

Original synthetic timing fixtures establish their own audio timing before exercising the pipeline. They combine variable-frame-rate video, delayed AAC audio and a version with nonzero start timestamps. Checks inspect normalized duration/start, colours near the decision boundary, decoded audio samples, metadata removal and both separately encoded segments. Existing no-audio, corrupt-media, hash, range and recovery tests remain. The normalization implementation did not need a timing change for these fixtures. [FFmpeg timestamp documentation](https://ffmpeg.org/ffmpeg.html) was consulted when designing the checks.

Finite fixtures cannot prove arbitrary recordings are semantically spoiler-free. Chrome phone emulation is not a physical-device test or a full screen-reader audit. Automated provider fixtures are not real Twitch participants.

## Next manual gate

1. At the next real session, restart the local application with `start-twitch.cmd`, reconnect only if the creator session has expired, and refresh the 12-hour overlay capability if needed.
2. Follow `OBS_RUNBOOK.md` with two consenting viewers: real broadcast, recorded scene, first votes, duplicate/late rejection and lock.
3. Upload that actual recording; the creator watches both processed outputs with audio, approves and publishes. Replay in a separate browser and verify frozen live history.
4. Test an intentional intake interruption in a disposable real round. Verify interrupted status and a new round/code after reconnect.
5. Complete physical-phone and assistive-technology review, then the remaining M4 container, host and measured load checks. The 28 October deployment-preparation work adds guarded HTTPS production configuration and verified backup tooling; public deployment remains pending the gates in DEPLOYMENT_RUNBOOK.md.
