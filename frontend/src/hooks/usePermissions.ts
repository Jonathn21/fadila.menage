import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

// Types de permissions disponibles (synchronisés avec le backend,
// cf. gsbackend/utilisateurs/permissions.py : PERMISSION_CATALOG)
export type Permission =
  // Utilisateurs
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'permissions.manage'
  // Demandes
  | 'demandes.view'
  | 'demandes.process'
  | 'demandes.accept'
  | 'demandes.reject'
  | 'demandes.delete'
  // Stages
  | 'stages.view'
  | 'stages.renew'
  | 'stages.edit'
  | 'stages.end_early'
  | 'stages.close'
  | 'stages.delete'
  // Statistiques & données
  | 'stats.view'
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

// Gabarits rôle -> permissions (alignés sur ROLE_DEFAULT_PERMISSIONS du
// backend). Servent uniquement de valeur de repli le temps que /me/
// réponde (évite un flash) ; les permissions effectives proviennent ensuite
// du backend (source de vérité, par utilisateur).
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Superutilisateur: [
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'permissions.manage',
    'demandes.view',
    'demandes.process',
    'demandes.accept',
    'demandes.reject',
    'demandes.delete',
    'stages.view',
    'stages.renew',
    'stages.edit',
    'stages.end_early',
    'stages.close',
    'stages.delete',
    'stats.view',
    'data.export',
  ],
  // L'Admin gère tout le métier (demandes, stages, stats, export) mais
  // n'a aucun droit sur la gestion des comptes / permissions.
  Admin: [
    'demandes.view',
    'demandes.process',
    'demandes.accept',
    'demandes.reject',
    'demandes.delete',
    'stages.view',
    'stages.renew',
    'stages.edit',
    'stages.end_early',
    'stages.close',
    'stages.delete',
    'stats.view',
    'data.export',
  ],
  // L'Utilisateur de base se limite à la consultation.
  Utilisateur: ['demandes.view', 'stages.view', 'stats.view'],
};

export const usePermissions = () => {
  const [userRole, setUserRole] = useState<UserRole>('Utilisateur');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Valeur immédiate depuis sessionStorage (évite un flash au montage)
    const storedRole = normalizeRole(sessionStorage.getItem('userRole'));
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
        sessionStorage.setItem('userRole', role);
      })
      .catch(() => {
        // Échec réseau/401 : on conserve la valeur issue de sessionStorage
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
