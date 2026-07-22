import { z } from "zod";

export const providerSchema = z.object({
  name: z.string().min(1).max(300),
  specialty: z.string().max(200).optional().nullable(),
  organization: z.string().max(300).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ProviderInput = z.infer<typeof providerSchema>;
