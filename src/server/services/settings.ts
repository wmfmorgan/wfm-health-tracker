import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { appSettings } from "@/server/db/schema";
import {
  AI_SETTING_KEYS,
  aiSettingsSchema,
  type AiSettings,
} from "@/lib/validation/ai-settings";

function getRaw(key: string): string | undefined {
  bootstrapDb();
  return getDb().select().from(appSettings).where(eq(appSettings.key, key)).get()?.value;
}

function setRaw(key: string, value: string) {
  bootstrapDb();
  getDb()
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export function getAiSettings(): AiSettings {
  const parsed = aiSettingsSchema.safeParse({
    defaultProvider: getRaw(AI_SETTING_KEYS.defaultProvider) ?? undefined,
    grokModel: getRaw(AI_SETTING_KEYS.grokModel) ?? undefined,
    ollamaBaseUrl: getRaw(AI_SETTING_KEYS.ollamaBaseUrl) ?? undefined,
    ollamaModel: getRaw(AI_SETTING_KEYS.ollamaModel) ?? undefined,
  });
  return parsed.success ? parsed.data : aiSettingsSchema.parse({});
}

export function saveAiSettings(input: AiSettings) {
  const data = aiSettingsSchema.parse(input);
  setRaw(AI_SETTING_KEYS.defaultProvider, data.defaultProvider);
  setRaw(AI_SETTING_KEYS.grokModel, data.grokModel);
  setRaw(AI_SETTING_KEYS.ollamaBaseUrl, data.ollamaBaseUrl);
  setRaw(AI_SETTING_KEYS.ollamaModel, data.ollamaModel);
  return data;
}

export function hasXaiApiKey(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}
