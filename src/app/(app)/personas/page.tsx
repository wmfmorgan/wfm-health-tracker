import Link from "next/link";
import { formatPersonaLlmLabel } from "@/lib/persona-llm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensurePersonasSeeded, listPersonas } from "@/server/services/personas";
import { getAiSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  ensurePersonasSeeded();
  const personas = listPersonas();
  const settings = getAiSettings();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Personas</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Clinical lenses for chat and evaluation. Bind each persona to a preferred
            LLM and edit prompts here.
          </p>
        </div>
        <Link href="/personas/new">
          <Button type="button">New persona</Button>
        </Link>
      </div>

      {personas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
          No personas yet.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white shadow-sm">
          {personas.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/personas/${p.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {p.name}
                  </Link>
                  {p.specialty ? (
                    <span className="text-xs text-zinc-500">{p.specialty}</span>
                  ) : null}
                  <Badge variant={p.isEnabled ? "success" : "muted"}>
                    {p.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant={p.isBuiltin ? "default" : "warning"}>
                    {p.isBuiltin ? "Built-in" : "Custom"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  LLM:{" "}
                  <span className="font-medium text-zinc-700">
                    {formatPersonaLlmLabel(p, settings)}
                  </span>
                </p>
                {p.description ? (
                  <p className="mt-0.5 truncate text-sm text-zinc-600">
                    {p.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/personas/${p.id}`}>
                  <Button type="button" size="sm" variant="secondary">
                    Setup
                  </Button>
                </Link>
                {p.isEnabled ? (
                  <>
                    <Link href={`/chat?personaId=${encodeURIComponent(p.id)}`}>
                      <Button type="button" size="sm" variant="secondary">
                        Chat
                      </Button>
                    </Link>
                    <Link
                      href={`/brief?personaId=${encodeURIComponent(p.id)}`}
                    >
                      <Button type="button" size="sm" variant="secondary">
                        Evaluate
                      </Button>
                    </Link>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
