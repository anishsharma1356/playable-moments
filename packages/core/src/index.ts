import { createHash } from "node:crypto";
export type Option = "A" | "B";
export type Phase =
  | "DRAFT"
  | "OPEN"
  | "LOCKED"
  | "OUTCOME_RECORDED"
  | "INTERRUPTED"
  | "CANCELLED";
export class DomainError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  status: number,
  code: string,
  message: string,
): asserts condition {
  if (!condition) throw new DomainError(status, code, message);
}
export function parseVote(text: string) {
  const match = /^!pick\s+([A-Z2-9]{4})\s+([AB])$/i.exec(text.trim());
  return match
    ? {
        code: match[1].toUpperCase(),
        optionId: match[2].toUpperCase() as Option,
      }
    : null;
}
const transitions: Record<Phase, Phase[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["LOCKED", "INTERRUPTED", "CANCELLED"],
  LOCKED: ["OUTCOME_RECORDED"],
  OUTCOME_RECORDED: ["OUTCOME_RECORDED"],
  INTERRUPTED: [],
  CANCELLED: [],
};
export function transition(from: Phase, to: Phase) {
  ensure(
    transitions[from].includes(to),
    422,
    "INVALID_STATE",
    `Cannot change ${from} to ${to}.`,
  );
  return to;
}
export interface Bounds {
  setupStartMs: number;
  setupEndMs: number;
  revealStartMs: number;
  revealEndMs: number;
}
export function validateBounds(b: Bounds, duration: number) {
  ensure(
    Object.values(b).every(Number.isInteger) &&
      b.setupStartMs >= 0 &&
      b.setupStartMs < b.setupEndMs &&
      b.setupEndMs <= b.revealStartMs &&
      b.revealStartMs < b.revealEndMs &&
      b.revealEndMs <= duration,
    422,
    "INVALID_BOUNDS",
    "Use ordered boundaries within the master recording.",
  );
  ensure(
    b.setupEndMs - b.setupStartMs <= 120000 &&
      b.revealEndMs - b.revealStartMs <= 120000,
    422,
    "SEGMENT_TOO_LONG",
    "Each segment can be at most 120 seconds.",
  );
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export const reviewHash = (value: unknown) => digest(canonical(value));
