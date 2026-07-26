import { describe, it, expect } from "vitest";
import { computeBmi, formatBmi } from "@/lib/metrics/bmi";
import { isMetricKey, getMetricDef, METRIC_KEYS } from "@/lib/metrics/catalog";

describe("computeBmi", () => {
  it("computes BMI from lb/in", () => {
    // 211 lb, 70 in ≈ 30.3
    const bmi = computeBmi(70, "in", 211, "lb");
    expect(bmi).toBeCloseTo(30.3, 0);
  });

  it("computes BMI from kg/cm", () => {
    // 70 kg, 175 cm ≈ 22.9
    const bmi = computeBmi(175, "cm", 70, "kg");
    expect(bmi).toBeCloseTo(22.9, 0);
  });

  it("returns null for missing values", () => {
    expect(computeBmi(null, "cm", 70, "kg")).toBeNull();
    expect(computeBmi(175, "cm", null, "kg")).toBeNull();
    expect(computeBmi(0, "cm", 70, "kg")).toBeNull();
  });

  it("formats BMI to one decimal", () => {
    expect(formatBmi(22.86)).toBe("22.9");
    expect(formatBmi(null)).toBeNull();
  });
});

describe("metric catalog", () => {
  it("includes core vitals and body-comp keys", () => {
    for (const key of [
      "blood_pressure",
      "height",
      "weight",
      "glucose",
      "body_fat_percent",
      "visceral_fat_index",
      "health_score",
    ]) {
      expect(isMetricKey(key)).toBe(true);
      expect(getMetricDef(key)?.label).toBeTruthy();
    }
  });

  it("marks BP as dual-value mode", () => {
    expect(getMetricDef("blood_pressure")?.mode).toBe("bp");
  });

  it("has unique keys", () => {
    expect(new Set(METRIC_KEYS).size).toBe(METRIC_KEYS.length);
  });
});
