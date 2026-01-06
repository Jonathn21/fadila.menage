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
    Stagiaire, Notification, Entretien, Demande, RapportStage, 
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

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY manquante dans les variables d'environnement")
    raise ValueError("GEMINI_API_KEY manquante")
try:
    genai.configure(api_key=GEMINI_API_KEY)

    available_models = genai.list_models()
    
    supported_models = []
    for model in available_models:
        if 'generateContent' in model.supported_generation_methods:
            supported_models.append(model.name)
    
    
    GEMINI_AVAILABLE_MODELS = supported_models
    
except Exception as e:
    print(f"⚠️ Erreur configuration Gemini: {e}")
    GEMINI_AVAILABLE_MODELS = []
    genai.configure(api_key=GEMINI_API_KEY)

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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

        if Utilisateur.objects.filter(email=email).exists():
            return Response(
                {"success": False, "message": "Un utilisateur avec cet email existe déjà."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 🔑 Création de l'utilisateur
        user = Utilisateur.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
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
    def get(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        serializer = UtilisateurSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        serializer = UtilisateurSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        user.delete()
        return Response({"message": "Utilisateur supprimé"}, status=status.HTTP_204_NO_CONTENT)


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class UserActionHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        user = get_object_or_404(Utilisateur, id=user_id)
        actions = UserAction.objects.filter(user=user)
        serializer = UserActionSerializer(actions, many=True)
        return Response(serializer.data)
