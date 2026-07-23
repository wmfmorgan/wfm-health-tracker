"use server";

import { revalidatePath } from "next/cache";
import {
  createThread,
  deleteThread,
} from "@/server/services/chat";

function revalidateChatPaths() {
  revalidatePath("/co-pilot");
}

export async function createThreadAction(input?: {
  title?: string | null;
  personaId?: string | null;
}) {
  const thread = createThread({
    title: input?.title,
    personaId: input?.personaId,
  });
  revalidateChatPaths();
  return { ok: true as const, threadId: thread.id, thread };
}

export async function deleteThreadAction(threadId: string) {
  deleteThread(threadId);
  revalidateChatPaths();
  return { ok: true as const, threadId };
}
