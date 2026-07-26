import Link from "next/link";
import { SessionForm } from "@/components/vitals/session-form";
import { createSessionAction } from "@/server/actions/metrics";
import { getProfile } from "@/server/services/profile";

export const dynamic = "force-dynamic";

function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function NewSessionPage() {
  const profile = getProfile();

  return (
    <div className="mx-auto max-w-3xl text-zinc-900">
      <div className="mb-6">
        <Link
          href="/vitals"
          className="text-sm text-zinc-600 underline-offset-2 hover:underline"
        >
          ← Vitals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Log body composition
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Enter fields from a device report (e.g. InBody). Leave unused metrics
          blank.
        </p>
      </div>

      <SessionForm
        action={asFormAction(createSessionAction)}
        preferredLengthUnit={profile.preferredLengthUnit ?? "in"}
        preferredWeightUnit={profile.preferredWeightUnit ?? "lb"}
        submitLabel="Save session"
      />
    </div>
  );
}
