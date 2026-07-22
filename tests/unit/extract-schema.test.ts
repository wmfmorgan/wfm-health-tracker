import { describe, it, expect } from "vitest";
import { extractLabsFromText } from "@/server/ai/extract-labs";
import type { AIProvider } from "@/server/ai/types";

class FakeProvider implements AIProvider {
  id = "ollama" as const;
  calls = 0;

  constructor(private payloads: unknown[]) {}

  async completeJson(): Promise<unknown> {
    const payload = this.payloads[Math.min(this.calls, this.payloads.length - 1)];
    this.calls += 1;
    return payload;
  }
}

describe("extractLabsFromText", () => {
  it("parses valid extract payload", async () => {
    const provider = new FakeProvider([
      {
        panels: [
          {
            name: "CMP",
            results: [{ analyteName: "Glucose", value: "112", flag: "H" }],
          },
        ],
      },
    ]);

    const labs = await extractLabsFromText({
      text: "Glucose 112",
      provider,
      model: "fake",
    });

    expect(labs.panels[0].results[0].flag).toBe("H");
    expect(labs.panels[0].results[0].analyteName).toBe("Glucose");
    expect(provider.calls).toBe(1);
  });

  it('normalizes flag "High" to "H" before schema parse', async () => {
    const provider = new FakeProvider([
      {
        panels: [
          {
            name: "CMP",
            results: [{ analyteName: "Glucose", value: "112", flag: "High" }],
          },
        ],
      },
    ]);

    const labs = await extractLabsFromText({
      text: "Glucose 112 High",
      provider,
      model: "fake",
    });

    expect(labs.panels[0].results[0].flag).toBe("H");
  });

  it("repairs once on invalid payload then succeeds", async () => {
    const provider = new FakeProvider([
      { panels: "not-an-array" },
      {
        panels: [
          {
            name: "Lipid",
            results: [{ analyteName: "LDL", value: "140", flag: "high" }],
          },
        ],
      },
    ]);

    const labs = await extractLabsFromText({
      text: "LDL 140",
      provider,
      model: "fake",
    });

    expect(provider.calls).toBe(2);
    expect(labs.panels[0].name).toBe("Lipid");
    expect(labs.panels[0].results[0].flag).toBe("H");
  });

  it("throws after failed repair", async () => {
    const provider = new FakeProvider([
      { panels: "bad" },
      { still: "invalid" },
    ]);

    await expect(
      extractLabsFromText({
        text: "nope",
        provider,
        model: "fake",
      }),
    ).rejects.toThrow(/validation after repair/i);
    expect(provider.calls).toBe(2);
  });
});
