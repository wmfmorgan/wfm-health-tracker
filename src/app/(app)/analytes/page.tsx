import Link from "next/link";
import {
  listAnalytes,
  listAliasesForAnalyte,
  listAnalyteAliasFlags,
} from "@/server/services/analytes";
import {
  listAnalyteSummaries,
  listUnmatchedLabNames,
} from "@/server/services/analyte-results";
import {
  createAnalyteAction,
  deleteAnalyteAction,
  deleteAnalyteAliasAction,
} from "@/server/actions/analytes";
import { AnalyteResultsTable } from "@/components/analytes/analyte-results-table";
import { AddAliasForm } from "@/components/analytes/add-alias-form";
import { MapUnmatchedForm } from "@/components/analytes/map-unmatched-form";
import { AliasFlagCard } from "@/components/analytes/alias-flag-card";
import { ConfirmDeleteButton } from "@/components/records/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default async function AnalytesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; focus?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const focus = params.focus?.trim() ?? "";

  const summaries = listAnalyteSummaries();
  const catalog = listAnalytes();
  const unmatched = listUnmatchedLabNames();
  const aliasFlags = listAnalyteAliasFlags();
  const catalogOptions = catalog.map((a) => ({ id: a.id, name: a.name }));

  // Preload aliases for catalog rows
  const aliasesByAnalyte = new Map(
    catalog.map((a) => [a.id, listAliasesForAnalyte(a.id)] as const),
  );

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lab analytes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Results over time, confirmed aliases, and the master name list.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/" className="text-zinc-600 hover:underline">
            Dashboard trends
          </Link>
          <Link href="/labs" className="text-zinc-600 hover:underline">
            Labs
          </Link>
        </div>
      </div>

      {/* FR-015 */}
      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Results by analyte</h2>
            <p className="text-xs text-zinc-500">
              Latest value plus expandable history. Links open the source panel and PDF when
              available.
            </p>
          </div>
          <form method="get" action="/analytes" className="flex gap-2">
            {focus ? <input type="hidden" name="focus" value={focus} /> : null}
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search analytes…"
              className="w-48"
              aria-label="Search analytes"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </div>
        <AnalyteResultsTable
          summaries={summaries}
          focusKey={focus || null}
          searchQuery={q}
        />
      </section>

      {/* Suggested aliases — merge or reject */}
      {aliasFlags.length > 0 ? (
        <section className="mb-10 rounded-lg border border-sky-200 bg-sky-50/60 p-5">
          <h2 className="text-lg font-medium text-zinc-900">Potential aliases</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Flagged matches based on abbreviations, similarity, or shared words.{" "}
            <span className="font-medium">Merge</span> combines history after you confirm.{" "}
            <span className="font-medium">Reject</span> dismisses this pair so it won’t reappear.
          </p>
          <ul className="mt-4 space-y-2">
            {aliasFlags.map((f) => (
              <AliasFlagCard
                key={`${f.spellingKey}→${f.targetAnalyteId}`}
                flag={{
                  spelling: f.spelling,
                  resultCount: f.resultCount,
                  targetAnalyteId: f.targetAnalyteId,
                  targetName: f.targetName,
                  detail: f.detail,
                  reason: f.reason,
                  spellingExample: f.spellingExample,
                  targetExample: f.targetExample,
                }}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Lab spellings → confirm merge into preferred catalog name */}
      {unmatched.length > 0 && catalogOptions.length > 1 ? (
        <section className="mb-10 rounded-lg border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-lg font-medium text-zinc-900">Merge lab spellings</h2>
          <p className="mt-1 text-xs text-zinc-600">
            All spellings found on results (manual map). Prefer{" "}
            <span className="font-medium">Potential aliases</span> when a suggestion appears.
            Mapping still requires confirmation.
          </p>
          <ul className="mt-4 space-y-3">
            {unmatched.map((u) => (
              <li
                key={u.spelling}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-100 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{u.spelling}</p>
                  <p className="text-xs text-zinc-500">
                    {u.count} result{u.count === 1 ? "" : "s"}
                  </p>
                </div>
                <MapUnmatchedForm
                  spelling={u.spelling}
                  count={u.count}
                  catalog={catalogOptions}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Catalog + aliases */}
      <section className="mb-8">
        <h2 className="mb-1 text-lg font-medium">Master list</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Catalog names for consistent entry. Add confirmed aliases so alternate spellings merge
          into one series.
        </p>

        <form
          action={asFormAction(createAnalyteAction)}
          className="mb-6 max-w-2xl space-y-3 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-sm font-medium text-zinc-800">Add analyte</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Label>
              Name
              <Input name="name" required maxLength={200} placeholder="e.g. Hemoglobin" />
            </Label>
            <Label>
              Default unit
              <Input name="defaultUnit" maxLength={50} placeholder="e.g. g/dL" />
            </Label>
            <Label className="sm:col-span-2">
              Notes
              <Input name="notes" maxLength={5000} />
            </Label>
          </div>
          <Button type="submit">Add to list</Button>
        </form>

        {catalog.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No analytes yet. Add some here, or enter labs and they will appear on this list.
          </p>
        ) : (
          <div className="space-y-4">
            {catalog.map((a) => {
              const aliases = aliasesByAnalyte.get(a.id) ?? [];
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900">{a.name}</p>
                      <p className="text-xs text-zinc-500">
                        {a.defaultUnit ? `Unit: ${a.defaultUnit}` : "No default unit"}
                        {a.notes ? ` · ${a.notes}` : ""}
                      </p>
                    </div>
                    <ConfirmDeleteButton
                      action={asFormAction(deleteAnalyteAction.bind(null, a.id))}
                      message={`Remove analyte “${a.name}” from the master list? Existing lab rows keep the name; aliases are removed.`}
                      label="Remove"
                    />
                  </div>
                  {aliases.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {aliases.map((al) => (
                        <li
                          key={al.id}
                          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                        >
                          {al.alias}
                          <ConfirmDeleteButton
                            action={asFormAction(deleteAnalyteAliasAction.bind(null, al.id))}
                            message={`Remove alias “${al.alias}” from “${a.name}”?`}
                            label="×"
                            className="!border-0 !bg-transparent !px-1 !py-0 !text-zinc-500 hover:!text-red-700"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">No aliases yet</p>
                  )}
                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <AddAliasForm analyteId={a.id} analyteName={a.name} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
