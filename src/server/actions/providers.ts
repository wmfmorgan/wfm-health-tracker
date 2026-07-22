"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { providerSchema } from "@/lib/validation/provider";
import {
  createProvider,
  updateProvider,
  deleteProvider,
} from "@/server/services/providers";

function emptyToNull(v: FormDataEntryValue | null) {
  if (v == null) return null;
  const s = String(v);
  return s === "" ? null : s;
}

function parseProviderForm(formData: FormData) {
  return providerSchema.safeParse({
    name: formData.get("name"),
    specialty: emptyToNull(formData.get("specialty")),
    organization: emptyToNull(formData.get("organization")),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    notes: emptyToNull(formData.get("notes")),
    status: formData.get("status") || "active",
  });
}

export async function createProviderAction(formData: FormData) {
  const parsed = parseProviderForm(formData);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  const row = createProvider(parsed.data);
  revalidatePath("/providers");
  revalidatePath("/");
  redirect(`/providers/${row.id}`);
}

export async function updateProviderAction(id: string, formData: FormData) {
  const parsed = parseProviderForm(formData);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  updateProvider(id, parsed.data);
  revalidatePath("/providers");
  revalidatePath(`/providers/${id}`);
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteProviderAction(id: string) {
  deleteProvider(id);
  revalidatePath("/providers");
  revalidatePath("/");
  redirect("/providers");
}
