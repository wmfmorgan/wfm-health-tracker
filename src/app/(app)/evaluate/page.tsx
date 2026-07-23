import Link from "next/link";
import { MEDICAL_DISCLAIMER } from "@/server/ai/safety";
import { estimateEvaluateContextChars } from "@/server/ai/skills/evaluate";
import { listOllamaModels } from "@/server/ai/ollama";
import { EvaluateForm } from "@/components/brief/evaluate-form";
import { ensurePersonasSeeded, listPersonas } from "@/server/services/personas";
import { getAiSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ personaId?: string }>;

export default async function EvaluatePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  ensurePersonasSeeded();
  const personas = listPersonas({ enabledOnly: true });
  const settings = getAiSettings();
  const ollamaCatalog = await listOllamaModels(settings.ollamaBaseUrl);

  const contextCharEstimates: Record<string, number> = {};
  for (const p of personas) {
    try {
      contextCharEstimates[p.id] = estimateEvaluateContextChars(p.id);
    } catch {
      contextCharEstimates[p.id] = 0;
    }
  }

  const defaultPersonaId =
    params.personaId && personas.some((p) => p.id === params.personaId)
      ? params.personaId
      : undefined;

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Evaluate</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Run a persona lens over the chart. Output is a draft view you can
            edit, accept, or reject on the chart brief.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/personas"
            className="text-zinc-600 underline-offset-2 hover:underline"
          >
            Manage personas
          </Link>
          <Link
            href="/brief"
            className="text-zinc-600 underline-offset-2 hover:underline"
          >
            Chart brief
          </Link>
        </div>
      </div>

      <EvaluateForm
        personas={personas.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          preferredProvider: p.preferredProvider,
          preferredModel: p.preferredModel,
        }))}
        contextCharEstimates={contextCharEstimates}
        defaultProvider={settings.defaultProvider}
        grokModel={settings.grokModel}
        ollamaModel={settings.ollamaModel}
        ollamaModels={ollamaCatalog.models.map((m) => m.name)}
        ollamaListError={ollamaCatalog.error}
        defaultPersonaId={defaultPersonaId}
      />

      <p className="mt-8 text-xs text-zinc-500">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
