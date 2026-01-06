import React, { useState } from "react";
import { Mail, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import Logo from "./Logo";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Champ requis",
        description: "Veuillez saisir votre adresse email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/password-reset/", { email });
      if (response.data.status === "ok") {
        setIsSubmitted(true);
        toast({
          title: "Email envoyé",
          description: response.data.message || 
            "Si cette adresse existe dans notre système, vous recevrez un email avec les instructions de réinitialisation.",
        });
      } else {
        toast({
          title: "Erreur",
          description: response.data.message || "Une erreur est survenue lors de l'envoi",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.message || "Une erreur est survenue lors de la communication avec le serveur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="W-full">
        <PublicHeader />
        <div className="container mx-auto px-4 py-8 max-w-md">
          <Card>
            <CardHeader className="space-y-4 pb-6">
              <div className="flex justify-center">
                <Logo />
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Email envoyé !
                </CardTitle>
                <CardDescription className="mt-2">
                  Nous avons envoyé les instructions de réinitialisation à
                </CardDescription>
                <p className="font-medium text-primary mt-1">{email}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 text-center">
                  <strong>Conseil :</strong> Vérifiez votre dossier spam si vous ne voyez pas notre email dans les prochaines minutes.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3">
              <Button 
                onClick={() => navigate("/")}
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Button>
              <Button 
                onClick={() => {
                  setEmail("");
                  setIsSubmitted(false);
                }}
                className="w-full"
                variant="ghost"
              >
                Réessayer avec une autre adresse
              </Button>
            </CardFooter>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="W-full">
      <PublicHeader />

      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <Logo />
            </div>
            <div className="text-center">
              
              <CardTitle className="text-2xl font-bold text-foreground">
                Mot de passe oublié ?
              </CardTitle>
              <CardDescription className="mt-2">
                Saisissez votre adresse email et nous vous enverrons des instructions pour réinitialiser votre mot de passe
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium">
                  Adresse email
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    placeholder="utilisateur"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi en cours...
                  </div>
                ) : (
                  "Envoyer les instructions"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 border-t pt-6">
            <Button 
              onClick={() => navigate("/")}
              variant="outline" 
              className="w-full"
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la connexion
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
              <KeyRound className="h-3 w-3" />
              <span>Système sécurisé</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Copyright © 2025 - CEB. Tous droits réservés.
            </p>
          </CardFooter>
        </Card>
      </div>
      <PublicFooter />
    </div>
  );
};

export default ForgotPasswordForm;