import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { personaViews } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ensurePersonasSeeded } from "@/server/services/personas";
import {
  createDraftView,
  getView,
  listViewsForPersona,
  getCurrentAcceptedView,
  listCurrentAcceptedViews,
  updateDraftView,
  acceptView,
  rejectView,
  listVersionHistory,
  getMyPlan,
  saveMyPlan,
  listTopicConflicts,
  parseViewTopics,
  parseFactOpinion,
} from "@/server/services/brief";
import { detectTopicConflicts } from "@/lib/brief/conflicts";

useFreshDb();

function seed() {
  ensurePersonasSeeded();
}

describe("brief service — draft lifecycle", () => {
  it("createDraftView writes draft; draft excluded from listCurrentAcceptedViews", () => {
    seed();
    const draft = createDraftView({
      personaId: "gi",
      bodyMd: "# GI draft\nFindings…",
      topics: ["meds", "diet"],
      citations: [
        { entityType: "medication", entityId: "m1", label: "Mesalamine" },
      ],
      facts: ["Patient on mesalamine"],
      opinions: ["Consider diet trial"],
      provider: "ollama",
      model: "llama3",
      focusNote: "focus on meds",
    });

    expect(draft.status).toBe("draft");
    expect(draft.version).toBe(0);
    expect(draft.acceptedAt).toBeNull();
    expect(parseViewTopics(draft.topicsJson)).toEqual(["meds", "diet"]);
    expect(parseFactOpinion(draft.factOpinionJson)).toEqual({
      facts: ["Patient on mesalamine"],
      opinions: ["Consider diet trial"],
    });

    expect(listCurrentAcceptedViews()).toEqual([]);
    expect(getCurrentAcceptedView("gi")).toBeUndefined();

    const listed = listViewsForPersona("gi");
    expect(listed).toHaveLength(1);
    expect(listed[0]!.id).toBe(draft.id);
  });

  it("at most one draft per persona; replaceExistingDraft rejects prior draft", () => {
    seed();
    const first = createDraftView({
      personaId: "gi",
      bodyMd: "first",
      provider: "test",
      model: "test",
    });

    expect(() =>
      createDraftView({
        personaId: "gi",
        bodyMd: "second",
        provider: "test",
        model: "test",
      }),
    ).toThrow(/already has a draft/);

    const second = createDraftView({
      personaId: "gi",
      bodyMd: "second",
      provider: "test",
      model: "test",
      replaceExistingDraft: true,
    });

    expect(second.id).not.toBe(first.id);
    expect(second.bodyMd).toBe("second");
    expect(getView(first.id)!.status).toBe("rejected");
    expect(
      listViewsForPersona("gi").filter((v) => v.status === "draft"),
    ).toHaveLength(1);
  });

  it("updateDraftView edits body and metadata", () => {
    seed();
    const draft = createDraftView({
      personaId: "pcp",
      bodyMd: "old",
      provider: "test",
      model: "test",
    });
    const updated = updateDraftView(draft.id, {
      bodyMd: "new body",
      title: "PCP eval",
      topics: ["labs"],
      facts: ["HbA1c elevated"],
    });
    expect(updated.bodyMd).toBe("new body");
    expect(updated.title).toBe("PCP eval");
    expect(parseViewTopics(updated.topicsJson)).toEqual(["labs"]);
    expect(parseFactOpinion(updated.factOpinionJson).facts).toEqual([
      "HbA1c elevated",
    ]);
  });
});

describe("brief service — accept / reject / versioning", () => {
  it("accept creates version 1; second accept → version 2 and supersedes first", () => {
    seed();
    const d1 = createDraftView({
      personaId: "gi",
      bodyMd: "v1 body",
      provider: "test",
      model: "test",
    });
    const a1 = acceptView(d1.id);
    expect(a1.status).toBe("accepted");
    expect(a1.version).toBe(1);
    expect(a1.acceptedAt).toBeTruthy();

    const current = getCurrentAcceptedView("gi");
    expect(current?.id).toBe(a1.id);
    expect(listCurrentAcceptedViews().map((v) => v.id)).toEqual([a1.id]);

    const d2 = createDraftView({
      personaId: "gi",
      bodyMd: "v2 body",
      provider: "test",
      model: "test",
      parentViewId: a1.id,
    });
    const a2 = acceptView(d2.id);
    expect(a2.status).toBe("accepted");
    expect(a2.version).toBe(2);

    const prior = getView(a1.id)!;
    expect(prior.status).toBe("superseded");
    expect(prior.version).toBe(1);

    expect(getCurrentAcceptedView("gi")!.id).toBe(a2.id);
    expect(listCurrentAcceptedViews()).toHaveLength(1);
    expect(listCurrentAcceptedViews()[0]!.version).toBe(2);

    const history = listVersionHistory("gi");
    expect(history.map((v) => ({ version: v.version, status: v.status }))).toEqual(
      [
        { version: 1, status: "superseded" },
        { version: 2, status: "accepted" },
      ],
    );
  });

  it("reject leaves no accepted view", () => {
    seed();
    const draft = createDraftView({
      personaId: "pharmacist",
      bodyMd: "to reject",
      provider: "test",
      model: "test",
    });
    const rejected = rejectView(draft.id);
    expect(rejected.status).toBe("rejected");
    expect(getCurrentAcceptedView("pharmacist")).toBeUndefined();
    expect(listCurrentAcceptedViews()).toEqual([]);
    expect(listVersionHistory("pharmacist")).toEqual([]);
  });

  it("cannot accept or reject non-draft views", () => {
    seed();
    const draft = createDraftView({
      personaId: "gi",
      bodyMd: "x",
      provider: "test",
      model: "test",
    });
    acceptView(draft.id);
    expect(() => acceptView(draft.id)).toThrow(/Only draft/);
    expect(() => rejectView(draft.id)).toThrow(/Only draft/);
    expect(() => updateDraftView(draft.id, { bodyMd: "nope" })).toThrow(
      /Only draft/,
    );
  });
});

describe("brief service — topic conflicts", () => {
  it("two personas with shared topic produce a conflict entry", () => {
    seed();
    const gi = createDraftView({
      personaId: "gi",
      bodyMd: "gi",
      topics: ["meds", "diet"],
      provider: "test",
      model: "test",
    });
    const pcp = createDraftView({
      personaId: "pcp",
      bodyMd: "pcp",
      topics: ["meds", "labs"],
      provider: "test",
      model: "test",
    });
    acceptView(gi.id);
    acceptView(pcp.id);

    // Pure helper with parsed topics
    const accepted = getDb()
      .select()
      .from(personaViews)
      .where(eq(personaViews.status, "accepted"))
      .all();
    const conflicts = detectTopicConflicts(
      accepted.map((v) => ({
        personaId: v.personaId,
        topics: parseViewTopics(v.topicsJson),
      })),
    );
    expect(conflicts).toEqual([
      { topic: "meds", personaIds: ["gi", "pcp"] },
    ]);

    // Service helper
    expect(listTopicConflicts()).toEqual([
      { topic: "meds", personaIds: ["gi", "pcp"] },
    ]);
  });
});

describe("brief service — my plan", () => {
  it("getMyPlan is empty until saveMyPlan", () => {
    seed();
    expect(getMyPlan()).toBeUndefined();
    const saved = saveMyPlan("## My goals\n- Sleep more");
    expect(saved.id).toBe("default");
    expect(saved.bodyMd).toContain("Sleep more");
    expect(getMyPlan()?.bodyMd).toContain("Sleep more");

    saveMyPlan("updated plan");
    expect(getMyPlan()?.bodyMd).toBe("updated plan");
  });
});
