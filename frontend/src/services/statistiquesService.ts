// src/services/statistiquesService.ts
import apiClient from "@/lib/apiClient";

export interface StatistiquesResponse {
  annee_cible: number;
  total_demandes: number;
  taux_acceptation: number;
  delai_moyen: number;
  duree_moyenne_stage: number;
  stages_en_cours: number;
  demandes_par_mois: number[];
  repartition_statuts: number[];
  perf_hebdo: number[];
  comp_annee: number[];
  comp_annee_labels: number[];
}

export const getStatistiques = async (annee?: number): Promise<StatistiquesResponse> => {
  const params = annee ? { annee } : {};
  const response = await apiClient.get<StatistiquesResponse>("/statistiques/", { params });
  return response.data;
};
