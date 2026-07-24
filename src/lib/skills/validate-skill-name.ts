const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

/** Normalize aliases like delete_skill → delete-skill */
export function normalizeSkillName(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, "-");
}

export function validateSkillName(name: string): { ok: true; name: string } | { ok: false; error: string } {
  const n = normalizeSkillName(name);
  if (n.length < 2 || n.length > 64) {
    return { ok: false, error: "Skill name must be 2–64 characters" };
  }
  if (!NAME_RE.test(n)) {
    return {
      ok: false,
      error:
        "Skill name must be lowercase letters, digits, and hyphens; start and end with a letter or digit",
    };
  }
  return { ok: true, name: n };
}
