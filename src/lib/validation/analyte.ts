import { z } from "zod";

export const analyteSchema = z.object({
  name: z.string().min(1).max(200),
  defaultUnit: z.string().max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type AnalyteInput = z.infer<typeof analyteSchema>;
