"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { medicationSchema } from "@/lib/validation/medication";
import {
  createMedication,
  updateMedication,
  deleteMedication,
} from "@/server/services/medications";

function emptyToNull(value: FormDataEntryValue | undefined) {
  if (value === undefined || value === "") return null;
  return value;
}

function parseMedicationForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const prnRaw = formData.get("prn");
  return medicationSchema.safeParse({
    ...raw,
    dose: emptyToNull(raw.dose),
    form: emptyToNull(raw.form),
    route: emptyToNull(raw.route),
    frequency: emptyToNull(raw.frequency),
    prn: prnRaw === "on" || prnRaw === "true" || prnRaw === "1",
    startOn: emptyToNull(raw.startOn),
    endOn: emptyToNull(raw.endOn),
    purpose: emptyToNull(raw.purpose),
    prescriber: emptyToNull(raw.prescriber),
    notes: emptyToNull(raw.notes),
  });
}

export async function createMedicationAction(formData: FormData) {
  const parsed = parseMedicationForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  const m = createMedication(parsed.data);
  revalidatePath("/medications");
  redirect(`/medications/${m.id}`);
}

export async function updateMedicationAction(id: string, formData: FormData) {
  const parsed = parseMedicationForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  updateMedication(id, parsed.data);
  revalidatePath("/medications");
  revalidatePath(`/medications/${id}`);
  return { ok: true as const };
}

export async function deleteMedicationAction(id: string) {
  deleteMedication(id);
  revalidatePath("/medications");
  redirect("/medications");
}
