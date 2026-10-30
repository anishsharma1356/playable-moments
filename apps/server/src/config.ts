import "dotenv/config";
import path from "node:path";
import { existsSync } from "node:fs";
import { z } from "zod";
const envSchema = z.object({
  APP_MODE: z.enum(["demo", "real"]),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z
    .enum(["127.0.0.1", "::1", "localhost", "0.0.0.0"])
    .default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATA_DIR: z.string().default("./data"),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .positive()
    .max(524288000)
    .default(524288000),
  MIN_FREE_DISK_BYTES: z.coerce.number().nonnegative().default(2147483648),
  MEDIA_JOB_TIMEOUT_SECONDS: z.coerce.number().positive().max(600).default(600),
});
export function config(overrides: Partial<Config> = {}): Config {
  const env = envSchema.parse(process.env);
  const hosted = env.NODE_ENV === "production";
  const frontend = new URL(env.APP_ORIGIN);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    frontend.hostname,
  );
  if (frontend.origin !== env.APP_ORIGIN)
    throw new Error(
      "APP_ORIGIN must be an exact origin without a path, credentials, query or trailing slash.",
    );
  if (hosted) {
    if (env.APP_MODE !== "real" || frontend.protocol !== "https:" || isLoopback)
      throw new Error(
        "Hosted mode requires real Twitch mode and a public HTTPS origin.",
      );
  } else if (!isLoopback || env.HOST === "0.0.0.0") {
    throw new Error("Local builds require a loopback HOST and APP_ORIGIN.");
  }
  let twitch: TwitchConfig | undefined;
  if (env.APP_MODE === "real") {
    // Report variable names only: Zod errors can otherwise echo secret input.
    const required = (name: string, pattern: RegExp) => {
      const value = process.env[name] ?? "";
      if (!pattern.test(value))
        throw new Error(`Configure ${name} using ops/setup-twitch.ps1.`);
      return value;
    };
    const key = (name: string) =>
      Buffer.from(required(name, /^[A-Za-z0-9+/]{43}=$/), "base64");
    twitch = {
      clientId: required("TWITCH_CLIENT_ID", /^[a-zA-Z0-9]{10,100}$/),
      clientSecret: required("TWITCH_CLIENT_SECRET", /^[a-zA-Z0-9]{10,200}$/),
      broadcasterId: required("ALLOWED_BROADCASTER_ID", /^\d{1,30}$/),
      redirectUri:
        process.env.TWITCH_REDIRECT_URI ??
        "http://localhost:3000/auth/twitch/callback",
      encryptionKey: key("TOKEN_ENCRYPTION_KEY_BASE64"),
      signingKey: key("SESSION_SIGNING_KEY_BASE64"),
      voteKey: key("VOTE_HMAC_KEY_BASE64"),
    };
    const callback = new URL(twitch.redirectUri);
    if (
      callback.origin !==
        (hosted ? frontend.origin : `http://localhost:${env.PORT}`) ||
      callback.pathname !== "/auth/twitch/callback" ||
      callback.search ||
      callback.hash ||
      callback.username ||
      callback.password ||
      (!hosted && frontend.hostname !== "localhost")
    )
      throw new Error(
        "Twitch requires the exact /auth/twitch/callback URL: same HTTPS origin when hosted, localhost backend in development.",
      );
    if (
      new Set(
        [twitch.encryptionKey, twitch.signingKey, twitch.voteKey].map((k) =>
          k.toString("hex"),
        ),
      ).size !== 3
    )
      throw new Error(
        "Use three independent encryption, signing and vote keys.",
      );
  }
  const local = path.resolve(
    ".tools/ffmpeg-extracted/ffmpeg-9.0.2-essentials_build/bin",
  );
  const executable = (name: string, value: string | undefined) =>
    value && value !== name
      ? path.resolve(value)
      : existsSync(path.join(local, name + ".exe"))
        ? path.join(local, name + ".exe")
        : name;
  return {
    mode: env.APP_MODE,
    hosted,
    twitch,
    host: env.HOST,
    port: env.PORT,
    origin: env.APP_ORIGIN,
    dataDir: path.resolve(env.DATA_DIR),
    maxUpload: env.MAX_UPLOAD_BYTES,
    minFree: env.MIN_FREE_DISK_BYTES,
    timeout: env.MEDIA_JOB_TIMEOUT_SECONDS * 1000,
    ffmpeg: executable("ffmpeg", process.env.FFMPEG_PATH),
    ffprobe: executable("ffprobe", process.env.FFPROBE_PATH),
    ...overrides,
  };
}
export interface Config {
  hosted?: boolean;
  mode: "demo" | "real";
  twitch?: TwitchConfig;
  host: string;
  port: number;
  origin: string;
  dataDir: string;
  maxUpload: number;
  minFree: number;
  timeout: number;
  ffmpeg: string;
  ffprobe: string;
}
export interface TwitchConfig {
  clientId: string;
  clientSecret: string;
  broadcasterId: string;
  redirectUri: string;
  encryptionKey: Buffer;
  signingKey: Buffer;
  voteKey: Buffer;
}
