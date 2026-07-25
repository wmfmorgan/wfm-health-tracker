import { describe, expect, it } from "vitest";
import {
  buildImportSteps,
  importMinStepIndex,
} from "@/lib/import-progress-steps";

describe("buildImportSteps", () => {
  it("includes warm step for ollama", () => {
    const steps = buildImportSteps("Ollama", "ollama");
    expect(steps).toContain("Warming model into memory…");
    expect(steps[0]).toBe("Uploading PDF…");
    expect(steps[2]).toBe("Warming model into memory…");
    expect(steps).toHaveLength(7);
  });

  it("omits warm step for grok", () => {
    const steps = buildImportSteps("Grok", "grok");
    expect(steps).not.toContain("Warming model into memory…");
    expect(steps).toHaveLength(6);
  });
});

describe("importMinStepIndex", () => {
  it("floors at warm for ollama once text is extracted", () => {
    expect(
      importMinStepIndex({
        status: "extracting",
        extractedCharCount: 100,
        provider: "ollama",
      }),
    ).toBe(2);
  });

  it("floors at call AI for grok once text is extracted", () => {
    expect(
      importMinStepIndex({
        status: "extracting",
        extractedCharCount: 100,
        provider: "grok",
      }),
    ).toBe(2);
  });

  it("uses last step for ready (provider-aware)", () => {
    expect(importMinStepIndex({ status: "ready", provider: "ollama" })).toBe(6);
    expect(importMinStepIndex({ status: "ready", provider: "grok" })).toBe(5);
  });
});
