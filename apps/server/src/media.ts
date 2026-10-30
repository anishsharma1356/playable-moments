import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { stat, statfs, rename, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import type { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest } from "fastify";
import { DomainError, ensure } from "../../../packages/core/src/index.js";
import type { Config } from "./config.js";
import { Domain } from "./domain.js";
import type { Asset, Job } from "./storage.js";
export async function runTool(
  executable: string,
  args: string[],
  timeout = 600000,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const buffers: Buffer[] = [];
    let size = 0;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeout);
    child.stdout.on("data", (b: Buffer) => {
      size += b.length;
      if (size > 16 * 1024 * 1024) {
        child.kill("SIGKILL");
      } else buffers.push(b);
    });
    child.stderr.resume();
    child.on("error", () => {
      clearTimeout(timer);
      reject(
        new DomainError(
          503,
          "TOOL_UNAVAILABLE",
          "Media tool could not start. Run pnpm doctor.",
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && size <= 16 * 1024 * 1024)
        resolve(Buffer.concat(buffers));
      else
        reject(
          new DomainError(
            422,
            timedOut ? "MEDIA_TIMEOUT" : "DECODE_FAILED",
            timedOut
              ? "Media processing timed out."
              : "The recording could not be decoded or encoded.",
          ),
        );
    });
  });
}
interface Probe {
  format: { duration: string; format_name: string; start_time?: string };
  streams: {
    codec_type: string;
    codec_name: string;
    width?: number;
    height?: number;
    start_time?: string;
  }[];
}
export async function probe(c: Config, file: string) {
  const result = await runTool(
    c.ffprobe,
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-f",
      "mov",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      file,
    ],
    Math.min(c.timeout, 30000),
  );
  return JSON.parse(result.toString()) as Probe;
}
export async function fileHash(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
export class Media {
  private uploads = new Set<string>();
  private running: Promise<void> | null = null;
  private closing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    public d: Domain,
    public c: Config,
  ) {}
  file(a: Asset) {
    ensure(
      /^[a-f0-9-]+\.mp4$/.test(a.storage_key),
      500,
      "INVALID_STORAGE",
      "Media unavailable.",
    );
    return path.join(this.c.dataDir, "media", a.storage_key);
  }
  async reserve(extra = 0) {
    const disk = await statfs(this.c.dataDir);
    ensure(
      disk.bavail * disk.bsize >= this.c.minFree + extra,
      503,
      "INSUFFICIENT_STORAGE",
      "Not enough free disk space for this recording.",
    );
  }
  async recover() {
    // Only generated job/upload temporaries in this private project directory are removed.
    const tmp = path.join(this.c.dataDir, "tmp");
    for (const name of await readdir(tmp))
      if (/^[a-f0-9-]+\.mp4$/.test(name))
        await rm(path.join(tmp, name), { force: true });
    // Startup only: no active upload/encoder can be between rename and INSERT.
    for (const entry of await readdir(path.join(this.c.dataDir, "media"), {
      withFileTypes: true,
    })) {
      if (
        entry.isFile() &&
        /^[a-f0-9-]{36}\.mp4$/.test(entry.name) &&
        !this.d.s.get(
          "SELECT id FROM media_asset WHERE storage_key=?",
          entry.name,
        )
      ) {
        this.d.s.run(
          "INSERT OR IGNORE INTO media_purge(storage_key,creator_id,created_at_ms) VALUES(?,?,?)",
          entry.name,
          this.d.ownerId,
          Date.now(),
        );
      }
    }
    this.d.s.run(
      "UPDATE media_job SET status=CASE WHEN attempts<3 THEN 'QUEUED' ELSE 'FAILED' END,safe_error_code='WORKER_RESTARTED' WHERE status='RUNNING'",
    );
    this.d.s.run(
      "UPDATE media_edit SET status='FAILED',review_hash=NULL,approved_by=NULL,approved_at_ms=NULL,approval_json=NULL WHERE id IN (SELECT edit_id FROM media_job WHERE status='FAILED' AND safe_error_code='WORKER_RESTARTED')",
    );
    this.d.s.db
      .transaction(() => {
        for (const a of this.d.s
          .all<Asset>(`SELECT * FROM media_asset a WHERE kind IN ('SETUP','REVEAL')
        AND NOT EXISTS(SELECT 1 FROM media_edit e WHERE e.setup_asset_id=a.id OR e.reveal_asset_id=a.id OR e.master_asset_id=a.id)
        AND NOT EXISTS(SELECT 1 FROM release r WHERE r.setup_asset_id=a.id OR r.reveal_asset_id=a.id)
        AND NOT EXISTS(SELECT 1 FROM media_job j WHERE j.input_asset_id=a.id)`)) {
          this.d.s.run(
            "INSERT OR IGNORE INTO media_purge(storage_key,creator_id,created_at_ms) VALUES(?,?,?)",
            a.storage_key,
            this.d.ownerId,
            Date.now(),
          );
          this.d.s.run("DELETE FROM media_asset WHERE id=?", a.id);
        }
      })
      .immediate();
    this.timer = setInterval(() => this.kick(), 500);
    this.timer.unref();
    this.kick();
  }
  kick() {
    if (!this.running && !this.closing) {
      this.running = this.drain().finally(() => {
        this.running = null;
      });
    }
  }
  async close() {
    this.closing = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  async checkDigest(stream: Readable, expected: string) {
    const hash = createHash("sha256");
    let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      ensure(
        size <= this.c.maxUpload,
        413,
        "TOO_LARGE",
        "Upload exceeds the allowed size.",
      );
      hash.update(chunk);
    }
    ensure(
      !(stream as Readable & { truncated?: boolean }).truncated,
      413,
      "TOO_LARGE",
      "Upload exceeds the allowed size.",
    );
    ensure(
      hash.digest("hex") === expected,
      409,
      "DIGEST_MISMATCH",
      "Upload digest did not match the selected file.",
    );
  }
  async drain() {
    await this.purgeFiles();
    for (;;) {
      if (this.closing) return;
      const job = this.d.s.get<Job>(
        "SELECT * FROM media_job WHERE status='QUEUED' ORDER BY created_at_ms LIMIT 1",
      );
      if (!job) return;
      await this.process(job);
    }
  }
  async inspect(file: string, timeout = this.c.timeout) {
    ensure(timeout > 0, 422, "MEDIA_TIMEOUT", "Media processing timed out.");
    const p = await probe({ ...this.c, timeout }, file);
    const videos = p.streams.filter((s) => s.codec_type === "video"),
      audios = p.streams.filter((s) => s.codec_type === "audio");
    ensure(
      videos.length === 1,
      415,
      "MISSING_VIDEO",
      "Upload an MP4 with exactly one video stream.",
    );
    ensure(
      videos[0].codec_name === "h264" &&
        audios.length <= 1 &&
        audios.every((a) => a.codec_name === "aac") &&
        p.streams.length === videos.length + audios.length,
      415,
      "UNSUPPORTED_CODEC",
      "Use H.264 video with AAC audio, or no audio.",
    );
    const duration = Math.round(Number(p.format.duration) * 1000),
      v = videos[0];
    ensure(
      Number.isFinite(duration) && duration > 0 && duration <= 1200000,
      422,
      "SOURCE_DURATION",
      "The source must be at most 20 minutes.",
    );
    ensure(
      (v.width ?? 0) > 0 &&
        (v.width ?? 0) <= 1920 &&
        (v.height ?? 0) > 0 &&
        (v.height ?? 0) <= 1080,
      422,
      "SOURCE_RESOLUTION",
      "Use a source no larger than 1920 × 1080.",
    );
    return {
      duration,
      width: v.width!,
      height: v.height!,
      audio: audios.length === 1,
    };
  }
  async upload(
    momentId: string,
    stream: Readable,
    expectedVersion: number,
    expectedDigest?: string,
    authorizeCommit: () => void = () => {},
  ) {
    ensure(
      !this.uploads.has(momentId),
      409,
      "UPLOAD_BUSY",
      "Another upload for this moment is still running.",
    );
    this.uploads.add(momentId);
    try {
      return await this.receiveUpload(
        momentId,
        stream,
        expectedVersion,
        expectedDigest,
        authorizeCommit,
      );
    } finally {
      this.uploads.delete(momentId);
    }
  }
  private async receiveUpload(
    momentId: string,
    stream: Readable,
    expectedVersion: number,
    expectedDigest?: string,
    authorizeCommit: () => void = () => {},
  ) {
    let m = this.d.moment(momentId);
    this.d.version(m, expectedVersion);
    this.d.editable(m);
    ensure(
      m.capture_state === "OUTCOME_RECORDED",
      422,
      "INVALID_STATE",
      "Record the actual outcome before upload.",
    );
    await this.reserve(this.c.maxUpload * 3);
    const assetId = randomUUID(),
      jobId = randomUUID(),
      key = randomUUID() + ".mp4",
      tmp = path.join(this.c.dataDir, "tmp", key);
    let count = 0;
    const limit = new Transform({
      transform: (chunk: Buffer, _encoding, cb) => {
        count += chunk.length;
        cb(
          count > this.c.maxUpload
            ? new DomainError(413, "TOO_LARGE", "Upload exceeds 500 MiB.")
            : null,
          chunk,
        );
      },
    });
    try {
      await pipeline(stream, limit, createWriteStream(tmp, { flags: "wx" }));
      ensure(
        !(stream as Readable & { truncated?: boolean }).truncated,
        413,
        "TOO_LARGE",
        "Upload exceeds the allowed size.",
      );
      ensure(count > 32, 415, "INVALID_MEDIA", "The file is not a valid MP4.");
      const info = await this.inspect(tmp);
      const hash = await fileHash(tmp);
      ensure(
        !expectedDigest || hash === expectedDigest,
        409,
        "DIGEST_MISMATCH",
        "Upload digest did not match the selected file.",
      );
      m = this.d.moment(momentId);
      this.d.version(m, expectedVersion);
      this.d.editable(m);
      await rename(tmp, path.join(this.c.dataDir, "media", key));
      this.d.s.db
        .transaction(() => {
          // A second owner tab may have edited/published while rename awaited I/O.
          this.d.version(this.d.moment(momentId), expectedVersion);
          this.d.editable(this.d.moment(momentId));
          authorizeCommit();
          this.d.s.insert("media_asset", {
            id: assetId,
            creator_id: this.d.ownerId,
            moment_id: momentId,
            kind: "ORIGINAL",
            status: "READY",
            storage_key: key,
            sha256: hash,
            content_type: "video/mp4",
            byte_size: count,
            duration_ms: info.duration,
            width: info.width,
            height: info.height,
            created_at_ms: Date.now(),
          });
          this.d.s.insert("media_job", {
            id: jobId,
            moment_id: momentId,
            input_asset_id: assetId,
            kind: "NORMALIZE",
            status: "QUEUED",
            deduplication_key: assetId,
            created_at_ms: Date.now(),
          });
          this.d.s.run(
            "UPDATE moment SET version=version+1 WHERE id=?",
            momentId,
          );
          this.d.invalidate(momentId);
        })
        .immediate();
      this.kick();
      return { assetId, jobId };
    } catch (e) {
      await rm(tmp, { force: true });
      if (!this.d.s.get("SELECT id FROM media_asset WHERE id=?", assetId))
        await rm(path.join(this.c.dataDir, "media", key), { force: true });
      throw e;
    }
  }
  async encode(
    input: Asset,
    kind: "MASTER" | "SETUP" | "REVEAL",
    start?: number,
    end?: number,
    deadline = Date.now() + this.c.timeout,
  ): Promise<string> {
    const remaining = () => {
      const ms = deadline - Date.now();
      ensure(ms > 0, 422, "MEDIA_TIMEOUT", "Media processing timed out.");
      return ms;
    };
    await this.reserve(input.byte_size * 2);
    const source = this.file(input),
      info = await this.inspect(source, remaining());
    const key = randomUUID() + ".mp4",
      tmp = path.join(this.c.dataDir, "tmp", key);
    const args = [
      "-v",
      "error",
      "-xerror",
      "-y",
      "-nostdin",
      "-threads",
      "2",
      "-filter_threads",
      "2",
      "-filter_complex_threads",
      "2",
      "-protocol_whitelist",
      "file,pipe",
      "-f",
      "mov",
      "-i",
      source,
    ];
    if (start !== undefined && end !== undefined) {
      let graph = `[0:v:0]trim=start=${start / 1000}:end=${end / 1000},setpts=PTS-STARTPTS,fps=30,format=yuv420p[v]`;
      if (info.audio)
        graph += `;[0:a:0]atrim=start=${start / 1000}:end=${end / 1000},asetpts=PTS-STARTPTS,aresample=48000[a]`;
      args.push("-filter_complex", graph, "-map", "[v]");
      if (info.audio) args.push("-map", "[a]");
    } else {
      args.push(
        "-map",
        "0:v:0",
        "-vf",
        "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30,format=yuv420p",
      );
      if (info.audio)
        args.push(
          "-map",
          "0:a:0",
          "-af",
          "aresample=48000:async=1:first_pts=0",
        );
    }
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "21",
      "-threads",
      "2",
      "-pix_fmt",
      "yuv420p",
    );
    if (info.audio) args.push("-c:a", "aac", "-b:a", "128k");
    args.push(
      "-map_metadata",
      "-1",
      "-map_chapters",
      "-1",
      "-movflags",
      "+faststart",
      tmp,
    );
    let storedId: string | undefined;
    try {
      await runTool(this.c.ffmpeg, args, remaining());
      const output = await this.inspect(tmp, remaining());
      if (start !== undefined && end !== undefined)
        ensure(
          Math.abs(output.duration - (end - start)) <= 100,
          422,
          "DURATION_MISMATCH",
          "Rendered boundaries failed verification.",
        );
      await runTool(
        this.c.ffmpeg,
        [
          "-v",
          "error",
          "-xerror",
          "-threads",
          "2",
          "-protocol_whitelist",
          "file,pipe",
          "-i",
          tmp,
          "-f",
          "null",
          "-",
        ],
        remaining(),
      );
      const hash = await fileHash(tmp),
        size = (await stat(tmp)).size;
      await rename(tmp, path.join(this.c.dataDir, "media", key));
      const id = randomUUID();
      this.d.s.insert("media_asset", {
        id,
        creator_id: this.d.ownerId,
        moment_id: input.moment_id,
        kind,
        status: "READY",
        storage_key: key,
        sha256: hash,
        content_type: "video/mp4",
        byte_size: size,
        duration_ms: output.duration,
        width: output.width,
        height: output.height,
        created_at_ms: Date.now(),
      });
      storedId = id;
      return id;
    } finally {
      await rm(tmp, { force: true });
      if (!storedId)
        await rm(path.join(this.c.dataDir, "media", key), { force: true });
    }
  }
  async process(job: Job) {
    this.d.s.run(
      "UPDATE media_job SET status='RUNNING',attempts=attempts+1,started_at_ms=?,progress_percent=5,safe_error_code=NULL WHERE id=?",
      Date.now(),
      job.id,
    );
    const generated: string[] = [];
    const deadline = Date.now() + this.c.timeout;
    try {
      const input = this.d.asset(job.input_asset_id!);
      if (job.kind === "NORMALIZE") {
        generated.push(
          await this.encode(input, "MASTER", undefined, undefined, deadline),
        );
      } else {
        const e = this.d.edit(job.edit_id!);
        this.d.s.run(
          "UPDATE media_edit SET status='RENDERING' WHERE id=?",
          e.id,
        );
        const setup = await this.encode(
          input,
          "SETUP",
          e.setup_start_ms,
          e.setup_end_ms,
          deadline,
        );
        generated.push(setup);
        this.d.s.run(
          "UPDATE media_job SET progress_percent=50 WHERE id=?",
          job.id,
        );
        const reveal = await this.encode(
          input,
          "REVEAL",
          e.reveal_start_ms,
          e.reveal_end_ms,
          deadline,
        );
        generated.push(reveal);
        this.d.s.run(
          "UPDATE media_edit SET setup_asset_id=?,reveal_asset_id=?,status='NEEDS_REVIEW',approved_by=NULL,approved_at_ms=NULL WHERE id=?",
          setup,
          reveal,
          e.id,
        );
        this.d.s.run(
          "UPDATE media_edit SET review_hash=? WHERE id=?",
          this.d.hash(this.d.edit(e.id)),
          e.id,
        );
      }
      this.d.s.run(
        "UPDATE media_job SET status='SUCCEEDED',progress_percent=100,finished_at_ms=? WHERE id=?",
        Date.now(),
        job.id,
      );
    } catch (error) {
      for (const id of generated) {
        const a = this.d.asset(id);
        this.d.s.run("UPDATE media_asset SET status='FAILED' WHERE id=?", id);
        this.d.s.run(
          "INSERT OR IGNORE INTO media_purge(storage_key,creator_id,created_at_ms) VALUES(?,?,?)",
          a.storage_key,
          this.d.ownerId,
          Date.now(),
        );
      }
      this.d.s.run(
        "UPDATE media_job SET status='FAILED',safe_error_code=?,finished_at_ms=? WHERE id=?",
        error instanceof DomainError ? error.code : "MEDIA_FAILED",
        Date.now(),
        job.id,
      );
      if (job.edit_id)
        this.d.s.run(
          "UPDATE media_edit SET status='FAILED',review_hash=NULL WHERE id=?",
          job.edit_id,
        );
    }
  }
  async verify(id: string) {
    const a = this.d.asset(id);
    ensure(
      a.status === "READY" && a.sha256 === (await fileHash(this.file(a))),
      409,
      "MEDIA_CHANGED",
      "Media changed. Render and review again.",
    );
  }
  async serve(a: Asset, request: FastifyRequest, reply: FastifyReply) {
    ensure(a.status === "READY", 404, "NOT_READY", "Media is not ready.");
    const file = this.file(a);
    const info = await stat(file).catch(() => null);
    ensure(
      info && info.isFile() && info.size === a.byte_size,
      410,
      "MEDIA_UNAVAILABLE",
      "This recording is unavailable. The creator needs to restore or replace it.",
    );
    const size = info.size;
    reply
      .header("Content-Type", "video/mp4")
      .header("Cache-Control", "private, no-store")
      .header("Accept-Ranges", "bytes")
      .header("X-Content-Type-Options", "nosniff");
    let start = 0,
      end = size - 1;
    const range = request.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      let valid = Boolean(match && (match[1] || match[2]));
      if (match) {
        if (!match[1]) {
          const suffix = Number(match[2]);
          valid = valid && suffix > 0;
          start = Math.max(0, size - suffix);
        } else {
          start = Number(match[1]);
          end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        }
        valid =
          valid &&
          Number.isSafeInteger(start) &&
          Number.isSafeInteger(end) &&
          start >= 0 &&
          start <= end &&
          start < size;
      }
      if (!valid)
        return reply
          .code(416)
          .header("Content-Range", `bytes */${size}`)
          .send();
      reply.code(206).header("Content-Range", `bytes ${start}-${end}/${size}`);
    }
    reply.header("Content-Length", end - start + 1);
    if (request.method === "HEAD") {
      reply.hijack();
      reply.raw.statusCode = reply.statusCode;
      for (const [key, value] of Object.entries(reply.getHeaders()))
        if (value !== undefined) reply.raw.setHeader(key, value);
      reply.raw.end();
      return reply;
    }
    return reply.send(createReadStream(file, { start, end }));
  }
  erase(momentId: string, expectedVersion: number, confirmation: string) {
    const s = this.d.s;
    return s.db
      .transaction(() => {
        const m = s.get<import("./storage.js").Moment>(
          "SELECT m.* FROM moment m JOIN stream_session ss ON ss.id=m.session_id WHERE m.id=? AND ss.creator_id=?",
          momentId,
          this.d.ownerId,
        );
        ensure(m, 404, "NOT_FOUND", "Moment not found.");
        this.d.version(m, expectedVersion);
        ensure(
          confirmation === m.title,
          400,
          "CONFIRM_TITLE",
          "Type the moment title exactly to confirm deletion.",
        );
        ensure(
          m.capture_state !== "OPEN",
          409,
          "ROUND_OPEN",
          "Lock or cancel voting before deleting this moment.",
        );
        ensure(
          !this.uploads.has(momentId) &&
            !s.get(
              "SELECT id FROM media_job WHERE moment_id=? AND status='RUNNING'",
              momentId,
            ),
          409,
          "MEDIA_BUSY",
          "Wait for the active upload or processing job to finish before deleting.",
        );
        s.run(
          "INSERT OR IGNORE INTO media_purge(storage_key,creator_id,created_at_ms) SELECT storage_key,creator_id,? FROM media_asset WHERE moment_id=?",
          Date.now(),
          momentId,
        );
        // Cached mutation responses can include erased text, choices and media IDs.
        s.run(
          `WITH ids(id) AS (
        SELECT id FROM moment WHERE id=@id UNION SELECT id FROM media_asset WHERE moment_id=@id
        UNION SELECT id FROM media_edit WHERE moment_id=@id UNION SELECT id FROM media_job WHERE moment_id=@id
        UNION SELECT id FROM release WHERE moment_id=@id
        UNION SELECT a.id FROM replay_attempt a JOIN release r ON r.id=a.release_id WHERE r.moment_id=@id
      ) UPDATE operation_key SET safe_response_json='{}',response_status=410 WHERE EXISTS (SELECT 1 FROM ids WHERE instr(operation_key.operation,ids.id)>0 OR instr(operation_key.safe_response_json,ids.id)>0)`.replaceAll(
            "@id",
            "?",
          ),
          momentId,
          momentId,
          momentId,
          momentId,
          momentId,
          momentId,
        );
        s.run("DELETE FROM audit_event WHERE moment_id=?", momentId);
        // Explicit FK order; the immutable-update triggers remain intact.
        s.run("DELETE FROM release WHERE moment_id=?", momentId);
        s.run("DELETE FROM media_job WHERE moment_id=?", momentId);
        s.run("DELETE FROM media_edit WHERE moment_id=?", momentId);
        s.run("DELETE FROM live_vote WHERE moment_id=?", momentId);
        s.run("DELETE FROM moment WHERE id=?", momentId);
        return { deleted: true };
      })
      .immediate();
  }
  async purgeFiles() {
    for (const row of this.d.s.all<{ storage_key: string }>(
      "SELECT storage_key FROM media_purge WHERE retry_at_ms<=? LIMIT 100",
      Date.now(),
    )) {
      try {
        ensure(
          /^[a-f0-9-]{36}\.mp4$/.test(row.storage_key),
          500,
          "INVALID_STORAGE",
          "Invalid cleanup path.",
        );
        await rm(path.join(this.c.dataDir, "media", row.storage_key), {
          force: true,
        });
        this.d.s.run(
          "DELETE FROM media_purge WHERE storage_key=?",
          row.storage_key,
        );
      } catch {
        this.d.s.run(
          "UPDATE media_purge SET attempts=attempts+1,retry_at_ms=?,safe_error_code='FILE_DELETE_FAILED' WHERE storage_key=?",
          Date.now() + 30000,
          row.storage_key,
        );
      }
    }
  }
}
