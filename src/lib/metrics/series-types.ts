/** Client-safe types for vitals series (dashboard). */

export type MetricNumericPoint = {
  date: string;
  value: number;
  readingId?: string;
};

export type MetricSummary = {
  /** Catalog metric_type, or "bmi" for computed BMI */
  key: string;
  displayName: string;
  /** Latest display string e.g. "211.2 lb" or "120/80 mmHg" */
  latestDisplay: string;
  latestDate: string | null;
  latestUnit: string | null;
  category: string | null;
  pointCount: number;
  /** Chart series (systolic for BP; BMI when key is bmi) */
  numericSeries: MetricNumericPoint[];
};
