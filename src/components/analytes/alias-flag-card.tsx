"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/dates";
import {
  acceptAliasFlagAction,
  rejectAliasFlagAction,
} from "@/server/actions/analytes";

export type AliasFlagExampleView = {
  rawName: string;
  value: string | null;
  unit: string | null;
  collectedOn: string | null;
  panelName: string;
  panelId: string;
};

export type AliasFlagView = {
  spelling: string;
  resultCount: number;
  targetAnalyteId: string;
  targetName: string;
  detail: string;
  reason: string;
  spellingExample: AliasFlagExampleView | null;
  targetExample: AliasFlagExampleView | null;
};

function ExampleLine({
  label,
  example,
}: {
  label: string;
  example: AliasFlagExampleView | null;
}) {
  if (!example) {
    return (
      <p className="text-xs text-zinc-400">
        <span className="font-medium text-zinc-500">{label}:</span> No sample result yet
      </p>
    );
  }
  const value =
    example.value != null && example.value !== ""
      ? `${example.value}${example.unit ? ` ${example.unit}` : ""}`
      : "—";
  return (
    <p className="text-xs text-zinc-600">
      <span className="font-medium text-zinc-700">{label}:</span>{" "}
      <span className="tabular-nums">{value}</span>
      {" · "}
      {formatDisplayDate(example.collectedOn)}
      {" · "}
      <Link
        href={`/labs/${example.panelId}`}
        className="text-zinc-800 underline-offset-2 hover:underline"
      >
        {example.panelName}
      </Link>
      {example.rawName !== label ? (
        <span className="text-zinc-400"> (as “{example.rawName}”)</span>
      ) : null}
    </p>
  );
}

export function AliasFlagCard({ flag }: { flag: AliasFlagView }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onMerge() {
    const ok = window.confirm(
      `Merge ${flag.resultCount} result${flag.resultCount === 1 ? "" : "s"} labeled “${flag.spelling}” into “${flag.targetName}”?\n\n${flag.detail}\n\nHistory and dashboard trends will combine.`,
    );
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("spelling", flag.spelling);
      fd.set("analyteId", flag.targetAnalyteId);
      const res = await acceptAliasFlagAction(fd);
      if (!res.ok) setError(res.error ?? "Merge failed");
    } finally {
      setPending(false);
    }
  }

  async function onReject() {
    const ok = window.confirm(
      `Dismiss this suggestion?\n\n“${flag.spelling}” will not be suggested as an alias of “${flag.targetName}” again.`,
    );
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("spelling", flag.spelling);
      fd.set("analyteId", flag.targetAnalyteId);
      const res = await rejectAliasFlagAction(fd);
      if (!res.ok) setError(res.error ?? "Reject failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-sky-100 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm text-zinc-900">
          <span className="font-medium">{flag.spelling}</span>
          <span className="text-zinc-400"> → </span>
          <span className="font-medium">{flag.targetName}</span>
        </p>
        <p className="text-xs text-zinc-500">
          {flag.detail}
          {" · "}
          {flag.resultCount} result{flag.resultCount === 1 ? "" : "s"} labeled “
          {flag.spelling}”
          {" · "}
          <span className="capitalize">{flag.reason.replace(/_/g, " ")}</span>
        </p>
        <div className="rounded-md border border-zinc-100 bg-zinc-50/80 px-2.5 py-2 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Examples (one of each)
          </p>
          <ExampleLine label={flag.spelling} example={flag.spellingExample} />
          <ExampleLine label={flag.targetName} example={flag.targetExample} />
        </div>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void onMerge()}>
          {pending ? "Working…" : "Merge"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => void onReject()}
        >
          Reject
        </Button>
      </div>
    </li>
  );
}
