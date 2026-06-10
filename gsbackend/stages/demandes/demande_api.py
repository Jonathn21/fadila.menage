
import logging
from datetime import datetime, timedelta, time
from io import BytesIO

import pytesseract
import google.generativeai as genai
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

from services.email_service import EmailSenderService
from stages.models import DemandeAttestation
from stages.serializers import DemandeAttestationSerializer

import pandas as pd
from django.conf import settings
from django.contrib.auth import (
    get_user_model, update_session_auth_hash, 
    authenticate, logout
)
import time,json
from .listeDemande import DemandeBaseAPIView

from django.db import transaction, IntegrityError
from django.db.models import Q, Count
from django.db.models.functions import ExtractMonth, ExtractYear, ExtractWeekDay
from django.http import HttpResponse, FileResponse
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
    Stagiaire, Notification, Entretien, Demande,  
    UserSession, Utilisateur, UserAction, ConventionStage, 
    Etablissement, Diplome, DocumentHistory
)
from ..serializers import (
    UtilisateurSerializer, 
    ProfilSerializer, UserActionSerializer
)
from utilisateurs.models import Utilisateur, Profil
from utilisateurs.permissions import (
    HasPermission,
    PERM_DEMANDES_VIEW, PERM_DEMANDES_PROCESS, PERM_DEMANDES_ACCEPT,
    PERM_DEMANDES_REJECT, PERM_DEMANDES_DELETE,
)
from services.notification_service import NotificationService
from services.resume_service import ResumeGeneratorService
from rest_framework.parsers import MultiPartParser, FormParser
from services.email_templates_extended import SecurityEmailTemplates,StageEmailTemplates

import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError

from ..serializers import DemandeAttestationSerializer
   
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django_ratelimit.decorators import ratelimit
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError
import os
import logging
from ..models import Demande, Stagiaire, DemandeAttestation, ConventionStage, Diplome
from ..serializers import DemandeAttestationSerializer
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm



logger = logging.getLogger(__name__)


logger = logging.getLogger(__name__)

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
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_DELETE)]

    def delete(self, request, demande_id):
        try:
            with transaction.atomic():
                demande = get_object_or_404(Demande, id=demande_id)
                
                # Vérifications de sécurité
                if Stagiaire.objects.filter(demande=demande).exists():
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
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_PROCESS)]

    def post(self, request, pk):
        """Met une demande en traitement"""
        try:
            with transaction.atomic():
                # 🔹 Récupérer la demande avec verrouillage
                demande = get_object_or_404(
                    Demande.objects.select_for_update(), 
                    pk=pk
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
    
@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class SuiviDemandeAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, tracking_id=None):
        """Récupère les informations d'une demande avec son suivi"""
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
            
            logger.info(f"✅ Demande trouvée: {demande.id} - {demande.etudiant_nom} {demande.etudiant_prenom}")
            
        except Demande.DoesNotExist:
            return Response({
                "success": False,
                "message": "Aucune demande trouvée pour ce tracking_id."
            }, status=status.HTTP_404_NOT_FOUND)

        # Récupération du stage lié
        stage_info = None
        demande_attestation_info = None
        
        try:
            stagiaires = Stagiaire.objects.filter(demande=demande).select_related(
                'etablissement'
            )
            
            logger.info(f"🔍 Nombre de stagiaires trouvés pour la demande {demande.id}: {stagiaires.count()}")
            
            if stagiaires.exists():
                stagiaire = stagiaires.order_by('-date_debut').first()
                logger.info(f"✅ Stagiaire sélectionné: ID={stagiaire.id}, Nom={stagiaire.nom} {stagiaire.prenom}, Statut={stagiaire.statut_actuel}")
                
                stage_info = self.get_stage_info(stagiaire, request)
                
                # Récupérer la demande d'attestation si elle existe
                try:
                    demande_attestation = DemandeAttestation.objects.filter(stagiaire=stagiaire).first()
                    if demande_attestation:
                        demande_attestation_info = {
                            "date_demande": demande_attestation.date_demande.isoformat() if demande_attestation.date_demande else None,
                            "statut": demande_attestation.statut,
                            "motif_refus": demande_attestation.motif_refus,
                            "fichiers": {
                                "rapport_stage": request.build_absolute_uri(demande_attestation.rapport_stage.url) if demande_attestation.rapport_stage else None,
                                "demande_manuscrite": request.build_absolute_uri(demande_attestation.demande_manuscrite.url) if demande_attestation.demande_manuscrite else None,
                                "attestation_signee": request.build_absolute_uri(demande_attestation.attestation_signee.url) if demande_attestation.attestation_signee else None,
                                "attestation_generee": request.build_absolute_uri(demande_attestation.attestation_generee.url) if demande_attestation.attestation_generee else None,
                            }
                        }
                        logger.info(f"✅ Demande d'attestation trouvée: {demande_attestation.id} - Statut: {demande_attestation.statut}")
                except Exception as e:
                    logger.warning(f"⚠️ Erreur lors de la récupération de la demande d'attestation: {e}")
                
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
                "date_acceptation": demande.date_pre_acceptation.isoformat() if demande.date_pre_acceptation else None,
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
            
            # Ajouter la demande d'attestation au stage si elle existe
            if demande_attestation_info:
                response_data["demande"]["stage"]["demande_attestation"] = demande_attestation_info
                logger.info(f"✅ Demande d'attestation ajoutée au stage")
        else:
            logger.info(f"ℹ️ Aucune information de stage à ajouter à la réponse")

        logger.info(f"📤 Réponse envoyée avec succès pour la demande {demande.tracking_id}")
        return Response(response_data, status=status.HTTP_200_OK)

    def get_prochaines_etapes(self, statut_stage):
        """Retourne les prochaines étapes selon le statut"""
        etapes = {
            "En attente": "Votre demande est en cours d'examen par notre équipe. Vous recevrez une notification par email dès qu'une décision sera prise.",
            "En cours de traitement": "Votre dossier est actuellement en cours de traitement. Notre équipe l'examine en détail.",
            "Pré-acceptée": "Votre dossier est actuellement en cours de traitement. Notre équipe l'examine en détail.",  # 🔥 NOUVEAU

            "Acceptée": "Félicitations ! Votre demande a été acceptée. Veuillez télécharger et imprimer votre convention de stage.",
            "Refusée": "Votre demande a été refusée. Veuillez consulter vos emails pour connaître le motif du refus. Vous pouvez soumettre une nouvelle demande dans le futur si les conditions changent.",
            "Information supplémentaire requise": "Veuillez consulter vos emails pour les informations complémentaires à fournir.",
            "Stage en cours": "Votre stage est actuellement en cours. Consultez vos emails pour les communications importantes.",
            "Terminé": "Votre stage est terminé. Pour l'obtention de votre attestation, veuillez soumettre votre rapport de stage accompagné d'une demande d'attestation.",
            "Stage annulé": "Votre stage a été annulé. Contactez-nous pour plus d'informations."
        }
        return etapes.get(statut_stage, "Statut non spécifié.")

    def get_stage_info(self, stagiaire, request):
        """Récupère les informations détaillées du stage AVEC LA CONVENTION ET L'ATTESTATION"""
        try:
            logger.info(f"🔄 Début de get_stage_info pour le stagiaire {stagiaire.id}")
            
            # Initialiser convention et attestation à None
            convention = None
            attestation = None
            
            # Gestion robuste de la convention
            try:
                # Méthode 1 : Vérifier si la relation existe
                if hasattr(stagiaire, 'conventionstage') and stagiaire.conventionstage:
                    convention_obj = stagiaire.conventionstage
                    if convention_obj.fichier:
                        convention = {
                            "numero_convention": convention_obj.numero_convention,
                            "date_creation": convention_obj.date_creation.isoformat() if convention_obj.date_creation else None,
                            "fichier_url": request.build_absolute_uri(convention_obj.fichier.url),
                            "est_temporaire": convention_obj.est_temporaire,
                        }
                        logger.info(f"✅ Convention trouvée via relation: {convention_obj.numero_convention}")
                else:
                    # Méthode 2 : Chercher via query
                    convention_obj = ConventionStage.objects.filter(stagiaire=stagiaire).first()
                    if convention_obj and convention_obj.fichier:
                        convention = {
                            "numero_convention": convention_obj.numero_convention,
                            "date_creation": convention_obj.date_creation.isoformat() if convention_obj.date_creation else None,
                            "fichier_url": request.build_absolute_uri(convention_obj.fichier.url),
                            "est_temporaire": convention_obj.est_temporaire,
                        }
                        logger.info(f"✅ Convention trouvée via query: {convention_obj.numero_convention}")
                    else:
                        logger.info(f"ℹ️ Aucune convention trouvée pour le stagiaire {stagiaire.id}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur récupération convention pour stagiaire {stagiaire.id}: {e}")
            
            # Gestion robuste de l'attestation
            try:
                demande_att = DemandeAttestation.objects.filter(stagiaire=stagiaire).first()
                if demande_att:
                    # Priorité à l'attestation signée, sinon la générée
                    fichier_att = demande_att.attestation_signee or demande_att.attestation_generee
                    if fichier_att:
                        attestation = {
                            "date_generation": demande_att.date_traitement.isoformat() if demande_att.date_traitement else None,
                            "fichier_url": request.build_absolute_uri(fichier_att.url),
                            "type": "attestation_signee" if demande_att.attestation_signee else "attestation_generee",
                        }
                        logger.info(f"✅ Attestation trouvée pour stagiaire {stagiaire.id}")
                    else:
                        logger.info(f"ℹ️ DemandeAttestation existe mais sans fichier pour stagiaire {stagiaire.id}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur récupération attestation pour stagiaire {stagiaire.id}: {e}")
            
            # Documents du stagiaire - NE PAS BLOQUER sur erreur
            documents_stagiaire = []
            try:
                # Récupérer les documents du stagiaire
                all_docs = stagiaire.get_documents()
                logger.info(f"📄 Nombre total de documents du stagiaire: {len(all_docs)}")
                
                for doc in all_docs:
                    doc_type = doc.get('type', '')
                    if doc_type in ['cv', 'lettre_motivation', 'diplome']:
                        continue

                    url = doc.get('url', '')
                    # ✅ Vérification robuste avant build_absolute_uri
                    if not url:
                        continue
                    if not url.startswith('http'):
                        url = request.build_absolute_uri(url)

                    documents_stagiaire.append({
                        "nom": doc.get('nom', 'Document'),
                        "type": doc_type,
                        "url": url,
                    })
                    logger.info(f"✅ Document stagiaire ajouté: {doc.get('nom')}")
            except Exception as e:
                logger.warning(f"⚠️ Erreur documents pour stagiaire {stagiaire.id}: {e}")
                # Continuer même si les documents échouent

            # Ajouter la convention aux documents si elle existe
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
            
            # Ajouter l'attestation aux documents si elle existe
            if attestation:
                documents_stagiaire.append({
                    "nom": f"Attestation de stage",
                    "type": "attestation_signee",
                    "url": attestation["fichier_url"],
                    "date_generation": attestation["date_generation"],
                })
                logger.info(f"✅ Attestation ajoutée aux documents du stagiaire")

            # Historique des stages - NE PAS BLOQUER
            historique_stages = []
            stage_renouvele_info = None
            
            try:
                if stagiaire.a_ete_renouvele and stagiaire.stage_renouvele_id:
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

            # Informations de renouvellement - SÉCURISÉ
            informations_renouvellement = {
                "a_ete_renouvele": getattr(stagiaire, 'a_ete_renouvele', False),
                "stage_renouvele_id": getattr(stagiaire, 'stage_renouvele_id', None),
                "peut_etre_renouvele": stagiaire.statut_actuel == "Terminé" and not getattr(stagiaire, 'a_ete_renouvele', False),
                "date_renouvellement": stagiaire.date_renouvellement.isoformat() if hasattr(stagiaire, 'date_renouvellement') and stagiaire.date_renouvellement else None,
            }

            # Construire stage_data avec valeurs par défaut
            stage_data = {
                "id": stagiaire.id,
                "nom": stagiaire.nom or "",
                "prenom": stagiaire.prenom or "",
                "email": stagiaire.email or "",
                "telephone": stagiaire.telephone or "",
                "niveau_etude": stagiaire.niveau_etude or "",
                "specialite": stagiaire.specialite or "",
                "genre": stagiaire.genre or "",
                "type_stage": stagiaire.type_stage or "",
                "remunere": stagiaire.remunere or False,
                "montant_remuneration": stagiaire.montant_remuneration,
                "direction": stagiaire.direction or "",
                "service": stagiaire.service or "",
                "lieu_stage": stagiaire.lieu_stage or "",
                "date_accord": stagiaire.date_accord.isoformat() if stagiaire.date_accord else None,
            
                # Utiliser les champs figés
                "date_debut": stagiaire.date_debut_fige.isoformat() if stagiaire.date_debut_fige else (stagiaire.date_debut.isoformat() if stagiaire.date_debut else None),
                "date_fin": stagiaire.date_fin_fige.isoformat() if stagiaire.date_fin_fige else (stagiaire.date_fin.isoformat() if stagiaire.date_fin else None),
                "duree_jours": stagiaire.duree_jours_fige or stagiaire.duree_jours or 0,
                "duree_mois": stagiaire.duree_mois_fige or stagiaire.duree_mois or 0,
                "statut_actuel": stagiaire.statut or "À venir",
            
                "jours_restants": stagiaire.jours_restants,
                "superviseur": stagiaire.superviseur or "",
                "a_ete_renouvele": getattr(stagiaire, 'a_ete_renouvele', False),
                "stage_renouvele_id": getattr(stagiaire, 'stage_renouvele_id', None),
                
                # Convention
                "convention": convention,
                "attestation": attestation,
                
                # Informations de renouvellement
                "renouvellement": informations_renouvellement,
                "stage_renouvele": stage_renouvele_info,
                "historique_stages": historique_stages,
                
                # Documents
                "documents": documents_stagiaire,
                "etablissement": {
                    "nom": stagiaire.etablissement.nom if stagiaire.etablissement else None,
                    "email": stagiaire.etablissement.email if stagiaire.etablissement else None,
                    "adresse": stagiaire.etablissement.adresse if stagiaire.etablissement else None,
                    "telephone": stagiaire.etablissement.telephone if stagiaire.etablissement else None,
                } if stagiaire.etablissement else None,
            }
            
            logger.info(f"✅ Stage data compilé avec succès pour le stagiaire {stagiaire.id}")
            logger.info(f"📊 Résumé: {len(documents_stagiaire)} documents, convention={'oui' if convention else 'non'}, attestation={'oui' if attestation else 'non'}")
            
            # TOUJOURS retourner stage_data, même si certaines parties ont échoué
            return stage_data
            
        except Exception as e:
            # Logger l'erreur MAIS RETOURNER UN OBJET MINIMAL
            logger.error(f"❌ Erreur CRITIQUE lors de la récupération des infos du stage {stagiaire.id}: {e}")
            import traceback
            logger.error(f"🔥 Traceback complet:\n{traceback.format_exc()}")
        
        # Retourner un objet minimal plutôt que None
        return {
            "id": stagiaire.id,
            "nom": stagiaire.nom or "",
            "prenom": stagiaire.prenom or "",
            "email": stagiaire.email or "",
            "type_stage": stagiaire.type_stage or "",
            "statut_actuel": "En cours",
            "date_debut": stagiaire.date_debut.isoformat() if stagiaire.date_debut else None,
            "date_fin": stagiaire.date_fin.isoformat() if stagiaire.date_fin else None,
            "direction": stagiaire.direction or "",
            "service": stagiaire.service or "",
            "remunere": False,
            "documents": [],
            "convention": None,
            "attestation": None,
        }

    def get_demande_documents(self, demande, request):
        documents = []
        try:
            if demande.cv and demande.cv.name:
                documents.append({
                    'nom': 'Curriculum Vitae (CV)',
                    'url': request.build_absolute_uri(demande.cv.url),
                    'type': 'cv',
                    'id': 'cv'
                })

            if demande.lettre_motivation and demande.lettre_motivation.name:
                documents.append({
                    'nom': 'Lettre de motivation',
                    'url': request.build_absolute_uri(demande.lettre_motivation.url),
                    'type': 'lettre_motivation',
                    'id': 'lettre_motivation'
                })

            for diplome in demande.diplomes.all():
                # ✅ Double vérification fichier + nom
                if diplome.fichier and diplome.fichier.name:
                    documents.append({
                        'nom': 'Diplôme',
                        'url': request.build_absolute_uri(diplome.fichier.url),
                        'type': 'diplome',
                        'id': str(diplome.id)
                    })

        except Exception as e:
            logger.error(f"Erreur get_demande_documents demande {demande.id}: {e}")

        return documents

class DemandeModificationAPIView(APIView):
    """
    API pour modifier les documents d'une demande
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]
    
    def put(self, request, tracking_id=None):
        """
        Modifie les documents d'une demande
        (Votre logique existante de handleSave)
        """
        # ... votre code existant de handleSave ...
        pass

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
        from stages.models import EmailNotificationDemande

        # 1) Emails configurés par les super-utilisateurs (source prioritaire)
        emails_admins = list(
            EmailNotificationDemande.objects
            .filter(actif=True)
            .exclude(email='')
            .values_list('email', flat=True)
        )

        # 2) Repli : administrateurs actifs si aucun email n'est configuré,
        #    afin de ne jamais désactiver silencieusement les notifications.
        if not emails_admins:
            admins = Utilisateur.objects.filter(
                role='Admin',
                is_active=True,
                email__isnull=False
            ).exclude(email='')
            emails_admins = [admin.email for admin in admins]

        if not emails_admins:
            logger.warning("⚠️ Aucun destinataire trouvé pour notification")
            return

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
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_REJECT)]

    def post(self, request, demande_id):
        raison_refus = request.data.get("raison_refus", "").strip()

        if not raison_refus:
            return Response(
                {"status": "error", "message": "Veuillez indiquer le motif du refus."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Récupération de la demande
        demande = get_object_or_404(Demande, id=demande_id)

        # Validation de l'état : un refus n'est possible que depuis un état non finalisé
        if demande.statut_stage == Demande.Statut.ACCEPTEE:
            return Response(
                {"status": "error", "message": "Impossible de refuser une demande déjà acceptée (un stagiaire a été créé)."},
                status=status.HTTP_409_CONFLICT,
            )
        if demande.statut_stage == Demande.Statut.REFUSEE:
            return Response(
                {"status": "error", "message": "Cette demande a déjà été refusée."},
                status=status.HTTP_409_CONFLICT,
            )

        # Sauvegarde de l'ancien statut pour l'email
        ancien_statut = demande.statut_stage

        with transaction.atomic():
            # Si la demande était pré-acceptée, on nettoie la convention temporaire générée
            if ancien_statut == Demande.Statut.PRE_ACCEPTEE:
                conventions_temp = ConventionStage.objects.filter(demande=demande, est_temporaire=True)
                for convention in conventions_temp:
                    if convention.fichier and convention.fichier.name:
                        try:
                            convention.fichier.delete(save=False)
                        except Exception as e:
                            logger.warning(f"⚠️ Impossible de supprimer le fichier convention temporaire: {e}")
                    convention.delete()
                demande.convention_temporaire = None
                demande.donnees_pre_acceptation = None
                demande.date_pre_acceptation = None

            # Mise à jour de la demande
            demande.statut_stage = Demande.Statut.REFUSEE
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
    # Permissions par méthode : consultation vs modification.
    permission_classes = [IsAuthenticated]

    _method_permissions = {
        "GET": PERM_DEMANDES_VIEW,
        "PATCH": PERM_DEMANDES_PROCESS,
    }

    def get_permissions(self):
        perms = [IsAuthenticated()]
        required = self._method_permissions.get(self.request.method)
        if required:
            perms.append(HasPermission(required))
        return perms

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
        documents = []
        try:
            # ✅ Seulement les vrais FileField de Demande
            file_fields = [
                ('photo_passeport', 'Photo passeport'),
                ('cv', 'CV'),
                ('lettre_motivation', 'Lettre de motivation'),
            ]

            for field_name, display_name in file_fields:
                file_field = getattr(demande, field_name, None)
                if file_field and file_field.name:
                    documents.append({
                        "id": None,
                        "nom": display_name,
                        "url": request.build_absolute_uri(file_field.url),
                        "statut": "existing",
                        "date_upload": demande.date_soumission,
                        "est_modifie": False
                    })

            # ✅ Les diplômes sont dans une relation séparée
            for diplome in demande.diplomes.all():
                if diplome.fichier and diplome.fichier.name:
                    documents.append({
                        "id": str(diplome.id),
                        "nom": "Diplôme",
                        "url": request.build_absolute_uri(diplome.fichier.url),
                        "statut": "existing",
                        "date_upload": demande.date_soumission,
                        "est_modifie": False
                    })

        except Exception as e:
            logger.error(f"Erreur fallback documents: {e}")
        return documents

    def has_access_to_demande(self, user, demande):
        """Vérifie si l'utilisateur a accès à la demande"""
        return user.is_authenticated

    def has_edit_permission(self, user, demande):
        """Vérifie si l'utilisateur peut modifier la demande"""
        return user.is_authenticated
    
@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class PreAccepterDemandeAPIView(APIView):
    """Étape 1: Pré-acceptation sans créer de stagiaire"""
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_ACCEPT)]

    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupération sécurisée
                demande = get_object_or_404(
                    Demande.objects.select_related('etablissement')
                                 .prefetch_related('diplomes'),
                    id=demande_id
                )


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
        """Génère la lettre d'autorisation de stage en Word (.docx)"""
        try:
            from django.core.files.base import ContentFile
            from stages.docx_generator import generer_lettre_stage_docx
            import time

            helpers = {
                "calculer_duree_mois": self.calculer_duree_mois_temporaire,
                "date_format_francais": self.date_format_francais,
                "duree_en_lettres_et_chiffres": self.duree_en_lettres_et_chiffres,
            }

            buffer = generer_lettre_stage_docx(demande, donnees, signataire_id="DG", helpers=helpers)

            nom_fichier = f"convention_temporaire_{demande.tracking_id}_{int(time.time())}.docx"
            convention.fichier.save(nom_fichier, ContentFile(buffer.getvalue()), save=True)

            logger.info(f"Convention temporaire Word générée: {nom_fichier}")
            return True

        except Exception as e:
            logger.error(f"Erreur génération Word temporaire: {str(e)}")
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
 
@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class FinaliserAcceptationAPIView(APIView):
    """Étape 2: Finalisation avec upload du PDF signé"""
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_ACCEPT)]

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
                demande.statut_stage = Demande.Statut.ACCEPTEE
                demande.traiter_candidature = True

                # ✅ CORRECTION: Gestion de la convention temporaire
                convention_temporaire = demande.get_convention_temporaire()
                if convention_temporaire:
                    # On la conserve pour historique mais on la marque comme non temporaire
                    convention_temporaire.est_temporaire = False
                    convention_temporaire.save()

                # Les données de pré-acceptation ont servi à créer le stagiaire : on les purge
                demande.donnees_pre_acceptation = None

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
        try:
            diplomes_copies = 0
            premier_diplome = demande.diplomes.first()

            if premier_diplome and premier_diplome.fichier and premier_diplome.fichier.name:
                # ✅ Stagiaire a un champ 'diplome' (FileField simple)
                stagiaire.diplome = premier_diplome.fichier
                stagiaire.save(update_fields=['diplome'])
                diplomes_copies = 1

            logger.info(f"{diplomes_copies} diplôme(s) copié(s) vers stagiaire {stagiaire.id}")
            return diplomes_copies

        except Exception as e:
            logger.error(f"Erreur copie diplômes stagiaire {stagiaire.id}: {e}")
            return 0

    def valider_fichier_signe(self, fichier):
        """Valide le fichier signé (PDF ou Word)"""
        allowed_types = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        allowed_extensions = ('.pdf', '.docx')
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
        if not fichier.name.lower().endswith(allowed_extensions):
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
         
@method_decorator([never_cache, ratelimit(key='user', rate='10/m', method='POST')], name='dispatch')
class RegenererConventionAPIView(APIView):
    """Régénère la convention avec le signataire choisi (DG ou DGA)"""
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_ACCEPT)]

    SIGNATAIRES = {
        "DG": {
            "titre": "Le Directeur Général",
            "nom": "<b>Dr. Karimou CHABI SIKA</b>",
        },
        "DGA": {
            "titre": "Le Directeur Général Adjoint",
            "nom": "<b>M. Damipi NOUPOKOU</b>",  # ← remplace par le vrai nom
        },
    }

    def post(self, request, demande_id):
        try:
            demande = get_object_or_404(Demande, id=demande_id)

            if demande.statut_stage != "Pré-acceptée":
                return Response({
                    "success": False,
                    "message": "La demande doit être en statut Pré-acceptée."
                }, status=status.HTTP_400_BAD_REQUEST)

            signataire_id = request.data.get("signataire", "DG")
            if signataire_id not in self.SIGNATAIRES:
                return Response({
                    "success": False,
                    "message": "Signataire invalide. Choisissez DG ou DGA."
                }, status=status.HTTP_400_BAD_REQUEST)

            convention = demande.convention_temporaire
            if not convention:
                return Response({
                    "success": False,
                    "message": "Aucune convention temporaire trouvée."
                }, status=status.HTTP_404_NOT_FOUND)

            donnees = demande.donnees_pre_acceptation
            if not donnees:
                return Response({
                    "success": False,
                    "message": "Données de pré-acceptation introuvables."
                }, status=status.HTTP_400_BAD_REQUEST)

            signataire_info = self.SIGNATAIRES[signataire_id]
            pdf_genere = self.regenerer_pdf(convention, demande, donnees, signataire_info)

            if not pdf_genere:
                return Response({
                    "success": False,
                    "message": "Échec de la régénération du PDF."
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            pdf_url = request.build_absolute_uri(convention.fichier.url)

            UserAction.objects.create(
                user=request.user,
                action=f"Régénération convention ({signataire_id}) demande {demande.tracking_id}",
                performed_by=request.user
            )

            return Response({
                "success": True,
                "pdf_url": pdf_url,
                "signataire": signataire_id,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Erreur régénération convention: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def regenerer_pdf(self, convention, demande, donnees, signataire_info):
        """Régénère la lettre de stage en Word (.docx) avec le signataire choisi"""
        try:
            from django.core.files.base import ContentFile
            from stages.docx_generator import generer_lettre_stage_docx
            import time

            pre_view = PreAccepterDemandeAPIView()
            helpers = {
                "calculer_duree_mois": pre_view.calculer_duree_mois_temporaire,
                "date_format_francais": pre_view.date_format_francais,
                "duree_en_lettres_et_chiffres": pre_view.duree_en_lettres_et_chiffres,
            }

            # Trouver l'ID du signataire à partir des infos
            signataire_id = "DG"
            for sid, sinfo in self.SIGNATAIRES.items():
                if sinfo["titre"] == signataire_info["titre"]:
                    signataire_id = sid
                    break

            buffer = generer_lettre_stage_docx(demande, donnees, signataire_id=signataire_id, helpers=helpers)

            nom_fichier = f"convention_{demande.tracking_id}_{int(time.time())}.docx"
            convention.fichier.save(nom_fichier, ContentFile(buffer.getvalue()), save=True)

            return True

        except Exception as e:
            logger.error(f"Erreur régénération Word: {str(e)}", exc_info=True)
            return False
        
@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class TelechargerConventionTemporaireAPIView(APIView):
    """Télécharge une convention temporaire"""
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_VIEW)]

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
                    # Déterminer le content_type selon l'extension
                    if convention.fichier.name.lower().endswith('.docx'):
                        ct = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    else:
                        ct = 'application/pdf'
                    response = HttpResponse(f.read(), content_type=ct)
                    response['Content-Disposition'] = f'attachment; filename="{os.path.basename(convention.fichier.name)}"'
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
    permission_classes = [IsAuthenticated, HasPermission(PERM_DEMANDES_ACCEPT)]

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

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandesAttestationAPI(APIView):
    """
    API pour gérer les demandes d'attestation (liste, filtres, traitement)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Récupère la liste des demandes d'attestation avec filtres
        """
        try:
            # Récupérer les paramètres de filtrage
            statut = request.GET.get('statut', '')
            direction = request.GET.get('direction', '')
            service = request.GET.get('service', '')
            search = request.GET.get('search', '')
            
            # Construire le queryset de base avec toutes les relations nécessaires
            queryset = DemandeAttestation.objects.select_related(
                'stagiaire',
                'stagiaire__etablissement'
            ).all()
            
            # Appliquer les filtres
            if statut and statut != 'tous':
                queryset = queryset.filter(statut=statut)
            
            if direction and direction != 'tous':
                queryset = queryset.filter(stagiaire__direction=direction)
            
            if service and service != 'tous':
                queryset = queryset.filter(stagiaire__service=service)
            
            # Recherche textuelle
            if search:
                queryset = queryset.filter(
                    Q(stagiaire__nom__icontains=search) |
                    Q(stagiaire__prenom__icontains=search) |
                    Q(stagiaire__email__icontains=search) |
                    Q(stagiaire__direction__icontains=search) |
                    Q(stagiaire__service__icontains=search)
                )
            
            # Pagination (optionnelle)
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            start = (page - 1) * page_size
            end = start + page_size
            
            total = queryset.count()
            demandes_list = queryset[start:end]
            
            # Sérialiser les données
            demandes_data = []
            for demande in demandes_list:
                # Construire l'URL pour télécharger le rapport
                rapport_url = None
                if demande.rapport_stage:
                    rapport_url = request.build_absolute_uri(demande.rapport_stage.url)
                
                # Construire l'URL pour télécharger la demande manuscrite
                demande_manuscrite_url = None
                if demande.demande_manuscrite:
                    demande_manuscrite_url = request.build_absolute_uri(demande.demande_manuscrite.url)
                
                # Calculer la durée du stage
                duree_jours = None
                if demande.stagiaire.date_debut and demande.stagiaire.date_fin:
                    duree_jours = (demande.stagiaire.date_fin - demande.stagiaire.date_debut).days
                
                demande_data = {
                    'id': demande.id,
                    'statut': demande.statut,
                    'date_demande': demande.date_demande.isoformat() if demande.date_demande else None,
                    'date_traitement': demande.date_traitement.isoformat() if demande.date_traitement else None,
                    'motif_refus': demande.motif_refus,
                    'fichiers': {
                        'rapport_stage': rapport_url,
                        'demande_manuscrite': demande_manuscrite_url,
                    },
                    'stagiaire': {
                        'id': demande.stagiaire.id,
                        'nom': demande.stagiaire.nom,
                        'prenom': demande.stagiaire.prenom,
                        'email': demande.stagiaire.email,
                        'telephone': demande.stagiaire.telephone,
                        'direction': demande.stagiaire.direction,
                        'service': demande.stagiaire.service,
                        'date_debut': demande.stagiaire.date_debut.isoformat() if demande.stagiaire.date_debut else None,
                        'date_fin': demande.stagiaire.date_fin.isoformat() if demande.stagiaire.date_fin else None,
                        'duree_jours': duree_jours,
                        'duree_mois': round(duree_jours / 30) if duree_jours else None,
                        'statut_stage': demande.stagiaire.statut,
                        'type_stage': demande.stagiaire.type_stage,
                        'remunere': demande.stagiaire.remunere,
                        'montant_remuneration': demande.stagiaire.montant_remuneration,
                        'lieu_stage': demande.stagiaire.lieu_stage,
                        'superviseur': demande.stagiaire.superviseur,
                        'etablissement': {
                            'nom': demande.stagiaire.etablissement.nom if demande.stagiaire.etablissement else None,
                            'email': demande.stagiaire.etablissement.email if demande.stagiaire.etablissement else None,
                        } if demande.stagiaire.etablissement else None,
                    }
                }
                demandes_data.append(demande_data)
            
            # Récupérer les directions et services uniques pour les filtres
            directions = DemandeAttestation.objects.filter(
                stagiaire__direction__isnull=False
            ).values_list('stagiaire__direction', flat=True).distinct()
            
            services = DemandeAttestation.objects.filter(
                stagiaire__service__isnull=False
            ).values_list('stagiaire__service', flat=True).distinct()
            
            # Statistiques
            stats = {
                'total': DemandeAttestation.objects.count(),
                'en_attente': DemandeAttestation.objects.filter(statut='en_attente').count(),
                'approuvees': DemandeAttestation.objects.filter(statut='approuvee').count(),
                'refusees': DemandeAttestation.objects.filter(statut='refusee').count(),
            }
            
            return Response({
                'success': True,
                'data': demandes_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'pages': (total + page_size - 1) // page_size
                },
                'stats': stats,
                'filters': {
                    'directions': list(set(filter(None, directions))),
                    'services': list(set(filter(None, services))),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération demandes attestation: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des demandes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandesAttestationEnAttenteAPI(APIView):
    """
    API pour gérer les demandes d'attestation (liste, filtres, traitement)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Récupère la liste des demandes d'attestation avec filtres
        """
        try:
            # Récupérer les paramètres de filtrage
            statut = request.GET.get('statut', '')
            direction = request.GET.get('direction', '')
            service = request.GET.get('service', '')
            search = request.GET.get('search', '')
            
            # Construire le queryset de base avec toutes les relations nécessaires
            queryset = DemandeAttestation.objects.select_related(
                'stagiaire',
                'stagiaire__etablissement'
            ).filter(statut='en_attente')
            
            # Appliquer les filtres
            if statut and statut != 'tous':
                queryset = queryset.filter(statut=statut)
            
            if direction and direction != 'tous':
                queryset = queryset.filter(stagiaire__direction=direction)
            
            if service and service != 'tous':
                queryset = queryset.filter(stagiaire__service=service)
            
            # Recherche textuelle
            if search:
                queryset = queryset.filter(
                    Q(stagiaire__nom__icontains=search) |
                    Q(stagiaire__prenom__icontains=search) |
                    Q(stagiaire__email__icontains=search) |
                    Q(stagiaire__direction__icontains=search) |
                    Q(stagiaire__service__icontains=search)
                )
            
            # Pagination (optionnelle)
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            start = (page - 1) * page_size
            end = start + page_size
            
            total = queryset.count()
            demandes_list = queryset[start:end]
            
            # Sérialiser les données
            demandes_data = []
            for demande in demandes_list:
                # Construire l'URL pour télécharger le rapport
                rapport_url = None
                if demande.rapport_stage:
                    rapport_url = request.build_absolute_uri(demande.rapport_stage.url)
                
                # Construire l'URL pour télécharger la demande manuscrite
                demande_manuscrite_url = None
                if demande.demande_manuscrite:
                    demande_manuscrite_url = request.build_absolute_uri(demande.demande_manuscrite.url)
                
                # Calculer la durée du stage
                duree_jours = None
                if demande.stagiaire.date_debut and demande.stagiaire.date_fin:
                    duree_jours = (demande.stagiaire.date_fin - demande.stagiaire.date_debut).days
                
                demande_data = {
                    'id': demande.id,
                    'statut': demande.statut,
                    'date_demande': demande.date_demande.isoformat() if demande.date_demande else None,
                    'date_traitement': demande.date_traitement.isoformat() if demande.date_traitement else None,
                    'motif_refus': demande.motif_refus,
                    'fichiers': {
                        'rapport_stage': rapport_url,
                        'demande_manuscrite': demande_manuscrite_url,
                    },
                    'stagiaire': {
                        'id': demande.stagiaire.id,
                        'nom': demande.stagiaire.nom,
                        'prenom': demande.stagiaire.prenom,
                        'email': demande.stagiaire.email,
                        'telephone': demande.stagiaire.telephone,
                        'direction': demande.stagiaire.direction,
                        'service': demande.stagiaire.service,
                        'date_debut': demande.stagiaire.date_debut.isoformat() if demande.stagiaire.date_debut else None,
                        'date_fin': demande.stagiaire.date_fin.isoformat() if demande.stagiaire.date_fin else None,
                        'duree_jours': duree_jours,
                        'duree_mois': round(duree_jours / 30) if duree_jours else None,
                        'statut_stage': demande.stagiaire.statut,
                        'type_stage': demande.stagiaire.type_stage,
                        'remunere': demande.stagiaire.remunere,
                        'montant_remuneration': demande.stagiaire.montant_remuneration,
                        'lieu_stage': demande.stagiaire.lieu_stage,
                        'superviseur': demande.stagiaire.superviseur,
                        'etablissement': {
                            'nom': demande.stagiaire.etablissement.nom if demande.stagiaire.etablissement else None,
                            'email': demande.stagiaire.etablissement.email if demande.stagiaire.etablissement else None,
                        } if demande.stagiaire.etablissement else None,
                    }
                }
                demandes_data.append(demande_data)
            
            # Récupérer les directions et services uniques pour les filtres
            directions = DemandeAttestation.objects.filter(
                stagiaire__direction__isnull=False
            ).values_list('stagiaire__direction', flat=True).distinct()
            
            services = DemandeAttestation.objects.filter(
                stagiaire__service__isnull=False
            ).values_list('stagiaire__service', flat=True).distinct()
            
            # Statistiques
            stats = {
                'total': DemandeAttestation.objects.count(),
                'en_attente': DemandeAttestation.objects.filter(statut='en_attente').count(),
                'approuvees': DemandeAttestation.objects.filter(statut='approuvee').count(),
                'refusees': DemandeAttestation.objects.filter(statut='refusee').count(),
            }
            
            return Response({
                'success': True,
                'data': demandes_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'pages': (total + page_size - 1) // page_size
                },
                'stats': stats,
                'filters': {
                    'directions': list(set(filter(None, directions))),
                    'services': list(set(filter(None, services))),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération demandes attestation: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des demandes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandesAttestationRefuseAPI(APIView):
    """
    API pour gérer les demandes d'attestation (liste, filtres, traitement)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Récupère la liste des demandes d'attestation avec filtres
        """
        try:
            # Récupérer les paramètres de filtrage
            statut = request.GET.get('statut', '')
            direction = request.GET.get('direction', '')
            service = request.GET.get('service', '')
            search = request.GET.get('search', '')
            
            # Construire le queryset de base avec toutes les relations nécessaires
            queryset = DemandeAttestation.objects.select_related(
                'stagiaire',
                'stagiaire__etablissement'
            ).filter(statut='refusee')
            
            # Appliquer les filtres
            if statut and statut != 'tous':
                queryset = queryset.filter(statut=statut)
            
            if direction and direction != 'tous':
                queryset = queryset.filter(stagiaire__direction=direction)
            
            if service and service != 'tous':
                queryset = queryset.filter(stagiaire__service=service)
            
            # Recherche textuelle
            if search:
                queryset = queryset.filter(
                    Q(stagiaire__nom__icontains=search) |
                    Q(stagiaire__prenom__icontains=search) |
                    Q(stagiaire__email__icontains=search) |
                    Q(stagiaire__direction__icontains=search) |
                    Q(stagiaire__service__icontains=search)
                )
            
            # Pagination (optionnelle)
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            start = (page - 1) * page_size
            end = start + page_size
            
            total = queryset.count()
            demandes_list = queryset[start:end]
            
            # Sérialiser les données
            demandes_data = []
            for demande in demandes_list:
                # Construire l'URL pour télécharger le rapport
                rapport_url = None
                if demande.rapport_stage:
                    rapport_url = request.build_absolute_uri(demande.rapport_stage.url)
                
                # Construire l'URL pour télécharger la demande manuscrite
                demande_manuscrite_url = None
                if demande.demande_manuscrite:
                    demande_manuscrite_url = request.build_absolute_uri(demande.demande_manuscrite.url)
                
                # Calculer la durée du stage
                duree_jours = None
                if demande.stagiaire.date_debut and demande.stagiaire.date_fin:
                    duree_jours = (demande.stagiaire.date_fin - demande.stagiaire.date_debut).days
                
                demande_data = {
                    'id': demande.id,
                    'statut': demande.statut,
                    'date_demande': demande.date_demande.isoformat() if demande.date_demande else None,
                    'date_traitement': demande.date_traitement.isoformat() if demande.date_traitement else None,
                    'motif_refus': demande.motif_refus,
                    'fichiers': {
                        'rapport_stage': rapport_url,
                        'demande_manuscrite': demande_manuscrite_url,
                    },
                    'stagiaire': {
                        'id': demande.stagiaire.id,
                        'nom': demande.stagiaire.nom,
                        'prenom': demande.stagiaire.prenom,
                        'email': demande.stagiaire.email,
                        'telephone': demande.stagiaire.telephone,
                        'direction': demande.stagiaire.direction,
                        'service': demande.stagiaire.service,
                        'date_debut': demande.stagiaire.date_debut.isoformat() if demande.stagiaire.date_debut else None,
                        'date_fin': demande.stagiaire.date_fin.isoformat() if demande.stagiaire.date_fin else None,
                        'duree_jours': duree_jours,
                        'duree_mois': round(duree_jours / 30) if duree_jours else None,
                        'statut_stage': demande.stagiaire.statut,
                        'type_stage': demande.stagiaire.type_stage,
                        'remunere': demande.stagiaire.remunere,
                        'montant_remuneration': demande.stagiaire.montant_remuneration,
                        'lieu_stage': demande.stagiaire.lieu_stage,
                        'superviseur': demande.stagiaire.superviseur,
                        'etablissement': {
                            'nom': demande.stagiaire.etablissement.nom if demande.stagiaire.etablissement else None,
                            'email': demande.stagiaire.etablissement.email if demande.stagiaire.etablissement else None,
                        } if demande.stagiaire.etablissement else None,
                    }
                }
                demandes_data.append(demande_data)
            
            # Récupérer les directions et services uniques pour les filtres
            directions = DemandeAttestation.objects.filter(
                stagiaire__direction__isnull=False
            ).values_list('stagiaire__direction', flat=True).distinct()
            
            services = DemandeAttestation.objects.filter(
                stagiaire__service__isnull=False
            ).values_list('stagiaire__service', flat=True).distinct()
            
            # Statistiques
            stats = {
                'total': DemandeAttestation.objects.count(),
                'en_attente': DemandeAttestation.objects.filter(statut='en_attente').count(),
                'approuvees': DemandeAttestation.objects.filter(statut='approuvee').count(),
                'refusees': DemandeAttestation.objects.filter(statut='refusee').count(),
            }
            
            return Response({
                'success': True,
                'data': demandes_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'pages': (total + page_size - 1) // page_size
                },
                'stats': stats,
                'filters': {
                    'directions': list(set(filter(None, directions))),
                    'services': list(set(filter(None, services))),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération demandes attestation: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des demandes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandesAttestationApprouveAPI(APIView):
    """
    API pour gérer les demandes d'attestation (liste, filtres, traitement)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Récupère la liste des demandes d'attestation avec filtres
        """
        try:
            # Récupérer les paramètres de filtrage
            statut = request.GET.get('statut', '')
            direction = request.GET.get('direction', '')
            service = request.GET.get('service', '')
            search = request.GET.get('search', '')
            
            # Construire le queryset de base avec toutes les relations nécessaires
            queryset = DemandeAttestation.objects.select_related(
                'stagiaire',
                'stagiaire__etablissement'
            ).filter(statut='approuvee')
            
            # Appliquer les filtres
            if statut and statut != 'tous':
                queryset = queryset.filter(statut=statut)
            
            if direction and direction != 'tous':
                queryset = queryset.filter(stagiaire__direction=direction)
            
            if service and service != 'tous':
                queryset = queryset.filter(stagiaire__service=service)
            
            # Recherche textuelle
            if search:
                queryset = queryset.filter(
                    Q(stagiaire__nom__icontains=search) |
                    Q(stagiaire__prenom__icontains=search) |
                    Q(stagiaire__email__icontains=search) |
                    Q(stagiaire__direction__icontains=search) |
                    Q(stagiaire__service__icontains=search)
                )
            
            # Pagination (optionnelle)
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            start = (page - 1) * page_size
            end = start + page_size
            
            total = queryset.count()
            demandes_list = queryset[start:end]
            
            # Sérialiser les données
            demandes_data = []
            for demande in demandes_list:
                # Construire l'URL pour télécharger le rapport
                rapport_url = None
                if demande.rapport_stage:
                    rapport_url = request.build_absolute_uri(demande.rapport_stage.url)
                
                # Construire l'URL pour télécharger la demande manuscrite
                demande_manuscrite_url = None
                if demande.demande_manuscrite:
                    demande_manuscrite_url = request.build_absolute_uri(demande.demande_manuscrite.url)
                
                # Calculer la durée du stage
                duree_jours = None
                if demande.stagiaire.date_debut and demande.stagiaire.date_fin:
                    duree_jours = (demande.stagiaire.date_fin - demande.stagiaire.date_debut).days
                
                demande_data = {
                    'id': demande.id,
                    'statut': demande.statut,
                    'date_demande': demande.date_demande.isoformat() if demande.date_demande else None,
                    'date_traitement': demande.date_traitement.isoformat() if demande.date_traitement else None,
                    'motif_refus': demande.motif_refus,
                    'fichiers': {
                        'rapport_stage': rapport_url,
                        'demande_manuscrite': demande_manuscrite_url,
                        'attestation_generee': request.build_absolute_uri(demande.attestation_generee.url) if demande.attestation_generee else None,
                        'attestation_signee': request.build_absolute_uri(demande.attestation_signee.url) if demande.attestation_signee else None,
                    },
                    'stagiaire': {
                        'id': demande.stagiaire.id,
                        'nom': demande.stagiaire.nom,
                        'prenom': demande.stagiaire.prenom,
                        'email': demande.stagiaire.email,
                        'telephone': demande.stagiaire.telephone,
                        'direction': demande.stagiaire.direction,
                        'service': demande.stagiaire.service,
                        'date_debut': demande.stagiaire.date_debut.isoformat() if demande.stagiaire.date_debut else None,
                        'date_fin': demande.stagiaire.date_fin.isoformat() if demande.stagiaire.date_fin else None,
                        'duree_jours': duree_jours,
                        'duree_mois': round(duree_jours / 30) if duree_jours else None,
                        'statut_stage': demande.stagiaire.statut,
                        'type_stage': demande.stagiaire.type_stage,
                        'remunere': demande.stagiaire.remunere,
                        'montant_remuneration': demande.stagiaire.montant_remuneration,
                        'lieu_stage': demande.stagiaire.lieu_stage,
                        'superviseur': demande.stagiaire.superviseur,
                        'etablissement': {
                            'nom': demande.stagiaire.etablissement.nom if demande.stagiaire.etablissement else None,
                            'email': demande.stagiaire.etablissement.email if demande.stagiaire.etablissement else None,
                        } if demande.stagiaire.etablissement else None,
                    }
                }
                demandes_data.append(demande_data)
            
            # Récupérer les directions et services uniques pour les filtres
            directions = DemandeAttestation.objects.filter(
                stagiaire__direction__isnull=False
            ).values_list('stagiaire__direction', flat=True).distinct()
            
            services = DemandeAttestation.objects.filter(
                stagiaire__service__isnull=False
            ).values_list('stagiaire__service', flat=True).distinct()
            
            # Statistiques
            stats = {
                'total': DemandeAttestation.objects.count(),
                'en_attente': DemandeAttestation.objects.filter(statut='en_attente').count(),
                'approuvees': DemandeAttestation.objects.filter(statut='approuvee').count(),
                'refusees': DemandeAttestation.objects.filter(statut='refusee').count(),
            }
            
            return Response({
                'success': True,
                'data': demandes_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'pages': (total + page_size - 1) // page_size
                },
                'stats': stats,
                'filters': {
                    'directions': list(set(filter(None, directions))),
                    'services': list(set(filter(None, services))),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération demandes attestation: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des demandes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandesAttestationTraiteeAPI(APIView):
    """
    API pour gérer les demandes d'attestation (liste, filtres, traitement)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Récupère la liste des demandes d'attestation avec filtres
        """
        try:
            # Récupérer les paramètres de filtrage
            statut = request.GET.get('statut', '')
            direction = request.GET.get('direction', '')
            service = request.GET.get('service', '')
            search = request.GET.get('search', '')
            
            # Construire le queryset de base avec toutes les relations nécessaires
            queryset = DemandeAttestation.objects.select_related(
                'stagiaire',
                'stagiaire__etablissement'
            ).filter(statut='traitee')
            
            # Appliquer les filtres
            if statut and statut != 'tous':
                queryset = queryset.filter(statut=statut)
            
            if direction and direction != 'tous':
                queryset = queryset.filter(stagiaire__direction=direction)
            
            if service and service != 'tous':
                queryset = queryset.filter(stagiaire__service=service)
            
            # Recherche textuelle
            if search:
                queryset = queryset.filter(
                    Q(stagiaire__nom__icontains=search) |
                    Q(stagiaire__prenom__icontains=search) |
                    Q(stagiaire__email__icontains=search) |
                    Q(stagiaire__direction__icontains=search) |
                    Q(stagiaire__service__icontains=search)
                )
            
            # Pagination (optionnelle)
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            start = (page - 1) * page_size
            end = start + page_size
            
            total = queryset.count()
            demandes_list = queryset[start:end]
            
            # Sérialiser les données
            demandes_data = []
            for demande in demandes_list:
                # Construire l'URL pour télécharger le rapport
                rapport_url = None
                if demande.rapport_stage:
                    rapport_url = request.build_absolute_uri(demande.rapport_stage.url)
                
                # Construire l'URL pour télécharger la demande manuscrite
                demande_manuscrite_url = None
                if demande.demande_manuscrite:
                    demande_manuscrite_url = request.build_absolute_uri(demande.demande_manuscrite.url)
                
                # Calculer la durée du stage
                duree_jours = None
                if demande.stagiaire.date_debut and demande.stagiaire.date_fin:
                    duree_jours = (demande.stagiaire.date_fin - demande.stagiaire.date_debut).days
                
                demande_data = {
                    'id': demande.id,
                    'statut': demande.statut,
                    'date_demande': demande.date_demande.isoformat() if demande.date_demande else None,
                    'date_traitement': demande.date_traitement.isoformat() if demande.date_traitement else None,
                    'motif_refus': demande.motif_refus,
                    'fichiers': {
                        'rapport_stage': rapport_url,
                        'demande_manuscrite': demande_manuscrite_url,
                        'attestation_generee': request.build_absolute_uri(demande.attestation_generee.url) if demande.attestation_generee else None,
                        'attestation_signee': request.build_absolute_uri(demande.attestation_signee.url) if demande.attestation_signee else None,
                    },
                    'stagiaire': {
                        'id': demande.stagiaire.id,
                        'nom': demande.stagiaire.nom,
                        'prenom': demande.stagiaire.prenom,
                        'email': demande.stagiaire.email,
                        'telephone': demande.stagiaire.telephone,
                        'direction': demande.stagiaire.direction,
                        'service': demande.stagiaire.service,
                        'date_debut': demande.stagiaire.date_debut.isoformat() if demande.stagiaire.date_debut else None,
                        'date_fin': demande.stagiaire.date_fin.isoformat() if demande.stagiaire.date_fin else None,
                        'duree_jours': duree_jours,
                        'duree_mois': round(duree_jours / 30) if duree_jours else None,
                        'statut_stage': demande.stagiaire.statut,
                        'type_stage': demande.stagiaire.type_stage,
                        'remunere': demande.stagiaire.remunere,
                        'montant_remuneration': demande.stagiaire.montant_remuneration,
                        'lieu_stage': demande.stagiaire.lieu_stage,
                        'superviseur': demande.stagiaire.superviseur,
                        'etablissement': {
                            'nom': demande.stagiaire.etablissement.nom if demande.stagiaire.etablissement else None,
                            'email': demande.stagiaire.etablissement.email if demande.stagiaire.etablissement else None,
                        } if demande.stagiaire.etablissement else None,
                    }
                }
                demandes_data.append(demande_data)
            
            # Récupérer les directions et services uniques pour les filtres
            directions = DemandeAttestation.objects.filter(
                stagiaire__direction__isnull=False
            ).values_list('stagiaire__direction', flat=True).distinct()
            
            services = DemandeAttestation.objects.filter(
                stagiaire__service__isnull=False
            ).values_list('stagiaire__service', flat=True).distinct()
            
            # Statistiques
            stats = {
                'total': DemandeAttestation.objects.count(),
                'en_attente': DemandeAttestation.objects.filter(statut='en_attente').count(),
                'approuvees': DemandeAttestation.objects.filter(statut='approuvee').count(),
                'refusees': DemandeAttestation.objects.filter(statut='refusee').count(),
            }
            
            return Response({
                'success': True,
                'data': demandes_data,
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total': total,
                    'pages': (total + page_size - 1) // page_size
                },
                'stats': stats,
                'filters': {
                    'directions': list(set(filter(None, directions))),
                    'services': list(set(filter(None, services))),
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ Erreur récupération demandes attestation: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'success': False,
                'message': 'Erreur lors de la récupération des demandes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@method_decorator([csrf_exempt, never_cache, ratelimit(key='user', rate='20/m', method='POST')], name='dispatch')
class DemandeAttestationAPIView(APIView):
    """
    API pour soumettre une demande d'attestation de stage
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]
    
    def post(self, request, tracking_id=None):
        """
        Soumet une demande d'attestation pour un stage terminé
        """
        logger.info(f"📨 Requête POST reçue pour demande d'attestation - Tracking ID: {tracking_id}")
        logger.info(f"📁 Fichiers reçus: {list(request.FILES.keys())}")
        logger.info(f"📋 Données reçues: {request.data}")
        
        # Utiliser tracking_id de l'URL ou des données
        if not tracking_id:
            tracking_id = request.data.get('tracking_id', '').strip()
        
        if not tracking_id:
            return Response({
                "success": False,
                "message": "Tracking ID manquant."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        tracking_id = tracking_id.upper()
        logger.info(f"🔍 Tracking ID final: {tracking_id}")
        
        try:
            # 1. Trouver la demande
            demande = Demande.objects.get(tracking_id=tracking_id)
            logger.info(f"✅ Demande trouvée: {demande.id} - {demande.etudiant_nom}")
            
            # 2. Trouver le stagiaire associé
            stagiaire = Stagiaire.objects.filter(demande=demande).first()
            if not stagiaire:
                return Response({
                    "success": False,
                    "message": "Aucun stage associé à cette demande."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"✅ Stagiaire trouvé: {stagiaire.id} - Statut: {stagiaire.statut}")
            
            # 3. Vérifier que le stage est en cours ou terminé
            if stagiaire.statut not in ("Terminé", "Actuel"):
                return Response({
                    "success": False,
                    "message": f"Le stage doit être en cours ou terminé pour demander une attestation. Statut actuel : {stagiaire.statut}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 4. Vérifier s'il existe déjà une demande
            existing_demande = DemandeAttestation.objects.filter(stagiaire=stagiaire).first()
            
            # Vérifier si c'est une nouvelle tentative
            is_new_attempt = request.data.get('is_new_attempt') == 'true'
            
            # Si une demande existe et ce n'est pas une nouvelle tentative
            if existing_demande and not is_new_attempt:
                return Response({
                    "success": False,
                    "message": "Une demande d'attestation existe déjà pour ce stage."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Si c'est une nouvelle tentative mais la demande n'est pas refusée
            if existing_demande and is_new_attempt and existing_demande.statut != 'refusee':
                return Response({
                    "success": False,
                    "message": f"Impossible de soumettre une nouvelle demande. Statut actuel : {existing_demande.get_statut_display()}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 5. Valider les fichiers selon le type de stage
            # Fonctionnel = demande manuscrite uniquement
            # Académique/Libre = rapport de stage + demande manuscrite
            rapport_requis = stagiaire.type_stage in ("Académique", "Libre")

            if rapport_requis and 'rapport_stage' not in request.FILES:
                return Response({
                    "success": False,
                    "message": "Le rapport de stage est obligatoire pour un stage académique ou libre."
                }, status=status.HTTP_400_BAD_REQUEST)

            if 'demande_manuscrite' not in request.FILES:
                return Response({
                    "success": False,
                    "message": "La demande manuscrite est obligatoire."
                }, status=status.HTTP_400_BAD_REQUEST)

            rapport_file = request.FILES.get('rapport_stage')
            demande_file = request.FILES['demande_manuscrite']

            # Valider les extensions
            if rapport_file and not rapport_file.name.lower().endswith('.pdf'):
                return Response({
                    "success": False,
                    "message": "Le rapport de stage doit être au format PDF."
                }, status=status.HTTP_400_BAD_REQUEST)

            allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
            demande_ext = os.path.splitext(demande_file.name)[1].lower()
            if demande_ext not in allowed_extensions:
                return Response({
                    "success": False,
                    "message": "La demande manuscrite doit être en PDF, JPG ou PNG."
                }, status=status.HTTP_400_BAD_REQUEST)

            # 6. Valider la taille des fichiers (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            if rapport_file and rapport_file.size > max_size:
                return Response({
                    "success": False,
                    "message": f"Le rapport de stage est trop volumineux. Taille max: 10MB"
                }, status=status.HTTP_400_BAD_REQUEST)

            if demande_file.size > max_size:
                return Response({
                    "success": False,
                    "message": f"La demande manuscrite est trop volumineuse. Taille max: 10MB"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 7. Si c'est une nouvelle tentative, mettre à jour la demande existante
            if existing_demande and is_new_attempt:
                logger.info(f"🔄 Nouvelle tentative après refus pour la demande {existing_demande.id}")
                
                # Supprimer les anciens fichiers s'ils existent
                if existing_demande.rapport_stage:
                    try:
                        if os.path.isfile(existing_demande.rapport_stage.path):
                            os.remove(existing_demande.rapport_stage.path)
                    except Exception as e:
                        logger.warning(f"⚠️ Impossible de supprimer l'ancien rapport: {e}")
                
                if existing_demande.demande_manuscrite:
                    try:
                        if os.path.isfile(existing_demande.demande_manuscrite.path):
                            os.remove(existing_demande.demande_manuscrite.path)
                    except Exception as e:
                        logger.warning(f"⚠️ Impossible de supprimer l'ancienne demande: {e}")
                
                # Mettre à jour la demande existante
                if rapport_file:
                    existing_demande.rapport_stage = rapport_file
                existing_demande.demande_manuscrite = demande_file
                existing_demande.statut = 'en_attente'
                existing_demande.motif_refus = None
                existing_demande.date_traitement = None
                existing_demande.date_demande = timezone.now()
                existing_demande.save()
                
                demande_attestation = existing_demande
                logger.info(f"✅ Demande d'attestation mise à jour: {demande_attestation.id}")
                
            else:
                # 8. Créer une nouvelle demande d'attestation
                demande_attestation_data = {
                    'stagiaire': stagiaire.id,
                    'demande_manuscrite': demande_file,
                    'statut': 'en_attente'
                }
                if rapport_file:
                    demande_attestation_data['rapport_stage'] = rapport_file
                
                serializer = DemandeAttestationSerializer(data=demande_attestation_data)
                
                if not serializer.is_valid():
                    logger.error(f"❌ Erreur de validation: {serializer.errors}")
                    return Response({
                        "success": False,
                        "message": "Erreur de validation des données.",
                        "errors": serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                demande_attestation = serializer.save()
                logger.info(f"✅ Demande d'attestation créée: {demande_attestation.id}")
            
            # 9. Envoyer les notifications
            # ✅ ENVOI EMAIL SIMPLIFIÉ via le service
            try:
                email_envoye = EmailSenderService.send_demande_attestation_stagiaire(
                    stagiaire=stagiaire,
                    demande_attestation=demande_attestation,
                    async_send=True
                )
            except Exception as e:
                logger.error(f"❌ Erreur envoi email: {e}")
                email_envoye = False
            
            # 🔔 NOTIFICATION AUX ADMINISTRATEURS
            try:
                notification_creee = NotificationService.notifier_nouvelle_demande_attestation(
                    stagiaire=stagiaire,
                    demande_attestation=demande_attestation
                )
            except Exception as e:
                logger.error(f"❌ Erreur notification: {e}")
                notification_creee = None
            
            # 📢 DIFFUSION AUX ADMINISTRATEURS
            try:
                NotificationService.broadcast_nouvelle_demande_attestation(
                    stagiaire=stagiaire,
                    demande_attestation=demande_attestation
                )
            except Exception as e:
                logger.error(f"❌ Erreur broadcast: {e}")
            
            logger.info(f"📧 Email envoyé: {email_envoye}, Notification créée: {notification_creee is not None}")
            
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
                "success": True,
                "message": "Demande d'attestation envoyée avec succès." + (" (Nouvelle tentative)" if is_new_attempt else ""),
                "data": {
                    "id": demande_attestation.id,
                    "date_demande": demande_attestation.date_demande.isoformat(),
                    "statut": demande_attestation.statut,
                    "email_envoye": email_envoye,
                    "notification_creee": notification_data,
                    "is_new_attempt": is_new_attempt,
                    "stagiaire": {
                        "nom": stagiaire.nom,
                        "prenom": stagiaire.prenom,
                        "email": stagiaire.email
                    }
                }
            }, status=status.HTTP_201_CREATED if not is_new_attempt else status.HTTP_200_OK)
                
        except Demande.DoesNotExist:
            logger.error(f"❌ Demande introuvable: {tracking_id}")
            return Response({
                "success": False,
                "message": "Aucune demande trouvée avec ce code de suivi."
            }, status=status.HTTP_404_NOT_FOUND)
            
        except IntegrityError:
            # Collision : une demande a été créée en parallèle (contrainte OneToOne).
            logger.warning(f"⚠️ Collision de demande d'attestation pour le tracking {tracking_id}")
            return Response({
                "success": False,
                "message": "Une demande d'attestation existe déjà pour ce stage."
            }, status=status.HTTP_409_CONFLICT)

        except Exception as e:
            logger.error(f"❌ Erreur serveur: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                "success": False,
                "message": "Une erreur est survenue lors du traitement de votre demande."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator([never_cache, ratelimit(key='user', rate='30/m', method='GET')], name='dispatch')
class DemandeAttestationDetailAPI(APIView):
    """
    API pour récupérer le détail d'une demande d'attestation
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, demande_id):
        try:
            demande = get_object_or_404(
                DemandeAttestation.objects.select_related('stagiaire', 'stagiaire__etablissement'),
                id=demande_id
            )
            stagiaire = demande.stagiaire

            duree_jours = None
            if stagiaire.date_debut and stagiaire.date_fin:
                duree_jours = (stagiaire.date_fin - stagiaire.date_debut).days

            data = {
                'id': demande.id,
                'statut': demande.statut,
                'date_demande': demande.date_demande.isoformat() if demande.date_demande else None,
                'date_traitement': demande.date_traitement.isoformat() if demande.date_traitement else None,
                'date_upload_attestation_signee': demande.date_upload_attestation_signee.isoformat() if demande.date_upload_attestation_signee else None,
                'motif_refus': demande.motif_refus,
                'fichiers': {
                    'rapport_stage': request.build_absolute_uri(demande.rapport_stage.url) if demande.rapport_stage else None,
                    'demande_manuscrite': request.build_absolute_uri(demande.demande_manuscrite.url) if demande.demande_manuscrite else None,
                    'attestation_generee': request.build_absolute_uri(demande.attestation_generee.url) if demande.attestation_generee else None,
                    'attestation_signee': request.build_absolute_uri(demande.attestation_signee.url) if demande.attestation_signee else None,
                },
                'stagiaire': {
                    'id': stagiaire.id,
                    'nom': stagiaire.nom,
                    'prenom': stagiaire.prenom,
                    'email': stagiaire.email,
                    'telephone': stagiaire.telephone,
                    'direction': stagiaire.direction,
                    'service': stagiaire.service,
                    'date_debut': stagiaire.date_debut.isoformat() if stagiaire.date_debut else None,
                    'date_fin': stagiaire.date_fin.isoformat() if stagiaire.date_fin else None,
                    'duree_jours': duree_jours,
                    'duree_mois': round(duree_jours / 30) if duree_jours else None,
                    'statut': stagiaire.statut,
                    'type_stage': stagiaire.type_stage,
                    'specialite': getattr(stagiaire, 'specialite', None),
                    'remunere': stagiaire.remunere,
                    'montant_remuneration': stagiaire.montant_remuneration,
                    'lieu_stage': stagiaire.lieu_stage,
                    'superviseur': stagiaire.superviseur,
                    'photo_passeport': request.build_absolute_uri(stagiaire.photo_passeport.url) if stagiaire.photo_passeport else None,
                    'genre': getattr(stagiaire, 'genre', None),
                    'pays_residence': getattr(stagiaire, 'pays_residence', None),
                    'adresse': getattr(stagiaire, 'adresse', None),
                    'niveau_etude': getattr(stagiaire, 'niveau_etude', None),
                    'etablissement': {
                        'nom': stagiaire.etablissement.nom if stagiaire.etablissement else None,
                        'email': stagiaire.etablissement.email if stagiaire.etablissement else None,
                    } if stagiaire.etablissement else None,
                }
            }

            return Response({
                'success': True,
                'data': data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"❌ Erreur récupération détail demande attestation {demande_id}: {str(e)}")
            return Response({
                'success': False,
                'message': f'Erreur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator([csrf_exempt, never_cache, ratelimit(key='user', rate='20/m', method='POST')], name='dispatch')
class RegenerarAttestationAvecSignataireAPI(APIView):
    """
    API pour régénérer l'attestation PDF avec un signataire choisi
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                demande_attestation = get_object_or_404(DemandeAttestation.objects.select_for_update(), id=demande_id)

                if demande_attestation.statut not in (DemandeAttestation.Statut.APPROUVEE, DemandeAttestation.Statut.TRAITEE):
                    return Response({
                        'success': False,
                        'message': f"La demande doit être approuvée pour régénérer l'attestation. Statut actuel: {demande_attestation.get_statut_display()}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                signataire = request.data.get('signataire', 'DG')
                if signataire not in ('DG', 'DGA'):
                    return Response({
                        'success': False,
                        'message': "Signataire invalide. Valeurs possibles: DG, DGA"
                    }, status=status.HTTP_400_BAD_REQUEST)

                SIGNATAIRES = {
                    'DG': {'titre': 'Le Directeur Général', 'nom': 'Dr. Karimou CHABI SIKA'},
                    'DGA': {'titre': 'Le Directeur Général Adjoint', 'nom': 'M. Damipi NOUPOKOU'},
                }
                sig = SIGNATAIRES[signataire]

                # Générer le document Word
                from stages.docx_generator import generer_attestation_docx
                attestation_docx = generer_attestation_docx(demande_attestation, signataire_id=signataire)

                timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
                nom_fichier = f"attestation_generee_{demande_attestation.stagiaire.nom}_{demande_attestation.stagiaire.prenom}_{timestamp}.docx"

                demande_attestation.attestation_generee.save(
                    nom_fichier,
                    ContentFile(attestation_docx.getvalue()),
                    save=True
                )

                UserAction.objects.create(
                    user=request.user,
                    action=f"Attestation régénérée avec signataire {signataire} - Demande #{demande_attestation.id}",
                    performed_by=request.user,
                )

                logger.info(f"✅ Attestation régénérée pour demande {demande_id} par {request.user.email} (signataire: {signataire})")

                return Response({
                    'success': True,
                    'message': f'Attestation régénérée avec succès (signataire: {sig["titre"]})',
                    'pdf_url': request.build_absolute_uri(demande_attestation.attestation_generee.url),
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"❌ Erreur régénération attestation {demande_id}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Erreur: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@method_decorator([csrf_exempt, never_cache, ratelimit(key='user', rate='20/m', method='POST')], name='dispatch')
class ApprouverDemandeAttestationAPI(APIView):
    """
    API pour approuver une demande d'attestation
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupérer la demande d'attestation
                demande_attestation = get_object_or_404(DemandeAttestation.objects.select_for_update(), id=demande_id)
                
                # Vérifier que la demande est en attente
                if demande_attestation.statut != DemandeAttestation.Statut.EN_ATTENTE:
                    return Response({
                        'success': False,
                        'message': f"Cette demande est déjà {demande_attestation.get_statut_display()}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # 📄 GÉNÉRER ET SAUVEGARDER L'ATTESTATION WORD DANS LE CHAMP APPROPRIÉ
                try:
                    from stages.docx_generator import generer_attestation_docx
                    attestation_docx = generer_attestation_docx(demande_attestation, signataire_id="DG")

                    # Générer un nom de fichier unique
                    timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
                    nom_fichier = f"attestation_generee_{demande_attestation.stagiaire.nom}_{demande_attestation.stagiaire.prenom}_{timestamp}.docx"

                    # CORRECTION : Sauvegarder dans attestation_generee (pas attestation_signee)
                    demande_attestation.attestation_generee.save(
                        nom_fichier,
                        ContentFile(attestation_docx.getvalue()),
                        save=False
                    )

                    logger.info(f"✅ Attestation Word générée et sauvegardée dans attestation_generee pour {demande_attestation.stagiaire}")
                    
                except Exception as e:
                    logger.error(f"❌ Erreur génération/sauvegarde PDF: {e}", exc_info=True)
                    # Ne pas continuer si l'attestation échoue
                    return Response({
                        'success': False,
                        'message': f'Erreur lors de la génération de l\'attestation: {str(e)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # Mettre à jour le statut
                demande_attestation.statut = DemandeAttestation.Statut.APPROUVEE
                demande_attestation.date_traitement = timezone.now()
                demande_attestation.motif_refus = None
                demande_attestation.save()
                
                # 🔔 NOTIFICATION au stagiaire
                try:
                    email_envoye = EmailSenderService.send_demande_attestation_approuvee(
                        stagiaire=demande_attestation.stagiaire,
                        demande_attestation=demande_attestation,
                        async_send=True
                    )
                    logger.info(f"✅ Email d'approbation envoyé au stagiaire: {email_envoye}")
                except Exception as e:
                    logger.error(f"❌ Erreur envoi email approbation: {e}", exc_info=True)
                
                # 📢 NOTIFICATION AUX ADMINISTRATEURS
                try:
                    NotificationService.notifier_attestation_approuvee(
                        stagiaire=demande_attestation.stagiaire,
                        demande_attestation=demande_attestation,
                        user=request.user
                    )
                    logger.info(f"✅ Notification d'approbation envoyée")
                except Exception as e:
                    logger.error(f"❌ Erreur notification approbation: {e}", exc_info=True)
                
                # 📝 Enregistrer l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Attestation approuvée - Demande #{demande_attestation.id}",
                    performed_by=request.user,
                )
                
                logger.info(f"✅ Demande d'attestation {demande_id} approuvée par {request.user.email}")
                
                return Response({
                    'success': True,
                    'message': 'Demande d\'attestation approuvée avec succès',
                    'data': {
                        'id': demande_attestation.id,
                        'statut': demande_attestation.statut,
                        'date_traitement': demande_attestation.date_traitement.isoformat(),
                        'stagiaire': {
                            'nom': demande_attestation.stagiaire.nom,
                            'prenom': demande_attestation.stagiaire.prenom,
                            'email': demande_attestation.stagiaire.email
                        },
                        'fichiers': {
                            'attestation_generee': demande_attestation.attestation_generee.url if demande_attestation.attestation_generee else None,
                            'attestation_signee': demande_attestation.attestation_signee.url if demande_attestation.attestation_signee else None
                        }
                    }
                }, status=status.HTTP_200_OK)
                
        except DemandeAttestation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Demande d\'attestation non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Erreur approbation demande attestation {demande_id}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Erreur lors de l\'approbation: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@method_decorator([csrf_exempt, never_cache, ratelimit(key='user', rate='20/m', method='POST')], name='dispatch')
class RefuserDemandeAttestationAPI(APIView):
    """
    API pour refuser une demande d'attestation
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupérer la demande d'attestation
                demande_attestation = get_object_or_404(DemandeAttestation.objects.select_for_update(), id=demande_id)
                
                # Vérifier que la demande est en attente
                if demande_attestation.statut != DemandeAttestation.Statut.EN_ATTENTE:
                    return Response({
                        'success': False,
                        'message': f"Cette demande est déjà {demande_attestation.get_statut_display()}"
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Récupérer le motif du refus
                motif_refus = request.data.get('motif_refus', '').strip()
                if not motif_refus:
                    return Response({
                        'success': False,
                        'message': 'Le motif du refus est obligatoire'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Mettre à jour le statut
                demande_attestation.statut = DemandeAttestation.Statut.REFUSEE
                demande_attestation.date_traitement = timezone.now()
                demande_attestation.motif_refus = motif_refus
                demande_attestation.save()
                
                # 🔔 NOTIFICATION au stagiaire
                try:
                    # Envoyer un email de refus au stagiaire
                    email_envoye = EmailSenderService.send_demande_attestation_refusee(
                        stagiaire=demande_attestation.stagiaire,
                        demande_attestation=demande_attestation,
                        async_send=True
                    )
                    logger.info(f"✅ Email de refus envoyé au stagiaire: {email_envoye}")
                except Exception as e:
                    logger.error(f"❌ Erreur envoi email refus: {e}")
                
                # 📢 NOTIFICATION AUX ADMINISTRATEURS
                try:
                    NotificationService.notifier_attestation_refusee(
                        stagiaire=demande_attestation.stagiaire,
                        demande_attestation=demande_attestation,
                        user=request.user,
                        motif=motif_refus
                    )
                    logger.info(f"✅ Notification de refus envoyée")
                except Exception as e:
                    logger.error(f"❌ Erreur notification refus: {e}")
                
                # 📝 Enregistrer l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Attestation refusée - Demande #{demande_attestation.id}",
                    performed_by=request.user,
                   
                )
                
                logger.info(f"✅ Demande d'attestation {demande_id} refusée par {request.user.email}")
                
                return Response({
                    'success': True,
                    'message': 'Demande d\'attestation refusée avec succès',
                    'data': {
                        'id': demande_attestation.id,
                        'statut': demande_attestation.statut,
                        'date_traitement': demande_attestation.date_traitement.isoformat(),
                        'motif_refus': demande_attestation.motif_refus,
                        'stagiaire': {
                            'nom': demande_attestation.stagiaire.nom,
                            'prenom': demande_attestation.stagiaire.prenom,
                            'email': demande_attestation.stagiaire.email
                        }
                    }
                }, status=status.HTTP_200_OK)
                
        except DemandeAttestation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Demande d\'attestation non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Erreur refus demande attestation {demande_id}: {str(e)}")
            return Response({
                'success': False,
                'message': f'Erreur lors du refus: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@method_decorator([csrf_exempt, never_cache, ratelimit(key='user', rate='20/m', method='DELETE')], name='dispatch')
class SupprimerDemandeAttestationAPI(APIView):
    """
    API pour supprimer une demande d'attestation
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupérer la demande d'attestation
                demande_attestation = get_object_or_404(DemandeAttestation.objects.select_for_update(), id=demande_id)
                
                # Sauvegarder les informations pour le log
                stagiaire_info = f"{demande_attestation.stagiaire.nom} {demande_attestation.stagiaire.prenom}"
                
                # Supprimer les fichiers physiques
                try:
                    if demande_attestation.rapport_stage:
                        demande_attestation.rapport_stage.delete(save=False)
                    if demande_attestation.demande_manuscrite:
                        demande_attestation.demande_manuscrite.delete(save=False)
                except Exception as e:
                    logger.warning(f"⚠️ Erreur suppression fichiers demande attestation {demande_id}: {e}")
                
                # Supprimer l'objet
                demande_attestation.delete()
                
                # 📝 Enregistrer l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Attestation supprimée - {stagiaire_info}",
                    performed_by=request.user,
                )
                
                logger.info(f"Demande d'attestation {demande_id} supprimée par {request.user.email}")
                
                return Response({
                    'success': True,
                    'message': 'Demande d\'attestation supprimée avec succès'
                }, status=status.HTTP_200_OK)
                
        except DemandeAttestation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Demande d\'attestation non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Erreur suppression demande attestation {demande_id}: {str(e)}")
            return Response({
                'success': False,
                'message': f'Erreur lors de la suppression: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
@method_decorator([csrf_exempt, never_cache, ratelimit(key='user', rate='20/m', method='POST')], name='dispatch')
class UploadAttestationSigneeAPI(APIView):
    """
    API pour uploader l'attestation signée et finaliser la demande
    """
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, demande_id):
        try:
            with transaction.atomic():
                # Récupérer la demande d'attestation
                demande_attestation = get_object_or_404(DemandeAttestation.objects.select_for_update(), id=demande_id)
                
                # Vérifier que la demande est approuvée
                if demande_attestation.statut != DemandeAttestation.Statut.APPROUVEE:
                    return Response({
                        'success': False,
                        'message': f"Impossible d'uploader l'attestation signée. Statut actuel: {demande_attestation.get_statut_display()}"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Vérifier qu'une attestation générée existe
                if not demande_attestation.attestation_generee:
                    return Response({
                        'success': False,
                        'message': "Aucune attestation générée disponible. Veuillez d'abord approuver la demande."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Vérifier le fichier uploadé
                if 'attestation_signee' not in request.FILES:
                    return Response({
                        'success': False,
                        'message': "Le fichier de l'attestation signée est obligatoire."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                attestation_file = request.FILES['attestation_signee']
                
                # Valider l'extension
                if not attestation_file.name.lower().endswith(('.pdf', '.docx')):
                    return Response({
                        'success': False,
                        'message': "L'attestation signée doit être au format PDF ou Word (.docx)."
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Valider la taille (max 5MB)
                max_size = 5 * 1024 * 1024  # 5MB
                if attestation_file.size > max_size:
                    return Response({
                        'success': False,
                        'message': f"Le fichier est trop volumineux. Taille max: 5MB"
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Supprimer l'ancienne attestation signée si elle existe
                if demande_attestation.attestation_signee:
                    try:
                        if os.path.isfile(demande_attestation.attestation_signee.path):
                            os.remove(demande_attestation.attestation_signee.path)
                    except Exception as e:
                        logger.warning(f"⚠️ Impossible de supprimer l'ancienne attestation signée: {e}")
                
                # Sauvegarder la nouvelle attestation signée
                timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
                ext = os.path.splitext(attestation_file.name)[1].lower() or '.pdf'
                nom_fichier = f"attestation_signee_{demande_attestation.stagiaire.nom}_{demande_attestation.stagiaire.prenom}_{timestamp}{ext}"
                
                demande_attestation.attestation_signee.save(
                    nom_fichier,
                    attestation_file,
                    save=False
                )
                
                # Mettre à jour le statut et la date
                demande_attestation.statut = DemandeAttestation.Statut.TRAITEE
                demande_attestation.date_upload_attestation_signee = timezone.now()
                demande_attestation.save()
                
                # 📧 ENVOYER L'EMAIL AU STAGIAIRE AVEC L'ATTESTATION SIGNÉE
                try:
                    email_envoye = self.envoyer_attestation_signee(demande_attestation)
                    logger.info(f"✅ Email avec attestation signée envoyé au stagiaire: {email_envoye}")
                except Exception as e:
                    logger.error(f"❌ Erreur envoi email attestation signée: {e}")
                    email_envoye = False
                
                # 📢 NOTIFICATION AUX ADMINISTRATEURS
                try:
                    NotificationService.notifier_attestation_signee_upload(
                        stagiaire=demande_attestation.stagiaire,
                        demande_attestation=demande_attestation,
                        user=request.user
                    )
                    logger.info(f"✅ Notification d'upload attestation signée envoyée")
                except Exception as e:
                    logger.error(f"❌ Erreur notification upload attestation signée: {e}")
                
                # 📝 Enregistrer l'action
                UserAction.objects.create(
                    user=request.user,
                    action=f"Attestation signée uploadée - Demande #{demande_attestation.id}",
                    performed_by=request.user,
                    
                )
                
                logger.info(f"✅ Attestation signée uploadée pour la demande {demande_id}")
                
                return Response({
                    'success': True,
                    'message': 'Attestation signée uploadée avec succès',
                    'data': {
                        'id': demande_attestation.id,
                        'statut': demande_attestation.statut,
                        'date_upload_attestation_signee': demande_attestation.date_upload_attestation_signee.isoformat(),
                        'fichiers': {
                            'attestation_generee': demande_attestation.attestation_generee.url,
                            'attestation_signee': demande_attestation.attestation_signee.url
                        },
                        'stagiaire': {
                            'nom': demande_attestation.stagiaire.nom,
                            'prenom': demande_attestation.stagiaire.prenom,
                            'email': demande_attestation.stagiaire.email
                        },
                        'email_envoye': email_envoye
                    }
                }, status=status.HTTP_200_OK)
                
        except DemandeAttestation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Demande d\'attestation non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Erreur upload attestation signée {demande_id}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': f'Erreur lors de l\'upload: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def envoyer_attestation_signee(self, demande_attestation):
        """Envoie l'attestation signée au stagiaire par email"""
        try:
            # Préparer les données pour l'email
            stagiaire = demande_attestation.stagiaire
            
            # Chemin de l'attestation signée
            attestation_path = demande_attestation.attestation_signee.path
            
            # Envoyer l'email avec pièce jointe
            email_sent = EmailSenderService.send_attestation_signee(
                stagiaire=demande_attestation.stagiaire,
                demande_attestation=demande_attestation,
                attestation_path=demande_attestation.attestation_signee.path,
                async_send=True
            )
            
            return email_sent
            
        except Exception as e:
            logger.error(f"❌ Erreur préparation email attestation signée: {e}", exc_info=True)
            raise

@method_decorator([never_cache, ratelimit(key='user', rate='20/m', method='GET')], name='dispatch')
class TelechargerAttestationSigneeAPI(APIView):
    """
    API pour télécharger l'attestation signée
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, demande_id):
        try:
            demande_attestation = get_object_or_404(DemandeAttestation, id=demande_id)
            
            # Vérifier que l'attestation signée existe
            if not demande_attestation.attestation_signee:
                return Response({
                    'success': False,
                    'message': "L'attestation signée n'est pas encore disponible"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Vérifier que le fichier existe physiquement
            if not os.path.isfile(demande_attestation.attestation_signee.path):
                return Response({
                    'success': False,
                    'message': "Le fichier de l'attestation signée est introuvable"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 📝 Enregistrer le téléchargement
            UserAction.objects.create(
                user=request.user,
                action=f"Attestation signée téléchargée - Demande #{demande_attestation.id}",
                performed_by=request.user,
            )
            
            # Retourner le fichier
            file_path_att = demande_attestation.attestation_signee.path
            if file_path_att.lower().endswith('.docx'):
                ct = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            else:
                ct = 'application/pdf'
            response = FileResponse(
                open(file_path_att, 'rb'),
                content_type=ct
            )
            response['Content-Disposition'] = f'attachment; filename="{os.path.basename(demande_attestation.attestation_signee.path)}"'
            
            return response
            
        except DemandeAttestation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Demande d\'attestation non trouvée'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ Erreur téléchargement attestation signée {demande_id}: {str(e)}")
            return Response({
                'success': False,
                'message': f'Erreur lors du téléchargement: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)