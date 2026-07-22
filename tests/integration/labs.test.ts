import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { useFreshDb, getDb } from "../helpers/test-db";
import { labResults } from "@/server/db/schema";
import {
  createLabPanel,
  getLabPanel,
  updateLabPanel,
  deleteLabPanel,
  listLabPanels,
} from "@/server/services/labs";

useFreshDb();

describe("labs service", () => {
  it("creates panel with results in one transaction", () => {
    const panel = createLabPanel(
      {
        name: "CBC",
        collectedOn: "2026-01-15",
        status: "final",
      },
      [
        {
          analyteName: "WBC",
          value: "6.2",
          unit: "K/uL",
          refLow: "4.0",
          refHigh: "11.0",
          flag: "normal",
        },
        {
          analyteName: "Hgb",
          value: "11.0",
          unit: "g/dL",
          refLow: "13.0",
          refHigh: "17.0",
          flag: "L",
        },
      ],
    );
    const full = getLabPanel(panel.id);
    expect(full?.results).toHaveLength(2);
    expect(full?.results.find((r) => r.analyteName === "Hgb")?.flag).toBe("L");
  });

  it("cascades delete results with panel", () => {
    const panel = createLabPanel({ name: "CMP", status: "final" }, [
      { analyteName: "Na", value: "140", unit: "mmol/L" },
    ]);
    deleteLabPanel(panel.id);
    const orphans = getDb()
      .select()
      .from(labResults)
      .where(eq(labResults.panelId, panel.id))
      .all();
    expect(orphans).toHaveLength(0);
    expect(listLabPanels()).toHaveLength(0);
  });

  it("replaces results on update", () => {
    const panel = createLabPanel({ name: "Lipid", status: "final" }, [
      { analyteName: "LDL", value: "100" },
    ]);
    updateLabPanel(panel.id, { name: "Lipid", status: "final" }, [
      { analyteName: "LDL", value: "90" },
      { analyteName: "HDL", value: "50" },
    ]);
    expect(getLabPanel(panel.id)?.results).toHaveLength(2);
  });
});
