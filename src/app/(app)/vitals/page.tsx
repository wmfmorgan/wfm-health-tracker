import Link from "next/link";
import { formatDisplayDate } from "@/lib/dates";
import { getMetricDef, SUMMARY_METRIC_KEYS } from "@/lib/metrics/catalog";
import {
  formatReadingDisplay,
  getLatestSummary,
  listReadings,
  listSessionsWithReadingCounts,
} from "@/server/services/metrics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import {
  deleteReadingAction,
  deleteSessionAction,
} from "@/server/actions/metrics";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function VitalsPage() {
  const summary = getLatestSummary();
  const sessions = listSessionsWithReadingCounts(20);
  const adHoc = listReadings({ adHocOnly: true, limit: 30 });

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vitals & metrics</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            Track blood pressure, height, weight, glucose, and body-composition
            scans over time. Current height/weight stay in sync with Profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vitals/sessions/new">
            <Button type="button">Log body composition</Button>
          </Link>
          <Link href="/vitals/bp">
            <Button type="button" variant="secondary">
              Add BP
            </Button>
          </Link>
          <Link href="/vitals/glucose">
            <Button type="button" variant="secondary">
              Add glucose
            </Button>
          </Link>
          <Link href="/vitals/new">
            <Button type="button" variant="secondary">
              Add reading
            </Button>
          </Link>
        </div>
      </div>

      {/* Latest summary */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Latest</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summary.bmiFormatted ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                BMI
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {summary.bmiFormatted}
              </p>
              <p className="mt-1 text-xs text-zinc-500">From latest height + weight</p>
            </div>
          ) : null}
          {SUMMARY_METRIC_KEYS.map((key) => {
            const row = summary.latestByType[key];
            if (!row) return null;
            const def = getMetricDef(key);
            return (
              <div
                key={key}
                className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {def?.shortLabel ?? def?.label ?? key}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatReadingDisplay(row)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDisplayDate(row.measuredAt)}
                  {row.category ? ` · ${row.category}` : ""}
                </p>
              </div>
            );
          })}
          {!summary.bmiFormatted &&
          SUMMARY_METRIC_KEYS.every((k) => !summary.latestByType[k]) ? (
            <p className="col-span-full text-sm text-zinc-500">
              No vitals yet. Log a body-composition scan or add BP / weight.
            </p>
          ) : null}
        </div>
      </section>

      {/* Sessions */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Body composition sessions</h2>
          <Link
            href="/vitals/sessions/new"
            className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
          >
            New session
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
            No scans yet. Enter values from an InBody-style report in one form.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <Link
                    href={`/vitals/sessions/${s.id}`}
                    className="min-w-0 flex-1 hover:bg-zinc-50"
                  >
                    <p className="text-sm font-medium text-zinc-900">
                      {formatDisplayDate(s.measuredAt)}
                      {s.deviceLabel ? (
                        <span className="ml-2 font-normal text-zinc-500">
                          {s.deviceLabel}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {s.readingCount} metric{s.readingCount === 1 ? "" : "s"}
                      {s.source === "device_report" ? " · device report" : " · manual"}
                    </p>
                  </Link>
                  <ConfirmDeleteButton
                    action={asFormAction(deleteSessionAction.bind(null, s.id))}
                    label="Delete"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ad-hoc readings */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Individual readings</h2>
        </div>
        {adHoc.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
            BP, glucose, height, and other one-off readings appear here.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {adHoc.map((r) => {
              const def = getMetricDef(r.metricType);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {def?.label ?? r.metricType}{" "}
                      <span className="tabular-nums font-semibold text-zinc-900">
                        {formatReadingDisplay(r)}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDisplayDate(r.measuredAt)}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.metricType === "blood_pressure" ? (
                      <Badge variant="muted">BP</Badge>
                    ) : null}
                    <ConfirmDeleteButton
                      action={asFormAction(deleteReadingAction.bind(null, r.id))}
                      label="Delete"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
