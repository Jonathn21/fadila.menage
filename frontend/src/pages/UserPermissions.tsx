import React from "react";
import { Shield, Info } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import {
  Permission,
  UserRole,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from "@/hooks/usePermissions";

interface PermissionDefinition {
  id: Permission;
  name: string;
  description: string;
}

// Ordre d'affichage des rôles (du plus privilégié au moins privilégié)
const ROLES_ORDER: UserRole[] = ["Superutilisateur", "Admin", "Utilisateur"];

const PERMISSIONS: PermissionDefinition[] = [
  { id: "users.view", name: "Voir les utilisateurs", description: "Peut voir la liste des utilisateurs" },
  { id: "users.create", name: "Créer des utilisateurs", description: "Peut ajouter de nouveaux utilisateurs" },
  { id: "users.edit", name: "Modifier les utilisateurs", description: "Peut modifier les informations des utilisateurs" },
  { id: "users.delete", name: "Supprimer des utilisateurs", description: "Peut supprimer des utilisateurs" },
  { id: "permissions.manage", name: "Gérer les permissions", description: "Peut modifier les rôles et permissions" },
  { id: "data.export", name: "Exporter les données", description: "Peut exporter les données du système" },
];

const UserPermissions = () => {
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Les permissions sont définies par le rôle et appliquées côté serveur.
            Cette page présente la matrice en lecture seule. Pour changer les droits
            d'un utilisateur, modifiez son rôle depuis la fiche utilisateur.
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-5 w-5 flex-shrink-0" />
              <span>Matrice des permissions par rôle</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    {ROLES_ORDER.map((role) => (
                      <TableHead key={role} className="text-center">
                        {ROLE_LABELS[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSIONS.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell className="font-medium">{permission.name}</TableCell>
                      <TableCell className="text-muted-foreground">{permission.description}</TableCell>
                      {ROLES_ORDER.map((role) => {
                        const granted = ROLE_PERMISSIONS[role].includes(permission.id);
                        return (
                          <TableCell key={`${role}-${permission.id}`} className="text-center">
                            <div className="flex justify-center">
                              {granted ? (
                                <Check className="h-4 w-4 text-green-600" aria-label="Autorisé" />
                              ) : (
                                <X className="h-4 w-4 text-muted-foreground/40" aria-label="Non autorisé" />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
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
