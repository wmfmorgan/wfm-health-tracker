# WFM Health Tracker — Phase 3 Skills & Slash Commands Design

**Date:** 2026-07-23  
**Status:** Approved for implementation planning  
**Parent:** [`2026-07-22-wfm-health-tracker-phase3-design.md`](./2026-07-22-wfm-health-tracker-phase3-design.md)  
**Related:** [`FUTURE-REQUIREMENTS.md`](./FUTURE-REQUIREMENTS.md) (FR-001)  
**Audience:** Solo developer (personal use)

## 1. Purpose

Add **slash-invoked skills** in Chat, authored as **SKILL.md** files (standard frontmatter + body), with:

- Preloaded clinical skills (med check, lab interpret, analyte explain, synthesize plan)
- User-created custom skills under `data/skills/custom/`
- Meta skills: **`/create_skill`**, **`/delete_skill <name>`** that enforce app rules
- Chat-only side effects by default (no silent brief/chart writes)

### 1.1 Goals

- Type `/` in Chat → palette of skills; run skill with optional args.
- Skills are portable instruction packs, not multi-agent tool runtimes.
- Custom skills cannot break safety or mutate chart tables.
- Built-ins cannot be deleted; custom can be deleted via `/delete_skill`.

### 1.2 Non-goals

- Full agent harness (tool loops, shell scripts, Skill tool from Grok TUI).
- Auto-invoke skills from free text without `/` (optional later).
- Skills that write clinical records (meds, labs, diagnoses).
- Skills that auto-accept persona brief views.

### 1.3 Locked decisions

| Topic | Choice |
|-------|--------|
| Invocation | Slash commands in Chat (`/` palette) |
| Format | SKILL.md (`name`, `description`, body; optional app `wfm:` block) |
| Storage | `data/skills/builtin/`, `data/skills/custom/` (backed up with `data/`) |
| Preloaded | `med-check`, `lab-interpret`, `analyte-explain`, `synthesize-plan` |
| Meta | `create-skill`, `delete-skill` |
| Side effects | Chat-only by default (A); exception: `synthesize-plan` may propose My plan draft with explicit user accept UI later; **v1: synthesize-plan is chat-only too** unless user confirms a separate accept control in a follow-up |
| Personas | Orthogonal lens; optional with skills (`allow_persona: true`) |
| Safety | Always append `SAFETY_SYSTEM_SUFFIX`; skills cannot disable it |

**v1 synthesize-plan:** chat-only reply that suggests My plan text; user pastes into My plan or we add “Apply to My plan” button in a fast follow. Keeps first ship simpler.

---

## 2. Concepts

| Concept | Role |
|---------|------|
| **Persona** | *Who* — clinical lens (existing) |
| **Skill** | *What job* — named instruction pack + default chart scope |
| **Slash command** | *How* — `/skill-name [args]` in Chat |

Composition: current persona lens (if any) + skill body + skill default scope (merged with user checkboxes) + args + chart context → LLM → assistant message.

---

## 3. SKILL.md schema

### 3.1 Required (standard)

```markdown
---
name: med-check
description: >
  Cross-check active medications and supplements against allergies and each other.
  Use when the user runs /med-check or asks about drug interactions.
argument-hint: "[optional focus]"
---

# Med check

Instructions for the model…
```

| Field | Rules |
|-------|--------|
| `name` | Lowercase `a-z`, digits, hyphens; 2–64 chars; unique; becomes `/name` |
| `description` | What it does + trigger phrases; used in palette search |
| `argument-hint` | Optional; shown in UI after slash name |

### 3.2 Optional app block (`wfm`)

```yaml
wfm:
  default_scope:
    profile: true
    allergies: true
    diagnoses: true
    medications: true
    supplements: true
    labs: false
    tests: false
    procedures: false
    acceptedViews: true
    myPlan: true
  allow_persona: true
  side_effect: none   # none | (future: my_plan_draft | analyte_cache)
  builtin: true       # set only by seed; custom always false
```

Unknown keys ignored. Invalid `name` rejected on load/save.

### 3.3 Body rules (enforced by create-skill + runner)

Skill body **must not** instruct the model to:

- Create/update/delete clinical chart records
- Claim brief memory was updated without user accept
- Drop medical disclaimers
- Invent labs/meds/diagnoses not in context

Runner always injects safety suffix after skill body.

---

## 4. Storage layout

```
data/skills/
  builtin/
    med-check/SKILL.md
    lab-interpret/SKILL.md
    analyte-explain/SKILL.md
    synthesize-plan/SKILL.md
    create-skill/SKILL.md    # meta: guided creation rules
    delete-skill/SKILL.md    # meta: documents delete command (handler is code)
  custom/
    <name>/SKILL.md
```

- Builtin files shipped in repo under `skills/builtin/` and **copied/synced** into `data/skills/builtin/` on bootstrap (or read from repo path if `data` empty).
- Prefer: read builtins from `src/server/ai/skills/builtin/*/SKILL.md` (versioned in git) and customs from `data/skills/custom/` (user data).  
  **Decision:** Builtins live in **repo** `src/server/ai/skills/builtin/<name>/SKILL.md`. Customs in **`data/skills/custom/<name>/SKILL.md`**. No need to copy builtins into data.

`data/` stays backup unit for customs only.

---

## 5. Preloaded skills (bodies)

### 5.1 `/med-check`

- Default scope: meds, supplements, allergies, diagnoses, profile, accepted views  
- Output: structured narrative — potential concerns, allergy flags, duplicate therapy, questions for clinician  
- Chat only  

### 5.2 `/lab-interpret`

- Default scope: labs, profile, diagnoses, meds (active), accepted views  
- Output: plain-language interpretation of recent/selected panels; trends if multiple in context; not diagnosis  
- Chat only  

### 5.3 `/analyte-explain` (FR-001 lite)

- Args: analyte name (required if not inferable)  
- Scope: minimal; optional profile/diagnoses if user scope allows  
- Output: lay definition + general health impact  
- **v1:** chat only (cache persistence = follow-up; schema for cache optional in same milestone if easy)  
- **v1.1 preferred:** cache on `analytes` table fields if present or new columns  

**Decision for this milestone:** chat-only FR-001; cache can be task in same plan if low cost.

### 5.4 `/synthesize-plan`

- Default scope: accepted views, my plan, diagnoses, meds  
- Output: proposed My plan markdown synthesizing multi-persona views without erasing conflicts (present options)  
- Chat only in v1  

### 5.5 `/create-skill` (meta)

**Not a pure free-form LLM dump.** Handler flow:

1. User: `/create-skill` or `/create-skill my-flare-prep`  
2. If incomplete: assistant asks for remaining fields (name, description, body, default scope) **or** one-shot if user pastes full draft  
3. Server validates name, uniqueness, reserved names (`create-skill`, `delete-skill`, builtins)  
4. Writes `data/skills/custom/<name>/SKILL.md` with enforced `wfm.side_effect: none`, `builtin: false`  
5. LLM may help draft body using create-skill’s SKILL.md rules, then server validates + saves  

**Enforcement checklist (code + skill body):**

- Name pattern valid  
- Not overwriting builtin  
- Frontmatter present  
- Description non-empty  
- `wfm.side_effect` forced to `none` for user skills  
- Safety note embedded in generated body template  

### 5.6 `/delete_skill` / `/delete-skill` (meta)

- Args: skill name required  
- Code handler (no LLM required):  
  - Reject if builtin or meta  
  - Delete `data/skills/custom/<name>/`  
  - Confirm in reply  
- Accept both `delete-skill` and `delete_skill` as aliases → normalize to `delete-skill`  

---

## 6. Registry & runner

### 6.1 Registry

```ts
type RegisteredSkill = {
  name: string;
  description: string;
  argumentHint?: string;
  body: string;
  wfm: {
    defaultScope: ChartContextScope;
    allowPersona: boolean;
    sideEffect: "none";
    builtin: boolean;
  };
  path: string;
};

listSkills(): RegisteredSkill[]
getSkill(name: string): RegisteredSkill | undefined
createCustomSkill(input): RegisteredSkill
deleteCustomSkill(name: string): void
```

Load on demand or cache with mtime invalidation.

### 6.2 Runner

```ts
runSkillInChat(opts: {
  skillName: string;
  args: string;
  threadId: string;
  personaId?: string | null;
  provider, model;
  scope: ChartContextScope; // user checkboxes, merged with skill defaults (user can narrow further)
}): Promise<{ assistantMessage: string }>
```

Merge scope: skill defaults OR user scope? **Decision:** start from skill `default_scope`, then **user checkboxes further restrict** (AND). If user unchecks meds, skill does not get meds even if default wants them.

For meta `create-skill` / `delete-skill`: special-case in chat API before normal LLM skill run.

### 6.3 Chat integration

Parse message:

- If starts with `/`: extract command + rest as args  
- Palette when input is `/` or `/partial`  

API:

```ts
POST /api/co-pilot/chat
{
  ...,
  message: "/med-check focus on iron",
  // or explicit skillName + args
}
```

Persist user message as typed; assistant reply may prefix badge text `(skill: med-check)`.

---

## 7. UI

### 7.1 Slash palette (Chat composer)

- On `/` open dropdown of skills (name + description snippet)  
- Filter as user types  
- Enter selects; append space for args  
- Escape closes  

### 7.2 Skills management (optional page)

**v1 minimum:** create/delete via slash only.  
**v1.1:** `/personas`-style list under Copilot → **Skills** page to view/edit custom SKILL.md.

**Decision for this milestone:** slash create/delete + palette sufficient; optional simple **Skills** list page if time (read-only list of builtins + custom with delete).

### 7.3 Message chrome

Show small chip on assistant messages when a skill ran: `med-check`.

---

## 8. Security & privacy

- Custom skill files only under `data/skills/custom/` (path traversal rejected)  
- No execution of skill-embedded scripts  
- Safety suffix always applied  
- Grok still sends context when selected (no confirm gate)  
- Logs: skill name + ids, not full PHI  

---

## 9. Testing

| Layer | Cases |
|-------|--------|
| Unit | Parse SKILL.md frontmatter; validate name; merge scope; reject path traversal |
| Integration | create custom skill file; delete custom; cannot delete builtin; run med-check with FakeProvider includes meds in context |
| UI | Manual: palette, run skill, create/delete |

---

## 10. Delivery slices

1. SKILL.md parser + registry + builtin files  
2. Runner + chat API slash dispatch + meta create/delete  
3. Chat slash palette UI + skill chip  
4. Builtin skill bodies (med-check, lab-interpret, analyte-explain, synthesize-plan, create-skill docs)  
5. Tests + README  

---

## 11. Success criteria

1. `/` opens skill palette with builtins + customs  
2. `/med-check` runs and replies with med/allergy-aware content from chart context  
3. `/create-skill foo` creates valid custom SKILL.md under `data/skills/custom/foo/`  
4. `/delete-skill foo` removes custom; fails on builtin  
5. Custom skills cannot set side effects that mutate chart  
6. Free chat without `/` unchanged  

---

## 12. Next step

Implementation plan: `docs/superpowers/plans/2026-07-23-wfm-health-tracker-phase3-skills.md`
