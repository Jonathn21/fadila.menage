import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, Copy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

interface ConfirmationDialogProps {
  trackingCode: string;
  email: string;
  onNewApplication: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  trackingCode,
  email,
  onNewApplication,
}) => {
  const { toast } = useToast();

  const copyTrackingCode = () => {
    navigator.clipboard.writeText(trackingCode);
    toast({
      title: "Code copié",
      description: "Le code de suivi a été copié dans le presse-papiers",
    });
  };

  return (
    <div className="min-h-screen bg-background">
     

      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-2xl">
        <Card className="bg-green-50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              Demande soumise avec succès !
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 md:space-y-6">
            <div className="text-center text-green-700">
              <p className="mb-4">
                Merci pour votre candidature ! Votre demande de stage a été
                transmise avec succès à notre équipe des ressources humaines.
              </p>
              <p>
                Vous recevrez une confirmation par email à l'adresse{" "}
                <strong>{email}</strong>{" "}
                dans les prochaines minutes.
              </p>
            </div>

            <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center">
                <Mail className="mr-2 h-5 w-5 text-primary" />
                Code de suivi de votre demande
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg text-center">
                  {trackingCode}
                </div>
                <Button variant="outline" size="sm" onClick={copyTrackingCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Conservez précieusement ce code pour suivre l'évolution de votre
                candidature.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">
                Prochaines étapes :
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • Notre équipe examinera votre candidature dans un bref délai
                </li>
                <li>
                  • Si votre profil correspond à nos besoins, nous vous
                  contacterons pour un entretien
                </li>
                <li>
                  • Vous pouvez nous contacter à tout moment en mentionnant
                  votre code de suivi
                </li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <Button
                onClick={onNewApplication}
                variant="outline"
                className="mr-4"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Nouvelle candidature
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-primary hover:bg-primary/90"
              >
                Retour à l'accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
