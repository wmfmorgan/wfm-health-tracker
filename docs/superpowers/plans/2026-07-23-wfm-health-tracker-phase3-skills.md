# Phase 3 Skills & Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Slash skills in Chat via SKILL.md (builtins + custom), palette UI, `/create-skill` and `/delete-skill` with enforcement.

**Spec:** `docs/superpowers/specs/2026-07-23-wfm-health-tracker-phase3-skills-design.md`

**Tech:** Existing Next.js chat pipeline; gray-matter or manual YAML frontmatter parse; files under `src/server/ai/skills/builtin/` and `data/skills/custom/`.

---

## Tasks

### Task 1: SKILL.md parser + types + registry
- `src/lib/skills/types.ts`, `parse-skill-md.ts`, `validate-skill-name.ts`
- `src/server/ai/skills/registry.ts` — list/get, load builtins from repo path, customs from `DATA_DIR/skills/custom`
- Unit tests for parse/validate/name

### Task 2: Builtin SKILL.md files
- med-check, lab-interpret, analyte-explain, synthesize-plan, create-skill (rules body), delete-skill (docs only)

### Task 3: Runner + meta handlers
- `runner.ts` — runSkillInChat
- `meta-skills.ts` — createCustomSkill, deleteCustomSkill
- Extend chat API to detect `/command` and dispatch
- Integration tests with FakeProvider + temp DATA_DIR

### Task 4: Chat slash palette UI
- Slash palette component in chat-panel
- Skill chip on replies
- Pass skills list from chat page

### Task 5: README + verification
- Document slash skills
- npm test, tsc, build

---
