import { describe, it, expect } from "vitest";
import { normalizeLabFlag } from "@/lib/ai/flags";

describe("normalizeLabFlag", () => {
  it("maps high variants to H", () => {
    expect(normalizeLabFlag("H")).toBe("H");
    expect(normalizeLabFlag("high")).toBe("H");
    expect(normalizeLabFlag("High")).toBe("H");
    expect(normalizeLabFlag("above high")).toBe("H");
  });

  it("maps low variants to L", () => {
    expect(normalizeLabFlag("L")).toBe("L");
    expect(normalizeLabFlag("low")).toBe("L");
    expect(normalizeLabFlag("Below Low")).toBe("L");
  });

  it("maps normal and critical", () => {
    expect(normalizeLabFlag("normal")).toBe("normal");
    expect(normalizeLabFlag("n")).toBe("normal");
    expect(normalizeLabFlag("critical")).toBe("critical");
    expect(normalizeLabFlag("crit")).toBe("critical");
  });

  it("returns null for null/empty and unknown for unrecognized", () => {
    expect(normalizeLabFlag(null)).toBe(null);
    expect(normalizeLabFlag(undefined)).toBe(null);
    expect(normalizeLabFlag("")).toBe(null);
    expect(normalizeLabFlag("  ")).toBe("unknown");
    expect(normalizeLabFlag("weird")).toBe("unknown");
  });
});
