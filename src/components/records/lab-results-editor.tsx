"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type LabResultRow = {
  analyteName: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  flag: string;
  notes: string;
};

const EMPTY_ROW = (): LabResultRow => ({
  analyteName: "",
  value: "",
  unit: "",
  refLow: "",
  refHigh: "",
  flag: "",
  notes: "",
});

const FLAGS = ["", "normal", "H", "L", "critical", "unknown"] as const;

type Props = {
  initialResults?: LabResultRow[];
};

export function LabResultsEditor({ initialResults }: Props) {
  const [rows, setRows] = useState<LabResultRow[]>(() =>
    initialResults && initialResults.length > 0
      ? initialResults.map((r) => ({ ...r }))
      : [EMPTY_ROW()],
  );

  const resultsJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.analyteName.trim())
          .map((r) => ({
            analyteName: r.analyteName.trim(),
            value: r.value.trim() || null,
            unit: r.unit.trim() || null,
            refLow: r.refLow.trim() || null,
            refHigh: r.refHigh.trim() || null,
            flag: r.flag || null,
            notes: r.notes.trim() || null,
          })),
      ),
    [rows],
  );

  function updateRow(index: number, patch: Partial<LabResultRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, EMPTY_ROW()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length <= 1) return [EMPTY_ROW()];
      return prev.filter((_, i) => i !== index);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-800">Results</h2>
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          Add row
        </Button>
      </div>

      <input type="hidden" name="resultsJson" value={resultsJson} />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="rounded-md border border-zinc-200 bg-zinc-50 p-3 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-zinc-500">Row {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(index)}
              >
                Remove
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Label className="sm:col-span-2">
                Analyte
                <Input
                  value={row.analyteName}
                  onChange={(e) => updateRow(index, { analyteName: e.target.value })}
                  maxLength={200}
                  placeholder="e.g. WBC"
                  required={rows.length === 1 && !!row.analyteName}
                />
              </Label>

              <Label>
                Value
                <Input
                  value={row.value}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                  maxLength={100}
                />
              </Label>

              <Label>
                Unit
                <Input
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                  maxLength={50}
                  placeholder="e.g. g/dL"
                />
              </Label>

              <Label>
                Ref low
                <Input
                  value={row.refLow}
                  onChange={(e) => updateRow(index, { refLow: e.target.value })}
                  maxLength={50}
                />
              </Label>

              <Label>
                Ref high
                <Input
                  value={row.refHigh}
                  onChange={(e) => updateRow(index, { refHigh: e.target.value })}
                  maxLength={50}
                />
              </Label>

              <Label>
                Flag
                <Select
                  value={row.flag}
                  onChange={(e) => updateRow(index, { flag: e.target.value })}
                >
                  {FLAGS.map((f) => (
                    <option key={f || "none"} value={f}>
                      {f || "—"}
                    </option>
                  ))}
                </Select>
              </Label>

              <Label>
                Notes
                <Input
                  value={row.notes}
                  onChange={(e) => updateRow(index, { notes: e.target.value })}
                  maxLength={2000}
                />
              </Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
