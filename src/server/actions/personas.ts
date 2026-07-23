"use server";

import { revalidatePath } from "next/cache";
import {
  createCustomPersonaSchema,
  updatePersonaSchema,
} from "@/lib/validation/persona";
import {
  createCustomPersona,
  deleteCustomPersona,
  resetPersonaPrompt,
  updatePersona,
} from "@/server/services/personas";

function revalidatePersonaPaths() {
  revalidatePath("/settings");
  revalidatePath("/co-pilot");
  revalidatePath("/brief");
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

export async function updatePersonaAction(id: string, formData: FormData) {
  const raw = {
    name: optionalString(formData.get("name")) ?? undefined,
    specialty: optionalString(formData.get("specialty")),
    description: optionalString(formData.get("description")),
    systemPromptOverride: optionalString(formData.get("systemPromptOverride")),
    isEnabled: formBool(formData.get("isEnabled")),
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
  if (raw.systemPromptOverride !== undefined) {
    payload.systemPromptOverride = raw.systemPromptOverride;
  }
  if (raw.isEnabled !== undefined) payload.isEnabled = raw.isEnabled;

  const parsed = updatePersonaSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  try {
    const persona = updatePersona(id, parsed.data);
    revalidatePersonaPaths();
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
    revalidatePersonaPaths();
    return { ok: true as const, id: persona.id };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to reset persona prompt",
    };
  }
}

export async function createCustomPersonaAction(formData: FormData) {
  const parsed = createCustomPersonaSchema.safeParse({
    name: formData.get("name"),
    specialty: optionalString(formData.get("specialty")),
    description: optionalString(formData.get("description")),
    systemPromptDefault: formData.get("systemPromptDefault"),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  try {
    const persona = createCustomPersona(parsed.data);
    revalidatePersonaPaths();
    return { ok: true as const, id: persona.id };
  } catch (e) {
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
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to delete persona",
    };
  }
}
