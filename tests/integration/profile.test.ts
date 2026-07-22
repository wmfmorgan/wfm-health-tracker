import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { getProfile, upsertProfile } from "@/server/services/profile";
import { createAllergy, listAllergies, deleteAllergy } from "@/server/services/allergies";

useFreshDb();

describe("profile service", () => {
  it("creates default profile on get", () => {
    const p = getProfile();
    expect(p.id).toBe("default");
  });

  it("updates profile fields", () => {
    upsertProfile({
      displayName: "J",
      dateOfBirth: "1980-05-01",
      heightValue: 180,
      heightUnit: "cm",
      weightValue: 75,
      weightUnit: "kg",
      preferredLengthUnit: "cm",
      preferredWeightUnit: "kg",
    });
    const p = getProfile();
    expect(p.displayName).toBe("J");
    expect(p.heightValue).toBe(180);
  });
});

describe("allergies service", () => {
  it("creates and lists allergies", () => {
    createAllergy({ name: "Sulfa", severity: "moderate" });
    const list = listAllergies();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Sulfa");
  });

  it("deletes allergy", () => {
    const a = createAllergy({ name: "Latex" });
    deleteAllergy(a.id);
    expect(listAllergies()).toHaveLength(0);
  });
});
