# ===========================
# MODULES PYTHON STANDARD
# ===========================
import os
import random
import secrets
import logging
import threading
from datetime import datetime, timedelta, time
from io import BytesIO
from collections import defaultdict
import PyPDF2
import pdfplumber
import pytesseract
from PIL import Image
from pdf2image import convert_from_path
import google.generativeai as genai
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT, TA_LEFT
from reportlab.lib.units import cm, inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, 
    Image, Table, TableStyle
)
from .email_service import EmailTemplateService, EmailContentService

import pandas as pd
from django.conf import settings
from django.contrib.auth import (
    get_user_model, update_session_auth_hash, 
    authenticate, logout
)
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail, EmailMultiAlternatives
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
from .models import (
    Stagiaire, Notification, Entretien, Demande, RapportStage, 
    UserSession, Utilisateur, UserAction, ConventionStage, 
    Etablissement, Diplome
)
from .serializers import (
    DemandeSerializer, StagiaireSerializer, UtilisateurSerializer, 
    ProfilSerializer, UserActionSerializer
)
from utilisateurs.models import Utilisateur, Profil
from services.notification_service import NotificationService
from gsbackend.stages.optionnels.service.scoring_service import ScoringService

class CalculerScoreAPIView(APIView):
    """Calcule le score IA d'une demande spécifique"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, demande_id):
        demande = get_object_or_404(Demande, id=demande_id)
        
        try:
            # Calculer le score
            score_total, details, commentaire = ScoringService.calculer_score_candidature(demande)
            
            # Sauvegarder dans la base
            demande.score_ia = score_total
            demande.score_details = details
            demande.score_commentaire = commentaire
            demande.score_date = timezone.now()
            demande.save(update_fields=['score_ia', 'score_details', 'score_commentaire', 'score_date'])
            
            return Response({
                'success': True,
                'score': score_total,
                'details': details,
                'commentaire': commentaire
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CalculerTousScoresAPIView(APIView):
    """Calcule les scores de toutes les demandes en attente (batch)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        demandes_sans_score = Demande.objects.filter(
            statut_stage='En attente',
            score_ia=0
        )
        
        total = demandes_sans_score.count()
        
        if total == 0:
            return Response({
                'success': True,
                'message': 'Aucune demande à scorer',
                'total': 0
            })
        
        # Lancer le calcul en arrière-plan
        def calculate_all_scores():
            success_count = 0
            for demande in demandes_sans_score:
                try:
                    score_total, details, commentaire = ScoringService.calculer_score_candidature(demande)
                    
                    demande.score_ia = score_total
                    demande.score_details = details
                    demande.score_commentaire = commentaire
                    demande.score_date = timezone.now()
                    demande.save(update_fields=['score_ia', 'score_details', 'score_commentaire', 'score_date'])
                    
                    success_count += 1
                    print(f"✅ Score calculé pour {demande.etudiant_nom} : {score_total}/100")
                    
                except Exception as e:
                    print(f"❌ Erreur scoring demande {demande.id}: {e}")
            
            print(f"🎯 Scoring terminé : {success_count}/{total} demandes scorées")
        
        # Lancer en thread
        thread = threading.Thread(target=calculate_all_scores)
        thread.daemon = True
        thread.start()
        
        return Response({
            'success': True,
            'message': f'Calcul lancé pour {total} demande(s)',
            'total': total
        })
    
class EntretienAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Récupérer la liste des entretiens et demandes"""
        try:
            demandes = Demande.objects.filter(statut_stage='En cours de traitement')
            entretiens = Entretien.objects.all()
            
            data = {
                "demandes": [
                    {
                        "id": d.id, 
                        "nom": f"{d.etudiant_nom} {d.etudiant_prenom}",
                        "email": d.etudiant_email
                    } 
                    for d in demandes
                ],
                "entretiens": [
                    {
                        "id": str(e.id),
                        "titre": e.titre,
                        "date": e.date.isoformat() if e.date else None,
                        "heure_debut": e.heure_debut.strftime("%H:%M") if e.heure_debut else None,
                        "heure_fin": None,
                        "demandeur": f"{e.demandeur.etudiant_nom} {e.demandeur.etudiant_prenom}" if e.demandeur else "Demandeur inconnu",
                        "status": e.status,
                        "motif_annulation": e.motif_annulation
                    }
                    for e in entretiens
                ],
            }
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la récupération des données: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Créer un nouvel entretien avec notifications push et email"""
        try:
            data = request.data
            
            # Validation des champs requis
            required_fields = ['titre', 'date', 'heure_debut', 'demandeur_id']
            for field in required_fields:
                if field not in data or not data[field]:
                    return Response(
                        {"error": f"Le champ '{field}' est requis"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Récupérer la demande associée
            try:
                demandeur = Demande.objects.get(id=data['demandeur_id'])
            except Demande.DoesNotExist:
                return Response(
                    {"error": "Demandeur non trouvé"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Valider et parser la date
            try:
                date_obj = datetime.strptime(data['date'], '%Y-%m-%d').date()
                if date_obj < timezone.now().date():
                    return Response(
                        {"error": "La date de l'entretien ne peut pas être dans le passé"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except ValueError:
                return Response(
                    {"error": "Format de date invalide. Utilisez YYYY-MM-DD"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Valider et parser l'heure
            try:
                heure_debut_obj = datetime.strptime(data['heure_debut'], '%H:%M').time()
            except ValueError:
                return Response(
                    {"error": "Format d'heure invalide. Utilisez HH:MM"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Créer l'entretien
            entretien = Entretien.objects.create(
                titre=data.get('titre', 'Entretien de stage'),
                date=date_obj,
                heure_debut=heure_debut_obj,
                demandeur=demandeur,
                status=data.get('status', 'planifié'),
                motif_annulation=data.get('motif_annulation', '')
            )
            
            # 🔔 NOTIFICATION PUSH EN TEMPS RÉEL
            NotificationService.notifier_creation_entretien(entretien, request.user)
            
            # 📧 ENVOI D'EMAIL AU DEMANDEUR
            self.envoyer_notification_creation(entretien)
            
            # Retourner l'entretien créé
            response_data = {
                "id": str(entretien.id),
                "titre": entretien.titre,
                "date": entretien.date.isoformat(),
                "heure_debut": entretien.heure_debut.strftime("%H:%M"),
                "heure_fin": None,
                "demandeur": f"{entretien.demandeur.etudiant_nom} {entretien.demandeur.etudiant_prenom}",
                "status": entretien.status,
                "motif_annulation": entretien.motif_annulation,
                "message": "Entretien créé avec succès. Notification push et email envoyés."
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Erreur lors de la création: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def envoyer_notification_creation(self, entretien):
        """Envoie un email de notification pour la création de l'entretien"""
        
        print("=== ENVOI NOTIFICATION CRÉATION ENTRETIEN ===")
        
        # Vérifier que le candidat a un email
        if not hasattr(entretien.demandeur, 'etudiant_email') or not entretien.demandeur.etudiant_email:
            print("❌ Aucun email trouvé pour le candidat")
            return False
        
        subject = f"Convocation à un entretien - {entretien.demandeur.tracking_id}"
        
        # Formater la date pour l'affichage
        try:
            date_formatee = entretien.date.strftime("%d/%m/%Y")
        except:
            date_formatee = entretien.date
        
        # Récupérer les attributs avec fallback pour éviter les erreurs
        lieu = getattr(entretien, 'lieu', 'Siège CEB - Porto-Novo')
        contact_rh = getattr(entretien, 'contact_rh', 'Service des Stages - 21 30 05 06')
        notes_entretien = getattr(entretien, 'notes', 'Présentez-vous 15 minutes avant l\'heure prévue avec votre CV et pièces d\'identité.')
        
        # Template HTML professionnel pour la création
        html_message = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convocation à un entretien</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }}
        
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
        }}
        
        .header {{
            background: #2c5aa0;
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .greeting {{
            font-size: 16px;
            font-weight: 600;
            color: #2c5aa0;
            margin-bottom: 20px;
        }}
        
        .message {{
            font-size: 14px;
            color: #555555;
            line-height: 1.7;
            margin-bottom: 25px;
        }}
        
        .convocation-section {{
            background: #e7f3ff;
            border-left: 4px solid #2c5aa0;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .convocation-title {{
            font-size: 16px;
            font-weight: 600;
            color: #2c5aa0;
            margin-bottom: 15px;
            text-align: center;
        }}
        
        .details-grid {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 15px 0;
        }}
        
        .detail-item {{
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #eaeaea;
        }}
        
        .detail-label {{
            font-weight: 600;
            color: #666666;
            font-size: 13px;
        }}
        
        .detail-value {{
            color: #333333;
            font-size: 13px;
            text-align: right;
        }}
        
        .instructions-section {{
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .instructions-title {{
            font-weight: 600;
            color: #856404;
            margin-bottom: 10px;
        }}
        
        .instructions-list {{
            list-style: none;
            padding-left: 0;
        }}
        
        .instructions-list li {{
            padding: 8px 0;
            color: #856404;
            font-size: 14px;
            border-bottom: 1px solid #ffeaa7;
        }}
        
        .instructions-list li:last-child {{
            border-bottom: none;
        }}
        
        .contact-section {{
            background: #e2e3e5;
            border: 1px solid #d6d8db;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }}
        
        .contact-title {{
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 10px;
        }}
        
        .footer {{
            background: #2c3e50;
            color: #ffffff;
            padding: 25px;
            text-align: center;
        }}
        
        .contact-info {{
            font-size: 12px;
            color: #bdc3c7;
            line-height: 1.6;
            margin: 10px 0;
        }}
        
        .copyright {{
            font-size: 11px;
            color: #95a5a6;
            margin-top: 15px;
            border-top: 1px solid #34495e;
            padding-top: 10px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>Convocation à un Entretien</h1>
            <p>Communauté Électrique du Bénin</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                Cher(e) {entretien.demandeur.etudiant_prenom},
            </div>
            
            <!-- Message principal -->
            <div class="message">
                Nous avons le plaisir de vous convier à un entretien au sein de la Communauté Électrique du Bénin 
                dans le cadre de votre candidature pour un stage.
            </div>
            
            <!-- Section convocation -->
            <div class="convocation-section">
                <div class="convocation-title">Détails de votre entretien</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Type d'entretien :</span>
                        <span class="detail-value">{entretien.titre}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date :</span>
                        <span class="detail-value">{date_formatee}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Heure :</span>
                        <span class="detail-value">{entretien.heure_debut.strftime("%H:%M")}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Lieu :</span>
                        <span class="detail-value">{lieu}</span>
                    </div>
                </div>
            </div>
            
            <!-- Instructions importantes -->
            <div class="instructions-section">
                <div class="instructions-title">Instructions importantes</div>
                <ul class="instructions-list">
                    <li>• Présentez-vous 15 minutes avant l'heure prévue</li>
                    <li>• Apportez votre CV à jour</li>
                    <li>• Munissez-vous d'une pièce d'identité</li>
                    <li>• Préparez les documents relatifs à votre formation</li>
                    <li>• Tenue professionnelle exigée</li>
                </ul>
            </div>
            
            <!-- Notes supplémentaires -->
            <div class="message">
                <strong>Notes :</strong> {notes_entretien}
            </div>
            
            <!-- Contact et informations -->
            <div class="contact-section">
                <div class="contact-title">Pour toute information complémentaire</div>
                <div class="message">
                    {contact_rh}
                </div>
            </div>
            
            <div class="message">
                Nous restons à votre disposition pour toute information complémentaire et nous réjouissons 
                de vous rencontrer prochainement.
            </div>
            
            <div class="message">
                Cordiales salutations,<br>
                <strong>Le Service des Stages - CEB</strong>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="contact-info">
                <strong>Service des Stages - CEB</strong><br>
                Email : stages@ceb.bj | Téléphone : +229 21 30 05 06<br>
                Horaires : Lundi - Vendredi, 8h00 - 17h00
            </div>
            
            <div class="copyright">
                © 2024 Communauté Électrique du Bénin. Tous droits réservés.<br>
                Cet email a été généré automatiquement.
            </div>
        </div>
    </div>
</body>
</html>"""
        
        # Version texte simple pour le candidat
        text_message = f"""
CONVOCATION À UN ENTRETIEN

Cher(e) {entretien.demandeur.etudiant_prenom},

Nous avons le plaisir de vous convier à un entretien au sein de la Communauté Électrique du Bénin dans le cadre de votre candidature pour un stage.

DÉTAILS DE L'ENTRETIEN :
Type d'entretien : {entretien.titre}
Date : {date_formatee}
Heure : {entretien.heure_debut.strftime("%H:%M")}
Lieu : {lieu}

INSTRUCTIONS IMPORTANTES :
• Présentez-vous 15 minutes avant l'heure prévue
• Apportez votre CV à jour
• Munissez-vous d'une pièce d'identité
• Préparez les documents relatifs à votre formation
• Tenue professionnelle exigée

NOTES :
{notes_entretien}

CONTACT :
{contact_rh}

Nous restons à votre disposition pour toute information complémentaire et nous réjouissons de vous rencontrer prochainement.

Cordiales salutations,
Le Service des Stages - CEB

Service des Stages - CEB
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        
        try:
            print(f"📧 Destination candidat: {entretien.demandeur.etudiant_email}")
            print(f"📝 Sujet: {subject}")
            print(f"📅 Date entretien: {date_formatee} à {entretien.heure_debut.strftime('%H:%M')}")
            print(f"📋 Titre de l'entretien: {entretien.titre}")
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email="stages@ceb.bj",
                to=[entretien.demandeur.etudiant_email],
                reply_to=['stages@ceb.bj'],
            )
            
            email.attach_alternative(html_message, "text/html")
            
            result = email.send(fail_silently=False)
            print(f"✅ NOTIFICATION CRÉATION ENVOYÉE AU CANDIDAT! Résultat: {result}")
            return True
            
        except Exception as e:
            print(f"❌ ERREUR ENVOI NOTIFICATION CRÉATION: {str(e)}")
            # Fallback simple
            try:
                send_mail(
                    subject,
                    text_message,
                    "stages@ceb.bj",
                    [entretien.demandeur.etudiant_email],
                    fail_silently=False,
                )
                print("✅ Email texte envoyé en fallback pour création")
                return True
            except Exception as fallback_error:
                print(f"❌ Erreur fallback création: {fallback_error}")
                return False

class EntretienDetailAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        try:
            return Entretien.objects.get(pk=pk)
        except Entretien.DoesNotExist:
            return None
    
    def get(self, request, pk):
        entretien = self.get_object(pk)
        if not entretien:
            return Response({"error": "Entretien introuvable"}, status=404)
        
        data = {
            "id": str(entretien.id),
            "titre": entretien.titre,
            "date": entretien.date.isoformat() if entretien.date else None,
            "heure_debut": entretien.heure_debut.strftime("%H:%M") if entretien.heure_debut else None,
            "heure_fin": None,
            "demandeur": f"{entretien.demandeur.etudiant_nom} {entretien.demandeur.etudiant_prenom}" if entretien.demandeur else "Demandeur inconnu",
            "status": entretien.status,
            "motif_annulation": entretien.motif_annulation,
        }
        return Response(data, status=200)
    
    def put(self, request, pk):
        entretien = self.get_object(pk)
        if not entretien:
            return Response({"error": "Entretien introuvable"}, status=404)
        
        data = request.data
        modifications = []
        
        if "titre" in data and data["titre"] != entretien.titre:
            entretien.titre = data["titre"]
            modifications.append("titre")
        
        if "date" in data:
            try:
                new_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
                if new_date != entretien.date:
                    entretien.date = new_date
                    modifications.append("date")
            except ValueError:
                return Response({"error": "Format de date invalide"}, status=400)
        
        if "heure_debut" in data:
            try:
                new_heure = datetime.strptime(data["heure_debut"], "%H:%M").time()
                if new_heure != entretien.heure_debut:
                    entretien.heure_debut = new_heure
                    modifications.append("heure de début")
            except ValueError:
                return Response({"error": "Format d'heure invalide"}, status=400)
        
        if "status" in data:
            if data["status"] in [choice[0] for choice in Entretien.STATUT_CHOICES]:
                ancien_statut = entretien.status
                entretien.status = data["status"]
                modifications.append("statut")
                
                if data["status"] == 'annulé' and ancien_statut != 'annulé':
                    NotificationService.notifier_annulation_entretien(
                        entretien, 
                        request.user, 
                        data.get("motif_annulation", "Non spécifié")
                    )
                
                if data["status"] == 'terminé' and ancien_statut != 'terminé':
                    NotificationService.notifier_terminaison_entretien(
                        entretien, 
                        request.user
                    )
            else:
                return Response({"error": "Statut invalide"}, status=400)
        
        if "motif_annulation" in data:
            entretien.motif_annulation = data["motif_annulation"]
        
        if modifications:
            entretien.save()
            
            if modifications and data.get("status") not in ['annulé', 'terminé']:
                NotificationService.notifier_modification_entretien(
                    entretien, request.user, modifications
                )
        
        response_data = {
            "id": str(entretien.id),
            "titre": entretien.titre,
            "date": entretien.date.isoformat(),
            "heure_debut": entretien.heure_debut.strftime("%H:%M"),
            "heure_fin": None,
            "demandeur": f"{entretien.demandeur.etudiant_nom} {entretien.demandeur.etudiant_prenom}",
            "status": entretien.status,
            "motif_annulation": entretien.motif_annulation,
            "message": "Entretien mis à jour avec notifications push"
        }
        return Response(response_data, status=200)
    
    def delete(self, request, pk):
        entretien = self.get_object(pk)
        if not entretien:
            return Response({"error": "Entretien introuvable"}, status=404)
        
        # Sauvegarder les infos pour la notification
        titre_entretien = entretien.titre
        demandeur_nom = f"{entretien.demandeur.etudiant_prenom} {entretien.demandeur.etudiant_nom}"
        
        # 🔔 NOTIFICATION PUSH SUPPRESSION
        NotificationService.notifier_suppression_entretien(
            titre_entretien, demandeur_nom, request.user
        )
        
        entretien.delete()
        return Response({
            "success": True, 
            "message": "Entretien supprimé avec notification push"
        }, status=200)

class AnnulerEntretienAPI(APIView):
    """API spécifique pour annuler un entretien"""
    permission_classes = [IsAuthenticated]
    
    def put(self, request, entretien_id):
        return self._annuler_entretien(request, entretien_id)
    
    def post(self, request, entretien_id):
        return self._annuler_entretien(request, entretien_id)
    
    def _annuler_entretien(self, request, entretien_id):
        """Méthode privée pour gérer l'annulation"""
        try:
            entretien = Entretien.objects.get(id=entretien_id)
            motif_annulation = request.data.get("motif_annulation", "Non spécifié")
            
            # Sauvegarder l'ancien statut
            ancien_statut = entretien.status
            
            # Mettre à jour le statut
            entretien.status = 'annulé'
            entretien.motif_annulation = motif_annulation
            entretien.save()
            
            # 🔔 NOTIFICATION PUSH ANNULATION
            if ancien_statut != 'annulé':
                NotificationService.notifier_annulation_entretien(
                    entretien, 
                    request.user, 
                    motif_annulation
                )
            
            # Envoi d'email de notification d'annulation
            self.envoyer_notification_annulation(entretien, motif_annulation)
            
            return Response({
                "success": True,
                "message": "Entretien annulé avec succès",
                "status": entretien.status,
                "motif_annulation": entretien.motif_annulation
            }, status=200)
            
        except Entretien.DoesNotExist:
            return Response({"error": "Entretien introuvable"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
    
    def envoyer_notification_annulation(self, entretien, motif):
        """Envoie un email de notification pour l'annulation de l'entretien"""
        
        print("=== ENVOI NOTIFICATION ANNULATION ENTRETIEN ===")
        
        # Vérifier que le candidat a un email
        if not hasattr(entretien.demandeur, 'etudiant_email') or not entretien.demandeur.etudiant_email:
            print("❌ Aucun email trouvé pour le candidat")
            return False
        
        subject = f"Annulation de votre entretien - {entretien.demandeur.tracking_id}"
        
        # Formater la date pour l'affichage
        try:
            date_formatee = entretien.date.strftime("%d/%m/%Y")
        except:
            date_formatee = entretien.date
        
        # Récupérer les attributs avec fallback pour éviter les erreurs
        lieu = getattr(entretien, 'lieu', 'Non spécifié')
        contact_rh = getattr(entretien, 'contact_rh', 'Service des Stages - 21 30 05 06')
        
        # Template HTML professionnel pour l'annulation (CORRIGÉ)
        html_message = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Annulation d'entretien</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }}
        
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
        }}
        
        .header {{
            background: #dc3545;
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .greeting {{
            font-size: 16px;
            font-weight: 600;
            color: #2c5aa0;
            margin-bottom: 20px;
        }}
        
        .message {{
            font-size: 14px;
            color: #555555;
            line-height: 1.7;
            margin-bottom: 25px;
        }}
        
        .annulation-section {{
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .annulation-title {{
            font-size: 16px;
            font-weight: 600;
            color: #721c24;
            margin-bottom: 15px;
            text-align: center;
        }}
        
        .details-grid {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 15px 0;
        }}
        
        .detail-item {{
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #eaeaea;
        }}
        
        .detail-label {{
            font-weight: 600;
            color: #666666;
            font-size: 13px;
        }}
        
        .detail-value {{
            color: #333333;
            font-size: 13px;
            text-align: right;
        }}
        
        .motif-section {{
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }}
        
        .motif-title {{
            font-weight: 600;
            color: #856404;
            margin-bottom: 8px;
        }}
        
        .contact-section {{
            background: #e2e3e5;
            border: 1px solid #d6d8db;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }}
        
        .contact-title {{
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 10px;
        }}
        
        .footer {{
            background: #2c3e50;
            color: #ffffff;
            padding: 25px;
            text-align: center;
        }}
        
        .contact-info {{
            font-size: 12px;
            color: #bdc3c7;
            line-height: 1.6;
            margin: 10px 0;
        }}
        
        .copyright {{
            font-size: 11px;
            color: #95a5a6;
            margin-top: 15px;
            border-top: 1px solid #34495e;
            padding-top: 10px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>Annulation de Votre Entretien</h1>
            <p>Communauté Électrique du Bénin</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                Cher(e) {entretien.demandeur.etudiant_prenom},
            </div>
            
            <!-- Message principal -->
            <div class="message">
                Nous vous informons que votre entretien programmé à la Communauté Électrique du Bénin 
                a dû être annulé. Veuillez trouver ci-dessous les détails de cette annulation.
            </div>
            
            <!-- Section annulation -->
            <div class="annulation-section">
                <div class="annulation-title">Entretien annulé</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Type d'entretien :</span>
                        <span class="detail-value">{entretien.titre}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date prévue :</span>
                        <span class="detail-value">{date_formatee}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Heure prévue :</span>
                        <span class="detail-value">{entretien.heure_debut.strftime("%H:%M")}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Lieu :</span>
                        <span class="detail-value">{lieu}</span>
                    </div>
                </div>
            </div>
            
            <!-- Motif de l'annulation -->
            <div class="motif-section">
                <div class="motif-title">Motif de l'annulation</div>
                <div class="message">
                    {motif}
                </div>
            </div>
            
            <!-- Contact et informations -->
            <div class="contact-section">
                <div class="contact-title">Pour toute information complémentaire</div>
                <div class="message">
                    {contact_rh}
                </div>
            </div>
            
            <div class="message">
                Nous nous excusons pour la gêne occasionnée par cette annulation et restons à votre disposition 
                pour toute information complémentaire.
            </div>
            
            <div class="message">
                Votre candidature reste active dans notre système et nous vous recontacterons si de nouvelles 
                opportunités se présentent.
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="contact-info">
                <strong>Service des Stages - CEB</strong><br>
                Email : stages@ceb.bj | Téléphone : +229 21 30 05 06<br>
                Horaires : Lundi - Vendredi, 8h00 - 17h00
            </div>
            
            <div class="copyright">
                © 2024 Communauté Électrique du Bénin. Tous droits réservés.<br>
                Cet email a été généré automatiquement.
            </div>
        </div>
    </div>
</body>
</html>"""
        
        # Version texte simple pour le candidat (CORRIGÉ)
        text_message = f"""
ANNULATION DE VOTRE ENTRETIEN

Cher(e) {entretien.demandeur.etudiant_prenom},

Nous vous informons que votre entretien programmé à la Communauté Électrique du Bénin a dû être annulé.

DÉTAILS DE L'ENTRETIEN ANNULÉ :
Type d'entretien : {entretien.titre}
Date prévue : {date_formatee}
Heure prévue : {entretien.heure_debut.strftime("%H:%M")}
Lieu : {lieu}

MOTIF DE L'ANNULATION :
{motif}

CONTACT :
{contact_rh}

Nous nous excusons pour la gêne occasionnée par cette annulation et restons à votre disposition pour toute information.

Votre candidature reste active dans notre système et nous vous recontacterons si de nouvelles opportunités se présentent.

Service des Stages - CEB
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        
        try:
            print(f"📧 Destination candidat: {entretien.demandeur.etudiant_email}")
            print(f"📝 Sujet: {subject}")
            print(f"❌ Annulation: {date_formatee} à {entretien.heure_debut.strftime('%H:%M')}")
            print(f"📋 Titre de l'entretien: {entretien.titre}")
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email="stages@ceb.bj",
                to=[entretien.demandeur.etudiant_email],
                reply_to=['stages@ceb.bj'],
            )
            
            email.attach_alternative(html_message, "text/html")
            
            result = email.send(fail_silently=False)
            print(f"✅ NOTIFICATION ANNULATION ENVOYÉE AU CANDIDAT! Résultat: {result}")
            return True
            
        except Exception as e:
            print(f"❌ ERREUR ENVOI NOTIFICATION ANNULATION: {str(e)}")
            # Fallback simple
            try:
                send_mail(
                    subject,
                    text_message,
                    "stages@ceb.bj",
                    [entretien.demandeur.etudiant_email],
                    fail_silently=False,
                )
                print("✅ Email texte envoyé en fallback pour annulation")
                return True
            except Exception as fallback_error:
                print(f"❌ Erreur fallback annulation: {fallback_error}")
                return False

class TerminerEntretienAPI(APIView):
    """API spécifique pour terminer un entretien"""
    permission_classes = [IsAuthenticated]
    
    def put(self, request, entretien_id):
        return self._terminer_entretien(request, entretien_id)
    
    def post(self, request, entretien_id):
        return self._terminer_entretien(request, entretien_id)
    
    def _terminer_entretien(self, request, entretien_id):
        """Méthode privée pour gérer la terminaison"""
        try:
            entretien = Entretien.objects.get(id=entretien_id)
            notes_complementaires = request.data.get("notes_complementaires", "")
            
            # Sauvegarder l'ancien statut
            ancien_statut = entretien.status
            

            if ancien_statut != 'terminé':
                NotificationService.notifier_terminaison_entretien(
                    entretien, 
                    request.user
                )
            
            # Envoi d'email de notification de terminaison
            self.envoyer_notification_terminaison(entretien, notes_complementaires)
            
            return Response({
                "success": True,
                "message": "Entretien marqué comme terminé avec succès",
                "status": entretien.status,
            }, status=200)
            
        except Entretien.DoesNotExist:
            return Response({"error": "Entretien introuvable"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
    
    def envoyer_notification_terminaison(self, entretien, notes_complementaires):
        """Envoie un email de notification pour la terminaison de l'entretien"""
        
        print("=== ENVOI NOTIFICATION TERMINAISON ENTRETIEN ===")
        
        # Vérifier que le candidat a un email
        if not hasattr(entretien.demandeur, 'etudiant_email') or not entretien.demandeur.etudiant_email:
            print("❌ Aucun email trouvé pour le candidat")
            return False
        
        subject = f"Votre entretien est terminé - {entretien.demandeur.tracking_id}"
        
        # Formater la date pour l'affichage
        try:
            date_formatee = entretien.date.strftime("%d/%m/%Y")
        except:
            date_formatee = entretien.date
        
        # Récupérer les attributs avec fallback pour éviter les erreurs
        lieu = getattr(entretien, 'lieu', 'Non spécifié')
        contact_rh = getattr(entretien, 'contact_rh', 'Service des Stages - 21 30 05 06')
        
        # Template HTML professionnel pour la terminaison (CORRIGÉ)
        html_message = f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Entretien terminé</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }}
        
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
        }}
        
        .header {{
            background: #28a745;
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .greeting {{
            font-size: 16px;
            font-weight: 600;
            color: #2c5aa0;
            margin-bottom: 20px;
        }}
        
        .message {{
            font-size: 14px;
            color: #555555;
            line-height: 1.7;
            margin-bottom: 25px;
        }}
        
        .terminaison-section {{
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .terminaison-title {{
            font-size: 16px;
            font-weight: 600;
            color: #155724;
            margin-bottom: 15px;
            text-align: center;
        }}
        
        .details-grid {{
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 15px 0;
        }}
        
        .detail-item {{
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border: 1px solid #eaeaea;
        }}
        
        .detail-label {{
            font-weight: 600;
            color: #666666;
            font-size: 13px;
        }}
        
        .detail-value {{
            color: #333333;
            font-size: 13px;
            text-align: right;
        }}
        
        .prochaines-etapes {{
            background: #cce7ff;
            border: 1px solid #b6e0fe;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .etapes-title {{
            font-weight: 600;
            color: #2c5aa0;
            margin-bottom: 10px;
        }}
        
        .etapes-list {{
            list-style: none;
        }}
        
        .etapes-list li {{
            padding: 8px 0;
            color: #2c5aa0;
            font-size: 14px;
        }}
        
        .contact-section {{
            background: #e2e3e5;
            border: 1px solid #d6d8db;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }}
        
        .contact-title {{
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 10px;
        }}
        
        .footer {{
            background: #2c3e50;
            color: #ffffff;
            padding: 25px;
            text-align: center;
        }}
        
        .contact-info {{
            font-size: 12px;
            color: #bdc3c7;
            line-height: 1.6;
            margin: 10px 0;
        }}
        
        .copyright {{
            font-size: 11px;
            color: #95a5a6;
            margin-top: 15px;
            border-top: 1px solid #34495e;
            padding-top: 10px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>Entretien Terminé</h1>
            <p>Communauté Électrique du Bénin</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Greeting -->
            <div class="greeting">
                Cher(e) {entretien.demandeur.etudiant_prenom},
            </div>
            
            <!-- Message principal -->
            <div class="message">
                Nous vous confirmons que votre entretien à la Communauté Électrique du Bénin 
                s'est déroulé comme prévu et est maintenant terminé.
            </div>
            
            <!-- Section terminaison -->
            <div class="terminaison-section">
                <div class="terminaison-title">Détails de l'entretien</div>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="detail-label">Type d'entretien :</span>
                        <span class="detail-value">{entretien.titre}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date :</span>
                        <span class="detail-value">{date_formatee}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Heure :</span>
                        <span class="detail-value">{entretien.heure_debut.strftime("%H:%M")}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Lieu :</span>
                        <span class="detail-value">{lieu}</span>
                    </div>
                </div>
            </div>
         
            
            <!-- Contact et informations -->
            <div class="contact-section">
                <div class="contact-title">Pour toute information complémentaire</div>
                <div class="message">
                    {contact_rh}
                </div>
            </div>
            
            <div class="message">
                Nous vous remercions pour votre intérêt envers la Communauté Électrique du Bénin 
                et pour le temps que vous nous avez accordé.
            </div>
            
            <div class="message">
                Nous vous souhaitons bonne chance dans la suite de votre processus de recrutement.
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="contact-info">
                <strong>Service des Stages - CEB</strong><br>
                Email : stages@ceb.bj | Téléphone : +229 21 30 05 06<br>
                Horaires : Lundi - Vendredi, 8h00 - 17h00
            </div>
            
            <div class="copyright">
                © 2024 Communauté Électrique du Bénin. Tous droits réservés.<br>
                Cet email a été généré automatiquement.
            </div>
        </div>
    </div>
</body>
</html>"""
        
        # Version texte simple pour le candidat (CORRIGÉ)
        text_message = f"""
ENTRETIEN TERMINÉ

Cher(e) {entretien.demandeur.etudiant_prenom},

Nous vous confirmons que votre entretien à la Communauté Électrique du Bénin s'est déroulé comme prévu et est maintenant terminé.

DÉTAILS DE L'ENTRETIEN :
Type d'entretien : {entretien.titre}
Date : {date_formatee}
Heure : {entretien.heure_debut.strftime("%H:%M")}
Lieu : {lieu}

PROCHAINES ÉTAPES :
• Notre équipe analyse les résultats de l'entretien
• Vous recevrez une réponse sous 5 à 10 jours ouvrés
• Toute communication se fera par email ou téléphone
• Votre dossier reste actif dans notre système

CONTACT :
{contact_rh}

Nous vous remercions pour votre intérêt envers la Communauté Électrique du Bénin et pour le temps que vous nous avez accordé.

Nous vous souhaitons bonne chance dans la suite de votre processus de recrutement.

Service des Stages - CEB
Email: stages@ceb.bj
Téléphone: +229 21 30 05 06
"""
        
        try:
            print(f"📧 Destination candidat: {entretien.demandeur.etudiant_email}")
            print(f"📝 Sujet: {subject}")
            print(f"✅ Terminaison: {date_formatee} à {entretien.heure_debut.strftime('%H:%M')}")
            print(f"📋 Titre de l'entretien: {entretien.titre}")
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email="stages@ceb.bj",
                to=[entretien.demandeur.etudiant_email],
                reply_to=['stages@ceb.bj'],
            )
            
            email.attach_alternative(html_message, "text/html")
            
            result = email.send(fail_silently=False)
            print(f"✅ NOTIFICATION TERMINAISON ENVOYÉE AU CANDIDAT! Résultat: {result}")
            return True
            
        except Exception as e:
            print(f"❌ ERREUR ENVOI NOTIFICATION TERMINAISON: {str(e)}")
            # Fallback simple
            try:
                send_mail(
                    subject,
                    text_message,
                    "stages@ceb.bj",
                    [entretien.demandeur.etudiant_email],
                    fail_silently=False,
                )
                print("✅ Email texte envoyé en fallback pour terminaison")
                return True
            except Exception as fallback_error:
                print(f"❌ Erreur fallback terminaison: {fallback_error}")
                return False
            
class ArchiverDemandeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        demande = get_object_or_404(Demande, id=demande_id)
        demande.est_archivee = True
        demande.save()

        User = get_user_model()
        users = User.objects.all()

        for user in users:
            Notification.objects.create(
                user=user,
                titre="Demande archivée",
                message=f"La demande de {demande.etudiant_prenom} {demande.etudiant_nom} a été archivée.",
                type="success",
                icone="check-circle",
            )

        return Response({"success": True, "message": "Demande archivée avec succès"})

class DesarchiverDemandeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, demande_id):
        demande = get_object_or_404(Demande, id=demande_id)
        demande.est_archivee = False
        demande.date_desarchivage = timezone.now()
        demande.save()

        User = get_user_model()
        users = User.objects.all()

        for user in users:
            Notification.objects.create(
                user=user,
                titre="Demande désarchivée",
                message=f"La demande de {demande.etudiant_prenom} {demande.etudiant_nom} a été désarchivée.",
                type="success",
                icone="check-circle",
            )

        return Response({"success": True, "message": "Demande désarchivée avec succès"})
    
