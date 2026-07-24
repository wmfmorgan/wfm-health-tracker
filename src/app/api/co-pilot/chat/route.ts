import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertAuthenticated, UnauthorizedError } from "@/server/auth/guard";
import { runChatTurn } from "@/server/ai/skills/chat";

const scopeSchema = z
  .object({
    profile: z.boolean().optional(),
    allergies: z.boolean().optional(),
    diagnoses: z.boolean().optional(),
    medications: z.boolean().optional(),
    supplements: z.boolean().optional(),
    labs: z.boolean().optional(),
    tests: z.boolean().optional(),
    procedures: z.boolean().optional(),
    acceptedViews: z.boolean().optional(),
    myPlan: z.boolean().optional(),
  })
  .default({});

const bodySchema = z.object({
  threadId: z.string().min(1),
  userMessage: z.string().min(1),
  personaId: z.string().min(1).optional().nullable(),
  provider: z.enum(["grok", "ollama"]),
  model: z.string().min(1),
  scope: scopeSchema,
});

export async function POST(req: NextRequest) {
  try {
    await assertAuthenticated();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false as const, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false as const,
          error: parsed.error.issues.map((i) => i.message).join("; "),
        },
        { status: 400 },
      );
    }

    const { assistantMessage } = await runChatTurn(parsed.data);
    return NextResponse.json({ ok: true as const, assistantMessage });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "chat failed";
    return NextResponse.json(
      { ok: false as const, error: message },
      { status: 400 },
    );
  }
}
