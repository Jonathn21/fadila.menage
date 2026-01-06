import apiClient from "@/lib/apiClient";

// Types pour les réponses API
interface ApiResponse {
  status: string;
  message: string;
  data?: any;
}

// Archiver une demande
export async function archiverDemande(id: number): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/archiver/`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erreur lors de l'archivage de la demande");
  }
}

// Désarchiver une demande
export async function desarchiverDemande(id: number): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/desarchiver/`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erreur lors du désarchivage de la demande");
  }
}

// Refuser une demande avec motif
export async function refuserDemande(id: number, motif: string): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/refuser/`, {
      motif_refus: motif.trim(),
    });
    return response.data;
  } catch (error: any) {
    console.error("Erreur lors du refus de la demande:", error);
    throw new Error(
      error.response?.data?.message || 
      "Erreur lors du refus de la candidature. Veuillez réessayer."
    );
  }
}

// Accepter une demande
export async function accepterDemande(id: number): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/accepter/`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erreur lors de l'acceptation de la demande");
  }
}

// Obtenir les détails d'une demande
export async function obtenirDemande(id: number) {
  try {
    const response = await apiClient.get(`/demandes/${id}/`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erreur lors de la récupération de la demande");
  }
}

// Obtenir la liste des demandes avec filtres
export async function obtenirListeDemandes(params?: {
  statut?: string;
  archivee?: boolean;
  page?: number;
  recherche?: string;
}) {
  try {
    const response = await apiClient.get('/demandes/', { params });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Erreur lors de la récupération des demandes");
  }
}

// Demander des informations supplémentaires
export async function demanderInformations(id: number, message: string): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/demander-infos/`, {
      message: message.trim(),
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || 
      "Erreur lors de l'envoi de la demande d'informations"
    );
  }
}