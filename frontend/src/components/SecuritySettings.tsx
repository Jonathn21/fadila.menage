import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield, AlertTriangle, Key, Lock, Smartphone, Bell, LogOut, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import apiClient from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Chrome, Cpu, Calendar } from "lucide-react";

type Session = {
  session_key: string;
  ip: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  connected_at: string;
  current: boolean;
  last_activity?: string;
  is_mobile?: boolean;
  is_tablet?: boolean;
  is_pc?: boolean;
};

const SecuritySettings = () => {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState({ 
    sessions: false, 
    settings: false, 
    password: false,
    twoFactor: false,
    alerts: false,
    logoutOthers: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = [
      password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    ].filter(Boolean).length;

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      strength: (strength / 5) * 100,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    };
  };

  const fetchSecuritySettings = async () => {
    setLoading(prev => ({ ...prev, settings: true }));
    try {
      const res = await apiClient.get("/security/settings/");
      setTwoFactorEnabled(res.data.two_factor);
      setSessionAlerts(res.data.login_alerts);
    } catch {
      toast({ 
        title: "Erreur", 
        description: "Impossible de charger les paramètres.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(prev => ({ ...prev, settings: false }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({ 
        title: "Champs manquants", 
        description: "Veuillez remplir tous les champs du mot de passe.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      toast({ 
        title: "Incohérence", 
        description: "Les nouveaux mots de passe ne correspondent pas.", 
        variant: "destructive" 
      });
      return;
    }
    
    const passwordValidation = validatePassword(passwords.new);
    if (!passwordValidation.isValid) {
      toast({ 
        title: "Mot de passe faible", 
        description: "Le mot de passe doit contenir au moins 8 caractères avec des majuscules, minuscules et chiffres.", 
        variant: "destructive" 
      });
      return;
    }
    
    setLoading(prev => ({ ...prev, password: true }));
    try {
      const res = await apiClient.post("/security/change-password/", {
        old_password: passwords.current,
        new_password1: passwords.new,
        new_password2: passwords.confirm,
      });
      
      if (res.data.status === "ok") {
        toast({ 
          title: "Succès", 
          description: res.data.message || "Mot de passe changé avec succès" 
        });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        toast({ 
          title: "Erreur", 
          description: res.data.message, 
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 
                     err.response?.data?.detail || 
                     "Erreur lors du changement de mot de passe";
      toast({ 
        title: "Erreur", 
        description: message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  const toggleTwoFactor = async () => {
    setLoading(prev => ({ ...prev, twoFactor: true }));
    try {
      const res = await apiClient.post("/security/toggle-2fa/");
      if (res.data.enabled !== undefined) {
        setTwoFactorEnabled(res.data.enabled);
        toast({ 
          title: "Succès", 
          description: `Authentification à deux facteurs ${res.data.enabled ? "activée" : "désactivée"}` 
        });
      }
    } catch {
      toast({ 
        title: "Erreur", 
        description: "Impossible de modifier le 2FA.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(prev => ({ ...prev, twoFactor: false }));
    }
  };

  const toggleSessionAlerts = async () => {
    setLoading(prev => ({ ...prev, alerts: true }));
    try {
      const res = await apiClient.post("/security/login-alerts/", { enabled: !sessionAlerts });
      if (res.data.enabled !== undefined) {
        setSessionAlerts(res.data.enabled);
        toast({ 
          title: "Succès", 
          description: `Alertes de connexion ${res.data.enabled ? "activées" : "désactivées"}` 
        });
      }
    } catch {
      toast({ 
        title: "Erreur", 
        description: "Impossible de modifier les alertes.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  };

  const passwordValidation = validatePassword(passwords.new);
  const passwordsMatch = passwords.new === passwords.confirm && passwords.confirm.length > 0;

  return (
    <div className="mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Changer mot de passe */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base text-gray-900">Changer le mot de passe</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Mettez à jour votre mot de passe pour renforcer la sécurité de votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-3 sm:space-y-4">
            {(["current", "new", "confirm"] as const).map(field => (
              <div key={field} className="space-y-1 sm:space-y-2">
                <Label htmlFor={field} className="text-xs sm:text-sm font-medium text-gray-800">
                  {field === "current" ? "Mot de passe actuel" : 
                   field === "new" ? "Nouveau mot de passe" : "Confirmer le mot de passe"}
                </Label>
                <div className="relative">
                  <Input
                    id={field}
                    name={field}
                    type={showPassword[field] ? "text" : "password"}
                    value={passwords[field]}
                    onChange={handlePasswordChange}
                    disabled={loading.password}
                    className="pr-8 text-xs sm:text-sm focus:border-primary focus:ring-primary"
                    placeholder={
                      field === "current" ? "Entrez votre mot de passe actuel" :
                      field === "new" ? "Créez un nouveau mot de passe sécurisé" :
                      "Confirmez votre nouveau mot de passe"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={loading.password}
                  >
                    {showPassword[field] ? (
                      <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {passwords.new && (
              <div className="space-y-1 sm:space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <span className="text-xs sm:text-sm text-gray-700">Force du mot de passe</span>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                    {passwordValidation.strength >= 80 ? "Fort" : 
                     passwordValidation.strength >= 60 ? "Moyen" : "Faible"}
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${passwordValidation.strength >= 80 ? "bg-green-600" : 
                                     passwordValidation.strength >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${passwordValidation.strength}%` }}
                  />
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 space-y-0.5 sm:space-y-1">
                  <p>Le mot de passe doit contenir :</p>
                  <ul className="list-disc list-inside">
                    <li className={passwordValidation.minLength ? "text-gray-700" : "text-gray-400"}>
                      Au moins 8 caractères
                    </li>
                    <li className={passwordValidation.hasUpperCase ? "text-gray-700" : "text-gray-400"}>
                      Une majuscule
                    </li>
                    <li className={passwordValidation.hasLowerCase ? "text-gray-700" : "text-gray-400"}>
                      Une minuscule
                    </li>
                    <li className={passwordValidation.hasNumbers ? "text-gray-700" : "text-gray-400"}>
                      Un chiffre
                    </li>
                    <li className={passwordValidation.hasSpecialChar ? "text-gray-700" : "text-gray-400"}>
                      Un caractère spécial (optionnel)
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {passwords.confirm && (
              <div className="text-xs sm:text-sm">
                {passwordsMatch ? (
                  <span className="text-green-600 font-medium">✓ Les mots de passe correspondent</span>
                ) : (
                  <span className="text-red-600">✗ Les mots de passe ne correspondent pas</span>
                )}
              </div>
            )}

            <div className="flex justify-end pt-1 sm:pt-2">
              <Button 
                type="submit" 
                disabled={loading.password || !passwordsMatch || !passwordValidation.isValid}
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
              >
                {loading.password ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Changement...
                  </>
                ) : (
                  <>
                    <Key className="h-3 w-3 sm:h-4 sm:w-4" />
                    Changer le mot de passe
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sécurité du compte */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base text-gray-900">Sécurité du compte</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Configurez les paramètres de sécurité avancés pour protéger votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-xs sm:text-sm text-gray-900">Authentification à deux facteurs</h3>
                  <p className="text-[10px] sm:text-xs text-gray-600">
                    Ajoutez une couche supplémentaire de sécurité à votre compte
                  </p>
                </div>
              </div>
              <Switch 
                checked={twoFactorEnabled} 
                onCheckedChange={toggleTwoFactor}
                disabled={loading.twoFactor}
                className="scale-90 sm:scale-100 data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-xs sm:text-sm text-gray-900">Alertes de connexion</h3>
                  <p className="text-[10px] sm:text-xs text-gray-600">
                    Recevez des alertes email pour les nouvelles connexions suspectes
                  </p>
                </div>
              </div>
              <Switch 
                checked={sessionAlerts} 
                onCheckedChange={toggleSessionAlerts}
                disabled={loading.alerts}
                className="scale-90 sm:scale-100 data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;