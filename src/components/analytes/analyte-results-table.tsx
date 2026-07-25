"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AnalyteSummary } from "@/lib/analyte-series-types";
import { formatDisplayDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";

type Props = {
  summaries: AnalyteSummary[];
  /** Series key to expand on load */
  focusKey?: string | null;
  searchQuery?: string;
};

function flagVariant(
  flag: string | null,
): "success" | "warning" | "danger" | "muted" | "default" {
  if (!flag) return "muted";
  const f = flag.toLowerCase();
  if (f === "h" || f === "critical") return "danger";
  if (f === "l") return "warning";
  if (f === "normal") return "success";
  return "default";
}

export function AnalyteResultsTable({ summaries, focusKey, searchQuery }: Props) {
  const filtered = useMemo(() => {
    const q = searchQuery?.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.aliases.some((a) => a.toLowerCase().includes(q)) ||
        s.history.some((h) => h.rawAnalyteName.toLowerCase().includes(q)),
    );
  }, [summaries, searchQuery]);

  const [open, setOpen] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (focusKey) s.add(focusKey);
    return s;
  });

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
        {summaries.length === 0
          ? "No lab results yet — import a PDF or add a lab panel."
          : "No analytes match this search."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="w-10 px-3 py-2" />
            <th className="px-3 py-2 font-medium">Analyte</th>
            <th className="px-3 py-2 font-medium">Latest</th>
            <th className="px-3 py-2 font-medium">Flag</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {filtered.map((s) => {
            const expanded = open.has(s.key);
            return (
              <AnalyteResultRows
                key={s.key}
                summary={s}
                expanded={expanded}
                onToggle={() => toggle(s.key)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalyteResultRows({
  summary: s,
  expanded,
  onToggle,
}: {
  summary: AnalyteSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const latest = s.latest;
  const canExpand = s.pointCount > 1;
  const showHistory = canExpand && expanded;

  return (
    <>
      <tr className="hover:bg-zinc-50">
        <td className="px-3 py-2">
          {canExpand ? (
            <button
              type="button"
              onClick={onToggle}
              className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse history" : "Expand history"}
            >
              <span className="inline-block w-4 text-center">{expanded ? "▾" : "▸"}</span>
            </button>
          ) : (
            <span className="inline-block w-6" aria-hidden />
          )}
        </td>
        <td className="px-3 py-2">
          <span className="font-medium text-zinc-900">{s.displayName}</span>
          {s.aliases.length > 0 ? (
            <span className="mt-0.5 block text-xs text-zinc-500">
              also: {s.aliases.join(", ")}
            </span>
          ) : null}
          <span className="mt-0.5 block text-xs text-zinc-400">
            {s.pointCount} result{s.pointCount === 1 ? "" : "s"}
          </span>
        </td>
        <td className="px-3 py-2 tabular-nums text-zinc-800">
          {latest.value ?? "—"}
          {latest.unit ? (
            <span className="ml-1 text-xs text-zinc-500">{latest.unit}</span>
          ) : null}
        </td>
        <td className="px-3 py-2">
          {latest.flag ? (
            <Badge variant={flagVariant(latest.flag)} className="capitalize">
              {latest.flag}
            </Badge>
          ) : (
            <span className="text-zinc-400">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-zinc-600">
          {formatDisplayDate(latest.collectedOn)}
        </td>
        <td className="px-3 py-2">
          <SourceLinks
            panelId={latest.panelId}
            panelName={latest.panelName}
            documentIds={latest.documentIds}
          />
        </td>
      </tr>
      {showHistory
        ? s.history.map((h) => (
            <tr key={h.resultId} className="bg-zinc-50/80 text-xs">
              <td className="px-3 py-1.5" />
              <td className="px-3 py-1.5 text-zinc-500">
                {h.rawAnalyteName !== s.displayName ? (
                  <span className="italic">as “{h.rawAnalyteName}”</span>
                ) : (
                  <span className="text-zinc-400">history</span>
                )}
              </td>
              <td className="px-3 py-1.5 tabular-nums text-zinc-700">
                {h.value ?? "—"}
                {h.unit ? <span className="ml-1 text-zinc-500">{h.unit}</span> : null}
              </td>
              <td className="px-3 py-1.5 text-zinc-600">{h.flag ?? "—"}</td>
              <td className="px-3 py-1.5 text-zinc-600">
                {formatDisplayDate(h.collectedOn)}
              </td>
              <td className="px-3 py-1.5">
                <SourceLinks
                  panelId={h.panelId}
                  panelName={h.panelName}
                  documentIds={h.documentIds}
                  compact
                />
              </td>
            </tr>
          ))
        : null}
    </>
  );
}

function SourceLinks({
  panelId,
  panelName,
  documentIds,
  compact,
}: {
  panelId: string;
  panelName: string;
  documentIds: string[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex flex-wrap gap-x-2 gap-y-0.5" : "flex flex-col gap-0.5"}>
      <Link href={`/labs/${panelId}`} className="text-zinc-800 underline-offset-2 hover:underline">
        {compact ? "Panel" : panelName}
      </Link>
      {documentIds[0] ? (
        <a
          href={`/api/documents/${documentIds[0]}/file`}
          target="_blank"
          rel="noreferrer"
          className="text-zinc-500 underline-offset-2 hover:underline"
        >
          PDF
        </a>
      ) : null}
    </div>
  );
}
