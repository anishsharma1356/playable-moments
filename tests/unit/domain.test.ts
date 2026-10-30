import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  openStore,
  type Store,
  type Snapshot,
} from "../../apps/server/src/storage.js";
import { Domain, CHANNEL } from "../../apps/server/src/domain.js";
import {
  parseVote,
  validateBounds,
  reviewHash,
  transition,
} from "../../packages/core/src/index.js";
import { config } from "../../apps/server/src/config.js";
let dir: string, s: Store, d: Domain;
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "pm-domain-"));
  s = openStore(dir);
  d = new Domain(s);
});
afterEach(() => {
  s.db.close();
  rmSync(dir, { recursive: true, force: true });
});
const make = () =>
  d.createMoment(d.createSession("Unit DEMO"), {
    title: "Neutral title",
    question: "A or B?",
    optionA: "First",
    optionB: "Second",
    durationSeconds: 45,
  });
describe("domain and persisted invariants", () => {
  it("migrates an empty database once and enforces WAL/foreign keys", () => {
    expect(s.all("SELECT name FROM schema_migration ORDER BY name")).toEqual([
      { name: "001_initial.sql" },
      { name: "002_twitch_oauth.sql" },
      { name: "003_media_cleanup.sql" },
      { name: "004_media_alternatives.sql" },
    ]);
    expect(s.db.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(s.db.pragma("foreign_keys", { simple: true })).toBe(1);
    const second = openStore(dir);
    try {
      expect(second.all("SELECT * FROM schema_migration")).toHaveLength(4);
    } finally {
      second.db.close();
    }
  });
  it("parses only explicit moment-coded choices", () => {
    expect(parseVote(" !pick k7p2 b ")).toEqual({
      code: "K7P2",
      optionId: "B",
    });
    for (const value of [
      "!pick A",
      "!pick K7P2 C",
      "!pick K7P2 A please",
      "x !pick K7P2 A",
      "!pick K0P1 A",
    ])
      expect(parseVote(value)).toBeNull();
  });
  it("allows one open moment, freezes question, and never reopens", () => {
    const a = make(),
      b = make();
    d.open(a.id, a.version);
    expect(() => d.open(b.id, b.version)).toThrow("already open");
    expect(() =>
      d.patch(a.id, 2, {
        title: "x",
        question: "changed",
        optionA: "X",
        optionB: "Y",
        durationSeconds: 45,
      }),
    ).toThrow("freeze");
    d.lock(a.id, 2);
    expect(() => d.open(a.id, 3)).toThrow();
    expect(() => transition("INTERRUPTED", "OPEN")).toThrow();
  });
  it("first account and source IDs win; stale code, mixed mode, deadlines and late votes never count", () => {
    const m = make();
    d.open(m.id, 1, 1000);
    const input = {
      channelId: CHANNEL,
      mode: "DEMO" as const,
      message: `!pick ${m.code} A`,
      accountId: "person",
      notificationId: "event-1",
      chatMessageId: "chat-1",
      receivedAtMs: 1001,
    };
    expect(d.vote(input)).toBe(true);
    expect(
      d.vote({
        ...input,
        notificationId: "event-2",
        chatMessageId: "chat-2",
        message: `!pick ${m.code} B`,
      }),
    ).toBe(false);
    expect(d.vote({ ...input, accountId: "other" })).toBe(false);
    expect(
      d.vote({ ...input, accountId: "other", notificationId: "event-2" }),
    ).toBe(false);
    expect(
      d.vote({
        ...input,
        accountId: "other",
        notificationId: "event-3",
        chatMessageId: "chat-3",
        mode: "REAL_TWITCH",
      }),
    ).toBe(false);
    expect(d.vote({ ...input, message: "!pick ZZZZ B" })).toBe(false);
    expect(d.vote({ ...input, receivedAtMs: 46000 })).toBe(false);
    const locked = d.lock(m.id, 2, 2000);
    expect(locked.historical?.total).toBe(1);
    expect(
      d.vote({
        ...input,
        accountId: "late",
        notificationId: "late",
        chatMessageId: "late",
      }),
    ).toBe(false);
    expect(s.get<Snapshot>("SELECT * FROM live_snapshot")?.count_a).toBe(1);
  });
  it("freezes the deterministic snapshot and isolates replay persistence", () => {
    const m = d.seed(),
      snapshot = s.get<Snapshot>(
        "SELECT * FROM live_snapshot WHERE moment_id=?",
        m.id,
      )!;
    expect(snapshot).toMatchObject({
      count_a: 5,
      count_b: 7,
      total: 12,
      mode: "DEMO",
    });
    expect(() =>
      s.run("UPDATE live_snapshot SET count_a=99 WHERE id=?", snapshot.id),
    ).toThrow("immutable");
    expect(s.all("SELECT * FROM replay_attempt")).toHaveLength(0);
    expect(s.all("SELECT * FROM live_vote")).toHaveLength(12);
  });
  it("zero-response and tie snapshots stay truthful", () => {
    const m = make();
    d.open(m.id, 1, 1000);
    expect(d.lock(m.id, 2, 1002).historical?.total).toBe(0);
    const n = make();
    d.open(n.id, 1, 2000);
    for (const option of ["A", "B"])
      d.vote({
        channelId: CHANNEL,
        mode: "DEMO",
        message: `!pick ${n.code} ${option}`,
        accountId: option,
        notificationId: randomUUID(),
        chatMessageId: randomUUID(),
        receivedAtMs: 2001,
      });
    expect(d.lock(n.id, 2, 2002).historical).toMatchObject({
      countA: 1,
      countB: 1,
      total: 2,
    });
  });
  it("validates media offsets independently of live timestamps", () => {
    validateBounds(
      {
        setupStartMs: 0,
        setupEndMs: 5000,
        revealStartMs: 6000,
        revealEndMs: 12000,
      },
      12000,
    );
    for (const values of [
      [-1, 5, 6, 12],
      [0, 7, 6, 12],
      [0, 5, 6, 13],
      [0, 0.5, 6, 12],
    ])
      expect(() =>
        validateBounds(
          {
            setupStartMs: values[0],
            setupEndMs: values[1],
            revealStartMs: values[2],
            revealEndMs: values[3],
          },
          12,
        ),
      ).toThrow();
    expect(() =>
      validateBounds(
        {
          setupStartMs: 0,
          setupEndMs: 121000,
          revealStartMs: 121000,
          revealEndMs: 122000,
        },
        122000,
      ),
    ).toThrow("120 seconds");
  });
  it("review hashes bind all content and file inputs deterministically", () => {
    expect(reviewHash({ a: 1, b: 2 })).toBe(reviewHash({ b: 2, a: 1 }));
    expect(reviewHash({ content: "neutral", asset: "abc" })).not.toBe(
      reviewHash({ content: "outcome", asset: "abc" }),
    );
  });
  it("rejects stale creator writes and remote or production demo configuration", () => {
    const m = make();
    expect(() => d.open(m.id, 9)).toThrow("changed");
    const mode = process.env.APP_MODE,
      host = process.env.HOST,
      node = process.env.NODE_ENV;
    try {
      process.env.APP_MODE = "real";
      expect(() => config()).toThrow();
      process.env.APP_MODE = "demo";
      process.env.HOST = "0.0.0.0";
      expect(() => config()).toThrow();
      process.env.HOST = "127.0.0.1";
      process.env.NODE_ENV = "production";
      expect(() => config()).toThrow("Hosted mode requires real Twitch mode");
    } finally {
      for (const [key, value] of Object.entries({
        APP_MODE: mode,
        HOST: host,
        NODE_ENV: node,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
