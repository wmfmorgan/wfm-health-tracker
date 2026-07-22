"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Props = {
  defaultProvider: "grok" | "ollama";
  grokModel: string;
  ollamaModel: string;
  ollamaModels: string[];
  ollamaListError: string | null;
};

export function ImportNewForm({
  defaultProvider,
  grokModel,
  ollamaModel,
  ollamaModels,
  ollamaListError,
}: Props) {
  const router = useRouter();
  const [provider, setProvider] = useState<"grok" | "ollama">(defaultProvider);
  const [modelTouched, setModelTouched] = useState(false);
  const initialOllama =
    ollamaModels.includes(ollamaModel) || ollamaModels.length === 0
      ? ollamaModel
      : ollamaModels[0]!;
  const [model, setModel] = useState(
    defaultProvider === "grok" ? grokModel : initialOllama,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const suggestedModel = useMemo(
    () => (provider === "grok" ? grokModel : ollamaModel),
    [provider, grokModel, ollamaModel],
  );

  const ollamaOptions = useMemo(() => {
    const names = [...ollamaModels];
    if (ollamaModel && !names.includes(ollamaModel)) names.unshift(ollamaModel);
    return names;
  }, [ollamaModels, ollamaModel]);

  function onProviderChange(next: "grok" | "ollama") {
    setProvider(next);
    if (!modelTouched) {
      if (next === "grok") setModel(grokModel);
      else setModel(initialOllama);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        jobId?: string;
        error?: string;
      };

      if (!res.ok || !data.jobId) {
        setError(data.error || `Upload failed (${res.status})`);
        setPending(false);
        return;
      }

      router.push(`/import/${data.jobId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <Label>
        PDF file
        <Input
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={pending}
        />
      </Label>
      <p className="text-xs text-zinc-500">
        Digital PDFs with a text layer only. Scanned image PDFs are not supported.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          Provider
          <Select
            name="provider"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as "grok" | "ollama")}
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
              name="model"
              value={model}
              onChange={(e) => {
                setModelTouched(true);
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
              name="model"
              value={model}
              onChange={(e) => {
                setModelTouched(true);
                setModel(e.target.value);
              }}
              placeholder={suggestedModel}
              maxLength={100}
              disabled={pending}
            />
          )}
        </Label>
      </div>

      {provider === "grok" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Grok sends extracted PDF text to xAI. You will confirm before any cloud call.
        </p>
      ) : (
        <div className="space-y-1 text-xs text-zinc-500">
          <p>Ollama runs locally. Extraction starts immediately after upload.</p>
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
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Start import"}
        </Button>
        <Link href="/import">
          <Button type="button" variant="secondary" disabled={pending}>
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
