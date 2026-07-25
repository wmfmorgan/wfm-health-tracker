export function nowIso(): string {
  return new Date().toISOString();
}

/** Age in whole years from ISO date YYYY-MM-DD, or null if invalid/missing. */
export function ageFromDob(dob: string | null | undefined, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Normalize common lab-report date strings to YYYY-MM-DD for storage and
 * HTML date inputs. Returns null when empty/unparseable.
 */
export function normalizeIsoDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const raw = String(value).trim();
  if (!raw) return null;

  // Already YYYY-MM-DD (optionally with time / timezone suffix)
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);
  if (isoPrefix) {
    const [y, m, d] = isoPrefix[1].split("-").map(Number);
    if (isValidYmd(y!, m!, d!)) return isoPrefix[1];
  }

  // MM/DD/YYYY or M/D/YYYY (US lab reports)
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const m = Number(us[1]);
    const d = Number(us[2]);
    const y = Number(us[3]);
    if (isValidYmd(y, m, d)) {
      return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // DD-MM-YYYY or DD.MM.YYYY (less common; only if day > 12 so unambiguous,
  // or when month is clearly ≤12 and day ≤31 — prefer day-first only when day > 12)
  const dmy = raw.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})$/);
  if (dmy) {
    const a = Number(dmy[1]);
    const b = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (a > 12 && b <= 12 && isValidYmd(y, b, a)) {
      return `${String(y).padStart(4, "0")}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
  }

  // Fallback: Date.parse for strings like "March 1, 2026"
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    const d = dt.getDate();
    if (isValidYmd(y, m, d) && ISO_DATE_RE.test(
      `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    )) {
      // Guard absurd years from junk parse
      if (y >= 1900 && y <= 2100) {
        return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  return null;
}

/** Human-friendly display for a YYYY-MM-DD (or raw) date string. */
export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "No date";
  const iso = normalizeIsoDate(value) ?? value;
  const m = iso.match(ISO_DATE_RE);
  if (!m) return iso;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
