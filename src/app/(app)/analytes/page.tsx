import Link from "next/link";
import { listAnalytes } from "@/server/services/analytes";
import {
  createAnalyteAction,
  deleteAnalyteAction,
} from "@/server/actions/analytes";
import { EntityTable } from "@/components/records/entity-table";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function AnalytesPage() {
  const rows = listAnalytes();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lab analytes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Master list for consistent lab result names over time. Also seeded from
            existing lab results.
          </p>
        </div>
        <Link href="/labs" className="text-sm text-zinc-600 hover:underline">
          Back to labs
        </Link>
      </div>

      <form
        action={asFormAction(createAnalyteAction)}
        className="mb-8 max-w-2xl space-y-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-medium text-zinc-800">Add analyte</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Label>
            Name
            <Input name="name" required maxLength={200} placeholder="e.g. Hemoglobin" />
          </Label>
          <Label>
            Default unit
            <Input name="defaultUnit" maxLength={50} placeholder="e.g. g/dL" />
          </Label>
          <Label className="sm:col-span-2">
            Notes
            <Input name="notes" maxLength={5000} />
          </Label>
        </div>
        <Button type="submit">Add to list</Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          No analytes yet. Add some here, or enter labs with “Add new analyte” and they
          will appear on this list.
        </p>
      ) : (
        <EntityTable headers={["Name", "Default unit", "Notes", ""]}>
          {rows.map((a) => (
            <tr key={a.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 font-medium">{a.name}</td>
              <td className="px-3 py-2 text-zinc-600">{a.defaultUnit ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-600 max-w-xs truncate">
                {a.notes ?? "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <ConfirmDeleteButton
                  action={asFormAction(deleteAnalyteAction.bind(null, a.id))}
                  message={`Remove analyte “${a.name}” from the master list? Existing lab rows keep the name.`}
                  label="Remove"
                />
              </td>
            </tr>
          ))}
        </EntityTable>
      )}
    </div>
  );
}
