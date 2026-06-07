import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  User, 
  Building, 
  Phone,
  MapPin,
  Briefcase,
  Loader2,
  Edit,
  Check,
  X,
  Shield,
  Calendar,
  Lock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    bio: "",
  });
  
  const [securityData, setSecurityData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const { toast } = useToast();

  useEffect(() => {
    fetchProfileData();
  }, []);

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
        bio: data.bio || "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecurityData((prev) => ({
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
        bio: formData.bio,
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);

    if (securityData.newPassword !== securityData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      setChangingPassword(false);
      return;
    }

    try {
      const response = await apiClient.post("changer-mot-de-passe/", {
        current_password: securityData.currentPassword,
        new_password: securityData.newPassword,
      });

      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été changé avec succès",
      });

      // Réinitialiser le formulaire de sécurité
      setSecurityData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Erreur lors du changement de mot de passe:", error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors du changement de mot de passe",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    fetchProfileData();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div>
            <Skeleton className="h-6 sm:h-8 w-48 mb-2" />
            <Skeleton className="h-3 sm:h-4 w-64" />
          </div>
          <Skeleton className="h-8 sm:h-10 w-32" />
        </div>
        
        <Card className="border border-gray-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
              <div className="space-y-1 sm:space-y-2">
                <Skeleton className="h-4 w-32 sm:w-40" />
                <Skeleton className="h-3 w-24 sm:w-32" />
              </div>
            </div>
            
            <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1 sm:space-y-2">
                  <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                  <Skeleton className="h-8 sm:h-10 w-full" />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-4 sm:mt-6">
              <Skeleton className="h-8 sm:h-10 w-16 sm:w-24" />
              <Skeleton className="h-8 sm:h-10 w-24 sm:w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userInitials = `${formData.lastName?.[0] || ''}${formData.firstName?.[0] || ''}`.toUpperCase() || "U";

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header avec titre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Mon Profil</h1>
          <CardDescription className="text-xs sm:text-sm text-gray-600">
            Gérez vos informations personnelles et la sécurité de votre compte
          </CardDescription>
        </div>
        
        {!isEditing && activeTab === "profile" ? (
          <Button 
            onClick={() => setIsEditing(true)} 
            variant="outline"
            size="sm"
            className="gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-gray-50 text-gray-700"
          >
            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            Modifier le profil
          </Button>
        ) : activeTab === "profile" && isEditing ? (
          <div className="flex gap-1 sm:gap-2">
            <Button 
              onClick={handleCancelEdit}
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm hover:bg-gray-50 text-gray-700"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
              Annuler
            </Button>
            <Button 
              type="submit"
              form="profile-form"
              disabled={saving}
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-50/50 border border-gray-200">
          <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            Sécurité
          </TabsTrigger>
        </TabsList>

        {/* Onglet Profil */}
        <TabsContent value="profile" className="space-y-4 sm:space-y-6">
          <Card className="border border-gray-200">
            <CardContent className="pt-4 sm:pt-6">
              {/* Avatar et informations de base */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-gray-50/50 border border-gray-200">
                <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border border-gray-300">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-sm sm:text-lg font-semibold bg-primary/10 text-primary">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm sm:text-lg text-gray-900">
                    {formData.lastName} {formData.firstName} 
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 sm:gap-2">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                    {formData.email}
                  </p>
                  {formData.position && (
                    <Badge variant="outline" className="mt-1 sm:mt-2 gap-1 text-xs sm:text-sm bg-primary/10 text-primary border-primary/20">
                      <Briefcase className="h-2 w-2 sm:h-3 sm:w-3" />
                      {formData.position}
                    </Badge>
                  )}
                </div>
              </div>

              <form id="profile-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <Separator className="bg-gray-200" />
                
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {/* Nom */}
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="lastName" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-800">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      Nom
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`text-xs sm:text-sm focus:border-primary focus:ring-primary ${
                        !isEditing ? "bg-gray-50/50 text-gray-700" : ""
                      }`}
                      required
                    />
                  </div>
                  
                  {/* Prénom */}
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="firstName" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-800">
                      <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      Prénom
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`text-xs sm:text-sm focus:border-primary focus:ring-primary ${
                        !isEditing ? "bg-gray-50/50 text-gray-700" : ""
                      }`}
                      required
                    />
                  </div>

                  {/* Email (lecture seule) */}
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-800">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                      Email
                    </Label>
                    <Input 
                      id="email" 
                      value={formData.email} 
                      disabled 
                      className="bg-gray-50/50 text-xs sm:text-sm text-gray-700"
                    />
                    <p className="text-[10px] sm:text-xs text-gray-600">
                      L'adresse email ne peut pas être modifiée
                    </p>
                  </div>

                  {/* Poste */}
                  
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Sécurité */}
        <TabsContent value="security">
          <Card className="border border-gray-200">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base text-gray-900">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                Sécurité du compte
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Gérez votre mot de passe et les paramètres de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-6">
                {/* Mot de passe actuel */}
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="currentPassword" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-800">
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                    Mot de passe actuel
                  </Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={securityData.currentPassword}
                    onChange={handleSecurityChange}
                    placeholder="Entrez votre mot de passe actuel"
                    className="text-xs sm:text-sm focus:border-primary focus:ring-primary"
                    required
                  />
                </div>

                {/* Nouveau mot de passe */}
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="newPassword" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-800">
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                    Nouveau mot de passe
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={securityData.newPassword}
                    onChange={handleSecurityChange}
                    placeholder="Entrez votre nouveau mot de passe"
                    className="text-xs sm:text-sm focus:border-primary focus:ring-primary"
                    required
                  />
                  <p className="text-[10px] sm:text-xs text-gray-600">
                    Le mot de passe doit contenir au moins 8 caractères
                  </p>
                </div>

                {/* Confirmation du nouveau mot de passe */}
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-800">
                    <Lock className="h-3 w-3 sm:h-4 sm:w-4" />
                    Confirmer le nouveau mot de passe
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={securityData.confirmPassword}
                    onChange={handleSecurityChange}
                    placeholder="Confirmez votre nouveau mot de passe"
                    className="text-xs sm:text-sm focus:border-primary focus:ring-primary"
                    required
                  />
                </div>

                {/* Conseils de sécurité */}
                <div className="p-3 sm:p-4 rounded-lg bg-gray-50/50 border border-gray-200">
                  <h4 className="font-medium mb-1 sm:mb-2 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-900">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                    Conseils de sécurité
                  </h4>
                  <ul className="space-y-1 text-[10px] sm:text-xs text-gray-600">
                    <li>• Utilisez un mot de passe fort et unique</li>
                    <li>• Évitez les mots de passe courants</li>
                    <li>• Ne réutilisez pas vos mots de passe</li>
                    <li>• Changez régulièrement votre mot de passe</li>
                  </ul>
                </div>

                {/* Bouton de soumission */}
                <div className="flex justify-end">
                  <Button 
                    type="submit"
                    disabled={changingPassword}
                    size="sm"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        Changer le mot de passe
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileForm;