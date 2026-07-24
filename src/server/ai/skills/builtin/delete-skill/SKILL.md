---
name: delete-skill
description: >
  Delete a custom skill by name. Cannot delete built-in skills.
  Use when the user runs /delete-skill or /delete_skill.
argument-hint: "<skill-name>"
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

# Delete skill (meta)

Handled by the application. Requires a skill name argument.
Built-in and meta skills cannot be deleted.
