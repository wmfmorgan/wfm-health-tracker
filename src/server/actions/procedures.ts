"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { procedureSchema } from "@/lib/validation/procedure";
import {
  createProcedure,
  updateProcedure,
  deleteProcedure,
} from "@/server/services/procedures";

function parseProcedureForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return procedureSchema.safeParse({
    ...raw,
    performedOn: raw.performedOn === "" ? null : raw.performedOn,
    facility: raw.facility === "" ? null : raw.facility,
    clinician: raw.clinician === "" ? null : raw.clinician,
    outcome: raw.outcome === "" ? null : raw.outcome,
    followUp: raw.followUp === "" ? null : raw.followUp,
    notes: raw.notes === "" ? null : raw.notes,
  });
}

export async function createProcedureAction(formData: FormData) {
  const parsed = parseProcedureForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  const row = createProcedure(parsed.data);
  revalidatePath("/procedures");
  redirect(`/procedures/${row.id}`);
}

export async function updateProcedureAction(id: string, formData: FormData) {
  const parsed = parseProcedureForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  updateProcedure(id, parsed.data);
  revalidatePath("/procedures");
  revalidatePath(`/procedures/${id}`);
  return { ok: true as const };
}

export async function deleteProcedureAction(id: string) {
  deleteProcedure(id);
  revalidatePath("/procedures");
  redirect("/procedures");
}
