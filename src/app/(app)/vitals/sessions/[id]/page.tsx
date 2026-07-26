import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDisplayDate } from "@/lib/dates";
import { getMetricDef } from "@/lib/metrics/catalog";
import { SessionForm } from "@/components/vitals/session-form";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import {
  deleteSessionAction,
  updateSessionAction,
} from "@/server/actions/metrics";
import {
  formatReadingDisplay,
  getSessionWithReadings,
} from "@/server/services/metrics";
import { getProfile } from "@/server/services/profile";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = getSessionWithReadings(id);
  if (!session) notFound();
  const profile = getProfile();

  return (
    <div className="mx-auto max-w-3xl text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/vitals"
            className="text-sm text-zinc-600 underline-offset-2 hover:underline"
          >
            ← Vitals
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {formatDisplayDate(session.measuredAt)}
            {session.deviceLabel ? ` · ${session.deviceLabel}` : ""}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {session.source === "device_report" ? "Device report" : "Manual"} ·{" "}
            {session.readings.length} metrics
          </p>
        </div>
        <ConfirmDeleteButton
          action={asFormAction(deleteSessionAction.bind(null, id))}
          label="Delete session"
        />
      </div>

      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-medium">Readings</h2>
        <ul className="divide-y divide-zinc-100">
          {session.readings.map((r) => {
            const def = getMetricDef(r.metricType);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-sm"
              >
                <span className="text-zinc-700">{def?.label ?? r.metricType}</span>
                <span className="tabular-nums font-medium">
                  {formatReadingDisplay(r)}
                  {r.category ? (
                    <span className="ml-2 font-normal text-zinc-500">
                      {r.category}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        {session.notes ? (
          <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
            {session.notes}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Edit session</h2>
        <SessionForm
          action={asFormAction(updateSessionAction.bind(null, id))}
          preferredLengthUnit={profile.preferredLengthUnit ?? "in"}
          preferredWeightUnit={profile.preferredWeightUnit ?? "lb"}
          defaults={{
            measuredAt: session.measuredAt,
            source: session.source,
            deviceLabel: session.deviceLabel,
            notes: session.notes,
            readings: session.readings.map((r) => ({
              metricType: r.metricType,
              valuePrimary: r.valuePrimary,
              valueSecondary: r.valueSecondary,
              unit: r.unit,
              category: r.category,
            })),
          }}
          submitLabel="Update session"
        />
      </section>
    </div>
  );
}
