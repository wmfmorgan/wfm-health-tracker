import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { getAiSettings, saveAiSettings } from "@/server/services/settings";

useFreshDb();

describe("settings service", () => {
  it("returns defaults then persists overrides", () => {
    expect(getAiSettings().defaultProvider).toBe("ollama");
    saveAiSettings({
      defaultProvider: "grok",
      grokModel: "grok-4.5",
      ollamaBaseUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.2",
    });
    expect(getAiSettings().defaultProvider).toBe("grok");
  });
});
