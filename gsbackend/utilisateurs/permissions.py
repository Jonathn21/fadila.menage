"""
Système de permissions centralisé, basé sur les permissions par utilisateur.

Source de vérité unique pour :
- le catalogue des permissions disponibles (code, libellé, catégorie),
- les gabarits rôle -> permissions (utilisés uniquement comme valeur
  initiale à la création d'un compte),
- la résolution des permissions effectives d'un utilisateur,
- les classes de permission DRF appliquées aux vues.

Modèle d'autorisation (B + ii) :
- Chaque utilisateur possède un ensemble de permissions stocké en base
  (champ JSON `permissions` sur le modèle Utilisateur). C'est la source
  de vérité des droits effectifs.
- Le rôle ne sert plus qu'à : (1) initialiser les permissions à la
  création via un gabarit, (2) appliquer des garde-fous anti-escalade.
- Le Superutilisateur contourne entièrement le système : il possède
  toujours toutes les permissions, quel que soit son ensemble stocké.

Le frontend ne fait qu'afficher/cacher des éléments ; l'autorisation
réelle est imposée ici, côté backend.
"""

from rest_framework.permissions import BasePermission

# --- Rôles canoniques (valeurs techniques stockées en base) ---------------
ROLE_SUPERUTILISATEUR = "Superutilisateur"
ROLE_ADMIN = "Admin"
ROLE_UTILISATEUR = "Utilisateur"

# --- Permissions disponibles (synchronisées avec le frontend) -------------
# Gestion des utilisateurs
PERM_USERS_VIEW = "users.view"
PERM_USERS_CREATE = "users.create"
PERM_USERS_EDIT = "users.edit"
PERM_USERS_DELETE = "users.delete"
PERM_PERMISSIONS_MANAGE = "permissions.manage"

# Demandes de stage
PERM_DEMANDES_VIEW = "demandes.view"
PERM_DEMANDES_PROCESS = "demandes.process"
PERM_DEMANDES_ACCEPT = "demandes.accept"
PERM_DEMANDES_REJECT = "demandes.reject"
PERM_DEMANDES_DELETE = "demandes.delete"

# Stages
PERM_STAGES_VIEW = "stages.view"
PERM_STAGES_RENEW = "stages.renew"
PERM_STAGES_EDIT = "stages.edit"
PERM_STAGES_END_EARLY = "stages.end_early"
PERM_STAGES_DELETE = "stages.delete"

# Statistiques & données
PERM_STATS_VIEW = "stats.view"
PERM_DATA_EXPORT = "data.export"

# --- Catalogue : code -> (libellé FR, catégorie) --------------------------
# Sert au frontend pour afficher l'éditeur de permissions groupé par
# catégorie, et de liste blanche de validation côté backend.
PERMISSION_CATALOG = [
    # Catégorie : Utilisateurs
    {"code": PERM_USERS_VIEW, "label": "Consulter les utilisateurs", "category": "Utilisateurs"},
    {"code": PERM_USERS_CREATE, "label": "Créer des utilisateurs", "category": "Utilisateurs"},
    {"code": PERM_USERS_EDIT, "label": "Modifier des utilisateurs", "category": "Utilisateurs"},
    {"code": PERM_USERS_DELETE, "label": "Supprimer des utilisateurs", "category": "Utilisateurs"},
    {"code": PERM_PERMISSIONS_MANAGE, "label": "Gérer les permissions", "category": "Utilisateurs"},
    # Catégorie : Demandes
    {"code": PERM_DEMANDES_VIEW, "label": "Consulter les demandes", "category": "Demandes"},
    {"code": PERM_DEMANDES_PROCESS, "label": "Traiter les demandes", "category": "Demandes"},
    {"code": PERM_DEMANDES_ACCEPT, "label": "Accepter les demandes", "category": "Demandes"},
    {"code": PERM_DEMANDES_REJECT, "label": "Refuser les demandes", "category": "Demandes"},
    {"code": PERM_DEMANDES_DELETE, "label": "Supprimer les demandes", "category": "Demandes"},
    # Catégorie : Stages
    {"code": PERM_STAGES_VIEW, "label": "Consulter les stages", "category": "Stages"},
    {"code": PERM_STAGES_RENEW, "label": "Renouveler les stages", "category": "Stages"},
    {"code": PERM_STAGES_EDIT, "label": "Modifier les stages", "category": "Stages"},
    {"code": PERM_STAGES_END_EARLY, "label": "Mettre fin à un stage par anticipation", "category": "Stages"},
    {"code": PERM_STAGES_DELETE, "label": "Supprimer les stages", "category": "Stages"},
    # Catégorie : Statistiques & données
    {"code": PERM_STATS_VIEW, "label": "Consulter les statistiques", "category": "Statistiques & données"},
    {"code": PERM_DATA_EXPORT, "label": "Exporter les données", "category": "Statistiques & données"},
]

# Liste plate de tous les codes de permission valides.
ALL_PERMISSIONS = [entry["code"] for entry in PERMISSION_CATALOG]

# Permissions sensibles : ne peuvent être accordées que par un
# Superutilisateur (anti-escalade). Toucher à la gestion des comptes ou
# des permissions est réservé à ce niveau de confiance.
SENSITIVE_PERMISSIONS = [
    PERM_USERS_VIEW,
    PERM_USERS_CREATE,
    PERM_USERS_EDIT,
    PERM_USERS_DELETE,
    PERM_PERMISSIONS_MANAGE,
]

# --- Gabarits rôle -> permissions (valeur initiale à la création) ---------
# Ces gabarits NE sont PAS la source de vérité des droits effectifs : ils
# servent uniquement à pré-remplir l'ensemble de permissions d'un nouvel
# utilisateur. Ils peuvent ensuite être ajustés par utilisateur.
ROLE_DEFAULT_PERMISSIONS = {
    # Le Superutilisateur contourne le système (cf. get_user_permissions),
    # on lui attribue tout de même la liste complète pour cohérence.
    ROLE_SUPERUTILISATEUR: list(ALL_PERMISSIONS),
    # L'Admin gère tout le métier (demandes, stages, stats, export) mais
    # n'a aucun droit sur la gestion des comptes / permissions.
    ROLE_ADMIN: [
        PERM_DEMANDES_VIEW,
        PERM_DEMANDES_PROCESS,
        PERM_DEMANDES_ACCEPT,
        PERM_DEMANDES_REJECT,
        PERM_DEMANDES_DELETE,
        PERM_STAGES_VIEW,
        PERM_STAGES_RENEW,
        PERM_STAGES_EDIT,
        PERM_STAGES_END_EARLY,
        PERM_STAGES_DELETE,
        PERM_STATS_VIEW,
        PERM_DATA_EXPORT,
    ],
    # L'Utilisateur de base se limite à la consultation.
    ROLE_UTILISATEUR: [
        PERM_DEMANDES_VIEW,
        PERM_STAGES_VIEW,
        PERM_STATS_VIEW,
    ],
}


def get_default_permissions_for_role(role):
    """Retourne le gabarit de permissions associé à un rôle (vide si inconnu).

    Utilisé uniquement pour initialiser l'ensemble de permissions d'un
    nouvel utilisateur, jamais comme source de vérité des droits effectifs.
    """
    return list(ROLE_DEFAULT_PERMISSIONS.get(role, []))


# Rétro-compatibilité : ancien nom utilisé par du code existant.
get_permissions_for_role = get_default_permissions_for_role


def sanitize_permissions(codes):
    """Filtre une liste de codes pour ne garder que des permissions valides.

    Dédoublonne et conserve l'ordre du catalogue pour un rendu stable.
    """
    if not codes:
        return []
    requested = set(codes)
    return [code for code in ALL_PERMISSIONS if code in requested]


def get_user_permissions(user):
    """Retourne la liste des permissions effectives d'un utilisateur.

    - Utilisateur non authentifié : aucune permission.
    - Superutilisateur : toutes les permissions (contournement total).
    - Autres : l'ensemble stocké sur le compte (champ JSON `permissions`),
      filtré contre le catalogue courant.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return []
    if getattr(user, "role", None) == ROLE_SUPERUTILISATEUR:
        return list(ALL_PERMISSIONS)
    stored = getattr(user, "permissions", None) or []
    return sanitize_permissions(stored)


def user_has_permission(user, permission):
    """Indique si un utilisateur authentifié possède une permission donnée."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "role", None) == ROLE_SUPERUTILISATEUR:
        return True
    stored = getattr(user, "permissions", None) or []
    return permission in stored


class HasPermission(BasePermission):
    """
    Classe de permission DRF paramétrable par permission requise.

    Usage::

        permission_classes = [IsAuthenticated, HasPermission("users.create")]
    """

    required_permission = None

    def __init__(self, required_permission=None):
        if required_permission is not None:
            self.required_permission = required_permission

    def __call__(self):
        # Permet d'utiliser HasPermission("...") directement dans
        # permission_classes (DRF instancie chaque classe).
        return self

    def has_permission(self, request, view):
        return user_has_permission(request.user, self.required_permission)


class IsSuperUtilisateur(BasePermission):
    """Autorise uniquement les super-utilisateurs."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not getattr(user, "is_authenticated", False):
            return False
        return getattr(user, "role", None) == ROLE_SUPERUTILISATEUR
