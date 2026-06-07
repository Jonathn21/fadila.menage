import { useCallback, useEffect, useState } from 'react';

// Types de permissions disponibles (synchronisés avec le backend)
export type Permission = 
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'permissions.manage'
  | 'data.export';

// Types de rôles (synchronisés avec Django)
export type UserRole = 'utilisateur' | 'administrateur' | 'superutilisateur';

export const usePermissions = () => {
  const [userRole, setUserRole] = useState<UserRole>('utilisateur');
  
  // Charger le rôle depuis localStorage au démarrage
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    
    // Normaliser le rôle (gérer les variations de casse et les espaces)
    let normalizedRole: UserRole = 'utilisateur';
    
    if (storedRole) {
      const lowerRole = storedRole.toLowerCase().trim();
      if (lowerRole === 'superutilisateur' || lowerRole === 'super utilisateur') {
        normalizedRole = 'superutilisateur';
      } else if (lowerRole === 'administrateur' || lowerRole === 'admin') {
        normalizedRole = 'administrateur';
      } else if (lowerRole === 'utilisateur' || lowerRole === 'user') {
        normalizedRole = 'utilisateur';
      }
    }
    
    setUserRole(normalizedRole);
    
    // Mettre à jour localStorage avec la valeur normalisée
    localStorage.setItem('userRole', normalizedRole);
  }, []);
  
  // Mapping des permissions par rôle (synchronisé avec Django et la page UserPermissions)
  const rolePermissions: Record<UserRole, Permission[]> = {
    superutilisateur: [
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'permissions.manage',
      'data.export'
    ],
    administrateur: [
      'users.view',
      'users.create',
      'users.edit'
    ],
    utilisateur: [
      'users.view'
    ]
  };

  const hasPermission = useCallback((permission: Permission): boolean => {
    // Charger les permissions personnalisées si elles existent
    const customPermissions = localStorage.getItem('rolePermissions');
    
    if (customPermissions) {
      try {
        const parsed = JSON.parse(customPermissions);
        const permissions = parsed[userRole] || rolePermissions[userRole] || [];
        
        // Debug: afficher les informations dans la console
        console.log('🔐 Vérification de permission:', {
          permission,
          userRole,
          hasPermission: permissions.includes(permission),
          allPermissions: permissions
        });
        
        return permissions.includes(permission);
      } catch (error) {
        console.error('Erreur lors du parsing des permissions:', error);
      }
    }
    
    // Utiliser les permissions par défaut
    const permissions = rolePermissions[userRole] || [];
    
    // Debug: afficher les informations dans la console
    console.log('Vérification de permission (défaut):', {
      permission,
      userRole,
      hasPermission: permissions.includes(permission),
      allPermissions: permissions
    });
    
    return permissions.includes(permission);
  }, [userRole]);

  const setRole = useCallback((role: UserRole) => {
    if (rolePermissions[role]) {
      localStorage.setItem('userRole', role);
      setUserRole(role);
    }
  }, []);

  const getUserPermissions = useCallback((): Permission[] => {
    const customPermissions = localStorage.getItem('rolePermissions');
    
    if (customPermissions) {
      try {
        const parsed = JSON.parse(customPermissions);
        return parsed[userRole] || rolePermissions[userRole] || [];
      } catch (error) {
        console.error('Erreur lors du parsing des permissions:', error);
      }
    }
    
    return rolePermissions[userRole] || [];
  }, [userRole]);

  return {
    hasPermission,
    userRole,
    setRole,
    getUserPermissions,
    availableRoles: Object.keys(rolePermissions) as UserRole[],
  };
};