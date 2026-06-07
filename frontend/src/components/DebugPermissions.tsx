import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { Bug, Trash2 } from "lucide-react";

/**
 * Composant de débogage pour vérifier les permissions
 * À utiliser temporairement pour diagnostiquer les problèmes
 */
const DebugPermissions = () => {
  const { userRole, hasPermission, getUserPermissions } = usePermissions();

  const localStorageData = {
    userRole: localStorage.getItem('userRole'),
    rolePermissions: localStorage.getItem('rolePermissions'),
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('rolePermissions');
    window.location.reload();
  };

  const setAsSuperUser = () => {
    localStorage.setItem('userRole', 'superutilisateur');
    window.location.reload();
  };

  return (
    <Card className="border-2 border-yellow-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <Bug className="h-5 w-5" />
          Debug Permissions (À retirer en production)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Rôle actuel:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">
            {JSON.stringify(userRole, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Permissions du rôle:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(getUserPermissions(), null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold mb-2">LocalStorage brut:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
            {JSON.stringify(localStorageData, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Test de permissions:</h3>
          <ul className="space-y-1 text-sm">
            <li>✓ users.view: {hasPermission('users.view') ? '✅ OUI' : '❌ NON'}</li>
            <li>✓ users.create: {hasPermission('users.create') ? '✅ OUI' : '❌ NON'}</li>
            <li>✓ users.edit: {hasPermission('users.edit') ? '✅ OUI' : '❌ NON'}</li>
            <li>✓ users.delete: {hasPermission('users.delete') ? '✅ OUI' : '❌ NON'}</li>
            <li>✓ permissions.manage: {hasPermission('permissions.manage') ? '✅ OUI' : '❌ NON'}</li>
            <li>✓ data.export: {hasPermission('data.export') ? '✅ OUI' : '❌ NON'}</li>
          </ul>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={setAsSuperUser}
            className="gap-2"
          >
            Forcer Superutilisateur
          </Button>
          <Button 
            variant="destructive" 
            onClick={clearLocalStorage}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Réinitialiser LocalStorage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugPermissions;