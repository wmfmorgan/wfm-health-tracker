"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomPersonaSchema,
  normalizePreferredModel,
  normalizePreferredProvider,
  updatePersonaSchema,
} from "@/lib/validation/persona";
import {
  createCustomPersona,
  deleteCustomPersona,
  resetPersonaPrompt,
  updatePersona,
} from "@/server/services/personas";

function revalidatePersonaPaths(personaId?: string) {
  revalidatePath("/personas");
  if (personaId) revalidatePath(`/personas/${personaId}`);
  revalidatePath("/chat");
  revalidatePath("/evaluate");
  revalidatePath("/brief");
  revalidatePath("/settings");
}

function formBool(value: FormDataEntryValue | null): boolean | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const s = String(value).toLowerCase();
  if (s === "true" || s === "on" || s === "1") return true;
  if (s === "false" || s === "off" || s === "0") return false;
  return undefined;
}

function optionalString(value: FormDataEntryValue | null): string | null | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

/** Form value: "" | "global" → null; grok|ollama kept. */
function preferredProviderFromForm(
  value: FormDataEntryValue | null,
): "grok" | "ollama" | null | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim().toLowerCase();
  if (s === "" || s === "global") return null;
  return normalizePreferredProvider(s);
}

export async function updatePersonaAction(id: string, formData: FormData) {
  const rawProvider = preferredProviderFromForm(formData.get("preferredProvider"));
  const rawModel = normalizePreferredModel(formData.get("preferredModel"));

  const raw = {
    name: optionalString(formData.get("name")) ?? undefined,
    specialty: optionalString(formData.get("specialty")),
    description: optionalString(formData.get("description")),
    systemPromptDefault: optionalString(formData.get("systemPromptDefault")) ?? undefined,
    systemPromptOverride: optionalString(formData.get("systemPromptOverride")),
    isEnabled: formBool(formData.get("isEnabled")),
    preferredProvider: rawProvider,
    preferredModel: rawModel,
  };

  // Drop empty optional name so schema does not fail on "" when field omitted intentionally.
  const payload: Record<string, unknown> = {};
  if (raw.name !== undefined && raw.name.trim() !== "") payload.name = raw.name;
  if (raw.specialty !== undefined) {
    const s = raw.specialty?.trim() ?? "";
    payload.specialty = s === "" ? null : s;
  }
  if (raw.description !== undefined) {
    const d = raw.description?.trim() ?? "";
    payload.description = d === "" ? null : d;
  }
  if (raw.systemPromptDefault !== undefined && raw.systemPromptDefault.trim() !== "") {
    payload.systemPromptDefault = raw.systemPromptDefault;
  }
  if (raw.systemPromptOverride !== undefined) {
    payload.systemPromptOverride = raw.systemPromptOverride;
  }
  if (raw.isEnabled !== undefined) payload.isEnabled = raw.isEnabled;
  if (raw.preferredProvider !== undefined) {
    payload.preferredProvider = raw.preferredProvider;
  }
  if (raw.preferredModel !== undefined) {
    payload.preferredModel = raw.preferredModel;
  }

  const parsed = updatePersonaSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  try {
    const persona = updatePersona(id, parsed.data);
    revalidatePersonaPaths(persona.id);
    return { ok: true as const, id: persona.id };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to update persona",
    };
  }
}

export async function resetPersonaPromptAction(id: string) {
  try {
    const persona = resetPersonaPrompt(id);
    revalidatePersonaPaths(persona.id);
    return { ok: true as const, id: persona.id };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to reset persona prompt",
    };
  }
}

export async function createCustomPersonaAction(formData: FormData) {
  const rawProvider = preferredProviderFromForm(formData.get("preferredProvider"));
  const rawModel = normalizePreferredModel(formData.get("preferredModel"));

  const parsed = createCustomPersonaSchema.safeParse({
    name: formData.get("name"),
    specialty: optionalString(formData.get("specialty")),
    description: optionalString(formData.get("description")),
    systemPromptDefault: formData.get("systemPromptDefault"),
    preferredProvider: rawProvider === undefined ? null : rawProvider,
    preferredModel: rawModel === undefined ? null : rawModel,
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  try {
    const persona = createCustomPersona(parsed.data);
    revalidatePersonaPaths(persona.id);
    redirect(`/personas/${persona.id}`);
  } catch (e) {
    // redirect() throws a special NEXT_REDIRECT error — rethrow it
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to create persona",
    };
  }
}

export async function deleteCustomPersonaAction(id: string) {
  try {
    deleteCustomPersona(id);
    revalidatePersonaPaths();
    redirect("/personas");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to delete persona",
    };
  }
}
