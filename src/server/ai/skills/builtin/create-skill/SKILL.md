---
name: create-skill
description: >
  Help author a new custom chat skill as SKILL.md. Enforces WFM rules (chat-only, no chart writes).
  Use when the user runs /create-skill.
argument-hint: "[skill-name] [optional draft notes]"
wfm:
  default_scope:
    profile: false
    allergies: false
    diagnoses: false
    medications: false
    supplements: false
    labs: false
    tests: false
    procedures: false
    acceptedViews: false
    myPlan: false
  allow_persona: false
  side_effect: none
  builtin: true
---

# Create skill (meta)

You help draft a custom skill. The **server** saves the file after validation — you do not write files yourself.

## Required fields to collect

1. **name** — lowercase, digits, hyphens; 2–64 chars (e.g. `flare-prep`)
2. **description** — what it does + when to use it
3. **body** — markdown instructions for the model when the skill runs
4. Optional **argument-hint**

## Hard rules for any custom skill you draft

- Chat-only: must NOT instruct creating/updating clinical chart records
- Must NOT claim to update brief memory without user accept
- Must separate facts vs opinions
- Must include assistive / not medical advice stance
- `wfm.side_effect` is always `none` (server enforces)

## Response format

If info is missing, ask concise questions.  
If enough info: output a complete SKILL.md draft in a fenced code block, then a short checklist.  
Remind the user the server will save only after validation (the app may auto-save structured create payloads).
