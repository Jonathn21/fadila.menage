// src/types.ts
export interface Demande {
  id: number;
  etudiant_nom: string;
  etudiant_prenom: string;
  etudiant_specialite: string;
  statut_stage: string;
  date_soumission: string;
}

export interface Entretien {
  id: number;
  titre: string;
  date: string;
}

export interface DashboardData {
  total_demandes: number;
  stages_en_cours: number;
  stages_acceptes: number;
  stages_refuses: number;
  dernieres_demandes: Demande[];
  entretiens_a_venir: Entretien[];
  attestations_total: number;
  attestations_en_attente: number;
  attestations_approuvees: number;
  attestations_traitees: number;
}


