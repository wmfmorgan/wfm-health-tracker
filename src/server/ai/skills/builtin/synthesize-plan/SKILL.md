---
name: synthesize-plan
description: >
  Propose a My Plan draft from accepted multi-persona brief views without erasing disagreements.
  Use when the user runs /synthesize-plan or wants a unified plan from persona evaluations.
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
  allow_persona: false
  side_effect: none
  builtin: true
---

# Synthesize plan

Using **accepted** persona views and current My plan (if any), draft a proposed personal plan.

## Rules

- Do **not** silently merge conflicting recommendations into fake consensus.
- Present **shared themes**, then **open tensions** (persona A vs B).
- Offer options the user can choose among.
- Output markdown suitable for pasting into My plan.
- Chat-only: do not claim My plan was saved; tell user they can copy into My plan on Evaluation & Briefs.
- Assistive only — not medical advice.
