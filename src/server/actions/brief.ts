"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  updateDraftViewSchema,
  type UpdateDraftViewInput,
} from "@/lib/validation/brief";
import {
  acceptView,
  rejectView,
  saveMyPlan,
  updateDraftView,
} from "@/server/services/brief";

function revalidateBriefPaths(viewId?: string) {
  revalidatePath("/brief", "layout");
  if (viewId) revalidatePath(`/brief/views/${viewId}`);
  revalidatePath("/chat");
  revalidatePath("/evaluate");
  revalidatePath("/personas");
}

export async function acceptViewAction(viewId: string) {
  const view = acceptView(viewId);
  revalidateBriefPaths(viewId);
  return { ok: true as const, viewId: view.id, version: view.version };
}

export async function rejectViewAction(viewId: string) {
  rejectView(viewId);
  revalidateBriefPaths(viewId);
  redirect("/brief");
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

/** Form-bound draft save (title + bodyMd from FormData). */
export async function updateDraftViewFormAction(
  viewId: string,
  formData: FormData,
) {
  const bodyMd = String(formData.get("bodyMd") ?? "");
  const titleRaw = formData.get("title");
  const title =
    titleRaw === null || titleRaw === undefined
      ? undefined
      : String(titleRaw).trim() || null;

  return updateDraftViewAction(viewId, {
    bodyMd,
    ...(title !== undefined ? { title } : {}),
  });
}

export async function saveMyPlanAction(formData: FormData) {
  const bodyMd = String(formData.get("bodyMd") ?? "");
  saveMyPlan(bodyMd);
  revalidateBriefPaths();
  return { ok: true as const };
}
