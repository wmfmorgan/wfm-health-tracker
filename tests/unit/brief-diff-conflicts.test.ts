import { describe, it, expect } from "vitest";
import { simpleLineDiff } from "@/lib/brief/diff";
import { detectTopicConflicts } from "@/lib/brief/conflicts";

describe("simpleLineDiff", () => {
  it("marks unchanged, removed, and added lines", () => {
    const a = ["alpha", "beta", "gamma"].join("\n");
    const b = ["alpha", "beta2", "gamma", "delta"].join("\n");
    const diff = simpleLineDiff(a, b);
    expect(diff).toContain("  alpha");
    expect(diff).toContain("- beta");
    expect(diff).toContain("+ beta2");
    expect(diff).toContain("  gamma");
    expect(diff).toContain("+ delta");
  });

  it("handles empty strings", () => {
    // "".split("\n") → [""] — one empty line on each side
    expect(simpleLineDiff("", "x")).toBe("- \n+ x");
    expect(simpleLineDiff("x", "")).toBe("- x\n+ ");
    expect(simpleLineDiff("", "")).toBe("  ");
  });

  it("returns all context when identical", () => {
    expect(simpleLineDiff("a\nb", "a\nb")).toBe("  a\n  b");
  });
});

describe("detectTopicConflicts", () => {
  it("flags topics shared by two personas", () => {
    const conflicts = detectTopicConflicts([
      { personaId: "gi", topics: ["meds", "diet"] },
      { personaId: "pcp", topics: ["meds", "labs"] },
      { personaId: "pharmacist", topics: ["supplements"] },
    ]);
    expect(conflicts).toEqual([
      { topic: "meds", personaIds: ["gi", "pcp"] },
    ]);
  });

  it("returns empty when no shared topics", () => {
    expect(
      detectTopicConflicts([
        { personaId: "gi", topics: ["diet"] },
        { personaId: "pcp", topics: ["labs"] },
      ]),
    ).toEqual([]);
  });

  it("ignores blank topics and null topic lists", () => {
    expect(
      detectTopicConflicts([
        { personaId: "a", topics: ["  ", "meds"] },
        { personaId: "b", topics: null },
        { personaId: "c", topics: ["meds"] },
      ]),
    ).toEqual([{ topic: "meds", personaIds: ["a", "c"] }]);
  });
});
