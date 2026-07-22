import Link from "next/link";
import { listClinicalTests } from "@/server/services/clinical-tests";
import { EntityTable } from "@/components/records/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const TYPES = ["imaging", "pathology", "other"] as const;

function typeVariant(type: string): "success" | "warning" | "muted" | "default" {
  if (type === "imaging") return "default";
  if (type === "pathology") return "warning";
  return "muted";
}

export default async function TestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const params = await searchParams;
  const type =
    params.type && TYPES.includes(params.type as (typeof TYPES)[number])
      ? params.type
      : undefined;
  const q = params.q?.trim() || undefined;
  const rows = listClinicalTests({ type, q });

  function hrefFor(next?: { type?: string; q?: string }) {
    const sp = new URLSearchParams();
    const t = next?.type ?? type;
    const query = next && "q" in next ? next.q : q;
    if (t) sp.set("type", t);
    if (query) sp.set("q", query);
    const qs = sp.toString();
    return qs ? `/tests?${qs}` : "/tests";
  }

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tests</h1>
        <Link href="/tests/new">
          <Button type="button">Add test</Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={hrefFor({ type: undefined, q })}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !type
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          All
        </Link>
        {TYPES.map((t) => (
          <Link
            key={t}
            href={hrefFor({ type: t, q })}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              type === t
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {type ? <input type="hidden" name="type" value={type} /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, facility, findings…"
          className="min-w-[16rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No tests recorded.</p>
      ) : (
        <EntityTable headers={["Name", "Type", "Performed", "Facility", ""]}>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link href={`/tests/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Badge variant={typeVariant(row.type)} className="capitalize">
                  {row.type}
                </Badge>
              </td>
              <td className="px-3 py-2 tabular-nums text-zinc-600">
                {row.performedOn ?? "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600">{row.facility ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/tests/${row.id}`}
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
