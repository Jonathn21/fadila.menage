import { useCallback, useEffect, useState } from 'react';

// Types de permissions disponibles
export type Permission = 
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'permissions.manage'
  | 'data.export';

export const usePermissions = () => {
  const [userRole, setUserRole] = useState<string>('user');
  
  // Charger le rôle depuis localStorage au démarrage
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) {
      setUserRole(storedRole);
    } else {
      // Définir un rôle par défaut si aucun n'est trouvé
      localStorage.setItem('userRole', 'admin');
      setUserRole('admin');
    }
  }, []);
  
  const rolePermissions: Record<string, Permission[]> = {
    admin: ['users.view', 'users.create', 'users.edit', 'users.delete', 'permissions.manage', 'data.export'],
    moderator: ['users.view', 'users.edit', 'data.export'],
    user: ['users.view'],
  };

  const hasPermission = useCallback((permission: Permission): boolean => {
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }, [userRole]);

  const setRole = useCallback((role: string) => {
    if (rolePermissions[role]) {
      localStorage.setItem('userRole', role);
      setUserRole(role);
    }
  }, []);

  return {
    hasPermission,
    userRole,
    setRole,
    availableRoles: Object.keys(rolePermissions),
  };
};