import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-white p-4">
        <div className="mb-4 text-sm font-semibold tracking-tight">
          WFM Health Tracker
        </div>
        <SidebarNav />
      </aside>
      <main className="max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}
