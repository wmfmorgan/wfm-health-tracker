import Link from "next/link";
import { notFound } from "next/navigation";
import { getProcedure } from "@/server/services/procedures";
import { listDocumentsForEntity } from "@/server/services/documents";
import {
  updateProcedureAction,
  deleteProcedureAction,
} from "@/server/actions/procedures";
import { AttachmentsPanel } from "@/components/records/attachments-panel";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FacilitySelect,
  ProviderSelect,
} from "@/components/records/provider-select";
import {
  listProvidersForSelect,
  listFacilityOptions,
} from "@/server/services/providers";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const procedure = getProcedure(id);
  if (!procedure) notFound();
  const documents = listDocumentsForEntity("procedure", procedure.id);
  const providers = listProvidersForSelect();
  const facilities = listFacilityOptions();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            {procedure.name}
          </h1>
          <Link href="/procedures" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteProcedureAction.bind(null, procedure.id))}
          message={`Delete procedure “${procedure.name}”?`}
        />
      </div>

      <form
        action={asFormAction(updateProcedureAction.bind(null, procedure.id))}
        className="mb-8 max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input
            name="name"
            required
            maxLength={300}
            defaultValue={procedure.name}
          />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Performed on
            <Input
              name="performedOn"
              type="date"
              defaultValue={procedure.performedOn ?? ""}
            />
          </Label>

          <Label>
            Clinician
            <ProviderSelect
              name="clinician"
              providers={providers}
              defaultValue={procedure.clinician}
            />
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <FacilitySelect
              name="facility"
              facilities={facilities}
              defaultValue={procedure.facility}
            />
          </Label>
        </div>

        <Label>
          Outcome
          <Textarea
            name="outcome"
            rows={3}
            maxLength={20000}
            defaultValue={procedure.outcome ?? ""}
          />
        </Label>

        <Label>
          Follow-up
          <Textarea
            name="followUp"
            rows={3}
            maxLength={10000}
            defaultValue={procedure.followUp ?? ""}
          />
        </Label>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={3}
            maxLength={10000}
            defaultValue={procedure.notes ?? ""}
          />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
          <Link href="/procedures">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AttachmentsPanel
        entityType="procedure"
        entityId={procedure.id}
        initialDocuments={documents}
      />
    </div>
  );
}
