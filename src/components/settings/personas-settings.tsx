"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createCustomPersonaAction,
  deleteCustomPersonaAction,
  resetPersonaPromptAction,
  updatePersonaAction,
} from "@/server/actions/personas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PersonaSettingsRow = {
  id: string;
  name: string;
  specialty: string | null;
  description: string | null;
  systemPromptDefault: string;
  systemPromptOverride: string | null;
  isBuiltin: boolean;
  isEnabled: boolean;
};

type Props = {
  personas: PersonaSettingsRow[];
};

export function PersonasSettings({ personas }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        Built-in clinical lenses ship with seed prompts. Override a prompt to tweak behavior, or
        reset built-ins to the default. Disabled personas are hidden from Co-pilot and Evaluate.
        Custom personas can be created and deleted; built-ins can only be disabled.
      </p>

      <CreateCustomPersonaForm />

      <ul className="space-y-4">
        {personas.map((p) => (
          <li
            key={`${p.id}:${p.isEnabled}:${p.name}:${p.systemPromptOverride ?? ""}`}
          >
            <PersonaCard persona={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateCustomPersonaForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("systemPromptDefault", prompt);
    startTransition(async () => {
      const res = await createCustomPersonaAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setPrompt("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/80 p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-zinc-900">Create custom persona</h3>
      <div className="grid gap-3">
        <Label>
          Name
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sleep specialist"
            required
            maxLength={200}
          />
        </Label>
        <Label>
          System prompt
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="You are an assistive … reviewer of a personal health chart."
            required
            rows={5}
            className="font-mono text-xs"
          />
        </Label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div>
          <Button type="submit" size="sm" disabled={pending || !name.trim() || !prompt.trim()}>
            {pending ? "Creating…" : "Create persona"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function PersonaCard({ persona }: { persona: PersonaSettingsRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(persona.isEnabled);
  const [name, setName] = useState(persona.name);
  const [override, setOverride] = useState(persona.systemPromptOverride ?? "");
  const [showDefault, setShowDefault] = useState(false);

  const hasOverride = Boolean(persona.systemPromptOverride?.trim());

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMsg?: string,
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong");
        return;
      }
      if (successMsg) setMessage(successMsg);
      router.refresh();
    });
  }

  function savePrompt() {
    const fd = new FormData();
    if (!persona.isBuiltin) {
      fd.set("name", name);
    }
    fd.set("systemPromptOverride", override);
    run(() => updatePersonaAction(persona.id, fd), "Saved");
  }

  function toggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    const fd = new FormData();
    fd.set("isEnabled", next ? "true" : "false");
    run(async () => {
      const res = await updatePersonaAction(persona.id, fd);
      if (!res.ok) {
        setEnabled(!next);
      }
      return res;
    });
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
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {persona.isBuiltin ? (
            <h3 className="text-base font-medium text-zinc-900">{persona.name}</h3>
          ) : (
            <Label className="max-w-md">
              Name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
            </Label>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {persona.specialty ? (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">
                {persona.specialty}
              </span>
            ) : null}
            <span
              className={`rounded px-1.5 py-0.5 font-medium ${
                persona.isBuiltin
                  ? "bg-zinc-100 text-zinc-700"
                  : "bg-violet-50 text-violet-800"
              }`}
            >
              {persona.isBuiltin ? "Built-in" : "Custom"}
            </span>
            {hasOverride ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-900">
                Override active
              </span>
            ) : null}
            {!enabled ? (
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 font-medium text-zinc-700">
                Disabled
              </span>
            ) : null}
          </div>
          {persona.description ? (
            <p className="mt-2 text-sm text-zinc-600">{persona.description}</p>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            checked={enabled}
            disabled={pending}
            onChange={toggleEnabled}
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="font-medium">System prompt override</Label>
          {persona.isBuiltin ? (
            <button
              type="button"
              className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              onClick={() => setShowDefault((v) => !v)}
            >
              {showDefault ? "Hide default" : "Show default"}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-zinc-500">
          Leave empty to use the {persona.isBuiltin ? "built-in default" : "creation prompt"}.
          Safety rules are always appended server-side.
        </p>
        {showDefault && persona.isBuiltin ? (
          <pre className="max-h-40 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs whitespace-pre-wrap text-zinc-700">
            {persona.systemPromptDefault}
          </pre>
        ) : null}
        <Textarea
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          rows={6}
          placeholder={
            persona.isBuiltin
              ? "Optional override — leave blank for default prompt"
              : "Optional override of the custom prompt"
          }
          className="font-mono text-xs"
          disabled={pending}
        />
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={savePrompt}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {persona.isBuiltin ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || !hasOverride}
            onClick={resetPrompt}
          >
            Reset to default
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={deletePersona}
          >
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}
