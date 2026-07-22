import Link from "next/link";
import { listMedications } from "@/server/services/medications";
import { EntityTable } from "@/components/records/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "stopped"] as const;

function statusVariant(status: string): "success" | "warning" | "muted" | "default" {
  if (status === "active") return "success";
  if (status === "stopped") return "muted";
  return "default";
}

export default async function MedicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  // Default list filter: active; allow all (status omitted) or stopped
  const statusParam = params.status;
  const status =
    statusParam === "all"
      ? undefined
      : statusParam && STATUSES.includes(statusParam as (typeof STATUSES)[number])
        ? statusParam
        : "active";
  const q = params.q?.trim() || undefined;
  const rows = listMedications({ status, q });

  function hrefFor(next?: { status?: string; q?: string }) {
    const sp = new URLSearchParams();
    const s = next && "status" in next ? next.status : statusParam ?? "active";
    const query = next && "q" in next ? next.q : q;
    if (s && s !== "all") sp.set("status", s);
    if (s === "all") sp.set("status", "all");
    if (query) sp.set("q", query);
    const qs = sp.toString();
    return qs ? `/medications?${qs}` : "/medications";
  }

  const activeFilter = statusParam === "all" ? "all" : status ?? "active";

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Medications</h1>
        <Link href="/medications/new">
          <Button type="button">Add medication</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={hrefFor({ status: "all", q })}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            activeFilter === "all"
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          All
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={hrefFor({ status: s, q })}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              activeFilter === s
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {statusParam === "all" ? (
          <input type="hidden" name="status" value="all" />
        ) : status ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, dose, purpose, notes…"
          className="min-w-[16rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No medications recorded.</p>
      ) : (
        <EntityTable headers={["Name", "Dose", "Frequency", "Status", "PRN", ""]}>
          {rows.map((m) => (
            <tr key={m.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link href={`/medications/${m.id}`} className="hover:underline">
                  {m.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-600">{m.dose ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-600">{m.frequency ?? "—"}</td>
              <td className="px-3 py-2">
                <Badge variant={statusVariant(m.status)} className="capitalize">
                  {m.status}
                </Badge>
              </td>
              <td className="px-3 py-2 text-zinc-600">{m.prn ? "Yes" : "—"}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/medications/${m.id}`}
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
