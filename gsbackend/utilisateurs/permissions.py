"""
Système de permissions centralisé, basé sur les rôles.

Source de vérité unique pour :
- les permissions disponibles dans l'application,
- la matrice rôle -> permissions,
- les classes de permission DRF appliquées aux vues.

Le frontend ne fait qu'afficher/cacher des éléments ; l'autorisation
réelle est imposée ici, côté backend.
"""

from rest_framework.permissions import BasePermission

# --- Rôles canoniques (valeurs techniques stockées en base) ---------------
ROLE_SUPERUTILISATEUR = "Superutilisateur"
ROLE_ADMIN = "Admin"
ROLE_UTILISATEUR = "Utilisateur"

# --- Permissions disponibles (synchronisées avec le frontend) -------------
PERM_USERS_VIEW = "users.view"
PERM_USERS_CREATE = "users.create"
PERM_USERS_EDIT = "users.edit"
PERM_USERS_DELETE = "users.delete"
PERM_PERMISSIONS_MANAGE = "permissions.manage"
PERM_DATA_EXPORT = "data.export"

ALL_PERMISSIONS = [
    PERM_USERS_VIEW,
    PERM_USERS_CREATE,
    PERM_USERS_EDIT,
    PERM_USERS_DELETE,
    PERM_PERMISSIONS_MANAGE,
    PERM_DATA_EXPORT,
]

# --- Matrice rôle -> permissions ------------------------------------------
ROLE_PERMISSIONS = {
    ROLE_SUPERUTILISATEUR: list(ALL_PERMISSIONS),
    # La gestion des comptes (consultation/création/modification/suppression)
    # est réservée au Superutilisateur. L'Admin n'a pas accès à la partie
    # « Utilisateurs » ; il conserve l'export de données.
    ROLE_ADMIN: [
        PERM_DATA_EXPORT,
    ],
    # Utilisateur de base : aucun droit d'administration des comptes.
    # (la consultation de son propre profil passe par /profil/, non concerné ici)
    ROLE_UTILISATEUR: [],
}


def get_permissions_for_role(role):
    """Retourne la liste des permissions associées à un rôle (vide si inconnu)."""
    return list(ROLE_PERMISSIONS.get(role, []))


def role_has_permission(role, permission):
    """Indique si un rôle possède une permission donnée."""
    return permission in ROLE_PERMISSIONS.get(role, [])


def user_has_permission(user, permission):
    """Indique si un utilisateur authentifié possède une permission donnée."""
    if not user or not user.is_authenticated:
        return False
    return role_has_permission(getattr(user, "role", None), permission)


class HasPermission(BasePermission):
    """
    Classe de permission DRF paramétrable par permission requise.

    Usage::

        permission_classes = [IsAuthenticated, HasPermission(\"users.create\")]
    """

    required_permission = None

    def __init__(self, required_permission=None):
        if required_permission is not None:
            self.required_permission = required_permission

    def __call__(self):
        # Permet d'utiliser HasPermission(\"...\") directement dans
        # permission_classes (DRF instancie chaque classe).
        return self

    def has_permission(self, request, view):
        return user_has_permission(request.user, self.required_permission)
