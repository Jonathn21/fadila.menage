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
    fetchSessions();
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

const fetchSessions = async () => {
  setLoading(prev => ({ ...prev, sessions: true }));
  try {
    const res = await apiClient.get("/security/sessions/");
    console.log("Sessions reçues:", res.data); // Pour debug
    setSessions(res.data.sessions || []);
  } catch (error: any) {
    console.error("Erreur chargement sessions:", error);
    toast({ 
      title: "Erreur", 
      description: "Impossible de charger les sessions actives.", 
      variant: "destructive" 
    });
    // Set empty array on error
    setSessions([]);
  } finally {
    setLoading(prev => ({ ...prev, sessions: false }));
  }
};

const SessionCard = ({ session, isCurrent }: { session: Session; isCurrent: boolean }) => {
  const getDeviceIcon = () => {
    if (session.is_mobile) return "📱";
    if (session.is_tablet) return "📱";
    if (session.is_pc) return "💻";
    return "🖥️";
  };

  const formatIP = (ip: string) => {
    if (!ip || ip === 'Inconnue') return 'IP masquée';
    // Masquer les 2 derniers octets pour la confidentialité
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip;
  };

  return (
    <div className={`p-4 border rounded-lg ${isCurrent ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-1">{getDeviceIcon()}</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {session.device || 'Appareil inconnu'}
              </h4>
              {isCurrent && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Actuelle
                </Badge>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span>IP: {formatIP(session.ip)}</span>
              </div>
              
              {session.browser && (
                <div className="flex items-center gap-2">
                  <Chrome className="h-3 w-3" />
                  <span>{session.browser}</span>
                </div>
              )}
              
              {session.os && (
                <div className="flex items-center gap-2">
                  <Cpu className="h-3 w-3" />
                  <span>{session.os}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Connecté: {formatDate(session.connected_at)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {!isCurrent && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={async () => {
              try {
                await apiClient.post("/security/logout-session/", {
                  session_key: session.session_key
                });
                toast({
                  title: "Session déconnectée",
                  description: "La session a été déconnectée avec succès.",
                });
                fetchSessions();
              } catch {
                toast({
                  title: "Erreur",
                  description: "Impossible de déconnecter cette session.",
                  variant: "destructive",
                });
              }
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Déconnecter</span>
          </Button>
        )}
      </div>
    </div>
  );
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

  const logoutOtherSessions = async () => {
    setLoading(prev => ({ ...prev, logoutOthers: true }));
    try {
      await apiClient.post("/security/logout-others/");
      toast({
        title: "Succès",
        description: "Toutes les autres sessions ont été déconnectées",
      });
      fetchSessions();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.response?.data?.detail || "Impossible de déconnecter les autres sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, logoutOthers: false }));
    }
  };

  const passwordValidation = validatePassword(passwords.new);
  const passwordsMatch = passwords.new === passwords.confirm && passwords.confirm.length > 0;

  return (
    <div className="space-y-6">
      {/* Changer mot de passe */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Changer le mot de passe</CardTitle>
              <CardDescription>
                Mettez à jour votre mot de passe pour renforcer la sécurité de votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {(["current", "new", "confirm"] as const).map(field => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field} className="text-sm font-medium">
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
                    className="pr-10"
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
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {passwords.new && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Force du mot de passe</span>
                  <span className="text-xs text-muted-foreground">
                    {passwordValidation.strength >= 80 ? "Fort" : 
                     passwordValidation.strength >= 60 ? "Moyen" : "Faible"}
                  </span>
                </div>
                <Progress value={passwordValidation.strength} className="h-2" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Le mot de passe doit contenir :</p>
                  <ul className="list-disc list-inside">
                    <li className={passwordValidation.minLength ? "text-green-600" : "text-muted-foreground"}>
                      Au moins 8 caractères
                    </li>
                    <li className={passwordValidation.hasUpperCase ? "text-green-600" : "text-muted-foreground"}>
                      Une majuscule
                    </li>
                    <li className={passwordValidation.hasLowerCase ? "text-green-600" : "text-muted-foreground"}>
                      Une minuscule
                    </li>
                    <li className={passwordValidation.hasNumbers ? "text-green-600" : "text-muted-foreground"}>
                      Un chiffre
                    </li>
                    <li className={passwordValidation.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                      Un caractère spécial (optionnel)
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {passwords.confirm && (
              <div className="text-sm">
                {passwordsMatch ? (
                  <span className="text-green-600">✓ Les mots de passe correspondent</span>
                ) : (
                  <span className="text-destructive">✗ Les mots de passe ne correspondent pas</span>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button 
                type="submit" 
                disabled={loading.password || !passwordsMatch || !passwordValidation.isValid}
                className="gap-2"
              >
                {loading.password ? (
                  <>
                    <Lock className="h-4 w-4 animate-pulse" />
                    Changement en cours...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Changer le mot de passe
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sécurité du compte */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sécurité du compte</CardTitle>
              <CardDescription>
                Configurez les paramètres de sécurité avancés pour protéger votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg mt-0.5">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Authentification à deux facteurs</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez une couche supplémentaire de sécurité à votre compte
                  </p>
                </div>
              </div>
              <Switch 
                checked={twoFactorEnabled} 
                onCheckedChange={toggleTwoFactor}
                disabled={loading.twoFactor}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg mt-0.5">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">Alertes de connexion</h3>
                  <p className="text-sm text-muted-foreground">
                    Recevez des alertes email pour les nouvelles connexions suspectes
                  </p>
                </div>
              </div>
              <Switch 
                checked={sessionAlerts} 
                onCheckedChange={toggleSessionAlerts}
                disabled={loading.alerts}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions actives 
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Sessions actives</CardTitle>
                <CardDescription>
                  Appareils actuellement connectés à votre compte
                </CardDescription>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={logoutOtherSessions}
              disabled={loading.logoutOthers || sessions.length <= 1}
              className="gap-2"
            >
              {loading.logoutOthers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Déconnecter les autres
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading.sessions ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Aucune session active</AlertTitle>
              <AlertDescription className="text-amber-700">
                Impossible de charger les sessions actives ou aucune session n'est active.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">SESSION ACTUELLE</h3>
                {sessions.filter(s => s.current).map((session) => (
                  <SessionCard key={session.session_key} session={session} isCurrent={true} />
                ))}
              </div>

              {sessions.filter(s => !s.current).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    AUTRES SESSIONS ({sessions.filter(s => !s.current).length})
                  </h3>
                  <div className="space-y-3">
                    {sessions.filter(s => !s.current).map((session) => (
                      <SessionCard key={session.session_key} session={session} isCurrent={false} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>*/}

      
    </div>
  );
};

export default SecuritySettings;