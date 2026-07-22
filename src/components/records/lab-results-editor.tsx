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

export type AnalyteOption = {
  name: string;
  defaultUnit: string | null;
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
const NEW_ANALYTE = "__new__";

type Props = {
  initialResults?: LabResultRow[];
  analytes?: AnalyteOption[];
};

export function LabResultsEditor({ initialResults, analytes = [] }: Props) {
  const [rows, setRows] = useState<LabResultRow[]>(() =>
    initialResults && initialResults.length > 0
      ? initialResults.map((r) => ({ ...r }))
      : [EMPTY_ROW()],
  );
  /** Per-row: using free-text for a new analyte */
  const [newMode, setNewMode] = useState<boolean[]>(() =>
    (initialResults && initialResults.length > 0
      ? initialResults
      : [EMPTY_ROW()]
    ).map((r) => {
      if (!r.analyteName) return false;
      return !analytes.some(
        (a) => a.name.toLowerCase() === r.analyteName.toLowerCase(),
      );
    }),
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

  function setRowNewMode(index: number, isNew: boolean) {
    setNewMode((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push(false);
      next[index] = isNew;
      return next;
    });
  }

  function onAnalyteSelect(index: number, value: string) {
    if (value === NEW_ANALYTE) {
      setRowNewMode(index, true);
      updateRow(index, { analyteName: "" });
      return;
    }
    setRowNewMode(index, false);
    const match = analytes.find((a) => a.name === value);
    const row = rows[index];
    updateRow(index, {
      analyteName: value,
      unit: row?.unit?.trim() ? row.unit : (match?.defaultUnit ?? ""),
    });
  }

  function addRow() {
    setRows((prev) => [...prev, EMPTY_ROW()]);
    setNewMode((prev) => [...prev, false]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length <= 1) return [EMPTY_ROW()];
      return prev.filter((_, i) => i !== index);
    });
    setNewMode((prev) => {
      if (prev.length <= 1) return [false];
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
        {rows.map((row, index) => {
          const isNew = newMode[index] ?? false;
          const selectValue = isNew
            ? NEW_ANALYTE
            : analytes.some((a) => a.name === row.analyteName)
              ? row.analyteName
              : row.analyteName
                ? row.analyteName
                : "";

          return (
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
                  <Select
                    value={
                      isNew
                        ? NEW_ANALYTE
                        : selectValue &&
                            !analytes.some((a) => a.name === selectValue)
                          ? ""
                          : selectValue
                    }
                    onChange={(e) => onAnalyteSelect(index, e.target.value)}
                  >
                    <option value="">— Select analyte —</option>
                    {row.analyteName &&
                    !isNew &&
                    !analytes.some((a) => a.name === row.analyteName) ? (
                      <option value={row.analyteName}>
                        {row.analyteName} (not in list)
                      </option>
                    ) : null}
                    {analytes.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                        {a.defaultUnit ? ` (${a.defaultUnit})` : ""}
                      </option>
                    ))}
                    <option value={NEW_ANALYTE}>+ Add new analyte…</option>
                  </Select>
                </Label>

                {isNew ||
                (row.analyteName &&
                  !analytes.some((a) => a.name === row.analyteName) &&
                  !isNew) ? (
                  <Label className="sm:col-span-2">
                    {isNew ? "New analyte name" : "Analyte name"}
                    <Input
                      value={row.analyteName}
                      onChange={(e) =>
                        updateRow(index, { analyteName: e.target.value })
                      }
                      maxLength={200}
                      placeholder="e.g. CRP"
                      required
                    />
                  </Label>
                ) : null}

                {/* Keep selected name for non-new rows without free text */}
                {!isNew && row.analyteName ? (
                  <input type="hidden" value={row.analyteName} readOnly aria-hidden />
                ) : null}

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
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          Add row
        </Button>
      </div>
    </div>
  );
}
