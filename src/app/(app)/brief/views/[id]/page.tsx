import Link from "next/link";
import { notFound } from "next/navigation";
import { MEDICAL_DISCLAIMER } from "@/server/ai/safety";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptViewAction,
  rejectViewAction,
  updateDraftViewFormAction,
} from "@/server/actions/brief";
import {
  getView,
  listVersionHistory,
  parseFactOpinion,
  parseViewCitations,
  parseViewTopics,
  simpleLineDiff,
} from "@/server/services/brief";
import { getPersona } from "@/server/services/personas";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(
  fn: (...args: never[]) => unknown,
): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function statusVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" | "default" {
  switch (status) {
    case "accepted":
      return "success";
    case "draft":
      return "warning";
    case "rejected":
      return "danger";
    case "superseded":
      return "muted";
    default:
      return "default";
  }
}

export default async function BriefViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const view = getView(id);
  if (!view) notFound();

  const persona = getPersona(view.personaId);
  const personaName = persona?.name ?? view.personaId;
  const topics = parseViewTopics(view.topicsJson);
  const citations = parseViewCitations(view.citationsJson);
  const factOpinion = parseFactOpinion(view.factOpinionJson);
  const isDraft = view.status === "draft";
  const isAcceptedOrSuperseded =
    view.status === "accepted" || view.status === "superseded";

  const history = isAcceptedOrSuperseded
    ? listVersionHistory(view.personaId)
    : [];

  const previous =
    isAcceptedOrSuperseded && view.version > 1
      ? history.find((h) => h.version === view.version - 1)
      : undefined;
  const diffText =
    previous != null
      ? simpleLineDiff(previous.bodyMd, view.bodyMd)
      : null;

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {view.title?.trim() || `${personaName} view`}
            </h1>
            <Badge variant={statusVariant(view.status)} className="capitalize">
              {view.status}
              {view.status === "accepted" || view.status === "superseded"
                ? ` v${view.version}`
                : ""}
            </Badge>
          </div>
          <p className="text-sm text-zinc-600">
            <span className="font-medium">{personaName}</span>
            {persona?.specialty ? (
              <>
                <span className="text-zinc-400"> · </span>
                {persona.specialty}
              </>
            ) : null}
            {view.provider ? (
              <>
                <span className="text-zinc-400"> · </span>
                <span className="capitalize">{view.provider}</span>
              </>
            ) : null}
            {view.model ? (
              <>
                <span className="text-zinc-400"> · </span>
                <span className="font-mono text-xs">{view.model}</span>
              </>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
            Created {new Date(view.createdAt).toLocaleString()}
            {view.acceptedAt
              ? ` · Accepted ${new Date(view.acceptedAt).toLocaleString()}`
              : null}
          </p>
          <Link
            href="/brief"
            className="mt-1 inline-block text-sm text-zinc-600 hover:underline"
          >
            Back to brief
          </Link>
        </div>
      </div>

      {isDraft ? (
        <div className="mb-6 space-y-4">
          <form
            action={asFormAction(updateDraftViewFormAction.bind(null, view.id))}
            className="max-w-3xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <Label>
              Title
              <Input
                name="title"
                maxLength={300}
                defaultValue={view.title ?? ""}
                placeholder="Optional short title"
              />
            </Label>
            <Label>
              Body (markdown)
              <Textarea
                name="bodyMd"
                required
                rows={16}
                defaultValue={view.bodyMd}
                className="font-mono text-xs sm:text-sm"
              />
            </Label>
            <Button type="submit">Save draft</Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <form action={asFormAction(acceptViewAction.bind(null, view.id))}>
              <Button type="submit">Accept</Button>
            </form>
            <form action={asFormAction(rejectViewAction.bind(null, view.id))}>
              <Button type="submit" variant="danger">
                Reject
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <section className="mb-6 max-w-3xl rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          {view.title ? (
            <h2 className="mb-3 text-lg font-medium">{view.title}</h2>
          ) : null}
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-900">
            {view.bodyMd}
          </pre>
        </section>
      )}

      <div className="mb-6 grid max-w-3xl gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Facts
          </h2>
          {factOpinion.facts.length === 0 ? (
            <p className="text-sm text-zinc-500">None listed</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
              {factOpinion.facts.map((f, i) => (
                <li key={`${i}-${f.slice(0, 24)}`}>{f}</li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Opinions
          </h2>
          {factOpinion.opinions.length === 0 ? (
            <p className="text-sm text-zinc-500">None listed</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
              {factOpinion.opinions.map((o, i) => (
                <li key={`${i}-${o.slice(0, 24)}`}>{o}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mb-6 max-w-3xl rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Topics
        </h2>
        {topics.length === 0 ? (
          <p className="text-sm text-zinc-500">None</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <Badge key={t} variant="default">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6 max-w-3xl rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Citations
        </h2>
        {citations.length === 0 ? (
          <p className="text-sm text-zinc-500">None</p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {citations.map((c, i) => (
              <li
                key={`${c.entityType}-${c.entityId}-${i}`}
                className="flex flex-wrap gap-2 py-2"
              >
                <span className="font-medium text-zinc-900">{c.label}</span>
                <span className="text-xs text-zinc-500">
                  {c.entityType}
                  <span className="text-zinc-300"> · </span>
                  <span className="font-mono">{c.entityId}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {view.focusNote ? (
        <section className="mb-6 max-w-3xl rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Focus note
          </h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-800">
            {view.focusNote}
          </p>
        </section>
      ) : null}

      {isAcceptedOrSuperseded ? (
        <section className="mb-6 max-w-3xl space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Version history
            </h2>
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500">No history</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {history.map((h) => {
                  const active = h.id === view.id;
                  return (
                    <li key={h.id}>
                      {active ? (
                        <span className="font-medium text-zinc-900">
                          v{h.version} · {h.status} (current)
                        </span>
                      ) : (
                        <Link
                          href={`/brief/views/${h.id}`}
                          className="text-zinc-700 hover:underline"
                        >
                          v{h.version} · {h.status}
                          {h.acceptedAt
                            ? ` · ${new Date(h.acceptedAt).toLocaleDateString()}`
                            : ""}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {diffText != null ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                Diff vs previous (v{previous!.version})
              </h2>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-zinc-100 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800">
                {diffText}
              </pre>
            </div>
          ) : view.version <= 1 ? (
            <p className="text-sm text-zinc-500">
              No previous accepted version to diff against.
            </p>
          ) : null}
        </section>
      ) : null}

      <p className="mt-8 text-xs text-zinc-500">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
