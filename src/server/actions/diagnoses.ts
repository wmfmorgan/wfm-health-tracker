"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { diagnosisSchema } from "@/lib/validation/diagnosis";
import {
  createDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
} from "@/server/services/diagnoses";

function parseDiagnosisForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return diagnosisSchema.safeParse({
    ...raw,
    diagnosedOn: raw.diagnosedOn === "" ? null : raw.diagnosedOn,
    icdCode: raw.icdCode === "" ? null : raw.icdCode,
    clinician: raw.clinician === "" ? null : raw.clinician,
    facility: raw.facility === "" ? null : raw.facility,
    notes: raw.notes === "" ? null : raw.notes,
  });
}

export async function createDiagnosisAction(formData: FormData) {
  const parsed = parseDiagnosisForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  const d = createDiagnosis(parsed.data);
  revalidatePath("/diagnoses");
  redirect(`/diagnoses/${d.id}`);
}

export async function updateDiagnosisAction(id: string, formData: FormData) {
  const parsed = parseDiagnosisForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  updateDiagnosis(id, parsed.data);
  revalidatePath("/diagnoses");
  revalidatePath(`/diagnoses/${id}`);
  return { ok: true as const };
}

export async function deleteDiagnosisAction(id: string) {
  deleteDiagnosis(id);
  revalidatePath("/diagnoses");
  redirect("/diagnoses");
}
