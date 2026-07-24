---
name: lab-interpret
description: >
  Interpret recent or selected lab panels in plain language with trend notes when multiple dates exist.
  Use when the user runs /lab-interpret or asks what labs mean.
argument-hint: "[optional focus panel or analyte]"
wfm:
  default_scope:
    profile: true
    allergies: false
    diagnoses: true
    medications: true
    supplements: true
    labs: true
    tests: false
    procedures: false
    acceptedViews: true
    myPlan: false
  allow_persona: true
  side_effect: none
  builtin: true
---

# Lab interpretation

Explain lab results from chart context in accessible language.

## Focus

1. Flagged or out-of-range values (H/L/critical)
2. Patterns across panels if multiple dates present
3. Relation to listed diagnoses/meds only when supported by context
4. What is unknown or missing

## Output format

- **Overview**
- **Notable results** (by panel when possible)
- **Possible themes** (opinions — not diagnoses)
- **Suggested questions for clinician**

## Rules

- Do not invent values or reference ranges.
- Educational / assistive only — not a diagnosis.
- Do not claim chart or brief was updated.
