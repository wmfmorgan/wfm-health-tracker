"use server";

import { revalidatePath } from "next/cache";
import { savePinnedAnalytes } from "@/server/services/settings";

export async function savePinnedAnalytesAction(formData: FormData) {
  const raw = formData.getAll("pinned");
  const keys = raw.map((v) => String(v).trim()).filter(Boolean);
  savePinnedAnalytes(keys);
  revalidatePath("/");
  return { ok: true as const };
}
