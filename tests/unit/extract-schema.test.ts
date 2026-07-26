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

  async completeText(): Promise<string> {
    return "fake text";
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

  it("normalizes collectedOn from US date and snake_case keys", async () => {
    const provider = new FakeProvider([
      {
        panels: [
          {
            name: "CMP",
            collected_on: "03/15/2026",
            results: [{ analyteName: "Glucose", value: "112", flag: "H" }],
          },
        ],
      },
    ]);

    const labs = await extractLabsFromText({
      text: "Collected 03/15/2026 Glucose 112",
      provider,
      model: "fake",
    });

    expect(labs.panels[0].collectedOn).toBe("2026-03-15");
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

  it("extracts vital sessions and maps free-text metric names", async () => {
    const provider = new FakeProvider([
      {
        panels: [],
        vitalSessions: [
          {
            measuredAt: "2026-07-20",
            deviceLabel: "InBody",
            readings: [
              { metricType: "Body Fat Percentage", valuePrimary: 19.3, unit: "%" },
              { metricType: "weight", valuePrimary: 211.2, unit: "lbs" },
              {
                name: "Blood Pressure",
                value: "128/82",
                unit: "mmHg",
              },
            ],
          },
        ],
      },
    ]);

    const result = await extractLabsFromText({
      text: "InBody Weight 211.2 Body Fat 19.3%",
      provider,
      model: "fake",
    });

    expect(result.panels).toHaveLength(0);
    expect(result.vitalSessions).toHaveLength(1);
    const types = result.vitalSessions[0]!.readings.map((r) => r.metricType);
    expect(types).toContain("body_fat_percent");
    expect(types).toContain("weight");
    expect(types).toContain("blood_pressure");
    const weight = result.vitalSessions[0]!.readings.find(
      (r) => r.metricType === "weight",
    );
    expect(weight?.unit).toBe("lb");
    const bp = result.vitalSessions[0]!.readings.find(
      (r) => r.metricType === "blood_pressure",
    );
    expect(bp?.valuePrimary).toBe(128);
    expect(bp?.valueSecondary).toBe(82);
  });
});

describe("mapExtractedMetricType", () => {
  it("maps common body-comp aliases", async () => {
    const { mapExtractedMetricType } = await import("@/lib/metrics/map-extracted");
    expect(mapExtractedMetricType("Visceral Fat Index")).toBe("visceral_fat_index");
    expect(mapExtractedMetricType("SMM")).toBe("skeletal_muscle_mass");
    expect(mapExtractedMetricType("unknown_xyz")).toBeNull();
  });
});
