import Link from "next/link";
import { MEDICAL_DISCLAIMER } from "@/server/ai/safety";
import { ExportBriefButton } from "@/components/brief/export-brief-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveMyPlanAction } from "@/server/actions/brief";
import {
  getCurrentAcceptedView,
  getMyPlan,
  listCurrentAcceptedViews,
  listTopicConflicts,
  listViewsForPersona,
} from "@/server/services/brief";
import { ensurePersonasSeeded, listPersonas } from "@/server/services/personas";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(
  fn: (...args: never[]) => unknown,
): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

function buildExportMarkdown(opts: {
  accepted: ReturnType<typeof listCurrentAcceptedViews>;
  planBody: string;
}): string {
  const generated = new Date().toISOString();
  const parts: string[] = [
    "# Chart brief",
    "",
    `Generated: ${generated}`,
    "",
    `> ${MEDICAL_DISCLAIMER}`,
    "",
    "## My plan",
    "",
    opts.planBody.trim() || "_(empty)_",
    "",
  ];

  if (opts.accepted.length === 0) {
    parts.push("## Accepted persona views", "", "_(none)_", "");
  } else {
    for (const view of opts.accepted) {
      parts.push(
        `## ${view.personaName} (v${view.version})`,
        "",
        view.title ? `**${view.title}**` : "",
        view.title ? "" : "",
        view.bodyMd.trim() || "_(empty)_",
        "",
      );
    }
  }

  return parts.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}

export default async function BriefPage() {
  ensurePersonasSeeded();
  const personas = listPersonas({ enabledOnly: true });
  const accepted = listCurrentAcceptedViews();
  const plan = getMyPlan();
  const planBody = plan?.bodyMd ?? "";
  const conflicts = listTopicConflicts();

  const personaNameById = new Map(personas.map((p) => [p.id, p.name]));
  // Include names for accepted views whose persona may be disabled
  for (const v of accepted) {
    if (!personaNameById.has(v.personaId)) {
      personaNameById.set(v.personaId, v.personaName);
    }
  }

  const personaRows = personas.map((p) => {
    const current = getCurrentAcceptedView(p.id);
    const draft = listViewsForPersona(p.id).find((v) => v.status === "draft");
    return { persona: p, current, draft };
  });

  const exportMarkdown = buildExportMarkdown({
    accepted,
    planBody,
  });

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chart brief</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Multi-persona reviewed views and your personal plan. Accept drafts before
            they become brief memory.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/evaluate">
            <Button type="button" variant="secondary">
              Open Evaluate
            </Button>
          </Link>
          <ExportBriefButton markdown={exportMarkdown} />
        </div>
      </div>

      {conflicts.length > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Topic overlap across accepted views</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {conflicts.map((c) => (
              <li key={c.topic}>
                <span className="font-medium">{c.topic}</span>
                <span className="text-amber-800">
                  {" "}
                  —{" "}
                  {c.personaIds
                    .map((id) => personaNameById.get(id) ?? id)
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-900/80">
            Informational only — overlapping topics are not automatically resolved.
          </p>
        </div>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Personas</h2>
        {personaRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
            No personas enabled.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white shadow-sm">
            {personaRows.map(({ persona, current, draft }) => (
              <li
                key={persona.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{persona.name}</span>
                    {persona.specialty ? (
                      <span className="text-xs text-zinc-500">
                        {persona.specialty}
                      </span>
                    ) : null}
                    {draft ? (
                      <Badge variant="warning">draft</Badge>
                    ) : null}
                    {current ? (
                      <Badge variant="success">accepted v{current.version}</Badge>
                    ) : (
                      <Badge variant="muted">empty</Badge>
                    )}
                  </div>
                  {current?.title || draft?.title ? (
                    <p className="mt-0.5 truncate text-sm text-zinc-600">
                      {draft?.title ?? current?.title}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft ? (
                    <Link href={`/brief/views/${draft.id}`}>
                      <Button type="button" size="sm" variant="secondary">
                        Open draft
                      </Button>
                    </Link>
                  ) : null}
                  {current ? (
                    <Link href={`/brief/views/${current.id}`}>
                      <Button type="button" size="sm" variant="secondary">
                        View accepted
                      </Button>
                    </Link>
                  ) : null}
                  <Link
                    href={`/evaluate?personaId=${encodeURIComponent(persona.id)}`}
                  >
                    <Button type="button" size="sm" variant="secondary">
                      Evaluate
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">My plan</h2>
        <form
          action={asFormAction(saveMyPlanAction)}
          className="max-w-2xl space-y-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <Label>
            Your goals and notes
            <Textarea
              name="bodyMd"
              rows={8}
              defaultValue={planBody}
              placeholder="## Goals\n- Sleep more\n- Follow up iron panel"
              className="font-mono text-xs sm:text-sm"
            />
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Save plan</Button>
            {plan?.updatedAt ? (
              <span className="text-xs tabular-nums text-zinc-500">
                Updated {new Date(plan.updatedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
        <h2 className="mb-1 text-lg font-medium">Evaluate as…</h2>
        <p className="mb-3 text-sm text-zinc-600">
          Run a persona lens over the chart. Output is a draft view you can edit,
          accept, or reject.
        </p>
        <Link href="/evaluate">
          <Button type="button">Open Evaluate</Button>
        </Link>
      </section>

      <p className="mt-8 text-xs text-zinc-500">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
