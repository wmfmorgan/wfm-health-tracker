import { redirect } from "next/navigation";
import { authEnabled } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (!authEnabled()) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter the app passcode to access your health records.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </main>
  );
}
