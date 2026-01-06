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


class NotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupérer les notifications récentes de l'utilisateur"""
        try:
            limit = request.GET.get('limit', None)
            notifications = Notification.objects.filter(user=request.user).order_by('-date_creation')
            
            if limit and str(limit).isdigit():
                notifications = notifications[:int(limit)]
                
            unread_count = Notification.objects.filter(user=request.user, lu=False).count()

            notifications_data = [
                {
                    "id": n.id,
                    "titre": n.titre,
                    "message": n.message,
                    "url": n.url,
                    "lu": n.lu,
                    "date_creation": n.date_creation.isoformat(),
                    "type": n.type,
                    "icone": n.icone,
                }
                for n in notifications
            ]

            return Response({
                "notifications": notifications_data,
                "unread_count": unread_count,
                "total_count": notifications.count()
            })
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des notifications: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AllNotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Récupérer toutes les notifications (pour la page dédiée)"""
        try:
            notifications = Notification.objects.filter(user=request.user).order_by('-date_creation')
            unread_count = Notification.objects.filter(user=request.user, lu=False).count()

            notifications_data = [
                {
                    "id": n.id,
                    "titre": n.titre,
                    "message": n.message,
                    "url": n.url,
                    "lu": n.lu,
                    "date_creation": n.date_creation.isoformat(),
                    "type": n.type,
                    "icone": n.icone,
                }
                for n in notifications
            ]

            return Response({
                "notifications": notifications_data,
                "unread_count": unread_count,
                "total_count": notifications.count()
            })
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de toutes les notifications: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MarkAllNotificationsReadAPI(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """Marquer toutes les notifications comme lues"""
        try:
            # ✅ CORRECTION : Ne PAS créer de nouvelles notifications ici !
            updated_count = Notification.objects.filter(
                user=request.user, 
                lu=False
            ).update(lu=True)
            
            return Response({
                "success": True,
                "message": f"{updated_count} notifications marquées comme lues",
                "updated_count": updated_count
            })
        except Exception as e:
            logger.error(f"Erreur lors du marquage de toutes comme lues: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MarkNotificationReadAPI(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """Marquer une notification spécifique comme lue"""
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            
            # ✅ CORRECTION : Ne pas créer de notification supplémentaire
            if not notification.lu:
                notification.lu = True
                notification.save()
            
            return Response({
                "success": True,
                "message": "Notification marquée comme lue"
            })
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur lors du marquage comme lu: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteNotificationAPI(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """Supprimer une notification spécifique"""
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            notification.delete()
            
            return Response({
                "success": True,
                "message": "Notification supprimée"
            })
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification non trouvée"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur lors de la suppression: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DeleteAllNotificationsAPI(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Supprimer toutes les notifications"""
        try:
            deleted_count, _ = Notification.objects.filter(user=request.user).delete()
            
            return Response({
                "success": True,
                "message": f"{deleted_count} notifications supprimées",
                "deleted_count": deleted_count
            })
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de toutes: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class NotificationDetailAPI(APIView):
    """API pour récupérer les détails d'une notification spécifique"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            # Récupérer la notification pour l'utilisateur connecté
            notification = get_object_or_404(Notification, pk=pk, user=request.user)
            
            # Sérialiser les données
            notification_data = {
                "id": notification.id,
                "titre": notification.titre,
                "message": notification.message,
                "url": notification.url,
                "lu": notification.lu,
                "date_creation": notification.date_creation.isoformat(),
                "type": notification.type,
                "icone": notification.icone,
                "expediteur": getattr(notification, 'expediteur', None),
            }

            return Response({
                "notification": notification_data
            }, status=status.HTTP_200_OK)
            
        except Notification.DoesNotExist:
            logger.warning(f"Notification non trouvée - ID: {pk}, User: {request.user.id}")
            return Response({
                "error": "Notification non trouvée",
                "message": "La notification que vous recherchez n'existe pas ou vous n'y avez pas accès"
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de la notification {pk}: {str(e)}")
            return Response({
                "error": str(e),
                "message": "Erreur lors de la récupération de la notification"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
