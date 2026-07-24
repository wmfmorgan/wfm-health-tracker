"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { resolvePersonaLlm } from "@/lib/persona-llm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type EvaluatePersonaOption = {
  id: string;
  name: string;
  specialty: string | null;
  preferredProvider?: string | null;
  preferredModel?: string | null;
};

type Props = {
  personas: EvaluatePersonaOption[];
  /** Optional precomputed context size (display only). */
  contextCharEstimates?: Record<string, number>;
  defaultProvider: "grok" | "ollama";
  grokModel: string;
  ollamaModel: string;
  ollamaModels: string[];
  ollamaListError: string | null;
  defaultPersonaId?: string;
};

export function EvaluateForm({
  personas,
  contextCharEstimates = {},
  defaultProvider,
  grokModel,
  ollamaModel,
  ollamaModels,
  ollamaListError,
  defaultPersonaId,
}: Props) {
  const router = useRouter();
  const aiSettings = useMemo(
    () => ({ defaultProvider, grokModel, ollamaModel }),
    [defaultProvider, grokModel, ollamaModel],
  );

  const initialPersona =
    personas.find((p) => p.id === defaultPersonaId)?.id ?? personas[0]?.id ?? "";
  const initialResolved = resolvePersonaLlm(
    personas.find((p) => p.id === initialPersona) ?? null,
    aiSettings,
  );

  const [personaId, setPersonaId] = useState(initialPersona);
  const [focusNote, setFocusNote] = useState("");
  const [provider, setProvider] = useState<"grok" | "ollama">(
    initialResolved.provider,
  );
  /** User manually overrode provider/model — stop auto-applying persona LLM. */
  const [llmOverride, setLlmOverride] = useState(false);
  const initialOllama =
    ollamaModels.includes(ollamaModel) || ollamaModels.length === 0
      ? ollamaModel
      : ollamaModels[0]!;
  const [model, setModel] = useState(initialResolved.model);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const suggestedModel = useMemo(
    () => (provider === "grok" ? grokModel : ollamaModel),
    [provider, grokModel, ollamaModel],
  );

  const ollamaOptions = useMemo(() => {
    const names = [...ollamaModels];
    if (ollamaModel && !names.includes(ollamaModel)) names.unshift(ollamaModel);
    if (model && !names.includes(model)) names.unshift(model);
    return names;
  }, [ollamaModels, ollamaModel, model]);

  const estimateChars =
    personaId && contextCharEstimates[personaId] != null
      ? contextCharEstimates[personaId]!
      : null;

  function applyPersonaLlm(nextPersonaId: string) {
    if (llmOverride) return;
    const persona = personas.find((p) => p.id === nextPersonaId) ?? null;
    const resolved = resolvePersonaLlm(persona, aiSettings);
    setProvider(resolved.provider);
    setModel(resolved.model);
  }

  function onPersonaChange(next: string) {
    setPersonaId(next);
    applyPersonaLlm(next);
  }

  function onProviderChange(next: "grok" | "ollama") {
    setLlmOverride(true);
    setProvider(next);
    if (next === "grok") setModel(grokModel);
    else setModel(initialOllama);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!personaId) {
      setError("Select a persona");
      return;
    }
    setError(null);
    setPending(true);

    try {
      const res = await fetch("/api/co-pilot/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          focusNote: focusNote.trim() || undefined,
          provider,
          model,
          replaceExistingDraft: true,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        viewId?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.viewId) {
        setError(data.error || `Evaluate failed (${res.status})`);
        setPending(false);
        return;
      }

      router.push(`/brief/views/${data.viewId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluate failed");
      setPending(false);
    }
  }

  if (personas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
        No enabled personas available for evaluation.{" "}
        <a href="/personas" className="font-medium text-zinc-800 underline">
          Manage personas
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <Label>
        Persona
        <Select
          value={personaId}
          onChange={(e) => onPersonaChange(e.target.value)}
          required
          disabled={pending}
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.specialty ? ` · ${p.specialty}` : ""}
            </option>
          ))}
        </Select>
      </Label>

      <Label>
        Focus note (optional)
        <Textarea
          value={focusNote}
          onChange={(e) => setFocusNote(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="e.g. Focus on recent labs and iron panel…"
          disabled={pending}
        />
      </Label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          Provider
          <Select
            value={provider}
            onChange={(e) =>
              onProviderChange(e.target.value as "grok" | "ollama")
            }
            required
            disabled={pending}
          >
            <option value="ollama">Ollama (local)</option>
            <option value="grok">Grok (cloud)</option>
          </Select>
        </Label>

        <Label>
          Model
          {provider === "ollama" && ollamaOptions.length > 0 ? (
            <Select
              value={model}
              onChange={(e) => {
                setLlmOverride(true);
                setModel(e.target.value);
              }}
              disabled={pending}
              required
            >
              {ollamaOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={model}
              onChange={(e) => {
                setLlmOverride(true);
                setModel(e.target.value);
              }}
              placeholder={suggestedModel}
              maxLength={100}
              disabled={pending}
              required
            />
          )}
        </Label>
      </div>

      {provider === "grok" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Grok sends chart context to xAI (cloud).
          {estimateChars != null ? (
            <>
              {" "}
              Estimated payload:{" "}
              <span className="font-medium tabular-nums">
                {estimateChars.toLocaleString()}
              </span>{" "}
              characters.
            </>
          ) : null}
        </p>
      ) : (
        <div className="space-y-1 text-xs text-zinc-500">
          <p>Ollama runs locally. Evaluation starts immediately.</p>
          {ollamaOptions.length === 0 ? (
            <p className="text-amber-800">
              {ollamaListError ??
                "No local Ollama models found. Pull a model and refresh, or type a model name."}
            </p>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={pending || !personaId}>
          {pending ? "Evaluating…" : "Evaluate as…"}
        </Button>
      </div>
    </form>
  );
}
