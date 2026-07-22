import Link from "next/link";
import { createClinicalTestAction } from "@/server/actions/clinical-tests";
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

export default function NewTestPage() {
  const facilities = listFacilityOptions();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New test</h1>
        <Link href="/tests" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      <form
        action={asFormAction(createClinicalTestAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input
            name="name"
            required
            maxLength={300}
            placeholder="e.g. Colonoscopy with biopsy"
          />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Type
            <Select name="type" defaultValue="imaging" required>
              <option value="imaging">imaging</option>
              <option value="pathology">pathology</option>
              <option value="other">other</option>
            </Select>
          </Label>

          <Label>
            Performed on
            <Input name="performedOn" type="date" />
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <FacilitySelect name="facility" facilities={facilities} />
          </Label>
        </div>

        <Label>
          Summary
          <Textarea name="summary" rows={3} maxLength={20000} />
        </Label>

        <Label>
          Key findings
          <Textarea name="keyFindings" rows={4} maxLength={20000} />
        </Label>

        <Label>
          Notes
          <Textarea name="notes" rows={3} maxLength={10000} />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create test</Button>
          <Link href="/tests">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
