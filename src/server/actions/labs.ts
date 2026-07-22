"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  labPanelSchema,
  labResultSchema,
  type LabResultInput,
} from "@/lib/validation/lab";
import {
  createLabPanel,
  updateLabPanel,
  deleteLabPanel,
} from "@/server/services/labs";

function emptyToNull(value: FormDataEntryValue | undefined) {
  if (value === undefined || value === "") return null;
  return value;
}

function emptyStrToNull(value: unknown) {
  if (value === undefined || value === "") return null;
  return value;
}

function parseResultsJson(formData: FormData): LabResultInput[] {
  const raw = formData.get("resultsJson");
  if (typeof raw !== "string" || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const results: LabResultInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const result = labResultSchema.safeParse({
      analyteName: row.analyteName,
      value: emptyStrToNull(row.value),
      unit: emptyStrToNull(row.unit),
      refLow: emptyStrToNull(row.refLow),
      refHigh: emptyStrToNull(row.refHigh),
      flag: emptyStrToNull(row.flag),
      notes: emptyStrToNull(row.notes),
    });
    if (result.success) results.push(result.data);
  }
  return results;
}

function parseLabPanelForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const panel = labPanelSchema.safeParse({
    name: raw.name,
    collectedOn: emptyToNull(raw.collectedOn),
    facility: emptyToNull(raw.facility),
    status: raw.status || "final",
    notes: emptyToNull(raw.notes),
  });
  const results = parseResultsJson(formData);
  return { panel, results };
}

export async function createLabPanelAction(formData: FormData) {
  const { panel, results } = parseLabPanelForm(formData);
  if (!panel.success) return { ok: false as const, error: panel.error.flatten() };
  const p = createLabPanel(panel.data, results);
  revalidatePath("/labs");
  redirect(`/labs/${p.id}`);
}

export async function updateLabPanelAction(id: string, formData: FormData) {
  const { panel, results } = parseLabPanelForm(formData);
  if (!panel.success) return { ok: false as const, error: panel.error.flatten() };
  updateLabPanel(id, panel.data, results);
  revalidatePath("/labs");
  revalidatePath(`/labs/${id}`);
  return { ok: true as const };
}

export async function deleteLabPanelAction(id: string) {
  deleteLabPanel(id);
  revalidatePath("/labs");
  redirect("/labs");
}
