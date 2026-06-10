import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

// Types de permissions disponibles (synchronisés avec le backend)
export type Permission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'permissions.manage'
  | 'data.export';

// Rôles canoniques (valeurs techniques, identiques au backend Django)
export type UserRole = 'Utilisateur' | 'Admin' | 'Superutilisateur';

// Libellés d'affichage (FR) pour chaque rôle canonique
export const ROLE_LABELS: Record<UserRole, string> = {
  Utilisateur: 'Utilisateur',
  Admin: 'Administrateur',
  Superutilisateur: 'Super-utilisateur',
};

// Normalise une valeur de rôle (casse/variantes) vers un UserRole canonique
export const normalizeRole = (raw?: string | null): UserRole => {
  if (!raw) return 'Utilisateur';
  const lower = raw.toLowerCase().trim();
  if (lower === 'superutilisateur' || lower === 'super utilisateur') return 'Superutilisateur';
  if (lower === 'admin' || lower === 'administrateur') return 'Admin';
  return 'Utilisateur';
};

// Matrice de repli rôle -> permissions, alignée sur le backend.
// Utilisée uniquement le temps que /me/ réponde (évite un flash), puis
// remplacée par les permissions renvoyées par le backend (source de vérité).
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Superutilisateur: [
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'permissions.manage',
    'data.export',
  ],
  Admin: ['users.view', 'users.create', 'users.edit', 'data.export'],
  Utilisateur: [],
};

export const usePermissions = () => {
  const [userRole, setUserRole] = useState<UserRole>('Utilisateur');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Valeur immédiate depuis localStorage (évite un flash au montage)
    const storedRole = normalizeRole(localStorage.getItem('userRole'));
    setUserRole(storedRole);
    setPermissions(ROLE_PERMISSIONS[storedRole]);

    let cancelled = false;
    apiClient
      .get('/me/')
      .then((res) => {
        if (cancelled) return;
        const role = normalizeRole(res.data?.role);
        // Le backend est la source de vérité pour les permissions
        const perms: Permission[] = Array.isArray(res.data?.permissions)
          ? res.data.permissions
          : ROLE_PERMISSIONS[role];
        setUserRole(role);
        setPermissions(perms);
        localStorage.setItem('userRole', role);
      })
      .catch(() => {
        // Échec réseau/401 : on conserve la valeur issue de localStorage
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasPermission = useCallback(
    (permission: Permission): boolean => permissions.includes(permission),
    [permissions],
  );

  const getUserPermissions = useCallback((): Permission[] => permissions, [permissions]);

  return {
    hasPermission,
    getUserPermissions,
    userRole,
    permissions,
    loading,
  };
};
