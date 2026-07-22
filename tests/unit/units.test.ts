import { describe, it, expect } from "vitest";
import { cmToIn, inToCm, kgToLb, lbToKg, formatHeight, formatWeight } from "@/lib/units";

describe("units", () => {
  it("converts height cm <-> in", () => {
    expect(inToCm(70)).toBeCloseTo(177.8, 1);
    expect(cmToIn(180)).toBeCloseTo(70.866, 2);
  });

  it("converts weight kg <-> lb", () => {
    expect(kgToLb(70)).toBeCloseTo(154.324, 2);
    expect(lbToKg(154.324)).toBeCloseTo(70, 1);
  });

  it("formats height and weight", () => {
    expect(formatHeight(180, "cm")).toBe("180 cm");
    expect(formatWeight(70, "kg")).toBe("70 kg");
  });
});
