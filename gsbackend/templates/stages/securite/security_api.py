import random
import secrets
import logging
from datetime import datetime, timedelta, time
from io import BytesIO
from collections import defaultdict
import pytesseract
import google.generativeai as genai
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT, TA_LEFT
from reportlab.lib.units import cm, inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, 
    Table, TableStyle
)
from services.email_service import EmailSenderService
from django.contrib.sessions.models import Session

import pandas as pd
from django.conf import settings
from django.contrib.auth import (
    get_user_model, update_session_auth_hash, 
    authenticate, logout
)
import time,json
from ..demandes.listeDemande import DemandeBaseAPIView
from ..stages.listeStage import StageBaseAPIView

from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.db import transaction, IntegrityError
from django.db.models import Q, Count
from django.db.models.functions import ExtractMonth, ExtractYear, ExtractWeekDay
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.decorators import method_decorator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.timezone import now
from django.utils.encoding import force_bytes, force_str
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, parsers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import (
    Stagiaire, Notification, Entretien, Demande,  
    UserSession, Utilisateur, UserAction, ConventionStage, 
    Etablissement, Diplome
)
from ..serializers import (
    UtilisateurSerializer, 
    ProfilSerializer, UserActionSerializer
)
from utilisateurs.models import Utilisateur, Profil
from services.notification_service import NotificationService
from services.resume_service import ResumeGeneratorService

from services.email_templates_extended import SecurityEmailTemplates,StageEmailTemplates

import platform
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = os.getenv('TESSERACT_PATH', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
    POPPLER_PATH = os.getenv('POPPLER_PATH', r'C:\poppler\Library\bin')
else:
    # Chemins Linux/Production
    pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'
    POPPLER_PATH = '/usr/bin'

import os
from dotenv import load_dotenv

load_dotenv()



logger = logging.getLogger(__name__)

import os
from django.conf import settings
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
import time
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
import logging

logger = logging.getLogger(__name__)


@method_decorator(never_cache, name='dispatch')
class ActiveSessionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Récupérer la clé de session Django actuelle
            current_django_session_key = request.session.session_key
            
            # Trouver le UserSession correspondant à la session Django actuelle
            current_user_session = None
            user_sessions = []
            
            sessions = UserSession.objects.filter(
                user=request.user, 
                is_active=True
            ).order_by('-last_activity')

            for s in sessions:
                device_info = self.parse_user_agent(s.user_agent)
                
                # Vérifier si c'est la session actuelle
                is_current = False
                if current_django_session_key:
                    # Comparer avec la session Django
                    try:
                        django_session = Session.objects.get(session_key=current_django_session_key)
                        # Vérifier si le UserSession correspond à cette session Django
                        # Vous pouvez stocker un lien dans votre modèle UserSession
                        if hasattr(s, 'django_session_key') and s.django_session_key == current_django_session_key:
                            is_current = True
                        # Ou utiliser l'heure de dernière activité pour déterminer
                        elif s.last_activity and (timezone.now() - s.last_activity).seconds < 300:  # 5 minutes
                            is_current = True
                    except Session.DoesNotExist:
                        pass
                
                user_sessions.append({
                    "id": s.id,  # Ajouter l'ID pour les opérations
                    "session_key": s.session_key,  # Clé complète
                    "django_session_key": s.django_session_key if hasattr(s, 'django_session_key') else None,
                    "ip": s.ip_address,
                    "device": device_info.get('device', 'Appareil inconnu'),
                    "browser": device_info.get('browser', 'Navigateur inconnu'),
                    "os": device_info.get('os', 'Système inconnu'),
                    "location": self.get_location(s.ip_address),
                    "connected_at": s.created_at.isoformat(),
                    "current": is_current,
                    "last_activity": s.last_activity.isoformat() if s.last_activity else None,
                    "is_mobile": device_info.get('is_mobile', False),
                    "is_tablet": device_info.get('is_tablet', False),
                    "is_pc": device_info.get('is_pc', False)
                })

            return Response({"sessions": user_sessions})

        except Exception as e:
            logger.error(f"Erreur récupération sessions: {e}", exc_info=True)
            return Response(
                {"sessions": []},
                status=200
            )

@method_decorator([never_cache], name='dispatch')
class LogoutOtherSessionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Récupérer l'ID de la session actuelle depuis la base de données
            current_session = UserSession.objects.filter(
                user=request.user,
                is_active=True,
                last_activity__gte=timezone.now() - timedelta(minutes=5)
            ).order_by('-last_activity').first()
            
            if not current_session:
                return Response(
                    {"detail": "Session actuelle introuvable."},
                    status=400
                )

            # Désactiver toutes les autres sessions
            sessions_count = UserSession.objects.filter(
                user=request.user,
                is_active=True
            ).exclude(id=current_session.id).update(
                is_active=False,
                disconnected_at=timezone.now()
            )

            # Supprimer également les sessions Django correspondantes
            other_sessions = UserSession.objects.filter(
                user=request.user,
                is_active=False,
                disconnected_at=timezone.now()  # Juste déconnectées
            )
            
            for session in other_sessions:
                if session.django_session_key:
                    try:
                        Session.objects.filter(session_key=session.django_session_key).delete()
                    except:
                        pass

            UserAction.objects.create(
                user=request.user,
                action=f"Déconnexion de {sessions_count} autres sessions",
                ip_address=request.META.get('REMOTE_ADDR'),
                performed_by=request.user
            )

            return Response({
                "detail": f"{sessions_count} autres sessions ont été déconnectées."
            }, status=200)

        except Exception as e:
            logger.error(f"Erreur déconnexion autres sessions: {e}", exc_info=True)
            return Response(
                {"detail": "Erreur lors de la déconnexion des autres sessions."},
                status=500
            )

@method_decorator([never_cache], name='dispatch')
class LogoutSpecificSessionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            session_id = request.data.get('session_id')
            session_key = request.data.get('session_key')
            
            # Préférer utiliser l'ID qui est unique
            if session_id:
                sessions = UserSession.objects.filter(
                    user=request.user,
                    id=session_id,
                    is_active=True
                )
            elif session_key:
                # Si on utilise la clé, chercher la correspondance exacte
                sessions = UserSession.objects.filter(
                    user=request.user,
                    session_key=session_key,
                    is_active=True
                )
            else:
                return Response(
                    {"detail": "ID ou clé de session requis."},
                    status=400
                )

            if not sessions.exists():
                return Response(
                    {"detail": "Session non trouvée."},
                    status=404
                )

            session = sessions.first()
            session.is_active = False
            session.disconnected_at = timezone.now()
            session.save()

            # Supprimer la session Django associée si elle existe
            if hasattr(session, 'django_session_key') and session.django_session_key:
                try:
                    Session.objects.filter(session_key=session.django_session_key).delete()
                except:
                    pass

            UserAction.objects.create(
                user=request.user,
                action=f"Déconnexion d'une session sur {session.device_info if hasattr(session, 'device_info') else 'appareil inconnu'}",
                ip_address=request.META.get('REMOTE_ADDR'),
                performed_by=request.user
            )

            return Response({
                "detail": "Session déconnectée avec succès.",
                "device": session.device_info if hasattr(session, 'device_info') else 'Appareil inconnu'
            }, status=200)

        except Exception as e:
            logger.error(f"Erreur déconnexion session spécifique: {e}", exc_info=True)
            return Response(
                {"detail": "Erreur lors de la déconnexion de la session."},
                status=500
            )
        
@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class Toggle2FAAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profil = request.user.profil
            profil.two_factor_enabled = not profil.two_factor_enabled
            profil.save()

            enabled = profil.two_factor_enabled
            action_text = "activé" if enabled else "désactivé"

            # --- ENREGISTRER L'ACTION ---
            UserAction.objects.create(
                user=request.user,
                action=f"2FA {action_text}",
                performed_by=request.user
            )

            # 🔔 NOTIFICATION PUSH AVEC NOTIFICATIONSERVICE
            self.notifier_changement_2fa(request.user, enabled)


            # Réponse immédiate
            return Response({
                'enabled': enabled,
                'message': f'2FA {action_text} avec succès'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur lors du toggle 2FA: {e}")
            return Response(
                {'status': 'error', 'message': 'Erreur lors de la modification des paramètres 2FA'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def notifier_changement_2fa(self, user, enabled):
        """Notifier le changement 2FA via NotificationService"""
        try:
            action_text = "activé" if enabled else "désactivé"
            
            # Utiliser NotificationService pour la notification push
            NotificationService.notifier_changement_securite(
                user=user,
                action=f"2FA {action_text}",
                details="L'authentification à deux facteurs a été modifiée sur votre compte."
            )
            
        except Exception as e:
            logger.error(f"Erreur notification 2FA: {e}")

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        form = PasswordChangeForm(user=request.user, data=request.data)
        
        if not form.is_valid():
            erreurs = []
            for field in form:
                for error in field.errors:
                    erreurs.append(f"{field.label} : {error}")
            for error in form.non_field_errors():
                erreurs.append(str(error))
            return Response(
                {'status': 'error', 'message': ' '.join(erreurs)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Sauvegarder le nouveau mot de passe
        user = form.save()
        update_session_auth_hash(request, user)
        
        # 🔹 Enregistrer l'action
        try:
            UserAction.objects.create(
                user=user,
                action="Changement de mot de passe",
                performed_by=user
            )
        except Exception as e:
            logger.error(f"❌ Erreur enregistrement action: {e}")
        
        # 🔔 Notification push
        try:
            NotificationService.notifier_changement_mot_de_passe(user)
        except Exception as e:
            logger.error(f"❌ Erreur notification push: {e}")
        
        # 📧 Email de sécurité via service centralisé
        try:
            EmailSenderService.send_password_changed_notification(
                user=user,
                async_send=True
            )
            logger.info(f"✅ Email envoyé à {user.email}")
        except Exception as e:
            logger.error(f"❌ Erreur email: {e}")
        
        return Response({
            'status': 'ok', 
            'message': "Mot de passe changé avec succès."
        })

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class UpdateLoginAlertsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            enabled = bool(request.data.get("enabled"))
            profil = request.user.profil
            ancien_statut = profil.login_alerts
            profil.login_alerts = enabled
            profil.save()

            action_text = "activées" if enabled else "désactivées"

            # 🔹 Enregistrer l'action dans l'historique
            UserAction.objects.create(
                user=request.user,
                action=f"Alertes de connexion {action_text}",
                performed_by=request.user
            )

            # 🔔 NOTIFICATION PUSH AVEC NOTIFICATIONSERVICE
            self.notifier_changement_alertes_connexion(request.user, enabled)

            # 📧 EMAIL DE SÉCURITÉ (si les alertes email sont activées)
            if profil.email_securite:
                self.envoyer_email_alertes_connexion(request.user, enabled, ancien_statut)

            return Response({
                'enabled': enabled,
                'message': f'Alertes de connexion {action_text} avec succès'
            })
        except Exception as e:
            logger.error(f"Erreur lors de la modification des alertes de connexion: {e}")
            return Response(
                {'status': 'error', 'message': 'Erreur lors de la modification des paramètres de sécurité'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def notifier_changement_alertes_connexion(self, user, enabled):
        """Notifier le changement des alertes de connexion via NotificationService"""
        try:
            action_text = "activées" if enabled else "désactivées"
            message = f"Les alertes de connexion ont été {action_text} sur votre compte."
            
            # Utiliser NotificationService pour la notification push
            NotificationService.notifier_changement_alertes_connexion(
                user=user,
                enabled=enabled,
                message=message
            )
            
            logger.info(f"✅ Notification alertes connexion pour {user.email}")
            
        except Exception as e:
            logger.error(f"❌ Erreur notification alertes connexion: {e}")

    def envoyer_email_alertes_connexion(self, user, enabled, ancien_statut):
        """Envoyer un email de sécurité pour le changement des alertes de connexion"""
        try:
            action_text = "activées" if enabled else "désactivées"
            action_passe = "activée" if enabled else "désactivée"
            
            subject = f"Alerte Sécurité - Notifications de connexion {action_text} - CEB"
            
            # Message différent selon le changement
            if ancien_statut != enabled:
                changement_message = f"Les notifications de connexion ont été {action_passe} sur votre compte."
                conseil_message = "Vous recevrez désormais des notifications pour chaque nouvelle connexion à votre compte." if enabled else "Vous ne recevrez plus de notifications pour les nouvelles connexions à votre compte."
            else:
                changement_message = f"Les notifications de connexion sont déjà {action_passe} sur votre compte."
                conseil_message = "Aucun changement n'a été effectué."

            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .header {{ background: linear-gradient(135deg, #ffc107, #fd7e14); color: white; padding: 30px; text-align: center; }}
                    .content {{ padding: 30px; background: #f8f9fa; }}
                    .section {{ background: white; padding: 25px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                    .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; }}
                    .info {{ background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; }}
                    .success {{ background: #d4edda; border-left: 4px solid #28a745; padding: 15px; }}
                    .footer {{ background: #343a40; color: white; padding: 20px; text-align: center; }}
                    .feature-list {{ list-style: none; padding: 0; }}
                    .feature-list li {{ padding: 8px 0; border-bottom: 1px solid #eee; }}
                    .feature-list li:last-child {{ border-bottom: none; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Gestion des Alertes de Sécurité</h1>
                    <p>Communauté Électrique du Bénin - Plateforme Stages</p>
                </div>
                
                <div class="content">
                    <div class="section">
                        <p>Cher(e) <strong>{user.get_full_name() or user.email}</strong>,</p>
                        
                        <div class="{'success' if enabled else 'warning'}">
                            <h3>{'✅' if enabled else '⚠️'} Alertes de connexion {action_text}</h3>
                            <p>{changement_message}</p>
                        </div>
                        
                        <div class="info">
                            <h3>Détails de l'action :</h3>
                            <p><strong>Date et heure :</strong> {timezone.now().strftime('%d/%m/%Y à %H:%M')}</p>
                            <p><strong>Compte concerné :</strong> {user.email}</p>
                            <p><strong>Statut des alertes :</strong> {action_text.upper()}</p>
                            <p><strong>Type de modification :</strong> {'Activation' if enabled else 'Désactivation'}</p>
                        </div>
                        
                        <h3>Fonctionnalités des alertes de connexion :</h3>
                        <ul class="feature-list">
                            <li><strong>Notifications par email</strong> pour chaque nouvelle connexion</li>
                            <li><strong>Alertes en temps réel</strong> sur la plateforme</li>
                            <li><strong>Informations détaillées</strong> (adresse IP, navigateur, localisation)</li>
                            <li><strong>Détection rapide</strong> des activités suspectes</li>
                            <li><strong>Protection proactive</strong> de votre compte</li>
                        </ul>
                        
                        <div class="warning">
                            <h3>Impact de cette modification :</h3>
                            <p>{conseil_message}</p>
                            {'<p><strong>Recommandation :</strong> Nous conseillons de maintenir les alertes de connexion activées pour une meilleure sécurité de votre compte.</p>' if not enabled else ''}
                        </div>
                        
                        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #2c5aa0;">
                            <p><strong>Besoin d&#39;aide ?</strong></p>
                            <p>Si vous avez des questions concernant vos paramètres de sécurité ou si vous pensez que votre compte a été compromis, contactez immédiatement notre équipe de sécurité.</p>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>Service Sécurité - Communauté Électrique du Bénin</strong></p>
                    <p>Siège Social: Cotonou, Bénin</p>
                    <p>Support sécurité: +229 21 30 05 06</p>
                    <p>Email: securite@ceb.bj</p>
                    <p style="margin-top: 20px; font-size: 12px; opacity: 0.8;">
                        Cet email a été envoyé automatiquement pour vous informer des modifications de vos paramètres de sécurité.
                    </p>
                </div>
            </body>
            </html>
            """
            
            text_message = f"""
GESTION DES ALERTES DE SÉCURITÉ

Cher(e) {user.get_full_name() or user.email},

{changement_message}

DÉTAILS DE L'ACTION :
- Date et heure : {timezone.now().strftime('%d/%m/%Y à %H:%M')}
- Compte concerné : {user.email}
- Statut des alertes : {action_text.upper()}
- Type de modification : {'Activation' if enabled else 'Désactivation'}

FONCTIONNALITÉS DES ALERTES DE CONNEXION :
✓ Notifications par email pour chaque nouvelle connexion
✓ Alertes en temps réel sur la plateforme
✓ Informations détaillées (adresse IP, navigateur)
✓ Détection rapide des activités suspectes
✓ Protection proactive de votre compte

IMPACT DE CETTE MODIFICATION :
{conseil_message}
{'Recommandation : Nous conseillons de maintenir les alertes de connexion activées pour une meilleure sécurité.' if not enabled else ''}

BESOIN D'AIDE ?
Si vous avez des questions concernant vos paramètres de sécurité, contactez notre équipe.

Service Sécurité - Communauté Électrique du Bénin
Support sécurité: +229 21 30 05 06
Email: securite@ceb.bj

Cet email a été envoyé automatiquement pour vous informer des modifications de sécurité.
            """
            
            # Envoi de l'email avec HTML et texte brut
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
                reply_to=['securite@ceb.bj'],
            )
            
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=True)
            
            logger.info(f"✅ Email alertes connexion envoyé à {user.email}")
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email alertes connexion: {e}")

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class SecuritySettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profil = request.user.profil
        return Response({
            "two_factor": profil.two_factor_enabled,
            "login_alerts": profil.login_alerts,
            "email_securite": profil.email_securite,
            "push_securite": profil.push_securite,
        })
