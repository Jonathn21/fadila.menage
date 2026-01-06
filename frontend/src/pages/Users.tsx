import React, { useState, useEffect, useCallback } from "react";
import { Eye, Users as UsersIcon, Plus, Filter, Search, UserCog, UserCheck, UserX } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DataTable from "@/components/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddUserDialog } from "@/components/AddUserDialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
}

interface Column {
  key: string;
  label: string;
  render: (value: any, row: User) => React.ReactNode;
}

const Users = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const [searchValue, setSearchValue] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // ------------------ FETCH USERS ------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      
      if (searchValue) params.q = searchValue;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") {
        // Convertir le statut en format booléen pour l'API
        params.statut = statusFilter === "Actif" ? "true" : "false";
      }

      const response = await apiClient.get("/utilisateurs/", { params });
      setUsers(response.data.results || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des utilisateurs", error);
      toast({
        title: "Erreur",
        description: error?.response?.data?.message || "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchValue, roleFilter, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ------------------ DELETE USER ------------------
  const handleDeleteUser = async (userId: string) => {
    try {
      await apiClient.delete(`/utilisateurs/${userId}/`);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setSelectedUser(null);
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès.",
      });
    } catch (error: any) {
      console.error("Erreur lors de la suppression", error);
      toast({
        title: "Erreur",
        description: error?.response?.data?.message || "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const handleViewUser = useCallback((userId: string) => {
    try {
      navigate(`/utilisateurs/${userId}`);
    } catch (error) {
      console.error("Erreur de navigation", error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder à la page utilisateur",
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  const getRoleBadgeVariant = (role: string): "destructive" | "secondary" | "outline" | "default" => {
    switch (role?.toLowerCase()) {
      case "admin": return "destructive";
      case "utilisateur": return "secondary";
      case "moderateur": return "outline";
      default: return "default";
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? "default" : "secondary";
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />;
  };

  const columns: Column[] = [
    {
      key: "name",
      label: "Utilisateur",
      render: (_: any, user: User) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{`${user.last_name} ${user.first_name}`}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rôle",
      render: (_: any, user: User) => (
        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
          {user.role || "Non défini"}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (_: any, user: User) => (
        <Badge 
          variant={getStatusBadgeVariant(user.is_active)} 
          className="flex items-center gap-1 capitalize w-fit"
        >
          {getStatusIcon(user.is_active)}
          {user.is_active ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "last_login",
      label: "Dernière connexion",
      render: (_: any, user: User) => (
        <span className="text-sm text-muted-foreground">
          {user.last_login 
            ? new Date(user.last_login).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : "Jamais"}
        </span>
      ),
    },
  ];

  // Ajouter la colonne d'actions seulement si l'utilisateur a les permissions
  if (hasPermission("users.delete") || hasPermission("users.view")) {
    columns.push({
      key: "actions",
      label: "Actions",
      render: (_: any, user: User) => (
        <div className="flex gap-2">
          {hasPermission("users.view") && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleViewUser(user.id);
              }}
              title="Voir les détails"
              aria-label={`Voir les détails de ${user.first_name} ${user.last_name}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {hasPermission("users.delete") && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Supprimer l'utilisateur"
              aria-label={`Supprimer ${user.first_name} ${user.last_name}`}
            >
              <UserX className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    });
  }

  const resetFilters = () => {
    setSearchValue("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const activeUsersCount = users.filter(u => u.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* En-tête de la page */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestion des Utilisateurs</h1>
              <CardDescription>
                Gérez les utilisateurs et leurs permissions
              </CardDescription>
            </div>
          </div>
          {hasPermission("users.create") && (
            <AddUserDialog>
              <Button className="flex items-center gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouvel utilisateur</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </AddUserDialog>
          )}
        </div>

        {/* Carte des statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total utilisateurs</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Utilisateurs actifs</p>
                  <p className="text-2xl font-bold">{activeUsersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <UserX className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Utilisateurs inactifs</p>
                  <p className="text-2xl font-bold">{users.length - activeUsersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carte des filtres */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold">Filtres et recherche</h3>
                <p className="text-sm text-muted-foreground">
                  Affinez votre recherche selon différents critères
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="flex items-center gap-2 w-full sm:w-auto"
                disabled={searchValue === "" && roleFilter === "all" && statusFilter === "all"}
              >
                <Filter className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                  aria-label="Rechercher un utilisateur"
                />
              </div>
              
              {/* Filtres responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="role-filter" className="text-sm font-medium">
                    Rôle
                  </label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger id="role-filter">
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Utilisateur">Utilisateur</SelectItem>
                      <SelectItem value="Moderateur">Modérateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="status-filter" className="text-sm font-medium">
                    Statut
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="Actif">Actif</SelectItem>
                      <SelectItem value="Inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte du tableau des utilisateurs */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h3 className="font-semibold">
                    {users.length} utilisateur{users.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{activeUsersCount} actif{activeUsersCount !== 1 ? 's' : ''}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{users.length - activeUsersCount} inactif{users.length - activeUsersCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                {/* Version Desktop - Tableau */}
                <div className="hidden md:block">
                  <DataTable
                    columns={columns}
                    data={users}
                    emptyMessage={
                      <div className="text-center py-12">
                        <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-medium text-lg mb-1">Aucun utilisateur</h3>
                        <p className="text-muted-foreground">
                          Aucun utilisateur ne correspond à vos critères de recherche
                        </p>
                      </div>
                    }
                  />
                </div>

                {/* Version Mobile - Cartes */}
                <div className="md:hidden space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-12">
                      <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">Aucun utilisateur</h3>
                      <p className="text-muted-foreground">
                        Aucun utilisateur ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <Card key={user.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {/* En-tête avec avatar et informations principales */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                  <UserCog className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">
                                    {user.last_name} {user.first_name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <Badge 
                                variant={getStatusBadgeVariant(user.is_active)} 
                                className="flex items-center gap-1 capitalize shrink-0 ml-2"
                              >
                                {getStatusIcon(user.is_active)}
                                {user.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>

                            {/* Informations détaillées */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-1">
                                <span className="font-medium text-muted-foreground">Rôle</span>
                                <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                                  {user.role || "Non défini"}
                                </Badge>
                              </div>
                              <div className="space-y-1">
                                <span className="font-medium text-muted-foreground">Dernière connexion</span>
                                <p>
                                  {user.last_login 
                                    ? new Date(user.last_login).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                    : "Jamais"}
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            {(hasPermission("users.view") || hasPermission("users.delete")) && (
                              <div className="flex justify-end gap-2 pt-3 border-t">
                                {hasPermission("users.view") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewUser(user.id)}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Détails
                                  </Button>
                                )}
                                {hasPermission("users.delete") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                    className="flex items-center gap-1 text-destructive border-destructive hover:bg-destructive/10"
                                  >
                                    <UserX className="h-4 w-4" />
                                    Supprimer
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal de confirmation de suppression */}
        {selectedUser && (
          <DeleteConfirmDialog
            title="Supprimer l'utilisateur"
            description={`Êtes-vous sûr de vouloir supprimer "${selectedUser.last_name} ${selectedUser.first_name}" ? Cette action est irréversible.`}
            onConfirm={() => handleDeleteUser(selectedUser.id)}
            open={true}
            onOpenChange={(open) => !open && setSelectedUser(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Users;