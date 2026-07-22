import Link from "next/link";
import { listImportJobs } from "@/server/services/imports";
import { EntityTable } from "@/components/records/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

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
    case "awaiting_cloud_confirm":
      return "warning";
    default:
      return "default";
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

export default async function ImportListPage() {
  const rows = listImportJobs();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
          <p className="mt-1 text-sm text-zinc-600">
            AI-assisted lab PDF extraction. Review drafts before they become records.
          </p>
        </div>
        <Link href="/import/new">
          <Button type="button">New import</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          No import jobs yet.{" "}
          <Link href="/import/new" className="font-medium text-zinc-800 hover:underline">
            Upload a lab PDF
          </Link>{" "}
          to extract draft panels.
        </div>
      ) : (
        <EntityTable headers={["File", "Status", "Provider", "Created", ""]}>
          {rows.map((job) => (
            <tr key={job.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link href={`/import/${job.id}`} className="hover:underline">
                  {job.filename ?? "Untitled PDF"}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Badge variant={statusVariant(job.status)} className="capitalize">
                  {formatStatus(job.status)}
                </Badge>
              </td>
              <td className="px-3 py-2 text-zinc-600">
                <span className="capitalize">{job.provider}</span>
                <span className="text-zinc-400"> · </span>
                <span className="font-mono text-xs">{job.model}</span>
              </td>
              <td className="px-3 py-2 tabular-nums text-zinc-600">
                {new Date(job.createdAt).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/import/${job.id}`}
                  className="text-xs font-medium text-zinc-700 hover:underline"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </EntityTable>
      )}
    </div>
  );
}
