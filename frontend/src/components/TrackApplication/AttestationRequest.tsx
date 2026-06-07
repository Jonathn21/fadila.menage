// components/TrackApplication/AttestationRequest.tsx
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Upload, Award } from "lucide-react";
import { FileUploadCard } from "./FileUploadCard";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface AttestationRequestProps {
  trackingId: string;
  onSearch: () => void;
}

export const AttestationRequest: React.FC<AttestationRequestProps> = ({
  trackingId,
  onSearch
}) => {
  const [rapportStage, setRapportStage] = useState<File | null>(null);
  const [demandeManuscrite, setDemandeManuscrite] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const rapportInputRef = useRef<HTMLInputElement>(null);
  const demandeInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  const handleSubmitAttestation = async () => {
    if (!rapportStage || !demandeManuscrite || !trackingId) {
      toast({
        title: "Champs requis",
        description: "Veuillez sélectionner le rapport de stage ET la demande manuscrite",
        variant: "destructive",
      });
      return;
    }

    // Vérifier les types de fichiers
    if (!rapportStage.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Format invalide",
        description: "Le rapport de stage doit être au format PDF",
        variant: "destructive",
      });
      return;
    }

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const demandeExt = demandeManuscrite.name.toLowerCase().split('.').pop();
    if (!allowedExtensions.includes(`.${demandeExt}`)) {
      toast({
        title: "Format invalide",
        description: "La demande manuscrite doit être en PDF, JPG ou PNG",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("rapport_stage", rapportStage);
    formData.append("demande_manuscrite", demandeManuscrite);

    setIsSubmitting(true);

    try {
      console.log("🚀 Envoi de la demande d'attestation...");
      console.log("📁 Fichiers:", {
        rapport: rapportStage.name,
        demande: demandeManuscrite.name,
        trackingId
      });

      const response = await apiClient.post(
        `suivi-demande/${trackingId}/demande-attestation/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      console.log("✅ Réponse reçue:", response.data);

      toast({
        title: "Succès !",
        description: response.data.message || "Demande d'attestation envoyée avec succès",
      });

      // Réinitialiser
      setRapportStage(null);
      setDemandeManuscrite(null);
      
      // Rafraîchir les données après 2 secondes
      setTimeout(() => {
        onSearch();
      }, 2000);

    } catch (error: any) {
      console.error("❌ Erreur lors de l'envoi:", error);
      
      let errorMessage = "Une erreur est survenue lors de l'envoi";
      
      if (error.response) {
        if (error.response.status === 413) {
          errorMessage = "Fichier trop volumineux. Taille maximum: 10MB";
        } else if (error.response.status === 415) {
          errorMessage = "Format de fichier non supporté";
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.errors) {
          errorMessage = "Erreur de validation: " + JSON.stringify(error.response.data.errors);
        }
      } else if (error.request) {
        errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Award className="h-4 w-4 sm:h-5 sm:w-5" />
            Demande d'attestation de stage
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs sm:text-sm">
            Documents requis
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-800 mb-1 sm:mb-2 text-sm sm:text-base">Informations importantes</h4>
          <ul className="text-xs sm:text-sm text-amber-700 space-y-1">
            <li>• Le rapport de stage doit être au format PDF</li>
            <li>• La demande manuscrite doit être signée et scannée</li>
            <li>• Les deux documents sont obligatoires pour traiter votre demande</li>
            <li>• Vous recevrez un email de confirmation après soumission</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <FileUploadCard
            title="Rapport de stage"
            required={true}
            accept=".pdf"
            file={rapportStage}
            onFileSelect={(files) => setRapportStage(files?.[0] || null)}
            onFileRemove={() => setRapportStage(null)}
            inputRef={rapportInputRef}
            description="Format accepté: PDF uniquement. Taille max: 10MB"
          />

          <FileUploadCard
            title="Demande manuscrite signée"
            required={true}
            accept=".pdf,.jpg,.jpeg,.png"
            file={demandeManuscrite}
            onFileSelect={(files) => setDemandeManuscrite(files?.[0] || null)}
            onFileRemove={() => setDemandeManuscrite(null)}
            inputRef={demandeInputRef}
            description="Formats acceptés: PDF, JPG, PNG. Taille max: 5MB"
          />
        </div>

        <div className="border-t pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {rapportStage && demandeManuscrite ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Tous les documents sont prêts pour la soumission</span>
                </div>
              ) : (
                <div className="flex items-center text-amber-600">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span>Veuillez sélectionner les deux documents requis</span>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSubmitAttestation}
              disabled={isSubmitting || !rapportStage || !demandeManuscrite}
              className="w-full sm:w-auto"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                  <span>Soumission en cours...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span>Soumettre la demande d'attestation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};