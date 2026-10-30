# Implemented caption/text extension — 28 October 2026

The executable contracts in `packages/contracts/src/index.ts` are authoritative for this extension. The original handoff OpenAPI remains a baseline, not a complete inventory of current routes.

The existing owner create-edit request accepts four optional strings (default empty): `setupCaptions`, `revealCaptions` (20,000 characters each), `setupTranscript`, `revealTranscript` (trimmed, 6,000 each). Existing boundary/master/version fields and owner Origin/CSRF/idempotency checks are unchanged. WebVTT is normalized and validated against each output duration by `packages/core/src/captions.ts`. Edit responses include all four strings for the authenticated creator.

Migration `004_media_alternatives.sql` adds these fields to immutable media revisions. Every changed alternative requires a new edit and approval; a database trigger rejects in-place modification. The approval hash includes all nonempty alternatives. Empty alternatives preserve the legacy hash format, so existing approved releases retain their meaning.

| Route / response | Access and content |
|---|---|
| GET `/api/owner/edits/:editId/:segment/captions` | Authenticated owner; segment must be setup/reveal; returns that revision's WebVTT |
| Public manifest `setup.captionsUrl`, `setup.transcript` | Optional setup-only fields. No reveal URL/text or historical split |
| GET `/api/replay/:slug/setup/captions?releaseId=UUID` | Requires the specified currently available release; missing captions 404 |
| Choice/unlock response `revealCaptionsUrl`, `revealTranscript` | Optional fields delivered only after an accepted personal choice |
| GET `/api/replay/attempts/:attemptId/captions` | Same viewer-session/active-release gate as reveal media; missing captions 404 |

Caption responses are `text/vtt; charset=utf-8`, with the existing private/no-store policy. HEAD follows the same authorization. Unpublish/revocation blocks future retrieval; previously downloaded content cannot be recalled. Scripts/HTML/CSS, cue positioning, overlapping cues and timestamps outside the processed clip are rejected. Captions are English plain text in this MVP; accurate human content review is still required.

Tests cover malformed cues, hash binding, immutable storage, anonymous/unchosen/cross-session denial, HEAD, revocation, setup-only manifests, native browser track loading and text visibility after choice. Automated content is explicitly synthetic.
