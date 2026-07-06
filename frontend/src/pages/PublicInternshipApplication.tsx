import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import InternshipTypeStep from "@/components/internship-application/InternshipTypeStep";
import DocumentUploadStep from "@/components/internship-application/DocumentUploadStep";
import SummaryStep from "@/components/internship-application/SummaryStep";
import ConfirmationDialog from "@/components/internship-application/ConfirmationDialog";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import apiClient from "@/lib/apiClient"; 

export interface ApplicationData {
  nom: string;
  prenom: string;
  genre: string;
  paysResidence: string;
  telephone: string;
  email: string;
  domaine: string;
  niveauEtude: string;
  typeStage: string;
  adresse: string; // 🔥 NOUVEAU CHAMP
  nomEcole?: string;
  adresseEcole?: string;
  telephoneEcole?: string;
  emailEcole?: string;
  documents: {
    photoPasseport?: File; // 🔥 NOUVEAU CHAMP
    cv?: File;
    lettreMotivation?: File;
    diplomes?: File[];
  };
}

const PublicInternshipApplication = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    nom: "",
    prenom: "",
    genre: "",
    paysResidence: "",
    telephone: "",
    email: "",
    domaine: "",
    niveauEtude: "",
    typeStage: "",
    adresse: "", // 🔥 INITIALISATION
    documents: {},
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const { toast } = useToast();

  const steps = ["Informations", "Documents", "Récapitulatif"];

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleDataUpdate = (data: Partial<ApplicationData>) => {
    setApplicationData((prev) => ({ ...prev, ...data }));
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();

      Object.entries(applicationData).forEach(([key, value]) => {
        if (key !== "documents" && value) {
          formData.append(key, value as string);
        }
      });

      // 🔹 Fichiers
      if (applicationData.documents.photoPasseport) { // 🔥 NOUVEAU CHAMP
        formData.append("photoPasseport", applicationData.documents.photoPasseport);
      }
      if (applicationData.documents.cv) {
        formData.append("cv", applicationData.documents.cv);
      }
      if (applicationData.documents.lettreMotivation) {
        formData.append("lettreMotivation", applicationData.documents.lettreMotivation);
      }
      if (applicationData.documents.diplomes) {
        applicationData.documents.diplomes.forEach((file) => {
          formData.append("diplomes", file);
        });
      }

      // 🔹 Appel API Django (POST)
      const response = await apiClient.post("/demandes/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { tracking_id } = response.data;

      setTrackingCode(tracking_id);
      setIsSubmitted(true);

      toast({
        title: "Demande soumise avec succès",
        description: `Votre code de suivi : ${tracking_id}`,
      });
    } catch (error: any) {
      console.error("Erreur soumission:", error);
      const errorMessage = error.response?.data?.error || "Impossible de soumettre votre demande, réessayez.";
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleNewApplication = () => {
    setCurrentStep(0);
    setApplicationData({
      nom: "",
      prenom: "",
      genre: "",
      paysResidence: "",
      telephone: "",
      email: "",
      domaine: "",
      niveauEtude: "",
      typeStage: "",
      adresse: "", // 🔥 RÉINITIALISATION
      documents: {},
    });
    setIsSubmitted(false);
    setTrackingCode("");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <PublicHeader />
        <div 
          className="relative text-white py-12 sm:py-16"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(5, 150, 105, 0.8), rgba(4, 120, 87, 0.8)), url('https://images.unsplash.com/photo-1636955816868-fcb881e57954?q=80&w=2070&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-lg sm:text-xl md:text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">CARRIÈRES</h1>
            <p className="text-base sm:text-lg opacity-90 max-w-3xl mx-auto px-4">
              Vous souhaitez rejoindre l'équipe de la CEB ? Envoyez-nous vos
              informations et documents, et nous vous contacterons au besoin.
            </p>
          </div>
        </div>
        <div className="flex-1 container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-4xl">
          <ConfirmationDialog
            trackingCode={trackingCode}
            email={applicationData.email}
            onNewApplication={handleNewApplication}
          />
        </div>
        <PublicFooter className="mt-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicHeader />

      <div 
        className="relative text-white py-12 sm:py-16"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(5, 150, 105, 0.8), rgba(4, 120, 87, 0.8)), url('https://images.unsplash.com/photo-1636955816868-fcb881e57954?q=80&w=2070&auto=format&fit=crop')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4">DEMANDE DE STAGE</h1>
          <p className="text-base sm:text-lg opacity-90 max-w-3xl mx-auto px-4">
            Vous souhaitez effectuer un stage à la CEB ? Transmettez-nous vos
            informations et vos documents, puis suivez votre demande en ligne.
          </p>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="border-b border-border/60 bg-muted/40 py-5 sm:py-6">
            <div className="flex items-center">
              {steps.map((step, index) => {
                const isDone = index < currentStep;
                const isActive = index === currentStep;
                return (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                          isDone && "border-primary bg-primary text-primary-foreground",
                          isActive && "border-primary bg-card text-primary shadow-sm ring-4 ring-primary/10",
                          !isDone && !isActive && "border-border bg-card text-muted-foreground"
                        )}
                      >
                        {isDone ? <Check className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className={cn("leading-tight", !isActive && "hidden sm:block")}>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Étape {index + 1}/{steps.length}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isActive ? "text-foreground" : isDone ? "text-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {step}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "mx-2 sm:mx-4 h-0.5 flex-1 rounded-full transition-colors",
                          index < currentStep ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-6 pt-5 sm:pt-6">
            {currentStep === 0 && (
              <InternshipTypeStep
                data={applicationData}
                onDataUpdate={handleDataUpdate}
                onNext={handleNext}
              />
            )}
            {currentStep === 1 && (
              <DocumentUploadStep
                data={applicationData}
                onDataUpdate={handleDataUpdate}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {currentStep === 2 && (
              <SummaryStep
                data={applicationData}
                onSubmit={handleSubmit}
                onPrevious={handlePrevious}
              />
            )}
          </CardContent>
        </Card>

        {/* Indicateurs de progression pour mobile */}
        <div className="mt-6 sm:mt-8 text-center">
          <div className="flex justify-center items-center space-x-2 mb-2">
            <span className="text-xs text-muted-foreground">
              Étape {currentStep + 1} sur {steps.length}
            </span>
            <div className="flex items-center space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index === currentStep
                      ? "bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentStep === 0 && "Remplissez vos informations personnelles"}
            {currentStep === 1 && "Téléversez vos documents requis"}
            {currentStep === 2 && "Vérifiez et soumettez votre demande"}
          </p>
        </div>
      </div>

      <PublicFooter className="mt-auto" />
    </div>
  );
};

export default PublicInternshipApplication;