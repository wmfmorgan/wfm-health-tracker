import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createDiagnosis,
  getDiagnosis,
  listDiagnoses,
  listDiagnosesForSelect,
  updateDiagnosis,
  deleteDiagnosis,
} from "@/server/services/diagnoses";

useFreshDb();

describe("diagnoses service", () => {
  it("creates and lists", () => {
    createDiagnosis({
      name: "Ulcerative colitis",
      status: "chronic",
      diagnosedOn: "2015-03-01",
    });
    expect(listDiagnoses()).toHaveLength(1);
  });

  it("updates and deletes", () => {
    const d = createDiagnosis({ name: "Anemia", status: "active" });
    updateDiagnosis(d.id, { name: "Iron deficiency anemia", status: "active" });
    expect(getDiagnosis(d.id)?.name).toContain("Iron");
    deleteDiagnosis(d.id);
    expect(getDiagnosis(d.id)).toBeUndefined();
  });

  it("filters by status", () => {
    createDiagnosis({ name: "A", status: "active" });
    createDiagnosis({ name: "B", status: "resolved" });
    expect(listDiagnoses({ status: "active" })).toHaveLength(1);
  });

  it("lists all statuses for medication purpose select", () => {
    createDiagnosis({ name: "Active Dx", status: "active" });
    createDiagnosis({ name: "Resolved Dx", status: "resolved" });
    createDiagnosis({ name: "Chronic Dx", status: "chronic" });
    const forSelect = listDiagnosesForSelect();
    expect(forSelect.map((d) => d.name)).toEqual(
      expect.arrayContaining(["Active Dx", "Resolved Dx", "Chronic Dx"]),
    );
    expect(forSelect[0].status).toBe("active");
  });
});
