import { ageFromDob } from "@/lib/dates";
import { bootstrapDb } from "@/server/db/bootstrap";
import { listAllergies } from "@/server/services/allergies";
import {
  getMyPlan,
  listCurrentAcceptedViews,
  type AcceptedPersonaView,
} from "@/server/services/brief";
import { listClinicalTests } from "@/server/services/clinical-tests";
import { listDiagnoses } from "@/server/services/diagnoses";
import { getLabPanel, listLabPanels } from "@/server/services/labs";
import { listMedications } from "@/server/services/medications";
import { listProcedures } from "@/server/services/procedures";
import { getProfile } from "@/server/services/profile";
import { listSupplements } from "@/server/services/supplements";

export type { AcceptedPersonaView };
export { listCurrentAcceptedViews };

export type ChartContextScope = {
  profile?: boolean;
  allergies?: boolean;
  diagnoses?: boolean;
  medications?: boolean;
  supplements?: boolean;
  labs?: boolean;
  tests?: boolean;
  procedures?: boolean;
  acceptedViews?: boolean;
  myPlan?: boolean;
  /** When non-empty, only these medication ids (otherwise all active). */
  medicationIds?: string[];
  /** When non-empty, only these supplement ids (otherwise all active). */
  supplementIds?: string[];
  /** When non-empty, only these lab panel ids (otherwise recent panels). */
  labPanelIds?: string[];
  /** When non-empty, only these test ids (otherwise recent tests). */
  testIds?: string[];
  /** When non-empty, only these procedure ids (otherwise recent procedures). */
  procedureIds?: string[];
};

export type BuiltContext = {
  text: string;
  charCount: number;
  truncated: boolean;
  citations: Array<{ entityType: string; entityId: string; label: string }>;
};

export type Citation = BuiltContext["citations"][number];

const DEFAULT_MAX_CHARS = 100_000;
const RECENT_LAB_PANELS = 5;
const RECENT_TESTS = 10;
const RECENT_PROCEDURES = 10;

const PEER_VIEW_WARNING =
  "_Opinion, not chart fact — peer persona view from an accepted chart brief. Attribute accordingly._";

type Section = {
  id: string;
  /** Higher dropPriority is removed first when truncating. */
  dropPriority: number;
  text: string;
  citations: Citation[];
};

/** @deprecated Prefer getMyPlan from @/server/services/brief */
export function getMyPlanRow() {
  return getMyPlan();
}

function line(...parts: Array<string | null | undefined | false>): string {
  return parts.filter((p) => p !== false && p != null && p !== "").join(" ");
}

function bullet(label: string, value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return `- ${label}: ${value}`;
}

function formatProfileSection(): Section {
  const p = getProfile();
  const age = ageFromDob(p.dateOfBirth);
  const lines = [
    "## Profile",
    bullet("Name", p.displayName),
    bullet(
      "Date of birth",
      p.dateOfBirth
        ? age != null
          ? `${p.dateOfBirth} (age ${age})`
          : p.dateOfBirth
        : null,
    ),
    bullet("Sex", p.sex),
    bullet(
      "Height",
      p.heightValue != null
        ? `${p.heightValue}${p.heightUnit ? ` ${p.heightUnit}` : ""}`
        : null,
    ),
    bullet(
      "Weight",
      p.weightValue != null
        ? `${p.weightValue}${p.weightUnit ? ` ${p.weightUnit}` : ""}`
        : null,
    ),
    bullet("Blood type", p.bloodType),
    bullet("Notes", p.notes),
  ].filter(Boolean) as string[];

  if (lines.length === 1) {
    lines.push("- (no profile details set)");
  }

  return {
    id: "profile",
    dropPriority: 0,
    text: lines.join("\n"),
    citations: [{ entityType: "profile", entityId: p.id, label: "Profile" }],
  };
}

function formatAllergiesSection(): Section {
  const rows = listAllergies();
  const citations: Citation[] = rows.map((a) => ({
    entityType: "allergy",
    entityId: a.id,
    label: a.name,
  }));
  const body =
    rows.length === 0
      ? "- (none recorded)"
      : rows
          .map((a) => {
            const bits = [
              a.reaction ? `reaction: ${a.reaction}` : null,
              a.severity ? `severity: ${a.severity}` : null,
              a.notes ? `notes: ${a.notes}` : null,
            ].filter(Boolean);
            return bits.length ? `- ${a.name} — ${bits.join("; ")}` : `- ${a.name}`;
          })
          .join("\n");

  return {
    id: "allergies",
    dropPriority: 0,
    text: `## Allergies\n${body}`,
    citations,
  };
}

function formatDiagnosesSection(): Section {
  // Prefer active/chronic for clinical context; include resolved briefly if nothing else.
  const all = listDiagnoses();
  const preferred = all.filter((d) => d.status === "active" || d.status === "chronic");
  const rows = preferred.length > 0 ? preferred : all;
  const citations: Citation[] = rows.map((d) => ({
    entityType: "diagnosis",
    entityId: d.id,
    label: d.name,
  }));
  const body =
    rows.length === 0
      ? "- (none recorded)"
      : rows
          .map((d) => {
            const bits = [
              d.status,
              d.diagnosedOn ? `diagnosed ${d.diagnosedOn}` : null,
              d.icdCode ? `ICD ${d.icdCode}` : null,
              d.clinician ? `clinician: ${d.clinician}` : null,
              d.notes ? `notes: ${d.notes}` : null,
            ].filter(Boolean);
            return `- ${d.name} (${bits.join("; ")})`;
          })
          .join("\n");

  return {
    id: "diagnoses",
    dropPriority: 0,
    text: `## Diagnoses\n${body}`,
    citations,
  };
}

function formatMedOrSupp(
  kind: "medication" | "supplement",
  title: string,
  rows: Array<{
    id: string;
    name: string;
    dose: string | null;
    form: string | null;
    route: string | null;
    frequency: string | null;
    prn: boolean;
    purpose: string | null;
    howItHelps: string | null;
    prescriber: string | null;
    notes: string | null;
    status: string;
  }>,
): Section {
  const citations: Citation[] = rows.map((r) => ({
    entityType: kind,
    entityId: r.id,
    label: r.name,
  }));
  const body =
    rows.length === 0
      ? "- (none active)"
      : rows
          .map((r) => {
            const head = line(
              r.name,
              r.dose,
              r.form,
              r.route,
              r.frequency,
              r.prn ? "PRN" : null,
            );
            const bits = [
              r.purpose ? `purpose: ${r.purpose}` : null,
              r.howItHelps ? `how it helps: ${r.howItHelps}` : null,
              r.prescriber ? `prescriber: ${r.prescriber}` : null,
              r.notes ? `notes: ${r.notes}` : null,
            ].filter(Boolean);
            return bits.length ? `- ${head} — ${bits.join("; ")}` : `- ${head}`;
          })
          .join("\n");

  return {
    id: kind === "medication" ? "medications" : "supplements",
    dropPriority: 0,
    text: `## ${title}\n${body}`,
    citations,
  };
}

function formatLabPanelDetail(panelId: string, name: string, collectedOn: string | null): string {
  const full = getLabPanel(panelId);
  const header = `### ${name}${collectedOn ? ` (${collectedOn})` : ""}`;
  if (!full?.results?.length) {
    return `${header}\n- (no results)`;
  }
  const lines = full.results.map((r) => {
    const ref =
      r.refLow != null || r.refHigh != null
        ? ` ref ${r.refLow ?? "?"}–${r.refHigh ?? "?"}`
        : "";
    const unit = r.unit ? ` ${r.unit}` : "";
    const flag = r.flag ? ` [${r.flag}]` : "";
    return `- ${r.analyteName}: ${r.value ?? "—"}${unit}${ref}${flag}`;
  });
  return `${header}\n${lines.join("\n")}`;
}

function formatLabPanelSummary(name: string, collectedOn: string | null, facility: string | null): string {
  return `- ${name}${collectedOn ? ` (${collectedOn})` : ""}${facility ? ` @ ${facility}` : ""}`;
}

function filterByIds<T extends { id: string }>(
  rows: T[],
  ids: string[] | undefined,
): T[] {
  if (!ids || ids.length === 0) return rows;
  const set = new Set(ids);
  return rows.filter((r) => set.has(r.id));
}

function formatLabsSections(labPanelIds?: string[]): {
  detail: Section;
  summary: Section;
} {
  const all = listLabPanels();
  const panels =
    labPanelIds && labPanelIds.length > 0
      ? filterByIds(all, labPanelIds)
      : all.slice(0, RECENT_LAB_PANELS);
  const citations: Citation[] = panels.map((p) => ({
    entityType: "lab_panel",
    entityId: p.id,
    label: p.name,
  }));

  const detailBody =
    panels.length === 0
      ? "- (none recorded)"
      : panels
          .map((p) => formatLabPanelDetail(p.id, p.name, p.collectedOn))
          .join("\n\n");

  const summaryBody =
    panels.length === 0
      ? "- (none recorded)"
      : panels
          .map((p) => formatLabPanelSummary(p.name, p.collectedOn, p.facility))
          .join("\n");

  const title =
    labPanelIds && labPanelIds.length > 0
      ? "Labs (selected panels with results)"
      : "Labs (recent panels with results)";
  const summaryTitle =
    labPanelIds && labPanelIds.length > 0
      ? "Labs (selected panel list only; details truncated)"
      : "Labs (recent panel list only; details truncated)";

  return {
    detail: {
      id: "labs-detail",
      dropPriority: 100, // drop first
      text: `## ${title}\n${detailBody}`,
      citations,
    },
    summary: {
      id: "labs-summary",
      dropPriority: 50,
      text: `## ${summaryTitle}\n${summaryBody}`,
      citations,
    },
  };
}

function formatTestsSection(testIds?: string[]): Section {
  const all = listClinicalTests();
  const rows =
    testIds && testIds.length > 0
      ? filterByIds(all, testIds)
      : all.slice(0, RECENT_TESTS);
  const citations: Citation[] = rows.map((t) => ({
    entityType: "test",
    entityId: t.id,
    label: t.name,
  }));
  const body =
    rows.length === 0
      ? "- (none recorded)"
      : rows
          .map((t) => {
            const bits = [
              t.type,
              t.performedOn ? `on ${t.performedOn}` : null,
              t.facility ? `@ ${t.facility}` : null,
              t.diagnosis ? `dx: ${t.diagnosis}` : null,
              t.summary ? `summary: ${t.summary}` : null,
              t.keyFindings ? `findings: ${t.keyFindings}` : null,
            ].filter(Boolean);
            return `- ${t.name} (${bits.join("; ")})`;
          })
          .join("\n");

  return {
    id: "tests",
    dropPriority: 0,
    text: `## Tests / imaging\n${body}`,
    citations,
  };
}

function formatProceduresSection(procedureIds?: string[]): Section {
  const all = listProcedures();
  const rows =
    procedureIds && procedureIds.length > 0
      ? filterByIds(all, procedureIds)
      : all.slice(0, RECENT_PROCEDURES);
  const citations: Citation[] = rows.map((p) => ({
    entityType: "procedure",
    entityId: p.id,
    label: p.name,
  }));
  const body =
    rows.length === 0
      ? "- (none recorded)"
      : rows
          .map((p) => {
            const bits = [
              p.performedOn ? `on ${p.performedOn}` : null,
              p.facility ? `@ ${p.facility}` : null,
              p.clinician ? `clinician: ${p.clinician}` : null,
              p.diagnosis ? `dx: ${p.diagnosis}` : null,
              p.outcome ? `outcome: ${p.outcome}` : null,
              p.followUp ? `follow-up: ${p.followUp}` : null,
            ].filter(Boolean);
            return `- ${p.name}${bits.length ? ` (${bits.join("; ")})` : ""}`;
          })
          .join("\n");

  return {
    id: "procedures",
    dropPriority: 0,
    text: `## Procedures\n${body}`,
    citations,
  };
}

function formatPeerViewSection(view: AcceptedPersonaView, index: number): Section {
  // Older views (higher index after newest-first sort) drop first among peer views.
  const title = view.title ? ` — ${view.title}` : "";
  const ver = view.version > 0 ? ` v${view.version}` : "";
  const text = [
    `## Peer persona view (accepted): ${view.personaName}${ver}${title}`,
    PEER_VIEW_WARNING,
    "",
    view.bodyMd.trim(),
  ].join("\n");

  return {
    id: `peer-view-${view.id}`,
    dropPriority: 80 + index, // older (later in newest-first list) → higher priority drop
    text,
    citations: [
      {
        entityType: "persona_view",
        entityId: view.id,
        label: `${view.personaName} accepted view`,
      },
    ],
  };
}

function formatMyPlanSection(): Section | null {
  const row = getMyPlanRow();
  if (!row || !row.bodyMd.trim()) return null;
  return {
    id: "my-plan",
    dropPriority: 10,
    text: `## My plan\n${row.bodyMd.trim()}`,
    citations: [{ entityType: "my_plan", entityId: row.id, label: "My plan" }],
  };
}

function joinSections(sections: Section[]): string {
  const header =
    "# Patient chart context\n\n_Structured chart data for assistive review. Separate chart facts from persona opinions._";
  return [header, ...sections.map((s) => s.text)].join("\n\n");
}

function collectCitations(sections: Section[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const s of sections) {
    for (const c of s.citations) {
      const key = `${c.entityType}:${c.entityId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

/**
 * Assemble live chart + accepted persona views into a markdown context block
 * for co-pilot skills. Never includes draft/rejected/superseded views.
 */
export function buildChartContext(opts: {
  scope: ChartContextScope;
  maxChars?: number;
  excludePersonaId?: string;
}): BuiltContext {
  bootstrapDb();
  const scope = opts.scope;
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;

  const core: Section[] = [];
  let labDetail: Section | null = null;
  let labSummary: Section | null = null;
  const peerViews: Section[] = [];

  if (scope.profile) core.push(formatProfileSection());
  if (scope.allergies) core.push(formatAllergiesSection());
  if (scope.diagnoses) core.push(formatDiagnosesSection());
  if (scope.medications) {
    const allActive = listMedications({ status: "active" });
    const all = listMedications();
    const rows =
      scope.medicationIds && scope.medicationIds.length > 0
        ? filterByIds(all, scope.medicationIds)
        : allActive;
    core.push(
      formatMedOrSupp(
        "medication",
        scope.medicationIds?.length
          ? "Medications (selected)"
          : "Medications (active)",
        rows,
      ),
    );
  }
  if (scope.supplements) {
    const allActive = listSupplements({ status: "active" });
    const all = listSupplements();
    const rows =
      scope.supplementIds && scope.supplementIds.length > 0
        ? filterByIds(all, scope.supplementIds)
        : allActive;
    core.push(
      formatMedOrSupp(
        "supplement",
        scope.supplementIds?.length
          ? "Supplements (selected)"
          : "Supplements (active)",
        rows,
      ),
    );
  }
  if (scope.labs) {
    const labs = formatLabsSections(scope.labPanelIds);
    labDetail = labs.detail;
    labSummary = labs.summary;
  }
  if (scope.tests) core.push(formatTestsSection(scope.testIds));
  if (scope.procedures) core.push(formatProceduresSection(scope.procedureIds));

  if (scope.acceptedViews) {
    const views = listCurrentAcceptedViews({
      excludePersonaId: opts.excludePersonaId,
    });
    // Newest first already; index 0 is newest → lowest drop priority among views
    for (let i = 0; i < views.length; i++) {
      peerViews.push(formatPeerViewSection(views[i]!, i));
    }
  }

  if (scope.myPlan) {
    const plan = formatMyPlanSection();
    if (plan) core.push(plan);
  }

  // Preferred full context: labs with detail
  let activeSections: Section[] = [
    ...core.filter((s) => s.id !== "my-plan"),
    ...(labDetail ? [labDetail] : []),
    ...core.filter((s) => s.id === "my-plan"),
    ...peerViews,
  ];

  // Keep stable-ish order: profile…procedures, labs, my plan, peer views
  // Rebuild ordered list more carefully
  const ordered = (): Section[] => {
    const out: Section[] = [];
    for (const id of [
      "profile",
      "allergies",
      "diagnoses",
      "medications",
      "supplements",
      "labs-detail",
      "labs-summary",
      "tests",
      "procedures",
      "my-plan",
    ]) {
      const s = activeSections.find((x) => x.id === id);
      if (s) out.push(s);
    }
    for (const s of activeSections) {
      if (s.id.startsWith("peer-view-")) out.push(s);
    }
    return out;
  };

  activeSections = ordered();
  let text = joinSections(activeSections);
  let truncated = false;

  if (text.length > maxChars) {
    // 1) Drop lab detail → keep summary only
    if (labDetail && labSummary && activeSections.some((s) => s.id === "labs-detail")) {
      activeSections = activeSections
        .filter((s) => s.id !== "labs-detail")
        .concat([labSummary]);
      activeSections = ordered();
      text = joinSections(activeSections);
      truncated = true;
    }
  }

  if (text.length > maxChars) {
    // 2) Drop older peer views first (highest dropPriority among peer-view-*)
    const peers = activeSections
      .filter((s) => s.id.startsWith("peer-view-"))
      .sort((a, b) => b.dropPriority - a.dropPriority);
    for (const peer of peers) {
      if (text.length <= maxChars) break;
      activeSections = activeSections.filter((s) => s.id !== peer.id);
      text = joinSections(activeSections);
      truncated = true;
    }
  }

  if (text.length > maxChars) {
    // 3) Drop lab summary entirely if still over
    if (activeSections.some((s) => s.id === "labs-summary" || s.id === "labs-detail")) {
      activeSections = activeSections.filter(
        (s) => s.id !== "labs-summary" && s.id !== "labs-detail",
      );
      text = joinSections(activeSections);
      truncated = true;
    }
  }

  if (text.length > maxChars) {
    // 4) Hard truncate with marker
    text =
      text.slice(0, Math.max(0, maxChars - 80)) +
      "\n\n_…context truncated to fit size budget._\n";
    truncated = true;
  }

  const citations = collectCitations(activeSections);

  return {
    text,
    charCount: text.length,
    truncated,
    citations,
  };
}
