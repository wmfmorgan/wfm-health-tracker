import Link from "next/link";
import { notFound } from "next/navigation";
import { listOllamaModels } from "@/server/ai/ollama";
import { PersonaSetupForm } from "@/components/personas/persona-setup-form";
import { Badge } from "@/components/ui/badge";
import { ensurePersonasSeeded, getPersona } from "@/server/services/personas";
import { getAiSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  ensurePersonasSeeded();
  const persona = getPersona(id);
  if (!persona) notFound();

  const settings = getAiSettings();
  const ollamaCatalog = await listOllamaModels(settings.ollamaBaseUrl);

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {persona.name}
            </h1>
            <Badge variant={persona.isEnabled ? "success" : "muted"}>
              {persona.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant={persona.isBuiltin ? "default" : "warning"}>
              {persona.isBuiltin ? "Built-in" : "Custom"}
            </Badge>
          </div>
          <Link
            href="/personas"
            className="text-sm text-zinc-600 hover:underline"
          >
            Back to personas
          </Link>
        </div>
      </div>

      <PersonaSetupForm
        persona={{
          id: persona.id,
          name: persona.name,
          specialty: persona.specialty,
          description: persona.description,
          systemPromptDefault: persona.systemPromptDefault,
          systemPromptOverride: persona.systemPromptOverride,
          preferredProvider: persona.preferredProvider,
          preferredModel: persona.preferredModel,
          isBuiltin: persona.isBuiltin,
          isEnabled: persona.isEnabled,
        }}
        defaultProvider={settings.defaultProvider}
        grokModel={settings.grokModel}
        ollamaModel={settings.ollamaModel}
        ollamaModels={ollamaCatalog.models.map((m) => m.name)}
        ollamaListError={ollamaCatalog.error}
      />
    </div>
  );
}
