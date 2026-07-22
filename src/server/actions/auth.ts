"use server";

import { redirect } from "next/navigation";
import { authEnabled, getSession } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";

export type LoginState = { ok: false; error: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!authEnabled()) redirect("/");

  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password, process.env.APP_PASSWORD!)) {
    return { ok: false as const, error: "Invalid passcode" };
  }

  const session = await getSession();
  session.authenticated = true;
  await session.save();
  redirect("/");
}

export async function logoutAction() {
  if (!authEnabled()) redirect("/");
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
