import Link from "next/link";
import { getProfile } from "@/server/services/profile";
import { savePreferredUnitsAction } from "@/server/actions/profile";
import { logoutAction } from "@/server/actions/auth";
import { authEnabled, getSession } from "@/server/auth/session";
import { getAiSettings, hasXaiApiKey } from "@/server/services/settings";
import { listOllamaModels } from "@/server/ai/ollama";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function SettingsPage() {
  const profile = getProfile();
  const enabled = authEnabled();
  const session = await getSession();
  const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);
  const dataDir = process.env.DATA_DIR || "./data";
  const aiSettings = getAiSettings();
  const xaiConfigured = hasXaiApiKey();
  const ollamaCatalog = await listOllamaModels(aiSettings.ollamaBaseUrl);

  return (
    <div className="text-zinc-900">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Authentication</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Status:{" "}
          <span className={`font-medium ${enabled ? "text-emerald-700" : "text-zinc-800"}`}>
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        {enabled ? (
          <p className="text-sm text-zinc-600">
            Passcode lock is on. Sign-in is required for the app and document file routes.
            To disable, clear <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">APP_PASSWORD</code>{" "}
            in <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">.env</code> and restart the server.
          </p>
        ) : (
          <div className="space-y-2 text-sm text-zinc-600">
            <p>Passcode lock is off. Anyone with access to this machine can open the app.</p>
            <p>To enable:</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Set <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">APP_PASSWORD</code> to your
                passcode in <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">.env</code>
              </li>
              <li>
                Set <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">SESSION_SECRET</code> to a
                random 32+ character string (e.g.{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">openssl rand -hex 32</code>)
              </li>
              <li>Restart the server</li>
            </ol>
          </div>
        )}
        {enabled && session.authenticated ? (
          <form action={asFormAction(logoutAction)} className="mt-4">
            <button
              type="submit"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Log out
            </button>
          </form>
        ) : null}
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Preferred units</h2>
        <form action={asFormAction(savePreferredUnitsAction)} className="grid max-w-md gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Length</span>
            <select
              name="preferredLengthUnit"
              defaultValue={profile.preferredLengthUnit ?? "cm"}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Weight</span>
            <select
              name="preferredWeightUnit"
              defaultValue={profile.preferredWeightUnit ?? "kg"}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Save units
            </button>
          </div>
        </form>
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Uploads</h2>
        <p className="text-sm text-zinc-600">
          Max PDF upload size:{" "}
          <span className="font-medium text-zinc-900">
            {formatBytes(maxUploadBytes)}
          </span>{" "}
          <span className="text-zinc-500">({maxUploadBytes.toLocaleString()} bytes)</span>
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Configured via{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">MAX_UPLOAD_BYTES</code> in{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">.env</code>.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Backup</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Download a zip of your database and uploaded PDFs. The app checkpoints SQLite first so the
          backup is consistent.
        </p>
        <Link href="/api/backup" prefetch={false}>
          <Button type="button">Download backup</Button>
        </Link>
        <p className="mt-4 text-sm text-zinc-600">
          Current data directory:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-900">
            {dataDir}
          </code>
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          You can also copy the folder manually:
        </p>
        <pre className="mt-2 overflow-x-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800">
          {`cp -R ${dataDir} ~/Backups/wfm-health-$(date +%Y%m%d)`}
        </pre>
        <p className="mt-2 text-sm text-zinc-500">
          Restore: stop the app, replace the contents of the data directory with the unzipped
          backup (or folder copy), then restart. Override the path with{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">DATA_DIR</code> if needed.
        </p>
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">AI providers</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Global defaults for PDF lab import, Chat, and Evaluate. Each persona can bind its
          own preferred provider/model under Personas. You can still override provider/model
          per import or session. Ollama models are loaded from your local instance when it is
          reachable.
        </p>
        <AiSettingsForm
          defaultProvider={aiSettings.defaultProvider}
          grokModel={aiSettings.grokModel}
          ollamaBaseUrl={aiSettings.ollamaBaseUrl}
          ollamaModel={aiSettings.ollamaModel}
          ollamaModels={ollamaCatalog.models}
          ollamaListError={ollamaCatalog.error}
          xaiConfigured={xaiConfigured}
        />
      </section>

      <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-lg font-medium">Personas</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Clinical lenses, prompts, and per-persona LLM bindings are managed on the Personas
          page. Outputs are assistive only — not medical advice.
        </p>
        <Link href="/personas">
          <Button type="button" variant="secondary">
            Open Personas
          </Button>
        </Link>
      </section>
    </div>
  );
}
