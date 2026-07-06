import React, { useState } from "react";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle, KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import Logo from "./Logo";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "@/lib/apiClient";

const ResetPasswordForm = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { uid, token } = useParams();

  // Check password strength
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Mots de passe différents",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength < 75) {
      toast({
        title: "Mot de passe faible",
        description: "Veuillez choisir un mot de passe plus fort",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post(
        `password-reset-confirm/${uid}/${token}/`,
        {
          new_password1: password,
          new_password2: confirmPassword,
        }
      );

      const data = response.data;

      if (data.status === "ok") {
        setIsSubmitted(true);
        toast({
          title: "Succès",
          description: "Votre mot de passe a été réinitialisé avec succès",
        });

        setTimeout(() => {
          navigate("/connexion");
        }, 3000);
      } else {
        toast({
          title: "Erreur",
          description: data.message || "Une erreur est survenue lors de la réinitialisation",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erreur lors de la réinitialisation du mot de passe:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Une erreur est survenue lors de la réinitialisation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (isSubmitted) {
    return (
      <div className="W-full">
        <PublicHeader />

        <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-md">
          <Card className="overflow-hidden border-border/70 shadow-elevated">
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
                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Mot de passe réinitialisé !
                </CardTitle>
                <CardDescription className="mt-2">
                  Votre mot de passe a été modifié avec succès. Vous allez être redirigé vers la page de connexion.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <div className="bg-green-50 rounded-lg p-4 border ">
                <p className="text-sm text-green-700 text-center">
                  <strong>Conseil de sécurité :</strong> Utilisez ce mot de passe uniquement pour ce service et ne le partagez avec personne.
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button 
                onClick={() => navigate("/connexion")}
                className="w-full"
              >
                Se connecter maintenant
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

        <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-md">
        <Card className="overflow-hidden border-border/70 shadow-elevated">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <Logo />
          </div>
          <div className="text-center">
           
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
              Nouveau mot de passe
            </CardTitle>
            <CardDescription className="mt-2">
              Choisissez un mot de passe fort et sécurisé pour protéger votre compte
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="password" className="text-sm font-medium">
                Nouveau mot de passe
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
              
              {password.length > 0 && (
                <div className="space-y-2">
                  <Progress value={passwordStrength} className="h-2" />
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-muted-foreground gap-2 sm:gap-0">
                    <span>Force du mot de passe</span>
                    <span className={passwordStrength >= 75 ? "text-green-600" : "text-amber-600"}>
                      {passwordStrength >= 75 ? "Fort" : passwordStrength >= 50 ? "Moyen" : "Faible"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={toggleShowConfirmPassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
              
              {confirmPassword.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {passwordsMatch ? (
                    <span className="text-green-600">✓ Les mots de passe correspondent</span>
                  ) : (
                    <span className="text-destructive">✗ Les mots de passe ne correspondent pas</span>
                  )}
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors"
              disabled={loading || !passwordsMatch || passwordStrength < 75}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Réinitialisation...
                </div>
              ) : (
                "Réinitialiser le mot de passe"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 border-t pt-6">
          <Button 
            onClick={() => navigate("/connexion")}
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
            Copyright © {new Date().getFullYear()} - CEB. Tous droits réservés.
          </p>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
};

export default ResetPasswordForm;