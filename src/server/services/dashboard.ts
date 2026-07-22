import { getProfile } from "@/server/services/profile";
import { listMedications } from "@/server/services/medications";
import { listSupplements } from "@/server/services/supplements";
import { listDiagnoses } from "@/server/services/diagnoses";
import { listLabPanels } from "@/server/services/labs";
import { listAllergies } from "@/server/services/allergies";

export function getDashboardSummary() {
  return {
    profile: getProfile(),
    activeMedicationCount: listMedications({ status: "active" }).length,
    activeSupplementCount: listSupplements({ status: "active" }).length,
    activeDiagnosisCount:
      listDiagnoses({ status: "active" }).length +
      listDiagnoses({ status: "chronic" }).length,
    recentLabs: listLabPanels().slice(0, 5),
    allergyCount: listAllergies().length,
  };
}
