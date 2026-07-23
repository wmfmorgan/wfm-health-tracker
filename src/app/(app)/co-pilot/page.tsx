import { redirect } from "next/navigation";

type SearchParams = Promise<{ tab?: string; personaId?: string }>;

/**
 * Legacy Co-pilot (tabbed Chat + Evaluate) redirected to dedicated UIs.
 */
export default async function CoPilotRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const personaQs = params.personaId
    ? `?personaId=${encodeURIComponent(params.personaId)}`
    : "";

  if (params.tab === "evaluate") {
    redirect(`/evaluate${personaQs}`);
  }
  redirect(`/chat${personaQs}`);
}
