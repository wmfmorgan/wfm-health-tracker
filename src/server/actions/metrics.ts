"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  readingInputSchema,
  sessionInputSchema,
} from "@/lib/validation/metrics";
import { isMetricKey, getMetricDef, METRIC_CATALOG } from "@/lib/metrics/catalog";
import {
  createReading,
  createSession,
  deleteReading,
  deleteSession,
  replaceSessionReadings,
  updateSessionMeta,
} from "@/server/services/metrics";

function revalidateVitals() {
  revalidatePath("/vitals");
  revalidatePath("/profile");
  revalidatePath("/");
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createReadingAction(formData: FormData) {
  const metricType = String(formData.get("metricType") ?? "");
  const parsed = readingInputSchema.safeParse({
    metricType,
    valuePrimary: formData.get("valuePrimary"),
    valueSecondary: formData.get("valueSecondary") || null,
    unit: formData.get("unit") || getMetricDef(metricType)?.defaultUnit || "",
    category: emptyToNull(formData.get("category")),
    measuredAt: formData.get("measuredAt") || todayIsoDate(),
    notes: emptyToNull(formData.get("notes")),
    sessionId: null,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  createReading(parsed.data);
  revalidateVitals();
  redirect("/vitals");
}

export async function createBpAction(formData: FormData) {
  const parsed = readingInputSchema.safeParse({
    metricType: "blood_pressure",
    valuePrimary: formData.get("systolic"),
    valueSecondary: formData.get("diastolic"),
    unit: "mmHg",
    category: emptyToNull(formData.get("category")),
    measuredAt: formData.get("measuredAt") || todayIsoDate(),
    notes: emptyToNull(formData.get("notes")),
    sessionId: null,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  createReading(parsed.data);
  revalidateVitals();
  redirect("/vitals");
}

export async function createGlucoseAction(formData: FormData) {
  const parsed = readingInputSchema.safeParse({
    metricType: "glucose",
    valuePrimary: formData.get("valuePrimary"),
    valueSecondary: null,
    unit: formData.get("unit") || "mg/dL",
    category: null,
    measuredAt: formData.get("measuredAt") || todayIsoDate(),
    notes: emptyToNull(formData.get("notes")),
    sessionId: null,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  createReading(parsed.data);
  revalidateVitals();
  redirect("/vitals");
}

export async function deleteReadingAction(id: string) {
  deleteReading(id);
  revalidateVitals();
  redirect("/vitals");
}

function parseSessionForm(formData: FormData) {
  const measuredAt = String(formData.get("measuredAt") || todayIsoDate());
  const sourceRaw = String(formData.get("source") || "device_report");
  const source =
    sourceRaw === "manual" || sourceRaw === "device_report"
      ? sourceRaw
      : "device_report";

  const readings: Array<{
    metricType: string;
    valuePrimary: number;
    valueSecondary?: number | null;
    unit: string;
    category?: string | null;
  }> = [];

  for (const def of METRIC_CATALOG) {
    if (!def.sessionGroup) continue;
    const primaryRaw = formData.get(`m_${def.key}`);
    if (primaryRaw == null || String(primaryRaw).trim() === "") continue;
    const unit =
      String(formData.get(`u_${def.key}`) || "").trim() || def.defaultUnit;
    const category = emptyToNull(formData.get(`c_${def.key}`));
    const valuePrimary = Number(primaryRaw);
    if (!Number.isFinite(valuePrimary)) continue;

    if (def.mode === "bp") {
      const secondaryRaw = formData.get(`m2_${def.key}`);
      const valueSecondary =
        secondaryRaw != null && String(secondaryRaw).trim() !== ""
          ? Number(secondaryRaw)
          : null;
      readings.push({
        metricType: def.key,
        valuePrimary,
        valueSecondary,
        unit,
        category,
      });
    } else {
      readings.push({
        metricType: def.key,
        valuePrimary,
        unit,
        category,
      });
    }
  }

  return sessionInputSchema.safeParse({
    measuredAt,
    source,
    deviceLabel: emptyToNull(formData.get("deviceLabel")),
    notes: emptyToNull(formData.get("notes")),
    readings,
  });
}

export async function createSessionAction(formData: FormData) {
  const parsed = parseSessionForm(formData);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  const session = createSession(parsed.data);
  revalidateVitals();
  redirect(`/vitals/sessions/${session.id}`);
}

export async function updateSessionAction(id: string, formData: FormData) {
  const parsed = parseSessionForm(formData);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  updateSessionMeta(id, {
    measuredAt: parsed.data.measuredAt,
    source: parsed.data.source,
    deviceLabel: parsed.data.deviceLabel,
    notes: parsed.data.notes,
  });
  replaceSessionReadings(id, parsed.data.readings, parsed.data.measuredAt);
  revalidateVitals();
  revalidatePath(`/vitals/sessions/${id}`);
  return { ok: true as const };
}

export async function deleteSessionAction(id: string) {
  deleteSession(id);
  revalidateVitals();
  redirect("/vitals");
}

/** Validate metric type helper for forms (unused but keeps tree-shake friendly). */
export async function isKnownMetric(key: string) {
  return isMetricKey(key);
}
