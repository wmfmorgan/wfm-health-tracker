import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinicalTest } from "@/server/services/clinical-tests";
import { listDocumentsForEntity } from "@/server/services/documents";
import {
  updateClinicalTestAction,
  deleteClinicalTestAction,
} from "@/server/actions/clinical-tests";
import { AttachmentsPanel } from "@/components/records/attachments-panel";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FacilitySelect } from "@/components/records/provider-select";
import { listFacilityOptions } from "@/server/services/providers";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function typeVariant(type: string): "success" | "warning" | "muted" | "default" {
  if (type === "imaging") return "default";
  if (type === "pathology") return "warning";
  return "muted";
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = getClinicalTest(id);
  if (!test) notFound();
  const documents = listDocumentsForEntity("test", test.id);
  const facilities = listFacilityOptions();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{test.name}</h1>
            <Badge variant={typeVariant(test.type)} className="capitalize">
              {test.type}
            </Badge>
          </div>
          <Link href="/tests" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteClinicalTestAction.bind(null, test.id))}
          message={`Delete test “${test.name}”?`}
        />
      </div>

      <form
        action={asFormAction(updateClinicalTestAction.bind(null, test.id))}
        className="mb-8 max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} defaultValue={test.name} />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Type
            <Select name="type" defaultValue={test.type} required>
              <option value="imaging">imaging</option>
              <option value="pathology">pathology</option>
              <option value="other">other</option>
            </Select>
          </Label>

          <Label>
            Performed on
            <Input
              name="performedOn"
              type="date"
              defaultValue={test.performedOn ?? ""}
            />
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <FacilitySelect
              name="facility"
              facilities={facilities}
              defaultValue={test.facility}
            />
          </Label>
        </div>

        <Label>
          Summary
          <Textarea
            name="summary"
            rows={3}
            maxLength={20000}
            defaultValue={test.summary ?? ""}
          />
        </Label>

        <Label>
          Key findings
          <Textarea
            name="keyFindings"
            rows={4}
            maxLength={20000}
            defaultValue={test.keyFindings ?? ""}
          />
        </Label>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={3}
            maxLength={10000}
            defaultValue={test.notes ?? ""}
          />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
          <Link href="/tests">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      <AttachmentsPanel
        entityType="test"
        entityId={test.id}
        initialDocuments={documents}
      />
    </div>
  );
}
