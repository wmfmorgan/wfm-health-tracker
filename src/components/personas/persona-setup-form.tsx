"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  deleteCustomPersonaAction,
  resetPersonaPromptAction,
  updatePersonaAction,
} from "@/server/actions/personas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type PersonaSetupDto = {
  id: string;
  name: string;
  specialty: string | null;
  description: string | null;
  systemPromptDefault: string;
  systemPromptOverride: string | null;
  preferredProvider: string | null;
  preferredModel: string | null;
  isBuiltin: boolean;
  isEnabled: boolean;
};

type Props = {
  persona: PersonaSetupDto;
  defaultProvider: "grok" | "ollama";
  grokModel: string;
  ollamaModel: string;
  ollamaModels: string[];
  ollamaListError: string | null;
};

export function PersonaSetupForm({
  persona,
  defaultProvider,
  grokModel,
  ollamaModel,
  ollamaModels,
  ollamaListError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState(persona.name);
  const [specialty, setSpecialty] = useState(persona.specialty ?? "");
  const [description, setDescription] = useState(persona.description ?? "");
  const [enabled, setEnabled] = useState(persona.isEnabled);
  const [preferredProvider, setPreferredProvider] = useState(
    persona.preferredProvider === "grok" || persona.preferredProvider === "ollama"
      ? persona.preferredProvider
      : "global",
  );
  const [preferredModel, setPreferredModel] = useState(
    persona.preferredModel ?? "",
  );
  const [systemPromptDefault, setSystemPromptDefault] = useState(
    persona.systemPromptDefault,
  );
  const [override, setOverride] = useState(
    persona.systemPromptOverride ?? "",
  );

  const globalModelHint =
    preferredProvider === "grok"
      ? grokModel
      : preferredProvider === "ollama"
        ? ollamaModel
        : defaultProvider === "grok"
          ? grokModel
          : ollamaModel;

  const effectivePromptPreview = useMemo(() => {
    const core = (override.trim() || systemPromptDefault).trim();
    return core;
  }, [override, systemPromptDefault]);

  const ollamaOptions = useMemo(() => {
    const names = [...ollamaModels];
    if (preferredModel && !names.includes(preferredModel)) {
      names.unshift(preferredModel);
    }
    return names;
  }, [ollamaModels, preferredModel]);

  const showOllamaDropdown =
    (preferredProvider === "ollama" ||
      (preferredProvider === "global" && defaultProvider === "ollama")) &&
    ollamaOptions.length > 0;

  function run(
    fn: () => Promise<{ ok: boolean; error?: string } | void>,
    successMsg?: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fn();
        if (res && "ok" in res && !res.ok) {
          setError(res.error ?? "Something went wrong");
          return;
        }
        if (successMsg) setMessage(successMsg);
        router.refresh();
      } catch (e) {
        // redirect() from delete throws
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function saveAll() {
    const fd = new FormData();
    if (!persona.isBuiltin) {
      fd.set("name", name);
      fd.set("systemPromptDefault", systemPromptDefault);
    }
    fd.set("specialty", specialty);
    fd.set("description", description);
    fd.set("isEnabled", enabled ? "true" : "false");
    fd.set("preferredProvider", preferredProvider);
    fd.set("preferredModel", preferredModel);
    fd.set("systemPromptOverride", override);
    run(() => updatePersonaAction(persona.id, fd), "Saved");
  }

  function resetPrompt() {
    if (!confirm("Reset system prompt override to the built-in default?")) return;
    run(async () => {
      const res = await resetPersonaPromptAction(persona.id);
      if (res.ok) setOverride("");
      return res;
    }, "Reset to default");
  }

  function deletePersona() {
    if (
      !confirm(
        `Delete custom persona “${persona.name}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    run(() => deleteCustomPersonaAction(persona.id));
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            {persona.isBuiltin ? (
              <div>
                <h2 className="text-lg font-medium text-zinc-900">
                  {persona.name}
                </h2>
                <p className="text-xs text-zinc-500">Built-in persona</p>
              </div>
            ) : (
              <Label>
                Name
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  required
                  disabled={pending}
                />
              </Label>
            )}

            <Label>
              Specialty
              <Input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                maxLength={200}
                disabled={pending}
              />
            </Label>

            <Label>
              Description
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={2000}
                disabled={pending}
              />
            </Label>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
              checked={enabled}
              disabled={pending}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enabled
          </label>
        </div>

        <div className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2">
          <Label>
            Preferred provider
            <Select
              value={preferredProvider}
              onChange={(e) => setPreferredProvider(e.target.value)}
              disabled={pending}
            >
              <option value="global">
                Global default ({defaultProvider})
              </option>
              <option value="grok">Grok</option>
              <option value="ollama">Ollama</option>
            </Select>
          </Label>

          <Label>
            Preferred model
            {showOllamaDropdown ? (
              <Select
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                disabled={pending}
              >
                <option value="">
                  Global default ({globalModelHint})
                </option>
                {ollamaOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                maxLength={100}
                placeholder={`Global default (${globalModelHint})`}
                disabled={pending}
              />
            )}
            <span className="mt-1 block text-xs text-zinc-500">
              Leave empty to use the global model for the resolved provider.
              {ollamaListError && preferredProvider !== "grok"
                ? ` ${ollamaListError}`
                : null}
            </span>
          </Label>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Prompts</h2>

        <div className="space-y-2">
          <Label className="font-medium">
            Default prompt
            {persona.isBuiltin ? " (read-only)" : ""}
          </Label>
          {persona.isBuiltin ? (
            <pre className="max-h-48 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs whitespace-pre-wrap text-zinc-700">
              {systemPromptDefault}
            </pre>
          ) : (
            <Textarea
              value={systemPromptDefault}
              onChange={(e) => setSystemPromptDefault(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              disabled={pending}
              required
            />
          )}
        </div>

        <div className="space-y-2">
          <Label className="font-medium">System prompt override</Label>
          <p className="text-xs text-zinc-500">
            Leave empty to use the default prompt above. Safety rules are always
            appended at runtime.
          </p>
          <Textarea
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            rows={6}
            placeholder="Optional override"
            className="font-mono text-xs"
            disabled={pending}
          />
        </div>

        <div className="rounded-md border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Effective prompt preview
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Runtime uses:{" "}
            <span className="font-medium">
              {override.trim() ? "override" : "default"}
            </span>
            , then appends the safety wrapper. Preview of core prompt:
          </p>
          <pre className="mt-2 max-h-32 overflow-auto text-xs whitespace-pre-wrap text-zinc-700">
            {effectivePromptPreview.slice(0, 1200)}
            {effectivePromptPreview.length > 1200 ? "…" : ""}
          </pre>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={saveAll}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {persona.isBuiltin ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !override.trim()}
            onClick={resetPrompt}
          >
            Reset to default
          </Button>
        ) : (
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={deletePersona}
          >
            Delete
          </Button>
        )}
        <Link
          href={`/evaluate?personaId=${encodeURIComponent(persona.id)}`}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Evaluate as this persona
        </Link>
        <Link
          href={`/chat?personaId=${encodeURIComponent(persona.id)}`}
          className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Chat with this persona
        </Link>
      </div>
    </div>
  );
}
