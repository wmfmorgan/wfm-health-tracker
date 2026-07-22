import type { z } from "zod";
import { medicationSchema } from "./medication";

export const supplementSchema = medicationSchema.omit({ prescriber: true });

export type SupplementInput = z.infer<typeof supplementSchema>;
