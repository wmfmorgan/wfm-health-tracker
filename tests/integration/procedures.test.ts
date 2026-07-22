import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createProcedure,
  getProcedure,
  listProcedures,
  updateProcedure,
  deleteProcedure,
} from "@/server/services/procedures";

useFreshDb();

describe("procedures service", () => {
  it("creates and lists", () => {
    createProcedure({
      name: "Colonoscopy",
      performedOn: "2023-06-01",
      facility: "GI Clinic",
      clinician: "Dr. Smith",
    });
    expect(listProcedures()).toHaveLength(1);
  });

  it("updates and deletes", () => {
    const row = createProcedure({ name: "EGD" });
    updateProcedure(row.id, {
      name: "EGD with biopsy",
      outcome: "Mild gastritis",
      followUp: "PPI x 8 weeks",
    });
    expect(getProcedure(row.id)?.name).toContain("biopsy");
    expect(getProcedure(row.id)?.outcome).toContain("gastritis");
    deleteProcedure(row.id);
    expect(getProcedure(row.id)).toBeUndefined();
  });

  it("filters by search", () => {
    createProcedure({ name: "Colonoscopy", clinician: "Dr. Jones" });
    createProcedure({ name: "Joint injection", facility: "Ortho Center" });
    expect(listProcedures({ q: "colon" })).toHaveLength(1);
    expect(listProcedures({ q: "Ortho" })).toHaveLength(1);
  });

  it("associates a diagnosis", () => {
    const row = createProcedure({
      name: "Colonoscopy with polypectomy",
      diagnosis: "Ulcerative colitis",
    });
    expect(getProcedure(row.id)?.diagnosis).toBe("Ulcerative colitis");
    expect(listProcedures({ q: "ulcerative" })).toHaveLength(1);
  });
});
