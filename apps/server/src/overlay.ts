import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ServerResponse } from "node:http";
import { digest, ensure } from "../../../packages/core/src/index.js";
import type { Domain } from "./domain.js";
import type { Moment } from "./storage.js";
import type { TwitchIntake } from "./twitch-intake.js";

export function registerOverlay(
  app: FastifyInstance,
  d: Domain,
  twitch?: TwitchIntake,
) {
  const clients = new Set<ServerResponse>();
  function project(req: FastifyRequest) {
    const key = (req.params as { key: string }).key;
    ensure(
      /^[A-Za-z0-9_-]{43}$/.test(key),
      404,
      "OVERLAY_UNAVAILABLE",
      "Overlay unavailable.",
    );
    const capability = d.s.get<{ session_id: string; mode: string }>(
      "SELECT k.session_id,ss.mode FROM overlay_key k JOIN stream_session ss ON ss.id=k.session_id WHERE k.token_hash=? AND k.revoked_at_ms IS NULL AND (k.expires_at_ms IS NULL OR k.expires_at_ms>?) AND ss.status='ACTIVE'",
      digest(key),
      Date.now(),
    );
    ensure(
      capability,
      404,
      "OVERLAY_UNAVAILABLE",
      "Overlay expired or revoked. Create a new URL in the creator studio.",
    );
    const m = d.s.get<Moment>(
      "SELECT * FROM moment WHERE session_id=? ORDER BY created_at_ms DESC,rowid DESC LIMIT 1",
      capability.session_id,
    );
    const total = m
      ? d.s.get<{ n: number }>(
          "SELECT COUNT(*) n FROM live_vote WHERE moment_id=?",
          m.id,
        )!.n
      : 0;
    // Explicit allowlist: never return a complete moment or owner projection.
    return {
      mode: capability.mode,
      connection: twitch?.state ?? "DISCONNECTED",
      question: m?.question ?? null,
      optionA: m?.option_a ?? null,
      optionB: m?.option_b ?? null,
      code: m?.code ?? null,
      phase: m?.capture_state ?? "WAITING",
      deadlineAtMs: m?.deadline_at_ms ?? null,
      participantCount: total,
    };
  }
  app.get("/api/overlay/:key", async (req) => project(req));
  app.get("/api/overlay/:key/events", async (req, reply) => {
    project(req);
    ensure(
      clients.size < 30,
      429,
      "OVERLAY_BUSY",
      "Too many overlay connections.",
    );
    reply.hijack();
    for (const [name, value] of Object.entries(reply.getHeaders()))
      if (value !== undefined) reply.raw.setHeader(name, value);
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
    });
    clients.add(reply.raw);
    let previous = "";
    const emit = () => {
      try {
        const data = JSON.stringify(project(req));
        if (reply.raw.writableLength > 65536) {
          reply.raw.end();
          return;
        }
        if (data !== previous) {
          reply.raw.write(`event: snapshot\ndata: ${data}\n\n`);
          previous = data;
        }
      } catch {
        reply.raw.write("event: unavailable\ndata: {}\n\n");
        reply.raw.end();
      }
    };
    emit();
    const tick = setInterval(emit, 500),
      heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 15000);
    reply.raw.on("close", () => {
      clearInterval(tick);
      clearInterval(heartbeat);
      clients.delete(reply.raw);
    });
  });
  app.addHook("preClose", async () => {
    for (const client of clients) client.end();
  });
}
