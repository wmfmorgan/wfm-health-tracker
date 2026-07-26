/** Stage labels for import — mirrors Evaluate’s staged checklist. */
export function buildImportSteps(
  providerLabel: string,
  provider?: string | null,
): string[] {
  const steps = ["Uploading PDF…", "Extracting text layer…"];
  if (provider === "ollama") {
    steps.push("Warming model into memory…");
  }
  steps.push(
    `Calling ${providerLabel}…`,
    "Waiting for AI response…",
    "Parsing labs and vitals drafts…",
    "Saving drafts for review…",
  );
  return steps;
}

/**
 * Map job status / extracted text to a minimum stage so progress reflects
 * real server state while still animating through the AI wait stages.
 *
 * Grok:  0 upload · 1 text · 2 call · 3 wait · 4 parse · 5 save
 * Ollama: 0 upload · 1 text · 2 warm · 3 call · 4 wait · 5 parse · 6 save
 */
export function importMinStepIndex(opts: {
  status?: string | null;
  extractedCharCount?: number | null;
  provider?: string | null;
}): number {
  const { status, extractedCharCount, provider } = opts;
  const hasWarm = provider === "ollama";
  const lastStep = hasWarm ? 6 : 5;
  /** First AI-path step after text: warm (ollama) or call (grok) — both index 2. */
  const afterTextStep = 2;

  if (status === "extracting" || status === "awaiting_cloud_confirm") {
    // Text done; AI path in flight (warm + call for ollama)
    return extractedCharCount != null && extractedCharCount > 0 ? afterTextStep : 1;
  }
  if (status === "pending") {
    if (extractedCharCount != null && extractedCharCount > 0) return afterTextStep;
    return 0;
  }
  if (status === "ready" || status === "completed") return lastStep;
  return 0;
}
