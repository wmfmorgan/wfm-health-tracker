import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createMedication,
  listMedications,
  updateMedication,
  deleteMedication,
} from "@/server/services/medications";
import {
  createSupplement,
  listSupplements,
  deleteSupplement,
} from "@/server/services/supplements";

useFreshDb();

describe("medications", () => {
  it("defaults list to active when filtered", () => {
    createMedication({ name: "Mesalamine", status: "active", dose: "1.2g", prn: false });
    createMedication({ name: "Prednisone", status: "stopped", dose: "40mg", prn: false });
    expect(listMedications({ status: "active" })).toHaveLength(1);
  });

  it("supports PRN flag", () => {
    const m = createMedication({
      name: "Loperamide",
      status: "active",
      prn: true,
      frequency: "as needed",
    });
    expect(m.prn).toBe(true);
  });

  it("stores how it helps", () => {
    const m = createMedication({
      name: "Mesalamine",
      status: "active",
      prn: false,
      purpose: "Ulcerative colitis",
      howItHelps: "Reduces colon inflammation; maintenance therapy",
    });
    expect(m.howItHelps).toContain("inflammation");
  });

  it("updates and deletes", () => {
    const m = createMedication({ name: "X", status: "active", prn: false });
    updateMedication(m.id, { name: "Y", status: "stopped", prn: false });
    deleteMedication(m.id);
    expect(listMedications()).toHaveLength(0);
  });
});

describe("supplements", () => {
  it("creates list item", () => {
    createSupplement({ name: "Vitamin D", status: "active", dose: "2000 IU", prn: false });
    expect(listSupplements({ status: "active" })[0].name).toBe("Vitamin D");
    const s = listSupplements()[0];
    deleteSupplement(s.id);
  });
});
