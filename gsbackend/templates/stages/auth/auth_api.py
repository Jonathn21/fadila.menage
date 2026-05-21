import random
import secrets
import logging
from datetime import datetime, timedelta, time

from services.email_service import EmailSenderService

import pandas as pd
from django.conf import settings
from django.contrib.auth import (
    
    authenticate
)
import time
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
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import (
   Notification,UserSession, Utilisateur, UserAction, 
)

from utilisateurs.models import Utilisateur, Profil


from services.email_templates_extended import SecurityEmailTemplates


import os
from dotenv import load_dotenv

load_dotenv()



logger = logging.getLogger(__name__)

import os
from django.conf import settings
from django.views.decorators.cache import never_cache
import time
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
import logging

logger = logging.getLogger(__name__)

@method_decorator([never_cache], name='dispatch')
class LoginAPI(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True))
    @method_decorator(ratelimit(key='post:email', rate='3/m', method='POST', block=True))
    def post(self, request):
        # Validation des données d'entrée
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({
                'status': 'error', 
                'message': 'Email et mot de passe requis'
            }, status=400)

        # Validation du format email
        if not self.is_valid_email(email):
            return Response({
                'status': 'error', 
                'message': 'Format d\'email invalide'
            }, status=400)

        # Authentification
        user = authenticate(username=email, password=password)
        if user is None:
            # Log pour surveillance sécurité
            logger.warning(f"Tentative de connexion échouée pour l'email: {email}")
            return Response({
                'status': 'error', 
                'message': 'Identifiants invalides'
            }, status=401)

        # Vérification que l'utilisateur est actif
        if not user.is_active:
            return Response({
                'status': 'error', 
                'message': 'Compte désactivé'
            }, status=403)

        try:
            profil = Profil.objects.get(user=user)
            if profil.two_factor_enabled:  
                # Génération du code 2FA sécurisé
                code = self.generate_secure_2fa_code()
                user.two_fa_code = code
                user.two_fa_expiration = now() + timedelta(minutes=5)
                user.two_fa_attempts = 0
                user.save()
                
                # Stockage sécurisé en session
                request.session['pre_2fa_user_id'] = user.id
                request.session['pre_2fa_expires'] = (now() + timedelta(minutes=10)).timestamp()

                # Enregistrer l'action 2FA
                UserAction.objects.create(
                    user=user,
                    action="Tentative de connexion (2FA envoyé)",
                    performed_by=None
                )

                # Envoi email 2FA
                success = self.send_2fa_code(user, code)
                
                if not success:
                    logger.error(f"Échec envoi email 2FA pour {user.email}")
                    return Response({
                        'status': 'error', 
                        'message': "Impossible d'envoyer le code de vérification. Veuillez réessayer."
                    }, status=500)

                return Response({
                    'status': '2fa_required',
                    'message': "Code 2FA envoyé à votre email.",
                    'user_id': user.id,
                    'masked_email': self.mask_email(user.email)
                }, status=200)
                
        except Profil.DoesNotExist:
            # Création du profil avec paramètres par défaut sécurisés
            profil = Profil.objects.create(
                user=user,
                two_factor_enabled=False,
                login_alerts=True  # Alertes activées par défaut
            )
        
        # Connexion réussie sans 2FA
        return self.handle_successful_login(user, request)

    def generate_secure_2fa_code(self):
        """Génère un code 2FA cryptographiquement sécurisé"""
        return secrets.randbelow(900000) + 100000  # 100000-999999

    def is_valid_email(self, email):
        """Valide le format d'email"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    def handle_successful_login(self, user, request):
        """Gère une connexion réussie"""
        try:
            # Désactiver les anciennes sessions
            UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

            # Génération des tokens JWT
            refresh = RefreshToken.for_user(user)

            # Création session custom sécurisée
            session = UserSession.objects.create(
                user=user,
                session_key=secrets.token_urlsafe(32),  # Plus sécurisé que token_hex
                ip_address=self.get_client_ip(request),
                user_agent=self.sanitize_user_agent(request.META.get('HTTP_USER_AGENT', ''))
            )
            
            # Configuration de la session Django
            request.session.cycle_key()  # Nouvelle clé de session
            request.session['user_session_key'] = session.session_key
            request.session.set_expiry(settings.SESSION_COOKIE_AGE)

            # Mettre à jour la dernière connexion
            user.last_login = now()
            user.save(update_fields=["last_login"])

            # Enregistrer l'action
            UserAction.objects.create(
                user=user,
                action="Connexion réussie",
                performed_by=None
            )


            return Response({
                'status': 'ok',
                'message': 'Connexion réussie',
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'session': {
                    'key': session.session_key,
                    'ip': session.ip_address,
                    'device': self.anonymize_user_agent(session.user_agent),
                    'connected_at': session.created_at.isoformat(),
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': getattr(user, 'role', 'UTILISATEUR'),
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'date_joined': user.date_joined.isoformat() if user.date_joined else None
                }
            }, status=200)

        except Exception as e:
            logger.error(f"Erreur lors de la connexion pour {user.email}: {e}")
            return Response({
                'status': 'error',
                'message': 'Erreur interne lors de la connexion'
            }, status=500)

    def sanitize_user_agent(self, user_agent):
        """Nettoie et tronque le user agent"""
        if not user_agent:
            return ''
        # Supprime les caractères potentiellement dangereux
        import re
        cleaned = re.sub(r'[^\w\s\.\-/;()]', '', user_agent)
        return cleaned[:500]

    def anonymize_user_agent(self, user_agent):
        """Anonymise partiellement le user agent pour la réponse client"""
        if not user_agent:
            return 'Inconnu'
        parts = user_agent.split(' ')
        if len(parts) > 0:
            return f"{parts[0]} ..."
        return 'Navigateur'

    def send_2fa_code(self, user, code):
        """Envoie le code 2FA avec gestion d'erreurs"""
        try:
            logger.info(f"Tentative d'envoi code 2FA à {user.email}")
            
            email_data = SecurityEmailTemplates.two_factor_code(user, code)
            
            if not email_data or not email_data.get('html'):
                logger.error("Contenu email 2FA invalide")
                return False
            
            success = EmailSenderService.send_email(
                to_email=user.email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=False
            )
            
            if success:
                logger.info(f"Code 2FA envoyé avec succès à {user.email}")
            else:
                logger.error(f"Échec envoi code 2FA à {user.email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Exception lors de l'envoi code 2FA: {e}")
            return False

    def get_client_ip(self, request):
        """Récupère l'adresse IP du client de manière sécurisée"""
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                # Prendre la première IP de la liste
                ip = x_forwarded_for.split(',')[0].strip()
                # Validation basique de l'IP
                if self.is_valid_ip(ip):
                    return ip
            ip = request.META.get('REMOTE_ADDR', '')
            return ip if self.is_valid_ip(ip) else 'IP invalide'
        except Exception as e:
            logger.error(f"Erreur récupération IP: {e}")
            return 'Erreur IP'

    def is_valid_ip(self, ip):
        """Valide le format d'une adresse IP"""
        import socket
        try:
            socket.inet_pton(socket.AF_INET, ip)
            return True
        except socket.error:
            try:
                socket.inet_pton(socket.AF_INET6, ip)
                return True
            except socket.error:
                return False

    def mask_email(self, email):
        """Masque partiellement un email pour la sécurité"""
        try:
            local, domain = email.split('@')
            if len(local) <= 2:
                masked_local = local[0] + "*"
            else:
                masked_local = local[0] + "****" + local[-1]
            return f"{masked_local}@{domain}"
        except Exception as e:
            logger.error(f"Erreur masquage email: {e}")
            return "****@****"

@method_decorator([never_cache], name='dispatch')
class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            current_session_key = request.session.get('user_session_key')

            # Enregistrer l'action de logout
            UserAction.objects.create(
                user=request.user,
                action="Déconnexion",
                performed_by=None
            )

            # Désactiver la session courante
            if current_session_key:
                UserSession.objects.filter(
                    user=request.user,
                    session_key=current_session_key,
                    is_active=True
                ).update(is_active=False)

            # Nettoyer la session Django
            request.session.flush()

            # Réponse avec invalidation côté client
            response = Response(
                {"detail": "Déconnecté avec succès."},
                status=200
            )
            
            # Supprimer les cookies côté client
            response.delete_cookie('sessionid')
            response.delete_cookie('csrftoken')
            
            return response

        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion: {e}")
            return Response(
                {"detail": "Erreur lors de la déconnexion."},
                status=500
            )


@method_decorator([never_cache], name='dispatch')
class Verify2FAAPI(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True))
    @method_decorator(ratelimit(key='post:user_id', rate='3/m', method='POST', block=True))
    def post(self, request):
        # Validation des données d'entrée
        user_id = request.data.get('user_id')
        code = request.data.get('code', '').strip()

        # Validation basique
        if not user_id or not code:
            logger.warning("Tentative de vérification 2FA avec données manquantes")
            return Response({
                'status': 'error', 
                'message': 'Utilisateur ou code manquant.'
            }, status=400)

        # Validation du code (6 chiffres uniquement)
        if not code.isdigit() or len(code) != 6:
            logger.warning(f"Format de code 2FA invalide: {code}")
            return Response({
                'status': 'error',
                'message': 'Format de code invalide.'
            }, status=400)

        try:
            user = Utilisateur.objects.get(pk=user_id)
            
            # Vérifier que l'utilisateur a bien un code 2FA en attente
            if not user.two_fa_code:
                logger.warning(f"Tentative de vérification 2FA sans code en attente pour {user.email}")
                return Response({
                    'status': 'error', 
                    'message': 'Aucun code 2FA en attente.'
                }, status=400)

        except Utilisateur.DoesNotExist:
            # Ne pas révéler que l'utilisateur n'existe pas
            logger.warning(f"Tentative de vérification 2FA avec user_id invalide: {user_id}")
            time.sleep(1)  # Délai pour éviter le timing attack
            return Response({
                'status': 'error', 
                'message': 'Code ou utilisateur invalide.'
            }, status=400)

        # Vérifier l'expiration du code
        if user.two_fa_expiration and now() > user.two_fa_expiration:
            logger.info(f"Code 2FA expiré pour {user.email}")
            # Réinitialiser le code expiré
            user.two_fa_code = None
            user.two_fa_expiration = None
            user.two_fa_attempts = 0
            user.save()
            
            return Response({
                'status': 'error', 
                'message': 'Code expiré. Veuillez demander un nouveau code.'
            }, status=400)

        # Vérifier les tentatives
        if user.two_fa_attempts >= 5:
            logger.warning(f"Trop de tentatives 2FA pour {user.email}")
            # Bloquer temporairement
            user.two_fa_code = None
            user.two_fa_expiration = None
            user.two_fa_attempts = 0
            user.save()
            
            return Response({
                'status': 'error', 
                'message': 'Trop de tentatives. Veuillez vous reconnecter.'
            }, status=403)

        # Vérification sécurisée du code (timing-attack resistant)
        is_valid = secrets.compare_digest(str(code), str(user.two_fa_code))

        if is_valid:
            # ✅ Code correct
            return self.handle_successful_2fa(user, request)
        else:
            # ❌ Code incorrect
            return self.handle_failed_2fa(user)

    def handle_successful_2fa(self, user, request):
        """Gère une vérification 2FA réussie"""
        try:
            # Réinitialiser le code 2FA
            user.two_fa_code = None
            user.two_fa_expiration = None
            user.two_fa_attempts = 0
            user.last_login = now()
            user.save()

            # Désactiver les anciennes sessions
            UserSession.objects.filter(user=user, is_active=True).update(is_active=False)

            # Générer les tokens JWT
            refresh = RefreshToken.for_user(user)
            
            # Créer une session custom sécurisée
            session = UserSession.objects.create(
                user=user,
                session_key=secrets.token_urlsafe(32),
                ip_address=self.get_secure_client_ip(request),
                user_agent=self.sanitize_user_agent(request.META.get('HTTP_USER_AGENT', ''))
            )

            # Configurer la session Django
            if not request.session.session_key:
                request.session.create()
            request.session['user_session_key'] = session.session_key
            request.session.set_expiry(settings.SESSION_COOKIE_AGE)

            # Enregistrer l'action
            UserAction.objects.create(
                user=user,
                action="Connexion 2FA réussie",
                performed_by=None
            )

            logger.info(f"Connexion 2FA réussie pour {user.email}")

            return Response({
                'status': 'ok',
                'message': 'Connexion réussie.',
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'session': {
                    'key': session.session_key,
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': getattr(user, 'role', 'UTILISATEUR'),
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            }, status=200)

        except Exception as e:
            logger.error(f"Erreur lors de la connexion 2FA pour {user.email}: {e}")
            return Response({
                'status': 'error',
                'message': 'Erreur lors de la connexion.'
            }, status=500)

    def handle_failed_2fa(self, user):
        """Gère un échec de vérification 2FA"""
        user.two_fa_attempts += 1
        user.save()
        
        tentatives_restantes = 5 - user.two_fa_attempts
        
        logger.warning(f"Code 2FA incorrect pour {user.email}. Tentatives: {user.two_fa_attempts}/5")
        
        return Response({
            'status': 'error',
            'message': f'Code incorrect. {tentatives_restantes} tentative(s) restante(s).'
        }, status=400)

    def get_secure_client_ip(self, request):
        """Récupère l'IP client de manière sécurisée"""
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0].strip()
                if self.is_valid_ip(ip):
                    return ip
            ip = request.META.get('REMOTE_ADDR', '')
            return ip if self.is_valid_ip(ip) else 'IP invalide'
        except Exception as e:
            logger.error(f"Erreur récupération IP: {e}")
            return 'Erreur IP'

    def is_valid_ip(self, ip):
        """Valide le format d'IP"""
        import socket
        try:
            socket.inet_pton(socket.AF_INET, ip)
            return True
        except socket.error:
            try:
                socket.inet_pton(socket.AF_INET6, ip)
                return True
            except socket.error:
                return False

    def sanitize_user_agent(self, user_agent):
        """Nettoie le user agent"""
        if not user_agent:
            return ''
        import re
        cleaned = re.sub(r'[^\w\s\.\-/;()]', '', user_agent)
        return cleaned[:500]

@method_decorator([never_cache], name='dispatch')
class Resend2FAAPI(APIView):
    """API pour renvoyer un code 2FA"""
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True))
    @method_decorator(ratelimit(key='post:user_id', rate='3/m', method='POST', block=True))
    def post(self, request):
        user_id = request.data.get('user_id')

        # Validation
        if not user_id:
            return Response({
                'status': 'error', 
                'message': 'Utilisateur manquant.'
            }, status=400)

        # Récupération de l'utilisateur
        try:
            user = Utilisateur.objects.get(pk=user_id)
            
            # Vérifier que l'utilisateur a besoin d'un code 2FA
            if not hasattr(user, 'profil') or not user.profil.two_factor_enabled:
                return Response({
                    'status': 'error', 
                    'message': '2FA non activé pour cet utilisateur.'
                }, status=400)
                
        except Utilisateur.DoesNotExist:
            # Ne pas révéler que l'utilisateur n'existe pas
            logger.warning(f"Tentative de renvoi 2FA avec user_id invalide: {user_id}")
            time.sleep(1)
            return Response({
                'status': 'error', 
                'message': 'Si un compte existe, un code a été envoyé.'
            }, status=200)  # 200 pour ne pas révéler l'information

        # Protection anti-spam améliorée
        if not self._can_resend_code(user):
            delai_restant = self._get_remaining_delay(user)
            return Response({
                'status': 'error',
                'message': f'Veuillez attendre {delai_restant} secondes avant de renvoyer un code.'
            }, status=429)

        # Génération du nouveau code
        code = self._generate_secure_2fa_code()

        # Mise à jour de l'utilisateur
        user.two_fa_code = code
        user.two_fa_expiration = now() + timedelta(minutes=5)
        user.two_fa_attempts = 0
        user.last_2fa_sent = now()
        user.save()

        # Envoi de l'email
        email_sent = self._send_2fa_code_email(user, code)

        if not email_sent:
            logger.error(f"Échec envoi email 2FA pour {user.email}")
            return Response({
                'status': 'error', 
                'message': "Erreur lors de l'envoi de l'email."
            }, status=500)

        logger.info(f"Code 2FA renvoyé à {user.email}")

        return Response({
            'status': 'ok',
            'message': 'Nouveau code envoyé avec succès.'
        }, status=200)

    def _can_resend_code(self, user) -> bool:
        """Vérifie si l'utilisateur peut renvoyer un code"""
        if user.last_2fa_sent:
            time_since_last = now() - user.last_2fa_sent
            return time_since_last >= timedelta(seconds=60)
        return True

    def _get_remaining_delay(self, user) -> int:
        """Calcule le délai restant avant de pouvoir renvoyer un code"""
        if user.last_2fa_sent:
            time_since_last = now() - user.last_2fa_sent
            delai_restant = 60 - time_since_last.total_seconds()
            return max(0, int(delai_restant))
        return 0

    def _generate_secure_2fa_code(self) -> str:
        """Génère un code 2FA cryptographiquement sécurisé"""
        return str(secrets.randbelow(900000) + 100000)

    def _send_2fa_code_email(self, user, code: str) -> bool:
        """Envoie l'email avec le code 2FA"""
        try:
            success = EmailSenderService.send_2fa_code(
                user=user,
                code=code,
                async_send=False
            )
            
            if success:
                logger.info(f"Email 2FA envoyé à {user.email}")
            else:
                logger.warning(f"Email 2FA non envoyé à {user.email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Erreur envoi email 2FA: {e}")
            return False


@method_decorator([never_cache], name='dispatch')
class PasswordResetAPI(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True))
    @method_decorator(ratelimit(key='post:email', rate='3/m', method='POST', block=True))
    def post(self, request):
        email = request.data.get("email", "").strip().lower()

        if not email:
            return Response({
                "status": "error", 
                "message": "Veuillez entrer une adresse email."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validation du format email
        if not self.is_valid_email(email):
            return Response({
                "status": "error", 
                "message": "Format d'email invalide."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Utilisateur.objects.get(email=email)
            
            # Vérifier que l'utilisateur est actif
            if not user.is_active:
                return Response({
                    "status": "error", 
                    "message": "Compte désactivé."
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Utilisateur.DoesNotExist:
            # Ne pas révéler si l'email existe ou non
            logger.info(f"Demande réinitialisation mot de passe pour email non trouvé: {email}")
            time.sleep(1)  # Délai anti-timing
            return Response({
                "status": "ok",  # Toujours retourner OK pour ne pas révéler
                "message": "Si un compte existe, un email de réinitialisation a été envoyé."
            }, status=status.HTTP_200_OK)

        # Génération du token et lien
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:8080')
        reset_link = f"{FRONTEND_URL}/reset-password/{uid}/{token}"

        # Envoi email
        try:
            email_envoye = EmailSenderService.send_password_reset_request(
                user=user,
                reset_link=reset_link,
                async_send=False
            )
            
            if not email_envoye:
                logger.error(f"Échec envoi email réinitialisation à {user.email}")
                return Response({
                    "status": "error", 
                    "message": "Erreur lors de l'envoi de l'email."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"Email réinitialisation envoyé à {user.email}")
            
            # Enregistrer l'action
            UserAction.objects.create(
                user=user,
                action="Demande de réinitialisation de mot de passe",
                performed_by=None
            )
            
        except Exception as e:
            logger.error(f"Erreur envoi email réinitialisation: {e}")
            return Response({
                "status": "error", 
                "message": "Erreur lors de l'envoi de l'email."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "status": "ok",
            "message": "Si un compte existe, un email de réinitialisation a été envoyé."
        }, status=status.HTTP_200_OK)

    def is_valid_email(self, email):
        """Valide le format d'email"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

@method_decorator([never_cache], name='dispatch')
class PasswordResetConfirmAPI(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True))
    def post(self, request, uidb64, token):
        new_password1 = request.data.get("new_password1")
        new_password2 = request.data.get("new_password2")

        # Validation des mots de passe
        if not new_password1 or not new_password2:
            return Response({
                "status": "error", 
                "message": "Veuillez remplir tous les champs."
            }, status=status.HTTP_400_BAD_REQUEST)

        if new_password1 != new_password2:
            return Response({
                "status": "error", 
                "message": "Les mots de passe ne correspondent pas."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validation de la force du mot de passe
        password_validation = self.validate_password_strength(new_password1)
        if not password_validation["valid"]:
            return Response({
                "status": "error", 
                "message": password_validation["message"]
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Utilisateur.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, Utilisateur.DoesNotExist):
            logger.warning(f"Tentative réinitialisation mot de passe avec lien invalide")
            return Response({
                "status": "error", 
                "message": "Lien de réinitialisation invalide ou expiré."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            logger.warning(f"Token réinitialisation invalide pour {user.email}")
            return Response({
                "status": "error", 
                "message": "Lien de réinitialisation invalide ou expiré."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Réinitialisation du mot de passe
        user.set_password(new_password1)
        user.save()

        # Enregistrer l'action
        UserAction.objects.create(
            user=user,
            action="Réinitialisation de mot de passe réussie",
            performed_by=None
        )

        # Envoyer les notifications
        self.send_password_change_notifications(user)

        logger.info(f"Mot de passe réinitialisé avec succès pour {user.email}")

        return Response({
            "status": "ok",
            "message": "Mot de passe réinitialisé avec succès.",
            "redirect_url": reverse("login")
        }, status=status.HTTP_200_OK)

    def validate_password_strength(self, password):
        """Valide la force du mot de passe"""
        if len(password) < 8:
            return {"valid": False, "message": "Le mot de passe doit contenir au moins 8 caractères."}
        
        if not any(char.isdigit() for char in password):
            return {"valid": False, "message": "Le mot de passe doit contenir au moins un chiffre."}
        
        if not any(char.isupper() for char in password):
            return {"valid": False, "message": "Le mot de passe doit contenir au moins une majuscule."}
        
        if not any(char.islower() for char in password):
            return {"valid": False, "message": "Le mot de passe doit contenir au moins une minuscule."}
        
        return {"valid": True, "message": "Mot de passe valide."}

    def send_password_change_notifications(self, user):
        """Envoie les notifications de changement de mot de passe"""
        # Email de confirmation
        if hasattr(user, "profil") and getattr(user.profil, "email_securite", False):
            try:
                EmailSenderService.send_password_changed_notification(
                    user=user,
                    async_send=True
                )
                logger.info(f"Email confirmation changement mot de passe envoyé à {user.email}")
            except Exception as e:
                logger.error(f"Erreur envoi email confirmation: {e}")

        # Notification push
        if hasattr(user, "profil") and getattr(user.profil, "push_securite", False):
            try:
                Notification.objects.create(
                    user=user,
                    titre="Mot de passe réinitialisé",
                    message="Votre mot de passe a été modifié avec succès.",
                    type="securite",
                    icone="lock",
                    url="/parametres/securite/",
                )
            except Exception as e:
                logger.error(f"Erreur création notification: {e}")
