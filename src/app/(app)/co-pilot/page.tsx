import Link from "next/link";
import { MEDICAL_DISCLAIMER } from "@/server/ai/safety";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function CoPilotPage() {
  return (
    <div className="text-zinc-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Co-pilot</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Chat and multi-turn co-pilot are coming soon (Task 8). Persona evaluation
          and the chart brief are available now.
        </p>
      </div>

      <div className="max-w-xl space-y-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-700">
          Use the chart brief to run multi-persona reviewed views, manage your plan,
          and accept drafts into brief memory.
        </p>
        <Link href="/brief">
          <Button type="button">Open chart brief</Button>
        </Link>
      </div>

      <p className="mt-8 text-xs text-zinc-500">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
