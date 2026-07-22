import { like } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import {
  diagnoses,
  medications,
  supplements,
  labPanels,
  tests,
  procedures,
} from "@/server/db/schema";

export type SearchHit = {
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  href: string;
};

const TOTAL_CAP = 20;

export function globalSearch(q: string): SearchHit[] {
  bootstrapDb();
  const query = q.trim();
  if (!query) return [];

  const pattern = `%${query}%`;
  const db = getDb();
  const hits: SearchHit[] = [];

  // Per-table soft limit so one type cannot fill the whole result set alone.
  const perTable = Math.max(4, Math.ceil(TOTAL_CAP / 6));

  const diagnosisRows = db
    .select({ id: diagnoses.id, name: diagnoses.name, status: diagnoses.status })
    .from(diagnoses)
    .where(like(diagnoses.name, pattern))
    .limit(perTable)
    .all();
  for (const row of diagnosisRows) {
    hits.push({
      entityType: "diagnosis",
      entityId: row.id,
      title: row.name,
      subtitle: row.status,
      href: `/diagnoses/${row.id}`,
    });
  }

  const medicationRows = db
    .select({
      id: medications.id,
      name: medications.name,
      status: medications.status,
      dose: medications.dose,
    })
    .from(medications)
    .where(like(medications.name, pattern))
    .limit(perTable)
    .all();
  for (const row of medicationRows) {
    hits.push({
      entityType: "medication",
      entityId: row.id,
      title: row.name,
      subtitle: [row.dose, row.status].filter(Boolean).join(" · ") || undefined,
      href: `/medications/${row.id}`,
    });
  }

  const supplementRows = db
    .select({
      id: supplements.id,
      name: supplements.name,
      status: supplements.status,
      dose: supplements.dose,
    })
    .from(supplements)
    .where(like(supplements.name, pattern))
    .limit(perTable)
    .all();
  for (const row of supplementRows) {
    hits.push({
      entityType: "supplement",
      entityId: row.id,
      title: row.name,
      subtitle: [row.dose, row.status].filter(Boolean).join(" · ") || undefined,
      href: `/supplements/${row.id}`,
    });
  }

  const labRows = db
    .select({
      id: labPanels.id,
      name: labPanels.name,
      collectedOn: labPanels.collectedOn,
      facility: labPanels.facility,
    })
    .from(labPanels)
    .where(like(labPanels.name, pattern))
    .limit(perTable)
    .all();
  for (const row of labRows) {
    hits.push({
      entityType: "lab_panel",
      entityId: row.id,
      title: row.name,
      subtitle: [row.collectedOn, row.facility].filter(Boolean).join(" · ") || undefined,
      href: `/labs/${row.id}`,
    });
  }

  const testRows = db
    .select({
      id: tests.id,
      name: tests.name,
      type: tests.type,
      performedOn: tests.performedOn,
    })
    .from(tests)
    .where(like(tests.name, pattern))
    .limit(perTable)
    .all();
  for (const row of testRows) {
    hits.push({
      entityType: "test",
      entityId: row.id,
      title: row.name,
      subtitle: [row.type, row.performedOn].filter(Boolean).join(" · ") || undefined,
      href: `/tests/${row.id}`,
    });
  }

  const procedureRows = db
    .select({
      id: procedures.id,
      name: procedures.name,
      performedOn: procedures.performedOn,
      facility: procedures.facility,
    })
    .from(procedures)
    .where(like(procedures.name, pattern))
    .limit(perTable)
    .all();
  for (const row of procedureRows) {
    hits.push({
      entityType: "procedure",
      entityId: row.id,
      title: row.name,
      subtitle:
        [row.performedOn, row.facility].filter(Boolean).join(" · ") || undefined,
      href: `/procedures/${row.id}`,
    });
  }

  return hits.slice(0, TOTAL_CAP);
}
