import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Save } from "lucide-react";
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
import { usePermissions } from "@/hooks/usePermissions";
import RoleSelector from "@/components/RoleSelector";

const UserPermissions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  // Vérifier si l'utilisateur a accès à cette page
  useEffect(() => {
    if (!hasPermission('permissions.manage')) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
        variant: "destructive"
      });
      navigate("/users");
    }
  }, [hasPermission, navigate, toast]);

  // Définition des rôles et permissions
  const [roles, setRoles] = useState([
    { id: "admin", name: "Admin", description: "Accès complet au système" },
    { id: "moderator", name: "Modérateur", description: "Peut gérer les contenus et les utilisateurs standards" },
    { id: "user", name: "Utilisateur", description: "Utilisateur standard avec accès limité" }
  ]);

  const [permissions, setPermissions] = useState([
    { id: "users.view", name: "Voir les utilisateurs", description: "Peut voir la liste des utilisateurs" },
    { id: "users.create", name: "Créer des utilisateurs", description: "Peut ajouter de nouveaux utilisateurs" },
    { id: "users.edit", name: "Modifier les utilisateurs", description: "Peut modifier les informations des utilisateurs" },
    { id: "users.delete", name: "Supprimer des utilisateurs", description: "Peut supprimer des utilisateurs" },
    { id: "permissions.manage", name: "Gérer les permissions", description: "Peut modifier les rôles et permissions" },
    { id: "data.export", name: "Exporter les données", description: "Peut exporter les données du système" }
  ]);

  // Matrice des permissions par rôle
  const [rolePermissions, setRolePermissions] = useState({
    admin: ["users.view", "users.create", "users.edit", "users.delete", "permissions.manage", "data.export"],
    moderator: ["users.view", "users.edit", "data.export"],
    user: ["users.view"]
  });

  const handlePermissionChange = (roleId: string, permissionId: string) => {
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
    // Dans une vraie application, vous enverriez les modifications à votre API
    console.log("Action: Enregistrement des permissions", rolePermissions);
    
    // Simuler la mise à jour du localStorage pour refléter les changements
    localStorage.setItem('rolePermissions', JSON.stringify(rolePermissions));
    
    toast({
      title: "Permissions enregistrées",
      description: "La configuration des permissions a été mise à jour avec succès.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Button>
          
          <div className="flex items-center gap-2">
            <RoleSelector />
            <Button 
              className="gap-2"
              onClick={savePermissions}
            >
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Gestion des permissions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    {roles.map(role => (
                      <TableHead key={role.id} className="text-center">{role.name}</TableHead>
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
                              checked={rolePermissions[role.id].includes(permission.id)}
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