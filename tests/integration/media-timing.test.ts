import { beforeAll, afterAll, it, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";
import { createApp } from "../../apps/server/src/app.js";
import { config } from "../../apps/server/src/config.js";
import { runTool, probe } from "../../apps/server/src/media.js";
import type { Asset, Job } from "../../apps/server/src/storage.js";

let dir: string, ctx: Awaited<ReturnType<typeof createApp>>;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "pm-timing-"));
  ctx = await createApp(config({ mode: "demo", dataDir: dir, minFree: 0 }));
});
afterAll(async () => {
  await ctx.app.close();
  await rm(dir, { recursive: true, force: true });
});
async function wait(id: string) {
  await expect
    .poll(
      () => ctx.s.get<Job>("SELECT * FROM media_job WHERE id=?", id)?.status,
      { timeout: 60000 },
    )
    .toBe("SUCCEEDED");
}
async function colour(file: string, time: string) {
  return [
    ...(await runTool(ctx.c.ffmpeg, [
      "-v",
      "error",
      "-ss",
      time,
      "-i",
      file,
      "-frames:v",
      "1",
      "-vf",
      "scale=1:1",
      "-pix_fmt",
      "rgb24",
      "-f",
      "rawvideo",
      "pipe:1",
    ])),
  ];
}
async function rms(file: string, time: string, duration = "0.1") {
  const b = await runTool(ctx.c.ffmpeg, [
    "-v",
    "error",
    "-ss",
    time,
    "-i",
    file,
    "-t",
    duration,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "8000",
    "-f",
    "s16le",
    "pipe:1",
  ]);
  expect(b.length).toBeGreaterThan(100);
  let sum = 0;
  for (let i = 0; i < b.length; i += 2) sum += b.readInt16LE(i) ** 2;
  return Math.sqrt(sum / (b.length / 2));
}
for (const offset of [false, true])
  it(`preserves VFR video and delayed audio alignment${offset ? " with nonzero start timestamps" : ""}, and removes private metadata`, async () => {
    const base = path.join(dir, `timing-${offset}.mp4`),
      shifted = path.join(dir, "offset.mp4");
    await runTool(ctx.c.ffmpeg, [
      "-v",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=320x180:r=30:d=4",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=880:sample_rate=48000:duration=3.7",
      "-vf",
      "drawbox=color=red:t=fill:enable='gte(t,2.3)',select='if(lt(t,2),not(mod(n,3)),1)'",
      "-af",
      "volume=0:enable='lt(t,2)',asetpts=PTS+0.3/TB",
      "-fps_mode",
      "vfr",
      "-c:v",
      "libx264",
      "-bf",
      "0",
      "-threads",
      "2",
      "-c:a",
      "aac",
      "-metadata",
      "title=PRIVATE OUTCOME SECRET",
      base,
    ]);
    if (offset)
      await runTool(ctx.c.ffmpeg, [
        "-v",
        "error",
        "-y",
        "-i",
        base,
        "-c",
        "copy",
        "-output_ts_offset",
        "5",
        shifted,
      ]);
    const input = offset ? shifted : base;
    // Establish the fixture's timing independently before testing normalization.
    expect(await rms(input, "2.1")).toBeLessThan(10);
    expect(await rms(input, "2.5")).toBeGreaterThan(500);
    const sourceProbe = await probe(ctx.c, input);
    if (offset)
      expect(Number(sourceProbe.format.start_time)).toBeGreaterThan(4);
    const frameInfo = JSON.parse(
      (
        await runTool(ctx.c.ffprobe, [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=avg_frame_rate,r_frame_rate",
          "-of",
          "json",
          input,
        ])
      ).toString(),
    );
    expect(frameInfo.streams[0].avg_frame_rate).not.toBe(
      frameInfo.streams[0].r_frame_rate,
    );
    const m = ctx.d.seed(),
      upload = await ctx.media.upload(
        m.id,
        Readable.from(await readFile(input)),
        m.version,
      );
    await wait(upload.jobId);
    const master = ctx.s.get<Asset>(
        "SELECT * FROM media_asset WHERE moment_id=? AND kind='MASTER'",
        m.id,
      )!,
      file = ctx.media.file(master);
    expect(master.duration_ms).toBeGreaterThanOrEqual(3900);
    expect(master.duration_ms).toBeLessThanOrEqual(4100);
    expect(
      Math.abs(Number((await probe(ctx.c, file)).format.start_time)),
    ).toBeLessThan(0.05);
    expect(JSON.stringify(await probe(ctx.c, file))).not.toContain(
      "PRIVATE OUTCOME SECRET",
    );
    expect((await colour(file, "2.1"))[2]).toBeGreaterThan(200);
    expect((await colour(file, "2.5"))[0]).toBeGreaterThan(200);
    expect(await rms(file, "2.1")).toBeLessThan(10);
    expect(await rms(file, "2.5")).toBeGreaterThan(500);
    const edit = ctx.d.createEdit(m.id, {
      expectedVersion: ctx.d.moment(m.id).version,
      masterAssetId: master.id,
      setupStartMs: 0,
      setupEndMs: 2100,
      revealStartMs: 2400,
      revealEndMs: 3500,
    });
    ctx.media.kick();
    await wait(edit.jobId);
    const rendered = ctx.d.edit(edit.editId),
      setup = ctx.media.file(ctx.d.asset(rendered.setup_asset_id!)),
      reveal = ctx.media.file(ctx.d.asset(rendered.reveal_asset_id!));
    expect(await rms(setup, "0", "2.1")).toBeLessThan(10);
    expect((await colour(setup, "2.0"))[2]).toBeGreaterThan(200);
    expect((await colour(reveal, "0"))[0]).toBeGreaterThan(200);
    expect(await rms(reveal, "0.1")).toBeGreaterThan(500);
  });
