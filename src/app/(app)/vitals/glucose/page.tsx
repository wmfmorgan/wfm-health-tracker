import Link from "next/link";
import { createGlucoseAction } from "@/server/actions/metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function AddGlucosePage() {
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
          Add blood glucose
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Home / fingerstick or CGM spot check. Lab glucose stays on lab panels.
        </p>
      </div>

      <form
        action={asFormAction(createGlucoseAction)}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="valuePrimary">Value</Label>
            <Input
              id="valuePrimary"
              name="valuePrimary"
              type="number"
              step="any"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <select
              id="unit"
              name="unit"
              defaultValue="mg/dL"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="mg/dL">mg/dL</option>
              <option value="mmol/L">mmol/L</option>
            </select>
          </div>
        </div>

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
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            placeholder="e.g. fasting, post-meal, CGM"
            className="mt-1"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Save glucose</Button>
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
