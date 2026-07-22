import Link from "next/link";
import { getAiSettings } from "@/server/services/settings";
import { ImportNewForm } from "@/components/import/import-new-form";

export const dynamic = "force-dynamic";

export default function NewImportPage() {
  const settings = getAiSettings();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New import</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Upload a digital lab PDF. AI proposes draft panels for your review.
          </p>
        </div>
        <Link href="/import" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      <ImportNewForm
        defaultProvider={settings.defaultProvider}
        grokModel={settings.grokModel}
        ollamaModel={settings.ollamaModel}
      />

      <p className="mt-6 text-xs text-zinc-500">
        Assistive only — not medical advice.
      </p>
    </div>
  );
}
