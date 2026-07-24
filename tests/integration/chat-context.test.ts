import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { personaViews } from "@/server/db/schema";
import type { AIProvider } from "@/server/ai/types";
import { runChatTurn } from "@/server/ai/skills/chat";
import {
  addMessage,
  createThread,
  deleteThread,
  getThread,
  listThreads,
} from "@/server/services/chat";
import {
  acceptView,
  createDraftView,
} from "@/server/services/brief";
import { ensurePersonasSeeded } from "@/server/services/personas";
import type { ChartContextScope } from "@/server/ai/context";

useFreshDb();

class FakeProvider implements AIProvider {
  id: AIProvider["id"];
  textCalls = 0;
  lastSystem = "";
  lastUser = "";
  private replies: string[];

  constructor(id: AIProvider["id"], replies: string[] = ["Hello from co-pilot."]) {
    this.id = id;
    this.replies = replies;
  }

  async completeJson(): Promise<unknown> {
    throw new Error("completeJson should not be called by chat");
  }

  async completeText(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<string> {
    this.textCalls += 1;
    this.lastSystem = input.system;
    this.lastUser = input.user;
    const idx = Math.min(this.textCalls - 1, this.replies.length - 1);
    return this.replies[idx]!;
  }
}

const FULL_SCOPE: ChartContextScope = {
  profile: true,
  allergies: true,
  diagnoses: true,
  medications: true,
  supplements: true,
  labs: true,
  tests: true,
  procedures: true,
  acceptedViews: true,
  myPlan: true,
};

function countPersonaViews(): number {
  return getDb().select().from(personaViews).all().length;
}

describe("chat service", () => {
  it("createThread / listThreads / getThread / addMessage / deleteThread", () => {
    const thread = createThread({ title: "Labs Q&A" });
    expect(thread.id).toBeTruthy();
    expect(thread.title).toBe("Labs Q&A");

    expect(listThreads()).toHaveLength(1);

    addMessage({
      threadId: thread.id,
      role: "user",
      content: "What is my latest WBC?",
    });
    addMessage({
      threadId: thread.id,
      role: "assistant",
      content: "No labs on file yet.",
      provider: "ollama",
      model: "llama-test",
    });

    const loaded = getThread(thread.id)!;
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[0]!.role).toBe("user");
    expect(loaded.messages[1]!.role).toBe("assistant");
    expect(loaded.messages[1]!.provider).toBe("ollama");

    deleteThread(thread.id);
    expect(getThread(thread.id)).toBeNull();
    expect(listThreads()).toHaveLength(0);
  });
});

describe("runChatTurn", () => {
  it("persists assistant message and does not write persona_views", async () => {
    ensurePersonasSeeded();
    const before = countPersonaViews();

    const thread = createThread({ title: "Chat test" });
    const provider = new FakeProvider("ollama", [
      "Based on the chart, no acute issues noted.",
    ]);

    const { assistantMessage } = await runChatTurn({
      threadId: thread.id,
      userMessage: "Any red flags?",
      provider: "ollama",
      model: "llama-test",
      scope: FULL_SCOPE,
      deps: { provider },
    });

    expect(assistantMessage).toContain("no acute issues");
    expect(provider.textCalls).toBe(1);

    const loaded = getThread(thread.id)!;
    expect(loaded.messages).toHaveLength(2);
    expect(loaded.messages[0]!.role).toBe("user");
    expect(loaded.messages[0]!.content).toBe("Any red flags?");
    expect(loaded.messages[1]!.role).toBe("assistant");
    expect(loaded.messages[1]!.content).toBe(assistantMessage);
    expect(loaded.messages[1]!.provider).toBe("ollama");
    expect(loaded.messages[1]!.model).toBe("llama-test");

    expect(countPersonaViews()).toBe(before);

    expect(provider.lastSystem).toMatch(/cannot write chart brief memory/i);
    expect(provider.lastSystem).toMatch(/Evaluate/i);
    expect(provider.lastUser).toContain("Any red flags?");
  });

  it("accepted view text can appear in chat context", async () => {
    ensurePersonasSeeded();
    const before = countPersonaViews();

    const draft = createDraftView({
      personaId: "gi",
      bodyMd:
        "UNIQUE_ACCEPTED_VIEW_MARKER_xyz: consider fecal calprotectin trend.",
      title: "GI accepted note",
      topics: ["labs"],
      provider: "ollama",
      model: "llama-test",
    });
    acceptView(draft.id);
    expect(countPersonaViews()).toBe(before + 1);

    const thread = createThread();
    const provider = new FakeProvider("ollama", [
      "Calprotectin was discussed in the GI view.",
    ]);

    await runChatTurn({
      threadId: thread.id,
      userMessage: "What did GI say about calprotectin?",
      provider: "ollama",
      model: "llama-test",
      scope: { acceptedViews: true },
      deps: { provider },
    });

    expect(provider.lastUser).toContain("UNIQUE_ACCEPTED_VIEW_MARKER_xyz");
    // Still no extra views from chat
    expect(countPersonaViews()).toBe(before + 1);
  });

  it("draft views are not injected into chat context", async () => {
    ensurePersonasSeeded();
    createDraftView({
      personaId: "pcp",
      bodyMd: "DRAFT_SHOULD_NOT_LEAK_abc123",
      provider: "ollama",
      model: "llama-test",
    });

    const thread = createThread();
    const provider = new FakeProvider("ollama", ["ok"]);

    await runChatTurn({
      threadId: thread.id,
      userMessage: "Summarize peer views",
      provider: "ollama",
      model: "llama-test",
      scope: { acceptedViews: true },
      deps: { provider },
    });

    expect(provider.lastUser).not.toContain("DRAFT_SHOULD_NOT_LEAK_abc123");
  });

  it("optional persona lens is included in system prompt", async () => {
    ensurePersonasSeeded();
    const thread = createThread({ personaId: "gi" });
    const provider = new FakeProvider("ollama", ["GI lens reply"]);

    await runChatTurn({
      threadId: thread.id,
      userMessage: "Any GI concerns?",
      personaId: "gi",
      provider: "ollama",
      model: "llama-test",
      scope: FULL_SCOPE,
      deps: { provider },
    });

    expect(provider.lastSystem).toMatch(/GI|gastro|lens/i);
    expect(provider.lastSystem).toMatch(/cannot write chart brief memory/i);
  });

  it("grok runs without cloud confirm gate", async () => {
    const thread = createThread();
    const provider = new FakeProvider("grok", ["Cloud reply"]);

    const { assistantMessage } = await runChatTurn({
      threadId: thread.id,
      userMessage: "Hi from cloud",
      provider: "grok",
      model: "grok-test",
      scope: { profile: true },
      deps: { provider },
    });

    expect(provider.textCalls).toBe(1);
    expect(assistantMessage).toBe("Cloud reply");
    expect(getThread(thread.id)!.messages).toHaveLength(2);
  });

  it("includes prior messages in the prompt (last ~20)", async () => {
    const thread = createThread();
    addMessage({
      threadId: thread.id,
      role: "user",
      content: "PRIOR_USER_MSG_zzz",
    });
    addMessage({
      threadId: thread.id,
      role: "assistant",
      content: "PRIOR_ASSISTANT_MSG_zzz",
    });

    const provider = new FakeProvider("ollama", ["ok"]);
    await runChatTurn({
      threadId: thread.id,
      userMessage: "Follow-up question",
      provider: "ollama",
      model: "llama-test",
      scope: {},
      deps: { provider },
    });

    expect(provider.lastUser).toContain("PRIOR_USER_MSG_zzz");
    expect(provider.lastUser).toContain("PRIOR_ASSISTANT_MSG_zzz");
    expect(provider.lastUser).toContain("Follow-up question");
  });
});
