import { z } from "zod";
import { labResultSchema } from "@/lib/validation/lab";

export const importProviderSchema = z.enum(["grok", "ollama"]);
export const importJobStatusSchema = z.enum([
  "pending",
  "awaiting_cloud_confirm",
  "extracting",
  "ready",
  "failed",
  "discarded",
  "completed",
  /** All draft panels rejected; nothing committed to the chart. */
  "rejected",
]);
export const draftReviewStatusSchema = z.enum(["pending", "accepted", "rejected"]);

export const extractedLabResultSchema = labResultSchema;
export const extractedLabPanelSchema = z.object({
  name: z.string().min(1).max(300),
  collectedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  status: z.enum(["pending", "final"]).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  results: z.array(extractedLabResultSchema).default([]),
});
export const extractedLabsSchema = z.object({
  panels: z.array(extractedLabPanelSchema),
});

export type ImportProvider = z.infer<typeof importProviderSchema>;
export type ImportJobStatus = z.infer<typeof importJobStatusSchema>;
export type DraftReviewStatus = z.infer<typeof draftReviewStatusSchema>;
export type ExtractedLabResult = z.infer<typeof extractedLabResultSchema>;
export type ExtractedLabPanel = z.infer<typeof extractedLabPanelSchema>;
export type ExtractedLabs = z.infer<typeof extractedLabsSchema>;
