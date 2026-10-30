import { z } from "zod";
const text = (max: number) => z.string().trim().min(1).max(max);
export const optionSchema = z.enum(["A", "B"]);
export const momentInput = z
  .object({
    title: text(80),
    question: text(180),
    optionA: text(80),
    optionB: text(80),
    durationSeconds: z.number().int().min(20).max(180).default(45),
  })
  .strict()
  .refine((v) => v.optionA.toLowerCase() !== v.optionB.toLowerCase(), {
    message: "Options must be different.",
  });
export const versionInput = z
  .object({ expectedVersion: z.number().int().positive() })
  .strict();
export const outcomeInput = versionInput.extend({
  creatorChoice: optionSchema,
  outcomeSummary: text(500),
  resolvedAnswer: optionSchema.nullable().optional(),
});
export const editInput = versionInput.extend({
  masterAssetId: z.string().uuid(),
  setupStartMs: z.number().int().nonnegative(),
  setupEndMs: z.number().int().nonnegative(),
  revealStartMs: z.number().int().nonnegative(),
  revealEndMs: z.number().int().nonnegative(),
  setupCaptions: z.string().max(20000).default(""),
  revealCaptions: z.string().max(20000).default(""),
  setupTranscript: z.string().trim().max(6000).default(""),
  revealTranscript: z.string().trim().max(6000).default(""),
});
export const approveInput = z
  .object({
    editVersion: z.number().int().positive(),
    reviewHash: text(64),
    watchedSetup: z.literal(true),
    watchedReveal: z.literal(true),
    audioChecked: z.literal(true),
    rightsConfirmed: z.literal(true),
    metadataChecked: z.literal(true),
  })
  .strict();
export const publishInput = versionInput.extend({
  editId: z.string().uuid(),
  reviewHash: text(64),
});
export const choiceInput = z
  .object({ releaseId: z.string().uuid(), optionId: optionSchema })
  .strict();
export const publicSchema = z
  .object({
    slug: z.string(),
    releaseId: z.string(),
    title: z.string(),
    question: z.string(),
    options: z
      .array(z.object({ id: optionSchema, label: z.string() }).strict())
      .length(2),
    mode: z.enum(["DEMO", "REAL_TWITCH"]),
    setup: z
      .object({
        url: z.string(),
        durationMs: z.number(),
        captionsUrl: z.string().optional(),
        transcript: z.string().optional(),
      })
      .strict(),
    csrfToken: z.string(),
  })
  .strict();
export type Manifest = z.infer<typeof publicSchema>;
export interface Unlock {
  attemptId: string;
  releaseId: string;
  optionId: "A" | "B";
  revealUrl: string;
  revealCaptionsUrl?: string;
  revealTranscript?: string;
}
export interface Historical {
  countA: number;
  countB: number;
  total: number;
  mode: "DEMO" | "REAL_TWITCH";
  lockedAtMs: number;
}
export interface Result {
  attemptId: string;
  yourChoice: "A" | "B";
  creatorChoice: "A" | "B";
  outcomeSummary: string;
  resolvedAnswer: "A" | "B" | null;
  historical: Historical;
}
export interface MomentDto {
  mode: "DEMO" | "REAL_TWITCH";
  participantCount: number;
  interruptionReason: string | null;
  id: string;
  sessionId: string;
  code: string;
  publicSlug: string;
  title: string;
  question: string;
  optionA: string;
  optionB: string;
  durationSeconds: number;
  captureState: string;
  version: number;
  openedAtMs: number | null;
  deadlineAtMs: number | null;
  lockedAtMs: number | null;
  creatorChoice: "A" | "B" | null;
  outcomeSummary: string | null;
  historical: Historical | null;
}
export interface AssetDto {
  id: string;
  kind: string;
  status: string;
  durationMs: number | null;
  url: string;
}
export interface EditDto {
  setupCaptions: string;
  revealCaptions: string;
  setupTranscript: string;
  revealTranscript: string;
  id: string;
  version: number;
  status: string;
  masterAssetId: string;
  setupStartMs: number;
  setupEndMs: number;
  revealStartMs: number;
  revealEndMs: number;
  setupPreviewUrl: string | null;
  revealPreviewUrl: string | null;
  reviewHash: string | null;
}
export interface JobDto {
  id: string;
  status: string;
  progressPercent: number;
  errorCode: string | null;
}
export interface ReleaseDto {
  releaseId: string;
  version: number;
  slug: string;
  url: string;
}
export interface WorkspaceDto {
  moment: MomentDto;
  assets: AssetDto[];
  edits: EditDto[];
  jobs: JobDto[];
  release: ReleaseDto | null;
}
