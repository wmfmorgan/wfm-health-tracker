import { z } from "zod";

export const clinicalTestSchema = z.object({
  type: z.enum(["imaging", "pathology", "other"]),
  name: z.string().min(1).max(300),
  performedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  summary: z.string().max(20000).optional().nullable(),
  keyFindings: z.string().max(20000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export type ClinicalTestInput = z.infer<typeof clinicalTestSchema>;
