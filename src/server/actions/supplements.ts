"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supplementSchema } from "@/lib/validation/supplement";
import {
  createSupplement,
  updateSupplement,
  deleteSupplement,
} from "@/server/services/supplements";

function emptyToNull(value: FormDataEntryValue | undefined) {
  if (value === undefined || value === "") return null;
  return value;
}

function parseSupplementForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const prnRaw = formData.get("prn");
  return supplementSchema.safeParse({
    ...raw,
    dose: emptyToNull(raw.dose),
    form: emptyToNull(raw.form),
    route: emptyToNull(raw.route),
    frequency: emptyToNull(raw.frequency),
    prn: prnRaw === "on" || prnRaw === "true" || prnRaw === "1",
    startOn: emptyToNull(raw.startOn),
    endOn: emptyToNull(raw.endOn),
    purpose: emptyToNull(raw.purpose),
    notes: emptyToNull(raw.notes),
  });
}

export async function createSupplementAction(formData: FormData) {
  const parsed = parseSupplementForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  const s = createSupplement(parsed.data);
  revalidatePath("/supplements");
  redirect(`/supplements/${s.id}`);
}

export async function updateSupplementAction(id: string, formData: FormData) {
  const parsed = parseSupplementForm(formData);
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  updateSupplement(id, parsed.data);
  revalidatePath("/supplements");
  revalidatePath(`/supplements/${id}`);
  return { ok: true as const };
}

export async function deleteSupplementAction(id: string) {
  deleteSupplement(id);
  revalidatePath("/supplements");
  redirect("/supplements");
}
