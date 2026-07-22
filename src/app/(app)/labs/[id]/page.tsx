import Link from "next/link";
import { notFound } from "next/navigation";
import { getLabPanel } from "@/server/services/labs";
import {
  updateLabPanelAction,
  deleteLabPanelAction,
} from "@/server/actions/labs";
import { LabResultsEditor } from "@/components/records/lab-results-editor";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function statusVariant(status: string): "success" | "warning" | "muted" | "default" {
  if (status === "final") return "success";
  if (status === "pending") return "warning";
  return "default";
}

export default async function LabPanelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const panel = getLabPanel(id);
  if (!panel) notFound();

  const initialResults = panel.results.map((r) => ({
    analyteName: r.analyteName,
    value: r.value ?? "",
    unit: r.unit ?? "",
    refLow: r.refLow ?? "",
    refHigh: r.refHigh ?? "",
    flag: r.flag ?? "",
    notes: r.notes ?? "",
  }));

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{panel.name}</h1>
            <Badge variant={statusVariant(panel.status)} className="capitalize">
              {panel.status}
            </Badge>
          </div>
          <Link href="/labs" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteLabPanelAction.bind(null, panel.id))}
          message={`Delete lab panel “${panel.name}”?`}
        />
      </div>

      <form
        action={asFormAction(updateLabPanelAction.bind(null, panel.id))}
        className="mb-8 max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} defaultValue={panel.name} />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Collected on
            <Input
              name="collectedOn"
              type="date"
              defaultValue={panel.collectedOn ?? ""}
            />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue={panel.status} required>
              <option value="final">final</option>
              <option value="pending">pending</option>
            </Select>
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <Input
              name="facility"
              maxLength={200}
              defaultValue={panel.facility ?? ""}
            />
          </Label>
        </div>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={3}
            maxLength={10000}
            defaultValue={panel.notes ?? ""}
          />
        </Label>

        <LabResultsEditor initialResults={initialResults} />

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
          <Link href="/labs">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <section className="max-w-2xl rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-5">
        <h2 className="mb-1 text-sm font-medium text-zinc-700">Attachments</h2>
        <p className="text-sm text-zinc-500">
          Document attachments will be available in a later update.
        </p>
      </section>
    </div>
  );
}
