import Fastify, { type FastifyRequest, type FastifyReply } from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  DomainError,
  ensure,
  digest,
  reviewHash,
} from "../../../packages/core/src/index.js";
import {
  momentInput,
  versionInput,
  outcomeInput,
  editInput,
  approveInput,
  publishInput,
  choiceInput,
  publicSchema,
} from "../../../packages/contracts/src/index.js";
import {
  openStore,
  type Session,
  type Moment,
  type Asset,
  type Edit,
  type Job,
  type Attempt,
  type Release,
  type Snapshot,
} from "./storage.js";
import { config, type Config } from "./config.js";
import { Domain } from "./domain.js";
import { Media, runTool } from "./media.js";
import { TwitchAuth, type ProviderFetch } from "./twitch-auth.js";
import { TwitchIntake, type SocketFactory } from "./twitch-intake.js";
import { registerOverlay } from "./overlay.js";
import type { ServerResponse } from "node:http";
import { pruneExpired } from "./retention.js";
const WEEK = 7 * 86400000;
const params = (req: FastifyRequest) => req.params as Record<string, string>;
const query = (req: FastifyRequest) => req.query as Record<string, string>;
export async function createApp(
  c: Config = config(),
  dependencies: {
    providerFetch?: ProviderFetch;
    socketFactory?: SocketFactory;
  } = {},
) {
  const s = openStore(c.dataDir),
    d = new Domain(s, c.mode === "real" ? c.twitch : undefined),
    media = new Media(d, c);
  ensure(
    c.mode !== "real" || c.twitch,
    500,
    "TWITCH_CONFIG_REQUIRED",
    "Real mode requires Twitch configuration.",
  );
  const twitchAuth =
    c.mode === "real" && c.twitch
      ? new TwitchAuth(s, c.twitch, d.ownerId, dependencies.providerFetch)
      : undefined;
  const twitch = twitchAuth
    ? new TwitchIntake(twitchAuth, d, dependencies.socketFactory)
    : undefined;
  const csrfFor = (token: string) =>
    c.twitch
      ? createHmac("sha256", c.twitch.signingKey)
          .update("csrf:" + token)
          .digest("hex")
      : digest("csrf:" + token);
  s.run(
    "UPDATE moment SET capture_state='INTERRUPTED',version=version+1,interrupted_at_ms=?,interruption_reason='Process restarted during open voting' WHERE capture_state='OPEN'",
    Date.now(),
  );
  pruneExpired(s);
  const app = Fastify({
    logger: false,
    // Hosted ingress is exactly one private Caddy hop; Compose exposes no API port.
    trustProxy: c.hosted ? (_address, hop) => hop === 0 : false,
    bodyLimit: 16384,
    requestTimeout: 120000,
  });
  const ownerStreams = new Set<ServerResponse>();
  app.addHook("preClose", async () => {
    for (const stream of ownerStreams) stream.end();
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: c.maxUpload, files: 1, fields: 0, parts: 1 },
    throwFileSizeLimit: true,
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  const origin = (req: FastifyRequest) =>
    ensure(
      req.headers.origin === c.origin,
      403,
      "ORIGIN_DENIED",
      "This request must come from the application.",
    );
  const loopback = (req: FastifyRequest) =>
    ensure(
      ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.ip),
      403,
      "LOCAL_ONLY",
      "Demo creator access is local only.",
    );
  app.addHook("onRequest", async (req, reply) => {
    const hosts = new Set(
      c.hosted
        ? [new URL(c.origin).host]
        : [
            `localhost:${c.port}`,
            `127.0.0.1:${c.port}`,
            `[::1]:${c.port}`,
            new URL(c.origin).host,
          ],
    );
    if (c.hosted && ["/health/live", "/health/ready"].includes(req.url))
      hosts.add(`localhost:${c.port}`);
    ensure(
      hosts.has(req.headers.host ?? ""),
      403,
      "HOST_DENIED",
      "Unexpected host.",
    );
    reply
      .header("Cache-Control", "private, no-store")
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "no-referrer")
      .header("X-Frame-Options", "DENY")
      .header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      );
    if (c.hosted) reply.header("Strict-Transport-Security", "max-age=31536000");
  });
  app.setErrorHandler((error, req, reply) => {
    const e = error as Error & { statusCode?: number };
    const known = e instanceof DomainError;
    const invalid = e instanceof z.ZodError;
    const status = known
      ? e.status
      : invalid
        ? 400
        : e.statusCode && e.statusCode < 500
          ? e.statusCode
          : 500;
    reply.code(status).send({
      error: {
        code: known
          ? e.code
          : invalid
            ? "INVALID_INPUT"
            : status === 413
              ? "TOO_LARGE"
              : status === 500
                ? "INTERNAL_ERROR"
                : "REQUEST_FAILED",
        message: known
          ? e.message
          : invalid
            ? "Check the request fields and try again."
            : status === 500
              ? "The request could not be completed."
              : status === 413
                ? "Upload exceeds the allowed size."
                : "The request is not valid.",
        requestId: req.id,
        retryable: status >= 500,
      },
    });
  });
  function session(req: FastifyRequest, role: "owner" | "viewer") {
    const token = req.cookies[`pm_${role}`];
    const found = token
      ? s.get<Session>(
          `SELECT * FROM ${role}_session WHERE token_hash=?`,
          digest(token),
        )
      : undefined;
    ensure(
      found && found.expires_at_ms > Date.now() && !found.revoked_at_ms,
      role === "viewer" ? 403 : 401,
      "SESSION_REQUIRED",
      role === "viewer"
        ? "A temporary browser session is required. Reload with cookies enabled."
        : "Open the creator studio to sign in.",
    );
    if (role === "owner") {
      if (!c.hosted) loopback(req);
      const creator = s.get<{ auth_generation: number }>(
        "SELECT auth_generation FROM creator WHERE id=?",
        d.ownerId,
      );
      ensure(
        found.creator_id === d.ownerId &&
          found.auth_generation === creator?.auth_generation &&
          (!twitchAuth || twitchAuth.authorized),
        401,
        "SESSION_REQUIRED",
        "Sign in to the configured creator account.",
      );
      authorizeResource(req);
    }
    return found;
  }
  function authorizeResource(req: FastifyRequest) {
    const p = params(req);
    const checks: [string, string][] = [
      [
        "sessionId",
        "SELECT id FROM stream_session WHERE id=? AND creator_id=?",
      ],
      [
        "momentId",
        "SELECT m.id FROM moment m JOIN stream_session ss ON ss.id=m.session_id WHERE m.id=? AND ss.creator_id=?",
      ],
      ["assetId", "SELECT id FROM media_asset WHERE id=? AND creator_id=?"],
      [
        "editId",
        "SELECT e.id FROM media_edit e JOIN moment m ON m.id=e.moment_id JOIN stream_session ss ON ss.id=m.session_id WHERE e.id=? AND ss.creator_id=?",
      ],
      [
        "jobId",
        "SELECT j.id FROM media_job j JOIN moment m ON m.id=j.moment_id JOIN stream_session ss ON ss.id=m.session_id WHERE j.id=? AND ss.creator_id=?",
      ],
    ];
    for (const [name, sql] of checks)
      if (p[name])
        ensure(
          s.get(sql, p[name], d.ownerId),
          404,
          "NOT_FOUND",
          "Resource not found.",
        );
  }
  function mutation(req: FastifyRequest, role: "owner" | "viewer") {
    const found = session(req, role);
    origin(req);
    ensure(
      typeof req.headers["x-csrf-token"] === "string" &&
        digest(req.headers["x-csrf-token"]) === found.csrf_hash,
      403,
      "CSRF_DENIED",
      "Reload the page before retrying.",
    );
    ensure(
      typeof req.headers["idempotency-key"] === "string" &&
        req.headers["idempotency-key"].length >= 16 &&
        req.headers["idempotency-key"].length <= 128,
      400,
      "IDEMPOTENCY_REQUIRED",
      "A valid idempotency key is required.",
    );
    return found;
  }
  function issue(
    req: FastifyRequest,
    reply: FastifyReply,
    role: "owner" | "viewer",
    forceNew = false,
  ) {
    let token = req.cookies[`pm_${role}`];
    let found = token
      ? s.get<Session>(
          `SELECT * FROM ${role}_session WHERE token_hash=?`,
          digest(token),
        )
      : undefined;
    if (
      forceNew ||
      !found ||
      found.expires_at_ms <= Date.now() ||
      found.revoked_at_ms ||
      (role === "owner" && found.creator_id !== d.ownerId)
    ) {
      token = randomBytes(32).toString("base64url");
      const id = randomUUID(),
        csrf = role === "owner" ? csrfFor(token) : digest("csrf:" + token);
      s.insert(
        `${role}_session`,
        role === "owner"
          ? {
              id,
              token_hash: digest(token),
              creator_id: d.ownerId,
              csrf_hash: digest(csrf),
              auth_generation: s.get<{ auth_generation: number }>(
                "SELECT auth_generation FROM creator WHERE id=?",
                d.ownerId,
              )!.auth_generation,
              expires_at_ms:
                Date.now() + (c.mode === "real" ? 12 * 3600000 : WEEK),
            }
          : {
              id,
              token_hash: digest(token),
              csrf_hash: digest(csrf),
              created_at_ms: Date.now(),
              expires_at_ms: Date.now() + WEEK,
            },
      );
      found = s.get<Session>(`SELECT * FROM ${role}_session WHERE id=?`, id)!;
      reply.setCookie(`pm_${role}`, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: new URL(c.origin).protocol === "https:",
        path: "/",
        maxAge: role === "owner" && c.mode === "real" ? 12 * 3600 : WEEK / 1000,
      });
    }
    return {
      session: found,
      csrfToken: role === "owner" ? csrfFor(token!) : digest("csrf:" + token),
    };
  }
  function operation(
    req: FastifyRequest,
    who: Session,
    fn: () => unknown,
    body: unknown = req.body,
    status = 200,
  ) {
    const key = req.headers["idempotency-key"] as string,
      op = req.method + " " + req.url,
      hash = reviewHash(body ?? {});
    return s.db
      .transaction(() => {
        const old = s.get<{
          request_hash: string;
          safe_response_json: string;
          response_status: number;
        }>(
          "SELECT * FROM operation_key WHERE principal_key=? AND operation=? AND idempotency_key=?",
          who.id,
          op,
          key,
        );
        if (old) {
          ensure(
            old.response_status !== 410,
            410,
            "RESOURCE_ERASED",
            "This earlier operation belongs to a deleted moment.",
          );
          ensure(
            old.request_hash === hash,
            409,
            "KEY_CONFLICT",
            "This retry key was already used for different input.",
          );
          return JSON.parse(old.safe_response_json) as unknown;
        }
        const result = fn();
        s.insert("operation_key", {
          id: randomUUID(),
          principal_key: who.id,
          operation: op,
          idempotency_key: key,
          request_hash: hash,
          response_status: status,
          safe_response_json: JSON.stringify(result),
          created_at_ms: Date.now(),
          expires_at_ms: Date.now() + WEEK,
        });
        return result;
      })
      .immediate();
  }
  function ownerPost(
    url: string,
    fn: (req: FastifyRequest) => unknown,
    status = 200,
  ) {
    app.post(url, async (req, reply) => {
      const who = mutation(req, "owner");
      reply.code(status);
      return operation(req, who, () => fn(req), req.body, status);
    });
  }
  const ownerGet = (
    url: string,
    fn: (req: FastifyRequest, reply: FastifyReply) => unknown,
  ) =>
    app.get(url, async (req, reply) => {
      session(req, "owner");
      return fn(req, reply);
    });
  ownerPost("/api/owner/erase-moment", (req) => {
    const input = z
      .object({
        momentId: z.string().uuid(),
        expectedVersion: z.number().int().positive(),
        confirmation: z.string().min(1).max(80),
      })
      .strict()
      .parse(req.body);
    const result = media.erase(
      input.momentId,
      input.expectedVersion,
      input.confirmation,
    );
    queueMicrotask(() => media.kick());
    return result;
  });
  ownerGet("/api/owner/storage-status", () => ({
    pendingFiles: s.get<{ n: number }>(
      "SELECT COUNT(*) n FROM media_purge WHERE creator_id=?",
      d.ownerId,
    )!.n,
    retryingFiles: s.get<{ n: number }>(
      "SELECT COUNT(*) n FROM media_purge WHERE creator_id=? AND safe_error_code IS NOT NULL",
      d.ownerId,
    )!.n,
  }));
  app.get("/api/privacy/session", async (req, reply) => ({
    csrfToken: issue(req, reply, "viewer").csrfToken,
  }));
  app.post("/api/privacy/clear-choices", async (req, reply) => {
    const who = mutation(req, "viewer");
    s.db
      .transaction(() => {
        s.run("DELETE FROM operation_key WHERE principal_key=?", who.id);
        s.run("DELETE FROM viewer_session WHERE id=?", who.id);
      })
      .immediate();
    reply.clearCookie("pm_viewer", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(c.origin).protocol === "https:",
    });
    return { deleted: true };
  });
  const assetDto = (a: Asset) => ({
    id: a.id,
    kind: a.kind,
    status: a.status,
    durationMs: a.duration_ms,
    url: `/api/owner/assets/${a.id}/content`,
  });
  const jobDto = (j: Job) => ({
    id: j.id,
    status: j.status,
    progressPercent: j.progress_percent,
    errorCode: j.safe_error_code,
  });
  function workspace(id: string) {
    const m = d.moment(id),
      release = d.active(id);
    return {
      moment: d.momentDto(m),
      assets: s
        .all<Asset>(
          "SELECT * FROM media_asset WHERE moment_id=? ORDER BY created_at_ms",
          id,
        )
        .map(assetDto),
      edits: s
        .all<Edit>(
          "SELECT * FROM media_edit WHERE moment_id=? ORDER BY version DESC",
          id,
        )
        .map((e) => d.editDto(e)),
      jobs: s
        .all<Job>(
          "SELECT * FROM media_job WHERE moment_id=? ORDER BY created_at_ms DESC",
          id,
        )
        .map(jobDto),
      release: release ? d.releaseDto(release) : null,
    };
  }
  app.get("/api/config", async () => ({ mode: d.mode }));
  if (twitchAuth && twitch && c.twitch) {
    app.get(
      "/auth/twitch/start",
      { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
      async (req, reply) => {
        if (!c.hosted) loopback(req);
        const state = randomBytes(32).toString("base64url"),
          browser = randomBytes(32).toString("base64url");
        s.run("DELETE FROM oauth_state WHERE expires_at_ms<?", Date.now());
        if (req.cookies.pm_oauth)
          s.run(
            "DELETE FROM oauth_state WHERE browser_hash=?",
            digest(req.cookies.pm_oauth),
          );
        s.insert("oauth_state", {
          state_hash: digest(state),
          browser_hash: digest(browser),
          expires_at_ms: Date.now() + 300000,
        });
        reply.setCookie("pm_oauth", browser, {
          httpOnly: true,
          sameSite: "lax",
          secure: new URL(c.origin).protocol === "https:",
          path: "/auth/twitch",
          maxAge: 300,
        });
        const url = new URL("https://id.twitch.tv/oauth2/authorize");
        url.search = new URLSearchParams({
          response_type: "code",
          client_id: c.twitch!.clientId,
          redirect_uri: c.twitch!.redirectUri,
          scope: "user:read:chat",
          state,
          force_verify: "true",
        }).toString();
        return reply.redirect(url.toString());
      },
    );
    app.get("/auth/twitch/callback", async (req, reply) => {
      if (!c.hosted) loopback(req);
      const q = z
        .object({
          state: z.string().min(32).max(128),
          code: z.string().min(1).max(1024).optional(),
          error: z.string().max(100).optional(),
        })
        .parse(req.query);
      const old = s.get(
        "DELETE FROM oauth_state WHERE state_hash=? AND browser_hash=? AND expires_at_ms>? RETURNING state_hash",
        digest(q.state),
        digest(req.cookies.pm_oauth ?? ""),
        Date.now(),
      );
      reply.clearCookie("pm_oauth", { path: "/auth/twitch" });
      ensure(
        old,
        403,
        "OAUTH_STATE_DENIED",
        "Sign-in expired or belongs to another browser. Start again from the studio.",
      );
      ensure(
        q.code && !q.error,
        400,
        "OAUTH_DENIED",
        "Twitch authorization was declined. Return to the studio to try again.",
      );
      await twitchAuth.login(q.code);
      issue(req, reply, "owner", true);
      await twitch.reconnect();
      return reply.redirect(c.origin + "/studio");
    });
    app.post("/api/owner/twitch/reconnect", async (req) => {
      const who = mutation(req, "owner");
      operation(req, who, () => {
        void twitch.reconnect();
        return { ok: true };
      });
      return twitch.status();
    });
    app.post("/api/owner/twitch/disconnect", async (req) => {
      mutation(req, "owner");
      await twitchAuth.disconnect();
      return { ok: true };
    });
  }
  if (c.mode === "demo")
    app.post("/auth/demo", async (req, reply) => {
      origin(req);
      loopback(req);
      const auth = issue(req, reply, "owner");
      return {
        creatorId: d.ownerId,
        twitchUserId: "DEMO",
        login: "Local demo creator",
        mode: "DEMO",
        csrfToken: auth.csrfToken,
      };
    });
  ownerGet("/api/owner/me", (req) => {
    const creator = s.get<{ twitch_user_id: string; twitch_login: string }>(
      "SELECT * FROM creator WHERE id=?",
      d.ownerId,
    )!;
    return {
      creatorId: d.ownerId,
      twitchUserId: creator.twitch_user_id,
      login: creator.twitch_login,
      mode: d.mode,
      csrfToken: csrfFor(req.cookies.pm_owner!),
    };
  });
  ownerPost("/api/owner/logout", (req) => {
    s.run(
      "UPDATE owner_session SET revoked_at_ms=? WHERE id=?",
      Date.now(),
      session(req, "owner").id,
    );
    return { ok: true };
  });
  ownerGet(
    "/api/owner/twitch/status",
    () =>
      twitch?.status() ?? {
        state: "DISCONNECTED",
        channelId: null,
        lastHealthyAtMs: null,
        safeMessage:
          "SIMULATED DEMO · Restart with start-twitch.cmd for real Twitch.",
      },
  );
  ownerGet("/api/owner/library", () =>
    s
      .all<Moment>(
        "SELECT m.* FROM moment m JOIN stream_session ss ON ss.id=m.session_id WHERE ss.creator_id=? ORDER BY m.created_at_ms DESC",
        d.ownerId,
      )
      .map((m) => d.momentDto(m)),
  );
  if (c.mode === "demo")
    ownerPost("/api/owner/demo/moments", () => d.seed(), 201);
  ownerGet("/api/owner/sessions", () =>
    s
      .all<{
        id: string;
        label: string;
        channel_id: string;
        mode: string;
        status: string;
        created_at_ms: number;
      }>(
        "SELECT * FROM stream_session WHERE creator_id=? ORDER BY created_at_ms DESC",
        d.ownerId,
      )
      .map((x) => ({
        id: x.id,
        label: x.label,
        channelId: x.channel_id,
        mode: x.mode,
        status: x.status,
        createdAtMs: x.created_at_ms,
      })),
  );
  ownerPost(
    "/api/owner/sessions",
    (req) => {
      const body = z
        .object({ label: z.string().trim().min(1).max(80) })
        .strict()
        .parse(req.body);
      const id = d.createSession(body.label);
      return {
        id,
        label: body.label,
        channelId: d.channelId,
        mode: d.mode,
        status: "ACTIVE",
        createdAtMs: Date.now(),
      };
    },
    201,
  );
  ownerPost(
    "/api/owner/sessions/:sessionId/overlay",
    (req) => {
      const sid = params(req).sessionId,
        token = randomBytes(32).toString("base64url");
      s.run(
        "UPDATE overlay_key SET revoked_at_ms=? WHERE session_id=? AND revoked_at_ms IS NULL",
        Date.now(),
        sid,
      );
      s.insert("overlay_key", {
        id: randomUUID(),
        session_id: sid,
        token_hash: digest(token),
        created_at_ms: Date.now(),
        expires_at_ms: Date.now() + 12 * 3600000,
      });
      return {
        url: `${c.origin}/overlay/${token}`,
        expiresAtMs: Date.now() + 12 * 3600000,
      };
    },
    201,
  );
  registerOverlay(app, d, twitch);
  ownerGet("/api/owner/sessions/:sessionId/moments", (req) =>
    s
      .all<Moment>(
        "SELECT * FROM moment WHERE session_id=?",
        params(req).sessionId,
      )
      .map((m) => d.momentDto(m)),
  );
  ownerPost(
    "/api/owner/sessions/:sessionId/moments",
    (req) => d.createMoment(params(req).sessionId, momentInput.parse(req.body)),
    201,
  );
  ownerGet("/api/owner/moments/:momentId", (req) =>
    d.momentDto(d.moment(params(req).momentId)),
  );
  ownerGet("/api/owner/moments/:momentId/workspace", (req) =>
    workspace(params(req).momentId),
  );
  app.patch("/api/owner/moments/:momentId", async (req) => {
    const who = mutation(req, "owner");
    const { expectedVersion, ...rest } = z
      .object({
        expectedVersion: z.number().int().positive(),
        title: z.string().optional(),
        question: z.string().optional(),
        optionA: z.string().optional(),
        optionB: z.string().optional(),
        durationSeconds: z.number().optional(),
      })
      .strict()
      .parse(req.body);
    return operation(req, who, () => {
      const m = d.moment(params(req).momentId);
      return d.patch(
        m.id,
        expectedVersion,
        momentInput.parse({
          title: m.title,
          question: m.question,
          optionA: m.option_a,
          optionB: m.option_b,
          durationSeconds: m.duration_seconds,
          ...rest,
        }),
      );
    });
  });
  for (const action of ["open", "lock", "cancel", "unpublish"] as const)
    ownerPost(`/api/owner/moments/:momentId/${action}`, (req) => {
      if (action === "open" && twitch)
        ensure(
          twitch.ready,
          409,
          "TWITCH_NOT_READY",
          "Wait for Twitch READY before opening voting.",
        );
      return d[action](
        params(req).momentId,
        versionInput.parse(req.body).expectedVersion,
      );
    });
  ownerPost("/api/owner/moments/:momentId/outcome", (req) =>
    d.outcome(params(req).momentId, outcomeInput.parse(req.body)),
  );
  app.post("/api/owner/moments/:momentId/media", async (req, reply) => {
    const who = mutation(req, "owner");
    const v = z.coerce
      .number()
      .int()
      .positive()
      .parse(req.headers["x-moment-version"]);
    // Upload retries are bound to the file digest. A repeated key must not silently accept different media.
    const declared = z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(req.headers["x-content-sha256"]);
    const body = { version: v, sha256: declared };
    const key = req.headers["idempotency-key"] as string;
    const old = s.get<{ request_hash: string; safe_response_json: string }>(
      "SELECT * FROM operation_key WHERE principal_key=? AND operation=? AND idempotency_key=?",
      who.id,
      req.method + " " + req.url,
      key,
    );
    const part = await req.file();
    ensure(part, 400, "FILE_REQUIRED", "Choose an MP4 file.");
    ensure(
      part.mimetype === "video/mp4",
      415,
      "UNSUPPORTED_MEDIA",
      "Choose an MP4 file.",
    );
    if (old) {
      ensure(
        old.request_hash === reviewHash(body),
        409,
        "KEY_CONFLICT",
        "This upload key was used for another file.",
      );
      await media.checkDigest(part.file, declared);
      mutation(req, "owner");
      reply.code(202);
      return JSON.parse(old.safe_response_json);
    }
    const result = await media.upload(
      params(req).momentId,
      part.file,
      v,
      declared,
      () => {
        mutation(req, "owner");
      },
    );
    ensure(
      !part.file.truncated,
      413,
      "TOO_LARGE",
      "Upload exceeds the allowed size.",
    );
    const actual = d.asset(result.assetId);
    ensure(
      actual.sha256 === declared,
      409,
      "DIGEST_MISMATCH",
      "Upload digest did not match the selected file.",
    );
    reply.code(202);
    return operation(req, who, () => result, body, 202);
  });
  ownerGet("/api/owner/assets/:assetId/content", (req, reply) =>
    media.serve(d.asset(params(req).assetId), req, reply),
  );
  ownerGet("/api/owner/jobs/:jobId", (req) => {
    const j = s.get<Job>(
      "SELECT * FROM media_job WHERE id=?",
      params(req).jobId,
    );
    ensure(j, 404, "NOT_FOUND", "Job not found.");
    return jobDto(j);
  });
  ownerPost(
    "/api/owner/jobs/:jobId/retry",
    (req) => {
      const j = s.get<Job>(
        "SELECT * FROM media_job WHERE id=?",
        params(req).jobId,
      );
      ensure(
        j && j.status === "FAILED" && j.attempts < 3,
        409,
        "RETRY_UNAVAILABLE",
        "Only a failed job with fewer than three attempts can be retried.",
      );
      d.editable(d.moment(j.moment_id));
      s.run(
        "UPDATE media_job SET status='QUEUED',progress_percent=0,safe_error_code=NULL WHERE id=?",
        j.id,
      );
      media.kick();
      return jobDto(s.get<Job>("SELECT * FROM media_job WHERE id=?", j.id)!);
    },
    202,
  );
  ownerPost(
    "/api/owner/moments/:momentId/edits",
    (req) => {
      const result = d.createEdit(
        params(req).momentId,
        editInput.parse(req.body),
      );
      queueMicrotask(() => media.kick());
      return result;
    },
    202,
  );
  ownerGet("/api/owner/edits/:editId", (req) =>
    d.editDto(d.edit(params(req).editId)),
  );
  app.post("/api/owner/edits/:editId/approve", async (req) => {
    const who = mutation(req, "owner"),
      input = approveInput.parse(req.body),
      e = d.edit(params(req).editId);
    ensure(
      e.setup_asset_id && e.reveal_asset_id,
      422,
      "RENDER_REQUIRED",
      "Render both outputs before approval.",
    );
    await media.verify(e.master_asset_id);
    await media.verify(e.setup_asset_id);
    await media.verify(e.reveal_asset_id);
    mutation(req, "owner");
    return operation(req, who, () => d.approve(e.id, input));
  });
  ownerGet("/api/owner/edits/:editId/:segment/captions", (req, reply) => {
    const segment = z.enum(["setup", "reveal"]).parse(params(req).segment);
    const edit = d.edit(params(req).editId);
    const captions =
      segment === "setup" ? edit.setup_captions : edit.reveal_captions;
    ensure(captions, 404, "NOT_FOUND", "No captions for this clip.");
    return reply.type("text/vtt; charset=utf-8").send(captions);
  });
  app.post("/api/owner/moments/:momentId/publish", async (req, reply) => {
    const who = mutation(req, "owner"),
      input = publishInput.parse(req.body),
      e = d.edit(input.editId);
    ensure(
      e.moment_id === params(req).momentId,
      404,
      "NOT_FOUND",
      "Edit not found.",
    );
    ensure(
      e.setup_asset_id && e.reveal_asset_id,
      422,
      "RENDER_REQUIRED",
      "Render both outputs first.",
    );
    await media.verify(e.master_asset_id);
    await media.verify(e.setup_asset_id);
    await media.verify(e.reveal_asset_id);
    mutation(req, "owner");
    reply.code(201);
    return operation(
      req,
      who,
      () => d.publish(params(req).momentId, input),
      req.body,
      201,
    );
  });
  // Owner event stream sends a fresh projection. No owner payload is reused on public routes.
  ownerGet("/api/owner/sessions/:sessionId/events", (req, reply) => {
    const sid = params(req).sessionId;
    ensure(
      s.get(
        "SELECT id FROM stream_session WHERE id=? AND creator_id=?",
        sid,
        d.ownerId,
      ),
      404,
      "NOT_FOUND",
      "Session not found.",
    );
    const token = req.cookies.pm_owner!;
    reply.hijack();
    ownerStreams.add(reply.raw);
    for (const [name, value] of Object.entries(reply.getHeaders()))
      if (value !== undefined) reply.raw.setHeader(name, value);
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
    });
    let previous = "";
    const emit = () => {
      const auth = s.get<Session>(
        "SELECT * FROM owner_session WHERE token_hash=?",
        digest(token),
      );
      if (
        !auth ||
        auth.revoked_at_ms ||
        auth.expires_at_ms < Date.now() ||
        (twitchAuth && !twitchAuth.authorized)
      ) {
        reply.raw.end();
        return;
      }
      const data = JSON.stringify(
        s
          .all<Moment>("SELECT * FROM moment WHERE session_id=?", sid)
          .map((m) => workspace(m.id)),
      );
      if (data !== previous) {
        if (reply.raw.writableLength > 65536) {
          reply.raw.end();
          return;
        }
        reply.raw.write(
          `event: snapshot\nid: ${Date.now()}\ndata: ${data}\n\n`,
        );
        previous = data;
      }
    };
    emit();
    const tick = setInterval(emit, 1000),
      heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15000);
    reply.raw.on("close", () => {
      clearInterval(tick);
      clearInterval(heartbeat);
      ownerStreams.delete(reply.raw);
    });
  });
  app.get("/api/replay/:slug", async (req, reply) => {
    const { m, r } = d.release(params(req).slug),
      auth = issue(req, reply, "viewer"),
      content = JSON.parse(r.content_json) as ReturnType<Domain["content"]>;
    const edit = d.edit(r.edit_id);
    const snapshot = s.get<Snapshot>(
      "SELECT * FROM live_snapshot WHERE id=?",
      r.snapshot_id,
    )!;
    return publicSchema.parse({
      slug: m.public_slug,
      releaseId: r.id,
      title: content.title,
      question: content.question,
      options: [
        { id: "A", label: content.optionA },
        { id: "B", label: content.optionB },
      ],
      mode: snapshot.mode,
      setup: {
        url: `/api/replay/${m.public_slug}/setup?releaseId=${r.id}`,
        durationMs: d.asset(r.setup_asset_id).duration_ms,
        ...(edit.setup_captions
          ? {
              captionsUrl: `/api/replay/${m.public_slug}/setup/captions?releaseId=${r.id}`,
            }
          : {}),
        ...(edit.setup_transcript ? { transcript: edit.setup_transcript } : {}),
      },
      csrfToken: auth.csrfToken,
    });
  });
  app.get("/api/replay/:slug/setup", async (req, reply) => {
    const id = z.string().uuid().parse(query(req).releaseId);
    const { r } = d.release(params(req).slug, id);
    return media.serve(d.asset(r.setup_asset_id), req, reply);
  });
  app.post("/api/replay/:slug/attempts", async (req, reply) => {
    const who = mutation(req, "viewer"),
      body = choiceInput.parse(req.body),
      { r } = d.release(params(req).slug, body.releaseId);
    reply.code(201);
    return operation(
      req,
      who,
      () => d.choose(r, who.id, body.optionId),
      req.body,
      201,
    );
  });
  app.get("/api/replay/:slug/setup/captions", async (req, reply) => {
    const { r } = d.release(
      params(req).slug,
      z.string().uuid().parse(query(req).releaseId),
    );
    const captions = d.edit(r.edit_id).setup_captions;
    ensure(captions, 404, "NOT_FOUND", "No captions for this clip.");
    return reply.type("text/vtt; charset=utf-8").send(captions);
  });
  app.get("/api/replay/:slug/attempt", async (req) => {
    const who = session(req, "viewer"),
      { r } = d.release(params(req).slug);
    const a = s.get<Attempt>(
      "SELECT * FROM replay_attempt WHERE release_id=? AND viewer_session_id=?",
      r.id,
      who.id,
    );
    ensure(
      a,
      404,
      "ATTEMPT_NOT_FOUND",
      "No personal choice is saved in this browser yet.",
    );
    return d.unlock(a);
  });
  function authorizedAttempt(req: FastifyRequest) {
    const who = session(req, "viewer"),
      a = s.get<Attempt>(
        "SELECT * FROM replay_attempt WHERE id=? AND viewer_session_id=?",
        params(req).attemptId,
        who.id,
      );
    ensure(
      a,
      403,
      "REVEAL_DENIED",
      "Choose an option in this browser before opening the outcome.",
    );
    const r = s.get<Release>("SELECT * FROM release WHERE id=?", a.release_id);
    ensure(
      r && r.revoked_at_ms === null,
      410,
      "REVOKED",
      "This moment changed. Open the current version.",
    );
    return { a, r };
  }
  app.get("/api/replay/attempts/:attemptId/reveal", async (req, reply) => {
    const { r } = authorizedAttempt(req);
    return media.serve(d.asset(r.reveal_asset_id), req, reply);
  });
  app.get("/api/replay/attempts/:attemptId/result", async (req) => {
    const { a, r } = authorizedAttempt(req),
      content = JSON.parse(r.content_json) as ReturnType<Domain["content"]>;
    return {
      attemptId: a.id,
      yourChoice: a.option_id,
      creatorChoice: content.creatorChoice,
      outcomeSummary: content.outcomeSummary,
      resolvedAnswer: content.resolvedAnswer,
      historical: d.historical(
        s.get<Snapshot>(
          "SELECT * FROM live_snapshot WHERE id=?",
          r.snapshot_id,
        )!,
      ),
    };
  });
  app.get("/api/replay/attempts/:attemptId/captions", async (req, reply) => {
    const { r } = authorizedAttempt(req);
    const captions = d.edit(r.edit_id).reveal_captions;
    ensure(captions, 404, "NOT_FOUND", "No captions for this clip.");
    return reply.type("text/vtt; charset=utf-8").send(captions);
  });
  app.get("/health/live", async () => ({ ok: true }));
  app.get("/health/ready", async () => {
    s.get("SELECT 1");
    await media.reserve();
    await Promise.all([
      runTool(c.ffmpeg, ["-version"], 10000),
      runTool(c.ffprobe, ["-version"], 10000),
    ]);
    return { ok: true };
  });
  if (existsSync(path.resolve("dist/web/index.html"))) {
    await app.register(staticFiles, {
      root: path.resolve("dist/web"),
      index: ["index.html"],
    });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api/") || req.url.startsWith("/auth/")
        ? reply
            .code(404)
            .send({ error: { code: "NOT_FOUND", message: "Route not found." } })
        : reply.code(200).sendFile("index.html"),
    );
  }
  const deadlines = setInterval(() => {
    for (const m of s.all<Moment>(
      "SELECT * FROM moment WHERE capture_state='OPEN' AND deadline_at_ms<=?",
      Date.now(),
    ))
      d.lock(m.id, m.version, m.deadline_at_ms!);
  }, 500);
  deadlines.unref();
  const retention = setInterval(() => pruneExpired(s), 60000);
  retention.unref();
  await media.recover();
  if (twitch) await twitch.start();
  app.addHook("onClose", async () => {
    clearInterval(deadlines);
    clearInterval(retention);
    await twitch?.stop();
    await media.close();
    s.db.close();
  });
  return { app, s, d, media, c, twitch, twitchAuth };
}
