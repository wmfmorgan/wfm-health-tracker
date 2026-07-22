import Link from "next/link";
import { listProcedures } from "@/server/services/procedures";
import { EntityTable } from "@/components/records/entity-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ProceduresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const rows = listProcedures({ q });

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Procedures</h1>
        <Link href="/procedures/new">
          <Button type="button">Add procedure</Button>
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, facility, clinician, diagnosis, outcome…"
          className="min-w-[16rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No procedures recorded.</p>
      ) : (
        <EntityTable headers={["Name", "Diagnosis", "Performed", "Facility", "Clinician", ""]}>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link href={`/procedures/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-600">{row.diagnosis ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums text-zinc-600">
                {row.performedOn ?? "—"}
              </td>
              <td className="px-3 py-2 text-zinc-600">{row.facility ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-600">{row.clinician ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/procedures/${row.id}`}
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
