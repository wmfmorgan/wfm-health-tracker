import Link from "next/link";
import { createDiagnosisAction } from "@/server/actions/diagnoses";
import {
  listProvidersForSelect,
  listFacilityOptions,
} from "@/server/services/providers";
import {
  FacilitySelect,
  ProviderSelect,
} from "@/components/records/provider-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function NewDiagnosisPage() {
  const providers = listProvidersForSelect();
  const facilities = listFacilityOptions();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New diagnosis</h1>
        <Link href="/diagnoses" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      {providers.length === 0 ? (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No providers yet.{" "}
          <Link href="/providers/new" className="underline">
            Add providers
          </Link>{" "}
          to fill clinician/facility dropdowns.
        </p>
      ) : null}

      <form
        action={asFormAction(createDiagnosisAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} placeholder="e.g. Ulcerative colitis" />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Status
            <Select name="status" defaultValue="active" required>
              <option value="active">active</option>
              <option value="chronic">chronic</option>
              <option value="resolved">resolved</option>
            </Select>
          </Label>

          <Label>
            Diagnosed on
            <Input name="diagnosedOn" type="date" />
          </Label>

          <Label>
            ICD code
            <Input name="icdCode" maxLength={32} placeholder="e.g. K51.9" />
          </Label>

          <Label>
            Clinician
            <ProviderSelect name="clinician" providers={providers} />
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <FacilitySelect name="facility" facilities={facilities} />
          </Label>
        </div>

        <Label>
          Notes
          <Textarea name="notes" rows={4} maxLength={10000} />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create diagnosis</Button>
          <Link href="/diagnoses">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
