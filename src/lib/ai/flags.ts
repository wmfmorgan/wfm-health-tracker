const MAP: Record<string, "normal" | "H" | "L" | "critical" | "unknown"> = {
  normal: "normal",
  n: "normal",
  h: "H",
  high: "H",
  "above high": "H",
  l: "L",
  low: "L",
  "below low": "L",
  critical: "critical",
  crit: "critical",
  unknown: "unknown",
  "": "unknown",
};

export function normalizeLabFlag(
  raw: unknown,
): "normal" | "H" | "L" | "critical" | "unknown" | null {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  return MAP[key] ?? "unknown";
}
