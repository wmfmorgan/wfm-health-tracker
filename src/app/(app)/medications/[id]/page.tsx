import Link from "next/link";
import { notFound } from "next/navigation";
import { getMedication } from "@/server/services/medications";
import { listDocumentsForEntity } from "@/server/services/documents";
import {
  updateMedicationAction,
  deleteMedicationAction,
} from "@/server/actions/medications";
import { AttachmentsPanel } from "@/components/records/attachments-panel";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProviderSelect } from "@/components/records/provider-select";
import { DiagnosisSelect } from "@/components/records/diagnosis-select";
import { listProvidersForSelect } from "@/server/services/providers";
import { listDiagnosesForSelect } from "@/server/services/diagnoses";

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

export default async function MedicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medication = getMedication(id);
  if (!medication) notFound();
  const documents = listDocumentsForEntity("medication", medication.id);
  const providers = listProvidersForSelect();
  const diagnoses = listDiagnosesForSelect();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{medication.name}</h1>
            <Badge variant={statusVariant(medication.status)} className="capitalize">
              {medication.status}
            </Badge>
            {medication.prn ? (
              <Badge variant="warning">PRN</Badge>
            ) : null}
          </div>
          <Link href="/medications" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteMedicationAction.bind(null, medication.id))}
          message={`Delete medication “${medication.name}”?`}
        />
      </div>

      <form
        action={asFormAction(updateMedicationAction.bind(null, medication.id))}
        className="mb-8 max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} defaultValue={medication.name} />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Dose
            <Input name="dose" maxLength={100} defaultValue={medication.dose ?? ""} />
          </Label>

          <Label>
            Form
            <Input name="form" maxLength={100} defaultValue={medication.form ?? ""} />
          </Label>

          <Label>
            Route
            <Input name="route" maxLength={100} defaultValue={medication.route ?? ""} />
          </Label>

          <Label>
            Frequency
            <Input
              name="frequency"
              maxLength={200}
              defaultValue={medication.frequency ?? ""}
            />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue={medication.status} required>
              <option value="active">active</option>
              <option value="stopped">stopped</option>
            </Select>
          </Label>

          <label className="flex items-center gap-2 pt-6 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              name="prn"
              value="true"
              defaultChecked={medication.prn}
              className="h-4 w-4 rounded border-zinc-300"
            />
            PRN (as needed)
          </label>

          <Label>
            Start on
            <Input name="startOn" type="date" defaultValue={medication.startOn ?? ""} />
          </Label>

          <Label>
            End on
            <Input name="endOn" type="date" defaultValue={medication.endOn ?? ""} />
          </Label>

          <Label>
            Purpose (diagnosis)
            <DiagnosisSelect
              name="purpose"
              diagnoses={diagnoses}
              defaultValue={medication.purpose}
            />
          </Label>

          <Label>
            Prescriber
            <ProviderSelect
              name="prescriber"
              providers={providers}
              defaultValue={medication.prescriber}
            />
          </Label>
        </div>

        <Label>
          How it helps
          <Textarea
            name="howItHelps"
            rows={2}
            maxLength={2000}
            placeholder="e.g. Reduces colon inflammation; maintenance therapy for UC"
            defaultValue={medication.howItHelps ?? ""}
          />
        </Label>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={4}
            maxLength={10000}
            defaultValue={medication.notes ?? ""}
          />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
          <Link href="/medications">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AttachmentsPanel
        entityType="medication"
        entityId={medication.id}
        initialDocuments={documents}
      />
    </div>
  );
}
