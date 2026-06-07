import apiClient from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errors";

interface ApiResponse {
  status: string;
  message: string;
  data?: unknown;
}

export async function archiverDemande(id: number): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/archiver/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Erreur lors de l'archivage de la demande"));
  }
}

export async function desarchiverDemande(id: number): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/desarchiver/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Erreur lors du désarchivage de la demande"));
  }
}

export async function refuserDemande(id: number, motif: string): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/refuser/`, {
      motif_refus: motif.trim(),
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors du refus de la demande:", error);
    throw new Error(getErrorMessage(error, "Erreur lors du refus de la candidature. Veuillez réessayer."));
  }
}

export async function accepterDemande(id: number): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/accepter/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Erreur lors de l'acceptation de la demande"));
  }
}

export async function obtenirDemande(id: number) {
  try {
    const response = await apiClient.get(`/demandes/${id}/`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Erreur lors de la récupération de la demande"));
  }
}

export async function obtenirListeDemandes(params?: {
  statut?: string;
  archivee?: boolean;
  page?: number;
  recherche?: string;
}) {
  try {
    const response = await apiClient.get('/demandes/', { params });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Erreur lors de la récupération des demandes"));
  }
}

export async function demanderInformations(id: number, message: string): Promise<ApiResponse> {
  try {
    const response = await apiClient.post(`/demandes/${id}/demander-infos/`, {
      message: message.trim(),
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Erreur lors de l'envoi de la demande d'informations"));
  }
}
