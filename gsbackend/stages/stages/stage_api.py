
import logging
from datetime import datetime 
import pytesseract
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
    Stagiaire,RapportStage,UserAction ,Demande, ConventionStage
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



@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class GenererAttestationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, stagiaire_id):
        stagiaire = get_object_or_404(Stagiaire, pk=stagiaire_id)

        try:
            # Vérifier que le stagiaire peut générer une attestation
            if not self.peut_generer_attestation(stagiaire):
                return Response(
                    {"detail": "Impossible de générer l'attestation. Vérifiez les dates de stage."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 🔹 Enregistrer l'action dans l'historique
            UserAction.objects.create(
                user=request.user,
                action=f"Attestation générée pour {stagiaire.prenom} {stagiaire.nom}",
                performed_by=request.user
            )

            # 🔔 NOTIFICATION PUSH AVEC NOTIFICATIONSERVICE
            self.notifier_generation_attestation(stagiaire, request.user)

            # Prépare la réponse HTTP
            response = HttpResponse(content_type="application/pdf")
            filename = f"attestation_stage_{stagiaire.nom}_{stagiaire.prenom}.pdf"
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            # Création du document
            doc = SimpleDocTemplate(
                response,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            elements = []

            # Styles personnalisés
            styles = self.creer_styles_personnalises()

            # --- ESPACE pour l'en-tête pré-imprimé ---
            elements.append(Spacer(1, 6*cm))
            elements.append(Spacer(1, 20))

            # --- Titre (gras, souligné, plus grand) ---
            elements.append(Paragraph("<b><u>ATTESTATION DE STAGE</u></b>", styles["CenterTitle"]))
            elements.append(Spacer(1, 20))

            # --- Texte principal ---
            elements.extend(self.creer_texte_attestation(stagiaire, styles))

            # --- Signature ---
            elements.extend(self.creer_section_signature(styles))

            # --- Pied de page avec référence ---
            elements.extend(self.creer_pied_de_page(stagiaire, styles))

            # Générer le PDF
            doc.build(elements)

            # 📧 ENVOI D'EMAIL DE CONFIRMATION (optionnel)
            if request.GET.get('envoyer_email', False):
                self.envoyer_email_attestation(stagiaire, request.user)

            return response

        except Exception as e:
            logger.error(f"Erreur génération attestation stagiaire {stagiaire_id}: {e}")
            return Response(
                {"detail": "Erreur lors de la génération de l'attestation."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def peut_generer_attestation(self, stagiaire):
        """Vérifier si une attestation peut être générée pour le stagiaire"""
        if not stagiaire.date_debut or not stagiaire.date_fin:
            return False
        
        if stagiaire.date_fin > timezone.now().date():
            return False  # Le stage n'est pas encore terminé
        
        return True

    def creer_styles_personnalises(self):
        """Créer les styles personnalisés pour le PDF"""
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name="Ref", 
            fontSize=10, 
            alignment=TA_LEFT, 
            leading=14, 
            spaceAfter=12
        ))
        styles.add(ParagraphStyle(
            name="CenterTitle", 
            fontSize=18, 
            alignment=TA_CENTER, 
            spaceAfter=20, 
            leading=22
        ))
        styles.add(ParagraphStyle(
            name="Justify", 
            fontSize=12, 
            alignment=TA_JUSTIFY, 
            leading=18
        ))
        styles.add(ParagraphStyle(
            name="Signature", 
            fontSize=12, 
            alignment=TA_RIGHT, 
            spaceBefore=40
        ))
        styles.add(ParagraphStyle(
            name="Footer", 
            fontSize=9, 
            alignment=TA_CENTER, 
            textColor=colors.gray,
            spaceBefore=20
        ))
        return styles

    def creer_texte_attestation(self, stagiaire, styles):
        """Créer le texte principal de l'attestation"""
        elements = []

        # Calcul de la durée du stage
        duree_mois = self.calculer_duree_stage(stagiaire)
        
        texte_intro = (
            f"Nous soussignés, attestons par la présente que <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b>, "
            f"dans le cadre de son perfectionnement en <b>{stagiaire.specialite or '________________'}</b>, "
            f"a effectué un stage de <b>{duree_mois} mois</b>, "
            f"du <b>{stagiaire.date_debut.strftime('%d/%m/%Y')}</b> au <b>{stagiaire.date_fin.strftime('%d/%m/%Y')}</b> "
            f"au sein de la <b>{stagiaire.direction or '________________'}</b>."
        )
        elements.append(Paragraph(texte_intro, styles["Justify"]))
        elements.append(Spacer(1, 12))

        texte_eval = (
            f"Au cours de son stage effectué avec assiduité, "
            f"<b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> s'est montré dévoué "
            f"et a attaché un grand intérêt au travail bien fait."
        )
        elements.append(Paragraph(texte_eval, styles["Justify"]))
        elements.append(Spacer(1, 12))

        texte_fin = (
            "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit."
        )
        elements.append(Paragraph(texte_fin, styles["Justify"]))
        elements.append(Spacer(1, 40))

        return elements

    def creer_section_signature(self, styles):
        """Créer la section de signature"""
        elements = []
        elements.append(Paragraph("Le Directeur Général", styles["Signature"]))
        elements.append(Spacer(1, 40))
        elements.append(Paragraph("<b><u>Karimou CHABI SIKA</u></b>", styles["Signature"]))
        return elements

    def creer_pied_de_page(self, stagiaire, styles):
        """Créer le pied de page avec référence"""
        elements = []
        elements.append(Spacer(1, 60))
        reference = f"Réf : {stagiaire.id}/ATT/{timezone.now().strftime('%Y')}"
        elements.append(Paragraph(reference, styles["Footer"]))
        elements.append(Paragraph("Communauté Électrique du Bénin - Siège Social: Cotonou", styles["Footer"]))
        elements.append(Paragraph(f"Généré le {timezone.now().strftime('%d/%m/%Y à %H:%M')}", styles["Footer"]))
        return elements

    def calculer_duree_stage(self, stagiaire):
        """Calculer la durée du stage en mois"""
        if not stagiaire.date_debut or not stagiaire.date_fin:
            return "____"
        
        delta = stagiaire.date_fin - stagiaire.date_debut
        mois = delta.days // 30
        return f"{mois:02d}" if mois > 0 else "____"

    def notifier_generation_attestation(self, stagiaire, utilisateur):
        """Notifier la génération d'attestation via NotificationService"""
        try:
            NotificationService.notifier_generation_attestation(
                stagiaire=stagiaire,
                utilisateur=utilisateur
            )
            
            logger.info(f"✅ Notification génération attestation pour {stagiaire.prenom} {stagiaire.nom}")
            
        except Exception as e:
            logger.error(f"❌ Erreur notification génération attestation: {e}")

    def envoyer_email_attestation(self, stagiaire, utilisateur):
        """Envoyer un email avec l'attestation en pièce jointe"""
        try:
            # Cette méthode pourrait générer le PDF et l'envoyer par email
            # Pour l'instant, on se contente de logger l'action
            logger.info(f"📧 Email attestation demandé pour {stagiaire.prenom} {stagiaire.nom}")
            
        except Exception as e:
            logger.error(f"❌ Erreur envoi email attestation: {e}")



logger = logging.getLogger(__name__)

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='POST')], name='dispatch')
class RenouvelerStageAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        """Renouvelle un stage terminé en créant un NOUVEAU stage, l'ancien reste en base avec statut 'Terminé'"""
        try:
            with transaction.atomic():
                # 🔹 Récupérer le stagiaire dont le stage est terminé
                ancien_stage = get_object_or_404(Stagiaire, id=stagiaire_id)

                # 🔹 Vérifier que le stage est bien terminé (plus flexible)
                if ancien_stage.statut != "Terminé":
                    return Response({
                        "success": False,
                        "message": f"Le stage doit être terminé pour être renouvelé. Statut actuel: {ancien_stage.statut}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Vérification des permissions
                if not self.has_renouveler_permission(request.user, ancien_stage):
                    return Response({
                        "success": False,
                        "message": "Vous n'avez pas la permission de renouveler ce stage."
                    }, status=status.HTTP_403_FORBIDDEN)

                # 🔹 VÉRIFICATION : Le stage a-t-il déjà été renouvelé ?
                if ancien_stage.a_ete_renouvele:
                    return Response({
                        "success": False,
                        "message": "Ce stage a déjà été renouvelé. Un stage ne peut être renouvelé qu'une seule fois.",
                        "stage_renouvele_id": ancien_stage.stage_renouvele_id
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Données reçues pour le NOUVEAU stage
                data = request.data
                type_stage = data.get("type_stage", ancien_stage.type_stage)
                lieu = data.get("lieu", ancien_stage.lieu_stage)
                direction = data.get("direction", ancien_stage.direction)
                service = data.get("service", ancien_stage.service)
                tuteur = data.get("tuteur", ancien_stage.superviseur)
                date_debut_str = data.get("date_debut")
                date_fin_str = data.get("date_fin")
                remunere = data.get("remunere", ancien_stage.remunere)
                montant_str = data.get("montant", ancien_stage.montant_remuneration)

                # 🔹 Vérification des champs obligatoires
                validation_result = self.valider_champs_obligatoires(data)
                if not validation_result["success"]:
                    return Response(validation_result, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Parsing et validation des dates
                validation_dates = self.valider_dates(date_debut_str, date_fin_str, ancien_stage.date_fin)
                if not validation_dates["success"]:
                    return Response(validation_dates, status=status.HTTP_400_BAD_REQUEST)

                date_debut = validation_dates["date_debut"]
                date_fin = validation_dates["date_fin"]

                # 🔹 Gestion du montant
                validation_montant = self.valider_montant(remunere, montant_str)
                if not validation_montant["success"]:
                    return Response(validation_montant, status=status.HTTP_400_BAD_REQUEST)

                montant_final = validation_montant["montant"]

                # 🔹 Déterminer le statut initial du NOUVEAU stage
                today = timezone.now().date()
                statut = self.determiner_statut_stage(today, date_debut, date_fin)
                nouveau_stage = Stagiaire.objects.create(
                    demande=ancien_stage.demande,
                    
                    # 👤 Informations personnelles (copiées)
                    photo_passeport=ancien_stage.photo_passeport,
                    nom=ancien_stage.nom,
                    prenom=ancien_stage.prenom,
                    email=ancien_stage.email,
                    telephone=ancien_stage.telephone,
                    niveau_etude=ancien_stage.niveau_etude,
                    specialite=ancien_stage.specialite,
                    genre=ancien_stage.genre,
                    etablissement=ancien_stage.etablissement,
                    
                    # 🏢 Informations du stage (peuvent être modifiées)
                    type_stage=type_stage,
                    lieu_stage=lieu,
                    direction=direction,
                    service=service,
                    superviseur=tuteur,
                    date_accord=today,
                    date_debut=date_debut,
                    date_fin=date_fin,
                    remunere=remunere,
                    montant_remuneration=montant_final,
                    statut=statut,
                    
                    # 📄 Documents (référence aux mêmes fichiers)
                    cv=ancien_stage.cv,
                    lettre_motivation=ancien_stage.lettre_motivation,
                    diplome=ancien_stage.diplome,
                    resume_cv=ancien_stage.resume_cv,
                    
                    # 🔗 Relations de renouvellement
                    a_ete_renouvele=False,  # Ce nouveau stage n'est PAS un renouvellement
                    stage_renouvele_id=None,
                    identifiant_groupe=ancien_stage.identifiant_groupe,  # Même groupe pour lier
                    
                    # 📌 Champ pour indiquer que c'est un renouvellement
                    # (Vous pouvez ajouter ce champ au modèle si besoin)
                    # est_renouvellement=True
                )

                # 🔹 Création de la convention pour le NOUVEAU stage
                convention = ConventionStage.objects.create(stagiaire=nouveau_stage)
                pdf_genere = self.generer_et_sauvegarder_pdf_renouvellement(convention, ancien_stage)

                # 🔹 IMPORTANT : Marquer l'ancien stage comme ayant été renouvelé
                ancien_stage.a_ete_renouvele = True
                ancien_stage.stage_renouvele_id = nouveau_stage.id
                
                # 🔽 FORCER le statut "Terminé" et éviter le recalcul
                ancien_stage.statut = "Terminé"
                
                # Utiliser update() pour éviter d'appeler save() et son recalcul automatique
                Stagiaire.objects.filter(id=ancien_stage.id).update(
                    a_ete_renouvele=True,
                    stage_renouvele_id=nouveau_stage.id,
                    statut="Terminé"
                )
                
                # Recharger l'objet depuis la base
                ancien_stage.refresh_from_db()

                # 🔹 Enregistrer l'action dans l'historique
                UserAction.objects.create(
                    user=request.user,
                    action=f"Renouvellement du stage pour {nouveau_stage.prenom} {nouveau_stage.nom} (Ancien: {ancien_stage.id}, Nouveau: {nouveau_stage.id}) - Convention #{convention.numero_convention}",
                    performed_by=request.user
                )

                # ✅ ENVOI EMAIL
                try:
                    email_data = StageEmailTemplates.renouvellement_stage(ancien_stage, nouveau_stage)
                    email_envoye = EmailSenderService.send_email(
                        to_email=nouveau_stage.email,
                        subject=email_data['subject'],
                        html_content=email_data['html'],
                        text_content=email_data['text'],
                        async_send=True
                    )
                    logger.info(f"✅ Email renouvellement envoyé à {nouveau_stage.email}: {email_envoye}")
                except Exception as e:
                    logger.error(f"❌ Erreur envoi email renouvellement: {e}")
                    email_envoye = False

                # 🔔 NOTIFICATION PUSH
                try:
                    NotificationService.notifier_renouvellement_stage(
                        ancien_stage=ancien_stage,
                        nouveau_stage=nouveau_stage,
                        utilisateur=request.user
                    )
                    logger.info(f"✅ Notification renouvellement pour {nouveau_stage.prenom} {nouveau_stage.nom}")
                except Exception as e:
                    logger.error(f"❌ Erreur notification renouvellement: {e}")

                # 📢 DIFFUSION AUX ADMINISTRATEURS
                try:
                    NotificationService.broadcast_renouvellement_stage(
                        ancien_stage=ancien_stage,
                        nouveau_stage=nouveau_stage,
                        utilisateur_courant=request.user
                    )
                    logger.info(f"✅ Broadcast renouvellement effectué")
                except Exception as e:
                    logger.error(f"❌ Erreur broadcast renouvellement: {e}")

                # 🔹 Réponse complétée
                response_data = {
                    "success": True,
                    "message": "Stage renouvelé avec succès : un nouveau stage a été créé dans le même dossier et l'ancien stage reste en base avec statut 'Terminé'.",
                    "email_envoye": email_envoye,
                    "pdf_genere": pdf_genere,
                    "nouveau_stage": {
                        "id": nouveau_stage.id,
                        "nom": nouveau_stage.nom,
                        "prenom": nouveau_stage.prenom,
                        "type_stage": nouveau_stage.type_stage,
                        "statut": nouveau_stage.statut,
                        "date_debut": nouveau_stage.date_debut.strftime('%d/%m/%Y'),
                        "date_fin": nouveau_stage.date_fin.strftime('%d/%m/%Y'),
                        "duree_jours": (nouveau_stage.date_fin - nouveau_stage.date_debut).days,
                        "remunere": nouveau_stage.remunere,
                        "montant_remuneration": nouveau_stage.montant_remuneration,
                        "service": nouveau_stage.service,
                        "direction": nouveau_stage.direction,
                        "demande_id": nouveau_stage.demande.id if nouveau_stage.demande else None,
                        "est_renouvellement": True,  # C'est bien un renouvellement
                        "identifiant_groupe": str(nouveau_stage.identifiant_groupe)
                    },
                    "ancien_stage": {
                        "id": ancien_stage.id,
                        "nom": ancien_stage.nom,
                        "prenom": ancien_stage.prenom,
                        "type_stage": ancien_stage.type_stage,
                        "statut": ancien_stage.statut,  # Toujours "Terminé"
                        "a_ete_renouvele": ancien_stage.a_ete_renouvele,  # Maintenant True
                        "stage_renouvele_id": ancien_stage.stage_renouvele_id,  # ID du nouveau stage
                        "date_debut": ancien_stage.date_debut.strftime('%d/%m/%Y') if ancien_stage.date_debut else None,
                        "date_fin": ancien_stage.date_fin.strftime('%d/%m/%Y') if ancien_stage.date_fin else None,
                        "service": ancien_stage.service,
                        "direction": ancien_stage.direction,
                        "demande_id": ancien_stage.demande.id if ancien_stage.demande else None,
                        "identifiant_groupe": str(ancien_stage.identifiant_groupe)
                    },
                    "convention": {
                        "id": convention.id,
                        "numero_convention": convention.numero_convention,
                        "fichier_url": convention.fichier.url if convention.fichier else None,
                        "date_creation": convention.date_creation.strftime('%d/%m/%Y')
                    },
                    "date_renouvellement": today.strftime('%d/%m/%Y %H:%M:%S'),
                    "info": {
                        "ancien_stage_conserve": True,
                        "nouveau_stage_cree": True,
                        "relation": "Les deux stages partagent la même demande et le même identifiant_groupe",
                        "logique": "Renouvellement = Extension du même dossier administratif"
                    }
                }

                # 📊 Logs de débogage détaillés
                logger.info(f"✅ Stage {stagiaire_id} renouvelé avec succès par {request.user.email}")
                logger.info(f"📊 Ancien stage {ancien_stage.id}:")
                logger.info(f"   - statut: {ancien_stage.statut}")
                logger.info(f"   - a_ete_renouvele: {ancien_stage.a_ete_renouvele}")
                logger.info(f"   - stage_renouvele_id: {ancien_stage.stage_renouvele_id}")
                logger.info(f"   - demande_id: {ancien_stage.demande.id if ancien_stage.demande else 'None'}")
                logger.info(f"📊 Nouveau stage {nouveau_stage.id}:")
                logger.info(f"   - statut: {nouveau_stage.statut}")
                logger.info(f"   - a_ete_renouvele: {nouveau_stage.a_ete_renouvele}")
                logger.info(f"   - demande_id: {nouveau_stage.demande.id if nouveau_stage.demande else 'None'}")
                logger.info(f"   - identifiant_groupe: {nouveau_stage.identifiant_groupe}")
                
                return Response(response_data, status=status.HTTP_201_CREATED)

        except Stagiaire.DoesNotExist:
            logger.warning(f"Tentative de renouvellement stage inexistant: {stagiaire_id}")
            return Response({
                "success": False,
                "message": "Stage non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Erreur renouvellement stage {stagiaire_id}: {str(e)}")
            logger.error(f"Traceback complet:", exc_info=True)
            return Response({
                "success": False,
                "message": f"Erreur lors du renouvellement du stage: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 🔽 MÉTHODES AUXILIAIRES (restent inchangées)
    
    def determiner_statut_stage(self, today, date_debut, date_fin):
        """Détermine le statut initial du stage"""
        if today < date_debut:
            return "À venir"
        elif date_debut <= today <= date_fin:
            return "Actuel"
        else:
            return "Terminé"

    def valider_champs_obligatoires(self, data):
        """Valider les champs obligatoires"""
        missing_fields = []
        empty_fields = []

        required_fields = {
            "type_stage": data.get("type_stage"),
            "lieu": data.get("lieu"),
            "direction": data.get("direction"),
            "service": data.get("service"),
            "date_debut": data.get("date_debut"),
            "date_fin": data.get("date_fin"),
        }

        for field_name, value in required_fields.items():
            if value is None:
                missing_fields.append(field_name)
            elif str(value).strip() == "":
                empty_fields.append(field_name)

        if missing_fields:
            return {
                "success": False,
                "message": f"Champs manquants : {', '.join(missing_fields)}"
            }

        if empty_fields:
            return {
                "success": False,
                "message": f"Champs vides : {', '.join(empty_fields)}"
            }

        return {"success": True}

    def valider_dates(self, date_debut_str, date_fin_str, date_fin_ancien_stage=None):
        """Valider et parser les dates"""
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

        if date_debut >= date_fin:
            return {
                "success": False,
                "message": "La date de début doit être avant la date de fin."
            }

        today = timezone.now().date()
        if date_debut < today:
            return {
                "success": False,
                "message": "La date de début ne peut pas être dans le passé."
            }

        # Vérification spécifique au renouvellement
        if date_fin_ancien_stage and date_debut <= date_fin_ancien_stage:
            return {
                "success": False,
                "message": f"La date de début du renouvellement doit être après la fin du stage précédent ({date_fin_ancien_stage.strftime('%d/%m/%Y')})."
            }

        # Vérification de la durée max (2 ans)
        duree_jours = (date_fin - date_debut).days
        if duree_jours > 730:  # 2 ans
            return {
                "success": False,
                "message": "La durée du stage ne peut pas dépasser 2 ans."
            }

        return {
            "success": True,
            "date_debut": date_debut,
            "date_fin": date_fin,
            "duree_jours": duree_jours
        }

    def valider_montant(self, remunere, montant_str):
        """Valider le montant de rémunération"""
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
                if montant_final > 1000000:
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

    def generer_et_sauvegarder_pdf_renouvellement(self, convention, ancien_stage):
        """Génère et sauvegarde le PDF de l'autorisation de renouvellement"""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
            from reportlab.lib import colors
            from io import BytesIO
            from django.core.files.base import ContentFile
            import datetime
            
            stagiaire = convention.stagiaire
            buffer = BytesIO()
            
            # Configuration identique à l'attestation
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=2*cm,
                leftMargin=2*cm,
                topMargin=2*cm,
                bottomMargin=2*cm
            )
            
            elements = []
            
            # Styles personnalisés - MÊME QUE L'ATTESTATION
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
                fontSize=12, 
                alignment=TA_CENTER, 
                spaceAfter=20, 
                leading=22
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
            styles.add(ParagraphStyle(
                name="Copies", 
                fontSize=6, 
                alignment=TA_LEFT, 
                spaceBefore=20,
                leading=16
            ))
            
            # --- ESPACE pour l'en-tête pré-imprimé ---
            # Exactement comme dans l'attestation
            elements.append(Spacer(1, 6*cm))
            elements.append(Spacer(1, 20))
            
            # --- Titre (gras, souligné, plus grand) ---
            # IDENTIQUE au format de l'attestation
            elements.append(Paragraph("<b><u>AUTORISATION DE STAGE</u></b>", styles["CenterTitle"]))
            elements.append(Spacer(1, 20))
            
            # --- Calcul de la durée du stage ---
            duree_mois = self.calculer_duree_mois(stagiaire)
            
            # --- Formater les dates et la durée ---
            date_debut_format = self.date_format_francais(stagiaire.date_debut)
            date_fin_format = self.date_format_francais(stagiaire.date_fin)
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
            direction_code = stagiaire.direction
            direction_description = descriptions_directions.get(direction_code, direction_code)
            
            # --- Texte principal - EXACTEMENT le format fourni ---
            # Première partie : Autorisation (JUSTIFIÉ)
            texte_autorisation = (
                f"Monsieur <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> est autorisé à effectuer un stage à la CEB "
                f"pour une durée de <b>{duree_formatee}</b> mois allant du <b>{date_debut_format}</b> "
                f"au <b>{date_fin_format}</b>."
            )
            elements.append(Paragraph(texte_autorisation, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            # --- DEUXIÈME PARTIE MODIFIÉE : Affectation avec description entre parenthèses ---
            texte_affectation = (
                f"L'intéressé est mis à la disposition de la Direction <b>{direction_code} ({direction_description})</b>, "
                f"Service <b>{stagiaire.service}</b>."
            )
            elements.append(Paragraph(texte_affectation, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            # Troisième partie : Rémunération (conditionnelle) - EXACTEMENT comme fourni (JUSTIFIÉ)
            texte_remuneration = ""  # Initialiser la variable
            if stagiaire.remunere:
                texte_remuneration = (
                    f"Conformément à la décision Nº236/CEB/DG/DARH/SAA/SASR/2020 portant Révision des indemnités "
                    f"forfaitaires de Stage en date du 3 septembre 2020, Monsieur <b>{stagiaire.nom.upper()} {stagiaire.prenom}</b> "
                    f"bénéficie au cours de son stage d'une indemnité forfaitaire mensuelle nette de "
                    f"<b>QUATRE-VINGT MILLE (80.000) FRANCS CFA</b>."
                )
            
            elements.append(Paragraph(texte_remuneration, styles["Justify"]))
            elements.append(Spacer(1, 40))
            
            # --- Signature - EXACTEMENT comme fourni ---
            # Espacement
            elements.append(Spacer(1, 40))
            
            # Signature alignée à droite
            elements.append(Paragraph("Le Directeur Général", styles["Signature"]))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("<b>Dr. Karimou CHABI SIKA</b>", styles["Signature"]))
            
            # --- Copies - EXACTEMENT comme fourni ---
            # elements.append(Spacer(1, 40))
            # elements.append(Paragraph("<b>Copies</b>", styles["Copies"]))
            # elements.append(Spacer(1, 10))
            
            # Liste des copies
            # copies = [
            #     "DARH",
            #     "DCGIS/SIS", 
            #     "SRHAS/SRFGE",
            #     "SAA/SASR/ARCHIVES"
            # ]
            
            # for copie in copies:
            #     elements.append(Paragraph(f"• {copie}", styles["Copies"]))
            
            # --- Pied de page avec référence ---
            # IDENTIQUE au format de l'attestation
            elements.append(Spacer(1, 60))
            
            # Générer le PDF
            doc.build(elements)
            
            # Sauvegarde du fichier
            pdf_content = buffer.getvalue()
            buffer.close()
            
            nom_fichier = f"autorisation_stage_{stagiaire.nom}_{stagiaire.prenom}_{convention.numero_convention}.pdf"
            convention.fichier.save(nom_fichier, ContentFile(pdf_content), save=True)
            
            logger.info(f"Autorisation de stage PDF générée: {nom_fichier}")
            return True
        
        except Exception as e:
            logger.error(f"Erreur génération PDF autorisation: {str(e)}")
            return False

    def calculer_duree_mois(self, stagiaire):
        """Calculer la durée du stage en mois"""
        if not stagiaire.date_debut or not stagiaire.date_fin:
            return 0
        
        delta = stagiaire.date_fin - stagiaire.date_debut
        mois = delta.days // 30
        
        if delta.days % 30 > 15:
            mois += 1
        
        return max(1, mois)

    def date_format_francais(self, date_obj):
        """Formater une date en français avec le mois en lettres"""
        if not date_obj:
            return ""
        
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

    def nombre_en_lettres_simple(self, n):
        """Convertir un nombre en lettres"""
        nombres = {
            1: "un", 2: "deux", 3: "trois", 4: "quatre", 5: "cinq",
            6: "six", 7: "sept", 8: "huit", 9: "neuf", 10: "dix",
            11: "onze", 12: "douze", 13: "treize", 14: "quatorze", 15: "quinze",
            16: "seize", 17: "dix-sept", 18: "dix-huit", 19: "dix-neuf",
            20: "vingt", 21: "vingt-et-un", 22: "vingt-deux", 23: "vingt-trois",
            24: "vingt-quatre", 25: "vingt-cinq", 26: "vingt-six", 27: "vingt-sept",
            28: "vingt-huit", 29: "vingt-neuf", 30: "trente"
        }
        
        return nombres.get(n, str(n))

    def duree_en_lettres_et_chiffres(self, duree_mois):
        """Convertir la durée en lettres et en chiffres"""
        if not duree_mois or duree_mois <= 0:
            return "____"
        
        duree_lettres = self.nombre_en_lettres_simple(duree_mois)
        duree_chiffres = f"{duree_mois:02d}"
        
        return f"{duree_lettres.capitalize()}({duree_chiffres})"

    def has_renouveler_permission(self, user, stage):
        """Vérifie si l'utilisateur peut renouveler le stage"""
        return user.is_authenticated and user.has_perm('stages.add_stagiaire')

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
                Stagiaire.objects.select_related('etablissement', 'demande'),
                pk=stagiaire_id
            )

            # Vérification des permissions d'accès
            if not self.has_stagiaire_access(request.user, stagiaire):
                logger.warning(
                    f"Tentative d'accès non autorisé au stagiaire {stagiaire_id} "
                    f"par l'utilisateur {request.user.email}"
                )
                return Response(
                    {"detail": "Accès non autorisé à ce stagiaire."},
                    status=status.HTTP_403_FORBIDDEN
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

            # Vérification des permissions de modification
            if not self.has_stagiaire_edit_permission(request.user, stagiaire):
                logger.warning(
                    f"Tentative de modification non autorisée du stagiaire {stagiaire_id} "
                    f"par l'utilisateur {request.user.email}"
                )
                return Response(
                    {"detail": "Permission de modification refusée."},
                    status=status.HTTP_403_FORBIDDEN
                )

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

        # Récupération de la convention temporaire de renouvellement
        convention_renouvellement_temporaire = None
        try:
            # Vérifier si le stagiaire a une convention temporaire liée
            # Option 1: Via le champ convention_renouvellement_temporaire (OneToOneField)
            if hasattr(stagiaire, 'convention_renouvellement_temporaire'):
                conv_temp = stagiaire.convention_renouvellement_temporaire
                if conv_temp and conv_temp.est_temporaire:
                    convention_renouvellement_temporaire = {
                        "id": conv_temp.id,
                        "numero_convention": conv_temp.numero_convention,
                        "fichier_url": build_secure_url(conv_temp.fichier),
                        "date_creation": conv_temp.date_creation.isoformat() if conv_temp.date_creation else None,
                        "est_temporaire": True
                    }
            
            # Option 2: Rechercher par convention avec est_temporaire=True
            if not convention_renouvellement_temporaire and hasattr(stagiaire, 'conventionstage'):
                try:
                    # Chercher une convention temporaire liée à ce stagiaire
                    conv_temp = ConventionStage.objects.filter(
                        stagiaire=stagiaire,
                        est_temporaire=True
                    ).first()
                    
                    if conv_temp:
                        convention_renouvellement_temporaire = {
                            "id": conv_temp.id,
                            "numero_convention": conv_temp.numero_convention,
                            "fichier_url": build_secure_url(conv_temp.fichier),
                            "date_creation": conv_temp.date_creation.isoformat() if conv_temp.date_creation else None,
                            "est_temporaire": True
                        }
                except Exception as e:
                    logger.warning(f"Erreur récupération convention temporaire: {e}")
                    
        except Exception as e:
            logger.error(f"Erreur traitement convention temporaire: {e}")

        # Récupération de la convention permanente (si elle existe)
        convention_permanente = None
        try:
            if hasattr(stagiaire, 'conventionstage'):
                # Chercher la convention principale (non temporaire)
                convention_principale = ConventionStage.objects.filter(
                    stagiaire=stagiaire,
                    est_temporaire=False
                ).first()
                
                if convention_principale:
                    convention_permanente = {
                        "id": convention_principale.id,
                        "numero_convention": convention_principale.numero_convention,
                        "fichier_url": build_secure_url(convention_principale.fichier),
                        "date_creation": convention_principale.date_creation.isoformat() if convention_principale.date_creation else None,
                        "est_temporaire": False
                    }
        except Exception as e:
            logger.error(f"Erreur récupération convention permanente: {e}")

        return {
            "id": stagiaire.id,
            "nom": stagiaire.nom,
            "prenom": stagiaire.prenom,
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
            },
            "superviseur": stagiaire.superviseur,
            "photo_passeport": build_secure_url(stagiaire.photo_passeport),
            "documents": documents,
            "a_ete_renouvele": stagiaire.a_ete_renouvele,
            "stage_renouvele_id": stagiaire.stage_renouvele_id,
            
            # AJOUTEZ CES CHAMPS :
            "convention": convention_permanente,
            "convention_renouvellement_temporaire": convention_renouvellement_temporaire,
            
            # Information supplémentaire pour le frontend
            "est_en_renouvellement": convention_renouvellement_temporaire is not None,
            "date_pre_renouvellement": stagiaire.date_pre_renouvellement.isoformat() if hasattr(stagiaire, 'date_pre_renouvellement') and stagiaire.date_pre_renouvellement else None,
            "donnees_pre_renouvellement": stagiaire.donnees_pre_renouvellement if hasattr(stagiaire, 'donnees_pre_renouvellement') else None,
        }

    def has_stagiaire_access(self, user, stagiaire):
        """Vérifie si l'utilisateur a accès à ce stagiaire"""
        # Implémentez votre logique de permissions ici
        # Exemple basique :
        return user.is_authenticated and (
            user.is_staff or 
            user.has_perm('stages.view_stagiaire') or
            self.is_user_related_to_stagiaire(user, stagiaire)
        )

    def has_stagiaire_edit_permission(self, user, stagiaire):
        """Vérifie si l'utilisateur peut modifier ce stagiaire"""
        # Implémentez votre logique de permissions ici
        return user.is_authenticated and (
            user.is_staff or 
            user.has_perm('stages.change_stagiaire')
        )

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
class AjouterRapportAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, tracking_id=None):
        if not tracking_id:
            tracking_id = request.data.get('tracking_id')
        
        if not tracking_id:
            return Response({
                "success": False,
                "message": "Tracking ID manquant."
            }, status=status.HTTP_400_BAD_REQUEST)

        tracking_id = tracking_id.strip().upper()
        
        try:
            # Récupérer la demande
            demande = Demande.objects.get(tracking_id=tracking_id)
            
            # Vérifier si la demande a un stagiaire associé
            if not hasattr(demande, 'stagiaire'):
                return Response({
                    "success": False,
                    "message": "Aucun stage associé à cette demande."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            stagiaire = demande.stagiaire
            
            # Vérifier si le stage est en cours ou terminé
            if stagiaire.statut_actuel not in ["Actuel", "Terminé"]:
                return Response({
                    "success": False,
                    "message": "Vous ne pouvez ajouter des rapports que pour un stage en cours ou terminé."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer les données du rapport
            titre = request.data.get('titre')
            fichier = request.FILES.get('fichier')
            
            if not titre or not fichier:
                return Response({
                    "success": False,
                    "message": "Titre et fichier du rapport sont requis."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validation du fichier
            max_size = 10 * 1024 * 1024  # 10MB
            allowed_types = ['application/pdf', 'application/msword', 
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            
            if fichier.size > max_size:
                return Response({
                    "success": False,
                    "message": "Le fichier est trop volumineux (max 10MB)."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if fichier.content_type not in allowed_types:
                return Response({
                    "success": False,
                    "message": "Format de fichier non supporté. Utilisez PDF, DOC ou DOCX."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer le rapport
            rapport = RapportStage.objects.create(
                stagiaire=stagiaire,
                titre=titre,
                fichier=fichier
            )

            return Response({
                "success": True,
                "message": "Rapport ajouté avec succès.",
                "rapport": {
                    "id": rapport.id,
                    "titre": rapport.titre,
                    "date_ajout": rapport.date_ajout.isoformat() if rapport.date_ajout else None,
                    "fichier_url": request.build_absolute_uri(rapport.fichier.url) if rapport.fichier else None,
                }
            }, status=status.HTTP_201_CREATED)
            
        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Aucune demande trouvée pour ce tracking_id."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout du rapport: {e}")
            return Response({
                "success": False,
                "message": "Une erreur est survenue lors de l'ajout du rapport."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        



    

@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class PreRenouvelerStageAPIView(APIView):
    """Étape 1: Pré-renouvellement avec génération d'une convention temporaire"""
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        """Pré-renouvellement : validation + génération PDF temporaire"""
        try:
            with transaction.atomic():
                # 🔹 Récupérer le stagiaire dont le stage est terminé
                ancien_stage = get_object_or_404(Stagiaire, id=stagiaire_id)

                # 🔹 Vérifier que le stage est bien terminé
                if ancien_stage.statut != "Terminé":
                    return Response({
                        "success": False,
                        "message": f"Le stage doit être terminé pour être renouvelé. Statut actuel: {ancien_stage.statut}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Vérification des permissions
                if not self.has_renouveler_permission(request.user, ancien_stage):
                    return Response({
                        "success": False,
                        "message": "Vous n'avez pas la permission de renouveler ce stage."
                    }, status=status.HTTP_403_FORBIDDEN)

                # 🔹 VÉRIFICATION : Le stage a-t-il déjà été renouvelé ?
                if ancien_stage.a_ete_renouvele:
                    return Response({
                        "success": False,
                        "message": "Ce stage a déjà été renouvelé. Un stage ne peut être renouvelé qu'une seule fois.",
                        "stage_renouvele_id": ancien_stage.stage_renouvele_id
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 VÉRIFICATION : Un pré-renouvellement est-il déjà en cours ?
                if ancien_stage.pre_renouvellement_en_cours:
                    return Response({
                        "success": False,
                        "message": "Un pré-renouvellement est déjà en cours pour ce stage."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Validation des données
                data = request.data
                validation_result = self.valider_champs_obligatoires(data)
                if not validation_result["success"]:
                    return Response(validation_result, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Parsing et validation des dates
                date_debut_str = data.get("date_debut")
                date_fin_str = data.get("date_fin")
                validation_dates = self.valider_dates(date_debut_str, date_fin_str, ancien_stage.date_fin)
                if not validation_dates["success"]:
                    return Response(validation_dates, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Gestion du montant
                remunere = data.get("remunere", ancien_stage.remunere)
                montant_str = data.get("montant", ancien_stage.montant_remuneration)
                validation_montant = self.valider_montant(remunere, montant_str)
                if not validation_montant["success"]:
                    return Response(validation_montant, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Préparation des données pour le renouvellement
                donnees_renouvellement = self.preparer_donnees_renouvellement(request, data, ancien_stage, validation_dates, validation_montant)

                # 🔹 Génération du PDF temporaire AVANT tout enregistrement
                pdf_genere, convention_temporaire = self.generer_pdf_temporaire_renouvellement(ancien_stage, donnees_renouvellement)
                
                if pdf_genere and convention_temporaire:
                    # 🔹 CRITIQUE : Activer le flag de pré-renouvellement
                    ancien_stage.pre_renouvellement_en_cours = True
                    ancien_stage.donnees_pre_renouvellement = donnees_renouvellement
                    ancien_stage.date_pre_renouvellement = timezone.now()
                    ancien_stage.convention_renouvellement_temporaire = convention_temporaire
                    
                    # Le statut reste "Terminé" - NE PAS LE CHANGER
                    ancien_stage.save()
                    
                    logger.info(f"✅ Pré-renouvellement activé pour stage {ancien_stage.id}")
                else:
                    return Response({
                        "success": False,
                        "message": "Échec de la génération de la convention PDF temporaire."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # 🔔 NOTIFICATION PUSH - Pré-renouvellement
                try:
                    donnees_notif = {
                        "stagiaire_nom": ancien_stage.nom,
                        "stagiaire_prenom": ancien_stage.prenom,
                        "date_debut": donnees_renouvellement["date_debut_formatted"],
                        "date_fin": donnees_renouvellement["date_fin_formatted"],
                        "duree_mois": self.calculer_duree_mois_temporaire(donnees_renouvellement["date_debut"], donnees_renouvellement["date_fin"]),
                        "service": donnees_renouvellement.get("service", ancien_stage.service),
                        "direction": donnees_renouvellement.get("direction", ancien_stage.direction),
                        "type_stage": donnees_renouvellement.get("type_stage", ancien_stage.type_stage),
                        "remunere": donnees_renouvellement.get("remunere", False),
                        "montant": donnees_renouvellement.get("montant", 0)
                    }
                    
                    NotificationService.notifier_pre_renouvellement_stage(
                        ancien_stage, 
                        request.user, 
                        donnees_notif
                    )
                    
                    if convention_temporaire:
                        NotificationService.notifier_convention_renouvellement_temporaire_generee(
                            ancien_stage,
                            request.user,
                            convention_temporaire
                        )
                    
                    NotificationService.broadcast_pre_renouvellement_stage(
                        ancien_stage,
                        request.user,
                        donnees_notif
                    )
                    
                    logger.info(f"🔔 Notifications pré-renouvellement envoyées pour stage #{ancien_stage.id}")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur notifications pré-renouvellement: {e}")

                # 🔹 Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Pré-renouvellement du stage {ancien_stage.prenom} {ancien_stage.nom} (ID: {ancien_stage.id})",
                    performed_by=request.user
                )

                # 🔹 Construction de l'URL du PDF
                pdf_url = None
                if convention_temporaire and convention_temporaire.fichier and convention_temporaire.fichier.name:
                    pdf_url = request.build_absolute_uri(convention_temporaire.fichier.url)

                # 🔹 Réponse
                response_data = {
                    "success": True,
                    "message": "Pré-renouvellement effectué. Téléchargez la convention pour signature.",
                    "pdf_genere": pdf_genere,
                    "pdf_url": pdf_url,
                    "convention_temporaire_id": convention_temporaire.id if convention_temporaire else None,
                    "notifications_envoyees": True,
                    "stagiaire": {
                        "id": ancien_stage.id,
                        "nom": ancien_stage.nom,
                        "prenom": ancien_stage.prenom,
                        "statut": ancien_stage.statut,  # Toujours "Terminé"
                        "pre_renouvellement_en_cours": True,  # Nouveau flag
                        "date_pre_renouvellement": timezone.now().isoformat(),
                    },
                    "renouvellement": {
                        "date_debut": donnees_renouvellement["date_debut_formatted"],
                        "date_fin": donnees_renouvellement["date_fin_formatted"],
                        "type_stage": donnees_renouvellement.get("type_stage"),
                        "direction": donnees_renouvellement.get("direction"),
                        "service": donnees_renouvellement.get("service"),
                        "remunere": donnees_renouvellement.get("remunere"),
                        "montant": donnees_renouvellement.get("montant")
                    }
                }

                logger.info(f"✅ Pré-renouvellement effectué pour stage {stagiaire_id} par {request.user.email}")
                return Response(response_data, status=status.HTTP_200_OK)

        except Stagiaire.DoesNotExist:
            return Response({
                "success": False,
                "message": "Stage non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur pré-renouvellement stage {stagiaire_id}: {str(e)}")
            return Response({
                "success": False,
                "message": f"Erreur lors du pré-renouvellement: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def generer_pdf_temporaire_renouvellement(self, ancien_stage, donnees):
        """Génère un PDF temporaire pour le renouvellement"""
        try:
            # 1. Vérifier s'il existe déjà une convention temporaire de renouvellement
            if ancien_stage.convention_renouvellement_temporaire:
                try:
                    # Supprimer l'ancienne convention temporaire
                    ancienne_conv = ancien_stage.convention_renouvellement_temporaire
                    if ancienne_conv.fichier and ancienne_conv.fichier.name:
                        ancienne_conv.fichier.delete(save=False)
                    ancienne_conv.delete()
                    logger.info(f"🗑️ Ancienne convention temporaire supprimée: {ancienne_conv.id}")
                except Exception as e:
                    logger.warning(f"⚠️ Erreur suppression ancienne convention: {e}")
            
            # 2. Créer une NOUVELLE convention TEMPORAIRE
            convention = ConventionStage.objects.create(
                est_temporaire=True,
                stagiaire=None,  # IMPORTANT: Pas de stagiaire pour les temporaires
                demande=ancien_stage.demande,  # Référence à la demande d'origine
                numero_convention=f"RENOUV-TEMP-{ancien_stage.id}-{int(time.time())}"
            )
            
            # 3. Génération du PDF
            pdf_genere = self.generer_pdf_renouvellement_temporaire(convention, ancien_stage, donnees)
            
            if pdf_genere:
                logger.info(f"✅ Convention temporaire créée: {convention.id} pour stagiaire {ancien_stage.id}")
                return True, convention
            else:
                # Si la génération échoue, nettoyer
                convention.delete()
                return False, None
                
        except Exception as e:
            logger.error(f"Erreur génération PDF temporaire renouvellement: {str(e)}")
            import traceback
            traceback.print_exc()
            return False, None

    def generer_pdf_renouvellement_temporaire(self, convention, ancien_stage, donnees):
        """Génère le PDF de renouvellement temporaire"""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
            from reportlab.lib import colors
            from io import BytesIO
            from django.core.files.base import ContentFile
            from datetime import datetime
            import time
            
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
                name="CenterTitle", 
                fontSize=12, 
                alignment=TA_CENTER, 
                spaceAfter=20, 
                leading=22
            ))
            styles.add(ParagraphStyle(
                name="Justify", 
                fontSize=12, 
                alignment=TA_JUSTIFY, 
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
            
            # --- Titre ---
            # ✅ CORRECTION : Même titre que pour une nouvelle convention
            elements.append(Paragraph("<b><u>AUTORISATION DE STAGE</u></b>", styles["CenterTitle"]))
            elements.append(Spacer(1, 20))
            
            # --- Calcul de la durée ---
            duree_mois = self.calculer_duree_mois_temporaire(donnees["date_debut"], donnees["date_fin"])
            
            # --- Formater les dates et la durée ---
            date_debut_format = self.date_format_francais_str(donnees["date_debut"])
            date_fin_format = self.date_format_francais_str(donnees["date_fin"])
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
            
            direction_code = donnees.get("direction", ancien_stage.direction)
            direction_description = descriptions_directions.get(direction_code, direction_code)
            
            # --- Texte principal ---
            # ✅ CORRECTION : Texte identique à une nouvelle convention, pas de mention "renouvellement"
            texte_stage = (
                f"Monsieur <b>{ancien_stage.nom.upper()} {ancien_stage.prenom}</b> est autorisé à effectuer un stage à la CEB "
                f"pour une durée de <b>{duree_formatee}</b> mois allant du <b>{date_debut_format}</b> "
                f"au <b>{date_fin_format}</b>."
            )
            elements.append(Paragraph(texte_stage, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            texte_affectation = (
                f"L'intéressé est mis à la disposition de la Direction <b>{direction_code} ({direction_description})</b>, "
                f"Service <b>{donnees.get('service', ancien_stage.service)}</b>."
            )
            elements.append(Paragraph(texte_affectation, styles["Justify"]))
            elements.append(Spacer(1, 12))
            
            # Rémunération
            if donnees.get("remunere", False):
                montant = donnees.get("montant", 0)
                montant_formate = f"{montant:,}".replace(",", " ")
                texte_remuneration = (
                    f"Conformément à la décision Nº236/CEB/DG/DARH/SAA/SASR/2020 portant Révision des indemnités "
                    f"forfaitaires de Stage en date du 3 septembre 2020, Monsieur <b>{ancien_stage.nom.upper()} {ancien_stage.prenom}</b> "
                    f"bénéficie au cours de son stage d'une indemnité forfaitaire mensuelle nette de "
                    f"<b>{montant_formate} FRANCS CFA</b>."
                )
                elements.append(Paragraph(texte_remuneration, styles["Justify"]))
            
            elements.append(Spacer(1, 40))
            
            # --- Signature ---
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("Le Directeur Général", styles["Signature"]))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("<b>Dr. Karimou CHABI SIKA</b>", styles["Signature"]))
            
            # ✅ CORRECTION : Pied de page neutre comme pour les conventions normales
            elements.append(Spacer(1, 60))
            elements.append(Paragraph(f"<i><font color='blue'>CONVENTION TEMPORAIRE - Réf: {convention.numero_convention}</font></i>", 
                                   ParagraphStyle(name="Footer", fontSize=8, alignment=TA_CENTER, 
                                                 textColor=colors.blue, spaceBefore=20)))
            
            # Générer le PDF
            doc.build(elements)
            
            # Sauvegarde du fichier
            pdf_content = buffer.getvalue()
            buffer.close()
            
            nom_fichier = f"convention_renouvellement_temporaire_{ancien_stage.id}_{int(time.time())}.pdf"
            convention.fichier.save(nom_fichier, ContentFile(pdf_content), save=True)
            
            logger.info(f"Convention temporaire PDF générée: {nom_fichier}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur génération PDF temporaire: {str(e)}")
            return False

    def preparer_donnees_renouvellement(self, request, data, ancien_stage, validation_dates, validation_montant):
        """Prépare les données pour le renouvellement"""
        user_id = None
        user_email = None
        try:
            if hasattr(request, "user") and request.user:
                user_id = getattr(request.user, "id", None)
                user_email = getattr(request.user, "email", None)
        except Exception:
            user_id = None
            user_email = None

        return {
            "type_stage": data.get("type_stage", ancien_stage.type_stage),
            "lieu": data.get("lieu", ancien_stage.lieu_stage),
            "direction": data.get("direction", ancien_stage.direction),
            "service": data.get("service", ancien_stage.service),
            "tuteur": data.get("tuteur", ancien_stage.superviseur),
            "date_debut": validation_dates["date_debut"].isoformat(),
            "date_fin": validation_dates["date_fin"].isoformat(),
            "date_debut_formatted": validation_dates["date_debut"].strftime("%d/%m/%Y"),
            "date_fin_formatted": validation_dates["date_fin"].strftime("%d/%m/%Y"),
            "remunere": data.get("remunere", ancien_stage.remunere),
            "montant": validation_montant["montant"],
            "notes": data.get("notes", ""),
            "date_pre_renouvellement": timezone.now().isoformat(),
            "user_id": user_id,
            "user_email": user_email,
            "ancien_stage_id": ancien_stage.id,
            "ancien_stage_date_fin": ancien_stage.date_fin.isoformat() if ancien_stage.date_fin else None
        }

    def calculer_duree_mois_temporaire(self, date_debut_str, date_fin_str):
        """Calculer la durée en mois pour les dates temporaires"""
        try:
            from datetime import datetime
            date_debut = datetime.fromisoformat(date_debut_str).date()
            date_fin = datetime.fromisoformat(date_fin_str).date()
            
            delta = date_fin - date_debut
            mois = delta.days // 30
            
            if delta.days % 30 > 15:
                mois += 1
            
            return max(1, mois)
        except:
            return 1

    def date_format_francais_str(self, date_str):
        """Formater une date string en français"""
        try:
            from datetime import datetime
            date_obj = datetime.fromisoformat(date_str).date()
            
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

    # Méthodes de validation
    def valider_champs_obligatoires(self, data):
        """Valider les champs obligatoires"""
        missing_fields = []
        empty_fields = []

        required_fields = {
            "type_stage": data.get("type_stage"),
            "lieu": data.get("lieu"),
            "direction": data.get("direction"),
            "service": data.get("service"),
            "date_debut": data.get("date_debut"),
            "date_fin": data.get("date_fin"),
        }

        for field_name, value in required_fields.items():
            if value is None:
                missing_fields.append(field_name)
            elif str(value).strip() == "":
                empty_fields.append(field_name)

        if missing_fields:
            return {
                "success": False,
                "message": f"Champs manquants : {', '.join(missing_fields)}"
            }

        if empty_fields:
            return {
                "success": False,
                "message": f"Champs vides : {', '.join(empty_fields)}"
            }

        return {"success": True}

    def valider_dates(self, date_debut_str, date_fin_str, date_fin_ancien_stage=None):
        """Valider et parser les dates"""
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

        if date_debut >= date_fin:
            return {
                "success": False,
                "message": "La date de début doit être avant la date de fin."
            }

        today = timezone.now().date()
        if date_debut < today:
            return {
                "success": False,
                "message": "La date de début ne peut pas être dans le passé."
            }

        # Vérification spécifique au renouvellement
        if date_fin_ancien_stage and date_debut <= date_fin_ancien_stage:
            return {
                "success": False,
                "message": f"La date de début du renouvellement doit être après la fin du stage précédent ({date_fin_ancien_stage.strftime('%d/%m/%Y')})."
            }

        duree_jours = (date_fin - date_debut).days
        if duree_jours > 730:
            return {
                "success": False,
                "message": "La durée du stage ne peut pas dépasser 2 ans."
            }

        return {
            "success": True,
            "date_debut": date_debut,
            "date_fin": date_fin,
            "duree_jours": duree_jours
        }

    def valider_montant(self, remunere, montant_str):
        """Valider le montant de rémunération"""
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
                if montant_final > 1000000:
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
    
    def has_renouveler_permission(self, user, stage):
        """Vérifie si l'utilisateur peut renouveler le stage"""
        return user.is_authenticated and user.has_perm('stages.add_stagiaire')


@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class FinaliserRenouvellementAPIView(APIView):
    """Étape 2: Finalisation du renouvellement avec upload du PDF signé"""
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        """Finalise le renouvellement avec le PDF signé"""
        try:
            with transaction.atomic():
                # 🔹 Récupérer l'ancien stage
                ancien_stage = get_object_or_404(Stagiaire, id=stagiaire_id)

                # 🔹 Vérifier qu'un pré-renouvellement est bien en cours
                if not ancien_stage.pre_renouvellement_en_cours:
                    return Response({
                        "success": False,
                        "message": "Ce stage n'est pas en état de pré-renouvellement."
                    }, status=status.HTTP_400_BAD_REQUEST)

                if not ancien_stage.donnees_pre_renouvellement:
                    return Response({
                        "success": False,
                        "message": "Données de pré-renouvellement manquantes."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Vérification du fichier signé
                fichier_signe = request.FILES.get('fichier_signe')
                if not fichier_signe:
                    return Response({
                        "success": False,
                        "message": "Le fichier signé est requis."
                    }, status=status.HTTP_400_BAD_REQUEST)

                if not self.valider_fichier_signe(fichier_signe):
                    return Response({
                        "success": False,
                        "message": "Format de fichier non supporté. Utilisez PDF uniquement (max 10MB)."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 🔹 Récupération des données de pré-renouvellement
                donnees = ancien_stage.donnees_pre_renouvellement

                # 🔹 Récupérer la convention temporaire
                convention_temp = ancien_stage.convention_renouvellement_temporaire
                
                # 🔹 Création du NOUVEAU stage (renouvellement)
                nouveau_stage = self.creer_stage_renouvellement(ancien_stage, donnees)
                logger.info(f"✅ Nouveau stage de renouvellement créé: {nouveau_stage.id}")
                
                # 🔹 Créer la convention définitive
                convention_definitive = ConventionStage.objects.create(
                    stagiaire=nouveau_stage,
                    est_temporaire=False,
                )
                
                # Sauvegarde du PDF signé
                nom_fichier = f"convention_renouvellement_signee_{nouveau_stage.nom}_{nouveau_stage.prenom}_{convention_definitive.numero_convention}.pdf"
                convention_definitive.fichier.save(nom_fichier, fichier_signe, save=True)

                # 🔹 CRITIQUE : Mise à jour de l'ancien stage
                ancien_stage.a_ete_renouvele = True
                ancien_stage.stage_renouvele_id = str(nouveau_stage.id)
                ancien_stage.pre_renouvellement_en_cours = False  # Désactiver le flag
                ancien_stage.donnees_pre_renouvellement = None
                ancien_stage.date_pre_renouvellement = None
                
                # 🔹 Nettoyer la convention temporaire
                if convention_temp:
                    try:
                        if convention_temp.fichier and convention_temp.fichier.name:
                            convention_temp.fichier.delete(save=False)
                        convention_temp.delete()
                        logger.info(f"🗑️ Convention temporaire supprimée: {convention_temp.id}")
                    except Exception as e:
                        logger.warning(f"⚠️ Erreur suppression convention temporaire: {e}")
                
                ancien_stage.convention_renouvellement_temporaire = None
                ancien_stage.save()

                # 🔹 Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Finalisation renouvellement {ancien_stage.id} -> {nouveau_stage.id}",
                    performed_by=request.user
                )

                # 🔔 NOTIFICATIONS
                email_envoye = self.envoyer_notifications_finalisation(ancien_stage, nouveau_stage, request.user)

                # 🔹 Construction de l'URL du fichier
                fichier_url = None
                if convention_definitive.fichier and convention_definitive.fichier.name:
                    fichier_url = request.build_absolute_uri(convention_definitive.fichier.url)

                # 🔹 Réponse
                response_data = {
                    "success": True,
                    "message": "Renouvellement finalisé avec succès. Un nouveau stage a été créé.",
                    "email_envoye": email_envoye,
                    "nouveau_stage": {
                        "id": nouveau_stage.id,
                        "nom": nouveau_stage.nom,
                        "prenom": nouveau_stage.prenom,
                        "type_stage": nouveau_stage.type_stage,
                        "statut": nouveau_stage.statut,
                        "date_debut": nouveau_stage.date_debut.strftime('%d/%m/%Y'),
                        "date_fin": nouveau_stage.date_fin.strftime('%d/%m/%Y'),
                        "duree_jours": (nouveau_stage.date_fin - nouveau_stage.date_debut).days,
                        "remunere": nouveau_stage.remunere,
                        "montant_remuneration": nouveau_stage.montant_remuneration,
                        "service": nouveau_stage.service,
                        "direction": nouveau_stage.direction,
                        "est_renouvellement": True,
                        "identifiant_groupe": str(nouveau_stage.identifiant_groupe)
                    },
                    "ancien_stage": {
                        "id": ancien_stage.id,
                        "nom": ancien_stage.nom,
                        "prenom": ancien_stage.prenom,
                        "statut": ancien_stage.statut,  # Toujours "Terminé"
                        "a_ete_renouvele": ancien_stage.a_ete_renouvele,
                        "stage_renouvele_id": ancien_stage.stage_renouvele_id,
                        "pre_renouvellement_en_cours": False  # Confirmé désactivé
                    },
                    "convention": {
                        "id": convention_definitive.id,
                        "numero_convention": convention_definitive.numero_convention,
                        "fichier_url": fichier_url,
                        "date_creation": convention_definitive.date_creation.strftime('%d/%m/%Y')
                    }
                }

                logger.info(f"✅ Renouvellement finalisé {ancien_stage.id} -> {nouveau_stage.id} par {request.user.email}")
                return Response(response_data, status=status.HTTP_201_CREATED)

        except Stagiaire.DoesNotExist:
            return Response({
                "success": False,
                "message": "Stage non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur finalisation renouvellement {stagiaire_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                "success": False,
                "message": f"Erreur lors de la finalisation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def creer_stage_renouvellement(self, ancien_stage, donnees):
        """Crée le nouveau stage de renouvellement"""
        from datetime import datetime
        
        date_debut = datetime.fromisoformat(donnees["date_debut"]).date()
        date_fin = datetime.fromisoformat(donnees["date_fin"]).date()
        
        # Déterminer le statut
        today = timezone.now().date()
        if today < date_debut:
            statut = "À venir"
        elif date_debut <= today <= date_fin:
            statut = "Actuel"
        else:
            statut = "Terminé"

        # Créer le nouveau stage
        nouveau_stage = Stagiaire.objects.create(
            demande=ancien_stage.demande,
            
            # Informations personnelles (copiées)
            photo_passeport=ancien_stage.photo_passeport,
            nom=ancien_stage.nom,
            prenom=ancien_stage.prenom,
            email=ancien_stage.email,
            telephone=ancien_stage.telephone,
            niveau_etude=ancien_stage.niveau_etude,
            specialite=ancien_stage.specialite,
            genre=ancien_stage.genre,
            etablissement=ancien_stage.etablissement,
            pays_residence=ancien_stage.pays_residence,
            adresse=ancien_stage.adresse,
            
            # Informations du stage (depuis les données)
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
            
            # Documents (référence aux mêmes fichiers)
            cv=ancien_stage.cv,
            lettre_motivation=ancien_stage.lettre_motivation,
            diplome=ancien_stage.diplome,
            resume_cv=ancien_stage.resume_cv,
            
            # Relations de renouvellement
            a_ete_renouvele=False,
            stage_renouvele_id=None,
            pre_renouvellement_en_cours=False,
            identifiant_groupe=ancien_stage.identifiant_groupe,
            stage_precedent=ancien_stage,
            
            # Champ pour identifier les renouvellements
            est_renouvellement=True,
        )

        logger.info(f"✅ Nouveau stage de renouvellement créé: {nouveau_stage.id}")
        return nouveau_stage

    def valider_fichier_signe(self, fichier):
        """Valide le fichier signé (PDF uniquement)"""
        allowed_types = ['application/pdf']
        max_size = 10 * 1024 * 1024
        
        if fichier.size > max_size:
            return False
        
        if hasattr(fichier, 'content_type') and fichier.content_type:
            if fichier.content_type not in allowed_types:
                return False
        
        if not fichier.name.lower().endswith('.pdf'):
            return False
        
        if fichier.size == 0:
            return False
        
        return True

    def envoyer_notifications_finalisation(self, ancien_stage, nouveau_stage, user):
        """Envoie les notifications et emails de finalisation"""
        try:
            email_envoye = False
            try:
                if hasattr(self, 'StageEmailTemplates'):
                    email_data = StageEmailTemplates.renouvellement_stage(ancien_stage, nouveau_stage)
                    email_envoye = EmailSenderService.send_email(
                        to_email=nouveau_stage.email,
                        subject=email_data['subject'],
                        html_content=email_data['html'],
                        text_content=email_data['text'],
                        async_send=True
                    )
                    logger.info(f"✅ Email renouvellement envoyé à {nouveau_stage.email}")
            except Exception as email_error:
                logger.error(f"❌ Erreur envoi email renouvellement: {email_error}")
            
            try:
                NotificationService.notifier_renouvellement_stage_finalise(
                    ancien_stage=ancien_stage,
                    nouveau_stage=nouveau_stage,
                    utilisateur=user
                )
                logger.info(f"✅ Notification renouvellement finalisé envoyée")
            except Exception as notif_error:
                logger.error(f"❌ Erreur notification finalisation: {notif_error}")
            
            return email_envoye
        except Exception as e:
            logger.error(f"❌ Erreur générale notifications finalisation: {e}")
            return False


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class TelechargerConventionRenouvellementTemporaireAPIView(APIView):
    """Télécharge une convention temporaire de renouvellement"""
    permission_classes = [IsAuthenticated]

    def get(self, request, convention_id):
        try:
            convention = get_object_or_404(
                ConventionStage.objects.filter(est_temporaire=True),
                id=convention_id
            )
            
            if not self.has_download_permission(request.user, convention):
                return Response({
                    "success": False,
                    "message": "Accès non autorisé."
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not convention.fichier:
                return Response({
                    "success": False,
                    "message": "Aucun fichier disponible."
                }, status=status.HTTP_404_NOT_FOUND)
            
            file_path = convention.fichier.path
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    response = HttpResponse(f.read(), content_type='application/pdf')
                    response['Content-Disposition'] = f'attachment; filename="{convention.fichier.name}"'
                    return response
            else:
                return Response({
                    "success": False,
                    "message": "Fichier introuvable sur le serveur."
                }, status=status.HTTP_404_NOT_FOUND)
                
        except ConventionStage.DoesNotExist:
            return Response({
                "success": False,
                "message": "Convention non trouvée."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur téléchargement convention {convention_id}: {str(e)}")
            return Response({
                "success": False,
                "message": "Erreur lors du téléchargement."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def has_download_permission(self, user, convention):
        """Vérifie les permissions de téléchargement"""
        return user.has_perm('stages.view_stagiaire')


@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class AnnulerPreRenouvellementAPIView(APIView):
    """Annule un pré-renouvellement"""
    permission_classes = [IsAuthenticated]

    def post(self, request, stagiaire_id):
        try:
            with transaction.atomic():
                ancien_stage = get_object_or_404(Stagiaire, id=stagiaire_id)

                if not self.has_renouveler_permission(request.user, ancien_stage):
                    return Response({
                        "success": False,
                        "message": "Permission refusée."
                    }, status=status.HTTP_403_FORBIDDEN)

                # 🔹 Vérifier qu'un pré-renouvellement est bien en cours
                if not ancien_stage.pre_renouvellement_en_cours:
                    return Response({
                        "success": False,
                        "message": "Aucun pré-renouvellement en cours."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Sauvegarder les données avant suppression
                donnees = ancien_stage.donnees_pre_renouvellement
                
                # 🔹 Récupérer la convention temporaire
                convention_temp = ancien_stage.convention_renouvellement_temporaire
                conventions_supprimees = 0
                
                # 🔹 Supprimer la convention temporaire
                if convention_temp:
                    try:
                        convention_temp_id = convention_temp.id
                        logger.info(f"🗑️ Tentative suppression convention temporaire: {convention_temp_id}")
                        
                        # Supprimer le fichier physique
                        if convention_temp.fichier and convention_temp.fichier.name:
                            try:
                                convention_temp.fichier.delete(save=False)
                                logger.info(f"✅ Fichier convention supprimé: {convention_temp.fichier.name}")
                            except Exception as file_error:
                                logger.warning(f"⚠️ Erreur suppression fichier: {file_error}")
                        
                        # Supprimer l'objet convention
                        convention_temp.delete()
                        conventions_supprimees = 1
                        logger.info(f"✅ Convention temporaire supprimée: {convention_temp_id}")
                        
                    except Exception as e:
                        logger.error(f"❌ Erreur suppression convention: {e}")
                
                # 🔹 CRITIQUE : Désactiver le flag de pré-renouvellement
                ancien_stage.pre_renouvellement_en_cours = False
                ancien_stage.donnees_pre_renouvellement = None
                ancien_stage.date_pre_renouvellement = None
                ancien_stage.convention_renouvellement_temporaire = None
                
                ancien_stage.save()
                
                logger.info(f"✅ Pré-renouvellement annulé pour stage {ancien_stage.id}")

                # Notification
                try:
                    NotificationService.notifier_annulation_pre_renouvellement(
                        ancien_stage,
                        request.user,
                        donnees
                    )
                    logger.info(f"✅ Notification annulation envoyée")
                except Exception as e:
                    logger.error(f"❌ Erreur notification annulation: {e}")

                # Enregistrement de l'action
                try:
                    UserAction.objects.create(
                        user=request.user,
                        action=f"Annulation pré-renouvellement stage {ancien_stage.id}",
                        performed_by=request.user
                    )
                except Exception as e:
                    logger.error(f"❌ Erreur enregistrement action: {e}")

                return Response({
                    "success": True,
                    "message": "Pré-renouvellement annulé avec succès.",
                    "conventions_supprimees": conventions_supprimees,
                    "stage_id": ancien_stage.id,
                    "stage_nom": f"{ancien_stage.prenom} {ancien_stage.nom}",
                    "pre_renouvellement_en_cours": False  # Confirmé désactivé
                }, status=status.HTTP_200_OK)

        except Stagiaire.DoesNotExist:
            logger.error(f"❌ Stage {stagiaire_id} non trouvé")
            return Response({
                "success": False,
                "message": "Stage non trouvé."
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"❌ Erreur annulation pré-renouvellement {stagiaire_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                "success": False,
                "message": f"Erreur lors de l'annulation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def has_renouveler_permission(self, user, stage):
        """Vérifie si l'utilisateur a la permission d'annuler le renouvellement"""
        return user.is_authenticated and user.has_perm('stages.add_stagiaire')


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class StagesEnPreRenouvellementAPIView(APIView):
    """Liste tous les stages en cours de pré-renouvellement"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # 🔹 Récupérer tous les stages avec le flag activé
            stages = Stagiaire.objects.filter(
                pre_renouvellement_en_cours=True,
                statut="Terminé"  # S'assurer qu'ils sont terminés
            ).select_related('etablissement', 'demande').order_by('-date_pre_renouvellement')
            
            data = []
            for stage in stages:
                donnees = stage.donnees_pre_renouvellement or {}
                convention_temp = stage.convention_renouvellement_temporaire
                
                data.append({
                    "id": stage.id,
                    "nom_complet": f"{stage.prenom} {stage.nom}",
                    "email": stage.email,
                    "telephone": stage.telephone,
                    "ancien_stage": {
                        "date_debut": stage.date_debut.strftime('%d/%m/%Y'),
                        "date_fin": stage.date_fin.strftime('%d/%m/%Y'),
                        "duree_jours": stage.duree_jours,
                        "direction": stage.direction,
                        "service": stage.service,
                    },
                    "nouveau_stage_propose": {
                        "type_stage": donnees.get("type_stage", stage.type_stage),
                        "date_debut_prevue": donnees.get("date_debut_formatted"),
                        "date_fin_prevue": donnees.get("date_fin_formatted"),
                        "direction": donnees.get("direction", stage.direction),
                        "service": donnees.get("service", stage.service),
                        "remunere": donnees.get("remunere", stage.remunere),
                        "montant": donnees.get("montant", stage.montant_remuneration),
                    },
                    "date_pre_renouvellement": stage.date_pre_renouvellement.isoformat() if stage.date_pre_renouvellement else None,
                    "convention_temporaire": {
                        "id": convention_temp.id if convention_temp else None,
                        "url": convention_temp.fichier.url if convention_temp and convention_temp.fichier else None,
                        "nom_fichier": convention_temp.fichier.name if convention_temp and convention_temp.fichier else None,
                    },
                    "statut_global": {
                        "statut_stage": stage.statut,  # Toujours "Terminé"
                        "pre_renouvellement_en_cours": True,
                        "a_ete_renouvele": stage.a_ete_renouvele,
                    }
                })
            
            return Response({
                "success": True,
                "count": len(data),
                "stages_en_pre_renouvellement": data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erreur récupération stages en pré-renouvellement: {str(e)}")
            return Response({
                "success": False,
                "message": f"Erreur lors de la récupération: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)