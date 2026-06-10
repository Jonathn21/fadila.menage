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
from utilisateurs.permissions import (
    HasPermission, get_user_permissions, get_default_permissions_for_role,
    sanitize_permissions,
    PERMISSION_CATALOG, ALL_PERMISSIONS, SENSITIVE_PERMISSIONS,
    PERM_USERS_VIEW, PERM_USERS_CREATE, PERM_USERS_EDIT, PERM_USERS_DELETE,
    PERM_PERMISSIONS_MANAGE, ROLE_SUPERUTILISATEUR,
)
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

from rest_framework.permissions import BasePermission

class IsSuperUtilisateur(BasePermission):
    """
    Autorise uniquement les utilisateurs avec le rôle Superutilisateur
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "Superutilisateur"
        )



@method_decorator(never_cache, name='dispatch')
class ProfilAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profil, created = Profil.objects.get_or_create(user=user)
        serializer = ProfilSerializer(profil)
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        profil, created = Profil.objects.get_or_create(user=user)

        serializer = ProfilSerializer(profil, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profil mis à jour avec succès"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class UtilisateursAPI(APIView):
    permission_classes = [IsAuthenticated, HasPermission(PERM_USERS_VIEW)]

    def get(self, request):
        """Récupère la liste des utilisateurs avec filtres"""
        try:
            q = request.GET.get("q", "").strip()
            role = request.GET.get("role", "")
            statut = request.GET.get("statut", "")

            # Base queryset avec select_related pour optimiser
            utilisateurs = Utilisateur.objects.all().select_related('profil')

            # Application des filtres
            if q:
                utilisateurs = utilisateurs.filter(
                    Q(last_name__icontains=q) | 
                    Q(first_name__icontains=q) |
                    Q(email__icontains=q)
                )
            
            if role and role != "Tous":
                utilisateurs = utilisateurs.filter(role=role)
            
            if statut == "Actif":
                utilisateurs = utilisateurs.filter(is_active=True)
            elif statut == "Inactif":
                utilisateurs = utilisateurs.filter(is_active=False)

            # Pagination
            paginator = PageNumberPagination()
            paginator.page_size = 10
            result_page = paginator.paginate_queryset(
                utilisateurs.order_by("last_name", "first_name"), 
                request
            )

            serializer = UtilisateurSerializer(result_page, many=True)
            return paginator.get_paginated_response(serializer.data)

        except Exception as e:
            logger.error(f"Erreur récupération utilisateurs: {str(e)}")
            return Response(
                {"error": "Erreur lors de la récupération des utilisateurs"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class AjouterUtilisateurAPIView(APIView):
    permission_classes = [IsAuthenticated, HasPermission(PERM_USERS_CREATE)]

    def post(self, request):
        # Récupération des données
        first_name = request.data.get("first_name")
        last_name = request.data.get("last_name")
        email = request.data.get("email")
        role = request.data.get("role", "Utilisateur")
        password = request.data.get("password")

        # Validation
        if not email or not password:
            return Response(
                {"success": False, "message": "Email et mot de passe requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Le rôle demandé doit être valide
        roles_valides = [choix[0] for choix in Utilisateur.ROLE_CHOICES]
        if role not in roles_valides:
            return Response(
                {"success": False, "message": "Rôle invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Anti-escalade : seul un Superutilisateur peut créer un Superutilisateur
        if role == "Superutilisateur" and request.user.role != "Superutilisateur":
            return Response(
                {"success": False, "message": "Vous n'êtes pas autorisé à créer un super-utilisateur."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if Utilisateur.objects.filter(email=email).exists():
            return Response(
                {"success": False, "message": "Un utilisateur avec cet email existe déjà."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🔑 Création de l'utilisateur
        # Les permissions sont initialisées depuis le gabarit du rôle ;
        # elles pourront ensuite être ajustées par utilisateur.
        user = Utilisateur.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            permissions=get_default_permissions_for_role(role),
            date_joined=now()
        )

        # 🔹 Enregistrer l'action dans l'historique
        self._log_action(user, request.user)

        # 🔔 Notifications push
        self._send_notifications(user, request.user)

        # 📧 Email de bienvenue via service centralisé
        email_envoye = self._send_welcome_email(user, password)

        # ✅ Réponse API
        return Response(
            {
                "success": True,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "date_joined": user.date_joined.strftime("%Y-%m-%d %H:%M:%S"),
                },
                "email_envoye": email_envoye,
                "message": f"Utilisateur {first_name} {last_name} créé avec succès"
            },
            status=status.HTTP_201_CREATED,
        )

    def _log_action(self, user, performed_by):
        """Enregistre l'action dans l'historique"""
        try:
            UserAction.objects.create(
                user=user,
                action="Création du compte utilisateur",
                performed_by=performed_by
            )
            logger.info(f"✅ Action enregistrée pour {user.email}")
        except Exception as e:
            logger.error(f"❌ Erreur enregistrement action: {e}")

    def _send_notifications(self, new_user, creator):
        """Envoie les notifications push"""
        # Notification au créateur
        try:
            NotificationService.notifier_creation_utilisateur(
                nouvel_utilisateur=new_user,
                createur=creator
            )
            logger.info(f"✅ Notification envoyée au créateur {creator.email}")
        except Exception as e:
            logger.error(f"❌ Erreur notification créateur: {e}")
        
        # Broadcast aux autres administrateurs
        try:
            NotificationService.broadcast_creation_utilisateur(
                nouvel_utilisateur=new_user,
                createur=creator
            )
            logger.info(f"✅ Broadcast effectué")
        except Exception as e:
            logger.error(f"❌ Erreur broadcast: {e}")

    def _send_welcome_email(self, user, password):
        """
        ✅ Envoie l'email de bienvenue via le service centralisé
        Plus besoin de 200+ lignes de HTML !
        """
        try:
            success = EmailSenderService.send_account_created(
                user=user,
                password=password,
                async_send=True
            )
            
            if success:
                logger.info(f"✅ Email bienvenue envoyé à {user.email}")
                return True
            else:
                logger.warning(f"⚠️ Email bienvenue non envoyé à {user.email}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur envoi email bienvenue: {e}")
            return False

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class UtilisateurDetailAPIView(APIView):
    # Permissions appliquées par méthode (voir get_permissions)
    permission_classes = [IsAuthenticated]

    # Permission requise selon le verbe HTTP
    _method_permissions = {
        "GET": PERM_USERS_VIEW,
        "PUT": PERM_USERS_EDIT,
        "PATCH": PERM_USERS_EDIT,
        "DELETE": PERM_USERS_DELETE,
    }

    def get_permissions(self):
        perms = [IsAuthenticated()]
        required = self._method_permissions.get(self.request.method)
        if required:
            perms.append(HasPermission(required))
        return perms

    def get(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        serializer = UtilisateurSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        data = request.data.copy()

        # Le rôle ne peut être modifié que par un Superutilisateur
        new_role = data.get("role")
        if new_role is not None and new_role != user.role:
            if request.user.role != "Superutilisateur":
                return Response(
                    {"error": "Seul un super-utilisateur peut modifier le rôle."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if new_role not in [c[0] for c in Utilisateur.ROLE_CHOICES]:
                return Response(
                    {"error": "Rôle invalide."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Empêche de retirer son propre statut de super-utilisateur
            if request.user.id == user.id and new_role != "Superutilisateur":
                return Response(
                    {"error": "Vous ne pouvez pas modifier votre propre rôle."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = UtilisateurSerializer(user, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        # On ne peut pas se supprimer soi-même
        if request.user.id == user.id:
            return Response(
                {"error": "Vous ne pouvez pas supprimer votre propre compte."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user.delete()
        return Response({"message": "Utilisateur supprimé"}, status=status.HTTP_204_NO_CONTENT)


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class UserActionHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated, HasPermission(PERM_USERS_VIEW)]

    def get(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        actions = UserAction.objects.filter(user=user)
        serializer = UserActionSerializer(actions, many=True)
        return Response(serializer.data)



class CurrentUserAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "is_superuser": user.is_superuser,
            "permissions": get_user_permissions(user),
        })


@method_decorator(never_cache, name='dispatch')
class PermissionCatalogAPIView(APIView):
    """Expose le catalogue des permissions (codes, libellés, catégories).

    Accessible aux gestionnaires de permissions pour alimenter l'éditeur.
    """
    permission_classes = [IsAuthenticated, HasPermission(PERM_PERMISSIONS_MANAGE)]

    def get(self, request):
        return Response({"permissions": PERMISSION_CATALOG})


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class UserPermissionsAPIView(APIView):
    """Consultation et modification des permissions d'un utilisateur donné.

    Garde-fous anti-escalade :
    - réservé aux porteurs de `permissions.manage` ;
    - on ne modifie pas ses propres permissions ;
    - on ne touche pas aux permissions d'un Superutilisateur ;
    - seules des permissions valides (catalogue) sont acceptées ;
    - les permissions sensibles (gestion comptes/permissions) ne peuvent
      être accordées que par un Superutilisateur.
    """
    permission_classes = [IsAuthenticated, HasPermission(PERM_PERMISSIONS_MANAGE)]

    def get(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        return Response({
            "user_id": user.id,
            "role": user.role,
            "is_superuser": user.is_superuser,
            # Permissions effectives (Super = toutes) pour l'affichage.
            "permissions": get_user_permissions(user),
        })

    def put(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)

        # On ne modifie pas ses propres permissions (anti-escalade).
        if request.user.id == user.id:
            return Response(
                {"error": "Vous ne pouvez pas modifier vos propres permissions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Le Superutilisateur contourne le système : pas de modification.
        if user.role == ROLE_SUPERUTILISATEUR:
            return Response(
                {"error": "Les permissions d'un super-utilisateur ne sont pas modifiables."},
                status=status.HTTP_403_FORBIDDEN,
            )

        requested = request.data.get("permissions")
        if not isinstance(requested, list):
            return Response(
                {"error": "Le champ 'permissions' doit être une liste de codes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Filtre contre le catalogue (élimine les codes inconnus).
        cleaned = sanitize_permissions(requested)

        # Anti-escalade : seul un Superutilisateur peut accorder des
        # permissions sensibles. Pour les autres gestionnaires, on retire
        # toute permission sensible qui ne figurait pas déjà sur le compte.
        if request.user.role != ROLE_SUPERUTILISATEUR:
            current = set(user.permissions or [])
            cleaned = [
                code for code in cleaned
                if code not in SENSITIVE_PERMISSIONS or code in current
            ]

        user.permissions = cleaned
        user.save(update_fields=["permissions"])

        # Trace l'action dans l'historique.
        try:
            UserAction.objects.create(
                user=user,
                action="Modification des permissions",
                performed_by=request.user,
            )
        except Exception as e:
            logger.error(f"❌ Erreur enregistrement action permissions: {e}")

        return Response({
            "user_id": user.id,
            "permissions": cleaned,
            "message": "Permissions mises à jour.",
        }, status=status.HTTP_200_OK)
