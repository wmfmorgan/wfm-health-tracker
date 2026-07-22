import { z } from "zod";

export const diagnosisSchema = z.object({
  name: z.string().min(1).max(300),
  status: z.enum(["active", "resolved", "chronic"]),
  diagnosedOn: z.string().optional().nullable(),
  icdCode: z.string().max(32).optional().nullable(),
  clinician: z.string().max(200).optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
