"use server";

import { revalidatePath } from "next/cache";
import { allergySchema } from "@/lib/validation/allergy";
import { createAllergy, deleteAllergy } from "@/server/services/allergies";

export async function createAllergyAction(formData: FormData) {
  const parsed = allergySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  createAllergy(parsed.data);
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function deleteAllergyAction(id: string) {
  deleteAllergy(id);
  revalidatePath("/profile");
  return { ok: true as const };
}
