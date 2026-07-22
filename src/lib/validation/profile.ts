import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().max(200).optional().nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable()
    .or(z.literal("")),
  sex: z.string().max(100).optional().nullable(),
  heightValue: z.coerce.number().positive().optional().nullable(),
  heightUnit: z.enum(["cm", "in"]).optional().nullable(),
  weightValue: z.coerce.number().positive().optional().nullable(),
  weightUnit: z.enum(["kg", "lb"]).optional().nullable(),
  bloodType: z.string().max(20).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  preferredLengthUnit: z.enum(["cm", "in"]).default("cm"),
  preferredWeightUnit: z.enum(["kg", "lb"]).default("kg"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
