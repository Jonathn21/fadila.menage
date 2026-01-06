import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {User,ArrowLeft,Save,Edit,Shield,History,Trash2,Mail,Calendar,LogIn,UserCog,CheckCircle,XCircle,Loader2,ChevronLeft,ChevronRight} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { usePermissions } from "@/hooks/usePermissions";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
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
          apiClient.get(`/utilisateurs/${userId}/actions/`)
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
      navigate("/users");
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
    apiClient.get(`/utilisateurs/${userId}/`)
      .then(response => {
        setUser(response.data);
        setLoading(false);
      })
      .catch(error => {
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
        <div className="container mx-auto py-6 space-y-6">
          <Button
            variant="outline"
            className="gap-2 mb-4"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Button>
          
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-3 w-[200px]" />
            </div>
          </div>
          
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/4" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-1/3 mb-2" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Utilisateur non trouvé</h3>
                <p className="text-muted-foreground">
                  L'utilisateur que vous recherchez n'existe pas ou a été supprimé.
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
      <div className="container mx-auto py-6 space-y-6">
        {/* Header avec boutons d'action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/users")}
              className="hidden sm:flex"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="gap-2 sm:hidden"
              onClick={() => navigate("/users")}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {hasPermission("users.delete") && (
              <DeleteConfirmDialog
                title="Supprimer l'utilisateur"
                description="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
                onConfirm={handleDelete}
                trigger={
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </Button>
                }
              />
            )}

            {hasPermission("users.edit") &&
              (!isEditing ? (
                <Button className="gap-2" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4" />
                  <span className="hidden sm:inline">Modifier</span>
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Annuler
                  </Button>
                  <Button className="gap-2" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Enregistrer</span>
                  </Button>
                </div>
              ))}
          </div>
        </div>

        {/* En-tête utilisateur */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {user.first_name} {user.last_name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant={user.is_active ? "default" : "secondary"} className="gap-1">
                {user.is_active ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {user.is_active ? "Actif" : "Inactif"}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <UserCog className="h-3 w-3" />
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:grid-cols-2 mb-6">
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4">
            {/* ------------------ INFOS UTILISATEUR ------------------ */}
            <Card>
              <CardHeader>
                <CardTitle>Détails de l'utilisateur</CardTitle>
                <CardDescription>
                  Informations personnelles et compte de l'utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    {isEditing ? (
                      <Input
                        id="first_name"
                        value={user.first_name || ""}
                        onChange={(e) =>
                          setUser({ ...user, first_name: e.target.value })
                        }
                      />
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/50">
                        {user.first_name || "Non renseigné"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    {isEditing ? (
                      <Input
                        id="last_name"
                        value={user.last_name || ""}
                        onChange={(e) =>
                          setUser({ ...user, last_name: e.target.value })
                        }
                      />
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/50">
                        {user.last_name || "Non renseigné"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
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
                      />
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/50">
                        {user.email}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Rôle
                    </Label>
                    {isEditing ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) => setUser({ ...user, role: value })}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Administrateur</SelectItem>
                          <SelectItem value="Utilisateur">Utilisateur</SelectItem>
                          <SelectItem value="Editeur">Éditeur</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/50">
                        {user.role}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    {isEditing ? (
                      <Select
                        value={user.is_active ? "Actif" : "Inactif"}
                        onValueChange={(value) =>
                          setUser({ ...user, is_active: value === "Actif" })
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Actif">Actif</SelectItem>
                          <SelectItem value="Inactif">Inactif</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 border rounded-md bg-muted/50 flex items-center gap-2">
                        {user.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {user.is_active ? "Actif" : "Inactif"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <LogIn className="h-4 w-4" />
                      Dernière connexion
                    </Label>
                    <div className="p-3 border rounded-md bg-muted/50">
                      {user.last_login
                      ? new Date(user.last_login).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Jamais"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date de création
                    </Label>
                    <div className="p-3 border rounded-md bg-muted/50">
                      {new Date(user.date_joined).toLocaleDateString("fr-FR", {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            {/* ------------------ HISTORIQUE ------------------ */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Historique des actions</CardTitle>
                    <CardDescription>
                      Historique des activités de cet utilisateur
                    </CardDescription>
                  </div>
                  {actionHistory.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Total : {actionHistory.length} action{actionHistory.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {actionHistory.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Aucun historique</h3>
                    <p className="text-muted-foreground">
                      Aucune action n'a été enregistrée pour cet utilisateur.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date et heure</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Utilisateur</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getCurrentPageActions().map((action, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {new Date(action.timestamp).toLocaleString("fr-FR")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {action.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {action.performed_by_name}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Page {currentPage} sur {totalPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Précédent
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => {
                                // Afficher la première page, la dernière, la page actuelle et les pages adjacentes
                                return (
                                  page === 1 ||
                                  page === totalPages ||
                                  Math.abs(page - currentPage) <= 1
                                );
                              })
                              .map((page, index, array) => (
                                <React.Fragment key={page}>
                                  {index > 0 && array[index - 1] !== page - 1 && (
                                    <span className="px-2 text-muted-foreground">...</span>
                                  )}
                                  <Button
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(page)}
                                    className="w-10"
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
                          >
                            Suivant
                            <ChevronRight className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
};

export default UserDetails;