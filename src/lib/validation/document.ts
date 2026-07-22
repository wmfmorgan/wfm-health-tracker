import { z } from "zod";

export const entityTypeSchema = z.enum([
  "diagnosis",
  "medication",
  "supplement",
  "lab_panel",
  "test",
  "procedure",
]);

export type EntityType = z.infer<typeof entityTypeSchema>;

export const documentMetaSchema = z.object({
  title: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;
