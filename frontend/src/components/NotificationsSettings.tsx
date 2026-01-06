import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone, Shield, LogIn, Download, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const NotificationsSettings = () => {
  const [settings, setSettings] = useState({
    loginAlerts: true,
    emailSecurity: true,
    emailUpdates: false,
    pushLogin: true,
    pushSecurity: true,
    pushUpdates: true,
  });

  const [loading, setLoading] = useState({
    global: true,
    saving: false
  });

  const { toast } = useToast();

  // Charger les préférences au montage
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(prev => ({ ...prev, global: true }));
        const { data } = await apiClient.get("/preferences/");
        setSettings(data);
      } catch (error) {
        toast({ 
          title: "Erreur", 
          description: "Impossible de charger les préférences de notification",
          variant: "destructive" 
        });
      } finally {
        setLoading(prev => ({ ...prev, global: false }));
      }
    };
    fetchPreferences();
  }, []);

  // Toggle et update d'une préférence
  const handleToggle = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    const previousValue = settings[key];
    
    setSettings(prev => ({ ...prev, [key]: newValue }));
    setLoading(prev => ({ ...prev, saving: true }));

    try {
      const { data } = await apiClient.post(`/preferences/${key}/`, { enabled: newValue });
      
      toast({ 
        title: data.status === "ok" ? "Paramètres sauvegardés" : "Erreur", 
        description: data.message || "Préférence mise à jour avec succès"
      });
    } catch (error: any) {
      toast({ 
        title: "Erreur", 
        description: error.response?.data?.message || "Impossible de mettre à jour la préférence",
        variant: "destructive" 
      });
      setSettings(prev => ({ ...prev, [key]: previousValue })); // rollback en cas d'erreur
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  const notificationTypes = [
    {
      category: "email",
      title: "Notifications par email",
      icon: Mail,
      description: "Recevez des alertes et informations par email",
      items: [
        { 
          key: "loginAlerts", 
          label: "Alertes de connexion", 
          description: "Recevez un email lorsqu'une connexion est effectuée sur votre compte",
          icon: LogIn
        },
        { 
          key: "emailSecurity", 
          label: "Alertes de sécurité", 
          description: "Notifications importantes concernant la sécurité de votre compte",
          icon: Shield
        },
        { 
          key: "emailUpdates", 
          label: "Mises à jour du service", 
          description: "Nouvelles fonctionnalités et améliorations du service",
          icon: Download
        },
      ]
    },
    {
      category: "push",
      title: "Notifications push",
      icon: Smartphone,
      description: "Recevez des notifications sur vos appareils",
      items: [
        { 
          key: "pushLogin", 
          label: "Connexions", 
          description: "Alertes instantanées pour les nouvelles connexions",
          icon: LogIn
        },
        { 
          key: "pushSecurity", 
          label: "Sécurité", 
          description: "Notifications urgentes concernant la sécurité",
          icon: Shield
        },
        { 
          key: "pushUpdates", 
          label: "Mises à jour", 
          description: "Informations sur les nouvelles fonctionnalités",
          icon: Download
        },
      ]
    }
  ];

  if (loading.global) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(2)].map((_, categoryIndex) => (
            <div key={categoryIndex} className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="space-y-4">
                {[...Array(3)].map((_, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-6 w-11" />
                  </div>
                ))}
              </div>
              {categoryIndex === 0 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Préférences de notifications</CardTitle>
            <CardDescription>
              Personnalisez la façon dont vous recevez les alertes et notifications
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationTypes.map((category, categoryIndex) => (
          <div key={category.category}>
            <div className="flex items-center gap-3 mb-4">
             
              <div>
                <h2 className="text-lg font-semibold">{category.title}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-muted rounded-lg mt-0.5">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={item.key} className="text-base font-medium cursor-pointer">
                          {item.label}
                        </Label>
                        {item.key === "emailSecurity" || item.key === "pushSecurity" ? (
                          <Badge variant="outline" className="text-xs">
                            Recommandé
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  <div className="ml-4">
                    {loading.saving ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Switch
                        id={item.key}
                        checked={settings[item.key as keyof typeof settings]}
                        onCheckedChange={() => handleToggle(item.key as keyof typeof settings)}
                        disabled={loading.saving}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {categoryIndex < notificationTypes.length - 1 && (
              <Separator className="my-6" />
            )}
          </div>
        ))}

        <div className="bg-muted/50 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg mt-0.5">
              <Shield className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-1">Conseil de sécurité</h3>
              <p className="text-xs text-muted-foreground">
                Nous recommandons de garder les alertes de sécurité activées pour être informé 
                des activités importantes sur votre compte.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationsSettings;