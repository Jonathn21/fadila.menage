// components/TrackApplication/types.ts

export interface Stagiaire {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse?: string;
  specialite?: string;
  niveau?: string;
  genre?: string;
  pays_residence?: string;
}

export interface Etablissement {
  nom: string;
  email?: string;
  adresse?: string;
  telephone?: string;
}

export interface Document {
  nom: string;
  url: string;
  type?: string;
  id?: string;
}

export interface Convention {
  numero_convention: string;
  date_creation?: string;
  fichier_url?: string;
  est_temporaire?: boolean;
}

export interface Attestation {
  date_generation?: string;
  fichier_url?: string;
}

export interface DemandeAttestation {
  date_demande: string;
  fichier_url?: string;
  statut: 'en_attente' | 'en_traitement' | 'generee' | 'refusee';
  motif_refus?: string;
}

export interface Stage {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  niveau_etude?: string;
  specialite?: string;
  genre?: string;
  type_stage: string;
  remunere: boolean;
  montant_remuneration?: number;
  direction?: string;
  service?: string;
  lieu_stage?: string;
  date_accord?: string;
  date_debut: string;
  date_fin: string;
  statut_actuel: "Actuel" | "Terminé" | "À venir";
  duree_jours?: number;
  duree_mois?: number;
  jours_restants?: number;
  superviseur?: string;
  a_ete_renouvele?: boolean;
  stage_renouvele_id?: string;
  convention?: Convention;
  attestation?: Attestation;
  documents?: Document[];
  etablissement?: Etablissement;
  demande_attestation?: DemandeAttestation;
}

export interface ApplicationStatus {
  tracking_id: string;
  statut_stage: "En attente" | "En cours de traitement" | "Acceptée" | "Refusée" | "Information supplémentaire requise";
  date_soumission: string;
  date_maj: string;
  stagiaire: Stagiaire;
  type_stage: string;
  etablissement?: Etablissement;
  prochaines_etapes?: string;
  infos_supplementaires?: string;
  date_examen?: string;
  motif_refus?: string;
  documents?: Document[];
  photo_passeport?: string;
  stage?: Stage;
  statut_detaille?: string;
}

export interface DocumentFile {
  file: File;
  type: string;
  nom: string;
  replacesExisting?: boolean;
  replacesId?: string;
}