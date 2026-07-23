import { z } from "zod";

export const citationSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  label: z.string(),
});

export const evaluateResultSchema = z.object({
  title: z.string().optional(),
  bodyMd: z.string().min(1),
  sections: z.record(z.string(), z.string()).optional(),
  topics: z.array(z.string()).default([]),
  citations: z.array(citationSchema).default([]),
  facts: z.array(z.string()).default([]),
  opinions: z.array(z.string()).default([]),
});

export type EvaluateResult = z.infer<typeof evaluateResultSchema>;
export type BriefCitation = z.infer<typeof citationSchema>;

export const viewStatusSchema = z.enum([
  "draft",
  "accepted",
  "rejected",
  "superseded",
]);

export type ViewStatus = z.infer<typeof viewStatusSchema>;

export const createDraftViewSchema = z.object({
  personaId: z.string().min(1),
  bodyMd: z.string().min(1),
  title: z.string().optional().nullable(),
  sections: z.record(z.string(), z.string()).optional(),
  topics: z.array(z.string()).optional(),
  citations: z.array(citationSchema).optional(),
  facts: z.array(z.string()).optional(),
  opinions: z.array(z.string()).optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  focusNote: z.string().optional().nullable(),
  parentViewId: z.string().optional().nullable(),
  replaceExistingDraft: z.boolean().optional(),
});

export type CreateDraftViewInput = z.infer<typeof createDraftViewSchema>;

export const updateDraftViewSchema = z.object({
  bodyMd: z.string().min(1).optional(),
  title: z.string().optional().nullable(),
  topics: z.array(z.string()).optional(),
  sections: z.record(z.string(), z.string()).optional(),
  citations: z.array(citationSchema).optional(),
  facts: z.array(z.string()).optional(),
  opinions: z.array(z.string()).optional(),
});

export type UpdateDraftViewInput = z.infer<typeof updateDraftViewSchema>;

export const factOpinionSchema = z.object({
  facts: z.array(z.string()).default([]),
  opinions: z.array(z.string()).default([]),
});

export type FactOpinion = z.infer<typeof factOpinionSchema>;
