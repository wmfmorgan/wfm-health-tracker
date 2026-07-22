"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  labPanelSchema,
  labResultSchema,
  type LabResultInput,
} from "@/lib/validation/lab";
import {
  confirmCloudAndExtract,
  retryFailedJob,
  acceptDraftPanel,
  rejectDraftPanel,
  acceptAllPending,
  discardImportJob,
  updateDraftPanel,
} from "@/server/services/imports";

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

function revalidateImportPaths(jobId?: string) {
  revalidatePath("/import");
  if (jobId) revalidatePath(`/import/${jobId}`);
  revalidatePath("/labs");
  revalidatePath("/documents");
}

export async function confirmCloudImportAction(jobId: string) {
  await confirmCloudAndExtract(jobId);
  revalidateImportPaths(jobId);
  return { ok: true as const };
}

export async function retryImportAction(jobId: string) {
  await retryFailedJob(jobId);
  revalidateImportPaths(jobId);
  return { ok: true as const };
}

export async function acceptDraftPanelAction(draftPanelId: string) {
  const { labPanelId } = acceptDraftPanel(draftPanelId);
  revalidatePath("/import");
  revalidatePath("/labs");
  revalidatePath(`/labs/${labPanelId}`);
  revalidatePath("/documents");
  return { ok: true as const, labPanelId };
}

export async function rejectDraftPanelAction(draftPanelId: string) {
  rejectDraftPanel(draftPanelId);
  revalidatePath("/import");
  revalidatePath("/labs");
  return { ok: true as const };
}

export async function acceptAllPendingAction(jobId: string) {
  acceptAllPending(jobId);
  revalidateImportPaths(jobId);
  return { ok: true as const };
}

export async function discardImportJobAction(jobId: string) {
  discardImportJob(jobId);
  revalidateImportPaths(jobId);
  redirect("/import");
}

export async function updateDraftPanelAction(draftPanelId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const panel = labPanelSchema.safeParse({
    name: raw.name,
    collectedOn: emptyToNull(raw.collectedOn),
    facility: emptyToNull(raw.facility),
    status: raw.status || "final",
    notes: emptyToNull(raw.notes),
  });
  if (!panel.success) return { ok: false as const, error: panel.error.flatten() };

  const results = parseResultsJson(formData);
  updateDraftPanel(
    draftPanelId,
    {
      name: panel.data.name,
      collectedOn: panel.data.collectedOn,
      facility: panel.data.facility,
      status: panel.data.status,
      notes: panel.data.notes,
    },
    results,
  );

  revalidatePath("/import");
  return { ok: true as const };
}
