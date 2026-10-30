import { randomUUID, randomInt, createHmac } from "node:crypto";
import { validateCaptions } from "../../../packages/core/src/captions.js";
import {
  ensure,
  transition,
  parseVote,
  reviewHash,
  validateBounds,
  type Option,
  type Bounds,
} from "../../../packages/core/src/index.js";
import type {
  Store,
  Moment,
  Snapshot,
  Edit,
  Asset,
  Release,
  Attempt,
} from "./storage.js";
import type {
  MomentDto,
  Historical,
  EditDto,
  ReleaseDto,
} from "../../../packages/contracts/src/index.js";
export const OWNER = "local-demo-owner";
export const CHANNEL = "local-demo-channel";
const now = () => Date.now();
export class Domain {
  readonly ownerId: string;
  readonly channelId: string;
  readonly mode: "DEMO" | "REAL_TWITCH";
  constructor(
    public s: Store,
    identity?: { broadcasterId: string; voteKey: Buffer },
  ) {
    this.ownerId = identity ? `twitch:${identity.broadcasterId}` : OWNER;
    this.channelId = identity?.broadcasterId ?? CHANNEL;
    this.mode = identity ? "REAL_TWITCH" : "DEMO";
    if (identity) s.voteKey = Buffer.from(identity.voteKey);
    s.run(
      "INSERT OR IGNORE INTO creator(id,twitch_user_id,twitch_login,created_at_ms) VALUES(?,?,?,?)",
      this.ownerId,
      identity?.broadcasterId ?? "DEMO",
      identity ? "Twitch creator" : "Local demo creator",
      now(),
    );
  }
  moment(id: string) {
    const m = this.s.get<Moment>("SELECT * FROM moment WHERE id=?", id);
    ensure(m, 404, "NOT_FOUND", "Moment not found.");
    return m;
  }
  asset(id: string) {
    const a = this.s.get<Asset>("SELECT * FROM media_asset WHERE id=?", id);
    ensure(a, 404, "NOT_FOUND", "Media not found.");
    return a;
  }
  edit(id: string) {
    const e = this.s.get<Edit>("SELECT * FROM media_edit WHERE id=?", id);
    ensure(e, 404, "NOT_FOUND", "Edit not found.");
    return e;
  }
  version(m: Moment, v: number) {
    ensure(
      m.version === v,
      409,
      "STALE_VERSION",
      "The moment changed. Reload before retrying.",
    );
  }
  active(momentId: string) {
    return this.s.get<Release>(
      "SELECT * FROM release WHERE moment_id=? AND revoked_at_ms IS NULL",
      momentId,
    );
  }
  editable(m: Moment) {
    ensure(
      !this.active(m.id),
      409,
      "UNPUBLISH_FIRST",
      "Unpublish before creating a new revision.",
    );
  }
  audit(id: string, event: string) {
    this.s.insert("audit_event", {
      id: randomUUID(),
      moment_id: id,
      actor_kind: "OWNER",
      event_type: event,
      safe_metadata_json: "{}",
      created_at_ms: now(),
    });
  }
  invalidate(id: string) {
    this.s.run(
      "UPDATE media_edit SET status='NEEDS_REVIEW',review_hash=NULL,approved_by=NULL,approved_at_ms=NULL,approval_json=NULL WHERE moment_id=? AND status='APPROVED'",
      id,
    );
  }
  createSession(label: string) {
    const id = randomUUID();
    this.s.insert("stream_session", {
      id,
      creator_id: this.ownerId,
      channel_id: this.channelId,
      mode: this.mode,
      label,
      created_at_ms: now(),
    });
    return id;
  }
  createMoment(
    sessionId: string,
    input: {
      title: string;
      question: string;
      optionA: string;
      optionB: string;
      durationSeconds: number;
    },
  ) {
    ensure(
      this.s.get(
        "SELECT id FROM stream_session WHERE id=? AND creator_id=? AND mode=?",
        sessionId,
        this.ownerId,
        this.mode,
      ),
      404,
      "NOT_FOUND",
      "Session not found.",
    );
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = Array.from(
        { length: 4 },
        () => chars[randomInt(chars.length)],
      ).join("");
    } while (
      this.s.get(
        "SELECT id FROM moment WHERE channel_id=? AND code=?",
        this.channelId,
        code,
      )
    );
    const id = randomUUID();
    this.s.insert("moment", {
      id,
      session_id: sessionId,
      channel_id: this.channelId,
      code,
      public_slug: randomUUID(),
      title: input.title,
      question: input.question,
      option_a: input.optionA,
      option_b: input.optionB,
      duration_seconds: input.durationSeconds,
      created_at_ms: now(),
    });
    return this.momentDto(this.moment(id));
  }
  open(id: string, v: number, time = now()) {
    return this.s.db
      .transaction(() => {
        const m = this.moment(id);
        this.version(m, v);
        transition(m.capture_state, "OPEN");
        ensure(
          !this.s.get(
            "SELECT id FROM moment WHERE channel_id=? AND capture_state=?",
            m.channel_id,
            "OPEN",
          ),
          409,
          "ALREADY_OPEN",
          "A moment is already open.",
        );
        this.s.run(
          "UPDATE moment SET capture_state='OPEN',version=version+1,opened_at_ms=?,deadline_at_ms=? WHERE id=?",
          time,
          time + m.duration_seconds * 1000,
          id,
        );
        this.audit(id, "moment.open");
        return this.momentDto(this.moment(id));
      })
      .immediate();
  }
  vote(input: {
    channelId: string;
    mode: "DEMO" | "REAL_TWITCH";
    message: string;
    accountId: string;
    notificationId: string;
    chatMessageId: string;
    receivedAtMs: number;
    providerTimestamp?: string;
  }) {
    const p = parseVote(input.message);
    if (!p) return false;
    return this.s.db
      .transaction(() => {
        const m = this.s.get<Moment>(
          "SELECT * FROM moment WHERE channel_id=? AND code=?",
          input.channelId,
          p.code,
        );
        if (
          !m ||
          m.capture_state !== "OPEN" ||
          input.receivedAtMs >= (m.deadline_at_ms ?? 0) ||
          input.receivedAtMs < (m.opened_at_ms ?? 0)
        )
          return false;
        const session = this.s.get<{ mode: string }>(
          "SELECT mode FROM stream_session WHERE id=?",
          m.session_id,
        )!;
        if (input.mode !== session.mode) return false;
        const account = createHmac("sha256", this.s.voteKey)
          .update(`${m.id}:${input.accountId}`)
          .digest("hex");
        if (
          this.s.get(
            "SELECT id FROM live_vote WHERE moment_id=? AND account_key=?",
            m.id,
            account,
          ) ||
          this.s.get(
            "SELECT notification_id FROM accepted_event WHERE notification_id=? OR (channel_id=? AND chat_message_id=?)",
            input.notificationId,
            input.channelId,
            input.chatMessageId,
          )
        )
          return false;
        this.s.insert("accepted_event", {
          notification_id: input.notificationId,
          chat_message_id: input.chatMessageId,
          channel_id: input.channelId,
          moment_id: m.id,
          mode: input.mode,
          received_at_ms: input.receivedAtMs,
          provider_timestamp:
            input.providerTimestamp ??
            new Date(input.receivedAtMs).toISOString(),
        });
        this.s.insert("live_vote", {
          id: randomUUID(),
          moment_id: m.id,
          account_key: account,
          option_id: p.optionId,
          notification_id: input.notificationId,
          received_at_ms: input.receivedAtMs,
        });
        return true;
      })
      .immediate();
  }
  lock(id: string, v: number, time = now()) {
    return this.s.db
      .transaction(() => {
        const m = this.moment(id);
        this.version(m, v);
        transition(m.capture_state, "LOCKED");
        this.s.run(
          "UPDATE moment SET capture_state='LOCKED',version=version+1,locked_at_ms=? WHERE id=?",
          time,
          id,
        );
        const a = this.s.get<{ n: number }>(
          "SELECT COUNT(*) n FROM live_vote WHERE moment_id=? AND option_id='A'",
          id,
        )!.n;
        const b = this.s.get<{ n: number }>(
          "SELECT COUNT(*) n FROM live_vote WHERE moment_id=? AND option_id='B'",
          id,
        )!.n;
        const mode = this.s.get<{ mode: string }>(
          "SELECT mode FROM stream_session WHERE id=?",
          m.session_id,
        )!.mode;
        this.s.insert("live_snapshot", {
          id: randomUUID(),
          moment_id: id,
          mode,
          count_a: a,
          count_b: b,
          total: a + b,
          locked_at_ms: time,
          integrity_hash: reviewHash({ id, a, b, mode, time }),
          created_at_ms: now(),
        });
        this.audit(id, "moment.lock");
        return this.momentDto(this.moment(id));
      })
      .immediate();
  }
  outcome(
    id: string,
    input: {
      expectedVersion: number;
      creatorChoice: Option;
      outcomeSummary: string;
      resolvedAnswer?: Option | null;
    },
  ) {
    return this.s.db
      .transaction(() => {
        const m = this.moment(id);
        this.version(m, input.expectedVersion);
        this.editable(m);
        transition(m.capture_state, "OUTCOME_RECORDED");
        this.s.run(
          "UPDATE moment SET capture_state='OUTCOME_RECORDED',version=version+1,creator_choice=?,outcome_summary=?,resolved_answer=?,outcome_at_ms=? WHERE id=?",
          input.creatorChoice,
          input.outcomeSummary,
          input.resolvedAnswer ?? null,
          now(),
          id,
        );
        this.invalidate(id);
        this.audit(id, "moment.outcome");
        return this.momentDto(this.moment(id));
      })
      .immediate();
  }
  patch(
    id: string,
    v: number,
    input: {
      title: string;
      question: string;
      optionA: string;
      optionB: string;
      durationSeconds: number;
    },
  ) {
    const m = this.moment(id);
    this.version(m, v);
    ensure(
      m.capture_state === "DRAFT",
      422,
      "FROZEN",
      "Question and options freeze on opening.",
    );
    this.s.run(
      "UPDATE moment SET title=?,question=?,option_a=?,option_b=?,duration_seconds=?,version=version+1 WHERE id=?",
      input.title,
      input.question,
      input.optionA,
      input.optionB,
      input.durationSeconds,
      id,
    );
    return this.momentDto(this.moment(id));
  }
  cancel(id: string, v: number) {
    const m = this.moment(id);
    this.version(m, v);
    transition(m.capture_state, "CANCELLED");
    this.s.run(
      "UPDATE moment SET capture_state='CANCELLED',version=version+1 WHERE id=?",
      id,
    );
    return this.momentDto(this.moment(id));
  }
  seed() {
    ensure(
      this.mode === "DEMO",
      403,
      "DEMO_DISABLED",
      "Synthetic moments are disabled in real mode.",
    );
    return this.s.db
      .transaction(() => {
        const sid = this.createSession("Original door scene · SIMULATED DEMO");
        let m = this.createMoment(sid, {
          title: "Two doors. One decision.",
          question: "Which door leads to the treasure?",
          optionA: "Red door",
          optionB: "Blue door",
          durationSeconds: 45,
        });
        m = this.open(m.id, m.version);
        for (let i = 0; i < 12; i++)
          this.vote({
            channelId: CHANNEL,
            mode: "DEMO",
            message: `!pick ${m.code} ${i < 5 ? "A" : "B"}`,
            accountId: `synthetic-${i}`,
            notificationId: randomUUID(),
            chatMessageId: randomUUID(),
            receivedAtMs: now(),
          });
        m = this.lock(m.id, m.version);
        return this.outcome(m.id, {
          expectedVersion: m.version,
          creatorChoice: "B",
          outcomeSummary:
            "The creator opened the blue door. The treasure was inside.",
          resolvedAnswer: "B",
        });
      })
      .immediate();
  }
  createEdit(
    id: string,
    input: Bounds & {
      expectedVersion: number;
      masterAssetId: string;
      setupCaptions?: string;
      revealCaptions?: string;
      setupTranscript?: string;
      revealTranscript?: string;
    },
  ) {
    return this.s.db
      .transaction(() => {
        const m = this.moment(id);
        this.version(m, input.expectedVersion);
        this.editable(m);
        ensure(
          m.capture_state === "OUTCOME_RECORDED",
          422,
          "INVALID_STATE",
          "Record the actual outcome first.",
        );
        const a = this.asset(input.masterAssetId);
        ensure(
          a.moment_id === id && a.kind === "MASTER" && a.status === "READY",
          422,
          "INVALID_MASTER",
          "Choose the ready master for this moment.",
        );
        validateBounds(
          {
            setupStartMs: input.setupStartMs,
            setupEndMs: input.setupEndMs,
            revealStartMs: input.revealStartMs,
            revealEndMs: input.revealEndMs,
          },
          a.duration_ms,
        );
        this.invalidate(id);
        const version = this.s.get<{ v: number }>(
          "SELECT COALESCE(MAX(version),0)+1 v FROM media_edit WHERE moment_id=?",
          id,
        )!.v;
        const editId = randomUUID(),
          jobId = randomUUID();
        this.s.insert("media_edit", {
          id: editId,
          moment_id: id,
          version,
          master_asset_id: a.id,
          setup_start_ms: input.setupStartMs,
          setup_end_ms: input.setupEndMs,
          reveal_start_ms: input.revealStartMs,
          reveal_end_ms: input.revealEndMs,
          setup_captions: validateCaptions(
            input.setupCaptions ?? "",
            input.setupEndMs - input.setupStartMs,
          ),
          reveal_captions: validateCaptions(
            input.revealCaptions ?? "",
            input.revealEndMs - input.revealStartMs,
          ),
          setup_transcript: input.setupTranscript ?? "",
          reveal_transcript: input.revealTranscript ?? "",
          status: "QUEUED",
          proposed_content_version: m.version,
          created_at_ms: now(),
        });
        this.s.insert("media_job", {
          id: jobId,
          moment_id: id,
          edit_id: editId,
          input_asset_id: a.id,
          kind: "RENDER_SEGMENTS",
          status: "QUEUED",
          deduplication_key: editId,
          created_at_ms: now(),
        });
        return { editId, jobId, editVersion: version };
      })
      .immediate();
  }
  content(m: Moment) {
    return {
      title: m.title,
      question: m.question,
      optionA: m.option_a,
      optionB: m.option_b,
      creatorChoice: m.creator_choice,
      outcomeSummary: m.outcome_summary,
      resolvedAnswer: m.resolved_answer,
    };
  }
  hash(e: Edit) {
    const m = this.moment(e.moment_id);
    return reviewHash({
      content: this.content(m),
      contentVersion: m.version,
      editVersion: e.version,
      master: this.asset(e.master_asset_id).sha256,
      bounds: [
        e.setup_start_ms,
        e.setup_end_ms,
        e.reveal_start_ms,
        e.reveal_end_ms,
      ],
      setup: e.setup_asset_id ? this.asset(e.setup_asset_id).sha256 : null,
      reveal: e.reveal_asset_id ? this.asset(e.reveal_asset_id).sha256 : null,
      // Preserve hashes for old approved revisions with no alternatives.
      ...(e.setup_captions ||
      e.reveal_captions ||
      e.setup_transcript ||
      e.reveal_transcript
        ? {
            alternatives: {
              setupCaptions: e.setup_captions,
              revealCaptions: e.reveal_captions,
              setupTranscript: e.setup_transcript,
              revealTranscript: e.reveal_transcript,
            },
          }
        : {}),
    });
  }
  latest(e: Edit) {
    ensure(
      this.s.get<{ id: string }>(
        "SELECT id FROM media_edit WHERE moment_id=? ORDER BY version DESC LIMIT 1",
        e.moment_id,
      )?.id === e.id,
      409,
      "STALE_EDIT",
      "Review the latest edit revision.",
    );
  }
  approve(id: string, input: { editVersion: number; reviewHash: string }) {
    const e = this.edit(id);
    this.latest(e);
    this.editable(this.moment(e.moment_id));
    ensure(
      e.status === "NEEDS_REVIEW" &&
        e.version === input.editVersion &&
        e.proposed_content_version === this.moment(e.moment_id).version &&
        e.review_hash === input.reviewHash &&
        this.hash(e) === input.reviewHash,
      409,
      "STALE_REVIEW",
      "Render and review the current content and outputs.",
    );
    this.s.run(
      "UPDATE media_edit SET status='APPROVED',approved_by=?,approved_at_ms=?,approval_json=? WHERE id=?",
      this.ownerId,
      now(),
      JSON.stringify(input),
      id,
    );
    this.audit(e.moment_id, "media.approved");
    return this.editDto(this.edit(id));
  }
  publish(
    id: string,
    input: { expectedVersion: number; editId: string; reviewHash: string },
  ) {
    return this.s.db
      .transaction(() => {
        const m = this.moment(id);
        this.version(m, input.expectedVersion);
        this.editable(m);
        const e = this.edit(input.editId);
        this.latest(e);
        ensure(
          e.moment_id === id &&
            e.status === "APPROVED" &&
            e.review_hash === input.reviewHash &&
            this.hash(e) === input.reviewHash,
          409,
          "REVIEW_REQUIRED",
          "Approve the latest processed outputs before publishing.",
        );
        const snapshot = this.s.get<Snapshot>(
          "SELECT * FROM live_snapshot WHERE moment_id=?",
          id,
        );
        ensure(
          snapshot && m.capture_state === "OUTCOME_RECORDED",
          422,
          "INCOMPLETE",
          "The moment requires a frozen history and recorded outcome.",
        );
        const releaseId = randomUUID(),
          version = this.s.get<{ v: number }>(
            "SELECT COALESCE(MAX(version),0)+1 v FROM release WHERE moment_id=?",
            id,
          )!.v;
        const content = JSON.stringify(this.content(m));
        this.s.insert("release", {
          id: releaseId,
          moment_id: id,
          version,
          edit_id: e.id,
          snapshot_id: snapshot.id,
          setup_asset_id: e.setup_asset_id,
          reveal_asset_id: e.reveal_asset_id,
          content_json: content,
          content_hash: reviewHash(this.content(m)),
          published_at_ms: now(),
        });
        this.audit(id, "release.published");
        return this.releaseDto(this.active(id)!);
      })
      .immediate();
  }
  unpublish(id: string, v: number) {
    const m = this.moment(id);
    this.version(m, v);
    this.s.run(
      "UPDATE release SET revoked_at_ms=? WHERE moment_id=? AND revoked_at_ms IS NULL",
      now(),
      id,
    );
    this.s.run("UPDATE moment SET version=version+1 WHERE id=?", id);
    this.invalidate(id);
    this.audit(id, "release.revoked");
    return { ok: true };
  }
  release(slug: string, releaseId?: string) {
    const m = this.s.get<Moment>(
      "SELECT * FROM moment WHERE public_slug=?",
      slug,
    );
    ensure(m, 404, "NOT_FOUND", "Moment not found.");
    const r = releaseId
      ? this.s.get<Release>(
          "SELECT * FROM release WHERE id=? AND moment_id=?",
          releaseId,
          m.id,
        )
      : this.s.get<Release>(
          "SELECT * FROM release WHERE moment_id=? ORDER BY version DESC LIMIT 1",
          m.id,
        );
    ensure(r, 404, "NOT_FOUND", "This moment has not been published.");
    ensure(
      r.revoked_at_ms === null,
      410,
      "REVOKED",
      "This moment changed. Open the current version.",
    );
    return { m, r };
  }
  choose(release: Release, sessionId: string, option: Option) {
    return this.s.db
      .transaction(() => {
        const old = this.s.get<Attempt>(
          "SELECT * FROM replay_attempt WHERE release_id=? AND viewer_session_id=?",
          release.id,
          sessionId,
        );
        if (old) {
          ensure(
            old.option_id === option,
            409,
            "CHOICE_LOCKED",
            "Your first choice is already saved.",
          );
          return this.unlock(old);
        }
        const a: Attempt = {
          id: randomUUID(),
          release_id: release.id,
          viewer_session_id: sessionId,
          option_id: option,
        };
        this.s.insert("replay_attempt", { ...a, created_at_ms: now() });
        return this.unlock(a);
      })
      .immediate();
  }
  unlock(a: Attempt) {
    const release = this.s.get<Release>(
      "SELECT * FROM release WHERE id=?",
      a.release_id,
    )!;
    const edit = this.edit(release.edit_id);
    return {
      attemptId: a.id,
      releaseId: a.release_id,
      optionId: a.option_id,
      revealUrl: `/api/replay/attempts/${a.id}/reveal`,
      ...(edit.reveal_captions
        ? { revealCaptionsUrl: `/api/replay/attempts/${a.id}/captions` }
        : {}),
      ...(edit.reveal_transcript
        ? { revealTranscript: edit.reveal_transcript }
        : {}),
    };
  }
  historical(s: Snapshot): Historical {
    return {
      countA: s.count_a,
      countB: s.count_b,
      total: s.total,
      mode: s.mode,
      lockedAtMs: s.locked_at_ms,
    };
  }
  interrupt(reason: string) {
    this.s.run(
      "UPDATE moment SET capture_state='INTERRUPTED',version=version+1,interrupted_at_ms=?,interruption_reason=? WHERE channel_id=? AND capture_state='OPEN'",
      now(),
      reason,
      this.channelId,
    );
  }
  momentDto(m: Moment): MomentDto {
    const s = this.s.get<Snapshot>(
      "SELECT * FROM live_snapshot WHERE moment_id=?",
      m.id,
    );
    return {
      id: m.id,
      sessionId: m.session_id,
      mode: this.s.get<{ mode: "DEMO" | "REAL_TWITCH" }>(
        "SELECT mode FROM stream_session WHERE id=?",
        m.session_id,
      )!.mode,
      participantCount: this.s.get<{ n: number }>(
        "SELECT COUNT(*) n FROM live_vote WHERE moment_id=?",
        m.id,
      )!.n,
      code: m.code,
      publicSlug: m.public_slug,
      title: m.title,
      question: m.question,
      optionA: m.option_a,
      optionB: m.option_b,
      durationSeconds: m.duration_seconds,
      captureState: m.capture_state,
      interruptionReason: m.interruption_reason ?? null,
      version: m.version,
      openedAtMs: m.opened_at_ms,
      deadlineAtMs: m.deadline_at_ms,
      lockedAtMs: m.locked_at_ms,
      creatorChoice: m.creator_choice,
      outcomeSummary: m.outcome_summary,
      historical: s ? this.historical(s) : null,
    };
  }
  editDto(e: Edit): EditDto {
    return {
      setupCaptions: e.setup_captions,
      revealCaptions: e.reveal_captions,
      setupTranscript: e.setup_transcript,
      revealTranscript: e.reveal_transcript,
      id: e.id,
      version: e.version,
      status: e.status,
      masterAssetId: e.master_asset_id,
      setupStartMs: e.setup_start_ms,
      setupEndMs: e.setup_end_ms,
      revealStartMs: e.reveal_start_ms,
      revealEndMs: e.reveal_end_ms,
      setupPreviewUrl: e.setup_asset_id
        ? `/api/owner/assets/${e.setup_asset_id}/content`
        : null,
      revealPreviewUrl: e.reveal_asset_id
        ? `/api/owner/assets/${e.reveal_asset_id}/content`
        : null,
      reviewHash: e.review_hash,
    };
  }
  releaseDto(r: Release): ReleaseDto {
    const m = this.moment(r.moment_id);
    return {
      releaseId: r.id,
      version: r.version,
      slug: m.public_slug,
      url: `/m/${m.public_slug}`,
    };
  }
}
