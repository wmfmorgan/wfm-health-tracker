---
name: med-check
description: >
  Cross-check active medications and supplements against allergies and each other.
  Use when the user runs /med-check or asks about interactions, duplicates, or allergy conflicts.
argument-hint: "[optional focus]"
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
  side_effect: none
  builtin: true
---

# Med / supplement cross-check

Review the chart context for **assistive** safety signals only.

## Focus

1. Allergy conflicts with current meds/supplements (name matches or clear class risk if obvious from names)
2. Duplicate therapy (same drug/class appearing twice)
3. Obvious combination cautions (e.g. multiple sedating agents) when clear from names only
4. Gaps: missing purpose, dates, or unclear PRN use — list as questions

## Output format

- **Summary** (2–4 sentences)
- **Potential concerns** (bullets; label confidence: chart-supported vs uncertain)
- **Questions for clinician** (bullets)
- **Facts vs opinions** clearly separated

## Rules

- Do not invent meds, doses, or allergies not in context.
- Do not claim to have updated the chart or brief.
- Not medical advice; user should verify with a licensed clinician.
