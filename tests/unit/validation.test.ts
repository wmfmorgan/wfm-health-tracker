import { describe, it, expect } from "vitest";
import { profileSchema } from "@/lib/validation/profile";
import { allergySchema } from "@/lib/validation/allergy";

describe("profileSchema", () => {
  it("accepts empty optional fields", () => {
    const r = profileSchema.safeParse({ preferredLengthUnit: "cm", preferredWeightUnit: "kg" });
    expect(r.success).toBe(true);
  });

  it("rejects bad dob", () => {
    const r = profileSchema.safeParse({
      dateOfBirth: "01/01/1980",
      preferredLengthUnit: "cm",
      preferredWeightUnit: "kg",
    });
    expect(r.success).toBe(false);
  });
});

describe("allergySchema", () => {
  it("requires name", () => {
    expect(allergySchema.safeParse({ name: "" }).success).toBe(false);
    expect(allergySchema.safeParse({ name: "Penicillin" }).success).toBe(true);
  });
});
