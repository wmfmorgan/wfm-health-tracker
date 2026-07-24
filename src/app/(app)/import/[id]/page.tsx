import Link from "next/link";
import { notFound } from "next/navigation";
import { getImportJob } from "@/server/services/imports";
import { listAllDocuments } from "@/server/services/documents";
import { listAnalytes } from "@/server/services/analytes";
import { listFacilityOptions } from "@/server/services/providers";
import {
  acceptAllPendingAction,
  discardImportJobAction,
  retryImportAction,
} from "@/server/actions/imports";
import { AutoRefresh } from "@/components/import/auto-refresh";
import { DraftPanelCard } from "@/components/import/draft-panel-card";
import { ImportProgress } from "@/components/import/import-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" | "default" {
  switch (status) {
    case "completed":
      return "success";
    case "ready":
      return "default";
    case "failed":
      return "danger";
    case "discarded":
      return "muted";
    case "pending":
    case "extracting":
      return "warning";
    default:
      return "default";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export default async function ImportJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = getImportJob(id);
  if (!job) notFound();

  const docs = listAllDocuments();
  const doc = docs.find((d) => d.id === job.documentId);
  const filename = doc?.originalFilename ?? "PDF";

  const analytes = listAnalytes().map((a) => ({
    name: a.name,
    defaultUnit: a.defaultUnit,
  }));
  const facilities = listFacilityOptions();

  const pendingCount = job.drafts.filter((d) => d.reviewStatus === "pending").length;
  const acceptedCount = job.drafts.filter((d) => d.reviewStatus === "accepted").length;
  const rejectedCount = job.drafts.filter((d) => d.reviewStatus === "rejected").length;

  const showReview =
    job.status === "ready" ||
    job.status === "completed" ||
    job.status === "discarded";

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight break-all">
              {filename}
            </h1>
            <Badge variant={statusVariant(job.status)} className="capitalize">
              {formatStatus(job.status)}
            </Badge>
          </div>
          <p className="text-sm text-zinc-600">
            <span className="capitalize">{job.provider}</span>
            <span className="text-zinc-400"> · </span>
            <span className="font-mono text-xs">{job.model}</span>
            <span className="text-zinc-400"> · </span>
            <span className="tabular-nums">
              {new Date(job.createdAt).toLocaleString()}
            </span>
          </p>
          <Link href="/import" className="mt-1 inline-block text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/documents/${job.documentId}/file`}
            target="_blank"
            rel="noreferrer"
          >
            <Button type="button" variant="secondary" size="sm">
              Open PDF
            </Button>
          </a>
          {job.status !== "discarded" && job.status !== "completed" ? (
            <form action={asFormAction(discardImportJobAction.bind(null, job.id))}>
              <Button type="submit" variant="danger" size="sm">
                Discard job
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {job.status === "pending" ||
      job.status === "extracting" ||
      job.status === "awaiting_cloud_confirm" ? (
        <div>
          <AutoRefresh intervalMs={2000} />
          <ImportProgress
            provider={job.provider}
            model={job.model}
            filename={filename}
            active
            detail={
              job.extractedCharCount != null
                ? `${job.extractedCharCount.toLocaleString()} characters extracted from PDF`
                : null
            }
          />
        </div>
      ) : null}

      {job.status === "failed" ? (
        <div className="max-w-xl space-y-3 rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-medium text-red-900">Import failed</h2>
            <p className="mt-1 text-sm text-red-800 whitespace-pre-wrap">
              {job.errorMessage || "Unknown error"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={asFormAction(retryImportAction.bind(null, job.id))}>
              <Button type="submit">Retry</Button>
            </form>
            <form action={asFormAction(discardImportJobAction.bind(null, job.id))}>
              <Button type="submit" variant="danger">
                Discard
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      {showReview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Draft panels</h2>
              <p className="text-xs text-zinc-500">
                {job.drafts.length} panel{job.drafts.length === 1 ? "" : "s"}
                {showReview ? (
                  <>
                    {" · "}
                    <span className="tabular-nums">{pendingCount}</span> pending
                    {" · "}
                    <span className="tabular-nums">{acceptedCount}</span> accepted
                    {" · "}
                    <span className="tabular-nums">{rejectedCount}</span> rejected
                  </>
                ) : null}
              </p>
            </div>
            {job.status === "ready" && pendingCount > 0 ? (
              <form action={asFormAction(acceptAllPendingAction.bind(null, job.id))}>
                <Button type="submit" size="sm">
                  Accept all pending
                </Button>
              </form>
            ) : null}
          </div>

          {job.drafts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
              No draft panels were extracted from this PDF.
            </div>
          ) : (
            <div className="space-y-3">
              {job.drafts.map((draft) => (
                <DraftPanelCard
                  key={draft.id}
                  draft={draft}
                  analytes={analytes}
                  facilities={facilities}
                />
              ))}
            </div>
          )}

          {job.status === "completed" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Import complete. Accepted panels are linked to this PDF in Labs and Documents.
            </div>
          ) : null}

          {job.status === "discarded" ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              This import was discarded. No pending drafts were committed.
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-xs text-zinc-500">
        Assistive only — not medical advice.
      </p>
    </div>
  );
}
