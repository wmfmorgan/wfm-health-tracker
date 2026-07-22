"use server";

import { revalidatePath } from "next/cache";
import { profileSchema } from "@/lib/validation/profile";
import { getProfile, upsertProfile } from "@/server/services/profile";

export async function saveProfileAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse({
    ...raw,
    heightValue: raw.heightValue === "" ? null : raw.heightValue,
    weightValue: raw.weightValue === "" ? null : raw.weightValue,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  upsertProfile(parsed.data);
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true as const };
}

/** Settings: update preferred display units without wiping other profile fields. */
export async function savePreferredUnitsAction(formData: FormData) {
  const current = getProfile();
  const parsed = profileSchema.safeParse({
    displayName: current.displayName,
    dateOfBirth: current.dateOfBirth,
    sex: current.sex,
    heightValue: current.heightValue,
    heightUnit: current.heightUnit,
    weightValue: current.weightValue,
    weightUnit: current.weightUnit,
    bloodType: current.bloodType,
    notes: current.notes,
    preferredLengthUnit: formData.get("preferredLengthUnit") ?? current.preferredLengthUnit,
    preferredWeightUnit: formData.get("preferredWeightUnit") ?? current.preferredWeightUnit,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  upsertProfile(parsed.data);
  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true as const };
}
