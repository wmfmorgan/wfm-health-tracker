import type { z } from "zod";
import { medicationSchema } from "./medication";

/** Same shape as medications (including provider/prescriber). */
export const supplementSchema = medicationSchema;

export type SupplementInput = z.infer<typeof supplementSchema>;
