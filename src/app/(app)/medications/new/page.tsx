import Link from "next/link";
import { createMedicationAction } from "@/server/actions/medications";
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

export default function NewMedicationPage() {
  const providers = listProvidersForSelect();
  const diagnoses = listDiagnosesForSelect();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New medication</h1>
        <Link href="/medications" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      {diagnoses.length === 0 ? (
        <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          No diagnoses yet.{" "}
          <Link href="/diagnoses/new" className="underline">
            Add a diagnosis
          </Link>{" "}
          so purpose can be selected from the list.
        </p>
      ) : null}

      <form
        action={asFormAction(createMedicationAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} placeholder="e.g. Mesalamine" />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Dose
            <Input name="dose" maxLength={100} placeholder="e.g. 1.2g" />
          </Label>

          <Label>
            Form
            <Input name="form" maxLength={100} placeholder="e.g. tablet" />
          </Label>

          <Label>
            Route
            <Input name="route" maxLength={100} placeholder="e.g. oral" />
          </Label>

          <Label>
            Frequency
            <Input name="frequency" maxLength={200} placeholder="e.g. twice daily" />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue="active" required>
              <option value="active">active</option>
              <option value="stopped">stopped</option>
            </Select>
          </Label>

          <label className="flex items-center gap-2 pt-6 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              name="prn"
              value="true"
              className="h-4 w-4 rounded border-zinc-300"
            />
            PRN (as needed)
          </label>

          <Label>
            Start on
            <Input name="startOn" type="date" />
          </Label>

          <Label>
            End on
            <Input name="endOn" type="date" />
          </Label>

          <Label>
            Purpose (diagnosis)
            <DiagnosisSelect name="purpose" diagnoses={diagnoses} />
          </Label>

          <Label>
            Prescriber
            <ProviderSelect name="prescriber" providers={providers} />
          </Label>
        </div>

        <Label>
          Notes
          <Textarea name="notes" rows={4} maxLength={10000} />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create medication</Button>
          <Link href="/medications">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
