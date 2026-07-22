import { ageFromDob } from "@/lib/dates";
import { getProfile } from "@/server/services/profile";
import { listAllergies } from "@/server/services/allergies";
import { saveProfileAction } from "@/server/actions/profile";
import { createAllergyAction, deleteAllergyAction } from "@/server/actions/allergies";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** React form `action` types expect void; keep structured action results for callers. */
function asFormAction(fn: (...args: never[]) => unknown): (formData: FormData) => Promise<void> {
  return fn as (formData: FormData) => Promise<void>;
}

export default function ProfilePage() {
  const profile = getProfile();
  const allergies = listAllergies();
  const age = ageFromDob(profile.dateOfBirth);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 text-zinc-900">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <Link href="/" className="text-sm text-zinc-600 underline-offset-2 hover:underline">
          Home
        </Link>
      </div>

      <section className="mb-10 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Demographics & baseline</h2>
        {age != null && (
          <p className="mb-4 text-sm text-zinc-600">
            Age: <span className="font-medium text-zinc-900">{age} years</span>
          </p>
        )}

        <form action={asFormAction(saveProfileAction)} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Display name</span>
            <input
              name="displayName"
              defaultValue={profile.displayName ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Date of birth</span>
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={profile.dateOfBirth ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Sex</span>
            <input
              name="sex"
              defaultValue={profile.sex ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="e.g. male, female, other"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Height</span>
            <div className="flex gap-2">
              <input
                name="heightValue"
                type="number"
                step="any"
                min="0"
                defaultValue={profile.heightValue ?? ""}
                className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2"
              />
              <select
                name="heightUnit"
                defaultValue={profile.heightUnit ?? profile.preferredLengthUnit ?? "cm"}
                className="rounded border border-zinc-300 px-2 py-2"
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Weight</span>
            <div className="flex gap-2">
              <input
                name="weightValue"
                type="number"
                step="any"
                min="0"
                defaultValue={profile.weightValue ?? ""}
                className="min-w-0 flex-1 rounded border border-zinc-300 px-3 py-2"
              />
              <select
                name="weightUnit"
                defaultValue={profile.weightUnit ?? profile.preferredWeightUnit ?? "kg"}
                className="rounded border border-zinc-300 px-2 py-2"
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Blood type</span>
            <input
              name="bloodType"
              defaultValue={profile.bloodType ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="e.g. O+"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preferred length unit</span>
            <select
              name="preferredLengthUnit"
              defaultValue={profile.preferredLengthUnit ?? "cm"}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Preferred weight unit</span>
            <select
              name="preferredWeightUnit"
              defaultValue={profile.preferredWeightUnit ?? "kg"}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={profile.notes ?? ""}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Save profile
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Allergies</h2>

        {allergies.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">No allergies recorded.</p>
        ) : (
          <ul className="mb-6 divide-y divide-zinc-100 rounded border border-zinc-200">
            {allergies.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-zinc-600">
                    {[a.severity, a.reaction].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {a.notes ? <p className="mt-1 text-zinc-500">{a.notes}</p> : null}
                </div>
                <form action={asFormAction(deleteAllergyAction.bind(null, a.id))}>
                  <button
                    type="submit"
                    className="text-xs font-medium text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mb-3 text-sm font-medium text-zinc-700">Add allergy</h3>
        <form action={asFormAction(createAllergyAction)} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Name</span>
            <input
              name="name"
              required
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="e.g. Penicillin"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Severity</span>
            <select name="severity" defaultValue="unknown" className="rounded border border-zinc-300 px-3 py-2">
              <option value="unknown">unknown</option>
              <option value="mild">mild</option>
              <option value="moderate">moderate</option>
              <option value="severe">severe</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Reaction</span>
            <input
              name="reaction"
              className="rounded border border-zinc-300 px-3 py-2"
              placeholder="e.g. rash, anaphylaxis"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Notes</span>
            <input name="notes" className="rounded border border-zinc-300 px-3 py-2" />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Add allergy
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
