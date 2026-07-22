import Link from "next/link";
import { ageFromDob } from "@/lib/dates";
import { getDashboardSummary } from "@/server/services/dashboard";
import { globalSearch } from "@/server/services/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ENTITY_LABELS: Record<string, string> = {
  diagnosis: "Diagnosis",
  medication: "Medication",
  supplement: "Supplement",
  lab_panel: "Lab panel",
  test: "Test",
  procedure: "Procedure",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const summary = getDashboardSummary();
  const hits = q ? globalSearch(q) : [];
  const age = ageFromDob(summary.profile.dateOfBirth);
  const displayName = summary.profile.displayName?.trim() || "Your chart";

  return (
    <div className="text-zinc-900">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Snapshot of active records and recent labs.
          </p>
        </div>
        <form method="get" action="/" className="flex w-full max-w-md flex-wrap gap-2 sm:w-auto">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search diagnoses, meds, labs…"
            className="min-w-[14rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            aria-label="Global search"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {q ? (
        <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">
            Search results for &ldquo;{q}&rdquo;
          </h2>
          {hits.length === 0 ? (
            <p className="text-sm text-zinc-500">No matching records.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {hits.map((hit) => (
                <li key={`${hit.entityType}-${hit.entityId}`}>
                  <Link
                    href={hit.href}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-zinc-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{hit.title}</p>
                      {hit.subtitle && (
                        <p className="text-xs text-zinc-500">{hit.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="muted">
                      {ENTITY_LABELS[hit.entityType] ?? hit.entityType}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/profile"
          className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Profile
          </p>
          <p className="mt-2 text-lg font-semibold">{displayName}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {age != null ? `Age ${age}` : "No date of birth"}
            {summary.profile.bloodType
              ? ` · Blood type ${summary.profile.bloodType}`
              : ""}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {summary.allergyCount} allerg
            {summary.allergyCount === 1 ? "y" : "ies"}
          </p>
        </Link>

        <StatCard
          href="/medications"
          label="Active medications"
          value={summary.activeMedicationCount}
        />
        <StatCard
          href="/supplements"
          label="Active supplements"
          value={summary.activeSupplementCount}
        />
        <StatCard
          href="/diagnoses"
          label="Active / chronic diagnoses"
          value={summary.activeDiagnosisCount}
        />
        <StatCard
          href="/profile"
          label="Allergies"
          value={summary.allergyCount}
        />
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Recent labs</h2>
          <Link href="/labs" className="text-sm text-zinc-600 hover:text-zinc-900">
            View all
          </Link>
        </div>
        {summary.recentLabs.length === 0 ? (
          <p className="text-sm text-zinc-500">No lab panels recorded yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {summary.recentLabs.map((lab) => (
              <li key={lab.id}>
                <Link
                  href={`/labs/${lab.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-medium">{lab.name}</p>
                    <p className="text-xs text-zinc-500">
                      {[lab.collectedOn, lab.facility].filter(Boolean).join(" · ") ||
                        "No collection date"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      lab.status === "final"
                        ? "success"
                        : lab.status === "pending"
                          ? "warning"
                          : "default"
                    }
                  >
                    {lab.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}
