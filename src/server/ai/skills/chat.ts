import {
  buildChartContext,
  type ChartContextScope,
} from "@/server/ai/context";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";
import type { AIProvider, AIProviderId } from "@/server/ai/types";
import { getAIProvider } from "@/server/ai/router";
import { getPersona } from "@/server/services/personas";
import {
  addMessage,
  getThread,
  listMessages,
} from "@/server/services/chat";
import { getAiSettings } from "@/server/services/settings";
import { getSkill, parseSlashCommand } from "@/server/ai/skills/registry";
import { runSkillInChat } from "@/server/ai/skills/runner";
import {
  createSkillHelpMessage,
  formatSkillsList,
  handleCreateSkillSave,
  handleDeleteSkill,
} from "@/server/ai/skills/meta-skills";

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
  deps?: {
    provider?: AIProvider;
    buildContext?: typeof buildChartContext;
  };
}): Promise<{ assistantMessage: string; skillName?: string }> {
  const {
    threadId,
    userMessage,
    personaId,
    provider: providerId,
    model,
    scope,
  } = opts;

  const content = userMessage.trim();
  if (!content) {
    throw new Error("userMessage is required");
  }

  const thread = getThread(threadId);
  if (!thread) {
    throw new Error(`Chat thread not found: ${threadId}`);
  }

  // Slash commands / skills
  const slash = parseSlashCommand(content);
  if (slash) {
    if (slash.skillName === "skills" || slash.skillName === "help") {
      addMessage({ threadId, role: "user", content });
      const msg = formatSkillsList();
      addMessage({
        threadId,
        role: "assistant",
        content: msg,
        provider: providerId,
        model,
      });
      return { assistantMessage: msg, skillName: slash.skillName };
    }

    if (slash.skillName === "delete-skill") {
      addMessage({ threadId, role: "user", content });
      const meta = handleDeleteSkill(slash.args);
      addMessage({
        threadId,
        role: "assistant",
        content: meta.assistantMessage,
        provider: providerId,
        model,
      });
      return {
        assistantMessage: meta.assistantMessage,
        skillName: meta.skillName,
      };
    }

    if (slash.skillName === "create-skill") {
      const saved = handleCreateSkillSave(slash.args);
      if (saved) {
        addMessage({ threadId, role: "user", content });
        addMessage({
          threadId,
          role: "assistant",
          content: saved.assistantMessage,
          provider: providerId,
          model,
        });
        return {
          assistantMessage: saved.assistantMessage,
          skillName: saved.skillName,
        };
      }
      if (!slash.args.trim()) {
        addMessage({ threadId, role: "user", content });
        const help = createSkillHelpMessage();
        addMessage({
          threadId,
          role: "assistant",
          content: help,
          provider: providerId,
          model,
        });
        return { assistantMessage: help, skillName: "create-skill" };
      }
      // Incomplete create → LLM helps draft using create-skill body
      return runSkillInChat({
        skillName: "create-skill",
        args: slash.args,
        threadId,
        personaId: null,
        provider: providerId,
        model,
        scope,
        deps: opts.deps,
      });
    }

    if (!getSkill(slash.skillName)) {
      addMessage({ threadId, role: "user", content });
      const assistantMessage = `Unknown skill \`/${slash.skillName}\`.\n\nType \`/skills\` to list available skills, or \`/create-skill\` to author a custom one.`;
      addMessage({
        threadId,
        role: "assistant",
        content: assistantMessage,
        provider: providerId,
        model,
      });
      return { assistantMessage, skillName: slash.skillName };
    }

    return runSkillInChat({
      skillName: slash.skillName,
      args: slash.args,
      threadId,
      personaId,
      provider: providerId,
      model,
      scope,
      deps: opts.deps,
    });
  }

  const buildContext = opts.deps?.buildContext ?? buildChartContext;
  const context = buildContext({
    scope,
  });

  addMessage({
    threadId,
    role: "user",
    content,
  });

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

  return { assistantMessage: assistantText };
}
