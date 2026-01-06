# urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

from .notifications.notifications_api import (NotificationsAPI, AllNotificationsAPI, MarkAllNotificationsReadAPI,
                                 MarkNotificationReadAPI, DeleteNotificationAPI, DeleteAllNotificationsAPI,
                                 NotificationDetailAPI)

from .auth.auth_api import (LoginAPI,LogoutAPIView,Verify2FAAPI,Resend2FAAPI,PasswordResetAPI,PasswordResetConfirmAPI)

from .stages.stage_api import (StagesEnCoursAPI, StagesTermineAPI, StagesProchainAPI,FinAnticipeeStagiaireAPIView,
                              ModifierPeriodeStagiaireAPIView,AjouterRapportAPIView, GenererAttestationAPIView, 
                              RenouvelerStageAPIView,StagiaireDetailAPI,PreRenouvelerStageAPIView,
                              FinaliserRenouvellementAPIView,TelechargerConventionRenouvellementTemporaireAPIView,
                              AnnulerPreRenouvellementAPIView
                        )
from .demandes.demande_api import (DemandeEnAttenteAPI, DemandesRefuseesAPI, DemandesAccepteesAPI, DemandesEnTraitementAPI, 
                          DemandesToutesAPI, DemandesArchiveesAPI,CreerDemandeAPIView,
                          MettreEnTraitementAPI, SuiviDemandeAPIView,ModifierDemandeAPIView, RefuserDemandeAPI,
                          DemandeDetailAPI,SupprimerDemandeView,DemanderAttestationAPIView,
                          PreAccepterDemandeAPIView, FinaliserAcceptationAPIView, TelechargerConventionTemporaireAPIView,
                          AnnulerPreAcceptationSimpleAPIView
                          ,DemandesEnAcceptationAPI)

from .securite.security_api import (ActiveSessionsAPIView, LogoutOtherSessionsAPIView, LogoutSpecificSessionAPIView,
                            Toggle2FAAPIView, ChangePasswordAPIView, UpdateLoginAlertsAPIView, SecuritySettingsView)

from .utilisateurs.utilisateurs_api import (ProfilAPIView, UtilisateursAPI, AjouterUtilisateurAPIView,
                            UtilisateurDetailAPIView, UserActionHistoryAPIView)




router = DefaultRouter()
urlpatterns = [
    # ACCUEIL & AUTHENTIFICATION
    path('login/', LoginAPI.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='api-logout'),
    path('logout/', LogoutAPIView.as_view(), name='api-logout'),
    path('verify-2fa/', Verify2FAAPI.as_view(), name='verify_2fa'),
    path('resend-2fa/', Resend2FAAPI.as_view(), name='resend_2fa_api'),
    path('password-reset/', PasswordResetAPI.as_view(), name='api_password_reset'),
    path('password-reset-confirm/<uidb64>/<token>/', PasswordResetConfirmAPI.as_view(), name='password_reset_confirm_api'),



    # SÉCURITÉ
    path("security/settings/", SecuritySettingsView.as_view(), name="security-settings"),
    path("security/toggle-2fa/", Toggle2FAAPIView.as_view(), name="toggle-2fa"),
    path("security/change-password/", ChangePasswordAPIView.as_view(), name="change-password"),
    path("security/login-alerts/", UpdateLoginAlertsAPIView.as_view(), name="update-login-alerts"),
    path("security/sessions/", ActiveSessionsAPIView.as_view(), name="active-sessions"),
    path("security/logout-others/", LogoutOtherSessionsAPIView.as_view(), name="logout-other-sessions"),
    path('security/logout-session/', LogoutSpecificSessionAPIView.as_view(), name='logout-session'),


    # PROFIL & UTILISATEURS
    path('profil/', ProfilAPIView.as_view(), name='profil_api'),
    path('utilisateurs/', UtilisateursAPI.as_view(), name='utilisateurs-api'),
    path("ajouter-utilisateur/", AjouterUtilisateurAPIView.as_view(), name="ajouter_utilisateur"),
    path("utilisateurs/<int:user_id>/", UtilisateurDetailAPIView.as_view(), name="utilisateur_detail"),
    path('utilisateurs/<int:user_id>/actions/', UserActionHistoryAPIView.as_view(), name='user-action-history'),



    # DEMANDES
    path('demandes/', CreerDemandeAPIView.as_view(), name='creer_demande'),
    path('demande-en-attente/', DemandeEnAttenteAPI.as_view(), name='demande-en-attente-api'),
    path('demande-en-traitement/', DemandesEnTraitementAPI.as_view(), name='demandes-traitement-api'),
    path('demande-acceptees/', DemandesAccepteesAPI.as_view(), name='demandes-acceptees-api'),
    path('demande-refusees/', DemandesRefuseesAPI.as_view(), name='demandes-refusees-api'),
     path('demande-en-acceptation/', DemandesEnAcceptationAPI.as_view(), name='demandes-en-acceptation-api'),
    path('demande-toutes/', DemandesToutesAPI.as_view(), name='demandes-toutes-api'),
    path('demande-archivees/', DemandesArchiveesAPI.as_view(), name='demandes-archivees-api'),
    # Actions sur demandes individuelles
    path('demandes/<int:pk>/', DemandeDetailAPI.as_view(), name='api_demande_detail'),
    path("demandes/<int:demande_id>/refuser/", RefuserDemandeAPI.as_view(), name="api_refuser_demande"),
    path('demandes/<int:pk>/marquer-document-vu/', views.MarquerDocumentVuAPI.as_view(), name='marquer-document-vu'),
   
    path("demandes/<int:pk>/mettre-en-traitement/", MettreEnTraitementAPI.as_view(), name="mettre-en-traitement"),
    path('demandes/<int:demande_id>/supprimer/', SupprimerDemandeView.as_view(), name='supprimer_demande'),
    path("suivi-demande/<str:tracking_id>/", SuiviDemandeAPIView.as_view(), name="suivi-demande-detail"),
    path('suivi-demande/<str:tracking_id>/modifier/', ModifierDemandeAPIView.as_view(), name='modifier-demande-suivi'),
    path('suivi-demande/<str:tracking_id>/demander-attestation/', DemanderAttestationAPIView.as_view(), name='demander-attestation'),

     path('demandes/<int:demande_id>/pre-accepter/', 
          PreAccepterDemandeAPIView.as_view(), 
          name='pre-accepter-demande'),
     
     # Étape 2: Finalisation
     path('demandes/<int:demande_id>/finaliser-acceptation/', 
          FinaliserAcceptationAPIView.as_view(), 
          name='finaliser-acceptation'),
     
     # Route pour télécharger la convention temporaire
     path('conventions/temporaires/<int:convention_id>/telecharger/',
          TelechargerConventionTemporaireAPIView.as_view(),
          name='telecharger-convention-temporaire'),
   
  # Annulation simple de pré-acceptation
    path('demandes/<int:demande_id>/annuler-pre-acceptation-simple/', 
         AnnulerPreAcceptationSimpleAPIView.as_view(), 
         name='annuler-pre-acceptation-simple'),

    # STAGES
    path('stages/en-cours/', StagesEnCoursAPI.as_view(), name='stages-en-cours-api'),
    path('stages/termines/', StagesTermineAPI.as_view(), name='stages-termine-api'),
    path('stages/prochains/',StagesProchainAPI.as_view(), name='stages-prochain-api'),
    # Détails et actions sur stagiaires
    path('stagiaires/<int:stagiaire_id>/',StagiaireDetailAPI.as_view(), name='detail_stagiaire_api'),
    path('stagiaires/<int:stagiaire_id>/fin-anticipee/', FinAnticipeeStagiaireAPIView.as_view(), name='fin_anticipee_stagiaire'),
    path('stagiaires/<int:stagiaire_id>/modifier-periode/', ModifierPeriodeStagiaireAPIView.as_view(), name='modifier_periode_stagiaire'),
    path('stagiaires/<int:stagiaire_id>/ajouter-rapport/',AjouterRapportAPIView.as_view(), name='ajouter_rapport_api'),
    path("stagiaires/<int:stagiaire_id>/generer-attestation/",GenererAttestationAPIView.as_view(), name="generer_attestation"),
    path("stagiaires/<int:stagiaire_id>/renouveler/", RenouvelerStageAPIView.as_view(), name="renouveler_stage"),
    path('suivi-demande/<str:tracking_id>/ajouter-rapport/', AjouterRapportAPIView.as_view(), name='ajouter-rapport'),
     # Renouvellement de stage - Étape 1: Pré-renouvellement
     path("stagiaires/<int:stagiaire_id>/pre-renouveler/", PreRenouvelerStageAPIView.as_view(), name="pre_renouveler_stage"),
     # Renouvellement de stage - Étape 2: Finalisation
     path("stagiaires/<int:stagiaire_id>/finaliser-renouvellement/", FinaliserRenouvellementAPIView.as_view(), name="finaliser_renouvellement"),
     # Télécharger la convention de renouvellement temporaire
     path("stagiaires/<int:stagiaire_id>/telecharger-convention-renouvellement-temporaire/", 
          TelechargerConventionRenouvellementTemporaireAPIView.as_view(), name="telecharger_convention_renouvellement_temporaire"),
     # Annuler le pré-renouvellement
     path("stagiaires/<int:stagiaire_id>/annuler-pre-renouvellement/", AnnulerPreRenouvellementAPIView.as_view(), name="annuler_pre_renouvellement"),



  # Notifications
    path('notifications/', NotificationsAPI.as_view(), name='notifications'),
    path('notifications/all/', AllNotificationsAPI.as_view(), name='all-notifications'),
    path('notifications/mark-all-read/', MarkAllNotificationsReadAPI.as_view(), name='mark-all-read'),
    path('notifications/<int:pk>/mark-read/', MarkNotificationReadAPI.as_view(), name='mark-read'),
    path('notifications/<int:pk>/delete/', DeleteNotificationAPI.as_view(), name='delete-notification'),
    path('notifications/delete-all/', DeleteAllNotificationsAPI.as_view(), name='delete-all-notifications'),
    path('notifications/<int:pk>/', NotificationDetailAPI.as_view(), name='notification-detail'),



    # PREFERENCES
    path("preferences/", views.PreferencesAPIView.as_view(), name="preferences"),
    path("preferences/<str:pref_type>/", views.UpdatePreferenceAPIView.as_view(), name="update_preference"),

    # STATISTIQUES & TABLEAU DE BORD
    path('dashboard/', views.DashboardAPIView.as_view(), name='dashboard-api'),
    path('sidebar-counts/', views.SidebarCountsAPIView.as_view(), name='sidebar_counts_api'),
    path('statistiques/', views.StatistiquesAPIView.as_view(), name='api-statistiques'),
    path('export-stats/<str:format_type>/', views.ExportStatsAPIView.as_view(), name='export-stats'),
    path('rapports/generer/', views.ExportStatsAPIView.as_view(), name='generer-rapport'),

    path('demandes/<int:demande_id>/demander-information/', views.DemanderInformationAPIView.as_view(), name='demander-information'),

     path('user-info/', views.get_user_info, name='user_info'),
]

urlpatterns += router.urls
