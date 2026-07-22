import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { importJobs, labPanels } from "@/server/db/schema";
import { savePdfDocument, deleteDocument, listDocumentsForEntity } from "@/server/services/documents";
import {
  createImportJob,
  writeDraftsFromExtracted,
  acceptDraftPanel,
  rejectDraftPanel,
  discardImportJob,
  getImportJob,
  setJobStatus,
  acceptAllPending,
} from "@/server/services/imports";
import { getLabPanel, listLabPanels } from "@/server/services/labs";

useFreshDb();

function fakePdf(): Buffer {
  return Buffer.from("%PDF-1.4 fake content for tests");
}

function saveDoc(name = "labs.pdf") {
  return savePdfDocument({
    originalFilename: name,
    buffer: fakePdf(),
    uploadedVia: "ai_import",
  });
}

function sampleExtracted(panelCount = 1) {
  const panels = Array.from({ length: panelCount }, (_, i) => ({
    name: panelCount === 1 ? "CBC" : `Panel ${i + 1}`,
    collectedOn: "2026-03-01",
    facility: "Quest",
    status: "final" as const,
    results: [
      {
        analyteName: i === 0 ? "WBC" : `Analyte ${i + 1}`,
        value: "6.2",
        unit: "K/uL",
        refLow: "4.0",
        refHigh: "11.0",
        flag: "normal" as const,
      },
    ],
  }));
  return { panels };
}

describe("import service", () => {
  it("accepts draft panel into live labs with document link and source pdf_import", () => {
    const doc = saveDoc();
    const job = createImportJob({
      documentId: doc.id,
      provider: "ollama",
      model: "llama3.2",
    });
    expect(job.status).toBe("pending");

    writeDraftsFromExtracted(job.id, sampleExtracted(1));
    setJobStatus(job.id, "ready");

    const loaded = getImportJob(job.id)!;
    expect(loaded.drafts).toHaveLength(1);
    expect(loaded.drafts[0].results).toHaveLength(1);
    expect(loaded.drafts[0].reviewStatus).toBe("pending");

    const { labPanelId } = acceptDraftPanel(loaded.drafts[0].id);
    const live = getLabPanel(labPanelId)!;
    expect(live.source).toBe("pdf_import");
    expect(live.name).toBe("CBC");
    expect(live.results).toHaveLength(1);
    expect(live.results[0].analyteName).toBe("WBC");

    const linked = listDocumentsForEntity("lab_panel", labPanelId);
    expect(linked).toHaveLength(1);
    expect(linked[0].id).toBe(doc.id);

    const done = getImportJob(job.id)!;
    expect(done.status).toBe("completed");
    expect(done.drafts[0].reviewStatus).toBe("accepted");
    expect(done.drafts[0].committedEntityId).toBe(labPanelId);
  });

  it("reject then discard does not create labs", () => {
    const doc = saveDoc("reject.pdf");
    const job = createImportJob({
      documentId: doc.id,
      provider: "grok",
      model: "grok-4.5",
    });
    writeDraftsFromExtracted(job.id, sampleExtracted(1));
    setJobStatus(job.id, "ready");

    const draftId = getImportJob(job.id)!.drafts[0].id;
    rejectDraftPanel(draftId);

    let afterReject = getImportJob(job.id)!;
    expect(afterReject.drafts[0].reviewStatus).toBe("rejected");
    expect(afterReject.status).toBe("completed");
    expect(listLabPanels()).toHaveLength(0);

    // discard path with remaining pending
    const job2 = createImportJob({
      documentId: doc.id,
      provider: "ollama",
      model: "llama3.2",
    });
    writeDraftsFromExtracted(job2.id, sampleExtracted(2));
    setJobStatus(job2.id, "ready");
    discardImportJob(job2.id);

    const discarded = getImportJob(job2.id)!;
    expect(discarded.status).toBe("discarded");
    expect(discarded.drafts.every((d) => d.reviewStatus === "rejected")).toBe(true);
    expect(listLabPanels()).toHaveLength(0);
  });

  it("partial accept multi-panel leaves job ready until last pending resolved", () => {
    const doc = saveDoc("multi.pdf");
    const job = createImportJob({
      documentId: doc.id,
      provider: "ollama",
      model: "llama3.2",
    });
    writeDraftsFromExtracted(job.id, sampleExtracted(2));
    setJobStatus(job.id, "ready");

    const drafts = getImportJob(job.id)!.drafts;
    expect(drafts).toHaveLength(2);

    acceptDraftPanel(drafts[0].id);
    let mid = getImportJob(job.id)!;
    expect(mid.status).toBe("ready");
    expect(mid.drafts.filter((d) => d.reviewStatus === "pending")).toHaveLength(1);
    expect(listLabPanels()).toHaveLength(1);

    rejectDraftPanel(drafts[1].id);
    const done = getImportJob(job.id)!;
    expect(done.status).toBe("completed");
    expect(listLabPanels()).toHaveLength(1);
  });

  it("blocks document delete while job is open", () => {
    const doc = saveDoc("open.pdf");
    createImportJob({
      documentId: doc.id,
      provider: "ollama",
      model: "llama3.2",
    });

    expect(() => deleteDocument(doc.id)).toThrow(/open AI import/i);

    const job = getDb().select().from(importJobs).all()[0];
    setJobStatus(job.id, "ready");
    writeDraftsFromExtracted(job.id, sampleExtracted(1));
    expect(() => deleteDocument(doc.id)).toThrow(/open AI import/i);
  });

  it("can delete document after job completed or discarded (jobs cleaned)", () => {
    const doc1 = saveDoc("done.pdf");
    const job1 = createImportJob({
      documentId: doc1.id,
      provider: "ollama",
      model: "llama3.2",
    });
    writeDraftsFromExtracted(job1.id, sampleExtracted(1));
    setJobStatus(job1.id, "ready");
    acceptDraftPanel(getImportJob(job1.id)!.drafts[0].id);
    expect(getImportJob(job1.id)!.status).toBe("completed");

    deleteDocument(doc1.id);
    expect(
      getDb()
        .select()
        .from(importJobs)
        .all()
        .filter((j) => j.documentId === doc1.id),
    ).toHaveLength(0);
    // live lab remains
    expect(listLabPanels().length).toBeGreaterThanOrEqual(1);

    const doc2 = saveDoc("discard-doc.pdf");
    const job2 = createImportJob({
      documentId: doc2.id,
      provider: "ollama",
      model: "llama3.2",
    });
    writeDraftsFromExtracted(job2.id, sampleExtracted(1));
    setJobStatus(job2.id, "ready");
    discardImportJob(job2.id);

    deleteDocument(doc2.id);
    const remaining = getDb().select().from(importJobs).all();
    expect(remaining.every((j) => j.documentId !== doc2.id)).toBe(true);
  });

  it("acceptAllPending accepts every pending draft", () => {
    const doc = saveDoc("all.pdf");
    const job = createImportJob({
      documentId: doc.id,
      provider: "ollama",
      model: "llama3.2",
    });
    writeDraftsFromExtracted(job.id, sampleExtracted(2));
    setJobStatus(job.id, "ready");
    acceptAllPending(job.id);

    const done = getImportJob(job.id)!;
    expect(done.status).toBe("completed");
    expect(done.drafts.every((d) => d.reviewStatus === "accepted")).toBe(true);
    expect(listLabPanels()).toHaveLength(2);
    expect(getDb().select().from(labPanels).all().every((p) => p.source === "pdf_import")).toBe(
      true,
    );
  });
});
