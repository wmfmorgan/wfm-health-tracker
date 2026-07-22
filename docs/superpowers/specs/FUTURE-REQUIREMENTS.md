# Future requirements

Ideas locked for later phases. Not in current implementation scope.

---

## FR-001: Lab analyte lay explanations (AI-generated)

**Status:** Planned (AI phase — after records hub; natural fit for Phase 3 co-pilot or a dedicated “lab literacy” slice)  
**Priority:** Medium–high (personal education / UC + aging chart)  
**Depends on:** Analyte master list (done); AI provider router (Grok + local)  

### Problem

Lab analyte names and units are clinical. When reviewing results, it is hard to remember:

1. What the analyte **is** in plain language  
2. How it **affects overall health** (and, where relevant, chronic conditions)

### Desired capability

For each **analyte** (master catalog and/or in context of a result row):

| Content | Description |
|---------|-------------|
| **Lay definition** | Short plain-language “what this measures” |
| **Health impact** | How high/low or abnormal values can relate to overall health (general education, not a diagnosis) |

Generated **by AI** (user-selectable provider: Grok cloud and/or local Ollama).

### UX (draft)

- On **Analytes** detail/list: optional “Explain” or show cached explanation  
- On **Lab panel detail** / result rows: expandable “What is this?” next to analyte name  
- Prefer **cache** explanations per analyte (and maybe per model) so reopening a panel does not re-call the API every time  
- Allow **regenerate** if the user wants a fresh explanation  
- Always show medical disclaimer: decision support / education only, not medical advice  

### Data (draft)

Store on or next to the analyte master list, e.g.:

- `lay_summary` — plain-language definition  
- `health_impact` — how it relates to health  
- `ai_generated_at`, `ai_provider`, `ai_model` — provenance  
- Optional: version hash of prompt so stale text can be refreshed after prompt changes  

Alternatively: separate `analyte_explanations` table keyed by `analyte_id` + provider/model.

### AI behavior (draft)

- Input: analyte name, default unit, optional notes; **optional** user profile context (e.g. UC, active diagnoses) for more relevant impact wording — **only if** user opts into sending that context  
- Output: structured JSON `{ laySummary, healthImpact }` validated before save  
- Default offline path: local model; cloud when user chooses Grok  
- Do **not** invent personal medical conclusions from a single result value unless the user explicitly asks for “interpret this result” (that may be a separate co-pilot feature)

### Out of scope for this FR

- Full panel interpretation / trend analysis across dates (related but separate co-pilot feature)  
- Replacing clinician advice  
- Auto-generating explanations for every analyte on seed without user request (optional background job later; start on-demand)

### Acceptance criteria (when built)

1. User can request an AI explanation for an analyte from the UI  
2. Response includes lay definition + health impact  
3. Explanation is saved and shown again without a new API call until regenerate  
4. Provider choice respects dual Grok/Ollama settings  
5. UI labels content as educational / not medical advice  
6. Works offline when local provider is selected and available  

### Related

- Design: Phase 3 AI co-pilot (`docs/superpowers/specs/2026-07-22-wfm-health-tracker-design.md`)  
- Existing: `analytes` table, lab results editor, common analyte seed  

---

## FR backlog index

| ID | Title | Phase hint |
|----|--------|------------|
| FR-001 | Lab analyte lay explanations (AI) | Phase 3 / lab literacy |
