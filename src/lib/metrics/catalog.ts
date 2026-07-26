/**
 * Frozen FR-013 metric catalog.
 * Keys are stored on metric_readings.metric_type.
 */

export type MetricValueMode = "single" | "bp"; // bp = systolic + diastolic

export type MetricDef = {
  key: string;
  label: string;
  /** Short label for cards */
  shortLabel?: string;
  units: readonly string[];
  defaultUnit: string;
  mode: MetricValueMode;
  /** Body-comp form group (undefined = clinical-only / not on scan form by default) */
  sessionGroup?: "fundamentals" | "fat_distribution" | "muscle_skeleton" | "hydration_metabolic" | "optional";
  /** Prefer length unit from profile */
  usesLengthUnit?: boolean;
  /** Prefer weight unit from profile */
  usesWeightUnit?: boolean;
};

export const METRIC_CATALOG: readonly MetricDef[] = [
  // Clinical / home vitals
  {
    key: "blood_pressure",
    label: "Blood pressure",
    shortLabel: "BP",
    units: ["mmHg"],
    defaultUnit: "mmHg",
    mode: "bp",
  },
  {
    key: "heart_rate",
    label: "Heart rate",
    shortLabel: "HR",
    units: ["bpm"],
    defaultUnit: "bpm",
    mode: "single",
    sessionGroup: "optional",
  },
  {
    key: "height",
    label: "Height",
    units: ["in", "cm"],
    defaultUnit: "in",
    mode: "single",
    usesLengthUnit: true,
  },
  {
    key: "weight",
    label: "Weight",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "fundamentals",
    usesWeightUnit: true,
  },
  {
    key: "waist_circumference",
    label: "Waist circumference",
    shortLabel: "Waist",
    units: ["in", "cm"],
    defaultUnit: "in",
    mode: "single",
    usesLengthUnit: true,
  },
  {
    key: "spo2",
    label: "Oxygen saturation",
    shortLabel: "SpO₂",
    units: ["%"],
    defaultUnit: "%",
    mode: "single",
  },
  {
    key: "temperature",
    label: "Temperature",
    shortLabel: "Temp",
    units: ["°F", "°C"],
    defaultUnit: "°F",
    mode: "single",
  },
  {
    key: "glucose",
    label: "Blood glucose",
    shortLabel: "Glucose",
    units: ["mg/dL", "mmol/L"],
    defaultUnit: "mg/dL",
    mode: "single",
  },

  // Body composition (InBody-style)
  {
    key: "body_fat_percent",
    label: "Body fat percentage",
    shortLabel: "Body fat %",
    units: ["%"],
    defaultUnit: "%",
    mode: "single",
    sessionGroup: "fundamentals",
  },
  {
    key: "body_fat_mass",
    label: "Body fat mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "fundamentals",
    usesWeightUnit: true,
  },
  {
    key: "lean_mass",
    label: "Lean mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "fundamentals",
    usesWeightUnit: true,
  },
  {
    key: "subcutaneous_fat_mass",
    label: "Subcutaneous fat mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "fat_distribution",
    usesWeightUnit: true,
  },
  {
    key: "visceral_fat_index",
    label: "Visceral fat index",
    shortLabel: "VFI",
    units: ["index"],
    defaultUnit: "index",
    mode: "single",
    sessionGroup: "fat_distribution",
  },
  {
    key: "skeletal_muscle_mass",
    label: "Skeletal muscle mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "muscle_skeleton",
    usesWeightUnit: true,
  },
  {
    key: "skeletal_mass",
    label: "Skeletal mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "muscle_skeleton",
    usesWeightUnit: true,
  },
  {
    key: "bone_mineral_content",
    label: "Bone mineral content",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "muscle_skeleton",
    usesWeightUnit: true,
  },
  {
    key: "fat_free_mass",
    label: "Fat free mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "muscle_skeleton",
    usesWeightUnit: true,
  },
  {
    key: "body_cell_mass",
    label: "Body cell mass",
    units: ["lb", "kg"],
    defaultUnit: "lb",
    mode: "single",
    sessionGroup: "muscle_skeleton",
    usesWeightUnit: true,
  },
  {
    key: "body_water_percent",
    label: "Body water",
    units: ["%"],
    defaultUnit: "%",
    mode: "single",
    sessionGroup: "hydration_metabolic",
  },
  {
    key: "bmr",
    label: "BMR (basal metabolic rate)",
    shortLabel: "BMR",
    units: ["cal"],
    defaultUnit: "cal",
    mode: "single",
    sessionGroup: "hydration_metabolic",
  },
  {
    key: "metabolic_age",
    label: "Metabolic age",
    units: ["years"],
    defaultUnit: "years",
    mode: "single",
    sessionGroup: "hydration_metabolic",
  },
  {
    key: "ag_ratio",
    label: "A/G ratio",
    units: ["%"],
    defaultUnit: "%",
    mode: "single",
    sessionGroup: "hydration_metabolic",
  },
  {
    key: "health_score",
    label: "Device health score",
    shortLabel: "Health score",
    units: ["score"],
    defaultUnit: "score",
    mode: "single",
    sessionGroup: "hydration_metabolic",
  },
] as const;

export const METRIC_KEYS = METRIC_CATALOG.map((m) => m.key);

/** Catalog metric type key (e.g. weight, blood_pressure). */
export type MetricKey = string;

const BY_KEY = new Map(METRIC_CATALOG.map((m) => [m.key, m]));

export function getMetricDef(key: string): MetricDef | undefined {
  return BY_KEY.get(key);
}

export function isMetricKey(key: string): boolean {
  return BY_KEY.has(key);
}

export const SESSION_GROUPS: {
  id: NonNullable<MetricDef["sessionGroup"]>;
  label: string;
}[] = [
  { id: "fundamentals", label: "Body composition fundamentals" },
  { id: "fat_distribution", label: "Fat distribution" },
  { id: "muscle_skeleton", label: "Muscle & skeleton" },
  { id: "hydration_metabolic", label: "Hydration & metabolic" },
  { id: "optional", label: "Optional (from scan)" },
];

export function metricsInSessionGroup(
  group: NonNullable<MetricDef["sessionGroup"]>,
): MetricDef[] {
  return METRIC_CATALOG.filter((m) => m.sessionGroup === group);
}

/** Metrics available for ad-hoc single-reading form (all catalog entries). */
export function adHocMetricOptions(): MetricDef[] {
  return [...METRIC_CATALOG];
}

/** Summary card order on vitals hub */
export const SUMMARY_METRIC_KEYS = [
  "weight",
  "blood_pressure",
  "height",
  "heart_rate",
  "glucose",
  "body_fat_percent",
  "visceral_fat_index",
  "lean_mass",
  "waist_circumference",
  "spo2",
  "temperature",
] as const;
