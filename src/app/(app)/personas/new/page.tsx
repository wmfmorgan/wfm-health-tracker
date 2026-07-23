import Link from "next/link";
import { listOllamaModels } from "@/server/ai/ollama";
import { createCustomPersonaAction } from "@/server/actions/personas";
import { getAiSettings } from "@/server/services/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(
  fn: (...args: never[]) => unknown,
): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function NewPersonaPage() {
  const settings = getAiSettings();
  const ollamaCatalog = await listOllamaModels(settings.ollamaBaseUrl);
  const ollamaModels = ollamaCatalog.models.map((m) => m.name);

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New persona</h1>
        <Link href="/personas" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      <form
        action={asFormAction(createCustomPersonaAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input
            name="name"
            required
            maxLength={200}
            placeholder="e.g. Sleep specialist"
          />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Specialty
            <Input
              name="specialty"
              maxLength={200}
              placeholder="e.g. Sleep medicine"
            />
          </Label>
          <Label>
            Preferred provider
            <Select name="preferredProvider" defaultValue="global">
              <option value="global">
                Global default ({settings.defaultProvider})
              </option>
              <option value="grok">Grok</option>
              <option value="ollama">Ollama</option>
            </Select>
          </Label>
        </div>

        <Label>
          Description
          <Textarea
            name="description"
            rows={2}
            maxLength={2000}
            placeholder="Short description of this clinical lens"
          />
        </Label>

        <Label>
          Preferred model
          <Input
            name="preferredModel"
            maxLength={100}
            placeholder={`Leave blank for global default (${settings.defaultProvider === "grok" ? settings.grokModel : settings.ollamaModel})`}
            list="ollama-model-options"
          />
          {ollamaModels.length > 0 ? (
            <datalist id="ollama-model-options">
              {ollamaModels.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          ) : null}
          <span className="mt-1 block text-xs text-zinc-500">
            Optional. Empty uses the global default model for the chosen provider.
            {ollamaCatalog.error
              ? ` Ollama list: ${ollamaCatalog.error}`
              : null}
          </span>
        </Label>

        <Label>
          System prompt (default)
          <Textarea
            name="systemPromptDefault"
            required
            rows={8}
            maxLength={50000}
            placeholder="You are an assistive … reviewer of a personal health chart."
            className="font-mono text-xs"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Safety rules are always appended at runtime.
          </span>
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create persona</Button>
          <Link href="/personas">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
