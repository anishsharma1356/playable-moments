import { z } from "zod";
import type { Domain } from "./domain.js";
import type { TwitchAuth } from "./twitch-auth.js";

export type Socket = Pick<
  WebSocket,
  "addEventListener" | "close" | "readyState"
>;
export type SocketFactory = (url: string) => Socket;
// Twitch sends idle heartbeats at the advertised interval. Allow bounded
// network/scheduling jitter instead of racing the next heartbeat's delivery.
const KEEPALIVE_GRACE_MS = 2000;
const MAX_PENDING_HANDLERS = 1024;
// Negotiate this with Twitch; always use the value in the welcome response.
const EVENTSUB_URL =
  "wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30";
type WatchdogPhase = "welcome" | "keepalive" | "handover";
const envelope = z.object({
  metadata: z.object({
    message_id: z.string().min(1).max(256),
    message_type: z.string(),
    message_timestamp: z.string().max(80),
    subscription_type: z.string().optional(),
    subscription_version: z.string().optional(),
  }),
  payload: z.record(z.string(), z.unknown()),
});
const subscriptionSchema = z.object({
  id: z.string(),
  type: z.literal("channel.chat.message"),
  version: z.literal("1"),
  condition: z.object({ broadcaster_user_id: z.string(), user_id: z.string() }),
});
const eventSchema = z.object({
  broadcaster_user_id: z.string(),
  chatter_user_id: z.string().regex(/^\d+$/),
  message_id: z.string().min(1).max(256),
  message: z.object({ text: z.string().max(2000) }),
  source_broadcaster_user_id: z.string().nullable().optional(),
});
interface Connection {
  socket: Socket;
  retired: boolean;
  welcomed: boolean;
  timeoutMs: number;
  lastFrameAtMono: number;
  handingOver: boolean;
  timer?: ReturnType<typeof setTimeout>;
  previous?: Connection;
}
export class TwitchIntake {
  state = "DISCONNECTED";
  lastHealthyAtMs: number | null = null;
  safeMessage = "Connect Twitch to read this broadcaster's chat.";
  private connections = new Set<Connection>();
  private retry?: ReturnType<typeof setTimeout>;
  private maintenance?: ReturnType<typeof setInterval>;
  private tries = 0;
  private stopped = true;
  private subscriptionId?: string;
  private tasks = new Set<Promise<unknown>>();
  private connectEpoch = 0;
  private connectionsOpened = 0;
  private chatNotifications = 0;
  private acceptedVotes = 0;
  private lastChatAtMs: number | null = null;
  private lastTimeout: {
    atMs: number;
    phase: WatchdogPhase;
    waitMs: number;
    keepaliveMs: number;
    silenceMs: number;
    timerDelayMs: number;
  } | null = null;
  constructor(
    public auth: TwitchAuth,
    private d: Domain,
    private socketFactory: SocketFactory = (url) => new WebSocket(url),
  ) {
    auth.onInvalid = () =>
      this.fail("Authorization revoked. Connect Twitch again.", true);
  }
  status() {
    return {
      state: this.state,
      channelId: this.auth.c.broadcasterId,
      lastHealthyAtMs: this.lastHealthyAtMs,
      safeMessage: this.safeMessage,
      // Owner-only, bounded diagnostics. Never include credentials, socket URLs,
      // session/message/account IDs or chat text in this projection.
      diagnostics: {
        connectionsOpened: this.connectionsOpened,
        activeConnections: this.connections.size,
        pendingHandlers: this.tasks.size,
        pendingHandlerLimit: MAX_PENDING_HANDLERS,
        keepaliveTimeoutMs:
          [...this.connections].find((c) => c.welcomed && !c.handingOver)
            ?.timeoutMs ?? null,
        chatNotifications: this.chatNotifications,
        acceptedVotes: this.acceptedVotes,
        lastChatAtMs: this.lastChatAtMs,
        lastTimeout: this.lastTimeout,
      },
    };
  }
  get ready() {
    return this.state === "READY" && this.auth.authorized;
  }
  private track<T>(task: Promise<T>) {
    this.tasks.add(task);
    void task.finally(() => this.tasks.delete(task)).catch(() => {});
    return task;
  }
  private interrupt(reason: string) {
    this.d.interrupt(reason);
  }
  private retire(c: Connection) {
    c.retired = true;
    clearTimeout(c.timer);
    this.connections.delete(c);
    c.socket.close();
  }
  private closeSockets() {
    // Invalidate validation requests still awaiting the provider. Only the
    // latest connection attempt may open a socket after that await completes.
    this.connectEpoch++;
    for (const c of [...this.connections]) this.retire(c);
  }
  private fail(reason: string, reauth = false) {
    if (this.stopped) return;
    this.interrupt(reason);
    this.closeSockets();
    this.state = reauth ? "REAUTH_REQUIRED" : "ERROR";
    this.safeMessage = reason;
    clearTimeout(this.retry);
    if (!reauth && this.auth.credential()) {
      const delay =
        Math.min(30000, 1000 * 2 ** Math.min(this.tries++, 5)) +
        Math.floor(Math.random() * 500);
      this.retry = setTimeout(() => {
        void this.track(this.connectValidated());
      }, delay);
      this.retry.unref();
    }
  }
  private async connectValidated() {
    if (this.stopped) return;
    const epoch = ++this.connectEpoch;
    this.state = "CONNECTING";
    this.safeMessage = "Validating Twitch authorization…";
    try {
      await this.auth.validate();
      if (this.stopped || epoch !== this.connectEpoch) return;
      if (!this.auth.authorized) {
        this.state = "REAUTH_REQUIRED";
        this.safeMessage = "Connect Twitch to authorize chat reading.";
        return;
      }
      this.connect(EVENTSUB_URL);
    } catch {
      if (this.stopped || epoch !== this.connectEpoch) return;
      this.fail(
        "Twitch validation failed. Check your connection or reconnect Twitch.",
        !this.auth.credential(),
      );
    }
  }
  async start() {
    this.stopped = false;
    if (!this.maintenance) {
      this.maintenance = setInterval(() => {
        const row = this.auth.credential();
        if (row && Date.now() - row.validated_at_ms >= 55 * 60000) {
          void this.track(
            this.auth
              .validate()
              .catch(() =>
                this.fail(
                  "Twitch token validation failed.",
                  !this.auth.credential(),
                ),
              ),
          );
        }
      }, 30000);
      this.maintenance.unref();
    }
    if (!this.connections.size) await this.track(this.connectValidated());
  }
  async reconnect() {
    this.interrupt("Creator reconnected Twitch during voting.");
    this.closeSockets();
    clearTimeout(this.retry);
    await this.start();
  }
  private arm(
    c: Connection,
    ms = c.timeoutMs + KEEPALIVE_GRACE_MS,
    phase: WatchdogPhase = "keepalive",
  ) {
    // Once Twitch directs a handover, keep its fixed handover deadline. An old
    // socket's last notification/heartbeat must not replace it with a shorter
    // keepalive timer while the replacement socket is still welcoming.
    if (c.handingOver && phase === "keepalive") return;
    clearTimeout(c.timer);
    const armedAt = performance.now();
    c.timer = setTimeout(() => {
      if (c.retired) return;
      const time = performance.now();
      this.lastTimeout = {
        atMs: Date.now(),
        phase,
        waitMs: ms,
        keepaliveMs: c.timeoutMs,
        silenceMs: Math.max(0, Math.round(time - c.lastFrameAtMono)),
        timerDelayMs: Math.max(0, Math.round(time - armedAt - ms)),
      };
      this.fail(`Twitch ${phase} timed out. The open round was interrupted.`);
    }, ms);
    c.timer.unref();
  }
  private connect(url: string, previous?: Connection) {
    if (this.stopped) return;
    let socket: Socket;
    try {
      socket = this.socketFactory(url);
    } catch {
      this.fail("Twitch socket could not be opened.");
      return;
    }
    const c: Connection = {
      socket,
      retired: false,
      welcomed: false,
      timeoutMs: previous?.timeoutMs ?? 10000,
      lastFrameAtMono: performance.now(),
      handingOver: false,
      previous,
    };
    this.connectionsOpened++;
    this.connections.add(c);
    this.arm(c, previous ? 25000 : 12000, "welcome");
    socket.addEventListener("message", (event) => {
      if (c.retired || this.stopped) return;
      if (this.tasks.size >= MAX_PENDING_HANDLERS) {
        this.fail("Twitch intake overloaded. The open round was interrupted.");
        return;
      }
      const data = (event as MessageEvent).data as unknown;
      if (typeof data !== "string" || data.length > 65536) {
        this.fail("Unexpected Twitch message format.");
        return;
      }
      void this.track(
        this.message(c, data).catch(() => {
          if (!c.retired)
            this.fail(
              "Twitch intake failed. The open round was interrupted.",
              !this.auth.credential(),
            );
        }),
      );
    });
    socket.addEventListener("close", () => {
      if (!c.retired)
        this.fail("Twitch disconnected. The open round was interrupted.");
    });
    socket.addEventListener("error", () => {
      if (!c.retired)
        this.fail("Twitch connection error. The open round was interrupted.");
    });
  }
  private async message(c: Connection, data: string) {
    const msg = envelope.parse(JSON.parse(data));
    const stamp = Date.parse(msg.metadata.message_timestamp);
    if (!Number.isFinite(stamp) || stamp > Date.now() + 60000)
      throw new Error("Invalid timestamp");
    const type = msg.metadata.message_type;
    if (
      [
        "session_welcome",
        "session_keepalive",
        "notification",
        "session_reconnect",
      ].includes(type)
    )
      c.lastFrameAtMono = performance.now();
    if (type === "session_welcome") {
      if (c.welcomed) throw new Error("Repeated welcome");
      const session = z
        .object({
          id: z.string().min(1).max(1024),
          keepalive_timeout_seconds: z
            .number()
            .int()
            .min(10)
            .max(600)
            .nullable(),
        })
        .parse(msg.payload.session);
      c.welcomed = true;
      c.timeoutMs = session.keepalive_timeout_seconds
        ? session.keepalive_timeout_seconds * 1000
        : c.timeoutMs;
      this.arm(c);
      if (c.previous) {
        this.retire(c.previous);
      } else {
        this.state = "SUBSCRIBING";
        this.safeMessage = "Subscribing to authorized channel messages…";
        const id = await this.auth.subscribe(session.id);
        if (c.retired || this.stopped) return;
        this.subscriptionId = id;
      }
      this.state = "READY";
      this.safeMessage = "Connected to real Twitch chat. No simulated votes.";
      this.tries = 0;
      this.lastHealthyAtMs = Date.now();
      return;
    }
    if (!c.welcomed) throw new Error("Welcome required");
    if (type === "session_keepalive") {
      this.lastHealthyAtMs = Date.now();
      this.arm(c);
      return;
    }
    if (type === "session_reconnect") {
      const session = z
        .object({ reconnect_url: z.string().url().max(4096) })
        .parse(msg.payload.session);
      const url = new URL(session.reconnect_url);
      if (
        url.protocol !== "wss:" ||
        url.hostname !== "eventsub.wss.twitch.tv" ||
        url.port ||
        url.username ||
        url.password ||
        url.hash ||
        !["/", "/ws"].includes(url.pathname) ||
        this.connections.size !== 1 ||
        !this.subscriptionId
      )
        throw new Error("Invalid handover");
      this.state = "RECONNECTING";
      this.safeMessage = "Twitch requested a connection handover.";
      c.handingOver = true;
      this.arm(c, 30000, "handover");
      this.connect(session.reconnect_url, c);
      return;
    }
    if (type === "revocation") {
      const sub = subscriptionSchema.parse(msg.payload.subscription);
      if (sub.id === this.subscriptionId) this.auth.invalidate();
      return;
    }
    if (type !== "notification") return;
    this.lastHealthyAtMs = Date.now();
    this.arm(c);
    if (
      msg.metadata.subscription_type !== "channel.chat.message" ||
      msg.metadata.subscription_version !== "1"
    )
      return;
    const sub = subscriptionSchema.parse(msg.payload.subscription),
      ev = eventSchema.parse(msg.payload.event),
      channel = this.auth.c.broadcasterId;
    if (
      sub.id !== this.subscriptionId ||
      sub.condition.broadcaster_user_id !== channel ||
      sub.condition.user_id !== channel ||
      ev.broadcaster_user_id !== channel ||
      (ev.source_broadcaster_user_id != null &&
        ev.source_broadcaster_user_id !== channel)
    )
      return;
    if (!this.auth.authorized) return;
    this.chatNotifications++;
    this.lastChatAtMs = Date.now();
    // This synchronous transaction and deadline/owner locks share Node's ordered event loop.
    const accepted = this.d.vote({
      channelId: channel,
      mode: "REAL_TWITCH",
      message: ev.message.text,
      accountId: ev.chatter_user_id,
      notificationId: msg.metadata.message_id,
      chatMessageId: ev.message_id,
      receivedAtMs: Date.now(),
      providerTimestamp: msg.metadata.message_timestamp,
    });
    if (accepted) this.acceptedVotes++;
  }
  async stop() {
    this.interrupt("Application stopped during voting.");
    this.stopped = true;
    clearTimeout(this.retry);
    clearInterval(this.maintenance);
    this.maintenance = undefined;
    this.closeSockets();
    await Promise.allSettled([...this.tasks]);
    this.state = "DISCONNECTED";
  }
}
