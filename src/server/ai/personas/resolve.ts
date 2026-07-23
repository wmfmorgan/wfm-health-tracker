import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";

export function resolveEffectivePrompt(p: {
  systemPromptDefault: string;
  systemPromptOverride: string | null;
}): string {
  const core = (p.systemPromptOverride?.trim() || p.systemPromptDefault).trim();
  return `${core}\n\n${SAFETY_SYSTEM_SUFFIX}`;
}
