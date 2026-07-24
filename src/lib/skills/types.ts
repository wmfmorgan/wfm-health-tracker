import type { ChartContextScope } from "@/server/ai/context";

export type SkillSideEffect = "none";

export type SkillWfmConfig = {
  defaultScope: ChartContextScope;
  allowPersona: boolean;
  sideEffect: SkillSideEffect;
  builtin: boolean;
};

export type RegisteredSkill = {
  name: string;
  description: string;
  argumentHint?: string;
  body: string;
  wfm: SkillWfmConfig;
  path: string;
};

export const META_SKILL_NAMES = new Set(["create-skill", "delete-skill"]);

export const DEFAULT_SKILL_SCOPE: ChartContextScope = {
  profile: true,
  allergies: true,
  diagnoses: true,
  medications: true,
  supplements: true,
  labs: true,
  tests: false,
  procedures: false,
  acceptedViews: true,
  myPlan: true,
};
