import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, FileText, Image, Loader2 } from "lucide-react";
import { ApplicationData } from "@/pages/PublicInternshipApplication";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SummaryStepProps {
  data: ApplicationData;
  onSubmit: () => Promise<void> | void;
  onPrevious: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({
  data,
  onSubmit,
  onPrevious
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return; // Empêcher les clics multiples
    
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
    } finally {
      // Ne pas remettre isSubmitting à false ici car la navigation devrait se faire
      // Si la soumission échoue, le parent devrait gérer l'erreur et permettre une nouvelle tentative
    }
  };

  const SummaryRow = ({ label, value }: { label: string; value: string | undefined }) => (
    <div className="flex flex-col sm:flex-row py-3 border-b border-border/50">
      <dt className="font-medium text-foreground sm:w-1/3 mb-1 sm:mb-0">{label}</dt>
      <dd className="text-muted-foreground sm:w-2/3">{value || "Non renseigné"}</dd>
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          Ceci est un aperçu de votre envoi. Il n'a pas encore été envoyé ! 
          Veuillez prendre un moment pour vérifier vos informations. Vous pouvez également revenir en 
          arrière pour y apporter des modifications.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-0">
              <SummaryRow label="Nom" value={data.nom} />
              <SummaryRow label="Prénom" value={data.prenom} />
              <SummaryRow label="Genre" value={data.genre} />
              <SummaryRow label="Adresse" value={data.adresse} />
              <SummaryRow label="Pays de résidence" value={data.paysResidence} />
              <SummaryRow label="Téléphone" value={data.telephone} />
              <SummaryRow label="E-mail" value={data.email} />
              <SummaryRow label="Domaine" value={data.domaine} />
              <SummaryRow label="Niveau d'étude" value={data.niveauEtude} />
              <SummaryRow label="Type de stage" value={data.typeStage} />
            </dl>
          </CardContent>
        </Card>

        {/* School Information (if applicable) */}
        {data.typeStage === "Académique" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations de l'école</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-0">
                <SummaryRow label="Nom de l'école" value={data.nomEcole} />
                <SummaryRow label="Adresse" value={data.adresseEcole} />
                <SummaryRow label="Téléphone" value={data.telephoneEcole} />
                <SummaryRow label="E-mail" value={data.emailEcole} />
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 🔥 SECTION PHOTO PASSEPORT SÉPARÉE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photo Passeport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6 items-start">
            {/* Informations de la photo */}
            <div className="flex-1">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg gap-2 sm:gap-0">
                  <div className="flex items-center">
                    <Image className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">Statut</span>
                  </div>
                  <div className="flex items-center">
                    {data.documents.photoPasseport ? (
                      <span className="text-sm text-green-600 font-medium flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Photo fournie
                      </span>
                    ) : (
                      <span className="text-sm text-red-600 font-medium">Non fournie</span>
                    )}
                  </div>
                </div>
                
                {data.documents.photoPasseport && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                      <span className="font-medium">Nom du fichier :</span>
                      <span className="text-sm text-muted-foreground">{data.documents.photoPasseport.name}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2 sm:gap-0">
                      <span className="font-medium">Taille :</span>
                      <span className="text-sm text-muted-foreground">
                        {(data.documents.photoPasseport.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 🔥 PRÉVISUALISATION DE LA PHOTO */}
            {data.documents.photoPasseport && (
              <div className="flex-shrink-0">
                <div className="text-center">
                  <h4 className="text-sm font-medium mb-3">Aperçu de votre photo</h4>
                  <div className="w-32 h-32 border-2 border-primary rounded-lg overflow-hidden bg-muted mx-auto">
                    <img 
                      src={URL.createObjectURL(data.documents.photoPasseport)} 
                      alt="Photo passeport" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Format passeport
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Summary (SANS la photo passeport) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents téléversés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg gap-2 sm:gap-0">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">CV (Curriculum Vitae)</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">
                  {data.documents.cv ? data.documents.cv.name : "Aucun document"}
                </span>
                {data.documents.cv && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg gap-2 sm:gap-0">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">Lettre de motivation</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">
                  {data.documents.lettreMotivation ? data.documents.lettreMotivation.name : "Aucun document"}
                </span>
                {data.documents.lettreMotivation && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-muted rounded-lg gap-2 sm:gap-0">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <span className="font-medium">Diplômes / Attestations</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">
                  {data.documents.diplomes && data.documents.diplomes.length > 0 
                    ? `${data.documents.diplomes.length} fichier(s)` 
                    : "Aucun document"}
                </span>
                {data.documents.diplomes && data.documents.diplomes.length > 0 && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card className="bg-green-50  dark:bg-green-950 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-200">
                Votre demande est prête à être envoyée
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Tous les documents obligatoires sont présents. Vous pouvez maintenant soumettre votre demande.
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>
        
        <Button 
          onClick={handleSubmit}
          className="bg-red-600 hover:bg-red-700 text-white"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              Confirmer et envoyer la demande
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SummaryStep;