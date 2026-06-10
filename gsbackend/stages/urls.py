from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

# Importations par module
from .auth.auth_api import (
    LoginAPI, LogoutAPIView, Verify2FAAPI, Resend2FAAPI,
    PasswordResetAPI, PasswordResetConfirmAPI
)

from .notifications.notifications_api import (
    NotificationsAPI, AllNotificationsAPI, MarkAllNotificationsReadAPI,
    MarkNotificationReadAPI, DeleteNotificationAPI, DeleteAllNotificationsAPI,
    NotificationDetailAPI
)

from .stages.stage_api import (
    StagesEnCoursAPI, StagesTermineAPI, StagesProchainAPI,
    FinAnticipeeStagiaireAPIView, ModifierPeriodeStagiaireAPIView,
    StagiaireDetailAPI, PreRenouvelerStageAPIView,
    FinaliserRenouvellementAPIView,
    TelechargerConventionRenouvellementAPIView,
    AnnulerPreRenouvellementAPIView,RegenererConventionRenouvellementAPIView
)

from .demandes.demande_api import (
    DemandeEnAttenteAPI, DemandesRefuseesAPI, DemandesAccepteesAPI,
    DemandesEnTraitementAPI, DemandesToutesAPI, DemandesArchiveesAPI,
    CreerDemandeAPIView, MettreEnTraitementAPI, SuiviDemandeAPIView,
    ModifierDemandeAPIView, RefuserDemandeAPI, DemandeDetailAPI,
    SupprimerDemandeView, PreAccepterDemandeAPIView, FinaliserAcceptationAPIView,
    TelechargerConventionTemporaireAPIView, AnnulerPreAcceptationSimpleAPIView,
    DemandesEnAcceptationAPI, DemandeModificationAPIView,
    RegenererConventionAPIView,
    # === Demande d'attestation : désactivée ===
    # DemandeAttestationAPIView,
    # DemandesAttestationAPI, DemandeAttestationDetailAPI, ApprouverDemandeAttestationAPI,
    # RefuserDemandeAttestationAPI, SupprimerDemandeAttestationAPI, DemandesAttestationEnAttenteAPI, DemandesAttestationRefuseAPI,
    # DemandesAttestationApprouveAPI, UploadAttestationSigneeAPI, DemandesAttestationTraiteeAPI, TelechargerAttestationSigneeAPI,
    # RegenerarAttestationAvecSignataireAPI
)

from .securite.security_api import (
    ActiveSessionsAPIView, LogoutOtherSessionsAPIView, LogoutSpecificSessionAPIView,
    Toggle2FAAPIView, ChangePasswordAPIView, UpdateLoginAlertsAPIView,
    SecuritySettingsView
)

from .utilisateurs.utilisateurs_api import (
    ProfilAPIView, UtilisateursAPI, AjouterUtilisateurAPIView,
    UtilisateurDetailAPIView, UserActionHistoryAPIView, CurrentUserAPIView
)

router = DefaultRouter()

urlpatterns = [
    # ============================================
    # AUTHENTIFICATION
    # ============================================
     path('login/', LoginAPI.as_view(), name='login'),
     path('logout/', LogoutAPIView.as_view(), name='api-logout'),
     path('verify-2fa/', Verify2FAAPI.as_view(), name='verify_2fa'),
     path('resend-2fa/', Resend2FAAPI.as_view(), name='resend_2fa_api'),
     path('password-reset/', PasswordResetAPI.as_view(), name='api_password_reset'),
     path('password-reset-confirm/<uidb64>/<token>/', 
          PasswordResetConfirmAPI.as_view(), 
          name='password_reset_confirm_api'),

    # ============================================
    # UTILISATEURS & PROFIL
    # ============================================
     path('me/', CurrentUserAPIView.as_view(), name='current-user'),
     path('profil/', ProfilAPIView.as_view(), name='profil_api'),
     path('utilisateurs/', UtilisateursAPI.as_view(), name='utilisateurs-api'),
     path('ajouter-utilisateur/', 
          AjouterUtilisateurAPIView.as_view(), 
          name='ajouter_utilisateur'),
     path('utilisateurs/<int:user_id>/', 
          UtilisateurDetailAPIView.as_view(), 
          name='utilisateur_detail'),
     path('utilisateurs/<int:user_id>/actions/', 
          UserActionHistoryAPIView.as_view(), 
          name='user-action-history'),

    # ============================================
    # SÉCURITÉ
    # ============================================
     path('security/settings/', 
          SecuritySettingsView.as_view(), 
          name='security-settings'),
     path('security/toggle-2fa/', 
          Toggle2FAAPIView.as_view(), 
          name='toggle-2fa'),
     path('security/change-password/', 
          ChangePasswordAPIView.as_view(), 
          name='change-password'),
     path('security/login-alerts/', 
          UpdateLoginAlertsAPIView.as_view(), 
          name='update-login-alerts'),
     path('security/sessions/', 
          ActiveSessionsAPIView.as_view(), 
          name='active-sessions'),
     path('security/logout-others/', 
          LogoutOtherSessionsAPIView.as_view(), 
          name='logout-other-sessions'),
     path('security/logout-session/', 
          LogoutSpecificSessionAPIView.as_view(), 
          name='logout-session'),

    # ============================================
    # DEMANDES - CRÉATION & LISTES
    # ============================================
     path('demandes/', CreerDemandeAPIView.as_view(), name='creer_demande'),
     path('demande-en-attente/', 
         DemandeEnAttenteAPI.as_view(), 
         name='demande-en-attente-api'),
     path('demande-en-traitement/', 
         DemandesEnTraitementAPI.as_view(), 
         name='demandes-traitement-api'),
     path('demande-en-acceptation/', 
         DemandesEnAcceptationAPI.as_view(), 
         name='demandes-en-acceptation-api'),
     path('demande-acceptees/', 
         DemandesAccepteesAPI.as_view(), 
         name='demandes-acceptees-api'),
     path('demande-refusees/', 
         DemandesRefuseesAPI.as_view(), 
         name='demandes-refusees-api'),
     path('demande-toutes/', 
         DemandesToutesAPI.as_view(), 
         name='demandes-toutes-api'),
     path('demande-archivees/',
         DemandesArchiveesAPI.as_view(),
         name='demandes-archivees-api'),
     # === Demande d'attestation : désactivée ===
     # path('demandes-attestation/',
     #     DemandesAttestationAPI.as_view(),
     #     name='demandes-attestation'),



    # ============================================
    # DEMANDES - ACTIONS INDIVIDUELLES
    # ============================================
     path('demandes/<int:pk>/', 
         DemandeDetailAPI.as_view(), 
         name='api_demande_detail'),
     path('demandes/<int:demande_id>/refuser/', 
         RefuserDemandeAPI.as_view(), 
         name='api_refuser_demande'),
     path('demandes/<int:demande_id>/supprimer/', 
         SupprimerDemandeView.as_view(), 
         name='supprimer_demande'),
     path('demandes/<int:pk>/mettre-en-traitement/', 
         MettreEnTraitementAPI.as_view(), 
         name='mettre-en-traitement'),
     path('demandes/<int:pk>/marquer-document-vu/', 
         views.MarquerDocumentVuAPI.as_view(), 
         name='marquer-document-vu'),
     path('demandes/<int:demande_id>/demander-information/', 
         views.DemanderInformationAPIView.as_view(), 
         name='demander-information'),
     path('demandes/<int:demande_id>/pre-accepter/', 
         PreAccepterDemandeAPIView.as_view(), 
         name='pre-accepter-demande'),
     path('demandes/<int:demande_id>/finaliser-acceptation/', 
         FinaliserAcceptationAPIView.as_view(), 
         name='finaliser-acceptation'),
     path('demandes/<int:demande_id>/annuler-pre-acceptation-simple/', 
         AnnulerPreAcceptationSimpleAPIView.as_view(), 
         name='annuler-pre-acceptation-simple'),

    # ============================================
    # DEMANDES - SUIVI
    # ============================================
     path('suivi-demande/<str:tracking_id>/', 
         SuiviDemandeAPIView.as_view(), 
         name='suivi-demande-detail'),
     path('suivi-demande/<str:tracking_id>/modifier/',
         ModifierDemandeAPIView.as_view(),
         name='modifier-demande-suivi'),
     # === Demande d'attestation : désactivée ===
     # path('suivi-demande/<str:tracking_id>/demande-attestation/',
     #     DemandeAttestationAPIView.as_view(),
     #     name='demande-attestation'),

    # ============================================
    # DEMANDES D'ATTESTATION (désactivées)
    # ============================================
     # path('demandes-attestation/<int:demande_id>/detail/',
     #     DemandeAttestationDetailAPI.as_view(),
     #     name='demande-attestation-detail'),
     # path('demandes-attestation/<int:demande_id>/regenerer-attestation/',
     #     RegenerarAttestationAvecSignataireAPI.as_view(),
     #     name='regenerer-attestation-signataire'),
     # path('demandes-attestation/<int:demande_id>/approuver/',
     #     ApprouverDemandeAttestationAPI.as_view(),
     #     name='approuver-demande-attestation'),
     # path('demandes-attestation/<int:demande_id>/refuser/',
     #     RefuserDemandeAttestationAPI.as_view(),
     #     name='refuser-demande-attestation'),
     # path('demandes-attestation/<int:demande_id>/supprimer/',
     #     SupprimerDemandeAttestationAPI.as_view(),
     #     name='supprimer-demande-attestation'),
     # path('demandes-attestation/en-attente/',
     #     DemandesAttestationEnAttenteAPI.as_view(),
     #     name='demandes-attestation-en-attente'),
     # path('demandes-attestation/refusees/',
     #       DemandesAttestationRefuseAPI.as_view(),
     #       name='demandes-attestation-refusees'),
     # path('demandes-attestation/approuvees/',
     #           DemandesAttestationApprouveAPI.as_view(),
     #           name='demandes-attestation-approuvees'),
     # path('demandes-attestation/traitees/',
     #           DemandesAttestationTraiteeAPI.as_view(),
     #           name='demandes-attestation-traitees'),
     # path('demandes-attestation/<int:demande_id>/upload-attestation/',
     #     UploadAttestationSigneeAPI.as_view(),
     #     name='upload_attestation_signee'),
     # path('demandes-attestation/<int:demande_id>/telecharger-attestation/',
     #     TelechargerAttestationSigneeAPI.as_view(),
     #     name='telecharger_attestation_signee'),

    # ============================================
    # STAGES - LISTES
    # ============================================
     path('stages/en-cours/', 
         StagesEnCoursAPI.as_view(), 
         name='stages-en-cours-api'),
     path('stages/termines/', 
         StagesTermineAPI.as_view(), 
         name='stages-termine-api'),
     path('stages/prochains/', 
         StagesProchainAPI.as_view(), 
         name='stages-prochain-api'),

     path('stagiaires/<int:stagiaire_id>/pre-renouveler/', 
         PreRenouvelerStageAPIView.as_view(), 
         name='pre-renouveler-stage'),
    
     path('stagiaires/<int:stagiaire_id>/finaliser-renouvellement/', 
         FinaliserRenouvellementAPIView.as_view(), 
         name='finaliser-renouvellement'),
    
     path('stagiaires/conventions-renouvellement/<int:convention_id>/telecharger/', 
         TelechargerConventionRenouvellementAPIView.as_view(), 
         name='telecharger-convention-renouvellement'),
    
     path('stagiaires/<int:stagiaire_id>/annuler-pre-renouvellement/', 
         AnnulerPreRenouvellementAPIView.as_view(), 
         name='annuler-pre-renouvellement'),

    # ============================================
    # STAGES - ACTIONS SUR STAGIAIRES
    # ============================================
     path('stagiaires/<int:stagiaire_id>/', 
         StagiaireDetailAPI.as_view(), 
         name='detail_stagiaire_api'),
     path('stagiaires/<int:stagiaire_id>/fin-anticipee/', 
          FinAnticipeeStagiaireAPIView.as_view(), 
          name='fin_anticipee_stagiaire'),
     path('stagiaires/<int:stagiaire_id>/modifier-periode/', 
          ModifierPeriodeStagiaireAPIView.as_view(), 
          name='modifier_periode_stagiaire'),
    
    # ============================================
    # NOTIFICATIONS
    # ============================================
     path('notifications/', 
          NotificationsAPI.as_view(), 
          name='notifications'),
     path('notifications/all/', 
          AllNotificationsAPI.as_view(), 
          name='all-notifications'),
     path('notifications/mark-all-read/', 
          MarkAllNotificationsReadAPI.as_view(), 
          name='mark-all-read'),
     path('notifications/<int:pk>/mark-read/', 
          MarkNotificationReadAPI.as_view(), 
          name='mark-read'),
     path('notifications/<int:pk>/delete/', 
          DeleteNotificationAPI.as_view(), 
          name='delete-notification'),
     path('notifications/delete-all/', 
          DeleteAllNotificationsAPI.as_view(), 
          name='delete-all-notifications'),
     path('notifications/<int:pk>/', 
          NotificationDetailAPI.as_view(), 
          name='notification-detail'),

    # ============================================
    # CONVENTIONS
    # ============================================
     path('conventions/temporaires/<int:convention_id>/telecharger/',
          TelechargerConventionTemporaireAPIView.as_view(),
          name='telecharger-convention-temporaire'),

    # ============================================
    # PRÉFÉRENCES
    # ============================================
     path('preferences/', 
          views.PreferencesAPIView.as_view(), 
          name='preferences'),
     path('preferences/<str:pref_type>/', 
          views.UpdatePreferenceAPIView.as_view(), 
          name='update_preference'),

    # ============================================
    # STATISTIQUES & TABLEAU DE BORD
    # ============================================
     path('dashboard/', 
          views.DashboardAPIView.as_view(), 
          name='dashboard-api'),
     path('sidebar-counts/', 
          views.SidebarCountsAPIView.as_view(), 
          name='sidebar_counts_api'),
     path('statistiques/', 
          views.StatistiquesAPIView.as_view(), 
          name='api-statistiques'),
     path('export-stats/<str:format_type>/', 
          views.ExportStatsAPIView.as_view(), 
          name='export-stats'),
     path('rapports/generer/', 
          views.ExportStatsAPIView.as_view(), 
          name='generer-rapport'),
     path('demandes/<int:demande_id>/regenerer-convention/', RegenererConventionAPIView.as_view()),
    path('stagiaires/<int:stagiaire_id>/regenerer-convention-renouvellement/', RegenererConventionRenouvellementAPIView.as_view()),
path('export-rapport/', views.ExportRapportAPIView.as_view(), name='export_rapport'),
path('stagiaires/<int:stagiaire_id>/supprimer/',
          StagiaireDetailAPI.as_view(),
          name='supprimer_stagiaire'),
]

urlpatterns += router.urls
