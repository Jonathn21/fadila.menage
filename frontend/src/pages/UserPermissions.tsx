import React, { useEffect, useState } from "react";
import { Shield, Info, Check, X } from "lucide-react";
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
import {
  Permission,
  UserRole,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from "@/hooks/usePermissions";
import apiClient from "@/lib/apiClient";

interface CatalogEntry {
  code: Permission;
  label: string;
  category: string;
}

// Ordre d'affichage des rôles (du plus privilégié au moins privilégié)
const ROLES_ORDER: UserRole[] = ["Superutilisateur", "Admin", "Utilisateur"];

const UserPermissions = () => {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    apiClient
      .get("/permissions/catalogue/")
      .then((res) => setCatalog(res.data?.permissions || []))
      .catch(() => {
        // Échec silencieux : le tableau s'affichera vide
      });
  }, []);

  // Regroupe le catalogue par catégorie pour l'affichage
  const groupedCatalog = catalog.reduce<Record<string, CatalogEntry[]>>(
    (acc, entry) => {
      (acc[entry.category] = acc[entry.category] || []).push(entry);
      return acc;
    },
    {},
  );

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Les permissions sont attribuées par utilisateur et appliquées côté
            serveur. Le tableau ci-dessous présente les gabarits par défaut
            associés à chaque rôle (valeur initiale à la création d'un compte).
            Pour ajuster les droits d'un utilisateur précis, ouvrez sa fiche puis
            l'onglet « Permissions ».
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Shield className="h-5 w-5 flex-shrink-0" />
              <span>Gabarits de permissions par rôle</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    {ROLES_ORDER.map((role) => (
                      <TableHead key={role} className="text-center">
                        {ROLE_LABELS[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedCatalog).map(([category, entries]) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/30">
                        <TableCell
                          colSpan={ROLES_ORDER.length + 1}
                          className="font-semibold text-gray-900"
                        >
                          {category}
                        </TableCell>
                      </TableRow>
                      {entries.map((entry) => (
                        <TableRow key={entry.code}>
                          <TableCell className="font-medium">
                            {entry.label}
                          </TableCell>
                          {ROLES_ORDER.map((role) => {
                            const granted = ROLE_PERMISSIONS[role].includes(
                              entry.code,
                            );
                            return (
                              <TableCell
                                key={`${role}-${entry.code}`}
                                className="text-center"
                              >
                                <div className="flex justify-center">
                                  {granted ? (
                                    <Check
                                      className="h-4 w-4 text-green-600"
                                      aria-label="Autorisé"
                                    />
                                  ) : (
                                    <X
                                      className="h-4 w-4 text-muted-foreground/40"
                                      aria-label="Non autorisé"
                                    />
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
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
