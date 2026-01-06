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

from services.email_service import EmailSenderService
from django.contrib.sessions.models import Session

import pandas as pd
from django.conf import settings
from django.contrib.auth import (
    get_user_model, update_session_auth_hash, 
    authenticate, logout
)
import time,json
from .listeDemande import DemandeBaseAPIView
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

from django.utils.decorators import method_decorator

from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models import (
    Stagiaire, Notification, Entretien, Demande, RapportStage, 
    UserSession, Utilisateur, UserAction, ConventionStage, 
    Etablissement, Diplome, DocumentHistory
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

class DemandeEnAttenteAPI(DemandeBaseAPIView):
    base_queryset = Demande.objects.filter(
        statut_stage="En attente", 
        est_archivee=False
    )

class DemandesRefuseesAPI(DemandeBaseAPIView):
    base_queryset = Demande.objects.filter(statut_stage="Refusée")

class DemandesAccepteesAPI(DemandeBaseAPIView):
    base_queryset = Demande.objects.filter(statut_stage="Acceptée")

class DemandesEnTraitementAPI(DemandeBaseAPIView):
    base_queryset = Demande.objects.filter(statut_stage="En cours de traitement")

class DemandesEnAcceptationAPI(DemandeBaseAPIView):
    base_queryset = Demande.objects.filter(statut_stage="Pré-acceptée")

class DemandesToutesAPI(DemandeBaseAPIView):
    pass

class DemandesArchiveesAPI(DemandeBaseAPIView):
    base_queryset = Demande.objects.filter(est_archivee=True)
    
    def get_queryset(self):
        """Archivage automatique avant de retourner les données"""
        six_months_ago = timezone.now() - timedelta(days=180)
        
        # Archivage automatique
        Demande.objects.filter(
            Q(statut_stage="En attente"),
            date_soumission__lt=six_months_ago,
            est_archivee=False,
            date_desarchivage__isnull=True
        ).update(est_archivee=True)
        
        return super().get_queryset()

@method_decorator([csrf_exempt, never_cache], name='dispatch') 
class SupprimerDemandeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, demande_id):
        try:
            with transaction.atomic():
                demande = get_object_or_404(Demande, id=demande_id)
                
                # Vérifications de sécurité
                if hasattr(demande, 'stagiaire'):
                    return Response({
                        "success": False,
                        "message": "Impossible de supprimer cette demande car un stagiaire a déjà été créé."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Vérifier les permissions (exemple basique)
                if not self.has_delete_permission(request.user, demande):
                    return Response({
                        "success": False,
                        "message": "Vous n'avez pas la permission de supprimer cette demande."
                    }, status=status.HTTP_403_FORBIDDEN)

                # Sauvegarder les informations pour la notification
                etudiant_nom = f"{demande.etudiant_prenom} {demande.etudiant_nom}"
                tracking_id = demande.tracking_id

                # Journalisation détaillée
                logger.info(
                    f"Suppression demande {demande_id} - {etudiant_nom} "
                    f"par {request.user.email} - Diplômes: {demande.diplomes.count()}"
                )

                # Suppression
                demande.delete()
                
                # Enregistrer l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Suppression de la demande de {etudiant_nom}",
                    performed_by=request.user
                )
                
                # Notification
                NotificationService.notifier_suppression_demande(
                    etudiant_nom=etudiant_nom,
                    tracking_id=tracking_id,
                    user=request.user
                )

                return Response({
                    "success": True,
                    "message": "Demande et tous ses documents supprimés avec succès."
                })

        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Demande non trouvée."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Erreur suppression demande {demande_id}: {str(e)}")
            return Response({
                "success": False,
                "message": "Erreur lors de la suppression."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def has_delete_permission(self, user, demande):
        """Vérifie si l'utilisateur a la permission de supprimer la demande"""
        # Implémentez votre logique de permissions ici
        return user.is_authenticated and user.has_perm('app.delete_demande')

@method_decorator([never_cache, ratelimit(key='user', rate='20/m', method='POST')], name='dispatch')
class MettreEnTraitementAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Met une demande en traitement"""
        try:
            with transaction.atomic():
                # 🔹 Récupérer la demande avec verrouillage
                demande = get_object_or_404(
                    Demande.objects.select_for_update(), 
                    pk=pk
                )
                
                # 🔹 Vérifier les permissions
                if not self.has_process_permission(request.user, demande):
                    return Response(
                        {"detail": "Vous n'avez pas la permission de traiter cette demande."},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # 🔹 Vérifier que la demande est en attente
                if demande.statut_stage != "En attente":
                    return Response(
                        {"detail": "Seules les demandes en attente peuvent être mises en traitement."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 🔹 Vérifier que la demande n'est pas archivée
                if demande.est_archivee:
                    return Response(
                        {"detail": "Impossible de mettre en traitement une demande archivée."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 🔹 Mettre à jour le statut
                ancien_statut = demande.statut_stage
                demande.statut_stage = "En cours de traitement"
                demande.save()
                
                # ✅ ENVOI EMAIL SIMPLIFIÉ via le service
                email_envoye = EmailSenderService.send_mise_en_traitement(
                    demande=demande,
                    async_send=True
                )
                
                # 🔔 NOTIFICATION PUSH AVEC NOTIFICATIONSERVICE
                notification_creee = NotificationService.notifier_mise_en_traitement(
                    demande=demande, 
                    user=request.user
                )
                
                # 📢 DIFFUSION AUX AUTRES ADMINISTRATEURS
                NotificationService.broadcast_mise_en_traitement(
                    demande=demande,
                    user_acteur=request.user
                )
                
                # 🔹 Enregistrer l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Demande {demande.tracking_id} mise en traitement",
                    performed_by=request.user
                )
                
                logger.info(f"Demande {demande.tracking_id} mise en traitement par {request.user.email}")
                
                # ✅ Sérialiser la notification
                notification_data = None
                if notification_creee:
                    notification_data = {
                        "id": notification_creee.id,
                        "titre": notification_creee.titre,
                        "message": notification_creee.message,
                        "type": notification_creee.type,
                        "date_creation": notification_creee.date_creation.isoformat(),
                        "lu": notification_creee.lu,
                        "son": notification_creee.son if hasattr(notification_creee, 'son') else 'default'
                    }
                
                return Response({
                    "id": demande.id,
                    "statut_stage": demande.statut_stage,
                    "tracking_id": demande.tracking_id,
                    "email_envoye": email_envoye,
                    "notification_creee": notification_data,
                    "message": "La demande a été mise en cours de traitement avec succès."
                }, status=status.HTTP_200_OK)
                
        except Demande.DoesNotExist:
            return Response(
                {"detail": "Demande non trouvée."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Erreur mise en traitement demande {pk}: {str(e)}")
            return Response(
                {"detail": "Une erreur est survenue lors de la mise en traitement."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def has_process_permission(self, user, demande):
        """Vérifie si l'utilisateur peut traiter la demande"""
        return user.is_authenticated and user.has_perm('stages.change_demande')

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class SuiviDemandeAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, tracking_id=None):
        if not tracking_id:
            tracking_id = request.query_params.get('tracking_id')
        
        if not tracking_id:
            return Response({
                "success": False,
                "message": "Tracking ID manquant."
            }, status=status.HTTP_400_BAD_REQUEST)

        tracking_id = tracking_id.strip().upper()
        
        try:
            # Optimisation des requêtes avec select_related et prefetch_related
            demande = Demande.objects.select_related(
                'etablissement'
            ).prefetch_related(
                'diplomes'
            ).get(tracking_id=tracking_id)

            stagiaires = Stagiaire.objects.filter(demande=demande).select_related(
                'etablissement', 
                'conventionstage'  # 🔥 AJOUTER CE SELECT_RELATED
            ).prefetch_related('rapports')
            
            logger.info(f"✅ Demande trouvée: {demande.id} - {demande.etudiant_nom} {demande.etudiant_prenom}")
            
        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Aucune demande trouvée pour ce tracking_id."
            }, status=status.HTTP_404_NOT_FOUND)

        # ✅ CORRECTION : Récupération du stage lié via ForeignKey inverse
        stage_info = None
        try:
            # Utiliser la relation inversée avec filter() au lieu de hasattr
            stagiaires = Stagiaire.objects.filter(demande=demande).select_related('etablissement').prefetch_related('rapports')
            
            logger.info(f"🔍 Nombre de stagiaires trouvés pour la demande {demande.id}: {stagiaires.count()}")
            
            if stagiaires.exists():
                # Prendre le stagiaire le plus récent (ou le premier si un seul)
                stagiaire = stagiaires.order_by('-date_debut').first()
                logger.info(f"✅ Stagiaire sélectionné: ID={stagiaire.id}, Nom={stagiaire.nom} {stagiaire.prenom}, Statut={stagiaire.statut_actuel}")
                
                stage_info = self.get_stage_info(stagiaire, request)
                
                if stage_info:
                    logger.info(f"✅ Stage info récupéré avec succès pour le stagiaire {stagiaire.id}")
                else:
                    logger.warning(f"⚠️ Stage info est None pour le stagiaire {stagiaire.id}")
            else:
                logger.info(f"ℹ️ Aucun stagiaire lié à la demande {demande.id}")
                
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération du stage pour la demande {demande.id}: {e}")
            import traceback
            logger.error(f"🔥 Traceback complet:\n{traceback.format_exc()}")

        # Documents de la demande (CV, lettre, diplômes seulement)
        documents = self.get_demande_documents(demande, request)
        
        photo_passeport_url = None
        if demande.photo_passeport:
            photo_passeport_url = request.build_absolute_uri(demande.photo_passeport.url)

        prochaines_etapes = self.get_prochaines_etapes(demande.statut_stage)

        response_data = {
            "success": True,
            "demande": {
                "tracking_id": demande.tracking_id,
                "statut_stage": demande.statut_stage,
                "date_soumission": demande.date_soumission.isoformat() if demande.date_soumission else None,
                "date_maj": demande.date_maj.isoformat() if demande.date_maj else demande.date_soumission.isoformat(),
                "stagiaire": {
                    "nom": demande.etudiant_nom,
                    "prenom": demande.etudiant_prenom,
                    "email": demande.etudiant_email,
                    "telephone": demande.etudiant_telephone,
                    "adresse": demande.etudiant_adresse,
                    "specialite": demande.etudiant_specialite,
                    "niveau": demande.etudiant_niveau,
                    "genre": demande.genre,
                    "pays_residence": demande.pays_residence,
                },
                "type_stage": demande.type_stage,
                "etablissement": {
                    "nom": demande.etablissement.nom if demande.etablissement else None,
                    "email": demande.etablissement.email if demande.etablissement else None,
                    "adresse": demande.etablissement.adresse if demande.etablissement else None,
                    "telephone": demande.etablissement.telephone if demande.etablissement else None,
                } if demande.etablissement else None,
                "prochaines_etapes": prochaines_etapes,
                "infos_supplementaires": None,
                "date_examen": None,
                "motif_refus": demande.raison_refus if demande.statut_stage == "Refusée" else None,
                "documents": documents,
                "photo_passeport": photo_passeport_url,
            }
        }

        # Ajouter les informations du stage si disponible
        if stage_info:
            response_data["demande"]["stage"] = stage_info
            response_data["demande"]["statut_detaille"] = f"Stage {stage_info.get('statut_actuel', 'en attente')}"
            
            logger.info(f"✅ Informations du stage ajoutées à la réponse")
            
            # Ajouter l'indicateur de renouvellement au niveau principal pour faciliter l'accès
            if stage_info.get('renouvellement'):
                response_data["demande"]["renouvellement"] = stage_info['renouvellement']
        else:
            logger.info(f"ℹ️ Aucune information de stage à ajouter à la réponse")

        logger.info(f"📤 Réponse envoyée avec succès pour la demande {demande.tracking_id}")
        return Response(response_data, status=status.HTTP_200_OK)

    def get_prochaines_etapes(self, statut_stage):
        """Retourne les prochaines étapes selon le statut"""
        etapes = {
            "En attente": "Votre demande est en cours d'examen par notre équipe. Vous recevrez une notification par email dès qu'une décision sera prise.",
            "En cours de traitement": "Votre dossier est actuellement en cours de traitement. Notre équipe l'examine en détail.",
            "Acceptée": "Félicitations ! Votre demande a été acceptée. Veuillez télécharger et imprimer votre convention de stage.",
            "Refusée": "Votre demande a été refusée. Veuillez consulter vos emails pour connaître le motif du refus. Vous pouvez soumettre une nouvelle demande dans le futur si les conditions changent.",
            "Information supplémentaire requise": "Veuillez consulter vos emails pour les informations complémentaires à fournir.",
            "Stage en cours": "Votre stage est actuellement en cours. Consultez vos emails pour les communications importantes.",
            "Terminé": "Votre stage est terminé. Pour l'obtention de votre attestation, veuillez soumettre votre rapport de stage accompagné d'une demande d'attestation.",
            "Stage annulé": "Votre stage a été annulé. Contactez-nous pour plus d'informations."
        }
        return etapes.get(statut_stage, "Statut non spécifié.")

    def get_stage_info(self, stagiaire, request):
        """Récupère les informations détaillées du stage AVEC LA CONVENTION"""
        try:
            logger.info(f"🔄 Début de get_stage_info pour le stagiaire {stagiaire.id}")
            
            convention = None
            try:
                if hasattr(stagiaire, 'conventionstage') and stagiaire.conventionstage:
                    convention_obj = stagiaire.conventionstage
                    if convention_obj.fichier:
                        convention = {
                            "numero_convention": convention_obj.numero_convention,
                            "date_creation": convention_obj.date_creation.isoformat() if convention_obj.date_creation else None,
                            "fichier_url": request.build_absolute_uri(convention_obj.fichier.url),
                            "est_temporaire": convention_obj.est_temporaire,
                        }
                        logger.info(f"✅ Convention trouvée: {convention_obj.numero_convention}")
                else:
                    from stages.models import ConventionStage
                    convention_obj = ConventionStage.objects.filter(stagiaire=stagiaire).first()
                    if convention_obj and convention_obj.fichier:
                        convention = {
                            "numero_convention": convention_obj.numero_convention,
                            "date_creation": convention_obj.date_creation.isoformat() if convention_obj.date_creation else None,
                            "fichier_url": request.build_absolute_uri(convention_obj.fichier.url),
                            "est_temporaire": convention_obj.est_temporaire,
                        }
                        logger.info(f"✅ Convention trouvée via query: {convention_obj.numero_convention}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur récupération convention pour stagiaire {stagiaire.id}: {e}")

            rapports = []
            try:
                rapports_queryset = stagiaire.rapports.all()
                logger.info(f"📚 Nombre de rapports trouvés: {rapports_queryset.count()}")
                
                for rapport in rapports_queryset:
                    if rapport.fichier:
                        rapports.append({
                            "titre": rapport.titre,
                            "date_ajout": rapport.date_ajout.isoformat() if rapport.date_ajout else None,
                            "fichier_url": request.build_absolute_uri(rapport.fichier.url),
                        })
                        logger.info(f"✅ Rapport ajouté: {rapport.titre}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur rapports pour stagiaire {stagiaire.id}: {e}")

            # Documents du stagiaire - AJOUTER LA CONVENTION
            documents_stagiaire = []
            try:
                # Récupérer les documents du stagiaire
                all_docs = stagiaire.get_documents()
                logger.info(f"📄 Nombre total de documents du stagiaire: {len(all_docs)}")
                
                for doc in all_docs:
                    doc_type = doc.get('type', '')
                    
                    # EXCLURE les rapports (ils sont déjà dans 'rapports')
                    if doc_type == 'rapport':
                        continue
                    
                    # EXCLURE les documents de base (CV, lettre, diplôme)
                    if doc_type in ['cv', 'lettre_motivation', 'diplome']:
                        continue
                    
                    url = doc.get('url', '')
                    if url and not url.startswith('http'):
                        url = request.build_absolute_uri(url)
                    
                    documents_stagiaire.append({
                        "nom": doc.get('nom', 'Document'),
                        "type": doc.get('type', 'document'),
                        "url": url,
                    })
                    logger.info(f"✅ Document stagiaire ajouté: {doc.get('nom')}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur documents pour stagiaire {stagiaire.id}: {e}")

            # 🔥 AJOUTER LA CONVENTION AUX DOCUMENTS SI ELLE EXISTE
            if convention:
                documents_stagiaire.append({
                    "nom": f"Convention de stage ({convention['numero_convention']})",
                    "type": "convention",
                    "url": convention["fichier_url"],
                    "numero_convention": convention["numero_convention"],
                    "date_creation": convention["date_creation"],
                    "est_temporaire": convention["est_temporaire"],
                })
                logger.info(f"✅ Convention ajoutée aux documents du stagiaire")

            # Récupérer l'historique des stages
            historique_stages = []
            stage_renouvele_info = None
            
            if stagiaire.a_ete_renouvele and stagiaire.stage_renouvele_id:
                try:
                    logger.info(f"🔄 Recherche du stage renouvelé: {stagiaire.stage_renouvele_id}")
                    nouveau_stage = Stagiaire.objects.get(id=stagiaire.stage_renouvele_id)
                    stage_renouvele_info = {
                        "id": nouveau_stage.id,
                        "statut": nouveau_stage.statut_actuel,
                        "date_debut": nouveau_stage.date_debut.isoformat() if nouveau_stage.date_debut else None,
                        "date_fin": nouveau_stage.date_fin.isoformat() if nouveau_stage.date_fin else None,
                        "type_stage": nouveau_stage.type_stage,
                        "direction": nouveau_stage.direction,
                        "service": nouveau_stage.service,
                        "remunere": nouveau_stage.remunere,
                        "montant_remuneration": nouveau_stage.montant_remuneration,
                        "superviseur": nouveau_stage.superviseur,
                        "lieu_stage": nouveau_stage.lieu_stage,
                        "duree_jours": nouveau_stage.duree_jours,
                        "duree_mois": nouveau_stage.duree_mois,
                    }
                    logger.info(f"✅ Stage renouvelé trouvé: {nouveau_stage.id}")
                except Stagiaire.DoesNotExist:
                    logger.warning(f"⚠️ Stage renouvelé {stagiaire.stage_renouvele_id} non trouvé")
                except Exception as e:
                    logger.warning(f"⚠️ Erreur lors de la récupération du stage renouvelé: {e}")

            # Récupérer les stages précédents
            try:
                stages_precedents = Stagiaire.objects.filter(stage_renouvele_id=stagiaire.id)
                logger.info(f"🔍 Nombre de stages précédents trouvés: {stages_precedents.count()}")
                
                for stage_precedent in stages_precedents:
                    historique_stages.append({
                        "id": stage_precedent.id,
                        "date_debut": stage_precedent.date_debut.isoformat() if stage_precedent.date_debut else None,
                        "date_fin": stage_precedent.date_fin.isoformat() if stage_precedent.date_fin else None,
                        "type_stage": stage_precedent.type_stage,
                        "statut": stage_precedent.statut_actuel,
                        "direction": stage_precedent.direction,
                        "service": stage_precedent.service,
                        "remunere": stage_precedent.remunere,
                        "montant_remuneration": stage_precedent.montant_remuneration,
                        "superviseur": stage_precedent.superviseur,
                        "est_renouvelable": stage_precedent.statut_actuel == "Terminé" and not stage_precedent.a_ete_renouvele,
                    })
            except Exception as e:
                logger.warning(f"⚠️ Erreur historique stages pour stagiaire {stagiaire.id}: {e}")

            # Informations de renouvellement
            informations_renouvellement = {
                "a_ete_renouvele": stagiaire.a_ete_renouvele,
                "stage_renouvele_id": stagiaire.stage_renouvele_id,
                "peut_etre_renouvele": stagiaire.statut_actuel == "Terminé" and not stagiaire.a_ete_renouvele,
                "date_renouvellement": stagiaire.date_renouvellement.isoformat() if hasattr(stagiaire, 'date_renouvellement') and stagiaire.date_renouvellement else None,
            }

            # 🔥 MODIFIER stage_data POUR INCLURE LA CONVENTION AU NIVEAU PRINCIPAL
            stage_data = {
                "id": stagiaire.id,
                "nom": stagiaire.nom,
                "prenom": stagiaire.prenom,
                "email": stagiaire.email,
                "telephone": stagiaire.telephone,
                "niveau_etude": stagiaire.niveau_etude,
                "specialite": stagiaire.specialite,
                "genre": stagiaire.genre,
                "type_stage": stagiaire.type_stage,
                "remunere": stagiaire.remunere,
                "montant_remuneration": stagiaire.montant_remuneration,
                "direction": stagiaire.direction,
                "service": stagiaire.service,
                "lieu_stage": stagiaire.lieu_stage,
                "date_accord": stagiaire.date_accord.isoformat() if stagiaire.date_accord else None,
            
                "date_debut": stagiaire.date_debut_fige.isoformat() if stagiaire.date_debut_fige else None,
                "date_fin": stagiaire.date_fin_fige.isoformat() if stagiaire.date_fin_fige else None,
                "duree_jours": stagiaire.duree_jours_fige or 0,
                "duree_mois": stagiaire.duree_mois_fige or 0,
                "statut_actuel": stagiaire.statut_actuel,
            
                "jours_restants": stagiaire.jours_restants,
                "superviseur": stagiaire.superviseur,
                "a_ete_renouvele": stagiaire.a_ete_renouvele,
                "stage_renouvele_id": stagiaire.stage_renouvele_id,
                
                # 🔥 AJOUT DE LA CONVENTION AU NIVEAU PRINCIPAL
                "convention": convention,
                
                # Informations de renouvellement
                "renouvellement": informations_renouvellement,
                "stage_renouvele": stage_renouvele_info,
                "historique_stages": historique_stages,
                
                # Documents (incluant la convention dans la liste aussi)
                "rapports": rapports,
                "documents": documents_stagiaire,
                "etablissement": {
                    "nom": stagiaire.etablissement.nom if stagiaire.etablissement else None,
                    "email": stagiaire.etablissement.email if stagiaire.etablissement else None,
                    "adresse": stagiaire.etablissement.adresse if stagiaire.etablissement else None,
                    "telephone": stagiaire.etablissement.telephone if stagiaire.etablissement else None,
                } if stagiaire.etablissement else None,
            }
            
            logger.info(f"✅ Stage data compilé avec succès pour le stagiaire {stagiaire.id}")
            logger.info(f"📊 Résumé: {len(rapports)} rapports, {len(documents_stagiaire)} documents, convention={'oui' if convention else 'non'}")
            
            return stage_data
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération des infos du stage {stagiaire.id}: {e}")
            import traceback
            logger.error(f"🔥 Traceback complet:\n{traceback.format_exc()}")
            return None

    def get_demande_documents(self, demande, request):
        """Récupère les documents de la demande seulement (CV, lettre, diplômes)"""
        documents = []
        
        try:
            if demande.cv:
                documents.append({
                    'nom': 'Curriculum Vitae (CV)',
                    'url': request.build_absolute_uri(demande.cv.url),
                    'type': 'cv',
                    'id': 'cv'
                })
                logger.info(f"✅ CV ajouté aux documents de la demande {demande.id}")
            
            if demande.lettre_motivation:
                documents.append({
                    'nom': 'Lettre de motivation',
                    'url': request.build_absolute_uri(demande.lettre_motivation.url),
                    'type': 'lettre_motivation',
                    'id': 'lettre_motivation'
                })
                logger.info(f"✅ Lettre de motivation ajoutée aux documents de la demande {demande.id}")
            
            # Diplômes de la demande
            diplomes_count = 0
            for diplome in demande.diplomes.all():
                
                documents.append({
                    'nom': 'Diplôme',
                    'url': request.build_absolute_uri(diplome.fichier.url),
                    'type': 'diplome',
                    'id': str(diplome.id)
                })
                diplomes_count += 1
            
            logger.info(f"✅ {diplomes_count} diplôme(s) ajouté(s) aux documents de la demande {demande.id}")
            logger.info(f"📄 Total documents de la demande: {len(documents)}")

        except Exception as e:
            logger.error(f"❌ Erreur générale dans get_demande_documents pour demande {demande.id}: {e}")
            import traceback
            logger.error(f"🔥 Traceback complet:\n{traceback.format_exc()}")
        
        return documents


@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class ModifierDemandeAPIView(APIView):
    permission_classes = [AllowAny]
    
    def put(self, request, tracking_id):
        try:
            demande = Demande.objects.get(tracking_id=tracking_id)
            data = request.data
            
            # Liste pour suivre les modifications
            modifications = []
            documents_ajoutes = []
            documents_supprimes = []
            photo_modifiee = False
            
            # Gestion de la photo de passeport
            if 'photo_passeport' in request.FILES:
                demande.photo_passeport = request.FILES['photo_passeport']
                photo_modifiee = True
                modifications.append("photo d'identité")
            
            # Gestion des documents
            if 'documents' in request.FILES:
                documents = request.FILES.getlist('documents')
                document_types = request.POST.getlist('document_types')
                replaces_existing = request.POST.getlist('replaces_existing')
                
                for i, document in enumerate(documents):
                    doc_type = document_types[i] if i < len(document_types) else 'autre'
                    replaces = replaces_existing[i] == 'true' if i < len(replaces_existing) else False
                    
                    if replaces:
                        if doc_type == 'cv':
                            if demande.cv:
                                demande.cv.delete(save=False)
                            demande.cv = document
                            modifications.append("CV remplacé")
                        elif doc_type == 'lettre_motivation':
                            if demande.lettre_motivation:
                                demande.lettre_motivation.delete(save=False)
                            demande.lettre_motivation = document
                            modifications.append("lettre de motivation remplacée")
                        elif doc_type == 'diplome':
                            Diplome.objects.create(demande=demande, fichier=document)
                            documents_ajoutes.append("diplôme")
                    else:
                        if doc_type == 'diplome':
                            Diplome.objects.create(demande=demande, fichier=document)
                            documents_ajoutes.append("diplôme")
                        elif doc_type == 'cv' and not demande.cv:
                            demande.cv = document
                            documents_ajoutes.append("CV")
                        elif doc_type == 'lettre_motivation' and not demande.lettre_motivation:
                            demande.lettre_motivation = document
                            documents_ajoutes.append("lettre de motivation")
            
            # Suppression des documents
            if 'documents_to_delete' in data:
                documents_to_delete = json.loads(data['documents_to_delete'])
                for doc_id in documents_to_delete:
                    try:
                        if doc_id == 'cv':
                            if demande.cv:
                                demande.cv.delete(save=False)
                                demande.cv = None
                                documents_supprimes.append("CV")
                        elif doc_id == 'lettre_motivation':
                            if demande.lettre_motivation:
                                demande.lettre_motivation.delete(save=False)
                                demande.lettre_motivation = None
                                documents_supprimes.append("lettre de motivation")
                        else:
                            diplome = Diplome.objects.get(id=doc_id, demande=demande)
                            nom_diplome = f"diplôme ({diplome.fichier.name})"
                            diplome.delete()
                            documents_supprimes.append(nom_diplome)
                    except Diplome.DoesNotExist:
                        pass
            
            # Sauvegarde de la demande
            demande.save()
            
            # 🔔 NOTIFICATIONS PUSH À TOUS LES UTILISATEURS
            if any([modifications, documents_ajoutes, documents_supprimes, photo_modifiee]):
                NotificationService.broadcast_modification_documents_demande(
                    demande=demande,
                    modifications=modifications,
                    documents_ajoutes=documents_ajoutes,
                    documents_supprimes=documents_supprimes,
                    photo_modifiee=photo_modifiee
                )
            
            return Response({
                'success': True,
                'message': 'Documents mis à jour avec succès',
                'modifications': {
                    'documents_ajoutes': documents_ajoutes,
                    'documents_supprimes': documents_supprimes,
                    'photo_modifiee': photo_modifiee
                },
                'demande': self.serialize_demande(demande, request)
            }, status=status.HTTP_200_OK)
            
        except Demande.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Demande non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur lors de la modification de la demande: {str(e)}")
            return Response({
                'success': False,
                'message': f"Erreur lors de la modification: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def serialize_demande(self, demande, request):
        suivi_view = SuiviDemandeAPIView()
        suivi_view.request = request
        
        photo_passeport_url = None
        if demande.photo_passeport:
            photo_passeport_url = request.build_absolute_uri(demande.photo_passeport.url)
        
        return {
            'tracking_id': demande.tracking_id,
            'statut_stage': demande.statut_stage,
            'date_soumission': demande.date_soumission.isoformat(),
            'date_maj': demande.date_maj.isoformat() if demande.date_maj else demande.date_soumission.isoformat(),
            'type_stage': demande.type_stage,
            'photo_passeport': photo_passeport_url,
            'stagiaire': {
                'nom': demande.etudiant_nom,
                'prenom': demande.etudiant_prenom,
                'email': demande.etudiant_email,
                'telephone': demande.etudiant_telephone,
                'adresse': demande.etudiant_adresse,
                'specialite': demande.etudiant_specialite,
                'niveau': demande.etudiant_niveau,
                'genre': demande.genre,
                'pays_residence': demande.pays_residence,
            },
            'etablissement': {
                'nom': demande.etablissement.nom if demande.etablissement else None,
                'email': demande.etablissement.email if demande.etablissement else None,
                'adresse': demande.etablissement.adresse if demande.etablissement else None,
                'telephone': demande.etablissement.telephone if demande.etablissement else None,
            } if demande.etablissement else None,
            'documents': suivi_view.get_documents(demande)
        }

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class CreerDemandeAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            data = request.data

            # Validation des champs obligatoires
            validation_error = self._validate_required_fields(data)
            if validation_error:
                return validation_error

            # Mapping et récupération des données
            donnees_demande = self._map_frontend_to_backend(data)

            # Gestion de l'établissement (si stage académique)
            etablissement = self._handle_etablissement(data)

            # Création de la demande
            demande = Demande.objects.create(
                **donnees_demande,
                etablissement=etablissement,
                photo_passeport=request.FILES.get("photoPasseport"),
                cv=request.FILES.get("cv"),
                lettre_motivation=request.FILES.get("lettreMotivation"),
            )

            # Gestion des diplômes multiples
            self._handle_diplomes(request, demande)

            # Génération du résumé CV (asynchrone)
            if demande.cv:
                self._generate_cv_resume(demande)

            # 📧 Envoi des emails
            self._send_confirmation_emails(demande)

            return Response({
                "message": "Demande créée avec succès",
                "tracking_id": demande.tracking_id,
                "suivi_url": f"/api/suivi-demande/{demande.tracking_id}/",
                "resume_status": "En cours de génération" if demande.cv else "Non applicable"
            }, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            logger.error(f"❌ Erreur d'intégrité: {e}")
            return Response({
                "error": "Erreur de base de données",
                "details": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(f"❌ Erreur création demande: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                "error": "Une erreur est survenue lors de la création de la demande",
                "details": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    def _validate_required_fields(self, data):
        """Valide les champs obligatoires"""
        champs_obligatoires = ['nom', 'prenom', 'email', 'telephone', 'domaine']
        
        for champ in champs_obligatoires:
            if not data.get(champ):
                return Response({
                    "error": f"Le champ {champ} est obligatoire"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return None

    def _map_frontend_to_backend(self, data):
        """Mappe les champs frontend vers backend"""
        mapping_champs = {
            'nom': 'etudiant_nom',
            'prenom': 'etudiant_prenom',
            'email': 'etudiant_email',
            'telephone': 'etudiant_telephone',
            'domaine': 'etudiant_specialite',
            'niveauEtude': 'etudiant_niveau',
            'typeStage': 'type_stage',
            'paysResidence': 'pays_residence',
            'genre': 'genre',
            'adresse': 'etudiant_adresse'
        }
        
        donnees_demande = {}
        for champ_front, champ_back in mapping_champs.items():
            if data.get(champ_front):
                donnees_demande[champ_back] = data.get(champ_front)
        
        return donnees_demande

    def _handle_etablissement(self, data):
        """Gère la création/mise à jour de l'établissement"""
        if data.get("typeStage") != "Académique":
            return None
        
        nom_ecole = data.get("nomEcole")
        if not nom_ecole:
            return None

        etablissement, created = Etablissement.objects.get_or_create(
            nom=nom_ecole,
            defaults={
                'email': data.get("emailEcole", ""),
                'adresse': data.get("adresseEcole", ""),
                'telephone': data.get("telephoneEcole", "")
            }
        )
        
        if not created:
            # Mise à jour des infos si l'établissement existe
            etablissement.email = data.get("emailEcole", etablissement.email)
            etablissement.adresse = data.get("adresseEcole", etablissement.adresse)
            etablissement.telephone = data.get("telephoneEcole", etablissement.telephone)
            etablissement.save()
        
        return etablissement

    def _handle_diplomes(self, request, demande):
        """Gère les fichiers de diplômes multiples"""
        diplomes_files = request.FILES.getlist("diplomes")
        
        for diplome_file in diplomes_files:
            Diplome.objects.create(
                demande=demande,
                fichier=diplome_file
            )
        
        if diplomes_files:
            logger.info(f"📄 {len(diplomes_files)} diplôme(s) ajouté(s)")

    def _generate_cv_resume(self, demande):
        """Lance la génération du résumé CV en arrière-plan"""
        try:
            logger.info("🧪 Démarrage génération résumé CV")
            logger.info(f"📂 Chemin CV : {demande.cv.path}")
            
            ResumeGeneratorService.generate_resume_async(demande.id)
            
            logger.info("🔄 Génération du résumé lancée en arrière-plan")
            
        except Exception as e:
            logger.error(f"❌ Erreur lancement génération résumé: {e}")

    def _send_confirmation_emails(self, demande):
        """
        ✅ Envoie les emails de confirmation
        - Email au candidat
        - Email aux administrateurs
        """
        # 📧 Email de confirmation au candidat
        try:
            EmailSenderService.send_confirmation_demande(
                demande=demande,
                async_send=True
            )
            logger.info(f"✅ Email confirmation candidat envoyé à {demande.etudiant_email}")
        except Exception as e:
            logger.error(f"❌ Erreur email confirmation candidat: {e}")

        # 📧 Email de notification aux administrateurs
        try:
            self._notify_admins_new_demande(demande)
        except Exception as e:
            logger.error(f"❌ Erreur notification admins: {e}")

    def _notify_admins_new_demande(self, demande):
        """
        ✅ Notifie les administrateurs de la nouvelle demande
        Envoie un email groupé à tous les admins
        """
        # Récupérer tous les administrateurs actifs
        admins = Utilisateur.objects.filter(
            role='admin',
            is_active=True,
            email__isnull=False
        ).exclude(email='')

        if not admins.exists():
            logger.warning("⚠️ Aucun administrateur trouvé pour notification")
            return

        # Envoyer l'email de notification
        emails_admins = [admin.email for admin in admins]
        
        success = EmailSenderService.send_new_demande_notification_to_admins(
            demande=demande,
            admin_emails=emails_admins,
            async_send=True
        )

        if success:
            logger.info(
                f"✅ Notification nouvelle demande envoyée à "
                f"{len(emails_admins)} administrateur(s)"
            )
        else:
            logger.warning(f"⚠️ Échec notification admins")

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class RefuserDemandeAPI(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        raison_refus = request.data.get("raison_refus", "").strip()

        if not raison_refus:
            return Response(
                {"status": "error", "message": "Veuillez indiquer le motif du refus."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupération de la demande
        demande = get_object_or_404(Demande, id=demande_id)

        # Sauvegarde de l'ancien statut pour l'email
        ancien_statut = demande.statut_stage

        # Mise à jour de la demande
        demande.statut_stage = "Refusée"
        demande.raison_refus = raison_refus
        demande.traiter_candidature = True
        demande.save()

        # ✅ ENVOI EMAIL SIMPLIFIÉ via le service
        try:
            email_envoye = EmailSenderService.send_refus(
                demande=demande,
                async_send=True
            )
            logger.info(f"✅ Email refus envoyé à {demande.etudiant_email}: {email_envoye}")
        except Exception as e:
            logger.error(f"❌ Erreur envoi email refus: {e}")
            email_envoye = False

        # 🔔 NOTIFICATION PUSH
        try:
            NotificationService.notifier_refus_demande(demande, request.user, raison_refus)
        except Exception as e:
            logger.error(f"❌ Erreur notification refus: {e}")

        return Response(
            {
                "status": "success", 
                "message": "La candidature a été refusée avec succès.",
                "email_envoye": email_envoye
            },
            status=status.HTTP_200_OK,
        )

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandeDetailAPI(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Récupère les détails d'une demande spécifique"""
        try:
            # ✅ CORRECTION: Ajouter 'convention_temporaire' dans select_related
            demande = get_object_or_404(
                Demande.objects.select_related('etablissement', 'convention_temporaire'),
                pk=pk
            )
            
            # Vérifier si l'utilisateur a accès à cette demande
            if not self.has_access_to_demande(request.user, demande):
                return Response(
                    {"error": "Accès non autorisé à cette demande"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Vérifier entretien
            existe_entretien = Entretien.objects.filter(demandeur=demande).exists()

            def build_full_url(file_field):
                if file_field:
                    return request.build_absolute_uri(file_field.url)
                return None

            # ✅ CORRECTION: Récupérer les documents de base
            documents = self.get_documents_with_status(request, demande)
            
            # ✅ CORRECTION: Ajouter la convention temporaire si elle existe
            if demande.convention_temporaire and demande.convention_temporaire.fichier:
                convention = demande.convention_temporaire
                documents.append({
                    "id": convention.id,
                    "nom": "Convention à signer (PDF)",
                    "url": request.build_absolute_uri(convention.fichier.url),
                    "statut": "new",
                    "date_upload": convention.date_creation,
                    "est_modifie": False
                })

            response_data = {
                "id": demande.id,
                "tracking_id": demande.tracking_id,
                "date_soumission": demande.date_soumission,
                "statut_stage": demande.statut_stage,
                "type_stage": demande.type_stage,
                "est_archivee": demande.est_archivee,
                
                "score_ia": demande.score_ia,
                "score_details": demande.score_details,
                "score_commentaire": demande.score_commentaire,
                "score_date": demande.score_date,
                "raison_refus": demande.raison_refus,
                
                # ✅ CORRECTION: URL de la convention temporaire
                "convention_temporaire_url": (
                    request.build_absolute_uri(demande.convention_temporaire.fichier.url) 
                    if demande.convention_temporaire and demande.convention_temporaire.fichier 
                    else None
                ),

                "etudiant": {
                    "prenom": demande.etudiant_prenom,
                    "nom": demande.etudiant_nom,
                    "genre": demande.genre,
                    "email": demande.etudiant_email,
                    "telephone": demande.etudiant_telephone,
                    "adresse": demande.etudiant_adresse,
                    "niveau": demande.etudiant_niveau,
                    "specialite": demande.etudiant_specialite,
                    "pays_residence": demande.pays_residence,
                    "photo_passeport": build_full_url(demande.photo_passeport),
                    "resume_cv": demande.resume_cv,
                },
                
                "etablissement": {
                    "name": demande.etablissement.nom if demande.etablissement else None,
                    "location": demande.etablissement.adresse if demande.etablissement else None,
                    "email": demande.etablissement.email if demande.etablissement else None,
                    "phone": demande.etablissement.telephone if demande.etablissement else None,
                },

                "documents": documents,
                "existe_entretien": existe_entretien
            }
            
            return Response(response_data)

        except Exception as e:
            logger.error(f"Erreur détail demande {pk}: {str(e)}")
            return Response(
                {"error": "Erreur lors de la récupération des détails"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def patch(self, request, pk):
        """Met à jour le résumé CV de l'étudiant"""
        try:
            demande = get_object_or_404(Demande, pk=pk)
            
            # Vérifier les permissions
            if not self.has_edit_permission(request.user, demande):
                return Response(
                    {'error': 'Permission de modification refusée'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            resume_cv = request.data.get('resume_cv')
            if resume_cv is None:
                return Response(
                    {'error': 'Le champ resume_cv est requis'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Mettre à jour le résumé
            demande.resume_cv = resume_cv
            demande.save()

            return Response({
                'message': 'Résumé mis à jour avec succès',
                'resume_cv': demande.resume_cv
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur modification résumé demande {pk}: {str(e)}")
            return Response(
                {'error': 'Erreur lors de la mise à jour du résumé'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_documents_with_status(self, request, demande):
        """Retourne les documents avec leur statut - VERSION SIMPLIFIEE"""
        try:
            # Essayer d'appeler la méthode du modèle
            if hasattr(demande, 'get_documents_with_status'):
                documents_with_status = demande.get_documents_with_status(request.user)
                updated_docs = []
                
                for doc in documents_with_status:
                    updated_docs.append({
                        "id": doc.get("document_history_id"),
                        "nom": doc.get("nom"),
                        "url": request.build_absolute_uri(doc.get("url")) if doc.get("url") else None,
                        "statut": doc.get("statut", "existing"),
                        "date_upload": doc.get("date_upload"),
                        "est_modifie": doc.get("est_modifie", False)
                    })
                return updated_docs
            else:
                # Fallback si la méthode n'existe pas
                return self.get_documents_fallback(request, demande)
                
        except Exception as e:
            logger.error(f"Erreur récupération documents demande {demande.id}: {str(e)}")
            return self.get_documents_fallback(request, demande)

    def get_documents_fallback(self, request, demande):
        """Méthode de fallback pour récupérer les documents"""
        try:
            # Récupérer tous les FileField du modèle Demande
            documents = []
            
            # Liste des champs de fichiers potentiels
            file_fields = [
                ('photo_passeport', 'Photo passeport'),
                ('cv', 'CV'),
                ('lettre_motivation', 'Lettre de motivation'),
                ('releve_notes', 'Relevé de notes'),
                ('diplome', 'Diplôme'),
                # Ajoutez d'autres champs de fichiers ici
            ]
            
            for field_name, display_name in file_fields:
                file_field = getattr(demande, field_name, None)
                if file_field and file_field.name:  # Vérifier si le fichier existe
                    documents.append({
                        "id": None,
                        "nom": display_name,
                        "url": request.build_absolute_uri(file_field.url),
                        "statut": "existing",
                        "date_upload": demande.date_soumission,
                        "est_modifie": False
                    })
            
            return documents
            
        except Exception as e:
            logger.error(f"Erreur fallback documents: {str(e)}")
            return []

    def has_access_to_demande(self, user, demande):
        """Vérifie si l'utilisateur a accès à la demande"""
        return user.is_authenticated

    def has_edit_permission(self, user, demande):
        """Vérifie si l'utilisateur peut modifier la demande"""
        return user.is_authenticated
    

@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class DemanderAttestationAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, tracking_id=None):
        """Permet à un stagiaire de demander son attestation de stage"""
        
        # Récupération du tracking_id
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
            demande = Demande.objects.select_related('stagiaire').get(tracking_id=tracking_id)
            
            # Vérifier si la demande a un stagiaire associé
            if not hasattr(demande, 'stagiaire') or not demande.stagiaire:
                return Response({
                    "success": False,
                    "message": "Aucun stage associé à cette demande."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            stagiaire = demande.stagiaire
            
            # Vérifier si le stage est en cours ou terminé
            if stagiaire.statut_actuel not in ["Actuel", "Terminé"]:
                return Response({
                    "success": False,
                    "message": "Vous ne pouvez demander une attestation que pour un stage en cours ou terminé."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier qu'au moins un rapport a été ajouté
            if not stagiaire.rapports.exists():
                return Response({
                    "success": False,
                    "message": "Vous devez avoir soumis au moins un rapport de stage avant de demander une attestation."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si une attestation n'existe pas déjà
            if hasattr(stagiaire, 'attestation') and stagiaire.attestation and stagiaire.attestation.fichier:
                return Response({
                    "success": False,
                    "message": "Une attestation a déjà été générée pour ce stage. Consultez vos documents."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si une demande n'est pas déjà en cours
            demande_existante = stagiaire.demandes_attestation.filter(
                statut__in=['en_attente', 'en_traitement']
            ).first()
            
            if demande_existante:
                return Response({
                    "success": False,
                    "message": f"Une demande d'attestation est déjà en cours (statut: {demande_existante.get_statut_display()})."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Récupérer le fichier de demande
            fichier_demande = request.FILES.get('fichier_demande')
            
            if not fichier_demande:
                return Response({
                    "success": False,
                    "message": "Le document de demande est requis."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validation du fichier
            max_size = 10 * 1024 * 1024  # 10MB
            allowed_types = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            
            if fichier_demande.size > max_size:
                return Response({
                    "success": False,
                    "message": "Le fichier est trop volumineux (max 10MB)."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if fichier_demande.content_type not in allowed_types:
                return Response({
                    "success": False,
                    "message": "Format de fichier non supporté. Utilisez PDF, DOC ou DOCX."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Créer la demande d'attestation avec transaction
            with transaction.atomic():
                from ..models import DemandeAttestation
                
                demande_attestation = DemandeAttestation.objects.create(
                    stagiaire=stagiaire,
                    fichier_demande=fichier_demande,
                    statut='en_attente'
                )
                
                # 📧 Envoyer email de confirmation au stagiaire
                try:
                    email_data = StageEmailTemplates.demande_attestation_confirmation(
                        stagiaire=stagiaire,
                        demande_attestation=demande_attestation
                    )
                    EmailSenderService.send_email(
                        to_email=stagiaire.email,
                        subject=email_data['subject'],
                        html_content=email_data['html'],
                        text_content=email_data['text'],
                        async_send=True
                    )
                    logger.info(f"✅ Email confirmation demande attestation envoyé à {stagiaire.email}")
                except Exception as e:
                    logger.error(f"❌ Erreur envoi email confirmation demande attestation: {e}")
                
                # 🔔 Notifier les administrateurs
                try:
                    NotificationService.notifier_nouvelle_demande_attestation(
                        stagiaire=stagiaire,
                        demande_attestation=demande_attestation
                    )
                    logger.info(f"✅ Notification demande attestation envoyée aux admins")
                except Exception as e:
                    logger.error(f"❌ Erreur notification demande attestation: {e}")
            
            # Mettre à jour la demande pour inclure la demande d'attestation
            demande.refresh_from_db()
            stagiaire.refresh_from_db()
            
            # Construire la réponse mise à jour
            stage_info = self.get_stage_info_with_demande_attestation(stagiaire, request)
            
            return Response({
                "success": True,
                "message": "Votre demande d'attestation a été soumise avec succès. Vous serez notifié par email dès qu'elle sera traitée.",
                "demande": {
                    "tracking_id": demande.tracking_id,
                    "stage": stage_info
                }
            }, status=status.HTTP_201_CREATED)
            
        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Aucune demande trouvée pour ce tracking_id."
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur lors de la demande d'attestation pour {tracking_id}: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                "success": False,
                "message": "Une erreur est survenue lors de la soumission de votre demande."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_stage_info_with_demande_attestation(self, stagiaire, request):
        """Récupère les infos du stage avec la demande d'attestation"""
        try:
            # Récupérer la dernière demande d'attestation
            demande_attestation = stagiaire.demandes_attestation.order_by('-date_demande').first()
            
            demande_attestation_data = None
            if demande_attestation:
                demande_attestation_data = {
                    "date_demande": demande_attestation.date_demande.isoformat(),
                    "statut": demande_attestation.statut,
                    "fichier_url": request.build_absolute_uri(demande_attestation.fichier_demande.url) if demande_attestation.fichier_demande else None,
                    "motif_refus": demande_attestation.motif_refus if demande_attestation.statut == 'refusee' else None
                }
            
            # Récupérer les autres infos du stage
            rapports = []
            for rapport in stagiaire.rapports.all():
                if rapport.fichier:
                    rapports.append({
                        "titre": rapport.titre,
                        "date_ajout": rapport.date_ajout.isoformat() if rapport.date_ajout else None,
                        "fichier_url": request.build_absolute_uri(rapport.fichier.url),
                    })
            
            attestation = None
            if hasattr(stagiaire, 'attestation') and stagiaire.attestation and stagiaire.attestation.fichier:
                attestation = {
                    "date_generation": stagiaire.attestation.date_generation.isoformat() if stagiaire.attestation.date_generation else None,
                    "fichier_url": request.build_absolute_uri(stagiaire.attestation.fichier.url),
                }
            
            return {
                "id": stagiaire.id,
                "nom": stagiaire.nom,
                "prenom": stagiaire.prenom,
                "statut_actuel": stagiaire.statut_actuel,
                "date_debut": stagiaire.date_debut.isoformat() if stagiaire.date_debut else None,
                "date_fin": stagiaire.date_fin.isoformat() if stagiaire.date_fin else None,
                "rapports": rapports,
                "attestation": attestation,
                "demande_attestation": demande_attestation_data
            }
        except Exception as e:
            logger.error(f"Erreur récupération infos stage: {e}")
            return None

@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class PreAccepterDemandeAPIView(APIView):
    """Étape 1: Pré-acceptation sans créer de stagiaire"""
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupération sécurisée
                demande = get_object_or_404(
                    Demande.objects.select_related('etablissement')
                                 .prefetch_related('diplomes'),
                    id=demande_id
                )

                # Vérification des permissions
                if not self.has_accept_permission(request.user, demande):
                    return Response({
                        "success": False,
                        "message": "Vous n'avez pas la permission de pré-accepter cette demande."
                    }, status=status.HTTP_403_FORBIDDEN)

                # Vérifier si déjà pré-acceptée ou acceptée
                if demande.statut_stage in ["Pré-acceptée", "Acceptée"]:
                    return Response({
                        "success": False,
                        "message": "Cette demande a déjà été traitée."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Utiliser les mêmes méthodes de validation que AccepterDemandeAPIView
                data = request.data
                validation_result = self.validate_acceptance_data(data)
                if not validation_result["success"]:
                    return Response(validation_result, status=status.HTTP_400_BAD_REQUEST)

                # Extraction et validation des données
                donnees_validees = self.valider_et_preparer_donnees(request, data)
                if not donnees_validees["success"]:
                    return Response(donnees_validees, status=status.HTTP_400_BAD_REQUEST)

                donnees = donnees_validees["donnees"]

                # Génération du PDF temporaire (sans stagiaire) AVANT de sauvegarder
                pdf_genere, convention_temporaire = self.generer_pdf_temporaire(demande, donnees)
                
                if pdf_genere and convention_temporaire:
                    # Sauvegarde des données APRÈS la génération réussie
                    demande.donnees_pre_acceptation = donnees
                    demande.statut_stage = "Pré-acceptée"
                    demande.date_pre_acceptation = timezone.now()
                    demande.convention_temporaire = convention_temporaire
                    demande.save()
                else:
                    # Si la génération échoue, ne pas sauvegarder
                    return Response({
                        "success": False,
                        "message": "Échec de la génération de la convention PDF."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                # 🔔 NOTIFICATION PUSH - Pré-acceptation
                try:
                    # Calculer la durée en mois pour la notification
                    date_debut = datetime.strptime(donnees["date_debut"], "%d/%m/%Y").date()
                    date_fin = datetime.strptime(donnees["date_fin"], "%d/%m/%Y").date()
                    duree_mois = self.calculer_duree_mois_temporaire(donnees["date_debut"], donnees["date_fin"])
                    
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
                    NotificationService.notifier_pre_acceptation_demande(
                        demande, 
                        request.user, 
                        donnees_notif
                    )
                    
                    # Notification spécifique pour la convention générée
                    if convention_temporaire:
                        NotificationService.notifier_convention_temporaire_generee(
                            demande,
                            request.user,
                            convention_temporaire
                        )
                    
                    # Broadcast à tous les autres utilisateurs
                    NotificationService.broadcast_pre_acceptation_demande(
                        demande,
                        request.user,
                        donnees_notif
                    )
                    
                    logger.info(f"🔔 Notifications pré-acceptation envoyées pour demande #{demande.tracking_id}")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur lors de l'envoi des notifications: {e}", exc_info=True)
                    # Ne pas bloquer le processus si les notifications échouent

                # Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Pré-acceptation demande {demande.tracking_id}",
                    performed_by=request.user
                )

                # Vérifier que le fichier existe avant de retourner l'URL
                pdf_url = None
                if convention_temporaire and convention_temporaire.fichier and convention_temporaire.fichier.name:
                    pdf_url = request.build_absolute_uri(convention_temporaire.fichier.url)
                
                # Réponse
                response_data = {
                    "success": True,
                    "message": "Demande pré-acceptée avec succès. Téléchargez la convention pour signature.",
                    "pdf_genere": pdf_genere,
                    "pdf_url": pdf_url,
                    "convention_temporaire_id": convention_temporaire.id if convention_temporaire else None,
                    "notifications_envoyees": True,
                    "demande": {
                        "id": demande.id,
                        "tracking_id": demande.tracking_id,
                        "statut": demande.statut_stage,
                        "date_pre_acceptation": demande.date_pre_acceptation.isoformat() if demande.date_pre_acceptation else None,
                    }
                }

                logger.info(f"✅ Demande {demande_id} pré-acceptée par {request.user.email}")
                return Response(response_data, status=status.HTTP_200_OK)

        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Demande non trouvée."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur pré-acceptation demande {demande_id}: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "message": f"Erreur lors de la pré-acceptation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def generer_pdf_temporaire(self, demande, donnees):
        """Génère un PDF temporaire sans créer de stagiaire"""
        try:
            # Création d'une convention temporaire avec demande liée
            convention = ConventionStage.objects.create(
                est_temporaire=True,
                demande=demande,  # Lien direct vers la demande
                stagiaire=None,   # Pas de stagiaire pour le moment
                numero_convention=f"TEMP-{demande.tracking_id}-{int(time.time())}"
            )
            
            # Appel correct à la méthode de génération
            pdf_genere = self.generer_pdf_avec_donnees_temporaires(convention, demande, donnees)
            
            if pdf_genere:
                return True, convention
            else:
                # Si la génération échoue, supprimer la convention créée
                convention.delete()
                return False, None
                
        except Exception as e:
            logger.error(f"Erreur génération PDF temporaire: {str(e)}")
            import traceback
            traceback.print_exc()
            return False, None

    def generer_pdf_avec_donnees_temporaires(self, convention, demande, donnees):
        """Adaptation de la méthode existante pour données temporaires"""
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
            
            # Styles personnalisés - IDENTIQUE à l'original
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
            elements.append(Spacer(1, 6*cm))
            elements.append(Spacer(1, 20))
            
            # --- Title ---
            elements.append(Paragraph("<b><u>AUTORISATION DE STAGE</u></b>", styles["CenterTitle"]))
            elements.append(Spacer(1, 20))
            
            # --- Calcul de la durée du stage ---
            duree_mois = self.calculer_duree_mois_temporaire(donnees["date_debut"], donnees["date_fin"])
            
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
            
            # --- Texte principal - FORMAT ORIGINAL ---
            texte_autorisation = (
                f"Monsieur <b>{demande.etudiant_nom.upper()} {demande.etudiant_prenom}</b> est autorisé à effectuer un stage à la CEB "
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
            
            # Rémunération (conditionnelle) - FORMAT ORIGINAL
            if donnees.get("remunere", False):
                montant = donnees.get("montant", 0)
                montant_formate = f"{montant:,}".replace(",", " ")
                texte_remuneration = (
                    f"Conformément à la décision Nº236/CEB/DG/DARH/SAA/SASR/2020 portant Révision des indemnités "
                    f"forfaitaires de Stage en date du 3 septembre 2020, Monsieur <b>{demande.etudiant_nom.upper()} {demande.etudiant_prenom}</b> "
                    f"bénéficie au cours de son stage d'une indemnité forfaitaire mensuelle nette de "
                    f"<b>{montant_formate} FRANCS CFA</b>."
                )
                elements.append(Paragraph(texte_remuneration, styles["Justify"]))
            
            elements.append(Spacer(1, 40))
            
            # --- Signature - FORMAT ORIGINAL ---
            elements.append(Spacer(1, 40))
            elements.append(Paragraph("Le Directeur Général", styles["Signature"]))
            elements.append(Spacer(1, 20))
            elements.append(Paragraph("<b>Dr. Karimou CHABI SIKA</b>", styles["Signature"]))
            
            # --- Pied de page - SEULEMENT l'information "CONVENTION TEMPORAIRE" ---
            elements.append(Spacer(1, 60))
            elements.append(Paragraph(f"<i><font color='blue'>CONVENTION TEMPORAIRE - Réf: {convention.numero_convention}</font></i>", 
                                   ParagraphStyle(name="Footer", fontSize=8, alignment=TA_CENTER, 
                                                 textColor=colors.blue, spaceBefore=20)))
            
            # Générer le PDF
            doc.build(elements)
            
            # Sauvegarde du fichier
            pdf_content = buffer.getvalue()
            buffer.close()
            
            nom_fichier = f"convention_temporaire_{demande.tracking_id}_{int(time.time())}.pdf"
            convention.fichier.save(nom_fichier, ContentFile(pdf_content), save=True)
            
            logger.info(f"Convention temporaire PDF générée: {nom_fichier}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur génération PDF temporaire: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def validate_acceptance_data(self, data):
        """Valide les données d'acceptation - Réutilisée depuis AccepterDemandeAPIView"""
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
        """Parse et valide les dates - Réutilisée depuis AccepterDemandeAPIView"""
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

        today = timezone.now().date()
        if date_debut < today:
            return {
                "success": False,
                "message": "La date de début ne peut pas être dans le passé."
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
        """Valide le montant de rémunération - Réutilisée depuis AccepterDemandeAPIView"""
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

    def valider_et_preparer_donnees(self, request, data):
        """Valide et prépare les données pour la pré-acceptation"""
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
                "date_pre_acceptation": timezone.now().isoformat(),
                "user_id": user.id if user and hasattr(user, "id") else None,
                "user_email": user.email if user and hasattr(user, "email") else None,
                "etudiant_info": {
                    "nom": data.get("etudiant_nom", ""),
                    "prenom": data.get("etudiant_prenom", ""),
                    "email": data.get("etudiant_email", ""),
                    "specialite": data.get("etudiant_specialite", "")
                }
            }
            
            return {
                "success": True,
                "donnees": donnees
            }
            
        except Exception as e:
            logger.error(f"Erreur préparation données: {str(e)}")
            return {
                "success": False,
                "message": f"Erreur de préparation des données: {str(e)}"
            }

    def calculer_duree_mois_temporaire(self, date_debut_str, date_fin_str):
        """Calculer la durée du stage en mois pour l'autorisation temporaire"""
        try:
            from datetime import datetime
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
            from datetime import datetime
            date_obj = datetime.strptime(date_str, "%d/%m/%Y").date()
            
            # Dictionnaire des mois en français
            mois_francais = {
                1: "janvier", 2: "février", 3: "mars", 4: "avril",
                5: "mai", 6: "juin", 7: "juillet", 8: "août",
                9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
            }
            
            jour = date_obj.day
            mois = date_obj.month
            annee = date_obj.year
            
            # Gérer "1er" pour le premier jour
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
        
        # Convertir le nombre en lettres
        duree_lettres = self.nombre_en_lettres_simple(duree_mois)
        
        # Formater en deux chiffres
        duree_chiffres = f"{duree_mois:02d}"
        
        # Mettre la première lettre en majuscule
        duree_lettres = duree_lettres.capitalize()
        
        return f"{duree_lettres}({duree_chiffres})"

    def has_accept_permission(self, user, demande):
        """Vérifie si l'utilisateur peut pré-accepter la demande"""
        return user.is_authenticated and user.has_perm('stages.change_demande')
    
@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class FinaliserAcceptationAPIView(APIView):
    """Étape 2: Finalisation avec upload du PDF signé"""
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # ✅ CORRECTION: Récupération avec toutes les relations nécessaires
                demande = get_object_or_404(
                    Demande.objects.select_related('etablissement')
                                 .prefetch_related('diplomes', 'conventions_temporaires'),
                    id=demande_id
                )

                # Vérification que la demande est pré-acceptée
                if demande.statut_stage != "Pré-acceptée":
                    return Response({
                        "success": False,
                        "message": "Cette demande n'est pas en état de pré-acceptation."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Vérification du fichier signé
                fichier_signe = request.FILES.get('fichier_signe')
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

                # Récupération des données de pré-acceptation
                if not demande.donnees_pre_acceptation:
                    return Response({
                        "success": False,
                        "message": "Données de pré-acceptation manquantes."
                    }, status=status.HTTP_400_BAD_REQUEST)

                donnees = demande.donnees_pre_acceptation

                # Création du stagiaire final
                stagiaire = self.creer_stagiaire_final(demande, donnees)
                
                # ✅ CORRECTION: Création de la convention définitive avec le PDF signé
                convention_definitive = ConventionStage.objects.create(
                    stagiaire=stagiaire,
                    est_temporaire=False
                )
                
                # Sauvegarde du PDF signé
                nom_fichier = f"convention_signee_{stagiaire.nom}_{stagiaire.prenom}_{convention_definitive.numero_convention}.pdf"
                convention_definitive.fichier.save(nom_fichier, fichier_signe, save=True)

                # Mise à jour de la demande
                demande.statut_stage = "Acceptée"
                demande.traiter_candidature = True
                
                # ✅ CORRECTION: Gestion de la convention temporaire
                convention_temporaire = demande.get_convention_temporaire()
                if convention_temporaire:
                    # Option 1: Supprimer la convention temporaire
                    # convention_temporaire.delete()
                    
                    # Option 2: Conserver mais marquer comme obsolète
                    convention_temporaire.est_temporaire = False  # On la conserve pour historique
                    convention_temporaire.save()
                
                demande.save()

                # ✅ CORRECTION: Ajout de la convention aux documents de la demande
                self.ajouter_convention_aux_documents(demande, convention_definitive)

                # Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Finalisation acceptation {demande.tracking_id} - Stagiaire #{stagiaire.id}",
                    performed_by=request.user
                )

                # ✅ CORRECTION: Récupération de l'URL du fichier pour l'email
                fichier_url = None
                fichier_chemin = None
                if convention_definitive.fichier and convention_definitive.fichier.name:
                    fichier_url = request.build_absolute_uri(convention_definitive.fichier.url)
                    fichier_chemin = convention_definitive.fichier.path

                # ✅ CORRECTION: Envoi des notifications et emails AVEC la convention jointe
                email_envoye = self.envoyer_notifications_finalisation(
                    stagiaire, 
                    demande, 
                    request.user, 
                    fichier_chemin  # Passer le chemin du fichier
                )

                # Réponse
                response_data = {
                    "success": True,
                    "message": "Acceptation finalisée avec succès. Le stagiaire a été créé.",
                    "email_envoye": email_envoye,
                    "stagiaire": {
                        "id": stagiaire.id,
                        "nom": stagiaire.nom,
                        "prenom": stagiaire.prenom,
                        "type_stage": stagiaire.type_stage,
                        "statut": stagiaire.statut,
                        "date_debut": stagiaire.date_debut.strftime('%d/%m/%Y'),
                        "date_fin": stagiaire.date_fin.strftime('%d/%m/%Y'),
                        "direction": stagiaire.direction,
                        "service": stagiaire.service,
                        "superviseur": stagiaire.superviseur,
                    },
                    "convention": {
                        "id": convention_definitive.id,
                        "numero_convention": convention_definitive.numero_convention,
                        "fichier_url": fichier_url,
                        "date_creation": convention_definitive.date_creation.strftime('%d/%m/%Y')
                    }
                }

                logger.info(f"Demande {demande_id} finalisée par {request.user.email}")
                return Response(response_data, status=status.HTTP_201_CREATED)

        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Demande non trouvée."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Erreur finalisation demande {demande_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                "success": False,
                "message": f"Erreur lors de la finalisation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def creer_stagiaire_final(self, demande, donnees):
        """Crée le stagiaire final à partir des données de pré-acceptation"""
        # Parse des dates
        from datetime import datetime
        try:
            date_debut = datetime.strptime(donnees.get("date_debut"), "%d/%m/%Y").date()
            date_fin = datetime.strptime(donnees.get("date_fin"), "%d/%m/%Y").date()
        except:
            # Fallback au format ISO
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

        # ✅ CORRECTION: Vérifier si un stagiaire existe déjà pour cette demande
        try:
            # Essayer de récupérer un stagiaire existant
            stagiaire_existant = Stagiaire.objects.get(demande=demande)
            logger.info(f"Stagiaire existant trouvé pour demande {demande.id}: {stagiaire_existant.id}")
            return stagiaire_existant
        except Stagiaire.DoesNotExist:
            # Création d'un nouveau stagiaire
            pass

        # ✅ CORRECTION: Création du stagiaire avec toutes les données
        stagiaire = Stagiaire.objects.create(
            demande=demande,
            photo_passeport=demande.photo_passeport,
            nom=demande.etudiant_nom,
            prenom=demande.etudiant_prenom,
            email=demande.etudiant_email,
            telephone=demande.etudiant_telephone,
            niveau_etude=demande.etudiant_niveau,
            specialite=demande.etudiant_specialite,
            adresse=demande.etudiant_adresse,
            genre=demande.genre,
            pays_residence=demande.pays_residence,
            etablissement=demande.etablissement,
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
            cv=demande.cv,
            lettre_motivation=demande.lettre_motivation,
            resume_cv=demande.resume_cv,
        )

        # ✅ CORRECTION: Copie des diplômes - IDENTIQUE À AccepterDemandeAPIView
        diplomes_copies = self.copier_diplomes_vers_stagiaire(demande, stagiaire)
        logger.info(f"{diplomes_copies} diplôme(s) copié(s) pour le stagiaire {stagiaire.id}")

        return stagiaire

    def copier_diplomes_vers_stagiaire(self, demande, stagiaire):
        """Copie tous les diplômes de la demande vers le stagiaire - IDENTIQUE À AccepterDemandeAPIView"""
        try:
            diplomes_copies = 0
            
            # ✅ MÊME LOGIQUE QUE AccepterDemandeAPIView
            if hasattr(Stagiaire, 'diplomes'):
                for diplome_demande in demande.diplomes.all():
                    Diplome.objects.create(
                        stagiaire=stagiaire,
                        fichier=diplome_demande.fichier,
                        date_upload=timezone.now()
                    )
                    diplomes_copies += 1
                    
            elif hasattr(stagiaire, 'diplome'):
                premier_diplome = demande.diplomes.first()
                if premier_diplome:
                    stagiaire.diplome = premier_diplome.fichier
                    stagiaire.save()
                    diplomes_copies = 1
                    
            logger.info(f"{diplomes_copies} diplôme(s) copié(s) vers le stagiaire {stagiaire.id}")
            return diplomes_copies
            
        except Exception as e:
            logger.error(f"Erreur copie diplômes stagiaire {stagiaire.id}: {str(e)}")
            return 0

    def valider_fichier_signe(self, fichier):
        """Valide le fichier signé (PDF uniquement)"""
        allowed_types = ['application/pdf']
        max_size = 10 * 1024 * 1024  # 10MB
        
        if fichier.size > max_size:
            logger.warning(f"Fichier trop volumineux: {fichier.size} bytes")
            return False
        
        # Vérifier le type MIME
        if hasattr(fichier, 'content_type') and fichier.content_type:
            if fichier.content_type not in allowed_types:
                logger.warning(f"Type MIME non autorisé: {fichier.content_type}")
                return False
        
        # Vérifier l'extension
        if not fichier.name.lower().endswith('.pdf'):
            logger.warning(f"Extension non autorisée: {fichier.name}")
            return False
        
        # Vérifier que le fichier n'est pas vide
        if fichier.size == 0:
            logger.warning("Fichier vide")
            return False
        
        return True

    def ajouter_convention_aux_documents(self, demande, convention):
        """Ajoute la convention signée aux documents de la demande"""
        try:
            DocumentHistory.objects.create(
                demande=demande,
                document_type='convention_signee',
                nom_fichier=convention.fichier.name,
                nom_affichage='Convention de stage signée',
                est_modifie=False
            )
            logger.info(f"Convention ajoutée aux documents de la demande {demande.id}")
        except Exception as e:
            logger.warning(f"Erreur ajout convention aux documents: {e}")

    def envoyer_notifications_finalisation(self, stagiaire, demande, user, fichier_chemin=None):
        """Envoie les notifications et emails de finalisation AVEC la convention jointe"""
        try:
            email_envoye = False
            
            # Récupérer également l'objet fichier de la convention
            convention_file = None
            try:
                # Récupérer la convention depuis le stagiaire
                if hasattr(stagiaire, 'conventionstage'):
                    convention = stagiaire.conventionstage
                    if convention and convention.fichier:
                        convention_file = convention.fichier
            except Exception as e:
                logger.error(f"Erreur récupération convention depuis stagiaire: {str(e)}")
            
            # Essayer d'envoyer l'email AVEC la pièce jointe
            try:
                email_envoye = EmailSenderService.send_acceptation(
                    stagiaire=stagiaire,
                    demande=demande,
                    async_send=True,
                    convention_pdf_path=fichier_chemin,
                    convention_pdf_object=convention_file
                )
                logger.info(f"Email de finalisation envoyé {'avec convention' if fichier_chemin or convention_file else 'sans convention'} pour stagiaire {stagiaire.id}")
            except Exception as email_error:
                logger.error(f"Erreur envoi email finalisation: {str(email_error)}", exc_info=True)
            
            # Essayer d'envoyer la notification
            try:
                # Récupérer la convention du stagiaire
                convention = getattr(stagiaire, 'conventionstage', None)
                NotificationService.notifier_demande_acceptee(
                    user=user,
                    stagiaire=stagiaire,
                    convention=convention
                )
                logger.info(f"Notification envoyée pour stagiaire {stagiaire.id}")
            except Exception as notif_error:
                logger.error(f"Erreur notification finalisation: {str(notif_error)}", exc_info=True)
            
            return email_envoye
        except Exception as e:
            logger.error(f"Erreur générale notifications finalisation: {str(e)}", exc_info=True)
            return False 
         
# Ajoutez cette classe dans demande_api.py
@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class TelechargerConventionTemporaireAPIView(APIView):
    """Télécharge une convention temporaire"""
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
            
            # Renvoyer le fichier
            file_path = convention.fichier.path
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    response = HttpResponse(f.read(), content_type='application/pdf')
                    response['Content-Disposition'] = f'attachment; filename="{convention.fichier.name}"'
                    return response
            else:
                return Response({
                    "success": False,
                    "message": "Le fichier n'existe plus sur le serveur."
                }, status=status.HTTP_404_NOT_FOUND)
                
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
        # L'utilisateur peut télécharger s'il a accès à la demande
        if convention.demande_temporaire:
            # Vérifier les permissions sur la demande
            return user.has_perm('stages.view_demande')
        return False

@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class AnnulerPreAcceptationSimpleAPIView(APIView):
    """Annuler une pré-acceptation simplement (sans raison détaillée)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupération de la demande
                demande = get_object_or_404(
                    Demande.objects.select_related('etablissement')
                                 .prefetch_related('conventions_temporaires'),
                    id=demande_id
                )

                # Vérification des permissions
                if not self.has_accept_permission(request.user, demande):
                    return Response({
                        "success": False,
                        "message": "Vous n'avez pas la permission d'annuler cette pré-acceptation."
                    }, status=status.HTTP_403_FORBIDDEN)

                # Vérifier que la demande est bien pré-acceptée
                if demande.statut_stage != "Pré-acceptée":
                    return Response({
                        "success": False,
                        "message": "Seules les demandes pré-acceptées peuvent être annulées."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Sauvegarder l'ancien statut pour les notifications
                ancien_statut = demande.statut_stage
                
                # Sauvegarder les informations de pré-acceptation avant suppression
                donnees_pre_acceptation = demande.donnees_pre_acceptation
                
                # Mettre à jour la demande
                demande.statut_stage = "En cours de traitement"
                demande.donnees_pre_acceptation = None
                demande.date_pre_acceptation = None
                demande.save()

                # Nettoyer les conventions temporaires
                conventions_supprimees = self.nettoyer_conventions_temporaires(demande)

                # 🔔 NOTIFICATION PUSH - Annulation pré-acceptation
                try:
                    # Notification à l'utilisateur qui a effectué l'action
                    NotificationService.notifier_annulation_pre_acceptation_simple(
                        demande, 
                        request.user,
                        ancien_statut,
                        donnees_pre_acceptation
                    )
                    
                    # Broadcast à tous les autres utilisateurs
                    NotificationService.broadcast_annulation_pre_acceptation_simple(
                        demande,
                        request.user,
                        ancien_statut,
                        donnees_pre_acceptation
                    )
                    
                    logger.info(f"🔔 Notifications annulation pré-acceptation envoyées pour demande #{demande.tracking_id}")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur lors de l'envoi des notifications: {e}", exc_info=True)
                    # Ne pas bloquer le processus si les notifications échouent

                # Enregistrement de l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Annulation pré-acceptation simple demande {demande.tracking_id}",
                    performed_by=request.user,
                    details={
                        "ancien_statut": ancien_statut,
                        "nouveau_statut": demande.statut_stage,
                        "conventions_supprimees": conventions_supprimees,
                        "donnees_pre_acceptation": True if donnees_pre_acceptation else False
                    }
                )

                logger.info(f"✅ Pré-acceptation annulée simplement pour demande {demande_id} par {request.user.email}")

                return Response({
                    "success": True,
                    "message": "La pré-acceptation a été annulée avec succès.",
                    "notifications_envoyees": True,
                    "conventions_supprimees": conventions_supprimees,
                    "demande": {
                        "id": demande.id,
                        "tracking_id": demande.tracking_id,
                        "ancien_statut": ancien_statut,
                        "nouveau_statut": demande.statut_stage,
                        "date_annulation": timezone.now().isoformat(),
                    }
                }, status=status.HTTP_200_OK)

        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Demande non trouvée."
            }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"❌ Erreur annulation pré-acceptation simple demande {demande_id}: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "message": f"Erreur lors de l'annulation: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def nettoyer_conventions_temporaires(self, demande):
        """Nettoie les conventions temporaires liées à la demande et retourne le nombre supprimé"""
        conventions_supprimees = 0
        try:
            # Récupérer toutes les conventions temporaires
            conventions_temp = ConventionStage.objects.filter(
                demande=demande,
                est_temporaire=True
            )
            
            for convention in conventions_temp:
                # Supprimer le fichier physique s'il existe
                if convention.fichier and convention.fichier.name:
                    try:
                        convention.fichier.delete(save=False)
                        logger.info(f"🗑️ Fichier supprimé: {convention.fichier.name}")
                    except Exception as e:
                        logger.warning(f"⚠️ Impossible de supprimer le fichier: {e}")
                
                # Supprimer l'objet de la base de données
                convention.delete()
                conventions_supprimees += 1
            
            # Effacer la référence
            if demande.convention_temporaire:
                demande.convention_temporaire = None
                demande.save(update_fields=['convention_temporaire'])
            
            logger.info(f"✅ {conventions_supprimees} convention(s) temporaire(s) supprimée(s) pour demande #{demande.tracking_id}")
            
        except Exception as e:
            logger.error(f"❌ Erreur nettoyage conventions temporaires: {e}")
        
        return conventions_supprimees

    def has_accept_permission(self, user, demande):
        """Vérifie si l'utilisateur peut gérer l'acceptation"""
        return user.is_authenticated and user.has_perm('stages.change_demande')