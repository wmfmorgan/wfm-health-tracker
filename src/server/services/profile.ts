import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { profile } from "@/server/db/schema";
import { nowIso } from "@/lib/dates";
import type { ProfileInput } from "@/lib/validation/profile";

const PROFILE_ID = "default";

export function getProfile() {
  bootstrapDb();
  const db = getDb();
  const row = db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get();
  if (row) return row;
  const updatedAt = nowIso();
  db.insert(profile)
    .values({
      id: PROFILE_ID,
      preferredLengthUnit: "cm",
      preferredWeightUnit: "kg",
      updatedAt,
    })
    .run();
  return db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get()!;
}

export function upsertProfile(input: ProfileInput) {
  bootstrapDb();
  const db = getDb();
  getProfile();
  const updatedAt = nowIso();
  db.update(profile)
    .set({
      displayName: emptyToNull(input.displayName),
      dateOfBirth: emptyToNull(input.dateOfBirth),
      sex: emptyToNull(input.sex),
      heightValue: input.heightValue ?? null,
      heightUnit: input.heightUnit ?? null,
      weightValue: input.weightValue ?? null,
      weightUnit: input.weightUnit ?? null,
      bloodType: emptyToNull(input.bloodType),
      notes: emptyToNull(input.notes),
      preferredLengthUnit: input.preferredLengthUnit ?? "cm",
      preferredWeightUnit: input.preferredWeightUnit ?? "kg",
      updatedAt,
    })
    .where(eq(profile.id, PROFILE_ID))
    .run();
  return getProfile();
}

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}
