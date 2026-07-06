import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import apiClient from "@/lib/apiClient";
import Logo from "./Logo";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useLocation } from "react-router-dom";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const accessToken = sessionStorage.getItem("access");
    if (accessToken) {
      navigate("/accueil");
    }
  }, [navigate]);

  // Récupérer l'email depuis l'état de navigation (si venant d'inscription)
  useEffect(() => {
    const state = location.state as { email?: string };
    if (state?.email) {
      setEmail(state.email);
      toast({
        title: "Inscription réussie",
        description: "Veuillez vous connecter avec votre compte",
      });
    }
  }, [location.state, toast]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email || !password) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post("/login/", { email, password });
      const data = response.data;

      if (data.status === "ok") {
        const { access, refresh } = data.tokens;
        const { session } = data;

        // Stockage des tokens (mêmes clés que celles lues par apiClient)
        sessionStorage.setItem("access", access);
        sessionStorage.setItem("refresh", refresh);

        if (session?.key) {
          sessionStorage.setItem("sessionKey", session.key);
        }

        // Stocker les infos utilisateur si disponibles
        if (data.user) {
          sessionStorage.setItem("user", JSON.stringify(data.user));
          if (data.user.role) {
            sessionStorage.setItem("userRole", data.user.role);
          }
        }

        toast({
          title: "Connexion réussie",
          description: "Redirection vers le tableau de bord...",
        });

        // Redirection avec délai pour voir le toast
        setTimeout(() => {
          navigate("/accueil", { replace: true });
        }, 1000);

      } else if (data.status === "2fa_required") {
        sessionStorage.setItem("user_id", data.user_id);
        sessionStorage.setItem("masked_email", data.masked_email);

        toast({
          title: "Vérification requise",
          description: `Un code de vérification a été envoyé à ${data.masked_email || "votre adresse email"}`,
        });

        navigate("/verification", { state: { email } });
      }
    } catch (err: any) {
      let errorMessage = "Une erreur est survenue lors de la connexion";
      let errorTitle = "Échec de connexion";
      
      if (err.response?.status === 401) {
        // Vérifier si c'est un mauvais mot de passe ou un utilisateur inexistant
        // Selon la structure de votre API backend
        if (err.response.data?.error?.includes("n'existe pas") || 
            err.response.data?.message?.includes("n'existe pas") ||
            err.response.data?.detail?.includes("n'existe pas") ||
            err.response.data?.error?.toLowerCase().includes("not found") ||
            err.response.data?.message?.toLowerCase().includes("not found") ||
            err.response.data?.detail?.toLowerCase().includes("not found")) {
          
          errorTitle = "Accès refusé";
          errorMessage = "Vous n'avez pas le droit d'accéder à l'application";
        } else {
          errorMessage = "Email ou mot de passe incorrect";
        }
      } else if (err.response?.status === 403) {
        errorTitle = "Accès refusé";
        errorMessage = "Vous n'avez pas le droit d'accéder à l'application";
      } else if (err.response?.status === 404) {
        errorTitle = "Utilisateur non trouvé";
        errorMessage = "Vous n'avez pas le droit d'accéder à l'application";
      } else if (err.response?.status === 400) {
        // Vérifier le message d'erreur spécifique pour l'accès refusé
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          if (errorData.toLowerCase().includes("n'existe pas") || 
              errorData.toLowerCase().includes("not found") ||
              errorData.toLowerCase().includes("accès refusé") ||
              errorData.toLowerCase().includes("access denied")) {
            errorTitle = "Accès refusé";
            errorMessage = "Vous n'avez pas le droit d'accéder à l'application";
          }
        } else if (errorData?.error || errorData?.message || errorData?.detail) {
          const errorText = (errorData.error || errorData.message || errorData.detail).toLowerCase();
          if (errorText.includes("n'existe pas") || 
              errorText.includes("not found") ||
              errorText.includes("accès refusé") ||
              errorText.includes("access denied")) {
            errorTitle = "Accès refusé";
            errorMessage = "Vous n'avez pas le droit d'accéder à l'application";
          }
        }
      } else if (err.response?.status === 429) {
        errorMessage = "Trop de tentatives. Veuillez réessayer plus tard";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (!err.response) {
        errorMessage = "Problème de connexion réseau";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-background">
      {/* Fond décoratif discret */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 75%)",
          }}
        />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="w-full max-w-md">
          <Card className="w-full overflow-hidden border-border/70 shadow-elevated">
            {/* Liseré de marque */}
            <CardHeader className="space-y-4 pb-6 pt-8">
              <div className="flex justify-center">
                <Logo />
              </div>
              <div className="text-center">
                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Connexion à votre compte
                </CardTitle>
                <CardDescription className="mt-2">
                  Entrez vos identifiants pour accéder à votre espace
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4 md:space-y-6">
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
                      placeholder="nom@exemple.com"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Mot de passe
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline transition-colors"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
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
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={isLoading}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Connexion en cours...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      Se connecter
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col items-center border-t bg-muted/20 py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <KeyRound className="h-3 w-3" />
                <span>Système sécurisé avec authentification à double facteur</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

    </div>
  );
};

export default LoginForm;