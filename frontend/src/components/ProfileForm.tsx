import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  User, 
  Building, 
  Loader2,
  Edit,
  Check,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/apiClient";

const ProfileForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    phone: "",
    department: "",
    location: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await apiClient.get("profil/");
        
        const data = response.data;
        setFormData({
          firstName: data.first_name || "",
          lastName: data.last_name || "",  
          email: data.email || "",
          position: data.position || "",
          phone: data.phone || "",
          department: data.department || "",
          location: data.location || "",
        });
      } catch (error: any) {
        console.error("Erreur lors du chargement du profil:", error);
        toast({
          title: "Erreur",
          description: error.response?.data?.message || "Impossible de charger les données du profil",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiClient.put("profil/", {
        first_name: formData.firstName,
        last_name: formData.lastName,
        position: formData.position,
        phone: formData.phone,
        department: formData.department,
        location: formData.location,
      });

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = async () => {
    setIsEditing(false);
    setLoading(true);
    
    try {
      const response = await apiClient.get("profil/");
      const data = response.data;
      
      setFormData({
        firstName: data.first_name || "",
        lastName: data.last_name || "",  
        email: data.email || "",
        position: data.position || "",
        phone: data.phone || "",
        department: data.department || "",
        location: data.location || "",
      });
    } catch (error: any) {
      console.error("Erreur lors du rechargement du profil:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible de recharger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userInitials = `${formData.lastName?.[0] || ''}${formData.firstName?.[0] || ''}`.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Header avec titre et bouton d'édition */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon Profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations personnelles et professionnelles
          </p>
        </div>
        
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)} 
            variant="outline"
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Modifier le profil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
            <Button 
              type="submit"
              form="profile-form"
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent>
          {/* Avatar et informations de base */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-muted/30">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">
                {formData.lastName} {formData.firstName} 
              </h3>
              <p className="text-muted-foreground">{formData.email}</p>
              {formData.position && (
                <Badge variant="outline" className="mt-1">
                  {formData.position}
                </Badge>
              )}
            </div>
          </div>

          <form id="profile-form" onSubmit={handleSubmit} className="space-y-6">
            <Separator />
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nom
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted/50" : ""}
                />
              </div>
              
              {/* Prénom */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Prénom
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-muted/50" : ""}
                />
              </div>

              {/* Email (lecture seule) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input 
                  id="email" 
                  value={formData.email} 
                  disabled 
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  L'adresse email ne peut pas être modifiée
                </p>
              </div>

              

              {/* Poste */}
              <div className="space-y-2">
                <Label htmlFor="position" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Poste
                </Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Votre poste actuel"
                  className={!isEditing ? "bg-muted/50" : ""}
                />
              </div>

             
            </div>

            
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileForm;