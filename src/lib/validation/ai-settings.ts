import { z } from "zod";

export const aiProviderSchema = z.enum(["grok", "ollama"]);

export const aiSettingsSchema = z.object({
  defaultProvider: aiProviderSchema.default("ollama"),
  grokModel: z.string().min(1).max(100).default("grok-4.5"),
  ollamaBaseUrl: z.string().url().default("http://127.0.0.1:11434"),
  ollamaModel: z.string().min(1).max(100).default("llama3.2"),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;

export const AI_SETTING_KEYS = {
  defaultProvider: "ai.default_provider",
  grokModel: "ai.grok_model",
  ollamaBaseUrl: "ai.ollama_base_url",
  ollamaModel: "ai.ollama_model",
} as const;
