import Link from "next/link";
import { createProviderAction } from "@/server/actions/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function NewProviderPage() {
  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New provider</h1>
        <Link href="/providers" className="text-sm text-zinc-600 hover:underline">
          Back to list
        </Link>
      </div>

      <form
        action={asFormAction(createProviderAction)}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input
            name="name"
            required
            maxLength={300}
            placeholder="e.g. Dr. Smith or GI Associates"
          />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Specialty
            <Input name="specialty" maxLength={200} placeholder="e.g. Gastroenterology" />
          </Label>

          <Label>
            Organization / facility
            <Input
              name="organization"
              maxLength={300}
              placeholder="e.g. City Medical Center"
            />
          </Label>

          <Label>
            Phone
            <Input name="phone" maxLength={50} />
          </Label>

          <Label>
            Email
            <Input name="email" type="email" maxLength={200} />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue="active" required>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </Select>
          </Label>
        </div>

        <Label>
          Notes
          <Textarea name="notes" rows={3} maxLength={10000} />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Create provider</Button>
          <Link href="/providers">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
