import { it, expect } from "vitest";
import { validateCaptions } from "../../packages/core/src/captions.js";
it("normalizes plain WebVTT and keeps cues inside the processed clip", () => {
  expect(
    validateCaptions(
      "\uFEFFWEBVTT\r\n\r\n00:00:00.000 --> 00:00:01.500\r\n[Short tone]\r\n",
      2000,
    ),
  ).toBe("WEBVTT\n\n00:00:00.000 --> 00:00:01.500\n[Short tone]\n");
  expect(validateCaptions("", 0)).toBe("");
});
it("rejects markup, settings, malformed times, overlap and out-of-clip spoilers", () => {
  for (const body of [
    "00:00:00.000 --> 00:00:03.000\nToo late",
    "00:00:00.000 --> 00:00:01.000\n<script>alert(1)</script>",
    "00:00:00.000 --> 00:00:01.000 align:start\nText",
    "00:99:00.000 --> 00:99:01.000\nText",
    "00:00:01.000 --> 00:00:00.000\nText",
    "00:00:00.000 --> 00:00:01.500\nOne\n\n00:00:01.000 --> 00:00:02.000\nTwo",
    "STYLE\n::cue {color:red;}",
  ])
    expect(() => validateCaptions("WEBVTT\n\n" + body, 2000)).toThrow();
});
