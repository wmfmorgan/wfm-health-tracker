import Link from "next/link";
import { MEDICAL_DISCLAIMER } from "@/server/ai/safety";
import { buildChartContext } from "@/server/ai/context";
import { estimateEvaluateContextChars } from "@/server/ai/skills/evaluate";
import { listOllamaModels } from "@/server/ai/ollama";
import { ChatPanel } from "@/components/co-pilot/chat-panel";
import { EvaluatePanel } from "@/components/co-pilot/evaluate-panel";
import { getThread, listThreads } from "@/server/services/chat";
import { ensurePersonasSeeded, listPersonas } from "@/server/services/personas";
import { getAiSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

const FULL_SCOPE = {
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
} as const;

type SearchParams = Promise<{ tab?: string; personaId?: string }>;

export default async function CoPilotPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab = params.tab === "evaluate" ? "evaluate" : "chat";

  ensurePersonasSeeded();
  const personas = listPersonas({ enabledOnly: true });
  const settings = getAiSettings();
  const ollamaCatalog = await listOllamaModels(settings.ollamaBaseUrl);

  const threadRows = listThreads();
  const messagesByThreadId: Record<
    string,
    NonNullable<ReturnType<typeof getThread>>["messages"]
  > = {};
  for (const t of threadRows) {
    const full = getThread(t.id);
    messagesByThreadId[t.id] = full?.messages ?? [];
  }

  let chatContextEstimate = 0;
  try {
    chatContextEstimate = buildChartContext({ scope: { ...FULL_SCOPE } }).charCount;
  } catch {
    chatContextEstimate = 0;
  }

  const contextCharEstimates: Record<string, number> = {};
  for (const p of personas) {
    try {
      contextCharEstimates[p.id] = estimateEvaluateContextChars(p.id);
    } catch {
      contextCharEstimates[p.id] = 0;
    }
  }

  const personaOptions = personas.map((p) => ({
    id: p.id,
    name: p.name,
    specialty: p.specialty,
  }));

  const defaultPersonaId =
    params.personaId && personas.some((p) => p.id === params.personaId)
      ? params.personaId
      : undefined;

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-zinc-900 text-white"
        : "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-300"
    }`;

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Co-pilot</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Free-form chat grounded in your chart, or evaluate as a clinical
            persona into a reviewable brief draft.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Co-pilot mode">
          <Link
            href="/co-pilot?tab=chat"
            className={tabClass(tab === "chat")}
            aria-current={tab === "chat" ? "page" : undefined}
          >
            Chat
          </Link>
          <Link
            href={
              defaultPersonaId
                ? `/co-pilot?tab=evaluate&personaId=${encodeURIComponent(defaultPersonaId)}`
                : "/co-pilot?tab=evaluate"
            }
            className={tabClass(tab === "evaluate")}
            aria-current={tab === "evaluate" ? "page" : undefined}
          >
            Evaluate
          </Link>
        </nav>
      </div>

      {tab === "chat" ? (
        <ChatPanel
          threads={threadRows.map((t) => ({
            id: t.id,
            title: t.title,
            personaId: t.personaId,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
          }))}
          messagesByThreadId={Object.fromEntries(
            Object.entries(messagesByThreadId).map(([id, msgs]) => [
              id,
              msgs.map((m) => ({
                id: m.id,
                threadId: m.threadId,
                role: m.role,
                content: m.content,
                provider: m.provider,
                model: m.model,
                createdAt: m.createdAt,
              })),
            ]),
          )}
          personas={personaOptions}
          defaultProvider={settings.defaultProvider}
          grokModel={settings.grokModel}
          ollamaModel={settings.ollamaModel}
          ollamaModels={ollamaCatalog.models.map((m) => m.name)}
          ollamaListError={ollamaCatalog.error}
          contextCharEstimate={chatContextEstimate}
          medicalDisclaimer={MEDICAL_DISCLAIMER}
        />
      ) : (
        <>
          <EvaluatePanel
            personas={personaOptions}
            contextCharEstimates={contextCharEstimates}
            defaultProvider={settings.defaultProvider}
            grokModel={settings.grokModel}
            ollamaModel={settings.ollamaModel}
            ollamaModels={ollamaCatalog.models.map((m) => m.name)}
            ollamaListError={ollamaCatalog.error}
            defaultPersonaId={defaultPersonaId}
          />
          <p className="mt-8 text-xs text-zinc-500">{MEDICAL_DISCLAIMER}</p>
        </>
      )}
    </div>
  );
}
