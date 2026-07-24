import type { ChartContextScope } from "@/server/ai/context";
import { buildChartContext } from "@/server/ai/context";
import { resolveEffectivePrompt } from "@/server/ai/personas/resolve";
import { SAFETY_SYSTEM_SUFFIX } from "@/server/ai/safety";
import type { AIProvider, AIProviderId } from "@/server/ai/types";
import { getAIProvider } from "@/server/ai/router";
import { getSkill } from "@/server/ai/skills/registry";
import { getPersona } from "@/server/services/personas";
import { addMessage, getThread, listMessages } from "@/server/services/chat";
import { getAiSettings } from "@/server/services/settings";

const HISTORY_LIMIT = 20;

/** User checkboxes further restrict skill defaults (AND). */
export function mergeSkillScope(
  skillDefault: ChartContextScope,
  userScope: ChartContextScope,
): ChartContextScope {
  const keys = [
    "profile",
    "allergies",
    "diagnoses",
    "medications",
    "supplements",
    "labs",
    "tests",
    "procedures",
    "acceptedViews",
    "myPlan",
  ] as const;
  const out: ChartContextScope = {};
  for (const k of keys) {
    const s = skillDefault[k] === true;
    const u = userScope[k] !== false; // undefined counts as allow
    out[k] = s && u;
  }
  return out;
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

export async function runSkillInChat(opts: {
  skillName: string;
  args: string;
  threadId: string;
  personaId?: string | null;
  provider: AIProviderId;
  model: string;
  scope: ChartContextScope;
  deps?: { provider?: AIProvider };
}): Promise<{ assistantMessage: string; skillName: string }> {
  const skill = getSkill(opts.skillName);
  if (!skill) {
    throw new Error(`Unknown skill: ${opts.skillName}`);
  }

  const thread = getThread(opts.threadId);
  if (!thread) throw new Error(`Chat thread not found: ${opts.threadId}`);

  const userVisible = opts.args
    ? `/${skill.name} ${opts.args}`
    : `/${skill.name}`;

  addMessage({
    threadId: opts.threadId,
    role: "user",
    content: userVisible,
  });

  const mergedScope = mergeSkillScope(skill.wfm.defaultScope, opts.scope);
  const context = buildChartContext({ scope: mergedScope });

  const parts: string[] = [];
  if (skill.wfm.allowPersona && opts.personaId) {
    const persona = getPersona(opts.personaId);
    if (persona?.isEnabled) {
      parts.push(
        resolveEffectivePrompt({
          systemPromptDefault: persona.systemPromptDefault,
          systemPromptOverride: persona.systemPromptOverride,
        }),
      );
      parts.push(
        `Apply this clinical lens (${persona.name}) while executing the skill.`,
      );
    }
  }
  parts.push(`# Skill: ${skill.name}\n\n${skill.body}`);
  parts.push(SAFETY_SYSTEM_SUFFIX);
  parts.push(
    "You cannot write chart brief memory or clinical records. Chat-only reply. Separate FACTS from OPINIONS.",
  );
  const system = parts.join("\n\n");

  const recentDesc = listMessages(opts.threadId, {
    limit: HISTORY_LIMIT,
    order: "desc",
  });
  const history = recentDesc.slice().reverse();
  const user = [
    "Chart context:",
    context.text,
    "",
    "Recent conversation:",
    formatHistory(history),
    "",
    `Skill invocation: /${skill.name}`,
    opts.args ? `Arguments: ${opts.args}` : "Arguments: (none)",
    "",
    "Execute the skill instructions using the chart context. Respond helpfully.",
  ].join("\n");

  const settings = getAiSettings();
  const ai =
    opts.deps?.provider ??
    getAIProvider(opts.provider, settings.ollamaBaseUrl);

  const text = await ai.completeText({ system, user, model: opts.model });
  const assistantMessage = text.trim();
  if (!assistantMessage) throw new Error("Model returned empty response");

  addMessage({
    threadId: opts.threadId,
    role: "assistant",
    content: assistantMessage,
    provider: opts.provider,
    model: opts.model,
  });

  return { assistantMessage, skillName: skill.name };
}
