import { inToCm, lbToKg, type LengthUnit, type WeightUnit } from "@/lib/units";

/**
 * BMI = weight_kg / (height_m²).
 * Returns null if inputs invalid.
 */
export function computeBmi(
  heightValue: number | null | undefined,
  heightUnit: string | null | undefined,
  weightValue: number | null | undefined,
  weightUnit: string | null | undefined,
): number | null {
  if (
    heightValue == null ||
    weightValue == null ||
    !Number.isFinite(heightValue) ||
    !Number.isFinite(weightValue) ||
    heightValue <= 0 ||
    weightValue <= 0
  ) {
    return null;
  }

  const hUnit = (heightUnit === "in" || heightUnit === "cm" ? heightUnit : null) as LengthUnit | null;
  const wUnit = (weightUnit === "lb" || weightUnit === "kg" ? weightUnit : null) as WeightUnit | null;
  if (!hUnit || !wUnit) return null;

  const heightCm = hUnit === "cm" ? heightValue : inToCm(heightValue);
  const weightKg = wUnit === "kg" ? weightValue : lbToKg(weightValue);
  const heightM = heightCm / 100;
  if (heightM <= 0) return null;

  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}

export function formatBmi(bmi: number | null | undefined): string | null {
  if (bmi == null || !Number.isFinite(bmi)) return null;
  return bmi.toFixed(1);
}
