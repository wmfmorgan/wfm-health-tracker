import {
  buildChartContext,
  type ChartContextScope,
} from "@/server/ai/context";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";
import type { AIProvider, AIProviderId } from "@/server/ai/types";
import { getAIProvider } from "@/server/ai/router";
import { CloudConfirmRequiredError } from "@/server/ai/skills/evaluate";
import { getPersona } from "@/server/services/personas";
import {
  addMessage,
  getThread,
  listMessages,
} from "@/server/services/chat";
import { getAiSettings } from "@/server/services/settings";

const HISTORY_LIMIT = 20;

const CHAT_MEMORY_RULE =
  "You cannot write chart brief memory. Chat replies are not saved as durable persona views. If the user wants durable findings on their chart brief, suggest they run Evaluate with an appropriate persona (and an optional focus note). Do not claim you have updated the brief.";

const BASE_CHAT_SYSTEM = `You are a co-pilot for a personal health chart. Answer questions using the provided chart context and conversation history. Separate FACTS (from chart data) from OPINIONS. If data is missing, say so.`;

function buildChatSystem(personaId?: string | null): string {
  const parts: string[] = [];

  if (personaId) {
    const persona = getPersona(personaId);
    if (!persona) {
      throw new Error(`Persona not found: ${personaId}`);
    }
    if (!persona.isEnabled) {
      throw new Error(`Persona is disabled: ${personaId}`);
    }
    parts.push(
      resolveEffectivePrompt({
        systemPromptDefault: persona.systemPromptDefault,
        systemPromptOverride: persona.systemPromptOverride,
      }),
    );
    parts.push(
      `You are answering free-form chat questions through this persona's clinical lens (${persona.name}).`,
    );
  } else {
    parts.push(`${BASE_CHAT_SYSTEM}\n\n${SAFETY_SYSTEM_SUFFIX}`);
  }

  parts.push(CHAT_MEMORY_RULE);
  return parts.join("\n\n");
}

function formatHistory(
  messages: Array<{ role: string; content: string }>,
): string {
  if (messages.length === 0) return "(no prior messages)";
  return messages
    .map((m) => {
      const label =
        m.role === "assistant"
          ? "Assistant"
          : m.role === "system"
            ? "System"
            : "User";
      return `${label}: ${m.content}`;
    })
    .join("\n\n");
}

function buildUserPrompt(opts: {
  contextText: string;
  history: Array<{ role: string; content: string }>;
}): string {
  return [
    "Chart context (live chart facts + accepted views only; drafts excluded):",
    opts.contextText || "(empty context — scope may exclude all sections)",
    "",
    "Conversation (most recent messages, oldest first):",
    formatHistory(opts.history),
    "",
    "Respond to the latest user message. Use chart context when relevant; do not invent data.",
  ].join("\n");
}

export async function runChatTurn(opts: {
  threadId: string;
  userMessage: string;
  personaId?: string | null;
  provider: AIProviderId;
  model: string;
  scope: ChartContextScope;
  cloudConfirmed?: boolean;
  deps?: {
    provider?: AIProvider;
    buildContext?: typeof buildChartContext;
  };
}): Promise<{ assistantMessage: string }> {
  const {
    threadId,
    userMessage,
    personaId,
    provider: providerId,
    model,
    scope,
    cloudConfirmed,
  } = opts;

  const content = userMessage.trim();
  if (!content) {
    throw new Error("userMessage is required");
  }

  const thread = getThread(threadId);
  if (!thread) {
    throw new Error(`Chat thread not found: ${threadId}`);
  }

  const buildContext = opts.deps?.buildContext ?? buildChartContext;
  const context = buildContext({
    scope,
    // When chatting under a persona lens, still include that persona's accepted
    // view if present — chat is not rewriting it. No excludePersonaId.
  });

  if (providerId === "grok" && !cloudConfirmed) {
    throw new CloudConfirmRequiredError(context.charCount);
  }

  // Persist user message first so history includes it.
  addMessage({
    threadId,
    role: "user",
    content,
  });

  // Last ~20 messages (includes the user message just written), oldest first.
  const recentDesc = listMessages(threadId, {
    limit: HISTORY_LIMIT,
    order: "desc",
  });
  const history = recentDesc.slice().reverse();

  const system = buildChatSystem(personaId);
  const user = buildUserPrompt({
    contextText: context.text,
    history,
  });

  const settings = getAiSettings();
  const ai: AIProvider =
    opts.deps?.provider ??
    getAIProvider(providerId, settings.ollamaBaseUrl);

  const assistantText = await ai.completeText({ system, user, model });
  if (!assistantText?.trim()) {
    throw new Error("Chat provider returned empty content");
  }

  addMessage({
    threadId,
    role: "assistant",
    content: assistantText,
    provider: providerId,
    model,
  });

  // Intentionally never calls createDraftView / brief memory writers.
  return { assistantMessage: assistantText };
}
