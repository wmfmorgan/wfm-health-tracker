import Link from "next/link";
import { createProcedureAction } from "@/server/actions/procedures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FacilitySelect,
  ProviderSelect,
} from "@/components/records/provider-select";
import { DiagnosisSelect } from "@/components/records/diagnosis-select";
import {
  listProvidersForSelect,
  listFacilityOptions,
} from "@/server/services/providers";
import { listDiagnosesForSelect } from "@/server/services/diagnoses";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function NewProcedurePage() {
  const providers = listProvidersForSelect();
  const facilities = listFacilityOptions();
  const diagnoses = listDiagnosesForSelect();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New procedure</h1>
        <Link href="/procedures" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      <form
        action={asFormAction(createProcedureAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input
            name="name"
            required
            maxLength={300}
            placeholder="e.g. Colonoscopy"
          />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Performed on
            <Input name="performedOn" type="date" />
          </Label>

          <Label>
            Clinician
            <ProviderSelect name="clinician" providers={providers} />
          </Label>

          <Label>
            Facility
            <FacilitySelect name="facility" facilities={facilities} />
          </Label>

          <Label>
            Related diagnosis
            <DiagnosisSelect name="diagnosis" diagnoses={diagnoses} />
          </Label>
        </div>

        <Label>
          Outcome
          <Textarea name="outcome" rows={3} maxLength={20000} />
        </Label>

        <Label>
          Follow-up
          <Textarea name="followUp" rows={3} maxLength={10000} />
        </Label>

        <Label>
          Notes
          <Textarea name="notes" rows={3} maxLength={10000} />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create procedure</Button>
          <Link href="/procedures">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
