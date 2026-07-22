import { z } from "zod";

export const procedureSchema = z.object({
  name: z.string().min(1).max(300),
  performedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  clinician: z.string().max(200).optional().nullable(),
  diagnosis: z.string().max(300).optional().nullable(),
  outcome: z.string().max(20000).optional().nullable(),
  followUp: z.string().max(10000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export type ProcedureInput = z.infer<typeof procedureSchema>;
