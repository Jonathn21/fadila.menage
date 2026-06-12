// components/stagiaires/modals/FinalizeRenewalModal.tsx
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, CheckCircle, Download, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FinalizeRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagiaireId: string;
  studentName: string;
  conventionTemporaireUrl?: string;
  conventionTemporaireId?: number;
  onSuccess: () => void;
}

const FinalizeRenewalModal: React.FC<FinalizeRenewalModalProps> = ({
  open,
  onOpenChange,
  stagiaireId,
  studentName,
  conventionTemporaireUrl,
  conventionTemporaireId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validation du fichier
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Format invalide",
          description: "Veuillez uploader un fichier PDF uniquement",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "Fichier trop volumineux",
          description: "Le fichier ne doit pas dépasser 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setDownloadError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Fichier manquant",
        description: "Veuillez uploader la lettre de stage signée",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("fichier_signe", file);
    if (conventionTemporaireId) {
      formData.append("convention_temporaire_id", conventionTemporaireId.toString());
    }

    try {
      const response = await apiClient.post(
        `/stagiaires/${stagiaireId}/finaliser-renouvellement/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la finalisation du renouvellement");
      }

      toast({
        title: "Renouvellement finalisé avec succès !",
        description: `Le nouveau stage a été créé pour ${studentName}`,
        variant: "default",
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
      
      // Rediriger vers le nouveau stagiaire si disponible
      if (response.data.nouveau_stagiaire?.id) {
        setTimeout(() => {
          window.location.href = `/stagiaires/${response.data.nouveau_stagiaire.id}`;
        }, 2000);
      } else {
        // Sinon recharger la page actuelle pour voir le stage terminé
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
    } catch (error: any) {
      console.error("Erreur finalisation renouvellement:", error);
      
      let errorMessage = "Impossible de finaliser le renouvellement";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDownloadError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Finaliser le renouvellement
          </DialogTitle>
          <DialogDescription>
            Téléchargez la lettre de stage, faites-la signer, puis uploadez-la
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 md:space-y-6 py-4">
          

          {/* Étape 2: Uploader */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600">2</span>
                  </div>
                  <h3 className="font-medium">Uploader la lettre de stage signée</h3>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Après signature, uploadez le PDF signé
                </p>

                <div className="space-y-3">
                  <Label htmlFor="file-upload" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Fichier signé (PDF uniquement)
                  </Label>
                  
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  
                  {file && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border overflow-hidden">
                      <FileText className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="h-8 w-8 p-0 shrink-0"
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Format accepté: PDF uniquement • Taille max: 10MB
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Instructions importantes
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Téléchargez la lettre de stage générée</li>
                <li>• Imprimez-la et faites-la signer par les parties concernées</li>
                <li>• Numérisez la lettre de stage signée au format PDF</li>
                <li>• Uploadez le PDF signé pour finaliser le renouvellement</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalisation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Finaliser le renouvellement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinalizeRenewalModal;