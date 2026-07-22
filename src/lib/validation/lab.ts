import { z } from "zod";

export const labResultSchema = z.object({
  analyteName: z.string().min(1).max(200),
  value: z.string().max(100).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  refLow: z.string().max(50).optional().nullable(),
  refHigh: z.string().max(50).optional().nullable(),
  flag: z.enum(["normal", "H", "L", "critical", "unknown"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const labPanelSchema = z.object({
  name: z.string().min(1).max(300),
  collectedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  status: z.enum(["pending", "final"]).default("final"),
  notes: z.string().max(10000).optional().nullable(),
});

export const labPanelWithResultsSchema = labPanelSchema.extend({
  results: z.array(labResultSchema).default([]),
});

export type LabResultInput = z.infer<typeof labResultSchema>;
export type LabPanelInput = z.infer<typeof labPanelSchema>;
export type LabPanelWithResultsInput = z.infer<typeof labPanelWithResultsSchema>;
