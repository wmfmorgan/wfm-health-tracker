import {
  SESSION_GROUPS,
  metricsInSessionGroup,
  type MetricDef,
} from "@/lib/metrics/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ExistingValue = {
  metricType: string;
  valuePrimary: number;
  valueSecondary: number | null;
  unit: string;
  category: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<void> | void;
  preferredLengthUnit: string;
  preferredWeightUnit: string;
  defaults?: {
    measuredAt?: string;
    source?: string;
    deviceLabel?: string | null;
    notes?: string | null;
    readings?: ExistingValue[];
  };
  submitLabel?: string;
};

function defaultUnit(
  def: MetricDef,
  preferredLength: string,
  preferredWeight: string,
  existing?: ExistingValue,
): string {
  if (existing?.unit) return existing.unit;
  if (def.usesLengthUnit) return preferredLength === "cm" ? "cm" : "in";
  if (def.usesWeightUnit) return preferredWeight === "kg" ? "kg" : "lb";
  return def.defaultUnit;
}

export function SessionForm({
  action,
  preferredLengthUnit,
  preferredWeightUnit,
  defaults,
  submitLabel = "Save session",
}: Props) {
  const byType = new Map(
    (defaults?.readings ?? []).map((r) => [r.metricType, r]),
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="measuredAt">Measured on</Label>
          <Input
            id="measuredAt"
            name="measuredAt"
            type="date"
            required
            defaultValue={defaults?.measuredAt ?? today}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="source">Source</Label>
          <select
            id="source"
            name="source"
            defaultValue={defaults?.source ?? "device_report"}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="device_report">Device report</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <Label htmlFor="deviceLabel">Device label</Label>
          <Input
            id="deviceLabel"
            name="deviceLabel"
            placeholder="e.g. InBody"
            defaultValue={defaults?.deviceLabel ?? ""}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={defaults?.notes ?? ""}
            className="mt-1"
          />
        </div>
      </section>

      <p className="text-sm text-zinc-600">
        Fill any fields from your body-composition report. Empty fields are
        skipped. At least one value is required.
      </p>

      {SESSION_GROUPS.map((group) => {
        const metrics = metricsInSessionGroup(group.id);
        if (metrics.length === 0) return null;
        return (
          <section
            key={group.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <h2 className="mb-4 text-base font-medium text-zinc-900">
              {group.label}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {metrics.map((def) => {
                const existing = byType.get(def.key);
                const unit = defaultUnit(
                  def,
                  preferredLengthUnit,
                  preferredWeightUnit,
                  existing,
                );
                return (
                  <div key={def.key} className="space-y-1">
                    <Label htmlFor={`m_${def.key}`}>{def.label}</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        id={`m_${def.key}`}
                        name={`m_${def.key}`}
                        type="number"
                        step="any"
                        defaultValue={
                          existing != null ? String(existing.valuePrimary) : ""
                        }
                        className="min-w-0 flex-1"
                        placeholder="—"
                      />
                      {def.units.length > 1 ? (
                        <select
                          name={`u_${def.key}`}
                          defaultValue={unit}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm"
                        >
                          {def.units.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input type="hidden" name={`u_${def.key}`} value={unit} />
                      )}
                      {def.units.length === 1 ? (
                        <span className="flex items-center text-sm text-zinc-500">
                          {unit}
                        </span>
                      ) : null}
                    </div>
                    <Input
                      name={`c_${def.key}`}
                      placeholder="Category (e.g. Standard)"
                      defaultValue={existing?.category ?? ""}
                      className="mt-1 text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
