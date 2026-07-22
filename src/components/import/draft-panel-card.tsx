import Link from "next/link";
import type { DraftPanelWithResults } from "@/server/services/imports";
import {
  acceptDraftPanelAction,
  rejectDraftPanelAction,
  updateDraftPanelAction,
} from "@/server/actions/imports";
import {
  LabResultsEditor,
  type AnalyteOption,
  type LabResultRow,
} from "@/components/records/lab-results-editor";
import { FacilitySelect } from "@/components/records/provider-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function reviewVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" | "default" {
  if (status === "accepted") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "muted";
}

type Props = {
  draft: DraftPanelWithResults;
  analytes: AnalyteOption[];
  facilities: string[];
};

export function DraftPanelCard({ draft, analytes, facilities }: Props) {
  if (draft.reviewStatus === "accepted") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-medium text-zinc-900">{draft.name}</h3>
              <Badge variant={reviewVariant(draft.reviewStatus)} className="capitalize">
                accepted
              </Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {draft.collectedOn ?? "No date"}
              {draft.facility ? ` · ${draft.facility}` : ""}
              {" · "}
              {draft.results.length} result{draft.results.length === 1 ? "" : "s"}
            </p>
          </div>
          {draft.committedEntityId ? (
            <Link href={`/labs/${draft.committedEntityId}`}>
              <Button type="button" size="sm" variant="secondary">
                Open lab panel
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  if (draft.reviewStatus === "rejected") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium text-zinc-700">{draft.name}</h3>
          <Badge variant={reviewVariant(draft.reviewStatus)} className="capitalize">
            rejected
          </Badge>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {draft.collectedOn ?? "No date"}
          {draft.facility ? ` · ${draft.facility}` : ""}
          {" · "}
          {draft.results.length} result{draft.results.length === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  const initialResults: LabResultRow[] = draft.results.map((r) => ({
    analyteName: r.analyteName,
    value: r.value ?? "",
    unit: r.unit ?? "",
    refLow: r.refLow ?? "",
    refHigh: r.refHigh ?? "",
    flag: r.flag ?? "",
    notes: r.notes ?? "",
  }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium text-zinc-900">{draft.name}</h3>
          <Badge variant="warning" className="capitalize">
            pending review
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={asFormAction(acceptDraftPanelAction.bind(null, draft.id))}>
            <Button type="submit" size="sm">
              Accept
            </Button>
          </form>
          <form action={asFormAction(rejectDraftPanelAction.bind(null, draft.id))}>
            <Button type="submit" size="sm" variant="danger">
              Reject
            </Button>
          </form>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto rounded-md border border-zinc-100">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-2 py-1.5 font-medium">Analyte</th>
              <th className="px-2 py-1.5 font-medium">Value</th>
              <th className="px-2 py-1.5 font-medium">Unit</th>
              <th className="px-2 py-1.5 font-medium">Ref</th>
              <th className="px-2 py-1.5 font-medium">Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {draft.results.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-2 text-zinc-400">
                  No results extracted
                </td>
              </tr>
            ) : (
              draft.results.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-1.5 font-medium text-zinc-800">
                    {r.analyteName}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-zinc-700">
                    {r.value ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-600">{r.unit ?? "—"}</td>
                  <td className="px-2 py-1.5 tabular-nums text-zinc-600">
                    {r.refLow || r.refHigh
                      ? `${r.refLow ?? "—"} – ${r.refHigh ?? "—"}`
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-zinc-600">{r.flag ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700 hover:text-zinc-900">
          Edit draft before accept
        </summary>
        <form
          action={asFormAction(updateDraftPanelAction.bind(null, draft.id))}
          className="mt-3 space-y-3 border-t border-zinc-100 pt-3"
        >
          <Label>
            Name
            <Input name="name" required maxLength={300} defaultValue={draft.name} />
          </Label>

          <div className="grid gap-3 sm:grid-cols-2">
            <Label>
              Collected on
              <Input
                name="collectedOn"
                type="date"
                defaultValue={draft.collectedOn ?? ""}
              />
            </Label>
            <Label>
              Status
              <Select name="status" defaultValue={draft.status || "final"} required>
                <option value="final">final</option>
                <option value="pending">pending</option>
              </Select>
            </Label>
            <Label className="sm:col-span-2">
              Facility
              <FacilitySelect
                name="facility"
                facilities={facilities}
                defaultValue={draft.facility}
              />
            </Label>
          </div>

          <Label>
            Notes
            <Textarea
              name="notes"
              rows={2}
              maxLength={10000}
              defaultValue={draft.notes ?? ""}
            />
          </Label>

          <LabResultsEditor initialResults={initialResults} analytes={analytes} />

          <Button type="submit" variant="secondary" size="sm">
            Save edits
          </Button>
        </form>
      </details>
    </div>
  );
}
