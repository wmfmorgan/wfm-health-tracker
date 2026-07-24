"use client";

import { useMemo, useState } from "react";
import { saveAiSettingsAction } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { OllamaModelInfo } from "@/server/ai/ollama";

type Props = {
  defaultProvider: "grok" | "ollama";
  grokModel: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaModels: OllamaModelInfo[];
  ollamaListError: string | null;
  xaiConfigured: boolean;
};

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function formatSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export function AiSettingsForm({
  defaultProvider,
  grokModel,
  ollamaBaseUrl,
  ollamaModel,
  ollamaModels,
  ollamaListError,
  xaiConfigured,
}: Props) {
  const [provider, setProvider] = useState(defaultProvider);
  const modelNames = useMemo(() => ollamaModels.map((m) => m.name), [ollamaModels]);
  const savedInList = modelNames.includes(ollamaModel);
  const hasModels = ollamaModels.length > 0;

  return (
    <form action={asFormAction(saveAiSettingsAction)} className="grid max-w-lg gap-4">
      <Label>
        Default provider
        <Select
          name="defaultProvider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as "grok" | "ollama")}
        >
          <option value="ollama">Ollama (local)</option>
          <option value="grok">Grok (cloud)</option>
        </Select>
      </Label>
      <Label>
        Grok model
        <Input name="grokModel" type="text" defaultValue={grokModel} placeholder="grok-4.5" required />
      </Label>
      <Label>
        Ollama base URL
        <Input
          name="ollamaBaseUrl"
          type="url"
          defaultValue={ollamaBaseUrl}
          placeholder="http://127.0.0.1:11434"
          required
        />
      </Label>

      <div className="space-y-1.5">
        <Label>
          Ollama model
          {hasModels ? (
            <Select name="ollamaModel" defaultValue={savedInList ? ollamaModel : ollamaModels[0]!.name} required>
              {!savedInList && ollamaModel ? (
                <option value={ollamaModel}>{ollamaModel} (saved — not in local list)</option>
              ) : null}
              {ollamaModels.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                  {m.size != null ? ` · ${formatSize(m.size)}` : ""}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              name="ollamaModel"
              type="text"
              defaultValue={ollamaModel}
              placeholder="qwen2.5:14b"
              required
            />
          )}
        </Label>
        {hasModels ? (
          <p className="text-xs text-zinc-500">
            Showing {ollamaModels.length} model{ollamaModels.length === 1 ? "" : "s"} from this Ollama
            instance. Pull more with{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">ollama pull &lt;name&gt;</code>, then
            refresh this page.
          </p>
        ) : (
          <p className="text-xs text-amber-800">
            {ollamaListError ??
              "No local models found. Start Ollama, pull a model, save the base URL, then refresh."}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-800">XAI_API_KEY</p>
        <p className="mt-1 text-sm text-zinc-600">
          Configured:{" "}
          <span className={`font-medium ${xaiConfigured ? "text-emerald-700" : "text-amber-700"}`}>
            {xaiConfigured ? "Yes" : "No"}
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Set <code className="rounded bg-zinc-100 px-1 py-0.5">XAI_API_KEY</code> in{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5">.env</code> (server-side only). Required for
          Grok extract.
        </p>
      </div>
      <p className="text-sm text-zinc-600">
        Grok sends PDF text and chart context to xAI when selected. Prefer Ollama to keep data local.
      </p>
      {provider === "ollama" ? (
        <p className="text-sm text-zinc-600">
          Ollama loads the model on the first extract automatically — no separate “prime” step is
          required. The first run after idle may be slower while weights load into memory.
        </p>
      ) : null}
      <div>
        <Button type="submit">Save AI settings</Button>
      </div>
    </form>
  );
}
