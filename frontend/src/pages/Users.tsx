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
  render: (value: unknown, row: User) => React.ReactNode;
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
      case "administrateur": return "destructive";
      case "utilisateur": return "outline";
      case "superutilisateur": return "secondary";
      default: return "default";
    }
  };

  const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
    return isActive ? "default" : "secondary";
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" /> : <UserX className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  const columns: Column[] = [
    {
      key: "name",
      label: "Utilisateur",
      render: (_: unknown, user: User) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <UserCog className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-xs sm:text-sm truncate text-gray-900">{`${user.last_name} ${user.first_name}`}</p>
            <p className="text-[10px] sm:text-sm text-gray-600 truncate">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rôle",
      render: (_: unknown, user: User) => (
        <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize text-[10px] sm:text-xs">
          {user.role || "Non défini"}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (_: unknown, user: User) => (
        <Badge 
          variant={getStatusBadgeVariant(user.is_active)} 
          className={`flex items-center gap-1 capitalize w-fit text-[10px] sm:text-xs ${
            user.is_active 
              ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          }`}
        >
          {getStatusIcon(user.is_active)}
          {user.is_active ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "last_login",
      label: "Dernière connexion",
      render: (_: unknown, user: User) => (
        <span className="text-[10px] sm:text-xs text-gray-600">
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
      render: (_: unknown, user: User) => (
        <div className="flex gap-1 sm:gap-2">
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
              className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
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
              className="h-6 w-6 sm:h-8 sm:w-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              title="Supprimer l'utilisateur"
              aria-label={`Supprimer ${user.first_name} ${user.last_name}`}
            >
              <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
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
      <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* En-tête de la page */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col gap-1 sm:gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Gestion des Utilisateurs</h1>
              <CardDescription className="text-xs sm:text-sm text-gray-600">
                Gérez les utilisateurs et leurs permissions
              </CardDescription>
            </div>
          </div>
          {hasPermission("users.create") && (
            <AddUserDialog>
              <Button className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Nouvel utilisateur</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </AddUserDialog>
          )}
        </div>

        {/* Carte des statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="border border-gray-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                  <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Total utilisateurs</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Utilisateurs actifs</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{activeUsersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">Utilisateurs inactifs</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{users.length - activeUsersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carte des filtres */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Filtres et recherche</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Affinez votre recherche selon différents critères
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                disabled={searchValue === "" && roleFilter === "all" && statusFilter === "all"}
                size="sm"
              >
                <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                Réinitialiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                <Input
                  placeholder="Rechercher par nom ou email"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-8 sm:pl-10 text-xs sm:text-sm focus-visible:ring-primary text-gray-900"
                  aria-label="Rechercher un utilisateur"
                />
              </div>
              
              {/* Filtres responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="role-filter" className="text-xs sm:text-sm font-medium text-gray-700">
                    Rôle
                  </label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger 
                      id="role-filter" 
                      className="text-xs sm:text-sm text-gray-900 focus:ring-primary"
                    >
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm focus:bg-gray-50">Tous les rôles</SelectItem>
                      <SelectItem value="Administrateur" className="text-xs sm:text-sm focus:bg-gray-50">Administrateur</SelectItem>
                      <SelectItem value="Utilisateur" className="text-xs sm:text-sm focus:bg-gray-50">Utilisateur</SelectItem>
                      <SelectItem value="Superutilisateur" className="text-xs sm:text-sm focus:bg-gray-50">Superutilisateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="status-filter" className="text-xs sm:text-sm font-medium text-gray-700">
                    Statut
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger 
                      id="status-filter" 
                      className="text-xs sm:text-sm text-gray-900 focus:ring-primary"
                    >
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm focus:bg-gray-50">Tous les statuts</SelectItem>
                      <SelectItem value="Actif" className="text-xs sm:text-sm focus:bg-gray-50">Actif</SelectItem>
                      <SelectItem value="Inactif" className="text-xs sm:text-sm focus:bg-gray-50">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carte du tableau des utilisateurs */}
        <Card className="border border-gray-200">
          <CardContent className="pt-4 sm:pt-6">
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 sm:h-16 w-full bg-gray-100" />
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900">
                    {users.length} utilisateur{users.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
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
                      <div className="text-center py-4 sm:py-6 md:py-8 sm:py-12">
                        <UsersIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <h3 className="font-medium text-base sm:text-lg mb-1 text-gray-900">Aucun utilisateur</h3>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Aucun utilisateur ne correspond à vos critères de recherche
                        </p>
                      </div>
                    }
                  />
                </div>

                {/* Version Mobile - Cartes */}
                <div className="md:hidden space-y-3">
                  {users.length === 0 ? (
                    <div className="text-center py-4 sm:py-6 md:py-8">
                      <UsersIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mx-auto mb-3" />
                      <h3 className="font-medium text-base mb-1 text-gray-900">Aucun utilisateur</h3>
                      <p className="text-xs text-gray-600">
                        Aucun utilisateur ne correspond à vos critères de recherche
                      </p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <Card key={user.id} className="overflow-hidden border border-gray-200">
                        <CardContent className="p-3 sm:p-4">
                          <div className="space-y-3 sm:space-y-4">
                            {/* En-tête avec avatar et informations principales */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                                    {user.last_name} {user.first_name}
                                  </h4>
                                  <p className="text-[10px] sm:text-sm text-gray-600">{user.email}</p>
                                </div>
                              </div>
                              <Badge 
                                className={`flex items-center gap-1 capitalize shrink-0 ml-2 text-[10px] sm:text-xs ${
                                  user.is_active 
                                    ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" 
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                }`}
                              >
                                {getStatusIcon(user.is_active)}
                                {user.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>

                            {/* Informations détaillées */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                              <div className="space-y-0.5 sm:space-y-1">
                                <span className="font-medium text-gray-700">Rôle</span>
                                <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize text-[10px] sm:text-xs">
                                  {user.role || "Non défini"}
                                </Badge>
                              </div>
                              <div className="space-y-0.5 sm:space-y-1">
                                <span className="font-medium text-gray-700">Dernière connexion</span>
                                <p className="text-[10px] sm:text-xs text-gray-900">
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
                              <div className="flex justify-end gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-gray-200">
                                {hasPermission("users.view") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewUser(user.id)}
                                    className="flex items-center gap-1 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300"
                                  >
                                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                    Détails
                                  </Button>
                                )}
                                {hasPermission("users.delete") && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedUser(user)}
                                    className="flex items-center gap-1 text-xs sm:text-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                  >
                                    <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
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