// Test-only provider fixtures. These are never imported by the application runtime.
import { randomBytes, randomUUID } from "node:crypto";
import type { TwitchConfig } from "../../apps/server/src/config.js";
import type { Socket } from "../../apps/server/src/twitch-intake.js";
export const testTwitch = (): TwitchConfig => ({
  clientId: "fixtureclientid123",
  clientSecret: "fixtureclientsecret123",
  broadcasterId: "1001",
  redirectUri: "http://localhost:3000/auth/twitch/callback",
  encryptionKey: randomBytes(32),
  signingKey: randomBytes(32),
  voteKey: randomBytes(32),
});
export class FakeSocket extends EventTarget implements Socket {
  readyState = 1;
  closed = false;
  constructor(public url: string) {
    super();
  }
  close() {
    this.closed = true;
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
  emit(type: string, payload: unknown, extra: Record<string, string> = {}) {
    this.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({
          metadata: {
            message_id: randomUUID(),
            message_type: type,
            message_timestamp: new Date().toISOString(),
            ...extra,
          },
          payload,
        }),
      }),
    );
  }
  welcome(id = "fixture-session") {
    this.emit("session_welcome", {
      session: { id, keepalive_timeout_seconds: 10 },
    });
  }
  vote(
    code: string,
    account: string,
    option = "A",
    extra: {
      notificationId?: string;
      chatId?: string;
      source?: string;
      channel?: string;
      timestamp?: string;
    } = {},
  ) {
    this.emit(
      "notification",
      {
        subscription: {
          id: "fixture-sub",
          type: "channel.chat.message",
          version: "1",
          condition: { broadcaster_user_id: "1001", user_id: "1001" },
        },
        event: {
          broadcaster_user_id: extra.channel ?? "1001",
          chatter_user_id: account,
          message_id: extra.chatId ?? randomUUID(),
          message: { text: `!pick ${code} ${option}` },
          source_broadcaster_user_id: extra.source ?? null,
        },
      },
      {
        subscription_type: "channel.chat.message",
        subscription_version: "1",
        ...(extra.notificationId ? { message_id: extra.notificationId } : {}),
        ...(extra.timestamp ? { message_timestamp: extra.timestamp } : {}),
      },
    );
  }
}
export class FakeProvider {
  userId = "1001";
  scopes = ["user:read:chat"];
  expired = false;
  refreshDenied = false;
  unavailable = false;
  refreshCalls = 0;
  subscriptionCalls = 0;
  validationCalls = 0;
  lastSubscription: unknown;
  fetch: typeof fetch = async (input, init) => {
    if (this.unavailable) throw new Error("fixture network outage");
    const url = String(input);
    if (url.endsWith("/token")) {
      const body = init?.body as URLSearchParams;
      if (body.get("grant_type") === "refresh_token") {
        this.refreshCalls++;
        if (this.refreshDenied) return Response.json({}, { status: 400 });
        this.expired = false;
      }
      return Response.json({
        access_token: "fixture-access",
        refresh_token: "fixture-refresh",
        expires_in: 3600,
      });
    }
    if (url.endsWith("/validate")) {
      this.validationCalls++;
      return this.expired
        ? Response.json({}, { status: 401 })
        : Response.json({
            client_id: "fixtureclientid123",
            user_id: this.userId,
            login: "fixture_broadcaster",
            scopes: this.scopes,
            expires_in: 3600,
          });
    }
    if (url.endsWith("/subscriptions")) {
      this.subscriptionCalls++;
      this.lastSubscription = JSON.parse(init?.body as string);
      return Response.json(
        { data: [{ id: "fixture-sub", status: "enabled" }] },
        { status: 202 },
      );
    }
    if (url.endsWith("/revoke")) return Response.json({});
    throw new Error("Unexpected fixture request");
  };
}
