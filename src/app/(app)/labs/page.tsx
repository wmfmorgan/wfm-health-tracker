import Link from "next/link";
import { listLabPanels } from "@/server/services/labs";
import { EntityTable } from "@/components/records/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function statusVariant(status: string): "success" | "warning" | "muted" | "default" {
  if (status === "final") return "success";
  if (status === "pending") return "warning";
  return "default";
}

export default async function LabsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const rows = listLabPanels({ q });

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Labs</h1>
        <Link href="/labs/new">
          <Button type="button">Add lab panel</Button>
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, facility, notes…"
          className="min-w-[16rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No lab panels recorded.</p>
      ) : (
        <EntityTable headers={["Name", "Collected", "Facility", "Status", ""]}>
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link href={`/labs/${p.id}`} className="hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2 tabular-nums text-zinc-600">
                {p.collectedOn ?? "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600">{p.facility ?? "—"}</td>
              <td className="px-3 py-2">
                <Badge variant={statusVariant(p.status)} className="capitalize">
                  {p.status}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/labs/${p.id}`}
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
