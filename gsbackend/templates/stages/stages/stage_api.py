
import logging
from datetime import datetime 
import pytesseract
import logging
import time
import os
from datetime import datetime
from io import BytesIO

from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.http import HttpResponse
import google.generativeai as genai
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT, TA_LEFT
from reportlab.lib.units import cm, inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, 
    
)
from services.email_service import EmailSenderService

from .listeStage import StageBaseAPIView

from django.db import transaction

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.decorators import method_decorator
from django.utils.timezone import now

from rest_framework import status, parsers
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from ..models import (
    Stagiaire,UserAction ,Demande, ConventionStage
)

from services.notification_service import NotificationService

from services.email_templates_extended import StageEmailTemplates

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

@method_decorator([never_cache, ratelimit(key='user', rate='60/m', method='GET')], name='dispatch')
class StagesEnCoursAPI(StageBaseAPIView):
    statut_filter = "Actuel"
    default_ordering = "date_debut"

@method_decorator([never_cache, ratelimit(key='user', rate='60/m', method='GET')], name='dispatch')
class StagesTermineAPI(StageBaseAPIView):
    statut_filter = "Terminé" 
    default_ordering = "date_fin"

@method_decorator([never_cache, ratelimit(key='user', rate='60/m', method='GET')], name='dispatch')
class StagesProchainAPI(StageBaseAPIView):
    statut_filter = "À venir"
    default_ordering = "date_debut"

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class FinAnticipeeStagiaireAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        stagiaire = get_object_or_404(Stagiaire, pk=stagiaire_id)

        # Sauvegarde de l'ancien statut pour l'email
        ancien_statut = stagiaire.statut
        
        stagiaire.statut = "Terminé"
        stagiaire.date_fin = now().date()
        stagiaire.save()

        # 🔹 Enregistrer l'action dans l'historique
        UserAction.objects.create(
            user=request.user,
            action=f"Fin anticipée du stage de {stagiaire.prenom} {stagiaire.nom}",
            performed_by=request.user
        )

        # ✅ ENVOI EMAIL SIMPLIFIÉ via le service
        try:
            email_data = StageEmailTemplates.fin_anticipee_stage(stagiaire)
            email_envoye = EmailSenderService.send_email(
                to_email=stagiaire.email,
                subject=email_data['subject'],
                html_content=email_data['html'],
                text_content=email_data['text'],
                async_send=True
            )
            logger.info(f"✅ Email fin anticipée envoyé à {stagiaire.email}: {email_envoye}")
        except Exception as e:
            logger.error(f"❌ Erreur envoi email fin anticipée: {e}")
            email_envoye = False

        # 🔔 NOTIFICATION PUSH
        try:
            NotificationService.notifier_fin_anticipee_stage(
                stagiaire=stagiaire,
                utilisateur=request.user
            )
            logger.info(f"✅ Notification fin anticipée pour {stagiaire.prenom} {stagiaire.nom}")
        except Exception as e:
            logger.error(f"❌ Erreur notification fin anticipée: {e}")

        # 📢 DIFFUSION AUX AUTRES ADMINISTRATEURS
        try:
            NotificationService.broadcast_fin_anticipee_stage(
                stagiaire=stagiaire,
                utilisateur_courant=request.user
            )
            logger.info(f"✅ Broadcast fin anticipée effectué")
        except Exception as e:
            logger.error(f"❌ Erreur broadcast fin anticipée: {e}")

        return Response({
            "success": True,
            "message": f"Le stage de {stagiaire.prenom} {stagiaire.nom} a été clôturé avec succès.",
            "email_envoye": email_envoye,
            "stagiaire": {
                "id": stagiaire.id,
                "nom_complet": f"{stagiaire.prenom} {stagiaire.nom}",
                "statut": stagiaire.statut,
                "date_fin": stagiaire.date_fin.strftime('%d/%m/%Y')
            }
        }, status=status.HTTP_200_OK)

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class ModifierPeriodeStagiaireAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        stagiaire = get_object_or_404(Stagiaire, pk=stagiaire_id)

        date_debut_str = request.data.get("date_debut")
        date_fin_str = request.data.get("date_fin")

        if not date_debut_str or not date_fin_str:
            return Response(
                {"detail": "Les deux dates sont requises."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Conversion string -> date
        date_debut = parse_date(date_debut_str)
        date_fin = parse_date(date_fin_str)

        if not date_debut or not date_fin:
            return Response(
                {"detail": "Format de date invalide. Utilisez YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation des dates
        if date_fin <= date_debut:
            return Response(
                {"detail": "La date de fin doit être postérieure à la date de début."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Sauvegarde des anciennes dates pour l'email
            ancienne_date_debut = stagiaire.date_debut
            ancienne_date_fin = stagiaire.date_fin
            
            stagiaire.date_debut = date_debut
            stagiaire.date_fin = date_fin
            stagiaire.save()

            # 🔹 Enregistrer l'action dans l'historique
            UserAction.objects.create(
                user=request.user,
                action=f"Modification période stage {stagiaire.prenom} {stagiaire.nom} : {ancienne_date_debut.strftime('%d/%m/%Y') if ancienne_date_debut else 'N/A'} → {date_debut.strftime('%d/%m/%Y')} / {ancienne_date_fin.strftime('%d/%m/%Y') if ancienne_date_fin else 'N/A'} → {date_fin.strftime('%d/%m/%Y')}",
                performed_by=request.user
            )

            # ✅ ENVOI EMAIL SIMPLIFIÉ via le service
            try:
                email_data = StageEmailTemplates.modification_periode(
                    stagiaire, 
                    ancienne_date_debut, 
                    ancienne_date_fin
                )
                email_envoye = EmailSenderService.send_email(
                    to_email=stagiaire.email,
                    subject=email_data['subject'],
                    html_content=email_data['html'],
                    text_content=email_data['text'],
                    async_send=True
                )
                logger.info(f"✅ Email modification période envoyé à {stagiaire.email}: {email_envoye}")
            except Exception as e:
                logger.error(f"❌ Erreur envoi email modification période: {e}")
                email_envoye = False

            # 🔔 NOTIFICATION PUSH
            try:
                NotificationService.notifier_modification_periode_stage(
                    stagiaire=stagiaire,
                    utilisateur=request.user,
                    ancienne_date_debut=ancienne_date_debut,
                    ancienne_date_fin=ancienne_date_fin
                )
                logger.info(f"✅ Notification modification période pour {stagiaire.prenom} {stagiaire.nom}")
            except Exception as e:
                logger.error(f"❌ Erreur notification modification période: {e}")

            # 📢 DIFFUSION AUX AUTRES ADMINISTRATEURS
            try:
                NotificationService.broadcast_modification_periode_stage(
                    stagiaire=stagiaire,
                    utilisateur_courant=request.user,
                    ancienne_date_debut=ancienne_date_debut,
                    ancienne_date_fin=ancienne_date_fin
                )
                logger.info(f"✅ Broadcast modification période effectué")
            except Exception as e:
                logger.error(f"❌ Erreur broadcast modification période: {e}")

            return Response({
                "success": True,
                "detail": "Période mise à jour avec succès.",
                "email_envoye": email_envoye,
                "stagiaire": {
                    "id": stagiaire.id,
                    "nom_complet": f"{stagiaire.prenom} {stagiaire.nom}",
                    "date_debut": stagiaire.date_debut.strftime('%Y-%m-%d'),
                    "date_fin": stagiaire.date_fin.strftime('%Y-%m-%d')
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur modification période stagiaire {stagiaire_id}: {e}")
            return Response(
                {"detail": "Erreur lors de la mise à jour de la période."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator([csrf_protect, never_cache], name='dispatch')
class StagiaireDetailAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser]

    @method_decorator(ratelimit(key='user', rate='30/m', method='GET'))
    def get(self, request, stagiaire_id):
        """Récupère les détails d'un stagiaire de manière sécurisée"""
        try:
            # Validation de l'ID
            if not stagiaire_id or not str(stagiaire_id).isdigit():
                logger.warning(f"Tentative d'accès avec ID stagiaire invalide: {stagiaire_id}")
                return Response(
                    {"detail": "Identifiant de stagiaire invalide."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Récupération sécurisée avec sélection des relations
            stagiaire = get_object_or_404(
                Stagiaire.objects.select_related('etablissement', 'demande', 'stage_precedent', 'nouveau_stage'),
                pk=stagiaire_id
            )
          
            # Construction de la réponse
            response_data = {
                "stagiaire": self.serialize_stagiaire_data(stagiaire, request)
            }

            # Audit de l'accès
            UserAction.objects.create(
                user=request.user,
                action=f"Consultation détail stagiaire {stagiaire.prenom} {stagiaire.nom}",
                performed_by=request.user,
            )

            return Response(response_data)

        except Stagiaire.DoesNotExist:
            logger.warning(f"Tentative d'accès à un stagiaire inexistant: {stagiaire_id}")
            return Response(
                {"detail": "Stagiaire non trouvé."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur récupération détail stagiaire {stagiaire_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": "Erreur lors de la récupération des informations du stagiaire."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @method_decorator(ratelimit(key='user', rate='20/m', method='PATCH'))
    def patch(self, request, stagiaire_id):
        """Met à jour le résumé CV du stagiaire de manière sécurisée"""
        try:
            # Validation de l'ID
            if not stagiaire_id or not str(stagiaire_id).isdigit():
                return Response(
                    {"detail": "Identifiant de stagiaire invalide."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            stagiaire = get_object_or_404(Stagiaire, pk=stagiaire_id)

            # Validation des données
            resume_cv = request.data.get('resume_cv')
            if resume_cv is None:
                return Response(
                    {"detail": "Le champ 'resume_cv' est requis."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validation de la longueur du résumé
            if len(resume_cv) > 10000:  # Limite raisonnable
                return Response(
                    {"detail": "Le résumé est trop long (maximum 10 000 caractères)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Sanitization basique du contenu
            sanitized_resume = self.sanitize_text_content(resume_cv)

            # Mise à jour dans une transaction
            with transaction.atomic():
                ancien_resume = stagiaire.resume_cv
                stagiaire.resume_cv = sanitized_resume
                stagiaire.save()

                # Audit de la modification
                UserAction.objects.create(
                    user=request.user,
                    action=(
                        f"Modification résumé CV stagiaire {stagiaire.prenom} {stagiaire.nom} - "
                        f"Longueur: {len(sanitized_resume)} caractères"
                    ),
                    performed_by=request.user,
                    ip_address=self.get_client_ip(request)
                )

                logger.info(
                    f"Résumé CV mis à jour pour le stagiaire {stagiaire.id} "
                    f"par {request.user.email}"
                )

            return Response({
                "success": True,
                "message": "Résumé mis à jour avec succès.",
                "resume_cv": stagiaire.resume_cv,
                "longueur": len(stagiaire.resume_cv)
            }, status=status.HTTP_200_OK)

        except Stagiaire.DoesNotExist:
            return Response(
                {"detail": "Stagiaire non trouvé."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur modification résumé stagiaire {stagiaire_id}: {str(e)}")
            return Response(
                {"detail": "Erreur lors de la mise à jour du résumé."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def serialize_stagiaire_data(self, stagiaire, request):
        """Sérialise les données du stagiaire de manière sécurisée"""
        
        def build_secure_url(file_field):
            """Construit une URL sécurisée pour les fichiers"""
            if not file_field:
                return None
            
            try:
                if hasattr(file_field, "url"):
                    url = file_field.url
                    # Validation basique de l'URL
                    if url and not url.startswith(('http://', 'https://')):
                        return request.build_absolute_uri(url)
                    return url
                elif isinstance(file_field, str) and file_field.strip():
                    return request.build_absolute_uri(file_field.strip())
            except Exception as e:
                logger.warning(f"Erreur construction URL fichier: {e}")
            return None

        # Récupération sécurisée des documents
        documents = []
        try:
            if hasattr(stagiaire, 'get_documents'):
                raw_documents = stagiaire.get_documents()
                for doc in raw_documents:
                    if isinstance(doc, dict) and 'nom' in doc:
                        documents.append({
                            "nom": self.sanitize_filename(doc.get("nom", "")),
                            "url": build_secure_url(doc.get("url"))
                        })
        except Exception as e:
            logger.error(f"Erreur récupération documents stagiaire {stagiaire.id}: {e}")

        # Récupération de la convention de stage
        convention = None
        try:
            if hasattr(stagiaire, 'conventionstage') and stagiaire.conventionstage:
                conv = stagiaire.conventionstage
                convention = {
                    "id": conv.id,
                    "numero_convention": conv.numero_convention,
                    "fichier_url": build_secure_url(conv.fichier),
                    "date_creation": conv.date_creation.isoformat() if conv.date_creation else None,
                    "est_temporaire": getattr(conv, 'est_temporaire', False),
                    "est_renouvellement": getattr(conv, 'est_renouvellement', False),
                }
        except Exception as e:
            logger.error(f"Erreur récupération convention: {e}")

        # Récupération de la convention temporaire de renouvellement
        convention_renouvellement_temporaire = None
        try:
            if hasattr(stagiaire, 'convention_renouvellement_temporaire') and stagiaire.convention_renouvellement_temporaire:
                conv_temp = stagiaire.convention_renouvellement_temporaire
                if conv_temp.est_temporaire:
                    convention_renouvellement_temporaire = {
                        "id": conv_temp.id,
                        "numero_convention": conv_temp.numero_convention,
                        "fichier_url": build_secure_url(conv_temp.fichier),
                        "date_creation": conv_temp.date_creation.isoformat() if conv_temp.date_creation else None,
                        "est_temporaire": True
                    }
        except Exception as e:
            logger.error(f"Erreur récupération convention temporaire: {e}")

        # Récupération des informations de renouvellement
        info_renouvellement = None
        try:
            if hasattr(stagiaire, 'get_info_renouvellement'):
                info_renouvellement = stagiaire.get_info_renouvellement()
        except Exception as e:
            logger.error(f"Erreur récupération info renouvellement: {e}")

        return {
            "id": stagiaire.id,
            "nom": stagiaire.nom,
            "prenom": stagiaire.prenom,
            "adresse": stagiaire.adresse if stagiaire.adresse else None,
            "pays_residence": stagiaire.pays_residence if stagiaire.pays_residence else None,
            "type_stage": stagiaire.type_stage,
            "statut": stagiaire.statut,
            "resume": stagiaire.resume_cv,
            "date_debut": stagiaire.date_debut.isoformat() if stagiaire.date_debut else None,
            "date_fin": stagiaire.date_fin.isoformat() if stagiaire.date_fin else None,
            "duree_jours": stagiaire.duree_jours,
            "remunere": stagiaire.remunere,
            "montant_remuneration": stagiaire.montant_remuneration,
            "email": stagiaire.email,
            "telephone": stagiaire.telephone,
            "niveau_etude": stagiaire.niveau_etude,
            "specialite": stagiaire.specialite,
            "genre": stagiaire.genre,
            "direction": stagiaire.direction,
            "service": stagiaire.service,
            "lieu_stage": stagiaire.lieu_stage,
            "etablissement": {
                "name": stagiaire.etablissement.nom if stagiaire.etablissement else None,
                "location": stagiaire.etablissement.adresse if stagiaire.etablissement else None,
                "email": stagiaire.etablissement.email if stagiaire.etablissement else None,
                "phone": stagiaire.etablissement.telephone if stagiaire.etablissement else None,
            } if stagiaire.etablissement else None,
            "superviseur": stagiaire.superviseur,
            "photo_passeport": build_secure_url(stagiaire.photo_passeport),
            "documents": documents,
            
            # ✅ NOUVEAUX CHAMPS POUR LE RENOUVELLEMENT
            "pre_renouvellement_en_cours": getattr(stagiaire, 'pre_renouvellement_en_cours', False),
            "a_ete_renouvele": getattr(stagiaire, 'a_ete_renouvele', False),
            "est_renouvellement": getattr(stagiaire, 'est_renouvellement', False),
            "statut_renouvellement": getattr(stagiaire, 'statut_renouvellement', None),
            
            "date_pre_renouvellement": stagiaire.date_pre_renouvellement.isoformat() if hasattr(stagiaire, 'date_pre_renouvellement') and stagiaire.date_pre_renouvellement else None,
            "date_finalisation_renouvellement": stagiaire.date_finalisation_renouvellement.isoformat() if hasattr(stagiaire, 'date_finalisation_renouvellement') and stagiaire.date_finalisation_renouvellement else None,
            
            "donnees_pre_renouvellement": getattr(stagiaire, 'donnees_pre_renouvellement', None),
            
            # Liens vers les stages liés
            "stage_precedent_id": stagiaire.stage_precedent.id if hasattr(stagiaire, 'stage_precedent') and stagiaire.stage_precedent else None,
            "nouveau_stage_id": stagiaire.nouveau_stage.id if hasattr(stagiaire, 'nouveau_stage') and stagiaire.nouveau_stage else None,
            
            # Informations détaillées sur le renouvellement
            "info_renouvellement": info_renouvellement,
            
            # Conventions
            "convention": convention,
            "convention_renouvellement_temporaire": convention_renouvellement_temporaire,
            
            # Utilitaires pour le frontend
            "peut_renouveler": self.get_peut_renouveler(stagiaire),
            "peut_finaliser_renouvellement": self.get_peut_finaliser_renouvellement(stagiaire),
            "peut_annuler_pre_renouvellement": self.get_peut_annuler_pre_renouvellement(stagiaire),
        }

    def get_peut_renouveler(self, stagiaire):
        """Vérifie si le stage peut être renouvelé"""
        try:
            if hasattr(stagiaire, 'peut_renouveler'):
                return stagiaire.peut_renouveler[0]  # Le booléen
            return False
        except:
            return False

    def get_peut_finaliser_renouvellement(self, stagiaire):
        """Vérifie si le pré-renouvellement peut être finalisé"""
        try:
            if hasattr(stagiaire, 'peut_finaliser_renouvellement'):
                return stagiaire.peut_finaliser_renouvellement[0]
            return False
        except:
            return False

    def get_peut_annuler_pre_renouvellement(self, stagiaire):
        """Vérifie si le pré-renouvellement peut être annulé"""
        try:
            if hasattr(stagiaire, 'peut_annuler_pre_renouvellement'):
                return stagiaire.peut_annuler_pre_renouvellement[0]
            return False
        except:
            return False
    
    def is_user_related_to_stagiaire(self, user, stagiaire):
        """Vérifie si l'utilisateur est lié au stagiaire (ex: superviseur)"""
        # Implémentez selon votre logique métier
        return False

    def sanitize_user_agent(self, user_agent):
        """Nettoie le user agent"""
        if not user_agent:
            return ''
        import re
        cleaned = re.sub(r'[^\w\s\.\-/;()]', '', user_agent)
        return cleaned[:500]

    def sanitize_text_content(self, text):
        """Nettoie le contenu texte pour éviter les injections"""
        if not text:
            return text
        
        # Supprime les balises HTML potentiellement dangereuses
        import re
        cleaned = re.sub(r'<script.*?>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
        cleaned = re.sub(r'<[^>]*>', '', cleaned)
        
        # Échape les caractères spéciaux
        cleaned = cleaned.replace('\0', '').replace('\r', '').replace('\x00', '')
        
        return cleaned.strip()

    def sanitize_filename(self, filename):
        """Nettoie les noms de fichiers"""
        if not filename:
            return ''
        import re
        # Supprime les caractères potentiellement dangereux
        cleaned = re.sub(r'[^\w\s\.\-_]', '', filename)
        return cleaned[:255]

@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class PreRenouvelerStageAPIView(APIView):
    """
    Étape 1: Pré-renouvellement sans créer de nouveau stagiaire
    Génère une convention temporaire à faire signer
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        """
        Pré-renouvelle un stage terminé
        """
        try:
            with transaction.atomic():
                # Récupérer le stagiaire existant
                stagiaire = get_object_or_404(
                    Stagiaire.objects.select_related('etablissement'),
                    id=stagiaire_id
                )

                # Vérifier que le stage est terminé
                if stagiaire.statut != "Terminé":
                    return Response({
                        "success": False,
                        "message": "Seuls les stages terminés peuvent être renouvelés."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Vérifier si déjà en pré-renouvellement
                if getattr(stagiaire, 'statut_renouvellement', None) in ["Pré-renouvelé", "Renouvellement finalisé"]:
                    return Response({
                        "success": False,
                        "message": "Ce stage a déjà un renouvellement en cours ou finalisé."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Validation des données
                data = request.data
                validation_result = self.validate_renewal_data(data)
                if not validation_result["success"]:
                    return Response(validation_result, status=status.HTTP_400_BAD_REQUEST)

                # Validation et préparation des données
                donnees_validees = self.valider_et_preparer_donnees(request, data, stagiaire)
                if not donnees_validees["success"]:
                    return Response(donnees_validees, status=status.HTTP_400_BAD_REQUEST)

                donnees = donnees_validees["donnees"]

                # Génération du PDF temporaire pour le renouvellement
                pdf_genere, convention_temporaire = self.generer_pdf_renouvellement_temporaire(stagiaire, donnees)
                
                if pdf_genere and convention_temporaire:
                    # Sauvegarde des données de renouvellement
                    stagiaire.donnees_pre_renouvellement = donnees
                    stagiaire.statut_renouvellement = "Pré-renouvelé"
                    stagiaire.pre_renouvellement_en_cours = True  # ✅ AJOUTER CETTE LIGNE

                    stagiaire.date_pre_renouvellement = timezone.now()
                    stagiaire.convention_renouvellement_temporaire = convention_temporaire
                    stagiaire.save(update_fields=[
                        'donnees_pre_renouvellement', 
                        'statut_renouvellement',
                        'date_pre_renouvellement',
                        'convention_renouvellement_temporaire_id',  # ← _id obligatoire pour FK
                        'pre_renouvellement_en_cours'
                    ])
                else:
                    return Response({
                        "success": False,
                        "message": "Échec de la génération de la convention de renouvellement."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # 🔔 NOTIFICATION PUSH - Pré-renouvellement
                try:
                    # Calculer la durée en mois pour la notification
                    date_debut = datetime.strptime(donnees["date_debut"], "%d/%m/%Y").date()
                    date_fin = datetime.strptime(donnees["date_fin"], "%d/%m/%Y").date()
                    duree_mois = self.calculer_duree_mois(donnees["date_debut"], donnees["date_fin"])
                    
                    donnees_notif = {
                        "duree_mois": duree_mois,
                        "service": donnees.get("service", "NC"),
                        "direction": donnees.get("direction", "NC"),
                        "date_debut": donnees["date_debut"],
                        "date_fin": donnees["date_fin"],
                        "type_stage": donnees.get("type_stage", "NC"),
                        "remunere": donnees.get("remunere", False),
                        "montant": donnees.get("montant", 0)
                    }
                    
                    # Notification à l'utilisateur qui a effectué l'action
                    NotificationService.notifier_pre_renouvellement_stage(
                        stagiaire, 
                        request.user, 
                        donnees_notif
                    )
                    
                    # Notification spécifique pour la convention générée
                    if convention_temporaire:
                        NotificationService.notifier_convention_renouvellement_generee(
                            stagiaire,
                            request.user,
                            convention_temporaire
                        )
                    
                    # Broadcast à tous les autres utilisateurs
                    NotificationService.broadcast_pre_renouvellement_stage(
                        stagiaire,
                        request.user,
                        donnees_notif
                    )
                    
                    logger.info(f"🔔 Notifications pré-renouvellement envoyées pour stagiaire #{stagiaire.id}")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur lors de l'envoi des notifications: {e}", exc_info=True)
                    # Ne pas bloquer le processus si les notifications échouent

                # Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Pré-renouvellement stagiaire {stagiaire.nom} {stagiaire.prenom}",
                    performed_by=request.user
                )

                # URL du PDF
                pdf_url = None
                if convention_temporaire and convention_temporaire.fichier and convention_temporaire.fichier.name:
                    pdf_url = request.build_absolute_uri(convention_temporaire.fichier.url)

                logger.info(f"✅ Stagiaire {stagiaire_id} pré-renouvelé par {request.user.email}")

                return Response({
                    "success": True,
                    "message": "Pré-renouvellement réussi. Téléchargez la convention pour signature.",
                    "pdf_genere": pdf_genere,
                    "convention_temporaire_url": pdf_url,
                    "convention_temporaire_id": convention_temporaire.id if convention_temporaire else None,
                    "stagiaire": {
                        "id": stagiaire.id,
                        "nom": stagiaire.nom,
                        "prenom": stagiaire.prenom,
                        "statut_renouvellement": stagiaire.statut_renouvellement,
                        "date_pre_renouvellement": stagiaire.date_pre_renouvellement.isoformat() if stagiaire.date_pre_renouvellement else None,
                    }
                }, status=status.HTTP_200_OK)

        except Stagiaire.DoesNotExist:
            return Response({
                "success": False,
                "message": "Stagiaire non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur pré-renouvellement stagiaire {stagiaire_id}: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "message": f"Erreur lors du pré-renouvellement: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def validate_renewal_data(self, data):
        """Valide les données de renouvellement - Similaire à validate_acceptance_data"""
        required_fields = {
            "type_stage": data.get("type_stage"),
            "lieu": data.get("lieu"),
            "direction": data.get("direction"),
            "service": data.get("service"),
            "date_debut": data.get("date_debut"),
            "date_fin": data.get("date_fin"),
        }

        missing_fields = [field for field, value in required_fields.items() if not value]
        if missing_fields:
            return {
                "success": False,
                "message": f"Champs manquants : {', '.join(missing_fields)}"
            }

        # Validation de la longueur des champs texte
        text_fields = {
            "lieu": data.get("lieu", "") or "",
            "direction": data.get("direction", "") or "",
            "service": data.get("service", "") or "",
            "tuteur": data.get("tuteur", "") or "",
        }

        for field, value in text_fields.items():
            value_str = str(value) if value is not None else ""
            if len(value_str) > 255:
                return {
                    "success": False,
                    "message": f"Le champ {field} est trop long (max 255 caractères)"
                }

        return {"success": True}

    def parse_and_validate_dates(self, date_debut_str, date_fin_str):
        """Parse et valide les dates - Similaire à l'acceptation"""
        try:
            # Essayer le format JJ/MM/AAAA
            try:
                date_debut = datetime.strptime(date_debut_str, "%d/%m/%Y").date()
                date_fin = datetime.strptime(date_fin_str, "%d/%m/%Y").date()
            except ValueError:
                # Essayer le format AAAA-MM-JJ
                date_debut = datetime.strptime(date_debut_str, "%Y-%m-%d").date()
                date_fin = datetime.strptime(date_fin_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return {
                "success": False,
                "message": "Format de date invalide. Utilisez JJ/MM/AAAA ou AAAA-MM-JJ."
            }

        # Validation de la cohérence des dates
        if date_debut >= date_fin:
            return {
                "success": False,
                "message": "La date de début doit être avant la date de fin."
            }

        # Validation que le nouveau stage commence après la fin de l'ancien
        if date_debut <= timezone.now().date():
            return {
                "success": False,
                "message": "La date de début doit être dans le futur."
            }

        # Vérifier que la durée n'est pas trop longue (2 ans max)
        duree_jours = (date_fin - date_debut).days
        if duree_jours > 730:  # 2 ans
            return {
                "success": False,
                "message": "La durée du stage ne peut pas dépasser 2 ans."
            }

        return {
            "success": True,
            "date_debut": date_debut,
            "date_fin": date_fin
        }

    def validate_montant(self, remunere, montant_str):
        """Valide le montant de rémunération - Similaire à l'acceptation"""
        montant_final = None
        if remunere:
            if not montant_str:
                return {
                    "success": False,
                    "message": "Le montant est requis pour un stage rémunéré."
                }
            try:
                montant_final = int(montant_str) if montant_str and str(montant_str).strip() else 0
                if montant_final <= 0:
                    return {
                        "success": False,
                        "message": "Le montant doit être supérieur à zéro pour un stage rémunéré."
                    }
                if montant_final > 1000000:  # 1 million FCFA max
                    return {
                        "success": False,
                        "message": "Le montant ne peut pas dépasser 1 000 000 FCFA."
                    }
            except (ValueError, TypeError):
                return {
                    "success": False,
                    "message": "Le montant doit être un nombre valide."
                }

        return {
            "success": True,
            "montant": montant_final
        }

    def valider_et_preparer_donnees(self, request, data, stagiaire):
        """Valide et prépare les données pour le pré-renouvellement"""
        try:
            # Extraction
            type_stage = data.get("type_stage")
            lieu = data.get("lieu")
            direction = data.get("direction")
            service = data.get("service")
            tuteur = data.get("tuteur", "")
            date_debut_str = data.get("date_debut")
            date_fin_str = data.get("date_fin")
            remunere = data.get("remunere", False)
            montant_str = data.get("montant", 0)
            notes = data.get("notes", "")

            # Validation des dates
            dates_result = self.parse_and_validate_dates(date_debut_str, date_fin_str)
            if not dates_result["success"]:
                return dates_result
            
            date_debut = dates_result["date_debut"]
            date_fin = dates_result["date_fin"]

            # Validation du montant
            montant_result = self.validate_montant(remunere, montant_str)
            if not montant_result["success"]:
                return montant_result
            
            montant_final = montant_result["montant"]

            # Formatage des dates pour le stockage JSON
            date_debut_formatted = date_debut.strftime("%d/%m/%Y")
            date_fin_formatted = date_fin.strftime("%d/%m/%Y")

            # Récupérer l'utilisateur de façon sûre
            user = getattr(request, "user", None)

            # Préparation des données complètes
            donnees = {
                "type_stage": type_stage,
                "lieu": lieu,
                "direction": direction,
                "service": service,
                "tuteur": tuteur,
                "date_debut": date_debut_formatted,
                "date_fin": date_fin_formatted,
                "date_debut_iso": date_debut.isoformat(),
                "date_fin_iso": date_fin.isoformat(),
                "remunere": remunere,
                "montant": montant_final,
                "notes": notes,
                "date_pre_renouvellement": timezone.now().isoformat(),
                "user_id": user.id if user and hasattr(user, "id") else None,
                "user_email": user.email if user and hasattr(user, "email") else None,
                "stagiaire_info": {
                    "nom": stagiaire.nom,
                    "prenom": stagiaire.prenom,
                    "email": stagiaire.email,
                    "specialite": stagiaire.specialite
                }
            }
            
            return {
                "success": True,
                "donnees": donnees
            }
            
        except Exception as e:
            logger.error(f"Erreur préparation données renouvellement: {str(e)}")
            return {
                "success": False,
                "message": f"Erreur de préparation des données: {str(e)}"
            }

    def generer_pdf_renouvellement_temporaire(self, stagiaire, donnees):
        """Génère un PDF temporaire pour le renouvellement"""
        try:
            # Création d'une convention temporaire avec lien vers le stagiaire
            convention = ConventionStage.objects.create(
                est_temporaire=True,
                est_renouvellement=True,
                stagiaire_origine=stagiaire,  # Maintenant ce champ existe
                stagiaire=None,  # Pas encore de stagiaire lié
                demande=stagiaire.demande,  # Optionnel, si vous voulez aussi lier à la demande
            )
            
            # Génération du PDF
            pdf_genere = self.generer_pdf_avec_donnees_renouvellement(convention, stagiaire, donnees)
            
            if pdf_genere:
                return True, convention
            else:
                # Si la génération échoue, supprimer la convention créée
                convention.delete()
                return False, None
                
        except Exception as e:
            logger.error(f"Erreur génération PDF temporaire renouvellement: {str(e)}")
            import traceback
            traceback.print_exc()
            return False, None

    def generer_pdf_avec_donnees_renouvellement(self, convention, stagiaire, donnees):
        """Génère le PDF avec les données de renouvellement"""
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            
            elements = []
            
            # Styles personnalisés
            styles = getSampleStyleSheet()
            styles.add(ParagraphStyle(
                name="Ref", 
                fontSize=12, 
                alignment=TA_LEFT, 
                leading=14, 
                spaceAfter=12
            ))
            styles.add(ParagraphStyle(
                name="CenterTitle", 
                fontSize=14, 
                alignment=TA_CENTER, 
                spaceAfter=20, 
                leading=22,
                textColor=colors.HexColor('#2563eb')
            ))
            styles.add(ParagraphStyle(
                name="Justify", 
                fontSize=12, 
                alignment=TA_JUSTIFY, 
                leading=18
            ))
            styles.add(ParagraphStyle(
                name="Left", 
                fontSize=12, 
                alignment=TA_LEFT, 
                leading=18
            ))
            styles.add(ParagraphStyle(
                name="Signature", 
                fontSize=12, 
                alignment=TA_RIGHT, 
                spaceBefore=40
            ))
            
            # --- ESPACE pour l'en-tête pré-imprimé ---
            elements.append(Spacer(1, 6*cm))
            elements.append(Spacer(1, 20))
            
            # --- Title avec mention RENOUVELLEMENT ---
            elements.append(Paragraph("<b><u>AUTORISATION DE RENOUVELLEMENT DE STAGE</u></b>", styles["CenterTitle"]))
            elements.append(Spacer(1, 20))
            
            # --- Calcul de la durée du stage ---
            duree_mois = self.calculer_duree_mois(donnees["date_debut"], donnees["date_fin"])
            
            # --- Formater les dates et la durée ---
            date_debut_format = self.date_format_francais(donnees["date_debut"])
            date_fin_format = self.date_format_francais(donnees["date_fin"])
            duree_formatee = self.duree_en_lettres_et_chiffres(duree_mois)
            
            # --- Dictionnaire des descriptions des directions ---
            descriptions_directions = {
                "DARH": "Direction des Affaires et Ressources Humaines",
                "DCGIS": "Direction du Centre de Gestion de l'Information et des Statistiques",
                "DEPP": "Direction des Études, Planification et Projets",
                "DT": "Direction Technique",
                "DM": "Direction des Marchés",
                "DFC": "Direction Financière et Comptable",
                "DG": "Direction Générale",
            }
            
            # --- Récupérer la description de la direction ---
            direction_code = donnees.get("direction", "")
            direction_description = descriptions_directions.get(direction_code, direction_code)
            
            # --- Texte principal ---
            texte_autorisation = (
                f"Dans le cadre du renouvellement de son stage à la CEB, "
                f"Monsieur <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> est autorisé à effectuer un nouveau stage "
                f"pour une durée de <b>{duree_formatee}</b> mois allant du <b>{date_debut_format}</b> "
                f"au <b>{date_fin_format}</b>."
            )
            elements.append(Paragraph(texte_autorisation, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            texte_affectation = (
                f"L'intéressé est mis à la disposition de la Direction <b>{direction_code} ({direction_description})</b>, "
                f"Service <b>{donnees.get('service', '')}</b>."
            )
            elements.append(Paragraph(texte_affectation, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            # Mention du stage précédent
            texte_precedent = (
                f"Ce renouvellement fait suite au stage précédent effectué du "
                f"<b>{self.date_format_francais(stagiaire.date_debut.strftime('%d/%m/%Y'))}</b> au "
                f"<b>{self.date_format_francais(stagiaire.date_fin.strftime('%d/%m/%Y'))}</b>."
            )
            elements.append(Paragraph(texte_precedent, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            # Rémunération (conditionnelle)
            if donnees.get("remunere", False):
                montant = donnees.get("montant", 0)
                montant_formate = f"{montant:,}".replace(",", " ")
                texte_remuneration = (
                    f"Conformément à la décision Nº236/CEB/DG/DARH/SAA/SASR/2020 portant Révision des indemnités "
                    f"forfaitaires de Stage en date du 3 septembre 2020, Monsieur <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> "
                    f"bénéficie au cours de son stage d'une indemnité forfaitaire mensuelle nette de "
                    f"<b>{montant_formate} FRANCS CFA</b>."
                )
                elements.append(Paragraph(texte_remuneration, styles["Justify"]))
            
            elements.append(Spacer(1, 40))
            
            # --- Signature ---
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("Le Directeur Général", styles["Signature"]))
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("<b>Dr. Karimou CHABI SIKA</b>", styles["Signature"]))
            
            # --- Pied de page - Mention TEMPORAIRE ---
            elements.append(Spacer(1, 60))
            elements.append(Paragraph(
                f"<i><font color='blue'>CONVENTION DE RENOUVELLEMENT TEMPORAIRE - Réf: {convention.numero_convention}</font></i>", 
                ParagraphStyle(name="Footer", fontSize=8, alignment=TA_CENTER, textColor=colors.blue, spaceBefore=20)
            ))
            
            # Générer le PDF
            doc.build(elements)
            
            # Sauvegarde du fichier
            pdf_content = buffer.getvalue()
            buffer.close()
            
            nom_fichier = f"renouvellement_{stagiaire.nom}_{stagiaire.prenom}_{int(time.time())}.pdf"
            convention.fichier.save(nom_fichier, ContentFile(pdf_content), save=True)
            
            logger.info(f"Convention de renouvellement PDF générée: {nom_fichier}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur génération PDF renouvellement: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def calculer_duree_mois(self, date_debut_str, date_fin_str):
        """Calculer la durée du stage en mois"""
        try:
            date_debut = datetime.strptime(date_debut_str, "%d/%m/%Y").date()
            date_fin = datetime.strptime(date_fin_str, "%d/%m/%Y").date()
            
            delta = date_fin - date_debut
            mois = delta.days // 30
            
            # Arrondir au mois supérieur si besoin
            if delta.days % 30 > 15:  # Si plus de 15 jours supplémentaires
                mois += 1
            
            # Si moins d'un mois, mettre 1 mois
            if mois == 0:
                mois = 1
            
            return mois
        except:
            return 1

    def date_format_francais(self, date_str):
        """Formater une date en français avec le mois en lettres"""
        try:
            date_obj = datetime.strptime(date_str, "%d/%m/%Y").date()
            
            mois_francais = {
                1: "janvier", 2: "février", 3: "mars", 4: "avril",
                5: "mai", 6: "juin", 7: "juillet", 8: "août",
                9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
            }
            
            jour = date_obj.day
            mois = date_obj.month
            annee = date_obj.year
            
            if jour == 1:
                return f"le 1er {mois_francais[mois]} {annee}"
            else:
                return f"le {jour} {mois_francais[mois]} {annee}"
        except:
            return f"le [DATE INVALIDE]"

    def nombre_en_lettres_simple(self, n):
        """Convertir un nombre en lettres (simplifié pour les durées)"""
        nombres = {
            1: "un", 2: "deux", 3: "trois", 4: "quatre", 5: "cinq",
            6: "six", 7: "sept", 8: "huit", 9: "neuf", 10: "dix",
            11: "onze", 12: "douze", 13: "treize", 14: "quatorze", 15: "quinze",
            16: "seize", 17: "dix-sept", 18: "dix-huit", 19: "dix-neuf",
            20: "vingt", 21: "vingt-et-un", 22: "vingt-deux", 23: "vingt-trois",
            24: "vingt-quatre", 25: "vingt-cinq", 26: "vingt-six", 27: "vingt-sept",
            28: "vingt-huit", 29: "vingt-neuf", 30: "trente", 31: "trente-et-un",
            32: "trente-deux", 33: "trente-trois", 34: "trente-quatre", 35: "trente-cinq",
            36: "trente-six"
        }
        
        return nombres.get(n, str(n))

    def duree_en_lettres_et_chiffres(self, duree_mois):
        """Convertir la durée en lettres et en chiffres"""
        if not duree_mois or duree_mois <= 0:
            return "____"
        
        duree_lettres = self.nombre_en_lettres_simple(duree_mois)
        duree_chiffres = f"{duree_mois:02d}"
        duree_lettres = duree_lettres.capitalize()
        
        return f"{duree_lettres}({duree_chiffres})"


@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class FinaliserRenouvellementAPIView(APIView):
    """
    Étape 2: Finalisation du renouvellement avec upload du PDF signé
    Crée le nouveau stagiaire
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        """
        Finalise le renouvellement avec le PDF signé
        """
        try:
            with transaction.atomic():
                # Récupérer le stagiaire original
                stagiaire_original = get_object_or_404(
                    Stagiaire,
                    id=stagiaire_id
                )

                # Vérifier que le stagiaire est en pré-renouvellement
                if getattr(stagiaire_original, 'statut_renouvellement', None) != "Pré-renouvelé":
                    return Response({
                        "success": False,
                        "message": "Ce stagiaire n'est pas en état de pré-renouvellement."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Vérification du fichier signé
                fichier_signe = request.FILES.get('fichier_signe')
                convention_temporaire_id = request.data.get('convention_temporaire_id')

                if not fichier_signe:
                    return Response({
                        "success": False,
                        "message": "Le fichier signé est requis."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Validation du fichier
                if not self.valider_fichier_signe(fichier_signe):
                    return Response({
                        "success": False,
                        "message": "Format de fichier non supporté. Utilisez PDF uniquement (max 10MB)."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Récupération des données de pré-renouvellement
                if not hasattr(stagiaire_original, 'donnees_pre_renouvellement') or not stagiaire_original.donnees_pre_renouvellement:
                    return Response({
                        "success": False,
                        "message": "Données de pré-renouvellement manquantes."
                    }, status=status.HTTP_400_BAD_REQUEST)

                donnees = stagiaire_original.donnees_pre_renouvellement

                # ✅ CORRECTION 1: Création du NOUVEAU stagiaire avec stage_precedent
                nouveau_stagiaire = self.creer_nouveau_stagiaire(stagiaire_original, donnees)
                
                # Création de la convention définitive avec le PDF signé
                convention_definitive = ConventionStage.objects.create(
                    stagiaire=nouveau_stagiaire,
                    est_temporaire=False,
                    est_renouvellement=True,
                    stagiaire_origine=stagiaire_original,
                    numero_convention=f"RENEW-FINAL-{nouveau_stagiaire.id}-{int(time.time())}"
                )
                
                nom_fichier = f"convention_renouvellement_{nouveau_stagiaire.nom}_{nouveau_stagiaire.prenom}.pdf"
                convention_definitive.fichier.save(nom_fichier, fichier_signe, save=True)

                stagiaire_original.a_ete_renouvele = True
                stagiaire_original.nouveau_stage = nouveau_stagiaire
                stagiaire_original.statut_renouvellement = "Renouvellement finalisé"
                stagiaire_original.pre_renouvellement_en_cours = False

                stagiaire_original.date_finalisation_renouvellement = timezone.now()
                stagiaire_original.save(update_fields=[
                    'a_ete_renouvele',
                    'nouveau_stage',
                    'statut_renouvellement',
                    'pre_renouvellement_en_cours', 
                    'date_finalisation_renouvellement'

                ])

                # Nettoyer la convention temporaire
                self.nettoyer_convention_temporaire(stagiaire_original, convention_temporaire_id)

                # 🔔 NOTIFICATION PUSH - Finalisation renouvellement
                try:
                    NotificationService.notifier_renouvellement_finalise(
                        stagiaire_original,
                        nouveau_stagiaire,
                        request.user
                    )
                    
                    NotificationService.broadcast_renouvellement_finalise(
                        stagiaire_original,
                        nouveau_stagiaire,
                        request.user
                    )
                    
                    logger.info(f"🔔 Notifications finalisation renouvellement envoyées")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur envoi notifications: {e}")

                # Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Finalisation renouvellement {stagiaire_original.nom} {stagiaire_original.prenom} -> Nouveau #{nouveau_stagiaire.id}",
                    performed_by=request.user
                )

                # URL du fichier
                fichier_url = None
                if convention_definitive.fichier:
                    fichier_url = request.build_absolute_uri(convention_definitive.fichier.url)

                logger.info(f"✅ Renouvellement finalisé pour stagiaire {stagiaire_id} par {request.user.email}")

                return Response({
                    "success": True,
                    "message": "Renouvellement finalisé avec succès. Le nouveau stage a été créé.",
                    "email_envoye": True,
                    "nouveau_stagiaire": {
                        "id": nouveau_stagiaire.id,
                        "nom": nouveau_stagiaire.nom,
                        "prenom": nouveau_stagiaire.prenom,
                        "type_stage": nouveau_stagiaire.type_stage,
                        "statut": nouveau_stagiaire.statut,
                        "date_debut": nouveau_stagiaire.date_debut.strftime('%d/%m/%Y'),
                        "date_fin": nouveau_stagiaire.date_fin.strftime('%d/%m/%Y'),
                        "direction": nouveau_stagiaire.direction,
                        "service": nouveau_stagiaire.service,
                        "superviseur": nouveau_stagiaire.superviseur,
                    },
                    "convention": {
                        "id": convention_definitive.id,
                        "numero_convention": convention_definitive.numero_convention,
                        "fichier_url": fichier_url,
                        "date_creation": convention_definitive.date_creation.strftime('%d/%m/%Y')
                    }
                }, status=status.HTTP_201_CREATED)

        except Stagiaire.DoesNotExist:
            return Response({
                "success": False,
                "message": "Stagiaire non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur finalisation renouvellement {stagiaire_id}: {str(e)}", exc_info=True)
            import traceback
            traceback.print_exc()
            return Response({
                "success": False,
                "message": f"Erreur lors de la finalisation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def creer_nouveau_stagiaire(self, stagiaire_original, donnees):
        """Crée le nouveau stagiaire à partir des données de renouvellement"""
        try:
            from datetime import datetime
            
            # Parse des dates
            try:
                date_debut = datetime.strptime(donnees.get("date_debut"), "%d/%m/%Y").date()
                date_fin = datetime.strptime(donnees.get("date_fin"), "%d/%m/%Y").date()
            except:
                date_debut = datetime.fromisoformat(donnees.get("date_debut_iso")).date()
                date_fin = datetime.fromisoformat(donnees.get("date_fin_iso")).date()
            
            # Détermination du statut
            today = timezone.now().date()
            if today < date_debut:
                statut = "À venir"
            elif date_debut <= today <= date_fin:
                statut = "Actuel"
            else:
                statut = "Terminé"

            # ✅ CORRECTION: Utiliser stage_precedent au lieu de stagiaire_origine
            # Création du nouveau stagiaire (copie avec modifications)
            nouveau_stagiaire = Stagiaire.objects.create(
                # Copier les informations de base
                photo_passeport=stagiaire_original.photo_passeport,
                nom=stagiaire_original.nom,
                prenom=stagiaire_original.prenom,
                email=stagiaire_original.email,
                telephone=stagiaire_original.telephone,
                niveau_etude=stagiaire_original.niveau_etude,
                specialite=stagiaire_original.specialite,
                adresse=stagiaire_original.adresse,
                genre=stagiaire_original.genre,
                pays_residence=stagiaire_original.pays_residence,
                etablissement=stagiaire_original.etablissement,
                
                # Nouvelles données du renouvellement
                type_stage=donnees.get("type_stage"),
                lieu_stage=donnees.get("lieu"),
                direction=donnees.get("direction"),
                service=donnees.get("service"),
                superviseur=donnees.get("tuteur", ""),
                date_accord=today,
                date_debut=date_debut,
                date_fin=date_fin,
                remunere=donnees.get("remunere", False),
                montant_remuneration=donnees.get("montant"),
                statut=statut,
                
                # ✅ CORRECTION: stage_precedent au lieu de stagiaire_origine
                stage_precedent=stagiaire_original,
                
                # Indiquer que c'est un renouvellement
                est_renouvellement=True,
                
                # Copier les documents
                cv=stagiaire_original.cv,
                lettre_motivation=stagiaire_original.lettre_motivation,
                resume_cv=stagiaire_original.resume_cv,
            )

            # Copier le diplôme si présent
            if stagiaire_original.diplome:
                nouveau_stagiaire.diplome = stagiaire_original.diplome
                nouveau_stagiaire.save(update_fields=['diplome'])

            logger.info(f"Nouveau stagiaire créé (renouvellement): {nouveau_stagiaire.id}")
            return nouveau_stagiaire

        except Exception as e:
            logger.error(f"Erreur création nouveau stagiaire: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    def valider_fichier_signe(self, fichier):
        """Valide le fichier signé (PDF uniquement)"""
        allowed_types = ['application/pdf']
        max_size = 10 * 1024 * 1024  # 10MB
        
        if fichier.size > max_size:
            logger.warning(f"Fichier trop volumineux: {fichier.size} bytes")
            return False
        
        if hasattr(fichier, 'content_type') and fichier.content_type not in allowed_types:
            logger.warning(f"Type MIME non autorisé: {fichier.content_type}")
            return False
        
        if not fichier.name.lower().endswith('.pdf'):
            logger.warning(f"Extension non autorisée: {fichier.name}")
            return False
        
        return True

    def nettoyer_convention_temporaire(self, stagiaire, convention_temporaire_id=None):
        """Nettoie la convention temporaire après finalisation"""
        try:
            # Supprimer la convention temporaire si elle existe
            if convention_temporaire_id:
                try:
                    convention_temp = ConventionStage.objects.get(id=convention_temporaire_id, est_temporaire=True)
                    if convention_temp.fichier:
                        convention_temp.fichier.delete(save=False)
                    convention_temp.delete()
                    logger.info(f"Convention temporaire {convention_temporaire_id} supprimée")
                except ConventionStage.DoesNotExist:
                    pass
            
            # Supprimer la référence dans le stagiaire
            if stagiaire.convention_renouvellement_temporaire:
                temp_conv = stagiaire.convention_renouvellement_temporaire
                if temp_conv.fichier:
                    temp_conv.fichier.delete(save=False)
                temp_conv.delete()
                stagiaire.convention_renouvellement_temporaire = None
                stagiaire.save(update_fields=['convention_renouvellement_temporaire'])
                
        except Exception as e:
            logger.error(f"Erreur nettoyage convention temporaire: {e}")

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class TelechargerConventionRenouvellementAPIView(APIView):
    """Télécharge une convention temporaire de renouvellement"""
    permission_classes = [IsAuthenticated]

    def get(self, request, convention_id):
        try:
            convention = get_object_or_404(
                ConventionStage.objects.filter(est_temporaire=True),
                id=convention_id
            )
            
            # Vérifier que l'utilisateur a accès à cette convention
            if not self.has_download_permission(request.user, convention):
                return Response({
                    "success": False,
                    "message": "Vous n'avez pas accès à cette convention."
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not convention.fichier:
                return Response({
                    "success": False,
                    "message": "Aucun fichier disponible pour cette convention."
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Vérifier que le fichier existe physiquement
            if not convention.fichier.storage.exists(convention.fichier.name):
                return Response({
                    "success": False,
                    "message": "Le fichier n'existe plus sur le serveur."
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Renvoyer le fichier
            response = HttpResponse(convention.fichier, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{convention.fichier.name}"'
            return response
                
        except ConventionStage.DoesNotExist:
            return Response({
                "success": False,
                "message": "Convention temporaire non trouvée."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur téléchargement convention {convention_id}: {str(e)}")
            return Response({
                "success": False,
                "message": "Erreur lors du téléchargement."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def has_download_permission(self, user, convention):
        """Vérifie si l'utilisateur peut télécharger la convention"""
        # L'utilisateur peut télécharger s'il est authentifié
        return user.is_authenticated

@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class AnnulerPreRenouvellementAPIView(APIView):
    """Annuler un pré-renouvellement"""
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        try:
            with transaction.atomic():
                # Récupération du stagiaire
                stagiaire = get_object_or_404(Stagiaire, id=stagiaire_id)

                # Vérifier que le stagiaire est bien pré-renouvelé
                if getattr(stagiaire, 'statut_renouvellement', None) != "Pré-renouvelé":
                    return Response({
                        "success": False,
                        "message": "Seuls les stages pré-renouvelés peuvent être annulés."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Sauvegarder l'ancien statut
                ancien_statut = stagiaire.statut_renouvellement
                donnees_renouvellement = stagiaire.donnees_pre_renouvellement
                
                # Mettre à jour le stagiaire
                stagiaire.statut_renouvellement = None
                stagiaire.donnees_pre_renouvellement = None
                stagiaire.date_pre_renouvellement = None
                stagiaire.pre_renouvellement_en_cours = False  # ✅ AJOUTER CETTE LIGNE

                stagiaire.save(update_fields=[
                    'statut_renouvellement',
                    'donnees_renouvellement',
                    'date_pre_renouvellement',
                    'pre_renouvellement_en_cours'  
                ])

                # Nettoyer les conventions temporaires
                conventions_supprimees = self.nettoyer_conventions_temporaires(stagiaire)

                # 🔔 NOTIFICATION PUSH
                try:
                    NotificationService.notifier_annulation_pre_renouvellement(
                        stagiaire, 
                        request.user,
                        ancien_statut,
                    )
                except Exception as e:
                    logger.error(f"Erreur envoi notifications: {e}")

                # Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Annulation pré-renouvellement stagiaire {stagiaire.nom} {stagiaire.prenom}",
                    performed_by=request.user
                )

                logger.info(f"✅ Pré-renouvellement annulé pour stagiaire {stagiaire_id}")

                return Response({
                    "success": True,
                    "message": "Le pré-renouvellement a été annulé avec succès.",
                    "conventions_supprimees": conventions_supprimees,
                    "stagiaire": {
                        "id": stagiaire.id,
                        "nom": stagiaire.nom,
                        "prenom": stagiaire.prenom,
                        "ancien_statut": ancien_statut,
                        "nouveau_statut": stagiaire.statut_renouvellement,
                    }
                }, status=status.HTTP_200_OK)

        except Stagiaire.DoesNotExist:
            return Response({
                "success": False,
                "message": "Stagiaire non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur annulation pré-renouvellement {stagiaire_id}: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "message": f"Erreur lors de l'annulation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def nettoyer_conventions_temporaires(self, stagiaire):
        """Nettoie les conventions temporaires liées au stagiaire"""
        conventions_supprimees = 0
        try:
            # Récupérer toutes les conventions temporaires
            conventions_temp = ConventionStage.objects.filter(
                stagiaire_origine=stagiaire,
                est_temporaire=True
            )
            
            for convention in conventions_temp:
                if convention.fichier:
                    convention.fichier.delete(save=False)
                convention.delete()
                conventions_supprimees += 1
            
            # Effacer la référence
            if stagiaire.convention_renouvellement_temporaire:
                stagiaire.convention_renouvellement_temporaire = None
                stagiaire.save(update_fields=['convention_renouvellement_temporaire'])
            
            logger.info(f"✅ {conventions_supprimees} convention(s) temporaire(s) supprimée(s)")
            
        except Exception as e:
            logger.error(f"Erreur nettoyage conventions temporaires: {e}")
        
        return conventions_supprimees
    
@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class RegenererConventionRenouvellementAPIView(APIView):
    """Régénère la convention de renouvellement avec le signataire choisi"""
    permission_classes = [IsAuthenticated]

    SIGNATAIRES = {
        "DG": {
            "titre": "Le Directeur Général",
            "nom": "<b>Dr. Karimou CHABI SIKA</b>",
        },
        "DGA": {
            "titre": "Le Directeur Général Adjoint",
            "nom": "<b>M. Damipi NOUPOKOU</b>",
        },
    }

    def post(self, request, stagiaire_id):
        try:
            stagiaire = get_object_or_404(Stagiaire, id=stagiaire_id)

            if not getattr(stagiaire, 'pre_renouvellement_en_cours', False):
                return Response({
                    "success": False,
                    "message": "Aucun pré-renouvellement en cours pour ce stagiaire."
                }, status=status.HTTP_400_BAD_REQUEST)

            signataire_id = request.data.get("signataire", "DG")
            if signataire_id not in self.SIGNATAIRES:
                return Response({
                    "success": False,
                    "message": "Signataire invalide. Choisissez DG ou DGA."
                }, status=status.HTTP_400_BAD_REQUEST)

            convention = getattr(stagiaire, 'convention_renouvellement_temporaire', None)
            if not convention:
                return Response({
                    "success": False,
                    "message": "Aucune convention temporaire de renouvellement trouvée."
                }, status=status.HTTP_404_NOT_FOUND)

            donnees = getattr(stagiaire, 'donnees_pre_renouvellement', None)
            if not donnees:
                return Response({
                    "success": False,
                    "message": "Données de pré-renouvellement introuvables."
                }, status=status.HTTP_400_BAD_REQUEST)

            signataire_info = self.SIGNATAIRES[signataire_id]
            pdf_genere = self.regenerer_pdf(convention, stagiaire, donnees, signataire_info)

            if not pdf_genere:
                return Response({
                    "success": False,
                    "message": "Échec de la régénération du PDF."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            pdf_url = request.build_absolute_uri(convention.fichier.url)

            UserAction.objects.create(
                user=request.user,
                action=f"Régénération convention renouvellement ({signataire_id}) stagiaire {stagiaire.nom} {stagiaire.prenom}",
                performed_by=request.user
            )

            return Response({
                "success": True,
                "pdf_url": pdf_url,
                "signataire": signataire_id,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur régénération convention renouvellement: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def date_format_francais(self, date_str, with_le=True):
        """Formate une date DD/MM/YYYY en français"""
        try:
            date_obj = datetime.strptime(date_str, "%d/%m/%Y").date()
            mois_francais = {
                1: "janvier", 2: "février", 3: "mars", 4: "avril",
                5: "mai", 6: "juin", 7: "juillet", 8: "août",
                9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
            }
            jour = date_obj.day
            mois = date_obj.month
            annee = date_obj.year

            if jour == 1:
                result = f"1er {mois_francais[mois]} {annee}"
            else:
                result = f"{jour} {mois_francais[mois]} {annee}"

            return f"le {result}" if with_le else result
        except Exception:
            return "[DATE INVALIDE]"

    def normaliser_date(self, donnees, cle, cle_iso=None):
        """
        Récupère une date depuis donnees au format DD/MM/YYYY.
        Fallback sur le format ISO si la clé principale est absente/invalide.
        Retourne toujours une string DD/MM/YYYY ou None.
        """
        valeur = donnees.get(cle, "")
        if valeur:
            try:
                datetime.strptime(valeur, "%d/%m/%Y")
                return valeur
            except ValueError:
                # Peut-être au format ISO YYYY-MM-DD
                try:
                    d = datetime.strptime(valeur, "%Y-%m-%d").date()
                    return d.strftime("%d/%m/%Y")
                except ValueError:
                    pass

        # Fallback clé ISO
        if cle_iso:
            valeur_iso = donnees.get(cle_iso, "")
            if valeur_iso:
                try:
                    d = datetime.fromisoformat(valeur_iso).date()
                    return d.strftime("%d/%m/%Y")
                except (ValueError, TypeError):
                    pass

        return None

    def regenerer_pdf(self, convention, stagiaire, donnees, signataire_info):
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer, pagesize=A4,
                rightMargin=2*cm, leftMargin=2*cm,
                topMargin=2*cm, bottomMargin=2*cm
            )

            styles = getSampleStyleSheet()
            styles.add(ParagraphStyle(name="CenterTitle", fontSize=12, alignment=TA_CENTER, spaceAfter=20, leading=22))
            styles.add(ParagraphStyle(name="Justify", fontSize=12, alignment=TA_JUSTIFY, leading=18))
            styles.add(ParagraphStyle(name="Signature", fontSize=12, alignment=TA_RIGHT, spaceBefore=40))

            pre_view = PreRenouvelerStageAPIView()

            # ✅ Normalisation robuste des dates du nouveau stage
            date_debut_str = self.normaliser_date(donnees, "date_debut", "date_debut_iso")
            date_fin_str = self.normaliser_date(donnees, "date_fin", "date_fin_iso")

            if not date_debut_str or not date_fin_str:
                logger.error(f"Dates manquantes dans donnees: {donnees}")
                return False

            duree_mois = pre_view.calculer_duree_mois(date_debut_str, date_fin_str)
            duree_formatee = pre_view.duree_en_lettres_et_chiffres(duree_mois)

            # ✅ with_le=False pour éviter "du le X" et "au le Y"
            date_debut_format = self.date_format_francais(date_debut_str, with_le=False)
            date_fin_format = self.date_format_francais(date_fin_str, with_le=False)

            # ✅ Dates du stage précédent depuis l'objet stagiaire (objets date Python)
            date_debut_precedent = self.date_format_francais(
                stagiaire.date_debut.strftime("%d/%m/%Y"), with_le=False
            )
            date_fin_precedent = self.date_format_francais(
                stagiaire.date_fin.strftime("%d/%m/%Y"), with_le=False
            )

            descriptions_directions = {
                "DARH": "Direction des Affaires et Ressources Humaines",
                "DCGIS": "Direction du Centre de Gestion de l'Information et des Statistiques",
                "DEPP": "Direction des Études, Planification et Projets",
                "DT": "Direction Technique",
                "DM": "Direction des Marchés",
                "DFC": "Direction Financière et Comptable",
                "DG": "Direction Générale",
            }
            direction_code = donnees.get("direction", "")
            direction_description = descriptions_directions.get(direction_code, direction_code)

            elements = []
            elements.append(Spacer(1, 6*cm))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("<b><u>AUTORISATION DE RENOUVELLEMENT DE STAGE</u></b>", styles["CenterTitle"]))
            elements.append(Spacer(1, 20))

            texte_autorisation = (
                f"Dans le cadre du renouvellement de son stage à la CEB, "
                f"Monsieur <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> est autorisé à effectuer un nouveau stage "
                f"pour une durée de <b>{duree_formatee}</b> mois allant du <b>{date_debut_format}</b> "
                f"au <b>{date_fin_format}</b>."
            )
            elements.append(Paragraph(texte_autorisation, styles["Justify"]))
            elements.append(Spacer(1, 12))

            texte_affectation = (
                f"L'intéressé est mis à la disposition de la Direction <b>{direction_code} ({direction_description})</b>, "
                f"Service <b>{donnees.get('service', '')}</b>."
            )
            elements.append(Paragraph(texte_affectation, styles["Justify"]))
            elements.append(Spacer(1, 12))

            texte_precedent = (
                f"Ce renouvellement fait suite au stage précédent effectué du "
                f"<b>{date_debut_precedent}</b> au <b>{date_fin_precedent}</b>."
            )
            elements.append(Paragraph(texte_precedent, styles["Justify"]))
            elements.append(Spacer(1, 12))

            if donnees.get("remunere", False):
                montant = donnees.get("montant", 0)
                montant_formate = f"{montant:,}".replace(",", " ")
                texte_remuneration = (
                    f"Conformément à la décision Nº236/CEB/DG/DARH/SAA/SASR/2020 portant Révision des indemnités "
                    f"forfaitaires de Stage en date du 3 septembre 2020, Monsieur <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> "
                    f"bénéficie au cours de son stage d'une indemnité forfaitaire mensuelle nette de "
                    f"<b>{montant_formate} FRANCS CFA</b>."
                )
                elements.append(Paragraph(texte_remuneration, styles["Justify"]))

            elements.append(Spacer(1, 40))

            # ✅ Signataire dynamique
            elements.append(Spacer(1, 40))
            elements.append(Paragraph(signataire_info["titre"], styles["Signature"]))
            elements.append(Spacer(1, 40))
            elements.append(Paragraph(signataire_info["nom"], styles["Signature"]))

            doc.build(elements)
            pdf_content = buffer.getvalue()
            buffer.close()

            nom_fichier = f"renouvellement_{stagiaire.nom}_{stagiaire.prenom}_{int(time.time())}.pdf"
            convention.fichier.save(nom_fichier, ContentFile(pdf_content), save=True)
            return True

        except Exception as e:
            logger.error(f"Erreur régénération PDF renouvellement: {str(e)}", exc_info=True)
            import traceback
            traceback.print_exc()
            return False
