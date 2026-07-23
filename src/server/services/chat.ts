import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { chatMessages, chatThreads } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";

export type ChatRole = "user" | "assistant" | "system";

export function createThread(input?: {
  title?: string | null;
  personaId?: string | null;
}) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(chatThreads)
    .values({
      id,
      title: input?.title?.trim() || null,
      personaId: input?.personaId ?? null,
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getThreadMeta(id)!;
}

export function listThreads() {
  bootstrapDb();
  return getDb()
    .select()
    .from(chatThreads)
    .orderBy(desc(chatThreads.updatedAt))
    .all();
}

function getThreadMeta(id: string) {
  bootstrapDb();
  return getDb()
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.id, id))
    .get();
}

export function getThread(id: string) {
  bootstrapDb();
  const thread = getThreadMeta(id);
  if (!thread) return null;
  const messages = getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, id))
    .orderBy(asc(chatMessages.createdAt))
    .all();
  return { ...thread, messages };
}

export function listMessages(
  threadId: string,
  opts?: { limit?: number; order?: "asc" | "desc" },
) {
  bootstrapDb();
  const limit = opts?.limit;
  const order = opts?.order ?? "asc";
  const q = getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(
      order === "desc"
        ? desc(chatMessages.createdAt)
        : asc(chatMessages.createdAt),
    );
  if (limit != null) {
    return q.limit(limit).all();
  }
  return q.all();
}

export function addMessage(input: {
  threadId: string;
  role: ChatRole;
  content: string;
  provider?: string | null;
  model?: string | null;
}) {
  bootstrapDb();
  const thread = getThreadMeta(input.threadId);
  if (!thread) {
    throw new Error(`Chat thread not found: ${input.threadId}`);
  }

  const id = newId();
  const t = nowIso();
  getDb()
    .insert(chatMessages)
    .values({
      id,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      provider: input.provider ?? null,
      model: input.model ?? null,
      createdAt: t,
    })
    .run();

  getDb()
    .update(chatThreads)
    .set({ updatedAt: t })
    .where(eq(chatThreads.id, input.threadId))
    .run();

  return getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, id))
    .get()!;
}

export function deleteThread(id: string) {
  bootstrapDb();
  const existing = getThreadMeta(id);
  if (!existing) {
    throw new Error(`Chat thread not found: ${id}`);
  }
  // chat_messages cascade via FK
  getDb().delete(chatThreads).where(eq(chatThreads.id, id)).run();
  return { ok: true as const, id };
}
