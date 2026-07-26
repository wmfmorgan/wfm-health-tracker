"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { MetricSummary } from "@/lib/metrics/series-types";
import { formatDisplayDate } from "@/lib/dates";
import { AnalyteSparkline } from "@/components/dashboard/analyte-sparkline";
import { MultiSelectDropdown } from "@/components/ui/multi-select";
import { savePinnedVitalsAction } from "@/server/actions/dashboard-trends";

type Props = {
  summaries: MetricSummary[];
  pinnedKeys: string[];
};

/**
 * Pick vitals/metrics to chart. Pin a card to keep it after refresh;
 * unpinned picks are session-only.
 */
export function VitalsTrendsSection({ summaries, pinnedKeys }: Props) {
  const byKey = useMemo(() => new Map(summaries.map((s) => [s.key, s])), [summaries]);
  const options = useMemo(
    () => summaries.map((s) => ({ key: s.key, label: s.displayName })),
    [summaries],
  );

  const [pins, setPins] = useState(() => new Set(pinnedKeys));
  const [sessionKeys, setSessionKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleKeys = useMemo(() => {
    const ordered: string[] = [];
    for (const k of pins) {
      if (byKey.has(k)) ordered.push(k);
    }
    for (const k of sessionKeys) {
      if (!pins.has(k) && byKey.has(k)) ordered.push(k);
    }
    return ordered;
  }, [pins, sessionKeys, byKey]);

  const visibleSummaries = visibleKeys
    .map((k) => byKey.get(k))
    .filter((s): s is MetricSummary => Boolean(s));

  function persistPins(nextPins: Set<string>) {
    setPins(nextPins);
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        for (const k of nextPins) fd.append("pinned", k);
        await savePinnedVitalsAction(fd);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save pins");
      }
    });
  }

  function onVisibleChange(ids: string[]) {
    const nextVisible = new Set(ids);
    const nextPins = new Set([...pins].filter((k) => nextVisible.has(k)));
    const nextSession = new Set(
      [...nextVisible].filter((k) => !nextPins.has(k)),
    );

    const pinsChanged =
      nextPins.size !== pins.size || [...nextPins].some((k) => !pins.has(k));
    setSessionKeys(nextSession);
    if (pinsChanged) {
      persistPins(nextPins);
    } else {
      setPins(nextPins);
    }
  }

  function pinCard(key: string) {
    const next = new Set(pins);
    next.add(key);
    setSessionKeys((prev) => {
      const s = new Set(prev);
      s.delete(key);
      return s;
    });
    persistPins(next);
  }

  function unpinCard(key: string) {
    const next = new Set(pins);
    next.delete(key);
    setSessionKeys((prev) => new Set(prev).add(key));
    persistPins(next);
  }

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Vitals trends</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pick metrics to chart. Use <span className="font-medium">Pin</span> on a
            card to keep it after refresh; unpinned picks stay only for this session.
          </p>
        </div>
        <Link href="/vitals" className="text-sm text-zinc-600 hover:text-zinc-900">
          All vitals
        </Link>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No vitals recorded yet. Log body composition, BP, weight, or other
          metrics under Vitals.
        </p>
      ) : (
        <>
          <div className="mb-4 max-w-md">
            <MultiSelectDropdown
              label="Show metrics"
              options={options.map((o) => ({ id: o.key, label: o.label }))}
              value={visibleKeys}
              onChange={onVisibleChange}
              disabled={pending}
              placeholder="Choose vitals to chart"
              emptyHint="No metrics with readings"
            />
            {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
          </div>

          {visibleSummaries.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Select metrics above. Pin a card to save it on the dashboard.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSummaries.map((s) => (
                <VitalTrendCard
                  key={s.key}
                  summary={s}
                  pinned={pins.has(s.key)}
                  pending={pending}
                  onTogglePin={() =>
                    pins.has(s.key) ? unpinCard(s.key) : pinCard(s.key)
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ThumbtackIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M16 3a1 1 0 0 1 .8 1.6L14.5 8.5l3.2.8a1 1 0 0 1 .4 1.7l-3.4 3.1.9 4.4a1 1 0 0 1-1.6.95L12 17.2l-1.95 2.25a1 1 0 0 1-1.6-.95l.9-4.4-3.4-3.1a1 1 0 0 1 .4-1.7l3.2-.8L7.2 4.6A1 1 0 0 1 8 3h8z"
        fill={pinned ? "#18181b" : "#ffffff"}
        stroke="#18181b"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VitalTrendCard({
  summary: s,
  pinned,
  pending,
  onTogglePin,
}: {
  summary: MetricSummary;
  pinned: boolean;
  pending: boolean;
  onTogglePin: () => void;
}) {
  return (
    <div
      className={`relative rounded-lg border bg-white p-3 pt-4 shadow-sm ${
        pinned ? "border-zinc-300" : "border-dashed border-zinc-200"
      }`}
    >
      <button
        type="button"
        disabled={pending}
        onClick={onTogglePin}
        className="absolute right-2 top-2 rounded p-1 hover:bg-zinc-100 disabled:opacity-50"
        aria-label={pinned ? "Unpin from dashboard" : "Pin to dashboard"}
        aria-pressed={pinned}
        title={pinned ? "Unpin" : "Pin to dashboard"}
      >
        <ThumbtackIcon pinned={pinned} />
      </button>

      <div className="flex flex-wrap items-start justify-between gap-2 pr-7">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">{s.displayName}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {s.latestDate ? formatDisplayDate(s.latestDate) : "—"}
            {s.category ? ` · ${s.category}` : ""}
            {s.pointCount > 1 ? ` · ${s.pointCount} pts` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-zinc-900">
            {s.latestDisplay}
          </p>
        </div>
      </div>
      <div className="mt-2">
        <AnalyteSparkline points={s.numericSeries} />
      </div>
      <div className="mt-2 text-xs">
        <Link
          href="/vitals"
          className="text-zinc-600 underline-offset-2 hover:underline"
        >
          Vitals history
        </Link>
      </div>
    </div>
  );
}
