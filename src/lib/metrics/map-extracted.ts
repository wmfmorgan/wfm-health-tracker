import { getMetricDef, isMetricKey, type MetricKey } from "@/lib/metrics/catalog";

/**
 * Map free-text / AI metric names to catalog keys.
 */
const ALIASES: Record<string, MetricKey> = {
  weight: "weight",
  body_weight: "weight",
  "body weight": "weight",
  height: "height",
  blood_pressure: "blood_pressure",
  bp: "blood_pressure",
  "blood pressure": "blood_pressure",
  heart_rate: "heart_rate",
  hr: "heart_rate",
  "heart rate": "heart_rate",
  pulse: "heart_rate",
  waist: "waist_circumference",
  waist_circumference: "waist_circumference",
  "waist circumference": "waist_circumference",
  spo2: "spo2",
  "spO2": "spo2",
  "oxygen saturation": "spo2",
  temperature: "temperature",
  temp: "temperature",
  glucose: "glucose",
  "blood glucose": "glucose",
  body_fat_percent: "body_fat_percent",
  body_fat_percentage: "body_fat_percent",
  "body fat %": "body_fat_percent",
  "body fat percentage": "body_fat_percent",
  "body fat percent": "body_fat_percent",
  pbf: "body_fat_percent",
  body_fat_mass: "body_fat_mass",
  "body fat mass": "body_fat_mass",
  fat_mass: "body_fat_mass",
  lean_mass: "lean_mass",
  "lean mass": "lean_mass",
  "lean body mass": "lean_mass",
  lbm: "lean_mass",
  fat_free_mass: "fat_free_mass",
  "fat free mass": "fat_free_mass",
  ffm: "fat_free_mass",
  skeletal_muscle_mass: "skeletal_muscle_mass",
  "skeletal muscle mass": "skeletal_muscle_mass",
  smm: "skeletal_muscle_mass",
  skeletal_mass: "skeletal_mass",
  "skeletal mass": "skeletal_mass",
  bone_mineral_content: "bone_mineral_content",
  "bone mineral content": "bone_mineral_content",
  bmc: "bone_mineral_content",
  subcutaneous_fat_mass: "subcutaneous_fat_mass",
  "subcutaneous fat mass": "subcutaneous_fat_mass",
  visceral_fat_index: "visceral_fat_index",
  "visceral fat index": "visceral_fat_index",
  "visceral fat": "visceral_fat_index",
  vfi: "visceral_fat_index",
  ag_ratio: "ag_ratio",
  "a/g ratio": "ag_ratio",
  "a/g": "ag_ratio",
  body_water_percent: "body_water_percent",
  "body water": "body_water_percent",
  "body water %": "body_water_percent",
  tbw: "body_water_percent",
  bmr: "bmr",
  "basal metabolic rate": "bmr",
  metabolic_age: "metabolic_age",
  "metabolic age": "metabolic_age",
  body_cell_mass: "body_cell_mass",
  "body cell mass": "body_cell_mass",
  bcm: "body_cell_mass",
  health_score: "health_score",
  "health score": "health_score",
  inbody_score: "health_score",
};

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[%]/g, " percent")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve AI/free-text metric type to a catalog key, or null if unknown. */
export function mapExtractedMetricType(raw: unknown): MetricKey | null {
  if (raw == null) return null;
  const original = String(raw).trim();
  if (!original) return null;
  if (isMetricKey(original)) return original as MetricKey;

  const snake = original
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  if (isMetricKey(snake)) return snake as MetricKey;

  const spaced = normalizeKey(original);
  if (ALIASES[spaced]) return ALIASES[spaced]!;
  if (ALIASES[snake]) return ALIASES[snake]!;
  const lower = original.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower]!;

  return null;
}

export function defaultUnitForMetric(
  metricType: string,
  unitFromAi: string | null | undefined,
): string {
  const def = getMetricDef(metricType);
  if (!def) return unitFromAi?.trim() || "";
  if (unitFromAi && def.units.includes(unitFromAi.trim())) {
    return unitFromAi.trim();
  }
  // Common unit aliases
  const u = (unitFromAi ?? "").trim().toLowerCase();
  if (def.usesWeightUnit) {
    if (u === "lbs" || u === "pounds" || u === "lb") return "lb";
    if (u === "kgs" || u === "kilograms" || u === "kg") return "kg";
  }
  if (def.usesLengthUnit) {
    if (u === "inches" || u === "in" || u === '"') return "in";
    if (u === "centimeters" || u === "cm") return "cm";
  }
  if (metricType === "glucose") {
    if (u.includes("mmol")) return "mmol/L";
    if (u.includes("mg")) return "mg/dL";
  }
  if (metricType === "heart_rate" && (u === "bpm" || u === "beats/min" || !u)) {
    return "bpm";
  }
  if (metricType === "blood_pressure") return "mmHg";
  return def.defaultUnit;
}
