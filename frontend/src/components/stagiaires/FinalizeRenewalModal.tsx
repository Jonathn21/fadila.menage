// components/stagiaires/FinalizeRenewalModal.tsx
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
import { Loader2, Upload, FileText, CheckCircle, Download, AlertCircle, FileCheck, Info, CalendarDays, User, Building2, ChevronRight } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

interface FinalizeRenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stagiaireId: string;
  previousStage: any;
  conventionTemporaireUrl?: string;
  onSuccess: () => void;
}

const FinalizeRenewalModal: React.FC<FinalizeRenewalModalProps> = ({
  open,
  onOpenChange,
  stagiaireId,
  previousStage,
  conventionTemporaireUrl,
  onSuccess,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [nouveauStageData, setNouveauStageData] = useState<any>(null);

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

  const handleDownloadTemporary = async () => {
    if (!conventionTemporaireUrl) {
      setDownloadError("URL de convention temporaire non disponible");
      toast({
        title: "Erreur",
        description: "La convention temporaire n'est pas disponible. Veuillez recommencer le pré-renouvellement.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const response = await apiClient.get(conventionTemporaireUrl, {
        responseType: "blob",
      });
      
      const blob = response.data;
      
      // Vérifier si le blob est valide
      if (!blob || blob.size === 0) {
        throw new Error("Le fichier téléchargé est vide");
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `convention_renouvellement_${previousStage.nom}_${previousStage.prenom}_a_signer.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Convention téléchargée",
        description: "La convention est prête à être signée",
        variant: "default",
      });
      
    } catch (error: any) {
      console.error("Erreur téléchargement:", error);
      
      let errorMessage = "Impossible de télécharger la convention";
      if (error.response?.status === 404) {
        errorMessage = "La convention temporaire n'a pas été trouvée. Veuillez recommencer le pré-renouvellement.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setDownloadError(errorMessage);
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Fichier manquant",
        description: "Veuillez uploader la convention signée",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("fichier_signe", file);

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
        throw new Error(response.data.message || "Erreur lors de la finalisation");
      }

      // Stocker les données du nouveau stage
      setNouveauStageData(response.data);

      toast({
        title: "Renouvellement finalisé avec succès !",
        description: response.data.message || `Un nouveau stage a été créé pour ${previousStage.prenom} ${previousStage.nom}`,
        variant: "default",
      });

      onSuccess();
      
    } catch (error: any) {
      console.error("Erreur finalisation:", error);
      
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

  const handleViewNewStage = () => {
    if (nouveauStageData?.nouveau_stage?.id) {
      navigate(`/stagiaires/${nouveauStageData.nouveau_stage.id}`);
    }
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setDownloadError(null);
    setNouveauStageData(null);
    onOpenChange(false);
  };

  // Si le renouvellement est réussi, afficher un résumé
  if (nouveauStageData) {
    const nouveauStage = nouveauStageData.nouveau_stage;
    
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Renouvellement réussi !
                </DialogTitle>
                <DialogDescription>
                  Le nouveau stage a été créé avec succès
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Résumé du nouveau stage */}
            <Card className="border-green-200 bg-green-50/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <User className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    {nouveauStage?.prenom} {nouveauStage?.nom}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Nouveau stage créé
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{nouveauStage?.type_stage}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Direction/Service:</span>
                    <span className="font-medium">{nouveauStage?.direction} / {nouveauStage?.service}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Période:</span>
                    <span className="font-medium">
                      {nouveauStage?.date_debut} - {nouveauStage?.date_fin}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Statut:</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      {nouveauStage?.statut}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ancien stage mis à jour */}
            <Card className="border-blue-200 bg-blue-50/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800">Ancien stage mis à jour</h4>
                    <p className="text-sm text-blue-600">
                      Marqué comme "renouvelé"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800 mb-1">Prochaines étapes :</p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Vous pouvez maintenant gérer le nouveau stage</li>
                    <li>• Les deux stages sont liés dans le système</li>
                    <li>• Consultez l'historique des renouvellements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Fermer
            </Button>
            <Button
              onClick={handleViewNewStage}
              className="w-full sm:w-auto gap-2"
            >
              Voir le nouveau stage
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <FileCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Étape 2 : Finaliser le renouvellement
              </DialogTitle>
              <DialogDescription>
                Téléchargez la convention, faites-la signer, puis uploadez-la
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Étape 1: Téléchargement */}
          {conventionTemporaireUrl && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                      <Download className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-green-800">Étape 1 : Télécharger la convention</h3>
                      <p className="text-sm text-green-700">
                        Téléchargez la convention générée pour la faire signer
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleDownloadTemporary}
                    variant="outline"
                    className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-100 hover:text-green-800"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Télécharger la convention
                      </>
                    )}
                  </Button>

                  {downloadError && (
                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                      <AlertDescription className="text-destructive text-sm">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {downloadError}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="text-sm text-green-700 mt-2">
                    <p className="font-medium mb-1">Instructions :</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Imprimez la convention téléchargée</li>
                      <li>Faites-la signer par toutes les parties</li>
                      <li>Scannez ou photographiez le document signé</li>
                      <li>Uploadez le PDF dans l'étape suivante</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Étape 2: Upload de la convention signée */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Étape 2 : Uploader la convention signée</h3>
                    <p className="text-sm text-muted-foreground">
                      Après signature, uploadez le PDF signé pour créer le nouveau stage
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="file-upload" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Fichier signé (PDF uniquement)
                  </Label>
                  
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer bg-muted/10">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="font-medium mb-1">
                        {file ? file.name : "Cliquez pour sélectionner un fichier"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Format accepté : PDF (max 10MB)
                      </p>
                      <Button variant="outline" className="mt-4" type="button">
                        Sélectionner un fichier
                      </Button>
                    </label>
                  </div>
                  
                  {file && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations importantes */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800">Ce qui se passera :</h4>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Un <strong>nouveau stage</strong> sera créé avec les informations du pré-renouvellement</li>
                    <li>L'ancien stage sera marqué comme <strong>"renouvelé"</strong></li>
                    <li>Les deux stages seront <strong>liés</strong> dans le système</li>
                    <li>Vous serez <strong>redirigé</strong> vers la page du nouveau stage</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading} className="w-full sm:w-auto">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700"
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