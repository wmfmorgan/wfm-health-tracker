import Link from "next/link";
import { createLabPanelAction } from "@/server/actions/labs";
import { LabResultsEditor } from "@/components/records/lab-results-editor";
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

export default function NewLabPanelPage() {
  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New lab panel</h1>
        <Link href="/labs" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      <form
        action={asFormAction(createLabPanelAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} placeholder="e.g. CBC" />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Collected on
            <Input name="collectedOn" type="date" />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue="final" required>
              <option value="final">final</option>
              <option value="pending">pending</option>
            </Select>
          </Label>

          <Label className="sm:col-span-2">
            Facility
            <Input name="facility" maxLength={200} />
          </Label>
        </div>

        <Label>
          Notes
          <Textarea name="notes" rows={3} maxLength={10000} />
        </Label>

        <LabResultsEditor />

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create lab panel</Button>
          <Link href="/labs">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
