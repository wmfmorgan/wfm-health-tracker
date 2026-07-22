import { z } from "zod";

export const allergySchema = z.object({
  name: z.string().min(1).max(200),
  reaction: z.string().max(500).optional().nullable(),
  severity: z.enum(["mild", "moderate", "severe", "unknown"]).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type AllergyInput = z.infer<typeof allergySchema>;
