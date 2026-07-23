import { z } from "zod";

export const createCustomPersonaSchema = z.object({
  name: z.string().min(1).max(200),
  specialty: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  systemPromptDefault: z.string().min(1).max(50000),
});

export type CreateCustomPersonaInput = z.infer<typeof createCustomPersonaSchema>;

export const updatePersonaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  specialty: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  systemPromptOverride: z.string().max(50000).optional().nullable(),
  isEnabled: z.boolean().optional(),
});

export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
