"use server";

import { revalidatePath } from "next/cache";
import { saveAiSettings } from "@/server/services/settings";
import { aiSettingsSchema } from "@/lib/validation/ai-settings";

export async function saveAiSettingsAction(formData: FormData) {
  const parsed = aiSettingsSchema.safeParse({
    defaultProvider: formData.get("defaultProvider"),
    grokModel: formData.get("grokModel"),
    ollamaBaseUrl: formData.get("ollamaBaseUrl"),
    ollamaModel: formData.get("ollamaModel"),
  });
  if (!parsed.success) return { ok: false as const, error: "Invalid settings" };
  saveAiSettings(parsed.data);
  revalidatePath("/settings");
  revalidatePath("/import");
  return { ok: true as const };
}
