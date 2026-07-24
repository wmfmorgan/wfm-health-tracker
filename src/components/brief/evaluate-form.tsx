"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

export type EvaluateEntityOption = {
  id: string;
  label: string;
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
  medications: EvaluateEntityOption[];
  supplements: EvaluateEntityOption[];
  labPanels: EvaluateEntityOption[];
  tests: EvaluateEntityOption[];
  procedures: EvaluateEntityOption[];
};

const PROGRESS_STEPS = [
  "Preparing chart context…",
  "Calling the model…",
  "Waiting for AI response…",
  "Validating evaluation…",
  "Saving draft view…",
] as const;

function MultiPick({
  label,
  options,
  value,
  onChange,
  disabled,
  emptyHint,
}: {
  label: string;
  options: EvaluateEntityOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyHint: string;
}) {
  return (
    <Label>
      {label}
      {options.length === 0 ? (
        <p className="mt-1 text-xs font-normal text-zinc-500">{emptyHint}</p>
      ) : (
        <>
          <select
            multiple
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(
                (o) => o.value,
              );
              onChange(selected);
            }}
            className="mt-1 min-h-[6.5rem] w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
            size={Math.min(6, Math.max(3, options.length))}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs font-normal text-zinc-500">
            Hold ⌘/Ctrl to select multiple. Leave empty to include defaults (all
            active / recent).
            {value.length > 0 ? (
              <span className="ml-1 font-medium text-zinc-700">
                {value.length} selected
              </span>
            ) : null}
          </p>
        </>
      )}
    </Label>
  );
}

export function EvaluateForm({
  personas,
  contextCharEstimates = {},
  defaultProvider,
  grokModel,
  ollamaModel,
  ollamaModels,
  ollamaListError,
  defaultPersonaId,
  medications,
  supplements,
  labPanels,
  tests,
  procedures,
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
  const [progressIndex, setProgressIndex] = useState(0);

  const [medicationIds, setMedicationIds] = useState<string[]>([]);
  const [supplementIds, setSupplementIds] = useState<string[]>([]);
  const [labPanelIds, setLabPanelIds] = useState<string[]>([]);
  const [testIds, setTestIds] = useState<string[]>([]);
  const [procedureIds, setProcedureIds] = useState<string[]>([]);

  useEffect(() => {
    if (!pending) {
      setProgressIndex(0);
      return;
    }
    setProgressIndex(0);
    const id = window.setInterval(() => {
      setProgressIndex((i) => Math.min(i + 1, PROGRESS_STEPS.length - 1));
    }, 2800);
    return () => window.clearInterval(id);
  }, [pending]);

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
          selection: {
            medicationIds: medicationIds.length ? medicationIds : undefined,
            supplementIds: supplementIds.length ? supplementIds : undefined,
            labPanelIds: labPanelIds.length ? labPanelIds : undefined,
            testIds: testIds.length ? testIds : undefined,
            procedureIds: procedureIds.length ? procedureIds : undefined,
          },
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

  if (pending) {
    const personaName =
      personas.find((p) => p.id === personaId)?.name ?? "persona";
    const step = PROGRESS_STEPS[progressIndex] ?? PROGRESS_STEPS[0];
    return (
      <div
        className="max-w-xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex items-start gap-4">
          <div
            className="mt-0.5 h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-medium text-zinc-900">
              Evaluating…
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Running{" "}
              <span className="font-medium text-zinc-800">{personaName}</span>{" "}
              via{" "}
              <span className="font-medium text-zinc-800">
                {provider === "grok" ? "Grok" : "Ollama"}
              </span>{" "}
              <span className="font-mono text-xs text-zinc-500">({model})</span>
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-800">{step}</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-700"
                style={{
                  width: `${((progressIndex + 1) / PROGRESS_STEPS.length) * 100}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              This can take a while for local models or large chart context. Keep
              this tab open.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
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

      <fieldset className="space-y-3 rounded-md border border-zinc-200 p-3">
        <legend className="px-1 text-sm font-medium text-zinc-800">
          Chart records to include
        </legend>
        <p className="text-xs text-zinc-500">
          Optionally narrow which records are sent to the model. Empty lists use
          defaults (active meds/supplements, recent labs/tests/procedures).
          Profile, allergies, diagnoses, accepted views, and My plan are always
          included.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <MultiPick
            label="Medications"
            options={medications}
            value={medicationIds}
            onChange={setMedicationIds}
            emptyHint="No medications recorded."
          />
          <MultiPick
            label="Supplements"
            options={supplements}
            value={supplementIds}
            onChange={setSupplementIds}
            emptyHint="No supplements recorded."
          />
          <MultiPick
            label="Lab panels"
            options={labPanels}
            value={labPanelIds}
            onChange={setLabPanelIds}
            emptyHint="No lab panels recorded."
          />
          <MultiPick
            label="Tests"
            options={tests}
            value={testIds}
            onChange={setTestIds}
            emptyHint="No tests recorded."
          />
          <MultiPick
            label="Procedures"
            options={procedures}
            value={procedureIds}
            onChange={setProcedureIds}
            emptyHint="No procedures recorded."
          />
        </div>
      </fieldset>

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
              Estimated payload (defaults):{" "}
              <span className="font-medium tabular-nums">
                {estimateChars.toLocaleString()}
              </span>{" "}
              characters.
            </>
          ) : null}
        </p>
      ) : (
        <div className="space-y-1 text-xs text-zinc-500">
          <p>Ollama runs locally. Evaluation starts immediately after submit.</p>
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
          Evaluate
        </Button>
      </div>
    </form>
  );
}
