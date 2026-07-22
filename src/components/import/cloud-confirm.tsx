import {
  confirmCloudImportAction,
  discardImportJobAction,
} from "@/server/actions/imports";
import { Button } from "@/components/ui/button";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

type Props = {
  jobId: string;
  filename: string;
  charCount: number | null;
};

export function CloudConfirm({ jobId, filename, charCount }: Props) {
  const chars =
    charCount == null ? "unknown" : charCount.toLocaleString();

  return (
    <div className="max-w-xl space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-medium text-zinc-900">Cloud confirmation required</h2>
        <p className="mt-1 text-sm text-zinc-700">
          This import uses Grok (xAI). Extracted PDF text will be sent to a third-party
          cloud API for structured lab extraction.
        </p>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            File
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-900 break-all">{filename}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Characters to send
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-zinc-900">{chars}</dd>
        </div>
      </dl>

      <p className="text-xs text-zinc-600">
        Do not send PHI you are not comfortable sharing with the cloud provider. Local
        Ollama imports skip this step.
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <form action={asFormAction(confirmCloudImportAction.bind(null, jobId))}>
          <Button type="submit">Send to Grok</Button>
        </form>
        <form action={asFormAction(discardImportJobAction.bind(null, jobId))}>
          <Button type="submit" variant="danger">
            Discard import
          </Button>
        </form>
      </div>
    </div>
  );
}
