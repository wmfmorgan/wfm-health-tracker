import {
  evaluateResultSchema,
  type EvaluateResult,
} from "@/lib/validation/brief";
import {
  buildChartContext,
  type BuiltContext,
  type ChartContextScope,
} from "@/server/ai/context";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import type { AIProvider, AIProviderId } from "@/server/ai/types";
import { getAIProvider } from "@/server/ai/router";
import { getPersona } from "@/server/services/personas";
import { createDraftView } from "@/server/services/brief";
import { getAiSettings } from "@/server/services/settings";

const EVALUATE_SCOPE: ChartContextScope = {
  profile: true,
  allergies: true,
  diagnoses: true,
  medications: true,
  supplements: true,
  labs: true,
  tests: true,
  procedures: true,
  acceptedViews: true,
  myPlan: true,
};

const SCHEMA_INSTRUCTIONS = `Return a single JSON object with this shape:
{
  "title": string (optional short title for this review),
  "bodyMd": string (required; full markdown clinical brief from this persona's lens),
  "sections": object of string keys to markdown string values (optional),
  "topics": string[] (topic tags e.g. "meds", "labs", "diet"),
  "citations": [{ "entityType": string, "entityId": string, "label": string }],
  "facts": string[] (chart-supported facts only),
  "opinions": string[] (recommendations / interpretive opinions)
}
Rules:
- bodyMd must be non-empty markdown.
- Separate FACTS from OPINIONS clearly in the arrays and in bodyMd.
- Cite chart entities when possible; do not invent labs, meds, or diagnoses.
- Peer persona views in context are opinions, not chart facts.
- If data is missing, say so rather than guessing.
Return JSON only.`;

function formatZodError(err: {
  issues: { path: PropertyKey[]; message: string }[];
}): string {
  return err.issues
    .map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

function buildUserMessage(opts: {
  focusNote?: string;
  contextText: string;
}): string {
  const parts = [
    "Evaluate the patient's chart from your specialty lens and produce a structured chart-brief view.",
  ];
  if (opts.focusNote?.trim()) {
    parts.push(`Focus note from the user:\n${opts.focusNote.trim()}`);
  }
  parts.push(`Chart context:\n${opts.contextText}`);
  parts.push(SCHEMA_INSTRUCTIONS);
  return parts.join("\n\n");
}

export type EvaluateEntitySelection = {
  medicationIds?: string[];
  supplementIds?: string[];
  labPanelIds?: string[];
  testIds?: string[];
  procedureIds?: string[];
};

function buildEvaluateScope(
  selection?: EvaluateEntitySelection,
): ChartContextScope {
  return {
    ...EVALUATE_SCOPE,
    medicationIds: selection?.medicationIds?.filter(Boolean),
    supplementIds: selection?.supplementIds?.filter(Boolean),
    labPanelIds: selection?.labPanelIds?.filter(Boolean),
    testIds: selection?.testIds?.filter(Boolean),
    procedureIds: selection?.procedureIds?.filter(Boolean),
  };
}

export function estimateEvaluateContextChars(
  personaId: string,
  selection?: EvaluateEntitySelection,
): number {
  const ctx = buildChartContext({
    scope: buildEvaluateScope(selection),
    excludePersonaId: personaId,
  });
  return ctx.charCount;
}

export async function runEvaluatePersona(opts: {
  personaId: string;
  focusNote?: string;
  provider: AIProviderId;
  model: string;
  replaceExistingDraft?: boolean;
  selection?: EvaluateEntitySelection;
  deps?: {
    provider?: AIProvider;
    buildContext?: typeof buildChartContext;
  };
}): Promise<{ viewId: string; charCount: number }> {
  const {
    personaId,
    focusNote,
    provider: providerId,
    model,
    replaceExistingDraft = true,
    selection,
  } = opts;

  const buildContext = opts.deps?.buildContext ?? buildChartContext;

  const context: BuiltContext = buildContext({
    scope: buildEvaluateScope(selection),
    excludePersonaId: personaId,
  });
  const charCount = context.charCount;

  const persona = getPersona(personaId);
  if (!persona) {
    throw new Error(`Persona not found: ${personaId}`);
  }
  if (!persona.isEnabled) {
    throw new Error(`Persona is disabled: ${personaId}`);
  }

  const settings = getAiSettings();
  const ai: AIProvider =
    opts.deps?.provider ??
    getAIProvider(providerId, settings.ollamaBaseUrl);

  const system = resolveEffectivePrompt({
    systemPromptDefault: persona.systemPromptDefault,
    systemPromptOverride: persona.systemPromptOverride,
  });

  const user = buildUserMessage({
    focusNote,
    contextText: context.text,
  });

  let raw = await ai.completeJson({ system, user, model });
  let parsed = evaluateResultSchema.safeParse(raw);

  if (!parsed.success) {
    const errorText = formatZodError(parsed.error);
    raw = await ai.completeJson({
      system,
      user: `Previous response failed schema validation: ${errorText}\n\nRepair and return valid JSON only.\n\n${user}`,
      model,
    });
    parsed = evaluateResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `Evaluate failed validation after repair: ${formatZodError(parsed.error)}`,
      );
    }
  }

  const result: EvaluateResult = parsed.data;

  const view = createDraftView({
    personaId,
    bodyMd: result.bodyMd,
    title: result.title ?? null,
    sections: result.sections,
    topics: result.topics,
    citations: result.citations,
    facts: result.facts,
    opinions: result.opinions,
    provider: providerId,
    model,
    focusNote: focusNote ?? null,
    replaceExistingDraft,
  });

  return { viewId: view.id, charCount };
}
