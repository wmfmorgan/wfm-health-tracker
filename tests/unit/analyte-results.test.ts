import { describe, expect, it } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { createLabPanel } from "@/server/services/labs";
import { createAnalyte, addAnalyteAlias } from "@/server/services/analytes";
import {
  listAnalyteSummaries,
  listUnmatchedLabNames,
  parseNumericLabValue,
} from "@/server/services/analyte-results";
import { getPinnedAnalytes, savePinnedAnalytes } from "@/server/services/settings";

useFreshDb();

describe("parseNumericLabValue", () => {
  it("parses plain and comma numbers", () => {
    expect(parseNumericLabValue("112")).toBe(112);
    expect(parseNumericLabValue("1,234.5")).toBe(1234.5);
    expect(parseNumericLabValue("<5")).toBe(5);
  });

  it("rejects qualitative", () => {
    expect(parseNumericLabValue("Negative")).toBeNull();
    expect(parseNumericLabValue("trace")).toBeNull();
  });
});

describe("listAnalyteSummaries", () => {
  it("groups by case-insensitive catalog name", () => {
    createLabPanel(
      {
        name: "Panel A",
        collectedOn: "2026-01-01",
        status: "final",
        source: "manual",
      },
      [{ analyteName: "Glucose", value: "100", unit: "mg/dL", flag: "normal" }],
    );
    createLabPanel(
      {
        name: "Panel B",
        collectedOn: "2026-02-01",
        status: "final",
        source: "manual",
      },
      [{ analyteName: "glucose", value: "110", unit: "mg/dL", flag: "H" }],
    );

    const summaries = listAnalyteSummaries();
    const glu = summaries.find((s) => s.displayName.toLowerCase() === "glucose");
    expect(glu).toBeTruthy();
    expect(glu!.pointCount).toBe(2);
    expect(glu!.latest.value).toBe("110");
    expect(glu!.numericSeries).toHaveLength(2);
  });

  it("merges confirmed alias into one series", () => {
    const cat = createAnalyte({ name: "C-Reactive Protein", defaultUnit: "mg/L" });
    createLabPanel(
      {
        name: "P1",
        collectedOn: "2026-03-01",
        status: "final",
        source: "manual",
      },
      [{ analyteName: "CRP", value: "3.2", unit: "mg/L" }],
    );
    createLabPanel(
      {
        name: "P2",
        collectedOn: "2026-04-01",
        status: "final",
        source: "manual",
      },
      [{ analyteName: "C-Reactive Protein", value: "2.1", unit: "mg/L" }],
    );

    // Before alias: two separate series (CRP auto-seeded as its own catalog row)
    expect(listAnalyteSummaries().filter((s) => s.pointCount >= 1).length).toBeGreaterThanOrEqual(2);

    addAnalyteAlias(cat.id, "CRP");

    const summaries = listAnalyteSummaries();
    const crp = summaries.find((s) => s.analyteId === cat.id);
    expect(crp).toBeTruthy();
    expect(crp!.pointCount).toBe(2);
    expect(crp!.aliases.map((a) => a.toLowerCase())).toContain("crp");
    // CRP should resolve via alias, not appear as its own series
    expect(summaries.some((s) => s.displayName === "CRP")).toBe(false);
  });
});

describe("pinned analytes settings", () => {
  it("persists all pinned keys without a cap", () => {
    const keys = ["a", "b", "c", "d", "e", "f", "g"];
    const saved = savePinnedAnalytes(keys);
    expect(saved).toEqual(keys);
    expect(getPinnedAnalytes()).toEqual(keys);
  });

  it("dedupes pinned keys", () => {
    expect(savePinnedAnalytes(["x", "x", "y"])).toEqual(["x", "y"]);
  });
});
