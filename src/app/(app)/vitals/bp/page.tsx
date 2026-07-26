import Link from "next/link";
import { createBpAction } from "@/server/actions/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function AddBpPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg text-zinc-900">
      <div className="mb-6">
        <Link
          href="/vitals"
          className="text-sm text-zinc-600 underline-offset-2 hover:underline"
        >
          ← Vitals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Add blood pressure
        </h1>
      </div>

      <form
        action={asFormAction(createBpAction)}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="systolic">Systolic</Label>
            <Input
              id="systolic"
              name="systolic"
              type="number"
              step="1"
              required
              placeholder="120"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="diastolic">Diastolic</Label>
            <Input
              id="diastolic"
              name="diastolic"
              type="number"
              step="1"
              required
              placeholder="80"
              className="mt-1"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">Unit: mmHg</p>

        <div>
          <Label htmlFor="measuredAt">Date</Label>
          <Input
            id="measuredAt"
            name="measuredAt"
            type="date"
            defaultValue={today}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} className="mt-1" />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Save BP</Button>
          <Link href="/vitals">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
