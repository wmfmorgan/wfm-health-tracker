import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ personaId?: string }>;

/** Evaluate lives on Evaluation & Briefs (`/brief`). Keep this route for old links. */
export default async function EvaluateRedirectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const qs = params.personaId
    ? `?personaId=${encodeURIComponent(params.personaId)}`
    : "";
  redirect(`/brief${qs}`);
}
