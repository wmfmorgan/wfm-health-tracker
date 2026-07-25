import { normalizeLabFlag } from "@/lib/ai/flags";
import { normalizeIsoDate } from "@/lib/dates";
import {
  extractedLabsSchema,
  type ExtractedLabs,
} from "@/lib/validation/import";
import type { AIProvider } from "./types";

const SYSTEM_PROMPT = `You are a structured laboratory result extractor.
Extract only lab panels and results that appear in the provided text.
Do not invent values, panels, or analytes that are not present.
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
  ]
}
collectedOn is the specimen collection / draw / specimen date for the panel (not the report print date, unless that is the only date shown). Prefer Collection Date, Drawn, Specimen, or Date of Service. Always output as YYYY-MM-DD when a date is present.
Use flag H for high, L for low, normal for in-range, critical for critical, unknown when unclear.
If no labs are found, return {"panels": []}.`;

function preprocessExtracted(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  const panels = obj.panels;
  if (!Array.isArray(panels)) return raw;

  return {
    ...obj,
    panels: panels.map((panel) => {
      if (!panel || typeof panel !== "object") return panel;
      const p = panel as Record<string, unknown>;

      // Accept camelCase or snake_case from models
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
    }),
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
    user: `Previous extraction failed schema validation: ${errorText}\n\nRepair and return valid JSON only for this lab text:\n\n${text}`,
    model,
  });

  parsed = extractedLabsSchema.safeParse(preprocessExtracted(raw));
  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(
    `Lab extraction failed validation after repair: ${formatZodError(parsed.error)}`,
  );
}
