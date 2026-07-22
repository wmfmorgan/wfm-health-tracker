import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiagnosis } from "@/server/services/diagnoses";
import { listDocumentsForEntity } from "@/server/services/documents";
import {
  updateDiagnosisAction,
  deleteDiagnosisAction,
} from "@/server/actions/diagnoses";
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
  if (status === "active") return "warning";
  if (status === "chronic") return "default";
  if (status === "resolved") return "muted";
  return "default";
}

export default async function DiagnosisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const diagnosis = getDiagnosis(id);
  if (!diagnosis) notFound();
  const documents = listDocumentsForEntity("diagnosis", diagnosis.id);

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{diagnosis.name}</h1>
            <Badge variant={statusVariant(diagnosis.status)} className="capitalize">
              {diagnosis.status}
            </Badge>
          </div>
          <Link href="/diagnoses" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteDiagnosisAction.bind(null, diagnosis.id))}
          message={`Delete diagnosis “${diagnosis.name}”?`}
        />
      </div>

      <form
        action={asFormAction(updateDiagnosisAction.bind(null, diagnosis.id))}
        className="mb-8 max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input
            name="name"
            required
            maxLength={300}
            defaultValue={diagnosis.name}
          />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Status
            <Select name="status" defaultValue={diagnosis.status} required>
              <option value="active">active</option>
              <option value="chronic">chronic</option>
              <option value="resolved">resolved</option>
            </Select>
          </Label>

          <Label>
            Diagnosed on
            <Input
              name="diagnosedOn"
              type="date"
              defaultValue={diagnosis.diagnosedOn ?? ""}
            />
          </Label>

          <Label>
            ICD code
            <Input
              name="icdCode"
              maxLength={32}
              defaultValue={diagnosis.icdCode ?? ""}
            />
          </Label>

          <Label>
            Clinician
            <Input
              name="clinician"
              maxLength={200}
              defaultValue={diagnosis.clinician ?? ""}
            />
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <Input
              name="facility"
              maxLength={200}
              defaultValue={diagnosis.facility ?? ""}
            />
          </Label>
        </div>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={4}
            maxLength={10000}
            defaultValue={diagnosis.notes ?? ""}
          />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
          <Link href="/diagnoses">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AttachmentsPanel
        entityType="diagnosis"
        entityId={diagnosis.id}
        initialDocuments={documents}
      />
    </div>
  );
}
