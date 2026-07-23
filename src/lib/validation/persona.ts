import { z } from "zod";

export const personaProviderSchema = z.enum(["grok", "ollama"]);

/** Normalize form/API preferred provider: empty → null; omit → undefined. */
export function normalizePreferredProvider(
  value: unknown,
): "grok" | "ollama" | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (value === "grok" || value === "ollama") return value;
  return null;
}

/** Normalize preferred model: blank → null; omit → undefined. */
export function normalizePreferredModel(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const t = String(value).trim();
  return t === "" ? null : t;
}

export const createCustomPersonaSchema = z.object({
  name: z.string().min(1).max(200),
  specialty: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  systemPromptDefault: z.string().min(1).max(50000),
  preferredProvider: personaProviderSchema.nullable().optional(),
  preferredModel: z.string().max(100).nullable().optional(),
});

export type CreateCustomPersonaInput = z.infer<typeof createCustomPersonaSchema>;

export const updatePersonaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  specialty: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  systemPromptDefault: z.string().min(1).max(50000).optional(),
  systemPromptOverride: z.string().max(50000).optional().nullable(),
  isEnabled: z.boolean().optional(),
  preferredProvider: personaProviderSchema.nullable().optional(),
  preferredModel: z.string().max(100).nullable().optional(),
});

export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
