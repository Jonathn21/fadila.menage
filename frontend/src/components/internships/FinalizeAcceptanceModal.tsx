// components/internships/FinalizeAcceptanceModal.tsx
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
import { Loader2, Upload, FileText, CheckCircle, Download, AlertCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FinalizeAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandeId: number;
  studentName: string;
  conventionTemporaireUrl?: string;
  onSuccess: () => void;
}

const FinalizeAcceptanceModal: React.FC<FinalizeAcceptanceModalProps> = ({
  open,
  onOpenChange,
  demandeId,
  studentName,
  conventionTemporaireUrl,
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
        description: "Veuillez uploader la lettre signée",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("fichier_signe", file);

    try {
      const response = await apiClient.post(
        `/demandes/${demandeId}/finaliser-acceptation/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la finalisation");
      }

      toast({
        title: "Acceptation finalisée avec succès !",
        description: `Le stage a été créé pour ${studentName}`,
        variant: "default",
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
      
      // Rediriger vers le nouveau stagiaire
      if (response.data.stagiaire?.id) {
        setTimeout(() => {
          window.location.href = `/stagiaires/${response.data.stagiaire.id}`;
        }, 2000);
      }
      
    } catch (error: any) {
      console.error("Erreur finalisation:", error);
      
      let errorMessage = "Impossible de finaliser l'acceptation";
      
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
            <CheckCircle className="h-5 w-5 text-green-600" />
            Finaliser l'acceptation
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
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    Uploader la lettre signée
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Après signature, uploadez le PDF signé
                  </p>
                </div>

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
                <li>• Numérisez la lettre signée au format PDF</li>
                <li>• Uploadez le PDF signé pour finaliser l'acceptation</li>
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
                Finaliser l'acceptation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinalizeAcceptanceModal;