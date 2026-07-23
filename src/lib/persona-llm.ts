import type { AiSettings } from "@/lib/validation/ai-settings";

export type PersonaLlmBinding = {
  preferredProvider?: string | null;
  preferredModel?: string | null;
};

export type ResolvedPersonaLlm = {
  provider: "grok" | "ollama";
  model: string;
};

/**
 * Resolve which provider/model to use for a persona.
 * - preferredProvider null → global AI settings default
 * - preferredModel null → global default model for the resolved provider
 */
export function resolvePersonaLlm(
  persona: PersonaLlmBinding | null | undefined,
  aiSettings: Pick<AiSettings, "defaultProvider" | "grokModel" | "ollamaModel">,
): ResolvedPersonaLlm {
  const preferred =
    persona?.preferredProvider === "grok" || persona?.preferredProvider === "ollama"
      ? persona.preferredProvider
      : null;
  const provider = preferred ?? aiSettings.defaultProvider;
  const preferredModel = persona?.preferredModel?.trim() || null;
  if (preferredModel) {
    return { provider, model: preferredModel };
  }
  const model =
    provider === "grok" ? aiSettings.grokModel : aiSettings.ollamaModel;
  return { provider, model };
}

export function formatPersonaLlmLabel(
  persona: PersonaLlmBinding,
  aiSettings: Pick<AiSettings, "defaultProvider" | "grokModel" | "ollamaModel">,
): string {
  const resolved = resolvePersonaLlm(persona, aiSettings);
  const usesGlobalProvider =
    persona.preferredProvider !== "grok" && persona.preferredProvider !== "ollama";
  const usesGlobalModel = !persona.preferredModel?.trim();
  if (usesGlobalProvider && usesGlobalModel) {
    return `Global default (${resolved.provider}/${resolved.model})`;
  }
  if (usesGlobalModel) {
    return `${resolved.provider} · ${resolved.model} (global model)`;
  }
  return `${resolved.provider}/${resolved.model}`;
}
