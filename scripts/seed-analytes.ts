import { listAnalytes } from "../src/server/services/analytes";

const list = listAnalytes();
console.log("analyte count:", list.length);
for (const name of [
  "WBC",
  "Hemoglobin",
  "CRP",
  "Fecal calprotectin",
  "Ferritin",
  "Vitamin D 25-OH",
  "Creatinine",
  "TSH",
]) {
  const a = list.find((x) => x.name === name);
  console.log(a ? `${a.name}: ${a.defaultUnit ?? "—"}` : `${name}: MISSING`);
}
