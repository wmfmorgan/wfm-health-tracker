/**
 * Common clinical lab analytes with typical reporting units.
 * Units follow common US lab conventions; labs may vary.
 */
export const COMMON_ANALYTES: ReadonlyArray<{
  name: string;
  defaultUnit: string | null;
  notes?: string;
}> = [
  // —— CBC ——
  { name: "WBC", defaultUnit: "K/uL", notes: "White blood cells" },
  { name: "RBC", defaultUnit: "M/uL", notes: "Red blood cells" },
  { name: "Hemoglobin", defaultUnit: "g/dL" },
  { name: "Hematocrit", defaultUnit: "%" },
  { name: "MCV", defaultUnit: "fL" },
  { name: "MCH", defaultUnit: "pg" },
  { name: "MCHC", defaultUnit: "g/dL" },
  { name: "RDW", defaultUnit: "%" },
  { name: "Platelets", defaultUnit: "K/uL" },
  { name: "MPV", defaultUnit: "fL" },
  { name: "Neutrophils %", defaultUnit: "%" },
  { name: "Neutrophils absolute", defaultUnit: "K/uL" },
  { name: "Lymphocytes %", defaultUnit: "%" },
  { name: "Lymphocytes absolute", defaultUnit: "K/uL" },
  { name: "Monocytes %", defaultUnit: "%" },
  { name: "Monocytes absolute", defaultUnit: "K/uL" },
  { name: "Eosinophils %", defaultUnit: "%" },
  { name: "Eosinophils absolute", defaultUnit: "K/uL" },
  { name: "Basophils %", defaultUnit: "%" },
  { name: "Basophils absolute", defaultUnit: "K/uL" },

  // —— BMP / CMP electrolytes & kidney ——
  { name: "Glucose", defaultUnit: "mg/dL" },
  { name: "BUN", defaultUnit: "mg/dL", notes: "Blood urea nitrogen" },
  { name: "Creatinine", defaultUnit: "mg/dL" },
  { name: "eGFR", defaultUnit: "mL/min/1.73m2" },
  { name: "BUN/Creatinine ratio", defaultUnit: null },
  { name: "Sodium", defaultUnit: "mmol/L" },
  { name: "Potassium", defaultUnit: "mmol/L" },
  { name: "Chloride", defaultUnit: "mmol/L" },
  { name: "CO2", defaultUnit: "mmol/L", notes: "Bicarbonate / total CO2" },
  { name: "Anion gap", defaultUnit: "mmol/L" },
  { name: "Calcium", defaultUnit: "mg/dL" },
  { name: "Corrected calcium", defaultUnit: "mg/dL" },
  { name: "Magnesium", defaultUnit: "mg/dL" },
  { name: "Phosphorus", defaultUnit: "mg/dL" },
  { name: "Uric acid", defaultUnit: "mg/dL" },

  // —— Liver / protein ——
  { name: "Total protein", defaultUnit: "g/dL" },
  { name: "Albumin", defaultUnit: "g/dL" },
  { name: "Globulin", defaultUnit: "g/dL" },
  { name: "A/G ratio", defaultUnit: null },
  { name: "AST", defaultUnit: "U/L" },
  { name: "ALT", defaultUnit: "U/L" },
  { name: "ALP", defaultUnit: "U/L", notes: "Alkaline phosphatase" },
  { name: "GGT", defaultUnit: "U/L" },
  { name: "Total bilirubin", defaultUnit: "mg/dL" },
  { name: "Direct bilirubin", defaultUnit: "mg/dL" },
  { name: "Indirect bilirubin", defaultUnit: "mg/dL" },
  { name: "LDH", defaultUnit: "U/L" },

  // —— Lipids ——
  { name: "Total cholesterol", defaultUnit: "mg/dL" },
  { name: "LDL cholesterol", defaultUnit: "mg/dL" },
  { name: "HDL cholesterol", defaultUnit: "mg/dL" },
  { name: "Non-HDL cholesterol", defaultUnit: "mg/dL" },
  { name: "Triglycerides", defaultUnit: "mg/dL" },
  { name: "Cholesterol/HDL ratio", defaultUnit: null },
  { name: "VLDL cholesterol", defaultUnit: "mg/dL" },

  // —— Inflammation / IBD-relevant ——
  { name: "CRP", defaultUnit: "mg/L", notes: "C-reactive protein" },
  { name: "hs-CRP", defaultUnit: "mg/L", notes: "High-sensitivity CRP" },
  { name: "ESR", defaultUnit: "mm/hr", notes: "Sedimentation rate" },
  { name: "Fecal calprotectin", defaultUnit: "ug/g" },
  { name: "Fecal lactoferrin", defaultUnit: "ug/g" },

  // —— Iron studies ——
  { name: "Iron", defaultUnit: "ug/dL" },
  { name: "Ferritin", defaultUnit: "ng/mL" },
  { name: "TIBC", defaultUnit: "ug/dL" },
  { name: "UIBC", defaultUnit: "ug/dL" },
  { name: "Transferrin", defaultUnit: "mg/dL" },
  { name: "Transferrin saturation", defaultUnit: "%" },

  // —— Vitamins / nutrition ——
  { name: "Vitamin B12", defaultUnit: "pg/mL" },
  { name: "Folate", defaultUnit: "ng/mL" },
  { name: "RBC folate", defaultUnit: "ng/mL" },
  { name: "Vitamin D 25-OH", defaultUnit: "ng/mL" },
  { name: "Vitamin D 1,25", defaultUnit: "pg/mL" },
  { name: "Vitamin A", defaultUnit: "ug/dL" },
  { name: "Vitamin E", defaultUnit: "mg/L" },
  { name: "Zinc", defaultUnit: "ug/dL" },
  { name: "Copper", defaultUnit: "ug/dL" },

  // —— Thyroid ——
  { name: "TSH", defaultUnit: "mIU/L" },
  { name: "Free T4", defaultUnit: "ng/dL" },
  { name: "Free T3", defaultUnit: "pg/mL" },
  { name: "Total T4", defaultUnit: "ug/dL" },
  { name: "Total T3", defaultUnit: "ng/dL" },
  { name: "TPO antibodies", defaultUnit: "IU/mL" },

  // —— Diabetes / metabolic ——
  { name: "HbA1c", defaultUnit: "%" },
  { name: "Insulin", defaultUnit: "uIU/mL" },
  { name: "C-peptide", defaultUnit: "ng/mL" },
  { name: "Fructosamine", defaultUnit: "umol/L" },

  // —— Coagulation ——
  { name: "PT", defaultUnit: "sec" },
  { name: "INR", defaultUnit: null },
  { name: "aPTT", defaultUnit: "sec" },
  { name: "D-dimer", defaultUnit: "ng/mL" },
  { name: "Fibrinogen", defaultUnit: "mg/dL" },

  // —— Cardiac ——
  { name: "Troponin I", defaultUnit: "ng/mL" },
  { name: "Troponin T", defaultUnit: "ng/mL" },
  { name: "BNP", defaultUnit: "pg/mL" },
  { name: "NT-proBNP", defaultUnit: "pg/mL" },
  { name: "CK", defaultUnit: "U/L" },
  { name: "CK-MB", defaultUnit: "ng/mL" },

  // —— Other common ——
  { name: "PSA", defaultUnit: "ng/mL" },
  { name: "Free PSA", defaultUnit: "ng/mL" },
  { name: "Homocysteine", defaultUnit: "umol/L" },
  { name: "Cortisol", defaultUnit: "ug/dL" },
  { name: "Testosterone total", defaultUnit: "ng/dL" },
  { name: "Testosterone free", defaultUnit: "pg/mL" },
  { name: "Estradiol", defaultUnit: "pg/mL" },
  { name: "Prolactin", defaultUnit: "ng/mL" },
  { name: "PTH intact", defaultUnit: "pg/mL" },
  { name: "Amylase", defaultUnit: "U/L" },
  { name: "Lipase", defaultUnit: "U/L" },
  { name: "Ammonia", defaultUnit: "umol/L" },
  { name: "Lactate", defaultUnit: "mmol/L" },
  { name: "Procalcitonin", defaultUnit: "ng/mL" },

  // —— Blood gas (if ever tracked) ——
  { name: "pH arterial", defaultUnit: null },
  { name: "pCO2", defaultUnit: "mmHg" },
  { name: "pO2", defaultUnit: "mmHg" },
  { name: "HCO3", defaultUnit: "mmol/L" },
  { name: "O2 saturation", defaultUnit: "%" },

  // —— Urinalysis highlights ——
  { name: "Urine specific gravity", defaultUnit: null },
  { name: "Urine pH", defaultUnit: null },
  { name: "Urine protein", defaultUnit: "mg/dL" },
  { name: "Urine glucose", defaultUnit: "mg/dL" },
  { name: "Urine microalbumin", defaultUnit: "mg/L" },
  { name: "Urine albumin/creatinine ratio", defaultUnit: "mg/g" },
  { name: "Urine creatinine", defaultUnit: "mg/dL" },
];
