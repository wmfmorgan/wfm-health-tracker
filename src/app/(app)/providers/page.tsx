import Link from "next/link";
import { listProviders } from "@/server/services/providers";
import { EntityTable } from "@/components/records/entity-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status || "active";
  const q = sp.q?.trim() || undefined;
  const rows = listProviders({
    status: status === "all" ? undefined : status,
    q,
  });

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Care team and facilities used in clinical form dropdowns.
          </p>
        </div>
        <Link href="/providers/new">
          <Button type="button">Add provider</Button>
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
        <label className="text-sm text-zinc-700">
          Search
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Name, specialty, organization…"
            className="mt-1 w-64"
          />
        </label>
        <input type="hidden" name="status" value={status} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(
          [
            ["active", "Active"],
            ["inactive", "Inactive"],
            ["all", "All"],
          ] as const
        ).map(([value, label]) => {
          const href =
            value === "active"
              ? q
                ? `/providers?q=${encodeURIComponent(q)}`
                : "/providers"
              : q
                ? `/providers?status=${value}&q=${encodeURIComponent(q)}`
                : `/providers?status=${value}`;
          const active = status === value;
          return (
            <Link
              key={value}
              href={href}
              className={`rounded-md px-2.5 py-1 ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No providers yet.{" "}
          <Link href="/providers/new" className="underline">
            Add your first provider
          </Link>{" "}
          so clinician and facility dropdowns can use the list.
        </p>
      ) : (
        <EntityTable
          headers={["Name", "Specialty", "Organization", "Status", ""]}
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">
                <Link
                  href={`/providers/${p.id}`}
                  className="text-zinc-900 hover:underline"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-600">{p.specialty ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-600">
                {p.organization ?? "—"}
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant={p.status === "active" ? "success" : "muted"}
                  className="capitalize"
                >
                  {p.status}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/providers/${p.id}`}
                  className="text-sm text-zinc-600 hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </EntityTable>
      )}
    </div>
  );
}
