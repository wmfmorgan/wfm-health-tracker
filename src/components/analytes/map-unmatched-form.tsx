"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { mapUnmatchedToAnalyteAction } from "@/server/actions/analytes";

type CatalogOption = { id: string; name: string };

type Props = {
  spelling: string;
  count: number;
  catalog: CatalogOption[];
};

export function MapUnmatchedForm({ spelling, count, catalog }: Props) {
  const targets = catalog.filter(
    (c) => c.name.trim().toLowerCase() !== spelling.trim().toLowerCase(),
  );
  const [analyteId, setAnalyteId] = useState(targets[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!analyteId) return;
    const target = targets.find((c) => c.id === analyteId);
    const ok = window.confirm(
      `Merge ${count} result${count === 1 ? "" : "s"} labeled “${spelling}” into “${target?.name ?? "selected analyte"}”?\n\nHistory and dashboard trends will combine.`,
    );
    if (!ok) return;

    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("spelling", spelling);
      fd.set("analyteId", analyteId);
      const res = await mapUnmatchedToAnalyteAction(fd);
      if (!res.ok) setError(res.error ?? "Failed");
    } finally {
      setPending(false);
    }
  }

  if (targets.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Add another catalog name to merge this spelling into.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-wrap items-center gap-2">
      <Select
        value={analyteId}
        onChange={(e) => setAnalyteId(e.target.value)}
        disabled={pending}
        className="min-w-[10rem] text-sm"
      >
        {targets.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" disabled={pending || !analyteId}>
        {pending ? "Merging…" : "Confirm merge"}
      </Button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </form>
  );
}
