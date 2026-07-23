import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import type { AIProvider } from "@/server/ai/types";
import {
  CloudConfirmRequiredError,
  estimateEvaluateContextChars,
  runEvaluatePersona,
} from "@/server/ai/skills/evaluate";
import { ensurePersonasSeeded } from "@/server/services/personas";
import {
  acceptView,
  getView,
  listCurrentAcceptedViews,
} from "@/server/services/brief";

useFreshDb();

class FakeProvider implements AIProvider {
  id: AIProvider["id"];
  jsonCalls = 0;
  textCalls = 0;

  constructor(
    id: AIProvider["id"],
    private payloads: unknown[],
  ) {
    this.id = id;
  }

  async completeJson(): Promise<unknown> {
    const payload =
      this.payloads[Math.min(this.jsonCalls, this.payloads.length - 1)];
    this.jsonCalls += 1;
    return payload;
  }

  async completeText(): Promise<string> {
    this.textCalls += 1;
    return "fake free text";
  }
}

const sampleEvaluateResult = {
  title: "GI review",
  bodyMd: "## Summary\nPatient chart reviewed from GI lens.",
  sections: { summary: "Stable GI picture." },
  topics: ["gi", "meds"],
  citations: [
    { entityType: "diagnosis", entityId: "d1", label: "UC" },
  ],
  facts: ["Diagnosis of UC on chart"],
  opinions: ["Consider follow-up colonoscopy timing"],
};

describe("runEvaluatePersona", () => {
  it("writes a draft view that is not in listCurrentAcceptedViews", async () => {
    ensurePersonasSeeded();
    const provider = new FakeProvider("ollama", [sampleEvaluateResult]);

    const { viewId, charCount } = await runEvaluatePersona({
      personaId: "gi",
      focusNote: "focus on flares",
      provider: "ollama",
      model: "llama-test",
      deps: { provider },
    });

    expect(viewId).toBeTruthy();
    expect(charCount).toBeGreaterThanOrEqual(0);
    expect(provider.jsonCalls).toBe(1);

    const view = getView(viewId)!;
    expect(view.status).toBe("draft");
    expect(view.version).toBe(0);
    expect(view.bodyMd).toContain("GI lens");
    expect(view.provider).toBe("ollama");
    expect(view.model).toBe("llama-test");
    expect(view.focusNote).toBe("focus on flares");
    expect(view.title).toBe("GI review");

    expect(listCurrentAcceptedViews()).toEqual([]);
  });

  it("accept then appears in listCurrentAcceptedViews", async () => {
    ensurePersonasSeeded();
    const provider = new FakeProvider("ollama", [sampleEvaluateResult]);

    const { viewId } = await runEvaluatePersona({
      personaId: "pcp",
      provider: "ollama",
      model: "llama-test",
      deps: { provider },
    });

    expect(listCurrentAcceptedViews()).toEqual([]);

    const accepted = acceptView(viewId);
    expect(accepted.status).toBe("accepted");
    expect(accepted.version).toBe(1);

    const listed = listCurrentAcceptedViews();
    expect(listed).toHaveLength(1);
    expect(listed[0]!.id).toBe(viewId);
    expect(listed[0]!.personaId).toBe("pcp");
  });

  it("grok without cloudConfirmed throws CLOUD_CONFIRM_REQUIRED", async () => {
    ensurePersonasSeeded();
    const provider = new FakeProvider("grok", [sampleEvaluateResult]);

    await expect(
      runEvaluatePersona({
        personaId: "gi",
        provider: "grok",
        model: "grok-test",
        deps: { provider },
      }),
    ).rejects.toMatchObject({
      code: "CLOUD_CONFIRM_REQUIRED",
      name: "CloudConfirmRequiredError",
    });

    expect(provider.jsonCalls).toBe(0);

    try {
      await runEvaluatePersona({
        personaId: "gi",
        provider: "grok",
        model: "grok-test",
        deps: { provider },
      });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(CloudConfirmRequiredError);
      expect((e as CloudConfirmRequiredError).charCount).toBeGreaterThanOrEqual(
        0,
      );
    }
  });

  it("grok with cloudConfirmed runs and writes draft", async () => {
    ensurePersonasSeeded();
    const provider = new FakeProvider("grok", [sampleEvaluateResult]);

    const { viewId } = await runEvaluatePersona({
      personaId: "gi",
      provider: "grok",
      model: "grok-test",
      cloudConfirmed: true,
      deps: { provider },
    });

    expect(provider.jsonCalls).toBe(1);
    const view = getView(viewId)!;
    expect(view.status).toBe("draft");
    expect(view.provider).toBe("grok");
  });

  it("repairs once on invalid payload then succeeds", async () => {
    ensurePersonasSeeded();
    const provider = new FakeProvider("ollama", [
      { bodyMd: "" },
      sampleEvaluateResult,
    ]);

    const { viewId } = await runEvaluatePersona({
      personaId: "gi",
      provider: "ollama",
      model: "llama-test",
      deps: { provider },
    });

    expect(provider.jsonCalls).toBe(2);
    expect(getView(viewId)!.status).toBe("draft");
  });

  it("estimateEvaluateContextChars returns non-negative number", () => {
    ensurePersonasSeeded();
    const n = estimateEvaluateContextChars("gi");
    expect(typeof n).toBe("number");
    expect(n).toBeGreaterThanOrEqual(0);
  });
});
