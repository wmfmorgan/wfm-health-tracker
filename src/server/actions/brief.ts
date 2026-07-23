"use server";

import { revalidatePath } from "next/cache";
import {
  updateDraftViewSchema,
  type UpdateDraftViewInput,
} from "@/lib/validation/brief";
import {
  acceptView,
  rejectView,
  updateDraftView,
} from "@/server/services/brief";

function revalidateBriefPaths(viewId?: string) {
  revalidatePath("/brief", "layout");
  if (viewId) revalidatePath(`/brief/views/${viewId}`);
  revalidatePath("/co-pilot");
}

export async function acceptViewAction(viewId: string) {
  const view = acceptView(viewId);
  revalidateBriefPaths(viewId);
  return { ok: true as const, viewId: view.id, version: view.version };
}

export async function rejectViewAction(viewId: string) {
  const view = rejectView(viewId);
  revalidateBriefPaths(viewId);
  return { ok: true as const, viewId: view.id };
}

export async function updateDraftViewAction(
  viewId: string,
  input: UpdateDraftViewInput,
) {
  const parsed = updateDraftViewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const view = updateDraftView(viewId, parsed.data);
  revalidateBriefPaths(viewId);
  return { ok: true as const, viewId: view.id };
}
