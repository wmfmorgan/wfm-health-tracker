import { describe, it, expect } from "vitest";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import { resolvePersonaLlm, formatPersonaLlmLabel } from "@/lib/persona-llm";
import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";

const AI = {
  defaultProvider: "ollama" as const,
  grokModel: "grok-4.5",
  ollamaModel: "llama3.2",
};

describe("resolveEffectivePrompt", () => {
  it("uses override when present and non-empty", () => {
    const result = resolveEffectivePrompt({
      systemPromptDefault: "DEFAULT PROMPT",
      systemPromptOverride: "OVERRIDE PROMPT",
    });
    expect(result.startsWith("OVERRIDE PROMPT")).toBe(true);
    expect(result).not.toContain("DEFAULT PROMPT");
    expect(result).toContain(SAFETY_SYSTEM_SUFFIX);
  });

  it("falls back to default when override is null", () => {
    const result = resolveEffectivePrompt({
      systemPromptDefault: "DEFAULT PROMPT",
      systemPromptOverride: null,
    });
    expect(result.startsWith("DEFAULT PROMPT")).toBe(true);
    expect(result).toContain(SAFETY_SYSTEM_SUFFIX);
  });

  it("falls back to default when override is empty or whitespace", () => {
    const empty = resolveEffectivePrompt({
      systemPromptDefault: "DEFAULT PROMPT",
      systemPromptOverride: "   ",
    });
    expect(empty.startsWith("DEFAULT PROMPT")).toBe(true);
    expect(empty).toContain(SAFETY_SYSTEM_SUFFIX);

    const blank = resolveEffectivePrompt({
      systemPromptDefault: "DEFAULT PROMPT",
      systemPromptOverride: "",
    });
    expect(blank.startsWith("DEFAULT PROMPT")).toBe(true);
  });

  it("always appends the safety suffix", () => {
    const result = resolveEffectivePrompt({
      systemPromptDefault: "x",
      systemPromptOverride: null,
    });
    expect(result.endsWith(SAFETY_SYSTEM_SUFFIX)).toBe(true);
    expect(result).toContain("Separate FACTS");
    expect(result).toContain("Do not invent");
  });
});

describe("resolvePersonaLlm", () => {
  it("uses global defaults when persona has no binding", () => {
    expect(resolvePersonaLlm(null, AI)).toEqual({
      provider: "ollama",
      model: "llama3.2",
    });
    expect(
      resolvePersonaLlm(
        { preferredProvider: null, preferredModel: null },
        AI,
      ),
    ).toEqual({ provider: "ollama", model: "llama3.2" });
  });

  it("uses preferred provider with global model for that provider", () => {
    expect(
      resolvePersonaLlm(
        { preferredProvider: "grok", preferredModel: null },
        AI,
      ),
    ).toEqual({ provider: "grok", model: "grok-4.5" });
  });

  it("uses preferred model with global provider when provider unbound", () => {
    expect(
      resolvePersonaLlm(
        { preferredProvider: null, preferredModel: "mistral" },
        AI,
      ),
    ).toEqual({ provider: "ollama", model: "mistral" });
  });

  it("uses both preferred provider and model", () => {
    expect(
      resolvePersonaLlm(
        { preferredProvider: "grok", preferredModel: "grok-beta" },
        AI,
      ),
    ).toEqual({ provider: "grok", model: "grok-beta" });
  });

  it("ignores invalid preferred provider strings", () => {
    expect(
      resolvePersonaLlm(
        { preferredProvider: "openai", preferredModel: null },
        AI,
      ),
    ).toEqual({ provider: "ollama", model: "llama3.2" });
  });

  it("formatPersonaLlmLabel describes global vs bound", () => {
    expect(
      formatPersonaLlmLabel(
        { preferredProvider: null, preferredModel: null },
        AI,
      ),
    ).toContain("Global default");
    expect(
      formatPersonaLlmLabel(
        { preferredProvider: "grok", preferredModel: "grok-beta" },
        AI,
      ),
    ).toBe("grok/grok-beta");
  });
});

