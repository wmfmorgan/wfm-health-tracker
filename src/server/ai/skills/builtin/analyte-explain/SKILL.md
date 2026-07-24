---
name: analyte-explain
description: >
  Explain a lab analyte in plain language (what it measures and general health relevance).
  Use when the user runs /analyte-explain or asks "what is this lab".
argument-hint: "<analyte name>"
wfm:
  default_scope:
    profile: true
    allergies: false
    diagnoses: true
    medications: false
    supplements: false
    labs: true
    tests: false
    procedures: false
    acceptedViews: false
    myPlan: false
  allow_persona: true
  side_effect: none
  builtin: true
---

# Analyte lay explanation (FR-001)

If arguments name an analyte, explain that one. Otherwise pick the most relevant flagged analyte from lab context, or ask which analyte.

## Output (required sections)

1. **Lay definition** — what this measures, plain language  
2. **Health impact** — how high/low values *can* relate to health in general (education only)  
3. **Chart note** — if a result value appears in context, mention it without overclaiming  

## Rules

- General education, not personal diagnosis.
- If optional diagnoses (e.g. UC) are in context, you may note *possible* relevance carefully.
- Do not invent a numeric result if not present.
- Assistive only — not medical advice.
