import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight">Health Tracker</h1>
      <p className="mt-2 text-sm text-zinc-600">Local records hub (Phase 1).</p>
      <nav className="mt-6">
        <Link
          href="/profile"
          className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
        >
          Profile & allergies →
        </Link>
      </nav>
    </main>
  );
}
