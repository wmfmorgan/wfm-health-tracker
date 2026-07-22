import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string().min(1).max(300),
  dose: z.string().max(100).optional().nullable(),
  form: z.string().max(100).optional().nullable(),
  route: z.string().max(100).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  prn: z.coerce.boolean().default(false),
  startOn: z.string().optional().nullable(),
  endOn: z.string().optional().nullable(),
  status: z.enum(["active", "stopped"]),
  purpose: z.string().max(300).optional().nullable(),
  prescriber: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export type MedicationInput = z.infer<typeof medicationSchema>;
