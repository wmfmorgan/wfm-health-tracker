"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clinicalTestSchema } from "@/lib/validation/test-result";
import {
  createClinicalTest,
  updateClinicalTest,
  deleteClinicalTest,
} from "@/server/services/clinical-tests";

function parseClinicalTestForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return clinicalTestSchema.safeParse({
    ...raw,
    performedOn: raw.performedOn === "" ? null : raw.performedOn,
    facility: raw.facility === "" ? null : raw.facility,
    diagnosis: raw.diagnosis === "" ? null : raw.diagnosis,
    summary: raw.summary === "" ? null : raw.summary,
    keyFindings: raw.keyFindings === "" ? null : raw.keyFindings,
    notes: raw.notes === "" ? null : raw.notes,
  });
}

export async function createClinicalTestAction(formData: FormData) {
  const parsed = parseClinicalTestForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  const row = createClinicalTest(parsed.data);
  revalidatePath("/tests");
  redirect(`/tests/${row.id}`);
}

export async function updateClinicalTestAction(id: string, formData: FormData) {
  const parsed = parseClinicalTestForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  updateClinicalTest(id, parsed.data);
  revalidatePath("/tests");
  revalidatePath(`/tests/${id}`);
  return { ok: true as const };
}

export async function deleteClinicalTestAction(id: string) {
  deleteClinicalTest(id);
  revalidatePath("/tests");
  redirect("/tests");
}
