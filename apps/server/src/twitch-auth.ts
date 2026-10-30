import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { DomainError, ensure } from "../../../packages/core/src/index.js";
import type { TwitchConfig } from "./config.js";
import type { Store } from "./storage.js";

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});
const validationSchema = z.object({
  client_id: z.string(),
  user_id: z.string(),
  login: z.string(),
  scopes: z.array(z.string()),
  expires_in: z.number().nonnegative(),
});
type Tokens = z.infer<typeof tokenSchema>;
type Validation = z.infer<typeof validationSchema>;
interface Credential {
  encrypted_token_blob: Buffer;
  expires_at_ms: number;
  validated_at_ms: number;
}
export type ProviderFetch = typeof fetch;

/** Only fixed Twitch endpoints are called; provider error bodies never enter logs or responses. */
export class TwitchAuth {
  authorized = false;
  private epoch = 0;
  private refreshTask?: Promise<string>;
  private validationTask?: Promise<void>;
  onInvalid = () => {};
  constructor(
    public s: Store,
    public c: TwitchConfig,
    public ownerId: string,
    private request: ProviderFetch = fetch,
  ) {}
  private seal(tokens: Tokens) {
    const nonce = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.c.encryptionKey, nonce);
    cipher.setAAD(Buffer.from(this.ownerId + ":" + this.c.clientId));
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(tokens), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
  }
  private read(): Tokens {
    const row = this.credential();
    ensure(row, 401, "TWITCH_REAUTH_REQUIRED", "Connect Twitch to continue.");
    try {
      const blob = row.encrypted_token_blob;
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.c.encryptionKey,
        blob.subarray(0, 12),
      );
      decipher.setAAD(Buffer.from(this.ownerId + ":" + this.c.clientId));
      decipher.setAuthTag(blob.subarray(12, 28));
      return tokenSchema.parse(
        JSON.parse(
          Buffer.concat([
            decipher.update(blob.subarray(28)),
            decipher.final(),
          ]).toString("utf8"),
        ),
      );
    } catch {
      this.invalidate();
      throw new DomainError(
        401,
        "TWITCH_REAUTH_REQUIRED",
        "Reconnect Twitch after changing encryption keys.",
      );
    }
  }
  credential() {
    return this.s.get<Credential>(
      "SELECT * FROM oauth_credential WHERE creator_id=?",
      this.ownerId,
    );
  }
  private async send(url: string, init?: RequestInit) {
    try {
      return await this.request(url, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new DomainError(
        503,
        "TWITCH_UNAVAILABLE",
        "Twitch could not be reached. Retry the connection.",
      );
    }
  }
  private async exchange(fields: Record<string, string>) {
    const response = await this.send("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: this.c.clientId,
        client_secret: this.c.clientSecret,
        ...fields,
      }),
    });
    ensure(
      response.ok,
      response.status >= 500 || response.status === 429 ? 503 : 401,
      "TWITCH_TOKEN_FAILED",
      "Twitch authorization failed. Check the local app configuration and reconnect.",
    );
    const parsed = tokenSchema.safeParse(await response.json());
    ensure(
      parsed.success,
      502,
      "TWITCH_RESPONSE_INVALID",
      "Twitch returned an unexpected token response.",
    );
    return parsed.data;
  }
  private async inspect(token: string) {
    const response = await this.send("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `OAuth ${token}` },
    });
    ensure(
      response.ok,
      response.status === 401 ? 401 : 503,
      "TWITCH_VALIDATION_FAILED",
      "Twitch authorization could not be validated.",
    );
    const parsed = validationSchema.safeParse(await response.json());
    ensure(
      parsed.success,
      502,
      "TWITCH_RESPONSE_INVALID",
      "Twitch returned an unexpected validation response.",
    );
    const v = parsed.data;
    ensure(
      v.client_id === this.c.clientId &&
        v.user_id === this.c.broadcasterId &&
        v.scopes.includes("user:read:chat"),
      403,
      "TWITCH_ACCOUNT_DENIED",
      "Authorize the broadcaster configured for this installation with permission to read chat.",
    );
    return v;
  }
  private save(tokens: Tokens, v: Validation) {
    const time = Date.now();
    this.s.run(
      "INSERT INTO oauth_credential VALUES(?,?,?,?,?,?) ON CONFLICT(creator_id) DO UPDATE SET encrypted_token_blob=excluded.encrypted_token_blob,granted_scopes_json=excluded.granted_scopes_json,expires_at_ms=excluded.expires_at_ms,validated_at_ms=excluded.validated_at_ms,updated_at_ms=excluded.updated_at_ms",
      this.ownerId,
      this.seal(tokens),
      JSON.stringify(v.scopes),
      time + v.expires_in * 1000,
      time,
      time,
    );
    this.s.run(
      "UPDATE creator SET twitch_login=? WHERE id=?",
      v.login,
      this.ownerId,
    );
    this.authorized = true;
  }
  async login(code: string) {
    const epoch = ++this.epoch;
    const tokens = await this.exchange({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.c.redirectUri,
    });
    const v = await this.inspect(tokens.access_token);
    ensure(
      epoch === this.epoch,
      409,
      "AUTH_CHANGED",
      "Authorization changed. Start again.",
    );
    this.s.db
      .transaction(() => {
        this.s.run(
          "UPDATE creator SET auth_generation=auth_generation+1 WHERE id=?",
          this.ownerId,
        );
        this.s.run(
          "UPDATE owner_session SET revoked_at_ms=? WHERE creator_id=?",
          Date.now(),
          this.ownerId,
        );
        this.save(tokens, v);
      })
      .immediate();
  }
  invalidate() {
    this.epoch++;
    this.authorized = false;
    this.s.db
      .transaction(() => {
        this.s.run(
          "DELETE FROM oauth_credential WHERE creator_id=?",
          this.ownerId,
        );
        this.s.run(
          "UPDATE creator SET auth_generation=auth_generation+1 WHERE id=?",
          this.ownerId,
        );
        this.s.run(
          "UPDATE owner_session SET revoked_at_ms=? WHERE creator_id=?",
          Date.now(),
          this.ownerId,
        );
      })
      .immediate();
    this.onInvalid();
  }
  async disconnect() {
    const token = this.credential() ? this.read().access_token : undefined;
    this.invalidate();
    if (token) {
      const res = await this.send("https://id.twitch.tv/oauth2/revoke", {
        method: "POST",
        body: new URLSearchParams({ client_id: this.c.clientId, token }),
      });
      ensure(
        res.ok,
        503,
        "TWITCH_REVOKE_FAILED",
        "Disconnected locally. Remove this app in Twitch Connections to confirm remote revocation.",
      );
    }
  }
  private refresh() {
    if (this.refreshTask) return this.refreshTask;
    const epoch = this.epoch;
    this.refreshTask = (async () => {
      try {
        const tokens = await this.exchange({
          grant_type: "refresh_token",
          refresh_token: this.read().refresh_token,
        });
        const v = await this.inspect(tokens.access_token);
        ensure(
          epoch === this.epoch,
          409,
          "AUTH_CHANGED",
          "Authorization changed. Reconnect Twitch.",
        );
        this.save(tokens, v);
        return tokens.access_token;
      } catch (e) {
        if (
          epoch === this.epoch &&
          e instanceof DomainError &&
          [401, 403].includes(e.status)
        )
          this.invalidate();
        throw e;
      }
    })().finally(() => {
      this.refreshTask = undefined;
    });
    return this.refreshTask;
  }
  async validate() {
    if (this.validationTask) return this.validationTask;
    const epoch = this.epoch;
    this.validationTask = (async () => {
      if (!this.credential()) {
        this.authorized = false;
        return;
      }
      try {
        const tokens = this.read();
        const v = await this.inspect(tokens.access_token);
        ensure(
          epoch === this.epoch,
          409,
          "AUTH_CHANGED",
          "Authorization changed.",
        );
        this.save(tokens, v);
      } catch (e) {
        if (
          epoch === this.epoch &&
          e instanceof DomainError &&
          e.status === 401 &&
          this.credential()
        )
          await this.refresh();
        else {
          this.authorized = false;
          if (
            epoch === this.epoch &&
            e instanceof DomainError &&
            e.status === 403
          )
            this.invalidate();
          throw e;
        }
      }
    })().finally(() => {
      this.validationTask = undefined;
    });
    return this.validationTask;
  }
  async subscribe(sessionId: string) {
    ensure(
      this.authorized,
      401,
      "TWITCH_REAUTH_REQUIRED",
      "Connect Twitch first.",
    );
    const row = this.credential()!;
    let token =
      row.expires_at_ms < Date.now() + 60000
        ? await this.refresh()
        : this.read().access_token;
    const call = () =>
      this.send("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": this.c.clientId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "channel.chat.message",
          version: "1",
          condition: {
            broadcaster_user_id: this.c.broadcasterId,
            user_id: this.c.broadcasterId,
          },
          transport: { method: "websocket", session_id: sessionId },
        }),
      });
    let response = await call();
    if (response.status === 401) {
      token = await this.refresh();
      response = await call();
    }
    if (response.status === 401 || response.status === 403) this.invalidate();
    ensure(
      response.status === 202,
      503,
      "TWITCH_SUBSCRIPTION_FAILED",
      "Twitch chat subscription failed. Reconnect and check the granted chat permission.",
    );
    const parsed = z
      .object({
        data: z
          .array(z.object({ id: z.string(), status: z.literal("enabled") }))
          .min(1),
      })
      .safeParse(await response.json());
    ensure(
      parsed.success,
      502,
      "TWITCH_RESPONSE_INVALID",
      "Unexpected Twitch subscription response.",
    );
    return parsed.data.data[0].id;
  }
}
