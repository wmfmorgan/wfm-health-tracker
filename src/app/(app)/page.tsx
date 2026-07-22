export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Local personal health chart. Use the sidebar to open records.
      </p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
        Snapshot widgets (profile, active meds, recent labs) will appear here in a
        later task.
      </div>
    </div>
  );
}
