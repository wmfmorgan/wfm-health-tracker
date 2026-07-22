"use server";

import { revalidatePath } from "next/cache";
import { analyteSchema } from "@/lib/validation/analyte";
import { createAnalyte, updateAnalyte, deleteAnalyte } from "@/server/services/analytes";

function emptyToNull(v: FormDataEntryValue | null) {
  if (v == null) return null;
  const s = String(v);
  return s === "" ? null : s;
}

export async function createAnalyteAction(formData: FormData) {
  const parsed = analyteSchema.safeParse({
    name: formData.get("name"),
    defaultUnit: emptyToNull(formData.get("defaultUnit")),
    notes: emptyToNull(formData.get("notes")),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  createAnalyte(parsed.data);
  revalidatePath("/labs");
  revalidatePath("/providers");
  revalidatePath("/analytes");
  return { ok: true as const };
}

export async function updateAnalyteAction(id: string, formData: FormData) {
  const parsed = analyteSchema.safeParse({
    name: formData.get("name"),
    defaultUnit: emptyToNull(formData.get("defaultUnit")),
    notes: emptyToNull(formData.get("notes")),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  updateAnalyte(id, parsed.data);
  revalidatePath("/labs");
  revalidatePath("/analytes");
  return { ok: true as const };
}

export async function deleteAnalyteAction(id: string) {
  deleteAnalyte(id);
  revalidatePath("/labs");
  revalidatePath("/analytes");
  return { ok: true as const };
}
