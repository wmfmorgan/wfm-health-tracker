import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createProvider,
  listActiveProviders,
  listFacilityOptions,
  deleteProvider,
  updateProvider,
} from "@/server/services/providers";
import {
  createAnalyte,
  listAnalytes,
  ensureAnalyte,
  getAnalyteByName,
} from "@/server/services/analytes";
import { createLabPanel, getLabPanel } from "@/server/services/labs";

useFreshDb();

describe("providers", () => {
  it("creates and lists active providers", () => {
    createProvider({
      name: "Dr. GI",
      specialty: "Gastroenterology",
      organization: "City Hospital",
      status: "active",
    });
    createProvider({
      name: "Old Doc",
      status: "inactive",
    });
    const active = listActiveProviders();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("Dr. GI");
    expect(listFacilityOptions()).toEqual(["City Hospital"]);
  });

  it("updates and deletes", () => {
    const p = createProvider({ name: "X", status: "active" });
    updateProvider(p.id, { name: "Y", status: "active" });
    expect(listActiveProviders()[0].name).toBe("Y");
    deleteProvider(p.id);
    expect(listActiveProviders()).toHaveLength(0);
  });
});

describe("analytes", () => {
  it("seeds common analytes with units", () => {
    const list = listAnalytes();
    expect(list.length).toBeGreaterThan(50);
    expect(getAnalyteByName("Hemoglobin")?.defaultUnit).toBe("g/dL");
    expect(getAnalyteByName("Fecal calprotectin")?.defaultUnit).toBe("ug/g");
    expect(getAnalyteByName("CRP")?.defaultUnit).toBe("mg/L");
  });

  it("creates unique analytes case-insensitively", () => {
    createAnalyte({ name: "WBC", defaultUnit: "K/uL" });
    ensureAnalyte("wbc", "K/uL");
    // Common seed already includes WBC; still only one row for that name
    const wbcs = listAnalytes().filter((a) => a.name.toLowerCase() === "wbc");
    expect(wbcs).toHaveLength(1);
    expect(getAnalyteByName("WBC")?.defaultUnit).toBe("K/uL");
  });

  it("seeds from lab results and registers on panel create", () => {
    createLabPanel(
      { name: "CBC", status: "final" },
      [{ analyteName: "Custom Weird Analyte", value: "12", unit: "g/dL", flag: "normal" }],
    );
    const list = listAnalytes();
    expect(list.some((a) => a.name === "Custom Weird Analyte")).toBe(true);
    const panel = createLabPanel(
      { name: "CBC 2", status: "final" },
      [{ analyteName: "Hemoglobin", value: "11.5", unit: "g/dL" }],
    );
    expect(getLabPanel(panel.id)?.results[0].analyteName).toBe("Hemoglobin");
  });
});
