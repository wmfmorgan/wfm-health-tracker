import { normalizeLabFlag } from "@/lib/ai/flags";
import { normalizeIsoDate } from "@/lib/dates";
import {
  defaultUnitForMetric,
  mapExtractedMetricType,
} from "@/lib/metrics/map-extracted";
import { getMetricDef } from "@/lib/metrics/catalog";
import {
  extractedLabsSchema,
  type ExtractedLabs,
} from "@/lib/validation/import";
import type { AIProvider } from "./types";

const SYSTEM_PROMPT = `You are a structured clinical document extractor for a personal health chart.
Extract BOTH of the following when present in the provided text:

1) Laboratory panels and results
2) Vitals and body-composition metrics (InBody/body scan reports, BP, weight, height, HR, glucose, waist, SpO2, temperature, etc.)

Do not invent values that are not present.
Return a single JSON object with this shape:
{
  "panels": [
    {
      "name": string,
      "collectedOn": string | null (ISO date YYYY-MM-DD when known),
      "facility": string | null,
      "status": "pending" | "final" | null,
      "notes": string | null,
      "results": [
        {
          "analyteName": string,
          "value": string | null,
          "unit": string | null,
          "refLow": string | null,
          "refHigh": string | null,
          "flag": "normal" | "H" | "L" | "critical" | "unknown" | null,
          "notes": string | null
        }
      ]
    }
  ],
  "vitalSessions": [
    {
      "measuredAt": string (ISO date YYYY-MM-DD of the measurement / scan),
      "source": "device_report" | "manual" | null,
      "deviceLabel": string | null (e.g. "InBody"),
      "notes": string | null,
      "readings": [
        {
          "metricType": string (use catalog keys below when possible),
          "valuePrimary": number,
          "valueSecondary": number | null (diastolic only for blood_pressure),
          "unit": string,
          "category": string | null (device band e.g. Standard, Low, High),
          "notes": string | null
        }
      ]
    }
  ]
}

Lab rules:
- collectedOn is specimen collection / draw date (not report print date unless that is the only date). Prefer Collection Date, Drawn, Specimen, or Date of Service. Output YYYY-MM-DD.
- flag: H high, L low, normal in-range, critical, unknown when unclear.

Vitals / body composition rules:
- Prefer one vitalSession per scan or visit date. Group all metrics from the same body composition report into one session.
- If the PDF is only labs, return "vitalSessions": [].
- If the PDF is only a body scan / vitals report, return "panels": [].
- Blood pressure: metricType "blood_pressure", valuePrimary = systolic, valueSecondary = diastolic, unit "mmHg".
- metricType catalog keys (prefer these exact strings):
  blood_pressure, heart_rate, height, weight, waist_circumference, spo2, temperature, glucose,
  body_fat_percent, body_fat_mass, lean_mass, fat_free_mass, skeletal_muscle_mass, skeletal_mass,
  bone_mineral_content, subcutaneous_fat_mass, visceral_fat_index, ag_ratio, body_water_percent,
  bmr, metabolic_age, body_cell_mass, health_score
- Units: weight/mass metrics lb or kg; height/waist in or cm; body fat and water as %; heart_rate bpm; glucose mg/dL or mmol/L; BMR cal; metabolic_age years; visceral_fat_index unit "index"; health_score unit "score".
- Do not invent metrics. Skip unknown labels you cannot map.
- For comparison tables (before → after), prefer the **most recent / right-hand / current** values as the primary session. Optionally include an earlier session if dates are clear.

If nothing is found: {"panels": [], "vitalSessions": []}.`;

function coerceNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/,/g, "").trim();
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function preprocessVitals(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const sessions =
    obj.vitalSessions ??
    obj.vital_sessions ??
    obj.vitals ??
    obj.bodyComposition ??
    obj.body_composition;
  if (!Array.isArray(sessions)) return [];

  const out: unknown[] = [];
  for (const session of sessions) {
    if (!session || typeof session !== "object") continue;
    const s = session as Record<string, unknown>;
    const measuredAt = normalizeIsoDate(
      s.measuredAt ?? s.measured_at ?? s.date ?? s.collectedOn ?? s.collected_on,
    );
    if (!measuredAt) continue;

    const readingsRaw = s.readings ?? s.metrics ?? s.results;
    if (!Array.isArray(readingsRaw)) continue;

    const readings: unknown[] = [];
    for (const row of readingsRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const metricType = mapExtractedMetricType(
        r.metricType ?? r.metric_type ?? r.name ?? r.label ?? r.analyteName,
      );
      if (!metricType) continue;

      let valuePrimary = coerceNumber(
        r.valuePrimary ?? r.value_primary ?? r.value ?? r.primary,
      );
      let valueSecondary = coerceNumber(
        r.valueSecondary ?? r.value_secondary ?? r.diastolic ?? r.secondary,
      );

      // BP sometimes as "120/80" (also re-parse when secondary missing)
      if (metricType === "blood_pressure" && (r.value != null || r.bp != null)) {
        const bp = String(r.value ?? r.bp);
        const parts = bp.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
        if (parts) {
          valuePrimary = Number(parts[1]);
          valueSecondary = Number(parts[2]);
        }
      }

      if (valuePrimary == null || !Number.isFinite(valuePrimary)) continue;

      const def = getMetricDef(metricType);
      if (def?.mode === "bp" && (valueSecondary == null || !Number.isFinite(valueSecondary))) {
        continue;
      }

      const unit = defaultUnitForMetric(
        metricType,
        (r.unit as string) ?? null,
      );
      if (!unit) continue;

      readings.push({
        metricType,
        valuePrimary,
        valueSecondary: valueSecondary ?? null,
        unit,
        category:
          r.category != null
            ? String(r.category)
            : r.band != null
              ? String(r.band)
              : r.status != null
                ? String(r.status)
                : null,
        notes: r.notes != null ? String(r.notes) : null,
      });
    }

    if (readings.length === 0) continue;

    const sourceRaw = s.source ?? s.source_type;
    const source =
      sourceRaw === "manual" || sourceRaw === "device_report"
        ? sourceRaw
        : "device_report";

    out.push({
      measuredAt,
      source,
      deviceLabel:
        s.deviceLabel ?? s.device_label ?? s.device ?? s.deviceName ?? null,
      notes: s.notes ?? null,
      readings,
    });
  }
  return out;
}

function preprocessExtracted(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;

  // Preserve invalid shapes so Zod fails and repair path can run
  if ("panels" in obj && obj.panels != null && !Array.isArray(obj.panels)) {
    return raw;
  }
  if (
    "vitalSessions" in obj &&
    obj.vitalSessions != null &&
    !Array.isArray(obj.vitalSessions)
  ) {
    return raw;
  }

  // Completely unrecognized object (no panels / vitals keys) → fail validation
  const hasPanelKey = "panels" in obj;
  const hasVitalKey =
    "vitalSessions" in obj ||
    "vital_sessions" in obj ||
    "vitals" in obj ||
    "bodyComposition" in obj ||
    "body_composition" in obj;
  if (!hasPanelKey && !hasVitalKey) {
    return raw;
  }

  const panels = Array.isArray(obj.panels) ? obj.panels : [];
  const normalizedPanels = panels.map((panel) => {
    if (!panel || typeof panel !== "object") return panel;
    const p = panel as Record<string, unknown>;

    const collectedRaw =
      p.collectedOn ?? p.collected_on ?? p.collectionDate ?? p.collection_date;
    const collectedOn = normalizeIsoDate(collectedRaw);

    const results = p.results;
    const normalizedResults = Array.isArray(results)
      ? results.map((result) => {
          if (!result || typeof result !== "object") return result;
          const r = result as Record<string, unknown>;
          if (!("flag" in r)) return r;
          return { ...r, flag: normalizeLabFlag(r.flag) };
        })
      : results;

    return {
      ...p,
      collectedOn,
      results: normalizedResults,
    };
  });

  return {
    panels: normalizedPanels,
    vitalSessions: preprocessVitals(obj),
  };
}

function formatZodError(err: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  return err.issues
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

export async function extractLabsFromText(opts: {
  text: string;
  provider: AIProvider;
  model: string;
}): Promise<ExtractedLabs> {
  const { text, provider, model } = opts;

  let raw = await provider.completeJson({
    system: SYSTEM_PROMPT,
    user: text,
    model,
  });

  let parsed = extractedLabsSchema.safeParse(preprocessExtracted(raw));
  if (parsed.success) {
    return parsed.data;
  }

  const errorText = formatZodError(parsed.error);
  raw = await provider.completeJson({
    system: SYSTEM_PROMPT,
    user: `Previous extraction failed schema validation: ${errorText}\n\nRepair and return valid JSON only for this clinical document text:\n\n${text}`,
    model,
  });

  parsed = extractedLabsSchema.safeParse(preprocessExtracted(raw));
  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(
    `Import extraction failed validation after repair: ${formatZodError(parsed.error)}`,
  );
}
