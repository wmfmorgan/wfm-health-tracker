import { describe, it, expect } from "vitest";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";

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
