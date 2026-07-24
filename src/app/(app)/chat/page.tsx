import { MEDICAL_DISCLAIMER } from "@/server/ai/safety";
import { buildChartContext } from "@/server/ai/context";
import { listOllamaModels } from "@/server/ai/ollama";
import { listSkills } from "@/server/ai/skills/registry";
import { ChatPanel } from "@/components/co-pilot/chat-panel";
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

type SearchParams = Promise<{ personaId?: string }>;

export default async function ChatPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

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

  const defaultPersonaId =
    params.personaId && personas.some((p) => p.id === params.personaId)
      ? params.personaId
      : undefined;

  const skills = listSkills().map((s) => ({
    name: s.name,
    description: s.description,
    argumentHint: s.argumentHint,
  }));

  return (
    <div className="text-zinc-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Chat</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Free-form chat grounded in your chart. Optional persona lens applies
          that specialty&apos;s prompt and preferred LLM.
        </p>
      </div>

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
        personas={personas.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          preferredProvider: p.preferredProvider,
          preferredModel: p.preferredModel,
        }))}
        skills={skills}
        defaultProvider={settings.defaultProvider}
        grokModel={settings.grokModel}
        ollamaModel={settings.ollamaModel}
        ollamaModels={ollamaCatalog.models.map((m) => m.name)}
        ollamaListError={ollamaCatalog.error}
        contextCharEstimate={chatContextEstimate}
        medicalDisclaimer={MEDICAL_DISCLAIMER}
        defaultPersonaId={defaultPersonaId}
      />
    </div>
  );
}
