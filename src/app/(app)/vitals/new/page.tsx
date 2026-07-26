import Link from "next/link";
import { adHocMetricOptions, getMetricDef } from "@/lib/metrics/catalog";
import { createReadingAction } from "@/server/actions/metrics";
import { getProfile } from "@/server/services/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function NewReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const sp = await searchParams;
  const profile = getProfile();
  const options = adHocMetricOptions();
  const preselected = sp.type && getMetricDef(sp.type) ? sp.type : "weight";
  const def = getMetricDef(preselected)!;
  const defaultUnit = def.usesWeightUnit
    ? profile.preferredWeightUnit === "kg"
      ? "kg"
      : "lb"
    : def.usesLengthUnit
      ? profile.preferredLengthUnit === "cm"
        ? "cm"
        : "in"
      : def.defaultUnit;
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add reading</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Single metric entry. For full body-comp reports use{" "}
          <Link href="/vitals/sessions/new" className="underline">
            Log body composition
          </Link>
          .
        </p>
      </div>

      <form
        action={asFormAction(createReadingAction)}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div>
          <Label htmlFor="metricType">Metric</Label>
          <select
            id="metricType"
            name="metricType"
            defaultValue={preselected}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            required
          >
            {options.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            For blood pressure use the dedicated BP form (systolic/diastolic).
          </p>
        </div>

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
              defaultValue={defaultUnit}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {def.units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              {/* Include all units from catalog for when user changes metric without reload */}
              {Array.from(
                new Set(options.flatMap((m) => [...m.units])),
              )
                .filter((u) => !def.units.includes(u))
                .map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
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
          <Label htmlFor="category">Category (optional)</Label>
          <Input
            id="category"
            name="category"
            placeholder="e.g. Standard, High"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" name="notes" rows={2} className="mt-1" />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Save reading</Button>
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
