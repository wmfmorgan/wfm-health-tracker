import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { createDiagnosis } from "@/server/services/diagnoses";
import { createMedication } from "@/server/services/medications";
import { globalSearch } from "@/server/services/search";

useFreshDb();

describe("globalSearch", () => {
  it("finds across entity types", () => {
    createDiagnosis({ name: "Ulcerative colitis", status: "chronic" });
    createMedication({ name: "Mesalamine", status: "active", prn: false });
    const hits = globalSearch("mesa");
    expect(hits.some((h) => h.entityType === "medication")).toBe(true);
    const hits2 = globalSearch("colitis");
    expect(hits2.some((h) => h.entityType === "diagnosis")).toBe(true);
  });

  it("returns empty for blank query", () => {
    expect(globalSearch("  ")).toEqual([]);
  });
});
