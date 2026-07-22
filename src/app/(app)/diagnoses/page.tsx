import Link from "next/link";
import { listDiagnoses } from "@/server/services/diagnoses";
import { EntityTable } from "@/components/records/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "chronic", "resolved"] as const;

function statusVariant(status: string): "success" | "warning" | "muted" | "default" {
  if (status === "active") return "warning";
  if (status === "chronic") return "default";
  if (status === "resolved") return "muted";
  return "default";
}

export default async function DiagnosesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && STATUSES.includes(params.status as (typeof STATUSES)[number])
      ? params.status
      : undefined;
  const q = params.q?.trim() || undefined;
  const rows = listDiagnoses({ status, q });

  function hrefFor(next?: { status?: string; q?: string }) {
    const sp = new URLSearchParams();
    const s = next?.status ?? status;
    const query = next && "q" in next ? next.q : q;
    if (s) sp.set("status", s);
    if (query) sp.set("q", query);
    const qs = sp.toString();
    return qs ? `/diagnoses?${qs}` : "/diagnoses";
  }

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Diagnoses</h1>
        <Link href="/diagnoses/new">
          <Button type="button">Add diagnosis</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={hrefFor({ status: undefined, q })}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !status
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
              status === s
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, ICD, notes…"
          className="min-w-[16rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No diagnoses recorded.</p>
      ) : (
        <EntityTable headers={["Name", "Status", "Diagnosed", "ICD", "Clinician", ""]}>
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link href={`/diagnoses/${d.id}`} className="hover:underline">
                  {d.name}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Badge variant={statusVariant(d.status)} className="capitalize">
                  {d.status}
                </Badge>
              </td>
              <td className="px-3 py-2 tabular-nums text-zinc-600">{d.diagnosedOn ?? "—"}</td>
              <td className="px-3 py-2 font-mono text-xs text-zinc-600">{d.icdCode ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-600">{d.clinician ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/diagnoses/${d.id}`}
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
