import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  ArrowLeft,
  Save,
  Edit,
  Shield,
  History,
  Trash2,
  Mail,
  Calendar,
  LogIn,
  UserCog,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/apiClient";

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [user, setUser] = useState(null);
  const [actionHistory, setActionHistory] = useState([]);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // ------------------ FETCH USER ------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userResponse, historyResponse] = await Promise.all([
          apiClient.get(`/utilisateurs/${userId}/`),
          apiClient.get(`/utilisateurs/${userId}/actions/`),
        ]);

        setUser(userResponse.data);
        setActionHistory(historyResponse.data);
        setTotalPages(Math.ceil(historyResponse.data.length / itemsPerPage));
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données utilisateur",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, toast, itemsPerPage]);

  // Calculer les actions à afficher pour la page actuelle
  const getCurrentPageActions = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return actionHistory.slice(startIndex, endIndex);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // ------------------ SAVE USER ------------------
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/utilisateurs/${userId}/`, user);
      toast({
        title: "Modifications enregistrées",
        description: "Les informations de l'utilisateur ont été mises à jour.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ------------------ DELETE USER ------------------
  const handleDelete = async () => {
    try {
      await apiClient.delete(`/utilisateurs/${userId}/`);
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès.",
      });
      navigate("/utilisateurs");
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    // Recharger les données pour annuler les modifications
    setIsEditing(false);
    setLoading(true);
    apiClient
      .get(`/utilisateurs/${userId}/`)
      .then((response) => {
        setUser(response.data);
        setLoading(false);
      })
      .catch((error) => {
        toast({
          title: "Erreur",
          description: "Impossible de recharger les données",
          variant: "destructive",
        });
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          <Button
            variant="outline"
            className="gap-2 mb-4 text-xs sm:text-sm hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            Retour à la liste
          </Button>

          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100" />
            <div className="space-y-1.5 sm:space-y-2">
              <Skeleton className="h-3.5 sm:h-4 w-40 sm:w-64 bg-gray-100" />
              <Skeleton className="h-2.5 sm:h-3 w-32 sm:w-48 bg-gray-100" />
            </div>
          </div>

          <Card className="border border-gray-200">
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-50 mb-4 sm:mb-6 border border-gray-200">
                  <Skeleton className="h-8 sm:h-10 w-full bg-gray-100" />
                  <Skeleton className="h-8 sm:h-10 w-full bg-gray-100" />
                </TabsList>

                <TabsContent value="info" className="space-y-3 sm:space-y-4">
                  <div className="space-y-3 sm:space-y-4">
                    <Skeleton className="h-4 sm:h-6 w-1/4 bg-gray-100" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i}>
                          <Skeleton className="h-3 sm:h-4 w-1/3 mb-1.5 sm:mb-2 bg-gray-100" />
                          <Skeleton className="h-8 sm:h-10 w-full bg-gray-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
          <Button
            variant="outline"
            className="gap-2 text-xs sm:text-sm hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
            onClick={() => navigate("/utilisateurs")}
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            Retour à la liste
          </Button>
          <Card className="border border-gray-200">
            <CardContent className="pt-4 sm:pt-6">
              <div className="text-center py-4 sm:py-6 md:py-8 sm:py-10">
                <User className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2 text-gray-900">
                  Utilisateur non trouvé
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  L'utilisateur que vous recherchez n'existe pas ou a été
                  supprimé.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header avec boutons d'action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex flex-col gap-1 sm:gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Détails de l'utilisateur            
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Visualisez et modifiez les informations de l'utilisateur
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 text-xs sm:text-sm sm:hidden hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
              onClick={() => navigate("/utilisateurs")}
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              Retour
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/utilisateurs")}
              className="hidden sm:flex hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
              title="Retour à la liste"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {hasPermission("users.delete") && (
              <DeleteConfirmDialog
                title="Supprimer l'utilisateur"
                description="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
                onConfirm={handleDelete}
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                }
              />
            )}

            {hasPermission("users.edit") &&
              (!isEditing ? (
                <Button
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              ) : (
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="text-xs sm:text-sm hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline">Enregistrer</span>
                  </Button>
                </div>
              ))}
          </div>
        </div>

        {/* En-tête utilisateur */}
        <Card className="border border-gray-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-primary/10">
                <User className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {user.last_name} {user.first_name}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                  <Badge
                    variant={user.is_active ? "default" : "secondary"}
                    className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  >
                    {user.is_active ? (
                      <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    ) : (
                      <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    )}
                    {user.is_active ? "Actif" : "Inactif"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-gray-700 border-gray-300"
                  >
                    <UserCog className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="text-right mt-2 sm:mt-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Dernière connexion
                </p>
                <p className="text-sm sm:text-base text-gray-900">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString("fr-FR")
                    : "Jamais"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onglets et contenu */}
        <Card className="border border-gray-200">
          <CardContent className="p-4 sm:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-50/50 border border-gray-200">
                <TabsTrigger
                  value="info"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900"
                >
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  Informations
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900"
                >
                  <History className="h-3 w-3 sm:h-4 sm:w-4" />
                  Historique ({actionHistory.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base text-gray-900">
                      Détails de l'utilisateur
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">
                      Informations personnelles et compte de l'utilisateur
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="first_name" className="text-xs sm:text-sm font-medium text-gray-800">
                          Prénom
                        </Label>
                        {isEditing ? (
                          <Input
                            id="first_name"
                            value={user.first_name || ""}
                            onChange={(e) =>
                              setUser({ ...user, first_name: e.target.value })
                            }
                            className="text-xs sm:text-sm focus:border-primary focus:ring-primary text-gray-900"
                          />
                        ) : (
                          <div className="p-2.5 sm:p-3 border border-gray-300 rounded-md bg-gray-50/30 text-xs sm:text-sm text-gray-900">
                            {user.first_name || "Non renseigné"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="last_name" className="text-xs sm:text-sm font-medium text-gray-800">
                          Nom
                        </Label>
                        {isEditing ? (
                          <Input
                            id="last_name"
                            value={user.last_name || ""}
                            onChange={(e) =>
                              setUser({ ...user, last_name: e.target.value })
                            }
                            className="text-xs sm:text-sm focus:border-primary focus:ring-primary text-gray-900"
                          />
                        ) : (
                          <div className="p-2.5 sm:p-3 border border-gray-300 rounded-md bg-gray-50/30 text-xs sm:text-sm text-gray-900">
                            {user.last_name || "Non renseigné"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label
                          htmlFor="email"
                          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-800"
                        >
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                          Email
                        </Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            type="email"
                            value={user.email}
                            onChange={(e) =>
                              setUser({ ...user, email: e.target.value })
                            }
                            className="text-xs sm:text-sm focus:border-primary focus:ring-primary text-gray-900"
                          />
                        ) : (
                          <div className="p-2.5 sm:p-3 border border-gray-300 rounded-md bg-gray-50/30 text-xs sm:text-sm text-gray-900">
                            {user.email}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label
                          htmlFor="role"
                          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-800"
                        >
                          <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                          Rôle
                        </Label>
                        {isEditing ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              setUser({ ...user, role: value })
                            }
                          >
                            <SelectTrigger
                              id="role"
                              className="text-xs sm:text-sm focus:border-primary focus:ring-primary text-gray-900"
                            >
                              <SelectValue placeholder="Sélectionner un rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Utilisateur" className="text-xs sm:text-sm">Utilisateur</SelectItem>
                              <SelectItem value="Admin" className="text-xs sm:text-sm">Administrateur</SelectItem>
                              <SelectItem value="Superutilisateur" className="text-xs sm:text-sm">Super-utilisateur</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-2.5 sm:p-3 border border-gray-300 rounded-md bg-gray-50/30 text-xs sm:text-sm text-gray-900">
                            {user.role}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label htmlFor="status" className="text-xs sm:text-sm font-medium text-gray-800">
                          Statut
                        </Label>
                        {isEditing ? (
                          <Select
                            value={user.is_active ? "Actif" : "Inactif"}
                            onValueChange={(value) =>
                              setUser({ ...user, is_active: value === "Actif" })
                            }
                          >
                            <SelectTrigger
                              id="status"
                              className="text-xs sm:text-sm focus:border-primary focus:ring-primary text-gray-900"
                            >
                              <SelectValue placeholder="Sélectionner un statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Actif" className="text-xs sm:text-sm">Actif</SelectItem>
                              <SelectItem value="Inactif" className="text-xs sm:text-sm">Inactif</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-2.5 sm:p-3 border border-gray-300 rounded-md bg-gray-50/30 text-xs sm:text-sm text-gray-900 flex items-center gap-1.5">
                            {user.is_active ? (
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                            )}
                            {user.is_active ? "Actif" : "Inactif"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 sm:space-y-2">
                        <Label
                          className="flex items-center gap-1 text-xs sm:text-sm font-medium text-gray-800"
                        >
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                          Date de création
                        </Label>
                        <div className="p-2.5 sm:p-3 border border-gray-300 rounded-md bg-gray-50/30 text-xs sm:text-sm text-gray-900">
                          {new Date(user.date_joined).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4 sm:mt-6">
                <Card className="border border-gray-200">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      <div>
                        <CardTitle className="text-sm sm:text-base text-gray-900">
                          Historique des actions
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-gray-600">
                          Historique des activités de cet utilisateur
                        </CardDescription>
                      </div>
                      {actionHistory.length > 0 && (
                        <div className="text-xs sm:text-sm text-gray-600">
                          Total : {actionHistory.length} action
                          {actionHistory.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {actionHistory.length === 0 ? (
                      <div className="text-center py-6 sm:py-8">
                        <History className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-gray-400 mb-3 sm:mb-4" />
                        <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2 text-gray-900">
                          Aucun historique
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Aucune action n'a été enregistrée pour cet utilisateur.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50/30">
                                <TableHead className="text-xs sm:text-sm text-gray-900">
                                  Date et heure
                                </TableHead>
                                <TableHead className="text-xs sm:text-sm text-gray-900">
                                  Action
                                </TableHead>
                                <TableHead className="text-xs sm:text-sm text-gray-900">
                                  Utilisateur
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getCurrentPageActions().map((action, index) => (
                                <TableRow key={index} className="hover:bg-gray-50/30">
                                  <TableCell className="font-medium text-xs sm:text-sm text-gray-900">
                                    {new Date(action.timestamp).toLocaleString(
                                      "fr-FR"
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] sm:text-xs text-gray-700 border-gray-300"
                                    >
                                      {action.action}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs sm:text-sm text-gray-600">
                                    {action.performed_by_name}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                            <div className="text-xs sm:text-sm text-gray-600">
                              Page {currentPage} sur {totalPages}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="gap-1 text-xs sm:text-sm hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                              >
                                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Précédent</span>
                              </Button>

                              <div className="flex items-center gap-0.5 sm:gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                  .filter((page) => {
                                    return (
                                      page === 1 ||
                                      page === totalPages ||
                                      Math.abs(page - currentPage) <= 1
                                    );
                                  })
                                  .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                      {index > 0 && array[index - 1] !== page - 1 && (
                                        <span className="px-1 sm:px-2 text-xs text-gray-600">
                                          ...
                                        </span>
                                      )}
                                      <Button
                                        variant={
                                          currentPage === page ? "default" : "outline"
                                        }
                                        size="sm"
                                        onClick={() => handlePageChange(page)}
                                        className={`w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs ${
                                          currentPage === page
                                            ? "bg-primary hover:bg-primary/90 text-white"
                                            : "hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                                        }`}
                                      >
                                        {page}
                                      </Button>
                                    </React.Fragment>
                                  ))}
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="gap-1 text-xs sm:text-sm hover:bg-gray-50 text-gray-700 hover:text-gray-800 hover:border-gray-300"
                              >
                                <span className="hidden sm:inline">Suivant</span>
                                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserDetails;