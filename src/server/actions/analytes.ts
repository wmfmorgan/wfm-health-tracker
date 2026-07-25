"use server";

import { revalidatePath } from "next/cache";
import { analyteSchema } from "@/lib/validation/analyte";
import {
  createAnalyte,
  updateAnalyte,
  deleteAnalyte,
  addAnalyteAlias,
  deleteAnalyteAlias,
  rejectAliasSuggestion,
} from "@/server/services/analytes";
function emptyToNull(v: FormDataEntryValue | null) {
  if (v == null) return null;
  const s = String(v);
  return s === "" ? null : s;
}

function revalidateAnalyteViews() {
  revalidatePath("/labs");
  revalidatePath("/analytes");
  revalidatePath("/");
  revalidatePath("/providers");
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
  revalidateAnalyteViews();
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
  revalidateAnalyteViews();
  return { ok: true as const };
}

export async function deleteAnalyteAction(id: string) {
  deleteAnalyte(id);
  revalidateAnalyteViews();
  return { ok: true as const };
}

/** Confirm-gated: only called after client confirm. */
export async function addAnalyteAliasAction(analyteId: string, formData: FormData) {
  const alias = String(formData.get("alias") ?? "").trim();
  if (!alias) {
    return { ok: false as const, error: "Alias is required" };
  }
  try {
    addAnalyteAlias(analyteId, alias);
    revalidateAnalyteViews();
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to add alias",
    };
  }
}

export async function mapUnmatchedToAnalyteAction(formData: FormData) {
  const spelling = String(formData.get("spelling") ?? "").trim();
  const analyteId = String(formData.get("analyteId") ?? "").trim();
  if (!spelling || !analyteId) {
    return { ok: false as const, error: "Spelling and target analyte are required" };
  }
  try {
    addAnalyteAlias(analyteId, spelling);
    revalidateAnalyteViews();
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to map spelling",
    };
  }
}

export async function deleteAnalyteAliasAction(aliasId: string) {
  deleteAnalyteAlias(aliasId);
  revalidateAnalyteViews();
  return { ok: true as const };
}

/** Accept a potential-alias flag: merge spelling into target (confirm in UI first). */
export async function acceptAliasFlagAction(formData: FormData) {
  const spelling = String(formData.get("spelling") ?? "").trim();
  const analyteId = String(formData.get("analyteId") ?? "").trim();
  if (!spelling || !analyteId) {
    return { ok: false as const, error: "Spelling and target are required" };
  }
  try {
    addAnalyteAlias(analyteId, spelling);
    revalidateAnalyteViews();
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to merge",
    };
  }
}

/** Reject a potential-alias flag so it does not resurface. */
export async function rejectAliasFlagAction(formData: FormData) {
  const spelling = String(formData.get("spelling") ?? "").trim();
  const analyteId = String(formData.get("analyteId") ?? "").trim();
  if (!spelling || !analyteId) {
    return { ok: false as const, error: "Spelling and target are required" };
  }
  try {
    rejectAliasSuggestion(spelling, analyteId);
    revalidateAnalyteViews();
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to reject",
    };
  }
}
