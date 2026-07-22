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
  it("creates unique analytes case-insensitively", () => {
    createAnalyte({ name: "WBC", defaultUnit: "K/uL" });
    ensureAnalyte("wbc", "K/uL");
    expect(listAnalytes()).toHaveLength(1);
    expect(getAnalyteByName("WBC")?.defaultUnit).toBe("K/uL");
  });

  it("seeds from lab results and registers on panel create", () => {
    createLabPanel(
      { name: "CBC", status: "final" },
      [{ analyteName: "Hgb", value: "12", unit: "g/dL", flag: "normal" }],
    );
    const list = listAnalytes();
    expect(list.some((a) => a.name === "Hgb")).toBe(true);
    const panel = createLabPanel(
      { name: "CBC 2", status: "final" },
      [{ analyteName: "Hgb", value: "11.5", unit: "g/dL" }],
    );
    expect(getLabPanel(panel.id)?.results[0].analyteName).toBe("Hgb");
  });
});
