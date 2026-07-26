import Link from "next/link";
import type { DraftVitalSessionWithReadings } from "@/server/services/imports";
import {
  acceptDraftVitalSessionAction,
  rejectDraftVitalSessionAction,
} from "@/server/actions/imports";
import { getMetricDef } from "@/lib/metrics/catalog";
import { formatDisplayDate } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function reviewVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" | "default" {
  if (status === "accepted") return "success";
  if (status === "rejected") return "danger";
  if (status === "pending") return "warning";
  return "muted";
}

function formatValue(r: DraftVitalSessionWithReadings["readings"][number]): string {
  const def = getMetricDef(r.metricType);
  if (def?.mode === "bp" && r.valueSecondary != null) {
    return `${Math.round(r.valuePrimary)}/${Math.round(r.valueSecondary)} ${r.unit}`;
  }
  const v =
    Number.isInteger(r.valuePrimary) || Math.abs(r.valuePrimary) >= 100
      ? String(Math.round(r.valuePrimary * 10) / 10)
      : String(Math.round(r.valuePrimary * 100) / 100);
  if (r.unit === "index" || r.unit === "score") return v;
  return `${v} ${r.unit}`;
}

type Props = {
  draft: DraftVitalSessionWithReadings;
};

export function DraftVitalSessionCard({ draft }: Props) {
  const title =
    draft.deviceLabel?.trim() ||
    (draft.source === "device_report" ? "Body composition / vitals" : "Vitals session");

  if (draft.reviewStatus === "accepted") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-medium text-zinc-900">{title}</h3>
              <Badge variant={reviewVariant(draft.reviewStatus)} className="capitalize">
                accepted
              </Badge>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {formatDisplayDate(draft.measuredAt)} · {draft.readings.length} metrics
            </p>
          </div>
          {draft.committedSessionId ? (
            <Link
              href={`/vitals/sessions/${draft.committedSessionId}`}
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Open in Vitals →
            </Link>
          ) : null}
        </div>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {draft.readings.map((r) => (
            <li key={r.id} className="flex justify-between gap-2 py-1.5">
              <span className="text-zinc-600">
                {getMetricDef(r.metricType)?.label ?? r.metricType}
              </span>
              <span className="tabular-nums font-medium">{formatValue(r)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (draft.reviewStatus === "rejected") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 opacity-80">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-medium text-zinc-700">{title}</h3>
          <Badge variant="danger" className="capitalize">
            rejected
          </Badge>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {formatDisplayDate(draft.measuredAt)} · {draft.readings.length} metrics
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-zinc-900">{title}</h3>
            <Badge variant="warning" className="capitalize">
              pending
            </Badge>
            <Badge variant="muted">Vitals</Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {formatDisplayDate(draft.measuredAt)}
            {draft.deviceLabel ? ` · ${draft.deviceLabel}` : ""}
            {" · "}
            {draft.readings.length} metric{draft.readings.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <ul className="mb-4 divide-y divide-zinc-100 rounded-md border border-zinc-100 text-sm">
        {draft.readings.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2"
          >
            <span className="text-zinc-700">
              {getMetricDef(r.metricType)?.label ?? r.metricType}
              {r.category ? (
                <span className="ml-2 text-xs text-zinc-500">{r.category}</span>
              ) : null}
            </span>
            <span className="tabular-nums font-medium">{formatValue(r)}</span>
          </li>
        ))}
      </ul>

      {draft.notes ? (
        <p className="mb-3 text-xs text-zinc-500">{draft.notes}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form action={asFormAction(acceptDraftVitalSessionAction.bind(null, draft.id))}>
          <Button type="submit" size="sm">
            Accept → Vitals
          </Button>
        </form>
        <form action={asFormAction(rejectDraftVitalSessionAction.bind(null, draft.id))}>
          <Button type="submit" size="sm" variant="danger">
            Reject
          </Button>
        </form>
      </div>
    </div>
  );
}
