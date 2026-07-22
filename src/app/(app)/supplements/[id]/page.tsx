import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplement } from "@/server/services/supplements";
import { listDocumentsForEntity } from "@/server/services/documents";
import {
  updateSupplementAction,
  deleteSupplementAction,
} from "@/server/actions/supplements";
import { AttachmentsPanel } from "@/components/records/attachments-panel";
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
  if (status === "active") return "success";
  if (status === "stopped") return "muted";
  return "default";
}

export default async function SupplementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplement = getSupplement(id);
  if (!supplement) notFound();
  const documents = listDocumentsForEntity("supplement", supplement.id);

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{supplement.name}</h1>
            <Badge variant={statusVariant(supplement.status)} className="capitalize">
              {supplement.status}
            </Badge>
            {supplement.prn ? (
              <Badge variant="warning">PRN</Badge>
            ) : null}
          </div>
          <Link href="/supplements" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteSupplementAction.bind(null, supplement.id))}
          message={`Delete supplement “${supplement.name}”?`}
        />
      </div>

      <form
        action={asFormAction(updateSupplementAction.bind(null, supplement.id))}
        className="mb-8 max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} defaultValue={supplement.name} />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Dose
            <Input name="dose" maxLength={100} defaultValue={supplement.dose ?? ""} />
          </Label>

          <Label>
            Form
            <Input name="form" maxLength={100} defaultValue={supplement.form ?? ""} />
          </Label>

          <Label>
            Route
            <Input name="route" maxLength={100} defaultValue={supplement.route ?? ""} />
          </Label>

          <Label>
            Frequency
            <Input
              name="frequency"
              maxLength={200}
              defaultValue={supplement.frequency ?? ""}
            />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue={supplement.status} required>
              <option value="active">active</option>
              <option value="stopped">stopped</option>
            </Select>
          </Label>

          <label className="flex items-center gap-2 pt-6 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              name="prn"
              value="true"
              defaultChecked={supplement.prn}
              className="h-4 w-4 rounded border-zinc-300"
            />
            PRN (as needed)
          </label>

          <Label>
            Start on
            <Input name="startOn" type="date" defaultValue={supplement.startOn ?? ""} />
          </Label>

          <Label>
            End on
            <Input name="endOn" type="date" defaultValue={supplement.endOn ?? ""} />
          </Label>

          <Label className="sm:col-span-2">
            Purpose
            <Input name="purpose" maxLength={300} defaultValue={supplement.purpose ?? ""} />
          </Label>
        </div>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={4}
            maxLength={10000}
            defaultValue={supplement.notes ?? ""}
          />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
          <Link href="/supplements">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AttachmentsPanel
        entityType="supplement"
        entityId={supplement.id}
        initialDocuments={documents}
      />
    </div>
  );
}
