"use server";

import { revalidatePath } from "next/cache";
import { profileSchema } from "@/lib/validation/profile";
import { upsertProfile } from "@/server/services/profile";

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
  revalidatePath("/");
  return { ok: true as const };
}
