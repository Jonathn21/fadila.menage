import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import Logo from "./Logo";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import { Shield, Mail, RotateCcw, Loader2, ArrowLeft } from "lucide-react";

const VerificationForm = () => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const email = sessionStorage.getItem("masked_email") || "****@example.com";
  const user_id = sessionStorage.getItem("user_id");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, "");
    if (inputValue.length <= 6) {
      setValue(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length === 6) {
      setValue(pastedData);
      setTimeout(() => {
        handleSubmit();
      }, 100);
    }
  };

  useEffect(() => {
    if (value.length === 6 && !loading) {
      handleSubmit();
    }
  }, [value]);

  // ✅ Fonction pour configurer les tokens dans apiClient
  const configureApiClient = (accessToken: string) => {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    // Même clé que celle lue par apiClient
    sessionStorage.setItem("access", accessToken);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (value.length !== 6) {
      toast({
        title: "Code incomplet",
        description: "Veuillez entrer un code complet à 6 chiffres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Envoi vérification 2FA:", { user_id, code: value });
      
      const response = await apiClient.post("/verify-2fa/", {
        code: value,
        user_id: user_id,
      });

      console.log("✅ Réponse 2FA:", response.data);

      if (response.data.status === "ok") {
        // ✅ Configuration du token JWT
        if (response.data.tokens?.access) {
          configureApiClient(response.data.tokens.access);
        }
        if (response.data.tokens?.refresh) {
          sessionStorage.setItem("refresh", response.data.tokens.refresh);
        }

        // ✅ Stocker les infos utilisateur (rôle) renvoyées par le backend
        if (response.data.user) {
          sessionStorage.setItem("user", JSON.stringify(response.data.user));
          if (response.data.user.role) {
            sessionStorage.setItem("userRole", response.data.user.role);
          }
        }

        // ✅ Nettoyage des infos temporaires
        sessionStorage.removeItem("user_id");
        sessionStorage.removeItem("masked_email");

        toast({
          title: "Vérification réussie",
          description: "Redirection vers le tableau de bord...",
        });

        // ✅ Attendre un peu avant la redirection
        setTimeout(() => {
          navigate("/accueil", { replace: true });
        }, 1500);

      } else {
        throw new Error(response.data.message || "Code invalide");
      }
    } catch (err: any) {
      console.error("❌ Erreur 2FA:", err);
      
      let errorMessage = "Erreur lors de la vérification.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      setValue("");
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setResending(true);
    try {
      const response = await apiClient.post("/resend-2fa/", { user_id });

      if (response.data.status === "ok") {
        toast({
          title: "Code renvoyé",
          description: "Un nouveau code a été envoyé à votre adresse email.",
        });
        setTimer(60);
        setValue("");
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        throw new Error(response.data.message || "Erreur lors du renvoi");
      }
    } catch (err: any) {
      let errorMessage = "Impossible de renvoyer le code.";
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = () => {
    sessionStorage.removeItem("user_id");
    sessionStorage.removeItem("masked_email");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex justify-center">
                <Logo />
              </div>
              <div className="text-center">
                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Vérification en deux étapes
                </CardTitle>
                <CardDescription className="mt-2">
                  Entrez le code de vérification envoyé à
                </CardDescription>
                <div className="flex items-center justify-center gap-2 mt-2 bg-muted/50 rounded-lg p-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{email}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="flex justify-center">
                  <div className="space-y-3 w-full max-w-xs">
                    <Input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={value}
                      onChange={handleInputChange}
                      onPaste={handlePaste}
                      placeholder="000000"
                      className="w-full h-14 text-center text-2xl font-mono tracking-widest"
                      maxLength={6}
                      disabled={loading}
                      autoComplete="one-time-code"
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      {value.length}/6 chiffres - La vérification se fera automatiquement
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 transition-colors"
                  disabled={loading || value.length !== 6}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Vérification en cours...
                    </div>
                  ) : (
                    "Vérifier le code"
                  )}
                </Button>

                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Vous n'avez pas reçu de code ?
                  </p>
                  <Button
                    type="button"
                    onClick={handleResend}
                    variant="outline"
                    disabled={resending || timer > 0}
                    className="gap-2"
                  >
                    {resending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    {timer > 0 ? `Renvoyer (${timer}s)` : "Renvoyer le code"}
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 border-t pt-6">
              <Button 
                onClick={handleBackToLogin}
                variant="ghost" 
                className="w-full gap-2"
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Copyright © 2025 - CEB. Tous droits réservés.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      
    </div>
  );
};

export default VerificationForm;