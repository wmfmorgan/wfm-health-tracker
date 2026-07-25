/** Client-safe types for analyte series (dashboard + history UI). */

export type AnalyteResultPoint = {
  resultId: string;
  panelId: string;
  panelName: string;
  rawAnalyteName: string;
  value: string | null;
  unit: string | null;
  flag: string | null;
  refLow: string | null;
  refHigh: string | null;
  collectedOn: string | null;
  sortDate: string;
  documentIds: string[];
};

export type AnalyteNumericPoint = {
  date: string;
  value: number;
  panelId: string;
};

export type AnalyteSummary = {
  key: string;
  analyteId: string | null;
  displayName: string;
  aliases: string[];
  latest: AnalyteResultPoint;
  history: AnalyteResultPoint[];
  pointCount: number;
  numericSeries: AnalyteNumericPoint[];
};
