import { z } from "zod";
import { isMetricKey, getMetricDef } from "@/lib/metrics/catalog";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .or(z.literal(""));

export const readingInputSchema = z
  .object({
    metricType: z.string().min(1),
    valuePrimary: z.coerce.number(),
    valueSecondary: z.coerce.number().optional().nullable(),
    unit: z.string().min(1).max(20),
    category: z.string().max(100).optional().nullable(),
    measuredAt: isoDate,
    notes: z.string().max(10000).optional().nullable(),
    sessionId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!isMetricKey(data.metricType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown metric type: ${data.metricType}`,
        path: ["metricType"],
      });
      return;
    }
    const def = getMetricDef(data.metricType)!;
    if (!def.units.includes(data.unit)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unit ${data.unit} not valid for ${def.label}`,
        path: ["unit"],
      });
    }
    if (!Number.isFinite(data.valuePrimary)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Value is required",
        path: ["valuePrimary"],
      });
    }
    if (def.mode === "bp") {
      if (data.valueSecondary == null || !Number.isFinite(data.valueSecondary)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Diastolic value is required for blood pressure",
          path: ["valueSecondary"],
        });
      }
    }
    if (!data.measuredAt || data.measuredAt === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date is required",
        path: ["measuredAt"],
      });
    }
  });

export type ReadingInput = z.infer<typeof readingInputSchema>;

export const sessionInputSchema = z.object({
  measuredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  source: z.enum(["manual", "device_report"]).default("device_report"),
  deviceLabel: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  /** Map of metric_type → { valuePrimary, valueSecondary?, unit, category? } */
  readings: z
    .array(
      z.object({
        metricType: z.string().min(1),
        valuePrimary: z.coerce.number(),
        valueSecondary: z.coerce.number().optional().nullable(),
        unit: z.string().min(1).max(20),
        category: z.string().max(100).optional().nullable(),
      }),
    )
    .min(1, "Enter at least one metric"),
});

export type SessionInput = z.infer<typeof sessionInputSchema>;
