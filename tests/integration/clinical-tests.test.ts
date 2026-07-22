import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createClinicalTest,
  getClinicalTest,
  listClinicalTests,
  updateClinicalTest,
  deleteClinicalTest,
} from "@/server/services/clinical-tests";

useFreshDb();

describe("clinical tests service", () => {
  it("creates and lists", () => {
    createClinicalTest({
      type: "imaging",
      name: "Abdominal CT",
      performedOn: "2024-01-15",
      facility: "City Radiology",
    });
    expect(listClinicalTests()).toHaveLength(1);
  });

  it("updates and deletes", () => {
    const row = createClinicalTest({
      type: "pathology",
      name: "Colon biopsy",
    });
    updateClinicalTest(row.id, {
      type: "pathology",
      name: "Colon biopsy - UC",
      keyFindings: "Chronic inflammation",
    });
    expect(getClinicalTest(row.id)?.name).toContain("UC");
    expect(getClinicalTest(row.id)?.keyFindings).toContain("Chronic");
    deleteClinicalTest(row.id);
    expect(getClinicalTest(row.id)).toBeUndefined();
  });

  it("filters by type and search", () => {
    createClinicalTest({ type: "imaging", name: "MRI abdomen" });
    createClinicalTest({ type: "pathology", name: "Skin biopsy" });
    expect(listClinicalTests({ type: "imaging" })).toHaveLength(1);
    expect(listClinicalTests({ q: "biopsy" })).toHaveLength(1);
  });
});
