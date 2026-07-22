import Link from "next/link";
import { notFound } from "next/navigation";
import { getProvider } from "@/server/services/providers";
import {
  updateProviderAction,
  deleteProviderAction,
} from "@/server/actions/providers";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const provider = getProvider(id);
  if (!provider) notFound();

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{provider.name}</h1>
            <Badge
              variant={provider.status === "active" ? "success" : "muted"}
              className="capitalize"
            >
              {provider.status}
            </Badge>
          </div>
          <Link href="/providers" className="text-sm text-zinc-600 hover:underline">
            Back to list
          </Link>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteProviderAction.bind(null, provider.id))}
          message={`Delete provider “${provider.name}”? Existing records keep the name as plain text.`}
        />
      </div>

      <form
        action={asFormAction(updateProviderAction.bind(null, provider.id))}
        className="max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <Label>
          Name
          <Input name="name" required maxLength={300} defaultValue={provider.name} />
        </Label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            Specialty
            <Input
              name="specialty"
              maxLength={200}
              defaultValue={provider.specialty ?? ""}
            />
          </Label>

          <Label>
            Organization / facility
            <Input
              name="organization"
              maxLength={300}
              defaultValue={provider.organization ?? ""}
            />
          </Label>

          <Label>
            Phone
            <Input name="phone" maxLength={50} defaultValue={provider.phone ?? ""} />
          </Label>

          <Label>
            Email
            <Input
              name="email"
              type="email"
              maxLength={200}
              defaultValue={provider.email ?? ""}
            />
          </Label>

          <Label>
            Status
            <Select name="status" defaultValue={provider.status} required>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </Select>
          </Label>
        </div>

        <Label>
          Notes
          <Textarea
            name="notes"
            rows={3}
            maxLength={10000}
            defaultValue={provider.notes ?? ""}
          />
        </Label>

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save changes</Button>
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
