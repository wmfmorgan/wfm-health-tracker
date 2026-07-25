"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAnalyteAliasAction } from "@/server/actions/analytes";

type Props = {
  analyteId: string;
  analyteName: string;
};

export function AddAliasForm({ analyteId, analyteName }: Props) {
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const spelling = alias.trim();
    if (!spelling) return;

    const ok = window.confirm(
      `Treat “${spelling}” as “${analyteName}” for history and trends?\n\nThis merges matching lab results into one series.`,
    );
    if (!ok) return;

    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("alias", spelling);
      const res = await addAnalyteAliasAction(analyteId, fd);
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      setAlias("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-wrap items-end gap-2">
      <label className="min-w-[10rem] flex-1 text-xs text-zinc-600">
        Add alias
        <Input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="e.g. GLU"
          maxLength={200}
          disabled={pending}
          className="mt-0.5"
        />
      </label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || !alias.trim()}>
        {pending ? "Saving…" : "Confirm alias"}
      </Button>
      {error ? <p className="w-full text-xs text-red-700">{error}</p> : null}
    </form>
  );
}
