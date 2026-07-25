/**
 * Pure heuristics for potential analyte alias flags (client-safe).
 * Suggestions only — never auto-applied.
 */

export type AliasSuggestReason =
  | "abbreviation"
  | "contains"
  | "similar"
  | "token_overlap";

export type AliasSuggestion = {
  spelling: string;
  targetName: string;
  reason: AliasSuggestReason;
  /** Higher = stronger match (0–1-ish) */
  score: number;
  detail: string;
};

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lettersOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokens(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 0 && !/^(the|of|and|a|an)$/.test(t));
}

/** Initials from multi-word name, e.g. "c reactive protein" → "crp" */
function initials(name: string): string {
  return tokens(name)
    .map((t) => t[0])
    .join("");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cur =
        a[i - 1] === b[j - 1]
          ? row[j - 1]!
          : 1 + Math.min(row[j - 1]!, row[j]!, prev);
      row[j - 1] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length]!;
}

function similarity(a: string, b: string): number {
  const x = lettersOnly(a);
  const y = lettersOnly(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const d = levenshtein(x, y);
  return 1 - d / Math.max(x.length, y.length);
}

/**
 * Score whether `spelling` might be an alias of `targetName`.
 * Returns null if not a candidate.
 */
export function scoreAliasPair(
  spelling: string,
  targetName: string,
): Omit<AliasSuggestion, "spelling" | "targetName"> | null {
  const s = spelling.trim();
  const t = targetName.trim();
  if (!s || !t) return null;
  if (norm(s) === norm(t)) return null;

  const sLetters = lettersOnly(s);
  const tLetters = lettersOnly(t);
  if (!sLetters || !tLetters) return null;

  // Abbreviation / acronym of multi-word target
  const init = initials(t);
  if (init.length >= 2 && sLetters === init) {
    return {
      reason: "abbreviation",
      score: 0.95,
      detail: `“${s}” looks like initials of “${t}”`,
    };
  }
  // Spelling is short prefix of concatenated target (e.g. "hgb" vs hemoglobin-ish)
  if (
    sLetters.length >= 2 &&
    sLetters.length <= 6 &&
    tLetters.startsWith(sLetters) &&
    tLetters.length >= sLetters.length + 2
  ) {
    return {
      reason: "abbreviation",
      score: 0.75,
      detail: `“${s}” is a short form of “${t}”`,
    };
  }

  // One contains the other (word-ish)
  const sn = norm(s);
  const tn = norm(t);
  if (tn.includes(sn) && sn.length >= 4) {
    return {
      reason: "contains",
      score: 0.8,
      detail: `“${t}” contains “${s}”`,
    };
  }
  if (sn.includes(tn) && tn.length >= 4) {
    return {
      reason: "contains",
      score: 0.8,
      detail: `“${s}” contains “${t}”`,
    };
  }

  // Token overlap (majority of shorter side)
  const st = tokens(s);
  const tt = tokens(t);
  if (st.length && tt.length) {
    const setT = new Set(tt);
    const overlap = st.filter((x) => setT.has(x)).length;
    const ratio = overlap / Math.min(st.length, tt.length);
    if (overlap >= 1 && ratio >= 0.6 && (st.length > 1 || tt.length > 1)) {
      return {
        reason: "token_overlap",
        score: 0.55 + ratio * 0.3,
        detail: `Shared words between “${s}” and “${t}”`,
      };
    }
  }

  // Close typo / similar strings (medium length only)
  const sim = similarity(s, t);
  if (sim >= 0.78 && Math.min(sLetters.length, tLetters.length) >= 4) {
    return {
      reason: "similar",
      score: sim,
      detail: `“${s}” is similar to “${t}”`,
    };
  }

  return null;
}

/**
 * For one spelling, pick the best catalog targets (max per spelling).
 */
export function suggestTargetsForSpelling(
  spelling: string,
  catalogNames: string[],
  opts?: { max?: number },
): AliasSuggestion[] {
  const max = opts?.max ?? 3;
  const out: AliasSuggestion[] = [];
  for (const targetName of catalogNames) {
    if (norm(spelling) === norm(targetName)) continue;
    const scored = scoreAliasPair(spelling, targetName);
    if (!scored) continue;
    out.push({
      spelling,
      targetName,
      ...scored,
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, max);
}
