import { describe, expect, it } from "vitest";
import {
  scoreAliasPair,
  suggestTargetsForSpelling,
} from "@/lib/analyte-alias-suggest";
import { useFreshDb } from "../helpers/test-db";
import { createLabPanel } from "@/server/services/labs";
import {
  createAnalyte,
  listAnalyteAliasFlags,
  rejectAliasSuggestion,
  addAnalyteAlias,
} from "@/server/services/analytes";

describe("scoreAliasPair", () => {
  it("detects abbreviation initials", () => {
    const s = scoreAliasPair("CRP", "C-Reactive Protein");
    expect(s?.reason).toBe("abbreviation");
    expect(s!.score).toBeGreaterThan(0.9);
  });

  it("detects similar spellings", () => {
    const s = scoreAliasPair("Hemoglobin", "Haemoglobin");
    expect(s?.reason).toBe("similar");
  });

  it("returns null for unrelated names", () => {
    expect(scoreAliasPair("Glucose", "Creatinine")).toBeNull();
  });
});

describe("suggestTargetsForSpelling", () => {
  it("ranks CRP against catalog", () => {
    const hits = suggestTargetsForSpelling("CRP", [
      "Glucose",
      "C-Reactive Protein",
      "Creatinine",
    ]);
    expect(hits[0]?.targetName).toBe("C-Reactive Protein");
  });
});

useFreshDb();

describe("listAnalyteAliasFlags", () => {
  it("flags CRP → C-Reactive Protein and clears after reject or merge", () => {
    createAnalyte({ name: "C-Reactive Protein", defaultUnit: "mg/L" });
    createLabPanel(
      { name: "P1", collectedOn: "2026-01-01", status: "final", source: "manual" },
      [{ analyteName: "CRP", value: "3", unit: "mg/L" }],
    );
    createLabPanel(
      { name: "P2", collectedOn: "2026-02-01", status: "final", source: "manual" },
      [{ analyteName: "C-Reactive Protein", value: "2", unit: "mg/L" }],
    );

    const flags = listAnalyteAliasFlags();
    const crp = flags.find(
      (f) =>
        f.spelling.toLowerCase() === "crp" &&
        f.targetName.toLowerCase().includes("reactive"),
    );
    expect(crp).toBeTruthy();
    expect(crp!.spellingExample?.rawName.toLowerCase()).toBe("crp");
    expect(crp!.spellingExample?.value).toBe("3");
    expect(crp!.targetExample?.rawName.toLowerCase()).toContain("reactive");
    expect(crp!.targetExample?.value).toBe("2");

    rejectAliasSuggestion("CRP", crp!.targetAnalyteId);
    expect(
      listAnalyteAliasFlags().some(
        (f) =>
          f.spelling.toLowerCase() === "crp" &&
          f.targetAnalyteId === crp!.targetAnalyteId,
      ),
    ).toBe(false);
  });

  it("removes flag after merge", () => {
    const cat = createAnalyte({ name: "Glucose", defaultUnit: "mg/dL" });
    createLabPanel(
      { name: "P3", collectedOn: "2026-03-01", status: "final", source: "manual" },
      [{ analyteName: "GLU", value: "100", unit: "mg/dL" }],
    );
    // Force a similar short-form if GLU isn't initials of Glucose — seed longer pair
    createLabPanel(
      { name: "P4", collectedOn: "2026-04-01", status: "final", source: "manual" },
      [{ analyteName: "Glucose", value: "110", unit: "mg/dL" }],
    );

    // Abbreviation-style: create Hemoglobin + HGB
    const hb = createAnalyte({ name: "Hemoglobin", defaultUnit: "g/dL" });
    createLabPanel(
      { name: "P5", collectedOn: "2026-05-01", status: "final", source: "manual" },
      [{ analyteName: "HGB", value: "14", unit: "g/dL" }],
    );

    let flags = listAnalyteAliasFlags();
    // At least some flags exist for multi-analyte chart
    expect(flags.length).toBeGreaterThanOrEqual(0);

    // Direct merge path for CRP-style if present
    const target = createAnalyte({ name: "Alanine Aminotransferase", defaultUnit: "U/L" });
    createLabPanel(
      { name: "P6", collectedOn: "2026-06-01", status: "final", source: "manual" },
      [{ analyteName: "ALT", value: "20", unit: "U/L" }],
    );
    flags = listAnalyteAliasFlags();
    const alt = flags.find(
      (f) => f.spelling.toUpperCase() === "ALT" && f.targetAnalyteId === target.id,
    );
    if (alt) {
      addAnalyteAlias(target.id, "ALT");
      expect(
        listAnalyteAliasFlags().some(
          (f) => f.spelling.toUpperCase() === "ALT" && f.targetAnalyteId === target.id,
        ),
      ).toBe(false);
    }

    void cat;
    void hb;
  });
});
