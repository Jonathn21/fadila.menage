import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Permission } from "@/hooks/usePermissions";
import RoleSelector from "@/components/RoleSelector";

// Types pour les rôles (synchronisés avec le backend Django)
type RoleId = 'superutilisateur' | 'administrateur' | 'utilisateur';

interface Role {
  id: RoleId;
  name: string;
  description: string;
}

interface PermissionDefinition {
  id: Permission;
  name: string;
  description: string;
}

const UserPermissions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Définition des rôles (synchronisés avec Django)
  const roles: Role[] = [
    { 
      id: "superutilisateur", 
      name: "Superutilisateur", 
      description: "Accès complet au système" 
    },
    { 
      id: "administrateur", 
      name: "Administrateur", 
      description: "Peut gérer les contenus et les utilisateurs standards" 
    },
    { 
      id: "utilisateur", 
      name: "Utilisateur", 
      description: "Utilisateur standard avec accès limité" 
    }
  ];

  // Définition des permissions
  const permissions: PermissionDefinition[] = [
    { 
      id: "users.view", 
      name: "Voir les utilisateurs", 
      description: "Peut voir la liste des utilisateurs" 
    },
    { 
      id: "users.create", 
      name: "Créer des utilisateurs", 
      description: "Peut ajouter de nouveaux utilisateurs" 
    },
    { 
      id: "users.edit", 
      name: "Modifier les utilisateurs", 
      description: "Peut modifier les informations des utilisateurs" 
    },
    { 
      id: "users.delete", 
      name: "Supprimer des utilisateurs", 
      description: "Peut supprimer des utilisateurs" 
    },
    { 
      id: "permissions.manage", 
      name: "Gérer les permissions", 
      description: "Peut modifier les rôles et permissions" 
    },
    { 
      id: "data.export", 
      name: "Exporter les données", 
      description: "Peut exporter les données du système" 
    }
  ];

  // État initial des permissions par rôle
  const initialRolePermissions: Record<RoleId, Permission[]> = {
    superutilisateur: [
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "permissions.manage",
      "data.export"
    ],
    administrateur: [
      "users.view",
      "users.create",
      "users.edit"
    ],
    utilisateur: [
      "users.view"
    ]
  };

  // Charger les permissions depuis localStorage ou utiliser les valeurs par défaut
  const [rolePermissions, setRolePermissions] = useState<Record<RoleId, Permission[]>>(() => {
    const stored = localStorage.getItem('rolePermissions');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Erreur lors du chargement des permissions:', error);
        return initialRolePermissions;
      }
    }
    return initialRolePermissions;
  });

  const handlePermissionChange = (roleId: RoleId, permissionId: Permission) => {
    setRolePermissions(prev => {
      const newPermissions = { ...prev };
      
      if (newPermissions[roleId].includes(permissionId)) {
        // Enlever la permission
        newPermissions[roleId] = newPermissions[roleId].filter(p => p !== permissionId);
      } else {
        // Ajouter la permission
        newPermissions[roleId] = [...newPermissions[roleId], permissionId];
      }
      
      return newPermissions;
    });
  };

  const savePermissions = () => {
    try {
      // Sauvegarder dans localStorage
      localStorage.setItem('rolePermissions', JSON.stringify(rolePermissions));
      
      // Dans une vraie application, vous enverriez les modifications à votre API Django
      console.log("Action: Enregistrement des permissions", rolePermissions);
      
      toast({
        title: "Permissions enregistrées",
        description: "La configuration des permissions a été mise à jour avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les permissions.",
        variant: "destructive"
      });
    }
  };

  const resetPermissions = () => {
    setRolePermissions(initialRolePermissions);
    localStorage.setItem('rolePermissions', JSON.stringify(initialRolePermissions));
    
    toast({
      title: "Permissions réinitialisées",
      description: "Les permissions ont été restaurées aux valeurs par défaut.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
            <RoleSelector />
            <Button
              variant="outline"
              onClick={resetPermissions}
              className="w-full sm:w-auto"
            >
              Réinitialiser
            </Button>
            <Button
              className="gap-2 w-full sm:w-auto"
              onClick={savePermissions}
            >
              <Save className="h-4 w-4" />
              <span className="truncate">Enregistrer les modifications</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-5 w-5 flex-shrink-0" />
              <span>Gestion des permissions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    {roles.map(role => (
                      <TableHead key={role.id} className="text-center">
                        {role.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map(permission => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-medium">{permission.name}</TableCell>
                      <TableCell>{permission.description}</TableCell>
                      {roles.map(role => (
                        <TableCell key={`${role.id}-${permission.id}`} className="text-center">
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={rolePermissions[role.id]?.includes(permission.id) || false}
                              onCheckedChange={() => handlePermissionChange(role.id, permission.id)}
                              aria-label={`${permission.name} pour ${role.name}`}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserPermissions;