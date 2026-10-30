import { ensure } from "./index.js";

// A deliberately small WebVTT subset: plain-text cues, no markup/CSS/regions.
export function validateCaptions(value: string, durationMs: number): string {
  if (!value.trim()) return "";
  const normalized = value
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  const blocks = normalized.split(/\n[ \t]*\n/);
  ensure(
    blocks.shift() === "WEBVTT" && blocks.length > 0 && blocks.length <= 150,
    422,
    "INVALID_CAPTIONS",
    "Use WEBVTT followed by a blank line and up to 150 plain-text cues.",
  );
  let previousEnd = 0;
  const time = (value: string) => {
    const match = /^(?:(\d{2}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
    ensure(
      match,
      422,
      "INVALID_CAPTIONS",
      "Caption times must use HH:MM:SS.mmm or MM:SS.mmm.",
    );
    return (
      Number(match[1] ?? 0) * 3600000 +
      Number(match[2]) * 60000 +
      Number(match[3]) * 1000 +
      Number(match[4])
    );
  };
  for (const block of blocks) {
    const [timing, ...lines] = block.split("\n");
    const parts = timing.split(" --> ");
    ensure(
      parts.length === 2 &&
        lines.length > 0 &&
        lines.length <= 4 &&
        lines.every(
          (line) =>
            line.trim().length > 0 &&
            line.length <= 200 &&
            !/[<>\u0000-\u0008\u000b-\u001f]/.test(line),
        ),
      422,
      "INVALID_CAPTIONS",
      "Each cue needs a time range and 1–4 plain-text lines, up to 200 characters each; no markup or cue settings.",
    );
    const start = time(parts[0]),
      end = time(parts[1]);
    ensure(
      start >= previousEnd && end > start && end <= durationMs,
      422,
      "INVALID_CAPTIONS",
      "Keep cues ordered, non-overlapping and inside the processed clip. Each clip starts at 00:00:00.000.",
    );
    previousEnd = end;
  }
  return normalized + "\n";
}
