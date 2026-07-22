export type LengthUnit = "cm" | "in";
export type WeightUnit = "kg" | "lb";

export function cmToIn(cm: number): number {
  return cm / 2.54;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function formatHeight(value: number, unit: LengthUnit): string {
  return `${value} ${unit}`;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${value} ${unit}`;
}
